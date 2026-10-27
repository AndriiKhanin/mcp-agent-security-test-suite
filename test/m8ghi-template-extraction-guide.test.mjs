/** M8-H: template wrapper guidance is source-owned and protects offline setup. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildCliReport,buildCliErrorReport} from '../src/report-contract.mjs';
import {createOfflineAdapterTemplate} from '../src/project-adapter.mjs';
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
 cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',timeout:20000,maxBuffer:1048576
});
for(const transport of ['stdio','streamable-http']){
 test('M8-H: '+transport+' template reader explains nested-object extraction',()=>{
  const result=buildCliReport('adapter-template',createOfflineAdapterTemplate(transport));
  assert.equal(result.status,'PASS');assert.equal(result.exitCode,0);
  assert.equal(result.readerGuide.code,'FICTIONAL_TEMPLATE_OBJECT_READY');
  assert.match(result.readerGuide.nextSteps[0],/template property/);
  assert.match(result.readerGuide.nextSteps[1],/adapter-check/);
  for(const key of ['realProjectAssessed','externalMcpContactAuthorized',
   'independentAuditCompleted','independentBetaVerified','ownerOperatorVerified',
   'stableReleaseAuthorized'])assert.equal(result.readerGuide[key],false);
  const out=cli('adapter-template',transport);
  assert.equal(out.status,0,out.stderr);
  assert.deepEqual(JSON.parse(out.stdout),result);
 });
 test('M8-H: '+transport+' report wrapper rejected, but nested descriptor is valid',()=>{
  const dir=mkdtempSync(join(tmpdir(),'fictional-template-'));
  try{
   const report=JSON.parse(cli('adapter-template',transport).stdout);
   const file=join(dir,'descriptor.json');
   writeFileSync(file,JSON.stringify(report));
   const bad=cli('adapter-check',file);
   assert.equal(bad.status,2);
   assert.equal(JSON.parse(bad.stdout).readerGuide.code,'OFFLINE_DESCRIPTOR_INPUT_REJECTED');
   writeFileSync(file,JSON.stringify(report.template));
   const good=cli('adapter-check',file);
   assert.equal(good.status,0,good.stderr);
   assert.equal(JSON.parse(good.stdout).readerGuide.code,'OFFLINE_DESCRIPTOR_VALIDATED');
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
}
test('M8-H: command-line errors do not claim template object is ready',()=>{
 const err=buildCliErrorReport('adapter-template','INVALID_CLI_ARGUMENTS');
 assert.equal(err.status,'ERROR');assert.equal(err.exitCode,2);
 assert.equal(err.readerGuide.code,'INVALID_OFFLINE_INPUT');
 assert.equal(err.readerGuide.externalMcpContactAuthorized,false);
 assert.notEqual(err.readerGuide.code,'FICTIONAL_TEMPLATE_OBJECT_READY');
});
test('M8-H: copied template help is constant, contains no private input',()=>{
 const guide=buildCliReport('adapter-template',
   createOfflineAdapterTemplate('stdio')).readerGuide;
 const words=JSON.stringify(guide);
 assert.ok(!words.includes('PRIVATE_CANARY'));
 assert.ok(!words.includes('https://'));
 assert.ok(!words.includes('server.mjs'));
});
