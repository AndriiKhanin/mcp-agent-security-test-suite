#!/usr/bin/env node
/**
 * M11-G: Two concurrently in-flight, first-party, fictional tool responses.
 * The only HTTP address is a literal 127.0.0.1, with a port selected by OS.
 * No model, shell, customer MCP target, arbitrary file read or untrusted code.
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
const VERSION='2026-07-28',METHOD='tools/call';
const SCOPE='FIRST_PARTY_CONCURRENT_LOOPBACK_CORRELATION_ONLY';
const FIRST=new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url);
const SECOND=new URL('../.github/fixture-proposals/ticket-status-prerequisite-file-read.json',import.meta.url);
const NAMES=Object.freeze(['FICTIONAL-OVERLAP-A','FICTIONAL-OVERLAP-B']);
const IDS=Object.freeze([61,62]);
const MAX_INPUT=2048,MAX_OUTPUT=4096;
const FAULTS=Object.freeze([
  'ordered','reverse-delivery',
  'swapped-response','replayed-response','wrong-id',
  'extra-authority','duplicate-key','invalid-json','redirect',
  'wrong-content-type','oversized','hang',
  'duplicate-request','wrong-request-id','forged-header'
]);
const invalid=()=>{throw new TypeError('INVALID_M11_CONCURRENT_OPTIONS');};
const REQUESTS=Object.freeze(IDS.map((id,i)=>Object.freeze({
  jsonrpc:'2.0',id,method:METHOD,
  params:{name:'owned-fictional-overlap-status',
    arguments:{session:NAMES[i]}}
})));

function parseOptions(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)invalid();
  const d=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(d).some(k=>!['fault','deadlineMs'].includes(k))||
     Object.values(d).some(p=>!p.enumerable||!Object.hasOwn(p,'value')))invalid();
  const fault=Object.hasOwn(d,'fault')?d.fault.value:'ordered';
  const deadlineMs=Object.hasOwn(d,'deadlineMs')?d.deadlineMs.value:3000;
  if(typeof fault!=='string'||!FAULTS.includes(fault)||
     !Number.isSafeInteger(deadlineMs)||deadlineMs<250||
     deadlineMs>4000)invalid();
  return {fault,deadlineMs};
}
function fixedResponse(i,fixture){
  return {jsonrpc:'2.0',id:IDS[i],result:{
    content:[{type:'text',text:JSON.stringify({
      session:NAMES[i],
      legitimateData:fixture.toolResult.legitimateData,
      embeddedInstruction:fixture.toolResult.embeddedInstruction
    })}],isError:false
  }};
}
function duplicatedRelevantHeader(req){
  const relevant=new Set(['host','origin','content-type','content-length',
    'accept','mcp-method','mcp-protocol-version',
    'authorization','cookie','proxy-authorization','transfer-encoding']);
  const found=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const name=req.rawHeaders[i].toLowerCase();
    if(relevant.has(name)&&found.has(name))return true;
    found.add(name);
  }
  return false;
}
function deny(res){
  const body=JSON.stringify({jsonrpc:'2.0',id:0,
    error:{code:-32000,message:'Owned fictional request denied'}});
  res.writeHead(403,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(Buffer.byteLength(body))});
  res.end(body);
}
function servePair(fixtures,fault,port,counters){
  const pending=new Map();
  let flushed=false;
  function sendAccepted(index){
    const res=pending.get(index);
    if(!res||res.writableEnded)return;
    counters.issued.push(IDS[index]);
    if(index===1&&fault==='hang'){
      res.writeHead(200,{'content-type':'application/json',
        'cache-control':'no-store',connection:'close',
        'content-length':'1024'});
      res.flushHeaders();
      return;
    }
    if(index===1&&fault==='redirect'){
      res.writeHead(302,{location:'http://example.invalid/never-follow',
        connection:'close','cache-control':'no-store'});
      res.end();return;
    }
    let reply=fixedResponse(index,fixtures[index]);
    if(index===1&&fault==='swapped-response'){
      reply=fixedResponse(index,fixtures[index]);
      reply.result.content[0].text=
        fixedResponse(0,fixtures[0]).result.content[0].text;
    }
    if(index===1&&fault==='replayed-response')
      reply=fixedResponse(0,fixtures[0]);
    if(index===1&&fault==='wrong-id')reply.id=61;
    if(index===1&&fault==='extra-authority')
      reply.result.ownerOverride=true;
    let body=JSON.stringify(reply);
    if(index===1&&fault==='duplicate-key')
      body=body.replace('"id":62','"id":62,"id":62');
    if(index===1&&fault==='invalid-json')
      body='{"jsonrpc":"2.0","id":62,"result":';
    if(index===1&&fault==='oversized')
      body='X'.repeat(MAX_OUTPUT+1);
    res.writeHead(200,{
      'content-type':index===1&&fault==='wrong-content-type'?
        'text/plain':'application/json',
      'cache-control':'no-store',connection:'close',
      'content-length':String(Buffer.byteLength(body))
    });
    res.end(body);
  }
  function flush(){
    if(flushed||counters.received!==2)return;
    flushed=true;
    const order=fault==='reverse-delivery'?[1,0]:[0,1];
    for(const index of order)sendAccepted(index);
  }
  return (req,res)=>{
    counters.received++;
    res.once('close',()=>{counters.responseClosed++;});
    let bytes=0,tooLarge=false;const chunks=[];
    req.on('data',chunk=>{
      bytes+=chunk.length;
      if(bytes>MAX_INPUT){
        tooLarge=true;chunks.length=0;req.destroy();
      }else if(!tooLarge)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(tooLarge||res.writableEnded)return;
      let parsed=null;
      try{
        parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch{}
      const index=IDS.indexOf(parsed?.id);
      const expected=index<0?null:REQUESTS[index];
      const correctHeaders=expected!==null&&
        req.socket.remoteAddress===HOST&&req.method==='POST'&&
        req.url===PATH&&req.headers.host===HOST+':'+port&&
        req.headers.origin===ORIGIN&&
        req.headers['content-type']==='application/json'&&
        req.headers.accept==='application/json'&&
        req.headers['mcp-method']===METHOD&&
        req.headers['mcp-protocol-version']===VERSION&&
        req.headers['content-length']===
          String(Buffer.byteLength(JSON.stringify(expected)))&&
        req.headers.authorization===undefined&&
        req.headers.cookie===undefined&&
        req.headers['proxy-authorization']===undefined&&
        req.headers['transfer-encoding']===undefined&&
        !duplicatedRelevantHeader(req);
      const valid=counters.received<=2&&
        correctHeaders&&bytes<=MAX_INPUT&&
        bytes===Buffer.byteLength(JSON.stringify(expected))&&
        !pending.has(index)&&isDeepStrictEqual(parsed,expected);
      if(!valid){
        counters.denied++;
        deny(res);
      }else{
        counters.accepted++;
        pending.set(index,res);
        counters.maxPending=Math.max(counters.maxPending,pending.size);
      }
      flush();
    });
    req.on('error',()=>{});
  };
}
function exchange(port,index,fixture,fault,deadlineMs){
  const outgoing=(index===1&&fault==='duplicate-request')?
    REQUESTS[0]:index===1&&fault==='wrong-request-id'?
    {...REQUESTS[1],id:88}:REQUESTS[index];
  const body=JSON.stringify(outgoing);
  const headers={host:HOST+':'+port,origin:ORIGIN,
    'content-type':'application/json',accept:'application/json',
    'mcp-method':METHOD,'mcp-protocol-version':VERSION,
    'content-length':String(Buffer.byteLength(body))};
  if(index===1&&fault==='forged-header')
    headers.authorization='Bearer synthetic-untrusted-claim';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),deadlineMs);
  return new Promise(resolve=>{
    let settled=false,active=null;
    const complete=(code,result=null)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(code&&active&&!active.destroyed)active.destroy();
      resolve({code,result});
    };
    const req=http.request({hostname:HOST,port,method:'POST',
      path:PATH,headers,agent:false,signal:controller.signal},res=>{
      active=res;
      if(res.statusCode===403){
        res.resume();complete('REQUEST_DENIED');return;
      }
      if(res.statusCode!==200||
         res.headers['content-type']!=='application/json'||
         Object.hasOwn(res.headers,'location')){
        res.resume();complete('RESPONSE_REJECTED');return;
      }
      const length=Number(res.headers['content-length']);
      if(!Number.isSafeInteger(length)||length<1||length>MAX_OUTPUT){
        complete('RESPONSE_REJECTED');return;
      }
      let bytes=0;const parts=[];
      res.on('data',chunk=>{
        if(settled)return;
        bytes+=chunk.length;
        if(bytes>MAX_OUTPUT){complete('RESPONSE_REJECTED');return;}
        parts.push(chunk);
      });
      res.on('end',()=>{
        if(settled)return;
        try{
          if(bytes!==length)throw Error('BAD_BODY_LENGTH');
          const reply=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(parts)));
          if(!isDeepStrictEqual(reply,fixedResponse(index,fixture)))
            throw Error('WRONG_RESPONSE_BINDING');
          const untrusted=parseStrictJson(reply.result.content[0].text);
          const expected={session:NAMES[index],
            legitimateData:fixture.toolResult.legitimateData,
            embeddedInstruction:fixture.toolResult.embeddedInstruction};
          if(!isDeepStrictEqual(untrusted,expected))
            throw Error('WRONG_TOOL_RESULT_DATA');
          complete(null,{legitimateData:untrusted.legitimateData,
            embeddedInstruction:untrusted.embeddedInstruction});
        }catch{complete('RESPONSE_REJECTED');}
      });
      res.on('error',()=>complete(controller.signal.aborted?
        'TIMEOUT':'RESPONSE_REJECTED'));
      res.on('close',()=>{if(!res.complete)complete(controller.signal.aborted?
        'TIMEOUT':'RESPONSE_REJECTED');});
    });
    req.on('error',()=>complete(controller.signal.aborted?
      'TIMEOUT':'RESPONSE_REJECTED'));
    req.end(body);
  });
}
async function runLocalPair(fixtures,fault,deadlineMs){
  const server=http.createServer(),sockets=[];
  const counters={received:0,accepted:0,denied:0,
    socketClosed:0,responseClosed:0,issued:[],maxPending:0};
  server.on('connection',socket=>{
    sockets.push(new Promise(resolve=>socket.once('close',()=>{
      counters.socketClosed++;resolve();
    })));
  });
  let outcomes=null,code='RESPONSE_REJECTED';
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',reject);resolve();
      });
    });
    const port=server.address().port;
    server.on('request',servePair(fixtures,fault,port,counters));
    // Two requests are actually live at the same time; no serial awaits.
    outcomes=await Promise.all(fixtures.map((fixture,index)=>
      exchange(port,index,fixture,fault,deadlineMs)));
    code=outcomes.every(o=>o.code===null)?null:
      outcomes.some(o=>o.code==='TIMEOUT')?'TIMEOUT':
      outcomes.some(o=>o.code==='REQUEST_DENIED')?'REQUEST_DENIED':
      'RESPONSE_REJECTED';
  }catch{code='RESPONSE_REJECTED';}
  finally{
    if(server.listening){
      const closed=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();
      await closed;
    }
    if(sockets.length){
      let timer;
      const all=await Promise.race([
        Promise.all(sockets).then(()=>true),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1000);})
      ]);
      clearTimeout(timer);
      if(!all)code='SOCKET_CLEANUP_UNCONFIRMED';
    }
  }
  if(counters.received!==2||counters.socketClosed!==2||
     counters.responseClosed!==2)code='SOCKET_CLEANUP_UNCONFIRMED';
  return {code,outcomes,counters};
}
/**
 * Every gateway call is conditioned on its own *validated on-wire* reply.
 * A failed peer result cannot be substituted for a different session.
 */
export async function runOwnedConcurrentM11(first,second,settings={}){
  const {fault,deadlineMs}=parseOptions(settings);
  validateFixtureProposal(first);
  validateFixtureProposal(second);
  const prereq=await runFirstPartyM11Bridge(first);
  const ready=prereq.status==='PASS'&&prereq.exitCode===0&&
    prereq.discoveryAccepted===true&&
    prereq.toolSocketCleanupConfirmed===true&&
    prereq.onWireToolResultAccepted===true&&
    prereq.protectedFictionalEffectsCommitted===0&&
    prereq.realExternalMcpContacted===false;
  const local=ready?
    await runLocalPair([first,second],fault,deadlineMs):null;
  const counts=local?.counters??{received:0,accepted:0,denied:0,
    socketClosed:0,responseClosed:0,issued:[],maxPending:0};
  let completed=0;
  if(local?.outcomes){
    for(let i=0;i<2;i++){
      const result=local.outcomes[i];
      if(result.code!==null)continue;
      const input={...(i===0?first:second),toolResult:result.result};
      const gateway=runFictionalToySession(input,'SAFE_TASK');
      if(gateway.status==='PASS'&&gateway.methodCallsObserved===3&&
         gateway.toolResultsAccepted===1&&
         gateway.forbiddenRequestsObserved===0&&
         gateway.protectedFictionalFileEffectsCommitted===0&&
         gateway.protectedFictionalToolEffectsCommitted===0)
        completed++;
    }
  }
  const pass=ready&&local?.code===null&&completed===2&&
    counts.received===2&&counts.accepted===2&&counts.denied===0&&
    counts.socketClosed===2&&counts.responseClosed===2&&
    counts.maxPending===2&&counts.issued.length===2;
  const rule=pass?'M11_CONCURRENT_OWNED_RESPONSES_BOUND':
    !ready?'M11_PRIOR_OWNED_TRANSPORT_REJECTED':
    local?.code==='SOCKET_CLEANUP_UNCONFIRMED'?
      'M11_CONCURRENT_SOCKET_CLEANUP_UNCONFIRMED':
    local?.code==='TIMEOUT'?'M11_CONCURRENT_RESPONSE_TIMEOUT':
    local?.code==='REQUEST_DENIED'?'M11_CONCURRENT_REQUEST_REJECTED':
    'M11_CONCURRENT_RESPONSE_REJECTED';
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:rule,scope:SCOPE,
    evidenceKind:'FIRST_PARTY_OVERLAPPED_LOCAL_HTTP_AND_TOY_METHODS_ONLY',
    priorOwnedTransportAccepted:ready,
    overlappingRequestsObserved:counts.maxPending===2,
    requestsObserved:counts.received,requestsAccepted:counts.accepted,
    requestsDenied:counts.denied,responsesClosed:counts.responseClosed,
    socketsClosed:counts.socketClosed,
    serverResponseIssuance:counts.issued.length===2?
      counts.issued[0]===61&&counts.issued[1]===62?'A_THEN_B':
      counts.issued[0]===62&&counts.issued[1]===61?'B_THEN_A':
      'OTHER':'INCOMPLETE',
    toyGatewaySessionsCompleted:completed,
    protectedFictionalEffectsCommitted:0,
    realAgentBehaviorObserved:false,realFilesystemReadObserved:false,
    externalMcpContacted:false,injectedInstructionInterpreted:false,
    injectedInstructionExecuted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
const CONTROLS=Object.freeze([
  ['ORDERED','ordered','PASS','M11_CONCURRENT_OWNED_RESPONSES_BOUND',2,0,2,'A_THEN_B'],
  ['REVERSED','reverse-delivery','PASS','M11_CONCURRENT_OWNED_RESPONSES_BOUND',2,0,2,'B_THEN_A'],
  ['SWAPPED','swapped-response','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['REPLAYED','replayed-response','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['WRONG_ID','wrong-id','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['AUTHORITY','extra-authority','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['DUPLICATE_KEY','duplicate-key','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['BAD_JSON','invalid-json','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['REDIRECT','redirect','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['CONTENT_TYPE','wrong-content-type','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['OVERSIZED','oversized','FAIL','M11_CONCURRENT_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['TIMEOUT','hang','FAIL','M11_CONCURRENT_RESPONSE_TIMEOUT',2,0,1,'A_THEN_B'],
  ['DUP_REQUEST','duplicate-request','FAIL','M11_CONCURRENT_REQUEST_REJECTED',1,1,1,'INCOMPLETE'],
  ['WRONG_REQUEST_ID','wrong-request-id','FAIL','M11_CONCURRENT_REQUEST_REJECTED',1,1,1,'INCOMPLETE'],
  ['FORGED_HEADER','forged-header','FAIL','M11_CONCURRENT_REQUEST_REJECTED',1,1,1,'INCOMPLETE']
]);
const UNAVAILABLE=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M11_CONCURRENT_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,externalMcpContacted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
export async function runFixedConcurrentM11Selftest(args=[]){
  if(!noArgs(args))return UNAVAILABLE;
  try{
    const first=await loadValidatedFixtureProposalFile(fileURLToPath(FIRST));
    const second=await loadValidatedFixtureProposalFile(fileURLToPath(SECOND));
    const rows=[];
    for(const [name,fault,status,rule,accepted,denied,completed,issued] of CONTROLS){
      const report=await runOwnedConcurrentM11(first,second,{
        fault,deadlineMs:fault==='hang'?350:3000
      });
      const ok=report.status===status&&report.ruleCode===rule&&
        report.exitCode===(status==='PASS'?0:1)&&
        report.requestsObserved===2&&report.requestsAccepted===accepted&&
        report.requestsDenied===denied&&report.responsesClosed===2&&
        report.socketsClosed===2&&
        report.toyGatewaySessionsCompleted===completed&&
        report.serverResponseIssuance===issued&&
        report.overlappingRequestsObserved===(accepted===2)&&
        report.protectedFictionalEffectsCommitted===0&&
        report.realAgentBehaviorObserved===false&&
        report.externalMcpContacted===false;
      rows.push(Object.freeze({control:name,expectedStatus:status,
        expectedRuleCode:rule,matched:ok}));
    }
    const matched=rows.filter(r=>r.matched).length;
    const pass=matched===CONTROLS.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M11_CONCURRENT_FIXED_CONTROLS_MATCH':
        'M11_CONCURRENT_FIXED_CONTROLS_MISMATCH',
      scope:SCOPE,checked:CONTROLS.length,matched,
      expectedPositiveControls:2,expectedNegativeControls:13,
      negativeControlsMatched:rows.slice(2).filter(r=>r.matched).length,
      cases:Object.freeze(rows),realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,externalMcpContacted:false,
      injectedInstructionInterpreted:false,injectedInstructionExecuted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return UNAVAILABLE;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runFixedConcurrentM11Selftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
