#!/usr/bin/env node
/**
 * M34: offline import of ONE inert MCP client config to our validate-only
 * adapter descriptor. No user files are read, no target is contacted,
 * no process is launched and no credentials/authorization are consumed.
 *
 * Default report NEVER echoes input. Exact --emit-descriptor intentionally
 * sends locally supplied nonsecret fields to stdout for the owner's own
 * private shell redirection; nothing is persisted or sent anywhere.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../src/strict-json.mjs';
import {inspectStdinAdapterDescriptor}
  from './m24-stdin-adapter-preflight.mjs';

const PROFILE='m34-offline-client-config-bridge-v1';
const MAX_STDIN_BYTES=4096,DEADLINE_MS=8000;
const DEFAULT_POLICY=Object.freeze({
  mode:'validate-only',allowNetwork:false,
  allowProcessSpawn:false,allowToolCalls:false,allowCredentials:false
});
const ERROR=Object.freeze({
  reportSchemaVersion:1,profile:PROFILE,status:'ERROR',exitCode:2,
  ruleCode:'M34_INVALID_OR_UNSUPPORTED_CLIENT_CONFIG',
  connectionStatus:'NOT_ATTEMPTED',
  externalTargetContacted:false,processSpawned:false,
  projectConnectionAuthorized:false,realProjectAssessed:false,
  operatorVerified:false,securityCertified:false
});
const has=(o,k)=>Object.hasOwn(o,k);
function props(o){
  if(!o||typeof o!=='object'||Array.isArray(o)||
      Object.getPrototypeOf(o)!==Object.prototype)return null;
  return Object.getOwnPropertyDescriptors(o);
}
function exactData(o,allowed,required){
  const d=props(o);
  if(!d)return false;
  const keys=Reflect.ownKeys(d);
  return keys.every(k=>typeof k==='string'&&allowed.includes(k)&&
       d[k].enumerable&&has(d[k],'value'))&&
    required.every(k=>has(d,k))&&keys.length>=required.length;
}
function get(o,key){
  const d=props(o)?.[key];
  return d?.enumerable&&has(d,'value')?d.value:undefined;
}
function denseStrings(a){
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||
     a.length>12)return false;
  const d=Object.getOwnPropertyDescriptors(a);
  return Reflect.ownKeys(d).length===a.length+1&&
    d.length?.value===a.length&&
    Array.from({length:a.length},(_,i)=>d[String(i)])
      .every(x=>x?.enumerable&&has(x,'value')&&
        typeof x.value==='string');
}
function safeArgs(args){
  if(!denseStrings(args))return false;
  return args.every(s=>s.length>0&&s.length<=128&&
    /^[A-Za-z0-9_@./-]+$/u.test(s)&&
    !s.startsWith('/')&&!s.startsWith('~')&&
    !s.includes('..')&&!s.includes('//')&&
    !/(?:token|secret|passwd|password|credential|apikey|api_key|bearer)/iu.test(s)&&
    !/^(?:-e|-c|--eval|--exec|--require)$/u.test(s)&&
    !/^[A-Za-z]:/u.test(s));
}
function oneServer(input){
  if(!exactData(input,['mcpServers','servers'],[])||
      Reflect.ownKeys(props(input)).length!==1)
    throw Error('UNSUPPORTED_CONFIG_SHAPE');
  const kind=has(input,'mcpServers')?'mcpServers':'servers';
  const collection=get(input,kind);
  const d=props(collection);
  if(!d||Reflect.ownKeys(d).length!==1)
    throw Error('NOT_EXACTLY_ONE_SERVER');
  const name=Reflect.ownKeys(d)[0];
  if(typeof name!=='string'||
     !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/u.test(name)||
     !d[name].enumerable||!has(d[name],'value'))
    throw Error('INVALID_SERVER_NAME');
  return {kind,name,server:d[name].value};
}
export function convertClientConfig(input){
  const {kind,name,server}=oneServer(input);
  const transportKind=get(server,'type');
  let transport;
  if(transportKind===undefined||transportKind==='stdio'){
    if(!exactData(server,['type','command','args'],['command']))
      throw Error('INVALID_STDIO_ENTRY');
    if(kind==='servers'&&transportKind!=='stdio')
      throw Error('MISSING_STDIO_TYPE');
    const command=get(server,'command');
    const args=get(server,'args')===undefined?[]:get(server,'args');
    if(typeof command!=='string'||!safeArgs(args))
      throw Error('INVALID_STDIO_FIELDS');
    transport={type:'stdio',command,args:[...args]};
  }else if(transportKind==='http'||transportKind==='streamable-http'){
    if(!exactData(server,['type','url'],['type','url'])||
       typeof get(server,'url')!=='string')
      throw Error('INVALID_HTTP_FIELDS');
    transport={type:'streamable-http',endpoint:get(server,'url')};
  }else throw Error('UNSUPPORTED_TRANSPORT');
  const descriptor={
    adapterSchemaVersion:1,
    project:{name},
    transport,
    protocolVersion:'2026-07-28',
    policy:{...DEFAULT_POLICY}
  };
  const checked=inspectStdinAdapterDescriptor(descriptor);
  if(checked.status!=='PASS'||checked.checked!==5||
     checked.matched!==5||
     checked.connectionStatus!=='NOT_ATTEMPTED'||
     checked.executionEnabled!==false||
     checked.projectConnectionAuthorized!==false||
     checked.externalTargetContacted!==false||
     checked.operatorVerified!==false||
     checked.realProjectAssessed!==false)
    throw Error('NONINERT_DESCRIPTOR');
  return descriptor;
}
function goodReport(descriptor){
  return Object.freeze({
    reportSchemaVersion:1,profile:PROFILE,status:'PASS',exitCode:0,
    ruleCode:'CLIENT_CONFIG_CONVERTIBLE_OFFLINE_ONLY',
    transport:descriptor.transport.type,
    protocolVersion:'2026-07-28',
    declaredProtocolNegotiated:false,
    checkedFictionalControls:5,
    descriptorEvidence:'CONVERTIBLE_AND_VALIDATE_ONLY',
    realProjectEvidence:'NOT_EVALUATED',
    nextAction:'OPTIONAL_PRIVATE_LOCAL_EXPORT_THEN_M24_PREFLIGHT',
    connectionStatus:'NOT_ATTEMPTED',
    externalTargetContacted:false,processSpawned:false,
    projectConnectionAuthorized:false,realProjectAssessed:false,
    operatorVerified:false,securityCertified:false
  });
}
export function inspectClientConfig(input){
  try{return goodReport(convertClientConfig(input));}
  catch{return ERROR;}
}
function boundedStdin(stream){
  return new Promise((resolveBytes,reject)=>{
    let settled=false,size=0;const chunks=[];
    let timer;
    const cleanup=()=>{
      clearTimeout(timer);stream.off('data',onData);
      stream.off('end',onEnd);stream.off('error',onError);
      stream.pause();
    };
    function settle(error,bytes){
      if(settled)return;
      settled=true;cleanup();
      if(error)reject(Error('M34_STDIN_REJECTED'));
      else resolveBytes(bytes);
    }
    function onData(chunk){
      if(!Buffer.isBuffer(chunk)){settle(true);return;}
      size+=chunk.byteLength;
      if(size>MAX_STDIN_BYTES){settle(true);return;}
      chunks.push(chunk);
    }
    function onEnd(){settle(size===0,Buffer.concat(chunks));}
    function onError(){settle(true);}
    timer=setTimeout(()=>settle(true),DEADLINE_MS);
    stream.on('data',onData);stream.once('end',onEnd);
    stream.once('error',onError);stream.resume();
  });
}
function exactArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==
      Array.prototype)return null;
  const d=Object.getOwnPropertyDescriptors(args);
  if(Reflect.ownKeys(d).length!==args.length+1||
     d.length?.value!==args.length||
     ![0,1].includes(args.length))return null;
  for(let i=0;i<args.length;i++)
    if(!d[String(i)]?.enumerable||!has(d[String(i)],'value'))
      return null;
  if(args.length===0)return false;
  return getIndex(d,0)==='--emit-descriptor'?true:null;
}
const getIndex=(descriptors,i)=>descriptors[String(i)].value;
/**
 * Returns validated descriptor *only* on the exact explicit export flag.
 * Calling with no args returns a safe categorical report (not raw input).
 */
export async function runClientConfigBridge(args=[],stream=process.stdin){
  const emit=exactArgs(args);
  if(emit===null||!stream||stream.isTTY===true||
     typeof stream.on!=='function'||typeof stream.off!=='function'||
     typeof stream.pause!=='function'||typeof stream.resume!=='function')
    return ERROR;
  try{
    const bytes=await boundedStdin(stream);
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    const input=parseStrictJson(text);
    const descriptor=convertClientConfig(input);
    return emit?descriptor:goodReport(descriptor);
  }catch{return ERROR;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runClientConfigBridge(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.status==='ERROR'?2:0;
}
