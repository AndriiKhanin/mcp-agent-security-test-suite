/** M6-AJ/AK/AL: only inert own-data consent claims qualify. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {descriptorFingerprint,evaluateAdapterConsent} from '../src/adapter-consent.mjs';
const descriptor=JSON.parse(readFileSync(new URL('../examples/adapter-profiles/stdio-project.json',import.meta.url),'utf8'));
const make=()=>{
 const d=structuredClone(descriptor),now=Date.now();
 return {policySchemaVersion:1,descriptor:d,
  request:{project:d.project.name,transport:'stdio',method:'initialize',operatorId:'fixture-reviewer'},
  claim:{operatorId:'fixture-reviewer',projectFingerprint:descriptorFingerprint(d),
   transport:'stdio',methods:['initialize'],issuedAt:now-1000,expiresAt:now+60000,
   nonce:'fixture-nonce',revoked:false}};
};
const deny=(v,opts)=>assert.throws(()=>evaluateAdapterConsent(v,opts),/INVALID_ADAPTER_CONSENT_INPUT/);

test('M6-AJ: hidden or getter consent field never qualifies or executes',()=>{
 for(const field of ['policySchemaVersion','request','claim']){
  const a=make();Object.defineProperty(a,field,{value:a[field],enumerable:false});
  deny(a);
  const b=make();let calls=0;
  Object.defineProperty(b,field,{enumerable:true,get(){calls++;throw Error('PRIVATE_CANARY');}});
  deny(b);assert.equal(calls,0);
 }
});
test('M6-AJ: request and claim getters never execute',()=>{
 for(const side of ['request','claim']){
  const a=make();let calls=0;
  const key=side==='request'?'operatorId':'nonce';
  Object.defineProperty(a[side],key,{enumerable:true,get(){calls++;throw Error('PRIVATE_CANARY');}});
  deny(a);assert.equal(calls,0);
 }
});
test('M6-AK: method slots must be dense, enumerable, ordinary data',()=>{
 const a=make();a.claim.methods=[,];deny(a);
 const b=make();let calls=0;
 Object.defineProperty(b.claim.methods,'0',{enumerable:true,get(){calls++;throw Error('PRIVATE_CANARY');}});
 deny(b);assert.equal(calls,0);
 const c=make();Object.defineProperty(c.claim.methods,'0',{value:'initialize',enumerable:false});
 deny(c);
});
test('M6-AL: nested descriptor accessors cannot execute during fingerprint',()=>{
 const d=structuredClone(descriptor);let calls=0;
 Object.defineProperty(d.transport,'command',{enumerable:true,get(){calls++;throw Error('PRIVATE_CANARY');}});
 assert.throws(()=>descriptorFingerprint(d),/INVALID_ADAPTER_CONSENT_INPUT/);
 assert.equal(calls,0);
 const e=make();e.descriptor.transport.args=[,'server.mjs'];deny(e);
 const f=make();f.descriptor.project[Symbol('hidden')]='PRIVATE_CANARY';deny(f);
});
test('M6-AL: options getter rejected without touching canary',()=>{
 const a=make();let calls=0;
 const opts={};Object.defineProperty(opts,'nowMs',{enumerable:true,get(){calls++;throw Error('PRIVATE_CANARY');}});
 deny(a,opts);assert.equal(calls,0);
});
test('M6-AJ/AK/AL: normal consent simulation retains offline PASS and in-memory replay denial',()=>{
 const e=make();const seen=new Set();
 const first=evaluateAdapterConsent(e,{seenNonces:seen});
 assert.equal(first.status,'PASS');
 assert.equal(first.executionEnabled,false);
 assert.equal(first.connectionStatus,'NOT_ATTEMPTED');
 assert.equal(evaluateAdapterConsent(e,{seenNonces:seen}).reviewRule,'ADAPTER_SIMULATED_REPLAY');
});
