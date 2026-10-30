#!/usr/bin/env node
/**
 * M31: independent parent OS reads beat a child's result claim, but do
 * not attest a real business effect. Fixed disposable first-party cases.
 */
import {fork} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync,readdirSync,lstatSync,
  readFileSync,unlinkSync,openSync,writeSync,fsyncSync,closeSync}
  from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PROFILE='owned-os-effect-witness-v1';
const WORKER=fileURLToPath(new URL('./m31-os-effect-worker.mjs',import.meta.url));
const PREFIX='m31-owned-effect-';
const TIMEOUT_MS=9000;
const PRIMARY='FICTIONAL-M31-MARKER-PRIMARY-V1\n';
const REWRITE='FICTIONAL-M31-MARKER-REWRITTEN-V1\n';
const CASES=Object.freeze([
  Object.freeze({id:'TRUTHFUL_COMMITTED',claim:'COMMITTED',
    first:'PRIMARY',second:'PRIMARY',drift:false,lost:0,duplicate:0}),
  Object.freeze({id:'FALSE_COMMITTED_NO_MARKER',claim:'COMMITTED',
    first:'ABSENT',second:'ABSENT',drift:false,lost:1,duplicate:0}),
  Object.freeze({id:'FALSE_ABSENT_WITH_MARKER',claim:'ABSENT',
    first:'PRIMARY',second:'PRIMARY',drift:false,lost:0,duplicate:1}),
  Object.freeze({id:'TRUTHFUL_ABSENT',claim:'ABSENT',
    first:'ABSENT',second:'ABSENT',drift:false,lost:0,duplicate:0}),
  Object.freeze({id:'CORRUPTED_MARKER',claim:'COMMITTED',
    first:'CORRUPT',second:'CORRUPT',drift:false,lost:0,duplicate:0}),
  Object.freeze({id:'REMOVED_BETWEEN_READS',claim:'COMMITTED',
    first:'PRIMARY',second:'ABSENT',drift:true,lost:0,duplicate:0}),
  Object.freeze({id:'REWRITTEN_BETWEEN_READS',claim:'COMMITTED',
    first:'PRIMARY',second:'REWRITTEN',drift:true,lost:0,duplicate:0})
]);
const has=(value,key)=>Object.hasOwn(value,key);
function props(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
      Object.getPrototypeOf(value)!==Object.prototype)return null;
  return Object.getOwnPropertyDescriptors(value);
}
function field(value,key){
  const descriptor=props(value)?.[key];
  return descriptor?.enumerable&&has(descriptor,'value')?
    descriptor.value:undefined;
}
function dense(value,count){
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==
      Array.prototype||value.length!==count)return false;
  const descriptors=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).length===count+1&&
    descriptors.length?.value===count&&
    Array.from({length:count},(_,i)=>descriptors[String(i)])
      .every(d=>d?.enumerable&&has(d,'value'));
}
const invalid=(ruleCode)=>Object.freeze({
  reportSchemaVersion:1,profile:PROFILE,status:'ERROR',
  exitCode:2,ruleCode,actualOwnedOsProcessesVerified:false,
  externalBusinessEffectProven:false,exactlyOnceProven:false,
  realAgentTested:false,externalMcpContacted:false,
  realCredentialsUsed:false,securityCertified:false
});
function diskSnapshot(root){
  const list=readdirSync(root);
  if(list.length===0)return 'ABSENT';
  if(list.length!==1||list[0]!=='effect.marker')return 'ANOMALY';
  const path=join(root,'effect.marker');
  const info=lstatSync(path);
  if(!info.isFile()||info.isSymbolicLink()||info.size>128)
    return 'ANOMALY';
  const bytes=readFileSync(path);
  if(bytes.length!==info.size)return 'ANOMALY';
  if(bytes.equals(Buffer.from(PRIMARY)))return 'PRIMARY';
  if(bytes.equals(Buffer.from(REWRITE)))return 'REWRITTEN';
  return 'CORRUPT';
}
function rewrite(root){
  const path=join(root,'effect.marker');
  unlinkSync(path);
  const bytes=Buffer.from(REWRITE);
  const fd=openSync(path,'wx',0o600);
  try{
    if(writeSync(fd,bytes)!==bytes.length)throw Error('SHORT_WRITE');
    fsyncSync(fd);
  }finally{closeSync(fd);}
}
function startOwned(root,id){
  const child=fork(WORKER,['--owned-m31-worker',id],{
    execArgv:[],windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],
    env:{
      M31_OWNED_WORKER:'SOURCE_ONLY',M31_OWNED_DIR:root,
      NODE_OPTIONS:'',PATH:process.env.PATH??'',
      SystemRoot:process.env.SystemRoot??'',
      WINDIR:process.env.WINDIR??'',
      TEMP:process.env.TEMP??'',TMP:process.env.TMP??'',
      TMPDIR:process.env.TMPDIR??''
    }
  });
  const worker={child,inbox:[],waiting:[],ended:null,exit:null};
  worker.exit=new Promise(accept=>{
    child.once('exit',(code,signal)=>{
      worker.ended={code,signal};
      for(const pending of worker.waiting.splice(0)){
        clearTimeout(pending.timer);
        pending.reject(Error('WORKER_EXITED'));
      }
      accept(worker.ended);
    });
  });
  child.on('error',()=>{});
  child.on('message',message=>{
    const type=field(message,'type');
    const index=worker.waiting.findIndex(w=>w.type===type);
    if(index<0){worker.inbox.push(message);return;}
    const pending=worker.waiting.splice(index,1)[0];
    clearTimeout(pending.timer);
    pending.resolve(message);
  });
  return worker;
}
function wait(worker,type){
  return new Promise((accept,reject)=>{
    const index=worker.inbox.findIndex(msg=>field(msg,'type')===type);
    if(index>=0){accept(worker.inbox.splice(index,1)[0]);return;}
    if(worker.ended){reject(Error('WORKER_ALREADY_ENDED'));return;}
    const pending={type,resolve:accept,reject,timer:null};
    pending.timer=setTimeout(()=>{
      const at=worker.waiting.indexOf(pending);
      if(at>=0)worker.waiting.splice(at,1);
      reject(Error('FIXED_WORKER_DEADLINE'));
    },TIMEOUT_MS);
    worker.waiting.push(pending);
  });
}
async function bounded(promise){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Error('FIXED_EXIT_DEADLINE')),TIMEOUT_MS);
  })]);}finally{clearTimeout(timer);}
}
async function sendAndWait(worker,type,expected){
  const response=wait(worker,expected);
  if(!worker.child.connected)throw Error('WORKER_IPC_CLOSED');
  worker.child.send({type});
  const message=await response;
  if(field(message,'type')!==expected)throw Error('INVALID_IPC_RESPONSE');
  return message;
}
async function runCase(spec){
  const root=mkdtempSync(join(tmpdir(),PREFIX));
  let worker=null,result=null,removed=false;
  try{
    worker=startOwned(root,spec.id);
    const started=Number.isSafeInteger(worker.child.pid)&&
      worker.child.pid>0&&worker.child.pid!==process.pid;
    const ready=await wait(worker,'READY');
    if(field(ready,'type')!=='READY'||!started)
      throw Error('UNEXPECTED_WORKER');
    const reply=await sendAndWait(worker,'RUN','RESULT');
    const claim=field(reply,'claim');
    if(claim!=='COMMITTED'&&claim!=='ABSENT')
      throw Error('INVALID_CLAIM');
    await sendAndWait(worker,'CLOSE','CLOSED');
    const exit=await bounded(worker.exit);
    const clean=exit.code===0&&exit.signal===null;
    if(!clean)throw Error('UNCLEAN_WORKER_EXIT');
    // The parent reads the actual filesystem AFTER the child has exited.
    // Neither claimed status nor any child-provided evidence bit is trusted.
    const first=diskSnapshot(root);
    const driftApplied=spec.id==='REMOVED_BETWEEN_READS'||
      spec.id==='REWRITTEN_BETWEEN_READS';
    if(spec.id==='REMOVED_BETWEEN_READS')
      unlinkSync(join(root,'effect.marker'));
    if(spec.id==='REWRITTEN_BETWEEN_READS')rewrite(root);
    const second=diskSnapshot(root);
    const claimsMatch=(claim==='COMMITTED'&&first==='PRIMARY')||
      (claim==='ABSENT'&&first==='ABSENT');
    result={
      id:spec.id,workerStarted:true,workerDifferentFromParent:started,
      childProcessExitedCleanly:clean,workerClaim:claim,
      firstParentDiskState:first,secondParentDiskState:second,
      claimMatchesFirstRead:claimsMatch,driftControlApplied:driftApplied,
      driftObserved:first!==second,
      unsafeClaimOnlyLost:claim==='COMMITTED'&&first==='ABSENT'?1:0,
      unsafeClaimOnlyDuplicate:claim==='ABSENT'&&first==='PRIMARY'?1:0,
      firstPartyRealOsScratchUsed:true,parentReadIndependentOfIpc:true,
      guardedDisposition:'QUARANTINE',guardedTransitions:0,
      externalBusinessEffectProven:false,
      noUserFilesOrExternalTargetsAccessed:true
    };
  }finally{
    if(worker&&!worker.ended){
      worker.child.kill('SIGKILL');
      await bounded(worker.exit).catch(()=>{});
    }
    rmSync(root,{recursive:true,force:true});
    removed=!existsSync(root);
  }
  if(!removed||!result)throw Error('SCRATCH_CLEANUP_FAILED');
  return {...result,scratchRemoved:true};
}
const expectedFor=spec=>{
  const claimsMatch=(spec.claim==='COMMITTED'&&spec.first==='PRIMARY')||
    (spec.claim==='ABSENT'&&spec.first==='ABSENT');
  return [
    ['id',spec.id],['workerStarted',true],
    ['workerDifferentFromParent',true],
    ['childProcessExitedCleanly',true],['workerClaim',spec.claim],
    ['firstParentDiskState',spec.first],
    ['secondParentDiskState',spec.second],
    ['claimMatchesFirstRead',claimsMatch],
    ['driftControlApplied',spec.drift],['driftObserved',spec.drift],
    ['unsafeClaimOnlyLost',spec.lost],
    ['unsafeClaimOnlyDuplicate',spec.duplicate],
    ['firstPartyRealOsScratchUsed',true],
    ['parentReadIndependentOfIpc',true],
    ['guardedDisposition','QUARANTINE'],
    ['guardedTransitions',0],
    ['externalBusinessEffectProven',false],
    ['noUserFilesOrExternalTargetsAccessed',true],
    ['scratchRemoved',true]
  ];
};
export function summarizeOsEffectWitness(observations){
  const validShape=dense(observations,CASES.length);
  const cases=CASES.map((spec,index)=>{
    const descriptor=validShape?
      Object.getOwnPropertyDescriptor(observations,String(index)):null;
    const row=descriptor?.enumerable&&has(descriptor,'value')?
      descriptor.value:null;
    const mismatches=Object.freeze(expectedFor(spec)
      .filter(([key,value])=>field(row,key)!==value)
      .map(([key])=>key));
    return Object.freeze({
      id:spec.id,matched:mismatches.length===0,
      finding:spec.lost?'FALSE_CLAIM_WOULD_LOSE_UNFINISHED_WORK':
        spec.duplicate?'FALSE_CLAIM_WOULD_DUPLICATE_FINISHED_WORK':
        spec.drift?'LOCAL_EVIDENCE_CHANGED_BETWEEN_READS':
        spec.first==='CORRUPT'?'CORRUPTED_LOCAL_MARKER_NOT_PROOF':
        'LOCAL_DISK_STATE_OBSERVED_NOT_EXTERNAL_EFFECT',
      mismatchedWitnessFields:mismatches
    });
  });
  const matched=cases.filter(row=>row.matched).length;
  const pass=validShape&&matched===CASES.length;
  return Object.freeze({
    reportSchemaVersion:1,profile:PROFILE,
    status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:pass?'M31_PARENT_DISK_LIMITS_WITNESSED':
      'M31_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(cases),
    deceptiveClaimCases:2,changedDiskEvidenceCases:2,
    hypotheticalUnsafeLostOperations:1,
    hypotheticalUnsafeDuplicateEffects:1,
    guardedCasesQuarantined:CASES.length,
    actualOwnedOsProcessesVerified:pass,
    externalBusinessEffectProven:false,
    exactlyOnceProven:false,powerLossDurabilityProven:false,
    independentlyAuthenticatedObserver:false,
    realAgentTested:false,externalMcpContacted:false,
    realCredentialsUsed:false,independentBetaVerified:false,
    securityCertified:false,stableReleaseAuthorized:false
  });
}
export async function runOsEffectLab(args=[]){
  if(!dense(args,0))return invalid('M31_ARGUMENTS_NOT_ALLOWED');
  try{
    const rows=[];
    for(const spec of CASES)rows.push(await runCase(spec));
    return summarizeOsEffectWitness(rows);
  }catch{return invalid('M31_OWNED_OS_CASE_FAILED');}
}
if(process.argv[1]&&
    resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runOsEffectLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report)+'\n');
  process.exitCode=report.exitCode;
}
