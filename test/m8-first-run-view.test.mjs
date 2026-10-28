import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runOfflineFirstRun} from '../tools/adapter-first-run.mjs';
import {renderOfflineFirstRunText} from '../tools/adapter-first-run-view.mjs';

test('M8-Q: source-owned first-run view is deterministic and states exact limits',()=>{
  const report=runOfflineFirstRun();
  const text=renderOfflineFirstRunText(report);
  assert.equal(text,renderOfflineFirstRunText(runOfflineFirstRun()));
  for(const literal of [
    'FICTIONAL OFFLINE CONTROLS ONLY',
    'PASS (2/2)', 'stdio, streamable-http',
    'adapter-template stdio','adapter-template streamable-http',
    'nested template object','adapter-check <local-descriptor-file>',
    'External MCP servers contacted: NO',
    'User process executed: NO',
    'User descriptor read by this command: NO',
    'Real project assessed: NO',
    'Independent beta: NOT VERIFIED',
    'Independent security audit: NOT COMPLETED',
    'Stable release: NOT AUTHORIZED'
  ]) assert.ok(text.includes(literal),literal);
  assert.ok(!text.includes('undefined'));
});

test('M8-Q: every authority flag, transport, status or step tampering denies',()=>{
  const original=runOfflineFirstRun();
  const flags=['externalMcpContacted','userProcessExecuted','userDescriptorRead',
    'realProjectAssessed','operatorVerified','independentBetaVerified',
    'independentAuditCompleted','stableReleaseAuthorized'];
  for(const flag of flags){
    assert.throws(()=>renderOfflineFirstRunText({...original,[flag]:true}),
      /FICTIONAL_FIRST_RUN_NOT_VERIFIED/,flag);
    assert.throws(()=>renderOfflineFirstRunText({...original,[flag]:undefined}),
      /FICTIONAL_FIRST_RUN_NOT_VERIFIED/,flag);
  }
  const changed=[
    {...original,status:'FAIL'},
    {...original,exitCode:1},
    {...original,smokePassed:1},
    {...original,scope:'REAL_TARGET'},
    {...original,transports:['stdio']},
    {...original,transports:['stdio','stdio']},
    {...original,steps:[]},
    {...original,steps:original.steps.map((s,i)=>i===2?{...s,code:'CONNECT_REAL_TARGET'}:s)}
  ];
  for(const r of changed) assert.throws(()=>renderOfflineFirstRunText(r),
    /FICTIONAL_FIRST_RUN_NOT_VERIFIED/);
});

test('M8-Q: supplied private strings never reach human-facing output',()=>{
  const report=runOfflineFirstRun();
  const marker='PRIVATE_CREDENTIAL_CANARY_2026';
  const changed={...report,privateToken:marker,
    steps:report.steps.map(s=>({...s,instruction:marker,endpoint:marker}))};
  const text=renderOfflineFirstRunText(changed);
  assert.equal(text,renderOfflineFirstRunText(report));
  assert.ok(!text.includes(marker));
});

test('M8-Q: first-run human CLI rejects all user arguments without echo',()=>{
  const ok=spawnSync(process.execPath,['tools/adapter-first-run-view.mjs'],{encoding:'utf8'});
  assert.equal(ok.status,0,ok.stderr);
  assert.equal(ok.stderr,'');
  assert.equal(ok.stdout,renderOfflineFirstRunText(runOfflineFirstRun()));
  for(const arg of ['private-secret-canary','--target=https://private.example','../../secret.json']){
    const bad=spawnSync(process.execPath,['tools/adapter-first-run-view.mjs',arg],{encoding:'utf8'});
    assert.equal(bad.status,2);
    assert.equal(bad.stdout,'');
    assert.equal(bad.stderr.trim(),'ERROR: FIRST_RUN_VIEW_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});

test('M8-R: user-facing docs and package exclusion keep offline boundary',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.ok(!pkg.files.includes('tools'));
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  const doc=readFileSync(new URL('../.github/M8_FIRST_RUN_GUIDE.md',import.meta.url),'utf8');
  for(const text of [readme,doc]){
    assert.match(text,/node tools\/adapter-first-run-view\.mjs/);
    assert.match(text,/fictional/i);
    assert.match(text,/not a (real )?security audit/i);
  }
  assert.match(readme,/\.github\/M8_FIRST_RUN_GUIDE\.md/);
});
