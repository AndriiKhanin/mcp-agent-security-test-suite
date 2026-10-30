#!/usr/bin/env node
/**
 * M26: source-owned, disposable worker with a fixed fictional spent-key ledger.
 * Not a production credential service; no real user data or external calls.
 * Direct invocation without a parent-created IPC channel fails closed.
 */
import {openSync,writeSync,fsyncSync,closeSync,lstatSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const modes=new Set(['GUARDED','INTENTIONALLY_TRANSIENT']);
const keys=new Set(['alpha','beta']);
const args=process.argv.slice(2);
const root=process.env.M26_OWNED_LEDGER_DIR;
const owned=typeof process.send==='function'&&
  process.env.M26_OWNED_WORKER==='SOURCE_ONLY_TEST'&&
  args.length===2&&args[0]==='--fixed-ledger-worker'&&modes.has(args[1])&&
  typeof root==='string'&&root.length<400&&
  dirname(resolve(root))===resolve(tmpdir())&&
  /^m26-owned-ledger-[a-zA-Z0-9_-]+$/.test(basename(root));
let validDir=false;
try{
  if(owned){
    const stat=lstatSync(root);
    validDir=stat.isDirectory()&&!stat.isSymbolicLink();
  }
}catch{}
if(!owned||!validDir){
  process.stdout.write(JSON.stringify({
    status:'ERROR',ruleCode:'DIRECT_DISPOSABLE_WORKER_DENIED'
  })+'\n');
  process.exit(2);
}
const mode=args[1],spent=new Set();
let pending=null,closed=false;
const send=message=>process.send(message);
function handle(message){
  if(!message||typeof message!=='object'||Array.isArray(message)||
      Object.getPrototypeOf(message)!==Object.prototype){
    send({type:'ERROR'});return;
  }
  if(message.type==='PREPARE'&&pending===null&&!closed&&
      Number.isInteger(message.id)&&message.id>=1&&message.id<=4&&
      keys.has(message.key)){
    pending={id:message.id,key:message.key};
    send({type:'PREPARED',id:pending.id});return;
  }
  if(message.type==='RELEASE'&&pending&&
      message.id===pending.id&&!closed){
    const {id,key}=pending;
    pending=null;
    let admitted=false;
    if(mode==='GUARDED'){
      const file=join(root,'spent-'+key+'.marker');
      try{
        // Atomic create, shared across distinct OS processes. Never open
        // an existing path for writing; EEXIST is fail-closed replay.
        const fd=openSync(file,'wx',0o600);
        try{
          writeSync(fd,Buffer.from('FICTIONAL-SPENT-V1\n','utf8'));
          fsyncSync(fd);
        }finally{closeSync(fd);}
        admitted=true;
      }catch(e){
        if(e?.code!=='EEXIST'){
          send({type:'ERROR'});return;
        }
      }
    }else{
      // Intentionally vulnerable negative control: this Set vanishes
      // after an actual OS process exit, so replay in the new process
      // commits an extra fictional effect.
      admitted=!spent.has(key);
      if(admitted)spent.add(key);
    }
    if(admitted)send({type:'EFFECT',id});
    send({type:'RESULT',id,status:admitted?200:409});
    return;
  }
  if(message.type==='CLOSE'&&!pending&&!closed){
    closed=true;
    send({type:'CLOSED'},()=>process.exit(0));
    return;
  }
  send({type:'ERROR'});
}
process.on('message',handle);
process.on('disconnect',()=>process.exit(2));
send({type:'READY',policy:mode});
