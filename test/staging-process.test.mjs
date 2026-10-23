import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFirstPartyStagingProcessSelftest } from '../src/staging-process-harness.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:65536
});

test('M4-B6-B: fixed worker executes only first-party modern MCP local discovery',async()=>{
  const r=await runFirstPartyStagingProcessSelftest();
  assert.equal(r.status,'PASS');
  assert.equal(r.childProcessUsed,true);
  assert.equal(r.osSandboxed,false);
  assert.equal(r.allowedMethod,'server/discover');
  assert.equal(r.connectionStatus,'FIXED_CHILD_PROCESS_STAGING_ONLY');
  assert.equal(r.externalTargetContacted,false);
  assert.deepEqual([r.checked,r.received,r.accepted],[1,1,1]);
});

test('M4-B6-B: failed child exits without claiming successful network stage',async()=>{
  const r=await runFirstPartyStagingProcessSelftest({fault:'exit'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_WORKER_EXIT_FAILED');
  assert.equal(r.received,0);
  assert.equal(r.externalTargetContacted,false);
});

test('M4-B6-B: invalid IPC with fictional canary is rejected without echo',async()=>{
  const r=await runFirstPartyStagingProcessSelftest({fault:'invalid-ipc'});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_WORKER_IPC_REJECTED');
  assert.ok(!JSON.stringify(r).includes('FICTIONAL_CANARY_DO_NOT_ECHO'));
});

test('M4-B6-B: hung child is killed by an end-to-end finite deadline',async()=>{
  const r=await runFirstPartyStagingProcessSelftest({fault:'hang',deadlineMs:450});
  assert.equal(r.status,'FAIL');
  assert.equal(r.findings[0].rule,'STAGING_WORKER_TIMEOUT');
  assert.equal(r.received,0);
});

test('M4-B6-B: refuses any target URL, spawn override, credentials or user-provided IPC',async()=>{
  for(const p of [
    {endpoint:'https://private.example.org/mcp'},
    {command:'node',args:['untrusted.mjs']},
    {env:{SYNTHETIC_PARENT_SECRET:'fake'}},
    {fault:'--eval'}, {deadlineMs:20000},{fault:'normal',url:'http://localhost/'},
    null
  ])await assert.rejects(runFirstPartyStagingProcessSelftest(p),
    /INVALID_STAGING_PROCESS_OPTIONS/);
});

test('M4-B6-B: no-arg CLI and packaged output remain bounded and redacted',()=>{
  const p=cli('staging-process-selftest');
  assert.equal(p.error,undefined);
  assert.equal(p.status,0,p.stderr);
  const r=JSON.parse(p.stdout);
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.command,'staging-process-selftest');
  assert.equal(r.status,'PASS');
  assert.equal(r.osSandboxed,false);
  assert.equal(r.externalTargetContacted,false);
  assert.deepEqual(r.summary.ruleCodes,[]);
  assert.ok(!p.stdout.includes('127.0.0.1'));
  assert.ok(!p.stdout.includes('FICTIONAL_CANARY'));
});

test('M4-B6-B: CLI forbids targeting any external MCP or passing worker options',()=>{
  for(const x of ['--url=https://unapproved.invalid/mcp',
    '--worker=myserver.mjs','--mode=invalid-ipc',
    'examples/adapter-profiles/stdio-project.json']){
    const result=cli('staging-process-selftest',x);
    assert.equal(result.status,2);
    const doc=JSON.parse(result.stdout);
    assert.equal(doc.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(result.stdout+result.stderr).includes(x));
  }
});

test('M4-B6-B: direct worker rejects unexpected arguments before any mock contact',()=>{
  const worker=fileURLToPath(new URL('../src/first-party-staging-worker.mjs',import.meta.url));
  const p=spawnSync(process.execPath,[worker,'--target=https://private.invalid/mcp'],{
    cwd:root,shell:false,encoding:'utf8',timeout:4000,maxBuffer:8192
  });
  assert.equal(p.status,2);
  assert.equal(p.stdout,'');
  assert.equal(p.stderr,'');
});

test('M4-B6-B: repeated and parallel disposable workers exit without stale resources',async()=>{
  for(let i=0;i<2;i++)
    assert.equal((await runFirstPartyStagingProcessSelftest()).status,'PASS');
  const results=await Promise.all([
    runFirstPartyStagingProcessSelftest(),
    runFirstPartyStagingProcessSelftest()
  ]);
  assert.deepEqual(results.map(r=>r.status),['PASS','PASS']);
});
