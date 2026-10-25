/**
 * M4-B2: OFFLINE, self-asserted adapter consent *consistency* only.
 * NOT a signature verifier, ownership proof, persistent replay protection,
 * networking policy enforcer, executable grant, or authorization to connect.
 */
import { createHash } from 'node:crypto';
import { inspectProjectAdapter } from './project-adapter.mjs';

export const CONSENT_SCHEMA_VERSION = 1;
export const REVIEWABLE_METHODS = Object.freeze(['initialize','ping']);
const MAX_TTL_MS=300_000;
const ERROR='INVALID_ADAPTER_CONSENT_INPUT';
const deny=()=>{throw new TypeError(ERROR);};
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function keys(value,names) {
  if(!value || typeof value!=='object' || Array.isArray(value) ||
     Object.getPrototypeOf(value)!==Object.prototype) deny();
  const desc=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(desc).length!==names.length ||
     !names.every(k=>own(desc,k) && own(desc[k],'value') && desc[k].enumerable)) deny();
}
/** M6-AJ/AK/AL: inert descriptor subtrees before hashing or access.
 * Direct JavaScript input integrity only, not an adversarial Proxy sandbox. */
function descriptorData(value,budget={nodes:10000,bytes:1024*1024},depth=0) {
  if(--budget.nodes<0 || depth>32) return false;
  if(value===null || typeof value==='boolean') return true;
  if(typeof value==='string'){
    budget.bytes-=Buffer.byteLength(value,'utf8');
    return budget.bytes>=0;
  }
  if(typeof value==='number') return Number.isFinite(value) &&
    (!Number.isInteger(value) || Number.isSafeInteger(value));
  if(!value || typeof value!=='object') return false;
  if(Array.isArray(value)){
    if(Object.getPrototypeOf(value)!==Array.prototype || value.length>10000) return false;
    const desc=Object.getOwnPropertyDescriptors(value);
    if(Reflect.ownKeys(desc).length!==value.length+1) return false;
    for(let i=0;i<value.length;i++){
      const slot=desc[String(i)];
      if(!slot || !own(slot,'value') || !slot.enumerable ||
         !descriptorData(slot.value,budget,depth+1)) return false;
    }
    return true;
  }
  if(Object.getPrototypeOf(value)!==Object.prototype) return false;
  const desc=Object.getOwnPropertyDescriptors(value);
  for(const key of Reflect.ownKeys(desc)){
    if(typeof key!=='string' || !own(desc[key],'value') ||
       !desc[key].enumerable) return false;
    budget.bytes-=Buffer.byteLength(key,'utf8');
    if(budget.bytes<0 || !descriptorData(desc[key].value,budget,depth+1)) return false;
  }
  return true;
}
function id(value,max=64) {
  return typeof value==='string' && value.length>0 &&
    value.length<=max && /^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(value);
}
const isTime=x=>Number.isSafeInteger(x) && x>=0;
function descriptorPayload(descriptor) {
  // Validates *all* transport/policy fields first, then hashes only the known
  // ordered values; JSON key order cannot silently change its identity.
  if(!descriptorData(descriptor)) deny();
  try { inspectProjectAdapter(descriptor); } catch { deny(); }
  const transport=descriptor.transport.type==='stdio'
    ? ['stdio',descriptor.transport.command,...descriptor.transport.args]
    : ['streamable-http',descriptor.transport.endpoint];
  return [
    descriptor.adapterSchemaVersion,
    descriptor.project.name,
    descriptor.protocolVersion,
    transport,
    ['validate-only',false,false,false,false]
  ];
}
export function descriptorFingerprint(descriptor) {
  return createHash('sha256').update(JSON.stringify(descriptorPayload(descriptor)),'utf8')
    .digest('hex');
}

function validateEnvelope(e) {
  keys(e,['policySchemaVersion','descriptor','request','claim']);
  if(e.policySchemaVersion!==CONSENT_SCHEMA_VERSION) deny();
  const fingerprint=descriptorFingerprint(e.descriptor);
  keys(e.request,['project','transport','method','operatorId']);
  keys(e.claim,['operatorId','projectFingerprint','transport','methods',
    'issuedAt','expiresAt','nonce','revoked']);
  if(!id(e.request.project) || !id(e.request.operatorId) ||
     !id(e.claim.operatorId) ||
     !['stdio','streamable-http'].includes(e.request.transport) ||
     !['stdio','streamable-http'].includes(e.claim.transport) ||
     typeof e.claim.projectFingerprint!=='string' ||
     !/^[a-f0-9]{64}$/.test(e.claim.projectFingerprint) ||
     !id(e.claim.nonce,64) || !isTime(e.claim.issuedAt) ||
     !isTime(e.claim.expiresAt) || typeof e.claim.revoked!=='boolean' ||
     !Array.isArray(e.claim.methods) || e.claim.methods.length<1 ||
     e.claim.methods.length>2 ||
     !descriptorData(e.claim.methods) ||
     e.claim.methods.some(m=>!REVIEWABLE_METHODS.includes(m)) ||
     new Set(e.claim.methods).size!==e.claim.methods.length ||
     !REVIEWABLE_METHODS.includes(e.request.method)) deny();
  return fingerprint;
}
const ruleOutcome=(rule)=>({
  status:rule==='NONE'?'PASS':'FAIL',
  profile:'offline-self-asserted-consent-v1',
  authorizationStatus:'UNVERIFIED_SELF_ASSERTION',
  operatorVerified:false,
  connectionStatus:'NOT_ATTEMPTED',
  executionEnabled:false,
  allowedMethods:[...REVIEWABLE_METHODS],
  failureCount:rule==='NONE'?0:1,
  findingsTruncated:false,
  findings:rule==='NONE'?[]:[{step:1,rule}],
  reviewRule:rule
});

/**
 * The nowMs/seenNonces options exist exclusively for deterministic offline
 * tests/same-process simulation; passing a different clock or a fresh Set
 * is NOT authorization. CLI always uses its actual process clock.
 */
export function evaluateAdapterConsent(envelope, options={}) {
  const fingerprint=validateEnvelope(envelope);
  keys(options,Object.keys(options));
  if(Object.keys(options).some(k=>!['nowMs','seenNonces'].includes(k))) deny();
  const now=own(options,'nowMs')?options.nowMs:Date.now();
  const seen=own(options,'seenNonces')?options.seenNonces:null;
  if(!isTime(now) || (seen!==null && !(seen instanceof Set))) deny();
  const {descriptor,request,claim}=envelope;
  const same=descriptor.project.name===request.project &&
    descriptor.transport.type===request.transport &&
    claim.transport===request.transport &&
    claim.operatorId===request.operatorId &&
    claim.projectFingerprint===fingerprint;
  let rule='NONE';
  if(!same) rule='ADAPTER_IDENTITY_MISMATCH';
  else if(claim.revoked) rule='ADAPTER_GRANT_REVOKED';
  else if(claim.expiresAt<=claim.issuedAt ||
    claim.expiresAt-claim.issuedAt>MAX_TTL_MS ||
    claim.issuedAt>now || claim.expiresAt<=now) rule='ADAPTER_GRANT_EXPIRED_OR_INVALID';
  else if(!claim.methods.includes(request.method)) rule='ADAPTER_METHOD_DENIED';
  else if(seen?.has(claim.nonce)) rule='ADAPTER_SIMULATED_REPLAY';
  if(rule==='NONE' && seen) seen.add(claim.nonce);
  return ruleOutcome(rule);
}
