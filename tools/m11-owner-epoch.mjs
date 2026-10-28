#!/usr/bin/env node
/**
 * M11-P/Q: fresh, run-local fictional capability epochs over owned loopback.
 * First-party source-only synthetic authorization, NOT real authentication,
 * an AI agent, external MCP target, OS sandbox or injection detector.
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
import {runFictionalToySession} from './toy-agent-session.mjs';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const METHOD='tools/call',VERSION='2026-07-28';
const SCOPE='FIRST_PARTY_RUN_LOCAL_FICTIONAL_OWNER_EPOCHS_ONLY';
const FIXTURES=Object.freeze([
  new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url),
  new URL('../.github/fixture-proposals/ticket-status-prerequisite-file-read.json',import.meta.url)
]);
const OWNERS=Object.freeze(['FICTIONAL-EPOCH-OWNER-A','FICTIONAL-EPOCH-OWNER-B']);
const EPOCHS=Object.freeze(['FICTIONAL-EPOCH-A','FICTIONAL-EPOCH-B']);
const IDS=Object.freeze([101,102]);
const MAX_REQUEST=2048,MAX_REPLY=4096;
const MODES=Object.freeze([
  'fresh','stale-capability','missing-capability','wrong-capability',
  'forged-authorization','wrong-owner-request','wrong-request-id',
  'extra-request-authority','post-completion-replay',
  'swapped-response','wrong-response-id','extra-response-authority',
  'malformed-response','duplicate-response-key','wrong-content-type',
  'redirect','oversized-response','hang'
]);
const invalid=()=>{throw new TypeError('INVALID_FICTIONAL_OWNER_EPOCH_OPTIONS');};
const REJECTION=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M11_OWNER_EPOCH_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,externalMcpContacted:false
});
function strictOptions(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)invalid();
  const d=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(d).some(k=>!['fault','deadlineMs'].includes(k))||
     Object.values(d).some(x=>!x.enumerable||!Object.hasOwn(x,'value')))invalid();
  const fault=Object.hasOwn(d,'fault')?d.fault.value:'fresh';
  const deadlineMs=Object.hasOwn(d,'deadlineMs')?d.deadlineMs.value:3000;
  if(typeof fault!=='string'||!MODES.includes(fault)||
     !Number.isSafeInteger(deadlineMs)||deadlineMs<250||deadlineMs>4000)invalid();
  return {fault,deadlineMs};
}
function requestFor(index){
  return {jsonrpc:'2.0',id:IDS[index],method:METHOD,
    params:{name:'owned-fictional-epoch-status',
      arguments:{owner:OWNERS[index],epoch:EPOCHS[index]}}};
}
function responseFor(index,fixture){
  return {jsonrpc:'2.0',id:IDS[index],result:{
    owner:OWNERS[index],
    content:[{type:'text',text:JSON.stringify({
      epoch:EPOCHS[index],
      legitimateData:fixture.toolResult.legitimateData,
      embeddedInstruction:fixture.toolResult.embeddedInstruction
    })}],isError:false
  }};
}
function hasDuplicateRelevantHeader(req){
  const protectedNames=new Set([
    'host','origin','content-type','content-length','accept',
    'mcp-method','mcp-protocol-version','x-fictional-epoch-capability',
    'authorization','cookie','proxy-authorization','transfer-encoding'
  ]);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const name=req.rawHeaders[i].toLowerCase();
    if(seen.has(name)&&protectedNames.has(name))return true;
    seen.add(name);
  }
  return false;
}
function rejectRequest(res){
  const body='{"jsonrpc":"2.0","id":0,"error":{"code":-32000,"message":"Denied"}}';
  res.writeHead(403,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(Buffer.byteLength(body))});
  res.end(body);
}
function ownedListener(index,fixture,capability,fault,port,witness){
  return (req,res)=>{
    witness.received++;
    res.once('close',()=>{witness.responseClosed++;});
    let bytes=0,over=false;const chunks=[];
    req.on('data',chunk=>{
      bytes+=chunk.length;
      if(bytes>MAX_REQUEST){
        over=true;chunks.length=0;
        req.destroy(); // Bounded first-party request; never run a payload.
      }else if(!over)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(over||res.writableEnded)return;
      let parsed=null;
      try{
        parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch{}
      const expected=requestFor(index);
      const requiredBytes=Buffer.byteLength(JSON.stringify(expected));
      const valid=witness.accepted===0&&
        req.socket.remoteAddress===HOST&&
        req.method==='POST'&&req.url===PATH&&
        req.headers.host===HOST+':'+port&&
        req.headers.origin===ORIGIN&&
        req.headers.accept==='application/json'&&
        req.headers['content-type']==='application/json'&&
        req.headers['mcp-method']===METHOD&&
        req.headers['mcp-protocol-version']===VERSION&&
        req.headers['x-fictional-epoch-capability']===capability&&
        req.headers.authorization===undefined&&
        req.headers.cookie===undefined&&
        req.headers['proxy-authorization']===undefined&&
        req.headers['transfer-encoding']===undefined&&
        req.headers['content-length']===String(requiredBytes)&&
        !hasDuplicateRelevantHeader(req)&&bytes===requiredBytes&&
        isDeepStrictEqual(parsed,expected);
      if(!valid){
        witness.denied++;
        rejectRequest(res);
        return;
      }
      witness.accepted++;
      if(index===1&&fault==='hang'){
        res.writeHead(200,{'content-type':'application/json',
          'cache-control':'no-store',connection:'close',
          'content-length':'1024'});
        res.flushHeaders();return;
      }
      if(index===1&&fault==='redirect'){
        res.writeHead(302,{'location':'http://example.invalid/not-followed',
          'cache-control':'no-store',connection:'close'});
        res.end();return;
      }
      let answer=responseFor(index,fixture);
      if(index===1&&fault==='swapped-response')
        answer=responseFor(0,fixture);
      if(index===1&&fault==='wrong-response-id')answer.id=101;
      if(index===1&&fault==='extra-response-authority')
        answer.result.ownerApproved=true;
      let body=JSON.stringify(answer);
      if(index===1&&fault==='malformed-response')
        body='{"jsonrpc":"2.0","id":102,"result":';
      if(index===1&&fault==='duplicate-response-key')
        body=body.replace('"id":102','"id":102,"id":102');
      if(index===1&&fault==='oversized-response')
        body='X'.repeat(MAX_REPLY+1);
      res.writeHead(200,{'content-type':
        index===1&&fault==='wrong-content-type'?
          'text/plain':'application/json',
        'cache-control':'no-store',connection:'close',
        'content-length':String(Buffer.byteLength(body))});
      res.end(body);
    });
    req.on('error',()=>{});
  };
}
function ownedClient(port,index,fixture,capability,fault,oldCapability,deadlineMs){
  let data=requestFor(index);
  if(index===1&&fault==='wrong-owner-request')
    data={...data,params:{...data.params,
      arguments:{...data.params.arguments,owner:OWNERS[0]}}};
  if(index===1&&fault==='wrong-request-id')
    data={...data,id:101};
  if(index===1&&fault==='extra-request-authority')
    data={...data,params:{...data.params,operatorApproved:true}};
  const body=JSON.stringify(data);
  const headers={
    host:HOST+':'+port,origin:ORIGIN,
    'content-type':'application/json',accept:'application/json',
    'mcp-method':METHOD,'mcp-protocol-version':VERSION,
    'content-length':String(Buffer.byteLength(body)),
    'x-fictional-epoch-capability':index===1&&fault==='stale-capability'?
      oldCapability:index===1&&fault==='wrong-capability'?
      'FICTIONAL-INVALID-CAPABILITY':capability
  };
  if(index===1&&fault==='missing-capability')
    delete headers['x-fictional-epoch-capability'];
  if(index===1&&fault==='forged-authorization')
    headers.authorization='Bearer fictional-untrusted-claim';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),deadlineMs);
  return new Promise(resolve=>{
    let done=false,response=null;
    const finish=(code,result=null)=>{
      if(done)return;
      done=true;clearTimeout(timer);
      if(code&&response&&!response.destroyed)response.destroy();
      resolve({code,result});
    };
    const req=http.request({hostname:HOST,port,method:'POST',path:PATH,
      headers,agent:false,signal:controller.signal},res=>{
      response=res;
      if(res.statusCode===403){
        res.resume();finish('REQUEST_DENIED');return;
      }
      if(res.statusCode!==200||
         res.headers['content-type']!=='application/json'||
         Object.hasOwn(res.headers,'location')){
        res.resume();finish('RESPONSE_REJECTED');return;
      }
      const length=Number(res.headers['content-length']);
      if(!Number.isSafeInteger(length)||length<1||length>MAX_REPLY){
        finish('RESPONSE_REJECTED');return;
      }
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{
        if(done)return;
        bytes+=chunk.length;
        if(bytes>MAX_REPLY){finish('RESPONSE_REJECTED');return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        if(done)return;
        try{
          if(bytes!==length)throw Error('BAD_REPLY_LENGTH');
          const actual=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          if(!isDeepStrictEqual(actual,responseFor(index,fixture)))
            throw Error('OWNER_EPOCH_RESPONSE_NOT_BOUND');
          const payload=parseStrictJson(actual.result.content[0].text);
          if(!isDeepStrictEqual(payload,{
            epoch:EPOCHS[index],
            legitimateData:fixture.toolResult.legitimateData,
            embeddedInstruction:fixture.toolResult.embeddedInstruction
          }))throw Error('OWNER_EPOCH_PAYLOAD_NOT_BOUND');
          finish(null,{legitimateData:payload.legitimateData,
            embeddedInstruction:payload.embeddedInstruction});
        }catch{finish('RESPONSE_REJECTED');}
      });
      res.on('error',()=>finish(controller.signal.aborted?
        'TIMEOUT':'RESPONSE_REJECTED'));
      res.on('close',()=>{if(!res.complete)finish(controller.signal.aborted?
        'TIMEOUT':'RESPONSE_REJECTED');});
    });
    req.on('error',()=>finish(controller.signal.aborted?
      'TIMEOUT':'RESPONSE_REJECTED'));
    req.end(body);
  });
}
async function oneOwnedEpoch(index,fixture,capability,fault,oldCapability,deadlineMs){
  const server=http.createServer(),sockets=[];
  const witness={received:0,accepted:0,denied:0,
    responseClosed:0,socketClosed:0};
  server.on('connection',socket=>{
    sockets.push(new Promise(resolve=>socket.once('close',()=>{
      witness.socketClosed++;resolve();
    })));
  });
  let code='RESPONSE_REJECTED',delivered=0;
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',reject);resolve();
      });
    });
    server.on('request',ownedListener(
      index,fixture,capability,fault,server.address().port,witness));
    const port=server.address().port;
    const result=await ownedClient(
      port,index,fixture,capability,fault,oldCapability,deadlineMs);
    code=result.code;
    if(code===null){
      const gateway=runFictionalToySession(
        {...fixture,toolResult:result.result},'SAFE_TASK');
      if(gateway.status!=='PASS'||gateway.methodCallsObserved!==3||
         gateway.toolResultsAccepted!==1||
         gateway.forbiddenRequestsObserved!==0||
         gateway.protectedFictionalFileEffectsCommitted!==0||
         gateway.protectedFictionalToolEffectsCommitted!==0)
        code='GATEWAY_REJECTED';
      else delivered++;
    }
    if(index===1&&fault==='post-completion-replay'&&code===null){
      // A repeated request on the *same* epoch after its first accepted
      // result must fail, even with the valid current fictional capability.
      const second=await ownedClient(
        port,index,fixture,capability,'fresh',oldCapability,deadlineMs);
      code=second.code==='REQUEST_DENIED'?
        'POST_COMPLETION_REPLAY_DENIED':'POST_COMPLETION_REPLAY_UNSAFE';
    }
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
      if(!all)code='CLEANUP_UNCONFIRMED';
    }
  }
  if(witness.received<1||witness.received>2||
     witness.socketClosed!==witness.received||
     witness.responseClosed!==witness.received)
    code='CLEANUP_UNCONFIRMED';
  return Object.freeze({code,delivered,
    witness:Object.freeze({...witness})});
}
/**
 * The first HTTP listener is torn down before the second is created.
 * Capabilities are generated per invocation, kept in closure-only locals,
 * never returned or printed, and never accepted across epochs.
 */
export async function runOwnedM11FreshEpochs(first,second,settings={}){
  const {fault,deadlineMs}=strictOptions(settings);
  validateFixtureProposal(first);
  validateFixtureProposal(second);
  const previous=randomBytes(24).toString('hex');
  let current=randomBytes(24).toString('hex');
  if(current===previous)current=randomBytes(24).toString('hex');
  if(current===previous)invalid(); // Fail closed even on impossible collision.
  const a=await oneOwnedEpoch(0,first,previous,'fresh',previous,deadlineMs);
  const aOK=a.code===null&&a.delivered===1&&
    a.witness.received===1&&a.witness.accepted===1&&
    a.witness.denied===0&&a.witness.socketClosed===1&&
    a.witness.responseClosed===1;
  const b=aOK?await oneOwnedEpoch(
    1,second,current,fault,previous,deadlineMs):null;
  const bw=b?.witness??{
    received:0,accepted:0,denied:0,responseClosed:0,socketClosed:0
  };
  const success=aOK&&b?.code===null&&b.delivered===1&&
    bw.received===1&&bw.accepted===1&&bw.denied===0&&
    bw.responseClosed===1&&bw.socketClosed===1;
  const rule=success?'M11_FRESH_FICTIONAL_OWNER_EPOCHS_ISOLATED':
    !aOK?'M11_FIRST_OWNER_EPOCH_UNAVAILABLE':
    b.code==='CLEANUP_UNCONFIRMED'?
      'M11_OWNER_EPOCH_CLEANUP_UNCONFIRMED':
    b.code==='TIMEOUT'?'M11_OWNER_EPOCH_RESPONSE_TIMEOUT':
    b.code==='POST_COMPLETION_REPLAY_DENIED'?
      'M11_POST_COMPLETION_EPOCH_REPLAY_DENIED':
    b.code==='REQUEST_DENIED'?
      'M11_STALE_OR_UNAUTHORIZED_EPOCH_REQUEST_DENIED':
      'M11_OWNER_EPOCH_RESPONSE_REJECTED';
  return Object.freeze({
    reportSchemaVersion:1,status:success?'PASS':'FAIL',exitCode:success?0:1,
    ruleCode:rule,scope:SCOPE,
    evidenceKind:'TWO_INDEPENDENT_OWNED_LOOPBACK_EPOCHS_AND_TOY_ONLY',
    firstEpochAccepted:aOK,
    firstEpochRequestsObserved:a.witness.received,
    firstEpochRequestsAccepted:a.witness.accepted,
    firstEpochSocketClosed:a.witness.socketClosed===1,
    secondEpochStarted:b!==null,
    secondEpochRequestsObserved:bw.received,
    secondEpochRequestsAccepted:bw.accepted,
    secondEpochRequestsDenied:bw.denied,
    secondEpochResponsesClosed:bw.responseClosed,
    secondEpochSocketsClosed:bw.socketClosed,
    toyGatewaySessionsCompleted:a.delivered+(b?.delivered??0),
    protectedFictionalEffectsCommitted:0,
    realAgentBehaviorObserved:false,realFilesystemReadObserved:false,
    externalMcpContacted:false,injectedInstructionInterpreted:false,
    injectedInstructionExecuted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
const CONTROLS=Object.freeze([
  ['FRESH','fresh','PASS','M11_FRESH_FICTIONAL_OWNER_EPOCHS_ISOLATED',1,0,2],
  ['STALE','stale-capability','FAIL','M11_STALE_OR_UNAUTHORIZED_EPOCH_REQUEST_DENIED',0,1,1],
  ['MISSING','missing-capability','FAIL','M11_STALE_OR_UNAUTHORIZED_EPOCH_REQUEST_DENIED',0,1,1],
  ['WRONG_CAPABILITY','wrong-capability','FAIL','M11_STALE_OR_UNAUTHORIZED_EPOCH_REQUEST_DENIED',0,1,1],
  ['FORGED_AUTHORIZATION','forged-authorization','FAIL','M11_STALE_OR_UNAUTHORIZED_EPOCH_REQUEST_DENIED',0,1,1],
  ['WRONG_OWNER','wrong-owner-request','FAIL','M11_STALE_OR_UNAUTHORIZED_EPOCH_REQUEST_DENIED',0,1,1],
  ['WRONG_REQUEST_ID','wrong-request-id','FAIL','M11_STALE_OR_UNAUTHORIZED_EPOCH_REQUEST_DENIED',0,1,1],
  ['EXTRA_REQUEST_AUTHORITY','extra-request-authority','FAIL','M11_STALE_OR_UNAUTHORIZED_EPOCH_REQUEST_DENIED',0,1,1],
  ['POST_COMPLETION_REPLAY','post-completion-replay','FAIL','M11_POST_COMPLETION_EPOCH_REPLAY_DENIED',1,1,2],
  ['SWAPPED_RESPONSE','swapped-response','FAIL','M11_OWNER_EPOCH_RESPONSE_REJECTED',1,0,1],
  ['WRONG_RESPONSE_ID','wrong-response-id','FAIL','M11_OWNER_EPOCH_RESPONSE_REJECTED',1,0,1],
  ['EXTRA_REPLY_AUTHORITY','extra-response-authority','FAIL','M11_OWNER_EPOCH_RESPONSE_REJECTED',1,0,1],
  ['MALFORMED_RESPONSE','malformed-response','FAIL','M11_OWNER_EPOCH_RESPONSE_REJECTED',1,0,1],
  ['DUPLICATE_RESPONSE_KEY','duplicate-response-key','FAIL','M11_OWNER_EPOCH_RESPONSE_REJECTED',1,0,1],
  ['WRONG_CONTENT_TYPE','wrong-content-type','FAIL','M11_OWNER_EPOCH_RESPONSE_REJECTED',1,0,1],
  ['REDIRECT','redirect','FAIL','M11_OWNER_EPOCH_RESPONSE_REJECTED',1,0,1],
  ['OVERSIZED_RESPONSE','oversized-response','FAIL','M11_OWNER_EPOCH_RESPONSE_REJECTED',1,0,1],
  ['HANG','hang','FAIL','M11_OWNER_EPOCH_RESPONSE_TIMEOUT',1,0,1]
]);
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
export async function runFixedM11EpochSelftest(args=[]){
  if(!noArgs(args))return REJECTION;
  try{
    const first=await loadValidatedFixtureProposalFile(fileURLToPath(FIXTURES[0]));
    const second=await loadValidatedFixtureProposalFile(fileURLToPath(FIXTURES[1]));
    const rows=[];
    for(const [name,fault,status,rule,accepted,denied,completed] of CONTROLS){
      const report=await runOwnedM11FreshEpochs(first,second,
        {fault,deadlineMs:fault==='hang'?350:3000});
      const expectedCalls=fault==='post-completion-replay'?2:1;
      const matched=report.status===status&&report.ruleCode===rule&&
        report.exitCode===(status==='PASS'?0:1)&&
        report.firstEpochAccepted===true&&
        report.firstEpochRequestsObserved===1&&
        report.firstEpochRequestsAccepted===1&&
        report.firstEpochSocketClosed===true&&
        report.secondEpochStarted===true&&
        report.secondEpochRequestsObserved===expectedCalls&&
        report.secondEpochRequestsAccepted===accepted&&
        report.secondEpochRequestsDenied===denied&&
        report.secondEpochResponsesClosed===expectedCalls&&
        report.secondEpochSocketsClosed===expectedCalls&&
        report.toyGatewaySessionsCompleted===completed&&
        report.protectedFictionalEffectsCommitted===0&&
        report.realAgentBehaviorObserved===false&&
        report.externalMcpContacted===false&&
        report.injectedInstructionExecuted===false;
      rows.push(Object.freeze({control:name,expectedStatus:status,
        expectedRuleCode:rule,matched}));
    }
    const matched=rows.filter(x=>x.matched).length;
    const pass=matched===CONTROLS.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M11_OWNED_EPOCH_CONTROLS_MATCH':
        'M11_OWNED_EPOCH_CONTROLS_MISMATCH',
      scope:SCOPE,checked:CONTROLS.length,matched,
      expectedPositiveControls:1,expectedNegativeControls:CONTROLS.length-1,
      negativeControlsMatched:rows.slice(1).filter(x=>x.matched).length,
      cases:Object.freeze(rows),realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,externalMcpContacted:false,
      injectedInstructionInterpreted:false,injectedInstructionExecuted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return REJECTION;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runFixedM11EpochSelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
