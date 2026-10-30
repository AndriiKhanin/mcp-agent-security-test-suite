#!/usr/bin/env node
/**
 * M31: disposable, child-owned filesystem-effect toy.
 * Direct invocation denied. Only parent IPC + fixed newly created
 * OS temp directory; never user or application files.
 */
import {openSync,writeSync,fsyncSync,closeSync,unlinkSync,
  lstatSync} from 'node:fs';
import {join,basename,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const PREFIX='m31-owned-effect-';
const SOURCE='M31-DISPOSABLE-IPC-ONLY';
const MARKER='effect.marker';
const VALID='M31-FICTIONAL-COMMITTED-EFFECT-V1\n';
const CORRUPT='M31-FICTIONAL-UNTRUSTED-BYTES-V1\n';
const allowed=new Set(['COMMIT','NOOP','CORRUPT','REMOVE','REWRITE']);
const root=process.env.M31_OWNED_SCRATCH;
const args=process.argv.slice(2);
const owned=typeof process.send==='function'&&
  process.connected===true&&
  process.env.M31_WORKER_SOURCE===SOURCE&&
  args.length===1&&args[0]==='--owned-effect-worker'&&
  typeof root==='string'&&root.length<480&&
  dirname(resolve(root))===resolve(tmpdir())&&
  new RegExp('^'+PREFIX+'[a-zA-Z0-9_-]+$').test(basename(root));
let safeDir=false;
try{
  if(owned){
    const st=lstatSync(root);
    safeDir=st.isDirectory()&&!st.isSymbolicLink();
  }
}catch{}
if(!owned||!safeDir){
  process.stdout.write(JSON.stringify({status:'ERROR',
    ruleCode:'DIRECT_OWNED_WORKER_DENIED'})+'\n');
  process.exit(2);
}
const path=join(root,MARKER);
let phase='READY';
const reply=(type)=>process.send({type});
function put(content,exclusive){
  const fd=openSync(path,exclusive?'wx':'w',0o600);
  try{
    const bytes=Buffer.from(content,'utf8');
    if(writeSync(fd,bytes)!==bytes.length)throw Error('SHORT_WRITE');
    fsyncSync(fd);
  }finally{closeSync(fd);}
}
function processAction(action){
  if(action==='COMMIT'){put(VALID,true);return;}
  if(action==='CORRUPT'){put(CORRUPT,true);return;}
  if(action==='NOOP')return;
  if(action==='REMOVE'){unlinkSync(path);return;}
  if(action==='REWRITE'){put(CORRUPT,false);return;}
  throw Error('INVALID_ACTION');
}
process.on('message',msg=>{
  try{
    if(!msg||typeof msg!=='object'||Array.isArray(msg)||
      Object.getPrototypeOf(msg)!==Object.prototype||
      typeof msg.type!=='string'){
      reply('DENIED');return;
    }
    if(msg.type==='ACTION'&&phase==='READY'&&
      typeof msg.action==='string'&&allowed.has(msg.action)&&
      ['COMMIT','NOOP','CORRUPT'].includes(msg.action)&&
      Object.keys(msg).length===2){
      processAction(msg.action);
      phase='ACTED';
      reply('ACTION_ACK');return;
    }
    if(msg.type==='CLAIM'&&phase==='ACTED'&&
      ['COMMITTED','ABSENT'].includes(msg.outcome)&&
      Object.keys(msg).length===2){
      // A worker's outcome is only its claim, never OS-effect proof.
      phase='CLAIMED';
      process.send({type:'OUTCOME_CLAIM',outcome:msg.outcome});
      return;
    }
    if(msg.type==='MUTATE'&&phase==='CLAIMED'&&
      ['REMOVE','REWRITE'].includes(msg.action)&&
      Object.keys(msg).length===2){
      processAction(msg.action);
      phase='MUTATED';
      reply('MUTATE_ACK');return;
    }
    if(msg.type==='CLOSE'&&['CLAIMED','MUTATED'].includes(phase)&&
      Object.keys(msg).length===1){
      phase='CLOSED';
      process.send({type:'CLOSED'},()=>process.exit(0));
      return;
    }
    reply('DENIED');
  }catch{reply('DENIED');}
});
process.on('disconnect',()=>process.exit(2));
reply('READY');
