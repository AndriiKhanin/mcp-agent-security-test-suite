import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {runLoopbackHttpMock,runLoopbackHttpScenario} from '../src/loopback-http-mock.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const rules=report=>report.findings.map(x=>x.rule);
const cli=file=>spawnSync(process.execPath,['src/cli.mjs','loopback',file],
  {cwd:root,encoding:'utf8',timeout:15000});

test('M4-A: fixed IPv4 loopback ping succeeds without effects or leaked port',async()=>{
  const result=await runLoopbackHttpMock();
  assert.equal(result.status,'PASS',JSON.stringify(result));
  assert.equal(result.transport,'FIXED_IPV4_LOOPBACK_HTTP');
  assert.equal(result.boundHost,'127.0.0.1');
  assert.equal(result.received,1);
  assert.equal(result.accepted,1);
  assert.equal(result.simulatedEffects,0);
  assert.equal(result.failureCount,0);
  assert.deepEqual(result.findings,[]);
  assert.equal(Object.hasOwn(result,'port'),false);
});
test('M4-A: CLI safe fixture returns versioned JSON and exit 0',()=>{
  const run=cli('fixtures/loopback-safe.json');
  assert.equal(run.status,0,run.stderr);
  const report=JSON.parse(run.stdout);
  assert.equal(report.reportSchemaVersion,1);
  assert.equal(report.command,'loopback');
  assert.equal(report.status,'PASS');
  assert.equal(report.exitCode,0);
});
test('M4-A: CLI negative fault returns exit 1 and sanitized rule',()=>{
  const run=cli('fixtures/loopback-unsafe.json');
  assert.equal(run.status,1,run.stderr);
  const report=JSON.parse(run.stdout);
  assert.equal(report.status,'FAIL');
  assert.equal(report.exitCode,1);
  assert.deepEqual(report.summary.ruleCodes,['LOOPBACK_REQUEST_DENIED']);
  assert.ok(!run.stdout.includes('unapproved.invalid'));
});
for(const fault of [
  'bad-origin','missing-origin','bad-host','bad-path','get-method',
  'tool-call','wrong-version','malformed-request','oversized-request'
]) test('M4-A deny inbound '+fault+' before any accepted operation',async()=>{
  const result=await runLoopbackHttpMock({fault});
  assert.equal(result.status,'FAIL',JSON.stringify(result));
  assert.ok(rules(result).some(x=>x==='LOOPBACK_REQUEST_DENIED' ||
    x==='LOOPBACK_TRANSPORT_ERROR'),JSON.stringify(result));
  assert.equal(result.accepted,0,JSON.stringify(result));
  assert.equal(result.simulatedEffects,0);
  assert.equal(result.boundHost,'127.0.0.1');
});
for(const [fault,rule] of [
  ['server-wrong-id','LOOPBACK_RESPONSE_MISMATCH'],
  ['server-invalid-json','LOOPBACK_INVALID_JSON_RESPONSE'],
  ['server-oversized','LOOPBACK_RESPONSE_LIMIT'],
  ['server-redirect','LOOPBACK_REDIRECT_REJECTED'],
  ['server-content-type','LOOPBACK_BAD_CONTENT_TYPE'],
  ['server-canary','LOOPBACK_RESPONSE_MISMATCH']
]) test('M4-A reject compromised local mock response '+fault,async()=>{
  const result=await runLoopbackHttpMock({fault});
  assert.equal(result.status,'FAIL',JSON.stringify(result));
  assert.ok(rules(result).includes(rule),JSON.stringify(result));
  assert.equal(result.accepted,1);
  assert.equal(result.simulatedEffects,0);
  const report=JSON.stringify(result);
  assert.ok(!report.includes('FICTIONAL_CANARY_DO_NOT_ECHO'));
  assert.ok(!report.includes('example.invalid'));
});
test('M4-A timed-out loopback request aborts and cleans up',async()=>{
  const start=Date.now();
  const result=await runLoopbackHttpMock({fault:'server-hang',deadlineMs:450});
  assert.equal(result.status,'FAIL');
  assert.ok(rules(result).includes('LOOPBACK_TIMEOUT'),JSON.stringify(result));
  assert.equal(result.simulatedEffects,0);
  assert.ok(Date.now()-start<7000,'deadline/cleanup bounded');
});
test('M4-A repeated runs close ephemeral listeners deterministically',async()=>{
  for(let i=0;i<4;i++){
    const result=await runLoopbackHttpMock();
    assert.equal(result.status,'PASS',JSON.stringify(result));
  }
});
test('M4-A does not copy parent proxy credentials into HTTP reports',async()=>{
  const prior=process.env.HTTPS_PROXY;
  const canary='SYNTHETIC_PARENT_SECRET_DO_NOT_ECHO';
  try{
    process.env.HTTPS_PROXY='http://'+canary+'.invalid:9999';
    const result=await runLoopbackHttpMock();
    assert.equal(result.status,'PASS',JSON.stringify(result));
    assert.ok(!JSON.stringify(result).includes(canary));
  }finally {
    if(prior===undefined)delete process.env.HTTPS_PROXY;
    else process.env.HTTPS_PROXY=prior;
  }
});
test('M4-A refuse target URL, shell command, custom method and timeout from fixture',async()=>{
  const bad=[
    {profile:'fixed-first-party-loopback-v1',fault:'none',url:'https://example.invalid'},
    {profile:'fixed-first-party-loopback-v1',fault:'none',host:'127.0.0.2'},
    {profile:'fixed-first-party-loopback-v1',fault:'none',command:'curl'},
    {profile:'fixed-first-party-loopback-v1',fault:'none',method:'tools/call'},
    {profile:'fixed-first-party-loopback-v1',fault:'none',deadlineMs:5000},
    {profile:'fixed-first-party-loopback-v1',fault:'not-allowed'}
  ];
  for(const value of bad) assert.throws(()=>runLoopbackHttpScenario(value),/INVALID_LOOPBACK_FIXTURE/);
  assert.throws(()=>runLoopbackHttpMock({fault:'not-allowed'}),/INVALID_LOOPBACK_FAULT/);
  assert.throws(()=>runLoopbackHttpMock({deadlineMs:6000}),/INVALID_LOOPBACK_DEADLINE/);
});
test('M4-A invalid fixture CLI fails with generic error and no URL echo',()=>{
  const run=cli('fixtures/loopback-invalid.json');
  assert.equal(run.status,2);
  const report=JSON.parse(run.stdout);
  assert.equal(report.status,'ERROR');
  assert.equal(report.errorCode,'INVALID_OR_UNREADABLE_INPUT');
  assert.ok(!run.stdout.includes('example.invalid'));
});
