#!/usr/bin/env node
/**
 * M11-M: two *fictional* owners on a first-party ephemeral IPv4 loopback.
 * Ephemeral source-owned capabilities are NOT real credentials or proof of
 * real authentication. No model, customer MCP, external network or shell.
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
const SCOPE='FIRST_PARTY_FICTIONAL_CONCURRENT_OWNER_ISOLATION_ONLY';
const OWNERS=Object.freeze(['FICTIONAL-OWNER-A','FICTIONAL-OWNER-B']);
const SESSIONS=Object.freeze(['FICTIONAL-OWNER-SESSION-A','FICTIONAL-OWNER-SESSION-B']);
const IDS=Object.freeze([81,82]);
const FIRST=new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url);
const SECOND=new URL('../.github/fixture-proposals/ticket-status-prerequisite-file-read.json',import.meta.url);
const MAX_REQUEST=2048,MAX_RESPONSE=4096;
const FAULTS=Object.freeze([
  'ordered','reverse',
  'wrong-capability','missing-capability','wrong-owner-request',
  'reused-request-id','extra-request-approval','forged-authorization-header',
  'cross-owner-response','swapped-result-content','missing-owner-response',
  'extra-authority-response','duplicate-json-key','redirect',
  'wrong-content-type','oversized','hang'
]);
const bad=()=>{throw new TypeError('INVALID_M11_FICTIONAL_OWNER_OPTIONS');};

function options(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.getPrototypeOf(value)!==Object.prototype)bad();
  const d=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(d).some(k=>!['fault','deadlineMs'].includes(k))||
    Object.values(d).some(x=>!x.enumerable||!Object.hasOwn(x,'value')))bad();
  const fault=Object.hasOwn(d,'fault')?d.fault.value:'ordered';
  const deadlineMs=Object.hasOwn(d,'deadlineMs')?d.deadlineMs.value:3000;
  if(typeof fault!=='string'||!FAULTS.includes(fault)||
    !Number.isSafeInteger(deadlineMs)||deadlineMs<250||deadlineMs>4000)bad();
  return {fault,deadlineMs};
}
function expectedRequest(i){
  return {jsonrpc:'2.0',id:IDS[i],method:METHOD,
    params:{name:'owned-fictional-owner-status',
      arguments:{owner:OWNERS[i],session:SESSIONS[i]}}};
}
function expectedReply(i,fixture){
  return {jsonrpc:'2.0',id:IDS[i],result:{
    owner:OWNERS[i],content:[{type:'text',
      text:JSON.stringify({session:SESSIONS[i],
        legitimateData:fixture.toolResult.legitimateData,
        embeddedInstruction:fixture.toolResult.embeddedInstruction})}],
    isError:false
  }};
}
function duplicateRelevant(req){
  const allowed=new Set(['host','origin','content-type','content-length',
    'accept','mcp-method','mcp-protocol-version','x-fixture-owner',
    'authorization','cookie','proxy-authorization','transfer-encoding']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(allowed.has(key)&&seen.has(key))return true;
    seen.add(key);
  }
  return false;
}
function deny(res){
  const text='{"jsonrpc":"2.0","id":0,"error":{"code":-32000,"message":"Denied"}}';
  res.writeHead(403,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(Buffer.byteLength(text))});
  res.end(text);
}
function ownedListener(fixtures,capabilities,fault,port,witness){
  const waiting=new Map();
  let dispatched=false;
  function reply(i){
    const res=waiting.get(i);
    if(!res||res.writableEnded)return;
    witness.sent.push(IDS[i]);
    if(i===1&&fault==='hang'){
      // Syntactically valid length, intentionally incomplete body.
      res.writeHead(200,{'content-type':'application/json',
        'cache-control':'no-store',connection:'close','content-length':'1024'});
      res.flushHeaders();return;
    }
    if(i===1&&fault==='redirect'){
      res.writeHead(302,{location:'http://example.invalid/not-followed',
        'cache-control':'no-store',connection:'close'});
      res.end();return;
    }
    let message=expectedReply(i,fixtures[i]);
    if(i===1&&fault==='cross-owner-response')
      message=expectedReply(0,fixtures[0]);
    if(i===1&&fault==='swapped-result-content'){
      message=expectedReply(i,fixtures[i]);
      message.result.content[0].text=
        expectedReply(0,fixtures[0]).result.content[0].text;
    }
    if(i===1&&fault==='missing-owner-response')
      delete message.result.owner;
    if(i===1&&fault==='extra-authority-response')
      message.result.ownerApproved=true;
    let text=JSON.stringify(message);
    if(i===1&&fault==='duplicate-json-key')
      text=text.replace('"id":82','"id":82,"id":82');
    if(i===1&&fault==='oversized')text='X'.repeat(MAX_RESPONSE+1);
    res.writeHead(200,{
      'content-type':i===1&&fault==='wrong-content-type'?
        'text/plain':'application/json',
      'cache-control':'no-store',connection:'close',
      'content-length':String(Buffer.byteLength(text))
    });
    res.end(text);
  }
  function flush(){
    if(dispatched||witness.received!==2)return;
    dispatched=true;
    for(const i of fault==='reverse'?[1,0]:[0,1])reply(i);
  }
  return (req,res)=>{
    witness.received++;
    res.once('close',()=>{witness.responsesClosed++;});
    let size=0,tooLarge=false;const parts=[];
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>MAX_REQUEST){
        tooLarge=true;parts.length=0;req.destroy();
      }else if(!tooLarge)parts.push(chunk);
    });
    req.on('end',()=>{
      if(tooLarge||res.writableEnded)return;
      let data=null;
      try{
        data=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(parts)));
      }catch{}
      const index=IDS.indexOf(data?.id);
      const expected=index<0?null:expectedRequest(index);
      const trusted=index>=0&&
        req.socket.remoteAddress===HOST&&
        req.method==='POST'&&req.url===PATH&&
        req.headers.host===HOST+':'+port&&
        req.headers.origin===ORIGIN&&
        req.headers['content-type']==='application/json'&&
        req.headers.accept==='application/json'&&
        req.headers['mcp-method']===METHOD&&
        req.headers['mcp-protocol-version']===VERSION&&
        req.headers['x-fixture-owner']===capabilities[index]&&
        req.headers.authorization===undefined&&
        req.headers.cookie===undefined&&
        req.headers['proxy-authorization']===undefined&&
        req.headers['transfer-encoding']===undefined&&
        req.headers['content-length']===
          String(Buffer.byteLength(JSON.stringify(expected)))&&
        !duplicateRelevant(req);
      const valid=witness.received<=2&&trusted&&
        size<=MAX_REQUEST&&
        size===Buffer.byteLength(JSON.stringify(expected))&&
        !waiting.has(index)&&isDeepStrictEqual(data,expected);
      if(!valid){
        witness.denied++;
        deny(res);
      }else{
        witness.accepted++;
        waiting.set(index,res);
        witness.maxPending=Math.max(witness.maxPending,waiting.size);
      }
      flush();
    });
    req.on('error',()=>{});
  };
}
function ownedClient(port,i,fixture,capabilities,fault,deadlineMs){
  let request=expectedRequest(i);
  if(i===1&&fault==='wrong-owner-request'){
    request={...request,params:{...request.params,
      arguments:{owner:OWNERS[0],session:SESSIONS[1]}}};
  }
  if(i===1&&fault==='reused-request-id')
    request={...request,id:IDS[0]};
  if(i===1&&fault==='extra-request-approval')
    request={...request,params:{...request.params,ownerApproved:true}};
  const payload=JSON.stringify(request);
  const headers={host:HOST+':'+port,origin:ORIGIN,
    'content-type':'application/json',accept:'application/json',
    'mcp-method':METHOD,'mcp-protocol-version':VERSION,
    'x-fixture-owner':i===1&&fault==='wrong-capability'?
      capabilities[0]:capabilities[i],
    'content-length':String(Buffer.byteLength(payload))
  };
  if(i===1&&fault==='missing-capability')
    delete headers['x-fixture-owner'];
  if(i===1&&fault==='forged-authorization-header')
    headers.authorization='Bearer fictional-not-real';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),deadlineMs);
  return new Promise(resolve=>{
    let completed=false,active=null;
    const finish=(code,toolResult=null)=>{
      if(completed)return;
      completed=true;clearTimeout(timer);
      if(code&&active&&!active.destroyed)active.destroy();
      resolve({code,toolResult});
    };
    const req=http.request({hostname:HOST,port,method:'POST',
      path:PATH,headers,agent:false,signal:controller.signal},res=>{
      active=res;
      if(res.statusCode===403){
        res.resume();finish('REQUEST_DENIED');return;
      }
      if(res.statusCode!==200||
        res.headers['content-type']!=='application/json'||
        Object.hasOwn(res.headers,'location')){
        res.resume();finish('RESPONSE_REJECTED');return;
      }
      const length=Number(res.headers['content-length']);
      if(!Number.isSafeInteger(length)||length<1||length>MAX_RESPONSE){
        finish('RESPONSE_REJECTED');return;
      }
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{
        if(completed)return;
        bytes+=chunk.length;
        if(bytes>MAX_RESPONSE){finish('RESPONSE_REJECTED');return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        if(completed)return;
        try{
          if(bytes!==length)throw Error('INVALID_LENGTH');
          const actual=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          if(!isDeepStrictEqual(actual,expectedReply(i,fixture)))
            throw Error('WRONG_OWNER_RESPONSE');
          const data=parseStrictJson(actual.result.content[0].text);
          if(!isDeepStrictEqual(data,{session:SESSIONS[i],
            legitimateData:fixture.toolResult.legitimateData,
            embeddedInstruction:fixture.toolResult.embeddedInstruction}))
            throw Error('WRONG_OWNER_DATA');
          finish(null,{legitimateData:data.legitimateData,
            embeddedInstruction:data.embeddedInstruction});
        }catch{finish('RESPONSE_REJECTED');}
      });
      res.on('error',()=>finish(controller.signal.aborted?
        'TIMEOUT':'RESPONSE_REJECTED'));
      res.on('close',()=>{if(!res.complete)finish(controller.signal.aborted?
        'TIMEOUT':'RESPONSE_REJECTED');});
    });
    req.on('error',()=>finish(controller.signal.aborted?
      'TIMEOUT':'RESPONSE_REJECTED'));
    req.end(payload);
  });
}
async function runLocal(fixtures,fault,deadlineMs){
  const server=http.createServer(),socketCloses=[];
  const witness={received:0,accepted:0,denied:0,
    responsesClosed:0,socketsClosed:0,maxPending:0,sent:[]};
  server.on('connection',socket=>{
    socketCloses.push(new Promise(resolve=>socket.once('close',()=>{
      witness.socketsClosed++;resolve();
    })));
  });
  let replies=null,code='RESPONSE_REJECTED';
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',reject);resolve();
      });
    });
    const capabilities=[randomBytes(16).toString('hex'),
      randomBytes(16).toString('hex')];
    const port=server.address().port;
    server.on('request',ownedListener(fixtures,capabilities,fault,port,witness));
    // Neither caller awaits the other: both sockets are active concurrently.
    replies=await Promise.all(fixtures.map((fixture,i)=>
      ownedClient(port,i,fixture,capabilities,fault,deadlineMs)));
    code=replies.every(x=>x.code===null)?null:
      replies.some(x=>x.code==='TIMEOUT')?'TIMEOUT':
      replies.some(x=>x.code==='REQUEST_DENIED')?'REQUEST_DENIED':
      'RESPONSE_REJECTED';
  }catch{code='RESPONSE_REJECTED';}
  finally{
    if(server.listening){
      const closed=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();
      await closed;
    }
    if(socketCloses.length){
      let timer;
      const all=await Promise.race([
        Promise.all(socketCloses).then(()=>true),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1000);})
      ]);
      clearTimeout(timer);
      if(!all)code='SOCKET_CLEANUP_UNCONFIRMED';
    }
  }
  if(witness.received!==2||witness.socketsClosed!==2||
    witness.responsesClosed!==2)code='SOCKET_CLEANUP_UNCONFIRMED';
  return {replies,code,witness};
}
/** First-party API; only source-reviewed fictional inputs and fixed faults. */
export async function runOwnedM11OwnerIsolation(first,second,settings={}){
  const {fault,deadlineMs}=options(settings);
  validateFixtureProposal(first);
  validateFixtureProposal(second);
  const local=await runLocal([first,second],fault,deadlineMs);
  let completed=0;
  for(let i=0;i<2;i++){
    const result=local.replies?.[i];
    if(result?.code!==null||!result?.toolResult)continue;
    const fixture=i===0?first:second;
    const m=runFictionalToySession({...fixture,
      toolResult:result.toolResult},'SAFE_TASK');
    if(m.status==='PASS'&&m.toolResultsAccepted===1&&
      m.methodCallsObserved===3&&m.forbiddenRequestsObserved===0&&
      m.protectedFictionalFileEffectsCommitted===0&&
      m.protectedFictionalToolEffectsCommitted===0)completed++;
  }
  const w=local.witness;
  const pass=local.code===null&&completed===2&&w.received===2&&
    w.accepted===2&&w.denied===0&&w.maxPending===2&&
    w.responsesClosed===2&&w.socketsClosed===2;
  const rule=pass?'M11_FICTIONAL_OWNER_RESULTS_ISOLATED':
    local.code==='SOCKET_CLEANUP_UNCONFIRMED'?
      'M11_FICTIONAL_OWNER_SOCKET_CLEANUP_UNCONFIRMED':
    local.code==='TIMEOUT'?'M11_FICTIONAL_OWNER_RESPONSE_TIMEOUT':
    local.code==='REQUEST_DENIED'?'M11_FICTIONAL_OWNER_REQUEST_DENIED':
    'M11_FICTIONAL_OWNER_RESPONSE_REJECTED';
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:rule,scope:SCOPE,
    evidenceKind:'FIRST_PARTY_OWNED_LOOPBACK_CAPABILITY_AND_TOY_ONLY',
    requestsObserved:w.received,requestsAccepted:w.accepted,
    requestsDenied:w.denied,overlappingRequestsObserved:w.maxPending===2,
    responsesClosed:w.responsesClosed,socketsClosed:w.socketsClosed,
    responseIssuance:w.sent.length===2?
      w.sent[0]===81&&w.sent[1]===82?'A_THEN_B':
      w.sent[0]===82&&w.sent[1]===81?'B_THEN_A':'OTHER':'INCOMPLETE',
    toyGatewaySessionsCompleted:completed,
    protectedFictionalEffectsCommitted:0,
    realAgentBehaviorObserved:false,realFilesystemReadObserved:false,
    externalMcpContacted:false,injectedInstructionInterpreted:false,
    injectedInstructionExecuted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
const CONTROLS=Object.freeze([
  ['ORDERED','ordered','PASS','M11_FICTIONAL_OWNER_RESULTS_ISOLATED',2,0,2,'A_THEN_B'],
  ['REVERSED','reverse','PASS','M11_FICTIONAL_OWNER_RESULTS_ISOLATED',2,0,2,'B_THEN_A'],
  ['WRONG_CAPABILITY','wrong-capability','FAIL','M11_FICTIONAL_OWNER_REQUEST_DENIED',1,1,1,'INCOMPLETE'],
  ['MISSING_CAPABILITY','missing-capability','FAIL','M11_FICTIONAL_OWNER_REQUEST_DENIED',1,1,1,'INCOMPLETE'],
  ['WRONG_OWNER_REQUEST','wrong-owner-request','FAIL','M11_FICTIONAL_OWNER_REQUEST_DENIED',1,1,1,'INCOMPLETE'],
  ['REUSED_REQUEST_ID','reused-request-id','FAIL','M11_FICTIONAL_OWNER_REQUEST_DENIED',1,1,1,'INCOMPLETE'],
  ['EXTRA_REQUEST_APPROVAL','extra-request-approval','FAIL','M11_FICTIONAL_OWNER_REQUEST_DENIED',1,1,1,'INCOMPLETE'],
  ['FORGED_AUTH_HEADER','forged-authorization-header','FAIL','M11_FICTIONAL_OWNER_REQUEST_DENIED',1,1,1,'INCOMPLETE'],
  ['CROSS_OWNER_REPLY','cross-owner-response','FAIL','M11_FICTIONAL_OWNER_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['SWAPPED_CONTENT','swapped-result-content','FAIL','M11_FICTIONAL_OWNER_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['MISSING_REPLY_OWNER','missing-owner-response','FAIL','M11_FICTIONAL_OWNER_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['FORGED_REPLY_APPROVAL','extra-authority-response','FAIL','M11_FICTIONAL_OWNER_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['DUPLICATE_JSON_KEY','duplicate-json-key','FAIL','M11_FICTIONAL_OWNER_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['REDIRECT','redirect','FAIL','M11_FICTIONAL_OWNER_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['WRONG_CONTENT_TYPE','wrong-content-type','FAIL','M11_FICTIONAL_OWNER_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['OVERSIZED','oversized','FAIL','M11_FICTIONAL_OWNER_RESPONSE_REJECTED',2,0,1,'A_THEN_B'],
  ['HANG','hang','FAIL','M11_FICTIONAL_OWNER_RESPONSE_TIMEOUT',2,0,1,'A_THEN_B']
]);
const UNAVAILABLE=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M11_FICTIONAL_OWNER_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,externalMcpContacted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
    args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
export async function runFixedM11OwnerSelftest(args=[]){
  if(!noArgs(args))return UNAVAILABLE;
  try{
    const first=await loadValidatedFixtureProposalFile(fileURLToPath(FIRST));
    const second=await loadValidatedFixtureProposalFile(fileURLToPath(SECOND));
    const rows=[];
    for(const [name,fault,status,rule,accepted,denied,completed,order] of CONTROLS){
      const r=await runOwnedM11OwnerIsolation(first,second,
        {fault,deadlineMs:fault==='hang'?350:3000});
      const matched=r.status===status&&r.ruleCode===rule&&
        r.exitCode===(status==='PASS'?0:1)&&
        r.requestsObserved===2&&r.requestsAccepted===accepted&&
        r.requestsDenied===denied&&r.responsesClosed===2&&
        r.socketsClosed===2&&
        r.overlappingRequestsObserved===(accepted===2)&&
        r.responseIssuance===order&&
        r.toyGatewaySessionsCompleted===completed&&
        r.protectedFictionalEffectsCommitted===0&&
        r.realAgentBehaviorObserved===false&&
        r.externalMcpContacted===false;
      rows.push(Object.freeze({control:name,expectedStatus:status,
        expectedRuleCode:rule,matched}));
    }
    const matched=rows.filter(x=>x.matched).length;
    const pass=matched===CONTROLS.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M11_FICTIONAL_OWNER_CONTROLS_MATCH':
        'M11_FICTIONAL_OWNER_CONTROLS_MISMATCH',
      scope:SCOPE,checked:CONTROLS.length,matched,
      expectedPositiveControls:2,expectedNegativeControls:15,
      negativeControlsMatched:rows.slice(2).filter(x=>x.matched).length,
      cases:Object.freeze(rows),realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,externalMcpContacted:false,
      injectedInstructionInterpreted:false,injectedInstructionExecuted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return UNAVAILABLE;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runFixedM11OwnerSelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
