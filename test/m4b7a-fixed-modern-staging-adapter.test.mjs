/** M4-B7-A: first-party-only local MCP adapter bridge; no user endpoints. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectProjectAdapter} from '../src/project-adapter.mjs';
import {createFixedModernStagingAdapter,
  runFixedModernStagingAdapterSelftest} from '../src/local-adapter-drivers.mjs';
import {observeFirstPartyMockAttempts} from '../src/mock-attempt-observer.mjs';
import {runFirstPartyStagingProcessSelftest} from '../src/staging-process-harness.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',timeout:20000,shell:false,maxBuffer:65536
});
async function exercise(options={}){
  const driver=createFixedModernStagingAdapter(options);
  try{await driver.connect();return await driver.probe();}
  finally{await driver.close();}
}
function evidence(r){
  assert.equal(r.transport,'streamable-http');
  assert.equal(r.protocolVersion,'2026-07-28');
  assert.equal(r.allowedMethod,'server/discover');
  assert.equal(r.connectionStatus,'FIXED_FIRST_PARTY_STAGING_ONLY');
  assert.equal(r.adapterDescriptorUsed,false);
  assert.equal(r.projectConnectionAuthorized,false);
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.operatorVerified,false);
  assert.equal(r.osSandboxed,false);
  assert.equal(r.executedFirstPartyMock,true);
  assert.equal(r.socketCleanupConfirmed,true);
  assert.equal(r.checked,1);
  for(const item of ['127.0.0.1','mcp.example.org','owned-discovery-progress'])
    assert.ok(!JSON.stringify(r).includes(item));
  for(const field of ['endpoint','port','credentials','url'])
    assert.ok(!Object.hasOwn(r,field));
}

test('M4-B7-A: no-argument CLI executes exactly the owned discovery fixture',()=>{
  const p=cli('adapter-staging-selftest');
  assert.equal(p.status,0,p.stderr);
  const r=JSON.parse(p.stdout);
  assert.equal(r.status,'PASS');
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.command,'adapter-staging-selftest');
  assert.equal(r.exitCode,0);
  assert.equal(r.matched,true);
  assert.deepEqual(r.summary.ruleCodes,[]);
  evidence(r);
});

test('M4-B7-A: connect/close inert; probe only once with separate observed socket',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(async()=>{
    const driver=createFixedModernStagingAdapter();
    await assert.rejects(driver.probe(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
    const c=await driver.connect();
    assert.equal(c.externalTargetContacted,false);
    await assert.rejects(driver.connect(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
    const x=await driver.probe();
    await assert.rejects(driver.probe(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
    assert.deepEqual(await driver.close(),{closed:true});
    assert.deepEqual(await driver.close(),{closed:true});
    await assert.rejects(driver.connect(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
    return x;
  });
  assert.deepEqual(attempts,['driver-probe','staging-bind','staging-request']);
  assert.equal(result.status,'PASS');
  evidence(result);
});

test('M4-B7-A: fixed JSON and SSE transport success share one interface',async()=>{
  for(const fault of ['allowed','sse','sse-comment-log']){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>exercise({fault}));
    assert.equal(result.status,'PASS',fault);
    evidence(result);
    assert.deepEqual(attempts,['driver-probe','staging-bind','staging-request']);
  }
});

test('M4-B7-A: invalid method, version, origin and host fail closed',async()=>{
  for(const fault of ['wrong-method','forbidden-tool','wrong-version',
    'wrong-origin','wrong-host']){
    const r=await exercise({fault});
    assert.equal(r.status,'FAIL',fault);
    assert.equal(r.matched,false);
    assert.equal(r.failureCount,1);
    assert.match(r.findings[0].rule,/^STAGING_[A-Z0-9_]+$/);
    evidence(r);
  }
});

test('M4-B7-A: redirect, overflow and unsolicited stream fail with symbolic codes',async()=>{
  for(const [fault,code] of [
    ['response-redirect','STAGING_REDIRECT_REJECTED'],
    ['response-oversized','STAGING_RESPONSE_LIMIT'],
    ['response-sse-unsolicited','STAGING_RESPONSE_MISMATCH']
  ]){
    const r=await exercise({fault});
    assert.equal(r.status,'FAIL');
    assert.equal(r.findings[0].rule,code);
    evidence(r);
  }
});

test('M4-B7-A: aborted owned first-party SSE is cleaned, no event data echoed',async()=>{
  const r=await exercise({fault:'response-sse-stall-after-notice',deadlineMs:350});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_TIMEOUT');
  evidence(r);
});

test('M4-B7-A: unapproved URL, stdio command, credential and worker fault rejected before probe',async()=>{
  const malformed=[null,[],{url:'https://private.example.org/mcp'},
    {endpoint:'http://127.0.0.1:1234/mcp'},{command:'node',args:['server.mjs']},
    {env:{SECRET:'FICTIONAL'}},{fault:'tools/call'},{fault:'--eval'},
    {protocolVersion:'2025-11-25'},{deadlineMs:5001},
    {fault:'allowed',onBound:()=>{}},{mode:'user-target'}];
  for(const option of malformed){
    const {attempts}=await observeFirstPartyMockAttempts(async()=>{
      assert.throws(()=>createFixedModernStagingAdapter(option),
        /INVALID_FIXED_MODERN_ADAPTER_OPTIONS/);
    });
    assert.deepEqual(attempts,[]);
  }
});

test('M4-B7-A: universal descriptors stay network-inert before and after bridge',async()=>{
  for(const name of ['stdio-project.json','streamable-http-project.json']){
    const descriptor=JSON.parse(readFileSync(join(root,'examples','adapter-profiles',name)));
    const {result,attempts}=await observeFirstPartyMockAttempts(async()=>
      inspectProjectAdapter(descriptor));
    assert.equal(result.status,'PASS');
    assert.equal(result.connectionStatus,'NOT_ATTEMPTED');
    assert.equal(result.executionEnabled,false);
    assert.deepEqual(result.capabilities,['DESCRIPTOR_VALIDATED']);
    assert.deepEqual(attempts,[]);
  }
});

test('M4-B7-A: user descriptor cannot activate networking via flags or localhost',()=>{
  const s=JSON.parse(readFileSync(join(root,'examples','adapter-profiles',
    'streamable-http-project.json')));
  for(const desc of [
    {...s,policy:{...s.policy,allowNetwork:true}},
    {...s,transport:{...s.transport,endpoint:'https://localhost/mcp'}},
    {...s,transport:{...s.transport,endpoint:'https://127.0.0.1/mcp'}},
    {...s,transport:{type:'stdio',command:'node',args:['-e','evil']}}
  ])assert.throws(()=>inspectProjectAdapter(desc),/INVALID_PROJECT_ADAPTER_CONFIG/);
});

test('M4-B7-A: CLI rejects profile, endpoint, command and fault arguments',()=>{
  for(const arg of ['examples/adapter-profiles/stdio-project.json',
    '--endpoint=https://example.org/mcp','--fault=response-hang',
    '--command=unapproved-child','--token=FICTIONAL']){
    const p=cli('adapter-staging-selftest',arg);
    assert.equal(p.status,2);
    const r=JSON.parse(p.stdout);
    assert.equal(r.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.equal(r.command,'adapter-staging-selftest');
    assert.ok(!(p.stdout+p.stderr).includes(arg));
  }
});

test('M4-B7-A: adapter-check remains identical despite running owned smoke',()=>{
  const before=cli('adapter-check','examples/adapter-profiles/streamable-http-project.json');
  const testRun=cli('adapter-staging-selftest');
  const after=cli('adapter-check','examples/adapter-profiles/streamable-http-project.json');
  assert.deepEqual([before.status,testRun.status,after.status],[0,0,0]);
  assert.deepEqual(JSON.parse(before.stdout),JSON.parse(after.stdout));
  assert.equal(JSON.parse(after.stdout).connectionStatus,'NOT_ATTEMPTED');
});

test('M4-B7-A: prior fixed subprocess staging remains safe and usable',async()=>{
  const r=await runFirstPartyStagingProcessSelftest();
  assert.equal(r.status,'PASS');
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.osSandboxed,false);
});

test('M4-B7-A: concurrent first-party bridge checks remain isolated',async()=>{
  const r=await Promise.all([
    observeFirstPartyMockAttempts(()=>runFixedModernStagingAdapterSelftest()),
    observeFirstPartyMockAttempts(()=>runFixedModernStagingAdapterSelftest())
  ]);
  for(const item of r){
    assert.equal(item.result.status,'PASS');
    evidence(item.result);
    assert.deepEqual(item.attempts,['driver-probe','staging-bind','staging-request']);
  }
});
