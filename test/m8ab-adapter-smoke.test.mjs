/** M8-B: fixed smoke covers both fictional transports without user inputs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {runOfflineAdapterSmoke} from '../tools/adapter-smoke.mjs';
const cli=(...args)=>spawnSync(process.execPath,['tools/adapter-smoke.mjs',...args],{
 cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',
 timeout:25000,maxBuffer:65536
});
test('M8-A/B: both source-authored transports pass in one deterministic report',()=>{
 const a=runOfflineAdapterSmoke(),b=runOfflineAdapterSmoke();
 assert.deepEqual(a,b);assert.equal(a.status,'PASS');assert.equal(a.exitCode,0);
 assert.equal(a.checked,2);assert.equal(a.passed,2);assert.equal(a.failed,0);
 assert.deepEqual(a.checks.map(x=>x.transport),['stdio','streamable-http']);
 assert.ok(a.checks.every(x=>x.matched===true &&
   x.code==='FICTIONAL_KIT_AND_QUICKSTART_MATCH'));
});
test('M8-B: every external/provenance/real-target authority field remains false',()=>{
 const r=runOfflineAdapterSmoke();
 for(const field of ['externalMcpContacted','projectCodeExecuted',
  'actualProjectAssessed','operatorVerified','independentBetaVerified',
  'securityCertified','stableReleaseAuthorized']) assert.equal(r[field],false);
 assert.equal(r.scope,'FIXED_FICTIONAL_LOCAL_ONLY');
});
test('M8-B: actual node CLI succeeds on Windows and Ubuntu runner',()=>{
 const out=cli();assert.equal(out.error,undefined);assert.equal(out.status,0,out.stderr);
 assert.equal(out.stderr,'');
 assert.deepEqual(JSON.parse(out.stdout),runOfflineAdapterSmoke());
});
test('M8-B: all arguments denied without reflecting any submitted value',()=>{
 for(const arg of ['https://private.example.org','PRIVATE_CANARY','--connect']){
  const out=cli(arg);assert.equal(out.status,2);assert.equal(out.stderr,'');
  assert.equal(JSON.parse(out.stdout).errorCode,'SMOKE_ARGUMENTS_NOT_ALLOWED');
  assert.ok(!(out.stdout+out.stderr).includes(arg));
 }
});
test('M8-C: source-only helper is excluded from npm package inventory',()=>{
 const files=JSON.parse(readFileSync(new URL('../test/expected-package-files.json',import.meta.url),'utf8'));
 assert.ok(!files.includes('tools/adapter-smoke.mjs'));
});
