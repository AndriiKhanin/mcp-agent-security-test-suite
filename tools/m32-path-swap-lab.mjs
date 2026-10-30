#!/usr/bin/env node
/**
 * M32: a deterministic first-party path-swap between parent lstat and
 * later read. This is not secure filesystem attestation or effect proof.
 */
import {fork} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync,readdirSync,lstatSync,
  readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const WORKER=fileURLToPath(new URL('./m32-path-swap-worker.mjs',import.meta.url));
const PROFILE='owned-deterministic-path-swap-v1';
const TIMEOUT=9000;
const FIRST=Buffer.from('FICTIONAL-M32-MARKER-ALPHA\n');
const SECOND=Buffer.from('FICTIONAL-M32-MARKER-BRAVO\n');
const SCENARIOS=Object.freeze([
  Object.freeze({id:'STABLE_MARKER',first:'PRIMARY',later:'PRIMARY',
    before:true,after:true,sizeOnly:true,sameSizeChanged:false,drift:false}),
  Object.freeze({id:'SWAP_SAME_SIZE',first:'PRIMARY',later:'SWAPPED',
    before:true,after:true,sizeOnly:true,sameSizeChanged:true,drift:true}),
  Object.freeze({id:'REMOVE_AFTER_STAT',first:'PRIMARY',later:'ABSENT',
    before:true,after:false,sizeOnly:false,sameSizeChanged:false,drift:true}),
  Object.freeze({id:'CREATE_AFTER_ABSENCE',first:'ABSENT',later:'PRIMARY',
    before:false,after:true,sizeOnly:false,sameSizeChanged:false,drift:true}),
  Object.freeze({id:'REPLACE_CORRUPT',first:'PRIMARY',later:'CORRUPT',
    before:true,after:true,sizeOnly:false,sameSizeChanged:false,drift:true}),
  Object.freeze({id:'REPLACE_OVERSIZE',first:'PRIMARY',later:'ANOMALY',
    before:true,after:true,sizeOnly:false,sameSizeChanged:false,drift:true}),
  Object.freeze({id:'ADD_FOREIGN_ENTRY',first:'PRIMARY',later:'ANOMALY',
    before:true,after:true,sizeOnly:true,sameSizeChanged:false,drift:true}),
  Object.freeze({id:'STABLE_ABSENT',first:'ABSENT',later:'ABSENT',
    before:false,after:false,sizeOnly:false,sameSizeChanged:false,drift:false})
]);
const own=(x,key)=>Object.hasOwn(x,key);
function props(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
      Object.getPrototypeOf(value)!==Object.prototype)return null;
  return Object.getOwnPropertyDescriptors(value);
}
function field(value,key){
  const d=props(value)?.[key];
  return d?.enumerable&&own(d,'value')?d.value:undefined;
}
function dense(arr,n){
  if(!Array.isArray(arr)||Object.getPrototypeOf(arr)!==Array.prototype||
      arr.length!==n)return false;
  const props=Object.getOwnPropertyDescriptors(arr);
  return Reflect.ownKeys(props).length===n+1&&
    props.length?.value===n&&
    Array.from({length:n},(_,i)=>props[String(i)])
      .every(d=>d?.enumerable&&own(d,'value'));
}
const reject=ruleCode=>Object.freeze({
  reportSchemaVersion:1,profile:PROFILE,status:'ERROR',exitCode:2,
  ruleCode,actualSourceOwnedOsRaceVerified:false,
  independentlyAttestedEffect:false,exactlyOnceProven:false,
  realAgentTested:false,externalMcpContacted:false,
  securityCertified:false
});
function markerSize(root){
  try{return lstatSync(join(root,'effect.marker')).size;}
  catch(e){if(e?.code==='ENOENT')return null;throw e;}
}
function snapshot(root){
  const names=readdirSync(root);
  if(names.length===0)return 'ABSENT';
  if(names.length!==1||names[0]!=='effect.marker')
    return 'ANOMALY';
  const path=join(root,'effect.marker');
  const info=lstatSync(path);
  if(!info.isFile()||info.isSymbolicLink()||info.size>128)
    return 'ANOMALY';
  const bytes=readFileSync(path);
  if(bytes.length!==info.size)return 'ANOMALY';
  if(bytes.equals(FIRST))return 'PRIMARY';
  if(bytes.equals(SECOND))return 'SWAPPED';
  return 'CORRUPT';
}
function workerIn(root,id){
  const child=fork(WORKER,['--m32-owned',id],{
    execArgv:[],windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],
    env:{
      M32_OWNED_CHILD:'FIXED_LAB',M32_OWNED_ROOT:root,
      NODE_OPTIONS:'',PATH:process.env.PATH??'',
      SystemRoot:process.env.SystemRoot??'',
      WINDIR:process.env.WINDIR??'',
      TEMP:process.env.TEMP??'',TMP:process.env.TMP??'',
      TMPDIR:process.env.TMPDIR??''
    }
  });
  const w={child,queue:[],pending:[],ended:null,exit:null};
  w.exit=new Promise(accept=>{
    child.once('exit',(code,signal)=>{
      w.ended={code,signal};
      for(const entry of w.pending.splice(0)){
        clearTimeout(entry.timer);entry.reject(Error('CHILD_EXIT'));
      }
      accept(w.ended);
    });
  });
  child.on('error',()=>{});
  child.on('message',message=>{
    const type=field(message,'type');
    const idx=w.pending.findIndex(p=>p.type===type);
    if(idx<0){w.queue.push(message);return;}
    const pending=w.pending.splice(idx,1)[0];
    clearTimeout(pending.timer);pending.resolve(message);
  });
  return w;
}
function wait(w,type){
  return new Promise((resolveWait,reject)=>{
    const idx=w.queue.findIndex(m=>field(m,'type')===type);
    if(idx>=0){resolveWait(w.queue.splice(idx,1)[0]);return;}
    if(w.ended){reject(Error('CHILD_CLOSED'));return;}
    const entry={type,resolve:resolveWait,reject,timer:null};
    entry.timer=setTimeout(()=>{
      const i=w.pending.indexOf(entry);
      if(i>=0)w.pending.splice(i,1);
      reject(Error('CHILD_TIMEOUT'));
    },TIMEOUT);
    w.pending.push(entry);
  });
}
async function bounded(promise){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Error('EXIT_TIMEOUT')),TIMEOUT);
  })]);}finally{clearTimeout(timer);}
}
async function message(w,type,reply){
  const response=wait(w,reply);
  if(!w.child.connected)throw Error('IPC_DISCONNECTED');
  w.child.send({type});
  const received=await response;
  if(field(received,'type')!==reply)throw Error('BAD_IPC_REPLY');
}
async function scenario(spec){
  const root=mkdtempSync(join(tmpdir(),'m32-owned-path-'));
  let worker=null,result=null;
  try{
    worker=workerIn(root,spec.id);
    const differentProcess=Number.isInteger(worker.child.pid)&&
      worker.child.pid>0&&worker.child.pid!==process.pid;
    const ready=await wait(worker,'READY');
    if(!differentProcess||field(ready,'type')!=='READY')
      throw Error('CHILD_NOT_READY');
    await message(worker,'START','STARTED');
    const firstParentState=snapshot(root);
    // Stage the potentially stale lstat observation before the child
    // deterministically swaps the actual path behind the barrier.
    const preSize=markerSize(root);
    await message(worker,'MUTATE','MUTATED');
    await message(worker,'CLOSE','CLOSED');
    const exit=await bounded(worker.exit);
    const cleanExit=exit.code===0&&exit.signal===null;
    if(!cleanExit)throw Error('CHILD_NOT_CLOSED');
    // This read is strictly AFTER the mutation and confirmed OS exit.
    const laterParentState=snapshot(root);
    const postSize=markerSize(root);
    const prePresent=preSize!==null,postPresent=postSize!==null;
    result={
      id:spec.id,workerDifferentFromParent:differentProcess,
      cleanWorkerExit:cleanExit,startedAndMutatedViaIpcBarrier:true,
      parentReadAfterWorkerExit:true,
      firstParentState,laterParentState,
      preMetadataPresent:prePresent,postMetadataPresent:postPresent,
      sizeOnlyWouldAccept:prePresent&&postPresent&&preSize===postSize,
      sameSizeChangedBytes:preSize!==null&&preSize===postSize&&
        firstParentState==='PRIMARY'&&laterParentState==='SWAPPED',
      snapshotDriftObserved:firstParentState!==laterParentState,
      sourceOwnedTempFilesystemOnly:true,
      guardedDisposition:'QUARANTINE',guardedTransitions:0,
      independentlyAttestedEffect:false,
      noExternalTargetsOrUserPaths:true
    };
  }finally{
    if(worker&&!worker.ended){
      worker.child.kill('SIGKILL');
      await bounded(worker.exit).catch(()=>{});
    }
    rmSync(root,{recursive:true,force:true});
    if(existsSync(root))throw Error('SCRATCH_NOT_REMOVED');
  }
  return {...result,scratchRemoved:true};
}
function expected(spec){
  return [
    ['id',spec.id],['workerDifferentFromParent',true],
    ['cleanWorkerExit',true],['startedAndMutatedViaIpcBarrier',true],
    ['parentReadAfterWorkerExit',true],
    ['firstParentState',spec.first],
    ['laterParentState',spec.later],
    ['preMetadataPresent',spec.before],
    ['postMetadataPresent',spec.after],
    ['sizeOnlyWouldAccept',spec.sizeOnly],
    ['sameSizeChangedBytes',spec.sameSizeChanged],
    ['snapshotDriftObserved',spec.drift],
    ['sourceOwnedTempFilesystemOnly',true],
    ['guardedDisposition','QUARANTINE'],['guardedTransitions',0],
    ['independentlyAttestedEffect',false],
    ['noExternalTargetsOrUserPaths',true],['scratchRemoved',true]
  ];
}
export function summarizePathSwap(rows){
  const valid=dense(rows,SCENARIOS.length);
  const cases=SCENARIOS.map((spec,index)=>{
    const entry=valid?Object.getOwnPropertyDescriptor(rows,String(index)):null;
    const row=entry?.enumerable&&own(entry,'value')?entry.value:null;
    const mismatchedWitnessFields=Object.freeze(expected(spec)
      .filter(([key,value])=>field(row,key)!==value)
      .map(([key])=>key));
    return Object.freeze({
      id:spec.id,matched:mismatchedWitnessFields.length===0,
      finding:spec.sameSizeChanged?'SIZE_ONLY_CHECK_MISSES_CONTENT_SWAP':
        spec.drift?'OWNED_PATH_STATE_CHANGED_OR_INVALID':
        'STABLE_LOCAL_STATE_NOT_EXTERNAL_EFFECT_PROOF',
      mismatchedWitnessFields
    });
  });
  const matched=cases.filter(c=>c.matched).length;
  const pass=valid&&matched===SCENARIOS.length;
  return Object.freeze({
    reportSchemaVersion:1,profile:PROFILE,
    status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:pass?'M32_DISPOSABLE_TOCTOU_WITNESSED':
      'M32_TOCTOU_WITNESS_MISMATCH',
    checked:SCENARIOS.length,matched,failed:SCENARIOS.length-matched,
    cases:Object.freeze(cases),
    sizeOnlyFalseConfidenceCases:1,
    changedOrInvalidEvidenceCases:6,
    guardedCasesQuarantined:SCENARIOS.length,
    actualSourceOwnedOsRaceVerified:pass,
    independentlyAttestedEffect:false,exactlyOnceProven:false,
    powerLossDurabilityProven:false,realAgentTested:false,
    externalMcpContacted:false,realCredentialsUsed:false,
    independentBetaVerified:false,securityCertified:false,
    stableReleaseAuthorized:false
  });
}
export async function runPathSwapLab(args=[]){
  if(!dense(args,0))return reject('M32_ARGUMENTS_NOT_ALLOWED');
  try{
    const rows=[];
    for(const spec of SCENARIOS)rows.push(await scenario(spec));
    return summarizePathSwap(rows);
  }catch{return reject('M32_FIXED_OS_LAB_FAILED');}
}
if(process.argv[1]&&
    resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runPathSwapLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report)+'\n');
  process.exitCode=report.exitCode;
}
