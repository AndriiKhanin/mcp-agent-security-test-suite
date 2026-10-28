#!/usr/bin/env node
/**
 * M11-J: owned in-flight HTTP cancellation and late-response isolation.
 * First-party, disposable 127.0.0.1 only. No real model/agent,
 * external MCP target, OS file requested by content, or arbitrary code.
 */
import http from 'node:http';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {parseStrictJson} from '../src/strict-json.mjs';
import {
  loadValidatedFixtureProposalFile,validateFixtureProposal
} from './fixture-proposal-check.mjs';
import {runFirstPartyM11Bridge} from './m11-loopback-tool-result.mjs';
import {runFictionalToySession} from './toy-agent-session.mjs';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const METHOD='tools/call',VERSION='2026-07-28';
const SCOPE='FIRST_PARTY_OWNED_INFLIGHT_CANCEL_BOUNDARY_ONLY';
const FIRST=new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url);
const SECOND=new URL('../.github/fixture-proposals/ticket-status-prerequisite-file-read.json',import.meta.url);
const SESSION=Object.freeze(['FICTIONAL-CANCEL-A','FICTIONAL-CANCEL-B']);
const IDS=Object.freeze([81,82]);
const INPUT_LIMIT=2048,OUTPUT_LIMIT=4096;
const FAULTS=Object.freeze([
  'cancel-a-allow-b','late-response-suppressed',
  'cross-session-result','replayed-a-response','wrong-response-id',
  'forged-response-authority','duplicate-response-key',
  'malformed-response','wrong-content-type','redirect',
  'oversized-response','stalled-b','duplicate-request-id',
  'forged-request-header'
]);
const REQUESTS=Object.freeze(IDS.map((id,i)=>Object.freeze({
  jsonrpc:'2.0',id,method:METHOD,
  params:{name:'owned-fictional-cancellation-status',
    arguments:{session:SESSION[i]}}
})));
const fail=()=>{throw new TypeError('INVALID_OWNED_CANCEL_OPTIONS');};

function checkOptions(settings){
  if(!settings||typeof settings!=='object'||Array.isArray(settings)||
     Object.getPrototypeOf(settings)!==Object.prototype)fail();
  const props=Object.getOwnPropertyDescriptors(settings);
  if(Reflect.ownKeys(props).some(k=>!['fault','deadlineMs'].includes(k))||
     Object.values(props).some(d=>!d.enumerable||!Object.hasOwn(d,'value')))fail();
  const fault=Object.hasOwn(props,'fault')?props.fault.value:'cancel-a-allow-b';
  const deadlineMs=Object.hasOwn(props,'deadlineMs')?props.deadlineMs.value:3000;
  if(typeof fault!=='string'||!FAULTS.includes(fault)||
     !Number.isSafeInteger(deadlineMs)||deadlineMs<250||
     deadlineMs>4000)fail();
  return {fault,deadlineMs};
}
function exactReply(index,fixture){
  return {jsonrpc:'2.0',id:IDS[index],result:{
    content:[{type:'text',text:JSON.stringify({
      session:SESSION[index],
      legitimateData:fixture.toolResult.legitimateData,
      embeddedInstruction:fixture.toolResult.embeddedInstruction
    })}],isError:false
  }};
}
function hasDuplicateHeader(req){
  const allowed=new Set(['host','origin','content-type','content-length',
    'accept','mcp-method','mcp-protocol-version','authorization','cookie',
    'proxy-authorization','transfer-encoding']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(allowed.has(key)&&seen.has(key))return true;
    seen.add(key);
  }
  return false;
}
function deny(res){
  const body=JSON.stringify({jsonrpc:'2.0',id:0,
    error:{code:-32000,message:'Rejected fictional request'}});
  res.writeHead(403,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(Buffer.byteLength(body))});
  res.end(body);
}
function serve(fixtures,fault,port,counters,cancelA){
  const pending=new Map();
  let finalized=false;
  function sendB(){
    const response=pending.get(1);
    if(!response||response.destroyed||response.writableEnded)return;
    counters.responsesIssued++;
    if(fault==='stalled-b'){
      response.writeHead(200,{'content-type':'application/json',
        'cache-control':'no-store',connection:'close',
        'content-length':'1024'});
      response.flushHeaders();return;
    }
    if(fault==='redirect'){
      response.writeHead(302,{location:'http://example.invalid/never-follow',
        connection:'close','cache-control':'no-store'});
      response.end();return;
    }
    let reply=exactReply(1,fixtures[1]);
    if(fault==='cross-session-result')
      reply.result.content[0].text=exactReply(0,fixtures[0]).result.content[0].text;
    if(fault==='replayed-a-response')reply=exactReply(0,fixtures[0]);
    if(fault==='wrong-response-id')reply.id=81;
    if(fault==='forged-response-authority')
      reply.result.unreviewedApproval=true;
    let body=JSON.stringify(reply);
    if(fault==='duplicate-response-key')
      body=body.replace('"id":82','"id":82,"id":82');
    if(fault==='malformed-response')
      body='{"jsonrpc":"2.0","id":82,"result":';
    if(fault==='oversized-response')body='X'.repeat(OUTPUT_LIMIT+1);
    response.writeHead(200,{'content-type':
      fault==='wrong-content-type'?'text/plain':'application/json',
      'cache-control':'no-store',connection:'close',
      'content-length':String(Buffer.byteLength(body))});
    response.end(body);
  }
  function completePhase(){
    if(finalized||counters.processed!==2)return;
    finalized=true;
    const abandoned=pending.get(0);
    if(!abandoned){
      counters.protocolFailures++;
      sendB();return;
    }
    // An actual cancel signal is delivered only after both real HTTP
    // request bodies have been processed, eliminating clock-based races.
    abandoned.once('close',()=>{
      counters.cancelledResponseClosed++;
      if(fault==='late-response-suppressed'){
        counters.lateResponseAttempts++;
        // A closed response CANNOT be used to deliver stale bytes.
        // Do not write to a closed socket or pretend this is packet capture.
        if(abandoned.destroyed)counters.lateResponsesSuppressed++;
        else counters.protocolFailures++;
      }
      sendB();
    });
    cancelA();
  }
  return (req,res)=>{
    counters.received++;
    res.once('close',()=>{counters.responseClosed++;});
    let size=0,over=false;const chunks=[];
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>INPUT_LIMIT){
        over=true;chunks.length=0;
        req.destroy();
      }else if(!over)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(over||res.writableEnded)return;
      counters.processed++;
      let parsed=null;
      try{
        parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch{}
      const index=IDS.indexOf(parsed?.id);
      const expected=index<0?null:REQUESTS[index];
      const headersValid=expected!==null&&
        req.socket.remoteAddress===HOST&&req.method==='POST'&&
        req.url===PATH&&req.headers.host===HOST+':'+port&&
        req.headers.origin===ORIGIN&&
        req.headers['content-type']==='application/json'&&
        req.headers.accept==='application/json'&&
        req.headers['mcp-protocol-version']===VERSION&&
        req.headers['mcp-method']===METHOD&&
        req.headers['content-length']===
          String(Buffer.byteLength(JSON.stringify(expected)))&&
        req.headers.authorization===undefined&&
        req.headers.cookie===undefined&&
        req.headers['proxy-authorization']===undefined&&
        req.headers['transfer-encoding']===undefined&&
        !hasDuplicateHeader(req);
      const accepted=counters.processed<=2&&headersValid&&
        size<=INPUT_LIMIT&&
        size===Buffer.byteLength(JSON.stringify(expected))&&
        !pending.has(index)&&isDeepStrictEqual(parsed,expected);
      if(accepted){
        counters.accepted++;
        pending.set(index,res);
        counters.maxPending=Math.max(counters.maxPending,pending.size);
      }else{
        counters.denied++;
        deny(res);
      }
      completePhase();
    });
    req.on('error',()=>{});
  };
}
function clientRequest(port,index,fixture,fault,controller,deadlineMs){
  const request=index===1&&fault==='duplicate-request-id'?
    REQUESTS[0]:REQUESTS[index];
  const body=JSON.stringify(request);
  const headers={host:HOST+':'+port,origin:ORIGIN,
    'content-type':'application/json',accept:'application/json',
    'mcp-method':METHOD,'mcp-protocol-version':VERSION,
    'content-length':String(Buffer.byteLength(body))};
  if(index===1&&fault==='forged-request-header')
    headers.authorization='Bearer fictional-untrusted-claim';
  const timer=setTimeout(()=>controller.abort('DEADLINE'),deadlineMs);
  return new Promise(resolve=>{
    let settled=false,active=null;
    const done=(code,data=null)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(code&&active&&!active.destroyed)active.destroy();
      resolve({code,data});
    };
    const errorCode=()=>controller.signal.aborted?
      controller.signal.reason==='OWNER_CANCEL'?'OWNER_CANCELLED':'TIMEOUT':
      'RESPONSE_REJECTED';
    const req=http.request({hostname:HOST,port,method:'POST',path:PATH,
      headers,agent:false,signal:controller.signal},res=>{
      active=res;
      if(res.statusCode===403){
        res.resume();done('REQUEST_DENIED');return;
      }
      if(res.statusCode!==200||
         res.headers['content-type']!=='application/json'||
         Object.hasOwn(res.headers,'location')){
        res.resume();done('RESPONSE_REJECTED');return;
      }
      const declared=Number(res.headers['content-length']);
      if(!Number.isSafeInteger(declared)||declared<1||
         declared>OUTPUT_LIMIT){done('RESPONSE_REJECTED');return;}
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{
        if(settled)return;
        bytes+=chunk.length;
        if(bytes>OUTPUT_LIMIT){done('RESPONSE_REJECTED');return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        if(settled)return;
        try{
          if(bytes!==declared)throw Error('BAD_RESPONSE_SIZE');
          const reply=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          if(!isDeepStrictEqual(reply,exactReply(index,fixture)))
            throw Error('WRONG_RESPONSE_CORRELATION');
          const data=parseStrictJson(reply.result.content[0].text);
          if(!isDeepStrictEqual(data,{
            session:SESSION[index],
            legitimateData:fixture.toolResult.legitimateData,
            embeddedInstruction:fixture.toolResult.embeddedInstruction
          }))throw Error('WRONG_TOOL_RESULT_DATA');
          done(null,{
            legitimateData:data.legitimateData,
            embeddedInstruction:data.embeddedInstruction
          });
        }catch{done('RESPONSE_REJECTED');}
      });
      res.on('error',()=>done(errorCode()));
      res.on('close',()=>{if(!res.complete)done(errorCode());});
    });
    req.on('error',()=>done(errorCode()));
    req.end(body);
  });
}
async function runLocal(fixtures,fault,deadlineMs){
  const server=http.createServer(),closedSockets=[];
  const counts={received:0,processed:0,accepted:0,denied:0,
    responseClosed:0,socketClosed:0,cancelledResponseClosed:0,
    responsesIssued:0,lateResponseAttempts:0,
    lateResponsesSuppressed:0,protocolFailures:0,maxPending:0};
  server.on('connection',socket=>{
    closedSockets.push(new Promise(resolve=>socket.once('close',()=>{
      counts.socketClosed++;resolve();
    })));
  });
  const controllers=[new AbortController(),new AbortController()];
  let responses=null,cleanupConfirmed=false;
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',reject);resolve();
      });
    });
    const port=server.address().port;
    server.on('request',serve(fixtures,fault,port,counts,
      ()=>controllers[0].abort('OWNER_CANCEL')));
    responses=await Promise.all(fixtures.map((fixture,index)=>
      clientRequest(port,index,fixture,fault,controllers[index],deadlineMs)));
  }finally{
    controllers.forEach(c=>{if(!c.signal.aborted)c.abort('SHUTDOWN');});
    if(server.listening){
      const done=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();await done;
    }
    let timeout;
    cleanupConfirmed=await Promise.race([
      Promise.all(closedSockets).then(()=>true),
      new Promise(resolve=>{timeout=setTimeout(()=>resolve(false),1000);})
    ]);
    clearTimeout(timeout);
  }
  return {responses,counts,cleanupConfirmed};
}
export async function runOwnedM11Cancellation(first,second,settings={}){
  const {fault,deadlineMs}=checkOptions(settings);
  validateFixtureProposal(first);
  validateFixtureProposal(second);
  const pre=await runFirstPartyM11Bridge(first);
  const ready=pre.status==='PASS'&&pre.exitCode===0&&
    pre.discoveryAccepted===true&&
    pre.onWireToolResultAccepted===true&&
    pre.toolSocketCleanupConfirmed===true&&
    pre.protectedFictionalEffectsCommitted===0&&
    pre.realExternalMcpContacted===false;
  let local=null;
  if(ready){
    try{local=await runLocal([first,second],fault,deadlineMs);}catch{}
  }
  const c=local?.counts??{received:0,processed:0,accepted:0,denied:0,
    responseClosed:0,socketClosed:0,cancelledResponseClosed:0,
    responsesIssued:0,lateResponseAttempts:0,lateResponsesSuppressed:0,
    protocolFailures:0,maxPending:0};
  const outcomes=local?.responses??[];
  let acceptedB=false;
  if(outcomes.length===2&&outcomes[0].code==='OWNER_CANCELLED'&&
     outcomes[1].code===null){
    const toy=runFictionalToySession(
      {...second,toolResult:outcomes[1].data},'SAFE_TASK');
    acceptedB=toy.status==='PASS'&&toy.methodCallsObserved===3&&
      toy.toolResultsAccepted===1&&toy.forbiddenRequestsObserved===0&&
      toy.protectedFictionalFileEffectsCommitted===0&&
      toy.protectedFictionalToolEffectsCommitted===0;
  }
  const cleanup=local?.cleanupConfirmed===true&&c.received===2&&
    c.processed===2&&c.responseClosed===2&&c.socketClosed===2&&
    c.cancelledResponseClosed===1&&c.protocolFailures===0;
  const safeModes=fault==='cancel-a-allow-b'||fault==='late-response-suppressed';
  const pass=ready&&cleanup&&safeModes&&acceptedB&&
    c.accepted===2&&c.denied===0&&c.responsesIssued===1&&
    c.maxPending===2&&
    c.lateResponseAttempts===(fault==='late-response-suppressed'?1:0)&&
    c.lateResponsesSuppressed===c.lateResponseAttempts;
  const code=pass?'M11_CANCELLED_RESPONSE_ISOLATED':
    !ready?'M11_CANCEL_PREREQUISITE_REJECTED':
    !cleanup?'M11_CANCEL_CLEANUP_UNCONFIRMED':
    outcomes[0]?.code!=='OWNER_CANCELLED'?
      'M11_CANCEL_OWNER_ABORT_NOT_OBSERVED':
    outcomes[1]?.code==='TIMEOUT'?'M11_CANCEL_PEER_TIMEOUT':
    outcomes[1]?.code==='REQUEST_DENIED'?'M11_CANCEL_PEER_REQUEST_DENIED':
    'M11_CANCEL_PEER_RESPONSE_REJECTED';
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:code,scope:SCOPE,
    evidenceKind:'FIRST_PARTY_LOCAL_HTTP_ABORT_AND_TOY_GATEWAY_ONLY',
    prerequisiteAccepted:ready,
    ownedRequestsObserved:c.received,
    ownedRequestsAccepted:c.accepted,
    ownedRequestsDenied:c.denied,
    cancelledFirstRequestObserved:outcomes[0]?.code==='OWNER_CANCELLED',
    cancelledResponseClosed:c.cancelledResponseClosed===1,
    lateResponseAttempts:c.lateResponseAttempts,
    lateResponsesSuppressed:c.lateResponsesSuppressed,
    peerResponseIssued:c.responsesIssued===1,
    peerResultAcceptedByToyGateway:acceptedB,
    toyGatewaySessionsCompleted:acceptedB?1:0,
    responsesClosed:c.responseClosed,
    socketsClosed:c.socketClosed,
    cleanupConfirmed:cleanup,
    protectedFictionalEffectsCommitted:0,
    realAgentBehaviorObserved:false,
    realFilesystemReadObserved:false,
    externalMcpContacted:false,
    injectedInstructionInterpreted:false,
    injectedInstructionExecuted:false,
    independentBetaVerified:false,
    securityCertified:false,
    releaseAuthorized:false
  });
}
const CONTROLS=Object.freeze([
  ['OWNER_CANCEL','cancel-a-allow-b','PASS','M11_CANCELLED_RESPONSE_ISOLATED',2,0,true,0],
  ['STALE_SUPPRESSED','late-response-suppressed','PASS','M11_CANCELLED_RESPONSE_ISOLATED',2,0,true,1],
  ['CROSS_SESSION','cross-session-result','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['REPLAYED','replayed-a-response','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['WRONG_ID','wrong-response-id','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['FORGED_APPROVAL','forged-response-authority','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['DUPLICATE_JSON','duplicate-response-key','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['BAD_JSON','malformed-response','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['BAD_CONTENT_TYPE','wrong-content-type','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['REDIRECT','redirect','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['OVERSIZED','oversized-response','FAIL','M11_CANCEL_PEER_RESPONSE_REJECTED',2,0,false,0],
  ['STALL','stalled-b','FAIL','M11_CANCEL_PEER_TIMEOUT',2,0,false,0],
  ['REUSED_ID','duplicate-request-id','FAIL','M11_CANCEL_PEER_REQUEST_DENIED',1,1,false,0],
  ['HEADER_AUTH','forged-request-header','FAIL','M11_CANCEL_PEER_REQUEST_DENIED',1,1,false,0]
]);
const UNAVAILABLE=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M11_CANCEL_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,externalMcpContacted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
export async function runFixedM11CancellationSelftest(args=[]){
  if(!noArgs(args))return UNAVAILABLE;
  try{
    const first=await loadValidatedFixtureProposalFile(fileURLToPath(FIRST));
    const second=await loadValidatedFixtureProposalFile(fileURLToPath(SECOND));
    const cases=[];
    for(const [label,fault,status,code,accepted,denied,peer,late] of CONTROLS){
      const r=await runOwnedM11Cancellation(first,second,
        {fault,deadlineMs:fault==='stalled-b'?350:3000});
      const matched=r.status===status&&r.ruleCode===code&&
        r.exitCode===(status==='PASS'?0:1)&&
        r.prerequisiteAccepted===true&&
        r.ownedRequestsObserved===2&&
        r.ownedRequestsAccepted===accepted&&
        r.ownedRequestsDenied===denied&&
        r.cancelledFirstRequestObserved===true&&
        r.cancelledResponseClosed===true&&
        r.peerResultAcceptedByToyGateway===peer&&
        r.toyGatewaySessionsCompleted===(peer?1:0)&&
        r.lateResponseAttempts===late&&
        r.lateResponsesSuppressed===late&&
        r.responsesClosed===2&&r.socketsClosed===2&&
        r.cleanupConfirmed===true&&
        r.protectedFictionalEffectsCommitted===0&&
        r.realAgentBehaviorObserved===false&&
        r.externalMcpContacted===false;
      cases.push(Object.freeze({control:label,expectedStatus:status,
        expectedRuleCode:code,matched}));
    }
    const matched=cases.filter(x=>x.matched).length;
    const pass=matched===CONTROLS.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',
      exitCode:pass?0:1,
      ruleCode:pass?'M11_CANCEL_FIXED_CONTROLS_MATCH':
        'M11_CANCEL_FIXED_CONTROLS_MISMATCH',
      scope:SCOPE,checked:CONTROLS.length,matched,
      positiveControlsExpected:2,negativeControlsExpected:12,
      negativeControlsMatched:cases.slice(2).filter(x=>x.matched).length,
      cases:Object.freeze(cases),
      realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,
      externalMcpContacted:false,
      injectedInstructionInterpreted:false,
      injectedInstructionExecuted:false,
      independentBetaVerified:false,
      securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return UNAVAILABLE;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runFixedM11CancellationSelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
