/** M7-M/N: bounded local checkout metadata, not provenance attestation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {formatCheckoutReceipt,inspectLocalCheckout} from '../tools/beta-checkout-receipt.mjs';
const SHA='a'.repeat(40);
const execute=(...args)=>spawnSync(process.execPath,['tools/beta-checkout-receipt.mjs',...args],{
  cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',
  timeout:15000,maxBuffer:65536
});
test('M7-M: public local SHA and clean checkout produce scoped PASS only',()=>{
 const r=formatCheckoutReceipt(SHA,'');
 assert.equal(r.status,'PASS');
 assert.equal(r.exitCode,0);
 assert.equal(r.sourceSha,SHA);
 assert.equal(r.workingTree,'NO_REPORTED_CHANGES');
 assert.equal(r.sourceVerification,'LOCAL_GIT_METADATA_ONLY');
 for(const k of ['ignoredFilesChecked','remoteIdentityVerified','commitSignatureVerified',
                  'independentOriginVerified','actualBetaExecutionVerified',
                  'externalMcpContacted','betaGateSatisfied','releaseAuthorized'])
   assert.equal(r[k],false);
});
test('M7-N: untracked private file names are never echoed in receipt',()=>{
 const marker='?? credentials-PRIVATE_CANARY.env\n';
 const receipt=formatCheckoutReceipt(SHA,marker);
 assert.equal(receipt.status,'FAIL');
 assert.equal(receipt.exitCode,1);
 assert.equal(receipt.workingTree,'CHANGES_PRESENT');
 assert.ok(!JSON.stringify(receipt).includes('PRIVATE_CANARY'));
});
test('M7-N: malformed or oversized local metadata returns generic error',()=>{
 for(const head of ['secret','A'.repeat(40),'g'.repeat(40),'a'.repeat(39),
                     'a'.repeat(41),SHA+'\n']){
   const r=formatCheckoutReceipt(head,'');
   assert.equal(r.status,'ERROR');
   assert.equal(r.exitCode,2);
   assert.ok(!JSON.stringify(r).includes(head));
 }
 assert.equal(formatCheckoutReceipt(SHA,'x'.repeat(131073)).status,'ERROR');
});
test('M7-N: extra CLI arguments are rejected without inspecting or echoing them',()=>{
 const r=execute('PRIVATE_CANARY');
 assert.equal(r.status,2,r.stderr);
 const o=JSON.parse(r.stdout);
 assert.equal(o.errorCode,'CHECKOUT_RECEIPT_ARGUMENTS_NOT_ALLOWED');
 assert.ok(!(r.stdout+r.stderr).includes('PRIVATE_CANARY'));
 assert.equal(inspectLocalCheckout(['https://private.example.org']).exitCode,2);
});
test('M7-M/N: actual checkout executes fixed local Git-only read on CI source',()=>{
 const r=execute();
 assert.equal(r.error,undefined);
 assert.equal(r.status,0,r.stderr);
 const o=JSON.parse(r.stdout);
 assert.equal(o.status,'PASS');
 assert.equal(o.exitCode,0);
 assert.match(o.sourceSha,/^[a-f0-9]{40}$/);
 assert.equal(o.workingTree,'NO_REPORTED_CHANGES');
 assert.equal(o.remoteIdentityVerified,false);
 assert.equal(o.actualBetaExecutionVerified,false);
 assert.equal(o.betaGateSatisfied,false);
});
