import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
