#!/usr/bin/env node
/**
 * M31 disposable child. The marker is inert first-party scratch evidence;
 * an IPC "claim" is deliberately untrusted. Never use as a real effect gate.
 */
import {openSync,writeSync,fsyncSync,closeSync,lstatSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const ROOT=process.env.M31_OWNED_DIR;
const CASES=Object.freeze({
  TRUTHFUL_COMMITTED:{write:'PRIMARY',claim:'COMMITTED'},
  FALSE_COMMITTED_NO_MARKER:{write:'NONE',claim:'COMMITTED'},
  FALSE_ABSENT_WITH_MARKER:{write:'PRIMARY',claim:'ABSENT'},
  TRUTHFUL_ABSENT:{write:'NONE',claim:'ABSENT'},
  CORRUPTED_MARKER:{write:'CORRUPT',claim:'COMMITTED'},
  REMOVED_BETWEEN_READS:{write:'PRIMARY',claim:'COMMITTED'},
  REWRITTEN_BETWEEN_READS:{write:'PRIMARY',claim:'COMMITTED'}
});
const PAYLOADS=Object.freeze({
  PRIMARY:'FICTIONAL-M31-MARKER-PRIMARY-V1\n',
  CORRUPT:'FICTIONAL-M31-MARKER-BROKEN\n'
});
const args=process.argv.slice(2);
const mode=args.length===2&&args[0]==='--owned-m31-worker'?
  CASES[args[1]]:undefined;
let safe=false;
try{
  if(mode&&typeof process.send==='function'&&process.connected&&
      process.env.M31_OWNED_WORKER==='SOURCE_ONLY'&&
      typeof ROOT==='string'&&ROOT.length<400&&
      dirname(resolve(ROOT))===resolve(tmpdir())&&
      /^m31-owned-effect-[A-Za-z0-9_-]+$/.test(basename(ROOT))){
    const info=lstatSync(ROOT);
    safe=info.isDirectory()&&!info.isSymbolicLink();
  }
}catch{}
if(!safe){
  process.stdout.write(JSON.stringify({
    status:'ERROR',ruleCode:'DIRECT_M31_WORKER_DENIED'
  })+'\n');
  process.exit(2);
}
let ran=false,closing=false;
function writeMarker(value){
  if(value==='NONE')return;
  const bytes=Buffer.from(PAYLOADS[value],'utf8');
  const fd=openSync(join(ROOT,'effect.marker'),'wx',0o600);
  try{
    if(writeSync(fd,bytes)!==bytes.length)throw Error('SHORT_WRITE');
    fsyncSync(fd);
  }finally{closeSync(fd);}
}
function send(data,done){process.send(data,done);}
process.on('message',message=>{
  try{
    if(!message||typeof message!=='object'||Array.isArray(message)||
        Object.getPrototypeOf(message)!==Object.prototype||closing){
      send({type:'ERROR'});return;
    }
    if(message.type==='RUN'&&!ran&&Object.keys(message).length===1){
      ran=true;
      writeMarker(mode.write);
      // The claim is intentionally possibly false. Parent must read disk.
      send({type:'RESULT',claim:mode.claim});return;
    }
    if(message.type==='CLOSE'&&ran&&
        Object.keys(message).length===1){
      closing=true;
      send({type:'CLOSED'},()=>process.exit(0));return;
    }
    send({type:'ERROR'});
  }catch{
    send({type:'ERROR'});
  }
});
process.on('disconnect',()=>process.exit(2));
send({type:'READY'});
