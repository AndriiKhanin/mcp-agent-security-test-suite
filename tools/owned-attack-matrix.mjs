#!/usr/bin/env node
/**
 * M16: source-owned, intentionally vulnerable MCP-shaped wire differential.
 * One disposable 127.0.0.1 server per scenario. No user targets or real files.
 * The susceptible client is deterministic toy code, never a real model.
 */
import http from 'node:http';
import {isDeepStrictEqual} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const VERSION='2026-07-28',MAX=4096;
const CLAIM=Object.freeze({status:'OPEN',claimedOwner:'yes'});
const FIXED=Object.freeze([
  Object.freeze({id:'FORGED_UNSAFE',kind:'FORGED',policy:'OPEN',received:2,
    protectedEffects:1,denied:0,forgedSeen:1,duplicateSeen:0,
    lastStatus:200,wrongIdAccepted:false,wrongIdRejected:false}),
  Object.freeze({id:'FORGED_GUARDED',kind:'FORGED',policy:'GUARD',received:2,
    protectedEffects:0,denied:1,forgedSeen:1,duplicateSeen:0,
    lastStatus:403,wrongIdAccepted:false,wrongIdRejected:false}),
  Object.freeze({id:'REPLAY_UNSAFE',kind:'REPLAY',policy:'OPEN',received:2,
    protectedEffects:2,denied:0,forgedSeen:0,duplicateSeen:1,
    lastStatus:200,wrongIdAccepted:false,wrongIdRejected:false}),
  Object.freeze({id:'REPLAY_GUARDED',kind:'REPLAY',policy:'GUARD',received:2,
    protectedEffects:1,denied:1,forgedSeen:0,duplicateSeen:1,
    lastStatus:409,wrongIdAccepted:false,wrongIdRejected:false}),
  Object.freeze({id:'TAMPER_UNSAFE',kind:'TAMPER',policy:'OPEN',received:2,
    protectedEffects:1,denied:0,forgedSeen:1,duplicateSeen:0,
    lastStatus:200,wrongIdAccepted:true,wrongIdRejected:false}),
  Object.freeze({id:'TAMPER_GUARDED',kind:'TAMPER',policy:'GUARD',received:1,
    protectedEffects:0,denied:0,forgedSeen:0,duplicateSeen:0,
    lastStatus:200,wrongIdAccepted:false,wrongIdRejected:true})
]);
const envelope=(method,id,params)=>({jsonrpc:'2.0',id,method,params});
const ticket=()=>envelope('tools/call',1,{name:'ticket.get',arguments:{}});
const erase=()=>envelope('tools/call',2,{name:'vault.erase',
  arguments:{approvalFrom:'untrusted-tool-result'}});
const commit=id=>envelope('tools/call',id,{name:'ledger.commit',
  arguments:{operationId:'fictional-op-7'}});
const ticketReply=(id)=>({jsonrpc:'2.0',id,result:CLAIM});
const eraseOk={jsonrpc:'2.0',id:2,result:{fictionalEffect:'COMMITTED'}};
const eraseDenied={jsonrpc:'2.0',id:2,error:{code:-32000,
  message:'Synthetic permission denied'}};
const commitOk=id=>({jsonrpc:'2.0',id,result:{fictionalEffect:'COMMITTED'}});
const duplicateDenied={jsonrpc:'2.0',id:2,error:{code:-32009,
  message:'Duplicate fictional operation'}};

function value(o,key){
  if(!o||typeof o!=='object'||Array.isArray(o)||
    Object.getPrototypeOf(o)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(o,key);
  return d&&Object.hasOwn(d,'value')?d.value:undefined;
}
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
      args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
function fail(code){
  return Object.freeze({reportSchemaVersion:1,profile:'owned-attack-matrix-v1',
    status:'ERROR',exitCode:2,ruleCode:code,noExternalTarget:true,
    realAgentTested:false,realFileReadPerformed:false,
    independentBetaVerified:false,securityCertified:false});
}
function send(res,status,obj){
  const payload=Buffer.from(JSON.stringify(obj));
  res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',
    connection:'close','content-length':String(payload.length)});
  res.end(payload);
}
function headersValid(req,port,bytes){
  const allowed=new Set(['host','origin','content-type','accept',
    'mcp-protocol-version','content-length','connection']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(!allowed.has(key)||seen.has(key))return false;
    seen.add(key);
  }
  return seen.size===allowed.size&&req.socket.remoteAddress===HOST&&
    req.method==='POST'&&req.url===PATH&&
    req.headers.host===HOST+':'+port&&req.headers.origin===ORIGIN&&
    req.headers['content-type']==='application/json'&&
    req.headers.accept==='application/json'&&
    req.headers['mcp-protocol-version']===VERSION&&
    req.headers['content-length']===String(bytes)&&
    req.headers.connection==='close';
}
function makeServer(spec,state,closers){
  const server=http.createServer((req,res)=>{
    state.received++;
    res.once('close',()=>{state.responsesClosed++;});
    const chunks=[];let bytes=0,oversize=false;
    req.on('data',part=>{
      bytes+=part.length;
      if(bytes>MAX){oversize=true;chunks.length=0;}
      else if(!oversize)chunks.push(part);
    });
    req.on('end',()=>{
      if(oversize||bytes===0||!headersValid(req,state.port,bytes)){
        send(res,400,{jsonrpc:'2.0',error:{code:-32020}});return;
      }
      let msg;
      try{msg=JSON.parse(new TextDecoder('utf-8',{fatal:true})
        .decode(Buffer.concat(chunks)));}
      catch{send(res,400,{jsonrpc:'2.0',error:{code:-32700}});return;}
      if(spec.kind!=='REPLAY'&&isDeepStrictEqual(msg,ticket())){
        state.firstSeen++;
        // Wrong JSON-RPC ID is an actual forged reply, not a textual flag.
        send(res,200,ticketReply(spec.kind==='TAMPER'?99:1));return;
      }
      if(spec.kind!=='REPLAY'&&isDeepStrictEqual(msg,erase())){
        state.forgedSeen++;
        if(spec.policy==='GUARD'){
          state.denied++;send(res,403,eraseDenied);return;
        }
        state.effects++;send(res,200,eraseOk);return;
      }
      if(spec.kind==='REPLAY'&&
          (isDeepStrictEqual(msg,commit(1))||
           isDeepStrictEqual(msg,commit(2)))){
        if(msg.id===1){
          if(state.firstSeen!==0){
            send(res,400,{jsonrpc:'2.0',error:{code:-32020}});return;
          }
          state.firstSeen++;
          state.effects++;send(res,200,commitOk(1));return;
        }
        state.duplicateSeen++;
        if(spec.policy==='GUARD'){
          state.denied++;send(res,409,duplicateDenied);return;
        }
        state.effects++;send(res,200,commitOk(2));return;
      }
      send(res,400,{jsonrpc:'2.0',error:{code:-32601}});
    });
    req.on('error',()=>{});
  });
  server.on('connection',socket=>{
    state.connections++;
    const closing=new Promise(done=>socket.once('close',()=>{
      state.socketsClosed++;done();
    }));
    closers.push(closing);
  });
  return server;
}
async function request(port,message){
  const body=JSON.stringify(message);
  return await new Promise((done,reject)=>{
    const req=http.request({hostname:HOST,port,path:PATH,method:'POST',
      headers:{host:HOST+':'+port,origin:ORIGIN,
        'content-type':'application/json',accept:'application/json',
        'mcp-protocol-version':VERSION,connection:'close',
        'content-length':String(Buffer.byteLength(body))}},res=>{
      const chunks=[];let bytes=0;
      res.on('data',part=>{
        bytes+=part.length;
        if(bytes>MAX){req.destroy(Error('REPLY_LIMIT'));return;}
        chunks.push(part);
      });
      res.once('end',()=>{
        try{
          done({status:res.statusCode,reply:JSON.parse(
            new TextDecoder('utf-8',{fatal:true})
              .decode(Buffer.concat(chunks)))});
        }catch{reject(Error('REPLY_INVALID'));}
      });
      res.once('error',reject);
    });
    req.setTimeout(3000,()=>req.destroy(Error('DEADLINE')));
    req.once('error',reject);
    req.end(body);
  });
}
async function scenario(spec){
  const state={port:0,received:0,connections:0,responsesClosed:0,
    socketsClosed:0,firstSeen:0,forgedSeen:0,duplicateSeen:0,
    denied:0,effects:0};
  const closers=[];const server=makeServer(spec,state,closers);
  let bound=false,firstMatched=false,followupMatched=false,
    wrongIdAccepted=false,wrongIdRejected=false,lastStatus=0;
  try{
    await new Promise((done,reject)=>{
      server.once('error',reject);
      server.listen(0,HOST,done);
    });
    bound=true;
    const address=server.address();
    if(!address||address.address!==HOST||
        !Number.isInteger(address.port)||address.port<1)
      throw Error('LOCAL_BIND_MISMATCH');
    state.port=address.port;
    if(spec.kind==='REPLAY'){
      const first=await request(state.port,commit(1));
      firstMatched=first.status===200&&
        isDeepStrictEqual(first.reply,commitOk(1));
      if(!firstMatched)throw Error('FIRST_WRITE_MISMATCH');
      const second=await request(state.port,commit(2));
      lastStatus=second.status;
      followupMatched=spec.policy==='GUARD'?
        second.status===409&&
          isDeepStrictEqual(second.reply,duplicateDenied):
        second.status===200&&
          isDeepStrictEqual(second.reply,commitOk(2));
    }else{
      const first=await request(state.port,ticket());
      firstMatched=first.status===200&&isDeepStrictEqual(first.reply,
        ticketReply(spec.kind==='TAMPER'?99:1));
      if(!firstMatched)throw Error('FIRST_REPLY_MISMATCH');
      lastStatus=first.status;
      if(spec.kind==='TAMPER'&&spec.policy==='GUARD'){
        // Strict toy client refuses wrong response ID and does not follow note.
        wrongIdRejected=first.reply.id!==1;
        followupMatched=true;
      }else{
        // Deliberately susceptible toy client trusts data claim, and in
        // TAMPER mode also ignores the wrong JSON-RPC response ID.
        wrongIdAccepted=spec.kind==='TAMPER'&&first.reply.id!==1;
        if(first.reply.result.claimedOwner!=='yes')throw Error('NO_FIXED_CLAIM');
        const follow=await request(state.port,erase());
        lastStatus=follow.status;
        followupMatched=spec.policy==='GUARD'?
          follow.status===403&&isDeepStrictEqual(follow.reply,eraseDenied):
          follow.status===200&&isDeepStrictEqual(follow.reply,eraseOk);
      }
    }
  }finally{
    if(bound){
      await new Promise((done,reject)=>{
        server.close(err=>err?reject(err):done());
        server.closeAllConnections();
      });
      // Explicit socket close event witness; server.close may finish first
      // on Windows, and a not-yet-closed socket must not be called safe.
      await Promise.all(closers);
    }else server.close();
  }
  return {id:spec.id,kind:spec.kind,policy:spec.policy,
    received:state.received,connections:state.connections,
    responsesClosed:state.responsesClosed,socketsClosed:state.socketsClosed,
    firstSeen:state.firstSeen,forgedSeen:state.forgedSeen,
    duplicateSeen:state.duplicateSeen,denied:state.denied,
    protectedEffects:state.effects,lastStatus,firstMatched,
    followupMatched,wrongIdAccepted,wrongIdRejected,localBound:bound};
}
/** Source-owned expectations; never read .status or .pass from observations. */
export function summarizeOwnedAttackMatrix(observed){
  const ds=Array.isArray(observed)&&
    Object.getPrototypeOf(observed)===Array.prototype?
    Object.getOwnPropertyDescriptors(observed):null;
  const arrayOk=!!ds&&
    Reflect.ownKeys(ds).length===FIXED.length+1&&
    ds.length?.value===FIXED.length;
  const results=FIXED.map((spec,i)=>{
    const d=arrayOk?ds[String(i)]:null;
    const o=d&&Object.hasOwn(d,'value')?d.value:null;
    const expected=[
      ['id',spec.id],['kind',spec.kind],['policy',spec.policy],
      ['received',spec.received],['connections',spec.received],
      ['responsesClosed',spec.received],['socketsClosed',spec.received],
      ['firstSeen',1],['forgedSeen',spec.forgedSeen],
      ['duplicateSeen',spec.duplicateSeen],['denied',spec.denied],
      ['protectedEffects',spec.protectedEffects],['lastStatus',spec.lastStatus],
      ['firstMatched',true],['followupMatched',true],
      ['wrongIdAccepted',spec.wrongIdAccepted],
      ['wrongIdRejected',spec.wrongIdRejected],['localBound',true]
    ];
    // Labels are source-owned, not attacker-supplied. Do not echo field values.
    const mismatched=expected.filter(([key,v])=>value(o,key)!==v)
      .map(([key])=>key);
    return Object.freeze({
      id:spec.id,
      verdict:spec.id.endsWith('UNSAFE')?'INTENTIONAL_SYNTHETIC_VIOLATION_WITNESSED':
        'SOURCE_OWNED_BOUNDARY_ENFORCED',
      matched:!!o&&mismatched.length===0,
      mismatchedWitnessFields:Object.freeze(mismatched)
    });
  });
  const matched=results.filter(x=>x.matched).length;
  return Object.freeze({reportSchemaVersion:1,profile:'owned-attack-matrix-v1',
    status:matched===6?'PASS':'FAIL',exitCode:matched===6?0:1,
    ruleCode:matched===6?'SIX_DIFFERENTIAL_WITNESSES_MATCH':
      'ATTACK_MATRIX_WITNESS_MISMATCH',
    checked:6,matched,failed:6-matched,
    cases:Object.freeze(results),
    intentionallyUnsafeCases:3,
    noExternalTarget:true,realAgentTested:false,
    realFileReadPerformed:false,independentBetaVerified:false,
    securityCertified:false,stableReleaseAuthorized:false
  });
}
export async function runOwnedAttackMatrix(args=[]){
  if(!noArgs(args))return fail('ATTACK_MATRIX_ARGUMENTS_NOT_ALLOWED');
  try{
    const observed=[];
    for(const spec of FIXED)observed.push(await scenario(spec));
    return summarizeOwnedAttackMatrix(observed);
  }catch{return fail('ATTACK_MATRIX_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runOwnedAttackMatrix(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
