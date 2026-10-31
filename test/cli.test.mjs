import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
const cwd=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function cli(...args){return spawnSync(process.execPath,['src/cli.mjs',...args],{cwd,encoding:'utf8'});}
test('passing synthetic scenario yields exit 0',()=>assert.equal(cli('scenario','fixtures/scenario-denial.json').status,0));
test('recovery synthetic scenario yields exit 0',()=>assert.equal(cli('scenario','fixtures/scenario-recovery.json').status,0));
test('passing trace yields exit 0',()=>assert.equal(cli('trace','fixtures/trace-safe.jsonl').status,0));
test('failing trace yields exit 1',()=>assert.equal(cli('trace','fixtures/trace-unsafe.jsonl').status,1));
test('missing file returns exit 2 without echoing path',()=>{let r=cli('scenario','privatepath-SENTINEL.json');assert.equal(r.status,2);assert.equal(r.stderr.includes('privatepath-SENTINEL'),false)});
test('CLI blocks arbitrary subcommands',()=>assert.equal(cli('execute','notreal').status,2));
test('CLI requires exact args',()=>assert.equal(cli('scenario').status,2));
test('result excludes synthetic nonce values',()=>assert.equal(cli('scenario','fixtures/scenario-denial.json').stdout.includes('fictional-nonce'),false));
test('mock adapter access-boundary fixture exits 0',()=>assert.equal(cli('mock','fixtures/scenario-denial.json').status,0));
test('mock adapter recovery fixture exits 0',()=>assert.equal(cli('mock','fixtures/scenario-recovery.json').status,0));
test('mock adapter rejects malformed arguments with exit 2',()=>assert.equal(cli('mock','not-a-fixture.json').status,2));
test('mock result does not echo synthetic grant nonce',()=>{
 const r=cli('mock','fixtures/scenario-denial.json');
 assert.equal(r.status,0); assert.equal(r.stdout.includes('fictional-nonce'),false);
});

test('F1 start is synthetic, never an external check',()=>{
 const r=cli('start'),j=JSON.parse(r.stdout);
 assert.equal(r.status,0); assert.equal(j.command,'start');
 assert.equal(j.productStage,'F1'); assert.equal(j.status,'PASS');
 assert.equal(j.descriptorEvidence,'NOT_PROVIDED');
 assert.equal(j.externalTargetContacted,false);
 assert.equal(j.projectConnectionAuthorized,false);
});
test('F1 start validates inert descriptor and rejects private path',()=>{
 const ok=cli('start','examples/adapter-profiles/stdio-project.json');
 assert.equal(ok.status,0);
 assert.equal(JSON.parse(ok.stdout).descriptorEvidence,'DESCRIPTOR_VALIDATED');
 const bad=cli('start','private-F1-SENTINEL.json');
 assert.equal(bad.status,2);
 assert.ok(!bad.stdout.includes('private-F1-SENTINEL'));
 assert.ok(!bad.stderr.includes('private-F1-SENTINEL'));
 assert.equal(cli('start','--unsafe').status,2);
});

test('F1 text and JSON show the same fixed offline results',()=>{
 const json=JSON.parse(cli('start').stdout),r=cli('start','--text');
 assert.equal(r.status,json.exitCode);assert.equal(r.stderr,'');
 assert.match(r.stdout,/guided offline first run \(F1\)/);
 assert.match(r.stdout,/Bundled fictional controls: PASS/);
 assert.match(r.stdout,/Disposable local MCP mock: PASS/);
 assert.match(r.stdout,/User MCP server checked: NO/);
 assert.match(r.stdout,/NOT a security assessment/);
 assert.ok(!r.stdout.trimStart().startsWith('{'));
 const withFile=cli('start','examples/adapter-profiles/stdio-project.json','--text');
 assert.equal(withFile.status,0);assert.match(withFile.stdout,/Local descriptor: VALIDATED OFFLINE/);
 assert.ok(!withFile.stdout.includes('stdio-project.json'));
});
test('F1 text does not echo hostile arguments or accidental authority',()=>{
 for(const value of ['--execute','--text','https://private.example.org/mcp']){
  const r=cli('start',value,'--text');
  assert.equal(r.status,2);
  assert.equal(JSON.parse(r.stdout).status,'ERROR');
  assert.ok(!(r.stdout+r.stderr).includes(value==='--text'?'PRIVATE-SENTINEL':value));
 }
 const bad=cli('start','PRIVATE-DESCRIPTOR-MISSING.json','--text');
 assert.equal(bad.status,2);
 assert.ok(!(bad.stdout+bad.stderr).includes('PRIVATE-DESCRIPTOR-MISSING'));
 assert.equal(cli('start','--text','examples/adapter-profiles/stdio-project.json').status,2);
 assert.equal(cli('start','examples/adapter-profiles/stdio-project.json','--text','extra').status,2);
});

test('F1 packaged client-config import: inert stdio, HTTPS, text and rejection',()=>{
 const d=mkdtempSync(join(tmpdir(),'mcp-f1-import-'));
 const f=join(d,'config.json');
 const run=v=>{writeFileSync(f,JSON.stringify(v));return cli('start','--client-config',f);};
 try{
  for(const v of [
   {mcpServers:{local:{command:'node',args:['server.mjs']}}},
   {servers:{remote:{type:'http',url:'https://mcp.example.org/mcp'}}}
  ]){
   const p=run(v),j=JSON.parse(p.stdout);
   assert.equal(p.status,0,p.stderr);
   assert.equal(j.descriptorEvidence,'CLIENT_CONFIG_VALIDATED_OFFLINE');
   assert.equal(j.externalTargetContacted,false);
   assert.equal(j.projectConnectionAuthorized,false);
   assert.equal(j.operatorVerified,false);
   assert.ok(!p.stdout.includes('mcp.example.org'));
   assert.ok(!p.stdout.includes('server.mjs'));
   const t=cli('start','--client-config',f,'--text');
   assert.equal(t.status,0);assert.match(t.stdout,/CLIENT CONFIG VALIDATED OFFLINE/);
   assert.ok(!t.stdout.includes(f));
  }
  for(const v of [
   {mcpServers:{local:{command:'node',args:[],env:{SECRET:'private'}}}},
   {mcpServers:{a:{command:'node'},b:{command:'node'}}},
   {servers:{a:{type:'http',url:'http://127.0.0.1/mcp'}}},
   {servers:{a:{type:'http',url:'https://mcp.example.org/mcp',headers:{Authorization:'SECRET'}}}},
   {mcpServers:{a:{command:'node',args:['--eval','PRIVATE']}}}
  ]){
   const p=run(v);assert.equal(p.status,2);assert.equal(JSON.parse(p.stdout).status,'ERROR');
   assert.ok(!p.stdout.includes('SECRET')&&!p.stdout.includes('PRIVATE'));
  }
  assert.equal(cli('start','--client-config').status,2);
  assert.equal(cli('start','--client-config',f,'--execute').status,2);
 }finally{rmSync(d,{recursive:true,force:true});}
});

test('F1: explicit one-server choice from multi-entry client settings is inert',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mcp-f1-select-')),file=join(dir,'client.json');
 try{
  const fixture={servers:{
   chosen:{type:'stdio',command:'node',args:['server.mjs']},
   unselected:{type:'http',url:'https://mcp.example.org/mcp',
    headers:{Authorization:'PRIVATE_F1_CANARY'}}
  }};
  writeFileSync(file,JSON.stringify(fixture));
  const ambiguous=cli('start','--client-config',file);
  assert.equal(ambiguous.status,2);
  const selected=cli('start','--client-config',file,'--server','chosen');
  assert.equal(selected.status,0,selected.stderr);
  const report=JSON.parse(selected.stdout);
  assert.equal(report.selectionEvidence,'EXPLICIT_SERVER_SELECTED');
  assert.equal(report.descriptorEvidence,'CLIENT_CONFIG_VALIDATED_OFFLINE');
  assert.equal(report.externalTargetContacted,false);
  assert.equal(report.projectConnectionAuthorized,false);
  assert.equal(report.executionEnabled,false);
  assert.ok(!(selected.stdout+selected.stderr).includes('PRIVATE_F1_CANARY'));
  assert.ok(!(selected.stdout+selected.stderr).includes('chosen'));
  const t=cli('start','--client-config',file,'--server','chosen','--text');
  assert.equal(t.status,0,t.stderr);
  assert.match(t.stdout,/Server selection: EXPLICIT OFFLINE/);
  assert.ok(!t.stdout.includes('PRIVATE_F1_CANARY'));
  for(const choice of [
   ['missing'],['CHOSEN'],['--execute'],['../chosen'],['chosen','extra']
  ]){
   const bad=cli('start','--client-config',file,'--server',...choice);
   assert.equal(bad.status,2);
   assert.equal(JSON.parse(bad.stdout).status,'ERROR');
   assert.ok(!bad.stdout.includes('PRIVATE_F1_CANARY'));
  }
  fixture.servers.chosen={type:'stdio',command:'node',args:[],
   env:{TOKEN:'PRIVATE_F1_CANARY'}};
  writeFileSync(file,JSON.stringify(fixture));
  assert.equal(cli('start','--client-config',file,'--server','chosen').status,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
