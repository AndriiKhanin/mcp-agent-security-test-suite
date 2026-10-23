import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGatedFixedMockCase,runGatedFirstPartySelftest }
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
  assert.equal(report.command,'adapter-selftest');
  assert.equal(report.reportSchemaVersion,1);
  assert.equal(report.profile,'universal-fixed-local-mock-drivers-v1');
  assert.equal(report.consentProfile,'fixed-first-party-admission-v1');
  assert.equal(report.authorizationStatus,'FIRST_PARTY_SYNTHETIC_ONLY');
  assert.equal(report.operatorVerified,false);
  assert.equal(report.status,'PASS');
  assert.equal(report.externalTargetContacted,false);
  assert.deepEqual([report.transportCount,report.passed,report.failed],[2,2,0]);
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
      assert.equal(r.status,'FAIL',caseName);
      assert.equal(r.rule,rule,caseName);
      assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
      assert.equal(r.gateStatus,'DENIED');
      assert.equal(r.driverCreated,false);
      assert.equal(r.mockProbeAttempted,false);
      assert.equal(r.executedFirstPartyMock,false);
      assert.equal(r.externalTargetContacted,false);
      assert.equal(r.checked,0);
    }
  }
});

test('M4-B3: mismatched project, claimed owner and changed fixed descriptor denied before effect',async()=>{
  for(const type of ['stdio','streamable-http']) {
    for(const caseName of ['wrong-project','wrong-operator','changed-descriptor']) {
      const result=await runGatedFixedMockCase(type,{caseName});
      assert.equal(result.status,'FAIL');
      assert.equal(result.rule,'ADAPTER_IDENTITY_MISMATCH');
      assert.equal(result.mockProbeAttempted,false);
      assert.equal(result.driverCreated,false);
      assert.ok(!JSON.stringify(result).includes('other.example.org'));
      assert.ok(!JSON.stringify(result).includes('other-worker.mjs'));
      assert.ok(!JSON.stringify(result).includes('unknown-operator'));
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
    assert.equal(result.status,'PASS');
    assert.equal(result.outcomes.length,2);
    assert.ok(result.outcomes.every(o=>o.matched));
  }
});


test('M4-B3: admitted stdio exchange sends and verifies initialize only',async()=>{
  const result=await runGatedFixedMockCase('stdio');
  assert.equal(result.status,'PASS');
  assert.equal(result.checked,1);
  assert.equal(result.gateStatus,'MOCK_ADMITTED');
  assert.equal(result.mockProbeAttempted,true);
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
  assert.equal(out.error,undefined);
  assert.equal(out.status,2);
  assert.equal(out.stdout,'');
  assert.ok(!out.stderr.includes('fictional-write'));
});
