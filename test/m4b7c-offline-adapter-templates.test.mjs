/**
 * M4-B7-C: literal offline descriptor template generation only.
 * No spawning user programs, DNS, sockets, raw customer input, or filesystem
 * writes in the generator. Never treat a generated template as authorization.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOfflineAdapterTemplate,inspectProjectAdapter,
  previewProjectOnboarding} from '../src/project-adapter.mjs';
import {observeFirstPartyMockAttempts}
  from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:65536
});
const fixedTypes=['stdio','streamable-http'];
function safety(report){
  assert.equal(report.status,'PASS');
  assert.equal(report.profile,'offline-adapter-template-v1');
  assert.equal(report.templateSchemaVersion,1);
  assert.equal(report.descriptorEvidence,'FICTIONAL_TEMPLATE_VALIDATED');
  assert.equal(report.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
  assert.equal(report.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
  assert.equal(report.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(report.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(report.executionEnabled,false);
  assert.equal(report.projectConnectionAuthorized,false);
  assert.equal(report.externalTargetContacted,false);
  assert.equal(report.operatorVerified,false);
  assert.equal(report.nextAction,
    'COPY_TEMPLATE_OBJECT_TO_LOCAL_FILE_THEN_RUN_ADAPTER_ONBOARD');
  assert.deepEqual(report.findings,[]);
  assert.equal(report.failureCount,0);
  assert.deepEqual(report.template.policy,{
    mode:'validate-only',
    allowNetwork:false,
    allowProcessSpawn:false,
    allowToolCalls:false,
    allowCredentials:false
  });
  assert.equal(report.template.protocolVersion,'2026-07-28');
}
test('M4-B7-C: stdio template has inert literal command and no credentials',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>createOfflineAdapterTemplate('stdio'));
  safety(result);
  assert.equal(result.transport,'stdio');
  assert.deepEqual(result.template.transport,{
    type:'stdio',command:'node',args:['server.mjs']
  });
  assert.deepEqual(attempts,[]);
});
test('M4-B7-C: HTTPS template remains fictional, validated and never resolved',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>createOfflineAdapterTemplate('streamable-http'));
  safety(result);
  assert.equal(result.transport,'streamable-http');
  assert.deepEqual(result.template.transport,{
    type:'streamable-http',endpoint:'https://mcp.example.org/mcp'
  });
  assert.deepEqual(attempts,[]);
});
test('M4-B7-C: both pure templates roundtrip through unchanged descriptor validator',()=>{
  for(const type of fixedTypes){
    const result=createOfflineAdapterTemplate(type);
    const preview=previewProjectOnboarding(structuredClone(result.template));
    safety(result);
    assert.equal(preview.status,'PASS');
    assert.equal(preview.connectionStatus,'NOT_ATTEMPTED');
    assert.equal(preview.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
    assert.equal(preview.operatorEvidence,'OPERATOR_NOT_VERIFIED');
    assert.equal(inspectProjectAdapter(result.template).transport,type);
  }
});
test('M4-B7-C: CLI emits bounded versioned template report only for two selectors',()=>{
  for(const type of fixedTypes){
    const p=cli('adapter-template',type);
    assert.equal(p.error,undefined);
    assert.equal(p.status,0,p.stderr);
    const r=JSON.parse(p.stdout);
    safety(r);
    assert.equal(r.transport,type);
    assert.equal(r.command,'adapter-template');
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.exitCode,0);
    assert.deepEqual(r.summary.ruleCodes,[]);
    assert.ok(!p.stdout.includes('secret='));
  }
});
test('M4-B7-C: output can be copied as template object and validated offline',()=>{
  const tmp=mkdtempSync(join(tmpdir(),'mcp-template-test-'));
  try{
    for(const type of fixedTypes){
      const tpl=JSON.parse(cli('adapter-template',type).stdout).template;
      const filename=join(tmp,type==='stdio'?'stdio.json':'http.json');
      writeFileSync(filename,JSON.stringify(tpl));
      const p=cli('adapter-onboard',filename);
      assert.equal(p.status,0,p.stderr);
      const r=JSON.parse(p.stdout);
      assert.equal(r.command,'adapter-onboard');
      assert.equal(r.descriptorEvidence,'DESCRIPTOR_VALIDATED');
      assert.equal(r.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
      assert.equal(r.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
      assert.equal(r.operatorEvidence,'OPERATOR_NOT_VERIFIED');
      assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
      assert.ok(!p.stdout.includes(filename));
    }
  }finally{rmSync(tmp,{recursive:true,force:true});}
});
test('M4-B7-C: each template invocation is independent, no mutable singleton',()=>{
  const a=createOfflineAdapterTemplate('stdio');
  a.template.project.name='PRIVATE_USER_INPUT';
  a.template.transport.command='evil';
  a.template.policy.allowNetwork=true;
  const b=createOfflineAdapterTemplate('stdio');
  safety(b);
  assert.equal(b.template.transport.command,'node');
  assert.equal(b.template.project.name,'fictional-stdio-project');
  assert.equal(b.template.policy.allowNetwork,false);
});
test('M4-B7-C: unknown selector and caller-supplied injected data fail before effects',async()=>{
  for(const input of [
    null,undefined,[],{},0,'', 'ssh','tcp','node','stdio;bad',
    'https://customer.example.org/mcp','--endpoint=customer.invalid',
    '--eval','--credentials','STDIO','streamable-http\n','localhost',
    {type:'stdio'},new String('stdio')
  ]){
    const {attempts}=await observeFirstPartyMockAttempts(()=>{
      assert.throws(()=>createOfflineAdapterTemplate(input),
        /INVALID_ADAPTER_TEMPLATE_TYPE/);
    });
    assert.deepEqual(attempts,[]);
  }
});
test('M4-B7-C: CLI rejects arbitrary URLs, paths, flags and extra arguments',()=>{
  for(const args of [
    ['adapter-template'],['adapter-template','not-a-template'],
    ['adapter-template','stdio','--exec=fictional'],
    ['adapter-template','https://private.example.org/mcp'],
    ['adapter-template','--token=PRIVATE_FICTIONAL'],
    ['adapter-template','streamable-http','--output=private-file'],
    ['adapter-template','stdio','../../sensitive-file'],
  ]){
    const p=cli(...args);
    assert.equal(p.status,2,args.join(' '));
    const data=JSON.parse(p.stdout);
    assert.equal(data.status,'ERROR');
    assert.equal(data.command,'adapter-template');
    assert.equal(data.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!p.stdout.includes('PRIVATE_FICTIONAL'));
    assert.ok(!p.stderr.includes('PRIVATE_FICTIONAL'));
    assert.ok(!p.stdout.includes('sensitive-file'));
  }
});
test('M4-B7-C: descriptor flags cannot be changed into executable authorization',()=>{
  for(const type of fixedTypes){
    const doc=createOfflineAdapterTemplate(type).template;
    for(const key of ['allowNetwork','allowProcessSpawn','allowToolCalls','allowCredentials']){
      const altered=structuredClone(doc);
      altered.policy[key]=true;
      assert.throws(()=>inspectProjectAdapter(altered),
        /INVALID_PROJECT_ADAPTER_CONFIG/);
    }
  }
});
test('M4-B7-C: compiled fictional examples and generated templates share safe shape',()=>{
  for(const [type,basename] of [
    ['stdio','stdio-project.json'],
    ['streamable-http','streamable-http-project.json']
  ]){
    const json=JSON.parse(readFileSync(join(root,
      'examples','adapter-profiles',basename),'utf8'));
    const tpl=createOfflineAdapterTemplate(type).template;
    assert.equal(inspectProjectAdapter(json).connectionStatus,'NOT_ATTEMPTED');
    assert.deepEqual(json.policy,tpl.policy);
    assert.equal(json.transport.type,tpl.transport.type);
    assert.equal(json.protocolVersion,tpl.protocolVersion);
  }
});
test('M4-B7-C: offline templates never establish consent or stage approval',()=>{
  for(const type of fixedTypes){
    const r=createOfflineAdapterTemplate(type);
    assert.equal(r.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
    assert.equal(r.operatorEvidence,'OPERATOR_NOT_VERIFIED');
    assert.equal(r.projectConnectionAuthorized,false);
    assert.equal(r.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
    assert.equal(Object.hasOwn(r,'permissionToken'),false);
    assert.equal(Object.hasOwn(r,'consent'),false);
  }
});
test('M4-B7-C: CLI help discovers template syntax without remote URLs',()=>{
  const p=cli('help');
  assert.equal(p.status,0);
  const v=JSON.parse(p.stdout);
  assert.equal(v.commands.length,26);
  assert.ok(v.commands.includes('adapter-template'));
  assert.ok(v.syntax.includes('node src/cli.mjs adapter-template stdio'));
  assert.ok(v.syntax.includes('node src/cli.mjs adapter-template streamable-http'));
  assert.ok(!p.stdout.includes('https://'));
});
