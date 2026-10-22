/**
 * FIXED, TEST-ONLY child process for synthetic tools/call behavior.
 * NOT a sandbox and NOT a real MCP server. No arbitrary modules or commands.
 * A separate parent process owns the synthetic effect ledger.
 */
import { decide } from './policy.mjs';
import { SYNTHETIC_CANARY } from './mock-mcp.mjs';

const SUPPORTED = new Set([
  'none', 'execute-denied-write', 'drop-authorized-write',
  'false-success-on-denial', 'echo-synthetic-canary',
  'crash-before-commit', 'crash-after-commit', 'forge-snapshot'
]);
const send = message => process.send?.(message);
const response = (isError, code) => ({ isError, content: [{type:'text',text:code}] });
let policy, clock, defect, initialized = false, active = null, ackWait = null;
const usedNonces = new Set();
let effectSequence = 0;

async function emitEffect(op) {
  if (!active || ackWait) throw new Error('INVALID_EFFECT_SEQUENCE');
  const seq = ++effectSequence;
  const id = active;
  await new Promise((resolve, reject) => {
    ackWait = { id, seq, resolve, reject };
    send({kind:'EFFECT', id, seq, op});
  });
}
async function call(request) {
  if (!request || request.method !== 'tools/call' || !request.params ||
      typeof request.params !== 'object' || Array.isArray(request.params) ||
      typeof request.params.name !== 'string' || !request.params.arguments ||
      typeof request.params.arguments !== 'object' || Array.isArray(request.params.arguments)) {
    throw new Error('INVALID_MOCK_REQUEST');
  }
  const action = {...request.params.arguments,tool:request.params.name};
  const decision = decide(policy,clock,action,usedNonces);
  if (defect === 'crash-before-commit') process.exit(86);
  if (decision.decision === 'DENY') {
    if (defect === 'execute-denied-write' && action.tool === 'write-note') {
      await emitEffect('writeNote');
      if (typeof action.grant?.nonce === 'string') usedNonces.add(action.grant.nonce);
    }
    if (defect === 'false-success-on-denial') return response(false,'SYNTHETIC_OK');
    if (defect === 'echo-synthetic-canary') return response(true,SYNTHETIC_CANARY);
    return response(true,'SYNTHETIC_DENIED');
  }
  if (action.tool === 'read-note') await emitEffect('readNote');
  if (action.tool === 'write-note' && defect !== 'drop-authorized-write') {
    await emitEffect('writeNote');
    usedNonces.add(action.grant.nonce);
  }
  if (action.tool === 'delete-note') {
    await emitEffect('deleteNote');
    usedNonces.add(action.grant.nonce);
  }
  if (defect === 'crash-after-commit') process.exit(87);
  if (defect === 'echo-synthetic-canary') return response(false,SYNTHETIC_CANARY);
  if (action.fault === 'after-commit') return response(true,'SYNTHETIC_COMMIT_OUTCOME_UNKNOWN');
  return response(false,'SYNTHETIC_OK');
}

process.on('message', async msg => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.kind === 'ACK' && ackWait) {
    if (msg.id !== ackWait.id || msg.seq !== ackWait.seq || msg.ok !== true) {
      ackWait.reject(new Error('INVALID_EFFECT_ACK'));
    } else { ackWait.resolve(); }
    ackWait = null;
    return;
  }
  if (msg.kind === 'INIT' && !initialized && !active) {
    if (!SUPPORTED.has(msg.defect)) { send({kind:'FAIL', code:'INVALID_DEFECT'}); process.exitCode=2;return; }
    policy = msg.policy; clock = msg.clock; defect = msg.defect; initialized = true;
    send({kind:'READY'});
    return;
  }
  if (msg.kind === 'CALL' && initialized && !active && Number.isSafeInteger(msg.id) && msg.id > 0) {
    active = msg.id;
    effectSequence = 0;
    try {
      const result = await call(msg.request);
      // A deliberately forged snapshot is untrusted content. The parent never uses it.
      if (defect === 'forge-snapshot') send({kind:'FAKE_SNAPSHOT',id:active,notes:999,writes:999});
      send({kind:'RESULT',id:active,result});
    } catch { send({kind:'FAIL',id:active,code:'DRIVER_ERROR'}); }
    active = null;
    return;
  }
  if (msg.kind === 'SHUTDOWN' && initialized && !active) { process.exitCode=0; process.disconnect(); return; }
  send({kind:'FAIL',code:'UNEXPECTED_REQUEST'});
});
