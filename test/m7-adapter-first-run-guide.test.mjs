/** M7-A/B/C: static, offline, no-argument first-run guide. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {buildAdapterGuideResult,buildCliReport,buildCliHelpResult} from '../src/report-contract.mjs';
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
 cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:20000,maxBuffer:65536
});
test('M7-A: guide is deterministic and contains exactly four ordered steps',()=>{
 const a=buildAdapterGuideResult(),b=buildAdapterGuideResult();
 assert.deepEqual(a,b);assert.deepEqual(a.steps.map(s=>s.step),[1,2,3,4]);
 assert.deepEqual(a.steps.map(s=>s.code),[
  'SELECT_TEMPLATE','EXPORT_KIT','VERIFY_LOCAL_KIT','REVIEW_INERT_DESCRIPTOR']);
 assert.ok(a.steps.every(s=>s.command.startsWith('node src/cli.mjs adapter-')));
});
test('M7-B: guide is available through the JSON-v1 CLI with zero arguments',()=>{
 const run=cli('adapter-guide');
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(run.stdout);
 assert.equal(report.command,'adapter-guide');
 assert.equal(report.reportSchemaVersion,1);
 assert.equal(report.guideSchemaVersion,1);
 assert.equal(report.exitCode,0);
 assert.deepEqual(report.summary,{failureCount:0,reportedFindings:0,findingsTruncated:false,ruleCodes:[]});
 assert.deepEqual(report.steps,buildAdapterGuideResult().steps);
 assert.deepEqual(report,buildCliReport('adapter-guide',buildAdapterGuideResult()));
});
test('M7-B: guide explicitly denies real target, operator and release claims',()=>{
 const g=buildAdapterGuideResult();
 assert.equal(g.scope,'FICTIONAL_LOCAL_ONLY');
 assert.ok(Object.values(g.limits).every(x=>x===false));
 assert.equal(JSON.stringify(g).includes('https://mcp.example.org'),false);
});
test('M7-C: invalid flags and extra arguments fail without echoing canaries',()=>{
 for(const args of [['adapter-guide','PRIVATE_CANARY'],['adapter-guide','--execute'],['adapter-guide','https://private.example.org']]){
  const run=cli(...args);
  assert.equal(run.status,2);
  assert.equal(JSON.parse(run.stdout).errorCode,'INVALID_CLI_ARGUMENTS');
  assert.ok(!run.stdout.includes('PRIVATE_CANARY'));
  assert.ok(!run.stdout.includes('private.example.org'));
 }
});
test('M7-C: existing help includes guide and existing kit command unchanged',()=>{
 const help=buildCliHelpResult();
 assert.ok(help.commands.includes('adapter-guide'));
 assert.ok(help.syntax.includes('node src/cli.mjs adapter-guide'));
 assert.ok(help.syntax.includes('node src/cli.mjs adapter-kit stdio'));
});
