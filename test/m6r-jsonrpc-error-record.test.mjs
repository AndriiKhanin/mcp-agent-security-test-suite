/** M6-R: JSON-RPC error envelopes are own enumerable data only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditJsonRpcExchange} from '../src/jsonrpc-contract.mjs';
const make=()=>({requests:[{jsonrpc:'2.0',method:'ping',id:1}],responses:[
 {jsonrpc:'2.0',id:1,error:{code:-32603,message:'Synthetic error'}}]});
const rules=v=>v.findings.map(x=>x.rule);
test('M6-R: nested error getters are never invoked',()=>{
 for(const field of ['code','message']){
  const x=make();let count=0;
  Object.defineProperty(x.responses[0].error,field,{enumerable:true,
   get(){count++;throw Error('PRIVATE_CANARY');}});
  assert.deepEqual(rules(auditJsonRpcExchange(x)),['INVALID_RESPONSE','MISSING_RESPONSE']);
  assert.equal(count,0);
 }
});
test('M6-R: inherited, hidden and symbol error evidence denied',()=>{
 const a=make();Object.setPrototypeOf(a.responses[0].error,{code:-32603});
 assert.deepEqual(rules(auditJsonRpcExchange(a)),['INVALID_RESPONSE','MISSING_RESPONSE']);
 const b=make();Object.defineProperty(b.responses[0].error,'code',{value:-32603,enumerable:false});
 assert.deepEqual(rules(auditJsonRpcExchange(b)),['INVALID_RESPONSE','MISSING_RESPONSE']);
 const c=make();c.responses[0].error[Symbol('canary')]='PRIVATE_CANARY';
 assert.deepEqual(rules(auditJsonRpcExchange(c)),['INVALID_RESPONSE','MISSING_RESPONSE']);
});
test('M6-R: unknown error fields denied, standard data allowed',()=>{
 const a=make();a.responses[0].error.unreviewed='SYNTHETIC_CANARY';
 const negative=auditJsonRpcExchange(a);
 assert.deepEqual(rules(negative),['INVALID_RESPONSE','MISSING_RESPONSE']);
 assert.equal(JSON.stringify(negative).includes('SYNTHETIC_CANARY'),false);
 const b=make();b.responses[0].error.data={synthetic:true};
 assert.equal(auditJsonRpcExchange(b).status,'PASS');
});
test('M6-R: normal error replies and unmatched ids unchanged',()=>{
 assert.equal(auditJsonRpcExchange(make()).status,'PASS');
 const x=make();x.responses[0].id=2;
 assert.deepEqual(rules(auditJsonRpcExchange(x)),['UNMATCHED_RESPONSE_ID','MISSING_RESPONSE']);
});
