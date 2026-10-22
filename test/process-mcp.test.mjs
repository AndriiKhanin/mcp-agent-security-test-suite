import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runProcessMcpScenario,createProcessMcpDriver} from '../src/process-mcp-harness.mjs';
import {createEffectWitness} from '../src/effect-witness.mjs';

const denial=JSON.parse(readFileSync(new URL('../fixtures/scenario-denial.json',import.meta.url),'utf8'));
const recovery=JSON.parse(readFileSync(new URL('../fixtures/scenario-recovery.json',import.meta.url),'utf8'));
const ok=structuredClone(denial.actions[9]);
const wrong={...structuredClone(ok),owner:'synthetic-other-owner',expected:{decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'}};
const mk=actions=>({version:1,id:'subprocess-security-probe',clock:denial.clock,
  policy:structuredClone(denial.policy),actions});
const has=(r,code)=>r.failures.some(x=>x.rule===code);
const run=(actions,opts)=>runProcessMcpScenario(mk(actions),opts);

test('process: access-boundary fixture passes over fixed child IPC',async()=>{
  const r=await runProcessMcpScenario(denial);
  assert.equal(r.status,'PASS',JSON.stringify(r.failures));
  assert.equal(r.transport,'FIXED_LOCAL_CHILD_PROCESS_IPC');
  assert.equal(r.observerSource,'PARENT_OWNED_SYNTHETIC_LEDGER');
  assert.deepEqual(r.observedFinal,{notes:1,reads:1,writes:1,calls:11});
});
test('process: recovery fixture passes with UNKNOWN postcommit result',async()=>{
  const r=await runProcessMcpScenario(recovery);
  assert.equal(r.status,'PASS',JSON.stringify(r.failures));
  assert.equal(r.observedFinal.calls,6);
  assert.equal(r.steps[3].toolResultError,true);
});
test('process: cross-owner no effect even with child execution',async()=>{
  const r=await run([wrong]);
  assert.equal(r.status,'PASS');
  assert.deepEqual(r.observedFinal,{notes:0,reads:0,writes:0,calls:1});
});
test('process: child-caused mutation on denial is detected by parent',async()=>{
  const r=await run([wrong],{defect:'execute-denied-write'});
  assert.equal(r.status,'FAIL');
  assert.ok(has(r,'DENIED_TOOL_SIDE_EFFECT'));
  assert.equal(r.observedFinal.notes,1);
});
test('process: dropped authorized commit detected',async()=>{
  const r=await run([ok],{defect:'drop-authorized-write'});
  assert.equal(r.status,'FAIL');
  assert.ok(has(r,'ALLOWED_EFFECT_MISMATCH'));
});
test('process: false success on policy denial detected',async()=>{
  const r=await run([wrong],{defect:'false-success-on-denial'});
  assert.equal(r.status,'FAIL');
  assert.ok(has(r,'DENIAL_REPORTED_AS_SUCCESS'));
});
test('process: returning private synthetic canary detected without exposure',async()=>{
  const r=await run([ok],{defect:'echo-synthetic-canary'});
  assert.equal(r.status,'FAIL');
  assert.ok(has(r,'SYNTHETIC_CANARY_LEAK'));
  assert.equal(JSON.stringify(r).includes('SYNTHETIC_PRIVATE_CANARY_DO_NOT_ECHO'),false);
});
test('process: forged worker snapshot cannot change parent evidence',async()=>{
  const r=await run([ok],{defect:'forge-snapshot'});
  assert.equal(r.status,'PASS',JSON.stringify(r.failures));
  assert.deepEqual(r.observedFinal,{notes:1,writes:1,reads:0,calls:1});
});
test('process: crash before commit returns FAIL without false effects',async()=>{
  const r=await run([ok],{defect:'crash-before-commit'});
  assert.equal(r.status,'FAIL');
  assert.ok(has(r,'DRIVER_THROW'));
  assert.equal(r.observedFinal.notes,0);
  assert.equal(r.observedFinal.calls,1);
});
test('process: crash after commit returns FAIL with witnessed state change',async()=>{
  const r=await run([ok],{defect:'crash-after-commit'});
  assert.equal(r.status,'FAIL');
  assert.ok(has(r,'DRIVER_THROW'));
  assert.equal(r.observedFinal.notes,1);
  assert.equal(r.observedFinal.calls,1);
});
test('process: invalid fault configuration never starts a subprocess',async()=>{
  await assert.rejects(run([ok],{defect:'arbitrary-executable'}), /INVALID_PROCESS_DEFECT/);
});
test('process: one driver cannot be used after close',async()=>{
  const witness=createEffectWitness();
  const driver=createProcessMcpDriver({policy:denial.policy,clock:denial.clock,effects:witness.effects});
  await driver.close();
  await assert.rejects(driver.callTool({}),/WORKER_NOT_AVAILABLE/);
});
test('process: CLI child process returns PASS for synthetic fixture',()=>{
  const r=spawnSync(process.execPath,['src/cli.mjs','process','fixtures/scenario-denial.json'],
    {cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:15000});
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/PARENT_OWNED_SYNTHETIC_LEDGER/);
});
test('process: CLI unknown file returns code 2 without exposing path',()=>{
  const r=spawnSync(process.execPath,['src/cli.mjs','process','fixtures/nonexistent-secret.json'],
    {cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:15000});
  assert.equal(r.status,2);
  assert.equal(r.stderr.includes('nonexistent-secret'),false);
});
test('process: separate runs have fresh child and fresh parent ledger',async()=>{
  const a=await run([ok]);const b=await run([ok]);
  assert.equal(a.status,'PASS');assert.equal(b.status,'PASS');
  assert.equal(a.observedFinal.notes,1);assert.equal(b.observedFinal.notes,1);
});
