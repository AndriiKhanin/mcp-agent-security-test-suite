/**
 * M4-B6-E: finite request-scoped SSE regression for OWN ephemeral first-party
 * 127.0.0.1 discovery. No network URL, caller-selected worker or credentials.
 * No OS/kernel tracing, general SSE interoperability or OAuth assertion.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFirstPartyStagingSelftest } from '../src/first-party-staging-mcp.mjs';
import { runFirstPartyStagingProcessSelftest } from '../src/staging-process-harness.mjs';
import { observeFirstPartyMockAttempts } from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:65536
});
const positive=['sse','sse-comment-log','sse-comment-only',
  'sse-multiline-data','sse-fragmented'];
const negative=['response-sse-extra','response-sse-missing-final',
  'response-sse-unsolicited','response-sse-invalid-json',
  'response-sse-unknown-notification','response-sse-over-event-limit',
  'response-sse-over-comment-limit','response-sse-final-first',
  'response-sse-wrong-event','response-sse-truncated',
  'response-sse-bad-utf8','response-sse-dangling-data'];

test('M4-B6-E: standard single-event SSE remains accepted',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runFirstPartyStagingSelftest({fault:'sse'}));
  assert.equal(result.status,'PASS');
  assert.deepEqual([result.received,result.accepted],[1,1]);
  assert.deepEqual(attempts,['staging-bind','staging-request']);
});

test('M4-B6-E: comment-only keepalive before response is accepted',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'sse-comment-only'});
  assert.equal(r.status,'PASS');
  assert.equal(r.failureCount,0);
});

test('M4-B6-E: CRLF comments and fixed request-scoped log before final accepted',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'sse-comment-log'});
  assert.equal(r.status,'PASS');
  assert.deepEqual([r.checked,r.received,r.accepted],[1,1,1]);
  assert.equal(r.externalTargetContacted,false);
});

test('M4-B6-E: a single JSON result split over two SSE data fields accepted',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'sse-multiline-data'});
  assert.equal(r.status,'PASS');
  assert.equal(r.accepted,1);
});

test('M4-B6-E: split HTTP chunks cannot change fixed SSE final result',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'sse-fragmented'});
  assert.equal(r.status,'PASS');
  assert.equal(r.externalTargetContacted,false);
});

test('M4-B6-E: fixed positive variants produce no raw network details',async()=>{
  for(const fault of positive){
    const r=await runFirstPartyStagingSelftest({fault});
    assert.equal(r.status,'PASS',fault);
    assert.equal(r.connectionStatus,'FIRST_PARTY_STAGING_ONLY');
    assert.equal(r.protocolVersion,'2026-07-28');
    assert.equal(r.allowedMethod,'server/discover');
    assert.ok(!JSON.stringify(r).includes('127.0.0.1'),fault);
    assert.ok(!JSON.stringify(r).includes('owned-discovery-progress'),fault);
  }
});

test('M4-B6-E: extra final JSON-RPC answer denied',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-extra'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: notification-only SSE without final answer denied',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-missing-final'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: unsolicited server-originating RPC request denied',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-unsolicited'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.accepted,1);
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
  assert.ok(!JSON.stringify(r).includes('sampling/createMessage'));
});

test('M4-B6-E: non-request-related list-change notice is not accepted',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-unknown-notification'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: non-JSON SSE data denied',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-invalid-json'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: more than two request-scoped notices denied',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-over-event-limit'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: too many SSE keepalive comments denied by fixture bound',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-over-comment-limit'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: notice after final result is rejected',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-final-first'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: unknown SSE event type is rejected',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-wrong-event'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: unterminated SSE final event rejected',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-truncated'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: invalid UTF-8 in SSE event rejected',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-bad-utf8'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: dangling data line after final result rejected',async()=>{
  const r=await runFirstPartyStagingSelftest({fault:'response-sse-dangling-data'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
});

test('M4-B6-E: every negative fault returns bounded symbolic data',async()=>{
  for(const fault of negative){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>runFirstPartyStagingSelftest({fault}));
    assert.equal(result.status,'FAIL',fault);
    assert.deepEqual(attempts,['staging-bind','staging-request']);
    assert.equal(result.externalTargetContacted,false);
    assert.equal(result.findingsTruncated,false);
    assert.equal(result.findings.length,1);
    assert.equal(result.findings[0].rule,'STAGING_RESPONSE_MISMATCH');
    assert.ok(!JSON.stringify(result).includes('127.0.0.1'));
    assert.ok(!JSON.stringify(result).includes('notifications'));
  }
});

test('M4-B6-E: fixed public CLI remains no-argument and locally bound',()=>{
  for(const command of ['staging-selftest','staging-process-selftest']){
    const p=cli(command);
    assert.equal(p.status,0,p.stderr);
    const r=JSON.parse(p.stdout);
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.command,command);
    assert.equal(r.status,'PASS');
    assert.equal(r.externalTargetContacted,false);
    assert.ok(!p.stdout.includes('127.0.0.1'));
    const denied=cli(command,'--url=https://private.invalid/mcp');
    assert.equal(denied.status,2);
    assert.equal(JSON.parse(denied.stdout).errorCode,'INVALID_CLI_ARGUMENTS');
  }
});

test('M4-B6-E: fixed disposable worker and socket lifecycle still succeed',async()=>{
  const r=await runFirstPartyStagingProcessSelftest();
  assert.equal(r.status,'PASS');
  assert.equal(r.childProcessUsed,true);
  assert.equal(r.osSandboxed,false);
});

test('M4-B6-E: no unreviewed test-only fault or destination can be supplied',async()=>{
  for(const options of [
    {fault:'remote'}, {endpoint:'https://private.invalid/mcp'},
    {event:'sampling/createMessage'}, {raw:'data: unreviewed'},
    {fault:'sse-comment-log',url:'https://unapproved.invalid/'}
  ])await assert.rejects(runFirstPartyStagingSelftest(options),
    /INVALID_FIXED_STAGING_OPTIONS/);
});
