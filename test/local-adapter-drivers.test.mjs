import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFirstPartyDriver,runFirstPartyAdapterSelftest } from '../src/local-adapter-drivers.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,shell:false,encoding:'utf8',timeout:30000,maxBuffer:65536
});
async function attempt(transport,options={}) {
  const driver=createFirstPartyDriver(transport,options);
  try {
    await driver.connect();
    return await driver.probe();
  } finally { await driver.close(); }
}

test('M4-B1: single JSON-v1 CLI selftest checks both fixed local drivers',()=>{
  const x=cli('adapter-selftest');
  assert.equal(x.error,undefined);
  assert.equal(x.status,0,x.stderr);
  const r=JSON.parse(x.stdout);
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.command,'adapter-selftest');
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.profile,'universal-fixed-local-mock-drivers-v1');
  assert.equal(r.connectionStatus,'FIRST_PARTY_MOCK_ONLY');
  assert.equal(r.externalTargetContacted,false);
  assert.deepEqual([r.transportCount,r.passed,r.failed],[2,2,0]);
  assert.deepEqual(r.outcomes.map(v=>v.transport),['stdio','streamable-http']);
  assert.ok(r.outcomes.every(v=>v.matched && v.executedFirstPartyMock &&
    !v.externalTargetContacted && v.rule==='NONE'));
  assert.deepEqual(r.summary.ruleCodes,[]);
  assert.ok(!(x.stdout+x.stderr).includes('127.0.0.1'));
  assert.ok(!(x.stdout+x.stderr).includes('FICTIONAL_NOTE'));
});

test('M4-B1: direct contract has connect/probe/close once and rejects invalid order',async()=>{
  const driver=createFirstPartyDriver('stdio');
  await assert.rejects(driver.probe(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
  const connection=await driver.connect();
  assert.equal(connection.connectionStatus,'FIRST_PARTY_MOCK_ONLY');
  await assert.rejects(driver.connect(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
  const result=await driver.probe();
  assert.equal(result.status,'PASS');
  assert.equal(result.checked,4);
  await assert.rejects(driver.probe(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
  assert.deepEqual(await driver.close(),{closed:true});
  assert.deepEqual(await driver.close(),{closed:true});
  await assert.rejects(driver.connect(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
  await assert.rejects(driver.probe(),/INVALID_LOCAL_ADAPTER_DRIVER_STATE/);
});

test('M4-B1: HTTP driver uses fixed temporary first-party loopback only',async()=>{
  const driver=createFirstPartyDriver('streamable-http');
  await driver.connect();
  const result=await driver.probe();
  assert.equal(result.status,'PASS');
  assert.equal(result.checked,1);
  assert.equal(result.externalTargetContacted,false);
  assert.ok(!JSON.stringify(result).includes('127.0.0.1'));
  assert.ok(!Object.hasOwn(result,'port'));
  await driver.close();
});

test('M4-B1: fixed stdio malformed and forged child responses are denied',async()=>{
  for(const [fault,rule] of [
    ['wrong-id','STDIO_RESPONSE_ID_OR_ENVELOPE_MISMATCH'],
    ['invalid-json','STDIO_INVALID_JSON_RESPONSE'],
    ['changed-result','STDIO_RESPONSE_CONTENT_MISMATCH']
  ]) {
    const result=await attempt('stdio',{fault});
    assert.equal(result.status,'FAIL');
    assert.equal(result.rule,rule);
    assert.equal(result.externalTargetContacted,false);
    assert.ok(!JSON.stringify(result).includes('FICTIONAL_CANARY_DO_NOT_ECHO'));
  }
});

test('M4-B1: fixed HTTP rejects redirect, unexpected tool-call and malformed server reply',async()=>{
  for(const [fault,rule] of [
    ['server-redirect','LOOPBACK_REDIRECT_REJECTED'],
    ['tool-call','LOOPBACK_REQUEST_DENIED'],
    ['server-invalid-json','LOOPBACK_INVALID_JSON_RESPONSE'],
    ['server-canary','LOOPBACK_RESPONSE_MISMATCH']
  ]) {
    const result=await attempt('streamable-http',{fault});
    assert.equal(result.status,'FAIL');
    assert.equal(result.rule,rule);
    assert.equal(result.externalTargetContacted,false);
    assert.ok(!JSON.stringify(result).includes('example.invalid'));
    assert.ok(!JSON.stringify(result).includes('FICTIONAL_CANARY_DO_NOT_ECHO'));
  }
});

test('M4-B1: local transport output limits and deadlines fail closed',async()=>{
  const oversizeStdio=await attempt('stdio',{fault:'oversized-output'});
  assert.equal(oversizeStdio.status,'FAIL');
  assert.ok(['STDIO_OUTPUT_LIMIT','STDIO_FRAME_TOO_LARGE'].includes(oversizeStdio.rule));
  const oversizeHttp=await attempt('streamable-http',{fault:'server-oversized'});
  assert.equal(oversizeHttp.status,'FAIL');
  assert.equal(oversizeHttp.rule,'LOOPBACK_RESPONSE_LIMIT');
  const hungStdio=await attempt('stdio',{fault:'hang',deadlineMs:350});
  assert.equal(hungStdio.status,'FAIL');
  assert.equal(hungStdio.rule,'STDIO_WORKER_TIMEOUT');
  const hungHttp=await attempt('streamable-http',{fault:'server-hang',deadlineMs:350});
  assert.equal(hungHttp.status,'FAIL');
  assert.equal(hungHttp.rule,'LOOPBACK_TIMEOUT');
});

test('M4-B1: no project profiles, user URLs, arbitrary programs, proxy/env or raw credentials accepted',()=>{
  const attempts=[
    ['stdio',{command:'node',args:['myserver.mjs']}],
    ['stdio',{fault:'none',env:{TOKEN:'FICTIONAL_PRIVATE'}}],
    ['stdio',{fault:'none',url:'https://private.example.org/mcp'}],
    ['stdio',{fault:'none',deadlineMs:15000}],
    ['stdio',{fault:'tools/call'}],
    ['streamable-http',{host:'mcp.example.org'}],
    ['streamable-http',{fault:'none',endpoint:'https://mcp.example.org/mcp'}],
    ['streamable-http',{fault:'none',deadlineMs:6000}],
    ['streamable-http',{fault:'write-note'}],
    ['custom-transport',{}],
    ['stdio',null]
  ];
  for(const [type,options] of attempts) assert.throws(
    ()=>createFirstPartyDriver(type,options),/INVALID_LOCAL_ADAPTER_DRIVER_OPTIONS/
  );
});

test('M4-B1: selftest rejects all arguments and does not echo caller input',()=>{
  for(const input of [
    'examples/adapter-profiles/stdio-project.json',
    'https://private.example.org/mcp',
    '--command=malicious-private-program',
    'private-transport-selection'
  ]) {
    const x=cli('adapter-selftest',input);
    assert.equal(x.status,2);
    const report=JSON.parse(x.stdout);
    assert.equal(report.command,'adapter-selftest');
    assert.equal(report.status,'ERROR');
    assert.equal(report.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(x.stdout+x.stderr).includes(input));
  }
});

test('M4-B1: legacy universal config check stays inert after local mock selftest',()=>{
  const x=cli('adapter-check','examples/adapter-profiles/stdio-project.json');
  assert.equal(x.status,0);
  const r=JSON.parse(x.stdout);
  assert.equal(r.status,'PASS');
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.executionEnabled,false);
  assert.equal(r.command,'adapter-check');
});

test('M4-B1: deterministic repeat runs clean up owned mock processes and sockets',async()=>{
  for(let i=0;i<3;i++){
    const r=await runFirstPartyAdapterSelftest();
    assert.equal(r.status,'PASS');
    assert.equal(r.failed,0);
    assert.equal(r.outcomes.length,2);
  }
});
