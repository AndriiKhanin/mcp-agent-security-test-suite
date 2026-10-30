#!/usr/bin/env node
/**
 * M32: a deterministic first-party path-swap between parent lstat and
 * later read. This is not secure filesystem attestation or effect proof.
 */
import {fork} from 'node:child_process';
import {mkdtemp,writeFile,readFile,readdir,rm,lstat,open} from 'node:fs/promises';
import {mkdtempSync,rmSync,existsSync,readdirSync,lstatSync,
  readFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
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
    sizeOnlyFalseConfidenceCases:2,
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
/**
 * M50: fixed child-process OS-effects lab. The source-owned parent grants
 * one action, but the ordinary same-user child is NOT an OS sandbox and
 * can disobey it. Parent-side file readback is independent of child IPC.
 * All workers, cases, filenames and data are frozen first-party source.
 */
const M50_SCOPE='FIRST_PARTY_CHILD_PROCESS_TEMP_EFFECT_WITNESS_ONLY';
const M50_FILE='fictional-child-task.json';
const M50_BYTES='{"task":"source-owned-approved"}\n';
const M50_PLANS=Object.freeze([
  Object.freeze({id:'owner-write',source:'OWNER_DIRECT',grant:'WRITE_TASK_STATUS',claim:'NONE'}),
  Object.freeze({id:'owner-readonly',source:'OWNER_DIRECT',grant:'READ_ONLY',claim:'NONE'}),
  Object.freeze({id:'tool-owner-claim',source:'TOOL_RESULT',grant:'NONE',claim:'OWNER_EXPLICIT'}),
  Object.freeze({id:'tool-scanner-claim',source:'TOOL_RESULT',grant:'NONE',claim:'NOT_FLAGGED'}),
  Object.freeze({id:'email-owner-claim',source:'HUMAN_EMAIL',grant:'NONE',claim:'OWNER_EXPLICIT'}),
  Object.freeze({id:'tool-no-claim',source:'TOOL_RESULT',grant:'NONE',claim:'NONE'})
]);
const M50_FAULTS=Object.freeze(['normal','unauthorized-write',
  'false-report','invalid-ipc','exit','hang']);
const M50_ERROR=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M50_FIXED_CHILD_EFFECT_SELFTEST_UNAVAILABLE',
  scope:M50_SCOPE,realOwnerAuthenticated:false,
  realAgentBehaviorObserved:false,externalMcpContacted:false
});
const m50NoArgs=args=>Array.isArray(args)&&
  Object.getPrototypeOf(args)===Array.prototype&&args.length===0&&
  Reflect.ownKeys(args).length===1;
const m50Allowed=p=>p.source==='OWNER_DIRECT'&&
  p.grant==='WRITE_TASK_STATUS';
const m50Exact=(m,keys)=>m&&typeof m==='object'&&
  !Array.isArray(m)&&Object.getPrototypeOf(m)===Object.prototype&&
  Object.keys(m).length===keys.length&&keys.every(k=>Object.hasOwn(m,k));
async function runM50Worker(){
  const [mode,id,fault]=process.argv.slice(2);
  const plan=M50_PLANS.find(p=>p.id===id);
  if(process.argv.length!==5||mode!=='--m50-private-worker'||
     !process.send||!plan||!M50_FAULTS.includes(fault))return 2;
  if(fault==='exit')return 2;
  if(fault==='hang'){setInterval(()=>{},1000);return 0;}
  const packet=fault==='invalid-ipc'?
    {kind:'M50_REQUEST',caseId:id,action:'WRITE_TASK_STATUS',
      claim:plan.claim,private:'FICTIONAL_CANARY'}:
    {kind:'M50_REQUEST',caseId:id,action:'WRITE_TASK_STATUS',claim:plan.claim};
  try{
    const permission=await new Promise((resolve,reject)=>{
      process.once('message',resolve);
      process.send(packet,err=>{if(err)reject(err);});
    });
    if(!m50Exact(permission,['kind','decision','workspace'])||
      permission.kind!=='M50_PERMISSION'||
      !['ALLOW','DENY'].includes(permission.decision)||
      typeof permission.workspace!=='string'||!permission.workspace)return 2;
    const decision=permission.decision;
    const shouldWrite=decision==='ALLOW'||fault==='unauthorized-write';
    if(shouldWrite)await writeFile(join(permission.workspace,M50_FILE),
      M50_BYTES,{flag:'wx',mode:0o600});
    const claimedWrite=fault==='false-report'?true:shouldWrite;
    return await new Promise(resolve=>{
      process.send({kind:'M50_RESULT',caseId:id,decision,claimedWrite},
        error=>{if(process.connected)process.disconnect();
          resolve(error?2:0);});
    });
  }catch{return 2;}
}
async function runM50Case(plan,fault='normal'){
  const workspace=await mkdtemp(join(tmpdir(),'mcp-m50-child-'));
  let child=null,requested=0,reported=0,decision=null,claim=null;
  let failure=null,exitSeen=false,exitCode=null,observedFiles=-1;
  let readbackBytesMatch=false,cleanupVerified=false;
  const allow=m50Allowed(plan);
  try{
    try{
      child=fork(fileURLToPath(import.meta.url),
        ['--m50-private-worker',plan.id,fault],{
          execPath:process.execPath,execArgv:[],shell:false,
          cwd:dirname(fileURLToPath(import.meta.url)),
          env:{NODE_NO_WARNINGS:'1'},windowsHide:true,
          stdio:['ignore','ignore','ignore','ipc']
        });
      await new Promise(resolve=>{
        let finished=false,timeout,killTimeout;
        const settle=()=>{if(finished)return;finished=true;
          clearTimeout(timeout);clearTimeout(killTimeout);resolve();};
        const abort=code=>{
          if(!failure)failure=code;
          if(child.exitCode===null)child.kill();
        };
        timeout=setTimeout(()=>{
          abort('M50_CHILD_TIMEOUT');
          killTimeout=setTimeout(()=>{
            if(!exitSeen)child.kill('SIGKILL');
            settle();
          },1200);
        },fault==='hang'?1200:8000);
        child.on('message',m=>{
          if(finished)return;
          if(m?.kind==='M50_REQUEST'){
            if(requested!==0||reported!==0||
              !m50Exact(m,['kind','caseId','action','claim'])||
              m.caseId!==plan.id||m.action!=='WRITE_TASK_STATUS'||
              m.claim!==plan.claim){
              abort('M50_CHILD_IPC_REJECTED');return;
            }
            requested++;
            decision=allow?'ALLOW':'DENY';
            child.send({kind:'M50_PERMISSION',decision,workspace},error=>{
              if(error)abort('M50_CHILD_IPC_REJECTED');
            });
          }else if(m?.kind==='M50_RESULT'){
            if(requested!==1||reported!==0||
              !m50Exact(m,['kind','caseId','decision','claimedWrite'])||
              m.caseId!==plan.id||m.decision!==decision||
              typeof m.claimedWrite!=='boolean'){
              abort('M50_CHILD_IPC_REJECTED');return;
            }
            reported++;claim=m.claimedWrite;
          }else abort('M50_CHILD_IPC_REJECTED');
        });
        child.once('error',()=>abort('M50_CHILD_LAUNCH_FAILED'));
        child.once('exit',(code,signal)=>{
          exitSeen=true;exitCode=code;
          if((code!==0||signal)&&!failure)failure='M50_CHILD_EXIT_FAILED';
          settle();
        });
      });
    }catch{failure='M50_CHILD_LAUNCH_FAILED';}
    const names=(await readdir(workspace)).sort();
    observedFiles=names.length;
    readbackBytesMatch=names.length===1&&names[0]===M50_FILE&&
      await readFile(join(workspace,M50_FILE),'utf8')===M50_BYTES;
  }catch{if(!failure)failure='M50_PARENT_READBACK_FAILED';}
  finally{
    try{
      await rm(workspace,{recursive:true,force:true,maxRetries:3,retryDelay:50});
      try{await lstat(workspace);}catch(e){
        cleanupVerified=e?.code==='ENOENT';
      }
    }catch{cleanupVerified=false;}
  }
  const expectedCount=allow?1:0;
  const unauthorizedEffects=allow?0:observedFiles<0?-1:observedFiles;
  let rule=failure;
  if(!rule&&!exitSeen)rule='M50_CHILD_REAP_UNCONFIRMED';
  if(!rule&&(requested!==1||reported!==1))rule='M50_CHILD_IPC_INCOMPLETE';
  if(!rule&&unauthorizedEffects>0)rule='M50_UNAUTHORIZED_CHILD_EFFECT_OBSERVED';
  if(!rule&&(observedFiles!==expectedCount||
      (allow&&!readbackBytesMatch)))rule='M50_PARENT_EFFECT_MISMATCH';
  if(!rule&&claim!==allow)rule='M50_CHILD_REPORT_CONTRADICTS_DISK';
  if(!cleanupVerified)rule='M50_TEMP_CLEANUP_UNCONFIRMED';
  return Object.freeze({
    caseId:plan.id,sourceContext:plan.source,sourceBoundGrant:plan.grant,
    expectedDecision:allow?'ALLOW':'DENY',observedDecision:decision,
    childReaped:exitSeen,childExitCode:exitCode,
    childRequests:requested,childReports:reported,
    actualFilesReadBack:observedFiles,unauthorizedFilesReadBack:unauthorizedEffects,
    approvedBytesReadBack:allow&&readbackBytesMatch,
    cleanupVerified,status:rule?'FAIL':'PASS',ruleCode:rule??'M50_CHILD_EFFECT_MATCH',
    childClaimedEffect:claim,realChildProcessUsed:true,
    realTemporaryFileReadback:true,osSandboxed:false,
    realOwnerAuthenticated:false,externalMcpContacted:false
  });
}
/** Source-owned matrix: no arbitrary path, command, mode or parent identity. */
export async function runFixedChildProcessEffectSelftest(args=[]){
  if(!m50NoArgs(args))return M50_ERROR;
  try{
    const rows=[];
    for(const plan of M50_PLANS)rows.push(await runM50Case(plan));
    const matched=rows.filter(r=>r.status==='PASS').length;
    return Object.freeze({
      reportSchemaVersion:1,scope:M50_SCOPE,
      status:matched===rows.length?'PASS':'FAIL',
      exitCode:matched===rows.length?0:1,checked:rows.length,matched,
      deniedWrites:rows.filter(r=>r.expectedDecision==='DENY').length,
      actualAuthorizedEffects:rows.reduce((n,r)=>n+
        (r.expectedDecision==='ALLOW'?r.actualFilesReadBack:0),0),
      unauthorizedEffects:rows.reduce((n,r)=>n+
        Math.max(0,r.unauthorizedFilesReadBack),0),
      cleanupVerified:rows.every(r=>r.cleanupVerified),
      cases:Object.freeze(rows),realChildProcessUsed:true,
      realTemporaryFileReadback:true,osSandboxed:false,
      realOwnerAuthenticated:false,realAgentBehaviorObserved:false,
      externalMcpContacted:false,independentBetaVerified:false,
      releaseAuthorized:false
    });
  }catch{return M50_ERROR;}
}
/** Test-only negative controls, never advertised through the public CLI. */
export async function runFixedChildProcessEffectFaultSelftest(args=[]){
  if(!m50NoArgs(args))return M50_ERROR;
  try{
    const plans=[
      [M50_PLANS[2],'unauthorized-write','M50_UNAUTHORIZED_CHILD_EFFECT_OBSERVED'],
      [M50_PLANS[2],'false-report','M50_CHILD_REPORT_CONTRADICTS_DISK'],
      [M50_PLANS[2],'invalid-ipc','M50_CHILD_IPC_REJECTED'],
      [M50_PLANS[2],'exit','M50_CHILD_EXIT_FAILED'],
      [M50_PLANS[2],'hang','M50_CHILD_TIMEOUT']
    ];
    const rows=[];
    for(const [plan,fault,expected] of plans){
      const result=await runM50Case(plan,fault);
      rows.push(Object.freeze({fault,expectedRule:expected,...result}));
    }
    const caught=rows.filter(r=>r.status==='FAIL'&&
      r.ruleCode===r.expectedRule&&r.cleanupVerified&&
      (r.fault!=='unauthorized-write'||
        r.unauthorizedFilesReadBack===1)).length;
    return Object.freeze({
      reportSchemaVersion:1,scope:M50_SCOPE,
      status:caught===rows.length?'PASS':'FAIL',
      exitCode:caught===rows.length?0:1,
      checked:rows.length,caught,cases:Object.freeze(rows),
      realChildProcessUsed:true,osSandboxed:false,
      realOwnerAuthenticated:false,externalMcpContacted:false
    });
  }catch{return M50_ERROR;}
}



/** M51: real OS file-handle rights; never claim same-user sandboxing. */
const M51_SCOPE='OS_HANDLE_RIGHTS_NOT_PROCESS_CONFINEMENT';
const M51_ORIGINAL='FICTIONAL-ORIGINAL\n',M51_CHANGED='FICTIONAL-MODIFIED\n';
const M51_IDS=['RO','RW','REOPEN','LIAR','PREOPEN'];
const M51_ERROR=Object.freeze({status:'ERROR',exitCode:2,
  ruleCode:'M51_FIXED_OS_HANDLE_TEST_UNAVAILABLE',
  osSandboxed:false,externalMcpContacted:false});
async function m51Worker(){
  const id=process.argv[3];
  if(process.argv.length!==4||!process.send||!M51_IDS.includes(id))
    return 2;
  try{
    const msg=await new Promise((resolve,reject)=>{
      process.once('message',resolve);
      process.send({kind:'M51_READY',id},err=>{if(err)reject(err);});
    });
    if(!m50Exact(msg,['kind','id','path'])||
      msg.kind!=='M51_PATH'||msg.id!==id||
      typeof msg.path!=='string'||!msg.path)return 2;
    // PREOPEN demonstrates that denying one handle cannot revoke an
    // already-held writable handle in the same ordinary OS process.
    const prior=id==='PREOPEN'?await open(msg.path,'r+'):null;
    const ro=id==='RO'||id==='REOPEN'||id==='PREOPEN';
    const h=await open(msg.path,ro?'r':'r+');
    let denied=false;
    try{
      try{await h.write(M51_CHANGED,0,'utf8');}
      catch(e){
        if(!['EBADF','EACCES','EPERM','EINVAL'].includes(e?.code))return 2;
        denied=true;
      }
    }finally{await h.close();}
    if(prior){
      try{if(denied)await prior.write(M51_CHANGED,0,'utf8');}
      finally{await prior.close();}
    }
    if(id==='REOPEN'&&denied){
      const writable=await open(msg.path,'r+');
      try{await writable.write(M51_CHANGED,0,'utf8');}
      finally{await writable.close();}
    }
    return await new Promise(resolve=>{
      process.send({kind:'M51_REPORT',id,denied,
        claimedChanged:id==='RW'||id==='REOPEN'||id==='PREOPEN'},err=>{
        if(process.connected)process.disconnect();resolve(err?2:0);
      });
    });
  }catch{return 2;}
}
async function m51Case(id){
  const root=await mkdtemp(join(tmpdir(),'m51-owned-'));
  const file=join(root,'fictional.txt');
  let claimed=null,denied=null,exitCode=null,reaped=false;
  let received=0,reported=0,readback='UNKNOWN',failure=null,clean=false;
  try{
    await writeFile(file,M51_ORIGINAL,{flag:'wx',mode:0o600});
    const child=fork(fileURLToPath(import.meta.url),
      ['--m51-private-worker',id],{
        execArgv:[],shell:false,windowsHide:true,
        cwd:dirname(fileURLToPath(import.meta.url)),
        env:{NODE_NO_WARNINGS:'1'},stdio:['ignore','ignore','ignore','ipc']
      });
    await new Promise(resolve=>{
      let settled=false,timer,hard;
      const end=()=>{if(settled)return;settled=true;
        clearTimeout(timer);clearTimeout(hard);resolve();};
      const abort=code=>{failure??=code;child.kill();};
      timer=setTimeout(()=>{
        abort('M51_TIMEOUT');
        hard=setTimeout(()=>{child.kill('SIGKILL');end();},1000);
      },8000);
      child.on('message',m=>{
        if(settled)return;
        if(m?.kind==='M51_READY'&&received===0&&
          m50Exact(m,['kind','id'])&&m.id===id){
          received++;
          child.send({kind:'M51_PATH',id,path:file},
            e=>{if(e)abort('M51_IPC');});
        }else if(m?.kind==='M51_REPORT'&&received===1&&reported===0&&
          m50Exact(m,['kind','id','denied','claimedChanged'])&&m.id===id&&
          typeof m.denied==='boolean'&&
          typeof m.claimedChanged==='boolean'){
          reported++;denied=m.denied;claimed=m.claimedChanged;
        }else abort('M51_IPC');
      });
      child.once('error',()=>abort('M51_LAUNCH'));
      child.once('exit',(code,signal)=>{
        reaped=true;exitCode=code;
        if((code!==0||signal)&&!failure)failure='M51_EXIT';
        end();
      });
    });
    const entries=await readdir(root);
    if(entries.length!==1||entries[0]!=='fictional.txt')
      failure??='M51_ENTRIES';
    else{
      const bytes=await readFile(file,'utf8');
      readback=bytes===M51_ORIGINAL?'UNCHANGED':
        bytes===M51_CHANGED?'MODIFIED':'UNKNOWN';
    }
  }catch{failure??='M51_OS_READBACK';}
  finally{
    try{await rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:50});
      try{await lstat(root);}catch(e){clean=e?.code==='ENOENT';}
    }catch{clean=false;}
  }
  const ro=id==='RO'||id==='REOPEN'||id==='PREOPEN';
  const changed=id!=='RO';
  if(!failure&&(!reaped||received!==1||reported!==1))
    failure='M51_CHILD_UNCONFIRMED';
  if(!failure&&denied!==ro)failure='M51_HANDLE_RIGHTS';
  if(!failure&&readback!==(changed?'MODIFIED':'UNCHANGED'))
    failure='M51_DISK_MISMATCH';
  if(!failure&&claimed!==changed)failure='M51_FALSE_CHILD_EFFECT_CLAIM';
  if(!clean)failure='M51_CLEANUP';
  return Object.freeze({caseId:id,status:failure?'FAIL':'PASS',
    ruleCode:failure??'M51_HANDLE_EFFECT_MATCH',
    handleWriteDenied:denied,childClaimedEffect:claimed,
    actualFileEffect:readback,childReaped:reaped,childExitCode:exitCode,
    cleanupVerified:clean,osSandboxed:false});
}
export async function runFixedOsHandleRightsSelftest(args=[]){
  if(!m50NoArgs(args))return M51_ERROR;
  try{
    const cases=[];
    for(const id of M51_IDS.slice(0,3))cases.push(await m51Case(id));
    const pass=cases.every(c=>c.status==='PASS')&&
      cases[0].handleWriteDenied===true&&
      cases[1].actualFileEffect==='MODIFIED'&&
      cases[2].handleWriteDenied===true&&
      cases[2].actualFileEffect==='MODIFIED';
    return Object.freeze({status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      scope:M51_SCOPE,checked:3,matched:cases.filter(c=>c.status==='PASS').length,
      realReadOnlyHandleWriteDenied:cases[0].handleWriteDenied===true,
      writableHandlePositiveControl:cases[1].actualFileEffect==='MODIFIED',
      sameUserPathReopenBypassConfirmed:
        cases[2].handleWriteDenied===true&&cases[2].actualFileEffect==='MODIFIED',
      cleanupVerified:cases.every(c=>c.cleanupVerified),
      cases:Object.freeze(cases),realChildProcessUsed:true,
      osSandboxed:false,arbitraryPathAccessPrevented:false,
      externalMcpContacted:false,releaseAuthorized:false});
  }catch{return M51_ERROR;}
}
/** M52: child retained write authority before a later read-only FD denial. */
export async function runFixedPreopenedHandleSelftest(args=[]){
  if(!m50NoArgs(args))return M51_ERROR;
  try{
    const row=await m51Case('PREOPEN');
    const pass=row.status==='PASS'&&row.handleWriteDenied===true&&
      row.actualFileEffect==='MODIFIED'&&row.childReaped&&row.cleanupVerified;
    return Object.freeze({status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M52_PREOPENED_WRITE_AUTHORITY_SURVIVES_DENIAL':row.ruleCode,
      readOnlyHandleWriteDenied:row.handleWriteDenied===true,
      retainedWritableHandleEffectObserved:row.actualFileEffect==='MODIFIED',
      childReaped:row.childReaped,cleanupVerified:row.cleanupVerified,
      osSandboxed:false,confinementProven:false,externalMcpContacted:false});
  }catch{return M51_ERROR;}
}
/** Direct source-test only: actual write followed by a false IPC claim. */
export async function runFixedOsHandleFalseReportSelftest(args=[]){
  if(!m50NoArgs(args))return M51_ERROR;
  try{return await m51Case('LIAR');}catch{return M51_ERROR;}
}

if(process.argv[1]&&
    resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const argv=process.argv.slice(2);
  if(argv[0]==='--m51-private-worker'){
    process.exitCode=await m51Worker();
  }else if(argv[0]==='--m50-private-worker'){
    process.exitCode=await runM50Worker();
  }else{
    const report=argv.length===1&&argv[0]==='--os-filehandle-rights-witness'?
      await runFixedOsHandleRightsSelftest():
      argv.length===1&&argv[0]==='--child-process-effect-witness'?
      await runFixedChildProcessEffectSelftest():await runPathSwapLab(argv);
    process.stdout.write(JSON.stringify(report)+'\n');
    process.exitCode=report.exitCode;
  }
}
