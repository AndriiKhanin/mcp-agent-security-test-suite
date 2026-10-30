/** M34: safely import common MCP client config without target execution. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {inspectClientConfig,convertClientConfig,runClientConfigBridge}
  from '../tools/m34-client-config-bridge.mjs';
import {inspectStdinAdapterDescriptor}
  from '../tools/m24-stdin-adapter-preflight.mjs';
import {observeFirstPartyMockAttempts}
  from '../src/mock-attempt-observer.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const configs=()=>[
  {mcpServers:{'safe-local':{command:'node',args:['server.mjs']}}},
  {mcpServers:{'safe-npx':{command:'npx',
    args:['-y','@modelcontextprotocol/server-memory']}}},
  {servers:{'safe-vscode':{type:'stdio',
    command:'node',args:['server.mjs']}}},
  {servers:{'safe-http':{type:'http',
    url:'https://mcp.example.org/mcp'}}},
  {mcpServers:{'safe-remote':{type:'streamable-http',
    url:'https://mcp.example.org/mcp'}}}
];
const cli=(payload,...args)=>spawnSync(process.execPath,
  ['tools/m34-client-config-bridge.mjs',...args],{
    cwd:root,encoding:'utf8',
    input:payload,shell:false,timeout:20000,
    maxBuffer:16000,windowsHide:true,env:{...process.env,NODE_OPTIONS:''}
  });
const parse=result=>JSON.parse(result.stdout);
function assertSafeReport(report){
  assert.equal(report.reportSchemaVersion,1);
  assert.equal(report.profile,'m34-offline-client-config-bridge-v1');
  assert.equal(report.status,'PASS');
  assert.equal(report.exitCode,0);
  assert.equal(report.ruleCode,'CLIENT_CONFIG_CONVERTIBLE_OFFLINE_ONLY');
  assert.equal(report.protocolVersion,'2026-07-28');
  assert.equal(report.declaredProtocolNegotiated,false);
  assert.equal(report.checkedFictionalControls,5);
  assert.equal(report.descriptorEvidence,'CONVERTIBLE_AND_VALIDATE_ONLY');
  assert.equal(report.realProjectEvidence,'NOT_EVALUATED');
  assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
  for(const k of ['externalTargetContacted','processSpawned',
    'projectConnectionAuthorized','realProjectAssessed',
    'operatorVerified','securityCertified'])
    assert.equal(report[k],false,k);
}
function assertInvalid(result){
  assert.equal(result.status,2,result.stderr);
  assert.equal(result.stderr,'');
  const report=parse(result);
  assert.equal(report.status,'ERROR');
  assert.equal(report.ruleCode,'M34_INVALID_OR_UNSUPPORTED_CLIENT_CONFIG');
  assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(report.externalTargetContacted,false);
  assert.equal(report.processSpawned,false);
  return report;
}

test('M34-A: imported Claude/VS Code stdio and HTTP shapes pass existing M24 gate without contacts',async()=>{
  for(const source of configs()){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>inspectClientConfig(source)
    );
    assertSafeReport(result);
    assert.deepEqual(attempts,[]);
    const descriptor=convertClientConfig(source);
    const legacy=inspectStdinAdapterDescriptor(descriptor);
    assert.equal(legacy.status,'PASS');
    assert.equal(legacy.checked,5);
    assert.equal(legacy.connectionStatus,'NOT_ATTEMPTED');
    assert.equal(descriptor.policy.mode,'validate-only');
    assert.equal(descriptor.policy.allowToolCalls,false);
    const input=JSON.stringify(source);
    const c=cli(input);
    assert.equal(c.error,undefined);
    assert.equal(c.status,0,c.stderr||c.stdout);
    assert.equal(c.stderr,'');
    assert.deepEqual(parse(c),result);
    assert.ok(!c.stdout.includes('safe-'));
    assert.ok(!c.stdout.includes('https://'));
    assert.ok(!c.stdout.includes('server.mjs'));
    assert.ok(!c.stdout.includes('modelcontextprotocol'));
  }
});

test('M34-B: only exact explicit export emits an inert normalized descriptor, round-trips through M24',()=>{
  for(const source of configs()){
    const output=cli(JSON.stringify(source),'--emit-descriptor');
    assert.equal(output.status,0,output.stderr||output.stdout);
    assert.equal(output.stderr,'');
    const descriptor=parse(output);
    assert.deepEqual(descriptor,convertClientConfig(source));
    assert.equal(descriptor.adapterSchemaVersion,1);
    assert.equal(descriptor.protocolVersion,'2026-07-28');
    assert.deepEqual(descriptor.policy,{
      mode:'validate-only',allowNetwork:false,allowProcessSpawn:false,
      allowToolCalls:false,allowCredentials:false
    });
    const checked=cli(JSON.stringify(source));
    assertSafeReport(parse(checked));
    const m24=spawnSync(process.execPath,
      ['tools/m24-stdin-adapter-preflight.mjs'],{
        cwd:root,encoding:'utf8',input:output.stdout,
        shell:false,timeout:20000,windowsHide:true,
        env:{...process.env,NODE_OPTIONS:''}
      });
    assert.equal(m24.status,0,m24.stderr||m24.stdout);
    assert.equal(JSON.parse(m24.stdout).status,'PASS');
    assert.equal(JSON.parse(m24.stdout).externalTargetContacted,false);
  }
});

test('M34-B: ambiguous targets, env and secret fields fail closed without echo',()=>{
  const forbidden=[
    {mcpServers:{}},
    {servers:{}},
    {mcpServers:{one:{command:'node'},two:{command:'npx'}}},
    {mcpServers:{'private-user':{command:'node',env:{API_KEY:'PRIVATE_CANARY'}}}},
    {servers:{one:{type:'stdio',command:'node',envFile:'.env'}}},
    {servers:{one:{type:'stdio',command:'node',args:['--token=PRIVATE_CANARY']}}},
    {mcpServers:{one:{command:'node',args:['/home/private/server.mjs']}}},
    {servers:{one:{type:'stdio',command:'node',args:['../secret']}}},
    {servers:{one:{type:'stdio',command:'node',args:['-e','PRIVATE_CANARY']}}},
    {mcpServers:{one:{command:'node -e PRIVATE_CANARY'}}},
    {servers:{one:{type:'stdio',command:'/usr/bin/node',args:['server.mjs']}}},
    {servers:{one:{type:'stdio',command:'node',args:['--require']}}},
    {servers:{one:{type:'http',url:'http://example.org/mcp'}}},
    {servers:{one:{type:'http',url:'https://example.org/mcp?token=PRIVATE_CANARY'}}},
    {servers:{one:{type:'http',url:'https://user:pass@example.org/mcp'}}},
    {servers:{one:{type:'http',url:'https://example.org/mcp',
      headers:{Authorization:'Bearer PRIVATE_CANARY'}}}},
    {servers:{one:{type:'sse',url:'https://example.org/mcp'}}},
    {servers:{one:{type:'http',url:'https://127.0.0.1/mcp'}}},
    {servers:{one:{type:'http',url:'https://internal.local/mcp'}}},
    {servers:{one:{type:'http',url:'https://example.org/mcp#fragment'}}},
    {mcpServers:{one:{command:'node',args:['server.mjs'],disabled:true}}},
    {mcpServers:{one:{command:'node',args:[]}},policy:{allowToolCalls:true}},
    {mcpServers:{'../private':{command:'node',args:['server.mjs']}}},
    {servers:{one:{command:'node',args:['server.mjs']}}},
    {servers:{one:{type:'stdio',command:'node',args:[],
      authorization:{approved:true}}}},
    {mcpServers:{one:{type:'http',url:'https://example.org/mcp',
      bearerToken:'PRIVATE_CANARY'}}}
  ];
  for(const [i,source] of forbidden.entries()){
    const text=JSON.stringify(source);
    for(const args of [[],['--emit-descriptor']]){
      const output=cli(text,...args);
      assertInvalid(output);
      assert.ok(!output.stdout.includes('PRIVATE_CANARY'),String(i));
      assert.ok(!output.stdout.includes('example.org'),String(i));
    }
    assert.equal(inspectClientConfig(source).status,'ERROR',String(i));
  }
});

test('M34-B: duplicate JSON keys, oversize, wrong UTF-8 and CLI flags all reject generically',()=>{
  for(const input of [
    '',' ','{','[]','null','{"mcpServers":{},"mcpServers":{}}',
    Buffer.from([0x7b,0x22,0xc3,0x28,0x22,0x7d]),
    Buffer.alloc(4097,0x20),
    '{"mcpServers":{"one":{"command":"node","command":"secret"}}}',
    JSON.stringify(configs()[0])+' garbage'
  ])assertInvalid(cli(input));
  const text=JSON.stringify(configs()[0]);
  for(const args of [
    ['--help'],['--target=https://PRIVATE_CANARY'],
    ['--emit-descriptor','--unsafe'],['--emit-descriptor','--emit-descriptor'],
    ['../PRIVATE_CANARY'],['--config','PRIVATE_CANARY']
  ]){
    const response=cli(text,...args);
    assertInvalid(response);
    assert.ok(!response.stdout.includes('PRIVATE_CANARY'));
  }
});

test('M34-B: JS inputs with getters, inheritance and sparse arrays never trigger untrusted accessors',()=>{
  const own=configs()[0];let called=0;
  Object.defineProperty(own.mcpServers['safe-local'],'command',{
    enumerable:true,get(){called++;throw Error('PRIVATE_CANARY');}
  });
  const a=inspectClientConfig(own);
  assert.equal(a.status,'ERROR');
  assert.equal(called,0);
  assert.ok(!JSON.stringify(a).includes('PRIVATE_CANARY'));
  assert.equal(inspectClientConfig(Object.create(configs()[0])).status,'ERROR');
  const accessors=configs()[3];
  Object.defineProperty(accessors.servers,'safe-http',{
    enumerable:true,get(){called++;throw Error('PRIVATE_CANARY');}
  });
  assert.equal(inspectClientConfig(accessors).status,'ERROR');
  assert.equal(called,0);
  const sparse=configs()[0];
  sparse.mcpServers['safe-local'].args=new Array(2);
  sparse.mcpServers['safe-local'].args[0]='server.mjs';
  assert.equal(inspectClientConfig(sparse).status,'ERROR');
});

test('M34-B: streamed chunks allowed, TTY or nonbuffer/extra args denied',async()=>{
  const encoded=JSON.stringify(configs()[3]);
  const good=await runClientConfigBridge([],Readable.from([
    Buffer.from(encoded.slice(0,10)),Buffer.from(encoded.slice(10))
  ]));
  assertSafeReport(good);
  assert.equal(good.transport,'streamable-http');
  const out=await runClientConfigBridge(['--emit-descriptor'],
    Readable.from([Buffer.from(encoded)]));
  assert.equal(inspectStdinAdapterDescriptor(out).status,'PASS');
  const tty=Readable.from([Buffer.from(encoded)]);tty.isTTY=true;
  assert.equal((await runClientConfigBridge([],tty)).status,'ERROR');
  const invalid=await runClientConfigBridge(['--token=PRIVATE_CANARY'],
    Readable.from([Buffer.from(encoded)]));
  assert.equal(invalid.status,'ERROR');
  const empty=await runClientConfigBridge([],Readable.from([]));
  assert.equal(empty.status,'ERROR');
  const strings=await runClientConfigBridge([],Readable.from([encoded]));
  assert.equal(strings.status,'ERROR');
});

test('M34-C: importer stays source-only outside 80 file npm candidate',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
  const files=JSON.parse(readFileSync(
    new URL('./expected-package-files.json',import.meta.url)));
  assert.equal(files.length,80);
  assert.equal(pkg.version,'0.0.10-rc.1');
  assert.ok(!files.includes('tools/m34-client-config-bridge.mjs'));
  assert.ok(!files.includes('test/m34-client-config-bridge.test.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('.github'));
  const source=readFileSync(
    new URL('../tools/m34-client-config-bridge.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,
    /from ['"]node:(?:http|https|net|tls|child_process|fs|fs\/promises)['"]/u);
  assert.doesNotMatch(source,
    /\b(?:fetch|spawn|execFile|createConnection|writeFile|readFile)\s*\(/u);
});
