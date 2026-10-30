#!/usr/bin/env node
/**
 * M26: actual first-party OS process + disposable on-disk replay key witness.
 * All paths, workers, operation IDs, and failure behaviors are SOURCE OWNED.
 * This performs real disk I/O in a new private temporary test directory.
 * It is NOT a production transaction log or a power-loss durability proof.
 */
import {fork} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync,readdirSync,lstatSync,
  readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const WORKER=fileURLToPath(new URL('./m26-ledger-worker.mjs',import.meta.url));
const PREFIX='m26-owned-ledger-';
const MARKER='FICTIONAL-SPENT-V1\n';
const DEADLINE=6500;
const CASES=Object.freeze([
  Object.freeze({id:'GUARDED_CRASH_REPLAY',kind:'GUARDED_RESTART'}),
  Object.freeze({id:'TRANSIENT_UNSAFE_REPLAY',kind:'UNSAFE_RESTART'}),
  Object.freeze({id:'GUARDED_PARALLEL_CLAIM',kind:'PARALLEL'})
]);
const own=(o,k)=>Object.hasOwn(o,k);
function field(o,k){
  if(!o||typeof o!=='object'||Array.isArray(o)||
     Object.getPrototypeOf(o)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(o,k);
  return d?.enumerable&&own(d,'value')?d.value:undefined;
}
function dense(value,n){
  if(!Array.isArray(value)||
    Object.getPrototypeOf(value)!==Array.prototype||
    value.length!==n)return false;
  const desc=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(desc).length===n+1&&desc.length?.value===n&&
    Array.from({length:n},(_,i)=>desc[String(i)]).every(
      slot=>slot?.enumerable&&own(slot,'value')
    );
}
const errorReport=ruleCode=>Object.freeze({
  reportSchemaVersion:1,profile:'first-party-cross-process-spent-key-v1',
  status:'ERROR',exitCode:2,ruleCode,
  disposableFilesystemUsed:true,
  powerLossDurabilityProven:false,realAgentTested:false,
  realCredentialsUsed:false,externalMcpContacted:false,
  independentBetaVerified:false,securityCertified:false
});
const bounded=async promise=>{
  let timer;
  try{
    return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Error('BOUNDED_TIMEOUT')),DEADLINE);
    })]);
  }finally{clearTimeout(timer);}
};
function spawnOwned(root,policy){
  const child=fork(WORKER,['--fixed-ledger-worker',policy],{
    execArgv:[],windowsHide:true,
    stdio:['ignore','ignore','ignore','ipc'],
    env:{
      M26_OWNED_WORKER:'SOURCE_ONLY_TEST',
      M26_OWNED_LEDGER_DIR:root,
      NODE_OPTIONS:'',
      PATH:process.env.PATH??'',
      SystemRoot:process.env.SystemRoot??''
    }
  });
  const state={
    child,queue:[],waiters:[],effects:[],exit:null,exitPromise:null
  };
  state.exitPromise=new Promise(done=>{
    child.once('exit',(code,signal)=>{
      state.exit={code,signal};
      for(const waiter of state.waiters.splice(0)){
        clearTimeout(waiter.timer);
        waiter.reject(Error('OWNED_CHILD_EXITED'));
      }
      done(state.exit);
    });
  });
  child.on('error',()=>{}); // Never echo process paths/system details.
  child.on('message',msg=>{
    if(msg?.type==='EFFECT')state.effects.push(msg.id);
    const index=state.waiters.findIndex(x=>x.type===msg?.type&&
      (x.id===undefined||x.id===msg?.id));
    if(index>=0){
      const w=state.waiters.splice(index,1)[0];
      clearTimeout(w.timer);w.resolve(msg);
    }else state.queue.push(msg);
  });
  return state;
}
function wait(state,type,id){
  return new Promise((resolveWait,reject)=>{
    const idx=state.queue.findIndex(x=>x?.type===type&&
      (id===undefined||x.id===id));
    if(idx>=0){
      resolveWait(state.queue.splice(idx,1)[0]);return;
    }
    if(state.exit){reject(Error('CHILD_ALREADY_EXITED'));return;}
    const w={type,id,resolve:resolveWait,reject,timer:null};
    w.timer=setTimeout(()=>{
      const position=state.waiters.indexOf(w);
      if(position>=0)state.waiters.splice(position,1);
      reject(Error('CHILD_IPC_TIMEOUT'));
    },DEADLINE);
    state.waiters.push(w);
  });
}
async function sendAndWait(w,request,type,id){
  const pending=wait(w,type,id);
  if(!w.child.connected)throw Error('CHILD_IPC_CLOSED');
  w.child.send(request);
  const answer=await pending;
  if(answer?.type!==type||
     (id!==undefined&&answer.id!==id))
    throw Error('INVALID_OWNED_ACK');
  return answer;
}
async function start(root,policy,workers){
  const w=spawnOwned(root,policy);
  workers.push(w);
  const ready=await bounded(wait(w,'READY'));
  if(ready.policy!==policy||
      !Number.isInteger(w.child.pid)||w.child.pid<1)
    throw Error('OWNED_CHILD_READY_MISMATCH');
  return w;
}
async function prepare(w,id,key){
  const receipt=await sendAndWait(w,
    {type:'PREPARE',id,key},'PREPARED',id);
  return receipt.id===id;
}
async function release(w,id){
  const receipt=await sendAndWait(w,{type:'RELEASE',id},'RESULT',id);
  if(receipt.status!==200&&receipt.status!==409)
    throw Error('INVALID_OWNED_STATUS');
  return receipt.status;
}
async function stop(w,crash){
  if(w.exit)return true;
  if(crash){
    if(!w.child.kill('SIGKILL'))throw Error('OWNED_KILL_REFUSED');
    await bounded(w.exitPromise);
    return !!w.exit;
  }
  await sendAndWait(w,{type:'CLOSE'},'CLOSED');
  const exit=await bounded(w.exitPromise);
  if(exit.code!==0)throw Error('OWNED_NOT_CLEAN');
  return true;
}
function markerNames(root){
  const names=readdirSync(root).sort();
  if(names.some(name=>!['spent-alpha.marker','spent-beta.marker']
      .includes(name)))throw Error('UNEXPECTED_DISPOSABLE_FILE');
  for(const name of names){
    const path=join(root,name);
    const st=lstatSync(path);
    if(!st.isFile()||st.isSymbolicLink()||
       st.size!==Buffer.byteLength(MARKER)||
       readFileSync(path,'utf8')!==MARKER)
      throw Error('DISPOSABLE_MARKER_INVALID');
  }
  return names;
}
/** Own the private scratch directory; kill only children we forked. */
async function inScratch(fn){
  const dir=mkdtempSync(join(tmpdir(),PREFIX));
  const workers=[];
  let observation;
  let closed=false;
  try{observation=await fn(dir,workers);}
  finally{
    for(const w of workers){
      if(!w.exit)await stop(w,true).catch(()=>{});
    }
    rmSync(dir,{recursive:true,force:true});
    closed=!existsSync(dir);
  }
  if(!closed)throw Error('DISPOSABLE_DIR_NOT_REMOVED');
  return {...observation,tempDirectoryRemoved:closed};
}
async function restart(policy){
  return await inScratch(async(root,workers)=>{
    const first=await start(root,policy,workers);
    const firstPrepared=await prepare(first,1,'alpha');
    const initialStatus=await release(first,1);
    const firstEffects=first.effects.length;
    const firstMarkers=markerNames(root).length;
    const oldKilled=await stop(first,true);
    const afterCrashMarkers=markerNames(root).length;
    const second=await start(root,policy,workers);
    const differentProcess=first.child.pid!==second.child.pid;
    const stalePrepared=await prepare(second,2,'alpha');
    const staleStatus=await release(second,2);
    const staleEffects=second.effects.length;
    const freshPrepared=await prepare(second,3,'beta');
    const freshStatus=await release(second,3);
    const freshEffects=second.effects.length-staleEffects;
    const markerCount=markerNames(root).length;
    const secondClosed=await stop(second,false);
    return {
      id:policy==='GUARDED'?'GUARDED_CRASH_REPLAY':
        'TRANSIENT_UNSAFE_REPLAY',
      firstProcessStarted:true,firstPrepared,
      initialStatus,firstEffects,firstMarkers,
      oldProcessKilled:oldKilled,oldProcessExitObserved:!!first.exit,
      afterCrashMarkers,differentProcess,
      secondProcessStarted:true,stalePrepared,staleStatus,staleEffects,
      freshPrepared,freshStatus,freshEffects,markerCount,
      newProcessClosed:secondClosed,
      firstPartyOnly:true
    };
  });
}
async function parallel(){
  return await inScratch(async(root,workers)=>{
    const [a,b]=await Promise.all([
      start(root,'GUARDED',workers),
      start(root,'GUARDED',workers)
    ]);
    const differentProcesses=a.child.pid!==b.child.pid;
    const ready=await Promise.all([
      prepare(a,1,'alpha'),prepare(b,2,'alpha')
    ]);
    const bothPreparedBeforeRelease=ready.every(Boolean)&&
      a.effects.length===0&&b.effects.length===0&&
      markerNames(root).length===0;
    // RELEASE commands are dispatched without awaiting the first result.
    const responses=await Promise.all([release(a,1),release(b,2)]);
    const statuses=responses.sort((x,y)=>x-y);
    const effectEvents=a.effects.length+b.effects.length;
    const markerCount=markerNames(root).length;
    const closed=await Promise.all([stop(a,false),stop(b,false)]);
    return {
      id:'GUARDED_PARALLEL_CLAIM',twoProcessesStarted:true,
      differentProcesses,bothPreparedBeforeRelease,
      statuses,effectEvents,markerCount,
      bothWorkersClosed:closed.every(Boolean),
      firstPartyOnly:true
    };
  });
}
function mismatches(row,spec){
  const guarded=spec.kind==='GUARDED_RESTART';
  const isParallel=spec.kind==='PARALLEL';
  const expected=isParallel?[
    ['id',spec.id],['twoProcessesStarted',true],
    ['differentProcesses',true],['bothPreparedBeforeRelease',true],
    ['effectEvents',1],['markerCount',1],
    ['bothWorkersClosed',true],['firstPartyOnly',true],
    ['tempDirectoryRemoved',true]
  ]:[
    ['id',spec.id],['firstProcessStarted',true],
    ['firstPrepared',true],['initialStatus',200],['firstEffects',1],
    ['firstMarkers',guarded?1:0],
    ['oldProcessKilled',true],['oldProcessExitObserved',true],
    ['afterCrashMarkers',guarded?1:0],
    ['differentProcess',true],['secondProcessStarted',true],
    ['stalePrepared',true],['staleStatus',guarded?409:200],
    ['staleEffects',guarded?0:1],['freshPrepared',true],
    ['freshStatus',200],['freshEffects',1],
    ['markerCount',guarded?2:0],['newProcessClosed',true],
    ['firstPartyOnly',true],['tempDirectoryRemoved',true]
  ];
  const bad=expected.filter(([k,v])=>field(row,k)!==v).map(([k])=>k);
  if(isParallel&&!dense(field(row,'statuses'),2)||
     isParallel&&field(row,'statuses')?.[0]!==200||
     isParallel&&field(row,'statuses')?.[1]!==409)bad.push('statuses');
  return Object.freeze(bad);
}
/** Pure fixed oracle, no caller-provided PASS is trusted. */
export function summarizeCrossProcessLedger(observations){
  const valid=dense(observations,CASES.length);
  const cases=CASES.map((spec,i)=>{
    const row=valid?Object.getOwnPropertyDescriptor(
      observations,String(i)).value:null;
    const bad=mismatches(row,spec);
    return Object.freeze({id:spec.id,matched:bad.length===0,
      finding:spec.kind==='GUARDED_RESTART'?
        'PERSISTED_KEY_REPLAY_DENIED_AFTER_OS_RESTART':
        spec.kind==='UNSAFE_RESTART'?
        'TRANSIENT_POLICY_DOUBLE_EFFECT_WITNESSED':
        'ATOMIC_CROSS_PROCESS_CLAIM_WITNESSED',
      mismatchedWitnessFields:bad});
  });
  const matched=cases.filter(x=>x.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:'first-party-cross-process-spent-key-v1',
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?'OWNED_CROSS_PROCESS_LEDGER_WITNESSED':
      'OWNED_CROSS_PROCESS_LEDGER_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(cases),
    actualOsWorkersStarted:true,
    actualOsProcessTerminationTested:true,
    atomicExclusiveFileClaimTested:true,
    disposableFilesystemUsed:true,
    tempFilesRetained:false,
    powerLossDurabilityProven:false,
    authenticatedRealPermissionProven:false,
    realAgentTested:false,externalMcpContacted:false,
    realCredentialsUsed:false,independentBetaVerified:false,
    securityCertified:false,stableReleaseAuthorized:false
  });
}
export async function runCrossProcessLedger(args=[]){
  if(!dense(args,0))return errorReport('CROSS_PROCESS_ARGUMENTS_NOT_ALLOWED');
  try{
    const observations=[
      await restart('GUARDED'),
      await restart('INTENTIONALLY_TRANSIENT'),
      await parallel()
    ];
    return summarizeCrossProcessLedger(observations);
  }catch{return errorReport('CROSS_PROCESS_LEDGER_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runCrossProcessLedger(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
