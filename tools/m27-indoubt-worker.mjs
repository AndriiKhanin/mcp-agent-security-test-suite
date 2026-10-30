#!/usr/bin/env node
/**
 * M27 disposable OS worker, never a real permission gate.
 * A reservation is durable-looking but its effect acknowledgement is not.
 * Direct invocation without the parent-owned IPC and scratch dir is denied.
 */
import {openSync,writeSync,fsyncSync,closeSync,lstatSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const MODES=new Set(['GUARDED','INTENTIONALLY_UNSAFE_RETRY']);
const KEYS=new Set(['alpha','beta']);
const PREFIX='m27-owned-indoubt-';
const IN_DOUBT='FICTIONAL-IN-DOUBT-V1\n';
const SPENT='FICTIONAL-SPENT-V1\n';
const args=process.argv.slice(2);
const root=process.env.M27_OWNED_DIR;
const owned=typeof process.send==='function'&&process.connected===true&&
  process.env.M27_OWNED_WORKER==='FIXED_SOURCE_ONLY'&&
  args.length===2&&args[0]==='--owned-indoubt-worker'&&
  MODES.has(args[1])&&typeof root==='string'&&root.length<400&&
  dirname(resolve(root))===resolve(tmpdir())&&
  new RegExp('^'+PREFIX+'[a-zA-Z0-9_-]+$').test(basename(root));
let safeDir=false;
try{
  if(owned){
    const stat=lstatSync(root);
    safeDir=stat.isDirectory()&&!stat.isSymbolicLink();
  }
}catch{}
if(!owned||!safeDir){
  process.stdout.write(JSON.stringify({status:'ERROR',
    ruleCode:'DIRECT_DISPOSABLE_WORKER_DENIED'})+'\n');
  process.exit(2);
}
const mode=args[1];
const send=(msg,callback)=>process.send(msg,callback);
let pending=null,closed=false;
const good=(msg,type)=>{
  return msg&&typeof msg==='object'&&!Array.isArray(msg)&&
    Object.getPrototypeOf(msg)===Object.prototype&&
    msg.type===type&&Number.isInteger(msg.id)&&msg.id>=1&&msg.id<=5&&
    (type==='SYNC'||type==='CLOSE'||KEYS.has(msg.key));
};
function createClaim(key,content){
  const file=join(root,'claim-'+key+'.marker');
  try{
    const fd=openSync(file,'wx',0o600);
    try{
      const bytes=Buffer.from(content,'utf8');
      if(writeSync(fd,bytes)!==bytes.length)throw Error('SHORT_WRITE');
      fsyncSync(fd);
    }finally{closeSync(fd);}
    return true;
  }catch(e){
    if(e?.code==='EEXIST')return false;
    throw e;
  }
}
function handle(msg){
  try{
    if(!msg||typeof msg!=='object'||Array.isArray(msg)||
       Object.getPrototypeOf(msg)!==Object.prototype||closed){
      send({type:'ERROR'});return;
    }
    if(msg.type==='CLAIM'&&good(msg,'CLAIM')&&pending===null){
      if(!createClaim(msg.key,IN_DOUBT)){
        send({type:'ERROR'});return;
      }
      pending={id:msg.id,key:msg.key};
      send({type:'CLAIMED',id:msg.id});return;
    }
    if(msg.type==='STAGE_EFFECT'&&pending&&
       Number.isInteger(msg.id)&&msg.id===pending.id){
      // Intentional no-ack window: the test's only "effect" is an IPC
      // event; no filesystem or user action is performed by this stage.
      send({type:'EFFECT',id:pending.id});
      pending={...pending,effectStaged:true};
      return;
    }
    if(msg.type==='TRY'&&good(msg,'TRY')&&pending===null){
      let accepted=createClaim(msg.key,SPENT);
      if(!accepted&&mode==='INTENTIONALLY_UNSAFE_RETRY'){
        // Explicitly WRONG comparator: a claimed key is considered
        // unspent, so a replay can produce a second synthetic effect.
        accepted=true;
      }
      if(accepted)send({type:'EFFECT',id:msg.id});
      send({type:'RESULT',id:msg.id,status:accepted?200:423});
      return;
    }
    if(msg.type==='SYNC'&&msg.id===undefined){
      send({type:'SYNCED'});return;
    }
    if(msg.type==='CLOSE'&&pending===null){
      closed=true;
      send({type:'CLOSED'},()=>process.exit(0));return;
    }
    send({type:'ERROR'});
  }catch{
    send({type:'ERROR'});
  }
}
process.on('message',handle);
process.on('disconnect',()=>process.exit(2));
send({type:'READY',policy:mode});
