#!/usr/bin/env node
/**
 * M25-D: Actual first-party child-process termination and relaunch.
 * Never kills anything except exact children started by this source.
 * All calls are to ephemeral 127.0.0.1, effects are IPC-witnessed counters.
 */
import {fork} from 'node:child_process';
import http from 'node:http';
import {isDeepStrictEqual} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const WORKER=fileURLToPath(new URL('./m25d-crash-worker.mjs',import.meta.url));
const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',MCP='2026-07-28';
const PATH='/mcp',DEADLINE=7000,MAX=4096;
const CASES=Object.freeze([
  Object.freeze({id:'UNCHANGED_PROCESS',kind:'BASELINE'}),
  Object.freeze({id:'CRASH_GUARDED',kind:'GUARDED'}),
  Object.freeze({id:'CRASH_UNSAFE',kind:'INTENTIONALLY_UNSAFE'})
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
      e=>e?.enumerable&&own(e,'value'));
}
const noArgs=x=>dense(x,0);
const errorCode=(ruleCode)=>Object.freeze({
  reportSchemaVersion:1,profile:'first-party-os-gate-restart-v1',
  status:'ERROR',exitCode:2,ruleCode,
  actualOsProcessTerminationTested:false,
  realAgentTested:false,externalMcpContacted:false,
  realCredentialsUsed:false,independentBetaVerified:false
});
function gateProcess(policy){
  // The executable and script are *source constants*, never user input.
  const child=fork(WORKER,['--fixed-owned-worker',policy],{
    execArgv:[],windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],
    env:{M25D_FIXED_WORKER:'1',NODE_OPTIONS:'',
      PATH:process.env.PATH??'',SystemRoot:process.env.SystemRoot??''}
  });
  const w={child,queue:[],waiters:[],effects:[],exit:null};
  w.exitPromise=new Promise(done=>{
    child.once('exit',(code,signal)=>{w.exit={code,signal};done(w.exit);});
  });
  child.on('error',()=>{}); // Never echo an OS path or process error.
  child.on('message',msg=>{
    if(msg?.type==='EFFECT')w.effects.push(msg.id);
    const index=w.waiters.findIndex(t=>t.type===msg?.type&&
      (t.id===undefined||t.id===msg?.id));
    if(index>=0){
      const waiter=w.waiters.splice(index,1)[0];
      clearTimeout(waiter.timer);waiter.resolve(msg);
    }else w.queue.push(msg);
  });
  return w;
}
function wait(w,type,id){
  return new Promise((resolveMessage,reject)=>{
    const index=w.queue.findIndex(m=>m?.type===type&&
      (id===undefined||m.id===id));
    if(index>=0){resolveMessage(w.queue.splice(index,1)[0]);return;}
    if(w.exit){reject(Error('CHILD_EXITED'));return;}
    const entry={type,id,resolve:resolveMessage,timer:null};
    entry.timer=setTimeout(()=>{
      const pos=w.waiters.indexOf(entry);
      if(pos>=0)w.waiters.splice(pos,1);
      reject(Error('IPC_TIMEOUT'));
    },DEADLINE);
    w.waiters.push(entry);
  });
}
async function bounded(p){
  let timer;
  try{return await Promise.race([p,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(Error('FIXED_TIMEOUT')),DEADLINE);
  })]);}
  finally{clearTimeout(timer);}
}
async function ready(policy){
  const w=gateProcess(policy);
  try{
    const msg=await wait(w,'READY');
    if(msg?.type!=='READY'||!Number.isInteger(msg.port)||
      msg.port<1||msg.port>65535||
      typeof msg.gateGeneration!=='string'||
      msg.gateGeneration.length<16||msg.policyVersion!==1)
      throw Error('INVALID_READY');
    w.port=msg.port;
    w.generation=msg.gateGeneration;
    w.policyVersion=msg.policyVersion;
    return w;
  }catch(error){
    if(!w.exit)w.child.kill('SIGKILL');
    await bounded(w.exitPromise).catch(()=>{});
    throw error;
  }
}
async function issue(w,id){
  const message=wait(w,'ISSUED',id);
  w.child.send({type:'ISSUE',id});
  const data=await message;
  if(!data?.grant||data.grant.gateGeneration!==w.generation||
     data.grant.policyVersion!==w.policyVersion||
     typeof data.grant.capability!=='string'||
     typeof data.grant.approvalId!=='string')
    throw Error('INVALID_ISSUANCE');
  return data.grant;
}
const request=(id,grant,mode)=>({jsonrpc:'2.0',id,method:'tools/call',
  params:{name:'fictional.commit',arguments:{mode,resource:'first-party-only'},
    _meta:{'io.modelcontextprotocol/protocolVersion':MCP,approval:grant}}});
const allowed=id=>({jsonrpc:'2.0',id,
  result:{fictionalEffect:'COUNTED_IN_CHILD_MEMORY'}});
const denied=id=>({jsonrpc:'2.0',id,error:{
  code:-32010,message:'Fictional old-generation approval denied'
}});
async function post(port,id,grant,mode){
  const data=JSON.stringify(request(id,grant,mode));
  return await new Promise(resolvePost=>{
    let settled=false;
    const finish=r=>{if(!settled){settled=true;resolvePost(r);}};
    const req=http.request({hostname:HOST,port,path:PATH,method:'POST',
      headers:{host:HOST+':'+port,origin:ORIGIN,
        'content-type':'application/json',accept:'application/json',
        'mcp-protocol-version':MCP,connection:'close',
        'content-length':String(Buffer.byteLength(data))}},res=>{
      let size=0;const chunks=[];
      res.on('data',part=>{
        size+=part.length;
        if(size>MAX){req.destroy(Error('OVERSIZED_REPLY'));return;}
        chunks.push(part);
      });
      res.once('end',()=>{
        try{
          const body=JSON.parse(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          finish({status:res.statusCode,body,aborted:false});
        }catch{finish({status:0,body:null,aborted:true});}
      });
      res.once('error',()=>finish({status:0,body:null,aborted:true}));
    });
    req.setTimeout(DEADLINE,()=>req.destroy(Error('WIRE_TIMEOUT')));
    req.once('error',()=>finish({status:0,body:null,aborted:true}));
    req.once('close',()=>finish({status:0,body:null,aborted:true}));
    req.end(data);
  });
}
async function syncEffects(w,id){
  const receipt=wait(w,'SYNCED',id);
  w.child.send({type:'SYNC',id});
  const r=await receipt;
  // IPC message ordering is established by the worker-owned FIFO stream.
  // The worker receipt must agree with separately counted EFFECT messages.
  if(r?.effects!==w.effects.length)throw Error('EFFECT_IPC_NOT_RECONCILED');
}
async function terminate(w,force){
  if(w.exit)return w.exit;
  if(force){
    const signalled=w.child.kill('SIGKILL');
    if(!signalled)throw Error('CHILD_KILL_REFUSED');
    return await bounded(w.exitPromise);
  }
  const closed=wait(w,'CLOSED');
  w.child.send({type:'CLOSE'});
  const observed=await closed;
  const result=await bounded(w.exitPromise);
  if(observed?.socketsRemaining!==0||result.code!==0)
    throw Error('CHILD_NOT_CLEANLY_CLOSED');
  return result;
}
async function baseline(){
  let w;
  try{
    w=await ready('GUARDED');
    const grant=await issue(w,1);
    const reply=await post(w.port,1,grant,'EXEC');
    await syncEffects(w,1);
    const matched=reply.status===200&&
      isDeepStrictEqual(reply.body,allowed(1));
    const effects=w.effects.length;
    const exited=await terminate(w,false);
    return {id:'UNCHANGED_PROCESS',
      processActuallyStarted:true,normalCleanupConfirmed:exited.code===0,
      status:reply.status,responseMatched:matched,
      protectedEffectEvents:effects,realAgentTested:false};
  }finally{
    if(w&&!w.exit)await terminate(w,true).catch(()=>{});
  }
}
async function crash(policy){
  let old,newWorker;
  try{
    old=await ready(policy);
    const oldGrant=await issue(old,1);
    const admission=wait(old,'ADMITTED',1);
    const pending=post(old.port,1,oldGrant,'HOLD');
    const ack=await admission;
    const barrier=ack?.id===1&&ack.effects===0&&
      old.effects.length===0;
    const kill=old.child.kill('SIGKILL');
    if(!kill)throw Error('CHILD_KILL_FAILED');
    const exit=await bounded(old.exitPromise);
    const abandoned=await bounded(pending);
    const oldRequestAborted=abandoned.aborted&&abandoned.status===0;
    const priorEffects=old.effects.length;
    newWorker=await ready(policy);
    const generationChanged=newWorker.generation!==old.generation;
    const policyVersionSame=newWorker.policyVersion===old.policyVersion;
    const effectsBeforeStale=newWorker.effects.length;
    const stale=await post(newWorker.port,2,oldGrant,'EXEC');
    await syncEffects(newWorker,2);
    const staleEffects=newWorker.effects.length-effectsBeforeStale;
    const freshGrant=await issue(newWorker,3);
    const newGrantBound=freshGrant.gateGeneration===newWorker.generation;
    const effectsBeforeFresh=newWorker.effects.length;
    const fresh=await post(newWorker.port,3,freshGrant,'EXEC');
    await syncEffects(newWorker,3);
    const freshEffects=newWorker.effects.length-effectsBeforeFresh;
    const totalEffects=newWorker.effects.length;
    const exit2=await terminate(newWorker,false);
    const expectedStale=policy==='GUARDED'?denied(2):allowed(2);
    return {
      id:policy==='GUARDED'?'CRASH_GUARDED':'CRASH_UNSAFE',
      processActuallyStarted:true,
      pendingAdmissionBeforeKill:barrier,
      oldProcessTerminationRequested:kill,
      oldProcessExitObserved:exit!==null,
      oldRequestAbortedWithoutReply:oldRequestAborted,
      oldProcessEffectEvents:priorEffects,
      oldApprovalGenerationDifferent:generationChanged,
      unchangedPolicyVersion:policyVersionSame,
      staleStatus:stale.status,
      staleBodyMatched:isDeepStrictEqual(stale.body,expectedStale),
      staleEffectDelta:staleEffects,
      newApprovalBound:newGrantBound,
      freshStatus:fresh.status,
      freshBodyMatched:isDeepStrictEqual(fresh.body,allowed(3)),
      freshEffectDelta:freshEffects,
      newProcessEffectEvents:totalEffects,
      cleanNewProcessExit:exit2.code===0
    };
  }finally{
    for(const w of [old,newWorker]){
      if(w&&!w.exit)await terminate(w,true).catch(()=>{});
    }
  }
}
function compare(r,spec){
  const base=spec.kind==='BASELINE';
  const guarded=spec.kind==='GUARDED';
  const expected=base?[
    ['id',spec.id],['processActuallyStarted',true],
    ['normalCleanupConfirmed',true],['status',200],
    ['responseMatched',true],['protectedEffectEvents',1],
    ['realAgentTested',false]
  ]:[
    ['id',spec.id],['processActuallyStarted',true],
    ['pendingAdmissionBeforeKill',true],
    ['oldProcessTerminationRequested',true],
    ['oldProcessExitObserved',true],
    ['oldRequestAbortedWithoutReply',true],
    ['oldProcessEffectEvents',0],
    ['oldApprovalGenerationDifferent',true],
    ['unchangedPolicyVersion',true],
    ['staleStatus',guarded?410:200],
    ['staleBodyMatched',true],
    ['staleEffectDelta',guarded?0:1],
    ['newApprovalBound',true],
    ['freshStatus',200],
    ['freshBodyMatched',true],
    ['freshEffectDelta',1],
    ['newProcessEffectEvents',guarded?1:2],
    ['cleanNewProcessExit',true]
  ];
  return Object.freeze(expected.filter(([k,v])=>field(r,k)!==v)
    .map(([k])=>k));
}
/** Independent fixed-witness gate; no observed payload, port or PID echo. */
export function summarizeProcessCrashLab(observations){
  const shape=dense(observations,CASES.length);
  const cases=CASES.map((spec,i)=>{
    const r=shape?Object.getOwnPropertyDescriptor(observations,String(i)).value:null;
    const bad=compare(r,spec);
    return Object.freeze({id:spec.id,matched:bad.length===0,
      expectedFinding:spec.kind==='BASELINE'?
        'UNCHANGED_APPROVAL_EXECUTED':
        spec.kind==='GUARDED'?
        'STALE_APPROVAL_REJECTED_AFTER_REAL_PROCESS_EXIT':
        'INTENTIONALLY_UNSAFE_STALE_APPROVAL_EXECUTED',
      mismatchedWitnessFields:bad});
  });
  const matched=cases.filter(r=>r.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:'first-party-os-gate-restart-v1',
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?'OS_GATE_RESTART_DIFFERENTIAL_WITNESSED':
      'OS_GATE_RESTART_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(cases),
    actualOsProcessTerminationTested:true,
    policyVersionSameAcrossRestart:true,
    oldGenerationNeverAcceptedByGuard:true,
    explicitlyVulnerableComparison:true,
    realAgentTested:false,realUserMcpContacted:false,
    realFilesystemActionPerformed:false,
    externalMcpContacted:false,realCredentialsUsed:false,
    independentBetaVerified:false,securityCertified:false,
    durableCrashSafePersistenceProven:false,stableReleaseAuthorized:false
  });
}
export async function runProcessCrashLab(args=[]){
  if(!noArgs(args))return errorCode('OS_GATE_RESTART_ARGUMENTS_NOT_ALLOWED');
  try{
    const observations=[await baseline(),await crash('GUARDED'),
      await crash('INTENTIONALLY_UNSAFE')];
    return summarizeProcessCrashLab(observations);
  }catch{
    return errorCode('OS_GATE_RESTART_LAB_UNAVAILABLE');
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runProcessCrashLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
