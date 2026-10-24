/**
 * M6-B: bounded, deterministic, data-only onboarding kit. No real MCP target,
 * network calls, file output, credentials or arbitrary executable dispatch.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  OFFLINE_ADOPTER_KIT_SCHEMA_VERSION,createOfflineAdopterKit,
  previewOfflineAdapterQuickstart,auditSymbolicTraceExpectations
} from '../src/project-adapter.mjs';
import {observeFirstPartyMockAttempts} from '../src/mock-attempt-observer.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:15000,maxBuffer:200000
});
function assertNoAuthority(x){
  assert.equal(x.status,'PASS');
  assert.equal(x.kitSchemaVersion,OFFLINE_ADOPTER_KIT_SCHEMA_VERSION);
  assert.equal(x.profile,'guided-fictional-offline-adopter-kit-v1');
  assert.equal(x.interpretation,'FICTIONAL_STARTER_KIT_NOT_PROJECT_ASSESSMENT');
  assert.equal(x.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
  assert.equal(x.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(x.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  assert.equal(x.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(x.executionEnabled,false);
  assert.equal(x.projectConnectionAuthorized,false);
  assert.equal(x.externalTargetContacted,false);
  assert.equal(x.operatorVerified,false);
  assert.equal(x.projectSafetyAssessed,false);
  assert.equal(x.fixturesAreProjectSpecific,false);
  assert.equal(x.securityCertified,false);
  assert.equal(x.releaseAuthorized,false);
  assert.equal(x.failureCount,0);
  assert.deepEqual(x.findings,[]);
}
const types=['stdio','streamable-http'];
test('M6-B: only two version-1 fictional source templates are supported',()=>{
  assert.equal(OFFLINE_ADOPTER_KIT_SCHEMA_VERSION,1);
  for(const type of types){
    const x=createOfflineAdopterKit(type);
    assertNoAuthority(x);
    assert.equal(x.transport,type);
    assert.equal(x.starterDescriptor.policy.mode,'validate-only');
    for(const k of ['allowNetwork','allowProcessSpawn','allowToolCalls','allowCredentials'])
      assert.equal(x.starterDescriptor.policy[k],false);
    assert.equal(x.expectedResults.quickstart.fictionalControlsMatched,5);
    assert.equal(x.plan.length,7);
    assert.deepEqual(x.plan.map(s=>s.order),[1,2,3,4,5,6,7]);
    assert.equal(x.humanSummary.length,5);
    assert.ok(x.humanSummary.every(y=>typeof y==='string' && y.length<200));
  }
});
test('M6-B: same kit repeats deterministically and mutation cannot poison future calls',()=>{
  const a=createOfflineAdopterKit('stdio');
  const b=createOfflineAdopterKit('stdio');
  assert.deepEqual(a,b);
  a.starterDescriptor.project.name='PRIVATE_USER_PROJECT';
  a.cleanExpectation.trace.events[0].decision='ALLOW';
  a.plan[1].command='execute-malicious-user-command';
  a.humanSummary[0]='PRIVATE_CANARY';
  assert.deepEqual(createOfflineAdopterKit('stdio'),b);
});
test('M6-B: kit three generated artifacts roundtrip through existing pure verifiers',()=>{
  for(const type of types){
    const x=createOfflineAdopterKit(type);
    const quick=previewOfflineAdapterQuickstart(x.starterDescriptor);
    assert.equal(quick.status,'PASS');
    assert.equal(quick.checked,5);
    assert.equal(quick.controls[3].fictionalObservedStatus,'FAIL');
    assert.equal(quick.controls[3].controlStatus,'PASS');
    const clean=auditSymbolicTraceExpectations(x.cleanExpectation);
    const negative=auditSymbolicTraceExpectations(x.expectedViolation);
    assert.equal(clean.status,'PASS');
    assert.equal(clean.observedSafetyStatus,'PASS');
    assert.equal(clean.expectationStatus,'MATCH');
    assert.equal(negative.status,'PASS');
    assert.equal(negative.observedSafetyStatus,'FAIL');
    assert.equal(negative.expectationStatus,'MATCH');
    assert.equal(negative.observedFailureCount,1);
    assert.deepEqual(negative.observedFindings,[{
      event:1,rule:'DENIED_ACTION_HAD_EFFECT'
    }]);
  }
});
test('M6-B: no mock attempts or target process/network actions while generating kit',async()=>{
  for(const type of types){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>createOfflineAdopterKit(type));
    assertNoAuthority(result);
    assert.deepEqual(attempts,[]);
  }
});
test('M6-B: selector API rejects all arbitrary fields, URLs, commands and objects',()=>{
  for(const bad of [
    null,undefined,true,1,{},[],new String('stdio'),'STDIO','tcp',
    'stdio --exec=PRIVATE_CANARY','stdio; curl example.org',
    '--endpoint=https://private.example.org/mcp',
    'https://private.example.org/mcp','../../../private.json',
    '--token=PRIVATE_CANARY','streamable-http\n'
  ])assert.throws(()=>createOfflineAdopterKit(bad),/INVALID_ADAPTER_TEMPLATE_TYPE/);
});
test('M6-B: CLI emits report-v1 data with fixed template and no caller-derived output',()=>{
  for(const type of types){
    const p=run('adapter-kit',type);
    assert.equal(p.status,0,p.stderr);
    assert.equal(p.stderr,'');
    const x=JSON.parse(p.stdout);
    assertNoAuthority(x);
    assert.equal(x.reportSchemaVersion,1);
    assert.equal(x.command,'adapter-kit');
    assert.equal(x.exitCode,0);
    assert.deepEqual(x.summary.ruleCodes,[]);
    assert.equal(x.transport,type);
    assert.ok(!p.stdout.includes('PRIVATE_CANARY'));
    assert.ok(!p.stdout.includes(root));
    assert.ok(Buffer.byteLength(p.stdout,'utf8')<16384);
  }
});
test('M6-B: CLI invalid selector, flag and extra arg return exit 2 generic error',()=>{
  for(const args of [
    ['adapter-kit'],['adapter-kit','invalid'],['adapter-kit','STDIO'],
    ['adapter-kit','--token=PRIVATE_CANARY'],
    ['adapter-kit','stdio','--execute'],
    ['adapter-kit','https://private.example.org/mcp'],
    ['adapter-kit','../../secret.json'],
    ['adapter-kit','stdio','PRIVATE_CANARY'],
    ['adapter-kit','streamable-http','--output=PRIVATE_CANARY']
  ]){
    const p=run(...args);
    assert.equal(p.status,2,args.join(' '));
    const x=JSON.parse(p.stdout);
    assert.equal(x.status,'ERROR');
    assert.equal(x.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.equal(x.command,'adapter-kit');
    assert.equal(x.exitCode,2);
    assert.ok(!p.stdout.includes('PRIVATE_CANARY'));
    assert.ok(!p.stderr.includes('PRIVATE_CANARY'));
    assert.ok(!p.stdout.includes('private.example.org'));
  }
});
test('M6-B: output only contains fixed paths/commands and source-owned static prose',()=>{
  const a=createOfflineAdopterKit('streamable-http');
  const commands=a.plan.filter(x=>x.command).map(x=>x.command);
  assert.deepEqual(commands,[
    'adapter-quickstart','adapter-trace-expect','adapter-trace-expect'
  ]);
  const files=a.plan.filter(x=>x.filename).map(x=>x.filename);
  assert.deepEqual(files,[
    'fictional-descriptor.json','fictional-descriptor.json',
    'fictional-clean-ci.json','fictional-clean-ci.json',
    'fictional-negative-ci.json','fictional-negative-ci.json'
  ]);
  assert.ok(a.humanSummary.every(x=>!x.includes('https://')));
  assert.ok(a.plan.every(x=>!JSON.stringify(x).includes('https://')));
  assert.equal(a.expectedResults.expectedViolationCi.exitCode,0);
  assert.equal(a.expectedResults.expectedViolationCi.observedSafetyStatus,'FAIL');
});
test('M6-B: copy-and-run local artifacts in disposable unrelated working directory',()=>{
  const dir=mkdtempSync(join(tmpdir(),'fictional-kit-adopter-'));
  try{
    const kit=JSON.parse(run('adapter-kit','streamable-http').stdout);
    for(const [file,value] of [
      ['fictional-descriptor.json',kit.starterDescriptor],
      ['fictional-clean-ci.json',kit.cleanExpectation],
      ['fictional-negative-ci.json',kit.expectedViolation]
    ]) {
      const json=JSON.stringify(value);
      assert.ok(Buffer.byteLength(json,'utf8')<=4096);
      writeFileSync(join(dir,file),json,'utf8');
    }
    for(const [cmd,file,observed] of [
      ['adapter-quickstart','fictional-descriptor.json',null],
      ['adapter-trace-expect','fictional-clean-ci.json','PASS'],
      ['adapter-trace-expect','fictional-negative-ci.json','FAIL']
    ]){
      const p=spawnSync(process.execPath,[
        join(root,'src','cli.mjs'),cmd,file
      ],{cwd:dir,encoding:'utf8',shell:false,timeout:15000,maxBuffer:200000});
      assert.equal(p.status,0,p.stderr);
      const x=JSON.parse(p.stdout);
      assert.equal(x.status,'PASS');
      assert.equal(x.connectionStatus,'NOT_ATTEMPTED');
      assert.equal(x.externalTargetContacted,false);
      if(observed!==null){
        assert.equal(x.expectationStatus,'MATCH');
        assert.equal(x.observedSafetyStatus,observed);
      }
    }
  }finally{rmSync(dir,{force:true,recursive:true});}
});
test('M6-B: help and docs disclose kit without claiming real MCP test',()=>{
  const help=JSON.parse(run('help').stdout);
  assert.ok(help.commands.includes('adapter-kit'));
  assert.equal(help.commands.length,27);
  assert.ok(help.syntax.includes('node src/cli.mjs adapter-kit stdio'));
  assert.ok(help.syntax.includes('node src/cli.mjs adapter-kit streamable-http'));
  for(const file of ['README.md','docs/GETTING_STARTED.md','ROADMAP.md']){
    const content=readFileSync(join(root,file),'utf8');
    assert.ok(content.includes('adapter-kit'),file);
    assert.ok(content.includes('fictional') || content.includes('Fictional'),file);
  }
  const files=JSON.parse(readFileSync(join(root,'test','expected-package-files.json'),'utf8'));
  assert.equal(files.length,80);
  assert.ok(!files.includes('test/m6b-guided-adopter-kit.test.mjs'));
});
