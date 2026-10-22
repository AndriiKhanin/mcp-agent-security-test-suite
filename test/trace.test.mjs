import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJsonl,auditRecords} from '../src/trace.mjs';
const good={decision:'ALLOW',effect:'WRITE',ownerAuthorized:true,scopeAuthorized:true,leaseFresh:true,secretLogged:false};
function names(record) {return auditRecords([record]).failures.map(x=>x.rule)}
test('good trace passes',()=>assert.equal(auditRecords([good]).status,'PASS'));
test('empty trace collection not counted as pass',()=>assert.equal(auditRecords([]).status,'FAIL'));
test('denied action with effect is flagged',()=>assert.ok(names({...good,decision:'DENY'}).includes('DENIED_ACTION_HAD_EFFECT')));
test('missing authorization flagged',()=>assert.ok(names({...good,ownerAuthorized:false}).includes('EFFECT_WITHOUT_AUTHORIZATION')));
test('stale freshness flagged',()=>assert.ok(names({...good,leaseFresh:false}).includes('EFFECT_WITHOUT_FRESH_LEASE')));
test('secret flag reported',()=>assert.ok(names({...good,secretLogged:true}).includes('FLAGGED_SECRET_IN_AUDIT_LOG')));
test('incomplete logging flag flagged',()=>assert.ok(names({...good,secretLogged:undefined}).includes('MISSING_LOG_SAFETY_EVIDENCE')));
test('unexpected field excluded from result',()=>{const r=auditRecords([{...good,hidden:'NEVER_OUTPUT_THIS'}]);assert.equal(JSON.stringify(r).includes('NEVER_OUTPUT_THIS'),false)});
test('wrong primitive types flagged',()=>assert.ok(names({...good,secretLogged:'false'}).includes('INVALID_FIELDS')));
test('JSONL parse and invalid JSON bounded',()=>{assert.equal(parseJsonl(JSON.stringify(good)).length,1);assert.throws(()=>parseJsonl('{not json'),/INVALID_JSON_LINE/)});
test('failure report max 200',()=>{const r=auditRecords(Array(220).fill({decision:'DENY',effect:'WRITE',secretLogged:false})); assert.equal(r.failureCount,220);assert.equal(r.failures.length,200);assert.equal(r.findingsTruncated,true)});
