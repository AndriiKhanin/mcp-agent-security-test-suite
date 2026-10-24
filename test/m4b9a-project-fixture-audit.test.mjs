/**
 * M4-B9-A: project-neutral, strictly offline fixture audit.
 * These are fixed FICTIONAL controls, not checks on a user's MCP server.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  auditOfflineProjectFixtureBundle,OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION,
  OFFLINE_FIXTURE_CASES,createOfflineAdapterTemplate,
  inspectProjectAdapter,previewProjectOnboarding
} from '../src/project-adapter.mjs';
import {observeFirstPartyMockAttempts}
  from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cases=[
  'permission-denial','replay-denial','tool-escalation-denial',
  'denied-effect-negative','clean-trace'
];
const bundle=(transport='streamable-http',ids=cases)=>({
  bundleSchemaVersion:1,mode:'offline-fictional-only',
  descriptor:createOfflineAdapterTemplate(transport).template,
  checks:ids.map(caseId=>({caseId}))
});
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:100000
});
const withFixtureFile=(source,fn)=>{
  const folder=mkdtempSync(join(tmpdir(),'m4b9a-fictional-'));
  const file=join(folder,'bundle.json');
  try{
    writeFileSync(file,source,'utf8');
    return fn(file,folder);
  }finally{rmSync(folder,{recursive:true,force:true});}
};
const guarded=r=>{
  assert.equal(r.profile,'fictional-project-fixture-audit-v1');
  assert.equal(r.bundleSchemaVersion,OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION);
  assert.equal(r.descriptorEvidence,'DESCRIPTOR_VALIDATED');
  assert.equal(r.fixtureEvidence,'OFFLINE_FIXTURE_EVALUATED');
  assert.equal(r.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
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
};

test('M4-B9-A: five exact known fixture selectors are stable',()=>{
  assert.deepEqual(OFFLINE_FIXTURE_CASES,cases);
  assert.equal(OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION,1);
});

test('M4-B9-A: HTTP and stdio descriptor shape pass with fixed symbolic cases',()=>{
  for(const transport of ['streamable-http','stdio']){
    const r=auditOfflineProjectFixtureBundle(bundle(transport));
    guarded(r);
    assert.equal(r.status,'PASS');
    assert.equal(r.transport,transport);
    assert.equal(r.checks.length,5);
    assert.deepEqual(r.findings,[]);
    assert.equal(r.failureCount,0);
    assert.ok(r.checks.every(c=>c.checkStatus==='PASS'&&c.expectationMet));
    assert.deepEqual(r.checks.map(c=>c.caseId),cases);
  }
});

test('M4-B9-A: expected denial, replay, escalation and intentionally broken controls are detected',()=>{
  const r=auditOfflineProjectFixtureBundle(bundle());
  guarded(r);
  assert.deepEqual(r.checks.map(x=>[x.caseId,x.expectedControl,x.observedStatus]),[
    ['permission-denial','OWNER_MISMATCH','PASS'],
    ['replay-denial','REPLAYED_NONCE','PASS'],
    ['tool-escalation-denial','UNKNOWN_TOOL','PASS'],
    ['denied-effect-negative','DENIED_ACTION_HAD_EFFECT','FAIL'],
    ['clean-trace','CLEAN_SYNTHETIC_TRACE','PASS']
  ]);
  assert.equal(r.status,'PASS'); // Expected FAIL control detection makes bundle PASS.
});

test('M4-B9-A: subset and order selection is deterministic',()=>{
  const r=auditOfflineProjectFixtureBundle(bundle('stdio',[
    'clean-trace','denied-effect-negative'
  ]));
  guarded(r);
  assert.deepEqual(r.checks.map(c=>c.caseId),
    ['clean-trace','denied-effect-negative']);
});

test('M4-B9-A: CLI returns schema-v1 bounded output and no descriptor details',()=>{
  withFixtureFile(JSON.stringify(bundle()),file=>{
    const x=cli('adapter-fixture-audit',file);
    assert.equal(x.error,undefined);
    assert.equal(x.status,0,x.stderr);
    const r=JSON.parse(x.stdout);
    guarded(r);
    assert.equal(r.status,'PASS');
    assert.equal(r.command,'adapter-fixture-audit');
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.exitCode,0);
    assert.deepEqual(r.summary.ruleCodes,[]);
    for(const forbidden of ['mcp.example.org','fictional-http-project',
      'server.mjs',file,'mcp://fictional-resource','synthetic-grant-01'])
      assert.ok(!x.stdout.includes(forbidden),forbidden);
  });
});

test('M4-B9-A: generated stdio and HTTP templates copy into no-contact bundles',()=>{
  for(const type of ['stdio','streamable-http']){
    const profile=createOfflineAdapterTemplate(type).template;
    assert.equal(previewProjectOnboarding(profile).connectionStatus,'NOT_ATTEMPTED');
    assert.equal(inspectProjectAdapter(profile).executionEnabled,false);
    const r=auditOfflineProjectFixtureBundle({
      bundleSchemaVersion:1,mode:'offline-fictional-only',
      descriptor:structuredClone(profile),
      checks:[{caseId:'permission-denial'}]
    });
    guarded(r);
    assert.equal(r.checks.length,1);
    assert.equal(r.status,'PASS');
  }
});

test('M4-B9-A: reject optional executable and remote-target flags before effects',()=>{
  const orig=bundle();
  const mutated=[
    {...orig,allowNetwork:true},
    {...orig,verified:true},
    {...orig,command:'node'},
    {...orig,endpoint:'https://private.example.org/mcp'},
    {...orig,consent:'ALLOW'},
    {...orig,execute:true},
    {...orig,checks:[{caseId:'permission-denial',allowProcessSpawn:true}]},
    {...orig,checks:[{caseId:'permission-denial',fixturePath:'../private.json'}]},
    {...orig,descriptor:{...orig.descriptor,verified:true}},
    {...orig,descriptor:{...orig.descriptor,policy:{
      ...orig.descriptor.policy,allowNetwork:true}}},
    {...orig,descriptor:{...orig.descriptor,policy:{
      ...orig.descriptor.policy,allowToolCalls:true}}},
    {...orig,descriptor:{...orig.descriptor,transport:{
      type:'streamable-http',endpoint:'https://127.0.0.1/mcp'}}}
  ];
  for(const x of mutated){
    assert.throws(()=>auditOfflineProjectFixtureBundle(x),
      /INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE/);
  }
});

test('M4-B9-A: unknown selectors, duplicates and unbounded sets fail closed',()=>{
  const bad=[
    [],[...cases,'clean-trace'],
    ['permission-denial','permission-denial'],
    ['read-private-file'],['https://host.example.org/mcp'],
    ['../fixtures/scenario-denial.json'],['tools/call'],
    ['--run'],['REPLAY-DENIAL']
  ];
  for(const ids of bad){
    assert.throws(()=>auditOfflineProjectFixtureBundle(bundle('stdio',ids)),
      /INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE/);
  }
  for(const malformed of [null,[],{},true,0,'bad',
    {bundleSchemaVersion:2,mode:'offline-fictional-only'},
    {...bundle(),mode:'run'},
    {...bundle(),bundleSchemaVersion:'1'},
    {...bundle(),checks:[{caseId:null}]}
  ])assert.throws(()=>auditOfflineProjectFixtureBundle(malformed),
    /INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE/);
});

test('M4-B9-A: source API rejects getters, prototype tricks, symbols and cycles',()=>{
  const x=bundle();
  const accessor=bundle();
  Object.defineProperty(accessor,'mode',{get(){throw Error('PRIVATE_CANARY')}});
  const unusual=Object.assign(Object.create(null),bundle());
  const nested=bundle();nested.checks[0][Symbol.for('hidden')]='secret';
  const cycle=bundle();cycle.extra=cycle;
  for(const input of [accessor,unusual,nested,cycle]){
    assert.throws(()=>auditOfflineProjectFixtureBundle(input),
      /INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE/);
  }
  assert.equal(auditOfflineProjectFixtureBundle(x).status,'PASS');
});

test('M4-B9-A: user data and secret canaries never appear in parser errors',()=>{
  withFixtureFile('{"secret":"PRIVATE_CANARY","bundleSchemaVersion":1}',file=>{
    const x=cli('adapter-fixture-audit',file);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(x.stdout+x.stderr).includes('PRIVATE_CANARY'));
    assert.ok(!(x.stdout+x.stderr).includes(file));
  });
});

test('M4-B9-A: hard 16KiB CLI input ceiling rejects oversized bundle',()=>{
  const bytes=JSON.stringify(bundle())+'\n'+' '.repeat(17000);
  withFixtureFile(bytes,file=>{
    const x=cli('adapter-fixture-audit',file);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!x.stdout.includes(file));
  });
});

test('M4-B9-A: CLI rejects unknown input type/flags and all extra arguments',()=>{
  for(const args of [
    ['adapter-fixture-audit'],
    ['adapter-fixture-audit','--endpoint=https://private.example.org/mcp'],
    ['adapter-fixture-audit','sample.json','--run'],
    ['adapter-fixture-audit','sample.json','--tools/call']
  ]){
    const x=cli(...args);
    assert.equal(x.status,2);
    assert.equal(JSON.parse(x.stdout).errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(x.stdout+x.stderr).includes('private.example.org'));
  }
});

test('M4-B9-A: no first-party attempt is emitted by library bundle audit',async()=>{
  const seen=await observeFirstPartyMockAttempts(()=>
    auditOfflineProjectFixtureBundle(bundle()));
  guarded(seen.result);
  assert.deepEqual(seen.attempts,[]);
  assert.equal(seen.result.status,'PASS');
});

test('M4-B9-A: full report never includes input project name or fictional records',()=>{
  const x=bundle();
  x.descriptor.project.name='PRIVATE_PROJECT_NAME_123';
  x.descriptor.transport.endpoint='https://secret.example.org/mcp';
  const report=auditOfflineProjectFixtureBundle(x);
  guarded(report);
  for(const term of ['PRIVATE_PROJECT_NAME_123','secret.example.org',
    'fictional-owner','mcp://fictional-resource','synthetic-grant-01'])
    assert.equal(JSON.stringify(report).includes(term),false);
});

test('M4-B9-A: CLI help exposes offline-only audit command',()=>{
  const x=cli('help');
  assert.equal(x.status,0);
  const r=JSON.parse(x.stdout);
  assert.equal(r.commands.length,23);
  assert.ok(r.commands.includes('adapter-fixture-audit'));
  assert.ok(r.syntax.some(s=>s.startsWith('node src/cli.mjs adapter-fixture-audit ')));
  assert.ok(!x.stdout.includes('https://'));
});
