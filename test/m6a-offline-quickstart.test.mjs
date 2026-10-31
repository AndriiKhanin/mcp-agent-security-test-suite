
/** M6-A: source-authored fictional checks ONLY; never target a user server. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,symlinkSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  previewOfflineAdapterQuickstart,
  OFFLINE_ADAPTER_QUICKSTART_VERSION,createOfflineAdapterTemplate,
  previewProjectOnboarding
} from '../src/project-adapter.mjs';
import {observeFirstPartyMockAttempts}
  from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const template=type=>structuredClone(createOfflineAdapterTemplate(type).template);
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:16000,maxBuffer:100000
});
const fixture=(data,fn)=>{
  const dir=mkdtempSync(join(tmpdir(),'m6a-quickstart-'));
  const file=join(dir,'descriptor.json');
  try {
    writeFileSync(file,typeof data==='string'?data:JSON.stringify(data),'utf8');
    return fn(file,dir);
  } finally {rmSync(dir,{force:true,recursive:true});}
};
const boundary=r=>{
  assert.equal(r.profile,'offline-adapter-quickstart-v1');
  assert.equal(r.quickstartSchemaVersion,OFFLINE_ADAPTER_QUICKSTART_VERSION);
  assert.equal(r.descriptorEvidence,'DESCRIPTOR_SHAPE_ONLY');
  assert.equal(r.fictionalControlEvidence,'BUILTIN_FICTIONAL_CASES_ONLY');
  assert.equal(r.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
  assert.equal(r.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(r.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(r.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.executionEnabled,false);
  assert.equal(r.projectConnectionAuthorized,false);
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.operatorVerified,false);
  assert.equal(r.fixturesAreProjectSpecific,false);
  assert.equal(r.projectSafetyAssessed,false);
  assert.equal(r.securityCertified,false);
  assert.equal(r.interpretation,'PASS_MEANS_DESCRIPTOR_AND_FIXED_FICTIONAL_CONTROLS_ONLY');
  assert.equal(r.failureCount,r.findings.length);
  assert.equal(r.findingsTruncated,false);
};
const expectedIds=[
  'permission-denial','replay-denial','tool-escalation-denial',
  'denied-effect-negative','clean-trace'
];

test('M6-A: exact fictional control count and safe recommendation order',()=>{
  assert.equal(OFFLINE_ADAPTER_QUICKSTART_VERSION,1);
  const r=previewOfflineAdapterQuickstart(template('streamable-http'));
  boundary(r);
  assert.equal(r.status,'PASS');
  assert.equal(r.checked,5);
  assert.deepEqual(r.controls.map(c=>c.caseId),expectedIds);
  assert.deepEqual(r.controls.map(c=>c.controlStatus),Array(5).fill('PASS'));
  assert.deepEqual(r.controls.map(c=>c.fictionalObservedStatus),[
    'PASS','PASS','PASS','FAIL','PASS'
  ]);
  assert.equal(r.controls[3].expectedRule,'DENIED_ACTION_HAD_EFFECT');
  assert.match(r.controls[3].explanation,/intentionally broken fictional denial/);
  assert.equal(r.nextActions.length,4);
  assert.deepEqual(r.nextActions.map(x=>x.order),[1,2,3,4]);
  assert.equal(r.nextActions[3].code,'REAL_TARGET_APPROVAL_NOT_GRANTED');
});

test('M6-A: HTTP and stdio only describe inert local shape',()=>{
  for(const type of ['stdio','streamable-http']){
    const config=template(type);
    config.project.name='PRIVATE_PROJECT_NAME';
    const r=previewOfflineAdapterQuickstart(config);
    boundary(r);
    assert.equal(r.transport,type);
    assert.equal(r.protocolVersion,previewProjectOnboarding(config).protocolVersion);
    assert.equal(r.status,'PASS');
    assert.ok(!JSON.stringify(r).includes('PRIVATE_PROJECT_NAME'));
    assert.ok(!JSON.stringify(r).includes(config.transport.command??config.transport.endpoint));
  }
});

test('M6-A: no first-party mock/network/process effects even on HTTP descriptor',async()=>{
  for(const type of ['stdio','streamable-http']){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>previewOfflineAdapterQuickstart(template(type)));
    boundary(result);
    assert.deepEqual(attempts,[]);
  }
});

test('M6-A: CLI produces schema-v1 safe summary for both inert transports',()=>{
  for(const type of ['stdio','streamable-http']){
    fixture(template(type),file=>{
      const p=cli('adapter-quickstart',file);
      assert.equal(p.status,0,p.stderr);
      const x=JSON.parse(p.stdout);
      boundary(x);
      assert.equal(x.command,'adapter-quickstart');
      assert.equal(x.reportSchemaVersion,1);
      assert.equal(x.exitCode,0);
      assert.equal(x.summary.failureCount,0);
      assert.deepEqual(x.summary.ruleCodes,[]);
      assert.equal(x.controls.length,5);
      assert.ok(!p.stdout.includes(file));
      assert.ok(!p.stdout.includes('mcp.example.org'));
      assert.ok(!p.stdout.includes('fictional-http-project'));
    });
  }
});

test('M6-A: bad flags and extra CLI args fail before file open',()=>{
  for(const args of [
    ['adapter-quickstart'],
    ['adapter-quickstart','--url=https://private.example.org/mcp'],
    ['adapter-quickstart','one.json','--run'],
    ['adapter-quickstart','one.json','--tools/call'],
    ['adapter-quickstart','one.json','--allow-network']
  ]){
    const p=cli(...args);
    assert.equal(p.status,2);
    const r=JSON.parse(p.stdout);
    assert.equal(r.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.equal(r.command,'adapter-quickstart');
    assert.equal(r.exitCode,2);
    assert.ok(!(p.stdout+p.stderr).includes('private.example.org'));
  }
});

test('M6-A: parser rejects malformed JSON, duplicate keys and unknown field',()=>{
  const valid=template('stdio');
  for(const raw of [
    '{invalid-json}',
    '{"adapterSchemaVersion":1,"adapterSchemaVersion":2}',
    JSON.stringify({...valid,execute:true}),
    JSON.stringify({...valid,realServerVerified:true}),
    JSON.stringify({...valid,ownerAuthorized:true}),
    JSON.stringify({...valid,credentials:'PRIVATE_SECRET'}),
    JSON.stringify({...valid,policy:{...valid.policy,allowNetwork:true}}),
    JSON.stringify({...valid,transport:{type:'stdio',command:'node',
      args:['server.mjs'],allowExecute:true}}),
  ]) fixture(raw,file=>{
    const p=cli('adapter-quickstart',file);
    assert.equal(p.status,2,p.stderr);
    const r=JSON.parse(p.stdout);
    assert.equal(r.errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(p.stdout+p.stderr).includes('PRIVATE_SECRET'));
    assert.ok(!(p.stdout+p.stderr).includes(file));
  });
});

test('M6-A: reject 4096+ byte file with generic error and no data echo',()=>{
  fixture(JSON.stringify(template('stdio'))+' '.repeat(4100),file=>{
    const p=cli('adapter-quickstart',file);
    assert.equal(p.status,2);
    assert.equal(JSON.parse(p.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(p.stdout+p.stderr).includes(file));
  });
});

test('M6-A: missing local file and direct symlink rejected',()=>{
  fixture(template('stdio'),(file,dir)=>{
    const p=cli('adapter-quickstart',join(dir,'missing-secret.json'));
    assert.equal(p.status,2);
    assert.equal(JSON.parse(p.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    const link=join(dir,'link.json');
    let linked=false;
    try {symlinkSync(file,link,'file');linked=true;}
    catch(e) {assert.ok(process.platform==='win32' &&
      ['EPERM','EACCES'].includes(e.code));}
    if(linked){
      const q=cli('adapter-quickstart',link);
      assert.equal(q.status,2);
      assert.equal(JSON.parse(q.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    }
  });
});

test('M6-A: JS API refuses getter, symbol, prototype, cycle and process flags',()=>{
  const c=template('stdio');
  const nil=Object.assign(Object.create(null),c);
  const getter=template('stdio');
  Object.defineProperty(getter.project,'name',{get(){throw Error('PRIVATE_CANARY');}});
  const symbol=template('stdio');
  symbol.policy[Symbol('secret')]=true;
  const cycle=template('stdio');cycle.extra=cycle;
  const escalation=template('stdio');escalation.policy.allowToolCalls=true;
  for(const invalid of [nil,getter,symbol,cycle,escalation]){
    assert.throws(()=>previewOfflineAdapterQuickstart(invalid));
  }
});

test('M6-A: instructions and help expose one command without target approval',()=>{
  const p=cli('help');
  assert.equal(p.status,0);
  const r=JSON.parse(p.stdout);
  assert.equal(r.commands.length,31);
  assert.ok(r.commands.includes('adapter-quickstart'));
  assert.ok(r.syntax.includes(
    'node src/cli.mjs adapter-quickstart examples/adapter-profiles/streamable-http-project.json'));
  const quick=readFileSync(new URL('../docs/GETTING_STARTED.md',import.meta.url),'utf8');
  assert.ok(quick.includes('adapter-quickstart'));
  assert.ok(quick.includes('No real MCP server'));
});

test('M6-A: standard onboarding behavior is not altered',()=>{
  for(const t of ['stdio','streamable-http']){
    const r=previewProjectOnboarding(template(t));
    assert.equal(r.status,'PASS');
    assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
    assert.equal(r.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  }
});

test('M6-A: reviewed package inventory is unchanged',()=>{
  const paths=JSON.parse(readFileSync(new URL('./expected-package-files.json',import.meta.url),'utf8'));
  assert.equal(paths.length,80);
  assert.ok(paths.includes('src/project-adapter.mjs'));
  assert.ok(paths.includes('src/cli.mjs'));
  assert.ok(!paths.includes('test/m6a-offline-quickstart.test.mjs'));
});
