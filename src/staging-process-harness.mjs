/**
 * M4-B6-B: child-process lifecycle for ONLY the reviewed first-party
 * staging MCP selftest. No arbitrary subprocess, URL, JSON, token or shell.
 * Reduced environment and quiet stdio; IPC is treated as untrusted data.
 * Normal child process privileges ARE NOT an OS sandbox.
 */
import { fork } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKER=fileURLToPath(new URL('./first-party-staging-worker.mjs',import.meta.url));
const WORKDIR=dirname(WORKER);
const MODES=new Set(['normal','exit','hang','invalid-ipc']);
const DEFAULT_MS=8000;
function invalid(){throw new TypeError('INVALID_STAGING_PROCESS_OPTIONS');}
function report(rule){
  return {status:rule?'FAIL':'PASS',profile:'first-party-staging-worker-v1',
    connectionStatus:'FIXED_CHILD_PROCESS_STAGING_ONLY',
    transport:'OWNED_CHILD_AND_IPV4_LOOPBACK',protocolVersion:'2026-07-28',
    allowedMethod:'server/discover',childProcessUsed:true,osSandboxed:false,
    operatorVerified:false,externalTargetContacted:false,
    checked:1,received:rule?0:1,accepted:rule?0:1,
    failureCount:rule?1:0,findingsTruncated:false,
    findings:rule?[{step:1,rule}]:[]};
}
function accepted(m){
  return m!==null && typeof m==='object' && !Array.isArray(m) &&
    Object.getPrototypeOf(m)===Object.prototype &&
    Object.keys(m).length===6 &&
    m.kind==='STAGING_RESULT' && m.status==='PASS' &&
    m.checked===1 && m.received===1 && m.accepted===1 &&
    m.externalTargetContacted===false;
}
/** Only test-only fixed modes and bounded deadline can be selected directly.
 * Public CLI calls this WITHOUT any arguments or external input.
 */
export async function runFirstPartyStagingProcessSelftest(options={}){
  if(!options || typeof options!=='object' || Array.isArray(options) ||
    Object.getPrototypeOf(options)!==Object.prototype ||
    Object.keys(options).some(k=>!['fault','deadlineMs'].includes(k)))invalid();
  const fault=options.fault??'normal';
  const deadlineMs=options.deadlineMs??DEFAULT_MS;
  if(!MODES.has(fault) || !Number.isSafeInteger(deadlineMs) ||
    deadlineMs<250 || deadlineMs>DEFAULT_MS)invalid();
  return new Promise(resolve=>{
    let child,settled=false,valid=false,messages=0,timer,killTimer;
    let pendingFailure=null;
    const end=code=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      resolve(report(code));
    };
    // Never report that a child has been cleaned up before observing exit.
    // If exit cannot be confirmed, emit a different symbolic failure.
    const abort=code=>{
      if(settled || pendingFailure)return;
      pendingFailure=code;
      if(!child || child.exitCode!==null){end(code);return;}
      child.kill();
      killTimer=setTimeout(()=>{
        if(child.exitCode===null)child.kill('SIGKILL');
        end('STAGING_WORKER_REAP_UNCONFIRMED');
      },1000);
    };
    try{
      child=fork(WORKER,[fault],{
        execPath:process.execPath,execArgv:[],cwd:WORKDIR,shell:false,
        env:{NODE_NO_WARNINGS:'1'},windowsHide:true,
        stdio:['ignore','ignore','ignore','ipc']
      });
    }catch{
      end('STAGING_WORKER_LAUNCH_FAILED');return;
    }
    timer=setTimeout(()=>abort('STAGING_WORKER_TIMEOUT'),deadlineMs);
    child.on('message',m=>{
      messages++;
      if(messages!==1 || !accepted(m)){
        abort('STAGING_WORKER_IPC_REJECTED');
      }else valid=true;
    });
    child.once('error',()=>abort('STAGING_WORKER_LAUNCH_FAILED'));
    child.once('exit',(code,signal)=>{
      if(settled)return;
      end(pendingFailure ?? (valid && messages===1 && code===0 && !signal
        ? null : 'STAGING_WORKER_EXIT_FAILED'));
    });
  });
}
