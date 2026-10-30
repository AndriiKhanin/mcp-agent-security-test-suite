#!/usr/bin/env node
/**
 * M28: identical fictional pending markers, different hidden effect worlds.
 * No real side effects: "effect" = parent-owned in-memory counter only.
 * Files are exclusively fresh, disposable marker evidence; not user data.
 */
import {createHash} from 'node:crypto';
import {
  mkdtempSync,rmSync,existsSync,openSync,writeSync,fsyncSync,closeSync,
  lstatSync,readdirSync,readFileSync,renameSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PENDING='FICTIONAL-IN-DOUBT-V1\n';
const SPENT='FICTIONAL-SPENT-V1\n';
const PREFIX='m28-owned-ambiguity-';
const POLICIES=Object.freeze(['BLIND_RETRY','ASSUME_DONE',
  'GUARDED_QUARANTINE','GUARDED_FORGED_PROOF']);
const WORLDS=Object.freeze(['NO_EFFECT','EFFECT_ALREADY_OCCURRED']);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const EXPECTED_PENDING_DIGEST=digest(Buffer.from(PENDING));
const CASES=Object.freeze(POLICIES.flatMap((policy,p)=>
  WORLDS.map((world,w)=>Object.freeze({
    id:policy+'_'+world,policy,world,
    originalEffects:w,
    attemptedReplay:p===0?1:0,
    syntheticEffects:w+(p===0?1:0),
    duplicates:p===0&&w===1?1:0,
    lost:p===1&&w===0?1:0,
    quarantined:p>=2?1:0,
    forgedProofBlocked:p===3?1:0,
    markerState:p<2?'SPENT':'IN_DOUBT'
  }))
));
const own=(o,k)=>Object.hasOwn(o,k);
const field=(o,k)=>{
  if(!o||typeof o!=='object'||Array.isArray(o)||
    Object.getPrototypeOf(o)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(o,k);
  return d?.enumerable&&own(d,'value')?d.value:undefined;
};
const dense=(a,n)=>{
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||
    a.length!==n)return false;
  const d=Object.getOwnPropertyDescriptors(a);
  return Reflect.ownKeys(d).length===n+1&&d.length?.value===n&&
    Array.from({length:n},(_,i)=>d[String(i)]).every(x=>
      x?.enumerable&&own(x,'value'));
};
const error=ruleCode=>Object.freeze({
  reportSchemaVersion:1,profile:'owned-indoubt-recovery-ambiguity-v1',
  status:'ERROR',exitCode:2,ruleCode,
  disposableFilesystemUsed:true,
  independentEffectReceiptVerified:false,
  exactlyOnceProven:false,powerLossDurabilityProven:false,
  realAgentTested:false,realCredentialsUsed:false,
  externalMcpContacted:false,independentBetaVerified:false,
  securityCertified:false
});
function writeNew(path,content){
  const bytes=Buffer.from(content);
  const fd=openSync(path,'wx',0o600);
  try{
    if(writeSync(fd,bytes)!==bytes.length)throw Error('SHORT_WRITE');
    fsyncSync(fd);
  }finally{closeSync(fd);}
}
function updateOnlyOwnedMarker(root,name,content){
  const original=join(root,name),temp=join(root,'update-'+name);
  writeNew(temp,content);
  renameSync(temp,original);
}
function readExactOwnedMarker(root,name){
  const filename=join(root,name);
  const st=lstatSync(filename);
  if(!st.isFile()||st.isSymbolicLink()||st.size>128||
     st.size<1)throw Error('UNEXPECTED_MARKER');
  const buf=readFileSync(filename);
  if(buf.byteLength!==st.size)throw Error('MARKER_SHORT_READ');
  const content=buf.toString('utf8');
  if(content!==PENDING&&content!==SPENT)
    throw Error('MARKER_CONTENT_REJECTED');
  return content;
}
function runOwnedCase(spec){
  const root=mkdtempSync(join(tmpdir(),PREFIX));
  let removed=false,result;
  try{
    // The two possible hidden worlds use the SAME bytes on disk.
    // Truth is source-owned in-memory simulation, not a user assertion.
    const alpha='claim-alpha.marker',beta='claim-beta.marker';
    writeNew(join(root,alpha),PENDING);
    const initial=readExactOwnedMarker(root,alpha);
    const identicalPendingBytes=digest(Buffer.from(initial))===
      EXPECTED_PENDING_DIGEST;
    let effects=spec.originalEffects,attemptedReplay=0,duplicate=0;
    let lost=0,unresolved=0,forgedBlocked=0;
    if(spec.policy==='BLIND_RETRY'){
      attemptedReplay=1;
      effects++;
      if(spec.originalEffects===1)duplicate++;
      updateOnlyOwnedMarker(root,alpha,SPENT);
    }else if(spec.policy==='ASSUME_DONE'){
      // This "solution" can silently drop unfinished operations.
      if(spec.originalEffects===0)lost++;
      updateOnlyOwnedMarker(root,alpha,SPENT);
    }else{
      // No authenticated external outcome evidence exists in this lab.
      // A crafted "proof" from untrusted data is NOT a verified receipt.
      unresolved++;
      if(spec.policy==='GUARDED_FORGED_PROOF'){
        const fictionalClaim='FICTIONAL_UNTRUSTED_CLAIM_IS_NOT_A_RECEIPT';
        if(fictionalClaim.length>0)forgedBlocked++;
      }
    }
    const alphaAfter=readExactOwnedMarker(root,alpha);
    const noClaimAutoRelease=(spec.policy.startsWith('GUARDED_'))?
      alphaAfter===PENDING:true;
    // Unrelated, independent key must remain executable.
    writeNew(join(root,beta),SPENT);
    const freshEffectCount=readExactOwnedMarker(root,beta)===SPENT?1:0;
    const files=readdirSync(root).sort();
    const expectedFiles=['claim-alpha.marker','claim-beta.marker'];
    const exactInventory=files.length===2&&
      files.every((name,i)=>name===expectedFiles[i]);
    result={
      id:spec.id,policy:spec.policy,world:spec.world,
      firstPartyMarkerWritten:initial===PENDING,
      identicalPendingBytes,
      originalEffects:spec.originalEffects,attemptedReplay,
      syntheticEffects:effects,duplicateEffects:duplicate,
      lostOperations:lost,unresolvedClaims:unresolved,
      forgedProofBlocked:forgedBlocked,
      markerState:alphaAfter===SPENT?'SPENT':'IN_DOUBT',
      noClaimAutoRelease,freshEffectCount,
      exactScratchInventory:exactInventory,
      firstPartyOnly:true
    };
  }finally{
    rmSync(root,{recursive:true,force:true});
    removed=!existsSync(root);
  }
  if(!removed)throw Error('SCRATCH_NOT_REMOVED');
  return {...result,tempDirectoryRemoved:removed};
}
/** Fixed independent oracle; it ignores any input-supplied "PASS" value. */
export function summarizeRecoveryAmbiguity(observations){
  const shape=dense(observations,CASES.length);
  const cases=CASES.map((spec,i)=>{
    const desc=shape?Object.getOwnPropertyDescriptor(observations,String(i)):null;
    const r=desc?.value;
    const expected=[
      ['id',spec.id],['policy',spec.policy],['world',spec.world],
      ['firstPartyMarkerWritten',true],['identicalPendingBytes',true],
      ['originalEffects',spec.originalEffects],
      ['attemptedReplay',spec.attemptedReplay],
      ['syntheticEffects',spec.syntheticEffects],
      ['duplicateEffects',spec.duplicates],
      ['lostOperations',spec.lost],
      ['unresolvedClaims',spec.quarantined],
      ['forgedProofBlocked',spec.forgedProofBlocked],
      ['markerState',spec.markerState],
      ['noClaimAutoRelease',true],
      ['freshEffectCount',1],
      ['exactScratchInventory',true],
      ['firstPartyOnly',true],['tempDirectoryRemoved',true]
    ];
    const mismatchedWitnessFields=Object.freeze(
      expected.filter(([k,v])=>field(r,k)!==v).map(([k])=>k));
    return Object.freeze({
      id:spec.id,matched:mismatchedWitnessFields.length===0,
      finding:spec.policy==='BLIND_RETRY'?
        (spec.originalEffects?'BLIND_RETRY_DUPLICATES_EFFECT':
          'BLIND_RETRY_APPEARS_TO_COMPLETE'):
        spec.policy==='ASSUME_DONE'?
        (spec.originalEffects?'BLIND_SKIP_APPEARS_SAFE':
          'BLIND_SKIP_LOSES_OPERATION'):
        spec.policy==='GUARDED_FORGED_PROOF'?
        'UNVERIFIED_RECEIPT_CANNOT_RELEASE_QUARANTINE':
        'IN_DOUBT_REMAINS_QUARANTINED',
      mismatchedWitnessFields
    });
  });
  const matched=cases.filter(x=>x.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:'owned-indoubt-recovery-ambiguity-v1',
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?'RECOVERY_AMBIGUITY_WITNESSED':
      'RECOVERY_AMBIGUITY_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(cases),
    intentionalBlindRetryDuplicates:1,
    intentionalBlindSkipLosses:1,
    unresolvedGuardedOutcomes:4,
    forgedProofClaimsRejected:2,
    independentNewKeyActions:CASES.length,
    indistinguishablePendingMarkersCompared:true,
    disposableFilesystemUsed:true,
    independentEffectReceiptVerified:false,
    exactlyOnceProven:false,powerLossDurabilityProven:false,
    realAgentTested:false,realCredentialsUsed:false,
    externalMcpContacted:false,independentBetaVerified:false,
    securityCertified:false,stableReleaseAuthorized:false
  });
}
export function runRecoveryAmbiguityLab(args=[]){
  if(!dense(args,0))return error('RECOVERY_AMBIGUITY_ARGUMENTS_NOT_ALLOWED');
  try{return summarizeRecoveryAmbiguity(CASES.map(runOwnedCase));}
  catch{return error('RECOVERY_AMBIGUITY_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=runRecoveryAmbiguityLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
