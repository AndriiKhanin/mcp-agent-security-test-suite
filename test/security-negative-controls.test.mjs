import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runScenario } from '../src/scenario.mjs';
import { runWitnessedScenario } from '../src/witness-harness.mjs';
import { auditModernNegotiation } from '../src/mcp-modern-negotiation.mjs';

// Independent golden expectations: all expected reasons, effects and violation
// codes come from the human-reviewed fixture, not from the implementation.
const corpus = JSON.parse(readFileSync(new URL('../fixtures/security-negative-controls.json', import.meta.url),'utf8'));
const modernSeed = JSON.parse(readFileSync(new URL('../fixtures/mcp-negotiate-safe.json', import.meta.url),'utf8'));
const clone = value => structuredClone(value);
const baseline = () => ({
  version: 1, id: 'fictional-golden-case', clock: 100,
  policy: { owner:'fixture-owner', resource:'mcp://fixture-a',
    scopes:['note:read','note:write','note:delete'], generation:7 },
  actions: [{
    tool:'write-note', owner:'fixture-owner', resource:'mcp://fixture-a',
    origin:'owner',
    grant: { owner:'fixture-owner', resource:'mcp://fixture-a',
      scopes:['note:read','note:write','note:delete'],
      generation:7, notBefore:1, expiresAt:1000, nonce:'fictional-nonce-1' },
    expected: {decision:'ALLOW',reason:'AUTHORIZED',effect:'WRITE'}
  }]
});
const modernBaseline = () => {
  const fixture = clone(modernSeed);
  fixture.steps = fixture.steps.slice(0,2);
  return fixture;
};
function mutate(seed, spec) {
  const altered = clone(seed);
  const chain = spec.path;
  assert.ok(Array.isArray(chain) && chain.length >= 2 && chain.length <= 8, 'bounded mutation path');
  let target = altered;
  for (const key of chain.slice(0,-1)) {
    assert.ok(Object.hasOwn(target,key), 'must mutate an explicitly existing parent');
    target = target[key];
    assert.ok(target !== null && typeof target === 'object');
  }
  // Some intentionally added fields, such as fake tool arguments, need not exist.
  target[chain.at(-1)] = clone(spec.value);
  return altered;
}
const hasRule = (report,rule) => report.findings.some(x=>x.rule===rule);
const hasFailure = (report,rule) => report.failures.some(x=>x.rule===rule);
const expectedEmpty = {allowed:0,denied:1,reads:0,writes:0,notes:0};
const witnessEmpty = {notes:0,reads:0,writes:0,calls:1};

test('M1-03 golden cases are unique, small, fictional and with literal expected outcomes',()=>{
  assert.equal(corpus.format,'mcp-agent-negative-controls-v1');
  assert.equal(corpus.scope,'offline-fictional-only');
  assert.equal(corpus.policyCases.length,13);
  assert.equal(corpus.protocolCases.length,5);
  const ids = [...corpus.policyCases,...corpus.protocolCases].map(c=>c.id);
  assert.equal(new Set(ids).size,18);
  assert.ok(readFileSync(new URL('../fixtures/security-negative-controls.json',import.meta.url)).length<16_384);
  for(const item of corpus.policyCases) {
    assert.deepEqual(item.expected,{decision:'DENY',reason:item.expected.reason,effect:'NONE',writes:0,notes:0});
    assert.match(item.expected.reason,/^[A-Z_]+$/);
  }
  for(const item of corpus.protocolCases) assert.match(item.rule,/^[A-Z_]+$/);
  assert.ok(!JSON.stringify(corpus).includes('PRIVATE_KEY'));
});

for(const item of corpus.policyCases) {
  test('M1-03 access mutation '+item.id+' has an independent deny, no effect and failing expectation trap',async()=>{
    // The same explicit hand-authored authorized baseline is the positive pair.
    const good=runScenario(baseline());
    assert.equal(good.status,'PASS');
    assert.equal(good.steps[0].decision,'ALLOW');
    assert.equal(good.actualFinal.writes,1);

    // A mutation with a literal expected denial is a valid synthetic scenario.
    const rejected=mutate(baseline(),item);
    rejected.actions[0].expected={
      decision:item.expected.decision,reason:item.expected.reason,effect:item.expected.effect
    };
    const observed=runScenario(rejected);
    assert.equal(observed.status,'PASS');
    assert.deepEqual(observed.steps[0],{
      step:1,decision:'DENY',reason:item.expected.reason,effect:'NONE',outcome:'SUCCESS'
    });
    assert.deepEqual(observed.actualFinal,expectedEmpty);
    const witnessed=await runWitnessedScenario(rejected);
    assert.equal(witnessed.status,'PASS',JSON.stringify(witnessed.failures));
    assert.deepEqual(witnessed.observedFinal,witnessEmpty);

    // The oracle must signal FAILURE if a fixture still claims the unsafe
    // action was authorized: a simple PASS on a denial is not enough.
    const trap=mutate(baseline(),item);
    const failing=runScenario(trap);
    assert.equal(failing.status,'FAIL');
    assert.ok(failing.mismatches.some(x=>x.step===1 && x.rule==='EXPECTATION_MISMATCH'));
    assert.deepEqual(failing.actualFinal,expectedEmpty);
  });
}

for(const item of corpus.protocolCases) {
  test('M1-03 negotiation mutation '+item.id+' is detected without payload echo',()=>{
    const good=auditModernNegotiation(modernBaseline());
    assert.equal(good.status,'PASS');
    assert.equal(good.failureCount,0);
    const mutated=mutate(modernBaseline(),item);
    const result=auditModernNegotiation(mutated);
    assert.equal(result.status,'FAIL');
    assert.ok(hasRule(result,item.rule),'golden rule: '+item.rule);
    assert.ok(result.findings.every(x=>Number.isSafeInteger(x.step) && typeof x.rule==='string'));
    assert.ok(!JSON.stringify(result).includes('fictionalMarker'));
    assert.ok(!JSON.stringify(result).includes('altered'));
  });
}

test('M1-03 mutation replay after committed write is denied with exactly one synthetic effect',async()=>{
  const s=baseline();
  const replay=clone(s.actions[0]);
  replay.expected={decision:'DENY',reason:'REPLAYED_NONCE',effect:'NONE'};
  s.actions.push(replay);
  const actual=runScenario(s);
  assert.equal(actual.status,'PASS');
  assert.deepEqual(actual.steps.map(x=>[x.decision,x.reason,x.effect]),
    [['ALLOW','AUTHORIZED','WRITE'],['DENY','REPLAYED_NONCE','NONE']]);
  assert.deepEqual(actual.actualFinal,{allowed:1,denied:1,reads:0,writes:1,notes:1});
  const witnessed=await runWitnessedScenario(s);
  assert.equal(witnessed.status,'PASS',JSON.stringify(witnessed.failures));
  assert.deepEqual(witnessed.observedFinal,{notes:1,reads:0,writes:1,calls:2});
});
test('M1-03 pre-commit failure does not burn a nonce; a later legitimate write succeeds',async()=>{
  const s=baseline();
  s.actions[0].fault='before-commit';
  s.actions[0].expected={decision:'DENY',reason:'SIMULATED_PRECOMMIT_FAILURE',effect:'NONE'};
  const write=clone(s.actions[0]);
  delete write.fault;
  write.expected={decision:'ALLOW',reason:'AUTHORIZED',effect:'WRITE'};
  s.actions.push(write);
  const report=runScenario(s);
  assert.equal(report.status,'PASS');
  assert.deepEqual(report.steps.map(x=>x.reason),['SIMULATED_PRECOMMIT_FAILURE','AUTHORIZED']);
  assert.equal(report.actualFinal.writes,1);
  const witnessed=await runWitnessedScenario(s);
  assert.equal(witnessed.status,'PASS',JSON.stringify(witnessed.failures));
  assert.equal(witnessed.observedFinal.writes,1);
});
test('M1-03 injected illegal denied write is detected by parent-owned witness',async()=>{
  const spec=corpus.policyCases.find(x=>x.id==='wrong-request-owner');
  const s=mutate(baseline(),spec);
  s.actions[0].expected={decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'};
  const r=await runWitnessedScenario(s,{defect:'execute-denied-write'});
  assert.equal(r.status,'FAIL');
  assert.ok(hasFailure(r,'DENIED_TOOL_SIDE_EFFECT'));
  assert.equal(r.observedFinal.writes,1);
  assert.equal(r.observedFinal.notes,1);
});
test('M1-03 injected false-success on denial is not accepted',async()=>{
  const spec=corpus.policyCases.find(x=>x.id==='wrong-grant-resource');
  const s=mutate(baseline(),spec);
  s.actions[0].expected={decision:'DENY',reason:'AUDIENCE_MISMATCH',effect:'NONE'};
  const r=await runWitnessedScenario(s,{defect:'false-success-on-denial'});
  assert.equal(r.status,'FAIL');
  assert.ok(hasFailure(r,'DENIAL_REPORTED_AS_SUCCESS'));
  assert.equal(r.observedFinal.writes,0);
});
test('M1-03 omitted authorized write cannot pass the independent effect witness',async()=>{
  const r=await runWitnessedScenario(baseline(),{defect:'drop-authorized-write'});
  assert.equal(r.status,'FAIL');
  assert.ok(hasFailure(r,'ALLOWED_EFFECT_MISMATCH'));
  assert.equal(r.observedFinal.writes,0);
});
test('M1-03 synthetic canary never appears in returned report even if mock echoes it',async()=>{
  const r=await runWitnessedScenario(baseline(),{defect:'echo-synthetic-canary'});
  assert.equal(r.status,'FAIL');
  assert.ok(hasFailure(r,'SYNTHETIC_CANARY_LEAK'));
  assert.ok(!JSON.stringify(r).includes('SYNTHETIC_PRIVATE_CANARY_DO_NOT_ECHO'));
});
