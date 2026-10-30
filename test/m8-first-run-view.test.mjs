import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runOfflineFirstRun} from '../tools/adapter-first-run.mjs';
import {renderOfflineFirstRunText,runOfflineAdopterSelfCheck,
  summarizeOfflineAdopterSelfCheck,renderOfflineAdopterSelfCheckText}
  from '../tools/adapter-first-run-view.mjs';
import {inspectOfflineOnboarding}
  from '../tools/m35-offline-onboarding-report.mjs';

test('M8-Q: source-owned first-run view is deterministic and states exact limits',()=>{
  const report=runOfflineFirstRun();
  const text=renderOfflineFirstRunText(report);
  assert.equal(text,renderOfflineFirstRunText(runOfflineFirstRun()));
  for(const literal of [
    'FICTIONAL OFFLINE CONTROLS ONLY',
    'PASS (2/2)', 'stdio, streamable-http',
    'adapter-template stdio','adapter-template streamable-http',
    'nested template object','adapter-check <local-descriptor-file>',
    'External MCP servers contacted: NO',
    'User process executed: NO',
    'User descriptor read by this command: NO',
    'Real project assessed: NO',
    'Independent beta: NOT VERIFIED',
    'Independent security audit: NOT COMPLETED',
    'Stable release: NOT AUTHORIZED'
  ]) assert.ok(text.includes(literal),literal);
  assert.ok(!text.includes('undefined'));
});

test('M8-Q: every authority flag, transport, status or step tampering denies',()=>{
  const original=runOfflineFirstRun();
  const flags=['externalMcpContacted','userProcessExecuted','userDescriptorRead',
    'realProjectAssessed','operatorVerified','independentBetaVerified',
    'independentAuditCompleted','stableReleaseAuthorized'];
  for(const flag of flags){
    assert.throws(()=>renderOfflineFirstRunText({...original,[flag]:true}),
      /FICTIONAL_FIRST_RUN_NOT_VERIFIED/,flag);
    assert.throws(()=>renderOfflineFirstRunText({...original,[flag]:undefined}),
      /FICTIONAL_FIRST_RUN_NOT_VERIFIED/,flag);
  }
  const changed=[
    {...original,status:'FAIL'},
    {...original,exitCode:1},
    {...original,smokePassed:1},
    {...original,scope:'REAL_TARGET'},
    {...original,transports:['stdio']},
    {...original,transports:['stdio','stdio']},
    {...original,steps:[]},
    {...original,steps:original.steps.map((s,i)=>i===2?{...s,code:'CONNECT_REAL_TARGET'}:s)}
  ];
  for(const r of changed) assert.throws(()=>renderOfflineFirstRunText(r),
    /FICTIONAL_FIRST_RUN_NOT_VERIFIED/);
});

test('M8-Q: supplied private strings never reach human-facing output',()=>{
  const report=runOfflineFirstRun();
  const marker='PRIVATE_CREDENTIAL_CANARY_2026';
  const changed={...report,privateToken:marker,
    steps:report.steps.map(s=>({...s,instruction:marker,endpoint:marker}))};
  const text=renderOfflineFirstRunText(changed);
  assert.equal(text,renderOfflineFirstRunText(report));
  assert.ok(!text.includes(marker));
});

test('M8-Q: first-run human CLI rejects all user arguments without echo',()=>{
  const ok=spawnSync(process.execPath,['tools/adapter-first-run-view.mjs'],{encoding:'utf8'});
  assert.equal(ok.status,0,ok.stderr);
  assert.equal(ok.stderr,'');
  assert.equal(ok.stdout,renderOfflineFirstRunText(runOfflineFirstRun()));
  for(const arg of ['private-secret-canary','--target=https://private.example','../../secret.json']){
    const bad=spawnSync(process.execPath,['tools/adapter-first-run-view.mjs',arg],{encoding:'utf8'});
    assert.equal(bad.status,2);
    assert.equal(bad.stdout,'');
    assert.equal(bad.stderr.trim(),'ERROR: FIRST_RUN_VIEW_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});

test('M8-R: user-facing docs and package exclusion keep offline boundary',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.ok(!pkg.files.includes('tools'));
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  const doc=readFileSync(new URL('../.github/M8_FIRST_RUN_GUIDE.md',import.meta.url),'utf8');
  for(const text of [readme,doc]){
    assert.match(text,/node tools\/adapter-first-run-view\.mjs/);
    assert.match(text,/fictional/i);
    assert.match(text,/not a (real )?security audit/i);
  }
  assert.match(readme,/\.github\/M8_FIRST_RUN_GUIDE\.md/);
});


const syntheticStdio=()=>inspectOfflineOnboarding({
  mcpServers:{fictional_stdio:{command:'node',args:['server.mjs']}}
});
const syntheticHttp=()=>inspectOfflineOnboarding({
  servers:{fictional_https:{type:'http',url:'https://mcp.example.org/mcp'}}
});
const clone=x=>structuredClone(x);
const noRelease=report=>{
  for(const field of [
    'realProjectAssessed','actualAgentBehaviorObserved',
    'externalMcpContacted','userProcessExecuted',
    'projectConnectionAuthorized','independentBetaVerified',
    'independentAuditVerified','releaseApproved',
    'npmPublished','securityCertified'
  ])assert.equal(report[field],false,field);
};

test('M37-A: one-command synthetic first run validates M8 and both M35 client shapes',()=>{
  const r=runOfflineAdopterSelfCheck();
  assert.equal(r.profile,'m37-offline-adopter-self-check-v1');
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.ruleCode,'M37_FIXED_ONBOARDING_MATCH');
  assert.equal(r.scope,'FIRST_PARTY_FIXED_OFFLINE_ONLY');
  assert.deepEqual(r.adapterSmoke,{checked:2,matched:2});
  assert.deepEqual(r.clientConfigExamples,{
    checked:2,matched:2,transports:['stdio','streamable-http'],
    fiveFictionalControlsPerExample:true
  });
  assert.equal(r.riskRating,'NOT_SCORED');
  noRelease(r);
  assert.equal(r.nextActions.length,3);
  assert.equal(Object.isFrozen(r),true);
  assert.equal(Object.isFrozen(r.clientConfigExamples),true);
  assert.equal(renderOfflineAdopterSelfCheckText(r),
    renderOfflineAdopterSelfCheckText(runOfflineAdopterSelfCheck()));
});

test('M37-B: tampered M8/M35 conclusions cannot promote an unsafe self-check',()=>{
  const m8=runOfflineFirstRun();
  const stdio=syntheticStdio(),http=syntheticHttp();
  const valid=summarizeOfflineAdopterSelfCheck(m8,stdio,http);
  assert.equal(valid.status,'PASS');
  const changed=[
    [null,stdio,http],
    [{...m8,smokePassed:1},stdio,http],
    [{...m8,externalMcpContacted:true},stdio,http],
    [{...m8,releaseApproved:true},stdio,http],
    [{...m8,steps:m8.steps.slice(1)},stdio,http],
    [{...m8,steps:[...m8.steps.slice(0,4),{code:'RUN_REAL_TARGET',
      instruction:'private'}]},stdio,http],
    [m8,{...stdio,status:'CERTIFIED'},http],
    [m8,{...stdio,riskRating:'LOW'},http],
    [m8,{...stdio,securityCertified:true},http],
    [m8,{...stdio,externalTargetContacted:true},http],
    [m8,{...stdio,descriptor:{...stdio.descriptor,targetTested:true}},http],
    [m8,{...stdio,fictionalControls:{...stdio.fictionalControls,
      projectSpecific:true}},http],
    [m8,{...stdio,notTested:[]},http],
    [m8,{...stdio,nextActions:[]},http],
    [m8,stdio,{...http,descriptor:{...http.descriptor,transport:'stdio'}}],
    [m8,stdio,{...http,independentBetaVerified:true}],
    [m8,stdio,{...http,releaseApproved:true}],
    [m8,stdio,{...http,projectConnectionAuthorized:true}],
    [m8,stdio,{...http,actualAgentBehaviorObserved:true}]
  ];
  for(const tuple of changed){
    const result=summarizeOfflineAdopterSelfCheck(...tuple);
    assert.equal(result.status,'ERROR');
    assert.equal(result.exitCode,2);
    assert.equal(result.ruleCode,'M37_BUNDLED_SELF_CHECK_UNAVAILABLE');
    noRelease(result);
  }
  assert.throws(()=>renderOfflineAdopterSelfCheckText(
    {...valid,releaseApproved:true}),/M37_UNTRUSTED_SELF_CHECK_REPORT/);
  assert.throws(()=>renderOfflineAdopterSelfCheckText(
    JSON.parse(JSON.stringify(valid))),/M37_UNTRUSTED_SELF_CHECK_REPORT/);
});

test('M37-B: nested getters, sparse data, foreign prototypes and extra keys reject generically',()=>{
  let called=0;
  const m8=runOfflineFirstRun(),stdio=syntheticStdio(),http=syntheticHttp();
  const input=clone(stdio);
  Object.defineProperty(input.descriptor,'transport',{
    enumerable:true,get(){called++;throw Error('PRIVATE_CANARY');}
  });
  assert.equal(summarizeOfflineAdopterSelfCheck(m8,input,http).status,'ERROR');
  assert.equal(called,0);
  const sparse=clone(m8);sparse.steps=Array(5);
  sparse.steps[0]=m8.steps[0];
  assert.equal(summarizeOfflineAdopterSelfCheck(sparse,stdio,http).status,'ERROR');
  const inherited=Object.create(m8);
  assert.equal(summarizeOfflineAdopterSelfCheck(inherited,stdio,http).status,'ERROR');
  const extra=clone(http);extra.scannerPrecision=100;
  assert.equal(summarizeOfflineAdopterSelfCheck(m8,stdio,extra).status,'ERROR');
  const getterSteps=clone(m8);
  Object.defineProperty(getterSteps.steps,'0',{
    enumerable:true,get(){called++;throw Error('PRIVATE_CANARY');}
  });
  assert.equal(summarizeOfflineAdopterSelfCheck(getterSteps,stdio,http).status,'ERROR');
  assert.equal(called,0);
  const k=clone(http);k.nextActions=Array(3);
  k.nextActions[0]=http.nextActions[0];
  assert.equal(summarizeOfflineAdopterSelfCheck(m8,stdio,k).status,'ERROR');
});

test('M37-B: only exact opt-in CLI flags, zero input and no secret echo',()=>{
  const run=(...args)=>spawnSync(process.execPath,
    ['tools/adapter-first-run-view.mjs',...args],{
      encoding:'utf8',timeout:30000,windowsHide:true,
      env:{...process.env,NODE_OPTIONS:''}
    });
  const text=run('--self-check');
  assert.equal(text.status,0,text.stderr);
  assert.equal(text.stderr,'');
  assert.equal(text.stdout,renderOfflineAdopterSelfCheckText(
    runOfflineAdopterSelfCheck()));
  for(const literal of [
    'PASS (2/2)','mcpServers / stdio','servers / HTTPS',
    'NOT TESTED','RISK RATING: NOT_SCORED',
    'node tools/m35-offline-onboarding-report.mjs',
    'node tools/reviewer-handoff.mjs doctor',
    'External MCP servers contacted: NO',
    'Stable release: NOT AUTHORIZED'
  ])assert.ok(text.stdout.includes(literal),literal);
  const json=run('--self-check-json');
  assert.equal(json.status,0,json.stderr);
  assert.equal(json.stderr,'');
  assert.deepEqual(JSON.parse(json.stdout),runOfflineAdopterSelfCheck());
  for(const cli of [
    ['--help'],['--self-check','--publish'],['--self-check-json','PRIVATE_CANARY'],
    ['--target=https://PRIVATE_CANARY'],['private/PRIVATE_CANARY']
  ]){
    const p=run(...cli);
    assert.equal(p.status,2);
    assert.equal(p.stdout,'');
    assert.equal(p.stderr,'ERROR: FIRST_RUN_VIEW_ARGUMENTS_NOT_ALLOWED\n');
    assert.ok(!(p.stdout+p.stderr).includes('PRIVATE_CANARY'));
  }
  for(const args of [
    ['--target=PRIVATE_CANARY'],['--self-check'],
    Array(1),Object.create([]),Object.create(null)
  ])assert.equal(runOfflineAdopterSelfCheck(args).status,'ERROR');
});

test('M37-C: frozen unpublished package unaffected and first-run guide covers separate gates',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  const packaged=JSON.parse(readFileSync(
    new URL('./expected-package-files.json',import.meta.url),'utf8'));
  assert.equal(pkg.version,'0.0.10-rc.1');
  assert.equal(packaged.length,80);
  assert.equal(pkg.files.includes('tools'),false);
  assert.equal(packaged.includes('tools/adapter-first-run-view.mjs'),false);
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  const guide=readFileSync(new URL('../docs/GETTING_STARTED.md',import.meta.url),'utf8');
  for(const doc of [readme,guide]){
    assert.match(doc,/adapter-first-run-view\.mjs --self-check/);
    assert.match(doc,/m35-offline-onboarding-report\.mjs/);
    assert.match(doc,/not a (real )?security (audit|scan|certification)/i);
  }
});
