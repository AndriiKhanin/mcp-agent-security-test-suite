/** M6-S/T synthetic CLI report direct-JS input guards. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCliReport} from '../src/report-contract.mjs';

const report=()=>({status:'FAIL',findings:[{rule:'DENIED_ACTION_HAD_EFFECT',step:1}],failureCount:1});

test('M6-S: report top-level getter never executes',()=>{
 const x=report();let touched=0;
 Object.defineProperty(x,'status',{enumerable:true,get(){touched++;throw Error('PRIVATE_CANARY');}});
 assert.throws(()=>buildCliReport('trace',x),/INVALID_REPORT_STATUS/);
 assert.equal(touched,0);
});
test('M6-S: hidden/inherited/symbol report properties fail closed',()=>{
 const a=report();Object.defineProperty(a,'status',{value:'FAIL',enumerable:false});
 assert.throws(()=>buildCliReport('trace',a),/INVALID_REPORT_STATUS/);
 const b=Object.create({status:'FAIL'});b.findings=[];
 assert.throws(()=>buildCliReport('trace',b),/INVALID_REPORT_STATUS/);
 const c=report();c[Symbol('private')]='SYNTHETIC';
 assert.throws(()=>buildCliReport('trace',c),/INVALID_REPORT_STATUS/);
});
test('M6-T: sparse and accessor finding arrays fail before traversal',()=>{
 const a=report();a.findings=[,{rule:'DENIED_ACTION_HAD_EFFECT'}];
 assert.throws(()=>buildCliReport('trace',a),/INVALID_REPORT_FINDINGS/);
 const b=report();let touched=0;
 Object.defineProperty(b.findings,'0',{enumerable:true,get(){touched++;throw Error('PRIVATE_CANARY');}});
 assert.throws(()=>buildCliReport('trace',b),/INVALID_REPORT_FINDINGS/);
 assert.equal(touched,0);
});
test('M6-T: finding getters, hidden or inherited rule evidence fail closed',()=>{
 for(const key of ['rule','step']){
  const a=report();let touched=0;
  Object.defineProperty(a.findings[0],key,{enumerable:true,get(){touched++;throw Error('PRIVATE_CANARY');}});
  assert.throws(()=>buildCliReport('trace',a),/INVALID_REPORT_FINDINGS/);
  assert.equal(touched,0);
 }
 const b=report();Object.defineProperty(b.findings[0],'rule',{value:'DENIED_ACTION_HAD_EFFECT',enumerable:false});
 assert.throws(()=>buildCliReport('trace',b),/INVALID_REPORT_FINDINGS/);
 const c=report();Object.setPrototypeOf(c.findings[0],{rule:'DENIED_ACTION_HAD_EFFECT'});
 assert.throws(()=>buildCliReport('trace',c),/INVALID_REPORT_FINDINGS/);
});
test('M6-S/T: ordinary native reports retain public fields and guidance',()=>{
 const r=buildCliReport('trace',report());
 assert.equal(r.status,'FAIL');
 assert.equal(r.summary.failureCount,1);
 assert.deepEqual(r.summary.ruleCodes,['DENIED_ACTION_HAD_EFFECT']);
 assert.deepEqual(r.guidance.map(g=>g.code),['DENIED_ACTION_HAD_EFFECT']);
 assert.deepEqual(r.findings,report().findings);
 assert.equal(buildCliReport('trace',{status:'PASS',failures:[]}).status,'PASS');
});
