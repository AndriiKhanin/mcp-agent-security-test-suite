/** M7-D/E: execute the literal fictional first-run path, not just its text.
 * All work occurs in a temporary local fixture file; no network or MCP targets. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildAdapterGuideResult} from '../src/report-contract.mjs';

const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',
  timeout:20000,maxBuffer:1024*1024
});
const parse=(result,exit)=>{
 assert.equal(result.error,undefined);
 assert.equal(result.status,exit,result.stderr);
 const data=JSON.parse(result.stdout);
 assert.equal(data.exitCode,exit);
 return data;
};
function useTemp(callback) {
 const directory=mkdtempSync(join(tmpdir(),'fictional-adapter-guide-'));
 try {return callback(join(directory,'fictional-kit.json'));}
 finally {rmSync(directory,{recursive:true,force:true});}
}

for(const transport of ['stdio','streamable-http']){
 test('M7-D: '+transport+' complete exported fictional kit path passes end-to-end',()=>{
  useTemp(file=>{
   const guide=parse(cli('adapter-guide'),0);
   const step=guide.steps;
   const selected=transport==='stdio'?'command':'alternative';
   assert.ok(step[0][selected].endsWith('adapter-kit '+transport));
   assert.ok(step[1][selected].includes('adapter-kit '+transport+' > fictional-kit.json'));
   const kit=cli('adapter-kit',transport);
   const exportReport=parse(kit,0);
   assert.equal(exportReport.transport,transport);
   writeFileSync(file,kit.stdout,{mode:0o600});
   assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),exportReport);
   const verified=parse(cli('adapter-kit-verify',file),0);
   assert.equal(verified.status,'PASS');
   assert.equal(verified.exitCode,0);
   const example='examples/adapter-profiles/'+
      (transport==='stdio'?'stdio-project.json':'streamable-http-project.json');
   const quick=parse(cli('adapter-quickstart',example),0);
   assert.equal(quick.status,'PASS');
   for(const report of [guide,exportReport,verified,quick]){
    assert.equal(report.reportSchemaVersion,1);
    assert.equal(report.exitCode,0);
   }
   assert.equal(guide.limits.externalMcpTargetContacted,false);
   assert.equal(guide.limits.projectCodeExecuted,false);
  });
 });
}

test('M7-E: exported kit modification is denied rather than treated as verified',()=>{
 useTemp(file=>{
  const kit=parse(cli('adapter-kit','stdio'),0);
  kit.starterDescriptor.project.name='forged-fictional-project';
  writeFileSync(file,JSON.stringify(kit),{mode:0o600});
  const result=cli('adapter-kit-verify',file);
  assert.equal(result.status,2);
  const report=JSON.parse(result.stdout);
  assert.equal(report.status,'ERROR');
  assert.equal(report.errorCode,'INVALID_OR_UNREADABLE_INPUT');
  assert.ok(!result.stdout.includes('forged-fictional-project'));
  assert.ok(!result.stderr.includes('forged-fictional-project'));
 });
});

test('M7-E: no runnable user-input invocation exists in the static guide',()=>{
 const guide=buildAdapterGuideResult();
 assert.equal(guide.steps.length,4);
 for(const step of guide.steps){
  for(const command of [step.command,step.alternative].filter(Boolean)){
   assert.match(command,/^node src\/cli\.mjs adapter-(?:kit|kit-verify|quickstart) /);
   assert.equal(/https?:\/\/|--execute|--connect|--target|&{2}|\|{2}|\$\(/.test(command),false);
  }
 }
 assert.ok(Object.values(guide.limits).every(value=>value===false));
});
