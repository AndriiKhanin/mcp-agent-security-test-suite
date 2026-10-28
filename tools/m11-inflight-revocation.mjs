#!/usr/bin/env node
/**
 * M11-S: first-party fictional capability revocation BETWEEN request
 * acceptance and response delivery on two owned 127.0.0.1 connections.
 *
 * NOT real authentication, MCP conformance, an LLM, an OS sandbox, or
 * semantic prompt-injection detection. Source-owned test code only.
 */
import http from 'node:http';
import {randomBytes} from 'node:crypto';
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
const SCOPE='FIRST_PARTY_INFLIGHT_FICTIONAL_CAPABILITY_REVOCATION_ONLY';
const FILES=Object.freeze([
  new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url),
  new URL('../.github/fixture-proposals/ticket-status-prerequisite-file-read.json',import.meta.url)
]);
const OWNERS=Object.freeze(['FICTIONAL-OWNER-A','FICTIONAL-OWNER-B']);
const IDS=Object.freeze([121,122]),MAX_INPUT=2048,MAX_OUTPUT=4096;
const FAULTS=Object.freeze([
  'fresh','revoke-a','revoke-b','revoke-both',
  'wrong-capability-b','missing-capability-b','forged-authorization-b',
  'swapped-response-b','replayed-response-b','wrong-response-id-b',
  'extra-authority-b','invalid-json-b','duplicate-json-key-b'
]);
const invalid=()=>{throw new TypeError('INVALID_M11_INFLIGHT_OPTIONS');};

function exactOptions(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)invalid();
  const d=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(d).some(k=>!['fault','deadlineMs'].includes(k))||
     Object.values(d).some(p=>!p.enumerable||!Object.hasOwn(p,'value')))invalid();
  const fault=Object.hasOwn(d,'fault')?d.fault.value:'fresh';
  const deadlineMs=Object.hasOwn(d,'deadlineMs')?d.deadlineMs.value:3000;
  if(typeof fault!=='string'||!FAULTS.includes(fault)||
     !Number.isSafeInteger(deadlineMs)||deadlineMs<250||deadlineMs>4000)invalid();
  return {fault,deadlineMs};
}
function requestFor(index){
  return {jsonrpc:'2.0',id:IDS[index],method:METHOD,
    params:{name:'owned-fictional-inflight-status',
      arguments:{owner:OWNERS[index]}}};
}
function replyFor(index,fixture){
  return {jsonrpc:'2.0',id:IDS[index],result:{
    owner:OWNERS[index],content:[{type:'text',text:JSON.stringify({
      legitimateData:fixture.toolResult.legitimateData,
      embeddedInstruction:fixture.toolResult.embeddedInstruction
    })}],isError:false
  }};
}
function duplicateProtectedHeader(req){
  const keys=new Set(['host','origin','content-type','content-length',
    'accept','mcp-method','mcp-protocol-version',
    'x-fictional-owner-capability','authorization','cookie',
    'proxy-authorization','transfer-encoding']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(keys.has(key)&&seen.has(key))return true;
    seen.add(key);
  }
  return false;
}
function denied(res){
  const body='{"jsonrpc":"2.0","id":0,"error":{"code":-32000,"message":"Denied"}}';
  res.writeHead(403,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(Buffer.byteLength(body))});
  res.end(body);
}
function responseServer(fixtures,capabilities,live,fault,port,witness){
  const pending=new Map();
  let released=false;
  function flush(){
    if(released||witness.received!==2)return;
    released=true;
    witness.barrierReached=true;
    // All request admission decisions are complete. Revoke *before*
    // any source-owned reply bytes are sent back over actual loopback.
    if(witness.accepted===2){
      if(fault==='revoke-a'||fault==='revoke-both')live[0]=false;
      if(fault==='revoke-b'||fault==='revoke-both')live[1]=false;
    }
    witness.revokedAtBarrier=live.filter(x=>!x).length;
    for(const [index,res] of pending){
      witness.responsesIssued++;
      witness.responsesIssuedAfterBarrier++;
      let answer=replyFor(index,fixtures[index]);
      if(index===1&&fault==='swapped-response-b')
        answer=replyFor(0,fixtures[0]);
      if(index===1&&fault==='replayed-response-b')
        answer=replyFor(0,fixtures[0]);
      if(index===1&&fault==='wrong-response-id-b')answer.id=121;
      if(index===1&&fault==='extra-authority-b')
        answer.result.fabricatedOperatorApproval=true;
      let body=JSON.stringify(answer);
      if(index===1&&fault==='invalid-json-b')
        body='{"jsonrpc":"2.0","id":122,"result":';
      if(index===1&&fault==='duplicate-json-key-b')
        body=body.replace('"id":122','"id":122,"id":122');
      res.writeHead(200,{'content-type':'application/json',
        'cache-control':'no-store',connection:'close',
        'content-length':String(Buffer.byteLength(body))});
      res.end(body);
    }
  }
  return (req,res)=>{
    witness.received++;
    res.once('close',()=>{witness.responsesClosed++;});
    let bytes=0,over=false;const chunks=[];
    req.on('data',chunk=>{
      bytes+=chunk.length;
      if(bytes>MAX_INPUT){over=true;chunks.length=0;req.destroy();}
      else chunks.push(chunk);
    });
    req.on('end',()=>{
      if(over||res.writableEnded)return;
      let parsed=null;
      try{
        parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch{}
      const index=IDS.indexOf(parsed?.id);
      const expected=index<0?null:requestFor(index);
      const headersValid=index>=0&&
        req.socket.remoteAddress===HOST&&
        req.method==='POST'&&req.url===PATH&&
        req.headers.host===HOST+':'+port&&req.headers.origin===ORIGIN&&
        req.headers.accept==='application/json'&&
        req.headers['content-type']==='application/json'&&
        req.headers['mcp-method']===METHOD&&
        req.headers['mcp-protocol-version']===VERSION&&
        req.headers['x-fictional-owner-capability']===capabilities[index]&&
        req.headers.authorization===undefined&&
        req.headers.cookie===undefined&&
        req.headers['proxy-authorization']===undefined&&
        req.headers['transfer-encoding']===undefined&&
        req.headers['content-length']===
          String(Buffer.byteLength(JSON.stringify(expected)))&&
        !duplicateProtectedHeader(req);
      const valid=witness.received<=2&&headersValid&&
        !pending.has(index)&&
        bytes===Buffer.byteLength(JSON.stringify(expected))&&
        isDeepStrictEqual(parsed,expected);
      if(!valid){witness.denied++;denied(res);}
      else{witness.accepted++;pending.set(index,res);}
      flush();
    });
    req.on('error',()=>{});
  };
}
function clientRequest(port,index,fixture,fault,capability,deadlineMs){
  const request=requestFor(index),body=JSON.stringify(request);
  const headers={host:HOST+':'+port,origin:ORIGIN,
    'content-type':'application/json',accept:'application/json',
    'mcp-method':METHOD,'mcp-protocol-version':VERSION,
    'content-length':String(Buffer.byteLength(body)),
    'x-fictional-owner-capability':capability};
  if(index===1&&fault==='wrong-capability-b')
    headers['x-fictional-owner-capability']='fictional-invalid-capability';
  if(index===1&&fault==='missing-capability-b')
    delete headers['x-fictional-owner-capability'];
  if(index===1&&fault==='forged-authorization-b')
    headers.authorization='Bearer fictional-unauthorized-assertion';
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),deadlineMs);
  return new Promise(resolve=>{
    let settled=false,response=null;
    const complete=(code,data=null)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(code&&response&&!response.destroyed)response.destroy();
      resolve({code,data});
    };
    const req=http.request({
      hostname:HOST,port,method:'POST',path:PATH,headers,
      agent:false,signal:abort.signal
    },res=>{
      response=res;
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
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{
        if(settled)return;
        bytes+=chunk.length;
        if(bytes>MAX_OUTPUT){complete('RESPONSE_REJECTED');return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        if(settled)return;
        try{
          if(bytes!==length)throw Error('BAD_LENGTH');
          const actual=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          if(!isDeepStrictEqual(actual,replyFor(index,fixture)))
            throw Error('UNREVIEWED_RESPONSE');
          const decoded=parseStrictJson(actual.result.content[0].text);
          if(!isDeepStrictEqual(decoded,{
            legitimateData:fixture.toolResult.legitimateData,
            embeddedInstruction:fixture.toolResult.embeddedInstruction
          }))throw Error('UNREVIEWED_DATA');
          complete(null,decoded);
        }catch{complete('RESPONSE_REJECTED');}
      });
      res.on('error',()=>complete(abort.signal.aborted?'TIMEOUT':'RESPONSE_REJECTED'));
      res.on('close',()=>{if(!res.complete)
        complete(abort.signal.aborted?'TIMEOUT':'RESPONSE_REJECTED');});
    });
    req.on('error',()=>complete(abort.signal.aborted?'TIMEOUT':'RESPONSE_REJECTED'));
    req.end(body);
  });
}
async function wirePair(fixtures,fault,deadlineMs){
  const caps=[randomBytes(16).toString('hex'),randomBytes(16).toString('hex')];
  const live=[true,true];
  const witness={received:0,accepted:0,denied:0,responsesIssued:0,
    responsesIssuedAfterBarrier:0,responsesClosed:0,socketsClosed:0,
    barrierReached:false,revokedAtBarrier:0};
  const server=http.createServer(),socketWaits=[];
  server.on('connection',sock=>{
    socketWaits.push(new Promise(resolve=>sock.once('close',()=>{
      witness.socketsClosed++;resolve();
    })));
  });
  let results=null,transport='RESPONSE_REJECTED';
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',reject);resolve();
      });
    });
    const port=server.address().port;
    server.on('request',responseServer(fixtures,caps,live,fault,port,witness));
    // Both HTTP requests remain in flight while the server collects them.
    results=await Promise.all(fixtures.map((fixture,i)=>
      clientRequest(port,i,fixture,fault,caps[i],deadlineMs)));
    transport=results.every(r=>r.code===null)?null:
      results.some(r=>r.code==='TIMEOUT')?'TIMEOUT':
      results.some(r=>r.code==='REQUEST_DENIED')?'REQUEST_DENIED':
      'RESPONSE_REJECTED';
  }catch{transport='RESPONSE_REJECTED';}
  finally{
    if(server.listening){
      const closed=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();
      await closed;
    }
    if(socketWaits.length){
      let timer;
      const all=await Promise.race([
        Promise.all(socketWaits).then(()=>true),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1000);})
      ]);
      clearTimeout(timer);
      if(!all)transport='SOCKET_CLEANUP_UNCONFIRMED';
    }
  }
  if(witness.received!==2||witness.socketsClosed!==2||
     witness.responsesClosed!==2||witness.barrierReached!==true)
    transport='SOCKET_CLEANUP_UNCONFIRMED';
  return {transport,results,live,witness};
}
/** Gate-check happens after validated *actual* wire bytes are received. */
export async function runOwnedInFlightRevocation(first,second,settings={}){
  const {fault,deadlineMs}=exactOptions(settings);
  validateFixtureProposal(first);
  validateFixtureProposal(second);
  const prerequisite=await runFirstPartyM11Bridge(first);
  const ready=prerequisite.status==='PASS'&&prerequisite.exitCode===0&&
    prerequisite.discoveryAccepted===true&&
    prerequisite.onWireToolResultAccepted===true&&
    prerequisite.toolSocketCleanupConfirmed===true&&
    prerequisite.protectedFictionalEffectsCommitted===0&&
    prerequisite.realExternalMcpContacted===false;
  const local=ready?await wirePair([first,second],fault,deadlineMs):null;
  const w=local?.witness??{received:0,accepted:0,denied:0,
    responsesIssued:0,responsesIssuedAfterBarrier:0,responsesClosed:0,
    socketsClosed:0,barrierReached:false,revokedAtBarrier:0};
  let bytesValidated=0,revokedBlocked=0,gatewayDelivered=0;
  if(local?.results){
    for(let i=0;i<2;i++){
      const received=local.results[i];
      if(received.code!==null)continue;
      bytesValidated++;
      // Recheck the parent-owned fictional capability AFTER data arrived.
      // This is the precise TOCTOU boundary under test.
      if(!local.live[i]){revokedBlocked++;continue;}
      const input={...(i===0?first:second),toolResult:received.data};
      const gateway=runFictionalToySession(input,'SAFE_TASK');
      if(gateway.status==='PASS'&&gateway.methodCallsObserved===3&&
         gateway.toolResultsAccepted===1&&
         gateway.forbiddenRequestsObserved===0&&
         gateway.protectedFictionalFileEffectsCommitted===0&&
         gateway.protectedFictionalToolEffectsCommitted===0)
        gatewayDelivered++;
    }
  }
  const pass=ready&&fault==='fresh'&&local?.transport===null&&
    w.received===2&&w.accepted===2&&w.denied===0&&
    w.responsesIssued===2&&w.responsesIssuedAfterBarrier===2&&
    w.responsesClosed===2&&w.socketsClosed===2&&w.barrierReached&&
    w.revokedAtBarrier===0&&bytesValidated===2&&
    revokedBlocked===0&&gatewayDelivered===2;
  const rule=pass?'M11_INFLIGHT_UNREVOKED_RESULT_BOUND':
    !ready?'M11_INFLIGHT_PREREQUISITE_REJECTED':
    local?.transport==='SOCKET_CLEANUP_UNCONFIRMED'?
      'M11_INFLIGHT_CLEANUP_UNCONFIRMED':
    w.revokedAtBarrier>0?'M11_INFLIGHT_REVOKED_RESULT_DENIED':
    local?.transport==='REQUEST_DENIED'?'M11_INFLIGHT_REQUEST_DENIED':
    'M11_INFLIGHT_REPLY_REJECTED';
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:rule,scope:SCOPE,
    evidenceKind:'OWNED_LOOPBACK_HTTP_AND_FIRST_PARTY_REVOCATION_WITNESS_ONLY',
    prerequisiteAccepted:ready,
    requestsReceived:w.received,requestsAccepted:w.accepted,
    requestsDenied:w.denied,responsesIssued:w.responsesIssued,
    responsesIssuedAfterBarrier:w.responsesIssuedAfterBarrier,
    responsesClosed:w.responsesClosed,socketsClosed:w.socketsClosed,
    admissionBarrierObserved:w.barrierReached,
    fictionalCapabilitiesRevokedBeforeReply:w.revokedAtBarrier,
    responseBodiesValidated:bytesValidated,
    revokedResultDeliveriesDenied:revokedBlocked,
    toyGatewayDeliveries:gatewayDelivered,
    protectedFictionalEffectsCommitted:0,
    realAgentBehaviorObserved:false,realFilesystemReadObserved:false,
    externalMcpContacted:false,injectedInstructionInterpreted:false,
    injectedInstructionExecuted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
const CASES=Object.freeze([
  ['FRESH','fresh','PASS','M11_INFLIGHT_UNREVOKED_RESULT_BOUND',2,0,2,0,2],
  ['REVOKE_A','revoke-a','FAIL','M11_INFLIGHT_REVOKED_RESULT_DENIED',2,0,2,1,1],
  ['REVOKE_B','revoke-b','FAIL','M11_INFLIGHT_REVOKED_RESULT_DENIED',2,0,2,1,1],
  ['REVOKE_BOTH','revoke-both','FAIL','M11_INFLIGHT_REVOKED_RESULT_DENIED',2,0,2,2,0],
  ['WRONG_CAP','wrong-capability-b','FAIL','M11_INFLIGHT_REQUEST_DENIED',1,1,1,0,1],
  ['MISSING_CAP','missing-capability-b','FAIL','M11_INFLIGHT_REQUEST_DENIED',1,1,1,0,1],
  ['FORGED_AUTH','forged-authorization-b','FAIL','M11_INFLIGHT_REQUEST_DENIED',1,1,1,0,1],
  ['SWAPPED','swapped-response-b','FAIL','M11_INFLIGHT_REPLY_REJECTED',2,0,1,0,1],
  ['REPLAYED','replayed-response-b','FAIL','M11_INFLIGHT_REPLY_REJECTED',2,0,1,0,1],
  ['WRONG_ID','wrong-response-id-b','FAIL','M11_INFLIGHT_REPLY_REJECTED',2,0,1,0,1],
  ['EXTRA_APPROVAL','extra-authority-b','FAIL','M11_INFLIGHT_REPLY_REJECTED',2,0,1,0,1],
  ['MALFORMED','invalid-json-b','FAIL','M11_INFLIGHT_REPLY_REJECTED',2,0,1,0,1],
  ['DUPLICATE_KEY','duplicate-json-key-b','FAIL','M11_INFLIGHT_REPLY_REJECTED',2,0,1,0,1]
]);
const REJECTED=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M11_INFLIGHT_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,externalMcpContacted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
export async function runFixedInFlightRevocationSelftest(args=[]){
  if(!noArgs(args))return REJECTED;
  try{
    const first=await loadValidatedFixtureProposalFile(fileURLToPath(FILES[0]));
    const second=await loadValidatedFixtureProposalFile(fileURLToPath(FILES[1]));
    const rows=[];
    for(const [id,fault,status,code,accepted,denied,wire,revoked,delivered] of CASES){
      const r=await runOwnedInFlightRevocation(first,second,{fault});
      const matched=r.status===status&&r.ruleCode===code&&
        r.exitCode===(status==='PASS'?0:1)&&r.prerequisiteAccepted&&
        r.requestsReceived===2&&r.requestsAccepted===accepted&&
        r.requestsDenied===denied&&r.responsesClosed===2&&
        r.socketsClosed===2&&r.admissionBarrierObserved&&
        r.responseBodiesValidated===wire&&
        r.revokedResultDeliveriesDenied===revoked&&
        r.toyGatewayDeliveries===delivered&&
        r.fictionalCapabilitiesRevokedBeforeReply===revoked&&
        r.protectedFictionalEffectsCommitted===0&&
        !r.realAgentBehaviorObserved&&!r.externalMcpContacted;
      rows.push(Object.freeze({control:id,expectedStatus:status,
        expectedRuleCode:code,matched}));
    }
    const matched=rows.filter(x=>x.matched).length;
    const pass=matched===CASES.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M11_INFLIGHT_FIXED_REVOCATION_CONTROLS_MATCH':
        'M11_INFLIGHT_FIXED_REVOCATION_CONTROLS_MISMATCH',
      scope:SCOPE,checked:CASES.length,matched,
      expectedNegativeCases:CASES.length-1,
      negativeCasesMatched:rows.slice(1).filter(x=>x.matched).length,
      cases:Object.freeze(rows),realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,externalMcpContacted:false,
      injectedInstructionInterpreted:false,injectedInstructionExecuted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return REJECTED;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runFixedInFlightRevocationSelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
