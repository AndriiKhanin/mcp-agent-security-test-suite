/**
 * M4-B6-D first-party protocol checks. All connections use only the bound
 * 127.0.0.1 port of the reviewed temporary in-repository staging mock.
 * This is NOT an external MCP-target client, server scanner or OS sandbox.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { runFirstPartyStagingSelftest } from '../src/first-party-staging-mcp.mjs';
import { observeFirstPartyMockAttempts } from '../src/mock-attempt-observer.mjs';

const VERSION='2026-07-28',METHOD='server/discover';
const request=()=>({jsonrpc:'2.0',id:1,method:METHOD,params:{_meta:{
  'io.modelcontextprotocol/protocolVersion':VERSION,
  'io.modelcontextprotocol/clientInfo':{name:'fixed-staging-client',version:'1'},
  'io.modelcontextprotocol/clientCapabilities':{}
}}});
function send(port,{method='POST',data=request(),version=VERSION,
  headerMethod=METHOD,duplicate=false}={}){
  const raw=JSON.stringify(data);
  const headers=[
    ['Host','127.0.0.1:'+port],['Origin','http://127.0.0.1'],
    ['Content-Type','application/json'],
    ['Accept','application/json, text/event-stream'],
    ...(version===null?[]:[['MCP-Protocol-Version',version]]),
    ...(headerMethod===null?[]:[['Mcp-Method',headerMethod]]),
    ['Content-Length',String(Buffer.byteLength(raw))]
  ];
  if(duplicate)headers.push(['Mcp-Method',METHOD]);
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,method,
      path:'/mcp',headers,agent:false,timeout:1600},res=>{
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{
        bytes+=chunk.length;
        if(bytes>4096){res.destroy();reject(new Error('TEST_RESPONSE_LIMIT'));}
        else chunks.push(chunk);
      });
      res.once('end',()=>{
        try{resolve({status:res.statusCode,
          response:JSON.parse(Buffer.concat(chunks).toString('utf8'))});}
        catch{reject(new Error('TEST_RESPONSE_INVALID'));}
      });
    });
    req.once('error',reject);
    req.once('timeout',()=>req.destroy(new Error('TEST_LOCAL_TIMEOUT')));
    req.end(method==='POST'?raw:undefined);
  });
}
async function contact(fn){
  let observed=null;
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runFirstPartyStagingSelftest({onBound:async({host,port})=>{
      assert.equal(host,'127.0.0.1');
      observed=await fn(port);
    }}));
  assert.equal(result.status,'FAIL'); // default probe is request #2 or later
  assert.equal(result.externalTargetContacted,false);
  assert.deepEqual(attempts,['staging-bind','staging-request']);
  return {observed,result};
}
test('M4-B6-D: missing MCP-Protocol-Version header is 400/-32020',async()=>{
  const {observed,result}=await contact(port=>send(port,{version:null}));
  assert.equal(observed.status,400);
  assert.equal(observed.response.error.code,-32020);
  assert.equal(result.accepted,0);
});

test('M4-B6-D: missing Mcp-Method header is 400/-32020',async()=>{
  const {observed,result}=await contact(port=>send(port,{headerMethod:null}));
  assert.equal(observed.status,400);
  assert.equal(observed.response.error.code,-32020);
  assert.equal(result.accepted,0);
});

test('M4-B6-D: disagreement between version header and _meta is 400/-32020',async()=>{
  const {observed,result}=await contact(port=>send(port,{version:'2025-11-25'}));
  assert.equal(observed.status,400);
  assert.equal(observed.response.error.code,-32020);
  assert.equal(result.accepted,0);
});

test('M4-B6-D: unsupported version with matching metadata is 400/-32022',async()=>{
  const data=request();
  data.params._meta['io.modelcontextprotocol/protocolVersion']='2099-01-01';
  const {observed,result}=await contact(port=>send(port,{data,version:'2099-01-01'}));
  assert.equal(observed.status,400);
  assert.equal(observed.response.error.code,-32022);
  assert.deepEqual(observed.response.error.data,{
    supported:[VERSION],requested:'2099-01-01'
  });
  assert.equal(result.accepted,0);
});

test('M4-B6-D: unknown method with matching headers is 404/-32601',async()=>{
  const data=request();data.method='tools/call';
  const {observed,result}=await contact(port=>send(port,{
    data,headerMethod:'tools/call'
  }));
  assert.equal(observed.status,404);
  assert.equal(observed.response.error.code,-32601);
  assert.equal(result.accepted,0);
});

test('M4-B6-D: duplicate mirrored header denied as 400/-32020',async()=>{
  const {observed,result}=await contact(port=>send(port,{duplicate:true}));
  assert.equal(observed.status,400);
  assert.equal(observed.response.error.code,-32020);
  assert.equal(result.accepted,0);
});

test('M4-B6-D: method header diverging from body is 400, not 404',async()=>{
  const {observed,result}=await contact(port=>send(port,{
    headerMethod:'tools/call'
  }));
  assert.equal(observed.status,400);
  assert.equal(observed.response.error.code,-32020);
  assert.equal(result.accepted,0);
});

test('M4-B6-D: missing body version is HeaderMismatch',async()=>{
  const data=request();
  delete data.params._meta['io.modelcontextprotocol/protocolVersion'];
  const {observed,result}=await contact(port=>send(port,{data}));
  assert.equal(observed.status,400);
  assert.equal(observed.response.error.code,-32020);
  assert.equal(result.accepted,0);
});

test('M4-B6-D: fixed server rejects a second discovery',async()=>{
  let first,second;
  const {result}=await contact(async port=>{
    first=await send(port);second=await send(port);
    return second;
  });
  assert.equal(first.status,200);
  assert.equal(first.response.result.resultType,'complete');
  assert.equal(second.status,403);
  assert.equal(result.accepted,1);
  assert.equal(result.received,3);
});

test('M4-B6-D: GET cannot dispatch discovery',async()=>{
  const {observed,result}=await contact(port=>send(port,{method:'GET'}));
  assert.equal(observed.status,403);
  assert.equal(result.accepted,0);
});

test('M4-B6-D: invalid SSE sequencing fails closed',async()=>{
  for(const fault of ['response-sse-extra','response-sse-missing-final',
    'response-sse-unsolicited']){
    const r=await runFirstPartyStagingSelftest({fault});
    assert.equal(r.status,'FAIL',fault);
    assert.equal(r.accepted,1,fault);
    assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH',fault);
    assert.ok(!JSON.stringify(r).includes('sampling/createMessage'));
  }
});

test('M4-B6-D: wrong response profile or Content-Type cannot pass',async()=>{
  for(const fault of ['response-version','response-content-type']){
    const r=await runFirstPartyStagingSelftest({fault});
    assert.equal(r.status,'FAIL',fault);
    assert.equal(r.findings[0].rule,'STAGING_RESPONSE_MISMATCH',fault);
    assert.ok(!JSON.stringify(r).includes('fixed-staging-server'));
  }
});

test('M4-B6-D: baseline fixed JSON and SSE still pass with one request',async()=>{
  const [json,sse]=await Promise.all([
    runFirstPartyStagingSelftest(),runFirstPartyStagingSelftest({fault:'sse'})
  ]);
  for(const r of [json,sse]){
    assert.equal(r.status,'PASS');
    assert.equal(r.accepted,1);
    assert.equal(r.received,1);
    assert.equal(r.externalTargetContacted,false);
  }
});
