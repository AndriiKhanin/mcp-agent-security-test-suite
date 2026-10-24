/**
 * M4-B9-A: project-neutral, strictly offline fixture audit.
 * These are fixed FICTIONAL controls, not checks on a user's MCP server.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  auditOfflineProjectFixtureBundle,OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION,
  OFFLINE_FIXTURE_CASES,createOfflineAdapterTemplate,
  inspectProjectAdapter,previewProjectOnboarding
} from '../src/project-adapter.mjs';
import {observeFirstPartyMockAttempts}
  from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cases=[
  'permission-denial','replay-denial','tool-escalation-denial',
  'denied-effect-negative','clean-trace'
];
const bundle=(transport='streamable-http',ids=cases)=>({
  bundleSchemaVersion:1,mode:'offline-fictional-only',
  descriptor:createOfflineAdapterTemplate(transport).template,
  checks:ids.map(caseId=>({caseId}))
});
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:100000
});
const withFixtureFile=(source,fn)=>{
  const folder=mkdtempSync(join(tmpdir(),'m4b9a-fictional-'));
  const file=join(folder,'bundle.json');
  try{
    writeFileSync(file,source,'utf8');
    return fn(file,folder);
  }finally{rmSync(folder,{recursive:true,force:true});}
};
const guarded=r=>{
  assert.equal(r.profile,'fictional-project-fixture-audit-v1');
  assert.equal(r.bundleSchemaVersion,OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION);
  assert.equal(r.descriptorEvidence,'DESCRIPTOR_VALIDATED');
  assert.equal(r.fixtureEvidence,'OFFLINE_FIXTURE_EVALUATED');
  assert.equal(r.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
  assert.equal(r.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
  assert.equal(r.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(r.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(r.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.executionEnabled,false);
  assert.equal(r.projectConnectionAuthorized,false);
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.operatorVerified,false);
  assert.equal(r.fixturesAreProjectSpecific,false);
};

test('M4-B9-A: five exact known fixture selectors are stable',()=>{
  assert.deepEqual(OFFLINE_FIXTURE_CASES,cases);
  assert.equal(OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION,1);
});

test('M4-B9-A: HTTP and stdio descriptor shape pass with fixed symbolic cases',()=>{
  for(const transport of ['streamable-http','stdio']){
    const r=auditOfflineProjectFixtureBundle(bundle(transport));
    guarded(r);
    assert.equal(r.status,'PASS');
    assert.equal(r.transport,transport);
    assert.equal(r.checks.length,5);
    assert.deepEqual(r.findings,[]);
    assert.equal(r.failureCount,0);
    assert.ok(r.checks.every(c=>c.checkStatus==='PASS'&&c.expectationMet));
    assert.deepEqual(r.checks.map(c=>c.caseId),cases);
  }
});

test('M4-B9-A: expected denial, replay, escalation and intentionally broken controls are detected',()=>{
  const r=auditOfflineProjectFixtureBundle(bundle());
  guarded(r);
  assert.deepEqual(r.checks.map(x=>[x.caseId,x.expectedControl,x.observedStatus]),[
    ['permission-denial','OWNER_MISMATCH','PASS'],
    ['replay-denial','REPLAYED_NONCE','PASS'],
    ['tool-escalation-denial','UNKNOWN_TOOL','PASS'],
    ['denied-effect-negative','DENIED_ACTION_HAD_EFFECT','FAIL'],
    ['clean-trace','CLEAN_SYNTHETIC_TRACE','PASS']
  ]);
  assert.equal(r.status,'PASS'); // Expected FAIL control detection makes bundle PASS.
});

test('M4-B9-A: subset and order selection is deterministic',()=>{
  const r=auditOfflineProjectFixtureBundle(bundle('stdio',[
    'clean-trace','denied-effect-negative'
  ]));
  guarded(r);
  assert.deepEqual(r.checks.map(c=>c.caseId),
    ['clean-trace','denied-effect-negative']);
});

test('M4-B9-A: CLI returns schema-v1 bounded output and no descriptor details',()=>{
  withFixtureFile(JSON.stringify(bundle()),file=>{
    const x=cli('adapter-fixture-audit',file);
    assert.equal(x.error,undefined);
    assert.equal(x.status,0,x.stderr);
    const r=JSON.parse(x.stdout);
    guarded(r);
    assert.equal(r.status,'PASS');
    assert.equal(r.command,'adapter-fixture-audit');
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.exitCode,0);
    assert.deepEqual(r.summary.ruleCodes,[]);
    for(const forbidden of ['mcp.example.org','fictional-http-project',
      'server.mjs',file,'mcp://fictional-resource','synthetic-grant-01'])
      assert.ok(!x.stdout.includes(forbidden),forbidden);
  });
});

test('M4-B9-A: generated stdio and HTTP templates copy into no-contact bundles',()=>{
  for(const type of ['stdio','streamable-http']){
    const profile=createOfflineAdapterTemplate(type).template;
    assert.equal(previewProjectOnboarding(profile).connectionStatus,'NOT_ATTEMPTED');
    assert.equal(inspectProjectAdapter(profile).executionEnabled,false);
    const r=auditOfflineProjectFixtureBundle({
      bundleSchemaVersion:1,mode:'offline-fictional-only',
      descriptor:structuredClone(profile),
      checks:[{caseId:'permission-denial'}]
    });
    guarded(r);
    assert.equal(r.checks.length,1);
    assert.equal(r.status,'PASS');
  }
});

test('M4-B9-A: reject optional executable and remote-target flags before effects',()=>{
  const orig=bundle();
  const mutated=[
    {...orig,allowNetwork:true},
    {...orig,verified:true},
    {...orig,command:'node'},
    {...orig,endpoint:'https://private.example.org/mcp'},
    {...orig,consent:'ALLOW'},
    {...orig,execute:true},
    {...orig,checks:[{caseId:'permission-denial',allowProcessSpawn:true}]},
    {...orig,checks:[{caseId:'permission-denial',fixturePath:'../private.json'}]},
    {...orig,descriptor:{...orig.descriptor,verified:true}},
    {...orig,descriptor:{...orig.descriptor,policy:{
      ...orig.descriptor.policy,allowNetwork:true}}},
    {...orig,descriptor:{...orig.descriptor,policy:{
      ...orig.descriptor.policy,allowToolCalls:true}}},
    {...orig,descriptor:{...orig.descriptor,transport:{
      type:'streamable-http',endpoint:'https://127.0.0.1/mcp'}}}
  ];
  for(const x of mutated){
    assert.throws(()=>auditOfflineProjectFixtureBundle(x),
      /INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE/);
  }
});

test('M4-B9-A: unknown selectors, duplicates and unbounded sets fail closed',()=>{
  const bad=[
    [],[...cases,'clean-trace'],
    ['permission-denial','permission-denial'],
    ['read-private-file'],['https://host.example.org/mcp'],
    ['../fixtures/scenario-denial.json'],['tools/call'],
    ['--run'],['REPLAY-DENIAL']
  ];
  for(const ids of bad){
    assert.throws(()=>auditOfflineProjectFixtureBundle(bundle('stdio',ids)),
      /INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE/);
  }
  for(const malformed of [null,[],{},true,0,'bad',
    {bundleSchemaVersion:2,mode:'offline-fictional-only'},
    {...bundle(),mode:'run'},
    {...bundle(),bundleSchemaVersion:'1'},
    {...bundle(),checks:[{caseId:null}]}
  ])assert.throws(()=>auditOfflineProjectFixtureBundle(malformed),
    /INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE/);
});

test('M4-B9-A: source API rejects getters, prototype tricks, symbols and cycles',()=>{
  const x=bundle();
  const accessor=bundle();
  Object.defineProperty(accessor,'mode',{get(){throw Error('PRIVATE_CANARY')}});
  const unusual=Object.assign(Object.create(null),bundle());
  const nested=bundle();nested.checks[0][Symbol.for('hidden')]='secret';
  const cycle=bundle();cycle.extra=cycle;
  for(const input of [accessor,unusual,nested,cycle]){
    assert.throws(()=>auditOfflineProjectFixtureBundle(input),
      /INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE/);
  }
  assert.equal(auditOfflineProjectFixtureBundle(x).status,'PASS');
});

test('M4-B9-A: user data and secret canaries never appear in parser errors',()=>{
  withFixtureFile('{"secret":"PRIVATE_CANARY","bundleSchemaVersion":1}',file=>{
    const x=cli('adapter-fixture-audit',file);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(x.stdout+x.stderr).includes('PRIVATE_CANARY'));
    assert.ok(!(x.stdout+x.stderr).includes(file));
  });
});

test('M4-B9-A: hard 16KiB CLI input ceiling rejects oversized bundle',()=>{
  const bytes=JSON.stringify(bundle())+'\n'+' '.repeat(17000);
  withFixtureFile(bytes,file=>{
    const x=cli('adapter-fixture-audit',file);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!x.stdout.includes(file));
  });
});

test('M4-B9-A: CLI rejects unknown input type/flags and all extra arguments',()=>{
  for(const args of [
    ['adapter-fixture-audit'],
    ['adapter-fixture-audit','--endpoint=https://private.example.org/mcp'],
    ['adapter-fixture-audit','sample.json','--run'],
    ['adapter-fixture-audit','sample.json','--tools/call']
  ]){
    const x=cli(...args);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(x.stdout+x.stderr).includes('private.example.org'));
  }
});

test('M4-B9-A: no first-party attempt is emitted by library bundle audit',async()=>{
  const seen=await observeFirstPartyMockAttempts(()=>
    auditOfflineProjectFixtureBundle(bundle()));
  guarded(seen.result);
  assert.deepEqual(seen.attempts,[]);
  assert.equal(seen.result.status,'PASS');
});

test('M4-B9-A: full report never includes input project name or fictional records',()=>{
  const x=bundle();
  x.descriptor.project.name='PRIVATE_PROJECT_NAME_123';
  x.descriptor.transport.endpoint='https://secret.example.org/mcp';
  const report=auditOfflineProjectFixtureBundle(x);
  guarded(report);
  for(const term of ['PRIVATE_PROJECT_NAME_123','secret.example.org',
    'fictional-owner','mcp://fictional-resource','synthetic-grant-01'])
    assert.equal(JSON.stringify(report).includes(term),false);
});

test('M4-B9-A: CLI help exposes offline-only audit command',()=>{
  const x=cli('help');
  assert.equal(x.status,0);
  const r=JSON.parse(x.stdout);
  assert.equal(r.commands.length,24);
  assert.ok(r.commands.includes('adapter-fixture-audit'));
  assert.ok(r.syntax.some(s=>s.startsWith('node src/cli.mjs adapter-fixture-audit ')));
  assert.ok(!x.stdout.includes('https://'));
});


// M4-B9-B: opt-in user-authored symbolic traces; never ingest actual MCP data.
import {
  auditSymbolicProjectTrace,SYMBOLIC_PROJECT_TRACE_SCHEMA_VERSION,
  SYMBOLIC_PROJECT_TRACE_MAX_EVENTS
} from '../src/project-adapter.mjs';

const symbolicEvent=(override={})=>({
  decision:'DENY',effect:'NONE',ownerAuthorized:false,
  scopeAuthorized:false,leaseFresh:false,secretLogged:false,
  ...override
});
const symbolicTrace=(events=[symbolicEvent()])=>({
  traceSchemaVersion:1,
  mode:'user-authored-synthetic-only',
  descriptor:createOfflineAdapterTemplate('streamable-http').template,
  events
});
function symbolicBounds(v){
  assert.equal(v.profile,'user-authored-symbolic-project-trace-v1');
  assert.equal(v.traceSchemaVersion,SYMBOLIC_PROJECT_TRACE_SCHEMA_VERSION);
  assert.equal(v.descriptorEvidence,'DESCRIPTOR_VALIDATED');
  assert.equal(v.traceEvidence,'USER_AUTHORED_SYNTHETIC_TRACE_EVALUATED');
  assert.equal(v.traceOrigin,'USER_AUTHORED_SYMBOLIC_ONLY');
  assert.equal(v.fixedFixtureControls,'NOT_RUN');
  assert.equal(v.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
  assert.equal(v.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
  assert.equal(v.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(v.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(v.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  assert.equal(v.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(v.executionEnabled,false);
  assert.equal(v.projectConnectionAuthorized,false);
  assert.equal(v.externalTargetContacted,false);
  assert.equal(v.operatorVerified,false);
  assert.equal(v.recordsAreRealMcpObservations,false);
  assert.equal(v.recordsChecked,v.checks.length);
  assert.equal(v.failureCount,v.findings.length);
  assert.equal(v.findingsTruncated,false);
}
const genericInvalid=input=>assert.throws(()=>auditSymbolicProjectTrace(input),
  /INVALID_SYMBOLIC_PROJECT_TRACE/);

test('M4-B9-B: strictly bounded symbolic mode exports stable schema',()=>{
  assert.equal(SYMBOLIC_PROJECT_TRACE_SCHEMA_VERSION,1);
  assert.equal(SYMBOLIC_PROJECT_TRACE_MAX_EVENTS,8);
});

test('M4-B9-B: explicitly symbolic denied no-effect and authorized read PASS',()=>{
  const r=auditSymbolicProjectTrace(symbolicTrace([
    symbolicEvent(),
    symbolicEvent({decision:'ALLOW',effect:'READ',
      ownerAuthorized:true,scopeAuthorized:true,leaseFresh:true})
  ]));
  symbolicBounds(r);
  assert.equal(r.status,'PASS');
  assert.deepEqual(r.findings,[]);
  assert.deepEqual(r.checks.map(v=>[v.event,v.checkStatus,v.symbolicOutcome,v.ruleCodes]),[
    [1,'PASS','DENIAL_WITHOUT_EFFECT',[]],
    [2,'PASS','ALLOW_WITH_SYMBOLIC_EFFECT',[]]
  ]);
});

test('M4-B9-B: symbolic denial with observed effect FAIL uses reviewed rule',()=>{
  const r=auditSymbolicProjectTrace(symbolicTrace([
    symbolicEvent({effect:'WRITE'})
  ]));
  symbolicBounds(r);
  assert.equal(r.status,'FAIL');
  assert.deepEqual(r.findings,[{event:1,rule:'DENIED_ACTION_HAD_EFFECT'}]);
  assert.deepEqual(r.checks[0].ruleCodes,['DENIED_ACTION_HAD_EFFECT']);
  assert.equal(r.checks[0].symbolicOutcome,'DENIED_EFFECT_OBSERVED');
});

test('M4-B9-B: unsigned effect and stale symbolic lease yield distinct findings',()=>{
  const r=auditSymbolicProjectTrace(symbolicTrace([
    symbolicEvent({decision:'ALLOW',effect:'WRITE'}),
    symbolicEvent({decision:'ALLOW',effect:'READ',ownerAuthorized:true,
      scopeAuthorized:true,leaseFresh:false})
  ]));
  symbolicBounds(r);
  assert.equal(r.status,'FAIL');
  assert.deepEqual(r.findings,[
    {event:1,rule:'EFFECT_WITHOUT_AUTHORIZATION'},
    {event:1,rule:'EFFECT_WITHOUT_FRESH_LEASE'},
    {event:2,rule:'EFFECT_WITHOUT_FRESH_LEASE'}
  ]);
});

test('M4-B9-B: flagged secret is only a boolean warning, no secret inspected',()=>{
  const r=auditSymbolicProjectTrace(symbolicTrace([
    symbolicEvent({secretLogged:true})
  ]));
  symbolicBounds(r);
  assert.deepEqual(r.findings,[{event:1,rule:'FLAGGED_SECRET_IN_AUDIT_LOG'}]);
});

test('M4-B9-B: no claimed replay checking beyond the selected pure primitive',()=>{
  const r=auditSymbolicProjectTrace(symbolicTrace([
    symbolicEvent(),symbolicEvent()
  ]));
  symbolicBounds(r);
  assert.equal(r.status,'PASS');
  assert.deepEqual(r.findings,[]);
  assert.equal(r.fixedFixtureControls,'NOT_RUN');
  assert.ok(!JSON.stringify(r).includes('REPLAYED_NONCE'));
});

test('M4-B9-B: reject strings with tools, paths, endpoints, credentials and records',()=>{
  for(const bad of [
    {method:'tools/call'}, {tool:'execute-shell'},
    {url:'https://private.example.org/mcp'},
    {path:'../secret.log'},{headers:{Authorization:'token'}},
    {params:{}},{command:'node'},{identity:'customer'},
    {resource:'mcp://real-target'},{scope:'broad'},
    {nonce:'fictional-nonce'}, {rawBody:'secret'},
    {ownerAuthorized:'true'},{leaseFresh:1},
    {secretLogged:null},{decision:'EXECUTE'},
    {effect:'DELETE'}, {effect:'write'},
  ])genericInvalid(symbolicTrace([symbolicEvent(bad)]));
});

test('M4-B9-B: reject new root keys and attempted execution policy flips',()=>{
  const src=symbolicTrace();
  for(const bad of [
    {...src,allowNetwork:true},
    {...src,allowToolCalls:true},
    {...src,authenticated:true},
    {...src,traceFile:'../secret.log'},
    {...src,server:'https://private.example.org/mcp'},
    {...src,mode:'live'},
    {...src,mode:'offline-fictional-only'},
    {...src,traceSchemaVersion:2},
    {...src,traceSchemaVersion:'1'},
    {...src,descriptor:{...src.descriptor,verified:true}},
    {...src,descriptor:{...src.descriptor,policy:{
      ...src.descriptor.policy,allowProcessSpawn:true}}},
    {...src,descriptor:{...src.descriptor,transport:{
      type:'streamable-http',endpoint:'https://127.0.0.1/mcp'}}}
  ])genericInvalid(bad);
});

test('M4-B9-B: malformed event sets and too many records denied before audit',()=>{
  const original=symbolicTrace();
  for(const events of [[],Array(9).fill(symbolicEvent()),null,{},
    'DENY',[null],[{}],[true],[['DENY']]])
    genericInvalid({...original,events});
  assert.equal(auditSymbolicProjectTrace(
    symbolicTrace(Array.from({length:8},()=>symbolicEvent()))).recordsChecked,8);
});

test('M4-B9-B: getters, prototype, symbol and cyclic JS API inputs denied',()=>{
  const x=symbolicTrace();
  const getter=symbolicTrace();
  Object.defineProperty(getter.events[0],'decision',{get(){throw Error('PRIVATE_CANARY')}});
  const pollution=Object.assign(Object.create(null),symbolicTrace());
  const sym=symbolicTrace();sym.events[0][Symbol('secret')]='PRIVATE_CANARY';
  const cyclic=symbolicTrace();cyclic.events[0].cycle=cyclic.events;
  for(const v of [getter,pollution,sym,cyclic])genericInvalid(v);
  assert.equal(auditSymbolicProjectTrace(x).status,'PASS');
});

test('M4-B9-B: prototype pollution and JSON duplicate keys are not allowed by CLI',()=>{
  for(const raw of [
    '{"traceSchemaVersion":1,"traceSchemaVersion":1}',
    '{"traceSchemaVersion":1,"mode":"user-authored-synthetic-only","descriptor":{"__proto__":{"verified":true}},"events":[]}',
    '{"traceSchemaVersion":1,"mode":"user-authored-synthetic-only","descriptor":{},"events":[{"decision":"DENY","decision":"ALLOW"}]}',
    '{"mode":"user-authored-synthetic-only","mode":"live"}'
  ]){
    withFixtureFile(raw,file=>{
      const p=cli('adapter-synthetic-trace',file);
      assert.equal(p.status,2);
      assert.equal(JSON.parse(p.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
      assert.ok(!(p.stdout+p.stderr).includes(file));
    });
  }
});

test('M4-B9-B: strict CLI reads 4KiB only and reports neutral errors',()=>{
  withFixtureFile(JSON.stringify(symbolicTrace())+' '.repeat(4100),file=>{
    const r=cli('adapter-synthetic-trace',file);
    assert.equal(r.status,2);
    assert.equal(JSON.parse(r.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
  });
  withFixtureFile('{"password":"PRIVATE_CANARY"}',file=>{
    const p=cli('adapter-synthetic-trace',file);
    assert.equal(p.status,2);
    assert.equal(JSON.parse(p.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(p.stdout+p.stderr).includes('PRIVATE_CANARY'));
  });
});

test('M4-B9-B: CLI PASS and FAIL reflect user-authored symbolic checks not fixtures',()=>{
  for(const [events,exitCode,rule] of [
    [[symbolicEvent()],0,null],
    [[symbolicEvent({effect:'WRITE'})],1,'DENIED_ACTION_HAD_EFFECT'],
    [[symbolicEvent({decision:'ALLOW',effect:'READ'})],1,
      'EFFECT_WITHOUT_AUTHORIZATION']
  ]){
    withFixtureFile(JSON.stringify(symbolicTrace(events)),file=>{
      const p=cli('adapter-synthetic-trace',file);
      assert.equal(p.status,exitCode,p.stderr);
      const report=JSON.parse(p.stdout);
      symbolicBounds(report);
      assert.equal(report.reportSchemaVersion,1);
      assert.equal(report.command,'adapter-synthetic-trace');
      assert.equal(report.exitCode,exitCode);
      assert.ok(!p.stdout.includes(file));
      assert.deepEqual(report.summary.ruleCodes,rule?[rule]:[]);
      assert.equal(report.fixedFixtureControls,'NOT_RUN');
    });
  }
});

test('M4-B9-B: CLI refuses unknown arguments and escalation flags',()=>{
  for(const args of [
    ['adapter-synthetic-trace'],
    ['adapter-synthetic-trace','fixture.json','--run'],
    ['adapter-synthetic-trace','--url=https://private.example.org/mcp'],
    ['adapter-synthetic-trace','fixture.json','--tools/call'],
    ['adapter-synthetic-trace','fixture.json','--execute']
  ]){
    const v=cli(...args);
    assert.equal(v.status,2);
    assert.equal(JSON.parse(v.stdout).errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(v.stdout+v.stderr).includes('private.example.org'));
  }
});

test('M4-B9-B: both stdio and HTTPS inert descriptors behave identically',()=>{
  for(const transport of ['stdio','streamable-http']){
    const input=symbolicTrace([symbolicEvent()]);
    input.descriptor=createOfflineAdapterTemplate(transport).template;
    const r=auditSymbolicProjectTrace(input);
    symbolicBounds(r);
    assert.equal(r.transport,transport);
    assert.equal(r.status,'PASS');
  }
});

test('M4-B9-B: all outputs are symbolic and privacy-safe',()=>{
  const input=symbolicTrace([
    symbolicEvent({effect:'WRITE',secretLogged:true})
  ]);
  input.descriptor.project.name='PRIVATE_CUSTOMER';
  input.descriptor.transport.endpoint='https://private.example.org/mcp';
  const report=auditSymbolicProjectTrace(input);
  symbolicBounds(report);
  const text=JSON.stringify(report);
  for(const forbidden of [
    'PRIVATE_CUSTOMER','private.example.org','mcp://','user','password',
    'Authorization','execute-shell','PRIVATE_CANARY'
  ].filter(x=>x!=='user')) assert.ok(!text.includes(forbidden),forbidden);
  assert.deepEqual(report.findings,[
    {event:1,rule:'FLAGGED_SECRET_IN_AUDIT_LOG'},
    {event:1,rule:'DENIED_ACTION_HAD_EFFECT'}
  ]);
});

test('M4-B9-B: no mock source-site effects on PASS or FAIL traces',async()=>{
  for(const events of [[symbolicEvent()],[symbolicEvent({effect:'WRITE'})]]){
    const observed=await observeFirstPartyMockAttempts(
      ()=>auditSymbolicProjectTrace(symbolicTrace(events)));
    symbolicBounds(observed.result);
    assert.deepEqual(observed.attempts,[]);
  }
});

test('M4-B9-B: existing fixed-control audit and onboarding remain separate',()=>{
  const fixed=auditOfflineProjectFixtureBundle(bundle());
  guarded(fixed);
  assert.equal(fixed.status,'PASS');
  const custom=auditSymbolicProjectTrace(symbolicTrace([
    symbolicEvent({effect:'WRITE'})
  ]));
  symbolicBounds(custom);
  assert.equal(custom.status,'FAIL');
  assert.equal(previewProjectOnboarding(custom.descriptor??symbolicTrace().descriptor)
    .readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
});

test('M4-B9-B: help lists trace command without executable target or URL',()=>{
  const p=cli('help');
  assert.equal(p.status,0);
  const r=JSON.parse(p.stdout);
  assert.equal(r.commands.length,24);
  assert.ok(r.commands.includes('adapter-synthetic-trace'));
  assert.ok(r.syntax.some(s=>s.startsWith('node src/cli.mjs adapter-synthetic-trace ')));
  assert.ok(!p.stdout.includes('https://'));
});
