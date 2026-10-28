import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runOfflineFirstRun} from '../tools/adapter-first-run.mjs';
import {runOfflineAdapterSmoke} from '../tools/adapter-smoke.mjs';

test('M8-N: fixed two-transport first-run report stays fictional-only',()=>{
 const a=runOfflineFirstRun(),b=runOfflineFirstRun();
 assert.deepEqual(a,b);
 assert.equal(a.status,'PASS');
 assert.equal(a.exitCode,0);
 assert.deepEqual(a.transports,['stdio','streamable-http']);
 assert.deepEqual(a.steps.map(x=>x.code),[
 'REVIEW_FICTIONAL_SCOPE','GENERATE_TEMPLATE','COPY_NESTED_TEMPLATE_ONLY',
 'VALIDATE_OFFLINE','INTERPRET_SYNTHETIC_RESULT']);
 for(const flag of ['externalMcpContacted','userProcessExecuted','userDescriptorRead',
 'realProjectAssessed','operatorVerified','independentBetaVerified',
 'independentAuditCompleted','stableReleaseAuthorized']){
  assert.equal(a[flag],false,flag);
 }
 assert.equal(a.smokePassed,2);
 assert.match(a.steps[2].instruction,/nested template object/);
 assert.match(a.steps[4].instruction,/does not assess a real project/);
});

test('M8-N: arguments fail closed without echo',()=>{
 for(const args of [['private-token'],['--target','https://private.example'],['../../secrets.json']]){
  const r=runOfflineFirstRun(args);
  assert.deepEqual(r,{schemaVersion:1,status:'ERROR',exitCode:2,errorCode:'FIRST_RUN_ARGUMENTS_NOT_ALLOWED'});
  assert.doesNotMatch(JSON.stringify(r),/private-token|private\.example|secrets\.json/);
 }
});

test('M8-N: CLI reproduces safe JSON and rejects arbitrary arguments',()=>{
 const good=spawnSync(process.execPath,['tools/adapter-first-run.mjs'],{encoding:'utf8'});
 assert.equal(good.status,0,good.stderr);
 assert.deepEqual(JSON.parse(good.stdout),runOfflineFirstRun());
 const bad=spawnSync(process.execPath,['tools/adapter-first-run.mjs','private-token'],{encoding:'utf8'});
 assert.equal(bad.status,2);
 assert.equal(JSON.parse(bad.stdout).errorCode,'FIRST_RUN_ARGUMENTS_NOT_ALLOWED');
 assert.doesNotMatch(bad.stdout+bad.stderr,/private-token/);
});

test('M8-O: source-only first-run helper excluded from published package files',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.ok(!pkg.files.includes('tools'));
 assert.ok(!pkg.files.some(p=>p==='tools/adapter-first-run.mjs'));
 const doc=readFileSync(new URL('../.github/M8_FIRST_RUN_GUIDE.md',import.meta.url),'utf8');
 assert.match(doc,/node tools\/adapter-first-run\.mjs/);
 assert.match(doc,/source checkout/i);
 assert.match(doc,/no real MCP target/i);
 assert.match(doc,/not a security audit/i);
 assert.equal(runOfflineAdapterSmoke().status,'PASS');
});
