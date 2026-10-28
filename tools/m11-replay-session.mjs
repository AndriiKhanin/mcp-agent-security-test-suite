#!/usr/bin/env node
/**
 * M11-D/E: first-party, two-session MCP-shaped loopback correlation checks.
 *
 * This is a SOURCE-ONLY test harness, NOT an agent/LLM, remote MCP client,
 * OS sandbox, secret checker or semantic prompt-injection detector.
 *
 * Both HTTP peer and client are source-owned. No input can choose a host,
 * method, route, command, credential, port, executable or remote target.
 */
import http from 'node:http';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {parseStrictJson} from '../src/strict-json.mjs';
import {
  loadValidatedFixtureProposalFile,validateFixtureProposal
} from './fixture-proposal-check.mjs';
import {runFictionalToySession} from './toy-agent-session.mjs';
import {runFirstPartyM11Bridge} from './m11-loopback-tool-result.mjs';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const METHOD='tools/call',VERSION='2026-07-28';
const SCOPE='SOURCE_OWNED_TWO_SESSION_LOOPBACK_REPLAY_ONLY';
const FIRST=new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url);
const SECOND=new URL('../.github/fixture-proposals/ticket-status-prerequisite-file-read.json',import.meta.url);
const MAX_REQUEST=2048,MAX_RESPONSE=4096;
const MAX_DEADLINE=4000;
const SESSION=Object.freeze(['FICTIONAL-SESSION-A','FICTIONAL-SESSION-B']);
const REQUESTS=Object.freeze(SESSION.map((session,i)=>Object.freeze({
  jsonrpc:'2.0',id:41+i,method:METHOD,
  params:{name:'owned-fictional-session-status',arguments:{session}}
})));
const MODES=Object.freeze([
  'allowed','replayed-response','swapped-response-data','wrong-id',
  'extra-authority','duplicate-json-key','invalid-json','wrong-content-type',
  'redirect','oversized','hang','replayed-first-request',
  'forged-request-authority','unauthorized-header',
  'premature-second-request','post-completion-replay'
]);
const invalid=()=>{throw new TypeError('INVALID_M11_REPLAY_TEST_OPTIONS');};

function checkOptions(options){
  if(!options||typeof options!=='object'||Array.isArray(options)||
     Object.getPrototypeOf(options)!==Object.prototype)invalid();
  const props=Object.getOwnPropertyDescriptors(options);
  if(Reflect.ownKeys(props).some(k=>!['fault','deadlineMs'].includes(k))||
     Object.values(props).some(p=>!Object.hasOwn(p,'value')||!p.enumerable))invalid();
  const fault=Object.hasOwn(props,'fault')?props.fault.value:'allowed';
  const deadlineMs=Object.hasOwn(props,'deadlineMs')?props.deadlineMs.value:3000;
  if(typeof fault!=='string'||!MODES.includes(fault)||
     !Number.isSafeInteger(deadlineMs)||deadlineMs<250||
     deadlineMs>MAX_DEADLINE)invalid();
  return {fault,deadlineMs};
}
function expectedResponse(step,fixture){
  return {
    jsonrpc:'2.0',id:41+step,result:{
      content:[{type:'text',text:JSON.stringify({
        session:SESSION[step],
        legitimateData:fixture.toolResult.legitimateData,
        embeddedInstruction:fixture.toolResult.embeddedInstruction
      })}],isError:false
    }
  };
}
function duplicateRelevantHeaders(req){
  const relevant=new Set([
    'host','origin','content-type','content-length','accept',
    'mcp-protocol-version','mcp-method','authorization','cookie',
    'proxy-authorization','transfer-encoding'
  ]);
  const found=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(relevant.has(key)&&found.has(key))return true;
    found.add(key);
  }
  return false;
}
function fixedReply(res,status,body){
  const text=JSON.stringify(body);
  res.writeHead(status,{
    'content-type':'application/json','cache-control':'no-store',
    connection:'close','content-length':String(Buffer.byteLength(text))
  });
  res.end(text);
}
function ownedServer(fixtures,fault,port,count){
  return (req,res)=>{
    count.received++;
    const expected=REQUESTS[count.accepted];
    const exactLength=expected?Buffer.byteLength(JSON.stringify(expected)):0;
    const headersOK=req.socket.remoteAddress===HOST&&
      req.method==='POST'&&req.url===PATH&&
      req.headers.host===HOST+':'+port&&req.headers.origin===ORIGIN&&
      req.headers['content-type']==='application/json'&&
      req.headers.accept==='application/json'&&
      req.headers['mcp-protocol-version']===VERSION&&
      req.headers['mcp-method']===METHOD&&
      req.headers.authorization===undefined&&
      req.headers.cookie===undefined&&
      req.headers['proxy-authorization']===undefined&&
      req.headers['transfer-encoding']===undefined&&
      req.headers['content-length']===String(exactLength)&&
      !duplicateRelevantHeaders(req);

    // Consume a bounded request before deciding. No arbitrary body is
    // ever forwarded to the gateway or reflected in a public report.
    let size=0,tooLarge=false;const chunks=[];
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>MAX_REQUEST){
        tooLarge=true;chunks.length=0;
        req.destroy(); // oversized request cannot reach the test gateway
      }else if(!tooLarge)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(tooLarge||res.writableEnded)return;
      let decoded;
      try{
        decoded=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch{}
      if(!headersOK||!expected||size!==exactLength||
         !isDeepStrictEqual(decoded,expected)){
        count.denied++;
        fixedReply(res,403,{jsonrpc:'2.0',id:0,
          error:{code:-32000,message:'Fixed fictional request denied'}});
        return;
      }
      const step=count.accepted++;
      res.once('close',()=>{count.responseClosed++;});
      if(step===1 && fault==='hang'){
        // Valid headers, intentionally never finish: require bounded abort
        // rather than a premature content-length/content-type rejection.
        res.writeHead(200,{
          'content-type':'application/json','cache-control':'no-store',
          connection:'close','content-length':'1024'
        });
        res.flushHeaders();
        return;
      }
      if(step===1 && fault==='redirect'){
        res.writeHead(302,{
          location:'http://example.invalid/never-follow',
          'cache-control':'no-store',connection:'close'
        });
        res.end();return;
      }
      let response=expectedResponse(step,fixtures[step]);
      if(step===1 && fault==='replayed-response')
        response=expectedResponse(0,fixtures[0]);
      if(step===1 && fault==='swapped-response-data'){
        response=expectedResponse(1,fixtures[1]);
        response.result.content[0].text=expectedResponse(
          0,fixtures[0]).result.content[0].text;
      }
      if(step===1 && fault==='wrong-id')response.id=41;
      if(step===1 && fault==='extra-authority')
        response.result.unreviewedApproval=true;
      let body=JSON.stringify(response);
      if(step===1 && fault==='duplicate-json-key')
        body=body.replace('"id":42','"id":42,"id":42');
      if(step===1 && fault==='invalid-json')
        body='{"jsonrpc":"2.0","id":42,"result":';
      if(step===1 && fault==='oversized')
        body='X'.repeat(MAX_RESPONSE+1);
      res.writeHead(200,{
        'content-type':step===1&&fault==='wrong-content-type'?
          'text/plain':'application/json',
        'cache-control':'no-store',connection:'close',
        'content-length':String(Buffer.byteLength(body))
      });
      res.end(body);
    });
    req.on('error',()=>{});
  };
}
function makeClientRequest(port,step,fixture,fault,deadlineMs){
  let request=REQUESTS[step];
  if(fault==='forged-request-authority'&&step===1){
    request={...request,params:{...request.params,
      _meta:{operatorApproved:true}}};
  }
  const payload=JSON.stringify(request);
  const headers={
    host:HOST+':'+port,origin:ORIGIN,'content-type':'application/json',
    accept:'application/json','mcp-protocol-version':VERSION,
    'mcp-method':METHOD,'content-length':String(Buffer.byteLength(payload))
  };
  if(fault==='unauthorized-header'&&step===1)
    headers.authorization='Bearer fictional-untrusted-claim';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),deadlineMs);
  return new Promise(resolve=>{
    let done=false,active=null;
    const complete=(code,toolResult=null)=>{
      if(done)return;
      done=true;clearTimeout(timer);
      if(code&&active&&!active.destroyed)active.destroy();
      resolve({code,toolResult});
    };
    const req=http.request({
      hostname:HOST,port,method:'POST',path:PATH,headers,agent:false,
      signal:controller.signal
    },res=>{
      active=res;
      if(res.statusCode===403){res.resume();complete('REQUEST_DENIED');return;}
      if(res.statusCode!==200||
         res.headers['content-type']!=='application/json'||
         Object.hasOwn(res.headers,'location')){
        res.resume();complete('RESPONSE_REJECTED');return;
      }
      const length=Number(res.headers['content-length']);
      if(!Number.isSafeInteger(length)||length<1||length>MAX_RESPONSE){
        complete('RESPONSE_REJECTED');return;
      }
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{
        if(done)return;
        bytes+=chunk.length;
        if(bytes>MAX_RESPONSE){complete('RESPONSE_REJECTED');return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        if(done)return;
        try{
          if(bytes!==length)throw Error('MISMATCH_LENGTH');
          const actual=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          if(!isDeepStrictEqual(actual,expectedResponse(step,fixture)))
            throw Error('MISMATCH_CORRELATION');
          const data=parseStrictJson(actual.result.content[0].text);
          if(!isDeepStrictEqual(data,{
            session:SESSION[step],
            legitimateData:fixture.toolResult.legitimateData,
            embeddedInstruction:fixture.toolResult.embeddedInstruction
          }))throw Error('MISMATCH_DATA');
          complete(null,{
            legitimateData:data.legitimateData,
            embeddedInstruction:data.embeddedInstruction
          });
        }catch{complete('RESPONSE_REJECTED');}
      });
      res.on('error',()=>complete(controller.signal.aborted?
        'TIMEOUT':'RESPONSE_REJECTED'));
      res.on('close',()=>{if(!res.complete)
        complete(controller.signal.aborted?'TIMEOUT':'RESPONSE_REJECTED');});
    });
    req.on('error',()=>complete(controller.signal.aborted?
      'TIMEOUT':'RESPONSE_REJECTED'));
    req.end(payload);
  });
}
function choreography(fault){
  if(fault==='premature-second-request')return [1];
  if(fault==='replayed-first-request')return [0,0];
  if(fault==='post-completion-replay')return [0,1,0];
  return [0,1];
}
async function exerciseLocalSession(fixtures,fault,deadlineMs){
  const server=http.createServer(),socketAcks=[];
  const count={received:0,accepted:0,denied:0,
    socketClosed:0,responseClosed:0,gatewaySessions:0};
  server.on('connection',socket=>{
    socketAcks.push(new Promise(resolve=>socket.once('close',()=>{
      count.socketClosed++;resolve();
    })));
  });
  let code='RESPONSE_REJECTED';
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',reject);resolve();
      });
    });
    const port=server.address().port;
    server.on('request',ownedServer(fixtures,fault,port,count));
    for(const step of choreography(fault)){
      const response=await makeClientRequest(
        port,step,fixtures[step],fault,deadlineMs);
      if(response.code){code=response.code;break;}
      const delivered={...fixtures[step],toolResult:response.toolResult};
      const session=runFictionalToySession(delivered,'SAFE_TASK');
      if(session.status!=='PASS'||session.exitCode!==0||
         session.methodCallsObserved!==3||session.toolResultsAccepted!==1||
         session.forbiddenRequestsObserved!==0||
         session.protectedFictionalFileEffectsCommitted!==0||
         session.protectedFictionalToolEffectsCommitted!==0){
        code='GATEWAY_REJECTED';break;
      }
      count.gatewaySessions++;
      code=null;
    }
  }catch{code='RESPONSE_REJECTED';}
  finally{
    if(server.listening){
      const stopped=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();
      await stopped;
    }
    if(socketAcks.length){
      let timer;
      const settled=await Promise.race([
        Promise.all(socketAcks).then(()=>true),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1000);})
      ]);
      clearTimeout(timer);
      if(!settled)code='SOCKET_UNCONFIRMED';
    }
  }
  if(count.socketClosed!==count.received||
     count.responseClosed!==count.accepted||
     count.received===0||count.received>3)code='SOCKET_UNCONFIRMED';

  return Object.freeze({code,counts:Object.freeze({...count})});
}
function codeFor(raw){
  if(raw.code===null)return 'M11_SEPARATE_SESSION_CORRELATION_PASS';
  if(raw.code==='SOCKET_UNCONFIRMED')return 'M11_SESSION_SOCKET_CLEANUP_UNCONFIRMED';
  if(raw.code==='TIMEOUT')return 'M11_SESSION_RESPONSE_TIMEOUT';
  if(raw.code==='REQUEST_DENIED'){
    if(raw.counts.received===1&&raw.counts.accepted===0)
      return 'M11_OUT_OF_ORDER_REQUEST_DENIED';
    if(raw.counts.received===2&&raw.counts.accepted===1)
      return 'M11_DUPLICATED_OR_UNAUTHORIZED_REQUEST_DENIED';
    if(raw.counts.received===3&&raw.counts.accepted===2)
      return 'M11_POST_COMPLETION_REPLAY_DENIED';
  }
  return 'M11_SESSION_RESPONSE_CORRELATION_REJECTED';
}
/**
 * Strict first-party end-to-end test: existing accepted M11 transport must
 * pass before any additional session listener is created.
 */
export async function runOwnedM11ReplayPair(first,second,settings={}){
  const {fault,deadlineMs}=checkOptions(settings);
  validateFixtureProposal(first);
  validateFixtureProposal(second);
  const previous=await runFirstPartyM11Bridge(first);
  const prerequisite=previous.status==='PASS'&&previous.exitCode===0&&
    previous.discoveryAccepted===true&&
    previous.onWireToolResultAccepted===true&&
    previous.toolSocketCleanupConfirmed===true&&
    previous.protectedFictionalEffectsCommitted===0&&
    previous.realExternalMcpContacted===false;
  const raw=prerequisite?
    await exerciseLocalSession([first,second],fault,deadlineMs):null;
  const c=raw?.counts??{
    received:0,accepted:0,denied:0,socketClosed:0,
    responseClosed:0,gatewaySessions:0
  };
  const pass=prerequisite&&raw.code===null&&
    c.received===2&&c.accepted===2&&c.denied===0&&
    c.socketClosed===2&&c.responseClosed===2&&c.gatewaySessions===2;
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:pass?'M11_SEPARATE_SESSION_CORRELATION_PASS':
      !prerequisite?'M11_PRIOR_OWNED_TRANSPORT_REJECTED':
      raw.code===null?'M11_SESSION_COUNTERS_MISMATCH':codeFor(raw),
    scope:SCOPE,
    evidenceKind:'FIRST_PARTY_LOOPBACK_HTTP_CORRELATION_AND_TOY_GATEWAY_ONLY',
    priorOwnedTransportAccepted:prerequisite,
    ownedLoopbackRequestsObserved:c.received,
    ownedLoopbackRequestsAccepted:c.accepted,
    ownedLoopbackRequestsDenied:c.denied,
    ownedLoopbackSocketsClosed:c.socketClosed,
    ownedLoopbackResponsesClosed:c.responseClosed,
    toyGatewaySessionsCompleted:c.gatewaySessions,
    boundOnWireSessionResults:c.gatewaySessions,
    protectedFictionalEffectsCommitted:0,
    realAgentBehaviorObserved:false,realFilesystemReadObserved:false,
    externalMcpContacted:false,injectedInstructionInterpreted:false,
    injectedInstructionExecuted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
// Literal first-party expectations, separately written from transport logic.
const CASES=Object.freeze([
  ['SAFE_TWO_SESSIONS','allowed','PASS',
    'M11_SEPARATE_SESSION_CORRELATION_PASS',2,2,0,2],
  ['REPLAYED_RESPONSE','replayed-response','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['SWAPPED_RESPONSE','swapped-response-data','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['WRONG_RESPONSE_ID','wrong-id','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['EXTRA_AUTHORITY','extra-authority','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['DUPLICATE_KEY','duplicate-json-key','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['INVALID_JSON','invalid-json','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['WRONG_CONTENT_TYPE','wrong-content-type','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['REDIRECT','redirect','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['OVERSIZED','oversized','FAIL',
    'M11_SESSION_RESPONSE_CORRELATION_REJECTED',2,2,0,1],
  ['STALLED_REPLY','hang','FAIL',
    'M11_SESSION_RESPONSE_TIMEOUT',2,2,0,1],
  ['REPLAYED_REQUEST','replayed-first-request','FAIL',
    'M11_DUPLICATED_OR_UNAUTHORIZED_REQUEST_DENIED',2,1,1,1],
  ['FORGED_REQUEST','forged-request-authority','FAIL',
    'M11_DUPLICATED_OR_UNAUTHORIZED_REQUEST_DENIED',2,1,1,1],
  ['UNAUTHORIZED_HEADER','unauthorized-header','FAIL',
    'M11_DUPLICATED_OR_UNAUTHORIZED_REQUEST_DENIED',2,1,1,1],
  ['OUT_OF_ORDER','premature-second-request','FAIL',
    'M11_OUT_OF_ORDER_REQUEST_DENIED',1,0,1,0],
  ['AFTER_FINISH','post-completion-replay','FAIL',
    'M11_POST_COMPLETION_REPLAY_DENIED',3,2,1,2]
]);
const unavailable=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M11_REPLAY_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,externalMcpContacted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
export async function runFixedM11ReplaySelftest(args=[]){
  if(!noArgs(args))return unavailable;
  try{
    // Paths are hardcoded inside the reviewed repo and constrained by
    // M8's bounded, symlink-resistant fictional fixture loader.
    const first=await loadValidatedFixtureProposalFile(
      fileURLToPath(FIRST));
    const second=await loadValidatedFixtureProposalFile(
      fileURLToPath(SECOND));
    const rows=[];
    for(const [id,fault,status,ruleCode,received,accepted,denied,sessions]
      of CASES){
      const result=await runOwnedM11ReplayPair(first,second,
        {fault,deadlineMs:fault==='hang'?350:3000});
      const matched=result.status===status&&result.ruleCode===ruleCode&&
        result.exitCode===(status==='PASS'?0:1)&&
        result.priorOwnedTransportAccepted===true&&
        result.ownedLoopbackRequestsObserved===received&&
        result.ownedLoopbackRequestsAccepted===accepted&&
        result.ownedLoopbackRequestsDenied===denied&&
        result.ownedLoopbackSocketsClosed===received&&
        result.ownedLoopbackResponsesClosed===accepted&&
        result.toyGatewaySessionsCompleted===sessions&&
        result.protectedFictionalEffectsCommitted===0&&
        result.externalMcpContacted===false&&
        result.realAgentBehaviorObserved===false&&
        result.injectedInstructionExecuted===false;
      rows.push(Object.freeze({control:id,expectedStatus:status,
        expectedRuleCode:ruleCode,matched}));
    }
    const matched=rows.filter(x=>x.matched).length;
    const pass=matched===CASES.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M11_FIXED_REPLAY_CONTROLS_MATCH':
        'M11_FIXED_REPLAY_CONTROLS_MISMATCH',scope:SCOPE,
      checked:CASES.length,matched,
      expectedNegativeCases:CASES.length-1,
      negativeCasesMatched:rows.slice(1).filter(x=>x.matched).length,
      cases:Object.freeze(rows),realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,externalMcpContacted:false,
      injectedInstructionInterpreted:false,injectedInstructionExecuted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return unavailable;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runFixedM11ReplaySelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
