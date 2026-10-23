import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { auditModernNegotiation, UNSUPPORTED_PROTOCOL_VERSION, MISSING_REQUIRED_CLIENT_CAPABILITY } from '../src/mcp-modern-negotiation.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const safe=JSON.parse(readFileSync(new URL('../fixtures/mcp-negotiate-safe.json',import.meta.url),'utf8'));
const unsafe=JSON.parse(readFileSync(new URL('../fixtures/mcp-negotiate-unsafe.json',import.meta.url),'utf8'));
const clone = x=>structuredClone(x);
const audit = x=>auditModernNegotiation(x);
const has = (r,k)=>r.findings.some(f=>f.rule===k);
const run = f=>spawnSync(process.execPath,['src/cli.mjs','negotiate',f],{cwd:root,encoding:'utf8'});
const n = (steps) => ({...clone(safe),steps});
const req = (i,version='2026-07-28',caps={})=>({jsonrpc:'2.0',id:i,method:'tools/list',params:{_meta:{'io.modelcontextprotocol/protocolVersion':version,'io.modelcontextprotocol/clientCapabilities':caps}}});
const ok = i=>({jsonrpc:'2.0',id:i,result:{tools:[]}});
const error = (i,code,data)=>({jsonrpc:'2.0',id:i,error:{code,message:'Fictional error',data}});
const pair=(q,a)=>({request:q,response:a});
const noop=()=>n([pair(req(1),ok(1))]);

test('valid synthetic mismatched-version retry and capability rejection pass',()=>assert.equal(audit(safe).status,'PASS'));
test('unsafe fixture returns three bounded rule findings',()=>{const r=audit(unsafe);assert.equal(r.status,'FAIL');assert.equal(r.failureCount,3);});
test('unsupported-protocol-version code is the specified -32022',()=>assert.equal(UNSUPPORTED_PROTOCOL_VERSION,-32022));
test('missing-capability code is the specified -32021',()=>assert.equal(MISSING_REQUIRED_CLIENT_CAPABILITY,-32021));
test('simple valid modern exchange passes without discovery',()=>assert.equal(audit(noop()).status,'PASS'));
test('response result may legitimately be null',()=>assert.equal(audit(n([pair(req(1),{jsonrpc:'2.0',id:1,result:null})])).status,'PASS'));
test('missing profile rejects as invalid input',()=>assert.throws(()=>audit({...safe,profile:undefined}),/INVALID_NEGOTIATION_FIXTURE/));
test('extra root property rejects',()=>assert.throws(()=>audit({...safe,executeShell:true}),/INVALID_NEGOTIATION_FIXTURE/));
test('empty steps reject',()=>assert.throws(()=>audit(n([])),/INVALID_NEGOTIATION_FIXTURE/));
test('more than 64 steps reject',()=>assert.throws(()=>audit(n(Array(65).fill(safe.steps[0]))),/INVALID_NEGOTIATION_FIXTURE/));
test('duplicate client-supported version list rejects',()=>assert.throws(()=>audit({...noop(),clientVersions:['2026-07-28','2026-07-28']}),/INVALID_NEGOTIATION_FIXTURE/));
test('invalid granted capability container rejects',()=>assert.throws(()=>audit({...noop(),grantedCapabilities:[]}),/INVALID_NEGOTIATION_FIXTURE/));
test('legacy initialize request rejected in modern negotiation',()=>{let x=noop();x.steps[0].request.method='initialize';assert.ok(has(audit(x),'INVALID_MODERN_REQUEST'));});
test('wrong protocol JSON-RPC version rejects',()=>{let x=noop();x.steps[0].request.jsonrpc='1.0';assert.ok(has(audit(x),'INVALID_MODERN_REQUEST'));});
test('missing metadata rejects',()=>{let x=noop();delete x.steps[0].request.params._meta;assert.ok(has(audit(x),'INVALID_MODERN_REQUEST'));});
test('missing clientCapabilities declaration rejects',()=>{let x=noop();delete x.steps[0].request.params._meta['io.modelcontextprotocol/clientCapabilities'];assert.ok(has(audit(x),'INVALID_PER_REQUEST_DECLARATION'));});
test('requested version not claimed by client rejects',()=>{let x=noop();x.steps[0].request.params._meta['io.modelcontextprotocol/protocolVersion']='2098-01-01';assert.ok(has(audit(x),'INVALID_PER_REQUEST_DECLARATION'));});
test('unauthorized client capabilities fail closed',()=>{let x=noop();x.steps[0].request.params._meta['io.modelcontextprotocol/clientCapabilities']={elicitation:{form:{}}};assert.ok(has(audit(x),'UNAUTHORIZED_CAPABILITY_DECLARATION'));});
test('exact allowed capability declaration passes',()=>{let x=noop();const c={elicitation:{form:{}}};x.grantedCapabilities=c;x.steps[0].request.params._meta['io.modelcontextprotocol/clientCapabilities']=c;assert.equal(audit(x).status,'PASS');});
test('overdeclared nested capability refused',()=>{let x=noop();x.grantedCapabilities={elicitation:{form:{}}};x.steps[0].request.params._meta['io.modelcontextprotocol/clientCapabilities']={elicitation:{form:{},url:{}}};assert.ok(has(audit(x),'UNAUTHORIZED_CAPABILITY_DECLARATION'));});
test('response wrong ID rejected',()=>{let x=noop();x.steps[0].response.id=2;assert.ok(has(audit(x),'INVALID_NEGOTIATION_RESPONSE'));});
test('response result and error both rejected',()=>{let x=noop();x.steps[0].response.error={code:-1,message:'both'};assert.ok(has(audit(x),'INVALID_NEGOTIATION_RESPONSE'));});
test('response missing result and error rejected',()=>{let x=noop();delete x.steps[0].response.result;assert.ok(has(audit(x),'INVALID_NEGOTIATION_RESPONSE'));});
test('missing version error data rejected',()=>{let x=noop();x.steps[0].response=error(1,-32022,{});assert.ok(has(audit(x),'INVALID_UNSUPPORTED_VERSION_EVIDENCE'));});
test('unsupported version evidence cannot contradict requested version',()=>{let x=noop();x.steps[0].response=error(1,-32022,{requested:'2099-01-01',supported:['2026-07-28']});assert.ok(has(audit(x),'INVALID_UNSUPPORTED_VERSION_EVIDENCE'));});
test('server cannot claim request version unsupported while listing it as supported',()=>{let x=noop();x.steps[0].response=error(1,-32022,{requested:'2026-07-28',supported:['2026-07-28']});assert.ok(has(audit(x),'INVALID_UNSUPPORTED_VERSION_EVIDENCE'));});
test('required-version retry missing is rejected',()=>{let x=clone(safe);x.steps=x.steps.slice(0,1);assert.ok(has(audit(x),'MISSING_MUTUAL_VERSION_RETRY'));});
test('retries must pick mutually supported version',()=>{let x=clone(safe);x.steps[1].request.params._meta['io.modelcontextprotocol/protocolVersion']='2099-01-01';assert.ok(has(audit(x),'RETRY_VERSION_NOT_MUTUALLY_SUPPORTED'));});
test('no overlap forbids retry',()=>{let x=clone(safe);x.steps[0].response.error.data.supported=['2098-01-01'];assert.ok(has(audit(x),'RETRY_AFTER_NO_COMMON_VERSION'));});
test('missing-capability evidence rejects empty object',()=>{let x=noop();x.steps[0].response=error(1,-32021,{requiredCapabilities:{}});assert.ok(has(audit(x),'INVALID_REQUIRED_CAPABILITY_EVIDENCE'));});
test('missing-capability evidence rejects already-declared requirement',()=>{let x=noop();const c={elicitation:{form:{}}};x.grantedCapabilities=c;x.steps[0].request.params._meta['io.modelcontextprotocol/clientCapabilities']=c;x.steps[0].response=error(1,-32021,{requiredCapabilities:c});assert.ok(has(audit(x),'INVALID_REQUIRED_CAPABILITY_EVIDENCE'));});
test('correct missing-capability error is not a security-approval grant',()=>{let x=noop();x.steps[0].response=error(1,-32021,{requiredCapabilities:{elicitation:{form:{}}}});assert.equal(audit(x).status,'PASS');});
test('duplicate request IDs are rejected even when responses match',()=>{let x=noop();x.steps.push(clone(x.steps[0]));assert.ok(has(audit(x),'REUSED_REQUEST_ID'));});
test('report never contains private synthetic data from replies',()=>{let x=noop();x.steps[0].response.result={SYNTHETIC_SECRET:'DO_NOT_PRINT'};assert.ok(!JSON.stringify(audit(x)).includes('DO_NOT_PRINT'));});
test('invalid protocol error type rejected',()=>{let x=noop();x.steps[0].response=error(1,'-32022',{supported:['2026-07-28'],requested:'2026-07-28'});assert.ok(has(audit(x),'INVALID_PROTOCOL_ERROR'));});
test('CLI returns exit zero on safe fixture',()=>{const x=run('fixtures/mcp-negotiate-safe.json');assert.equal(x.status,0,x.stderr);});
test('CLI returns exit one on unsafe fixture, not exit two',()=>{const x=run('fixtures/mcp-negotiate-unsafe.json');assert.equal(x.status,1,x.stderr);});
test('CLI does not expose missing paths',()=>{const x=run('fixtures/nonexistent-secret-path.json');assert.equal(x.status,2);assert.ok(!x.stderr.includes('nonexistent-secret-path'));});
test('legacy handshake cannot be substituted for modern-version retry',()=>{let x=clone(safe);x.steps[1].request.method='initialize';assert.ok(has(audit(x),'INVALID_MODERN_REQUEST'));});
test('modern retry must preserve request method',()=>{let x=clone(safe);x.steps[1].request.method='prompts/list';assert.ok(has(audit(x),'RETRY_METHOD_CHANGED'));});

// v0.0.10: a synthetic version retry must not silently change tool arguments,
// requested capabilities or extra metadata along with the protocol version.
function versionRetryWithPayload() {
  const fixture=clone(safe);
  fixture.steps=fixture.steps.slice(0,2);
  for (const step of fixture.steps) {
    step.request.method='tools/call';
    step.request.params.name='fictional-read-note';
    step.request.params.arguments={note:{id:'public',tags:['fixture']},limit:3};
  }
  return fixture;
}
test('negotiated version-only retry with identical nested arguments passes',()=>{
  assert.equal(audit(versionRetryWithPayload()).status,'PASS');
});
test('mutating a tool argument during version retry fails closed',()=>{
  const f=versionRetryWithPayload();
  f.steps[1].request.params.arguments.limit=999;
  assert.ok(has(audit(f),'RETRY_PARAMS_CHANGED'));
});
test('nested payload modification during version retry is detected',()=>{
  const f=versionRetryWithPayload();
  f.steps[1].request.params.arguments.note.tags.push('changed');
  assert.ok(has(audit(f),'RETRY_PARAMS_CHANGED'));
});
test('removing an argument during retry fails closed',()=>{
  const f=versionRetryWithPayload();
  delete f.steps[1].request.params.arguments.limit;
  assert.ok(has(audit(f),'RETRY_PARAMS_CHANGED'));
});
test('adding an argument during retry fails closed',()=>{
  const f=versionRetryWithPayload();
  f.steps[1].request.params.arguments.extra=true;
  assert.ok(has(audit(f),'RETRY_PARAMS_CHANGED'));
});
test('additional metadata cannot change on version retry',()=>{
  const f=versionRetryWithPayload();
  f.steps[1].request.params._meta.syntheticMarker='modified';
  assert.ok(has(audit(f),'RETRY_PARAMS_CHANGED'));
});
test('authorized capabilities cannot grow during version retry',()=>{
  const f=versionRetryWithPayload();
  f.grantedCapabilities={elicitation:{form:{}}};
  f.steps[1].request.params._meta['io.modelcontextprotocol/clientCapabilities']={elicitation:{form:{}}};
  assert.ok(has(audit(f),'RETRY_PARAMS_CHANGED'));
});
test('unchanged capability declaration survives version retry',()=>{
  const f=versionRetryWithPayload();
  f.grantedCapabilities={elicitation:{form:{}}};
  for(const step of f.steps)step.request.params._meta['io.modelcontextprotocol/clientCapabilities']={elicitation:{form:{}}};
  assert.equal(audit(f).status,'PASS');
});
test('JSON object key ordering is not treated as payload modification',()=>{
  const f=versionRetryWithPayload();
  f.steps[1].request.params.arguments={limit:3,note:{tags:['fixture'],id:'public'}};
  assert.equal(audit(f).status,'PASS');
});
test('retry findings report rules only, never submitted arguments',()=>{
  const f=versionRetryWithPayload();
  f.steps[1].request.params.arguments.note.id='SYNTHETIC_DO_NOT_ECHO';
  const result=audit(f);
  assert.ok(has(result,'RETRY_PARAMS_CHANGED'));
  assert.ok(!JSON.stringify(result).includes('SYNTHETIC_DO_NOT_ECHO'));
});
test('safe retry fixture with a deliberate new argument fails CLI contract',()=>{
  const result=run('fixtures/mcp-negotiate-unsafe-params.json');
  assert.equal(result.status,1,result.stderr);
  const report=JSON.parse(result.stdout);
  assert.ok(has(report,'RETRY_PARAMS_CHANGED'));
});

// M1-02: fail closed on interrupted/repeated unsupported-version negotiation.
// These checks model an intentionally strict, single-retry offline profile.
function boundedNegotiation() {
  const f=clone(safe);
  f.steps=f.steps.slice(0,2);
  return f;
}
test('M1-02: ordinary single successful version retry remains valid',()=>{
  assert.equal(audit(boundedNegotiation()).status,'PASS');
});
test('M1-02: malformed exchange cannot bridge an awaited version retry',()=>{
  const f=boundedNegotiation();
  f.steps.splice(1,0,{request:null,response:null});
  const r=audit(f);
  assert.equal(r.status,'FAIL');
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='INVALID_EXCHANGE_STEP'));
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='RETRY_INTERRUPTED_BY_INVALID_STEP'));
});
test('M1-02: malformed request interrupts pending version retry',()=>{
  const f=boundedNegotiation();
  f.steps.splice(1,0,{request:{jsonrpc:'1.0',id:'interloper',method:'tools/list',params:{}},
    response:ok('interloper')});
  const r=audit(f);
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='INVALID_MODERN_REQUEST'));
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='RETRY_INTERRUPTED_BY_INVALID_STEP'));
});
test('M1-02: repeated unsupported-version renegotiation is not accepted',()=>{
  const f=boundedNegotiation();
  f.clientVersions.push('2026-08-01');
  f.steps[1].response=error('retry',UNSUPPORTED_PROTOCOL_VERSION,{
    requested:'2026-07-28',supported:['2026-08-01']});
  const third=clone(f.steps[1]);
  third.request.id='third';
  third.request.params._meta['io.modelcontextprotocol/protocolVersion']='2026-08-01';
  third.response=ok('third');
  f.steps.push(third);
  const r=audit(f);
  assert.equal(r.status,'FAIL');
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='REPEATED_VERSION_NEGOTIATION'));
});
test('M1-02: reuse of initial request ID during retry is reported',()=>{
  const f=boundedNegotiation();
  f.steps[1].request.id='first';
  f.steps[1].response.id='first';
  const r=audit(f);
  assert.equal(r.status,'FAIL');
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='REUSED_REQUEST_ID'));
});
test('M1-02: mismatched retry response ID fails',()=>{
  const f=boundedNegotiation();
  f.steps[1].response.id='not-retry';
  const r=audit(f);
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='INVALID_NEGOTIATION_RESPONSE'));
});
test('M1-02: missing retry response payload fails',()=>{
  const f=boundedNegotiation();
  f.steps[1].response={jsonrpc:'2.0',id:'retry'};
  const r=audit(f);
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='INVALID_NEGOTIATION_RESPONSE'));
});
test('M1-02: unrelated interleaved request cannot satisfy pending retry',()=>{
  const f=boundedNegotiation();
  const stray=pair(req('unrelated'),ok('unrelated'));
  stray.request.method='prompts/list';
  f.steps.splice(1,0,stray);
  const r=audit(f);
  assert.equal(r.status,'FAIL');
  assert.ok(r.findings.some(x=>x.step===2 && x.rule==='RETRY_METHOD_CHANGED'));
});
test('M1-02: pending-retry failure findings never echo request payload',()=>{
  const f=boundedNegotiation();
  f.steps.splice(1,0,{request:null,response:null,payload:'FICTIONAL_PRIVATE_CANARY_DO_NOT_ECHO'});
  const r=audit(f);
  assert.ok(r.findings.some(x=>x.rule==='RETRY_INTERRUPTED_BY_INVALID_STEP'));
  assert.ok(!JSON.stringify(r).includes('FICTIONAL_PRIVATE_CANARY_DO_NOT_ECHO'));
});
