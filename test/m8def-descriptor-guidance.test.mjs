/** M8-E: privacy-safe, fixed source-authored descriptor troubleshooting. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildCliErrorReport,buildCliReport} from '../src/report-contract.mjs';
import {inspectProjectAdapter} from '../src/project-adapter.mjs';

const run=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
 cwd:new URL('..',import.meta.url),shell:false,encoding:'utf8',
 timeout:20000,maxBuffer:1048576
});
const guide=(report)=>report.readerGuide;
test('M8-D: descriptor and onboard errors get identical fixed local repair checklist',()=>{
 for(const command of ['adapter-check','adapter-onboard']){
  for(const errorCode of ['INVALID_CLI_ARGUMENTS','INVALID_OR_UNREADABLE_INPUT']){
   const r=buildCliErrorReport(command,errorCode);
   assert.equal(r.status,'ERROR');assert.equal(r.exitCode,2);
   assert.equal(guide(r).code,'OFFLINE_DESCRIPTOR_INPUT_REJECTED');
   assert.equal(guide(r).nextSteps.length,2);
   assert.equal(guide(r).externalMcpContactAuthorized,false);
   assert.equal(guide(r).realProjectAssessed,false);
  }
 }
});
test('M8-E: successful checked descriptor gives scoped guidance without server authority',()=>{
 const example={
  adapterSchemaVersion:1,project:{name:'fictional-example'},
  transport:{type:'stdio',command:'node',args:['server.mjs']},
  protocolVersion:'2026-07-28',
  policy:{mode:'validate-only',allowNetwork:false,allowProcessSpawn:false,
          allowToolCalls:false,allowCredentials:false}
 };
 const r=buildCliReport('adapter-check',inspectProjectAdapter(example));
 assert.equal(r.status,'PASS');assert.equal(r.exitCode,0);
 assert.equal(guide(r).code,'OFFLINE_DESCRIPTOR_VALIDATED');
 assert.equal(guide(r).stableReleaseAuthorized,false);
 assert.equal(guide(r).independentBetaVerified,false);
});
test('M8-E: malformed private descriptor file is rejected without echoing marker',()=>{
 const dir=mkdtempSync(join(tmpdir(),'m8-descriptor-guidance-'));
 try{
  const path=join(dir,'private.json');
  writeFileSync(path,JSON.stringify({project:{name:'PRIVATE_CANARY'},secret:'PRIVATE_CANARY'}));
  for(const command of ['adapter-check','adapter-onboard']){
   const result=run(command,path);
   assert.equal(result.status,2,result.stderr);
   const data=JSON.parse(result.stdout);
   assert.equal(data.status,'ERROR');
   assert.equal(data.readerGuide.code,'OFFLINE_DESCRIPTOR_INPUT_REJECTED');
   assert.ok(!(result.stdout+result.stderr).includes('PRIVATE_CANARY'));
   assert.ok(!(result.stdout+result.stderr).includes(dir));
  }
 }finally{rmSync(dir,{force:true,recursive:true});}
});
test('M8-F: no commands or values from private config enter guidance',()=>{
 const guideText=JSON.stringify(guide(buildCliErrorReport('adapter-check','INVALID_OR_UNREADABLE_INPUT')));
 assert.ok(!guideText.includes('PRIVATE_CANARY'));
 assert.equal(guideText.includes('http://'),false);
 assert.equal(guideText.includes('https://'),false);
 assert.match(guideText,/validate-only/);
 assert.match(guideText,/streamable-http-project.json/);
});
