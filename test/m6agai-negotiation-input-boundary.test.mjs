/** M6-AG/AH/AI: offline modern negotiation direct-JS data preflight. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditModernNegotiation} from '../src/mcp-modern-negotiation.mjs';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/mcp-negotiate-safe.json',import.meta.url),'utf8'));
const base=()=>structuredClone(fixture);
const invalid=x=>assert.throws(()=>auditModernNegotiation(x),/INVALID_NEGOTIATION_FIXTURE/);

test('M6-AG: accessor anywhere in nested capability evidence cannot execute',()=>{
 const f=base();let count=0;
 const caps=f.steps[0].request.params._meta['io.modelcontextprotocol/clientCapabilities'];
 Object.defineProperty(caps,'secret',{enumerable:true,get(){count++;throw Error('PRIVATE_CANARY');}});
 invalid(f);assert.equal(count,0);
});
test('M6-AG: inherited and symbol fields are rejected as non-JSON evidence',()=>{
 const a=base();Object.setPrototypeOf(a.steps[0].request.params,{inherited:true});invalid(a);
 const b=base();b.grantedCapabilities[Symbol('PRIVATE')]='PRIVATE_CANARY';invalid(b);
});
test('M6-AH: sparse and accessor step positions rejected without execution',()=>{
 const a=base();a.steps=[,a.steps[0]];invalid(a);
 const b=base();let count=0;
 Object.defineProperty(b.steps,'0',{enumerable:true,get(){count++;throw Error('PRIVATE_CANARY');}});
 invalid(b);assert.equal(count,0);
});
test('M6-AI: cyclic and excessive nested evidence fails within bounded traversal',()=>{
 const a=base();a.steps[0].request.params.self=a.steps[0].request.params;invalid(a);
 const b=base();let nested={ok:true};
 for(let i=0;i<40;i++)nested={next:nested};
 b.steps[0].request.params.synthetic=nested;invalid(b);
 const c=base();c.steps[0].request.params.synthetic={huge:'€'.repeat(350000)};invalid(c);
});
test('M6-AG/AH/AI: unchanged synthetic negotiation fixture remains accepted',()=>{
 assert.equal(auditModernNegotiation(base()).status,'PASS');
});
