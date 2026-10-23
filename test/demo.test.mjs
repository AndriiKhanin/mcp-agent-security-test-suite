import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOfflineDemoResult } from '../src/report-contract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (...args) => spawnSync(process.execPath, ['src/cli.mjs', ...args], {
  cwd:root, shell:false, encoding:'utf8', timeout:15_000, maxBuffer:65_536
});
const goodPositive = () => ({
  status:'PASS', checks:11, actualFinal:{denied:9,allowed:2,writes:1,reads:1},
  mismatches:[]
});
const goodNegative = () => ({
  status:'FAIL', failureCount:1, findings:[{step:2,rule:'RETRY_PARAMS_CHANGED'}]
});

test('M5-01: zero-argument demo passes fixed positive and detected negative control', () => {
  const r=run('demo');
  assert.equal(r.error, undefined);
  assert.equal(r.status,0,r.stderr);
  const report=JSON.parse(r.stdout);
  assert.equal(report.reportSchemaVersion,1);
  assert.equal(report.command,'demo');
  assert.equal(report.status,'PASS');
  assert.equal(report.exitCode,0);
  assert.equal(report.profile,'bundled-fictional-demo-v1');
  assert.equal(report.checks,2);
  assert.deepEqual(report.expectations,[
    {name:'SYNTHETIC_AUTHORIZATION_DENIALS',matched:true},
    {name:'SYNTHETIC_RETRY_MUTATION_DETECTED',matched:true}
  ]);
  assert.deepEqual(report.summary,{failureCount:0,reportedFindings:0,
    findingsTruncated:false,ruleCodes:[]});
  assert.ok(!r.stdout.includes('fictional-nonce'));
  assert.ok(!r.stdout.includes('fictional-read-note'));
});

test('M5-01: unexpected positive result fails demo and exposes symbolic code only', () => {
  const good=goodPositive();
  good.actualFinal.writes=0;
  good.rawSecret='SYNTHETIC_SHOULD_NEVER_ECHO';
  const report=buildOfflineDemoResult(good,goodNegative());
  assert.equal(report.status,'FAIL');
  assert.deepEqual(report.findings,[{step:1,rule:'DEMO_POSITIVE_CONTROL_MISMATCH'}]);
  assert.ok(!JSON.stringify(report).includes('SYNTHETIC_SHOULD_NEVER_ECHO'));
});

test('M5-01: missing or altered negative-control result is rejected', () => {
  const missing=buildOfflineDemoResult(goodPositive(),{
    status:'PASS',failureCount:0,findings:[]
  });
  assert.equal(missing.status,'FAIL');
  assert.deepEqual(missing.findings,[{step:2,rule:'DEMO_NEGATIVE_CONTROL_MISSED'}]);
  const extra=goodNegative();
  extra.findings.push({step:3,rule:'UNEXPECTED_RULE'});
  extra.failureCount=2;
  assert.equal(buildOfflineDemoResult(goodPositive(),extra).status,'FAIL');
});

test('M5-01: both failed controls report exactly two bounded findings', () => {
  const report=buildOfflineDemoResult(null,null);
  assert.equal(report.status,'FAIL');
  assert.equal(report.failureCount,2);
  assert.deepEqual(report.findings.map(x=>x.rule),[
    'DEMO_POSITIVE_CONTROL_MISMATCH','DEMO_NEGATIVE_CONTROL_MISSED'
  ]);
});

test('M5-01: demo rejects arguments/URLs/flags without reflecting them', () => {
  for(const args of [
    ['demo','fictional-secret-path.json'],
    ['demo','--url=https://fictional-private.invalid'],
    ['demo','--exec','fictional-command']
  ]) {
    const r=run(...args);
    assert.equal(r.status,2);
    const out=JSON.parse(r.stdout);
    assert.equal(out.reportSchemaVersion,1);
    assert.equal(out.command,'demo');
    assert.equal(out.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.deepEqual(out.summary.ruleCodes,[]);
    assert.ok(!r.stdout.includes(args[1]));
    assert.ok(!r.stderr.includes(args[1]));
  }
});

test('M5-01: existing file-based commands still require an argument', () => {
  const r=run('scenario');
  assert.equal(r.status,2);
  assert.equal(JSON.parse(r.stdout).errorCode,'INVALID_CLI_ARGUMENTS');
});
