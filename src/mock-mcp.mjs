import { decide, validateScenario } from './policy.mjs';

/**
 * In-memory, MCP-shaped tools/call double. This is NOT an MCP SDK/transport,
 * credential validator, production tool host or network server.
 * Faults are intentionally synthetic to prove the independent observer fails.
 */
const DEFECTS = new Set([
  'none', 'execute-denied-write', 'drop-authorized-write',
  'false-success-on-denial', 'echo-synthetic-canary'
]);
export const SYNTHETIC_CANARY = 'SYNTHETIC_PRIVATE_CANARY_DO_NOT_ECHO';
const response = (isError, code) => ({
  isError,
  content: [{ type: 'text', text: code }],
});
export function createMockMcpAdapter({ policy, clock, defect = 'none' }) {
  // Use a public synthetic scenario validation path; no other host privileges.
  validateScenario({ version: 1, id: 'mock-adapter', clock, policy,
    actions: [{tool:'read-note',owner:policy.owner,resource:policy.resource,origin:'owner',
      grant:{owner:policy.owner,resource:policy.resource,scopes:[],generation:policy.generation,
        notBefore:0,expiresAt:clock+1,nonce:'validation-only'},expected:{decision:'ALLOW'}}] });
  if (!DEFECTS.has(defect)) throw new TypeError('INVALID_MOCK_DEFECT');
  let notes = 0, reads = 0, writes = 0, calls = 0;
  const usedNonces = new Set();
  const snapshot = () => Object.freeze({ notes, reads, writes, calls });
  async function callTool(request) {
    if (!request || request.method !== 'tools/call' || typeof request.params !== 'object' ||
        request.params === null || Array.isArray(request.params) ||
        typeof request.params.name !== 'string' ||
        typeof request.params.arguments !== 'object' || request.params.arguments === null ||
        Array.isArray(request.params.arguments)) {
      throw new TypeError('INVALID_MOCK_REQUEST');
    }
    calls++;
    const action = { ...request.params.arguments, tool: request.params.name };
    const judgment = decide(policy, clock, action, usedNonces);
    if (judgment.decision === 'DENY') {
      if (defect === 'execute-denied-write' && action.tool === 'write-note') {
        writes++;
        notes++;
        usedNonces.add(action.grant.nonce);
      }
      if (defect === 'false-success-on-denial') return response(false, 'SYNTHETIC_OK');
      if (defect === 'echo-synthetic-canary') return response(true, SYNTHETIC_CANARY);
      return response(true, 'SYNTHETIC_DENIED');
    }
    if (action.tool === 'read-note') reads++;
    if (action.tool === 'write-note' && defect !== 'drop-authorized-write') {
      writes++;
      notes++;
      usedNonces.add(action.grant.nonce);
    }
    if (action.tool === 'delete-note') {
      writes++;
      notes = Math.max(0, notes - 1);
      usedNonces.add(action.grant.nonce);
    }
    if (defect === 'echo-synthetic-canary') return response(false, SYNTHETIC_CANARY);
    if (action.fault === 'after-commit') return response(true, 'SYNTHETIC_COMMIT_OUTCOME_UNKNOWN');
    return response(false, 'SYNTHETIC_OK');
  }
  return Object.freeze({ callTool, snapshot });
}
