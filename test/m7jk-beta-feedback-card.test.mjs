/** M7-J/K: only literal fictional evidence may be formatted for a beta volunteer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {BETA_CASES,betaSummary} from '../examples/beta-acceptance-check.mjs';
import {buildBetaFeedbackCard,runBetaFeedbackCard} from '../tools/beta-feedback-card.mjs';
const cases=()=>BETA_CASES.map(x=>({id:x.id,matched:true,rule:'NONE'}));
const good=()=>betaSummary(cases());
const deny=x=>assert.throws(()=>buildBetaFeedbackCard(x),/INVALID_FICTIONAL_BETA_CARD_INPUT/);

test('M7-J: a source-owned five-case PASS produces a bounded volunteer card',()=>{
 const card=buildBetaFeedbackCard(good());
 assert.match(card,/Fixed check matches: 5\/5/);
 assert.match(card,/Runner status: PASS/);
 assert.match(card,/Public Git commit SHA: \[fill manually/);
 assert.ok(BETA_CASES.every(x=>card.includes('- '+x.id+': MATCH')));
 assert.match(card,/not proof of independent origin/);
 assert.match(card,/No real MCP server was assessed/);
 assert.ok(!card.includes('https://'));
});
test('M7-K: expected fictional mismatch stays FAIL and shows only known rule',()=>{
 const outcomes=cases();outcomes[2].matched=false;
 outcomes[2].rule='BETA_EXPECTATION_MISMATCH';
 const card=buildBetaFeedbackCard(betaSummary(outcomes));
 assert.match(card,/Runner status: FAIL/);
 assert.match(card,/Fixed check matches: 4\/5/);
 assert.match(card,/FIXED_DEMO: MISMATCH \(BETA_EXPECTATION_MISMATCH\)/);
});
test('M7-K: forged fields and unknown rule labels cannot be injected',()=>{
 const a=good();a.cases[0].rule='PRIVATE_CANARY';deny(a);
 const b=good();b.cases[0].private='PRIVATE_CANARY';deny(b);
 const c=good();c.private='PRIVATE_CANARY'; // source-owned fields may be additive, but never interpolated
 assert.ok(!buildBetaFeedbackCard(c).includes('PRIVATE_CANARY'));
});
test('M7-K: getter and sparse case slots are refused without invoking code',()=>{
 const a=good();let touched=0;
 Object.defineProperty(a.cases,'0',{enumerable:true,get(){touched++;throw Error('PRIVATE_CANARY');}});
 deny(a);assert.equal(touched,0);
 const b=good();delete b.cases[1];deny(b);
});
test('M7-J/K: executable local workflow runs fixed tests without network targets',()=>{
 const r=spawnSync(process.execPath,['tools/beta-feedback-card.mjs'],{
  cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',
  timeout:30000,maxBuffer:65536
 });
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/Fixed check matches: 5\/5/);
 assert.match(r.stdout,/not proof of independent origin/);
 assert.ok(!r.stdout.includes('127.0.0.1'));
});
test('M7-K: command refuses all arguments without echoing payloads',()=>{
 const r=spawnSync(process.execPath,['tools/beta-feedback-card.mjs','PRIVATE_CANARY'],{
  cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',timeout:5000
 });
 assert.equal(r.status,2);
 assert.equal(r.stdout,'ERROR: BETA_CARD_ARGUMENTS_NOT_ALLOWED\n');
 assert.ok(!(r.stdout+r.stderr).includes('PRIVATE_CANARY'));
 const output=runBetaFeedbackCard(['https://private.example.org']);
 assert.equal(output.exitCode,2);
 assert.ok(!output.text.includes('private.example.org'));
});
