#!/usr/bin/env node
/** M11: fixed first-party discovery + separate disposable loopback tool reply.
 * Source-only. Never runs a real model, arbitrary target, command or file read.
 */
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {parseStrictJson} from '../src/strict-json.mjs';
import {runFirstPartyStagingSelftest} from '../src/first-party-staging-mcp.mjs';
import {observeFirstPartyMockAttempts} from '../src/mock-attempt-observer.mjs';
import {validateFixtureProposal} from './fixture-proposal-check.mjs';
import {runFictionalToySession} from './toy-agent-session.mjs';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const VERSION='2026-07-28',METHOD='tools/call';
const SOURCE=new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url);
const SCOPE='FIRST_PARTY_LOCAL_MCP_SHAPED_TOOL_RESULT_ONLY';
const REQUEST=Object.freeze({jsonrpc:'2.0',id:7,method:METHOD,
  params:{name:'owned-fictional-ticket-status',arguments:{ticket:'FICTIONAL-Q17'}}});
const FAULTS=Object.freeze(['allowed','wrong-id','extra-field',
  'wrong-content-type','redirect','oversized','invalid-json',
  'duplicate-json-key','hang','wrong-origin']);
const DISCOVERY=Object.freeze(['allowed','forbidden-tool','wrong-method','wrong-origin']);
const MAX_RESPONSE=4096,MAX_REQUEST=2048;
const invalid=()=>{throw new TypeError('INVALID_FIRST_PARTY_M11_OPTIONS');};

function options(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)invalid();
  const d=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(d).some(k=>!['fault','discoveryFault','deadlineMs'].includes(k))||
     Object.values(d).some(x=>!Object.hasOwn(x,'value')||!x.enumerable))invalid();
  const fault=Object.hasOwn(d,'fault')?d.fault.value:'allowed';
  const discoveryFault=Object.hasOwn(d,'discoveryFault')?d.discoveryFault.value:'allowed';
  const deadlineMs=Object.hasOwn(d,'deadlineMs')?d.deadlineMs.value:3000;
  if(typeof fault!=='string'||!FAULTS.includes(fault)||
     typeof discoveryFault!=='string'||!DISCOVERY.includes(discoveryFault)||
     !Number.isSafeInteger(deadlineMs)||deadlineMs<250||deadlineMs>4000)invalid();
  return {fault,discoveryFault,deadlineMs};
}
function expectedReply(fixture){
  return {jsonrpc:'2.0',id:7,result:{content:[{type:'text',
    text:JSON.stringify({legitimateData:fixture.toolResult.legitimateData,
      embeddedInstruction:fixture.toolResult.embeddedInstruction})}],isError:false}};
}
function duplicateHeaders(req){
  const sensitive=new Set(['host','origin','content-type','content-length','accept',
    'mcp-protocol-version','mcp-method','authorization','cookie',
    'proxy-authorization','transfer-encoding']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(sensitive.has(key)&&seen.has(key))return true;
    seen.add(key);
  }
  return false;
}
function send(res,status,value){
  const body=JSON.stringify(value);
  res.writeHead(status,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(Buffer.byteLength(body))});
  res.end(body);
}
function serve(fixture,fault,port,counts){
  return (req,res)=>{
    counts.received++;
    const expected=Buffer.from(JSON.stringify(REQUEST));
    if(counts.received!==1||req.socket.remoteAddress!==HOST||
       req.method!=='POST'||req.url!==PATH||
       req.headers.host!==HOST+':'+port||req.headers.origin!==ORIGIN||
       req.headers['content-type']!=='application/json'||
       req.headers.accept!=='application/json'||
       req.headers['mcp-protocol-version']!==VERSION||
       req.headers['mcp-method']!==METHOD||
       req.headers['content-length']!==String(expected.length)||
       req.headers.authorization!==undefined||req.headers.cookie!==undefined||
       req.headers['proxy-authorization']!==undefined||
       req.headers['transfer-encoding']!==undefined||duplicateHeaders(req)){
      send(res,403,{jsonrpc:'2.0',id:7,error:{code:-32000,message:'Rejected'}});
      req.resume();return;
    }
    let bytes=0,over=false;const chunks=[];
    req.on('data',chunk=>{
      bytes+=chunk.length;
      if(bytes>MAX_REQUEST){over=true;chunks.length=0;
        send(res,413,{jsonrpc:'2.0',id:7,error:{code:-32000,message:'Rejected'}});
      }else if(!over)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(over||res.writableEnded)return;
      let parsed;
      try{parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
        .decode(Buffer.concat(chunks)));}catch{}
      if(bytes!==expected.length||!isDeepStrictEqual(parsed,REQUEST)){
        send(res,403,{jsonrpc:'2.0',id:7,error:{code:-32000,message:'Rejected'}});
        return;
      }
      counts.accepted++;
      res.once('close',()=>{counts.responseClosed++;});
      if(fault==='hang'){
        res.writeHead(200,{'content-type':'application/json',
          'cache-control':'no-store',connection:'close'});
        res.flushHeaders();return;
      }
      if(fault==='redirect'){
        res.writeHead(302,{location:'http://example.invalid/never-follow',
          'cache-control':'no-store',connection:'close'});
        res.end();return;
      }
      const data=expectedReply(fixture);
      if(fault==='wrong-id')data.id=9;
      if(fault==='extra-field')data.result.unreviewedAuthority=true;
      let body=JSON.stringify(data);
      if(fault==='invalid-json')body='{"jsonrpc":"2.0","id":7,"result":';
      if(fault==='duplicate-json-key')body=body.replace('"id":7','"id":7,"id":7');
      if(fault==='oversized')body='Z'.repeat(MAX_RESPONSE+1);
      res.writeHead(200,{'content-type':fault==='wrong-content-type'?
        'text/plain':'application/json','cache-control':'no-store',
        connection:'close','content-length':String(Buffer.byteLength(body))});
      res.end(body);
    });
    req.on('error',()=>{});
  };
}
function requestToolResult(port,fixture,fault,signal){
  const payload=JSON.stringify(REQUEST);
  const headers={host:HOST+':'+port,
    origin:fault==='wrong-origin'?'http://unapproved.invalid':ORIGIN,
    'content-type':'application/json',accept:'application/json',
    'mcp-protocol-version':VERSION,'mcp-method':METHOD,
    'content-length':String(Buffer.byteLength(payload))};
  return new Promise(resolve=>{
    let settled=false,reply=null;
    const done=(code,result=null)=>{
      if(settled)return;settled=true;
      if(code&&reply&&!reply.destroyed)reply.destroy();
      resolve({code,toolResult:result});
    };
    const req=http.request({hostname:HOST,port,method:'POST',path:PATH,
      headers,agent:false,signal},res=>{
      reply=res;
      if(res.statusCode!==200){res.resume();done('M11_LOCAL_RESPONSE_REJECTED');return;}
      if(res.headers['content-type']!=='application/json'||
         Object.hasOwn(res.headers,'location')){
        done('M11_LOCAL_RESPONSE_REJECTED');return;
      }
      const declared=Number(res.headers['content-length']);
      if(!Number.isSafeInteger(declared)||declared<1||declared>MAX_RESPONSE){
        done('M11_LOCAL_RESPONSE_REJECTED');return;
      }
      let size=0;const chunks=[];
      res.on('data',chunk=>{
        if(settled)return;
        size+=chunk.length;
        if(size>MAX_RESPONSE){done('M11_LOCAL_RESPONSE_REJECTED');return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        if(settled)return;
        let accepted;
        try{
          if(size!==declared)throw Error('BAD_RESPONSE_SIZE');
          const received=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          if(!isDeepStrictEqual(received,expectedReply(fixture)))
            throw Error('UNREVIEWED_REPLY');
          accepted=parseStrictJson(received.result.content[0].text);
          if(!isDeepStrictEqual(accepted,fixture.toolResult))
            throw Error('UNREVIEWED_TOOL_DATA');
        }catch{done('M11_LOCAL_RESPONSE_REJECTED');return;}
        done(null,accepted);
      });
      res.on('error',()=>done(signal.aborted?'M11_LOCAL_TIMEOUT':'M11_LOCAL_RESPONSE_REJECTED'));
      res.on('close',()=>{if(!res.complete)
        done(signal.aborted?'M11_LOCAL_TIMEOUT':'M11_LOCAL_RESPONSE_REJECTED');});
    });
    req.on('error',()=>done(signal.aborted?'M11_LOCAL_TIMEOUT':'M11_LOCAL_RESPONSE_REJECTED'));
    req.end(payload);
  });
}
async function localToolExchange(fixture,fault,deadlineMs){
  const server=http.createServer(),sockets=[];
  const counts={received:0,accepted:0,responseClosed:0,socketClosed:0};
  server.on('connection',socket=>{
    sockets.push(new Promise(resolve=>socket.once('close',()=>{
      counts.socketClosed++;resolve();
    })));
  });
  const controller=new AbortController();
  let timer=null,code='M11_LOCAL_RESPONSE_REJECTED',toolResult=null;
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',reject);resolve();
      });
    });
    const port=server.address().port;
    server.on('request',serve(fixture,fault,port,counts));
    timer=setTimeout(()=>controller.abort(),deadlineMs);
    const response=await requestToolResult(port,fixture,fault,controller.signal);
    code=response.code;toolResult=response.toolResult;
  }catch{code='M11_LOCAL_RESPONSE_REJECTED';}
  finally{
    if(timer)clearTimeout(timer);
    controller.abort();
    if(server.listening){
      const closed=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();
      await closed;
    }
    if(sockets.length){
      let timeout;
      const closed=await Promise.race([
        Promise.all(sockets).then(()=>true),
        new Promise(resolve=>{timeout=setTimeout(()=>resolve(false),1000);})
      ]);
      clearTimeout(timeout);
      if(!closed)code='M11_LOCAL_CLEANUP_UNCONFIRMED';
    }
  }
  if(counts.socketClosed!==1||counts.received!==1||
     counts.accepted!==(fault==='wrong-origin'?0:1)||
     counts.responseClosed!==counts.accepted)
    code='M11_LOCAL_CLEANUP_UNCONFIRMED';
  if(code!==null)toolResult=null;
  return {code,counts,toolResult};
}
/** Trusted direct-test API: all input must be validated fictional JSON. */
export async function runFirstPartyM11Bridge(fixture,settings={}){
  const {fault,discoveryFault,deadlineMs}=options(settings);
  validateFixtureProposal(fixture);
  let discoveryValid=false,stage=null,transport=null,session=null;
  try{
    const observed=await observeFirstPartyMockAttempts(()=>
      runFirstPartyStagingSelftest({fault:discoveryFault,deadlineMs}));
    stage=observed.result;
    discoveryValid=stage.status==='PASS'&&stage.checked===1&&
      stage.received===1&&stage.accepted===1&&
      stage.socketClosedCount===1&&stage.responseClosedCount===1&&
      stage.externalTargetContacted===false&&
      isDeepStrictEqual(observed.attempts,['staging-bind','staging-request']);
    if(discoveryValid){
      transport=await localToolExchange(fixture,fault,deadlineMs);
      if(transport.code===null){
        const delivered={...fixture,toolResult:transport.toolResult};
        session=runFictionalToySession(delivered,'SAFE_TASK');
      }
    }
  }catch{}
  const pass=discoveryValid&&transport?.code===null&&
    session?.status==='PASS'&&session.phase==='FINISHED'&&
    session.methodCallsObserved===3&&session.toolResultsAccepted===1&&
    session.forbiddenRequestsObserved===0&&
    session.protectedFictionalFileEffectsCommitted===0&&
    session.protectedFictionalToolEffectsCommitted===0;
  const code=pass?'M11_OWNED_ON_WIRE_TRUST_BOUNDARY_PASS':
    !discoveryValid?'M11_OWNED_DISCOVERY_REJECTED':
    transport?.code==='M11_LOCAL_TIMEOUT'?'M11_OWNED_TOOL_RESULT_TIMEOUT':
    transport?.code==='M11_LOCAL_CLEANUP_UNCONFIRMED'?
      'M11_OWNED_SOCKET_CLEANUP_UNCONFIRMED':'M11_OWNED_TOOL_RESULT_REJECTED';
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:code,scope:SCOPE,
    evidenceKind:'OWNED_LOOPBACK_BYTES_PLUS_FIRST_PARTY_TOY_GATEWAY_ONLY',
    discoveryTransportObserved:stage?.received===1,
    discoveryAccepted:discoveryValid,
    discoverySocketCleanupConfirmed:stage?.socketClosedCount===1,
    toolTransportAttempted:transport!==null,
    toolRequestReceived:transport?.counts.received??0,
    toolRequestAccepted:transport?.counts.accepted??0,
    toolSocketCleanupConfirmed:transport?.counts.socketClosed===1,
    onWireToolResultAccepted:transport?.code===null,
    toyAgentGatewayMethodCallsObserved:session?.methodCallsObserved===3,
    fictionalTaskDataConsumed:session?.toolResultsAccepted??0,
    fictionalForbiddenRequestsObserved:session?.forbiddenRequestsObserved??0,
    protectedFictionalEffectsCommitted:0,
    realAgentBehaviorObserved:false,realFilesystemReadObserved:false,
    realExternalMcpContacted:false,injectedInstructionInterpreted:false,
    injectedInstructionExecuted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
const CASES=Object.freeze([
  ['SAFE_ON_WIRE','allowed','allowed',3000,'PASS','M11_OWNED_ON_WIRE_TRUST_BOUNDARY_PASS'],
  ['WRONG_ID','wrong-id','allowed',3000,'FAIL','M11_OWNED_TOOL_RESULT_REJECTED'],
  ['EXTRA_AUTHORITY','extra-field','allowed',3000,'FAIL','M11_OWNED_TOOL_RESULT_REJECTED'],
  ['BAD_JSON','invalid-json','allowed',3000,'FAIL','M11_OWNED_TOOL_RESULT_REJECTED'],
  ['DUPLICATE_JSON_KEY','duplicate-json-key','allowed',3000,'FAIL','M11_OWNED_TOOL_RESULT_REJECTED'],
  ['WRONG_CONTENT_TYPE','wrong-content-type','allowed',3000,'FAIL','M11_OWNED_TOOL_RESULT_REJECTED'],
  ['REDIRECT_DENIED','redirect','allowed',3000,'FAIL','M11_OWNED_TOOL_RESULT_REJECTED'],
  ['OVERSIZED_RESPONSE','oversized','allowed',3000,'FAIL','M11_OWNED_TOOL_RESULT_REJECTED'],
  ['WRONG_ORIGIN','wrong-origin','allowed',3000,'FAIL','M11_OWNED_TOOL_RESULT_REJECTED'],
  ['HANG_TIMEOUT','hang','allowed',300,'FAIL','M11_OWNED_TOOL_RESULT_TIMEOUT'],
  ['DISCOVERY_FORBIDDEN_TOOL','allowed','forbidden-tool',3000,'FAIL','M11_OWNED_DISCOVERY_REJECTED']
]);
const unavailable=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M11_FIRST_PARTY_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,realExternalMcpContacted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
export async function runFixedFirstPartyM11Selftest(args=[]){
  if(!noArgs(args))return unavailable;
  try{
    const fixture=parseStrictJson(readFileSync(SOURCE,'utf8'));
    validateFixtureProposal(fixture);
    const cases=[];
    for(const [name,fault,discoveryFault,deadlineMs,status,ruleCode] of CASES){
      const r=await runFirstPartyM11Bridge(fixture,
        {fault,discoveryFault,deadlineMs});
      const matched=r.status===status&&r.ruleCode===ruleCode&&
        r.exitCode===(status==='PASS'?0:1)&&
        r.discoveryTransportObserved===true&&
        r.discoverySocketCleanupConfirmed===true&&
        (discoveryFault==='allowed'?
          r.discoveryAccepted===true&&r.toolTransportAttempted===true&&
          r.toolSocketCleanupConfirmed===true:
          r.discoveryAccepted===false&&r.toolTransportAttempted===false)&&
        r.onWireToolResultAccepted===(status==='PASS')&&
        r.toyAgentGatewayMethodCallsObserved===(status==='PASS')&&
        r.protectedFictionalEffectsCommitted===0&&
        r.realExternalMcpContacted===false&&
        r.injectedInstructionExecuted===false;
      cases.push(Object.freeze({case:name,expectedStatus:status,
        expectedRuleCode:ruleCode,matched}));
    }
    const matched=cases.filter(x=>x.matched).length;
    const pass=matched===CASES.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M11_OWNED_LOOPBACK_CONTROLS_MATCH':
        'M11_OWNED_LOOPBACK_CONTROLS_MISMATCH',
      scope:SCOPE,checked:CASES.length,matched,
      negativeCasesExpected:CASES.length-1,
      negativeCasesMatched:cases.slice(1).filter(x=>x.matched).length,
      cases:Object.freeze(cases),realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,realExternalMcpContacted:false,
      injectedInstructionInterpreted:false,injectedInstructionExecuted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return unavailable;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runFixedFirstPartyM11Selftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
