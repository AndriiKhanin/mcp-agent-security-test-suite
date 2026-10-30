#!/usr/bin/env node
/**
 * M31: first-party disposable OS-file effect readback against deceptive
 * child "committed/absent" claims. Real files ONLY in new mkdtemp scratch.
 * A validated local marker is NOT external business-effect provenance.
 */
import {fork} from 'node:child_process';
import {existsSync,lstatSync,mkdtempSync,readFileSync,readdirSync,rmSync}
  from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT_PREFIX='m31-owned-effect-';
const WORKER=fileURLToPath(new URL('./m31-owned-effect-worker.mjs',
  import.meta.url));
const MARKER='effect.marker';
const EFFECT='M31-FICTIONAL-COMMITTED-EFFECT-V1\n';
const DEADLINE=9000;
const PROFILE='owned-os-effect-readback-v1';
const CASES=Object.freeze([
  Object.freeze({id:'TRUTHFUL_COMMITTED',action:'COMMIT',
    claim:'COMMITTED',first:'VALID',second:'VALID',
    firstClaimMatches:true,secondClaimMatches:true,drift:false,
    lost:0,duplicate:0,mutate:null}),
  Object.freeze({id:'DECEPTIVE_COMMITTED_NO_EFFECT',action:'NOOP',
    claim:'COMMITTED',first:'ABSENT',second:'ABSENT',
    firstClaimMatches:false,secondClaimMatches:false,drift:false,
    lost:1,duplicate:0,mutate:null}),
  Object.freeze({id:'DECEPTIVE_ABSENT_REAL_EFFECT',action:'COMMIT',
    claim:'ABSENT',first:'VALID',second:'VALID',
    firstClaimMatches:false,secondClaimMatches:false,drift:false,
    lost:0,duplicate:1,mutate:null}),
  Object.freeze({id:'TRUTHFUL_ABSENT',action:'NOOP',
    claim:'ABSENT',first:'ABSENT',second:'ABSENT',
    firstClaimMatches:true,secondClaimMatches:true,drift:false,
    lost:0,duplicate:0,mutate:null}),
  Object.freeze({id:'MALFORMED_MARKER',action:'CORRUPT',
    claim:'COMMITTED',first:'INVALID',second:'INVALID',
    firstClaimMatches:false,secondClaimMatches:false,drift:false,
    lost:0,duplicate:0,mutate:null}),
  Object.freeze({id:'MARKER_REMOVED_AFTER_READ',action:'COMMIT',
    claim:'COMMITTED',first:'VALID',second:'ABSENT',
    firstClaimMatches:true,secondClaimMatches:false,drift:true,
    lost:0,duplicate:0,mutate:'REMOVE'}),
  Object.freeze({id:'MARKER_REWRITTEN_AFTER_READ',action:'COMMIT',
    claim:'COMMITTED',first:'VALID',second:'INVALID',
    firstClaimMatches:true,secondClaimMatches:false,drift:true,
    lost:0,duplicate:0,mutate:'REWRITE'})
]);
const own=(obj,key)=>Object.hasOwn(obj,key);
function field(obj,key){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
     Object.getPrototypeOf(obj)!==Object.prototype)return undefined;
  const descriptor=Object.getOwnPropertyDescriptor(obj,key);
  return descriptor?.enumerable&&own(descriptor,'value')?
    descriptor.value:undefined;
}
function dense(items,size){
  if(!Array.isArray(items)||Object.getPrototypeOf(items)!==
     Array.prototype||items.length!==size)return false;
  const d=Object.getOwnPropertyDescriptors(items);
  return Reflect.ownKeys(d).length===size+1&&d.length?.value===size&&
    Array.from({length:size},(_,i)=>d[String(i)]).every(
      x=>x?.enumerable&&own(x,'value'));
}
const invalidReport=ruleCode=>Object.freeze({
  reportSchemaVersion:1,profile:PROFILE,status:'ERROR',exitCode:2,
  ruleCode,actualDisposableWorkerVerified:false,
  realBusinessEffectProven:false,externalMcpContacted:false,
  realAgentTested:false,independentBetaVerified:false,
  securityCertified:false
});
const environment=root=>({
  M31_WORKER_SOURCE:'M31-DISPOSABLE-IPC-ONLY',
  M31_OWNED_SCRATCH:root,
  NODE_OPTIONS:'',PATH:process.env.PATH??'',
  SystemRoot:process.env.SystemRoot??'',
  TEMP:process.env.TEMP??'',TMP:process.env.TMP??'',
  TMPDIR:process.env.TMPDIR??''
});
function spawnWorker(root){
  const child=fork(WORKER,['--owned-effect-worker'],{
    stdio:['ignore','ignore','ignore','ipc'],
    windowsHide:true,execArgv:[],env:environment(root)
  });
  const state={child,received:[],waiting:[],exit:null,exitPromise:null};
  state.exitPromise=new Promise(done=>{
    child.once('exit',(code,signal)=>{
      state.exit={code,signal};
      for(const waiter of state.waiting.splice(0)){
        clearTimeout(waiter.timer);waiter.reject(Error('CHILD_EXITED'));
      }
      done(state.exit);
    });
  });
  child.on('error',()=>{});
  child.on('message',msg=>{
    const type=msg?.type;
    const idx=state.waiting.findIndex(w=>w.type===type);
    if(idx>=0){
      const waiter=state.waiting.splice(idx,1)[0];
      clearTimeout(waiter.timer);waiter.resolve(msg);
    }else state.received.push(msg);
  });
  return state;
}
function wait(w,type){
  return new Promise((done,fail)=>{
    const idx=w.received.findIndex(msg=>msg?.type===type);
    if(idx>=0){done(w.received.splice(idx,1)[0]);return;}
    if(w.exit){fail(Error('CHILD_ALREADY_EXITED'));return;}
    const waiter={type,resolve:done,reject:fail,timer:null};
    waiter.timer=setTimeout(()=>{
      const pos=w.waiting.indexOf(waiter);
      if(pos>=0)w.waiting.splice(pos,1);
      fail(Error('FIXED_CHILD_DEADLINE'));
    },DEADLINE);
    w.waiting.push(waiter);
  });
}
async function bounded(promise){
  let timer;
  try{
    return await Promise.race([
      promise,new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(Error('FIXED_EXIT_DEADLINE')),DEADLINE);
      })
    ]);
  }finally{clearTimeout(timer);}
}
async function exchange(w,request,type){
  const awaited=wait(w,type);
  if(!w.child.connected)throw Error('CHILD_IPC_DISCONNECTED');
  w.child.send(request);
  const reply=await awaited;
  if(reply?.type!==type)throw Error('UNEXPECTED_CHILD_REPLY');
  return reply;
}
async function close(w){
  if(w.exit)return w.exit.code===0&&w.exit.signal===null;
  await exchange(w,{type:'CLOSE'},'CLOSED');
  const exit=await bounded(w.exitPromise);
  return exit.code===0&&exit.signal===null;
}
/**
 * The observation is computed by the parent reading actual OS bytes.
 * This method does not consume worker claims, IPC effect counts or
 * claimed success. Any extra file, symlink, oversized or unexpected
 * content yields INVALID, not a proof of committed effect.
 */
function observeOwnedDisk(root){
  const entries=readdirSync(root);
  if(entries.length===0)return 'ABSENT';
  if(entries.length!==1||entries[0]!==MARKER)return 'INVALID';
  const path=join(root,MARKER);
  const stat=lstatSync(path);
  if(!stat.isFile()||stat.isSymbolicLink()||
      stat.size!==Buffer.byteLength(EFFECT))return 'INVALID';
  const value=readFileSync(path);
  return value.equals(Buffer.from(EFFECT))?'VALID':'INVALID';
}
const claimMatches=(claim,disk)=>claim==='COMMITTED'?disk==='VALID':
  disk==='ABSENT';
async function runScenario(spec){
  const root=mkdtempSync(join(tmpdir(),ROOT_PREFIX));
  let worker=null,removed=false,observation;
  try{
    worker=spawnWorker(root);
    const ready=await wait(worker,'READY');
    const workerStarted=ready.type==='READY'&&
      Number.isSafeInteger(worker.child.pid)&&worker.child.pid>0;
    const differentProcess=worker.child.pid!==process.pid;
    const actionAck=(await exchange(worker,{
      type:'ACTION',action:spec.action},'ACTION_ACK')).type==='ACTION_ACK';
    const first=observeOwnedDisk(root);
    let mutationAck=false;
    if(spec.mutate){
      mutationAck=(await exchange(worker,{
        type:'MUTATE',action:spec.mutate},'MUTATE_ACK')).type==='MUTATE_ACK';
    }
    const second=observeOwnedDisk(root);
    const cleanExit=await close(worker);
    observation={
      id:spec.id,claim:spec.claim,workerStarted,differentProcess,
      actionAck,mutationAck,firstReadback:first,secondReadback:second,
      firstClaimMatches:claimMatches(spec.claim,first),
      secondClaimMatches:claimMatches(spec.claim,second),
      readbackDrift:first!==second,
      hypotheticalClaimOnlyLost:spec.claim==='COMMITTED'&&
        first==='ABSENT'?1:0,
      hypotheticalClaimOnlyDuplicate:spec.claim==='ABSENT'&&
        first==='VALID'?1:0,
      guardedDisposition:'QUARANTINE',guardedTransitions:0,
      cleanExit,sourceOwnedOnly:true
    };
  }finally{
    if(worker&&!worker.exit){
      try{worker.child.kill('SIGKILL');}catch{}
      await bounded(worker.exitPromise).catch(()=>{});
    }
    rmSync(root,{recursive:true,force:true});
    removed=!existsSync(root);
  }
  if(!removed)throw Error('SCRATCH_NOT_REMOVED');
  return {...observation,temporaryDirectoryRemoved:removed};
}
function expectedFields(spec){
  return [
    ['id',spec.id],['claim',spec.claim],
    ['workerStarted',true],['differentProcess',true],
    ['actionAck',true],['mutationAck',!!spec.mutate],
    ['firstReadback',spec.first],['secondReadback',spec.second],
    ['firstClaimMatches',spec.firstClaimMatches],
    ['secondClaimMatches',spec.secondClaimMatches],
    ['readbackDrift',spec.drift],
    ['hypotheticalClaimOnlyLost',spec.lost],
    ['hypotheticalClaimOnlyDuplicate',spec.duplicate],
    ['guardedDisposition','QUARANTINE'],['guardedTransitions',0],
    ['cleanExit',true],['sourceOwnedOnly',true],
    ['temporaryDirectoryRemoved',true]
  ];
}
/** Source-fixed oracle rejects forged PASS or fake disk-observer claims. */
export function summarizeOsEffectWitness(rows){
  const shape=dense(rows,CASES.length);
  const cases=CASES.map((spec,i)=>{
    const d=shape?Object.getOwnPropertyDescriptor(rows,String(i)):null;
    const observed=d?.enumerable&&own(d,'value')?d.value:null;
    const mismatched=expectedFields(spec)
      .filter(([key,value])=>field(observed,key)!==value)
      .map(([key])=>key);
    return Object.freeze({
      id:spec.id,matched:mismatched.length===0,
      finding:spec.id==='DECEPTIVE_COMMITTED_NO_EFFECT'?
        'CLAIM_ONLY_RESOLVER_WOULD_LOSE_OPERATION':
        spec.id==='DECEPTIVE_ABSENT_REAL_EFFECT'?
        'CLAIM_ONLY_RETRY_WOULD_DUPLICATE_EFFECT':
        spec.drift?'DOUBLE_OBSERVATION_CHANGED_QUARANTINED':
        spec.id==='MALFORMED_MARKER'?
        'UNRECOGNIZED_LOCAL_BYTES_QUARANTINED':
        'LOCAL_READBACK_NOT_EXTERNAL_PROVENANCE',
      mismatchedWitnessFields:Object.freeze(mismatched)
    });
  });
  const matched=cases.filter(x=>x.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:PROFILE,
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?
      'OWNED_DISPOSABLE_OS_READBACK_DIFFERENTIAL_WITNESSED':
      'OWNED_DISPOSABLE_OS_READBACK_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(cases),
    actualOsWorkersExpected:CASES.length,
    expectedDeceptiveLossCases:1,expectedDeceptiveDuplicateCases:1,
    expectedDriftingReadbacks:2,
    expectedGuardedAutomatedTransitions:0,
    disposableFilesystemUsed:true,
    realBusinessEffectProven:false,
    independentEffectProvenance:false,
    exactlyOnceExternalEffectProven:false,
    realAgentTested:false,externalMcpContacted:false,
    realCredentialsUsed:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
export async function runOsEffectWitness(args=[]){
  if(!dense(args,0))return invalidReport('M31_ARGUMENTS_NOT_ALLOWED');
  try{
    const rows=[];
    for(const spec of CASES)rows.push(await runScenario(spec));
    return summarizeOsEffectWitness(rows);
  }catch{return invalidReport('M31_OS_READBACK_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runOsEffectWitness(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
