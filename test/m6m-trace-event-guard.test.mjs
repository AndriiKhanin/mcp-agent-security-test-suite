/**
 * M6-M: close sparse-array PASS bypass and direct-JS getter/inherited flags.
 * First-party symbolic trace only; not malicious Proxy/real-MCP security proof.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {auditRecords,parseJsonl} from '../src/trace.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const legit={decision:'ALLOW',effect:'READ',
  ownerAuthorized:true,scopeAuthorized:true,
  leaseFresh:true,secretLogged:false};
const denied={decision:'DENY',effect:'NONE',secretLogged:false};
const audit=events=>auditRecords(events);
const codes=r=>r.failures.map(f=>f.rule);
function cli(...args) {
  return spawnSync(process.execPath,[join(root,'src','cli.mjs'),...args],{
    cwd:root,shell:false,windowsHide:true,encoding:'utf8',
    timeout:15000,maxBuffer:65536
  });
}
test('M6-M: empty JSON trace is failure, not an audited PASS',()=>{
  const x=audit([]);
  assert.equal(x.status,'FAIL');
  assert.equal(x.checked,0);
  assert.deepEqual(codes(x),['EMPTY_EVENT_SET']);
});
test('M6-M: sparse one-event array can no longer return PASS with checked 1',()=>{
  const sparse=new Array(1);
  assert.throws(()=>audit(sparse),/INVALID_EVENT_COLLECTION/);
  const sparseMixed=[{...legit},,{...denied}];
  assert.throws(()=>audit(sparseMixed),/INVALID_EVENT_COLLECTION/);
});
test('M6-M: inherited event fields never count as observed authorization',()=>{
  const inherited=Object.create(legit);
  const result=audit([inherited]);
  assert.equal(result.status,'FAIL');
  assert.equal(result.checked,1);
  assert.deepEqual(codes(result),['INVALID_EVENT']);
  assert.equal(JSON.stringify(result).includes('ownerAuthorized'),false);
});
test('M6-M: event decision and effect getters never execute',()=>{
  for(const field of ['decision','effect']){
    const e={...legit};
    let touched=0;
    Object.defineProperty(e,field,{enumerable:true,configurable:true,
      get(){touched++;throw new Error('PRIVATE_CANARY_TRIGGERED');}});
    const result=audit([e]);
    assert.deepEqual(codes(result),['INVALID_FIELDS']);
    assert.equal(touched,0);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  }
});
test('M6-M: security evidence getters never execute, even if nonenumerable',()=>{
  for(const field of ['ownerAuthorized','scopeAuthorized','leaseFresh','secretLogged']){
    const e={...legit};
    let touched=0;
    Object.defineProperty(e,field,{enumerable:false,configurable:true,
      get(){touched++;throw new Error('PRIVATE_CANARY_GETTER');}});
    assert.deepEqual(codes(audit([e])),['INVALID_FIELDS']);
    assert.equal(touched,0);
  }
});
test('M6-M: hidden fields, symbolic secrets and foreign prototypes are refused',()=>{
  const a={...legit};
  Object.defineProperty(a,'PRIVATE_CANARY',{value:'secret',enumerable:false});
  const ra=audit([a]);
  assert.deepEqual(codes(ra),['INVALID_FIELDS']);
  assert.ok(!JSON.stringify(ra).includes('PRIVATE_CANARY'));
  const b={...legit};b[Symbol('SECRET')]='PRIVATE_CANARY';
  assert.deepEqual(codes(audit([b])),['INVALID_FIELDS']);
  const c={...legit};
  Object.setPrototypeOf(c,{ownerAuthorized:true});
  assert.deepEqual(codes(audit([c])),['INVALID_EVENT']);
  assert.deepEqual(codes(audit([Object.create(null)])),['INVALID_EVENT']);
});
test('M6-M: array index getter and extra array fields refused before traversal',()=>{
  const a=[{...legit}];
  let touched=0;
  Object.defineProperty(a,'0',{configurable:true,enumerable:true,
    get(){touched++;throw new Error('PRIVATE_CANARY_ARRAY_GETTER');}});
  assert.throws(()=>audit(a),/INVALID_EVENT_COLLECTION/);
  assert.equal(touched,0);
  const b=[{...legit}];b[Symbol('meta')]='PRIVATE_CANARY';
  assert.throws(()=>audit(b),/INVALID_EVENT_COLLECTION/);
  const c=[{...legit}];
  Object.defineProperty(c,'hidden',{value:'PRIVATE_CANARY'});
  assert.throws(()=>audit(c),/INVALID_EVENT_COLLECTION/);
});
test('M6-M: bounded results and legitimate JSONL observations are unchanged',()=>{
  const original=readFileSync(join(root,'fixtures','trace-safe.jsonl'),'utf8');
  const parsed=parseJsonl(original);
  assert.ok(parsed.length>0);
  assert.equal(audit(parsed).status,'PASS');
  assert.equal(audit([{...legit},{...denied}]).status,'PASS');
  const harmful={decision:'DENY',effect:'WRITE',secretLogged:false};
  const huge=audit(Array.from({length:220},()=>({...harmful})));
  assert.equal(huge.status,'FAIL');
  assert.equal(huge.failureCount,220);
  assert.equal(huge.failures.length,200);
  assert.equal(huge.findingsTruncated,true);
  assert.throws(()=>audit(Array(10001).fill({...legit})),
    /INVALID_EVENT_COLLECTION/);
});
test('M6-M: synthetic CLI JSON-v1 remains PASS/FAIL with no raw event echo',()=>{
  const safe=cli('trace','fixtures/trace-safe.jsonl');
  assert.equal(safe.status,0,safe.stderr);
  assert.equal(JSON.parse(safe.stdout).status,'PASS');
  const negative=cli('trace','fixtures/trace-unsafe.jsonl');
  assert.equal(negative.status,1,negative.stderr);
  assert.equal(JSON.parse(negative.stdout).status,'FAIL');
  const dir=mkdtempSync(join(tmpdir(),'m6m-fictional-trace-'));
  try{
    const file=join(dir,'PRIVATE_CANARY.jsonl');
    writeFileSync(file,JSON.stringify({...legit,secretLogged:'PRIVATE_CANARY'})+'\n');
    const x=cli('trace',file);
    assert.equal(x.status,1);
    assert.equal(JSON.parse(x.stdout).status,'FAIL');
    assert.ok(!(x.stdout+x.stderr).includes('PRIVATE_CANARY'));
    assert.ok(!(x.stdout+x.stderr).includes(file));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('M6-M: npm shipment stays exactly 80 paths with no new deps or hooks',()=>{
  const list=JSON.parse(readFileSync(join(root,
    'test/expected-package-files.json'),'utf8'));
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  assert.equal(list.length,80);
  assert.ok(!list.includes('test/m6m-trace-event-guard.test.mjs'));
  for(const key of ['dependencies','devDependencies','optionalDependencies','peerDependencies'])
    assert.equal(Object.keys(pkg[key]??{}).length,0);
  for(const key of ['prepack','postpack','prepublishOnly','postinstall'])
    assert.equal(Object.hasOwn(pkg.scripts,key),false);
});
