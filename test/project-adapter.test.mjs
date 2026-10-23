import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve,dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectProjectAdapter, ADAPTER_TRANSPORTS, ADAPTER_PROTOCOLS }
  from '../src/project-adapter.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixture=type=>JSON.parse(readFileSync(join(root,'examples','adapter-profiles',
  type==='stdio'?'stdio-project.json':'streamable-http-project.json'),'utf8'));
const run=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:15000,maxBuffer:65536
});
const denied=x=>assert.throws(()=>inspectProjectAdapter(x),/INVALID_PROJECT_ADAPTER_CONFIG/);

test('M4-B0: both portable transport descriptors validate without connecting',()=>{
  assert.deepEqual(ADAPTER_TRANSPORTS,['stdio','streamable-http']);
  assert.deepEqual(ADAPTER_PROTOCOLS,['2025-11-25','2026-07-28']);
  for(const type of ADAPTER_TRANSPORTS) {
    const x=fixture(type);
    const v=inspectProjectAdapter(x);
    assert.equal(v.status,'PASS');
    assert.equal(v.adapterSchemaVersion,1);
    assert.equal(v.transport,type);
    assert.equal(v.protocolVersion,'2026-07-28');
    assert.equal(v.connectionStatus,'NOT_ATTEMPTED');
    assert.equal(v.executionEnabled,false);
    assert.deepEqual(v.capabilities,['DESCRIPTOR_VALIDATED']);
    assert.ok(!JSON.stringify(v).includes(x.project.name));
    assert.ok(!JSON.stringify(v).includes('mcp.example.org'));
    if(type==='stdio') assert.ok(!JSON.stringify(v).includes(x.transport.command));
  }
});

test('M4-B0: CLI checks both sample projects with v1 sanitized NOT_ATTEMPTED result',()=>{
  for(const file of ['stdio-project.json','streamable-http-project.json']) {
    const runResult=run('adapter-check',join('examples','adapter-profiles',file));
    assert.equal(runResult.status,0,runResult.stderr);
    const result=JSON.parse(runResult.stdout);
    assert.equal(result.reportSchemaVersion,1);
    assert.equal(result.command,'adapter-check');
    assert.equal(result.status,'PASS');
    assert.equal(result.connectionStatus,'NOT_ATTEMPTED');
    assert.equal(result.executionEnabled,false);
    assert.equal(result.exitCode,0);
    assert.ok(!runResult.stdout.includes('mcp.example.org'));
    assert.ok(!runResult.stdout.includes('server.mjs'));
    assert.deepEqual(result.summary.ruleCodes,[]);
  }
});

test('M4-B0: unknown transport/schema/protocol/keys or malformed nested structure fail closed',()=>{
  const c=fixture('stdio');
  for(const mutation of [
    {...c,adapterSchemaVersion:2},
    {...c,protocolVersion:'2028-01-01'},
    {...c,transport:{type:'unapproved-plugin'}},
    {...c,project:{...c.project,privatePath:'private'}},
    {...c,extra:'SYNTHETIC_TOKEN'},
    {...c,policy:{...c.policy,allowNetwork:true}},
    {...c,policy:{...c.policy,allowToolCalls:true}},
    {...c,policy:{...c.policy,allowProcessSpawn:true}},
    {...c,policy:{...c.policy,allowCredentials:true}},
    {...c,policy:{...c.policy,mode:'connect'}},
    {...c,project:null},
    {...c,project:{name:'private/name'}},
  ]) denied(mutation);
});

test('M4-B0: stdio descriptors cannot inject env, shell, eval or token-like argv',()=>{
 const c=fixture('stdio');
 const variants=[
   {...c.transport,command:'node && curl private'},
   {...c.transport,command:'/usr/bin/node'},
   {...c.transport,args:['-e','process.exit()']},
   {...c.transport,args:['--token=FICTIONAL_PRIVATE']},
   {...c.transport,args:['--secret=FICTIONAL_PRIVATE']},
   {...c.transport,args:['--exec','code']},
   {...c.transport,args:Array(13).fill('file.mjs')},
   {...c.transport,args:['contains\nnewline']},
   {...c.transport,env:{AWS_TOKEN:'FICTIONAL_PRIVATE'}},
 ];
 for(const transport of variants) denied({...c,transport});
});

test('M4-B0: HTTP descriptors deny credential URLs, private hosts and ambiguous paths',()=>{
 const c=fixture('streamable-http');
 const addresses=[
   'http://mcp.example.org/mcp',
   'https://user:fake-secret@mcp.example.org/mcp',
   'https://127.0.0.1/mcp',
   'https://192.168.1.5/mcp',
   'https://[::1]/mcp',
   'https://localhost/mcp',
   'https://mcp.local/mcp',
   'https://mcp.example.org:8080/mcp',
   'https://mcp.example.org/mcp?access_token=FICTIONAL',
   'https://mcp.example.org/mcp#private',
   'https://mcp.example.org/%2e%2e/private',
   'https://mcp.example.org/a/../mcp',
   'https://mcp.example.org//mcp',
   'https://xn--example.org/mcp'
 ];
 for(const endpoint of addresses) denied({...c,transport:{...c.transport,endpoint}});
});

test('M4-B0: unsupported argument/error never echoes a supplied private profile path',()=>{
 for(const args of [
   ['adapter-check'],
   ['adapter-check','fictional-private.json','--execute'],
   ['adapter-check','--url=https://private.example.org/mcp'],
   ['adapter-check','fictional-private-nonexistent.json']
 ]) {
   const x=run(...args);
   assert.equal(x.status,2);
   const result=JSON.parse(x.stdout);
   assert.equal(result.status,'ERROR');
   assert.equal(result.exitCode,2);
   assert.ok(['INVALID_CLI_ARGUMENTS','INVALID_OR_UNREADABLE_INPUT'].includes(result.errorCode));
   assert.ok(!(x.stdout+x.stderr).includes('fictional-private'));
 }
});

test('M4-B0: validator result cannot authorize target execution or claim consent',()=>{
 const c=fixture('streamable-http');
 const edited={...c,protocolVersion:'2025-11-25'};
 const v=inspectProjectAdapter(edited);
 assert.equal(v.connectionStatus,'NOT_ATTEMPTED');
 assert.equal(v.executionEnabled,false);
 assert.deepEqual(v.capabilities,['DESCRIPTOR_VALIDATED']);
 assert.ok(!Object.hasOwn(v,'ownershipConfirmed'));
 assert.ok(!Object.hasOwn(v,'connected'));
 assert.ok(!Object.hasOwn(v,'endpoint'));
});
