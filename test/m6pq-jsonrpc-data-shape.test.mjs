/** M6-P/Q: offline direct-JS JSON-RPC envelope and batch integrity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditJsonRpcExchange} from '../src/jsonrpc-contract.mjs';

const request=()=>({jsonrpc:'2.0',method:'ping',id:1});
const response=()=>({jsonrpc:'2.0',id:1,result:{}});
const exchange=()=>({requests:[request()],responses:[response()]});

test('M6-P: inherited or accessor root envelope fields are rejected before getters',()=>{
  const inherited=Object.create({requests:[request()],responses:[response()]});
  assert.throws(()=>auditJsonRpcExchange(inherited),/INVALID_JSONRPC_EXCHANGE/);
  const x=exchange();
  let touched=0;
  Object.defineProperty(x,'requests',{get(){touched++;throw Error('PRIVATE_CANARY');}});
  assert.throws(()=>auditJsonRpcExchange(x),/INVALID_JSONRPC_EXCHANGE/);
  assert.equal(touched,0);
});

test('M6-P: inherited, hidden, and accessor request/response evidence fail closed',()=>{
  for(const side of ['requests','responses']){
    const a=exchange();
    const item=a[side][0];
    Object.defineProperty(item,'id',{value:1,enumerable:false});
    assert.equal(auditJsonRpcExchange(a).status,'FAIL');
    const b=exchange();
    let touched=0;
    Object.defineProperty(b[side][0],'id',{get(){touched++;throw Error('PRIVATE_CANARY');}});
    assert.equal(auditJsonRpcExchange(b).status,'FAIL');
    assert.equal(touched,0);
    const c=exchange();
    Object.setPrototypeOf(c[side][0],{id:1});
    assert.equal(auditJsonRpcExchange(c).status,'FAIL');
  }
});

test('M6-Q: sparse request and response batches are not silently skipped',()=>{
  const a=exchange();a.requests=new Array(1);
  assert.throws(()=>auditJsonRpcExchange(a),/INVALID_JSONRPC_EXCHANGE/);
  const b=exchange();b.responses=[response(),,response()];
  assert.throws(()=>auditJsonRpcExchange(b),/INVALID_JSONRPC_EXCHANGE/);
});

test('M6-Q: hidden array slots and array getters fail without invoking getters',()=>{
  for(const side of ['requests','responses']){
    const x=exchange();
    Object.defineProperty(x[side],'0',{value:x[side][0],enumerable:false});
    assert.throws(()=>auditJsonRpcExchange(x),/INVALID_JSONRPC_EXCHANGE/);
    const y=exchange();
    let touched=0;
    Object.defineProperty(y[side],'0',{get(){touched++;throw Error('PRIVATE_CANARY');}});
    assert.throws(()=>auditJsonRpcExchange(y),/INVALID_JSONRPC_EXCHANGE/);
    assert.equal(touched,0);
  }
});

test('M6-P/Q: normal fictional exchange and negative missing reply stay unchanged',()=>{
  const valid=auditJsonRpcExchange(exchange());
  assert.equal(valid.status,'PASS');
  assert.equal(valid.requestCount,1);
  const missing=exchange();missing.responses=[];
  const audit=auditJsonRpcExchange(missing);
  assert.equal(audit.status,'FAIL');
  assert.ok(audit.findings.some(x=>x.rule==='MISSING_RESPONSE'));
});
