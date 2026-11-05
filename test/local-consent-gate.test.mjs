import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash,generateKeyPairSync,sign } from 'node:crypto';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGatedFixedMockCase,runGatedFirstPartySelftest,reviewF2StagingIntent,inspectF2SignedGrantEvidence }
  from '../src/local-consent-gate.mjs';
import { runFirstPartyAdapterSelftest } from '../src/local-adapter-drivers.mjs';
import { runLocalStdioInitialization } from '../src/stdio-mcp-harness.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:35_000,maxBuffer:65_536
});

test('M4-B3: CLI first-party selftest is consent-gated and still returns two fixed mocks',()=>{
  const x=cli('adapter-selftest');
  assert.equal(x.error,undefined);
  assert.equal(x.status,0,x.stderr);
  const report=JSON.parse(x.stdout);
  assert.deepEqual([report.command,report.reportSchemaVersion,report.profile,
  report.consentProfile,report.authorizationStatus,report.operatorVerified,
  report.status,report.externalTargetContacted,report.transportCount,
  report.passed,report.failed],['adapter-selftest',1,
  'universal-fixed-local-mock-drivers-v1','fixed-first-party-admission-v1',
  'FIRST_PARTY_SYNTHETIC_ONLY',false,'PASS',false,2,2,0]);
  assert.deepEqual(report.outcomes.map(o=>o.transport),['stdio','streamable-http']);
  assert.ok(report.outcomes.every(o=>o.gateStatus==='MOCK_ADMITTED' &&
  o.driverCreated && o.mockProbeAttempted && o.matched));
  assert.ok(!x.stdout.includes('mcp.example.org'));
  assert.ok(!x.stdout.includes('stdio-mcp-mock-worker'));
});

test('M4-B3: direct legacy driver selftest now routes through same fixed synthetic gate',async()=>{
  const report=await runFirstPartyAdapterSelftest();
  assert.equal(report.status,'PASS');
  assert.equal(report.authorizationStatus,'FIRST_PARTY_SYNTHETIC_ONLY');
  assert.ok(report.outcomes.every(o=>o.gateStatus==='MOCK_ADMITTED'));
});

test('M4-B3: denied revoked, expired and unapproved method never create driver or attempt probe',async()=>{
  for(const type of ['stdio','streamable-http']) {
  for(const [caseName,rule] of [
    ['revoked','ADAPTER_GRANT_REVOKED'],
    ['expired','ADAPTER_GRANT_EXPIRED_OR_INVALID'],
    ['wrong-method','ADAPTER_METHOD_DENIED'],
    ['forbidden-method','ADAPTER_POLICY_INPUT_REJECTED']
  ]) {
    const r=await runGatedFixedMockCase(type,{caseName});
    assert.deepEqual([r.status,r.rule,r.connectionStatus,r.gateStatus,
      r.driverCreated,r.mockProbeAttempted,r.executedFirstPartyMock,
      r.externalTargetContacted,r.checked],
      ['FAIL',rule,'NOT_ATTEMPTED','DENIED',false,false,false,false,0],caseName);
  }
  }
});

test('M4-B3: mismatched project, claimed owner and changed fixed descriptor denied before effect',async()=>{
  for(const type of ['stdio','streamable-http']) {
  for(const caseName of ['wrong-project','wrong-operator','changed-descriptor']) {
    const result=await runGatedFixedMockCase(type,{caseName});
    assert.deepEqual([result.status,result.rule,result.mockProbeAttempted,
      result.driverCreated],['FAIL','ADAPTER_IDENTITY_MISMATCH',false,false]);
    for(const canary of ['other.example.org','other-worker.mjs','unknown-operator'])
      assert.ok(!JSON.stringify(result).includes(canary));
  }
  }
});

test('M4-B3: process-local replay simulation rejects reused nonce before effects',async()=>{
  const seen=new Set();
  const r=await runGatedFixedMockCase('stdio',{caseName:'replay',seenNonces:seen});
  assert.equal(r.status,'FAIL');
  assert.equal(r.rule,'ADAPTER_SIMULATED_REPLAY');
  assert.equal(r.driverCreated,false);
  assert.equal(r.mockProbeAttempted,false);
  // Does not pretend to provide persistent replay protection or real grant.
  const admitted=await runGatedFixedMockCase('stdio',{seenNonces:seen});
  assert.equal(admitted.status,'PASS');
  assert.equal(admitted.gateStatus,'MOCK_ADMITTED');
});

test('M4-B3: fixed transport inventory rejects arbitrary endpoint, executable and caller-provided grants',async()=>{
  for(const [type,opts] of [
  ['unknown',{}],['stdio',{command:'node',args:['private.mjs']}],
  ['stdio',{claim:{operatorId:'forged'}}],
  ['stdio',{endpoint:'https://private.example.org/mcp'}],
  ['streamable-http',{url:'https://private.example.org/mcp'}],
  ['streamable-http',{caseName:'unapproved-scan'}],
  ['stdio',{nowMs:'2030-01-01'}],['stdio',{seenNonces:[]}],
  ['stdio',null]
  ]) {
  await assert.rejects(runGatedFixedMockCase(type,opts),
    /INVALID_FIXED_MOCK_ADMISSION_OPTIONS/);
  }
});

test('M4-B3: no extra CLI args can turn local test into real-target connection',()=>{
  for(const value of ['--url=https://private.example.org/mcp',
  'examples/adapter-profiles/stdio-project.json',
  '--operator=fictional-admin']) {
  const x=cli('adapter-selftest',value);
  assert.equal(x.status,2);
  const r=JSON.parse(x.stdout);
  assert.equal(r.status,'ERROR');
  assert.equal(r.errorCode,'INVALID_CLI_ARGUMENTS');
  assert.ok(!(x.stdout+x.stderr).includes(value));
  }
});

test('M4-B3: existing user adapter-check / adapter-policy-check remain inert',()=>{
  const config=cli('adapter-check','examples/adapter-profiles/stdio-project.json');
  assert.equal(config.status,0);
  const r=JSON.parse(config.stdout);
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.executionEnabled,false);
  const expired=cli('adapter-policy-check','examples/adapter-profiles/consent-expired.json');
  assert.equal(expired.status,1);
  const policy=JSON.parse(expired.stdout);
  assert.equal(policy.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(policy.operatorVerified,false);
});

test('M4-B3: repeat local selftest closes both first-party resources',async()=>{
  for(let i=0;i<2;i++){
  const result=await runGatedFirstPartySelftest();
  assert.deepEqual([result.status,result.outcomes.length,
    result.outcomes.every(o=>o.matched)],['PASS',2,true]);
  }
});


test('M4-B3: admitted stdio exchange sends and verifies initialize only',async()=>{
  const result=await runGatedFixedMockCase('stdio');
  assert.deepEqual([result.status,result.checked,result.gateStatus,
  result.mockProbeAttempted],['PASS',1,'MOCK_ADMITTED',true]);
  const fixed=runLocalStdioInitialization({timeoutMs:6000});
  assert.equal(fixed.status,'PASS');
  assert.deepEqual([fixed.checked,fixed.received,fixed.failureCount],[1,1,0]);
  assert.deepEqual(fixed.findings,[]);
});

test('M4-B3: initialize-only worker rejects any appended tools/call frame with no output',()=>{
  const worker=fileURLToPath(new URL('../src/stdio-mcp-mock-worker.mjs',import.meta.url));
  const initialize={jsonrpc:'2.0',id:1,method:'initialize',params:{
  protocolVersion:'2026-07-28',capabilities:{},
  clientInfo:{name:'fictional-client',version:'1'}}};
  const extra={jsonrpc:'2.0',id:2,method:'tools/call',
  params:{name:'fictional-write',arguments:{}}};
  const input=[initialize,extra].map(x=>JSON.stringify(x)).join('\n')+'\n';
  const out=spawnSync(process.execPath,[worker,'init-only'],{
  input,encoding:'utf8',shell:false,timeout:6000,maxBuffer:8192
  });
  assert.deepEqual([out.error,out.status,out.stdout,
  out.stderr.includes('fictional-write')],[undefined,2,'',false]);
});

test('F2: deny before network',()=>{
  const a={endpoint:'https://fixture.example.org/mcp',
  protocolVersion:'2026-07-28',method:'server/discover'};
  const bad=[{...a,method:'tools/call'}, {...a,protocolVersion:'2025-11-25'},
  {...a,endpoint:'https://127.0.0.1/mcp'}, {...a,grantApproved:true}];
  for(const [i,input] of [a,...bad].entries()){
  const r=reviewF2StagingIntent(input);
  assert.deepEqual([r.rule,r.connectionStatus,r.executionEnabled,
    r.externalTargetContacted],[
    i?'F2_INTENT_REJECTED':'F2_AUTHORITY_NOT_VERIFIED',
    'NOT_ATTEMPTED',false,false]);
  }
});

test('F2: signed intent verifies cryptographic integrity but never permits network',()=>{
  const i={endpoint:'https://fixture.example.org/mcp',
    protocolVersion:'2026-07-28',method:'server/discover'};
  const a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519');
  const g={schemaVersion:1,endpoint:i.endpoint,protocolVersion:i.protocolVersion,
    method:i.method,operatorId:'firstPartyOperator',issuerId:'firstPartyIssuer',
    intentSha256:createHash('sha256').update(JSON.stringify([
      i.endpoint,i.protocolVersion,i.method])).digest('hex'),
    nonce:'ab'.repeat(16),issuedAt:1000,expiresAt:120000};
  const msg=Buffer.from('F2-SIGNED-INTENT-V1\n'+JSON.stringify([
    g.schemaVersion,g.endpoint,g.protocolVersion,g.method,g.operatorId,
    g.issuerId,g.intentSha256,g.nonce,g.issuedAt,g.expiresAt]),'utf8');
  const e={grant:g,signature:sign(null,msg,a.privateKey).toString('base64url'),
    issuerPublicKeyPem:a.publicKey.export({format:'pem',type:'spki'})};
  const run=(ev,now=2000)=>inspectF2SignedGrantEvidence(i,ev,now);
  const good=run(e);
  assert.deepEqual([good.status,good.rule,good.signatureVerified,
    good.operatorVerified,good.ownershipVerified,good.executionEnabled,
    good.externalTargetContacted,good.connectionStatus],
    ['FAIL','F2_TRUST_ANCHOR_NOT_ESTABLISHED',true,
      false,false,false,false,'NOT_ATTEMPTED']);
  assert.equal(run(e,999).rule,'F2_GRANT_EXPIRED_OR_NOT_YET_VALID');
  assert.equal(run(e,120000).rule,'F2_GRANT_EXPIRED_OR_NOT_YET_VALID');
  assert.equal(run({...e,issuerPublicKeyPem:
    b.publicKey.export({format:'pem',type:'spki'})}).rule,'F2_SIGNATURE_INVALID');
  assert.equal(run({...e,grant:{...g,method:'tools/call'}}).rule,
    'F2_GRANT_SCOPE_MISMATCH');
  assert.equal(run({...e,approved:true}).rule,'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(run({...e,grant:{...g,nonce:'short'}}).rule,
    'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(run({...e,issuerPublicKeyPem:'BAD'}).rule,
    'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(run({...e,grant:{...g,expiresAt:301001}}).rule,
    'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(inspectF2SignedGrantEvidence({...i,method:'tools/call'},e,2000).rule,
    'F2_INTENT_REJECTED');
  assert.ok(!JSON.stringify(good).includes('firstPartyOperator'));
  assert.ok(!JSON.stringify(good).includes(i.endpoint));
});
