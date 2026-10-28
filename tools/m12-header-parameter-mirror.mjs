#!/usr/bin/env node
/**
 * M12-D/E: first-party, fixed 2026-07-28 x-mcp-header value mirror.
 *
 * The client and server are source-owned, use ONLY the literal 127.0.0.1
 * with an ephemeral port, and never run arbitrary code/real agents/MCPs.
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

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const VERSION='2026-07-28',METHOD='tools/call';
const NAME='fictional_mirrored_ticket';
const SCOPE='SOURCE_OWNED_MODERN_X_MCP_HEADER_MIRROR_ONLY';
const FILE=new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url);
const MAX_REQUEST=4096,MAX_RESPONSE=8192;
const MODES=Object.freeze([
  'ascii','unicode','padded','sentinel',
  'missing-ticket','missing-memo','missing-boolean',
  'mismatch-ticket','mismatch-memo','mismatch-integer','mismatch-boolean',
  'malformed-sentinel','noncanonical-base64','duplicate-parameter',
  'unexpected-parameter','wrong-method','wrong-name','wrong-version',
  'wrong-origin','duplicate-json-key','invalid-json','replayed-result',
  'forged-result-authority','redirect','oversized','hang'
]);
const validModes=new Set(['ascii','unicode','padded','sentinel']);
const INVALID=()=>{throw new TypeError('INVALID_M12_HEADER_MIRROR_OPTIONS');};
const annotations=Object.freeze([
  Object.freeze({name:'Ticket',key:'ticket',type:'string'}),
  Object.freeze({name:'Memo',key:'memo',type:'string'}),
  Object.freeze({name:'Priority',key:'priority',type:'integer'}),
  Object.freeze({name:'Enabled',key:'enabled',type:'boolean'})
]);
export const SOURCE_OWNED_SCHEMA=Object.freeze({
  type:'object',additionalProperties:false,
  properties:Object.freeze({
    ticket:Object.freeze({type:'string','x-mcp-header':'Ticket'}),
    memo:Object.freeze({type:'string','x-mcp-header':'Memo'}),
    priority:Object.freeze({type:'integer','x-mcp-header':'Priority'}),
    enabled:Object.freeze({type:'boolean','x-mcp-header':'Enabled'})
  }),
  required:Object.freeze(['ticket','memo','priority','enabled'])
});
const BASE64_PREFIX='=?base64?',BASE64_SUFFIX='?=';
const SENTINEL=/^=\?base64\?.*\?=$/u;
const ASCII=/^[\x20-\x7e]*$/u;
const HEADER_NAME=/^[!#$%&'*+.^_\x60|~0-9A-Za-z-]+$/u;

function strictPlainObject(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)return false;
  const d=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(d).every(k=>typeof k==='string'&&
    d[k].enumerable&&Object.hasOwn(d[k],'value'));
}
function settings(value){
  if(!strictPlainObject(value))INVALID();
  const keys=Reflect.ownKeys(value);
  if(keys.some(k=>k!=='fault'&&k!=='deadlineMs'))INVALID();
  const fault=Object.hasOwn(value,'fault')?value.fault:'ascii';
  const deadlineMs=Object.hasOwn(value,'deadlineMs')?value.deadlineMs:3000;
  if(typeof fault!=='string'||!MODES.includes(fault)||
     !Number.isSafeInteger(deadlineMs)||deadlineMs<250||deadlineMs>4000)INVALID();
  return {fault,deadlineMs};
}
/**
 * Demonstrate a strict, source-independent schema annotation check.
 * Review remains necessary: this is not a general JSON Schema compiler.
 */
export function validateHeaderAnnotations(schema){
  if(!strictPlainObject(schema)||schema.type!=='object'||
     !strictPlainObject(schema.properties))return false;
  const used=new Set();
  const scan=(record,depth)=>{
    if(depth>6||!strictPlainObject(record))return false;
    for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(record))){
      if(!Object.hasOwn(descriptor,'value'))return false;
    }
    if(Object.hasOwn(record,'x-mcp-header')){
      const name=record['x-mcp-header'];
      if(typeof name!=='string'||name.length<1||name.length>48||
         !HEADER_NAME.test(name)||used.has(name.toLowerCase())||
         !['string','integer','boolean'].includes(record.type))return false;
      used.add(name.toLowerCase());
    }
    if(Object.hasOwn(record,'properties')){
      if(record.type!=='object'||!strictPlainObject(record.properties))return false;
      for(const key of Reflect.ownKeys(record.properties)){
        if(typeof key!=='string'||!scan(record.properties[key],depth+1))return false;
      }
    }
    for(const unsupported of ['$ref','items','oneOf','anyOf','allOf','not','if','then','else']){
      if(Object.hasOwn(record,unsupported)&&
         JSON.stringify(record[unsupported])?.includes('"x-mcp-header"'))return false;
    }
    return true;
  };
  return Object.values(schema.properties).every(x=>scan(x,0));
}
function headerEncode(value,type){
  let text;
  if(type==='string'){
    if(typeof value!=='string'||value.length>128)INVALID();
    text=value;
  }else if(type==='integer'){
    if(!Number.isSafeInteger(value))INVALID();
    text=String(value);
  }else{
    if(typeof value!=='boolean')INVALID();
    text=value?'true':'false';
  }
  if(text!==text.trim()||!ASCII.test(text)||SENTINEL.test(text)){
    return BASE64_PREFIX+Buffer.from(text,'utf8').toString('base64')+BASE64_SUFFIX;
  }
  return text;
}
function headerDecode(encoded){
  if(typeof encoded!=='string'||encoded.length>512)throw Error('BAD_HEADER');
  if(!encoded.startsWith(BASE64_PREFIX)&&!encoded.endsWith(BASE64_SUFFIX)){
    if(!ASCII.test(encoded)||encoded!==encoded.trim()||SENTINEL.test(encoded))
      throw Error('BAD_HEADER');
    return encoded;
  }
  if(!encoded.startsWith(BASE64_PREFIX)||!encoded.endsWith(BASE64_SUFFIX))
    throw Error('BAD_SENTINEL');
  const raw=encoded.slice(BASE64_PREFIX.length,-BASE64_SUFFIX.length);
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(raw))
    throw Error('BAD_BASE64');
  const bytes=Buffer.from(raw,'base64');
  if(bytes.toString('base64')!==raw)throw Error('NONCANONICAL_BASE64');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(headerEncode(text,'string')!==encoded)throw Error('NONCANONICAL_ENCODING');
  return text;
}
export function encodeSourceOwnedHeader(value,type){
  return headerEncode(value,type);
}
export function decodeSourceOwnedHeader(encoded){
  return headerDecode(encoded);
}
function paramsFor(mode){
  const memo=mode==='unicode'?'Fictional Grüße 世界':
    mode==='padded'?' fictional memo ':
    mode==='sentinel'?'=?base64?literal?=':
    'Fictional ticket status';
  return {ticket:'FICTIONAL-Q17',memo,priority:7,enabled:true};
}
function requestFor(mode){
  return {jsonrpc:'2.0',id:33,method:METHOD,params:{
    name:NAME,arguments:paramsFor(mode),
    _meta:{
      'io.modelcontextprotocol/protocolVersion':VERSION,
      'io.modelcontextprotocol/clientInfo':{
        name:'fictional-header-client',version:'1'
      },
      'io.modelcontextprotocol/clientCapabilities':{}
    }
  }};
}
function responseFor(fixture){
  return {jsonrpc:'2.0',id:33,result:{
    resultType:'complete',isError:false,
    content:[{type:'text',text:JSON.stringify(fixture.toolResult)}],
    _meta:{'io.modelcontextprotocol/serverInfo':{
      name:'fictional-header-server',version:'1'
    }}
  }};
}
function duplicateField(req){
  const exact=new Set(['host','origin','accept','content-type',
    'content-length','mcp-protocol-version','mcp-method','mcp-name',
    'authorization','cookie','proxy-authorization','transfer-encoding',
    ...annotations.map(x=>'mcp-param-'+x.name.toLowerCase())]);
  const observed=new Set();
  for(let i=0;i<req.rawHeaders.length;i+=2){
    const name=req.rawHeaders[i].toLowerCase();
    if(exact.has(name)&&observed.has(name))return true;
    observed.add(name);
  }
  return false;
}
function jsonResponse(res,status,body){
  const payload=JSON.stringify(body);
  res.writeHead(status,{'content-type':'application/json',
    'cache-control':'no-store','connection':'close',
    'content-length':String(Buffer.byteLength(payload))});
  res.end(payload);
}
function mirrorHeaders(req,body,port){
  if(!body||!strictPlainObject(body)||body.jsonrpc!=='2.0'||
     body.id!==33||body.method!==METHOD||
     !strictPlainObject(body.params)||
     body.params.name!==NAME||!strictPlainObject(body.params.arguments)||
     !isDeepStrictEqual(body,requestFor('ascii'))&&
     !['unicode','padded','sentinel'].some(mode=>
       isDeepStrictEqual(body,requestFor(mode))))return false;
  if(req.method!=='POST'||req.url!==PATH||
     req.socket.remoteAddress!==HOST||
     req.headers.host!==HOST+':'+port||
     req.headers.origin!==ORIGIN||
     req.headers['content-type']!=='application/json'||
     req.headers.accept!=='application/json, text/event-stream'||
     req.headers['mcp-protocol-version']!==VERSION||
     req.headers['mcp-method']!==METHOD||
     req.headers['mcp-name']!==NAME||
     req.headers.authorization!==undefined||
     req.headers.cookie!==undefined||
     req.headers['proxy-authorization']!==undefined||
     req.headers['transfer-encoding']!==undefined||
     duplicateField(req))return false;
  const expected=body.params.arguments;
  const keys=new Set(annotations.map(a=>'mcp-param-'+a.name.toLowerCase()));
  for(const name of Object.keys(req.headers))
    if(name.startsWith('mcp-param-')&&!keys.has(name))return false;
  for(const a of annotations){
    const raw=req.headers['mcp-param-'+a.name.toLowerCase()];
    if(typeof raw!=='string')return false;
    let decoded;
    try{decoded=headerDecode(raw);}catch{return false;}
    const value=expected[a.key];
    if(a.type==='string'){
      if(decoded!==value)return false;
    }else if(a.type==='integer'){
      if(!/^-?(?:0|[1-9][0-9]*)$/u.test(decoded)||
         !Number.isSafeInteger(Number(decoded))||
         Number(decoded)!==value)return false;
    }else if(decoded!==(value?'true':'false'))return false;
    if(raw!==headerEncode(value,a.type))return false;
  }
  return true;
}
function serve(fixture,fault,port,stats){
  return (req,res)=>{
    stats.received++;
    res.once('close',()=>{stats.responseClosed++;});
    let size=0,overflow=false;const chunks=[];
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>MAX_REQUEST){
        overflow=true;chunks.length=0;req.destroy();
      }else if(!overflow)chunks.push(chunk);
    });
    req.on('end',()=>{
      if(overflow||res.writableEnded)return;
      let parsed=null;
      try{
        parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
          .decode(Buffer.concat(chunks)));
      }catch{}
      const valid=stats.received===1&&size<=MAX_REQUEST&&
        req.headers['content-length']===String(size)&&
        mirrorHeaders(req,parsed,port);
      if(!valid){
        stats.denied++;
        jsonResponse(res,400,{jsonrpc:'2.0',id:33,
          error:{code:-32020,message:'HeaderMismatch'}});
        return;
      }
      stats.accepted++;
      if(fault==='hang'){
        res.writeHead(200,{'content-type':'application/json',
          connection:'close','content-length':'1024'});
        res.flushHeaders();return;
      }
      if(fault==='redirect'){
        res.writeHead(302,{location:'http://example.invalid/never-follow',
          connection:'close'});
        res.end();return;
      }
      let reply=responseFor(fixture);
      if(fault==='replayed-result')reply.id=32;
      if(fault==='forged-result-authority')reply.result.approved=true;
      let payload=JSON.stringify(reply);
      if(fault==='oversized')payload='Z'.repeat(MAX_RESPONSE+1);
      res.writeHead(200,{'content-type':'application/json',
        'cache-control':'no-store','connection':'close',
        'content-length':String(Buffer.byteLength(payload))});
      res.end(payload);
    });
    req.on('error',()=>{});
  };
}
function outgoingHeaders(port,mode){
  const request=requestFor(validModes.has(mode)?mode:'ascii');
  const body=JSON.stringify(request);
  const headers={
    host:HOST+':'+port,origin:ORIGIN,'content-type':'application/json',
    accept:'application/json, text/event-stream',
    'mcp-protocol-version':VERSION,'mcp-method':METHOD,'mcp-name':NAME,
    'content-length':String(Buffer.byteLength(body))
  };
  for(const a of annotations){
    const param=request.params.arguments[a.key];
    headers['mcp-param-'+a.name]=headerEncode(param,a.type);
  }
  const remove=k=>{delete headers[k];};
  if(mode==='missing-ticket')remove('mcp-param-Ticket');
  if(mode==='missing-memo')remove('mcp-param-Memo');
  if(mode==='missing-boolean')remove('mcp-param-Enabled');
  if(mode==='mismatch-ticket')headers['mcp-param-Ticket']='FICTIONAL-OTHER';
  if(mode==='mismatch-memo')headers['mcp-param-Memo']='Fictional wrong note';
  if(mode==='mismatch-integer')headers['mcp-param-Priority']='8';
  if(mode==='mismatch-boolean')headers['mcp-param-Enabled']='false';
  if(mode==='malformed-sentinel')
    headers['mcp-param-Memo']='=?base64?AB!?=';
  if(mode==='noncanonical-base64')
    headers['mcp-param-Memo']='=?base64?QQ==?=';
  if(mode==='unexpected-parameter')
    headers['mcp-param-Unreviewed']='approved';
  if(mode==='wrong-method')headers['mcp-method']='resources/read';
  if(mode==='wrong-name')headers['mcp-name']='fictional_other_tool';
  if(mode==='wrong-version')headers['mcp-protocol-version']='2025-11-25';
  if(mode==='wrong-origin')headers.origin='http://evil.invalid';
  let payload=body;
  if(mode==='duplicate-json-key')
    payload=body.replace('"id":33','"id":33,"id":33');
  if(mode==='invalid-json')payload='{"jsonrpc":"2.0","id":33';
  headers['content-length']=String(Buffer.byteLength(payload));
  const pairs=Object.entries(headers).flatMap(([k,v])=>[k,v]);
  if(mode==='duplicate-parameter')
    pairs.push('mcp-param-Ticket','FICTIONAL-Q17');
  return {pairs,payload};
}
async function request(port,fixture,mode,deadlineMs){
  const {pairs,payload}=outgoingHeaders(port,mode);
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),deadlineMs);
  return new Promise(resolve=>{
    let done=false,active=null;
    const complete=(code,result=null,serverCode=0)=>{
      if(done)return;
      done=true;clearTimeout(timer);
      if(code&&active&&!active.destroyed)active.destroy();
      resolve({code,result,serverCode});
    };
    const req=http.request({hostname:HOST,port,method:'POST',path:PATH,
      headers:pairs,agent:false,signal:abort.signal},res=>{
      active=res;
      if(res.statusCode===400){
        const chunks=[];let bytes=0;
        res.on('data',b=>{bytes+=b.length;if(bytes<=MAX_RESPONSE)chunks.push(b);});
        res.on('end',()=>{
          let code=0;
          try{
            const v=parseStrictJson(Buffer.concat(chunks).toString('utf8'));
            code=v.error.code;
          }catch{}
          complete('HEADER_REJECTED',null,code);
        });
        return;
      }
      if(res.statusCode!==200||res.headers['content-type']!=='application/json'||
         Object.hasOwn(res.headers,'location')){
        res.resume();complete('RESPONSE_REJECTED');return;
      }
      const expected=Number(res.headers['content-length']);
      if(!Number.isSafeInteger(expected)||expected<1||expected>MAX_RESPONSE){
        complete('RESPONSE_REJECTED');return;
      }
      const chunks=[];let size=0;
      res.on('data',part=>{
        if(done)return;
        size+=part.length;
        if(size>MAX_RESPONSE){complete('RESPONSE_REJECTED');return;}
        chunks.push(part);
      });
      res.on('end',()=>{
        if(done)return;
        try{
          if(size!==expected)throw Error('BAD_REPLY_BYTES');
          const parsed=parseStrictJson(new TextDecoder('utf-8',{fatal:true})
            .decode(Buffer.concat(chunks)));
          if(!isDeepStrictEqual(parsed,responseFor(fixture)))
            throw Error('BAD_REPLY_CONTENT');
          const data=parseStrictJson(parsed.result.content[0].text);
          if(!isDeepStrictEqual(data,fixture.toolResult))
            throw Error('BAD_TOOL_CONTENT');
          complete(null,data);
        }catch{complete('RESPONSE_REJECTED');}
      });
      res.on('error',()=>complete(abort.signal.aborted?'TIMEOUT':'RESPONSE_REJECTED'));
      res.on('close',()=>{if(!res.complete)
        complete(abort.signal.aborted?'TIMEOUT':'RESPONSE_REJECTED');});
    });
    req.on('error',()=>complete(abort.signal.aborted?'TIMEOUT':'RESPONSE_REJECTED'));
    req.end(payload);
  });
}
/** Only reviewed fictional fixture inputs, only our disposable localhost mock. */
export async function runOwnedM12HeaderMirror(fixture,options={}){
  const {fault,deadlineMs}=settings(options);
  validateFixtureProposal(fixture);
  if(!validateHeaderAnnotations(SOURCE_OWNED_SCHEMA))INVALID();
  const server=http.createServer(),socketAcks=[];
  const count={received:0,accepted:0,denied:0,responseClosed:0,socketClosed:0};
  server.on('connection',socket=>{
    socketAcks.push(new Promise(resolve=>socket.once('close',()=>{
      count.socketClosed++;resolve();
    })));
  });
  let outcome={code:'RESPONSE_REJECTED',serverCode:0,result:null};
  let cleanup=true;
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen({host:HOST,port:0,exclusive:true},()=>{
        server.off('error',reject);resolve();
      });
    });
    const port=server.address().port;
    server.on('request',serve(fixture,fault,port,count));
    outcome=await request(port,fixture,fault,deadlineMs);
  }catch{outcome={code:'RESPONSE_REJECTED',serverCode:0,result:null};}
  finally{
    if(server.listening){
      const closed=new Promise(resolve=>server.close(resolve));
      server.closeAllConnections();
      await closed;
    }
    if(socketAcks.length){
      let timer;
      const complete=await Promise.race([
        Promise.all(socketAcks).then(()=>true),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1000);})
      ]);
      clearTimeout(timer);
      cleanup=complete;
    }
  }
  if(count.received!==1||count.socketClosed!==1||
     count.responseClosed!==1)cleanup=false;
  let gateway=null;
  if(outcome.code===null&&cleanup){
    gateway=runFictionalToySession({...fixture,toolResult:outcome.result},'SAFE_TASK');
  }
  const pass=cleanup&&outcome.code===null&&gateway?.status==='PASS'&&
    gateway.methodCallsObserved===3&&gateway.toolResultsAccepted===1&&
    gateway.protectedFictionalFileEffectsCommitted===0&&
    gateway.protectedFictionalToolEffectsCommitted===0&&
    count.accepted===1&&count.denied===0;
  const rule=pass?'M12_MIRRORED_HEADERS_AND_TOOL_DATA_MATCH':
    !cleanup?'M12_MIRROR_SOCKET_CLEANUP_UNCONFIRMED':
    outcome.code==='TIMEOUT'?'M12_MIRROR_RESPONSE_TIMEOUT':
    outcome.code==='HEADER_REJECTED'?'M12_MIRROR_HEADER_MISMATCH':
    'M12_MIRROR_RESPONSE_REJECTED';
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:rule,scope:SCOPE,
    evidenceKind:'OWNED_LOOPBACK_HEADER_AND_BODY_MIRROR_ONLY',
    protocolVersion:VERSION,
    requestsReceived:count.received,requestsAccepted:count.accepted,
    requestsDenied:count.denied,headerMismatchHttpCode:outcome.serverCode,
    responsesClosed:count.responseClosed,socketsClosed:count.socketClosed,
    socketCleanupConfirmed:cleanup,
    toyGatewayDeliveries:gateway?.toolResultsAccepted??0,
    protectedFictionalEffectsCommitted:0,
    actualAgentBehaviorObserved:false,actualExternalMcpContacted:false,
    realFilesystemReadObserved:false,embeddedInstructionInterpreted:false,
    embeddedInstructionExecuted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
const CASES=Object.freeze([
  ...['ascii','unicode','padded','sentinel'].map(x=>[x,'PASS',
    'M12_MIRRORED_HEADERS_AND_TOOL_DATA_MATCH',1,0,0,1]),
  ...['missing-ticket','missing-memo','missing-boolean',
    'mismatch-ticket','mismatch-memo','mismatch-integer',
    'mismatch-boolean','malformed-sentinel','noncanonical-base64',
    'duplicate-parameter','unexpected-parameter','wrong-method',
    'wrong-name','wrong-version','wrong-origin','duplicate-json-key',
    'invalid-json'].map(x=>[x,'FAIL','M12_MIRROR_HEADER_MISMATCH',0,1,-32020,0]),
  ...['replayed-result','forged-result-authority','redirect','oversized']
    .map(x=>[x,'FAIL','M12_MIRROR_RESPONSE_REJECTED',1,0,0,0]),
  ['hang','FAIL','M12_MIRROR_RESPONSE_TIMEOUT',1,0,0,0]
]);
const ERROR=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M12_MIRROR_SELFTEST_UNAVAILABLE',scope:SCOPE,
  actualAgentBehaviorObserved:false,actualExternalMcpContacted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const desc=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(desc).length===1&&desc.length?.value===0;
}
export async function runFixedM12HeaderMirrorSelftest(args=[]){
  if(!noArgs(args))return ERROR;
  try{
    const fixture=await loadValidatedFixtureProposalFile(fileURLToPath(FILE));
    const rows=[];
    for(const [mode,status,rule,accepted,denied,serverCode,delivered] of CASES){
      const r=await runOwnedM12HeaderMirror(fixture,{
        fault:mode,deadlineMs:mode==='hang'?350:3000});
      const ok=r.status===status&&r.ruleCode===rule&&
        r.exitCode===(status==='PASS'?0:1)&&
        r.requestsReceived===1&&r.requestsAccepted===accepted&&
        r.requestsDenied===denied&&
        r.headerMismatchHttpCode===serverCode&&
        r.responsesClosed===1&&r.socketsClosed===1&&
        r.socketCleanupConfirmed===true&&
        r.toyGatewayDeliveries===delivered&&
        r.protectedFictionalEffectsCommitted===0&&
        r.actualAgentBehaviorObserved===false&&
        r.actualExternalMcpContacted===false;
      rows.push(Object.freeze({control:mode,expectedStatus:status,
        expectedRuleCode:rule,matched:ok}));
    }
    const matched=rows.filter(x=>x.matched).length;
    const pass=matched===CASES.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'M12_MIRROR_CONTROLS_MATCH':
        'M12_MIRROR_CONTROLS_MISMATCH',
      scope:SCOPE,checked:CASES.length,matched,
      expectedPositiveControls:4,expectedNegativeControls:CASES.length-4,
      negativeControlsMatched:rows.slice(4).filter(x=>x.matched).length,
      cases:Object.freeze(rows),actualAgentBehaviorObserved:false,
      actualExternalMcpContacted:false,
      realFilesystemReadObserved:false,embeddedInstructionExecuted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return ERROR;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runFixedM12HeaderMirrorSelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
