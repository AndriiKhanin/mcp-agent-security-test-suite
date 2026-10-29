/** M14: optional source-only capability demonstration and denial witnesses. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {runCapabilityTour,summarizeCapabilityTour}
  from '../tools/beta-capability-tour.mjs';

const adapter=()=>({
  smokeSchemaVersion:1,status:'PASS',exitCode:0,checked:2,passed:2,
  failed:0,sourceOnly:true,externalMcpContacted:false,
  projectCodeExecuted:false,actualProjectAssessed:false,
  independentBetaVerified:false,securityCertified:false,
  stableReleaseAuthorized:false,
  checks:['stdio','streamable-http'].map(transport=>({
    transport,matched:true,code:'FICTIONAL_KIT_AND_QUICKSTART_MATCH'
  }))
});
const policy=()=>({
  reportSchemaVersion:1,status:'PASS',exitCode:0,
  ruleCode:'FIXED_FIXTURE_POLICY_PROBES_MATCH',checked:4,matched:4,
  expectedDenials:3,fictionalTaskDataHandled:1,
  fictionalProtectedEffectsCommitted:0,fixtureContentInterpreted:false,
  actualAgentBehaviorObserved:false,realFilesystemReadObserved:false,
  untrustedInstructionExecuted:false,externalMcpContacted:false,
  independentBetaVerified:false,securityCertified:false,
  releaseAuthorized:false
});
const wire=(negative=false)=>({
  reportSchemaVersion:1,status:negative?'FAIL':'PASS',
  exitCode:negative?1:0,ruleCode:negative?
    'M12_SSE_REQUEST_REJECTED':'M12_REQUEST_SCOPED_SSE_VERIFIED',
  protocolVersion:'2026-07-28',modernJsonPrerequisiteAccepted:true,
  httpRequestsObserved:1,httpRequestsAccepted:negative?0:1,
  httpRequestsDenied:negative?1:0,rejectedHttpStatus:negative?400:0,
  httpResponsesClosed:1,tcpSocketsClosed:1,socketCleanupConfirmed:true,
  exactSseProgressAndFinalAccepted:!negative,
  toyGatewayDeliveries:negative?0:1,
  protectedFictionalEffectsCommitted:0,
  actualAgentBehaviorObserved:false,unrelatedFileReadObserved:false,
  actualExternalMcpContacted:false,
  embeddedInstructionInterpreted:false,embeddedInstructionExecuted:false,
  independentBetaVerified:false,securityCertified:false,
  releaseAuthorized:false
});
const assess=(a=adapter(),p=policy(),ok=wire(),bad=wire(true))=>
  summarizeCapabilityTour(a,p,ok,bad);
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/beta-capability-tour.mjs',...args],{
  cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',
  timeout:30000,maxBuffer:65536
});

test('M14-A: all four fixed first-party witnesses produce one bounded match',()=>{
  const r=assess();
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.checked,4);
  assert.equal(r.matched,4);
  assert.equal(r.failed,0);
  assert.deepEqual(r.cases.map(c=>c.id),[
    'INERT_ADAPTER_PROFILES','FICTIONAL_TOOL_RESULT_POLICY',
    'OWNED_LOOPBACK_SSE_ACCEPT','OWNED_LOOPBACK_SSE_AUTH_DENIAL'
  ]);
  assert.equal(r.cases[3].expectedOutcome,'DENY');
  assert.ok(r.cases.every(c=>c.matched));
  assert.equal(r.externalMcpContacted,false);
  assert.equal(r.actualAgentBehaviorObserved,false);
  assert.equal(r.independentBetaVerified,false);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
});

test('M14-B: self-reported success does not bypass bad gateway or cleanup witnesses',()=>{
  const a=wire();a.toyGatewayDeliveries=0;
  const b=wire(true);b.toyGatewayDeliveries=1;
  const c=wire(true);c.httpRequestsDenied=0;
  const d=wire();d.actualExternalMcpContacted=true;
  const e=wire();e.socketCleanupConfirmed=false;
  for(const r of [assess(adapter(),policy(),a),assess(adapter(),policy(),wire(),b),
    assess(adapter(),policy(),wire(),c),assess(adapter(),policy(),d),
    assess(adapter(),policy(),e)]){
    assert.equal(r.status,'FAIL');
    assert.equal(r.exitCode,1);
    assert.equal(r.matched,3);
    assert.equal(r.failed,1);
  }
});

test('M14-B: forged policy/adapter claims and sparse rows fail closed',()=>{
  const a=adapter();delete a.checks[0];
  assert.equal(assess(a).cases[0].matched,false);
  const b=adapter();b.externalMcpContacted=true;
  assert.equal(assess(b).cases[0].matched,false);
  const p=policy();p.fictionalProtectedEffectsCommitted=1;
  assert.equal(assess(adapter(),p).cases[1].matched,false);
  const q=policy();q.actualAgentBehaviorObserved=true;
  assert.equal(assess(adapter(),q).cases[1].matched,false);
});

test('M14-B: accessor payloads never execute and private material is never reflected',()=>{
  let accessed=0;
  const a=adapter();
  Object.defineProperty(a,'checks',{enumerable:true,get(){
    accessed++;throw Error('PRIVATE_CANARY');
  }});
  const r=assess(a);
  assert.equal(accessed,0);
  assert.equal(r.status,'FAIL');
  assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  const p=policy();p.private='PRIVATE_CANARY';
  const good=assess(adapter(),p);
  assert.ok(!JSON.stringify(good).includes('PRIVATE_CANARY'));
});

test('M14-C: actual owned local SSE acceptance and request-header denial',async()=>{
  const r=await runCapabilityTour();
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.ruleCode,'ALL_FICTIONAL_CAPABILITIES_MATCH');
  assert.equal(r.checked,4);
  assert.equal(r.matched,4);
  assert.equal(r.localLoopbackOnly,true);
  assert.equal(r.externalMcpContacted,false);
  assert.equal(r.actualAgentBehaviorObserved,false);
  assert.equal(r.realProjectAssessed,false);
  assert.equal(r.independentBetaVerified,false);
});

test('M14-C: no-argument CLI emits safe JSON only and rejects target input',()=>{
  const good=cli();
  assert.equal(good.status,0,good.stderr);
  assert.equal(good.stderr,'');
  const out=JSON.parse(good.stdout);
  assert.equal(out.status,'PASS');
  assert.equal(out.matched,4);
  assert.equal(out.cases[3].matched,true);
  assert.ok(!good.stdout.includes('http://'));
  for(const arg of ['https://private.example.org','PRIVATE_CANARY','--target']){
    const bad=cli(arg);
    assert.equal(bad.status,2,bad.stderr);
    assert.equal(bad.stderr,'');
    const report=JSON.parse(bad.stdout);
    assert.equal(report.ruleCode,'CAPABILITY_TOUR_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});

test('M14-C: standalone helper excluded from unpublished 80-path npm candidate',()=>{
  const files=JSON.parse(readFileSync(
    new URL('./expected-package-files.json',import.meta.url),'utf8'));
  assert.equal(files.length,80);
  assert.ok(!files.includes('tools/beta-capability-tour.mjs'));
});
