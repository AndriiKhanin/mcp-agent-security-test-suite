#!/usr/bin/env node
/**
 * M12-G: Strict, request-scoped modern MCP 2026-07-28 SSE source-only test.
 * One owned 127.0.0.1 POST response, never a real agent, MCP target,
 * arbitrary process, operating-system sandbox or security certification.
 */
import http from 'node:http';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {parseStrictJson} from '../src/strict-json.mjs';
import {
  loadValidatedFixtureProposalFile,validateFixtureProposal
} from './fixture-proposal-check.mjs';
import {runOwnedModernMcpSubset} from './m12-modern-http-smoke.mjs';
import {runFictionalToySession} from './toy-agent-session.mjs';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const VERSION='2026-07-28',METHOD='tools/call';
const TOOL='fictional_sse_ticket_status';
const PROGRESS='fictional-progress-77',MAX_REQUEST=4096,MAX_SSE=8192;
const MAX_BLOCKS=8,MAX_COMMENTS=4;
const SCOPE='SOURCE_OWNED_MODERN_REQUEST_SCOPED_SSE_ONLY';
const FILE=new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url);
const MODES=Object.freeze([
  'fragmented','crlf','comments','multiline',
  'final-first','duplicate-final','notification-after-final',
  'server-request','wrong-final-id','wrong-progress-token',
  'extra-result-authority','malformed-json','duplicate-json-key',
  'invalid-utf8','oversized','too-many-comments','wrong-event',
  'missing-final','truncated-frame','wrong-content-type',
  'redirect','hang','wrong-origin','wrong-method'
]);
const positives=new Set(['fragmented','crlf','comments','multiline']);
const invalid=()=>{throw new TypeError('INVALID_M12_SSE_SOURCE_OPTIONS');};

function options(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)invalid();
  const d=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(d).some(k=>!['fault','deadlineMs'].includes(k))||
     Object.values(d).some(x=>!x.enumerable||!Object.hasOwn(x,'value')))invalid();
  const fault=Object.hasOwn(d,'fault')?d.fault.value:'fragmented';
  const deadlineMs=Object.hasOwn(d,'deadlineMs')?d.deadlineMs.value:3000;
  if(typeof fault!=='string'||!MODES.includes(fault)||
     !Number.isSafeInteger(deadlineMs)||deadlineMs<250||
     deadlineMs>4000)invalid();
  return {fault,deadlineMs};
}
const REQUEST=Object.freeze({
  jsonrpc:'2.0',id:77,method:METHOD,
  params:{name:TOOL,arguments:{ticket:'FICTIONAL-Q17'},
    _meta:{
      'io.modelcontextprotocol/protocolVersion':VERSION,
      'io.modelcontextprotocol/clientInfo':{
        name:'owned-fictional-sse-client',version:'1'
      },
      'io.modelcontextprotocol/clientCapabilities':{},
      progressToken:PROGRESS
    }
  }
});
function progressReply(){
  return {jsonrpc:'2.0',method:'notifications/progress',
    params:{progressToken:PROGRESS,progress:1,total:2}};
}
function finalReply(fixture){
  return {jsonrpc:'2.0',id:77,result:{
    resultType:'complete',isError:false,
    content:[{type:'text',text:JSON.stringify(fixture.toolResult)}],
    _meta:{'io.modelcontextprotocol/serverInfo':{
      name:'owned-fictional-sse-server',version:'1'
    }}
  }};
}
function frame(json,event='message',ending='\n'){
  return 'event: '+event+ending+'data: '+json+ending+ending;
}
function makeStream(fixture,fault){
  const notification=progressReply(),final=finalReply(fixture);
  const ending=fault==='crlf'?'\r\n':'\n';
  let first=frame(JSON.stringify(notification),'message',ending);
  let last=frame(JSON.stringify(final),'message',ending);
  if(fault==='multiline'){
    const json=JSON.stringify(final).replace(',"id":77',',\n"id":77');
    last='event: message\ndata: '+json.replace('\n','\ndata: ')+'\n\n';
  }
  if(fault==='wrong-final-id'){
    const altered=finalReply(fixture);altered.id=78;
    last=frame(JSON.stringify(altered));
  }
  if(fault==='extra-result-authority'){
    const altered=finalReply(fixture);altered.result.approved=true;
    last=frame(JSON.stringify(altered));
  }
  if(fault==='wrong-progress-token'){
    notification.params.progressToken='unrelated-fictional-progress';
    first=frame(JSON.stringify(notification));
  }
  if(fault==='malformed-json')last=frame('{"jsonrpc":"2.0","id":77,"result":');
  if(fault==='duplicate-json-key'){
    const text=JSON.stringify(final).replace('"id":77','"id":77,"id":77');
    last=frame(text);
  }
  if(fault==='wrong-event')last=frame(JSON.stringify(final),'untrusted');
  if(fault==='truncated-frame')last=last.slice(0,-2);
  if(fault==='final-first')return Buffer.from(last+first);
  if(fault==='duplicate-final')return Buffer.from(first+last+last);
  if(fault==='notification-after-final')return Buffer.from(first+last+first);
  if(fault==='server-request'){
    const request={jsonrpc:'2.0',id:999,method:'sampling/createMessage',
      params:{messages:[]}};
    return Buffer.from(first+frame(JSON.stringify(request))+last);
  }
  if(fault==='missing-final')return Buffer.from(first);
  if(fault==='too-many-comments')
    return Buffer.from(': fixed comment\n\n'.repeat(MAX_COMMENTS+1)+first+last);
  if(fault==='invalid-utf8')
    return Buffer.concat([Buffer.from(first),Buffer.from([0xff]),Buffer.from(last)]);
  if(fault==='oversized')return Buffer.from('Z'.repeat(MAX_SSE+1));
  if(fault==='comments')return Buffer.from(': owned keepalive\n\n'+first+last);
  return Buffer.from(first+last);
}
/**
 * A deliberately strict, finite first-party SSE parser:
 * - maximum total bytes, blocks, comments, frame size and UTF-8
 * - comments allowed but no unsolicited JSON-RPC requests, extra events
 * - exact progress token, then matching final ID and exact fixture data
 * - no output or execution from tool-result text.
 */
function parseOwnedSse(bytes,fixture){
  if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>MAX_SSE)
    throw Error('BAD_SSE_SIZE');
  const source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const normalized=source.replace(/\r\n/gu,'\n');
  if(normalized.includes('\r')||!normalized.endsWith('\n\n'))
    throw Error('INCOMPLETE_SSE');
  const blocks=normalized.slice(0,-2).split('\n\n');
  if(blocks.length<1||blocks.length>MAX_BLOCKS)throw Error('SSE_BLOCK_LIMIT');
  let comments=0;const messages=[];
  for(const block of blocks){
    if(Buffer.byteLength(block,'utf8')>4096)throw Error('SSE_FRAME_LIMIT');
    const lines=block.split('\n'),data=[];
    let event=null;
    for(const line of lines){
      if(line.startsWith(':')){
        comments++;
        if(comments>MAX_COMMENTS)throw Error('SSE_COMMENT_LIMIT');
      }else if(line.startsWith('event:')){
        if(event!==null)throw Error('SSE_DUPLICATE_EVENT');
        event=line.slice(6).trim();
        if(event!=='message')throw Error('SSE_UNEXPECTED_EVENT');
      }else if(line.startsWith('data:')){
        data.push(line.slice(5).replace(/^ /u,''));
      }else throw Error('SSE_UNKNOWN_LINE');
    }
    if(data.length===0){
      if(event!==null)throw Error('SSE_EMPTY_EVENT');
      continue;
    }
    if(event===null)throw Error('SSE_EVENT_REQUIRED');
    if(data.length>4)throw Error('SSE_MULTILINE_LIMIT');
    messages.push(parseStrictJson(data.join('\n')));
  }
  if(messages.length!==2||
     !isDeepStrictEqual(messages[0],progressReply())||
     !isDeepStrictEqual(messages[1],finalReply(fixture)))
    throw Error('SSE_REQUEST_SCOPE_OR_FINAL_MISMATCH');
  const toolResult=parseStrictJson(messages[1].result.content[0].text);
  if(!isDeepStrictEqual(toolResult,fixture.toolResult))
    throw Error('UNTRUSTED_TOOL_RESULT_MISMATCH');
  return toolResult;
}
function duplicateHeaders(req){
  const seen=new Set(),sensitive=new Set([
    'host','origin','content-type','content-length','accept',
    'mcp-protocol-version','mcp-method','mcp-name','authorization',
    'cookie','proxy-authorization','transfer-encoding'
  ]);
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(sensitive.has(key)&&seen.has(key))return true;
    seen.add(key);
  }
  return false;
}
function sendError(res,status){
  const text=JSON.stringify({jsonrpc:'2.0',
    error:{code:status===403?-32000:-32020,message:'Owned request denied'}});
  res.writeHead(status,{'content-type':'application/json',
    'cache-control':'no-store',connection:'close',
    'content-length':String(Buffer.byteLength(text))});
  res.end(text);
}
function serve(fixture,fault,port,counts){
  return (req,res)=>{
    counts.received++;
    res.once('close',()=>{counts.responsesClosed++;});
    let size=0,overflow=false;const data=[];
    req.on('data',part=>{
      size+=part.length;
      if(size>MAX_REQUEST){
        overflow=true;data.length=0;req.destroy();
      }else if(!overflow)data.push(part);
    });
    req.on('end',()=>{
      if(overflow||res.writableEnded)return;
      let parsed=null;
      try{parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
        .decode(Buffer.concat(data)));}catch{}
      const originValid=req.headers.origin===ORIGIN;
      const valid=originValid&&counts.received===1&&
        req.socket.remoteAddress===HOST&&req.method==='POST'&&
        req.url===PATH&&req.headers.host===HOST+':'+port&&
        req.headers['content-type']==='application/json'&&
        req.headers.accept==='application/json, text/event-stream'&&
        req.headers['mcp-protocol-version']===VERSION&&
        req.headers['mcp-method']===METHOD&&req.headers['mcp-name']===TOOL&&
        req.headers.authorization===undefined&&
        req.headers.cookie===undefined&&
        req.headers['transfer-encoding']===undefined&&
        req.headers['content-length']===String(size)&&
        !duplicateHeaders(req)&&isDeepStrictEqual(parsed,REQUEST);
      if(!valid){
        counts.denied++;
        sendError(res,originValid?400:403);return;
      }
      counts.accepted++;
      if(fault==='redirect'){
        res.writeHead(302,{location:'http://example.invalid/never-follow',
          connection:'close','cache-control':'no-store'});
        res.end();return;
      }
      res.writeHead(200,{'content-type':fault==='wrong-content-type'?
        'application/json':'text/event-stream',
        'x-accel-buffering':'no','cache-control':'no-store',connection:'close'});
      const bytes=makeStream(fixture,fault);
      if(fault==='hang'){
        // Emit one complete request-scoped notification, then stall.
        res.write(frame(JSON.stringify(progressReply())));
        res.flushHeaders();return;
      }
      // Explicitly fragment fixed data into bounded HTTP writes.
      const chunkSize=fault==='fragmented'?7:97;
      for(let offset=0;offset<bytes.length;offset+=chunkSize){
        res.write(bytes.subarray(offset,offset+chunkSize));
      }
      res.end();
    });
    req.on('error',()=>{});
  };
}
function exchange(port,fixture,fault,deadlineMs){
  const body=JSON.stringify(REQUEST);
  const headers={host:HOST+':'+port,origin:fault==='wrong-origin'?
    'http://unapproved.invalid':ORIGIN,
    'content-type':'application/json',
    accept:'application/json, text/event-stream',
    'mcp-protocol-version':VERSION,
    'mcp-method':fault==='wrong-method'?'resources/read':METHOD,
    'mcp-name':TOOL,'content-length':String(Buffer.byteLength(body))};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),deadlineMs);
  return new Promise(resolve=>{
    let done=false,active=null;
    const finish=(code,toolResult=null,httpStatus=0)=>{
      if(done)return;
      done=true;clearTimeout(timer);
      if(code&&active&&!active.destroyed)active.destroy();
      resolve({code,toolResult,httpStatus});
    };
    const req=http.request({hostname:HOST,port,method:'POST',
      path:PATH,headers,agent:false,signal:controller.signal},res=>{
      active=res;
      if(res.statusCode!==200){
        res.resume();
        finish(res.statusCode===400||res.statusCode===403?
          'REQUEST_REJECTED':'RESPONSE_REJECTED',null,res.statusCode);
        return;
      }
      if(res.headers['content-type']!=='text/event-stream'||
         Object.hasOwn(res.headers,'location')){
        res.resume();finish('RESPONSE_REJECTED');return;
      }
      const chunks=[];let size=0;
      res.on('data',chunk=>{
        if(done)return;
        size+=chunk.length;
        if(size>MAX_SSE){finish('RESPONSE_REJECTED');return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        if(done)return;
        try{
          const result=parseOwnedSse(Buffer.concat(chunks),fixture);
          finish(null,result);
        }catch{finish('RESPONSE_REJECTED');}
      });
      res.on('error',()=>finish(controller.signal.aborted?
        'TIMEOUT':'RESPONSE_REJECTED'));
      res.on('close',()=>{if(!res.complete)
        finish(controller.signal.aborted?'TIMEOUT':'RESPONSE_REJECTED');});
    });
    req.on('error',()=>finish(controller.signal.aborted?
      'TIMEOUT':'RESPONSE_REJECTED'));
    req.end(body);
  });
}
export async function runOwnedModernSse(fixture,settings={}){
  const {fault,deadlineMs}=options(settings);
  validateFixtureProposal(fixture);
  const preflight=await runOwnedModernMcpSubset(fixture);
  const ready=preflight.status==='PASS'&&
    preflight.requestsAccepted===3&&preflight.toyGatewayDeliveries===1&&
    preflight.socketsClosed===3&&
    preflight.actualExternalMcpContacted===false;
  const server=http.createServer(),acks=[];
  const counts={received:0,accepted:0,denied:0,responsesClosed:0,
    socketsClosed:0};
  server.on('connection',socket=>{
    acks.push(new Promise(resolve=>socket.once('close',()=>{
      counts.socketsClosed++;resolve();
    })));
  });
  let outcome={code:'RESPONSE_REJECTED',httpStatus:0,toolResult:null};
  let cleanup=ready;
  if(ready){
    try{
      await new Promise((resolve,reject)=>{
        server.once('error',reject);
        server.listen({host:HOST,port:0,exclusive:true},()=>{
          server.off('error',reject);resolve();
        });
      });
      const port=server.address().port;
      server.on('request',serve(fixture,fault,port,counts));
      outcome=await exchange(port,fixture,fault,deadlineMs);
    }catch{outcome={code:'RESPONSE_REJECTED',httpStatus:0,toolResult:null};}
    finally{
      if(server.listening){
        const closed=new Promise(resolve=>server.close(resolve));
        server.closeAllConnections();await closed;
      }
      if(acks.length){
        let timer;
        const finished=await Promise.race([
          Promise.all(acks).then(()=>true),
          new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1000);})
        ]);
        clearTimeout(timer);cleanup=finished;
      }
    }
  }
  if(ready&&(counts.received!==1||counts.socketsClosed!==1||
     counts.responsesClosed!==1))cleanup=false;
  let gateway=null;
  if(ready&&cleanup&&outcome.code===null){
    gateway=runFictionalToySession({
      ...fixture,toolResult:outcome.toolResult
    },'SAFE_TASK');
  }
  const pass=ready&&cleanup&&outcome.code===null&&
    counts.accepted===1&&counts.denied===0&&
    gateway?.status==='PASS'&&gateway.toolResultsAccepted===1&&
    gateway.forbiddenRequestsObserved===0&&
    gateway.protectedFictionalFileEffectsCommitted===0&&
    gateway.protectedFictionalToolEffectsCommitted===0;
  const rule=pass?'M12_REQUEST_SCOPED_SSE_VERIFIED':
    !ready?'M12_SSE_PREREQUISITE_REJECTED':
    !cleanup?'M12_SSE_CLEANUP_UNCONFIRMED':
    outcome.code==='TIMEOUT'?'M12_SSE_REQUEST_TIMEOUT':
    outcome.code==='REQUEST_REJECTED'?'M12_SSE_REQUEST_REJECTED':
    'M12_SSE_RESPONSE_REJECTED';
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',
    exitCode:pass?0:1,ruleCode:rule,scope:SCOPE,
    evidenceKind:'SOURCE_OWNED_LOOPBACK_REQUEST_SCOPED_SSE_BYTES_ONLY',
    protocolVersion:VERSION,
    modernJsonPrerequisiteAccepted:ready,
    httpRequestsObserved:counts.received,
    httpRequestsAccepted:counts.accepted,
    httpRequestsDenied:counts.denied,
    rejectedHttpStatus:outcome.httpStatus,
    httpResponsesClosed:counts.responsesClosed,
    tcpSocketsClosed:counts.socketsClosed,
    socketCleanupConfirmed:cleanup,
    exactSseProgressAndFinalAccepted:pass,
    toyGatewayDeliveries:gateway?.toolResultsAccepted??0,
    protectedFictionalEffectsCommitted:0,
    actualAgentBehaviorObserved:false,
    unrelatedFileReadObserved:false,
    actualExternalMcpContacted:false,
    embeddedInstructionInterpreted:false,
    embeddedInstructionExecuted:false,
    independentBetaVerified:false,securityCertified:false,
    releaseAuthorized:false
  });
}
const CASES=Object.freeze([
  ...['fragmented','crlf','comments','multiline'].map(x=>
    [x,'PASS','M12_REQUEST_SCOPED_SSE_VERIFIED',1,0,0,1]),
  ...['final-first','duplicate-final','notification-after-final',
    'server-request','wrong-final-id','wrong-progress-token',
    'extra-result-authority','malformed-json','duplicate-json-key',
    'invalid-utf8','oversized','too-many-comments','wrong-event',
    'missing-final','truncated-frame','wrong-content-type',
    'redirect'].map(x=>
    [x,'FAIL','M12_SSE_RESPONSE_REJECTED',1,0,0,0]),
  ['hang','FAIL','M12_SSE_REQUEST_TIMEOUT',1,0,0,0],
  ['wrong-origin','FAIL','M12_SSE_REQUEST_REJECTED',0,1,403,0],
  ['wrong-method','FAIL','M12_SSE_REQUEST_REJECTED',0,1,400,0]
]);
const UNAVAILABLE=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M12_SSE_SELFTEST_UNAVAILABLE',scope:SCOPE,
  actualAgentBehaviorObserved:false,actualExternalMcpContacted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
export async function runFixedModernSseSelftest(args=[]){
  if(!noArgs(args))return UNAVAILABLE;
  try{
    const fixture=await loadValidatedFixtureProposalFile(fileURLToPath(FILE));
    const rows=[];
    for(const [fault,status,rule,accepted,denied,http,delivered] of CASES){
      const r=await runOwnedModernSse(fixture,{
        fault,deadlineMs:fault==='hang'?350:3000});
      const matched=r.status===status&&r.ruleCode===rule&&
        r.exitCode===(status==='PASS'?0:1)&&
        r.modernJsonPrerequisiteAccepted===true&&
        r.httpRequestsObserved===1&&r.httpRequestsAccepted===accepted&&
        r.httpRequestsDenied===denied&&r.rejectedHttpStatus===http&&
        r.httpResponsesClosed===1&&r.tcpSocketsClosed===1&&
        r.socketCleanupConfirmed===true&&
        r.toyGatewayDeliveries===delivered&&
        r.protectedFictionalEffectsCommitted===0&&
        !r.actualAgentBehaviorObserved&&!r.actualExternalMcpContacted;
      rows.push(Object.freeze({control:fault,expectedStatus:status,
        expectedRuleCode:rule,matched}));
    }
    const matched=rows.filter(x=>x.matched).length;
    const pass=matched===CASES.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M12_SSE_FIXED_CONTROLS_MATCH':
        'M12_SSE_FIXED_CONTROLS_MISMATCH',
      scope:SCOPE,checked:CASES.length,matched,
      expectedPositiveControls:4,expectedNegativeControls:CASES.length-4,
      negativeControlsMatched:rows.slice(4).filter(x=>x.matched).length,
      cases:Object.freeze(rows),actualAgentBehaviorObserved:false,
      actualExternalMcpContacted:false,
      unrelatedFileReadObserved:false,embeddedInstructionExecuted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return UNAVAILABLE;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runFixedModernSseSelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
