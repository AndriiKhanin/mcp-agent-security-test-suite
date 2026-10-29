#!/usr/bin/env node
/**
 * M25: first-party, fixed policy-version/epoch approval TOCTOU differential.
 * Owns both ends of ephemeral IPv4 loopback HTTP. "Restart" is a LOGICAL
 * gate-generation replacement, NOT a real OS process crash/restart.
 * No real credentials, files, agents, user targets or external network.
 */
import http from 'node:http';
import {isDeepStrictEqual} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const MCP_VERSION='2026-07-28',MAX_BYTES=4096;
const CAPABILITY='FIRST-PARTY-FAKE-APPROVAL-ONLY';
const SPECS=Object.freeze([
  Object.freeze({id:'UNCHANGED_POLICY',change:'NONE',reissue:false}),
  Object.freeze({id:'POLICY_DRIFT',change:'POLICY',reissue:false}),
  Object.freeze({id:'RESTART_PENDING',change:'RESTART',reissue:false}),
  Object.freeze({id:'POLICY_DRIFT_FRESH_APPROVAL',change:'POLICY',reissue:true}),
  Object.freeze({id:'RESTART_FRESH_APPROVAL',change:'RESTART',reissue:true})
]);
const own=(x,k)=>Object.hasOwn(x,k);
const field=(x,k)=>{
  if(!x||typeof x!=='object'||Array.isArray(x)||
     Object.getPrototypeOf(x)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(x,k);
  return d?.enumerable&&own(d,'value')?d.value:undefined;
};
function denseArray(x,n){
  if(!Array.isArray(x)||Object.getPrototypeOf(x)!==Array.prototype||
    x.length!==n)return false;
  const d=Object.getOwnPropertyDescriptors(x);
  return Reflect.ownKeys(d).length===n+1&&d.length?.value===n&&
    Array.from({length:n},(_,i)=>d[String(i)]).every(
      x=>x?.enumerable&&own(x,'value'));
}
const badArgs=()=>Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  profile:'owned-approval-policy-epoch-differential-v1',
  ruleCode:'APPROVAL_EPOCH_ARGUMENTS_NOT_ALLOWED',
  logicalRestartOnly:true,realAgentTested:false,
  externalMcpContacted:false,realCredentialsUsed:false
});
const unavailable=()=>Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  profile:'owned-approval-policy-epoch-differential-v1',
  ruleCode:'APPROVAL_EPOCH_LAB_UNAVAILABLE',
  logicalRestartOnly:true,realAgentTested:false,
  externalMcpContacted:false,realCredentialsUsed:false
});
const issue=(state,id)=>Object.freeze({
  capability:CAPABILITY,policyVersion:state.policyVersion,
  gateGeneration:state.gateGeneration,approvalId:'fictional-approval-'+id
});
const request=(id,grant)=>({
  jsonrpc:'2.0',id,method:'tools/call',params:{
    name:'fictional.write',arguments:{resource:'fictional-owned-record'},
    _meta:{'io.modelcontextprotocol/protocolVersion':MCP_VERSION,
      approval:grant}
  }
});
const allowed=id=>({jsonrpc:'2.0',id,result:{
  fictionalEffect:'IN_MEMORY_ONLY'}});
const blocked=(id,status)=>({jsonrpc:'2.0',id,error:{
  code:status===410?-32010:-32009,
  message:status===410?'Gate generation invalidated':'Policy version changed'
}});
function respond(res,status,body){
  const bytes=Buffer.from(JSON.stringify(body));
  res.writeHead(status,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(bytes.length)});
  res.end(bytes);
}
function validWire(req,port,len){
  const permitted=new Set(['host','origin','content-type','accept',
    'mcp-protocol-version','content-length','connection']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(seen.has(key)||!permitted.has(key))return false;
    seen.add(key);
  }
  return seen.size===permitted.size&&
    req.socket.remoteAddress===HOST&&req.method==='POST'&&
    req.url===PATH&&req.headers.host===HOST+':'+port&&
    req.headers.origin===ORIGIN&&
    req.headers['content-type']==='application/json'&&
    req.headers.accept==='application/json'&&
    req.headers['mcp-protocol-version']===MCP_VERSION&&
    req.headers.connection==='close'&&
    req.headers['content-length']===String(len);
}
function ownedListener(policy,state,sockets){
  let pending=null;
  let readyResolve=null;
  let readyTimer=null;
  const signalReady=()=>{
    if(readyTimer){clearTimeout(readyTimer);readyTimer=null;}
    if(readyResolve){const fn=readyResolve;readyResolve=null;fn();}
  };
  const server=http.createServer((req,res)=>{
    state.received++;
    res.once('close',()=>{state.responsesClosed++;});
    let size=0,oversize=false;const parts=[];
    req.on('data',part=>{
      size+=part.length;
      if(size>MAX_BYTES){oversize=true;parts.length=0;}
      else if(!oversize)parts.push(part);
    });
    req.on('end',()=>{
      let body;
      try{
        body=JSON.parse(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(parts)));
      }catch{body=null;}
      const id=body?.id;
      const grant=state.issued.get(id);
      if(oversize||!size||!validWire(req,state.port,size)||
        !grant||pending!==null||
        !isDeepStrictEqual(body,request(id,grant))||
        grant.policyVersion!==state.policyVersion||
        grant.gateGeneration!==state.gateGeneration){
        state.denied++;
        respond(res,400,{jsonrpc:'2.0',id:0,error:{
          code:-32020,message:'Invalid fictional request'}});
        return;
      }
      // Authoritative admission is server-owned. Approval is NOT an
      // executable right after this point, only a pending proposal.
      state.validated++;
      state.admittedBeforeMutation++;
      state.pendingActive=1;
      pending={id,grant,res,cancelled:false};
      state.barriers++;
      state.noEarlyResponseWitness=state.noEarlyResponseWitness&&
        state.responsesIssued===state.barriers-1&&state.effects<=state.responsesIssued;
      signalReady();
    });
    req.on('error',()=>{});
  }).on('connection',sock=>{
    state.connections++;sockets.add(sock);
    sock.once('close',()=>{
      state.socketsClosed++;sockets.delete(sock);
    });
  });
  const awaitAdmission=()=>new Promise((done,fail)=>{
    if(readyResolve||readyTimer){fail(Error('DUPLICATE_BARRIER'));return;}
    const timer=setTimeout(()=>{
      readyResolve=null;readyTimer=null;
      fail(Error('BOUND_ADMISSION_TIMEOUT'));
    },4000);
    readyTimer=timer;readyResolve=done;
  });
  const change=kind=>{
    if(!pending||state.pendingActive!==1)throw Error('MUTATION_NOT_INFLIGHT');
    state.changeWhilePending++;
    if(kind==='POLICY')state.policyVersion++;
    else if(kind==='RESTART'){
      state.gateGeneration++;
      // A guarded gate MUST cancel old pending rights on logical restart.
      // Deliberately unsafe gate leaves the old pending approval live.
      if(policy==='GUARDED'){
        pending.cancelled=true;
        state.pendingActive=0;
        state.invalidatedAtRestart++;
      }
    }
  };
  const release=()=>{
    if(!pending)throw Error('NOTHING_TO_RELEASE');
    const p=pending;pending=null;
    if(state.responsesIssued!==state.barriers-1)
      state.noEarlyResponseWitness=false;
    let status=200;
    if(policy==='GUARDED'){
      if(p.cancelled||p.grant.gateGeneration!==state.gateGeneration)
        status=410;
      else if(p.grant.policyVersion!==state.policyVersion)
        status=409;
    }
    // The vulnerable gate intentionally trusts the prior admission:
    // it neither binds current policy nor invalidates pending on restart.
    if(status===200){state.effects++;state.accepted++;}
    else state.denied++;
    state.pendingActive=0;
    state.responsesIssued++;
    respond(p.res,status,status===200?allowed(p.id):blocked(p.id,status));
  };
  return {server,awaitAdmission,change,release};
}
async function sendOwned(port,id,grant){
  const body=JSON.stringify(request(id,grant));
  return await new Promise((done,fail)=>{
    const req=http.request({hostname:HOST,port,method:'POST',path:PATH,
      headers:{host:HOST+':'+port,origin:ORIGIN,
        'content-type':'application/json',accept:'application/json',
        'mcp-protocol-version':MCP_VERSION,connection:'close',
        'content-length':String(Buffer.byteLength(body))}},res=>{
      let total=0;const bytes=[];
      res.on('data',chunk=>{
        total+=chunk.length;
        if(total>MAX_BYTES){req.destroy(Error('REPLY_LIMIT'));return;}
        bytes.push(chunk);
      });
      res.once('end',()=>{
        try{
          const json=JSON.parse(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(bytes)));
          done({status:res.statusCode,body:json});
        }catch{fail(Error('INVALID_REPLY'));}
      });
      res.once('error',fail);
    });
    req.setTimeout(4000,()=>req.destroy(Error('FIXED_WIRE_DEADLINE')));
    req.once('error',fail);
    req.end(body);
  });
}
async function scenario(spec,policy){
  const state={port:0,issued:new Map(),policyVersion:1,gateGeneration:1,
    received:0,validated:0,admittedBeforeMutation:0,
    connections:0,responsesIssued:0,responsesClosed:0,socketsClosed:0,
    accepted:0,denied:0,effects:0,pendingActive:0,
    barriers:0,noEarlyResponseWitness:true,changeWhilePending:0,
    invalidatedAtRestart:0};
  const sockets=new Set();
  const gate=ownedListener(policy,state,sockets);
  let listening=false,bodyMatched=true;const statuses=[];
  try{
    await new Promise((done,fail)=>{
      gate.server.once('error',fail);
      gate.server.listen(0,HOST,done);
    });
    listening=true;
    const address=gate.server.address();
    if(!address||address.address!==HOST||!Number.isInteger(address.port)||
      address.port<1)throw Error('NOT_LOCAL_LISTENER');
    state.port=address.port;
    const runRound=async id=>{
      const grant=issue(state,id);
      state.issued.set(id,grant);
      const ready=gate.awaitAdmission();
      const wire=sendOwned(state.port,id,grant);
      await ready;
      if(id===1&&spec.change!=='NONE')gate.change(spec.change);
      // A new grant is never issued until after the old one has settled.
      const effectsBefore=state.effects;
      gate.release();
      const reply=await wire;
      statuses.push(reply.status);
      const expected=reply.status===200?allowed(id):blocked(id,reply.status);
      bodyMatched=bodyMatched&&isDeepStrictEqual(reply.body,expected)&&
        [200,409,410].includes(reply.status);
      const effectDelta=state.effects-effectsBefore;
      state.lastRoundHadEffect=effectDelta===1;
      // Separately verify that the observed effect matches the HTTP result.
      // A denied request must commit zero effects; a 200 must commit one.
      bodyMatched=bodyMatched&&effectDelta===Number(reply.status===200);
    };
    await runRound(1);
    if(spec.reissue)await runRound(2);
  }finally{
    if(listening){
      await new Promise((done,fail)=>{
        gate.server.close(err=>err?fail(err):done());
        gate.server.closeAllConnections();
      });
      // Node's close callback can run before net.Socket 'close' on Windows.
      await Promise.all([...sockets].map(socket=>new Promise((done,fail)=>{
        const timer=setTimeout(()=>fail(Error('SOCKET_CLOSE_TIMEOUT')),4000);
        socket.once('close',()=>{clearTimeout(timer);done();});
      })));
    }else gate.server.close();
  }
  return {
    received:state.received,validated:state.validated,
    admittedBeforeMutation:state.admittedBeforeMutation,
    connections:state.connections,responsesIssued:state.responsesIssued,
    responsesClosed:state.responsesClosed,socketsClosed:state.socketsClosed,
    accepted:state.accepted,denied:state.denied,effects:state.effects,
    pendingActive:state.pendingActive,barriers:state.barriers,
    noEarlyResponseWitness:state.noEarlyResponseWitness,
    changeWhilePending:state.changeWhilePending,
    invalidatedAtRestart:state.invalidatedAtRestart,
    finalPolicyVersion:state.policyVersion,
    finalGateGeneration:state.gateGeneration,
    statuses,bodyMatched,lastRoundHadEffect:state.lastRoundHadEffect,
    socketsRemaining:sockets.size,localLoopbackConfirmed:listening
  };
}
function compare(row,spec,policy){
  const guarded=policy==='GUARDED';
  const size=spec.reissue?2:1;
  const changed=spec.change!=='NONE';
  const restart=spec.change==='RESTART',policyDrift=spec.change==='POLICY';
  const rejected=guarded&&changed;
  const effects=size-Number(rejected);
  const first=rejected?(restart?410:409):200;
  const expected=[
    ['received',size],['validated',size],['admittedBeforeMutation',size],
    ['connections',size],['responsesIssued',size],
    ['responsesClosed',size],['socketsClosed',size],
    ['accepted',effects],['denied',Number(rejected)],
    ['effects',effects],['pendingActive',0],['barriers',size],
    ['noEarlyResponseWitness',true],['changeWhilePending',Number(changed)],
    ['invalidatedAtRestart',Number(guarded&&restart)],
    ['finalPolicyVersion',policyDrift?2:1],
    ['finalGateGeneration',restart?2:1],
    ['bodyMatched',true],['lastRoundHadEffect',spec.reissue||!rejected],
    ['socketsRemaining',0],['localLoopbackConfirmed',true]
  ];
  const mismatches=expected.filter(([key,value])=>field(row,key)!==value)
    .map(([key])=>key);
  const codes=spec.reissue?[first,200]:[first];
  const s=field(row,'statuses');
  if(!denseArray(s,codes.length)||codes.some((code,i)=>
    Object.getOwnPropertyDescriptor(s,String(i))?.value!==code))
    mismatches.push('statuses');
  return Object.freeze(mismatches);
}
/** Independent exact source-owned oracle, never trusts a self-reported PASS. */
export function summarizeApprovalEpochLab(witness){
  const valid=denseArray(witness,SPECS.length);
  const cases=SPECS.map((spec,index)=>{
    const row=valid?Object.getOwnPropertyDescriptor(witness,String(index)).value:null;
    const changed=field(row,'id')!==spec.id?['id']:[];
    const guarded=compare(field(row,'guarded'),spec,'GUARDED');
    const unsafe=compare(field(row,'unsafe'),spec,'UNSAFE');
    const failures=[...changed,...guarded.map(x=>'guarded.'+x),
      ...unsafe.map(x=>'unsafe.'+x)];
    return Object.freeze({
      id:spec.id,matched:failures.length===0,
      expectedSafety:spec.change==='NONE'?'UNCHANGED_APPROVAL_EXECUTED':
        spec.reissue?'STALE_DENIED_FRESH_APPROVAL_EXECUTED':
        spec.change==='POLICY'?'POLICY_VERSION_MISMATCH_DENIED':
        'PENDING_APPROVAL_INVALIDATED_ON_RESTART',
      unsafeEffectExpected:spec.change!=='NONE',
      mismatchedWitnessFields:Object.freeze(failures)
    });
  });
  const matched=cases.filter(x=>x.matched).length;
  return Object.freeze({
    reportSchemaVersion:1,profile:'owned-approval-policy-epoch-differential-v1',
    status:matched===SPECS.length?'PASS':'FAIL',
    exitCode:matched===SPECS.length?0:1,
    ruleCode:matched===SPECS.length?'POLICY_EPOCH_DIFFERENTIAL_WITNESSED':
      'POLICY_EPOCH_WITNESS_MISMATCH',
    checked:SPECS.length,matched,failed:SPECS.length-matched,
    cases:Object.freeze(cases),
    policyVersionBoundAtExecution:true,
    gateGenerationBoundAtExecution:true,
    intentionalUnsafeToyEffectsExpected:true,
    logicalRestartOnly:true,actualOsRestartPerformed:false,
    externalMcpContacted:false,realAgentTested:false,
    realCredentialsUsed:false,realFilesystemActionsPerformed:false,
    independentBetaVerified:false,securityCertified:false,
    stableReleaseAuthorized:false
  });
}
export async function runApprovalEpochLab(args=[]){
  if(!denseArray(args,0))return badArgs();
  try{
    const observed=[];
    for(const spec of SPECS){
      const guarded=await scenario(spec,'GUARDED');
      const unsafe=await scenario(spec,'UNSAFE');
      observed.push({id:spec.id,guarded,unsafe});
    }
    return summarizeApprovalEpochLab(observed);
  }catch{return unavailable();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runApprovalEpochLab(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
