/** M25-D: independent OS-process restart witness and mutation controls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  runProcessCrashLab,summarizeProcessCrashLab
} from '../tools/m25d-os-crash-relaunch.mjs';

const reference=()=>[
  {id:'UNCHANGED_PROCESS',processActuallyStarted:true,
    normalCleanupConfirmed:true,status:200,responseMatched:true,
    protectedEffectEvents:1,realAgentTested:false},
  {id:'CRASH_GUARDED',processActuallyStarted:true,
    pendingAdmissionBeforeKill:true,oldProcessTerminationRequested:true,
    oldProcessExitObserved:true,oldRequestAbortedWithoutReply:true,
    oldProcessEffectEvents:0,oldApprovalGenerationDifferent:true,
    unchangedPolicyVersion:true,staleStatus:410,staleBodyMatched:true,
    staleEffectDelta:0,newApprovalBound:true,
    freshStatus:200,freshBodyMatched:true,freshEffectDelta:1,
    newProcessEffectEvents:1,cleanNewProcessExit:true},
  {id:'CRASH_UNSAFE',processActuallyStarted:true,
    pendingAdmissionBeforeKill:true,oldProcessTerminationRequested:true,
    oldProcessExitObserved:true,oldRequestAbortedWithoutReply:true,
    oldProcessEffectEvents:0,oldApprovalGenerationDifferent:true,
    unchangedPolicyVersion:true,staleStatus:200,staleBodyMatched:true,
    staleEffectDelta:1,newApprovalBound:true,
    freshStatus:200,freshBodyMatched:true,freshEffectDelta:1,
    newProcessEffectEvents:2,cleanNewProcessExit:true}
];
const exec=(path,...args)=>spawnSync(process.execPath,[path,...args],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),shell:false,
  encoding:'utf8',windowsHide:true,timeout:40000,maxBuffer:65536
});

test('M25-D: independent oracle distinguishes real crash, guarded and unsafe',()=>{
  const r=summarizeProcessCrashLab(reference());
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.matched,3);
  assert.equal(r.checked,3);
  assert.equal(r.actualOsProcessTerminationTested,true);
  assert.equal(r.policyVersionSameAcrossRestart,true);
  assert.equal(r.oldGenerationNeverAcceptedByGuard,true);
  assert.equal(r.explicitlyVulnerableComparison,true);
  assert.equal(r.durableCrashSafePersistenceProven,false);
  assert.deepEqual(r.cases.map(x=>x.expectedFinding),[
    'UNCHANGED_APPROVAL_EXECUTED',
    'STALE_APPROVAL_REJECTED_AFTER_REAL_PROCESS_EXIT',
    'INTENTIONALLY_UNSAFE_STALE_APPROVAL_EXECUTED'
  ]);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
});

test('M25-D: denied-old, positive-fresh and unsafe comparator cannot be forged',()=>{
  const edits=[
    [0,'normalCleanupConfirmed',false],[0,'protectedEffectEvents',0],
    [0,'status',410],[0,'responseMatched',false],
    [1,'processActuallyStarted',false],
    [1,'pendingAdmissionBeforeKill',false],
    [1,'oldProcessTerminationRequested',false],
    [1,'oldProcessExitObserved',false],
    [1,'oldRequestAbortedWithoutReply',false],
    [1,'oldProcessEffectEvents',1],
    [1,'oldApprovalGenerationDifferent',false],
    [1,'unchangedPolicyVersion',false],
    [1,'staleStatus',200],[1,'staleBodyMatched',false],
    [1,'staleEffectDelta',1],[1,'newApprovalBound',false],
    [1,'freshStatus',410],[1,'freshBodyMatched',false],
    [1,'freshEffectDelta',0],[1,'newProcessEffectEvents',2],
    [1,'cleanNewProcessExit',false],
    [2,'staleStatus',410],[2,'staleEffectDelta',0],
    [2,'newProcessEffectEvents',1],
    [2,'freshStatus',410],
    [2,'oldProcessEffectEvents',1],
    [2,'oldProcessExitObserved',false]
  ];
  for(const [index,key,value] of edits){
    const rows=reference();rows[index][key]=value;
    const result=summarizeProcessCrashLab(rows);
    assert.equal(result.status,'FAIL',index+':'+key);
    assert.equal(result.exitCode,1,index+':'+key);
    assert.equal(result.matched,2,index+':'+key);
    assert.deepEqual(result.cases[index].mismatchedWitnessFields,[key]);
  }
});

test('M25-D: witness source cannot inject getters or forged case identities',()=>{
  for(const v of [[],null,{},[null]]){
    const r=summarizeProcessCrashLab(v);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const reverse=reference().reverse();
  assert.equal(summarizeProcessCrashLab(reverse).status,'FAIL');
  const missing=reference();delete missing[1];
  assert.equal(summarizeProcessCrashLab(missing).status,'FAIL');
  const added=reference();added.push(reference()[0]);
  assert.equal(summarizeProcessCrashLab(added).status,'FAIL');
  const forged=reference();
  forged[1].id='PRIVATE_CANARY';
  assert.equal(summarizeProcessCrashLab(forged).status,'FAIL');
  assert.ok(!JSON.stringify(summarizeProcessCrashLab(forged))
    .includes('PRIVATE_CANARY'));
  let triggered=0;
  const getter=reference();
  Object.defineProperty(getter[1],'staleEffectDelta',{
    enumerable:true,get(){triggered++;throw Error('PRIVATE_CANARY');}
  });
  const out=summarizeProcessCrashLab(getter);
  assert.equal(out.status,'FAIL');
  assert.equal(triggered,0);
  assert.ok(!JSON.stringify(out).includes('PRIVATE_CANARY'));
});

test('M25-D: real spawned PID dies with approval pending, new PID denies stale',async()=>{
  const report=await runProcessCrashLab();
  assert.equal(report.status,'PASS',JSON.stringify(report));
  assert.equal(report.checked,3);
  assert.equal(report.matched,3);
  assert.ok(report.cases.every(x=>x.matched));
  assert.equal(report.actualOsProcessTerminationTested,true);
  assert.equal(report.durableCrashSafePersistenceProven,false);
  assert.equal(report.realAgentTested,false);
  assert.equal(report.externalMcpContacted,false);
  assert.equal(report.realFilesystemActionPerformed,false);
});

test('M25-D: repeat OS crash test proves workers are disposable and closed',async()=>{
  const r=await runProcessCrashLab();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.failed,0);
});

test('M25-D: no-argument CLI only, no secret, host, worker PID or process path echo',()=>{
  const good=exec('tools/m25d-os-crash-relaunch.mjs');
  assert.equal(good.error,undefined);
  assert.equal(good.status,0,good.stderr||good.stdout);
  assert.equal(good.stderr,'');
  const r=JSON.parse(good.stdout);
  assert.equal(r.status,'PASS');
  assert.equal(r.matched,3);
  for(const word of ['127.0.0.1','http://',
    'FICTIONAL_CAPABILITY_NOT_AUTHORIZATION',
    'synthetic-approval-only','PRIVATE_CANARY',
    'gateGeneration','COUNTED_IN_CHILD_MEMORY']){
    assert.ok(!good.stdout.includes(word),word+' leaked into summary');
  }
  for(const arg of ['--target=https://private.invalid/mcp',
    '--pid=12345','--kill=stable-bridge','--token=PRIVATE_CANARY',
    '--policy=INTENTIONALLY_UNSAFE']){
    const denied=exec('tools/m25d-os-crash-relaunch.mjs',arg);
    assert.equal(denied.status,2,arg);
    assert.equal(denied.stderr,'');
    const report=JSON.parse(denied.stdout);
    assert.equal(report.ruleCode,'OS_GATE_RESTART_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(denied.stderr+denied.stdout).includes(arg));
  }
  const direct=exec('tools/m25d-crash-worker.mjs');
  assert.equal(direct.status,2);
  assert.equal(JSON.parse(direct.stdout).ruleCode,
    'DISPOSABLE_WORKER_DIRECT_USE_DENIED');
});

test('M25-D: source-only tools excluded from fixed 80-file release candidate',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const expected=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(expected.length,80);
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!expected.includes('tools/m25d-crash-worker.mjs'));
  assert.ok(!expected.includes('tools/m25d-os-crash-relaunch.mjs'));
  assert.equal(pkg.scripts.prepack,undefined);
});
