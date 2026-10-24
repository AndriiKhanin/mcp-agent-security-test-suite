import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BETA_CASES, matchesBetaCase, betaSummary, runBeta } from '../examples/beta-acceptance-check.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=(...args)=>spawnSync(process.execPath,['examples/beta-acceptance-check.mjs',...args],{
  cwd:root, shell:false, encoding:'utf8', timeout:60_000, maxBuffer:65_536
});

test('M5-05: offline beta runner verifies exact five fixed positive and detected-negative cases',()=>{
  const x=run();
  assert.equal(x.error,undefined);
  assert.equal(x.status,0,x.stderr);
  const result=JSON.parse(x.stdout);
  assert.equal(result.betaSchemaVersion,1);
  assert.equal(result.profile,'fictional-beta-acceptance-v1');
  assert.equal(result.candidate,'0.0.10-rc.1');
  assert.equal(result.status,'PASS');
  assert.equal(result.exitCode,0);
  assert.deepEqual([result.total,result.passed,result.failed],[5,5,0]);
  assert.deepEqual(result.cases.map(c=>c.id),BETA_CASES.map(c=>c.id));
  assert.deepEqual(result.cases.map(c=>c.expectedStatus),['PASS','PASS','PASS','PASS','FAIL']);
  assert.deepEqual(result.cases.map(c=>c.expectedExit),[0,0,0,0,1]);
  assert.ok(result.cases.every(c=>c.matched===true && c.rule==='NONE'));
  assert.ok(!x.stdout.includes('fictional-nonce'));
  assert.ok(!x.stdout.includes(root));
});

test('M5-05: mutated or missing negative detection fails closed without leaking synthetic payload',()=>{
  const right={reportSchemaVersion:1,exitCode:1,command:'negotiate',
    status:'FAIL',summary:{failureCount:1,ruleCodes:['RETRY_PARAMS_CHANGED']}};
  assert.equal(matchesBetaCase('RETRY_MUTATION',1,right),true);
  const altered={...right, summary:{failureCount:1,ruleCodes:['SYNTHETIC_PRIVATE_SECRET']}};
  assert.equal(matchesBetaCase('RETRY_MUTATION',1,altered),false);
  assert.equal(matchesBetaCase('RETRY_MUTATION',0,{...right,exitCode:0,status:'PASS'}),false);
  assert.equal(matchesBetaCase('RETRY_MUTATION',1,null),false);
  const verdict=betaSummary(BETA_CASES.map(c=>({
    id:c.id,matched:c.id!=='RETRY_MUTATION',
    rule:c.id==='RETRY_MUTATION'?'BETA_EXPECTATION_MISMATCH':'NONE'
  })));
  assert.equal(verdict.status,'FAIL');
  assert.equal(verdict.exitCode,1);
  assert.deepEqual([verdict.passed,verdict.failed],[4,1]);
  assert.ok(!JSON.stringify(verdict).includes('SYNTHETIC_PRIVATE_SECRET'));
});

test('M5-05: wrong identity, missing case, malformed report or changed policy controls are rejected',()=>{
  assert.equal(matchesBetaCase('UNKNOWN_CASE',0,{}),false);
  assert.equal(matchesBetaCase('LOCAL_VERSION',0,{
    reportSchemaVersion:1,exitCode:0,status:'PASS',command:'version',
    version:'0.0.10-rc.999',packageName:'mcp-agent-security-test-suite'
  }),false);
  assert.equal(matchesBetaCase('POLICY_DENIAL',0,{
    reportSchemaVersion:1,exitCode:0,command:'scenario',
    status:'PASS',checks:11,actualFinal:{denied:9,allowed:2,writes:9,reads:1},
    mismatches:[]
  }),false);
  assert.throws(()=>betaSummary([]),/BETA_INVALID_SUMMARY_INPUT/);
  assert.throws(()=>betaSummary(Array(5).fill({id:'OFFLINE_HELP',matched:true,rule:'NONE'})),
    /BETA_INVALID_SUMMARY_INPUT/);
});

test('M5-05: user path, flag, URL and command arguments are rejected and never echoed',()=>{
  for(const arg of ['--target=https://fictional-private.invalid',
    'C:\\fictional-private-path\\secret.json','--exec=fictional-child']) {
    const x=run(arg);
    assert.equal(x.status,2);
    const report=JSON.parse(x.stdout);
    assert.deepEqual(report,{
      betaSchemaVersion:1,profile:'fictional-beta-acceptance-v1',
      status:'ERROR',exitCode:2,errorCode:'BETA_ARGUMENTS_NOT_ALLOWED'
    });
    assert.ok(!(x.stdout+x.stderr).includes(arg));
  }
});

test('M5-05: fixed runner does not accept variable command inventory or user-supplied cases',()=>{
  assert.equal(BETA_CASES.length,5);
  assert.deepEqual(BETA_CASES.map(c=>c.id),[
    'OFFLINE_HELP','LOCAL_VERSION','FIXED_DEMO','POLICY_DENIAL','RETRY_MUTATION'
  ]);
  assert.ok(BETA_CASES.every(c=>Object.isFrozen(c) && Object.isFrozen(c.args)));
  assert.equal(runBeta(['arbitrary-private-fixture']).errorCode,'BETA_ARGUMENTS_NOT_ALLOWED');
});


/* M5-07 — protect the manual evaluator guide, not fake independent evidence. */
const documented=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');

test('M5-07: evaluator pins an actual full public source SHA and remains fictional-only',()=>{
  const d=documented('docs/BETA_TESTING.md');
  const pin='65ded572c1720832ff3f59cb9cd0e3a6987edbdb';
  assert.match(pin,/^[0-9a-f]{40}$/);
  assert.ok(d.includes('git switch --detach '+pin));
  assert.ok(d.includes('git rev-parse HEAD'));
  assert.ok(d.includes('0.0.10-rc.1'));
  assert.ok(d.includes('node --version'));
  assert.ok(d.includes('node examples/beta-acceptance-check.mjs'));
  assert.ok(d.includes('node examples/offline-ci-check.mjs'));
  assert.ok(d.includes('No real MCP servers'));
  assert.ok(d.includes('not a published npm release'));
  assert.ok(d.includes('independent participant'));
});

test('M5-07: optional tarball check is offline, local and not represented as signed proof',()=>{
  const d=documented('docs/BETA_TESTING.md');
  for(const literal of [
    'npm pack --offline --ignore-scripts --pack-destination',
    'npm_config_cache',
    'Get-FileHash -LiteralPath $Archive -Algorithm SHA256',
    'sha256sum "$pack_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"',
    'A digest computed from the archive',
    '80-path',
    'R1 package test'
  ])assert.ok(d.includes(literal),literal);
  assert.doesNotMatch(d,/^\s*(?:&\s*)?npm publish(?:\s|$)/m);
  const src=documented('test/installed-cli-smoke.test.mjs');
  for(const snippet of [
    "'pack', '--json', '--offline', '--ignore-scripts'",
    "'install', '--offline', '--ignore-scripts'",
    "npm_config_offline: 'true'",
    "rmSync(temp, { recursive: true, force: true })"
  ])assert.ok(src.includes(snippet),snippet);
  assert.match(documented('package.json'),/"version": "0\.0\.10-rc\.1"/);
  assert.equal(JSON.parse(documented('test/expected-package-files.json')).length,80);
});

test('M5-07: public beta issue template collects limited fictional feedback only',()=>{
  const form=documented('.github/ISSUE_TEMPLATE/beta_feedback.yml');
  for(const id of [
    'source_commit','version','os','node_major','runner_result',
    'matched_count','evaluation_path','offline_archive','exit_codes',
    'guide_clarity','install_friction','deviations','usability',
    'safe_disclosure','actual_test'
  ])assert.ok(form.includes('id: '+id),'missing form field '+id);
  assert.ok(form.includes('I personally ran the fixed fictional beta protocol'));
  assert.ok(form.includes('A green CI run is not independent beta-tester evidence.'));
  assert.ok(form.includes('Local archive check not attempted'));
  assert.ok(form.includes('Did not run enough exercises'));
  assert.ok(form.includes('required: false'));
  for(const suspicious of [
    'id: token','id: target_url','id: oauth','id: private_logs',
    'id: upload','id: raw_transcript','id: repository_secret'
  ])assert.ok(!form.includes(suspicious),suspicious);
});

test('M5-07: instructions separate expected symbolic detection from safety PASS',()=>{
  const d=documented('docs/BETA_TESTING.md');
  assert.ok(d.includes('observedSafetyStatus:FAIL'));
  assert.ok(d.includes('RETRY_PARAMS_CHANGED'));
  assert.ok(d.includes('process exit **0**'));
  assert.ok(d.includes('**1** on a control mismatch'));
  assert.ok(d.includes('**2** for bad invocation'));
  assert.ok(d.includes('independent usability gate'));
  assert.ok(d.includes('manual'));
  assert.ok(d.includes('#59'));
  assert.ok(d.includes('#43'));
  assert.ok(d.includes('#21'));
  assert.ok(d.includes('No outreach, automatic upload, telemetry'));
  const quick=documented('docs/GETTING_STARTED.md');
  assert.ok(quick.includes('DEMO_PASS: all offline fictional contract checks behaved as expected'));
  assert.ok(quick.includes('SYNTHETIC_EXPECTED_VIOLATION: observed FAIL, expectation MATCH'));
  assert.ok(quick.includes('SYNTHETIC_UNEXPECTED_VIOLATION: observed FAIL, expectation MISMATCH'));
});

test('M5-07: independently operated beta acceptance cannot be inferred from CI',()=>{
  const repoReadme=documented('README.md');
  const roadmap=documented('ROADMAP.md');
  assert.ok(repoReadme.includes('independently verified beta participant yet'));
  assert.ok(roadmap.includes('not independent beta evidence'));
  assert.ok(roadmap.includes('all three independent gates #21/#43/#59'));
  const direct=run();
  assert.equal(direct.status,0,direct.stderr);
  const result=JSON.parse(direct.stdout);
  assert.equal(result.total,5);
  assert.equal(result.passed,5);
  assert.equal(result.failed,0);
  assert.ok(result.cases.every(row=>row.matched && row.rule==='NONE'));
  assert.notEqual(result.profile,'independent-beta-evidence');
});

test('M5-07: bad evaluator runner arguments remain generic even with fake secrets',()=>{
  for(const arg of [
    '--target=https://customer.example.invalid/mcp',
    '--token=fictional-private-secret',
    '--log=private-customer-transcript.json'
  ]) {
    const outcome=run(arg);
    assert.equal(outcome.status,2);
    const result=JSON.parse(outcome.stdout);
    assert.equal(result.status,'ERROR');
    assert.equal(result.errorCode,'BETA_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(outcome.stdout+outcome.stderr).includes(arg));
  }
});
