import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {runLocalStdioMock,runStdioMockScenario} from '../src/stdio-mcp-harness.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(file)=>spawnSync(process.execPath,['src/cli.mjs','stdio',file],
  {cwd:root,encoding:'utf8',timeout:20000});
const rules=report=>report.findings.map(x=>x.rule);
test('M3 fixed fictional JSON-RPC stdio batch passes with denied write',()=>{
  const r=runLocalStdioMock();
  assert.equal(r.status,'PASS',JSON.stringify(r.findings));
  assert.equal(r.transport,'FIXED_LOCAL_JSONRPC_STDIO');
  assert.equal(r.checked,4);
  assert.equal(r.received,4);
  assert.equal(r.failureCount,0);
});
test('M3 safe stdio CLI fixture produces additive schema v1 success',()=>{
  const p=cli('fixtures/stdio-mock-safe.json');
  assert.equal(p.status,0,p.stderr);
  const r=JSON.parse(p.stdout);
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.command,'stdio');
  assert.equal(r.status,'PASS');
  assert.equal(r.summary.failureCount,0);
});
test('M3 unsafe stdio CLI fixture exits one with sanitized rule',()=>{
  const p=cli('fixtures/stdio-mock-unsafe.json');
  assert.equal(p.status,1,p.stderr);
  const r=JSON.parse(p.stdout);
  assert.equal(r.command,'stdio');assert.equal(r.exitCode,1);
  assert.ok(rules(r).includes('STDIO_RESPONSE_ID_OR_ENVELOPE_MISMATCH'));
});
for(const [fault,code] of [
  ['wrong-id','STDIO_RESPONSE_ID_OR_ENVELOPE_MISMATCH'],
  ['invalid-json','STDIO_INVALID_JSON_RESPONSE'],
  ['extra-line','STDIO_RESPONSE_COUNT_MISMATCH'],
  ['missing-line','STDIO_RESPONSE_COUNT_MISMATCH'],
  ['changed-result','STDIO_RESPONSE_CONTENT_MISMATCH'],
  ['stderr-canary','STDIO_UNEXPECTED_STDERR']
]) test('M3 rejected fixed mock defect '+fault,()=>{
  const r=runLocalStdioMock({fault});
  assert.equal(r.status,'FAIL');
  assert.ok(rules(r).includes(code),JSON.stringify(r));
  assert.equal(JSON.stringify(r).includes('CANARY_DO_NOT_ECHO'),false);
});
test('M3 oversized child output fails closed with no payload echo',()=>{
  const r=runLocalStdioMock({fault:'oversized-output'});
  assert.equal(r.status,'FAIL');
  assert.ok(rules(r).some(x=>x==='STDIO_OUTPUT_LIMIT'||x==='STDIO_FRAME_TOO_LARGE'));
  assert.ok(JSON.stringify(r).length<2048);
});
test('M3 hung child is terminated by process deadline',()=>{
  const start=Date.now();
  const r=runLocalStdioMock({fault:'hang',timeoutMs:2000});
  assert.equal(r.status,'FAIL');
  assert.ok(rules(r).includes('STDIO_WORKER_TIMEOUT'),JSON.stringify(r));
  assert.ok(Date.now()-start<8000);
});
test('M3 parent synthetic credential is not inherited by child',()=>{
  const saved=process.env.SYNTHETIC_PARENT_CREDENTIAL;
  try {
    process.env.SYNTHETIC_PARENT_CREDENTIAL='FICTIONAL_SECRET_NEVER_ECHO';
    const r=runLocalStdioMock({fault:'env-probe'});
    assert.equal(r.status,'PASS',JSON.stringify(r.findings));
    assert.ok(!JSON.stringify(r).includes('FICTIONAL_SECRET_NEVER_ECHO'));
  } finally {
    if(saved===undefined) delete process.env.SYNTHETIC_PARENT_CREDENTIAL;
    else process.env.SYNTHETIC_PARENT_CREDENTIAL=saved;
  }
});
test('M3 accepts only bounded, known synthetic fixture fields',()=>{
  assert.throws(()=>runStdioMockScenario({profile:'fixed-local-stdio-mock-v1',
    fault:'none',command:'curl https://invalid.example'}),/INVALID_STDIO_MOCK_FIXTURE/);
  assert.throws(()=>runStdioMockScenario({profile:'fixed-local-stdio-mock-v1',
    fault:'anything'}),/INVALID_STDIO_MOCK_FIXTURE/);
  assert.throws(()=>runLocalStdioMock({fault:'any-executable'}),/INVALID_SYNTHETIC_STDIO_FAULT/);
  assert.throws(()=>runLocalStdioMock({timeoutMs:0}),/INVALID_SYNTHETIC_STDIO_TIMEOUT/);
});
test('M3 unknown stdio executable/path fields cause generic CLI error',()=>{
  const p=cli('fixtures/stdio-mock-invalid.json');
  assert.equal(p.status,2);
  const r=JSON.parse(p.stdout);
  assert.equal(r.status,'ERROR');
  assert.equal(r.errorCode,'INVALID_OR_UNREADABLE_INPUT');
  assert.ok(!p.stdout.includes('invalid.example'));
});
test('M3 fixed mock never claims real target effects or certificates',()=>{
  const r=runLocalStdioMock();
  const str=JSON.stringify(r);
  assert.ok(!str.includes('https://'));
  assert.ok(!str.includes('oauth'));
  assert.equal(r.transport,'FIXED_LOCAL_JSONRPC_STDIO');
});
