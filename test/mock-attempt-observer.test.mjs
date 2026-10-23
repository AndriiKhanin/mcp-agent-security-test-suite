import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { observeFirstPartyMockAttempts } from '../src/mock-attempt-observer.mjs';
import { runGatedFixedMockCase,runGatedFirstPartySelftest }
  from '../src/local-consent-gate.mjs';
import { createFirstPartyDriver } from '../src/local-adapter-drivers.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const denied=['revoked','expired','wrong-project','wrong-operator',
  'wrong-method','changed-descriptor','replay','forbidden-method'];
const observe=async(type,caseName)=>observeFirstPartyMockAttempts(
  ()=>runGatedFixedMockCase(type,{caseName})
);

test('M4-B4: observed actual mock attempt sites stay untouched across all gate denial categories',async()=>{
  for(const transport of ['stdio','streamable-http']) {
    for(const scenario of denied){
      const {result,attempts}=await observe(transport,scenario);
      assert.equal(result.gateStatus,'DENIED',transport+'/'+scenario);
      assert.equal(result.status,'FAIL');
      assert.deepEqual(attempts,[],transport+'/'+scenario);
      assert.equal(result.driverCreated,false);
      assert.equal(result.mockProbeAttempted,false);
    }
  }
});

test('M4-B4: admitted stdio initializes exactly once; observation is independent of returned booleans',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runGatedFixedMockCase('stdio'));
  assert.equal(result.status,'PASS');
  assert.deepEqual(attempts,['driver-probe','stdio-spawn']);
  assert.equal(result.checked,1);
  const deliberatelyMisreported={...result,driverCreated:false,
    mockProbeAttempted:false,executedFirstPartyMock:false};
  assert.equal(deliberatelyMisreported.mockProbeAttempted,false);
  assert.deepEqual(attempts,['driver-probe','stdio-spawn'],
    'capture uses reviewed probe/spawn call sites, not the report flags');
});

test('M4-B4: admitted loopback emits bind and request attempts exactly once',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runGatedFixedMockCase('streamable-http'));
  assert.equal(result.status,'PASS');
  assert.deepEqual(attempts,['driver-probe','http-bind','http-request']);
  assert.equal(result.checked,1);
  assert.ok(!JSON.stringify(attempts).includes('127.0.0.1'));
});

test('M4-B4: existing public selftest exercises exactly both first-party mock attempt paths',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runGatedFirstPartySelftest());
  assert.equal(result.status,'PASS');
  assert.deepEqual(attempts,['driver-probe','stdio-spawn',
    'driver-probe','http-bind','http-request']);
  assert.equal(result.externalTargetContacted,false);
});

test('M4-B4: observer scope is isolated for concurrently running fictional probes',async()=>{
  const [stdio,http]=await Promise.all([
    observeFirstPartyMockAttempts(()=>runGatedFixedMockCase('stdio')),
    observeFirstPartyMockAttempts(()=>runGatedFixedMockCase('streamable-http'))
  ]);
  assert.equal(stdio.result.status,'PASS');
  assert.equal(http.result.status,'PASS');
  assert.deepEqual(stdio.attempts,['driver-probe','stdio-spawn']);
  assert.deepEqual(http.attempts,['driver-probe','http-bind','http-request']);
});

test('M4-B4: negative external bypass via adapter-selftest arguments is rejected',()=>{
  for(const input of ['--caseName=allowed','--observer=probe',
    '--url=https://fictional.invalid/mcp','--command=fictional-worker']) {
    const x=spawnSync(process.execPath,['src/cli.mjs','adapter-selftest',input],{
      cwd:root,encoding:'utf8',shell:false,timeout:15000,maxBuffer:65536
    });
    assert.equal(x.status,2);
    const report=JSON.parse(x.stdout);
    assert.equal(report.status,'ERROR');
    assert.equal(report.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(x.stdout+x.stderr).includes(input));
  }
});

test('M4-B4: inert project checks cannot create mock attempt events',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runGatedFixedMockCase('stdio',{caseName:'forbidden-method'}));
  assert.equal(result.gateStatus,'DENIED');
  assert.deepEqual(attempts,[]);
});

test('M4-B4: direct low-level test driver bypasses gate by design and remains observable',async()=>{
  const run=async()=>{
    const driver=createFirstPartyDriver('streamable-http',{fault:'server-invalid-json'});
    try {
      await driver.connect();
      return await driver.probe();
    } finally {await driver.close();}
  };
  const {result,attempts}=await observeFirstPartyMockAttempts(run);
  assert.equal(result.status,'FAIL');
  assert.deepEqual(attempts,['driver-probe','http-bind','http-request']);
  // A failed first-party mock must release its listener. A subsequent owned
  // loopback bind/ping succeeds and completes without a retained listener.
  const recovered=await observeFirstPartyMockAttempts(
    ()=>runGatedFixedMockCase('streamable-http'));
  assert.equal(recovered.result.status,'PASS');
  assert.deepEqual(recovered.attempts,['driver-probe','http-bind','http-request']);
});

test('M4-B4: declined stdio gate probe never spawns, but direct test driver can',async()=>{
  const deniedCase=await observe('stdio','revoked');
  assert.deepEqual(deniedCase.attempts,[]);
  const {result,attempts}=await observeFirstPartyMockAttempts(async()=>{
    const driver=createFirstPartyDriver('stdio');
    try{await driver.connect();return await driver.probe();}
    finally{await driver.close();}
  });
  assert.equal(result.status,'PASS');
  assert.equal(result.checked,4,'legacy direct driver remains its own test utility');
  assert.deepEqual(attempts,['driver-probe','stdio-spawn']);
});

test('M4-B4: observer is local, bounded to fixed event names and not CLI input',async()=>{
  await assert.rejects(observeFirstPartyMockAttempts(null),
    /INVALID_MOCK_OBSERVER_TEST/);
  const {attempts}=await observeFirstPartyMockAttempts(
    ()=>runGatedFixedMockCase('stdio',{caseName:'expired'}));
  assert.ok(Object.isFrozen(attempts));
  assert.deepEqual(attempts,[]);
});
