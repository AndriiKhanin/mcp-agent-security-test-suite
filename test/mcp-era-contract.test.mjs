import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { auditMcpEraTranscript as audit } from '../src/mcp-era-contract.mjs';
const load = name => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url),'utf8'));
const copy = o => structuredClone(o);
const modern = load('mcp-modern-safe.json');
const legacy = load('mcp-legacy-safe.json');
const flags = x => audit(x).findings.map(i=>i.rule);
const has = (x,r) => flags(x).includes(r);
const cli = (mode,file) => spawnSync(process.execPath,['src/cli.mjs',mode,`fixtures/${file}`],{
  cwd:new URL('..',import.meta.url), encoding:'utf8'
});

test('modern 2026 profile passes without initialize handshake',()=>{
 const r=audit(modern); assert.equal(r.status,'PASS');assert.equal(r.era,'modern');assert.equal(r.discoveryObserved,true);
});
test('legacy 2025 profile passes with initialize and initialized',()=>assert.equal(audit(legacy).status,'PASS'));
test('modern inline request without discovery is permitted',()=>{
 const x=copy(modern);x.events=x.events.slice(2);assert.equal(audit(x).status,'PASS');
});
test('legacy tool request before handshake denied',()=>{
 const x=copy(legacy);x.events[0].message.method='tools/list';assert.ok(has(x,'LEGACY_OPERATION_BEFORE_INITIALIZED'));
});
test('legacy initialized notification before response denied',()=>{
 const x=copy(legacy);[x.events[1],x.events[2]]=[x.events[2],x.events[1]];assert.ok(has(x,'INITIALIZED_OUT_OF_ORDER'));
});
test('legacy missing initialized notification denied',()=>{
 const x=copy(legacy);x.events.splice(2,1);assert.ok(has(x,'LEGACY_NOT_INITIALIZED'));
});
test('modern initialize request explicitly rejected',()=>{
 const x=copy(modern);x.events[2].message.method='initialize';assert.ok(has(x,'LEGACY_HANDSHAKE_IN_MODERN'));
});
test('modern initialized notification explicitly rejected',()=>{
 const x=copy(modern);x.events.splice(2,0,{from:'client',message:{jsonrpc:'2.0',method:'notifications/initialized'}});
 assert.ok(has(x,'LEGACY_HANDSHAKE_IN_MODERN'));
});
test('modern missing per-request protocol version is rejected',()=>{
 const x=copy(modern);delete x.events[2].message.params._meta['io.modelcontextprotocol/protocolVersion'];
 assert.ok(has(x,'MISSING_PER_REQUEST_META'));
});
test('modern missing per-request capability set is rejected',()=>{
 const x=copy(modern);delete x.events[2].message.params._meta['io.modelcontextprotocol/clientCapabilities'];
 assert.ok(has(x,'MISSING_PER_REQUEST_META'));
});
test('modern wrong revision rejected on every request',()=>{
 const x=copy(modern);x.events[0].message.params._meta['io.modelcontextprotocol/protocolVersion']='2025-11-25';
 assert.ok(has(x,'MISSING_PER_REQUEST_META'));
});
test('modern malformed optional client info fails',()=>{
 const x=copy(modern);x.events[2].message.params._meta['io.modelcontextprotocol/clientInfo']={name:'invalid'};
 assert.ok(has(x,'INVALID_CLIENT_INFO'));
});
test('missing optional modern clientInfo is allowed (SHOULD vs MUST)',()=>{
 const x=copy(modern);delete x.events[2].message.params._meta['io.modelcontextprotocol/clientInfo'];
 assert.equal(audit(x).status,'PASS');
});
test('discovery must have request ID',()=>{
 const x=copy(modern);delete x.events[0].message.id;assert.ok(has(x,'DISCOVERY_MUST_BE_REQUEST'));
});
test('discovery reply requires resultType and other required fields',()=>{
 const x=copy(modern);delete x.events[1].message.result.resultType;
 assert.ok(has(x,'INVALID_MODERN_DISCOVERY_RESULT'));
});
test('discovery result must declare supportedVersions array',()=>{
 const x=copy(modern);x.events[1].message.result.supportedVersions=[];
 assert.ok(has(x,'INVALID_MODERN_DISCOVERY_RESULT'));
});
test('modern discovery supports cached public hint in test profile',()=>{
 const x=copy(modern);x.events[1].message.result.cacheScope='public';x.events[1].message.result.ttlMs=10;
 assert.equal(audit(x).status,'PASS');
});
test('modern ttl cannot be negative',()=>{
 const x=copy(modern);x.events[1].message.result.ttlMs=-1;
 assert.ok(has(x,'INVALID_MODERN_DISCOVERY_RESULT'));
});
test('legacy initialize params require clientInfo',()=>{
 const x=copy(legacy);delete x.events[0].message.params.clientInfo;
 assert.ok(has(x,'INVALID_LEGACY_INITIALIZE'));
});
test('legacy initialize response requires serverInfo',()=>{
 const x=copy(legacy);delete x.events[1].message.result.serverInfo;
 assert.ok(has(x,'INVALID_LEGACY_INITIALIZE_RESULT'));
});
test('legacy modern discovery is not the legacy handshake',()=>{
 const x=copy(legacy);x.events[3].message.method='server/discover';
 assert.ok(has(x,'MODERN_DISCOVERY_IN_LEGACY'));
});
test('legacy ping before initialization is allowed by test profile',()=>{
 const x=copy(legacy);x.events.unshift({from:'client',message:{jsonrpc:'2.0',method:'ping'}});
 assert.equal(audit(x).status,'PASS');
});
test('duplicate request ID rejected',()=>{
 const x=copy(modern);x.events[2].message.id='d1';
 assert.ok(has(x,'DUPLICATE_REQUEST_ID'));
});
test('unmatched response rejected',()=>{
 const x=copy(modern);x.events[3].message.id='unexpected';
 assert.ok(has(x,'UNMATCHED_SERVER_RESPONSE'));assert.ok(has(x,'MISSING_RESPONSE'));
});
test('missing server response rejected',()=>{
 const x=copy(modern);x.events.pop();assert.ok(has(x,'MISSING_RESPONSE'));
});
test('invalid server error shape rejected without leaking message',()=>{
 const x=copy(modern);delete x.events[3].message.result;x.events[3].message.error={code:'bad',message:'SYNTHETIC_SECRET_MARKER'};
 const r=audit(x);assert.ok(r.findings.some(f=>f.rule==='INVALID_SERVER_ERROR'));
 assert.equal(JSON.stringify(r).includes('SYNTHETIC_SECRET_MARKER'),false);
});
test('server-origin unsolicited method rejected',()=>{
 const x=copy(modern);x.events[3].message={jsonrpc:'2.0',id:7,method:'tools/call'};
 assert.ok(has(x,'INVALID_SERVER_RESPONSE'));
});
test('strict transcript length is bounded',()=>{
 const x=copy(modern);x.events=Array(257).fill(x.events[0]);
 assert.throws(()=>audit(x),/INVALID_MCP_ERA_TRANSCRIPT/);
});
test('empty transcript is not successful',()=>{
 assert.throws(()=>audit({era:'modern',events:[]}),/INVALID_MCP_ERA_TRANSCRIPT/);
});
test('modern wrong event direction rejected',()=>{
 const x=copy(modern);x.events[0].from='thirdParty';
 assert.ok(has(x,'INVALID_EVENT'));
});
test('CLI modern and legacy safe fixtures exit 0',()=>{
 for(const f of ['mcp-modern-safe.json','mcp-legacy-safe.json']){
  const result=cli('era',f);assert.equal(result.status,0,result.stderr);
 }
});
test('CLI unsafe fixtures exit 1 with bounded findings',()=>{
 for(const f of ['mcp-modern-unsafe.json','mcp-legacy-unsafe.json']){
  const result=cli('era',f);assert.equal(result.status,1,result.stderr);
  assert.equal(result.stdout.includes('SYNTHETIC_SECRET_MARKER'),false);
 }
});
test('CLI missing path exits 2 without echo',()=>{
 const result=cli('era','private-path-do-not-print.json');
 assert.equal(result.status,2);assert.equal(result.stderr.includes('private-path-do-not-print'),false);
});
