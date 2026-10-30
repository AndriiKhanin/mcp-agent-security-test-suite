#!/usr/bin/env node
/**
 * M27: first-party in-doubt window after a durable-looking reservation.
 * Real disposable OS children and scratch files; effects are IPC counts.
 * At-most-once rejection is NOT exactly-once or operational recovery.
 */
import {fork} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync,readdirSync,lstatSync,
  readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const WORKER=fileURLToPath(new URL('./m27-indoubt-worker.mjs',import.meta.url));
const PREFIX='m27-owned-indoubt-';
const DEADLINE=7000;
const IN_DOUBT='FICTIONAL-IN-DOUBT-V1\n';
const SPENT='FICTIONAL-SPENT-V1\n';
const CASES=Object.freeze([
  Object.freeze({id:'CRASH_BEFORE_EFFECT_GUARDED',
    effectStaged:false,policy:'GUARDED',guarded:true}),
  Object.freeze({id:'CRASH_AFTER_EFFECT_GUARDED',
    effectStaged:true,policy:'GUARDED',guarded:true}),
  Object.freeze({id:'CRASH_AFTER_EFFECT_UNSAFE_RETRY',
    effectStaged:true,policy:'INTENTIONALLY_UNSAFE_RETRY',guarded:false})
]);
const own=(x,k)=>Object.hasOwn(x,k);
const field=(x,k)=>{
  if(!x||typeof x!=='object'||Array.isArray(x)||
     Object.getPrototypeOf(x)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(x,k);
  return d?.enumerable&&own(d,'value')?d.value:undefined;
};
function dense(x,n){
  if(!Array.isArray(x)||Object.getPrototypeOf(x)!==Array.prototype||
      x.length!==n)return false;
  const d=Object.getOwnPropertyDescriptors(x);
  return Reflect.ownKeys(d).length===n+1&&d.length?.value===n&&
    Array.from({length:n},(_,i)=>d[String(i)]).every(
      slot=>slot?.enumerable&&own(slot,'value'));
}
const errorReport=ruleCode=>Object.freeze({
  reportSchemaVersion:1,profile:'owned-indoubt-crash-replay-v1',
  status:'ERROR',exitCode:2,ruleCode,
  actualOsWorkersStarted:false,disposableFilesystemUsed:true,
  exactlyOnceProven:false,powerLossDurabilityProven:false,
  realAgentTested:false,externalMcpContacted:false,
  realCredentialsUsed:false,independentBetaVerified:false,
  securityCertified:false
});
function spawnOwned(root,policy){
  const child=fork(WORKER,['--owned-indoubt-worker',policy],{
    execArgv:[],windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],
    env:{
      M27_OWNED_WORKER:'FIXED_SOURCE_ONLY',
      M27_OWNED_DIR:root,NODE_OPTIONS:'',
      PATH:process.env.PATH??'',
      SystemRoot:process.env.SystemRoot??'',
      TEMP:process.env.TEMP??'',
      TMP:process.env.TMP??'',
      TMPDIR:process.env.TMPDIR??''
    }
  });
  const w={child,queue:[],waiters:[],effects:[],exit:null,exitPromise:null};
  w.exitPromise=new Promise(done=>{
    child.once('exit',(code,signal)=>{
      w.exit={code,signal};
      for(const waiter of w.waiters.splice(0)){
        clearTimeout(waiter.timer);
        waiter.reject(Error('OWNED_CHILD_EXITED'));
      }
      done(w.exit);
    });
  });
  child.on('error',()=>{});
  child.on('message',msg=>{
    if(msg?.type==='EFFECT')w.effects.push(msg.id);
    const i=w.waiters.findIndex(x=>x.type===msg?.type&&
      (x.id===undefined||x.id===msg.id));
    if(i>=0){
      const waiter=w.waiters.splice(i,1)[0];
      clearTimeout(waiter.timer);
      waiter.resolve(msg);
    }else w.queue.push(msg);
  });
  return w;
}
function wait(w,type,id){
  return new Promise((resolveWait,reject)=>{
    const i=w.queue.findIndex(x=>x?.type===type&&
      (id===undefined||x.id===id));
    if(i>=0){resolveWait(w.queue.splice(i,1)[0]);return;}
    if(w.exit){reject(Error('CHILD_ALREADY_EXITED'));return;}
    const entry={type,id,resolve:resolveWait,reject,timer:null};
    entry.timer=setTimeout(()=>{
      const j=w.waiters.indexOf(entry);
      if(j>=0)w.waiters.splice(j,1);
      reject(Error('CHILD_IPC_TIMEOUT_'+type));
    },DEADLINE);
    w.waiters.push(entry);
  });
}
async function sendAndWait(w,message,type,id){
  const answer=wait(w,type,id);
  if(!w.child.connected)throw Error('CHILD_IPC_CLOSED');
  w.child.send(message);
  const result=await answer;
  if(result?.type!==type||(id!==undefined&&result.id!==id))
    throw Error('INVALID_CHILD_REPLY');
  return result;
}
async function bounded(promise){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Error('FIXED_DEADLINE')),DEADLINE);
  })]);}finally{clearTimeout(timer);}
}
async function start(root,policy,workers){
  const w=spawnOwned(root,policy);
  workers.push(w);
  const ready=await bounded(wait(w,'READY'));
  if(ready.policy!==policy||!Number.isInteger(w.child.pid)||
     w.child.pid<1)throw Error('OWNED_WORKER_INVALID');
  return w;
}
async function claim(w){
  const result=await sendAndWait(w,
    {type:'CLAIM',id:1,key:'alpha'},'CLAIMED',1);
  return result.id===1;
}
async function stageEffect(w){
  const effect=await sendAndWait(w,{type:'STAGE_EFFECT',id:1},'EFFECT',1);
  return effect.id===1;
}
async function tryKey(w,id,key){
  const reply=await sendAndWait(w,{type:'TRY',id,key},'RESULT',id);
  if(reply.status!==200&&reply.status!==423)
    throw Error('INVALID_OWNED_STATUS');
  await sendAndWait(w,{type:'SYNC'},'SYNCED');
  return reply.status;
}
async function stop(w,crash){
  if(w.exit)return true;
  if(crash){
    if(!w.child.kill('SIGKILL'))throw Error('OWNED_KILL_REFUSED');
    await bounded(w.exitPromise);
    return !!w.exit;
  }
  await sendAndWait(w,{type:'CLOSE'},'CLOSED');
  const result=await bounded(w.exitPromise);
  if(result.code!==0)throw Error('OWNED_WORKER_NOT_CLEAN');
  return true;
}
function markers(root){
  const names=readdirSync(root).sort();
  const expected=new Set(['claim-alpha.marker','claim-beta.marker']);
  if(names.some(x=>!expected.has(x)))throw Error('UNEXPECTED_TEST_FILE');
  const values={};
  for(const name of names){
    const path=join(root,name);
    const stat=lstatSync(path);
    if(!stat.isFile()||stat.isSymbolicLink()||
      stat.size>Buffer.byteLength(SPENT)+20)
      throw Error('INVALID_MARKER_FILE');
    const data=readFileSync(path,'utf8');
    if(data!==SPENT&&data!==IN_DOUBT)throw Error('INVALID_MARKER_DATA');
    values[name]=data;
  }
  return values;
}
async function inScratch(fn){
  const root=mkdtempSync(join(tmpdir(),PREFIX));
  const workers=[];let outcome,removed=false;
  try{outcome=await fn(root,workers);}
  finally{
    for(const w of workers)
      if(!w.exit)await stop(w,true).catch(()=>{});
    rmSync(root,{recursive:true,force:true});
    removed=!existsSync(root);
  }
  if(!removed)throw Error('TEMP_DIRECTORY_NOT_REMOVED');
  return {...outcome,tempDirectoryRemoved:removed};
}
async function runScenario(spec){
  return await inScratch(async(root,workers)=>{
    const first=await start(root,'GUARDED',workers);
    const firstPrepared=await claim(first);
    const claimedBeforeEffect=markers(root)['claim-alpha.marker']===IN_DOUBT;
    const firstEffectStaged=spec.effectStaged?await stageEffect(first):false;
    const effectsBeforeCrash=first.effects.length;
    // The first worker deliberately never emitted a RESULT/acknowledgement.
    const noFirstAck=first.queue.every(x=>x?.type!=='RESULT');
    const firstPid=first.child.pid;
    const firstKilled=await stop(first,true);
    const firstExitObserved=!!first.exit;
    const markerSurvived=markers(root)['claim-alpha.marker']===IN_DOUBT;
    const second=await start(root,spec.policy,workers);
    const differentProcess=second.child.pid!==firstPid;
    const staleStatus=await tryKey(second,2,'alpha');
    const replayEffects=second.effects.length;
    const freshStatus=await tryKey(second,3,'beta');
    const freshEffects=second.effects.length-replayEffects;
    const final=markers(root);
    const pendingStillQuarantined=final['claim-alpha.marker']===IN_DOUBT;
    const freshMarker=final['claim-beta.marker']===SPENT;
    const markerCount=Object.keys(final).length;
    const secondClosed=await stop(second,false);
    return {
      id:spec.id,firstProcessStarted:true,firstPrepared,
      claimedBeforeEffect,firstEffectStaged,
      effectsBeforeCrash,noFirstAck,firstKilled,firstExitObserved,
      markerSurvived,differentProcess,secondProcessStarted:true,
      staleStatus,replayEffects,freshStatus,freshEffects,
      pendingStillQuarantined,freshMarker,markerCount,
      secondClosed,firstPartyOnly:true
    };
  });
}
function mismatches(observed,spec){
  const expected=[
    ['id',spec.id],['firstProcessStarted',true],
    ['firstPrepared',true],['claimedBeforeEffect',true],
    ['firstEffectStaged',spec.effectStaged],
    ['effectsBeforeCrash',spec.effectStaged?1:0],
    ['noFirstAck',true],['firstKilled',true],
    ['firstExitObserved',true],['markerSurvived',true],
    ['differentProcess',true],['secondProcessStarted',true],
    ['staleStatus',spec.guarded?423:200],
    ['replayEffects',spec.guarded?0:1],
    ['freshStatus',200],['freshEffects',1],
    ['pendingStillQuarantined',true],
    ['freshMarker',true],['markerCount',2],
    ['secondClosed',true],['firstPartyOnly',true],
    ['tempDirectoryRemoved',true]
  ];
  return Object.freeze(expected.filter(([k,v])=>field(observed,k)!==v)
    .map(([k])=>k));
}
/** Fixed independent oracle, not an acceptance of caller-supplied PASS. */
export function summarizeIndoubtCrash(observations){
  const valid=dense(observations,CASES.length);
  const results=CASES.map((spec,i)=>{
    const row=valid?Object.getOwnPropertyDescriptor(
      observations,String(i)).value:null;
    const wrong=mismatches(row,spec);
    return Object.freeze({
      id:spec.id,matched:wrong.length===0,
      finding:spec.id==='CRASH_BEFORE_EFFECT_GUARDED'?
        'IN_DOUBT_WITHOUT_EFFECT_STAYS_QUARANTINED':
        spec.id==='CRASH_AFTER_EFFECT_GUARDED'?
        'UNACKNOWLEDGED_EFFECT_REPLAY_BLOCKED':
        'UNSAFE_IN_DOUBT_DUPLICATE_EFFECT_DETECTED',
      mismatchedWitnessFields:wrong
    });
  });
  const matched=results.filter(x=>x.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:'owned-indoubt-crash-replay-v1',
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?'IN_DOUBT_OS_CRASH_DIFFERENTIAL_WITNESSED':
      'IN_DOUBT_OS_CRASH_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(results),
    actualOsWorkersStarted:true,actualOsWorkerKilled:true,
    disposableFilesystemUsed:true,unresolvedClaimsRetainedOutsideTest:false,
    exactlyOnceProven:false,powerLossDurabilityProven:false,
    realAgentTested:false,externalMcpContacted:false,
    realCredentialsUsed:false,independentBetaVerified:false,
    securityCertified:false,stableReleaseAuthorized:false
  });
}
export async function runIndoubtCrashLab(args=[]){
  if(!dense(args,0))return errorReport('INDOUBT_ARGUMENTS_NOT_ALLOWED');
  try{
    const evidence=[];
    for(const spec of CASES)evidence.push(await runScenario(spec));
    return summarizeIndoubtCrash(evidence);
  }catch{return errorReport('INDOUBT_LAB_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runIndoubtCrashLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
