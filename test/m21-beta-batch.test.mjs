/** M21: fictional offline multi-report intake, never independent beta proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  preflightBetaBatch,preflightBetaBatchJson,runBetaBatchStdin
} from '../tools/m21-beta-batch.mjs';

const PIN='2ad680ed2e4c322374fdabf3c2007e396f893a59';
const row=()=>({
  schemaVersion:1,publicSourceSha:PIN,candidateVersion:'0.0.10-rc.1',
  operatingSystem:'UBUNTU',nodeMajor:20,runnerStatus:'PASS',
  matchedControls:5,evaluationPath:'SOURCE_RUNNER_ONLY',
  archiveOutcome:'NOT_ATTEMPTED',symbolicExitCodes:'NOT_CHECKED',
  guideClarity:'CLEAR',usabilityFinding:'NONE',
  personallyRanProtocol:true,fictionalOnlyConfirmed:true,
  noSensitiveMaterialConfirmed:true
});
const noAuthority=x=>{
  assert.equal(x.manualReviewRequired,true);
  assert.equal(x.independentBetaVerified,false);
  assert.equal(x.independentTestersVerified,0);
  assert.equal(x.sourceRevisionAuthenticated,false);
  assert.equal(x.realAgentBehaviorObserved,false);
  assert.equal(x.externalMcpContacted,false);
  assert.equal(x.externalSecurityAuditCompleted,false);
  assert.equal(x.securityCertified,false);
  assert.equal(x.releaseAuthorized,false);
  assert.equal(x.uniqueHumanCountUnknown,true);
};
const run=(input,...args)=>spawnSync(process.execPath,
  ['tools/m21-beta-batch.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    encoding:'utf8',input,timeout:15000,shell:false,maxBuffer:65536
  });

test('M21-A: distinct categorical reports triage; nobody is verified',()=>{
  const second={...row(),operatingSystem:'WINDOWS',nodeMajor:22,
    guideClarity:'NEEDS_CLARIFICATION',usabilityFinding:'DOCUMENTATION'};
  const result=preflightBetaBatch([row(),second]);
  assert.equal(result.status,'PASS');
  assert.equal(result.exitCode,0);
  assert.equal(result.ruleCode,'BETA_BATCH_READY_FOR_MANUAL_TRIAGE');
  assert.equal(result.selfReportedSubmissions,2);
  assert.deepEqual(result.triageCounts,{
    nominal:2,deviation:0,blocker:0,revisionReview:0,
    noExecutionClaim:0,inconsistent:0,rejected:0
  });
  assert.deepEqual(result.selfReportedPlatformMatrix,{
    WINDOWS_NODE20:0,WINDOWS_NODE22:1,UBUNTU_NODE20:1,UBUNTU_NODE22:0
  });
  assert.equal(result.exactCategoryPatternPairs,0);
  assert.equal(result.categoryPatternsRepeated,0);
  assert.equal(result.distinctPatternsDoNotProveDistinctPeople,true);
  assert.equal(result.identicalPatternDoesNotProveSamePerson,true);
  assert.deepEqual(result.records.map(r=>r.classification),
    ['NOMINAL','NOMINAL']);
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.records));
  noAuthority(result);
});

test('M21-B: duplicates are possible collisions, never verified unique users',()=>{
  const exact=preflightBetaBatch([row(),row()]);
  assert.equal(exact.status,'PASS');
  assert.equal(exact.ruleCode,'BETA_BATCH_PATTERN_COLLISION_MANUAL_REVIEW');
  assert.equal(exact.exactCategoryPatternPairs,1);
  assert.equal(exact.categoryPatternsRepeated,1);
  assert.equal(exact.selfReportedSubmissions,2);
  noAuthority(exact);
  const triple=preflightBetaBatch([row(),row(),row()]);
  assert.equal(triple.exactCategoryPatternPairs,3);
  assert.equal(triple.categoryPatternsRepeated,1);
  assert.equal(triple.selfReportedPlatformMatrix.UBUNTU_NODE20,3);
  noAuthority(triple);
  const distinct={...row(),operatingSystem:'WINDOWS'};
  const four=preflightBetaBatch([row(),row(),distinct,distinct]);
  assert.equal(four.exactCategoryPatternPairs,2);
  assert.equal(four.categoryPatternsRepeated,2);
  assert.equal(four.independentTestersVerified,0);
});

test('M21-B: failure, revision mismatch and blocked reports remain reviewable',()=>{
  const failure={...row(),runnerStatus:'FAIL',matchedControls:4,
    evaluationPath:'SOURCE_RUNNER_AND_SMOKE',symbolicExitCodes:'MISMATCH'};
  const blocked={...row(),runnerStatus:'ERROR',matchedControls:0,
    evaluationPath:'ATTEMPTED_UNABLE_TO_RUN'};
  const revision={...row(),publicSourceSha:'a'.repeat(40)};
  const mixed=preflightBetaBatch([row(),failure,blocked,revision]);
  assert.equal(mixed.status,'FAIL');
  assert.equal(mixed.exitCode,1);
  assert.equal(mixed.ruleCode,
    'BETA_BATCH_CONTAINS_UNVERIFIED_OR_INCONSISTENT_REPORT');
  assert.equal(mixed.triageCounts.nominal,1);
  assert.equal(mixed.triageCounts.deviation,1);
  assert.equal(mixed.triageCounts.blocker,1);
  assert.equal(mixed.triageCounts.revisionReview,1);
  assert.deepEqual(mixed.records.map(r=>r.classification),
    ['NOMINAL','DEVIATION','BLOCKER','REVISION_REVIEW']);
  assert.ok(!JSON.stringify(mixed).includes('a'.repeat(40)));
  noAuthority(mixed);
  const noClaim={...row(),personallyRanProtocol:false};
  const result=preflightBetaBatch([row(),noClaim]);
  assert.equal(result.status,'FAIL');
  assert.equal(result.triageCounts.noExecutionClaim,1);
  noAuthority(result);
});

test('M21-B: contradictions and unsafe additions cannot be hidden by PASS peers',()=>{
  const broken={...row(),matchedControls:3};
  const out=preflightBetaBatch([row(),broken]);
  assert.equal(out.status,'FAIL');
  assert.equal(out.triageCounts.inconsistent,1);
  noAuthority(out);
  for(const invalid of [
    {...row(),credentials:'PRIVATE_CANARY'},
    {...row(),noSensitiveMaterialConfirmed:false},
    {...row(),fictionalOnlyConfirmed:false},
    {...row(),operatingSystem:'PRIVATE_CANARY'},
    {...row(),candidateVersion:'PRIVATE_CANARY'}
  ]){
    const r=preflightBetaBatch([row(),invalid]);
    assert.equal(r.status,'ERROR');
    assert.equal(r.exitCode,2);
    assert.equal(r.ruleCode,'BETA_BATCH_CONTAINS_UNSAFE_REPORT');
    assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
    assert.ok(!JSON.stringify(r).includes(PIN));
    noAuthority(r);
  }
});

test('M21-A/B: malformed arrays, extra/sparse/getter indices fail closed',()=>{
  const wrong=[null,{},[],[row()],Array(5).fill(row()),
    Object.create([row(),row()])];
  const missing=[row(),row()];delete missing[1];wrong.push(missing);
  const hidden=[row(),row()];
  Object.defineProperty(hidden,'PRIVATE_CANARY',{value:1});
  wrong.push(hidden);
  const symbolic=[row(),row()];
  symbolic[Symbol('PRIVATE_CANARY')]=1;
  wrong.push(symbolic);
  let touched=0;
  const getter=[row(),row()];
  Object.defineProperty(getter,1,{enumerable:true,get(){
    touched++;throw Error('PRIVATE_CANARY');
  }});
  wrong.push(getter);
  for(const input of wrong){
    const result=preflightBetaBatch(input);
    assert.equal(result.status,'ERROR');
    assert.equal(result.exitCode,2);
    assert.equal(result.ruleCode,'BETA_BATCH_INVALID_OR_UNSAFE_INPUT');
    assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
    noAuthority(result);
  }
  assert.equal(touched,0);
  const invalidRecord=preflightBetaBatch([row(),null]);
  assert.equal(invalidRecord.status,'ERROR');
  assert.equal(invalidRecord.ruleCode,'BETA_BATCH_CONTAINS_UNSAFE_REPORT');
  noAuthority(invalidRecord);
  const unsafe=row();
  Object.defineProperty(unsafe,'runnerStatus',{enumerable:true,get(){
    touched++;throw Error('PRIVATE_CANARY');
  }});
  const result=preflightBetaBatch([row(),unsafe]);
  assert.equal(result.status,'ERROR');
  assert.equal(touched,0);
});

test('M21-A: reject duplicate JSON keys, oversize, invalid UTF-8 and extras',()=>{
  const valid=JSON.stringify([row(),row()]);
  for(const payload of [
    '', '[]','[{}]','[null,null]','{}',
    valid.replace('"schemaVersion":1','"schemaVersion":1,"schemaVersion":1'),
    valid+' PRIVATE_CANARY',
    JSON.stringify([{...row(),privateEndpoint:'https://private.invalid'},row()]),
    ' '.repeat(16385)
  ]){
    const result=preflightBetaBatchJson(payload);
    assert.equal(result.status,'ERROR');
    assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
    noAuthority(result);
  }
  assert.equal(preflightBetaBatchJson(valid).status,'PASS');
});

test('M21-C: fixed stdin CLI emits safe categories, never input records',()=>{
  const identical=JSON.stringify([row(),row()]);
  const good=run(identical);
  assert.equal(good.error,undefined);
  assert.equal(good.status,0,good.stderr);
  assert.equal(good.stderr,'');
  const result=JSON.parse(good.stdout);
  assert.equal(result.status,'PASS');
  assert.equal(result.exactCategoryPatternPairs,1);
  noAuthority(result);
  for(const prohibited of [PIN,'PRIVATE_CANARY','http://','127.0.0.1',
    'candidateVersion','personallyRanProtocol','2ad680ed']){
    assert.ok(!good.stdout.includes(prohibited),prohibited);
  }
  for(const arg of [
    '--file=../PRIVATE_CANARY','--target=https://private.invalid/mcp',
    '--publish','--token=PRIVATE_CANARY'
  ]){
    const r=run(identical,arg);
    assert.equal(r.status,2);
    assert.equal(r.stderr,'');
    assert.equal(JSON.parse(r.stdout).ruleCode,
      'BETA_BATCH_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(r.stdout+r.stderr).includes(arg));
  }
});

test('M21-C: streaming bytes are bounded and never touch user-selected files',async()=>{
  const text=JSON.stringify([row(),row()]);
  const r=await runBetaBatchStdin([],Readable.from([
    Buffer.from(text.slice(0,24)),Buffer.from(text.slice(24))
  ]));
  assert.equal(r.status,'PASS');
  const oversized=await runBetaBatchStdin([],
    Readable.from([Buffer.alloc(16385,0x41)]));
  assert.equal(oversized.status,'ERROR');
  noAuthority(oversized);
  const secret=await runBetaBatchStdin([],
    Readable.from([Buffer.from([0xff,0xfe,0x41])]));
  assert.equal(secret.status,'ERROR');
  noAuthority(secret);
  const args=[];Object.defineProperty(args,'extra',{value:'PRIVATE_CANARY'});
  const invalid=await runBetaBatchStdin(args,Readable.from([]));
  assert.equal(invalid.ruleCode,'BETA_BATCH_ARGUMENTS_NOT_ALLOWED');
  assert.ok(!JSON.stringify(invalid).includes('PRIVATE_CANARY'));
});

test('M21-C: 80-file unpublished npm candidate and security gates intact',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const manifest=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(manifest.length,80);
  assert.ok(!manifest.includes('tools/m21-beta-batch.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
  assert.ok(!pkg.files.includes('.github'));
});
