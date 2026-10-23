/**
 * M4-B6-A: one ephemeral FIRST-PARTY loopback-only modern MCP discovery server.
 * Neither a general-purpose server nor an external-target client. No URL,
 * program, request payload, credential, header, or listener supplied by users.
 * Node core HTTP only; explicitly NOT TLS/SSRF isolation for remote targets.
 */
import http from 'node:http';
import { isDeepStrictEqual } from 'node:util';
import { parseStrictJson } from './strict-json.mjs';
import { noteFirstPartyMockAttempt } from './mock-attempt-observer.mjs';

const HOST='127.0.0.1', ORIGIN='http://127.0.0.1';
const VERSION='2026-07-28', METHOD='server/discover', PATH='/mcp';
const REQUEST_MAX=4096, RESPONSE_MAX=32768, DEFAULT_DEADLINE=5000;
const CASES=new Set(['allowed','sse','wrong-origin','wrong-host','wrong-method',
  'forbidden-tool','wrong-version','wrong-path','invalid-json','oversized-request',
  'response-id','response-canary','response-oversized','response-redirect','response-hang',
  'response-version','response-content-type','response-sse-extra',
  'response-sse-missing-final','response-sse-unsolicited']);
const REQUEST=Object.freeze({jsonrpc:'2.0',id:1,method:METHOD,params:{_meta:{
  'io.modelcontextprotocol/protocolVersion':VERSION,
  'io.modelcontextprotocol/clientInfo':{name:'fixed-staging-client',version:'1'},
  'io.modelcontextprotocol/clientCapabilities':{}
}}});
const RESPONSE=Object.freeze({jsonrpc:'2.0',id:1,result:{
  resultType:'complete',supportedVersions:[VERSION],capabilities:{},
  _meta:{'io.modelcontextprotocol/serverInfo':{name:'fixed-staging-server',version:'1'}}
}});
const SENSITIVE=new Set(['host','origin','content-type','content-length',
  'mcp-protocol-version','mcp-method','mcp-name','accept','authorization',
  'cookie','proxy-authorization','transfer-encoding','mcp-session-id']);
function duplicateSensitive(req){
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const name=req.rawHeaders[i].toLowerCase();
    if(SENSITIVE.has(name)&&seen.has(name))return true;
    seen.add(name);
  }
  return false;
}
function error(res,status,code) {
  if(res.headersSent)return;
  // Fixed symbolic errors only: never reflect untrusted headers or payloads.
  const payload=JSON.stringify({jsonrpc:'2.0',id:1,error:{
    code,
    message:code===-32601?'Method not found':
      code===-32022?'Unsupported protocol version':
      code===-32020?'Header mismatch':'Fixed staging request rejected',
    ...(code===-32022?{data:{supported:[VERSION],requested:'2099-01-01'}}:{})
  }});
  res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',
    connection:'close','content-length':String(Buffer.byteLength(payload))});
  res.end(payload);
}
function serve(fault,counts,port){
  return (req,res)=>{
    counts.received++;
    // All rejected requests are denied before dispatch; a local hostile
    // process is NOT prevented from attempting this temporary socket.
    if(duplicateSensitive(req)){
      error(res,400,-32020);req.resume();return;
    }
    if(counts.received!==1 || req.socket.remoteAddress!==HOST ||
       req.method!=='POST' || req.url!==PATH ||
       req.headers.host!==HOST+':'+port || req.headers.origin!==ORIGIN ||
       req.headers['content-type']!=='application/json' ||
       req.headers.accept!=='application/json, text/event-stream' ||
       Object.hasOwn(req.headers,'authorization') ||
       Object.hasOwn(req.headers,'cookie') ||
       Object.hasOwn(req.headers,'proxy-authorization') ||
       Object.hasOwn(req.headers,'mcp-session-id') ||
       Object.hasOwn(req.headers,'transfer-encoding') ||
       Object.hasOwn(req.headers,'mcp-name')){
      error(res,403,-32020);req.resume();return;
    }
    const size=Number(req.headers['content-length']);
    if(!Number.isSafeInteger(size)||size<1||size>REQUEST_MAX){
      error(res,413,-32020);req.resume();return;
    }
    let bytes=0,over=false;const chunks=[];
    req.on('data',chunk=>{
      bytes+=chunk.length;
      if(bytes>REQUEST_MAX){over=true;chunks.length=0;error(res,413,-32020);}
      else if(!over)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(over || res.writableEnded)return;
      if(bytes!==size){error(res,400,-32020);return;}
      let request;
      try{
        request=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch{error(res,400,-32700);return;}
      // Pinned MCP 2026-07-28: first verify header/body fields; only then
      // distinguish unsupported-version (400/-32022) from unknown method
      // (404/-32601). Never silently fall back to legacy initialize.
      const bodyVersion=request?.params?._meta?.['io.modelcontextprotocol/protocolVersion'];
      if(typeof bodyVersion!=='string' ||
         typeof req.headers['mcp-protocol-version']!=='string' ||
         bodyVersion!==req.headers['mcp-protocol-version'] ||
         typeof request?.method!=='string' ||
         typeof req.headers['mcp-method']!=='string' ||
         request.method!==req.headers['mcp-method']){
        error(res,400,-32020);return;
      }
      if(bodyVersion!==VERSION){error(res,400,-32022);return;}
      if(request.method!==METHOD){error(res,404,-32601);return;}
      // A deliberately strict first-party fixture, not general MCP semantics.
      if(!isDeepStrictEqual(request,REQUEST)){error(res,403,-32020);return;}
      counts.accepted++;
      if(fault==='response-hang')return; // timeout exercised by fixed client
      if(fault==='response-redirect'){
        res.writeHead(302,{location:'http://example.invalid/never-followed',
          'cache-control':'no-store',connection:'close'});res.end();return;
      }
      let response=RESPONSE;
      if(fault==='response-id')response={...RESPONSE,id:99};
      if(fault==='response-canary')response={...RESPONSE,result:{
        ...RESPONSE.result,untrusted:'FICTIONAL_CANARY_DO_NOT_ECHO'}};
      if(fault==='response-version')response={...RESPONSE,result:{
        ...RESPONSE.result,supportedVersions:['2099-01-01']}};
      let payload=JSON.stringify(response);
      if(fault==='response-oversized')payload='Z'.repeat(RESPONSE_MAX+128);
      if(fault==='sse')payload='event: message\n'+'data: '+payload+'\n\n';
      if(fault==='response-sse-extra')
        payload='event: message\n'+'data: '+payload+'\n\n'+
          'event: message\n'+'data: '+payload+'\n\n';
      if(fault==='response-sse-missing-final')
        payload='event: message\n'+'data: '+JSON.stringify({jsonrpc:'2.0',
          method:'notifications/progress',params:{progress:1,total:2}})+'\n\n';
      if(fault==='response-sse-unsolicited')
        payload='event: message\n'+'data: '+JSON.stringify({jsonrpc:'2.0',
          id:2,method:'sampling/createMessage',params:{messages:[]}})+'\n\n'+
          'event: message\n'+'data: '+JSON.stringify(RESPONSE)+'\n\n';
      const sse=['sse','response-sse-extra','response-sse-missing-final',
        'response-sse-unsolicited'].includes(fault);
      res.writeHead(200,{'content-type':fault==='response-content-type'
        ?'text/plain':sse?'text/event-stream':'application/json',
        'cache-control':'no-store',connection:'close',
        'content-length':String(Buffer.byteLength(payload))});
      res.end(payload);
    });
    req.on('error',()=>{}); // never log or echo transport errors
  };
}
function makeRequest(fault){
  const request=fault==='forbidden-tool'
    ? {...REQUEST,method:'tools/call',params:{name:'never-executed',arguments:{},
      _meta:REQUEST.params._meta}}:REQUEST;
  const payload=fault==='invalid-json'?'{"jsonrpc":':
    fault==='oversized-request'?'X'.repeat(REQUEST_MAX+1):JSON.stringify(request);
  const headers={host:'127.0.0.1:PORT',origin:ORIGIN,
    'content-type':'application/json',accept:'application/json, text/event-stream',
    'mcp-protocol-version':VERSION,'mcp-method':METHOD,
    'content-length':String(Buffer.byteLength(payload))};
  if(fault==='wrong-origin')headers.origin='http://unapproved.invalid';
  if(fault==='wrong-host')headers.host='wrong.invalid:1';
  if(fault==='wrong-version')headers['mcp-protocol-version']='2025-11-25';
  if(fault==='wrong-method')headers['mcp-method']='tools/call';
  if(fault==='forbidden-tool')headers['mcp-method']='tools/call';
  return {headers,payload,method:'POST',path:fault==='wrong-path'?'/wrong':PATH};
}
function parseReply(type,data) {
  const utf8=new TextDecoder('utf-8',{fatal:true}).decode(data);
  let value=utf8;
  if(type==='text/event-stream'){
    // Narrow fixed test-only SSE: exactly one request-scoped message event.
    const lines=utf8.replace(/\r\n/g,'\n').split('\n');
    if(lines.length!==4 || lines[0]!=='event: message' || !lines[1].startsWith('data: ') ||
       lines[2]!=='' || lines[3]!=='')return false;
    value=lines[1].slice(6);
  }else if(type!=='application/json')return false;
  return isDeepStrictEqual(parseStrictJson(value),RESPONSE);
}
function probe(port,fault,signal) {
  const {headers,payload,method,path}=makeRequest(fault);
  headers.host=headers.host.replace(':PORT',':'+port);
  return new Promise(resolve=>{
    let finished=false;
    const done=code=>{if(!finished){finished=true;resolve(code);}};
    noteFirstPartyMockAttempt('staging-request');
    const req=http.request({hostname:HOST,port,method,path,headers,agent:false,
      signal},res=>{
      if(res.statusCode>=300&&res.statusCode<400){
        res.resume();done('STAGING_REDIRECT_REJECTED');return;
      }
      if(res.statusCode!==200){
        res.resume();done('STAGING_REQUEST_REJECTED');return;
      }
      const type=res.headers['content-type'];
      let bytes=0,overflow=false;const chunks=[];
      res.on('data',chunk=>{
        bytes+=chunk.length;
        if(bytes>RESPONSE_MAX){
          overflow=true;done('STAGING_RESPONSE_LIMIT');res.destroy();
        }else if(!overflow)chunks.push(chunk);
      });
      res.on('end',()=>{
        if(finished)return;
        let matched=false;
        try{matched=parseReply(type,Buffer.concat(chunks));}catch{}
        done(matched?null:'STAGING_RESPONSE_MISMATCH');
      });
      res.on('error',()=>done(signal.aborted?'STAGING_TIMEOUT':'STAGING_TRANSPORT_ERROR'));
    });
    req.on('error',()=>done(signal.aborted?'STAGING_TIMEOUT':'STAGING_TRANSPORT_ERROR'));
    req.end(payload);
  });
}
function report(rule,counts) {
  return {status:rule?'FAIL':'PASS',profile:'fixed-modern-mcp-staging-v1',
    connectionStatus:'FIRST_PARTY_STAGING_ONLY',transport:'FIXED_IPV4_LOOPBACK_HTTP',
    protocolVersion:VERSION,allowedMethod:METHOD,
    externalTargetContacted:false,operatorVerified:false,
    checked:1,received:counts.received,accepted:counts.accepted,
    failureCount:rule?1:0,findingsTruncated:false,
    findings:rule?[{step:1,rule}]:[]};
}
/**
 * No URL, port, executable, origin, grant, body, token or arbitrary method
 * options. Test-only allowlisted faults never become public CLI parameters.
 */
export async function runFirstPartyStagingSelftest(options={}) {
  if(!options || typeof options!=='object' || Array.isArray(options) ||
    Object.getPrototypeOf(options)!==Object.prototype ||
    Object.keys(options).some(k=>!['fault','deadlineMs','onBound'].includes(k)) ||
    (Object.hasOwn(options,'onBound') && typeof options.onBound!=='function')) {
    throw new TypeError('INVALID_FIXED_STAGING_OPTIONS');
  }
  const fault=options.fault??'allowed',deadlineMs=options.deadlineMs??DEFAULT_DEADLINE;
  if(!CASES.has(fault) || !Number.isSafeInteger(deadlineMs) ||
    deadlineMs<250 || deadlineMs>DEFAULT_DEADLINE)
    throw new TypeError('INVALID_FIXED_STAGING_OPTIONS');
  const server=http.createServer(),controller=new AbortController();
  const counts={received:0,accepted:0};
  let timer;
  try{
    await new Promise((resolve,reject)=>{
      const onError=e=>reject(e);
      server.once('error',onError);
      noteFirstPartyMockAttempt('staging-bind');
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',onError);resolve();
      });
    });
    const port=server.address().port;
    server.on('request',serve(fault,counts,port));
    timer=setTimeout(()=>controller.abort(),deadlineMs);
    // Test-only trusted callback: private bound port is never in a public
    // report/CLI or caller-controlled JSON. Used for external witness probes.
    if(options.onBound)await options.onBound(Object.freeze({host:HOST,port,pid:process.pid}));
    const rule=await probe(port,fault,controller.signal);
    return report(rule,counts);
  }catch{
    return report('STAGING_BIND_OR_TRANSPORT_FAILED',counts);
  }finally{
    if(timer)clearTimeout(timer);
    controller.abort();
    if(server.listening){
      const closed=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();
      await closed;
    }
  }
}
