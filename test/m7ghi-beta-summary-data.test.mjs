/** M7-G/H/I: symbolic beta summary is strict about admitted evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {BETA_CASES,betaSummary,runBeta} from '../examples/beta-acceptance-check.mjs';
const pass=()=>BETA_CASES.map(x=>({id:x.id,matched:true,rule:'NONE'}));
const fail=x=>assert.throws(()=>betaSummary(x),/BETA_INVALID_SUMMARY_INPUT/);
test('M7-G: matched and symbolic failure codes cannot contradict each other',()=>{
 const a=pass();a[0].rule='BETA_PROCESS_FAILURE';fail(a);
 const b=pass();b[1].matched=false;fail(b);
 const c=pass();c[1].matched=false;c[1].rule='BETA_EXPECTATION_MISMATCH';
 const report=betaSummary(c);
 assert.equal(report.status,'FAIL');assert.equal(report.failed,1);
 assert.equal(report.exitCode,1);
});
test('M7-H: sparse, extra-key or accessor array slots cannot bypass controls',()=>{
 const a=pass();delete a[2];fail(a);
 const b=pass();b.extra=true;fail(b);
 const c=pass();let count=0;
 Object.defineProperty(c,'0',{enumerable:true,get(){count++;throw Error('PRIVATE_CANARY');}});
 fail(c);assert.equal(count,0);
});
test('M7-I: per-case inheritance, hidden fields and unexpected properties fail',()=>{
 const a=pass();Object.setPrototypeOf(a[1],{unknown:'PRIVATE_CANARY'});fail(a);
 const b=pass();Object.defineProperty(b[1],'rule',{value:'NONE',enumerable:false});fail(b);
 const c=pass();c[0].private='PRIVATE_CANARY';fail(c);
 const d=pass();d[0][Symbol('private')]='PRIVATE_CANARY';fail(d);
});
test('M7-I: per-case getters rejected without execution or canary disclosure',()=>{
 const a=pass();let count=0;
 Object.defineProperty(a[4],'matched',{enumerable:true,get(){count++;throw Error('PRIVATE_CANARY');}});
 fail(a);assert.equal(count,0);
 const b=pass();b[2].rule='FICTIONAL_PRIVATE_SECRET';fail(b);
});
test('M7-G/H/I: five matched fictional cases preserve fixed JSON contract',()=>{
 const r=betaSummary(pass());
 assert.equal(r.betaSchemaVersion,1);
 assert.equal(r.status,'PASS');assert.equal(r.total,5);
 assert.equal(r.passed,5);assert.equal(r.failed,0);assert.equal(r.exitCode,0);
 assert.deepEqual(r.cases.map(x=>x.id),BETA_CASES.map(x=>x.id));
 const actual=runBeta([]);
 assert.equal(actual.status,'PASS');
 assert.equal(actual.total,5);
});
