import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runWitnessedScenario } from './witness-harness.mjs';

const CHILD_PATH = fileURLToPath(new URL('./process-mcp-worker.mjs', import.meta.url));
const DEFECTS = new Set([
  'none', 'execute-denied-write', 'drop-authorized-write',
  'false-success-on-denial', 'echo-synthetic-canary',
  'crash-before-commit', 'crash-after-commit', 'forge-snapshot'
]);
const CALL_TIMEOUT_MS = 4000;
const INIT_TIMEOUT_MS = 8000;

/**
 * Dedicated worker process: owned ledger and policy oracle live in the parent.
 * This gives process separation, but is NOT an OS sandbox for malicious code.
 * Only bundled, fixed child is launched; CLI never accepts executables or args.
 */
export function createProcessMcpDriver({policy,clock,effects,defect='none'}) {
  if (!DEFECTS.has(defect)) throw new TypeError('INVALID_PROCESS_DEFECT');
  if (!effects || ['markCall','writeNote','deleteNote','readNote'].some(k=>typeof effects[k]!=='function'))
    throw new TypeError('INVALID_EFFECT_PORT');
  const worker = fork(CHILD_PATH, [], {
    execPath: process.execPath,
    execArgv: [],
    stdio: ['ignore','ignore','ignore','ipc'],
    env: {NODE_NO_WARNINGS:'1'},
  });
  let sequence = 0, inFlight = null, alive = true, closed = false;
  let readyResolve, readyReject;
  const ready = new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const failCurrent = code => {
    if (!inFlight) return;
    const pending = inFlight; inFlight=null;
    clearTimeout(pending.timeout);
    pending.reject(new Error(code));
  };
  let initTimer=setTimeout(()=>{
    readyReject(new Error('WORKER_INIT_TIMEOUT'));
    failCurrent('WORKER_INIT_TIMEOUT');
    if (alive) worker.kill();
  }, INIT_TIMEOUT_MS);
  worker.on('error',()=>{
    alive=false;
    clearTimeout(initTimer);
    readyReject(new Error('WORKER_START_ERROR'));
    failCurrent('WORKER_START_ERROR');
  });
  worker.on('exit',()=>{
    alive=false;
    clearTimeout(initTimer);
    readyReject(new Error('WORKER_EARLY_EXIT'));
    failCurrent('WORKER_EARLY_EXIT');
  });
  worker.on('message',message=>{
    if (!message || typeof message !== 'object') return;
    if (message.kind==='READY') {
      clearTimeout(initTimer);
      readyResolve();
      return;
    }
    if (message.kind==='FAKE_SNAPSHOT') return; // Deliberately ignore adapter-owned claims.
    if (!inFlight || message.id !== inFlight.id) {
      failCurrent('IPC_PROTOCOL_VIOLATION');
      return;
    }
    if (message.kind==='EFFECT') {
      if (!Number.isSafeInteger(message.seq) || message.seq !== inFlight.lastSeq+1 ||
          !['writeNote','deleteNote','readNote'].includes(message.op)) {
        failCurrent('IPC_PROTOCOL_VIOLATION');
        return;
      }
      inFlight.lastSeq=message.seq;
      // Effects are applied to a parent-owned synthetic recorder. They NEVER
      // invoke filesystem, network or remote host tools.
      effects[message.op]();
      worker.send({kind:'ACK',id:message.id,seq:message.seq,ok:true},err=>{
        if(err) failCurrent('IPC_ACK_FAILED');
      });
      return;
    }
    if (message.kind==='RESULT') {
      const pending=inFlight; inFlight=null;
      clearTimeout(pending.timeout);
      pending.resolve(message.result);
      return;
    }
    failCurrent('IPC_PROTOCOL_VIOLATION');
  });
  worker.send({kind:'INIT',policy,clock,defect},err=>{
    if(err) {clearTimeout(initTimer);readyReject(new Error('WORKER_INIT_FAILED'));worker.kill();}
  });
  return Object.freeze({
    async callTool(request) {
      if (closed || !alive) throw new Error('WORKER_NOT_AVAILABLE');
      await ready;
      if (inFlight) throw new Error('CONCURRENT_CALL_DENIED');
      const id=++sequence;
      effects.markCall(); // parent owns request counting, not child
      return await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>{
          failCurrent('WORKER_CALL_TIMEOUT');
          if(alive) worker.kill();
        }, CALL_TIMEOUT_MS);
        inFlight={id,resolve,reject,timeout,lastSeq:0};
        worker.send({kind:'CALL',id,request},err=>{
          if(err) failCurrent('WORKER_SEND_FAILED');
        });
      });
    },
    async close() {
      if(closed) return;
      closed=true;
      clearTimeout(initTimer);
      if (!alive) return;
      if(inFlight) failCurrent('WORKER_CLOSED');
      // Bounded graceful shutdown; kill ONLY child spawned by this driver.
      const exited = new Promise(resolve=>worker.once('exit',resolve));
      worker.send({kind:'SHUTDOWN'},err=>{if(err && alive)worker.kill();});
      const killTimer=setTimeout(()=>{if(alive) worker.kill();},350);
      try {await exited;} finally {clearTimeout(killTimer);}
    },
  });
}

/** Integrates subprocess worker with existing parent-owned witness oracle. */
export async function runProcessMcpScenario(raw,{defect='none'}={}) {
  let driver;
  try {
    const result=await runWitnessedScenario(raw,{
      driverFactory:args=>{
        driver=createProcessMcpDriver({...args,defect});
        return driver;
      }
    });
    return {...result,observerSource:'PARENT_OWNED_SYNTHETIC_LEDGER',
      transport:'FIXED_LOCAL_CHILD_PROCESS_IPC'};
  } finally {
    if(driver) await driver.close();
  }
}
