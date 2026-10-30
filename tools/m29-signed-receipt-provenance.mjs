#!/usr/bin/env node
/**
 * M29: Ed25519 signed fictional outcome receipts and an independent
 * provenance gate. A genuine signature proves who signed bytes only
 * relative to a pre-established key; it does not prove the effect occurred.
 * The "signer" and source-owned worlds here are NOT independently trusted.
 */
import {createHash,generateKeyPairSync,randomBytes,sign,verify} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PENDING='FICTIONAL-IN-DOUBT-V1\n',TICK=8,EPOCH=3;
const MARKER=createHash('sha256').update(PENDING).digest('hex');
const FIELDS=Object.freeze([
  'schemaVersion','issuer','operation','markerDigest','epoch',
  'nonce','outcome','notBeforeTick','expiresAtTick'
]);
const SOURCE=Object.freeze({
  schemaVersion:1,issuer:'FICTIONAL_OBSERVER_A',
  operation:'fictional-operation-alpha',markerDigest:MARKER,epoch:EPOCH,
  outcome:'EFFECT_COMMITTED',notBeforeTick:4,expiresAtTick:10
});
const CASES=Object.freeze([
  Object.freeze({id:'SIGNED_TRUE_COMPLETE',world:1,claimed:'EFFECT_COMMITTED',
    signature:true,binding:true,window:true,unused:true,unsafe:1,loss:0,duplicate:0}),
  Object.freeze({id:'SIGNED_FALSE_COMPLETE',world:0,claimed:'EFFECT_COMMITTED',
    signature:true,binding:true,window:true,unused:true,unsafe:1,loss:1,duplicate:0}),
  Object.freeze({id:'SIGNED_TRUE_NO_EFFECT',world:0,claimed:'NO_EFFECT_OBSERVED',
    signature:true,binding:true,window:true,unused:true,unsafe:1,loss:0,duplicate:0}),
  Object.freeze({id:'SIGNED_FALSE_NO_EFFECT',world:1,claimed:'NO_EFFECT_OBSERVED',
    signature:true,binding:true,window:true,unused:true,unsafe:1,loss:0,duplicate:1}),
  Object.freeze({id:'TAMPERED_OUTCOME',world:1,claimed:'EFFECT_COMMITTED',
    signature:false,binding:true,window:true,unused:true,unsafe:0,loss:0,duplicate:0}),
  Object.freeze({id:'WRONG_OPERATION',world:1,claimed:'EFFECT_COMMITTED',
    signature:true,binding:false,window:true,unused:true,unsafe:0,loss:0,duplicate:0}),
  Object.freeze({id:'WRONG_MARKER',world:1,claimed:'EFFECT_COMMITTED',
    signature:true,binding:false,window:true,unused:true,unsafe:0,loss:0,duplicate:0}),
  Object.freeze({id:'WRONG_EPOCH',world:1,claimed:'EFFECT_COMMITTED',
    signature:true,binding:false,window:true,unused:true,unsafe:0,loss:0,duplicate:0}),
  Object.freeze({id:'EXPIRED',world:1,claimed:'EFFECT_COMMITTED',
    signature:true,binding:true,window:false,unused:true,unsafe:0,loss:0,duplicate:0}),
  Object.freeze({id:'UNTRUSTED_SIGNER_KEY',world:1,claimed:'EFFECT_COMMITTED',
    signature:false,binding:true,window:true,unused:true,unsafe:0,loss:0,duplicate:0}),
  Object.freeze({id:'REPLAYED_NONCE',world:1,claimed:'EFFECT_COMMITTED',
    signature:true,binding:true,window:true,unused:false,unsafe:1,loss:0,duplicate:0}),
  Object.freeze({id:'UNSIGNED_CLAIM',world:1,claimed:'EFFECT_COMMITTED',
    signature:false,binding:true,window:true,unused:true,unsafe:0,loss:0,duplicate:0})
]);
const own=(x,k)=>Object.hasOwn(x,k);
function descriptorField(x,k){
  if(!x||typeof x!=='object'||Array.isArray(x)||
     Object.getPrototypeOf(x)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(x,k);
  return d?.enumerable&&own(d,'value')?d.value:undefined;
}
function exactData(x,keys){
  if(!x||typeof x!=='object'||Array.isArray(x)||
     Object.getPrototypeOf(x)!==Object.prototype)return false;
  const d=Object.getOwnPropertyDescriptors(x);
  return Reflect.ownKeys(d).length===keys.length&&keys.every(k=>
    d[k]?.enumerable&&own(d[k],'value'));
}
function dense(a,n){
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||
     a.length!==n)return false;
  const d=Object.getOwnPropertyDescriptors(a);
  return Reflect.ownKeys(d).length===n+1&&d.length?.value===n&&
    Array.from({length:n},(_,i)=>d[String(i)]).every(x=>
      x?.enumerable&&own(x,'value'));
}
const invalidReport=code=>Object.freeze({
  reportSchemaVersion:1,profile:'owned-signed-receipt-provenance-v1',
  status:'ERROR',exitCode:2,ruleCode:code,
  externalTrustEstablished:false,actualEffectReconciled:false,
  exactlyOnceProven:false,realCredentialsUsed:false,
  externalMcpContacted:false,securityCertified:false
});
const signedBytes=payload=>Buffer.from(JSON.stringify(
  Object.fromEntries(FIELDS.map(k=>[k,descriptorField(payload,k)]))),'utf8');
function validPayload(p){
  return exactData(p,FIELDS)&&
    descriptorField(p,'schemaVersion')===1&&
    descriptorField(p,'issuer')===SOURCE.issuer&&
    typeof descriptorField(p,'operation')==='string'&&
    descriptorField(p,'operation').length<100&&
    /^[a-z0-9-]{64}$/.test(descriptorField(p,'markerDigest'))&&
    Number.isSafeInteger(descriptorField(p,'epoch'))&&
    typeof descriptorField(p,'nonce')==='string'&&
    /^[0-9a-f]{32}$/.test(descriptorField(p,'nonce'))&&
    ['EFFECT_COMMITTED','NO_EFFECT_OBSERVED'].includes(
      descriptorField(p,'outcome'))&&
    Number.isSafeInteger(descriptorField(p,'notBeforeTick'))&&
    Number.isSafeInteger(descriptorField(p,'expiresAtTick'));
}
/**
 * Cryptographic signature inspection is independent of any observed effect.
 * The trustedPublicKey argument is a caller-established synthetic anchor,
 * NOT authenticated identity. In particular, verification cannot infer
 * external provenance or authorize release of an unresolved operation.
 */
export function inspectOwnedReceipt(receipt,trustedPublicKey,usedNonces=new Set()){
  const p=descriptorField(receipt,'payload');
  const raw=descriptorField(receipt,'signature');
  const shape=exactData(receipt,['payload','signature'])&&validPayload(p);
  let cryptographicSignatureVerified=false;
  if(shape&&typeof raw==='string'&&
     /^[A-Za-z0-9+/]{86}==$/.test(raw)&&
     trustedPublicKey?.type==='public'&&
     trustedPublicKey?.asymmetricKeyType==='ed25519'){
    try{
      const bytes=Buffer.from(raw,'base64');
      cryptographicSignatureVerified=bytes.length===64&&
        bytes.toString('base64')===raw&&
        verify(null,signedBytes(p),trustedPublicKey,bytes);
    }catch{cryptographicSignatureVerified=false;}
  }
  const bindingMatched=!!shape&&
    descriptorField(p,'operation')===SOURCE.operation&&
    descriptorField(p,'markerDigest')===SOURCE.markerDigest&&
    descriptorField(p,'epoch')===EPOCH;
  const withinLogicalWindow=!!shape&&
    descriptorField(p,'notBeforeTick')<=TICK&&
    TICK<=descriptorField(p,'expiresAtTick');
  // Untrusted callers cannot use a receipt-provided "verified" bit.
  const nonceUnused=!!shape&&
    usedNonces instanceof Set&&!usedNonces.has(descriptorField(p,'nonce'));
  const cryptographicallyEligible=cryptographicSignatureVerified&&
    bindingMatched&&withinLogicalWindow;
  const reason=!cryptographicSignatureVerified?'SIGNATURE_NOT_VERIFIED':
    !bindingMatched?'OPERATION_BINDING_REJECTED':
    !withinLogicalWindow?'LOGICAL_WINDOW_REJECTED':
    !nonceUnused?'NONCE_ALREADY_USED':
    'EXTERNAL_EFFECT_PROVENANCE_NOT_VERIFIED';
  return Object.freeze({
    cryptographicSignatureVerified,bindingMatched,withinLogicalWindow,
    nonceUnused,cryptographicallyEligible,
    externalTrustEstablished:false,
    externalEffectTruthEstablished:false,
    guardedReleaseAuthorized:false,guardedDisposition:'QUARANTINE',
    reason
  });
}
function makeCase(spec,keys){
  const nonce=randomBytes(16).toString('hex');
  const payload={...SOURCE,nonce,outcome:spec.claimed};
  let signingKey=keys.trusted.privateKey;
  if(spec.id==='WRONG_OPERATION')payload.operation='fictional-operation-beta';
  if(spec.id==='WRONG_MARKER')payload.markerDigest='0'.repeat(64);
  if(spec.id==='WRONG_EPOCH')payload.epoch=EPOCH+1;
  if(spec.id==='EXPIRED')payload.expiresAtTick=TICK-1;
  if(spec.id==='UNTRUSTED_SIGNER_KEY')signingKey=keys.rogue.privateKey;
  const signature=sign(null,signedBytes(payload),signingKey).toString('base64');
  if(spec.id==='TAMPERED_OUTCOME'){
    // Change an already signed assertion without resigning.
    payload.outcome='NO_EFFECT_OBSERVED';
  }
  return {payload,signature:spec.id==='UNSIGNED_CLAIM'?'':signature};
}
function runCase(spec,keys){
  const receipt=makeCase(spec,keys);
  const nonce=receipt.payload.nonce;
  const used=new Set(spec.id==='REPLAYED_NONCE'?[nonce]:[]);
  const check=inspectOwnedReceipt(receipt,keys.trusted.publicKey,used);
  const unsafe=Number(check.cryptographicallyEligible);
  // An UNSAFE signature-only resolver acts on the unsupported outcome
  // claim. The guarded policy ALWAYS maintains quarantine here because
  // no independently authenticated external observer was configured.
  const unsafeLoss=unsafe&&spec.world===0&&
    receipt.payload.outcome==='EFFECT_COMMITTED'?1:0;
  const unsafeDuplicate=unsafe&&spec.world===1&&
    receipt.payload.outcome==='NO_EFFECT_OBSERVED'?1:0;
  return {
    id:spec.id,
    signatureVerified:check.cryptographicSignatureVerified,
    bindingMatched:check.bindingMatched,
    withinLogicalWindow:check.withinLogicalWindow,
    nonceUnused:check.nonceUnused,
    externalTrustEstablished:check.externalTrustEstablished,
    externalEffectTruthEstablished:check.externalEffectTruthEstablished,
    guardedReleaseAuthorized:check.guardedReleaseAuthorized,
    guardedDisposition:check.guardedDisposition,
    guardedTransitions:0,
    unsafeSignatureOnlyTransitions:unsafe,
    unsafeLostOperations:unsafeLoss,
    unsafeDuplicateEffects:unsafeDuplicate,
    originalSyntheticEffects:spec.world,
    independentNewKeyAllowed:true,
    ephemeralOnly:true
  };
}
/** Fixed oracle, independent of any observed self-reported PASS. */
export function summarizeSignedReceiptProvenance(observations){
  const shape=dense(observations,CASES.length);
  const rows=CASES.map((spec,i)=>{
    const d=shape?Object.getOwnPropertyDescriptor(observations,String(i)):null;
    const r=d?.value;
    const expectations=[
      ['id',spec.id],['signatureVerified',spec.signature],
      ['bindingMatched',spec.binding],['withinLogicalWindow',spec.window],
      ['nonceUnused',spec.unused],['externalTrustEstablished',false],
      ['externalEffectTruthEstablished',false],
      ['guardedReleaseAuthorized',false],
      ['guardedDisposition','QUARANTINE'],
      ['guardedTransitions',0],
      ['unsafeSignatureOnlyTransitions',spec.unsafe],
      ['unsafeLostOperations',spec.loss],
      ['unsafeDuplicateEffects',spec.duplicate],
      ['originalSyntheticEffects',spec.world],
      ['independentNewKeyAllowed',true],['ephemeralOnly',true]
    ];
    const mismatches=Object.freeze(expectations.filter(([k,v])=>
      descriptorField(r,k)!==v).map(([k])=>k));
    return Object.freeze({id:spec.id,matched:mismatches.length===0,
      finding:spec.loss?'SIGNED_CLAIM_CAN_LOSE_OPERATION':
        spec.duplicate?'SIGNED_CLAIM_CAN_DUPLICATE_EFFECT':
        spec.unsafe?'SIGNATURE_ONLY_NOT_OUTCOME_PROOF':
        'UNVERIFIED_OR_UNBOUND_CLAIM_QUARANTINED',
      mismatchedWitnessFields:mismatches});
  });
  const matched=rows.filter(x=>x.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:'owned-signed-receipt-provenance-v1',
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?'SIGNED_RECEIPT_LIMITS_WITNESSED':
      'SIGNED_RECEIPT_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(rows),
    observedUnsafeSignedClaimLosses:1,
    observedUnsafeSignedClaimDuplicates:1,
    guardedQuarantinedCases:CASES.length,
    sourceOwnedEphemeralKeyPairs:true,
    independentlyAuthenticatedSigner:false,
    actualEffectReconciled:false,
    exactlyOnceProven:false,powerLossDurabilityProven:false,
    realAgentTested:false,realCredentialsUsed:false,
    externalMcpContacted:false,independentBetaVerified:false,
    securityCertified:false,stableReleaseAuthorized:false
  });
}
export function runSignedReceiptProvenanceLab(args=[]){
  if(!dense(args,0))return invalidReport('SIGNED_RECEIPT_ARGUMENTS_NOT_ALLOWED');
  try{
    const trusted=generateKeyPairSync('ed25519');
    const rogue=generateKeyPairSync('ed25519');
    return summarizeSignedReceiptProvenance(
      CASES.map(spec=>runCase(spec,{trusted,rogue})));
  }catch{return invalidReport('SIGNED_RECEIPT_LAB_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=runSignedReceiptProvenanceLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
