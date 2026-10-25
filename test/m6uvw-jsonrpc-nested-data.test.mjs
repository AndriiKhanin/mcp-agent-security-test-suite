/** M6-U/V/W: nested synthetic JSON-RPC data is plain, bounded and inert. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditJsonRpcExchange} from '../src/jsonrpc-contract.mjs';

const base=()=>({requests:[{jsonrpc:'2.0',id:1,method:'ping',params:{values:[1,2]}}],
 responses:[{jsonrpc:'2.0',id:1,error:{code:-32603,message:'Synthetic',data:{reason:'fixture'}}}]});
const rules=x=>x.findings.map(row=>row.rule);

test('M6-U: sparse and accessor positional params are rejected without getter calls',()=>{
 const a=base();a.requests[0].params=[1,,3];
 assert.ok(rules(auditJsonRpcExchange(a)).includes('INVALID_REQUEST'));
 const b=base();b.requests[0].params=[1];let touched=0;
 Object.defineProperty(b.requests[0].params,'0',{get(){touched++;throw Error('PRIVATE_CANARY');}});
 assert.ok(rules(auditJsonRpcExchange(b)).includes('INVALID_REQUEST'));
 assert.equal(touched,0);
});

test('M6-V: nested param getters and inherited fields never qualify',()=>{
 const a=base();let touched=0;
 Object.defineProperty(a.requests[0].params,'private',{enumerable:true,get(){touched++;throw Error('PRIVATE_CANARY');}});
 assert.ok(rules(auditJsonRpcExchange(a)).includes('INVALID_REQUEST'));
 assert.equal(touched,0);
 const b=base();Object.setPrototypeOf(b.requests[0].params,{owner:'synthetic'});
 assert.ok(rules(auditJsonRpcExchange(b)).includes('INVALID_REQUEST'));
 const c=base();c.requests[0].params={nested:{list:[true,{ok:'yes'}]}};
 assert.equal(auditJsonRpcExchange(c).status,'PASS');
});

test('M6-W: nested error.data accessor and symbol keys fail closed',()=>{
 const a=base();let touched=0;
 Object.defineProperty(a.responses[0].error.data,'reason',{enumerable:true,get(){touched++;throw Error('PRIVATE_CANARY');}});
 assert.ok(rules(auditJsonRpcExchange(a)).includes('INVALID_RESPONSE'));
 assert.equal(touched,0);
 const b=base();b.responses[0].error.data[Symbol('CANARY')]='PRIVATE_CANARY';
 const result=auditJsonRpcExchange(b);
 assert.ok(rules(result).includes('INVALID_RESPONSE'));
 assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
});

test('M6-U/V/W: depth and node budgets reject without unbounded recursion',()=>{
 const a=base();let deep={ok:true};
 for(let i=0;i<40;i++)deep={child:deep};
 a.requests[0].params=deep;
 assert.ok(rules(auditJsonRpcExchange(a)).includes('INVALID_REQUEST'));
 const b=base();b.responses[0].error.data=Array.from({length:10001},()=>true);
 assert.ok(rules(auditJsonRpcExchange(b)).includes('INVALID_RESPONSE'));
});

test('M6-U/V/W: ordinary JSON-RPC object and positional params remain supported',()=>{
 assert.equal(auditJsonRpcExchange(base()).status,'PASS');
 const a=base();a.requests[0].params=[1,{label:'fixture'},[false,null]];
 assert.equal(auditJsonRpcExchange(a).status,'PASS');
 const b=base();delete b.requests[0].params;delete b.responses[0].error.data;
 assert.equal(auditJsonRpcExchange(b).status,'PASS');
});
