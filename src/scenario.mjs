import { decide, validateScenario } from './policy.mjs';

/** Executes only tiny in-memory simulated actions, never a real MCP tool. */
export function runScenario(raw) {
  const scenario = validateScenario(raw);
  const usedNonces = new Set();
  let notes = 0, reads = 0, writes = 0, allowed = 0, denied = 0;
  const steps = [];
  const mismatches = [];
  scenario.actions.forEach((action, i) => {
    const judgment = decide(scenario.policy, scenario.clock, action, usedNonces);
    const { decision, reason } = judgment;
    let effect = 'NONE';
    let outcome = 'SUCCESS';
    if (decision === 'ALLOW') {
      allowed++;
      if (action.tool === 'read-note') { reads++; effect = 'READ'; }
      if (action.tool === 'write-note') { notes++; writes++; effect = 'WRITE'; }
      if (action.tool === 'delete-note') {
        if (notes > 0) notes--;
        writes++;
        effect = 'WRITE';
      }
      if (effect === 'WRITE') usedNonces.add(action.grant.nonce);
      if (action.fault === 'after-commit') outcome = 'UNKNOWN';
    } else {
      denied++;
    }
    const observed = { step: i + 1, decision, reason, effect, outcome };
    steps.push(observed);
    for (const key of ['decision', 'reason', 'effect', 'outcome']) {
      if (action.expected[key] !== undefined && action.expected[key] !== observed[key]) {
        mismatches.push({ step: i + 1, field: key, rule: 'EXPECTATION_MISMATCH' });
      }
    }
  });
  const actualFinal = { allowed, denied, reads, writes, notes };
  if (scenario.expectedFinal) {
    for (const [field, expected] of Object.entries(scenario.expectedFinal)) {
      if (actualFinal[field] !== expected)
        mismatches.push({ step: 0, field, rule: 'FINAL_STATE_MISMATCH' });
    }
  }
  return {
    status: mismatches.length === 0 ? 'PASS' : 'FAIL',
    scenario: scenario.id,
    checks: steps.length,
    actualFinal,
    mismatches,
    steps,
  };
}
