/** M6-AA/AB/AC: numeric fidelity and bounded nested UTF-8. Synthetic only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditJsonRpcExchange} from '../src/jsonrpc-contract.mjs';
const make=()=>({requests:[{jsonrpc:'2.0',method:'ping',id:1,params:{}}],
  responses:[{jsonrpc:'2.0',id:1,result:{ok:true}}]});
const rules=x=>x.findings.map(f=>f.rule);
test('M6-AA: unsafe integers and nonfinite numeric evidence fail closed',()=>{
 for(const value of [Number.MAX_SAFE_INTEGER+1,Infinity,-Infinity,NaN]){
  const x=make();x.responses[0].result={value};
  assert.ok(rules(auditJsonRpcExchange(x)).includes('INVALID_RESPONSE'));
  const y=make();y.requests[0].params={value};
  assert.ok(rules(auditJsonRpcExchange(y)).includes('INVALID_REQUEST'));
 }
 const safe=make();safe.responses[0].result={value:Number.MAX_SAFE_INTEGER};
 assert.equal(auditJsonRpcExchange(safe).status,'PASS');
});
test('M6-AB: oversized object keys fail without leaking key text',()=>{
 const huge='C'.repeat(1024*1024+1);
 const x=make();x.requests[0].params={[huge]:true};
 const result=auditJsonRpcExchange(x);
 assert.ok(rules(result).includes('INVALID_REQUEST'));
 assert.ok(!JSON.stringify(result).includes('CCC'));
});
test('M6-AC: aggregate strings over budget fail even if each string is small',()=>{
 const many=Array.from({length:200},(_,i)=>'€'.repeat(2000)+i);
 const x=make();x.responses[0].result={many};
 assert.ok(rules(auditJsonRpcExchange(x)).includes('INVALID_RESPONSE'));
 const y=make();y.responses[0].error={code:-32603,message:'Synthetic',data:{many}};
 assert.ok(rules(auditJsonRpcExchange(y)).includes('INVALID_RESPONSE'));
});
test('M6-AC: aggregate object keys over budget fail',()=>{
 const keys={};
 for(let i=0;i<350;i++)keys['K'.repeat(3300)+i]=true;
 const x=make();x.requests[0].params=keys;
 assert.ok(rules(auditJsonRpcExchange(x)).includes('INVALID_REQUEST'));
});
test('M6-AA/AB/AC: ordinary fractions, unicode and modest nested objects pass',()=>{
 for(const value of [1,0,-3,1.25,'Пример',{alpha:'δοκιμή',flag:false,items:[1,null,'€']}]){
  const x=make();x.responses[0].result=value;
  assert.equal(auditJsonRpcExchange(x).status,'PASS');
 }
});
