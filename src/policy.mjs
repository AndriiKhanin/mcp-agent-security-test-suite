/**
 * Offline reference authorization policy for a simulated MCP-like tool boundary.
 * This is NOT an MCP protocol implementation or live authorization checker.
 */
const TOOL_SCOPES = Object.freeze({
  'read-note': 'note:read',
  'write-note': 'note:write',
  'delete-note': 'note:delete',
});
const MUTATING = new Set(['write-note', 'delete-note']);
const SCENARIO_KEYS = new Set(['version', 'id', 'clock', 'policy', 'actions', 'expectedFinal']);
const POLICY_KEYS = new Set(['owner', 'resource', 'scopes', 'generation']);
const ACTION_KEYS = new Set(['tool', 'owner', 'resource', 'origin', 'grant', 'approved', 'fault', 'expected']);
const GRANT_KEYS = new Set(['owner', 'resource', 'scopes', 'generation', 'notBefore', 'expiresAt', 'nonce']);
const EXPECT_KEYS = new Set(['decision', 'reason', 'effect', 'outcome']);
const FINAL_KEYS = new Set(['allowed', 'denied', 'reads', 'writes', 'notes']);
const NAME = /^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,99}$/;
const RUNTIME_MAX_ACTIONS = 500;

function error(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}
/**
 * Direct JS APIs must not use inherited fields or invoke accessor getters
 * while validating fictional permission data. CLI JSON is already plain, but
 * this closes an API-level trust gap. This is not an adversarial Proxy sandbox.
 */
function object(value, allowed) {
  if(value===null || typeof value!=='object' || Array.isArray(value) ||
     Object.getPrototypeOf(value)!==Object.prototype) return false;
  const descriptors=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).every(key=>
    typeof key==='string' && allowed.has(key) &&
    Object.hasOwn(descriptors[key],'value'));
}
/** Reject arrays with holes, symbols, extra keys, getters or prototypes. */
function denseDataArray(value,max,min=0) {
  if(!Array.isArray(value) || Object.getPrototypeOf(value)!==Array.prototype ||
     value.length<min || value.length>max) return false;
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(descriptors).length!==value.length+1) return false;
  for(let i=0;i<value.length;i++) {
    const slot=descriptors[String(i)];
    if(!slot || !Object.hasOwn(slot,'value')) return false;
  }
  return true;
}
function label(value) {
  return typeof value === 'string' && NAME.test(value);
}
function scopeList(value) {
  return denseDataArray(value,20) && value.every(label) &&
    new Set(value).size === value.length;
}
function integer(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function validateGrant(value) {
  return object(value, GRANT_KEYS) && label(value.owner) && label(value.resource) &&
    scopeList(value.scopes) && integer(value.generation) &&
    integer(value.notBefore) && integer(value.expiresAt) && label(value.nonce);
}
export function validateScenario(s) {
  if (!object(s, SCENARIO_KEYS) || s.version !== 1 || !label(s.id) || !integer(s.clock))
    throw error('INVALID_SCENARIO');
  if (!object(s.policy, POLICY_KEYS) || !label(s.policy.owner) ||
      !label(s.policy.resource) || !scopeList(s.policy.scopes) ||
      !integer(s.policy.generation)) throw error('INVALID_POLICY');
  if (!denseDataArray(s.actions,RUNTIME_MAX_ACTIONS,1))
    throw error('INVALID_ACTION_COUNT');
  for (const step of s.actions) {
    if (!object(step, ACTION_KEYS) || !label(step.tool) || !label(step.owner) ||
        !label(step.resource) || !['owner', 'untrusted'].includes(step.origin) ||
        !validateGrant(step.grant) ||
        (step.approved !== undefined && typeof step.approved !== 'boolean') ||
        (step.fault !== undefined && !['before-commit', 'after-commit'].includes(step.fault)) ||
        !object(step.expected, EXPECT_KEYS) ||
        !['ALLOW', 'DENY'].includes(step.expected.decision) ||
        (step.expected.reason !== undefined && !label(step.expected.reason)) ||
        (step.expected.effect !== undefined && !['NONE','READ','WRITE'].includes(step.expected.effect)) ||
        (step.expected.outcome !== undefined && !['SUCCESS','UNKNOWN'].includes(step.expected.outcome))) {
      throw error('INVALID_ACTION');
    }
  }
  if (s.expectedFinal !== undefined &&
      (!object(s.expectedFinal, FINAL_KEYS) ||
       !Object.values(s.expectedFinal).every(integer))) throw error('INVALID_EXPECTED_FINAL');
  return s;
}
/** pure, ordered policy evaluation. State must be a private in-memory Set of prior committed nonces */
export function decide(policy, now, action, usedNonces) {
  if (!Object.hasOwn(TOOL_SCOPES, action.tool)) return { decision: 'DENY', reason: 'UNKNOWN_TOOL' };
  if (action.origin !== 'owner') return { decision: 'DENY', reason: 'UNTRUSTED_ORIGIN' };
  if (action.owner !== policy.owner || action.grant.owner !== policy.owner)
    return { decision: 'DENY', reason: 'OWNER_MISMATCH' };
  if (action.resource !== policy.resource || action.grant.resource !== policy.resource)
    return { decision: 'DENY', reason: 'AUDIENCE_MISMATCH' };
  if (action.grant.generation !== policy.generation)
    return { decision: 'DENY', reason: 'STALE_GENERATION' };
  if (now < action.grant.notBefore)
    return { decision: 'DENY', reason: 'NOT_YET_VALID' };
  if (now >= action.grant.expiresAt)
    return { decision: 'DENY', reason: 'EXPIRED_GRANT' };
  const required = TOOL_SCOPES[action.tool];
  if (!policy.scopes.includes(required) || !action.grant.scopes.includes(required))
    return { decision: 'DENY', reason: 'INSUFFICIENT_SCOPE' };
  if (action.tool === 'delete-note' && action.approved !== true)
    return { decision: 'DENY', reason: 'APPROVAL_REQUIRED' };
  if (MUTATING.has(action.tool) && usedNonces.has(action.grant.nonce))
    return { decision: 'DENY', reason: 'REPLAYED_NONCE' };
  if (action.fault === 'before-commit')
    return { decision: 'DENY', reason: 'SIMULATED_PRECOMMIT_FAILURE' };
  return { decision: 'ALLOW', reason: 'AUTHORIZED' };
}
export const simulatedTools = Object.freeze(Object.keys(TOOL_SCOPES));
