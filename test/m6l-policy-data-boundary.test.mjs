/**
 * M6-L — direct policy module input data-boundary regressions.
 * First-party fictional notes/permissions only; NOT a JavaScript Proxy sandbox.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateScenario} from '../src/policy.mjs';
import {runScenario} from '../src/scenario.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const template=JSON.parse(readFileSync(
  join(root,'fixtures','scenario-denial.json'),'utf8'));
const sample=()=>structuredClone(template);

test('M6-L: existing first-party scenario is still valid and outcome unchanged',()=>{
  const source=sample();
  assert.equal(validateScenario(source),source);
  assert.equal(runScenario(source).status,'PASS');
});
test('M6-L: inherited root fields cannot satisfy scenario authority',()=>{
  const invalid=Object.create(sample());
  assert.throws(()=>validateScenario(invalid),/INVALID_SCENARIO/);
  assert.throws(()=>runScenario(invalid),/INVALID_SCENARIO/);
});
test('M6-L: inherited policy or grant data is not accepted as permission evidence',()=>{
  const p=sample();p.policy=Object.create(p.policy);
  assert.throws(()=>validateScenario(p),/INVALID_POLICY/);
  const g=sample();g.actions[0].grant=Object.create(g.actions[0].grant);
  assert.throws(()=>validateScenario(g),/INVALID_ACTION/);
});
test('M6-L: root/policy/action getters are rejected before being invoked',()=>{
  for(const [place,field,expected] of [
    ['root','policy','INVALID_SCENARIO'],
    ['policy','owner','INVALID_POLICY'],
    ['action','tool','INVALID_ACTION']
  ]){
    const data=sample();
    const object=place==='root'?data:
      place==='policy'?data.policy:data.actions[0];
    let observed=0;
    Object.defineProperty(object,field,{
      enumerable:true,configurable:true,
      get(){observed++;throw Error('PRIVATE_CANARY_GETTER_EXECUTED');}
    });
    assert.throws(()=>validateScenario(data),new RegExp(expected),place);
    assert.equal(observed,0,'unauthorized accessor touched: '+place);
  }
});
test('M6-L: grant/expected/expectedFinal accessors are rejected without effects',()=>{
  for(const [place,field,expected] of [
    ['grant','nonce','INVALID_ACTION'],
    ['expected','decision','INVALID_ACTION'],
    ['expectedFinal','notes','INVALID_EXPECTED_FINAL']
  ]){
    const data=sample();
    if(place==='expectedFinal' && !data.expectedFinal)
      data.expectedFinal={notes:0};
    const object=place==='grant'?data.actions[0].grant:
      place==='expected'?data.actions[0].expected:data.expectedFinal;
    let observed=0;
    Object.defineProperty(object,field,{
      enumerable:true,configurable:true,
      get(){observed++;throw Error('PRIVATE_CANARY_GETTER_EXECUTED');}
    });
    assert.throws(()=>validateScenario(data),new RegExp(expected),place);
    assert.equal(observed,0,'accessor executed: '+place);
  }
});
test('M6-L: sparse and accessor scope arrays fail closed before inspection',()=>{
  for(const field of ['policy','grant']){
    const get=()=>field==='policy'?sample().policy:null;
    const sparse=sample();
    const target=field==='policy'?sparse.policy:sparse.actions[0].grant;
    target.scopes=Array(1);
    assert.throws(()=>validateScenario(sparse),
      new RegExp(field==='policy'?'INVALID_POLICY':'INVALID_ACTION'));
    const getter=sample();
    const scoped=field==='policy'?getter.policy:getter.actions[0].grant;
    let touched=0;
    scoped.scopes=['note:read'];
    Object.defineProperty(scoped.scopes,'0',{
      enumerable:true,configurable:true,
      get(){touched++;throw Error('PRIVATE_CANARY_ACCESSOR');}
    });
    assert.throws(()=>validateScenario(getter),
      new RegExp(field==='policy'?'INVALID_POLICY':'INVALID_ACTION'));
    assert.equal(touched,0);
  }
});
test('M6-L: sparse, accessor and inherited action arrays cannot dispatch fictional effects',()=>{
  const sparse=sample();sparse.actions=Array(1);
  assert.throws(()=>runScenario(sparse),/INVALID_ACTION_COUNT/);
  const accessor=sample();accessor.actions=[accessor.actions[0]];
  let accessed=0;
  Object.defineProperty(accessor.actions,'0',{
    enumerable:true,configurable:true,
    get(){accessed++;throw Error('PRIVATE_CANARY_ACCESSOR');}
  });
  assert.throws(()=>runScenario(accessor),/INVALID_ACTION_COUNT/);
  assert.equal(accessed,0);
  const inherited=sample();inherited.actions=Object.create(Array.prototype);
  assert.throws(()=>validateScenario(inherited),/INVALID_ACTION_COUNT/);
});
test('M6-L: symbol/nonenumerable surprise fields and prototype pollution do not pass',()=>{
  const unexpected=sample();
  Object.defineProperty(unexpected.policy,'PRIVATE_CANARY',{
    value:'fictional',enumerable:false
  });
  assert.throws(()=>validateScenario(unexpected),/INVALID_POLICY/);
  const withSymbol=sample();
  withSymbol.actions[0][Symbol('private')]='fictional';
  assert.throws(()=>validateScenario(withSymbol),/INVALID_ACTION/);
  const alteredProto=sample();
  Object.setPrototypeOf(alteredProto.actions[0],{unsafe:true});
  assert.throws(()=>validateScenario(alteredProto),/INVALID_ACTION/);
  const legit=sample();
  assert.equal(runScenario(legit).status,'PASS');
});
