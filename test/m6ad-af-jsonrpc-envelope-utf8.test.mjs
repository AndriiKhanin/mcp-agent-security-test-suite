/** M6-AD/AE/AF: bounded UTF-8 JSON-RPC envelope strings. Offline only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditJsonRpcExchange} from '../src/jsonrpc-contract.mjs';

const req=(id=1,method='ping')=>({jsonrpc:'2.0',id,method});
const res=(id=1)=>({jsonrpc:'2.0',id,result:{ok:true}});
const rules=x=>x.findings.map(f=>f.rule);
const audit=(requests,responses)=>auditJsonRpcExchange({requests,responses});

test('M6-AD: multibyte request ID above 128 UTF-8 bytes is rejected',()=>{
 const id='€'.repeat(43);
 assert.equal(id.length,43);
 assert.ok(Buffer.byteLength(id,'utf8')>128);
 assert.ok(rules(audit([req(id)],[res(id)])).includes('INVALID_REQUEST_ID'));
});
test('M6-AD: oversized response ID never matches a request',()=>{
 const id='€'.repeat(43);
 assert.ok(rules(audit([req(1)],[res(id)])).includes('INVALID_RESPONSE'));
});
test('M6-AE: multibyte method name above 128 UTF-8 bytes fails',()=>{
 const method='ø'.repeat(65);
 const out=audit([req(1,method)],[]);
 assert.ok(rules(out).includes('INVALID_REQUEST'));
});
test('M6-AF: multibyte error message above 256 UTF-8 bytes fails',()=>{
 const message='€'.repeat(86);
 const x=audit([req()],[{jsonrpc:'2.0',id:1,error:{code:-32603,message}}]);
 assert.ok(rules(x).includes('INVALID_RESPONSE'));
 assert.ok(!JSON.stringify(x).includes(message));
});
test('M6-AD/AE/AF: exact byte boundaries and ordinary Unicode remain supported',()=>{
 const id='€'.repeat(42)+'ab'; // 128 bytes
 const method='ø'.repeat(64); // 128 bytes
 const message='€'.repeat(85)+'A'; // 256 bytes
 assert.equal(Buffer.byteLength(id,'utf8'),128);
 assert.equal(Buffer.byteLength(method,'utf8'),128);
 assert.equal(Buffer.byteLength(message,'utf8'),256);
 assert.equal(audit([req(id,method)],[{jsonrpc:'2.0',id,error:{code:-32603,message}}]).status,'PASS');
 assert.equal(audit([req('α')],[res('α')]).status,'PASS');
});
