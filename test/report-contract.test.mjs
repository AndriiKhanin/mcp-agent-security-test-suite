import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCliReport, buildCliErrorReport, REPORT_SCHEMA_VERSION } from '../src/report-contract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli = (...args) => spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',timeout:20000
});
function parseReport(run) {
  assert.equal(run.error,undefined);
  assert.ok(run.stdout.startsWith('{'), 'all outcomes produce JSON on stdout');
  return JSON.parse(run.stdout);
}
const cases = [
  ['scenario','fixtures/scenario-denial.json'],
  ['trace','fixtures/trace-safe.jsonl'],
  ['mock','fixtures/scenario-denial.json'],
  ['witness','fixtures/scenario-denial.json'],
  ['process','fixtures/scenario-denial.json'],
  ['jsonrpc','fixtures/jsonrpc-safe.json'],
  ['era','fixtures/mcp-modern-safe.json'],
  ['negotiate','fixtures/mcp-negotiate-safe.json']
];

test('M2-01 public report schema starts at major version 1',()=>{
  assert.equal(REPORT_SCHEMA_VERSION,1);
});

for(const [command,path] of cases) {
  test('M2-01 '+command+' has stable JSON reporting fields and success exit',()=>{
    const run=cli(command,path);
    assert.equal(run.status,0,run.stderr);
    const r=parseReport(run);
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.command,command);
    assert.equal(r.exitCode,0);
    assert.equal(r.status,'PASS');
    assert.deepEqual(r.summary,{
      failureCount:0,reportedFindings:0,findingsTruncated:false,ruleCodes:[]
    });
  });
}

for(const [command,path] of [['trace','fixtures/trace-unsafe.jsonl'],
 ['negotiate','fixtures/mcp-negotiate-unsafe-params.json']]) {
  test('M2-01 '+command+' violations exit 1 with bounded rule codes',()=>{
    const run=cli(command,path);
    assert.equal(run.status,1,run.stderr);
    const r=parseReport(run);
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.exitCode,1);
    assert.equal(r.status,'FAIL');
    assert.ok(r.summary.failureCount>0);
    assert.ok(r.summary.reportedFindings>0);
    assert.ok(r.summary.ruleCodes.length>0);
    assert.deepEqual(r.summary.ruleCodes,[...r.summary.ruleCodes].sort());
    assert.equal(r.summary.ruleCodes.every(x=>/^[A-Z][A-Z0-9_]*$/.test(x)),true);
    assert.ok(!run.stdout.includes('fictional-nonce'));
  });
}

test('M2-01 native report body is retained without breaking existing consumers',()=>{
  const run=cli('scenario','fixtures/scenario-denial.json');
  const r=parseReport(run);
  assert.equal(r.scenario,'access-boundaries');
  assert.equal(r.checks,11);
  assert.equal(r.actualFinal.denied,9);
  assert.ok(Array.isArray(r.mismatches));
  assert.ok(Array.isArray(r.steps));
});

test('M2-01 summary counts and sorts distinct codes, respects truncation',()=>{
  const result={status:'FAIL', failureCount:203,findingsTruncated:true,
    findings:[{step:3,rule:'Z_RULE'},{step:1,rule:'A_RULE'},{step:2,rule:'Z_RULE'}]};
  const r=buildCliReport('negotiate',result);
  assert.deepEqual(r.summary,{failureCount:203,reportedFindings:3,
    findingsTruncated:true,ruleCodes:['A_RULE','Z_RULE']});
  assert.equal(r.exitCode,1);
  assert.deepEqual(r.findings,result.findings);
});

test('M2-01 summary handles legacy scenario mismatch shape',()=>{
  const r=buildCliReport('scenario',{status:'FAIL',mismatches:[
    {step:2,field:'decision',rule:'EXPECTATION_MISMATCH'},
    {step:1,field:'effect',rule:'FINAL_STATE_MISMATCH'}]});
  assert.equal(r.summary.failureCount,2);
  assert.deepEqual(r.summary.ruleCodes,['EXPECTATION_MISMATCH','FINAL_STATE_MISMATCH']);
});

test('M2-01 unknown injected rule text is never copied to summary',()=>{
  const r=buildCliReport('negotiate',{status:'FAIL',findings:[
    {step:1,rule:'PRIVATE_FAKE_PAYLOAD:DO_NOT_ECHO'}]});
  assert.deepEqual(r.summary.ruleCodes,['UNCLASSIFIED_FINDING']);
  assert.equal(r.summary.reportedFindings,1);
});

test('M2-01 report construction has deterministic ordering',()=>{
  const payload={status:'FAIL',failureCount:3,findings:[
    {rule:'Z_RULE',step:3},{rule:'A_RULE',step:1},{rule:'Z_RULE',step:2}]};
  assert.equal(JSON.stringify(buildCliReport('negotiate',payload)),
    JSON.stringify(buildCliReport('negotiate',structuredClone(payload))));
});

test('M2-01 invalid CLI arguments yield structured generic error and exit 2',()=>{
  const run=cli('unknown-secret-command','fictional-secret-file');
  assert.equal(run.status,2);
  const r=parseReport(run);
  assert.deepEqual(r,buildCliErrorReport(null,'INVALID_CLI_ARGUMENTS'));
  assert.equal(r.status,'ERROR');
  assert.equal(r.exitCode,2);
  assert.equal(r.command,null);
  assert.ok(!run.stdout.includes('unknown-secret-command'));
  assert.ok(!run.stderr.includes('fictional-secret-file'));
});

test('M2-01 absent file yields structured error without leaking path',()=>{
  const secretPath='PRIVATE_PATH_NEVER_LOGGED_fictional.json';
  const run=cli('scenario',secretPath);
  assert.equal(run.status,2);
  const r=parseReport(run);
  assert.deepEqual(r,buildCliErrorReport('scenario','INVALID_OR_UNREADABLE_INPUT'));
  assert.ok(!(run.stdout+run.stderr).includes(secretPath));
});

function withTempData(bytes,fn) {
  const dir=mkdtempSync(join(tmpdir(),'mcp-report-fixture-'));
  const path=join(dir,'fictional-input.json');
  try {writeFileSync(path,bytes);return fn(path);}
  finally {rmSync(dir,{recursive:true,force:true});}
}

test('M2-01 malformed JSON never leaks its fake payload',()=>{
  const canary='FICTIONAL_PRIVATE_CANARY_DO_NOT_ECHO';
  withTempData('{"synthetic":"'+canary+'", invalid',file=>{
    const run=cli('scenario',file);
    assert.equal(run.status,2);
    assert.deepEqual(parseReport(run),buildCliErrorReport('scenario','INVALID_OR_UNREADABLE_INPUT'));
    assert.ok(!(run.stdout+run.stderr).includes(canary));
    assert.ok(!(run.stdout+run.stderr).includes(file));
  });
});

test('M2-01 file over 1 MiB fails with bounded generic error',()=>{
  withTempData(Buffer.alloc(1024*1024+1,0x41),file=>{
    const run=cli('scenario',file);
    assert.equal(run.status,2);
    assert.deepEqual(parseReport(run),buildCliErrorReport('scenario','INVALID_OR_UNREADABLE_INPUT'));
    assert.ok(!(run.stdout+run.stderr).includes(file));
    assert.ok(run.stdout.length<512);
  });
});

test('M2-01 invalid UTF-8 input fails without exposing content',()=>{
  withTempData(Buffer.from([0xff,0xfe,0x00]),file=>{
    const run=cli('jsonrpc',file);
    assert.equal(run.status,2);
    assert.deepEqual(parseReport(run),buildCliErrorReport('jsonrpc','INVALID_OR_UNREADABLE_INPUT'));
  });
});

test('M2-01 duplicate-key JSON cannot appear as an approved result',()=>{
  withTempData('{"version":1,"version":2,"synthetic":"PRIVATE_FAKE_PAYLOAD"}',file=>{
    const run=cli('scenario',file);
    assert.equal(run.status,2);
    const r=parseReport(run);
    assert.equal(r.status,'ERROR');
    assert.ok(!(run.stdout+run.stderr).includes('PRIVATE_FAKE_PAYLOAD'));
  });
});

test('M2-01 a safe error constructor only accepts allowlisted symbolic codes',()=>{
  assert.throws(()=>buildCliErrorReport('scenario','PRIVATE_INFO'),/INVALID_REPORT_ERROR_CODE/);
  assert.throws(()=>buildCliErrorReport('unknown-command','INVALID_CLI_ARGUMENTS'),/INVALID_REPORT_COMMAND/);
});

test('M5-02: fixed remediation advice for two bundled fictional negative controls',()=>{
  for(const [command,path,code,expectedCommand] of [
    ['negotiate','fixtures/mcp-negotiate-unsafe-params.json','RETRY_PARAMS_CHANGED',
      'node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json'],
    ['trace','fixtures/trace-unsafe.jsonl','DENIED_ACTION_HAD_EFFECT',
      'node src/cli.mjs trace fixtures/trace-unsafe.jsonl'],
    ['trace','fixtures/trace-unsafe-secret.jsonl','FLAGGED_SECRET_IN_AUDIT_LOG',
      'node src/cli.mjs trace fixtures/trace-unsafe-secret.jsonl']
  ]) {
    const run=cli(command,path);
    assert.equal(run.status,1,run.stderr);
    const report=parseReport(run);
    assert.ok(report.summary.ruleCodes.includes(code));
    assert.deepEqual(report.guidance.map(x=>x.code),[code]);
    assert.equal(report.guidance[0].exampleCommand,expectedCommand);
    assert.equal(report.guidance[0].nextStep.length>10,true);
    assert.equal(report.exitCode,1);
  }
});

test('M5-02: guidance is a strict allowlist, deterministic and capped independently of native rows',()=>{
  const canary='FICTIONAL_PRIVATE_CANARY';
  const findings=[
    {step:1,rule:'RETRY_PARAMS_CHANGED',payload:canary},
    {step:2,rule:'DENIED_ACTION_HAD_EFFECT',message:canary},
    {step:3,rule:'FLAGGED_SECRET_IN_AUDIT_LOG',path:canary},
    {step:4,rule:canary},
    {step:5,rule:'__proto__'},
    {step:6,rule:'PRIVATE:' + canary}
  ];
  const payload={status:'FAIL',failureCount:6,findings};
  const first=buildCliReport('negotiate',payload);
  const second=buildCliReport('negotiate',structuredClone(payload));
  assert.deepEqual(first.guidance,second.guidance);
  assert.deepEqual(first.guidance.map(x=>x.code),[
    'DENIED_ACTION_HAD_EFFECT','FLAGGED_SECRET_IN_AUDIT_LOG','RETRY_PARAMS_CHANGED'
  ]);
  assert.ok(first.guidance.length<=3);
  assert.ok(!JSON.stringify(first.guidance).includes(canary));
  assert.ok(!JSON.stringify(first.guidance).includes('__proto__'));
  assert.ok(!JSON.stringify(first.guidance).includes('PRIVATE:'));
  assert.ok(JSON.stringify(first).includes(canary),
    'native fields remain unchanged; guidance is not a DLP guarantee');
});

test('M5-02: unknown-only, passing, and malformed rule sets provide no forged advice',()=>{
  const a=buildCliReport('trace',{status:'FAIL',findings:[
    {rule:'PRIVATE_SECRET_PLACEHOLDER'}, {rule:'unknown data'}
  ]});
  assert.deepEqual(a.guidance,[]);
  assert.deepEqual(buildCliReport('trace',{status:'PASS',failures:[]}).guidance,[]);
  assert.equal(a.summary.reportedFindings,2);
});

test('M5-02: invalid CLI inputs emit only fixed template with safe example',()=>{
  for(const [args,code] of [
    [['unknown-fake-token','PRIVATE_SENTINEL'], 'INVALID_CLI_ARGUMENTS'],
    [['scenario','PRIVATE_SENTINEL_MISSING.json'], 'INVALID_OR_UNREADABLE_INPUT']
  ]) {
    const run=cli(...args);
    assert.equal(run.status,2);
    const report=parseReport(run);
    assert.equal(report.errorCode,code);
    assert.deepEqual(report.guidance.map(x=>x.code),[code]);
    assert.equal(report.guidance[0].exampleCommand,'node src/cli.mjs demo');
    assert.ok(!JSON.stringify(report).includes('PRIVATE_SENTINEL'));
    assert.ok(!run.stderr.includes('PRIVATE_SENTINEL'));
  }
});
