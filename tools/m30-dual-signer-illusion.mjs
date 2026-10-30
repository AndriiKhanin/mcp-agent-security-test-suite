#!/usr/bin/env node
/**
 * M30: two genuine ephemeral Ed25519 signatures do NOT prove an outcome.
 * All keypairs, receipts and effects belong to this fixed fictional process.
 * No real signer, agent, user path, endpoint, filesystem effect or release.
 */
import {createHash,generateKeyPairSync,randomBytes,sign,verify}
  from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PROFILE='owned-dual-signer-illusion-v1';
const SUBJECT=Object.freeze({
  schemaVersion:1,operation:'fictional-operation-alpha',
  markerDigest:createHash('sha256')
    .update('FICTIONAL-IN-DOUBT-V1\n').digest('hex'),
  epoch:3,notBeforeTick:4,expiresAtTick:10
});
const TICK=8;
const ISSUERS=Object.freeze(['FICTIONAL_SIGNER_A','FICTIONAL_SIGNER_B']);
const FIELDS=Object.freeze([
  'schemaVersion','issuer','operation','markerDigest','epoch',
  'nonce','outcome','notBeforeTick','expiresAtTick'
]);
const ROWS=Object.freeze([
  Object.freeze({id:'TWO_TRUE_COMPLETE',world:1,claim:'EFFECT_COMMITTED',quorum:1,effects:1,loss:0,dup:0}),
  Object.freeze({id:'TWO_FALSE_COMPLETE',world:0,claim:'EFFECT_COMMITTED',quorum:1,effects:0,loss:1,dup:0}),
  Object.freeze({id:'TWO_TRUE_NO_EFFECT',world:0,claim:'NO_EFFECT_OBSERVED',quorum:1,effects:1,loss:0,dup:0}),
  Object.freeze({id:'TWO_FALSE_NO_EFFECT',world:1,claim:'NO_EFFECT_OBSERVED',quorum:1,effects:2,loss:0,dup:1}),
  Object.freeze({id:'SIGNED_CONFLICT',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,agreement:false}),
  Object.freeze({id:'ONE_SIGNATURE_TAMPERED',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,bVerified:false}),
  Object.freeze({id:'ROGUE_SECOND_KEY',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,bVerified:false}),
  Object.freeze({id:'REUSED_SECOND_NONCE',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,bUnused:false}),
  Object.freeze({id:'DUPLICATED_SIGNER_KEY',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,distinct:false}),
  Object.freeze({id:'WRONG_SECOND_OPERATION',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,bBinding:false}),
  Object.freeze({id:'WRONG_SECOND_EPOCH',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,bBinding:false}),
  Object.freeze({id:'EXPIRED_SECOND',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,bWindow:false}),
  Object.freeze({id:'SECOND_UNSIGNED',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,bVerified:false}),
  Object.freeze({id:'REWRITTEN_SECOND_CLAIM',world:1,claim:'EFFECT_COMMITTED',quorum:0,effects:1,loss:0,dup:0,bVerified:false,agreement:false})
]);
const own=(x,k)=>Object.hasOwn(x,k);
function props(x){
  if(!x||typeof x!=='object'||Array.isArray(x)||
     Object.getPrototypeOf(x)!==Object.prototype)return null;
  return Object.getOwnPropertyDescriptors(x);
}
function field(x,k){
  const d=props(x)?.[k];
  return d?.enumerable&&own(d,'value')?d.value:undefined;
}
function exact(x,names){
  const d=props(x);
  return !!d&&Reflect.ownKeys(d).length===names.length&&
    names.every(k=>d[k]?.enumerable&&own(d[k],'value'));
}
function dense(a,n){
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||
     a.length!==n)return false;
  const d=Object.getOwnPropertyDescriptors(a);
  return Reflect.ownKeys(d).length===n+1&&d.length?.value===n&&
    Array.from({length:n},(_,i)=>d[String(i)]).every(x=>
      x?.enumerable&&own(x,'value'));
}
const invalid=ruleCode=>Object.freeze({
  reportSchemaVersion:1,profile:PROFILE,status:'ERROR',exitCode:2,
  ruleCode,independentSignerTrustEstablished:false,
  realEffectReconciled:false,externalMcpContacted:false,
  realCredentialsUsed:false,securityCertified:false
});
function validPayload(payload,issuer){
  return exact(payload,FIELDS)&&
    field(payload,'schemaVersion')===1&&
    field(payload,'issuer')===issuer&&
    typeof field(payload,'operation')==='string'&&
    field(payload,'operation').length<=100&&
    /^[0-9a-f]{64}$/.test(field(payload,'markerDigest'))&&
    Number.isSafeInteger(field(payload,'epoch'))&&
    /^[0-9a-f]{32}$/.test(field(payload,'nonce'))&&
    ['EFFECT_COMMITTED','NO_EFFECT_OBSERVED'].includes(
      field(payload,'outcome'))&&
    Number.isSafeInteger(field(payload,'notBeforeTick'))&&
    Number.isSafeInteger(field(payload,'expiresAtTick'));
}
function signingBytes(p){
  return Buffer.from(JSON.stringify(Object.fromEntries(
    FIELDS.map(k=>[k,field(p,k)]))),'utf8');
}
const fingerprint=publicKey=>createHash('sha256')
  .update(publicKey.export({type:'spki',format:'der'})).digest('hex');
const fixedReceipt=(issuer,outcome,privateKey)=>{
  const payload={...SUBJECT,issuer,outcome,
    nonce:randomBytes(16).toString('hex')};
  const signature=sign(null,signingBytes(payload),privateKey).toString('base64');
  return {payload,signature};
};
/**
 * A verified two-key quorum is still just a statement from two first-party
 * signing keys. It CANNOT authorize a real effect reconciliation.
 * The trust anchor set is supplied by this test, not remotely authenticated.
 */
export function inspectOwnedPair(receipts,publicKeys,usedNonces=new Set()){
  const keysOk=dense(publicKeys,2)&&publicKeys.every(k=>
    k?.type==='public'&&k?.asymmetricKeyType==='ed25519');
  const sig=[false,false],binding=[false,false],
    window=[false,false],nonceUnused=[false,false];
  const payloads=[null,null];
  const shape=dense(receipts,2)&&keysOk;
  if(shape)for(let i=0;i<2;i++){
    const r=receipts[i],p=field(r,'payload'),raw=field(r,'signature');
    const valid=exact(r,['payload','signature'])&&
      validPayload(p,ISSUERS[i]);
    if(!valid)continue;
    payloads[i]=p;
    binding[i]=field(p,'operation')===SUBJECT.operation&&
      field(p,'markerDigest')===SUBJECT.markerDigest&&
      field(p,'epoch')===SUBJECT.epoch;
    window[i]=field(p,'notBeforeTick')<=TICK&&
      TICK<=field(p,'expiresAtTick');
    nonceUnused[i]=usedNonces instanceof Set&&
      !usedNonces.has(field(p,'nonce'));
    if(typeof raw!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(raw))
      continue;
    try{
      const bytes=Buffer.from(raw,'base64');
      sig[i]=bytes.length===64&&bytes.toString('base64')===raw&&
        verify(null,signingBytes(p),publicKeys[i],bytes);
    }catch{sig[i]=false;}
  }
  let distinct=false;
  if(keysOk)try{
    distinct=fingerprint(publicKeys[0])!==fingerprint(publicKeys[1]);
  }catch{distinct=false;}
  const agree=!!payloads[0]&&!!payloads[1]&&
    field(payloads[0],'outcome')===field(payloads[1],'outcome');
  const quorum=!!shape&&distinct&&agree&&
    sig.every(Boolean)&&binding.every(Boolean)&&
    window.every(Boolean)&&nonceUnused.every(Boolean);
  // Reports only bounded booleans. Signatures, keys, subjects and nonces
  // never appear in a report, and no passed-in "verified" flag is read.
  return Object.freeze({
    firstSignatureVerified:sig[0],secondSignatureVerified:sig[1],
    firstBindingMatched:binding[0],secondBindingMatched:binding[1],
    firstLogicalWindowValid:window[0],
    secondLogicalWindowValid:window[1],
    firstNonceUnused:nonceUnused[0],secondNonceUnused:nonceUnused[1],
    distinctSignerKeys:distinct,claimsAgree:agree,
    sourceOwnedCryptoQuorum:quorum,
    independentSignerTrustEstablished:false,
    authenticatedRealEffectProven:false,
    guardedReleaseAuthorized:false,
    guardedDisposition:'QUARANTINE'
  });
}
function observeOne(spec){
  const pairA=generateKeyPairSync('ed25519');
  const pairB=generateKeyPairSync('ed25519');
  const rogue=generateKeyPairSync('ed25519');
  const claims=[spec.claim,spec.id==='SIGNED_CONFLICT'?
    'NO_EFFECT_OBSERVED':spec.claim];
  const a=fixedReceipt(ISSUERS[0],claims[0],pairA.privateKey);
  const keyB=spec.id==='DUPLICATED_SIGNER_KEY'?pairA.privateKey:
    spec.id==='ROGUE_SECOND_KEY'?rogue.privateKey:pairB.privateKey;
  const b=fixedReceipt(ISSUERS[1],claims[1],keyB);
  if(spec.id==='ONE_SIGNATURE_TAMPERED')b.payload.nonce='0'.repeat(32);
  if(spec.id==='WRONG_SECOND_OPERATION'){
    b.payload.operation='fictional-operation-beta';
    b.signature=sign(null,signingBytes(b.payload),keyB).toString('base64');
  }
  if(spec.id==='WRONG_SECOND_EPOCH'){
    b.payload.epoch=SUBJECT.epoch+1;
    b.signature=sign(null,signingBytes(b.payload),keyB).toString('base64');
  }
  if(spec.id==='EXPIRED_SECOND'){
    b.payload.expiresAtTick=TICK-1;
    b.signature=sign(null,signingBytes(b.payload),keyB).toString('base64');
  }
  if(spec.id==='SECOND_UNSIGNED')b.signature='';
  if(spec.id==='REWRITTEN_SECOND_CLAIM')
    b.payload.outcome='NO_EFFECT_OBSERVED';
  const used=spec.id==='REUSED_SECOND_NONCE'?
    new Set([b.payload.nonce]):new Set();
  const pubB=spec.id==='DUPLICATED_SIGNER_KEY'?
    pairA.publicKey:pairB.publicKey;
  const check=inspectOwnedPair([a,b],[pairA.publicKey,pubB],used);
  // Deliberately unsafe comparator: agreeing signed statements -> release.
  // This comparison is ONLY about first-party memory counters.
  const unsafe=Number(check.sourceOwnedCryptoQuorum);
  const unsafeRetry=unsafe&&spec.claim==='NO_EFFECT_OBSERVED'?1:0;
  const unsafeLoss=unsafe&&spec.claim==='EFFECT_COMMITTED'&&
    spec.world===0?1:0;
  const unsafeDuplicate=unsafeRetry&&spec.world===1?1:0;
  return {
    id:spec.id,...check,
    guardedTransitions:0,
    originalSyntheticEffects:spec.world,
    unsafeQuorumOnlyTransitions:unsafe,
    unsafeSyntheticEffects:spec.world+unsafeRetry,
    unsafeLostOperations:unsafeLoss,
    unsafeDuplicateEffects:unsafeDuplicate,
    freshIndependentKeyAllowed:true,
    sourceOwnedEphemeralKeysOnly:true
  };
}
export function summarizeDualSignerLab(observations){
  const shape=dense(observations,ROWS.length);
  const cases=ROWS.map((spec,i)=>{
    const d=shape?Object.getOwnPropertyDescriptor(observations,String(i)):null;
    const r=d?.enumerable&&own(d,'value')?d.value:null;
    const expectations=[
      ['id',spec.id],['firstSignatureVerified',true],
      ['secondSignatureVerified',spec.bVerified??true],
      ['firstBindingMatched',true],
      ['secondBindingMatched',spec.bBinding??true],
      ['firstLogicalWindowValid',true],
      ['secondLogicalWindowValid',spec.bWindow??true],
      ['firstNonceUnused',true],
      ['secondNonceUnused',spec.bUnused??true],
      ['distinctSignerKeys',spec.distinct??true],
      ['claimsAgree',spec.agreement??true],
      ['sourceOwnedCryptoQuorum',Boolean(spec.quorum)],
      ['independentSignerTrustEstablished',false],
      ['authenticatedRealEffectProven',false],
      ['guardedReleaseAuthorized',false],
      ['guardedDisposition','QUARANTINE'],
      ['guardedTransitions',0],
      ['originalSyntheticEffects',spec.world],
      ['unsafeQuorumOnlyTransitions',spec.quorum],
      ['unsafeSyntheticEffects',spec.effects],
      ['unsafeLostOperations',spec.loss],
      ['unsafeDuplicateEffects',spec.dup],
      ['freshIndependentKeyAllowed',true],
      ['sourceOwnedEphemeralKeysOnly',true]
    ];
    const mismatches=Object.freeze(expectations.filter(([k,v])=>
      field(r,k)!==v).map(([k])=>k));
    return Object.freeze({
      id:spec.id,matched:mismatches.length===0,
      finding:spec.loss?'AGREED_SIGNED_LIE_LOSES_UNPERFORMED_ACTION':
        spec.dup?'AGREED_SIGNED_LIE_DUPLICATES_EFFECT':
        spec.quorum?'TWO_VALID_SIGNATURES_NOT_EFFECT_PROOF':
        'NO_VALID_DISTINCT_AGREED_QUORUM',
      mismatchedWitnessFields:mismatches
    });
  });
  const matched=cases.filter(x=>x.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:PROFILE,
    status:matched===ROWS.length?'PASS':'FAIL',
    exitCode:matched===ROWS.length?0:1,
    ruleCode:matched===ROWS.length?'DUAL_SIGNER_LIMITS_WITNESSED':
      'DUAL_SIGNER_WITNESS_MISMATCH',
    checked:ROWS.length,matched,failed:ROWS.length-matched,
    cases:Object.freeze(cases),
    sourceOwnedAgreedSignedReceipts:4,
    intentionalUnsafeLostOperations:1,
    intentionalUnsafeDuplicateEffects:1,
    guardedCasesQuarantined:ROWS.length,
    independentSignerTrustEstablished:false,
    realEffectReconciled:false,
    realAgentTested:false,realCredentialsUsed:false,
    externalMcpContacted:false,independentBetaVerified:false,
    exactlyOnceProven:false,powerLossDurabilityProven:false,
    securityCertified:false,stableReleaseAuthorized:false
  });
}
export function runDualSignerLab(args=[]){
  if(!dense(args,0))return invalid('DUAL_SIGNER_ARGUMENTS_NOT_ALLOWED');
  try{return summarizeDualSignerLab(ROWS.map(observeOne));}
  catch{return invalid('DUAL_SIGNER_LAB_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=runDualSignerLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
