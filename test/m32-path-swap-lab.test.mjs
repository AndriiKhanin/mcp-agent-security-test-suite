/** M32 deterministic OS TOCTOU: independent source-authored row oracle. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runPathSwapLab,summarizePathSwap}
  from '../tools/m32-path-swap-lab.mjs';

const cases=Object.freeze([
  ['STABLE_MARKER','PRIMARY','PRIMARY',true,true,true,false,false],
  ['SWAP_SAME_SIZE','PRIMARY','SWAPPED',true,true,true,true,true],
  ['REMOVE_AFTER_STAT','PRIMARY','ABSENT',true,false,false,false,true],
  ['CREATE_AFTER_ABSENCE','ABSENT','PRIMARY',false,true,false,false,true],
  ['REPLACE_CORRUPT','PRIMARY','CORRUPT',true,true,false,false,true],
  ['REPLACE_OVERSIZE','PRIMARY','ANOMALY',true,true,false,false,true],
  ['ADD_FOREIGN_ENTRY','PRIMARY','ANOMALY',true,true,true,false,true],
  ['STABLE_ABSENT','ABSENT','ABSENT',false,false,false,false,false]
]);
function expectedRow([id,first,later,before,after,sizeOnly,changed,drift]){
  return {
    id,workerDifferentFromParent:true,cleanWorkerExit:true,
    startedAndMutatedViaIpcBarrier:true,parentReadAfterWorkerExit:true,
    firstParentState:first,laterParentState:later,
    preMetadataPresent:before,postMetadataPresent:after,
    sizeOnlyWouldAccept:sizeOnly,sameSizeChangedBytes:changed,
    snapshotDriftObserved:drift,sourceOwnedTempFilesystemOnly:true,
    guardedDisposition:'QUARANTINE',guardedTransitions:0,
    independentlyAttestedEffect:false,
    noExternalTargetsOrUserPaths:true,scratchRemoved:true
  };
}
const reference=()=>cases.map(expectedRow);
const run=(path,...args)=>spawnSync(process.execPath,[path,...args],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),
  encoding:'utf8',windowsHide:true,shell:false,timeout:90000,
  maxBuffer:65536,env:{...process.env,NODE_OPTIONS:''}
});

test('M32-A: eight actual IPC-barrier path-swap cases leave no scratch',async()=>{
  const report=await runPathSwapLab();
  assert.equal(report.status,'PASS',JSON.stringify(report));
  assert.equal(report.checked,8);
  assert.equal(report.matched,8);
  assert.equal(report.failed,0);
  assert.equal(report.actualSourceOwnedOsRaceVerified,true);
  assert.equal(report.sizeOnlyFalseConfidenceCases,2);
  assert.equal(report.changedOrInvalidEvidenceCases,6);
  assert.equal(report.guardedCasesQuarantined,8);
  assert.equal(report.independentlyAttestedEffect,false);
  assert.equal(report.exactlyOnceProven,false);
  assert.ok(report.cases.every(row=>row.matched));
  assert.deepEqual(report.cases.map(row=>row.id),cases.map(row=>row[0]));
  assert.equal(report.cases[1].finding,
    'SIZE_ONLY_CHECK_MISSES_CONTENT_SWAP');
  assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.cases));
});

test('M32-B: independently specified exact pre/post metadata and content oracle',()=>{
  const baseline=summarizePathSwap(reference());
  assert.equal(baseline.status,'PASS');
  const mutated=[
    [0,'cleanWorkerExit',false],
    [0,'parentReadAfterWorkerExit',false],
    [0,'workerDifferentFromParent',false],
    [0,'startedAndMutatedViaIpcBarrier',false],
    [0,'firstParentState','ABSENT'],
    [1,'laterParentState','PRIMARY'],
    [1,'sameSizeChangedBytes',false],
    [1,'sizeOnlyWouldAccept',false],
    [2,'postMetadataPresent',true],
    [3,'preMetadataPresent',true],
    [4,'laterParentState','PRIMARY'],
    [5,'laterParentState','CORRUPT'],
    [6,'sizeOnlyWouldAccept',false],
    [6,'snapshotDriftObserved',false],
    [7,'firstParentState','PRIMARY'],
    [3,'sourceOwnedTempFilesystemOnly',false],
    [2,'guardedDisposition','RELEASED'],
    [1,'guardedTransitions',1],
    [3,'independentlyAttestedEffect',true],
    [4,'noExternalTargetsOrUserPaths',false],
    [5,'scratchRemoved',false]
  ];
  for(const [index,key,value] of mutated){
    const rows=reference();
    rows[index][key]=value;
    const result=summarizePathSwap(rows);
    assert.equal(result.status,'FAIL',index+':'+key);
    assert.equal(result.exitCode,1);
    assert.equal(result.matched,7,index+':'+key);
    assert.deepEqual(result.cases[index].mismatchedWitnessFields,[key]);
  }
});

test('M32-B: sparse, swapped or getter-bearing evidence never becomes proof',()=>{
  for(const invalid of [null,{},[],[null],new Array(8)]){
    const r=summarizePathSwap(invalid);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const swap=reference();[swap[0],swap[1]]=[swap[1],swap[0]];
  assert.equal(summarizePathSwap(swap).status,'FAIL');
  const sparse=reference();delete sparse[4];
  assert.equal(summarizePathSwap(sparse).status,'FAIL');
  const extra=reference();extra.push(reference()[0]);
  assert.equal(summarizePathSwap(extra).status,'FAIL');
  let called=0;
  const getter=reference();
  Object.defineProperty(getter[1],'sizeOnlyWouldAccept',{
    enumerable:true,get(){called++;throw Error('PRIVATE_CANARY');}
  });
  const bad=summarizePathSwap(getter);
  assert.equal(bad.status,'FAIL');
  assert.equal(called,0);
  assert.ok(!JSON.stringify(bad).includes('PRIVATE_CANARY'));
  const junk=reference();junk[3].arbitrary='PRIVATE_CANARY';
  const ignored=summarizePathSwap(junk);
  assert.equal(ignored.status,'PASS');
  assert.ok(!JSON.stringify(ignored).includes('PRIVATE_CANARY'));
});

test('M32-C: no-argument CLI, no target path or marker data in report',()=>{
  const good=run('tools/m32-path-swap-lab.mjs');
  assert.equal(good.error,undefined);
  assert.equal(good.status,0,good.stderr||good.stdout);
  assert.equal(good.stderr,'');
  const report=JSON.parse(good.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.checked,8);
  for(const forbidden of ['PRIVATE_CANARY','m32-owned-path-',
    'effect.marker','foreign.marker','FICTIONAL-M32',
    'M32_OWNED_ROOT','--m32-owned','127.0.0.1',
    'https://','/tmp/','C:\\']){
    assert.ok(!good.stdout.includes(forbidden),forbidden);
  }
  for(const arg of ['--target=https://example.invalid',
    '--dir=PRIVATE_CANARY','--approve','../user/private',
    '--unsafe-retry']){
    const denied=run('tools/m32-path-swap-lab.mjs',arg);
    assert.equal(denied.status,2,arg);
    assert.equal(denied.stderr,'');
    assert.equal(JSON.parse(denied.stdout).ruleCode,
      'M32_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(denied.stdout+denied.stderr).includes(arg));
  }
  const worker=run('tools/m32-path-swap-worker.mjs');
  assert.equal(worker.status,2);
  assert.equal(worker.stderr,'');
  assert.equal(JSON.parse(worker.stdout).ruleCode,
    'DIRECT_M32_WORKER_DENIED');
});

test('M32-C: source-only files stay outside frozen unpublished 80 paths',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',
      import.meta.url)),'utf8'));
  assert.equal(pkg.version,'0.0.10-rc.1');
  assert.equal(inventory.length,80);
  for(const name of ['tools/m32-path-swap-worker.mjs',
    'tools/m32-path-swap-lab.mjs','test/m32-path-swap-lab.test.mjs']){
    assert.ok(!inventory.includes(name),name);
  }
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
  assert.ok(!pkg.files.includes('.github'));
});
