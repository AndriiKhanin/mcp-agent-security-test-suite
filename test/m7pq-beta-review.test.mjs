/** M7-P/Q: local-only one-command beta review evidence and denial cases. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {BETA_CASES,betaSummary} from '../examples/beta-acceptance-check.mjs';
import {buildBetaReview,runBetaReview} from '../tools/beta-review.mjs';
const SHA='a'.repeat(40);
const clean=()=>({
 status:'PASS',exitCode:0,sourceSha:SHA,workingTree:'NO_REPORTED_CHANGES',
 sourceVerification:'LOCAL_GIT_METADATA_ONLY',
 remoteIdentityVerified:false,commitSignatureVerified:false,
 independentOriginVerified:false,actualBetaExecutionVerified:false,
 externalMcpContacted:false,betaGateSatisfied:false,releaseAuthorized:false
});
const beta=()=>betaSummary(BETA_CASES.map(c=>({id:c.id,matched:true,rule:'NONE'})));
const deny=(receipt,result=beta())=>assert.throws(
 ()=>buildBetaReview(receipt,result),/INVALID_FICTIONAL_BETA_REVIEW_INPUT|INVALID_FICTIONAL_BETA_CARD_INPUT/
);
const exec=(...args)=>spawnSync(process.execPath,['tools/beta-review.mjs',...args],{
 cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',
 timeout:30000,maxBuffer:65536
});
test('M7-P: one local command prints full SHA and all five fixed checks',()=>{
 const r=exec();assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/^# Offline fictional beta review/m);
 assert.match(r.stdout,/Local Git HEAD \(not independently verified\): [0-9a-f]{40}/);
 assert.match(r.stdout,/Fixed check matches: 5\/5/);
 assert.match(r.stdout,/Public source identity: NOT VERIFIED/);
 assert.match(r.stdout,/Real MCP target assessment: NOT PERFORMED/);
 assert.ok(!r.stdout.includes('https://'));
});
test('M7-Q: dirty/unverifiable receipts cannot produce beta report',()=>{
 const dirty={...clean(),status:'FAIL',exitCode:1,workingTree:'CHANGES_PRESENT'};
 deny(dirty);
 const invalid={...clean(),sourceSha:'PRIVATE_CANARY'};
 deny(invalid);
 deny({...clean(),independentOriginVerified:true});
 deny({...clean(),remoteIdentityVerified:true});
 deny({...clean(),externalMcpContacted:true});
});
test('M7-Q: only source-owned fixed-case beta results accepted',()=>{
 const b=beta();b.cases[0].rule='PRIVATE_CANARY';deny(clean(),b);
 const c=beta();delete c.cases[3];deny(clean(),c);
});
test('M7-Q: known synthetic failure stays visible but is not security approval',()=>{
 const list=BETA_CASES.map(c=>({id:c.id,matched:true,rule:'NONE'}));
 list[2].matched=false;list[2].rule='BETA_EXPECTATION_MISMATCH';
 const text=buildBetaReview(clean(),betaSummary(list));
 assert.match(text,/Runner status: FAIL/);
 assert.match(text,/Fixed check matches: 4\/5/);
 assert.match(text,/NOT VERIFIED/);
});
test('M7-Q: no argument, URL or path accepted from CLI',()=>{
 for(const arg of ['PRIVATE_CANARY','https://private.example.org','--connect']){
  const r=exec(arg);
  assert.equal(r.status,2,r.stderr);
  assert.equal(r.stdout,'ERROR: BETA_REVIEW_ARGUMENTS_NOT_ALLOWED\n');
  assert.ok(!(r.stdout+r.stderr).includes(arg));
 }
 assert.deepEqual(runBetaReview(['PRIVATE_CANARY']),{
  exitCode:2,text:'ERROR: BETA_REVIEW_ARGUMENTS_NOT_ALLOWED\n'
 });
});
