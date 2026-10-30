/** M32 deterministic OS TOCTOU: independent source-authored row oracle. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runPathSwapLab,summarizePathSwap,
  runFixedChildProcessEffectSelftest,runFixedChildProcessEffectFaultSelftest,
  runFixedOsHandleRightsSelftest,runFixedOsHandleFalseReportSelftest}
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

test('M50: 6 actual fixed child processes obey source-bound grant with OS readback',async()=>{
  const r=await runFixedChildProcessEffectSelftest();
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.checked,6);
  assert.equal(r.matched,6);
  assert.equal(r.deniedWrites,5);
  assert.equal(r.actualAuthorizedEffects,1);
  assert.equal(r.unauthorizedEffects,0);
  assert.equal(r.cleanupVerified,true);
  assert.equal(r.realChildProcessUsed,true);
  assert.equal(r.realTemporaryFileReadback,true);
  assert.equal(r.osSandboxed,false);
  assert.equal(r.realOwnerAuthenticated,false);
  assert.equal(r.realAgentBehaviorObserved,false);
  assert.equal(r.externalMcpContacted,false);
  assert.equal(r.independentBetaVerified,false);
  assert.equal(r.releaseAuthorized,false);
  assert.deepEqual(r.cases.map(row=>row.status),
    Array(6).fill('PASS'));
  assert.deepEqual(r.cases.map(row=>row.observedDecision),
    ['ALLOW','DENY','DENY','DENY','DENY','DENY']);
  assert.deepEqual(r.cases.map(row=>row.actualFilesReadBack),
    [1,0,0,0,0,0]);
  for(const row of r.cases){
    assert.equal(row.childReaped,true,row.caseId);
    assert.equal(row.childExitCode,0,row.caseId);
    assert.equal(row.childRequests,1,row.caseId);
    assert.equal(row.childReports,1,row.caseId);
    assert.equal(row.cleanupVerified,true,row.caseId);
    assert.equal(row.realChildProcessUsed,true);
    assert.equal(row.osSandboxed,false);
    assert.equal(row.unauthorizedFilesReadBack,0);
    assert.equal(Object.isFrozen(row),true);
  }
  assert.equal(r.cases[0].approvedBytesReadBack,true);
  const output=JSON.stringify(r);
  assert.doesNotMatch(output,/mcp-m50-child-|fictional-child-task\.json/);
  assert.doesNotMatch(output,/source-owned-approved|PRIVATE_CANARY|NODE_OPTIONS/);
  assert.doesNotMatch(output,/\/tmp\/|AppData|[A-Z]:\\Users/);
});

test('M50: negative child controls prove independent forbidden-effect detection',async()=>{
  const r=await runFixedChildProcessEffectFaultSelftest();
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.checked,5);
  assert.equal(r.caught,5);
  assert.equal(r.osSandboxed,false);
  assert.equal(r.externalMcpContacted,false);
  assert.deepEqual(r.cases.map(x=>x.ruleCode),[
    'M50_UNAUTHORIZED_CHILD_EFFECT_OBSERVED',
    'M50_CHILD_REPORT_CONTRADICTS_DISK',
    'M50_CHILD_IPC_REJECTED',
    'M50_CHILD_EXIT_FAILED',
    'M50_CHILD_TIMEOUT'
  ]);
  for(const row of r.cases){
    assert.equal(row.status,'FAIL');
    assert.equal(row.childReaped,true,row.fault);
    assert.equal(row.cleanupVerified,true,row.fault);
    assert.equal(row.expectedDecision,'DENY');
    assert.equal(row.actualFilesReadBack,row.fault==='unauthorized-write'?1:0);
    assert.equal(row.unauthorizedFilesReadBack,row.fault==='unauthorized-write'?1:0);
    assert.ok(Object.isFrozen(row));
  }
  assert.equal(r.cases[0].observedDecision,'DENY');
  assert.equal(r.cases[0].childClaimedEffect,true);
  assert.equal(r.cases[1].childClaimedEffect,true);
  assert.equal(r.cases[1].actualFilesReadBack,0);
  assert.doesNotMatch(JSON.stringify(r),/FICTIONAL_CANARY|mcp-m50-child-/);
});

test('M50: public fixed CLI and private worker reject extraneous arguments',()=>{
  const run=(...args)=>spawnSync(process.execPath,
    ['tools/m32-path-swap-lab.mjs',...args],{encoding:'utf8',
      timeout:30000,maxBuffer:65536});
  const ok=run('--child-process-effect-witness');
  assert.equal(ok.status,0,ok.stderr);
  assert.equal(ok.stderr,'');
  const output=JSON.parse(ok.stdout);
  assert.equal(output.status,'PASS');
  assert.equal(output.checked,6);
  assert.equal(output.actualAuthorizedEffects,1);
  assert.equal(output.unauthorizedEffects,0);
  assert.ok(!ok.stdout.includes('mcp-m50-child-'));
  for(const argv of [
    ['--child-process-effect-witness','--path=PRIVATE_CANARY'],
    ['--child-process-effect-witness','--fault=unauthorized-write'],
    ['--child-process-effect-witness','--role=OWNER_DIRECT'],
    ['--child-process-effect-witness','--endpoint=https://example.invalid']
  ]){
    const bad=run(...argv);
    assert.equal(bad.status,2,bad.stderr);
    assert.equal(bad.stderr,'');
    assert.equal(JSON.parse(bad.stdout).ruleCode,
      'M32_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!bad.stdout.includes('PRIVATE_CANARY'));
  }
  const noIpc=run('--m50-private-worker','owner-write','normal');
  assert.equal(noIpc.status,2);
  assert.equal(noIpc.stdout,'');
});

test('M50: direct APIs reject non-empty, sparse and getter-bearing arguments',async()=>{
  const accessor=[];
  Object.defineProperty(accessor,'0',{get(){throw Error('PRIVATE_CANARY');}});
  const hidden=[];
  Object.defineProperty(hidden,'private',{value:'PRIVATE_CANARY'});
  for(const args of [null,{},['anything'],Array(1),accessor,hidden]){
    for(const fn of [runFixedChildProcessEffectSelftest,
      runFixedChildProcessEffectFaultSelftest]){
      const r=await fn(args);
      assert.equal(r.status,'ERROR');
      assert.equal(r.exitCode,2);
      assert.equal(r.ruleCode,'M50_FIXED_CHILD_EFFECT_SELFTEST_UNAVAILABLE');
      assert.equal(r.externalMcpContacted,false);
      assert.equal(r.realOwnerAuthenticated,false);
      assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
    }
  }
});



test('M51: OS denies read-only FD writes; same-user path reopen still works',async()=>{
  const r=await runFixedOsHandleRightsSelftest();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.exitCode,0);
  assert.equal(r.checked,3);
  assert.equal(r.matched,3);
  assert.equal(r.realReadOnlyHandleWriteDenied,true);
  assert.equal(r.writableHandlePositiveControl,true);
  assert.equal(r.sameUserPathReopenBypassConfirmed,true);
  assert.equal(r.cleanupVerified,true);
  assert.equal(r.osSandboxed,false);
  assert.equal(r.arbitraryPathAccessPrevented,false);
  assert.equal(r.externalMcpContacted,false);
  assert.equal(r.releaseAuthorized,false);
  assert.deepEqual(r.cases.map(c=>c.caseId),['RO','RW','REOPEN']);
  assert.deepEqual(r.cases.map(c=>c.handleWriteDenied),[true,false,true]);
  assert.deepEqual(r.cases.map(c=>c.actualFileEffect),
    ['UNCHANGED','MODIFIED','MODIFIED']);
  for(const c of r.cases){
    assert.equal(c.status,'PASS');
    assert.equal(c.childReaped,true);
    assert.equal(c.childExitCode,0);
    assert.equal(c.cleanupVerified,true);
    assert.equal(c.osSandboxed,false);
    assert.ok(Object.isFrozen(c));
  }
  assert.doesNotMatch(JSON.stringify(r),
    /m51-owned-|fictional\.txt|FICTIONAL-|PRIVATE_CANARY/);
});

test('M51: false child report fails independent parent disk check',async()=>{
  const r=await runFixedOsHandleFalseReportSelftest();
  assert.equal(r.caseId,'LIAR');
  assert.equal(r.status,'FAIL');
  assert.equal(r.ruleCode,'M51_FALSE_CHILD_EFFECT_CLAIM');
  assert.equal(r.childClaimedEffect,false);
  assert.equal(r.actualFileEffect,'MODIFIED');
  assert.equal(r.childReaped,true);
  assert.equal(r.cleanupVerified,true);
});

test('M51: no arbitrary path/target and no direct private worker',()=>{
  const good=run('tools/m32-path-swap-lab.mjs','--os-filehandle-rights-witness');
  assert.equal(good.status,0,good.stderr);
  assert.equal(JSON.parse(good.stdout).sameUserPathReopenBypassConfirmed,true);
  for(const extra of ['--path=PRIVATE_CANARY','--role=OWNER',
    '--target=https://example.invalid']){
    const bad=run('tools/m32-path-swap-lab.mjs',
      '--os-filehandle-rights-witness',extra);
    assert.equal(bad.status,2);
    assert.equal(JSON.parse(bad.stdout).ruleCode,'M32_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!bad.stdout.includes('PRIVATE_CANARY'));
  }
  const worker=run('tools/m32-path-swap-lab.mjs','--m51-private-worker','RO');
  assert.equal(worker.status,2);
  assert.equal(worker.stdout,'');
});

test('M51: direct API fails closed on malformed input',async()=>{
  const getter=[];
  Object.defineProperty(getter,'0',{get(){throw Error('PRIVATE_CANARY');}});
  for(const args of [null,{},['UNSAFE'],Array(1),getter]){
    for(const fn of [runFixedOsHandleRightsSelftest,
      runFixedOsHandleFalseReportSelftest]){
      const report=await fn(args);
      assert.equal(report.status,'ERROR');
      assert.equal(report.exitCode,2);
      assert.equal(report.osSandboxed,false);
      assert.ok(!JSON.stringify(report).includes('PRIVATE_CANARY'));
    }
  }
});
