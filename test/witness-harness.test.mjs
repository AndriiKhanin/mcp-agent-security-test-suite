import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createEffectWitness } from '../src/effect-witness.mjs';
import { createWitnessDriver, runWitnessedScenario } from '../src/witness-harness.mjs';
import { SYNTHETIC_CANARY } from '../src/mock-mcp.mjs';

const denial = JSON.parse(readFileSync(new URL('../fixtures/scenario-denial.json',import.meta.url),'utf8'));
const recovery = JSON.parse(readFileSync(new URL('../fixtures/scenario-recovery.json',import.meta.url),'utf8'));
const base = structuredClone(denial.actions[9]);
const wrap = (actions) => ({version:1,id:'independent-witness-probe',clock:denial.clock,
  policy:structuredClone(denial.policy),actions});
const contains = (result,rule) => result.failures.some(f=>f.rule===rule);
const run = (actions,opts) => runWitnessedScenario(wrap(actions),opts);

test('witness: synthetic denial fixture passes with 11 actually witnessed calls',async()=>{
  const r=await runWitnessedScenario(denial);
  assert.equal(r.status,'PASS',JSON.stringify(r.failures));
  assert.deepEqual(r.observedFinal,{notes:1,reads:1,writes:1,calls:11});
  assert.equal(r.observerSource,'HARNESS_OWNED_SYNTHETIC_LEDGER');
});
test('witness: recovery, uncertain result and replay scenario passes',async()=>{
  const r=await runWitnessedScenario(recovery);
  assert.equal(r.status,'PASS',JSON.stringify(r.failures));
  assert.equal(r.observedFinal.notes,1);
  assert.equal(r.observedFinal.calls,6);
});
test('witness: driver never receives observation getter',()=>{
  const witness=createEffectWitness();
  const driver=createWitnessDriver({policy:denial.policy,clock:denial.clock,effects:witness.effects});
  assert.equal(typeof driver.snapshot,'undefined');
  assert.equal(Object.hasOwn(witness.effects,'snapshot'),false);
});
test('witness: adapter snapshot fabrication does not affect result',async()=>{
  const r=await run([base],{defect:'forge-snapshot'});
  assert.equal(r.status,'PASS',JSON.stringify(r.failures));
  assert.equal(r.observedFinal.notes,1);
});
test('witness: detects denied mutation even if adapter forges clean snapshot',async()=>{
  const wrongOwner={...base,owner:'other-owner',expected:{decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'}};
  const r=await run([wrongOwner],{driverFactory:({policy,clock,effects})=>{
    const poisoned=createWitnessDriver({policy,clock,effects,defect:'execute-denied-write'});
    return {callTool:(request)=>poisoned.callTool(request),snapshot:()=>({notes:0,reads:0,writes:0,calls:0})};
  }});
  assert.equal(r.status,'FAIL');assert.equal(r.observedFinal.notes,1);
  assert.ok(contains(r,'DENIED_TOOL_SIDE_EFFECT'));
});
test('witness: omission of authorized write fails',async()=>{
  const r=await run([base],{defect:'drop-authorized-write'});
  assert.equal(r.status,'FAIL');assert.ok(contains(r,'ALLOWED_EFFECT_MISMATCH'));
});
test('witness: false-success on denial fails',async()=>{
  const wrongOwner={...base,owner:'other-owner',expected:{decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'}};
  const r=await run([wrongOwner],{defect:'false-success-on-denial'});
  assert.equal(r.status,'FAIL');assert.ok(contains(r,'DENIAL_REPORTED_AS_SUCCESS'));
});
test('witness: synthetic canary returned by adapter is detected and not echoed',async()=>{
  const r=await run([base],{defect:'echo-synthetic-canary'});
  assert.equal(r.status,'FAIL');assert.ok(contains(r,'SYNTHETIC_CANARY_LEAK'));
  assert.equal(JSON.stringify(r).includes(SYNTHETIC_CANARY),false);
});
test('witness: cross-owner denial has no witnessed mutation',async()=>{
  const wrongOwner={...base,owner:'other-owner',expected:{decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'}};
  const r=await run([wrongOwner]);assert.equal(r.status,'PASS');
  assert.equal(r.observedFinal.writes,0);assert.equal(r.observedFinal.calls,1);
});
test('witness: fake snapshot makes no difference without actual effects',async()=>{
  const r=await run([base],{driverFactory:()=>({
    snapshot:()=>({notes:100,reads:0,writes:100,calls:1}),
    callTool:async()=>({isError:false,content:[{type:'text',text:'SYNTHETIC_OK'}]})
  })});
  assert.equal(r.status,'FAIL');assert.ok(contains(r,'INVALID_TOOL_CALL_COUNT'));
  assert.ok(contains(r,'ALLOWED_EFFECT_MISMATCH'));assert.equal(r.observedFinal.writes,0);
});
test('witness: driver throw does not leak private error payload',async()=>{
  const r=await run([base],{driverFactory:()=>({callTool:async()=>{throw Error('PRIVATE_FAKE_PAYLOAD')}})});
  assert.equal(r.status,'FAIL');assert.ok(contains(r,'DRIVER_THROW'));
  assert.equal(JSON.stringify(r).includes('PRIVATE_FAKE_PAYLOAD'),false);
});
test('witness: independent runs do not share counters',async()=>{
  const a=await run([base]),b=await run([base]);
  assert.equal(a.status,'PASS');assert.equal(b.status,'PASS');
  assert.equal(a.observedFinal.calls,1);assert.equal(b.observedFinal.calls,1);
});
test('witness CLI: direct synthetic scenario passes on Node runtime',()=>{
  const r=spawnSync(process.execPath,['src/cli.mjs','witness','fixtures/scenario-denial.json'],
    {cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/HARNESS_OWNED_SYNTHETIC_LEDGER/);
});
test('witness CLI: unknown file fails closed and does not echo path',()=>{
  const r=spawnSync(process.execPath,['src/cli.mjs','witness','fixtures/unknown-secret-sentinel.json'],
    {cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(r.status,2);
  assert.equal(r.stderr.includes('unknown-secret-sentinel'),false);
});
