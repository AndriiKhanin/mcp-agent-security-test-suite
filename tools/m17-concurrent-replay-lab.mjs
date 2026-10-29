#!/usr/bin/env node
/**
 * M17: fixed, first-party concurrent same-key replay differential.
 * Real ephemeral IPv4 loopback sockets, source-owned JSON-RPC envelopes,
 * protected effects are IN-MEMORY COUNTERS ONLY. No user inputs/targets.
 */
import http from 'node:http';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const VERSION='2026-07-28',MAX_BYTES=4096;
const CASES=Object.freeze([
  Object.freeze({id:'UNSAFE_SAME_KEY',policy:'CHECK_THEN_COMMIT',
    keys:Object.freeze(['fictional-op-a','fictional-op-a']),
    admitted:2,denied:0,duplicates:1,effects:2,statuses:Object.freeze([200,200])}),
  Object.freeze({id:'GUARDED_SAME_KEY',policy:'RESERVE_BEFORE_EFFECT',
    keys:Object.freeze(['fictional-op-a','fictional-op-a']),
    admitted:1,denied:1,duplicates:1,effects:1,statuses:Object.freeze([200,409])}),
  Object.freeze({id:'GUARDED_DISTINCT_KEY',policy:'RESERVE_BEFORE_EFFECT',
    keys:Object.freeze(['fictional-op-a','fictional-op-b']),
    admitted:2,denied:0,duplicates:0,effects:2,statuses:Object.freeze([200,200])})
]);
const field=(obj,key)=>{
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
    Object.getPrototypeOf(obj)!==Object.prototype)return undefined;
  const slot=Object.getOwnPropertyDescriptor(obj,key);
  return slot&&Object.hasOwn(slot,'value')?slot.value:undefined;
};
const exactArray=(arr,values)=>{
  if(!Array.isArray(arr)||Object.getPrototypeOf(arr)!==Array.prototype||
     arr.length!==values.length)return false;
  const descriptors=Object.getOwnPropertyDescriptors(arr);
  if(Reflect.ownKeys(descriptors).length!==values.length+1||
     descriptors.length?.value!==values.length)return false;
  return values.every((value,i)=>{
    const slot=descriptors[String(i)];
    return slot?.enumerable&&Object.hasOwn(slot,'value')&&slot.value===value;
  });
};
const noArgs=args=>exactArray(args,[]);
const errorReport=ruleCode=>Object.freeze({
  reportSchemaVersion:1,profile:'first-party-concurrent-replay-differential-v1',
  status:'ERROR',exitCode:2,ruleCode,externalMcpContacted:false,
  realAgentBehaviorObserved:false,realCredentialsUsed:false,
  independentBetaVerified:false,securityCertified:false
});
const requestEnvelope=(id,key)=>({jsonrpc:'2.0',id,method:'tools/call',
  params:{name:'ledger.commit',arguments:{operationId:key},
    _meta:{'io.modelcontextprotocol/protocolVersion':VERSION}}});
const ok=id=>({jsonrpc:'2.0',id,result:{fictionalEffect:'IN_MEMORY_ONLY'}});
const denied=id=>({jsonrpc:'2.0',id,error:{
  code:-32009,message:'Duplicate fictional operation'}});
function send(res,status,body) {
  const data=Buffer.from(JSON.stringify(body));
  res.writeHead(status,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(data.length)});
  res.end(data);
}
function validHeaders(req,port,bytes) {
  const permitted=new Set(['host','origin','content-type','accept',
    'mcp-protocol-version','content-length','connection']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(!permitted.has(key)||seen.has(key))return false;
    seen.add(key);
  }
  return seen.size===permitted.size&&req.socket.remoteAddress===HOST&&
    req.method==='POST'&&req.url===PATH&&
    req.headers.host===HOST+':'+port&&req.headers.origin===ORIGIN&&
    req.headers['content-type']==='application/json'&&
    req.headers.accept==='application/json'&&
    req.headers['mcp-protocol-version']===VERSION&&
    req.headers['content-length']===String(bytes)&&
    req.headers.connection==='close';
}
function ownedServer(spec,state,sockets) {
  const reserved=new Set(),committed=new Set(),seen=new Set();
  const pending=[];
  function releaseTogether(){
    if(pending.length!==2)return;
    // The server intentionally holds all replies until the two validated
    // requests have overlapped. No delay/sleep controls the outcome.
    state.overlapWitnessed=state.responsesIssued===0&&
      state.validatedBodies===2&&state.connections===2;
    for(const item of pending){
      if(item.admitted){
        committed.add(item.key);
        state.accepted++;
        state.effects++;
        send(item.res,200,ok(item.id));
      }else {
        state.denied++;
        send(item.res,409,denied(item.id));
      }
      state.responsesIssued++;
    }
  }
  return http.createServer((req,res)=>{
    state.received++;
    res.once('close',()=>{state.responsesClosed++;});
    const chunks=[];let size=0,overflow=false;
    req.on('data',part=>{
      size+=part.length;
      if(size>MAX_BYTES){overflow=true;chunks.length=0;}
      else if(!overflow)chunks.push(part);
    });
    req.on('end',()=>{
      if(overflow||size<1||!validHeaders(req,state.port,size)){
        send(res,400,{jsonrpc:'2.0',error:{code:-32020}});return;
      }
      let parsed;
      try{
        parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch{send(res,400,{jsonrpc:'2.0',error:{code:-32700}});return;}
      const valid=[1,2].some(id=>
        isDeepStrictEqual(parsed,requestEnvelope(id,spec.keys[id-1])));
      if(!valid||pending.some(x=>x.id===parsed.id)){
        send(res,400,{jsonrpc:'2.0',error:{code:-32020}});return;
      }
      state.validatedBodies++;
      const key=parsed.params.arguments.operationId;
      if(seen.has(key))state.duplicateSeen++;
      else seen.add(key);
      let admitted;
      if(spec.policy==='RESERVE_BEFORE_EFFECT'){
        admitted=!reserved.has(key);
        // Reserve the operation immediately at admission, not after the
        // asynchronous rendezvous. This is the guard against concurrent
        // check-then-effect replay.
        if(admitted)reserved.add(key);
      }else{
        // Deliberately vulnerable TOCTOU: pending operations are NOT
        // reserved, and committed changes only after both requests arrive.
        admitted=!committed.has(key);
      }
      pending.push({id:parsed.id,key,res,admitted});
      releaseTogether();
    });
    req.on('error',()=>{});
  }).on('connection',socket=>{
    state.connections++;
    sockets.add(socket);
    socket.once('close',()=>{
      state.socketsClosed++;
      sockets.delete(socket);
    });
  });
}
async function callOwned(port,id,key){
  const payload=JSON.stringify(requestEnvelope(id,key));
  return await new Promise((done,fail)=>{
    const req=http.request({hostname:HOST,port,path:PATH,method:'POST',
      headers:{host:HOST+':'+port,origin:ORIGIN,
        'content-type':'application/json',accept:'application/json',
        'mcp-protocol-version':VERSION,connection:'close',
        'content-length':String(Buffer.byteLength(payload))}},res=>{
      let size=0;const parts=[];
      res.on('data',part=>{
        size+=part.length;
        if(size>MAX_BYTES){req.destroy(Error('RESPONSE_LIMIT'));return;}
        parts.push(part);
      });
      res.once('end',()=>{
        try{
          const body=JSON.parse(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(parts)));
          done({id,status:res.statusCode,body});
        }catch{fail(Error('RESPONSE_INVALID'));}
      });
      res.once('error',fail);
    });
    req.setTimeout(3500,()=>req.destroy(Error('BOUNDED_DEADLINE')));
    req.once('error',fail);
    req.end(payload);
  });
}
async function runCase(spec){
  const state={port:0,received:0,connections:0,validatedBodies:0,
    accepted:0,denied:0,duplicateSeen:0,effects:0,
    responsesIssued:0,responsesClosed:0,socketsClosed:0,
    overlapWitnessed:false};
  const sockets=new Set();
  const server=ownedServer(spec,state,sockets);
  let listening=false,matchedBodies=false,actualStatuses=[];
  try{
    await new Promise((done,fail)=>{
      server.once('error',fail);
      server.listen(0,HOST,done);
    });
    listening=true;
    const address=server.address();
    if(!address||address.address!==HOST||!Number.isInteger(address.port)||
       address.port<1)throw Error('NOT_LOOPBACK');
    state.port=address.port;
    // Both requests are outstanding concurrently, not sequentially.
    const responses=await Promise.all([
      callOwned(state.port,1,spec.keys[0]),
      callOwned(state.port,2,spec.keys[1])
    ]);
    actualStatuses=responses.map(x=>x.status).sort((a,b)=>a-b);
    matchedBodies=responses.every(({id,status,body})=>
      (status===200||status===409)&&
      isDeepStrictEqual(body,status===200?ok(id):denied(id))
    );
  }finally{
    if(listening){
      await new Promise((done,fail)=>{
        server.close(e=>e?fail(e):done());
        server.closeAllConnections();
      });
      // Windows can dispatch Socket close events later than server.close.
      await Promise.all([...sockets].map(socket=>new Promise((done,fail)=>{
        const timeout=setTimeout(()=>fail(Error('SOCKET_CLOSE_TIMEOUT')),3500);
        socket.once('close',()=>{clearTimeout(timeout);done();});
      })));
    }else server.close();
  }
  return {id:spec.id,policy:spec.policy,
    received:state.received,connections:state.connections,
    validatedBodies:state.validatedBodies,
    accepted:state.accepted,denied:state.denied,
    duplicateSeen:state.duplicateSeen,effects:state.effects,
    responsesIssued:state.responsesIssued,
    responsesClosed:state.responsesClosed,socketsClosed:state.socketsClosed,
    overlapWitnessed:state.overlapWitnessed,matchedBodies,
    statuses:actualStatuses,socketsRemaining:sockets.size,
    localLoopbackOnly:listening};
}
/** Expected observations are source-authored, not input-supplied PASS flags. */
export function summarizeConcurrentReplay(observations){
  const goodShape=Array.isArray(observations)&&
    Object.getPrototypeOf(observations)===Array.prototype&&
    observations.length===CASES.length&&
    Reflect.ownKeys(Object.getOwnPropertyDescriptors(observations))
      .length===CASES.length+1;
  const rows=CASES.map((spec,i)=>{
    const descriptor=goodShape?
      Object.getOwnPropertyDescriptor(observations,String(i)):null;
    const r=descriptor?.enumerable&&Object.hasOwn(descriptor,'value')?
      descriptor.value:null;
    const required=[
      ['id',spec.id],['policy',spec.policy],
      ['received',2],['connections',2],['validatedBodies',2],
      ['accepted',spec.admitted],['denied',spec.denied],
      ['duplicateSeen',spec.duplicates],['effects',spec.effects],
      ['responsesIssued',2],['responsesClosed',2],['socketsClosed',2],
      ['overlapWitnessed',true],['matchedBodies',true],
      ['socketsRemaining',0],['localLoopbackOnly',true]
    ];
    const mismatches=required.filter(([k,v])=>field(r,k)!==v)
      .map(([k])=>k);
    if(!exactArray(field(r,'statuses'),spec.statuses))
      mismatches.push('statuses');
    return Object.freeze({
      id:spec.id,matched:mismatches.length===0,
      verdict:spec.id==='UNSAFE_SAME_KEY'?
        'INTENTIONAL_CONCURRENT_DOUBLE_EFFECT_DETECTED':
        spec.id==='GUARDED_SAME_KEY'?
        'SAME_KEY_ATOMIC_RESERVATION_DENIED_REPLAY':
        'DISTINCT_KEYS_BOTH_ADMITTED',
      mismatchedWitnessFields:Object.freeze(mismatches)
    });
  });
  const matched=rows.filter(r=>r.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,
    profile:'first-party-concurrent-replay-differential-v1',
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?'CONCURRENT_REPLAY_DIFFERENTIAL_WITNESSED':
      'CONCURRENT_REPLAY_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(rows),
    intentionalUnsafeDoubleEffectExpected:true,
    localLoopbackOnly:true,externalMcpContacted:false,
    realAgentBehaviorObserved:false,realCredentialsUsed:false,
    realFilesystemActionPerformed:false,
    independentBetaVerified:false,securityCertified:false,
    stableReleaseAuthorized:false
  });
}
export async function runConcurrentReplayLab(args=[]){
  if(!noArgs(args))return errorReport('CONCURRENT_REPLAY_ARGUMENTS_NOT_ALLOWED');
  try{
    const rows=[];
    for(const spec of CASES)rows.push(await runCase(spec));
    return summarizeConcurrentReplay(rows);
  }catch{return errorReport('CONCURRENT_REPLAY_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runConcurrentReplayLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
