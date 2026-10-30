#!/usr/bin/env node
/**
 * M32 child: fixed cross-process scratch mutations behind a parent IPC
 * barrier. All writes are inert and restricted to an owned temp directory.
 */
import {openSync,writeSync,closeSync,fsyncSync,lstatSync,unlinkSync}
  from 'node:fs';
import {join,dirname,basename,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const CONTENT=Object.freeze({
  PRIMARY:'FICTIONAL-M32-MARKER-ALPHA\n',
  SWAPPED:'FICTIONAL-M32-MARKER-BRAVO\n',
  CORRUPT:'NOT-A-VALID-MARKER\n',
  OVERSIZE:'X'.repeat(256),
  FOREIGN:'FICTIONAL-EXTRA-FILE\n'
});
const CASES=Object.freeze({
  STABLE_MARKER:{initial:true,mutation:'NONE'},
  SWAP_SAME_SIZE:{initial:true,mutation:'SWAP'},
  REMOVE_AFTER_STAT:{initial:true,mutation:'REMOVE'},
  CREATE_AFTER_ABSENCE:{initial:false,mutation:'CREATE'},
  REPLACE_CORRUPT:{initial:true,mutation:'CORRUPT'},
  REPLACE_OVERSIZE:{initial:true,mutation:'OVERSIZE'},
  ADD_FOREIGN_ENTRY:{initial:true,mutation:'EXTRA'},
  STABLE_ABSENT:{initial:false,mutation:'NONE'}
});
const args=process.argv.slice(2);
const root=process.env.M32_OWNED_ROOT;
const spec=args.length===2&&args[0]==='--m32-owned'?
  CASES[args[1]]:undefined;
let safe=false;
try{
  if(spec&&typeof process.send==='function'&&process.connected&&
      process.env.M32_OWNED_CHILD==='FIXED_LAB'&&
      typeof root==='string'&&root.length<400&&
      dirname(resolve(root))===resolve(tmpdir())&&
      /^m32-owned-path-[A-Za-z0-9_-]+$/.test(basename(root))){
    const s=lstatSync(root);
    safe=s.isDirectory()&&!s.isSymbolicLink();
  }
}catch{}
if(!safe){
  process.stdout.write(JSON.stringify({
    status:'ERROR',ruleCode:'DIRECT_M32_WORKER_DENIED'
  })+'\n');
  process.exit(2);
}
let started=false,mutated=false,closing=false;
const file=join(root,'effect.marker');
function create(name,value){
  const bytes=Buffer.from(value);
  const fd=openSync(join(root,name),'wx',0o600);
  try{
    if(writeSync(fd,bytes)!==bytes.length)throw Error('SHORT_WRITE');
    fsyncSync(fd);
  }finally{closeSync(fd);}
}
function change(){
  switch(spec.mutation){
    case 'NONE':return;
    case 'REMOVE':unlinkSync(file);return;
    case 'CREATE':create('effect.marker',CONTENT.PRIMARY);return;
    case 'EXTRA':create('foreign.marker',CONTENT.FOREIGN);return;
    case 'SWAP':
    case 'CORRUPT':
    case 'OVERSIZE':
      unlinkSync(file);
      create('effect.marker',CONTENT[
        spec.mutation==='SWAP'?'SWAPPED':
        spec.mutation==='CORRUPT'?'CORRUPT':'OVERSIZE'
      ]);
      return;
    default:throw Error('INVALID_FIXED_ACTION');
  }
}
const send=(msg,done)=>process.send(msg,done);
process.on('message',msg=>{
  try{
    if(!msg||typeof msg!=='object'||Array.isArray(msg)||
        Object.getPrototypeOf(msg)!==Object.prototype||closing||
        Object.keys(msg).length!==1){
      send({type:'ERROR'});return;
    }
    if(msg.type==='START'&&!started){
      started=true;
      if(spec.initial)create('effect.marker',CONTENT.PRIMARY);
      send({type:'STARTED'});return;
    }
    if(msg.type==='MUTATE'&&started&&!mutated){
      mutated=true;
      change();
      send({type:'MUTATED'});return;
    }
    if(msg.type==='CLOSE'&&mutated){
      closing=true;
      send({type:'CLOSED'},()=>process.exit(0));return;
    }
    send({type:'ERROR'});
  }catch{send({type:'ERROR'});}
});
process.on('disconnect',()=>process.exit(2));
send({type:'READY'});
