import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFirstPartyStagingSelftest } from '../src/first-party-staging-mcp.mjs';
import { observeFirstPartyMockAttempts } from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:65536
});

test('M4-B6-A: modern server/discover JSON exchange on owned ephemeral loopback only',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runFirstPartyStagingSelftest());
  assert.equal(result.status,'PASS');
  assert.equal(result.profile,'fixed-modern-mcp-staging-v1');
  assert.equal(result.protocolVersion,'2026-07-28');
  assert.equal(result.allowedMethod,'server/discover');
  assert.deepEqual([result.checked,result.received,result.accepted],[1,1,1]);
  assert.equal(result.operatorVerified,false);
  assert.equal(result.externalTargetContacted,false);
  assert.deepEqual(attempts,['staging-bind','staging-request']);
});

test('M4-B6-A: request-scoped single-event SSE discovery accepted',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'sse'});
  assert.equal(r.status,'PASS');
  assert.equal(r.accepted,1);
  assert.deepEqual(r.findings,[]);
});

test('M4-B6-A: forged headers, wrong origin/host, version and path fail closed',async()=>{
  for(const fault of ['wrong-origin','wrong-host','wrong-method',
    'wrong-version','wrong-path','forbidden-tool']){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>runFirstPartyStagingSelftest({fault}));
    assert.equal(result.status,'FAIL',fault);
    assert.equal(result.accepted,0,fault);
    assert.equal(result.findings[0].rule,'STAGING_REQUEST_REJECTED',fault);
    assert.deepEqual(attempts,['staging-bind','staging-request']);
  }
});


test('M47: forged owner and clean-scanner tool calls fail over owned loopback',async()=>{
  const clean=await runFirstPartyStagingSelftest();
  assert.equal(clean.status,'PASS');
  assert.equal(clean.accepted,1);
  assert.equal(clean.allowedMethod,'server/discover');
  for(const fault of ['forged-owner-tool','forged-clean-scanner-tool']){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>runFirstPartyStagingSelftest({fault}));
    assert.equal(result.status,'FAIL',fault);
    assert.equal(result.failureCount,1,fault);
    assert.deepEqual([result.checked,result.received,result.accepted],[1,1,0]);
    assert.equal(result.findings.length,1);
    assert.equal(result.findings[0].rule,'STAGING_REQUEST_REJECTED',fault);
    assert.equal(result.responseClosedCount,0);
    assert.equal(result.socketClosedCount,1);
    assert.equal(result.externalTargetContacted,false);
    assert.equal(result.operatorVerified,false);
    assert.equal(result.allowedMethod,'server/discover');
    assert.deepEqual(attempts,['staging-bind','staging-request']);
    const output=JSON.stringify(result);
    assert.ok(!output.includes('OWNER_EXPLICIT'));
    assert.ok(!output.includes('trusted-owner'));
    assert.ok(!output.includes('NOT_FLAGGED'));
    assert.ok(!output.includes('APPROVED'));
    assert.ok(!output.includes('never-executed'));
    assert.ok(!output.includes('127.0.0.1'));
  }
  const after=await runFirstPartyStagingSelftest();
  assert.equal(after.status,'PASS');
  assert.equal(after.accepted,1);
});

test('M47: production CLI cannot select a forged-source wire fault',()=>{
  for(const flag of [
    '--fault=forged-owner-tool',
    '--fault=forged-clean-scanner-tool',
    '--method=tools/call',
    '--source=OWNER_EXPLICIT',
    '--scanner-observation=NOT_FLAGGED'
  ]){
    const response=cli('staging-selftest',flag);
    assert.equal(response.status,2,response.stderr);
    const report=JSON.parse(response.stdout);
    assert.equal(report.status,'ERROR');
    assert.equal(report.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!response.stdout.includes(flag));
  }
});

test('M4-B6-A: malformed and oversized inputs never dispatch discovery',async()=>{
  for(const fault of ['invalid-json','oversized-request']){
    const r=await runFirstPartyStagingSelftest({fault});
    assert.equal(r.status,'FAIL',fault);
    assert.equal(r.accepted,0,fault);
    assert.equal(r.findings[0].rule,'STAGING_REQUEST_REJECTED',fault);
  }
});

test('M4-B6-A: corrupt reply, response canary and oversized data are denied and not echoed',async()=>{
  for(const [fault,rule] of [
    ['response-id','STAGING_RESPONSE_MISMATCH'],
    ['response-canary','STAGING_RESPONSE_MISMATCH'],
    ['response-oversized','STAGING_RESPONSE_LIMIT']
  ]){
    const r=await runFirstPartyStagingSelftest({fault});
    assert.equal(r.status,'FAIL',fault);
    assert.equal(r.findings[0].rule,rule,fault);
    assert.ok(!JSON.stringify(r).includes('FICTIONAL_CANARY_DO_NOT_ECHO'));
  }
});

test('M4-B6-A: redirects never followed and hanging mock times out',async()=>{
  const redirect=await runFirstPartyStagingSelftest({fault:'response-redirect'});
  assert.equal(redirect.status,'FAIL');
  assert.equal(redirect.findings[0].rule,'STAGING_REDIRECT_REJECTED');
  assert.ok(!JSON.stringify(redirect).includes('example.invalid'));
  const hung=await runFirstPartyStagingSelftest({fault:'response-hang',deadlineMs:350});
  assert.equal(hung.status,'FAIL');
  assert.equal(hung.findings[0].rule,'STAGING_TIMEOUT');
});

test('M4-B6-A: CLI no-arg staging selftest returns safe JSON-v1 contract',()=>{
  const x=cli('staging-selftest');
  assert.equal(x.error,undefined);
  assert.equal(x.status,0,x.stderr);
  const r=JSON.parse(x.stdout);
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.command,'staging-selftest');
  assert.equal(r.exitCode,0);
  assert.equal(r.status,'PASS');
  assert.equal(r.connectionStatus,'FIRST_PARTY_STAGING_ONLY');
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.allowedMethod,'server/discover');
  assert.deepEqual(r.summary.ruleCodes,[]);
  assert.ok(!x.stdout.includes('127.0.0.1'));
  assert.ok(!x.stdout.includes('fixed-staging-server'));
  assert.ok(!x.stdout.includes('http://'));
});

test('M4-B6-A: CLI rejects custom URLs, commands, tokens, profiles and methods',()=>{
  for(const arg of [
    '--url=https://private.example.org/mcp','--command=node',
    '--method=tools/call','--token=fictional-canary',
    'examples/adapter-profiles/streamable-http-project.json'
  ]){
    const x=cli('staging-selftest',arg);
    assert.equal(x.status,2);
    const r=JSON.parse(x.stdout);
    assert.equal(r.status,'ERROR');
    assert.equal(r.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(x.stdout+x.stderr).includes(arg));
  }
});

test('M4-B6-A: direct fault API refuses destination/credential/config injection',async()=>{
  for(const value of [
    {endpoint:'https://private.example.org/mcp'}, {host:'0.0.0.0'},
    {method:'tools/call'}, {fault:'unknown'}, {deadlineMs:99999},
    {authorization:'fictional'}, null
  ])await assert.rejects(runFirstPartyStagingSelftest(value),
    /INVALID_FIXED_STAGING_OPTIONS/);
});

test('M4-B6-A: repeated and parallel isolated staging lifecycles clean up resources',async()=>{
  for(let i=0;i<2;i++){
    const result=await runFirstPartyStagingSelftest();
    assert.equal(result.status,'PASS');
  }
  const [a,b]=await Promise.all([
    runFirstPartyStagingSelftest(),runFirstPartyStagingSelftest({fault:'sse'})
  ]);
  assert.equal(a.status,'PASS');
  assert.equal(b.status,'PASS');
});
