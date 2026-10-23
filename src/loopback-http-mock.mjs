/**
 * M4-A: one fixed first-party JSON-RPC heartbeat over ephemeral IPv4 loopback.
 * This IS network I/O (127.0.0.1 only), NOT a live-target scanner, general
 * MCP implementation, credential broker, OS sandbox or production service.
 * Target, method, headers, expected result and executable are never user chosen.
 */
import http from 'node:http';
import { isDeepStrictEqual } from 'node:util';
import { parseStrictJson } from './strict-json.mjs';
import { noteFirstPartyMockAttempt } from './mock-attempt-observer.mjs';

const HOST='127.0.0.1';
const ORIGIN='http://127.0.0.1';
const VERSION='2026-07-28';
const PROFILE='fixed-first-party-loopback-v1';
const INPUT_MAX=4096;
const OUTPUT_MAX=8192;
const FAULTS=Object.freeze([
  'none','bad-origin','missing-origin','bad-host','bad-path','get-method',
  'tool-call','wrong-version','malformed-request','oversized-request',
  'server-wrong-id','server-invalid-json','server-oversized',
  'server-redirect','server-hang','server-content-type','server-canary'
]);
const ALLOWED=new Set(FAULTS);
const REQUEST=Object.freeze({jsonrpc:'2.0',id:1,method:'ping',params:{}});
const RESPONSE=Object.freeze({jsonrpc:'2.0',id:1,result:{}});
const has=(obj,key)=>Object.hasOwn(obj,key);
const duplicates=(req)=>{
  const sensitive=new Set(['host','origin','content-type','content-length',
    'mcp-protocol-version','transfer-encoding']);
  const seen=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const key=req.rawHeaders[i].toLowerCase();
    if(sensitive.has(key) && seen.has(key))return true;
    seen.add(key);
  }
  return false;
};
const done=(status,rule,counts)=>({
  status,profile:PROFILE,transport:'FIXED_IPV4_LOOPBACK_HTTP',
  boundHost:HOST,checked:1,received:counts.received,accepted:counts.accepted,
  simulatedEffects:0,failureCount:rule?1:0,findingsTruncated:false,
  findings:rule?[{step:1,rule}]:[]
});

function requestHandler(fault,counts,port){
  return (req,res)=>{
    counts.received++;
    const reject=(status)=>{res.writeHead(status,{
      'content-type':'application/json','cache-control':'no-store',
      'connection':'close','content-length':'2'
    });res.end('{}');};
    // HTTP is reachable only on loopback; Host+Origin also required (neither
    // proves operator identity or protects against malicious local processes).
    if(req.socket.remoteAddress!==HOST || duplicates(req) ||
      req.method!=='POST' || req.url!=='/mcp' ||
      req.headers.host!==HOST+':'+port ||
      req.headers.origin!==ORIGIN ||
      req.headers['mcp-protocol-version']!==VERSION ||
      req.headers['content-type']!=='application/json' ||
      req.headers.accept!=='application/json' ||
      has(req.headers,'transfer-encoding')){
      reject(403);return;
    }
    const size=Number(req.headers['content-length']);
    if(!Number.isSafeInteger(size)||size<=0||size>INPUT_MAX){
      reject(413);return;
    }
    let bytes=0;const chunks=[];
    req.on('data',chunk=>{
      bytes+=chunk.byteLength;
      if(bytes>INPUT_MAX){chunks.length=0;reject(413);req.destroy();}
      else chunks.push(chunk);
    });
    req.on('end',()=>{
      if(bytes!==size || bytes>INPUT_MAX)return reject(400);
      let parsed;
      try {parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
        .decode(Buffer.concat(chunks)));}
      catch{return reject(400);}
      if(!isDeepStrictEqual(parsed,REQUEST))return reject(403);
      counts.accepted++;
      if(fault==='server-hang')return;
      if(fault==='server-redirect'){
        res.writeHead(302,{location:'http://example.invalid/never-followed',
          'cache-control':'no-store',connection:'close'});res.end();return;
      }
      let payload=JSON.stringify(RESPONSE);
      if(fault==='server-wrong-id')payload=JSON.stringify({jsonrpc:'2.0',id:999,result:{}});
      if(fault==='server-invalid-json')payload='{"jsonrpc":';
      if(fault==='server-oversized')payload='A'.repeat(OUTPUT_MAX+512);
      if(fault==='server-canary')payload=JSON.stringify({jsonrpc:'2.0',id:1,
        result:{marker:'FICTIONAL_CANARY_DO_NOT_ECHO'}});
      res.writeHead(200,{
        'content-type':fault==='server-content-type'?'text/html':'application/json',
        'cache-control':'no-store','connection':'close',
        'content-length':String(Buffer.byteLength(payload))});
      res.end(payload);
    });
    req.on('error',()=>{}); // never echo hostile transport errors
  };
}

function makeClientInput(fault){
  const request=fault==='tool-call'?{jsonrpc:'2.0',id:1,method:'tools/call',
    params:{name:'fictional-write',arguments:{}}}:REQUEST;
  const raw=fault==='malformed-request'?'{"jsonrpc":':
    fault==='oversized-request'?'A'.repeat(INPUT_MAX+1):JSON.stringify(request);
  const headers={
    host:'127.0.0.1:PORT',origin:ORIGIN,
    'content-type':'application/json',accept:'application/json',
    'mcp-protocol-version':VERSION,'content-length':String(Buffer.byteLength(raw))
  };
  if(fault==='bad-origin')headers.origin='http://unapproved.invalid';
  if(fault==='missing-origin')delete headers.origin;
  if(fault==='bad-host')headers.host='other.invalid:9';
  if(fault==='wrong-version')headers['mcp-protocol-version']='2099-01-01';
  return {
    path:fault==='bad-path'?'/not-mcp':'/mcp',
    method:fault==='get-method'?'GET':'POST',headers,raw
  };
}

function sendFixedRequest(port,fault,signal,counts){
  const params=makeClientInput(fault);
  params.headers.host=params.headers.host.replace(':PORT',':'+port);
  return new Promise(resolve=>{
    let settled=false;
    const finish=(rule)=>{if(!settled){settled=true;resolve(rule);}};
    noteFirstPartyMockAttempt('http-request'); // first-party client call site
    const req=http.request({
      hostname:HOST,port,path:params.path,method:params.method,
      headers:params.headers,agent:false,signal
    },res=>{
      if(res.statusCode>=300 && res.statusCode<400){
        res.resume();finish('LOOPBACK_REDIRECT_REJECTED');return;
      }
      if(res.statusCode!==200){res.resume();finish('LOOPBACK_REQUEST_DENIED');return;}
      if(res.headers['content-type']!=='application/json'){
        res.resume();finish('LOOPBACK_BAD_CONTENT_TYPE');return;
      }
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{
        bytes+=chunk.length;
        if(bytes>OUTPUT_MAX){
          finish('LOOPBACK_RESPONSE_LIMIT');
          res.destroy();
        }else chunks.push(chunk);
      });
      res.on('end',()=>{
        if(settled)return;
        let parsed;
        try{parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));}
        catch{finish('LOOPBACK_INVALID_JSON_RESPONSE');return;}
        if(!isDeepStrictEqual(parsed,RESPONSE)){
          finish('LOOPBACK_RESPONSE_MISMATCH');return;
        }
        finish(null);
      });
      res.on('error',()=>finish(signal.aborted?'LOOPBACK_TIMEOUT':'LOOPBACK_TRANSPORT_ERROR'));
    });
    req.on('error',()=>finish(signal.aborted?'LOOPBACK_TIMEOUT':'LOOPBACK_TRANSPORT_ERROR'));
    req.end(params.method==='POST'?params.raw:undefined);
  });
}

/**
 * Only known fault selectors may vary. External URLs, ports, destinations,
 * credentials, executable paths, HTTP method override and tool arguments are
 * never accepted. The only contacted socket is 127.0.0.1:ephemeral-owned-port.
 */
export async function runLoopbackHttpMock(options={}){
  if(!options || typeof options!=='object' || Array.isArray(options) ||
     Object.keys(options).some(k=>!['fault','deadlineMs'].includes(k)))
    throw new TypeError('INVALID_LOOPBACK_OPTIONS');
  const {fault='none',deadlineMs=5000}=options;
  if(!ALLOWED.has(fault))throw new TypeError('INVALID_LOOPBACK_FAULT');
  if(!Number.isSafeInteger(deadlineMs)||deadlineMs<250||deadlineMs>5000)
    throw new TypeError('INVALID_LOOPBACK_DEADLINE');
  const counts={received:0,accepted:0};
  let port;
  const server=http.createServer();
  const abort=new AbortController();
  let timer;
  try{
    await new Promise((resolve,reject)=>{
      const onError=error=>reject(error);
      server.once('error',onError);
      noteFirstPartyMockAttempt('http-bind'); // actual loopback bind call site
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',onError);resolve();
      });
    });
    port=server.address().port;
    server.on('request',requestHandler(fault,counts,port));
    timer=setTimeout(()=>abort.abort(),deadlineMs);
    const rule=await sendFixedRequest(port,fault,abort.signal,counts);
    return done(rule?'FAIL':'PASS',rule,counts);
  }catch{
    return done('FAIL','LOOPBACK_BIND_OR_TRANSPORT_FAILED',counts);
  }finally{
    if(timer)clearTimeout(timer);
    abort.abort();
    if(server.listening){
      const closed=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();
      await closed;
    }
  }
}
export function runLoopbackHttpScenario(value){
  if(!value || typeof value!=='object' || Array.isArray(value) ||
     Object.keys(value).some(k=>!['profile','fault'].includes(k)) ||
     value.profile!==PROFILE || !ALLOWED.has(value.fault))
    throw new TypeError('INVALID_LOOPBACK_FIXTURE');
  return runLoopbackHttpMock({fault:value.fault});
}
