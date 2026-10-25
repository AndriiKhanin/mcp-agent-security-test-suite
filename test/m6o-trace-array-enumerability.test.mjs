/** M6-O: require ordinary enumerable own array slots in direct-JS traces. Offline only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRecords, parseJsonl } from '../src/trace.mjs';

const event=()=>({
  decision:'ALLOW', effect:'WRITE',
  ownerAuthorized:true, scopeAuthorized:true, leaseFresh:true,
  secretLogged:false
});

test('M6-O: hidden own array slots fail closed even when dense',()=>{
  for(const slot of ['0','1']){
    const values=[event(),event()];
    Object.defineProperty(values,slot,{value:event(),enumerable:false,configurable:true,writable:true});
    assert.equal(values.length,2);
    assert.equal(Object.hasOwn(values,slot),true);
    assert.throws(()=>auditRecords(values),/INVALID_EVENT_COLLECTION/);
  }
});

test('M6-O: nonenumerable array slot getter is not invoked',()=>{
  const values=[event()];
  let touched=0;
  Object.defineProperty(values,'0',{enumerable:false,configurable:true,
    get(){touched++;throw new Error('SYNTHETIC_PRIVATE_CANARY');}});
  assert.throws(()=>auditRecords(values),/INVALID_EVENT_COLLECTION/);
  assert.equal(touched,0);
});

test('M6-O: enumerable dense observations and JSONL remain accepted',()=>{
  assert.equal(auditRecords([event()]).status,'PASS');
  assert.equal(auditRecords([event(),{decision:'DENY',effect:'NONE',secretLogged:false}]).status,'PASS');
  const text=JSON.stringify(event())+'\n';
  assert.equal(auditRecords(parseJsonl(text)).status,'PASS');
});

test('M6-O: rejection does not emit hidden slot contents',()=>{
  const values=[event()];
  Object.defineProperty(values,'0',{value:{...event(),canary:'PRIVATE_TEST_VALUE'},enumerable:false});
  assert.throws(()=>auditRecords(values),error=>{
    assert.equal(error.message,'INVALID_EVENT_COLLECTION');
    assert.equal(error.message.includes('PRIVATE_TEST_VALUE'),false);
    return true;
  });
});
