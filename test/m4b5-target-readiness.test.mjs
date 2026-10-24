/**
 * M4-B5: synthetic/offline preflight protections ONLY.
 * Nothing here verifies real ownership, accesses DNS, or contacts a target.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectProjectAdapter } from '../src/project-adapter.mjs';
import { evaluateAdapterConsent, descriptorFingerprint } from '../src/adapter-consent.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixture=name=>JSON.parse(readFileSync(join(root,'examples','adapter-profiles',name),'utf8'));
const demoHttp=()=>fixture('streamable-http-project.json');
const run=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,shell:false,encoding:'utf8',timeout:15000,maxBuffer:65536
});

test('M4-B5: valid HTTP descriptor is syntax-only, no execution or ownership',()=>{
  const x=inspectProjectAdapter(demoHttp());
  assert.equal(x.status,'PASS');
  assert.equal(x.transport,'streamable-http');
  assert.equal(x.protocolVersion,'2026-07-28');
  assert.equal(x.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(x.executionEnabled,false);
  assert.ok(!Object.hasOwn(x,'operatorVerified'));
  assert.ok(!JSON.stringify(x).includes('mcp.example.org'));
});

test('M4-B5: portable stdio descriptor remains inert even with a plausible executable',()=>{
  const x=inspectProjectAdapter(fixture('stdio-project.json'));
  assert.equal(x.status,'PASS');
  assert.equal(x.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(x.executionEnabled,false);
  assert.ok(!JSON.stringify(x).includes('server.mjs'));
});

test('M4-B5: caller-controlled execution or authentication flags cannot be promoted',()=>{
  const base=demoHttp();
  for(const mutation of [
    {mode:'connect'}, {allowNetwork:true},{allowProcessSpawn:true},
    {allowToolCalls:true},{allowCredentials:true}
  ]) {
    const altered={...base,policy:{...base.policy,...mutation}};
    assert.throws(()=>inspectProjectAdapter(altered),/INVALID_PROJECT_ADAPTER_CONFIG/);
  }
  for(const extra of [{approved:true},{ownershipConfirmed:true},
    {credential:'fictional-canary'},{allowRealTargets:true}]) {
    assert.throws(()=>inspectProjectAdapter({...base,...extra}),
      /INVALID_PROJECT_ADAPTER_CONFIG/);
  }
});

test('M4-B5: syntactically valid self-asserted grant remains UNVERIFIED and has no contact authority',()=>{
  const d=demoHttp(),t=Date.now();
  const e={policySchemaVersion:1,descriptor:d,
    request:{project:d.project.name,transport:'streamable-http',
      method:'initialize',operatorId:'fictional-maintainer'},
    claim:{operatorId:'fictional-maintainer',projectFingerprint:descriptorFingerprint(d),
      transport:'streamable-http',methods:['initialize'],issuedAt:t-1000,
      expiresAt:t+10000,nonce:'fictional-nonce-01',revoked:false}};
  const report=evaluateAdapterConsent(e,{nowMs:t});
  assert.equal(report.status,'PASS');
  assert.equal(report.authorizationStatus,'UNVERIFIED_SELF_ASSERTION');
  assert.equal(report.operatorVerified,false);
  assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(report.executionEnabled,false);
  assert.ok(!JSON.stringify(report).includes(d.transport.endpoint));
});

test('M4-B5: fictional claims never authorize modern network discovery or privileged calls',()=>{
  const d=demoHttp(),t=Date.now();
  const e={policySchemaVersion:1,descriptor:d,
    request:{project:d.project.name,transport:'streamable-http',
      method:'server/discover',operatorId:'fictional-maintainer'},
    claim:{operatorId:'fictional-maintainer',projectFingerprint:descriptorFingerprint(d),
      transport:'streamable-http',methods:['server/discover'],issuedAt:t-1000,
      expiresAt:t+10000,nonce:'fictional-nonce-02',revoked:false}};
  assert.throws(()=>evaluateAdapterConsent(e,{nowMs:t}),/INVALID_ADAPTER_CONSENT_INPUT/);
  e.request.method='tools/call';e.claim.methods=['initialize'];
  assert.throws(()=>evaluateAdapterConsent(e,{nowMs:t}),/INVALID_ADAPTER_CONSENT_INPUT/);
  e.request.method='initialize';e.claim.revoked=true;
  const deny=evaluateAdapterConsent(e,{nowMs:t});
  assert.equal(deny.status,'FAIL');
  assert.equal(deny.executionEnabled,false);
  assert.equal(deny.connectionStatus,'NOT_ATTEMPTED');
});

test('M4-B5: HTTP syntax preflight does not bless risky alternate destinations',()=>{
  const base=demoHttp();
  for(const endpoint of [
    'http://mcp.example.org/mcp','https://127.0.0.1/mcp',
    'https://localhost/mcp','https://mcp.example.org:8443/mcp',
    'https://u:fictional@mcp.example.org/mcp',
    'https://mcp.example.org/mcp?token=fictional',
    'https://mcp.example.org/%2e%2e/admin',
    'https://mcp.example.org/mcp#private',
    'https://[::1]/mcp'
  ]) {
    assert.throws(()=>inspectProjectAdapter({...base,
      transport:{...base.transport,endpoint}}),/INVALID_PROJECT_ADAPTER_CONFIG/);
  }
});

test('M4-B5: public adapter-selftest cannot be redirected to a user endpoint',()=>{
  for(const token of [
    '--url=https://private.example.org/mcp','--operator=fictional-owner',
    '--method=server/discover','--connect', 'examples/adapter-profiles/stdio-project.json'
  ]) {
    const r=run('adapter-selftest',token);
    assert.equal(r.status,2);
    const report=JSON.parse(r.stdout);
    assert.equal(report.status,'ERROR');
    assert.equal(report.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(r.stdout+r.stderr).includes(token));
  }
});

test('M4-B5: CLI config check is still no-contact and reports sanitized output',()=>{
  const r=run('adapter-check','examples/adapter-profiles/streamable-http-project.json');
  assert.equal(r.status,0,r.stderr);
  const report=JSON.parse(r.stdout);
  assert.equal(report.command,'adapter-check');
  assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(report.executionEnabled,false);
  assert.ok(!r.stdout.includes('mcp.example.org'));
});

test('M4-B5: future architecture remains an explicit approval gate, not an enable flag',()=>{
  const text=readFileSync(join(root,'docs','M4_B5_TARGET_APPROVAL.md'),'utf8');
  for(const section of [
    'NO REAL-TARGET IMPLEMENTATION OR OWNER APPROVAL',
    'UNVERIFIED_SELF_ASSERTION','Authenticated operator',
    'SSRF','DNS','TLS','redirect','revocation','2026-07-28',
    'server/discover','tools/call','zero-credential',
    'independent','## 5. Explicit owner decision record'
  ]) assert.ok(text.toLowerCase().includes(section.toLowerCase()),
    'missing approval requirement '+section);
  const packet=readFileSync(join(root,'docs','M4_AUTHORIZED_INTEGRATIONS_RFC.md'),'utf8');
  assert.ok(packet.includes('M4_B5_TARGET_APPROVAL.md'));
});


// M4-B8-A: entirely fictional evidence SNAPSHOTS supplied independently of
// the target packet. These are not a verifier implementation or an authority.
import {simulateExactTargetAuthorization,TARGET_DECISION_SCHEMA_VERSION,
  createOfflineAdapterTemplate,previewProjectOnboarding} from '../src/project-adapter.mjs';
import {observeFirstPartyMockAttempts} from '../src/mock-attempt-observer.mjs';

const inventedPacket=()=>({
  decisionSchemaVersion:1,
  target:{scheme:'https',host:'mcp.example.org',port:443,path:'/mcp',
    environment:'nonproduction',protocolVersion:'2026-07-28'},
  request:{method:'server/discover',maxRequests:1,maxResponseBytes:32768,
    deadlineMs:5000,maxRetries:0,followRedirects:false},
  grant:{status:'SIMULATED_APPROVED',state:'UNUSED',
    nonce:'fictional-single-use-001',issuedAtMs:1000000,expiresAtMs:1060000,
    scope:{scheme:'https',host:'mcp.example.org',port:443,path:'/mcp',
      protocolVersion:'2026-07-28',method:'server/discover',maxRequests:1}}
});
const inventedProviderSnapshot=()=>({
  provenance:'TEST_ONLY_NOT_INDEPENDENT',
  ownership:'SIMULATED_PASS',operator:'SIMULATED_PASS',
  egress:'SIMULATED_PASS',tls:'SIMULATED_PASS',
  dns:'SIMULATED_PASS',ssrf:'SIMULATED_PASS'
});
const verdict=(p=inventedPacket(),e=inventedProviderSnapshot(),nowMs=1030000)=>
  simulateExactTargetAuthorization(p,e,{nowMs});
function neverAuthorized(v){
  assert.equal(v.decisionSchemaVersion,TARGET_DECISION_SCHEMA_VERSION);
  assert.equal(v.profile,'fictional-target-decision-preview-v1');
  assert.equal(v.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  assert.equal(v.executionEnabled,false);
  assert.equal(v.projectConnectionAuthorized,false);
  assert.equal(v.externalTargetContacted,false);
  assert.equal(v.operatorVerified,false);
  assert.equal(v.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(v.evidenceTrust,'TEST_ONLY_NOT_INDEPENDENT');
  assert.equal(v.failureCount,v.findings.length);
}
const hasRule=(v,rule)=>assert.ok(v.findings.some(x=>x.rule===rule),JSON.stringify(v));

test('M4-B8-A: fictional all-green snapshot is simulated PASS, never execution authority',()=>{
  const v=verdict();
  neverAuthorized(v);
  assert.equal(v.status,'PASS');
  assert.equal(v.simulationStatus,'SIMULATED_GATES_PASS');
  assert.equal(v.failureCount,0);
  assert.deepEqual(v.findings,[]);
  assert.equal(TARGET_DECISION_SCHEMA_VERSION,1);
});

test('M4-B8-A: missing independent evidence, fake verified:true, or missing provenance deny',()=>{
  for(const e of [
    null,{},true,{verified:true},
    {...inventedProviderSnapshot(),verified:true},
    {...inventedProviderSnapshot(),provenance:'INDEPENDENTLY_VERIFIED'},
    {...inventedProviderSnapshot(),provenance:undefined},
    {...inventedProviderSnapshot(),ownership:'VERIFIED'}
  ]){
    const v=verdict(inventedPacket(),e);
    neverAuthorized(v);
    assert.equal(v.status,'FAIL');
    hasRule(v,'TEST_EVIDENCE_INVALID');
  }
  hasRule(simulateExactTargetAuthorization(inventedPacket(),undefined,{nowMs:1030000}),
    'TEST_EVIDENCE_INVALID');
});

test('M4-B8-A: packet field self-assertions never constitute ownership or operator proof',()=>{
  for(const change of [
    {verified:true}, {ownershipConfirmed:true},{operatorVerified:true},
    {allowNetwork:true},{endpoint:'https://mcp.example.org/mcp'},
  ]){
    const v=verdict({...inventedPacket(),...change});
    neverAuthorized(v);
    hasRule(v,'INVALID_AUTHORIZATION_PACKET');
  }
});

test('M4-B8-A: host canonicalization, path confusion, credential and IP literals reject',()=>{
  for(const [key,value] of [
    ['scheme','http'],['scheme','HTTPs'],['port',444],
    ['host','MCP.EXAMPLE.ORG'],['host','mcp.example.org.'],
    ['host','mcp.example.org:443'],['host','mcp.example.org@evil.org'],
    ['host','mcp.local'],['host','127.0.0.1'],['host','169.254.169.254'],
    ['host','[::1]'],['host','xn--fake.example.org'],
    ['path','//mcp'],['path','/mcp?token=PRIVATE'],['path','/mcp#x'],
    ['path','/%2e%2e/admin'],['path','/a/../mcp'],
    ['path','/mcp/'],['environment','production'],
    ['protocolVersion','2025-11-25']
  ]){
    const p=inventedPacket();p.target[key]=value;
    const v=verdict(p);neverAuthorized(v);hasRule(v,'TARGET_NOT_CANONICAL');
  }
});

test('M4-B8-A: mismatched grant target, method, protocol or budget denies exact scope',()=>{
  for(const [key,value] of [
    ['scheme','http'],['host','different.example.org'],['port',444],
    ['path','/different'],['method','tools/call'],
    ['protocolVersion','2025-11-25'],['maxRequests',2]
  ]){
    const p=inventedPacket();p.grant.scope[key]=value;
    const v=verdict(p);neverAuthorized(v);hasRule(v,'GRANT_SCOPE_MISMATCH');
  }
});

test('M4-B8-A: forbidden methods, redirect, retries, resource enlargement deny',()=>{
  for(const [key,value] of [
    ['method','initialize'],['method','tools/list'],['method','tools/call'],
    ['method','resources/read'],['method','server/discover '],
    ['maxRequests',2],['maxResponseBytes',32769],
    ['maxResponseBytes',0],['deadlineMs',5001],['deadlineMs',0],
    ['maxRetries',1],['followRedirects',true]
  ]){
    const p=inventedPacket();p.request[key]=value;
    const v=verdict(p);neverAuthorized(v);hasRule(v,'REQUEST_OUT_OF_SCOPE');
  }
});

test('M4-B8-A: stale, future, missing and overlong grants fail closed',()=>{
  for(const [key,value] of [
    ['issuedAtMs',1030001],['expiresAtMs',1030000],
    ['expiresAtMs',1300001],['nonce','short'],
    ['nonce','PRIVATE-SECRET=bad'],['issuedAtMs',null]
  ]){
    const p=inventedPacket();p.grant[key]=value;
    const v=verdict(p);neverAuthorized(v);hasRule(v,'GRANT_TIME_OR_NONCE_INVALID');
  }
  for(const nowMs of [999999,1060000,-1,1.5]){
    const v=verdict(inventedPacket(),inventedProviderSnapshot(),nowMs);
    neverAuthorized(v);hasRule(v,'GRANT_TIME_OR_NONCE_INVALID');
  }
  hasRule(simulateExactTargetAuthorization(inventedPacket(),inventedProviderSnapshot()),
    'GRANT_TIME_OR_NONCE_INVALID');
});

test('M4-B8-A: revoked, consumed, pending and forged grant state are denied',()=>{
  for(const state of ['REVOKED','CONSUMED','PENDING','active',null]){
    const p=inventedPacket();p.grant.state=state;
    const v=verdict(p);neverAuthorized(v);
    assert.equal(v.status,'FAIL');
    hasRule(v,state==='REVOKED'?'GRANT_REVOKED':
      state==='CONSUMED'?'GRANT_REPLAYED':'GRANT_STATE_INVALID');
  }
  const p=inventedPacket();p.grant.status='APPROVED';
  hasRule(verdict(p),'GRANT_NOT_APPROVED');
});

test('M4-B8-A: each simulated gate has distinct symbolic fail-closed evidence',()=>{
  for(const [key,rule] of [
    ['ownership','OWNERSHIP_NOT_VERIFIED'],
    ['operator','OPERATOR_NOT_VERIFIED'],
    ['egress','EGRESS_PREFLIGHT_NOT_VERIFIED'],
    ['tls','TLS_PREFLIGHT_NOT_VERIFIED'],
    ['dns','DNS_PREFLIGHT_NOT_VERIFIED'],
    ['ssrf','SSRF_PREFLIGHT_NOT_VERIFIED']
  ]){
    const e=inventedProviderSnapshot();e[key]='UNKNOWN';
    const v=verdict(inventedPacket(),e);
    neverAuthorized(v);hasRule(v,rule);
    assert.equal(v.simulationStatus,'SIMULATED_DENY');
  }
});

test('M4-B8-A: fictional DNS success cannot substitute for ownership evidence',()=>{
  const e=inventedProviderSnapshot();
  e.ownership='SIMULATED_FAIL';e.dns='SIMULATED_PASS';
  const v=verdict(inventedPacket(),e);
  neverAuthorized(v);hasRule(v,'OWNERSHIP_NOT_VERIFIED');
  assert.equal(v.status,'FAIL');
});

test('M4-B8-A: stricter JSON-like schemas deny nested injected flags and accessors',()=>{
  for(const where of ['target','request','grant','scope']){
    const p=inventedPacket();
    const target=where==='scope'?p.grant.scope:p[where];
    target.verified=true;
    hasRule(verdict(p),'INVALID_AUTHORIZATION_PACKET');
  }
  const p=inventedPacket();
  Object.defineProperty(p.target,'host',{get(){throw new Error('PRIVATE_CANARY')}});
  const v=verdict(p);neverAuthorized(v);
  hasRule(v,'INVALID_AUTHORIZATION_PACKET');
  assert.ok(!JSON.stringify(v).includes('PRIVATE_CANARY'));
});

test('M4-B8-A: reports never include target, nonce, secrets, identifiers or raw evidence',()=>{
  const p=inventedPacket();p.target.host='secret.example.org';
  p.grant.nonce='PRIVATE_NONCE_NEVER_PRINT';
  const report=verdict(p,{...inventedProviderSnapshot(),ownership:'UNKNOWN'});
  neverAuthorized(report);
  const output=JSON.stringify(report);
  for(const secret of ['secret.example.org','PRIVATE_NONCE','fictional-single-use',
    '/mcp','SIMULATED_PASS','1000000']) assert.ok(!output.includes(secret),secret);
  assert.ok(report.findings.every(x=>Object.keys(x).join(',')==='rule'));
});

test('M4-B8-A: pure snapshots never create staging mock attempts',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(()=>
    verdict(inventedPacket(),inventedProviderSnapshot()));
  neverAuthorized(result);
  assert.deepEqual(attempts,[]);
});

test('M4-B8-A: profile/template/mock evidence cannot be promoted to real target authority',()=>{
  const template=createOfflineAdapterTemplate('streamable-http').template;
  assert.equal(previewProjectOnboarding(template).readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(inspectProjectAdapter(template).connectionStatus,'NOT_ATTEMPTED');
  for(const k of ['profilePassed','stagingPassed','mockPassed']){
    const p=inventedPacket();p[k]=true;
    const v=verdict(p);neverAuthorized(v);
    hasRule(v,'INVALID_AUTHORIZATION_PACKET');
  }
  neverAuthorized(verdict());
});

test('M4-B8-A: same unused grant can replay a SIMULATED PASS, never a real permit',()=>{
  const p=inventedPacket(),e=inventedProviderSnapshot();
  const first=verdict(p,e),second=verdict(p,e);
  assert.deepEqual(first,second);
  assert.equal(first.status,'PASS');
  neverAuthorized(first);neverAuthorized(second);
  // A future effectful implementation MUST use a durable atomic replay ledger.
});

test('M4-B8-A: no new CLI route can be injected through user-controlled input',()=>{
  for(const args of [
    ['adapter-check','--target=https://private.example.org/mcp'],
    ['adapter-onboard','--execute'],
    ['adapter-template','stdio','--authorize'],
    ['adapter-onboarding-demo','--target=https://private.example.org/mcp'],
    ['adapter-authorization-preview','foo.json']
  ]){
    const out=run(...args);
    assert.equal(out.status,2,args.join(' '));
    assert.equal(JSON.parse(out.stdout).status,'ERROR');
    assert.ok(!out.stdout.includes('private.example.org'));
  }
});


// M4-B8-B: non-authoritative in-memory issue/consume/revoke rehearsal.
// A matching synthetic hash is NOT proof of real source provenance.
import {fingerprintFictionalTargetPacket,inspectFictionalEvidenceSnapshot,
  createFictionalPermitRehearsal,FICTIONAL_EVIDENCE_SCHEMA_VERSION,
  FICTIONAL_REHEARSAL_SCHEMA_VERSION} from '../src/project-adapter.mjs';
const fakeOperator='fictional-operator-01';
const rehearsalPacket=()=>inventedPacket();
const fakeSnapshot=(p=rehearsalPacket(),operatorId=fakeOperator)=>({
  evidenceSchemaVersion:1,
  provenance:'TEST_ONLY_NOT_INDEPENDENT',
  providerId:'OWNED_SYNTHETIC_PROVIDER_V1',
  issuer:'FICTIONAL_OFFLINE_ISSUER_V1',
  operatorId,
  packetFingerprint:fingerprintFictionalTargetPacket(p,operatorId),
  issuedAtMs:1020000,
  expiresAtMs:1040000,
  checks:{
    ownership:'SIMULATED_PASS',operator:'SIMULATED_PASS',
    egress:'SIMULATED_PASS',tls:'SIMULATED_PASS',
    dns:'SIMULATED_PASS',ssrf:'SIMULATED_PASS'
  }
});
function offlineRehearsalReport(r,state,pass){
  assert.equal(r.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.executionEnabled,false);
  assert.equal(r.projectConnectionAuthorized,false);
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.operatorVerified,false);
  assert.equal(r.evidenceTrust,'TEST_ONLY_NOT_INDEPENDENT');
  assert.equal(r.profile,'fictional-one-time-permit-rehearsal-v1');
  assert.equal(r.rehearsalSchemaVersion,FICTIONAL_REHEARSAL_SCHEMA_VERSION);
  assert.equal(r.rehearsalState,state);
  assert.equal(r.status,pass?'PASS':'FAIL');
  assert.equal(r.failureCount,r.findings.length);
  assert.ok(r.findings.every(f=>Object.keys(f).join(',')==='rule'));
  return r;
}
const checkFailure=(r,state,rule)=>{
  offlineRehearsalReport(r,state,false);
  hasRule(r,rule);
};

test('M4-B8-B: strict synthetic evidence bound to packet and fictional operator',()=>{
  const p=rehearsalPacket();
  const s=fakeSnapshot(p);
  const report=inspectFictionalEvidenceSnapshot(p,fakeOperator,s,{nowMs:1030000});
  offlineRehearsalReport(report,'NOT_ISSUED',true);
  assert.equal(report.operation,'INSPECT_TEST_EVIDENCE');
  assert.equal(FICTIONAL_EVIDENCE_SCHEMA_VERSION,1);
  assert.match(s.packetFingerprint,/^[a-f0-9]{64}$/u);
  assert.equal(fingerprintFictionalTargetPacket(p,fakeOperator),s.packetFingerprint);
});

test('M4-B8-B: canonical digest stable across reordered own JSON properties',()=>{
  const p=rehearsalPacket();
  const reordered={grant:{scope:{...p.grant.scope},...Object.fromEntries(
    Object.entries(p.grant).filter(([k])=>k!=='scope'))},
    request:{...p.request},target:{...p.target},decisionSchemaVersion:1};
  assert.equal(fingerprintFictionalTargetPacket(p,fakeOperator),
    fingerprintFictionalTargetPacket(reordered,fakeOperator));
});

test('M4-B8-B: provider provenance absent, forged or malformed fails closed',()=>{
  const p=rehearsalPacket();
  for(const patch of [
    {issuer:'trusted-CA'}, {providerId:'PRIVATE_FAKE_PROVIDER'},
    {provenance:'INDEPENDENT_PROOF'}, {evidenceSchemaVersion:2},
    {verified:true},{operatorVerified:true},
    {targetUrl:'https://private.example.org/mcp'}
  ]){
    const s={...fakeSnapshot(p),...patch};
    const report=inspectFictionalEvidenceSnapshot(p,fakeOperator,s,{nowMs:1030000});
    assert.equal(report.status,'FAIL');
    assert.equal(report.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  }
  for(const s of [null,undefined,{verified:true},{},'PASS']){
    checkFailure(inspectFictionalEvidenceSnapshot(p,fakeOperator,s,{nowMs:1030000}),
      'NOT_ISSUED','TEST_PROVIDER_SNAPSHOT_INVALID');
  }
});

test('M4-B8-B: snapshot target and operator binding cannot be swapped',()=>{
  const p=rehearsalPacket(),s=fakeSnapshot(p);
  for(const [where,key,value] of [
    ['target','host','different.example.org'],
    ['target','path','/different'],
    ['request','method','tools/call'],
    ['grant','nonce','fictional-alternate-nonce-01'],
    ['grant','issuedAtMs',1000001],
    ['scope','maxRequests',2]
  ]){
    const changed=structuredClone(p);
    (where==='scope'?changed.grant.scope:changed[where])[key]=value;
    const report=inspectFictionalEvidenceSnapshot(
      changed,fakeOperator,s,{nowMs:1030000});
    assert.equal(report.status,'FAIL',where+':'+key);
    assert.equal(report.executionEnabled,false);
  }
  checkFailure(inspectFictionalEvidenceSnapshot(p,'fictional-operator-02',s,
    {nowMs:1030000}),'NOT_ISSUED','TEST_PROVIDER_OPERATOR_MISMATCH');
});

test('M4-B8-B: stale, future and oversized evidence window rejected',()=>{
  const p=rehearsalPacket();
  for(const patch of [
    {issuedAtMs:1040000,expiresAtMs:1050000},
    {issuedAtMs:1010000,expiresAtMs:1020000},
    {issuedAtMs:1020000,expiresAtMs:1080001},
    {issuedAtMs:999999,expiresAtMs:1040000},
    {issuedAtMs:1020000,expiresAtMs:1060001},
    {issuedAtMs:1030000,expiresAtMs:1030000},
    {issuedAtMs:null},
  ]){
    const s={...fakeSnapshot(p),...patch};
    checkFailure(inspectFictionalEvidenceSnapshot(p,fakeOperator,s,
      {nowMs:1030000}),'NOT_ISSUED','TEST_PROVIDER_EVIDENCE_STALE');
  }
  checkFailure(inspectFictionalEvidenceSnapshot(p,fakeOperator,fakeSnapshot(p),
    {}),'NOT_ISSUED','TEST_PROVIDER_EVIDENCE_STALE');
});

test('M4-B8-B: each synthetic provider check needs separate PASS',()=>{
  const p=rehearsalPacket();
  for(const key of ['ownership','operator','egress','tls','dns','ssrf']){
    const s=fakeSnapshot(p);s.checks[key]='SIMULATED_FAIL';
    checkFailure(inspectFictionalEvidenceSnapshot(p,fakeOperator,s,
      {nowMs:1030000}),'NOT_ISSUED','TEST_PROVIDER_GATE_DENIED');
  }
});

test('M4-B8-B: prototype manipulation, extra nested keys and accessors deny',()=>{
  const p=rehearsalPacket();
  for(const changed of [
    {...fakeSnapshot(p),__proto__:null,verified:true},
    {...fakeSnapshot(p),checks:{...fakeSnapshot(p).checks,verified:true}},
    Object.assign(Object.create(null),fakeSnapshot(p)),
  ]){
    assert.equal(inspectFictionalEvidenceSnapshot(p,fakeOperator,changed,
      {nowMs:1030000}).status,'FAIL');
  }
  const getter=fakeSnapshot(p);
  Object.defineProperty(getter,'issuer',{enumerable:true,
    get(){throw new Error('PRIVATE_GETTER_CANARY')}});
  const report=inspectFictionalEvidenceSnapshot(p,fakeOperator,getter,
    {nowMs:1030000});
  checkFailure(report,'NOT_ISSUED','TEST_PROVIDER_SNAPSHOT_INVALID');
  assert.ok(!JSON.stringify(report).includes('PRIVATE_GETTER_CANARY'));
});

test('M4-B8-B: request → issue → consume, second consume always denied',()=>{
  const p=rehearsalPacket();
  const session=createFictionalPermitRehearsal(p,fakeOperator);
  offlineRehearsalReport(session.current(),'REQUESTED',true);
  offlineRehearsalReport(session.issue(fakeSnapshot(p),{nowMs:1030000}),
    'ISSUED',true);
  offlineRehearsalReport(session.consume(p,fakeOperator,{nowMs:1030001}),
    'CONSUMED',true);
  checkFailure(session.consume(p,fakeOperator,{nowMs:1030002}),
    'CONSUMED','TEST_GRANT_REPLAYED');
  assert.equal(session.current().rehearsalState,'CONSUMED');
  assert.equal(typeof session.connect,'undefined');
  assert.equal(typeof session.run,'undefined');
});

test('M4-B8-B: concurrent consume attempts succeed once within one cell',async()=>{
  const p=rehearsalPacket();
  const s=createFictionalPermitRehearsal(p,fakeOperator);
  offlineRehearsalReport(s.issue(fakeSnapshot(p),{nowMs:1030000}),'ISSUED',true);
  const outcomes=await Promise.all(Array.from({length:24},async()=>
    s.consume(structuredClone(p),fakeOperator,{nowMs:1030001})));
  assert.equal(outcomes.filter(x=>x.status==='PASS').length,1);
  assert.equal(outcomes.filter(x=>x.status==='FAIL').length,23);
  for(const r of outcomes)offlineRehearsalReport(r,
    r.status==='PASS'?'CONSUMED':'CONSUMED',r.status==='PASS');
});

test('M4-B8-B: consume wrong operator, target and method leaves grant unused',()=>{
  const p=rehearsalPacket(),s=createFictionalPermitRehearsal(p,fakeOperator);
  s.issue(fakeSnapshot(p),{nowMs:1030000});
  checkFailure(s.consume(p,'fictional-operator-02',{nowMs:1030001}),
    'ISSUED','TEST_CONSUMER_OPERATOR_MISMATCH');
  for(const [where,key,value] of [
    ['target','path','/other'],
    ['target','host','other.example.org'],
    ['request','method','tools/list'],
  ]){
    const changed=structuredClone(p);changed[where][key]=value;
    checkFailure(s.consume(changed,fakeOperator,{nowMs:1030001}),
      'ISSUED','TEST_CONSUMER_SCOPE_MISMATCH');
  }
  offlineRehearsalReport(s.consume(p,fakeOperator,{nowMs:1030001}),
    'CONSUMED',true);
});

test('M4-B8-B: revoke before issue or between issue and consume denies',()=>{
  const p=rehearsalPacket();
  const before=createFictionalPermitRehearsal(p,fakeOperator);
  offlineRehearsalReport(before.revoke({nowMs:1030000}),'REVOKED',true);
  checkFailure(before.issue(fakeSnapshot(p),{nowMs:1030000}),
    'REVOKED','TEST_GRANT_REVOKED');
  const during=createFictionalPermitRehearsal(p,fakeOperator);
  during.issue(fakeSnapshot(p),{nowMs:1030000});
  offlineRehearsalReport(during.revoke({nowMs:1030001}),'REVOKED',true);
  checkFailure(during.consume(p,fakeOperator,{nowMs:1030001}),
    'REVOKED','TEST_GRANT_REVOKED');
});

test('M4-B8-B: test permit and evidence expiry precede all consumes',()=>{
  const p=rehearsalPacket();
  const cell=createFictionalPermitRehearsal(p,fakeOperator);
  cell.issue(fakeSnapshot(p),{nowMs:1030000});
  checkFailure(cell.consume(p,fakeOperator,{nowMs:1040000}),
    'EXPIRED','TEST_GRANT_EXPIRED');
  checkFailure(cell.consume(p,fakeOperator,{nowMs:1030000}),
    'EXPIRED','TEST_GRANT_EXPIRED');
  const raw=createFictionalPermitRehearsal(p,fakeOperator);
  checkFailure(raw.expire({nowMs:1030000}),'REQUESTED','TEST_GRANT_NOT_EXPIRED');
  offlineRehearsalReport(raw.expire({nowMs:1060000}),'EXPIRED',true);
  checkFailure(raw.issue(fakeSnapshot(p),{nowMs:1060001}),
    'EXPIRED','TEST_GRANT_EXPIRED');
});

test('M4-B8-B: unknown clock, invalid evidence and forged packet cannot issue',()=>{
  const p=rehearsalPacket();
  const cell=createFictionalPermitRehearsal(p,fakeOperator);
  checkFailure(cell.issue(fakeSnapshot(p),{nowMs:-1}),
    'REQUESTED','TEST_CLOCK_INVALID');
  checkFailure(cell.issue({...fakeSnapshot(p),verified:true},{nowMs:1030000}),
    'REQUESTED','TEST_PROVIDER_SNAPSHOT_INVALID');
  checkFailure(cell.issue({...fakeSnapshot(p),issuer:'real-production-ca'},
    {nowMs:1030000}),'REQUESTED','TEST_PROVIDER_PROVENANCE_INVALID');
  checkFailure(cell.issue({...fakeSnapshot(p),packetFingerprint:'0'.repeat(64)},
    {nowMs:1030000}),'REQUESTED','TEST_PROVIDER_PACKET_MISMATCH');
  assert.equal(cell.current().rehearsalState,'REQUESTED');
  offlineRehearsalReport(cell.issue(fakeSnapshot(p),{nowMs:1030000}),'ISSUED',true);
});

test('M4-B8-B: reports never expose target, nonce, digest, issuer or raw proof',()=>{
  const p=rehearsalPacket(),snap=fakeSnapshot(p);
  const cell=createFictionalPermitRehearsal(p,fakeOperator);
  const reports=[
    inspectFictionalEvidenceSnapshot(p,'fictional-operator-02',snap,{nowMs:1030000}),
    cell.issue({...snap,issuer:'PRIVATE_FAKE_ISSUER'},{nowMs:1030000}),
    cell.issue(snap,{nowMs:1030000}),
    cell.consume(p,fakeOperator,{nowMs:1030001}),
    cell.consume(p,fakeOperator,{nowMs:1030002})
  ];
  const serialized=JSON.stringify(reports);
  for(const item of [
    'mcp.example.org','fictional-operator-01','fictional-single-use-001',
    snap.packetFingerprint,'PRIVATE_FAKE_ISSUER','/mcp','1020000'
  ])assert.ok(!serialized.includes(item));
  assert.ok(reports.every(x=>x.authorizationStatus==='REAL_TARGET_EXECUTION_NOT_AUTHORIZED'));
});

test('M4-B8-B: packet and snapshot copies do not cross an actual trust boundary',()=>{
  const p=rehearsalPacket(),snap=fakeSnapshot(p);
  const first=createFictionalPermitRehearsal(p,fakeOperator);
  const second=createFictionalPermitRehearsal(p,fakeOperator);
  // Two isolated memory cells cannot detect each other's consumption.
  first.issue(snap,{nowMs:1030000});
  second.issue(structuredClone(snap),{nowMs:1030000});
  assert.equal(first.consume(p,fakeOperator,{nowMs:1030001}).status,'PASS');
  assert.equal(second.consume(p,fakeOperator,{nowMs:1030001}).status,'PASS');
  assert.equal(second.consume(p,fakeOperator,{nowMs:1030002}).status,'FAIL');
  // Demonstrates why a durable atomic cross-process ledger is still required.
});

test('M4-B8-B: no first-party side effects for simulated state transitions',async()=>{
  const p=rehearsalPacket();
  const observed=await observeFirstPartyMockAttempts(()=>{
    const cell=createFictionalPermitRehearsal(p,fakeOperator);
    cell.issue(fakeSnapshot(p),{nowMs:1030000});
    cell.consume(p,fakeOperator,{nowMs:1030001});
    return cell.current();
  });
  assert.deepEqual(observed.attempts,[]);
  assert.equal(observed.result.externalTargetContacted,false);
});

test('M4-B8-B: previously reviewed CLI modes still reject executable flags',()=>{
  for(const args of [
    ['adapter-template','stdio','--run'],
    ['adapter-onboard','--connect'],
    ['adapter-onboarding-demo','--target=https://private.example.org/mcp'],
    ['adapter-authorization-preview','file.json'],
    ['adapter-issue-grant','file.json']
  ]){
    const result=run(...args);
    assert.equal(result.status,2);
    assert.equal(JSON.parse(result.stdout).status,'ERROR');
    assert.ok(!result.stdout.includes('private.example.org'));
  }
});
