/** M19: cross-suite no-echo evidence audit and independent mutation QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {summarizeOwnedAssessment,runOwnedAssessment}
  from '../tools/m19-assessment-summary.mjs';
import {runOwnedRedteamLab} from '../tools/owned-redteam-lab.mjs';
import {runOwnedAttackMatrix} from '../tools/owned-attack-matrix.mjs';
import {runPermissionReplayLab} from '../tools/m16-permission-replay-lab.mjs';
import {runConcurrentReplayLab} from '../tools/m17-concurrent-replay-lab.mjs';
import {runSymbolicBenchmark} from '../tools/m18-symbolic-evaluation.mjs';

const ids=['M15_OWNED_REDTEAM','M16_OWNED_ATTACK_MATRIX',
  'M16_PERMISSION_REPLAY','M17_CONCURRENT_REPLAY',
  'M18_SYMBOLIC_CLASSIFICATION'];
let fixturePromise;
const evidence=()=>fixturePromise??=Promise.all([
  runOwnedRedteamLab(),runOwnedAttackMatrix(),
  runPermissionReplayLab(),runConcurrentReplayLab(),
  Promise.resolve(runSymbolicBenchmark())
]);
const copy=raw=>structuredClone(raw);
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/m19-assessment-summary.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    encoding:'utf8',shell:false,timeout:60000,maxBuffer:65536
  });

test('M19-A: real local suite results combine without inflating real-agent coverage',async()=>{
  const reports=await evidence();
  assert.ok(reports.every(x=>x.status==='PASS'),JSON.stringify(
    reports.map(x=>[x.profile,x.status,x.ruleCode])));
  const result=summarizeOwnedAssessment(reports);
  assert.equal(result.status,'PASS',JSON.stringify(result));
  assert.equal(result.exitCode,0);
  assert.equal(result.ruleCode,'SOURCE_SEPARATED_EVIDENCE_MATCH');
  assert.equal(result.suiteCount,5);
  assert.equal(result.suitesMatched,5);
  assert.equal(result.ownedLocalhostWireCases,23);
  assert.equal(result.authorControlledSymbolicCases,32);
  assert.equal(result.sourceOwnedChecksTotal,55);
  assert.deepEqual(result.suites.map(x=>x.id),ids);
  assert.deepEqual(result.suites.map(x=>x.checked),[4,7,9,3,32]);
  assert.deepEqual(result.suites.map(x=>x.scope),[
    'OWNED_LOCALHOST_WIRE','OWNED_LOCALHOST_WIRE',
    'OWNED_LOCALHOST_WIRE','OWNED_LOCALHOST_WIRE',
    'AUTHOR_CONTROLLED_SYMBOLIC'
  ]);
  assert.ok(result.suites.every(x=>x.matched));
  for(const field of ['realAgentBehaviorObserved','externalMcpContacted',
    'realWorldAttackAccuracyMeasured','independentBetaVerified',
    'independentSecurityAuditCompleted','externalTargetAuthorized',
    'securityCertified','releaseAuthorized']){
    assert.equal(result[field],false,field);
  }
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.suites));
});

test('M19-B: nested PASS/55 checks cannot override invalid independent cases',async()=>{
  const source=await evidence();
  const mutations=[
    [0,p=>{p.cases[1].matched=false;}],
    [0,p=>{p.cases[1].finding='AUTHORIZED_ONLY_BASELINE';}],
    [0,p=>{p.syntheticUnsafeEffectExpected=false;}],
    [1,p=>{p.cases[0].verdict='SOURCE_OWNED_BOUNDARY_ENFORCED';}],
    [1,p=>{p.cases[1].id=p.cases[0].id;}],
    [1,p=>{p.intentionallyUnsafeCases=0;}],
    [2,p=>{p.cases[1].matched=false;}],
    [2,p=>{p.expectedGuardedSyntheticEffects=3;}],
    [2,p=>{p.cases[8].expectedDisposition='LEGITIMATE_EFFECT_ALLOWED';}],
    [3,p=>{p.cases[0].matched=false;}],
    [3,p=>{p.cases[0].verdict='DISTINCT_KEYS_BOTH_ADMITTED';}],
    [3,p=>{p.intentionalUnsafeDoubleEffectExpected=false;}],
    [4,p=>{p.cases[2].groundTruth='BENIGN';}],
    [4,p=>{p.cases[18].observedClassification='CLEAR';}],
    [4,p=>{p.metrics.truePositives=0;}],
    [4,p=>{p.metrics.falseNegatives=28;}],
    [4,p=>{p.baselines.alwaysClear.falseNegatives=0;}],
    [4,p=>{p.baselines.alwaysAlert.falsePositives=0;}],
    [4,p=>{p.baselines.naiveFailMeansAttack.unsupportedAttackClaims=0;}],
    [4,p=>{p.realWorldErrorRatesMeasured=true;}],
    [0,p=>{p.realAgentTested=true;}],
    [1,p=>{p.noExternalTarget=false;}],
    [3,p=>{p.externalMcpContacted=true;}]
  ];
  for(const [i,mutate] of mutations){
    const dirty=copy(source);
    mutate(dirty[i]);
    // Nested flags are kept PASS here, but this independent checker
    // must fail on the actual witness/classification disagreement.
    assert.equal(dirty[i].status,'PASS');
    const result=summarizeOwnedAssessment(dirty);
    assert.equal(result.status,'FAIL',i+' '+mutate.toString().slice(0,90));
    assert.equal(result.exitCode,1);
    assert.equal(result.suitesMatched,4);
    assert.equal(result.suites[i].matched,false);
    assert.ok(result.suites[i].mismatchedWitnessFields.length>=1);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  }
});

test('M19-B: sparse, duplicated and getter-containing rows never certify',async()=>{
  const source=await evidence();
  for(const bad of [[],{},null,Array(5).fill(null)]){
    const result=summarizeOwnedAssessment(bad);
    assert.equal(result.status,'FAIL');
    assert.equal(result.suitesMatched,0);
  }
  const missing=copy(source);delete missing[1];
  assert.equal(summarizeOwnedAssessment(missing).status,'FAIL');
  const extra=copy(source);extra.push(source[0]);
  assert.equal(summarizeOwnedAssessment(extra).status,'FAIL');
  const swapped=copy(source);
  [swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.equal(summarizeOwnedAssessment(swapped).status,'FAIL');
  const sparseCase=copy(source);delete sparseCase[3].cases[1];
  assert.equal(summarizeOwnedAssessment(sparseCase).status,'FAIL');
  const hidden=copy(source);
  let getterCalls=0;
  Object.defineProperty(hidden[4].metrics,'truePositives',{
    enumerable:true,get(){getterCalls++;throw Error('PRIVATE_CANARY');}
  });
  const result=summarizeOwnedAssessment(hidden);
  assert.equal(result.status,'FAIL');
  assert.equal(getterCalls,0);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  const fake=copy(source);
  fake[4].cases[2].id='PRIVATE_CANARY';
  const out=summarizeOwnedAssessment(fake);
  assert.equal(out.status,'FAIL');
  assert.ok(!JSON.stringify(out).includes('PRIVATE_CANARY'));
});

test('M19-C: zero-argument top-level command runs all actual suites',async()=>{
  const r=await runOwnedAssessment();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.suiteCount,5);
  assert.equal(r.suitesMatched,5);
  assert.equal(r.ownedLocalhostWireCases,23);
  assert.equal(r.authorControlledSymbolicCases,32);
  assert.equal(r.realWorldAttackAccuracyMeasured,false);
  const called=cli();
  assert.equal(called.error,undefined);
  assert.equal(called.status,0,called.stderr||called.stdout);
  assert.equal(called.stderr,'');
  const parsed=JSON.parse(called.stdout);
  assert.deepEqual(parsed,r);
  for(const forbidden of [
    'http://','127.0.0.1','FICTIONAL-CAPABILITY-ONLY',
    'fictional-op-a','COUNTED_IN_MEMORY_ONLY',
    'PRIVATE_CANARY','embeddedInstruction',
    'UNRELATED_FILE_READ_REQUESTED'
  ])assert.ok(!called.stdout.includes(forbidden),forbidden);
});

test('M19-C: no user arguments, endpoint or token may enter assessment',()=>{
  for(const arg of ['--target=https://example.invalid/mcp',
    '--token=PRIVATE_CANARY','--host=0.0.0.0',
    '--path=../secrets.json','--real-agent=true']){
    const r=cli(arg);
    assert.equal(r.error,undefined);
    assert.equal(r.status,2,arg);
    assert.equal(r.stderr,'');
    const out=JSON.parse(r.stdout);
    assert.equal(out.ruleCode,'ASSESSMENT_ARGUMENTS_NOT_ALLOWED');
    assert.equal(out.realAgentBehaviorObserved,false);
    assert.equal(out.externalMcpContacted,false);
    assert.ok(!(r.stdout+r.stderr).includes(arg));
  }
});

test('M19-C: unchanged 80-file npm candidate; no executable dependencies',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const paths=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(paths.length,80);
  assert.ok(!paths.includes('tools/m19-assessment-summary.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
  for(const k of ['dependencies','devDependencies','optionalDependencies',
    'peerDependencies'])
    assert.equal(Object.keys(pkg[k]??{}).length,0);
});
