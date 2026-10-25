/** M6-X/Y/Z: offline JSON-RPC successful results and bounded JSON data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditJsonRpcExchange } from '../src/jsonrpc-contract.mjs';

const make=()=>({requests:[{jsonrpc:'2.0',id:1,method:'ping',params:{}}],
  responses:[{jsonrpc:'2.0',id:1,result:{ok:true}}]});
const rules=x=>x.findings.map(f=>f.rule);
const invalid=x=>assert.ok(rules(auditJsonRpcExchange(x)).includes('INVALID_RESPONSE'));

test('M6-X: successful result getters are not invoked',()=>{
  const x=make();let hit=0;
  Object.defineProperty(x.responses[0].result,'ok',{enumerable:true,
    get(){hit++;throw Error('SYNTHETIC_SECRET');}});
  invalid(x);assert.equal(hit,0);
});

test('M6-X: sparse, inherited and symbol result evidence refused',()=>{
  const a=make();a.responses[0].result=[1,,2];invalid(a);
  const b=make();Object.setPrototypeOf(b.responses[0].result,{inherited:true});invalid(b);
  const c=make();c.responses[0].result[Symbol('secret')]='SYNTHETIC';invalid(c);
});

test('M6-Y: UTF-8 oversized strings are rejected in all three nested positions',()=>{
  const huge='€'.repeat(350000);
  const a=make();a.requests[0].params={huge};
  assert.ok(rules(auditJsonRpcExchange(a)).includes('INVALID_REQUEST'));
  const b=make();b.responses[0].result={huge};invalid(b);
  const c=make();delete c.responses[0].result;
  c.responses[0].error={code:-32603,message:'Synthetic',data:{huge}};invalid(c);
});

test('M6-Z: self-referential and mutually cyclic synthetic evidence fails bounded',()=>{
  const a=make();a.responses[0].result.self=a.responses[0].result;invalid(a);
  const b=make();const one={},two={};one.two=two;two.one=one;
  b.requests[0].params=one;
  assert.ok(rules(auditJsonRpcExchange(b)).includes('INVALID_REQUEST'));
});

test('M6-X/Y/Z: legitimate scalar and structured result values still pass',()=>{
  for(const value of [null,true,false,0,3.5,'Synthetic',{value:[1,{ok:true},null]}]){
    const a=make();a.responses[0].result=value;
    assert.equal(auditJsonRpcExchange(a).status,'PASS');
  }
});
