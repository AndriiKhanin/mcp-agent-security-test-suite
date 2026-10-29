#!/usr/bin/env node
/**
 * M16: first-party differential capability/replay lab.
 * All "capabilities" are fixed fictional strings, never real credentials.
 * Owns both ends of an ephemeral IPv4 loopback HTTP exchange; no user targets.
 */
import http from 'node:http';
import {isDeepStrictEqual} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1';
const VERSION='2026-07-28',PATH='/mcp',MAX_BYTES=4096;
const TOKEN='FICTIONAL-CAPABILITY-ONLY';
const GRANT=Object.freeze({
  token:TOKEN,project:'project-alpha',tool:'record.write',
  resource:'record-alpha',expiresAtTick:10
});
const CASES=Object.freeze([
  Object.freeze({id:'FRESH_BOUND',token:TOKEN,project:'project-alpha',
    tool:'record.write',resource:'record-alpha',tick:5,revoked:false,approved:false,repeats:1}),
  Object.freeze({id:'REPLAY',token:TOKEN,project:'project-alpha',
    tool:'record.write',resource:'record-alpha',tick:5,revoked:false,approved:false,repeats:2}),
  Object.freeze({id:'WRONG_PROJECT',token:TOKEN,project:'project-beta',
    tool:'record.write',resource:'record-alpha',tick:5,revoked:false,approved:false,repeats:1}),
  Object.freeze({id:'WRONG_TOOL',token:TOKEN,project:'project-alpha',
    tool:'archive.read',resource:'record-alpha',tick:5,revoked:false,approved:false,repeats:1}),
  Object.freeze({id:'WRONG_RESOURCE',token:TOKEN,project:'project-alpha',
    tool:'record.write',resource:'record-beta',tick:5,revoked:false,approved:false,repeats:1}),
  Object.freeze({id:'EXPIRED',token:TOKEN,project:'project-alpha',
    tool:'record.write',resource:'record-alpha',tick:11,revoked:false,approved:false,repeats:1}),
  Object.freeze({id:'REVOKED',token:TOKEN,project:'project-alpha',
    tool:'record.write',resource:'record-alpha',tick:5,revoked:true,approved:false,repeats:1}),
  Object.freeze({id:'FORGED_TOKEN',token:'FICTIONAL-FORGED-NOT-A-GRANT',project:'project-alpha',
    tool:'record.write',resource:'record-alpha',tick:5,revoked:false,approved:false,repeats:1}),
  Object.freeze({id:'FORGED_APPROVAL',token:'FICTIONAL-FORGED-NOT-A-GRANT',project:'project-alpha',
    tool:'record.write',resource:'record-alpha',tick:5,revoked:false,approved:true,repeats:1})
]);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const get=(o,k)=>{
  if(!o||typeof o!=='object'||Array.isArray(o)||
      Object.getPrototypeOf(o)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(o,k);
  return d&&own(d,'value')?d.value:undefined;
};
function isPlainDenseArray(a,size) {
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||
      a.length!==size)return false;
  const slots=Object.getOwnPropertyDescriptors(a);
  return Reflect.ownKeys(slots).length===size+1&&
    slots.length?.value===size&&
    Array.from({length:size},(_,i)=>slots[String(i)]).every(
      slot=>slot&&own(slot,'value')&&slot.enumerable
    );
}
const slot=(a,i)=>Object.getOwnPropertyDescriptor(a,String(i))?.value;
function noArgs(args){return isPlainDenseArray(args,0);}
const safeError=code=>Object.freeze({
  reportSchemaVersion:1,profile:'owned-permission-replay-differential-v1',
  status:'ERROR',exitCode:2,ruleCode:code,
  externalMcpContacted:false,realAgentTested:false,realCredentialsUsed:false,
  independentBetaVerified:false,securityCertified:false
});
function expectedRequest(spec,id){
  return {jsonrpc:'2.0',id,method:'tools/call',params:{
    name:spec.tool,arguments:{resource:spec.resource},
    _meta:{
      'io.modelcontextprotocol/protocolVersion':VERSION,
      'fixtureCapability':spec.token,
      'fixtureProject':spec.project,
      'fixtureApprovalClaim':spec.approved
    }
  }};
}
function send(res,status,body){
  const payload=Buffer.from(JSON.stringify(body));
  res.writeHead(status,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(payload.byteLength)});
  res.end(payload);
}
function validWire(req,port,size){
  const names=new Set(['host','origin','content-type','accept',
    'mcp-protocol-version','content-length','connection']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const name=req.rawHeaders[i].toLowerCase();
    if(!names.has(name)||seen.has(name))return false;
    seen.add(name);
  }
  return seen.size===names.size&&req.socket.remoteAddress===HOST&&
    req.method==='POST'&&req.url===PATH&&
    req.headers.host===HOST+':'+port&&
    req.headers.origin===ORIGIN&&
    req.headers['content-type']==='application/json'&&
    req.headers.accept==='application/json'&&
    req.headers['mcp-protocol-version']===VERSION&&
    req.headers.connection==='close'&&
    req.headers['content-length']===String(size);
}
function ownedServer(spec,policy,state,activeSockets){
  return http.createServer((req,res)=>{
    state.received++;
    res.once('close',()=>{state.responsesClosed++;});
    const chunks=[];let size=0,tooLarge=false;
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>MAX_BYTES){tooLarge=true;chunks.length=0;}
      else if(!tooLarge)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(tooLarge||size<1||!validWire(req,state.port,size)){
        state.denied++;send(res,400,{jsonrpc:'2.0',id:state.received,
          error:{code:-32020,message:'Invalid fictional envelope'}});return;
      }
      let msg;
      try {
        msg=JSON.parse(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch {
        state.denied++;send(res,400,{jsonrpc:'2.0',id:state.received,
          error:{code:-32700,message:'Invalid fictional JSON'}});return;
      }
      // Strictly compare the complete source-owned request, not only claims
      // or an observed client-provided permission verdict.
      if(!isDeepStrictEqual(msg,expectedRequest(spec,state.received))){
        state.denied++;send(res,400,{jsonrpc:'2.0',id:state.received,
          error:{code:-32020,message:'Unexpected fictional request'}});return;
      }
      const allowed=policy==='DELIBERATELY_PERMISSIVE'||(
        spec.token===GRANT.token&&
        spec.project===GRANT.project&&
        spec.tool===GRANT.tool&&
        spec.resource===GRANT.resource&&
        spec.tick<=GRANT.expiresAtTick&&
        !spec.revoked&&!state.grantSpent
      );
      if(!allowed){
        state.denied++;send(res,403,{jsonrpc:'2.0',id:state.received,
          error:{code:-32001,message:'Fictional permission denied'}});return;
      }
      // Only an in-memory counter. No file, executable, secret or customer data.
      state.accepted++;state.syntheticEffects++;
      state.grantSpent=true;
      send(res,200,{jsonrpc:'2.0',id:state.received,
        result:{fictionalEffect:'COUNTED_IN_MEMORY_ONLY'}});
    });
    req.on('error',()=>{});
  }).on('connection',socket=>{
    state.connections++;
    activeSockets.add(socket);
    socket.once('close',()=>{
      state.socketsClosed++;
      activeSockets.delete(socket);
    });
  });
}
async function callOwned(port,spec,id){
  const payload=JSON.stringify(expectedRequest(spec,id));
  return await new Promise((done,fail)=>{
    const req=http.request({
      hostname:HOST,port,path:PATH,method:'POST',headers:{
        host:HOST+':'+port,origin:ORIGIN,
        'content-type':'application/json',accept:'application/json',
        'mcp-protocol-version':VERSION,connection:'close',
        'content-length':String(Buffer.byteLength(payload))
      }
    },res=>{
      let size=0;const chunks=[];
      res.on('data',chunk=>{
        size+=chunk.length;
        if(size>MAX_BYTES){req.destroy(Error('RESPONSE_TOO_LARGE'));return;}
        chunks.push(chunk);
      });
      res.once('end',()=>{
        try{
          const body=JSON.parse(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          done({status:res.statusCode,body});
        }catch{fail(Error('RESPONSE_INVALID'));}
      });
      res.once('error',fail);
    });
    req.setTimeout(3000,()=>req.destroy(Error('FIXED_DEADLINE')));
    req.once('error',fail);
    req.end(payload);
  });
}
async function runOwnedCase(spec,policy){
  const state={port:0,received:0,connections:0,responsesClosed:0,
    socketsClosed:0,accepted:0,denied:0,syntheticEffects:0,grantSpent:false};
  const sockets=new Set();
  const server=ownedServer(spec,policy,state,sockets);
  let listening=false,wireBodiesMatched=true;
  const statuses=[];
  try{
    await new Promise((done,fail)=>{
      server.once('error',fail);
      server.listen(0,HOST,done);
    });
    listening=true;
    const address=server.address();
    if(!address||address.address!==HOST||!Number.isInteger(address.port)||
        address.port<1)throw Error('NONLOCAL_LISTENER');
    state.port=address.port;
    for(let id=1;id<=spec.repeats;id++){
      const answer=await callOwned(state.port,spec,id);
      statuses.push(answer.status);
      const expected=answer.status===200?
        {jsonrpc:'2.0',id,result:{fictionalEffect:'COUNTED_IN_MEMORY_ONLY'}}:
        {jsonrpc:'2.0',id,error:{
          code:-32001,message:'Fictional permission denied'}};
      wireBodiesMatched=wireBodiesMatched&&
        isDeepStrictEqual(answer.body,expected);
    }
  }finally{
    if(listening){
      await new Promise((done,fail)=>{
        server.close(error=>error?fail(error):done());
        server.closeAllConnections();
      });
      // Windows may dispatch the last socket 'close' after server.close().
      await Promise.all([...sockets].map(socket=>new Promise((done,fail)=>{
        const timer=setTimeout(()=>fail(Error('SOCKET_CLOSE_TIMEOUT')),3000);
        socket.once('close',()=>{clearTimeout(timer);done();});
      })));
    }else server.close();
  }
  return {
    received:state.received,connections:state.connections,
    responsesClosed:state.responsesClosed,socketsClosed:state.socketsClosed,
    accepted:state.accepted,denied:state.denied,
    syntheticEffects:state.syntheticEffects,
    statuses,wireBodiesMatched,
    socketsRemaining:sockets.size,localLoopbackConfirmed:listening
  };
}
function validObservation(observed,spec,policy){
  const fresh=spec.id==='FRESH_BOUND';
  const replay=spec.id==='REPLAY';
  const guarded=policy==='GUARDED';
  const expectedStatuses=guarded?
    fresh?[200]:replay?[200,403]:[403]:
    replay?[200,200]:[200];
  const accepted=expectedStatuses.filter(x=>x===200).length;
  const denied=expectedStatuses.length-accepted;
  const expected=[
    ['received',spec.repeats],['connections',spec.repeats],
    ['responsesClosed',spec.repeats],['socketsClosed',spec.repeats],
    ['accepted',accepted],['denied',denied],
    ['syntheticEffects',accepted],['wireBodiesMatched',true],
    ['socketsRemaining',0],['localLoopbackConfirmed',true]
  ];
  const bad=expected.filter(([k,v])=>get(observed,k)!==v)
    .map(([k])=>k);
  const statuses=get(observed,'statuses');
  if(!isPlainDenseArray(statuses,expectedStatuses.length)||
      expectedStatuses.some((value,i)=>slot(statuses,i)!==value))
    bad.push('statuses');
  return bad;
}
/**
 * Independent source-authored oracle; never trusts a self-reported PASS.
 * Prints only fixed witness FIELD NAMES, no observed payloads or tokens.
 */
export function summarizePermissionReplayLab(rows){
  const shape=isPlainDenseArray(rows,CASES.length);
  const reports=CASES.map((spec,i)=>{
    const row=shape?slot(rows,i):null;
    const wrongId=get(row,'id')!==spec.id;
    const guarded=validObservation(get(row,'guarded'),spec,'GUARDED');
    const permissive=validObservation(get(row,'permissive'),
      spec,'DELIBERATELY_PERMISSIVE');
    const missing=[...(wrongId?['id']:[]),
      ...guarded.map(k=>'guarded.'+k),
      ...permissive.map(k=>'permissive.'+k)];
    return Object.freeze({
      id:spec.id,matched:missing.length===0,
      expectedDisposition:spec.id==='FRESH_BOUND'?'LEGITIMATE_EFFECT_ALLOWED':
        'UNSAFE_PERMISSIVE_EFFECT_WITNESSED',
      mismatchedWitnessFields:Object.freeze(missing)
    });
  });
  const matched=reports.filter(r=>r.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:'owned-permission-replay-differential-v1',
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?'FICTIONAL_PERMISSION_DIFFERENTIAL_WITNESSED':
      'FICTIONAL_PERMISSION_WITNESS_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    cases:Object.freeze(reports),
    expectedUnsafeCases:CASES.length-1,
    expectedGuardedSyntheticEffects:2,
    expectedPermissiveSyntheticEffects:CASES.length+1,
    localLoopbackOnly:true,externalMcpContacted:false,
    realAgentTested:false,realCredentialsUsed:false,
    independentBetaVerified:false,securityCertified:false,
    stableReleaseAuthorized:false
  });
}
export async function runPermissionReplayLab(args=[]){
  if(!noArgs(args))return safeError('PERMISSION_LAB_ARGUMENTS_NOT_ALLOWED');
  try{
    const rows=[];
    for(const spec of CASES){
      const guarded=await runOwnedCase(spec,'GUARDED');
      const permissive=await runOwnedCase(spec,'DELIBERATELY_PERMISSIVE');
      rows.push({id:spec.id,guarded,permissive});
    }
    return summarizePermissionReplayLab(rows);
  }catch{
    return safeError('PERMISSION_LAB_UNAVAILABLE');
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runPermissionReplayLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
