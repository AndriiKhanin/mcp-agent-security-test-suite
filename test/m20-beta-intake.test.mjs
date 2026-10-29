/** M20: no-echo independent beta intake is triage, NOT verification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {
  preflightBetaIntake,preflightBetaIntakeJson,runBetaIntakeStdin
} from '../tools/m20-beta-intake.mjs';

const PIN='2ad680ed2e4c322374fdabf3c2007e396f893a59';
const report=()=>({
  schemaVersion:1,publicSourceSha:PIN,candidateVersion:'0.0.10-rc.1',
  operatingSystem:'UBUNTU',nodeMajor:20,runnerStatus:'PASS',
  matchedControls:5,evaluationPath:'SOURCE_RUNNER_ONLY',
  archiveOutcome:'NOT_ATTEMPTED',symbolicExitCodes:'NOT_CHECKED',
  guideClarity:'CLEAR',usabilityFinding:'NONE',
  personallyRanProtocol:true,fictionalOnlyConfirmed:true,
  noSensitiveMaterialConfirmed:true
});
const call=(body,...args)=>spawnSync(process.execPath,
  ['tools/m20-beta-intake.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    encoding:'utf8',shell:false,timeout:15000,
    maxBuffer:65536,input:body
  });
const assertNoAuthority=r=>{
  for(const key of ['publicSourceVerified','independentTesterVerified',
    'independentBetaVerified','realAgentBehaviorObserved',
    'externalMcpContacted','independentSecurityAuditCompleted',
    'releaseAuthorized','securityCertified'])
    assert.equal(r[key],false,key);
  assert.equal(r.manualReviewerRequired,true);
};

test('M20-A: valid pinned self-report goes to MANUAL review, never beta acceptance',()=>{
  const r=preflightBetaIntake(report());
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.ruleCode,'BETA_INTAKE_READY_FOR_MANUAL_TRIAGE');
  assert.equal(r.selfReportedMatchedControls,5);
  assert.equal(r.matchesHistoricalPublicSha,true);
  assert.equal(r.sanitizedCategoricalFieldsOnly,true);
  assert.equal(r.publicReportTextEchoed,false);
  assertNoAuthority(r);
  assert.ok(Object.isFrozen(r));
});

test('M20-B: fictional FAIL, ERROR and smoke/archive deviations remain reviewable',()=>{
  const fail={...report(),runnerStatus:'FAIL',matchedControls:3,
    evaluationPath:'SOURCE_RUNNER_AND_SMOKE',symbolicExitCodes:'MISMATCH',
    guideClarity:'NEEDS_CLARIFICATION',usabilityFinding:'CASE_MISMATCH'};
  const a=preflightBetaIntake(fail);
  assert.equal(a.status,'PASS');
  assert.equal(a.ruleCode,'BETA_INTAKE_DEVIATION_READY_FOR_MANUAL_TRIAGE');
  assert.equal(a.selfReportedMatchedControls,3);
  assertNoAuthority(a);
  const blocked={...report(),runnerStatus:'ERROR',matchedControls:0,
    evaluationPath:'ATTEMPTED_UNABLE_TO_RUN',guideClarity:'BLOCKED',
    usabilityFinding:'SETUP_FRICTION'};
  const b=preflightBetaIntake(blocked);
  assert.equal(b.status,'PASS');
  assert.equal(b.ruleCode,'BETA_INTAKE_BLOCKER_READY_FOR_MANUAL_TRIAGE');
  assertNoAuthority(b);
  const archive={...report(),evaluationPath:'SOURCE_RUNNER_SMOKE_ARCHIVE',
    archiveOutcome:'FAILED',symbolicExitCodes:'MATCHED'};
  assert.equal(preflightBetaIntake(archive).ruleCode,
    'BETA_INTAKE_DEVIATION_READY_FOR_MANUAL_TRIAGE');
});

test('M20-B: valid alternate public SHA requires human revision verification',()=>{
  const x={...report(),publicSourceSha:'a'.repeat(40)};
  const r=preflightBetaIntake(x);
  assert.equal(r.status,'FAIL');
  assert.equal(r.exitCode,1);
  assert.equal(r.ruleCode,'BETA_INTAKE_UNPINNED_SHA_MANUAL_REVIEW_REQUIRED');
  assertNoAuthority(r);
  assert.ok(!JSON.stringify(r).includes(x.publicSourceSha));
});

test('M20-B: spoofed independent claim and inconsistent counts never promote',()=>{
  const mutations=[
    ['runnerStatus','FAIL'],['matchedControls',4],
    ['runnerStatus','ERROR'],['evaluationPath','ATTEMPTED_UNABLE_TO_RUN'],
    ['archiveOutcome','CHECKED'],['archiveOutcome','FAILED'],
    ['symbolicExitCodes','MATCHED'],['symbolicExitCodes','MISMATCH']
  ];
  for(const [key,value] of mutations){
    const x=report();x[key]=value;
    const r=preflightBetaIntake(x);
    assert.equal(r.status,'FAIL',key+':'+value);
    assert.equal(r.exitCode,1);
    assert.equal(r.ruleCode,'BETA_INTAKE_INCONSISTENT_SELF_REPORT');
    assertNoAuthority(r);
  }
  const unable={...report(),runnerStatus:'ERROR',matchedControls:0,
    evaluationPath:'ATTEMPTED_UNABLE_TO_RUN',symbolicExitCodes:'MATCHED'};
  assert.equal(preflightBetaIntake(unable).status,'FAIL');
  const fake={...report(),personallyRanProtocol:false};
  const a=preflightBetaIntake(fake);
  assert.equal(a.ruleCode,'BETA_INTAKE_EXECUTION_NOT_SELF_ATTESTED');
  assertNoAuthority(a);
  assert.equal(a.status,'FAIL');
});

test('M20-A/B: refusing disclosures, real target scope and arbitrary fields',()=>{
  const bads=[
    {...report(),fictionalOnlyConfirmed:false},
    {...report(),noSensitiveMaterialConfirmed:false}
  ];
  for(const x of bads){
    const r=preflightBetaIntake(x);
    assert.equal(r.status,'ERROR');
    assert.equal(r.exitCode,2);
    assert.equal(r.ruleCode,
      'BETA_INTAKE_PUBLIC_SAFETY_CONFIRMATION_MISSING');
    assertNoAuthority(r);
  }
  for(const [key,value] of [
    ['privateEndpoint','https://private.invalid/PRIVATE_CANARY'],
    ['secret','PRIVATE_CANARY'],['userEmail','canary@example.invalid'],
    ['logs','PRIVATE_CANARY'],['operator','PRIVATE_CANARY']
  ]){
    const x=report();x[key]=value;
    const r=preflightBetaIntake(x);
    assert.equal(r.status,'ERROR');
    assert.equal(r.ruleCode,'BETA_INTAKE_INVALID_OR_UNSAFE_INPUT');
    assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
    assert.ok(!JSON.stringify(r).includes('private.invalid'));
    assertNoAuthority(r);
  }
});

test('M20-A: type, extra keys, accessors and symbols fail without executing',()=>{
  const samples=[
    null,[],Object.create(report()),
    {...report(),operatingSystem:'MACOS'},
    {...report(),nodeMajor:19},
    {...report(),candidateVersion:'0.0.11'},
    {...report(),publicSourceSha:'PRIVATE_CANARY'},
    {...report(),matchedControls:6},
    {...report(),runnerStatus:'DENY'},
    {...report(),evaluationPath:'ANY_REMOTE_MCP'},
    {...report(),archiveOutcome:'READ_PRIVATE_ARCHIVE'},
    {...report(),symbolicExitCodes:'PRIVATE_CANARY'},
    {...report(),guideClarity:'PRIVATE_CANARY'},
    {...report(),usabilityFinding:'PRIVATE_CANARY'},
    {...report(),personallyRanProtocol:'true'},
    {...report(),noSensitiveMaterialConfirmed:'true'}
  ];
  let accessors=0;
  const getter=report();
  Object.defineProperty(getter,'runnerStatus',{
    enumerable:true,get(){accessors++;throw Error('PRIVATE_CANARY');}
  });
  samples.push(getter);
  const symbol=report();symbol[Symbol('secret')]='PRIVATE_CANARY';
  samples.push(symbol);
  const hidden=report();Object.defineProperty(hidden,'secret',{
    value:'PRIVATE_CANARY'
  });samples.push(hidden);
  for(const s of samples){
    const r=preflightBetaIntake(s);
    assert.equal(r.status,'ERROR');
    assert.equal(r.exitCode,2);
    assertNoAuthority(r);
    assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  }
  assert.equal(accessors,0);
});

test('M20-A: strict JSON duplicate keys, oversized inputs and payload secrecy',()=>{
  const valid=JSON.stringify(report());
  const duplicate=valid.replace('"schemaVersion":1',
    '"schemaVersion":1,"schemaVersion":1');
  for(const s of [
    '', '{}','[]','null','{',
    duplicate,valid+' PRIVATE_CANARY',
    ' '.repeat(4097)+valid,
    JSON.stringify({...report(),command:'read PRIVACY_CANARY'})
  ]){
    const r=preflightBetaIntakeJson(s);
    assert.equal(r.status,'ERROR');
    assert.equal(r.ruleCode,'BETA_INTAKE_INVALID_OR_UNSAFE_INPUT');
    assertNoAuthority(r);
    assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  }
  const parsed=preflightBetaIntakeJson(valid);
  assert.equal(parsed.status,'PASS');
  assert.equal(parsed.ruleCode,'BETA_INTAKE_READY_FOR_MANUAL_TRIAGE');
});

test('M20-C: stdin CLI returns 0/1/2 categories without paths or data echo',()=>{
  for(const [x,status,exit,rule] of [
    [report(),'PASS',0,'BETA_INTAKE_READY_FOR_MANUAL_TRIAGE'],
    [{...report(),publicSourceSha:'b'.repeat(40)},
      'FAIL',1,'BETA_INTAKE_UNPINNED_SHA_MANUAL_REVIEW_REQUIRED'],
    [{...report(),matchedControls:0},
      'FAIL',1,'BETA_INTAKE_INCONSISTENT_SELF_REPORT'],
    [{...report(),credentials:'PRIVATE_CANARY'},
      'ERROR',2,'BETA_INTAKE_INVALID_OR_UNSAFE_INPUT']
  ]){
    const result=call(JSON.stringify(x));
    assert.equal(result.error,undefined);
    assert.equal(result.status,exit,result.stderr);
    assert.equal(result.stderr,'');
    const output=JSON.parse(result.stdout);
    assert.equal(output.status,status);
    assert.equal(output.ruleCode,rule);
    assertNoAuthority(output);
    for(const word of ['PRIVATE_CANARY','example.invalid','http://',
      PIN,'127.0.0.1','credentials'])
      assert.ok(!result.stdout.includes(word));
  }
  for(const arg of ['--file=../PRIVATE_CANARY',
    '--target=https://private.invalid/mcp','--token=PRIVATE_CANARY']){
    const r=call(JSON.stringify(report()),arg);
    assert.equal(r.status,2);
    assert.equal(r.stderr,'');
    assert.equal(JSON.parse(r.stdout).ruleCode,
      'BETA_INTAKE_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(r.stdout+r.stderr).includes(arg));
  }
  for(const input of [
    Buffer.from([0xff,0xfe,0x42]),
    Buffer.alloc(4097,0x41),
    Buffer.from('{"source":"PRIVATE_CANARY"}')
  ]){
    const r=spawnSync(process.execPath,
      ['tools/m20-beta-intake.mjs'],{
        cwd:fileURLToPath(new URL('../',import.meta.url)),
        shell:false,timeout:15000,maxBuffer:65536,input
      });
    assert.equal(r.status,2);
    assert.equal(JSON.parse(r.stdout.toString()).status,'ERROR');
    assert.ok(!r.stdout.toString().includes('PRIVATE_CANARY'));
  }
});

test('M20-C: custom bounded stdin stream and no credential or network calls',async()=>{
  const valid=JSON.stringify(report());
  const result=await runBetaIntakeStdin([],Readable.from([
    Buffer.from(valid.slice(0,33)),Buffer.from(valid.slice(33))
  ]));
  assert.equal(result.status,'PASS');
  const oversized=await runBetaIntakeStdin([],
    Readable.from([Buffer.alloc(4100,0x61)]));
  assert.equal(oversized.status,'ERROR');
  assertNoAuthority(oversized);
  const malicious=[];Object.defineProperty(malicious,'private',{
    value:'PRIVATE_CANARY'
  });
  const blocked=await runBetaIntakeStdin(malicious,Readable.from([]));
  assert.equal(blocked.exitCode,2);
  assert.equal(blocked.ruleCode,'BETA_INTAKE_ARGUMENTS_NOT_ALLOWED');
  assertNoAuthority(blocked);
});

test('M20-C: source-only packaging and contributor beta gate remain unchanged',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(inventory.length,80);
  assert.ok(!inventory.includes('tools/m20-beta-intake.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
  assert.ok(!pkg.files.includes('.github'));
  for(const field of ['dependencies','devDependencies','peerDependencies',
    'optionalDependencies'])
    assert.equal(Object.keys(pkg[field]??{}).length,0);
});
