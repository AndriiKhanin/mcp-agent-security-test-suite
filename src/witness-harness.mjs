import { decide, validateScenario } from './policy.mjs';
import { createEffectWitness } from './effect-witness.mjs';
import { SYNTHETIC_CANARY } from './mock-mcp.mjs';

const MAX_FINDINGS = 200;
const OBSERVABLES = ['notes', 'reads', 'writes', 'calls'];
const WRITE_TOOLS = new Set(['write-note', 'delete-note']);
const DEFECTS = new Set([
  'none', 'execute-denied-write', 'drop-authorized-write',
  'false-success-on-denial', 'echo-synthetic-canary', 'forge-snapshot',
]);
const response = (isError, code) => ({ isError, content:[{type:'text', text:code}] });

/** Synthetic MCP-shaped driver: receives only a narrow effect port, not snapshots. */
export function createWitnessDriver({policy, clock, effects, defect='none'}) {
  if (!DEFECTS.has(defect)) throw new TypeError('INVALID_SYNTHETIC_DEFECT');
  if (!effects || ['markCall','writeNote','deleteNote','readNote'].some(k=>typeof effects[k]!=='function'))
    throw new TypeError('INVALID_EFFECT_PORT');
  const usedNonces = new Set();
  const driver = {
    async callTool(request) {
      if (!request || request.method !== 'tools/call' || !request.params ||
          typeof request.params !== 'object' || Array.isArray(request.params) ||
          typeof request.params.name !== 'string' || !request.params.arguments ||
          typeof request.params.arguments !== 'object' || Array.isArray(request.params.arguments))
        throw new TypeError('INVALID_MOCK_REQUEST');
      effects.markCall();
      const action = { ...request.params.arguments, tool:request.params.name };
      const d = decide(policy, clock, action, usedNonces);
      if (d.decision === 'DENY') {
        if (defect === 'execute-denied-write' && action.tool === 'write-note') {
          effects.writeNote();
          if (typeof action.grant?.nonce === 'string') usedNonces.add(action.grant.nonce);
        }
        if (defect === 'false-success-on-denial') return response(false, 'SYNTHETIC_OK');
        if (defect === 'echo-synthetic-canary') return response(true, SYNTHETIC_CANARY);
        return response(true, 'SYNTHETIC_DENIED');
      }
      if (action.tool === 'read-note') effects.readNote();
      if (action.tool === 'write-note' && defect !== 'drop-authorized-write') {
        effects.writeNote(); usedNonces.add(action.grant.nonce);
      }
      if (action.tool === 'delete-note') {
        effects.deleteNote(); usedNonces.add(action.grant.nonce);
      }
      if (defect === 'echo-synthetic-canary') return response(false, SYNTHETIC_CANARY);
      if (action.fault === 'after-commit') return response(true, 'SYNTHETIC_COMMIT_OUTCOME_UNKNOWN');
      return response(false, 'SYNTHETIC_OK');
    },
  };
  // This can be a blatant fabricated value: the harness MUST ignore it.
  if (defect === 'forge-snapshot') driver.snapshot = () => ({notes:999,reads:999,writes:999,calls:999});
  return Object.freeze(driver);
}

/**
 * Compare reference policy with effects witnessed by the test-owned recorder.
 * Adapter-provided snapshots are ignored, including a forged snapshot method.
 * This does not independently measure real machine or network side effects.
 */
export async function runWitnessedScenario(raw, {defect='none', driverFactory}={}) {
  const s = validateScenario(raw);
  const witness = createEffectWitness();
  const factoryArgs = {policy:s.policy, clock:s.clock, effects:witness.effects, defect};
  const driver = driverFactory ? driverFactory(factoryArgs) : createWitnessDriver(factoryArgs);
  if (!driver || typeof driver.callTool !== 'function') throw new TypeError('INVALID_WITNESSED_DRIVER');
  const oracleNonces = new Set();
  const failures = []; let failureCount=0;
  const flag = (step,rule) => {failureCount++;if(failures.length<MAX_FINDINGS) failures.push({step,rule});};
  const steps=[];
  for (const [index,action] of s.actions.entries()) {
    const step=index+1;
    const expected = decide(s.policy,s.clock,action,oracleNonces);
    const before=witness.snapshot();
    let result;let threw=false;
    try {
      const {tool,expected:_expected,...argumentsValue}=action;
      result=await driver.callTool({method:'tools/call',params:{name:tool,arguments:argumentsValue}});
    } catch {threw=true;flag(step,'DRIVER_THROW');}
    const after=witness.snapshot();
    const delta=Object.fromEntries(OBSERVABLES.map(k=>[k,after[k]-before[k]]));
    if (delta.calls!==1) flag(step,'INVALID_TOOL_CALL_COUNT');
    if (delta.writes<0 || delta.reads<0 || delta.calls<0) flag(step,'NON_MONOTONIC_COUNTER');
    if (delta.writes>1 || delta.reads>1 || delta.notes>1 || delta.notes< -1)
      flag(step,'EFFECT_COUNT_OUT_OF_BOUNDS');
    if (delta.reads!==0 && (delta.writes!==0 || delta.notes!==0)) flag(step,'MIXED_SIDE_EFFECTS');
    if (delta.writes===0 && delta.notes!==0) flag(step,'UNACCOUNTED_STATE_MUTATION');
    const effect=delta.writes!==0 || delta.notes!==0 ? 'WRITE' : delta.reads!==0 ? 'READ':'NONE';
    const expectedEffect=expected.decision==='DENY'?'NONE':
      action.tool==='read-note'?'READ':WRITE_TOOLS.has(action.tool)?'WRITE':'NONE';
    if (expected.decision==='DENY' && effect!=='NONE') flag(step,'DENIED_TOOL_SIDE_EFFECT');
    if (expected.decision==='ALLOW' && effect!==expectedEffect) flag(step,'ALLOWED_EFFECT_MISMATCH');
    if (action.tool!=='read-note' && delta.reads!==0) flag(step,'UNEXPECTED_READ_SIDE_EFFECT');
    if (action.tool!=='delete-note' && delta.notes<0) flag(step,'UNEXPECTED_DELETION');
    if (action.tool==='write-note' && delta.writes>0 && delta.notes!==delta.writes)
      flag(step,'WRITE_STATE_COUNTER_MISMATCH');
    if (!threw) {
      const validResult=result && typeof result==='object' && typeof result.isError==='boolean' &&
        Array.isArray(result.content) && result.content.length===1 &&
        result.content[0]?.type==='text' && typeof result.content[0].text==='string' &&
        result.content[0].text.length<256;
      if (!validResult) flag(step,'INVALID_TOOL_RESULT');
      else {
        if (result.content[0].text.includes(SYNTHETIC_CANARY)) flag(step,'SYNTHETIC_CANARY_LEAK');
        if (expected.decision==='DENY' && result.isError!==true) flag(step,'DENIAL_REPORTED_AS_SUCCESS');
        if (expected.decision==='ALLOW' && action.fault!=='after-commit' && result.isError!==false)
          flag(step,'AUTHORIZATION_REPORTED_AS_ERROR');
      }
    }
    if (WRITE_TOOLS.has(action.tool) && effect==='WRITE') oracleNonces.add(action.grant.nonce);
    if (action.expected.decision!==expected.decision) flag(step,'SCENARIO_POLICY_MISMATCH');
    if (action.expected.reason!==undefined && action.expected.reason!==expected.reason) flag(step,'SCENARIO_REASON_MISMATCH');
    if (action.expected.effect!==undefined && action.expected.effect!==effect) flag(step,'SCENARIO_EFFECT_MISMATCH');
    if (action.expected.outcome!==undefined && action.expected.outcome!==
      (expected.decision==='ALLOW' && action.fault==='after-commit'?'UNKNOWN':'SUCCESS'))
      flag(step,'SCENARIO_OUTCOME_MISMATCH');
    steps.push({step,expectedDecision:expected.decision,observedEffect:effect,
      toolResultError:typeof result?.isError==='boolean'?result.isError:null});
  }
  const final=witness.snapshot();
  if (s.expectedFinal) {
    for (const key of ['notes','reads','writes']) {
      if (s.expectedFinal[key]!==undefined && s.expectedFinal[key]!==final[key]) flag(0,'FINAL_STATE_MISMATCH');
    }
    const accepted=steps.filter(k=>k.expectedDecision==='ALLOW').length;
    if (s.expectedFinal.allowed!==undefined && s.expectedFinal.allowed!==accepted) flag(0,'FINAL_DECISION_MISMATCH');
    if (s.expectedFinal.denied!==undefined && s.expectedFinal.denied!==steps.length-accepted)
      flag(0,'FINAL_DECISION_MISMATCH');
  }
  return {status:failureCount===0?'PASS':'FAIL',scenario:s.id,checks:s.actions.length,
    observedFinal:final,observerSource:'HARNESS_OWNED_SYNTHETIC_LEDGER',failureCount,
    findingsTruncated:failureCount>failures.length,failures,steps};
}
