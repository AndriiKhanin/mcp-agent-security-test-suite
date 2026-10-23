/**
 * M4-B6-F: incremental bounded SSE cancellation on owned first-party
 * temporary IPv4 localhost ONLY. Never an external MCP target/URL client.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFirstPartyStagingSelftest } from '../src/first-party-staging-mcp.mjs';
import { runFirstPartyStagingProcessSelftest } from '../src/staging-process-harness.mjs';
import { observeFirstPartyMockAttempts } from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:65536
});
const positive=['allowed','sse','sse-fragmented','sse-comment-log',
  'sse-comment-only','sse-multiline-data','sse-cross-chunk-crlf'];
const invalid=['response-sse-extra','response-sse-missing-final',
  'response-sse-unsolicited','response-sse-invalid-json',
  'response-sse-unknown-notification','response-sse-over-event-limit',
  'response-sse-over-comment-limit','response-sse-final-first',
  'response-sse-wrong-event','response-sse-truncated',
  'response-sse-bad-utf8','response-sse-dangling-data'];
const stalls=['response-sse-stall-before-event',
  'response-sse-stall-after-notice','response-sse-stall-after-final'];

test('M4-B6-F: baseline JSON discovery remains fixed and closes response',async()=>{
  const r=await runFirstPartyStagingSelftest();
  assert.equal(r.status,'PASS');
  assert.deepEqual([r.received,r.accepted,r.socketClosedCount],[1,1,1]);
  assert.equal(r.externalTargetContacted,false);
});

test('M4-B6-F: one final SSE event accepted without buffering entire body',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runFirstPartyStagingSelftest({fault:'sse'}));
  assert.equal(result.status,'PASS');
  assert.equal(result.socketClosedCount,1);
  assert.deepEqual(attempts,['staging-bind','staging-request']);
});

test('M4-B6-F: LF and CRLF delimiters split across writes are reconstructed',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'sse-cross-chunk-crlf'});
  assert.equal(r.status,'PASS');
  assert.equal(r.socketClosedCount,1);
});

test('M4-B6-F: fixed first-party notification/keepalive variants still pass',async()=>{
  for(const fault of positive){
    const r=await runFirstPartyStagingSelftest({fault});
    assert.equal(r.status,'PASS',fault);
    assert.deepEqual([r.received,r.accepted,r.socketClosedCount],[1,1,1],fault);
    assert.equal(r.externalTargetContacted,false);
  }
});

test('M4-B6-F: oversized chunked SSE is rejected before stream completion',async()=>{
  const r=await runFirstPartyStagingSelftest({
    fault:'response-sse-chunk-flood',deadlineMs:1000});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_LIMIT');
  assert.deepEqual([r.received,r.accepted,r.socketClosedCount],[1,1,1]);
});

test('M4-B6-F: deadline aborts after response headers but before first event',async()=>{
  const r=await runFirstPartyStagingSelftest({
    fault:'response-sse-stall-before-event',deadlineMs:370});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_TIMEOUT');
  assert.deepEqual([r.received,r.accepted,r.socketClosedCount],[1,1,1]);
});

test('M4-B6-F: deadline cancels after first reviewed logging notice',async()=>{
  const r=await runFirstPartyStagingSelftest({
    fault:'response-sse-stall-after-notice',deadlineMs:370});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_TIMEOUT');
  assert.deepEqual([r.received,r.accepted,r.socketClosedCount],[1,1,1]);
});

test('M4-B6-F: final SSE result cannot pass until network stream completes',async()=>{
  const r=await runFirstPartyStagingSelftest({
    fault:'response-sse-stall-after-final',deadlineMs:370});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_TIMEOUT');
  assert.deepEqual([r.received,r.accepted,r.socketClosedCount],[1,1,1]);
});

test('M4-B6-F: pre-existing hangs, redirects and oversized fixtures fail closed',async()=>{
  for(const [fault,rule] of [
    ['response-hang','STAGING_TIMEOUT'],
    ['response-redirect','STAGING_REDIRECT_REJECTED'],
    ['response-oversized','STAGING_RESPONSE_LIMIT']
  ]){
    const r=await runFirstPartyStagingSelftest({fault,deadlineMs:380});
    assert.equal(r.status,'FAIL',fault);
    assert.equal(r.findings[0].rule,rule,fault);
    assert.equal(r.socketClosedCount,1,fault);
  }
});

test('M4-B6-F: malformed and unsolicited SSE fixtures remain rejected',async()=>{
  for(const fault of invalid){
    const r=await runFirstPartyStagingSelftest({fault});
    assert.equal(r.status,'FAIL',fault);
    assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH',fault);
    assert.equal(r.socketClosedCount,1,fault);
    assert.equal(r.externalTargetContacted,false);
  }
});

test('M4-B6-F: no output from aborted or unsolicited streams is echoed',async()=>{
  for(const fault of [
    ...stalls,'response-sse-unsolicited','response-sse-invalid-json'
  ]){
    const r=await runFirstPartyStagingSelftest({fault,deadlineMs:350});
    const serialized=JSON.stringify(r);
    assert.equal(r.status,'FAIL',fault);
    for(const secret of ['127.0.0.1','owned-discovery-progress',
      'sampling/createMessage','example.invalid','data:'])
      assert.ok(!serialized.includes(secret),fault);
    assert.equal(r.externalTargetContacted,false);
  }
});

test('M4-B6-F: repeated short-lived aborted streams close all responses',async()=>{
  for(let i=0;i<2;i++){
    const r=await runFirstPartyStagingSelftest({
      fault:'response-sse-stall-after-notice',deadlineMs:330});
    assert.equal(r.status,'FAIL');
    assert.equal(r.socketClosedCount,1);
  }
});

test('M4-B6-F: bounded simultaneous own loopback fixtures are isolated',async()=>{
  const [a,b]=await Promise.all([
    runFirstPartyStagingSelftest({fault:'sse-cross-chunk-crlf'}),
    runFirstPartyStagingSelftest({fault:'response-sse-stall-before-event',deadlineMs:370})
  ]);
  assert.equal(a.status,'PASS');
  assert.equal(b.status,'FAIL');
  assert.equal(b.findings[0].rule,'STAGING_TIMEOUT');
  assert.deepEqual([a.socketClosedCount,b.socketClosedCount],[1,1]);
});

test('M4-B6-F: fixed child-process staging still closes and passes',async()=>{
  const result=await runFirstPartyStagingProcessSelftest();
  assert.equal(result.status,'PASS');
  assert.equal(result.osSandboxed,false);
  assert.equal(result.externalTargetContacted,false);
});

test('M4-B6-F: installed CLI contract remains no-arg and not a network client',()=>{
  for(const cmd of ['staging-selftest','staging-process-selftest']){
    const p=cli(cmd);
    assert.equal(p.status,0,p.stderr);
    const r=JSON.parse(p.stdout);
    assert.equal(r.status,'PASS');
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.externalTargetContacted,false);
    assert.ok(!p.stdout.includes('127.0.0.1'));
    const q=cli(cmd,'--url=https://private.invalid/mcp');
    assert.equal(q.status,2);
    assert.equal(JSON.parse(q.stdout).errorCode,'INVALID_CLI_ARGUMENTS');
  }
});

test('M4-B6-F: no custom endpoint/event/stream can be injected',async()=>{
  for(const options of [
    {url:'https://unapproved.invalid/mcp'},
    {fault:'response-sse-stall-after-final',event:'sampling/createMessage'},
    {fault:'response-sse-chunk-flood',data:'fake-user-token'},
    {fault:'sse-cross-chunk-crlf',host:'0.0.0.0'},
    {fault:'arbitrary'},null
  ])await assert.rejects(runFirstPartyStagingSelftest(options),
    /INVALID_FIXED_STAGING_OPTIONS/);
});
