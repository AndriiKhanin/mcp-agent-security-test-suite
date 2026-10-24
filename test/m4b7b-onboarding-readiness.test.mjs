/**
 * M4-B7-B - onboarding is inert and must never connect the user-provided
 * descriptor. The no-argument demo runs an unrelated fixed first-party mock.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewProjectOnboarding,inspectProjectAdapter}
  from '../src/project-adapter.mjs';
import {evaluateAdapterConsent,descriptorFingerprint}
  from '../src/adapter-consent.mjs';
import {runFixedOnboardingDemo}
  from '../src/local-adapter-drivers.mjs';
import {observeFirstPartyMockAttempts}
  from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const example=name=>JSON.parse(readFileSync(join(root,
  'examples','adapter-profiles',name),'utf8'));
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:22000,maxBuffer:65536
});
function noAuthority(r){
  assert.equal(r.readinessSchemaVersion,1);
  assert.equal(r.descriptorEvidence,'DESCRIPTOR_VALIDATED');
  assert.equal(r.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
  assert.equal(r.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(r.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(r.projectConnectionAuthorized,false);
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.operatorVerified,false);
  assert.equal(r.executionEnabled,false);
  assert.ok(!JSON.stringify(r).includes('mcp.example.org'));
  assert.ok(!JSON.stringify(r).includes('fictional-onboarding'));
  assert.ok(!JSON.stringify(r).includes('127.0.0.1'));
}
test('M4-B7-B: stdio descriptor onboarding is strictly offline and symbolic',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(async()=>
    previewProjectOnboarding(example('stdio-project.json')));
  assert.equal(result.status,'PASS');
  assert.equal(result.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(result.transport,'stdio');
  assert.equal(result.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
  assert.equal(result.consentEvidence,'SELF_ASSERTED_CONSENT_NOT_EVALUATED');
  assert.deepEqual(attempts,[]);
  noAuthority(result);
});
test('M4-B7-B: HTTP descriptor onboarding is strictly offline and symbolic',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(async()=>
    previewProjectOnboarding(example('streamable-http-project.json')));
  assert.equal(result.transport,'streamable-http');
  assert.equal(result.status,'PASS');
  assert.equal(result.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
  assert.deepEqual(attempts,[]);
  noAuthority(result);
});
test('M4-B7-B: versioned v1 CLI preview for both transports has no target evidence',()=>{
  for(const name of ['stdio-project.json','streamable-http-project.json']){
    const x=cli('adapter-onboard',join('examples','adapter-profiles',name));
    assert.equal(x.error,undefined);
    assert.equal(x.status,0,x.stderr);
    const r=JSON.parse(x.stdout);
    assert.equal(r.reportSchemaVersion,1);
    assert.equal(r.command,'adapter-onboard');
    assert.equal(r.status,'PASS');
    assert.equal(r.exitCode,0);
    assert.deepEqual(r.summary.ruleCodes,[]);
    assert.equal(r.stagingEvidence,'FIRST_PARTY_STAGING_NOT_ATTEMPTED');
    assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
    noAuthority(r);
  }
});
test('M4-B7-B: pure preview lists independent non-activating next actions',()=>{
  const r=previewProjectOnboarding(example('streamable-http-project.json'));
  assert.deepEqual(r.nextActions.map(x=>x.code),[
    'REVIEW_OFFLINE_DESCRIPTOR',
    'REVIEW_FICTIONAL_CONSENT_ONLY',
    'OPTIONAL_SEPARATE_OWNED_STAGING_DEMO',
    'SEPARATE_VERIFIED_TARGET_APPROVAL_REQUIRED'
  ]);
  assert.ok(r.nextActions.every(x=>x.command===null ||
    x.command.startsWith('node src/cli.mjs ')));
  assert.ok(r.nextActions.every(x=>!JSON.stringify(x).includes('https://')));
});
test('M4-B7-B: no-arg demo performs only a fixed first-party staging probe',async()=>{
  const {result,attempts}=await observeFirstPartyMockAttempts(
    ()=>runFixedOnboardingDemo());
  assert.equal(result.status,'PASS');
  assert.equal(result.profile,'fictional-first-party-onboarding-demo-v1');
  assert.equal(result.connectionStatus,'FIXED_FIRST_PARTY_STAGING_ONLY');
  assert.equal(result.stagingEvidence,'FIRST_PARTY_STAGING_PASS');
  assert.equal(result.stagedFixtureOnly,true);
  assert.equal(result.adapterDescriptorUsed,false);
  assert.equal(result.socketCleanupConfirmed,true);
  assert.deepEqual(attempts,['driver-probe','staging-bind','staging-request']);
  noAuthority(result);
});
test('M4-B7-B: no-arg CLI demo distinctly reports mock, not real target',()=>{
  const p=cli('adapter-onboarding-demo');
  assert.equal(p.status,0,p.stderr);
  const r=JSON.parse(p.stdout);
  assert.equal(r.command,'adapter-onboarding-demo');
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.exitCode,0);
  assert.equal(r.stagingEvidence,'FIRST_PARTY_STAGING_PASS');
  assert.equal(r.socketCleanupConfirmed,true);
  assert.equal(r.checks,2);
  assert.equal(r.failureCount,0);
  noAuthority(r);
});
test('M4-B7-B: adapter-check and preview remain inert after demo',()=>{
  const before=cli('adapter-check','examples/adapter-profiles/stdio-project.json');
  const fixed=cli('adapter-onboarding-demo');
  const after=cli('adapter-check','examples/adapter-profiles/stdio-project.json');
  assert.deepEqual([before.status,fixed.status,after.status],[0,0,0]);
  assert.deepEqual(JSON.parse(before.stdout),JSON.parse(after.stdout));
  assert.equal(JSON.parse(after.stdout).connectionStatus,'NOT_ATTEMPTED');
  assert.equal(inspectProjectAdapter(example('stdio-project.json')).executionEnabled,false);
});
test('M4-B7-B: invalid descriptors, injected source claims never create an effect',async()=>{
  const valid=example('streamable-http-project.json');
  for(const input of [
    null,[],{...valid,ownerVerified:true},
    {...valid,stagingEvidence:'FIRST_PARTY_STAGING_PASS'},
    {...valid,policy:{...valid.policy,allowNetwork:true}},
    {...valid,policy:{...valid.policy,allowProcessSpawn:true}},
    {...valid,policy:{...valid.policy,allowCredentials:true}},
    {...valid,transport:{type:'streamable-http',endpoint:'https://127.0.0.1/mcp'}},
    {...valid,transport:{type:'streamable-http',endpoint:'https://user:secret@mcp.example.org/mcp'}},
    {...valid,transport:{type:'stdio',command:'node',args:['--eval','bad']}}
  ]){
    const {attempts}=await observeFirstPartyMockAttempts(async()=>{
      assert.throws(()=>previewProjectOnboarding(input),/INVALID_PROJECT_ADAPTER_CONFIG/);
    });
    assert.deepEqual(attempts,[]);
  }
});
test('M4-B7-B: profile project names and commands never leak to readiness output',()=>{
  const descriptor=example('stdio-project.json');
  descriptor.project.name='PrivateProject_123';
  descriptor.transport.command='private-executable';
  const r=previewProjectOnboarding(descriptor);
  assert.equal(r.status,'PASS');
  assert.ok(!JSON.stringify(r).includes('PrivateProject_123'));
  assert.ok(!JSON.stringify(r).includes('private-executable'));
  noAuthority(r);
});
test('M4-B7-B: a project descriptor PASS is never ownership verification',()=>{
  const desc=example('streamable-http-project.json');
  const r=previewProjectOnboarding(desc);
  assert.equal(r.status,'PASS');
  assert.equal(r.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(r.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(r.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
});
test('M4-B7-B: offline expired self-asserted consent never authorizes connectivity',async()=>{
  const envelope=example('consent-expired.json');
  const {result,attempts}=await observeFirstPartyMockAttempts(async()=>
    evaluateAdapterConsent(envelope,{nowMs:Date.now()}));
  assert.equal(result.status,'FAIL');
  assert.equal(result.operatorVerified,false);
  assert.equal(result.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(result.executionEnabled,false);
  assert.deepEqual(attempts,[]);
});
test('M4-B7-B: even a simulated valid consent PASS is NOT verified operator',async()=>{
  const descriptor=example('streamable-http-project.json');
  const claim={
    operatorId:'fictional-operator',
    projectFingerprint:descriptorFingerprint(descriptor),
    transport:'streamable-http',
    methods:['ping'],issuedAt:1000,expiresAt:3000,
    nonce:'fictional-nonce',revoked:false
  };
  const envelope={policySchemaVersion:1,descriptor,request:{
    project:descriptor.project.name,transport:'streamable-http',
    method:'ping',operatorId:'fictional-operator'},claim};
  const {result,attempts}=await observeFirstPartyMockAttempts(async()=>
    evaluateAdapterConsent(envelope,{nowMs:2000}));
  assert.equal(result.status,'PASS');
  assert.equal(result.operatorVerified,false);
  assert.equal(result.authorizationStatus,'UNVERIFIED_SELF_ASSERTION');
  assert.equal(result.executionEnabled,false);
  assert.equal(result.connectionStatus,'NOT_ATTEMPTED');
  assert.deepEqual(attempts,[]);
});
test('M4-B7-B: CLI strictly rejects extra target arguments and leaks no values',()=>{
  for(const command of ['adapter-onboarding-demo','adapter-onboard']){
    for(const value of ['https://private.example.org/mcp',
      '--token=PRIVATE_FICTIONAL','--execute=private-program']){
      const args=command==='adapter-onboard'
        ?[command,'examples/adapter-profiles/stdio-project.json',value]
        :[command,value];
      const p=cli(...args);
      assert.equal(p.status,2);
      const r=JSON.parse(p.stdout);
      assert.equal(r.errorCode,'INVALID_CLI_ARGUMENTS');
      assert.equal(r.status,'ERROR');
      assert.ok(!(p.stdout+p.stderr).includes(value));
    }
  }
});
test('M4-B7-B: missing and unreadable descriptor remains sanitized',()=>{
  for(const args of [
    ['adapter-onboard'],
    ['adapter-onboard','fictional-private-missing-file.json']
  ]){
    const p=cli(...args);
    assert.equal(p.status,2);
    const r=JSON.parse(p.stdout);
    assert.ok(['INVALID_CLI_ARGUMENTS','INVALID_OR_UNREADABLE_INPUT'].includes(r.errorCode));
    assert.equal(r.command,'adapter-onboard');
    assert.ok(!p.stdout.includes('fictional-private-missing-file'));
  }
});
test('M4-B7-B: no caller-supplied descriptor or mock result can drive the no-arg demo',async()=>{
  for(const payload of [null,{},{
    stagingEvidence:'FIRST_PARTY_STAGING_PASS',targetEvidence:'REAL_TARGET_AUTHORIZED'
  }]){
    await assert.rejects(runFixedOnboardingDemo(payload),
      /INVALID_FIXED_ONBOARDING_DEMO_OPTIONS/);
  }
});
