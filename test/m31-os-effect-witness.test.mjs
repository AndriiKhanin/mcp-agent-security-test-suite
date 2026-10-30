/** M31: independent OS-parent witness oracle. No real business effect claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runOsEffectLab,summarizeOsEffectWitness}
  from '../tools/m31-os-effect-witness.mjs';

const expected=Object.freeze([
  ['TRUTHFUL_COMMITTED','COMMITTED','PRIMARY','PRIMARY',false,0,0],
  ['FALSE_COMMITTED_NO_MARKER','COMMITTED','ABSENT','ABSENT',false,1,0],
  ['FALSE_ABSENT_WITH_MARKER','ABSENT','PRIMARY','PRIMARY',false,0,1],
  ['TRUTHFUL_ABSENT','ABSENT','ABSENT','ABSENT',false,0,0],
  ['CORRUPTED_MARKER','COMMITTED','CORRUPT','CORRUPT',false,0,0],
  ['REMOVED_BETWEEN_READS','COMMITTED','PRIMARY','ABSENT',true,0,0],
  ['REWRITTEN_BETWEEN_READS','COMMITTED','PRIMARY','REWRITTEN',true,0,0]
]);
function row([id,claim,first,second,drift,lost,duplicate]){
  return {
    id,workerStarted:true,workerDifferentFromParent:true,
    childProcessExitedCleanly:true,workerClaim:claim,
    firstParentDiskState:first,secondParentDiskState:second,
    claimMatchesFirstRead:(claim==='COMMITTED'&&first==='PRIMARY')||
      (claim==='ABSENT'&&first==='ABSENT'),
    driftControlApplied:drift,driftObserved:drift,
    unsafeClaimOnlyLost:lost,unsafeClaimOnlyDuplicate:duplicate,
    firstPartyRealOsScratchUsed:true,parentReadIndependentOfIpc:true,
    guardedDisposition:'QUARANTINE',guardedTransitions:0,
    externalBusinessEffectProven:false,
    noUserFilesOrExternalTargetsAccessed:true,scratchRemoved:true
  };
}
const reference=()=>expected.map(row);
const run=(path,...args)=>spawnSync(process.execPath,[path,...args],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),
  encoding:'utf8',windowsHide:true,shell:false,timeout:90000,
  maxBuffer:65536,env:{...process.env,NODE_OPTIONS:''}
});

test('M31-A: seven actual disposable child runs independently observed and cleaned',async()=>{
  const report=await runOsEffectLab();
  assert.equal(report.status,'PASS',JSON.stringify(report));
  assert.equal(report.exitCode,0);
  assert.equal(report.checked,7);
  assert.equal(report.matched,7);
  assert.equal(report.failed,0);
  assert.equal(report.actualOwnedOsProcessesVerified,true);
  assert.equal(report.deceptiveClaimCases,2);
  assert.equal(report.changedDiskEvidenceCases,2);
  assert.equal(report.hypotheticalUnsafeLostOperations,1);
  assert.equal(report.hypotheticalUnsafeDuplicateEffects,1);
  assert.equal(report.guardedCasesQuarantined,7);
  assert.equal(report.externalBusinessEffectProven,false);
  assert.equal(report.exactlyOnceProven,false);
  assert.equal(report.independentlyAuthenticatedObserver,false);
  assert.ok(report.cases.every(c=>c.matched));
  assert.deepEqual(report.cases.map(c=>c.id),expected.map(c=>c[0]));
  assert.deepEqual(report.cases.map(c=>c.finding),[
    'LOCAL_DISK_STATE_OBSERVED_NOT_EXTERNAL_EFFECT',
    'FALSE_CLAIM_WOULD_LOSE_UNFINISHED_WORK',
    'FALSE_CLAIM_WOULD_DUPLICATE_FINISHED_WORK',
    'LOCAL_DISK_STATE_OBSERVED_NOT_EXTERNAL_EFFECT',
    'CORRUPTED_LOCAL_MARKER_NOT_PROOF',
    'LOCAL_EVIDENCE_CHANGED_BETWEEN_READS',
    'LOCAL_EVIDENCE_CHANGED_BETWEEN_READS'
  ]);
  assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.cases));
});

test('M31-B: independent oracle checks exact pair of real disk observations',()=>{
  const baseline=summarizeOsEffectWitness(reference());
  assert.equal(baseline.status,'PASS');
  assert.equal(baseline.matched,7);
  const mutations=[
    [0,'workerStarted',false],
    [0,'workerDifferentFromParent',false],
    [0,'childProcessExitedCleanly',false],
    [0,'firstParentDiskState','ABSENT'],
    [0,'secondParentDiskState','ABSENT'],
    [1,'claimMatchesFirstRead',true],
    [1,'unsafeClaimOnlyLost',0],
    [2,'unsafeClaimOnlyDuplicate',0],
    [3,'workerClaim','COMMITTED'],
    [4,'firstParentDiskState','PRIMARY'],
    [4,'secondParentDiskState','PRIMARY'],
    [5,'driftControlApplied',false],
    [5,'driftObserved',false],
    [5,'secondParentDiskState','PRIMARY'],
    [6,'secondParentDiskState','PRIMARY'],
    [6,'driftObserved',false],
    [0,'firstPartyRealOsScratchUsed',false],
    [0,'parentReadIndependentOfIpc',false],
    [1,'guardedDisposition','RELEASED'],
    [2,'guardedTransitions',1],
    [3,'externalBusinessEffectProven',true],
    [4,'noUserFilesOrExternalTargetsAccessed',false],
    [6,'scratchRemoved',false]
  ];
  for(const [index,key,value] of mutations){
    const modified=reference();
    modified[index][key]=value;
    const result=summarizeOsEffectWitness(modified);
    assert.equal(result.status,'FAIL',index+':'+key);
    assert.equal(result.exitCode,1);
    assert.equal(result.matched,6,index+':'+key);
    assert.deepEqual(result.cases[index].mismatchedWitnessFields,[key]);
  }
});

test('M31-B: input enumeration protects oracle from getters, holes and swap',()=>{
  for(const input of [null,[],{},[null],new Array(7)]){
    const result=summarizeOsEffectWitness(input);
    assert.equal(result.status,'FAIL');
    assert.equal(result.matched,0);
  }
  const sparse=reference();
  delete sparse[2];
  assert.equal(summarizeOsEffectWitness(sparse).status,'FAIL');
  const swapped=reference();
  [swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.equal(summarizeOsEffectWitness(swapped).status,'FAIL');
  const duplicate=reference();
  duplicate.push(reference()[0]);
  assert.equal(summarizeOsEffectWitness(duplicate).status,'FAIL');
  let getterCalled=0;
  const malicious=reference();
  Object.defineProperty(malicious[1],'firstParentDiskState',{
    enumerable:true,get(){
      getterCalled++;throw Error('PRIVATE_CANARY');
    }
  });
  const result=summarizeOsEffectWitness(malicious);
  assert.equal(result.status,'FAIL');
  assert.equal(getterCalled,0);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  const privateExtra=reference();
  privateExtra[2].secret='PRIVATE_CANARY';
  const safe=summarizeOsEffectWitness(privateExtra);
  assert.equal(safe.status,'PASS');
  assert.ok(!JSON.stringify(safe).includes('PRIVATE_CANARY'));
});

test('M31-C: CLI is fixed, no external target/path or payload echoed',()=>{
  const output=run('tools/m31-os-effect-witness.mjs');
  assert.equal(output.error,undefined);
  assert.equal(output.status,0,output.stderr||output.stdout);
  assert.equal(output.stderr,'');
  const report=JSON.parse(output.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.checked,7);
  for(const forbidden of ['PRIVATE_CANARY','m31-owned-effect-',
    'effect.marker','FICTIONAL-M31','M31_OWNED_DIR',
    'http://','https://','127.0.0.1','C:\\','/tmp/',
    'SOURCE_ONLY','EFFECT_OCCURRED']){
    assert.ok(!output.stdout.includes(forbidden),forbidden);
  }
  for(const arg of ['--target=https://example.invalid',
    '--dir=PRIVATE_CANARY','--allow', '../private/file',
    '--unsafe-retry','--worker']){
    const rejected=run('tools/m31-os-effect-witness.mjs',arg);
    assert.equal(rejected.status,2,arg);
    assert.equal(rejected.stderr,'');
    const error=JSON.parse(rejected.stdout);
    assert.equal(error.status,'ERROR');
    assert.equal(error.ruleCode,'M31_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(rejected.stdout+rejected.stderr).includes(arg));
  }
  const worker=run('tools/m31-os-effect-worker.mjs');
  assert.equal(worker.status,2);
  assert.equal(worker.stderr,'');
  assert.equal(JSON.parse(worker.stdout).ruleCode,
    'DIRECT_M31_WORKER_DENIED');
});

test('M31-C: files remain outside exact unpublished 80-path package',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',
      import.meta.url)),'utf8'));
  assert.equal(pkg.version,'0.0.10-rc.1');
  assert.equal(inventory.length,80);
  for(const filename of ['tools/m31-os-effect-worker.mjs',
    'tools/m31-os-effect-witness.mjs',
    'test/m31-os-effect-witness.test.mjs']){
    assert.ok(!inventory.includes(filename),filename);
  }
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
  assert.ok(!pkg.files.includes('.github'));
});
