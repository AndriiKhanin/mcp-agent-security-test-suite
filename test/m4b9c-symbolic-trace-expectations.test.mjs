/**
 * M4-B9-C — strict offline expectation matcher.
 * All local fixtures are anonymous, fictional, and never contact MCP targets.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  auditSymbolicTraceExpectations,auditSymbolicProjectTrace,
  SYMBOLIC_TRACE_EXPECTATION_SCHEMA_VERSION,createOfflineAdapterTemplate,
} from '../src/project-adapter.mjs';
import {observeFirstPartyMockAttempts} from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:15000,maxBuffer:100000
});
const tempRun=(raw,run)=>{
  const dir=mkdtempSync(join(tmpdir(),'m4b9c-contract-'));
  const path=join(dir,'fixture.json');
  try{writeFileSync(path,raw,'utf8');return run(path);}
  finally{rmSync(dir,{force:true,recursive:true});}
};
const event=(extra={})=>({
  decision:'DENY',effect:'NONE',ownerAuthorized:false,
  scopeAuthorized:false,leaseFresh:false,secretLogged:false,...extra
});
const trace=(events=[event()])=>({
  traceSchemaVersion:1,mode:'user-authored-synthetic-only',
  descriptor:createOfflineAdapterTemplate('streamable-http').template,
  events
});
const expectation=(events=[event()],rules=events.map((_,i)=>({
  event:i+1,ruleCodes:[]
})),expectedStatus='PASS')=>({
  expectationSchemaVersion:1,mode:'synthetic-expectations-only',
  trace:trace(events),expectedStatus,expected:rules
});
const verified=r=>{
  assert.equal(r.profile,'offline-symbolic-trace-expectations-v1');
  assert.equal(r.expectationSchemaVersion,SYMBOLIC_TRACE_EXPECTATION_SCHEMA_VERSION);
  assert.equal(r.reportMeaning,'EXACT_SYNTHETIC_EXPECTATION_MATCH_ONLY');
  assert.equal(r.traceEvidence,'USER_AUTHORED_SYNTHETIC_TRACE_EVALUATED');
  assert.equal(r.traceOrigin,'USER_AUTHORED_SYMBOLIC_ONLY');
  assert.equal(r.fixedFixtureControls,'NOT_RUN');
  assert.equal(r.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
  assert.equal(r.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(r.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(r.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.executionEnabled,false);
  assert.equal(r.projectConnectionAuthorized,false);
  assert.equal(r.operatorVerified,false);
  assert.equal(r.recordsAreRealMcpObservations,false);
  assert.equal(r.failureCount,r.findings.length);
  assert.equal(r.checked,r.checks.length);
  assert.equal(r.findingsTruncated,false);
};
const reject=input=>assert.throws(()=>auditSymbolicTraceExpectations(input),
  /INVALID_SYMBOLIC_TRACE_EXPECTATIONS/);
const deniedWrite=event({effect:'WRITE'});
const unauthorizedRead=event({decision:'ALLOW',effect:'READ',
  leaseFresh:true});

test('M4-B9-C: version-1 contract and clean full-match CI PASS',()=>{
  assert.equal(SYMBOLIC_TRACE_EXPECTATION_SCHEMA_VERSION,1);
  const r=auditSymbolicTraceExpectations(expectation([event()]));
  verified(r);
  assert.equal(r.status,'PASS');
  assert.equal(r.observedSafetyStatus,'PASS');
  assert.equal(r.expectedSafetyStatus,'PASS');
  assert.equal(r.expectationStatus,'MATCH');
  assert.equal(r.expectationOutcome,'NO_VIOLATIONS_EXPECTED');
  assert.deepEqual(r.observedFindings,[]);
  assert.deepEqual(r.findings,[]);
});

test('M4-B9-C: expected safety FAIL is preserved even when CI matcher passes',()=>{
  const input=expectation([deniedWrite],[
    {event:1,ruleCodes:['DENIED_ACTION_HAD_EFFECT']}
  ],'FAIL');
  const r=auditSymbolicTraceExpectations(input);
  verified(r);
  assert.equal(r.status,'PASS');
  assert.equal(r.observedSafetyStatus,'FAIL');
  assert.equal(r.expectedSafetyStatus,'FAIL');
  assert.equal(r.expectationStatus,'MATCH');
  assert.equal(r.expectationOutcome,'VIOLATION_DETECTED_AS_EXPECTED');
  assert.equal(r.observedFailureCount,1);
  assert.deepEqual(r.observedFindings,[
    {event:1,rule:'DENIED_ACTION_HAD_EFFECT'}
  ]);
  assert.deepEqual(r.checks[0].observedRuleCodes,['DENIED_ACTION_HAD_EFFECT']);
  assert.deepEqual(r.findings,[]);
});

test('M4-B9-C: missed expected violation fails CI with separate observed PASS',()=>{
  const r=auditSymbolicTraceExpectations(expectation([event()],[
    {event:1,ruleCodes:['DENIED_ACTION_HAD_EFFECT']}
  ],'FAIL'));
  verified(r);
  assert.equal(r.status,'FAIL');
  assert.equal(r.observedSafetyStatus,'PASS');
  assert.equal(r.expectationStatus,'MISMATCH');
  assert.deepEqual(r.findings,[
    {event:1,rule:'SYMBOLIC_EXPECTATION_MISMATCH'},
    {event:0,rule:'SYMBOLIC_STATUS_EXPECTATION_MISMATCH'}
  ]);
});

test('M4-B9-C: unexpected violation fails exact clean CI expectation',()=>{
  const r=auditSymbolicTraceExpectations(expectation([deniedWrite]));
  verified(r);
  assert.equal(r.status,'FAIL');
  assert.equal(r.observedSafetyStatus,'FAIL');
  assert.equal(r.observedFailureCount,1);
  assert.equal(r.expectationStatus,'MISMATCH');
  assert.deepEqual(r.findings,[
    {event:1,rule:'SYMBOLIC_EXPECTATION_MISMATCH'},
    {event:0,rule:'SYMBOLIC_STATUS_EXPECTATION_MISMATCH'}
  ]);
});

test('M4-B9-C: wrong rule at same ordinal fails despite matching safety FAIL',()=>{
  const r=auditSymbolicTraceExpectations(expectation([deniedWrite],[
    {event:1,ruleCodes:['FLAGGED_SECRET_IN_AUDIT_LOG']}
  ],'FAIL'));
  verified(r);
  assert.equal(r.status,'FAIL');
  assert.equal(r.observedSafetyStatus,'FAIL');
  assert.deepEqual(r.findings,[{
    event:1,rule:'SYMBOLIC_EXPECTATION_MISMATCH'
  }]);
});

test('M4-B9-C: unexpected extra finding fails even when subset matches',()=>{
  const r=auditSymbolicTraceExpectations(expectation([
    event({effect:'WRITE',secretLogged:true})
  ],[{event:1,ruleCodes:['FLAGGED_SECRET_IN_AUDIT_LOG']}],'FAIL'));
  verified(r);
  assert.equal(r.status,'FAIL');
  assert.deepEqual(r.observedFindings,[
    {event:1,rule:'FLAGGED_SECRET_IN_AUDIT_LOG'},
    {event:1,rule:'DENIED_ACTION_HAD_EFFECT'}
  ]);
  assert.deepEqual(r.findings,[{event:1,rule:'SYMBOLIC_EXPECTATION_MISMATCH'}]);
});

test('M4-B9-C: mixed events require exact event numbering and all codes',()=>{
  const r=auditSymbolicTraceExpectations(expectation([
    event(),deniedWrite,unauthorizedRead
  ],[
    {event:1,ruleCodes:[]},
    {event:2,ruleCodes:['DENIED_ACTION_HAD_EFFECT']},
    {event:3,ruleCodes:['EFFECT_WITHOUT_AUTHORIZATION']}
  ],'FAIL'));
  verified(r);
  assert.equal(r.status,'PASS');
  assert.equal(r.observedSafetyStatus,'FAIL');
  assert.equal(r.observedFailureCount,2);
  assert.deepEqual(r.checks.map(x=>x.expectationStatus),['MATCH','MATCH','MATCH']);
});

test('M4-B9-C: reject status contradictions, empty and wildcard claims',()=>{
  const p=expectation();
  for(const v of [
    {...p,expectedStatus:'FAIL'},
    {...p,expected:[{event:1,ruleCodes:['DENIED_ACTION_HAD_EFFECT']}]},
    {...p,expectedStatus:'ANY'},
    {...p,expectedStatus:true},
    {...p,expected:[{event:1,ruleCodes:['*']}]},
    {...p,expected:[{event:1,ruleCodes:['ALL']}]},
    {...p,expected:[{event:1,ruleCodes:['REPLAYED_NONCE']}]},
    {...p,expected:[{event:1,ruleCodes:['denied_action_had_effect']}]},
    {...p,expected:[{event:1,ruleCodes:['EXPECTATION_MISMATCH']}]},
    {...p,expected:[{event:1,ruleCodes:[null]}]},
    {...p,expected:[{event:1,ruleCodes:['DENIED_ACTION_HAD_EFFECT',
      'DENIED_ACTION_HAD_EFFECT']}]}
  ])reject(v);
});

test('M4-B9-C: canonical exact-order rule arrays only',()=>{
  const p=expectation([event({effect:'WRITE',secretLogged:true})],[
    {event:1,ruleCodes:[
      'FLAGGED_SECRET_IN_AUDIT_LOG','DENIED_ACTION_HAD_EFFECT'
    ]}
  ],'FAIL');
  assert.equal(auditSymbolicTraceExpectations(p).status,'PASS');
  const reversed=structuredClone(p);
  reversed.expected[0].ruleCodes.reverse();
  reject(reversed);
});

test('M4-B9-C: reject missing, duplicate, out-of-range and unordered event slots',()=>{
  const p=expectation([event(),event()]);
  for(const expected of [
    [],[{event:1,ruleCodes:[]}],
    [{event:1,ruleCodes:[]},{event:1,ruleCodes:[]}],
    [{event:2,ruleCodes:[]},{event:1,ruleCodes:[]}],
    [{event:1,ruleCodes:[]},{event:3,ruleCodes:[]}],
    [{event:1,ruleCodes:[]},{event:0,ruleCodes:[]}],
    [{event:1,ruleCodes:[]},{event:2,ruleCodes:[],extra:true}]
  ]) reject({...p,expected});
});

test('M4-B9-C: dense exact JSON array shape, no holes or extra array props',()=>{
  const p=expectation();
  for(const expected of [
    new Array(1),
    Object.assign([{event:1,ruleCodes:[]}],{authorize:true}),
    [{event:1,ruleCodes:Array(1)}],
    [{event:1,ruleCodes:Object.assign([],{verified:true})}]
  ])reject({...p,expected});
  const invalidTrace=expectation();
  invalidTrace.trace.events=Array(1);
  reject(invalidTrace);
});

test('M4-B9-C: strict shape excludes input endpoints and inherited permissions',()=>{
  const p=expectation();
  for(const changed of [
    {...p,execute:true},{...p,verified:true},
    {...p,endpoint:'https://secret.example.org/mcp'},
    {...p,request:{method:'tools/call'}},
    {...p,mode:'network'}, {...p,expectationSchemaVersion:2},
    {...p,trace:{...p.trace,allowNetwork:true}},
    {...p,trace:{...p.trace,mode:'real-mcp'}},
    {...p,trace:{...p.trace,descriptor:{
      ...p.trace.descriptor,policy:{
        ...p.trace.descriptor.policy,allowToolCalls:true
      }
    }}},
    {...p,trace:{...p.trace,events:[{...event(),method:'tools/call'}]}}
  ])reject(changed);
});

test('M4-B9-C: getter, symbol, proto and cycle are rejected without echo',()=>{
  const p=expectation();
  const getter=expectation();
  Object.defineProperty(getter.expected[0],'event',{
    get(){throw Error('PRIVATE_CANARY')}
  });
  const sym=expectation();sym.expected[0][Symbol('hidden')]='PRIVATE_CANARY';
  const proto=Object.assign(Object.create(null),expectation());
  const cycle=expectation();cycle.extra=cycle;
  for(const candidate of [getter,sym,proto,cycle])reject(candidate);
  assert.equal(auditSymbolicTraceExpectations(p).status,'PASS');
});

test('M4-B9-C: hard 4KiB maximum input; no extra CLI args or executable flags',()=>{
  tempRun(JSON.stringify(expectation())+' '.repeat(4100),path=>{
    const x=cli('adapter-trace-expect',path);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
  });
  for(const args of [
    ['adapter-trace-expect'],['adapter-trace-expect','file','--execute'],
    ['adapter-trace-expect','--url=https://secret.example.org/mcp'],
    ['adapter-trace-expect','file','--tools/call']
  ]){
    const x=cli(...args);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(x.stdout+x.stderr).includes('secret.example.org'));
  }
});

test('M4-B9-C: malformed, duplicate JSON keys and forged expectation identifiers fail',()=>{
  for(const raw of [
    '{"expectationSchemaVersion":1,"expectationSchemaVersion":1}',
    '{"expectedStatus":"FAIL","expectedStatus":"PASS"}',
    '{"trace":{"events":[{"decision":"DENY","decision":"ALLOW"}]}}',
    '{"expected":[{"event":1,"ruleCodes":["*"]}]}',
    '{"unexpected":"PRIVATE_CANARY"}'
  ])tempRun(raw,path=>{
    const x=cli('adapter-trace-expect',path);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(x.stdout+x.stderr).includes('PRIVATE_CANARY'));
    assert.ok(!(x.stdout+x.stderr).includes(path));
  });
});

test('M4-B9-C: exact CI exit codes preserve safety FAIL independently',()=>{
  for(const [input,exitCode,safety,match] of [
    [expectation(),0,'PASS','MATCH'],
    [expectation([deniedWrite],[{
      event:1,ruleCodes:['DENIED_ACTION_HAD_EFFECT']
    }],'FAIL'),0,'FAIL','MATCH'],
    [expectation([deniedWrite]),1,'FAIL','MISMATCH'],
    [expectation([event()],[{
      event:1,ruleCodes:['DENIED_ACTION_HAD_EFFECT']
    }],'FAIL'),1,'PASS','MISMATCH']
  ])tempRun(JSON.stringify(input),path=>{
    const x=cli('adapter-trace-expect',path);
    assert.equal(x.status,exitCode,x.stderr);
    const r=JSON.parse(x.stdout);
    verified(r);
    assert.equal(r.status,exitCode===0?'PASS':'FAIL');
    assert.equal(r.observedSafetyStatus,safety);
    assert.equal(r.expectationStatus,match);
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.command,'adapter-trace-expect');
    assert.equal(r.exitCode,exitCode);
    assert.ok(!x.stdout.includes(path));
  });
});

test('M4-B9-C: output does not reveal descriptor or raw event booleans',()=>{
  const x=expectation([deniedWrite],[{
    event:1,ruleCodes:['DENIED_ACTION_HAD_EFFECT']
  }],'FAIL');
  x.trace.descriptor.project.name='PRIVATE_PROJECT';
  x.trace.descriptor.transport.endpoint='https://private.example.org/mcp';
  const r=auditSymbolicTraceExpectations(x);
  verified(r);
  const raw=JSON.stringify(r);
  for(const secret of [
    'PRIVATE_PROJECT','private.example.org','mcp://','ownerAuthorized',
    'scopeAuthorized','leaseFresh','secretLogged','tools/call'
  ])assert.ok(!raw.includes(secret),secret);
});

test('M4-B9-C: no first-party mock attempts, including expected violation',async()=>{
  const inputs=[
    expectation(),
    expectation([deniedWrite],[{
      event:1,ruleCodes:['DENIED_ACTION_HAD_EFFECT']
    }],'FAIL'),
    expectation([deniedWrite])
  ];
  for(const value of inputs){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>auditSymbolicTraceExpectations(value));
    verified(result);
    assert.deepEqual(attempts,[]);
  }
});

test('M4-B9-C: old symbolic trace behavior remains unchanged',()=>{
  const input=trace([deniedWrite]);
  const old=auditSymbolicProjectTrace(input);
  assert.equal(old.status,'FAIL');
  assert.deepEqual(old.findings,[{event:1,rule:'DENIED_ACTION_HAD_EFFECT'}]);
  assert.equal(old.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
});

test('M4-B9-C: both inert transports and eight events are supported',()=>{
  for(const transport of ['stdio','streamable-http']){
    const input=expectation(Array.from({length:8},()=>event()));
    input.trace.descriptor=createOfflineAdapterTemplate(transport).template;
    const result=auditSymbolicTraceExpectations(input);
    verified(result);
    assert.equal(result.checked,8);
    assert.equal(result.status,'PASS');
  }
});

test('M4-B9-C: CLI help offers only an inert local-file mode',()=>{
  const v=cli('help');
  assert.equal(v.status,0);
  const data=JSON.parse(v.stdout);
  assert.equal(data.commands.length,31);
  assert.ok(data.commands.includes('adapter-trace-expect'));
  assert.ok(data.syntax.some(s=>s.startsWith(
    'node src/cli.mjs adapter-trace-expect '
  )));
  assert.ok(!v.stdout.includes('https://'));
});
