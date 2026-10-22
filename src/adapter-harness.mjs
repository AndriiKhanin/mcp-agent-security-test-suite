import { decide, validateScenario } from './policy.mjs';
import { createMockMcpAdapter, SYNTHETIC_CANARY } from './mock-mcp.mjs';

const MAX_FINDINGS = 200;
const WRITE_TOOLS = new Set(['write-note','delete-note']);
const OBSERVABLES = ['notes','reads','writes','calls'];

/**
 * Compare policy oracle to observable mock-adapter side effects, even when the
 * adapter responds with an error or claims success. No file/network effects.
 * A caller may inject a test double via adapterFactory; CLI never accepts one.
 */
export async function runMockMcpScenario(raw, { defect = 'none', adapterFactory } = {}) {
  const s = validateScenario(raw);
  const adapter = adapterFactory ? adapterFactory({ policy:s.policy, clock:s.clock }) :
    createMockMcpAdapter({ policy:s.policy, clock:s.clock, defect });
  if (!adapter || typeof adapter.callTool !== 'function' || typeof adapter.snapshot !== 'function') {
    throw new TypeError('INVALID_MOCK_ADAPTER');
  }
  const oracleNonces = new Set();
  const failures = [];
  let failureCount = 0;
  const flag = (step, rule) => {
    ++failureCount;
    if (failures.length < MAX_FINDINGS) failures.push({ step, rule });
  };
  const steps = [];
  for (const [index, action] of s.actions.entries()) {
    const step = index + 1;
    const expected = decide(s.policy, s.clock, action, oracleNonces);
    const before = adapter.snapshot();
    let result;
    let threw = false;
    try {
      const { tool, expected: _expectation, ...argumentsValue } = action;
      result = await adapter.callTool({ method:'tools/call', params:{ name:tool, arguments:argumentsValue } });
    } catch {
      threw = true;
      flag(step, 'ADAPTER_THROW');
    }
    const after = adapter.snapshot();
    const safeSnapshot = x => x && typeof x === 'object' && OBSERVABLES.every(
      key => Number.isSafeInteger(x[key]) && x[key] >= 0);
    if (!safeSnapshot(before) || !safeSnapshot(after)) {
      flag(step, 'INVALID_STATE_OBSERVER');
      steps.push({ step, expectedDecision:expected.decision, observedEffect:'UNKNOWN' });
      continue;
    }
    const delta = {};
    for (const key of OBSERVABLES) {
      delta[key] = after[key] - before[key];
      if (key !== 'notes' && delta[key] < 0) flag(step, 'NON_MONOTONIC_COUNTER');
    }
    if (delta.calls !== 1) flag(step, 'INVALID_TOOL_CALL_COUNT');
    const effect = delta.writes !== 0 || delta.notes !== 0 ? 'WRITE' : delta.reads !== 0 ? 'READ' : 'NONE';
    const expectedEffect = expected.decision === 'DENY' ? 'NONE' :
      action.tool === 'read-note' ? 'READ' : WRITE_TOOLS.has(action.tool) ? 'WRITE' : 'NONE';
    if (expected.decision === 'DENY' && effect !== 'NONE') flag(step, 'DENIED_TOOL_SIDE_EFFECT');
    if (expected.decision === 'ALLOW' && effect !== expectedEffect) flag(step, 'ALLOWED_EFFECT_MISMATCH');
    if (delta.writes > 1 || delta.reads > 1 || delta.notes > 1 || delta.notes < -1) flag(step, 'EFFECT_COUNT_OUT_OF_BOUNDS');
    if (delta.reads !== 0 && (delta.writes !== 0 || delta.notes !== 0)) flag(step, 'MIXED_SIDE_EFFECTS');
    if (action.tool !== 'read-note' && delta.reads !== 0) flag(step, 'UNEXPECTED_READ_SIDE_EFFECT');
    if (action.tool !== 'delete-note' && delta.notes < 0) flag(step, 'UNEXPECTED_DELETION');
    if (action.tool === 'write-note' && delta.writes > 0 && delta.notes !== delta.writes)
      flag(step, 'WRITE_STATE_COUNTER_MISMATCH');
    if (!threw) {
      const validResult = result && typeof result === 'object' && typeof result.isError === 'boolean' &&
        Array.isArray(result.content) && result.content.length === 1 &&
        result.content[0]?.type === 'text' && typeof result.content[0].text === 'string' &&
        result.content[0].text.length < 256;
      if (!validResult) flag(step, 'INVALID_TOOL_RESULT');
      else {
        if (result.content[0].text.includes(SYNTHETIC_CANARY)) flag(step, 'SYNTHETIC_CANARY_LEAK');
        if (expected.decision === 'DENY' && result.isError !== true) flag(step, 'DENIAL_REPORTED_AS_SUCCESS');
        if (expected.decision === 'ALLOW' && action.fault !== 'after-commit' && result.isError !== false)
          flag(step, 'AUTHORIZATION_REPORTED_AS_ERROR');
      }
    }
    if (WRITE_TOOLS.has(action.tool) && effect === 'WRITE') oracleNonces.add(action.grant.nonce);
    steps.push({ step, expectedDecision:expected.decision, observedEffect:effect,
      toolResultError:typeof result?.isError === 'boolean' ? result.isError : null });
    // Compare fixture expectations to the policy oracle and actual observables.
    if (action.expected.decision !== expected.decision) flag(step, 'SCENARIO_POLICY_MISMATCH');
    if (action.expected.reason !== undefined && action.expected.reason !== expected.reason)
      flag(step, 'SCENARIO_REASON_MISMATCH');
    if (action.expected.effect !== undefined && action.expected.effect !== effect)
      flag(step, 'SCENARIO_EFFECT_MISMATCH');
    if (action.expected.outcome !== undefined &&
        action.expected.outcome !== (expected.decision === 'ALLOW' && action.fault === 'after-commit' ? 'UNKNOWN' : 'SUCCESS'))
      flag(step, 'SCENARIO_OUTCOME_MISMATCH');
  }
  const final = adapter.snapshot();
  if (s.expectedFinal) {
    for (const key of ['reads','writes','notes']) {
      if (s.expectedFinal[key] !== undefined && final[key] !== s.expectedFinal[key]) flag(0,'FINAL_STATE_MISMATCH');
    }
    // allowed/denied are compared to expected reference actions, not adapter self-report.
    const accepted = steps.filter(step=>step.expectedDecision==='ALLOW').length;
    if (s.expectedFinal.allowed !== undefined && accepted !== s.expectedFinal.allowed) flag(0,'FINAL_DECISION_MISMATCH');
    if (s.expectedFinal.denied !== undefined && s.actions.length - accepted !== s.expectedFinal.denied) flag(0,'FINAL_DECISION_MISMATCH');
  }
  return {
    status: failureCount === 0 ? 'PASS' : 'FAIL',
    scenario:s.id, checks:s.actions.length, observedFinal:final,
    failureCount, findingsTruncated:failureCount>failures.length, failures, steps,
  };
}
