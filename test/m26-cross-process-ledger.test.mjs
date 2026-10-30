/** M26: independent cross-process file-ledger / crash/replay control tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  summarizeCrossProcessLedger,runCrossProcessLedger
} from '../tools/m26-cross-process-ledger.mjs';

const reference=()=>[
  {id:'GUARDED_CRASH_REPLAY',
    firstProcessStarted:true,firstPrepared:true,
    initialStatus:200,firstEffects:1,firstMarkers:1,
    oldProcessKilled:true,oldProcessExitObserved:true,
    afterCrashMarkers:1,differentProcess:true,
    secondProcessStarted:true,stalePrepared:true,
    staleStatus:409,staleEffects:0,freshPrepared:true,
    freshStatus:200,freshEffects:1,markerCount:2,
    newProcessClosed:true,firstPartyOnly:true,
    tempDirectoryRemoved:true},
  {id:'TRANSIENT_UNSAFE_REPLAY',
    firstProcessStarted:true,firstPrepared:true,
    initialStatus:200,firstEffects:1,firstMarkers:0,
    oldProcessKilled:true,oldProcessExitObserved:true,
    afterCrashMarkers:0,differentProcess:true,
    secondProcessStarted:true,stalePrepared:true,
    staleStatus:200,staleEffects:1,freshPrepared:true,
    freshStatus:200,freshEffects:1,markerCount:0,
    newProcessClosed:true,firstPartyOnly:true,
    tempDirectoryRemoved:true},
  {id:'GUARDED_PARALLEL_CLAIM',
    twoProcessesStarted:true,differentProcesses:true,
    bothPreparedBeforeRelease:true,statuses:[200,409],
    effectEvents:1,markerCount:1,bothWorkersClosed:true,
    firstPartyOnly:true,tempDirectoryRemoved:true}
];
const cli=(path,...args)=>spawnSync(process.execPath,[path,...args],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),shell:false,
  encoding:'utf8',timeout:45000,maxBuffer:65536,
  windowsHide:true
});

test('M26: reference oracle separates protected restart, unsafe and two-worker claim',()=>{
  const r=summarizeCrossProcessLedger(reference());
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.matched,3);
  assert.equal(r.checked,3);
  assert.deepEqual(r.cases.map(x=>x.finding),[
    'PERSISTED_KEY_REPLAY_DENIED_AFTER_OS_RESTART',
    'TRANSIENT_POLICY_DOUBLE_EFFECT_WITNESSED',
    'ATOMIC_CROSS_PROCESS_CLAIM_WITNESSED'
  ]);
  assert.equal(r.actualOsWorkersStarted,true);
  assert.equal(r.actualOsProcessTerminationTested,true);
  assert.equal(r.atomicExclusiveFileClaimTested,true);
  assert.equal(r.disposableFilesystemUsed,true);
  assert.equal(r.tempFilesRetained,false);
  assert.equal(r.powerLossDurabilityProven,false);
  assert.equal(r.realAgentTested,false);
  assert.equal(r.externalMcpContacted,false);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
});
test('M26: independent oracle rejects forged replay, cleanup and fake barrier',()=>{
  const mutations=[
    [0,'firstProcessStarted',false],[0,'firstPrepared',false],
    [0,'initialStatus',409],[0,'firstEffects',0],
    [0,'firstMarkers',0],[0,'oldProcessKilled',false],
    [0,'oldProcessExitObserved',false],[0,'afterCrashMarkers',0],
    [0,'differentProcess',false],[0,'secondProcessStarted',false],
    [0,'stalePrepared',false],[0,'staleStatus',200],
    [0,'staleEffects',1],[0,'freshPrepared',false],
    [0,'freshStatus',409],[0,'freshEffects',0],
    [0,'markerCount',1],[0,'newProcessClosed',false],
    [0,'firstPartyOnly',false],[0,'tempDirectoryRemoved',false],
    [1,'firstMarkers',1],[1,'afterCrashMarkers',1],
    [1,'staleStatus',409],[1,'staleEffects',0],
    [1,'markerCount',1],[1,'freshEffects',0],
    [2,'twoProcessesStarted',false],[2,'differentProcesses',false],
    [2,'bothPreparedBeforeRelease',false],[2,'effectEvents',2],
    [2,'markerCount',2],[2,'statuses',[200,200]],
    [2,'bothWorkersClosed',false],[2,'tempDirectoryRemoved',false]
  ];
  for(const [i,k,v] of mutations){
    const input=reference();input[i][k]=v;
    const r=summarizeCrossProcessLedger(input);
    assert.equal(r.status,'FAIL',i+':'+k);
    assert.equal(r.exitCode,1,i+':'+k);
    assert.equal(r.matched,2,i+':'+k);
    assert.deepEqual(r.cases[i].mismatchedWitnessFields,[k]);
  }
});
test('M26: invalid sparse, extra and accessor-bearing observations fail closed',()=>{
  for(const bad of [null,[],{},[null]]){
    const out=summarizeCrossProcessLedger(bad);
    assert.equal(out.status,'FAIL');
    assert.equal(out.matched,0);
  }
  const sparse=reference();delete sparse[1];
  assert.equal(summarizeCrossProcessLedger(sparse).status,'FAIL');
  const extra=reference();extra.push(reference()[0]);
  assert.equal(summarizeCrossProcessLedger(extra).status,'FAIL');
  const reverse=reference().reverse();
  assert.equal(summarizeCrossProcessLedger(reverse).status,'FAIL');
  const fake=reference();fake[1].id='PRIVATE_CANARY';
  assert.equal(summarizeCrossProcessLedger(fake).status,'FAIL');
  assert.ok(!JSON.stringify(summarizeCrossProcessLedger(fake))
    .includes('PRIVATE_CANARY'));
  let called=0;
  const getter=reference();
  Object.defineProperty(getter[0],'staleEffects',{
    enumerable:true,get(){called++;throw Error('PRIVATE_CANARY');}
  });
  const r=summarizeCrossProcessLedger(getter);
  assert.equal(r.status,'FAIL');
  assert.equal(called,0);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  const statuses=reference();delete statuses[2].statuses[0];
  assert.deepEqual(summarizeCrossProcessLedger(statuses)
    .cases[2].mismatchedWitnessFields,['statuses']);
});
test('M26: real scratch-file witness survives actual child kill, denies replay',async()=>{
  const result=await runCrossProcessLedger();
  assert.equal(result.status,'PASS',JSON.stringify(result));
  assert.equal(result.checked,3);
  assert.equal(result.matched,3);
  assert.equal(result.actualOsProcessTerminationTested,true);
  assert.equal(result.atomicExclusiveFileClaimTested,true);
  assert.equal(result.powerLossDurabilityProven,false);
  assert.ok(result.cases.every(x=>x.matched));
});
test('M26: second full run has fresh keys, no residual workers or temp markers',async()=>{
  const a=await runCrossProcessLedger();
  const b=await runCrossProcessLedger();
  assert.equal(a.status,'PASS',JSON.stringify(a));
  assert.deepEqual(a,b);
});
test('M26: fixed no-argument CLI and worker direct-use denial do not echo paths',()=>{
  const good=cli('tools/m26-cross-process-ledger.mjs');
  assert.equal(good.error,undefined);
  assert.equal(good.status,0,good.stderr||good.stdout);
  assert.equal(good.stderr,'');
  const report=JSON.parse(good.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.matched,3);
  for(const word of ['m26-owned-ledger-','spent-alpha.marker',
    'FICTIONAL-SPENT-V1','PRIVATE_CANARY','/tmp/',
    'C:\\','SIGKILL','http://','127.0.0.1']){
    assert.ok(!good.stdout.includes(word),word+' leaked');
  }
  for(const arg of ['--target=https://private.invalid/mcp',
    '--dir=/tmp/PRIVATE_CANARY','--pid=1234',
    '--token=PRIVATE_CANARY','--policy=INTENTIONALLY_TRANSIENT']){
    const bad=cli('tools/m26-cross-process-ledger.mjs',arg);
    assert.equal(bad.status,2,arg);
    assert.equal(bad.stderr,'');
    const result=JSON.parse(bad.stdout);
    assert.equal(result.status,'ERROR');
    assert.equal(result.ruleCode,'CROSS_PROCESS_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
  const direct=cli('tools/m26-ledger-worker.mjs');
  assert.equal(direct.status,2);
  assert.equal(direct.stderr,'');
  assert.equal(JSON.parse(direct.stdout).ruleCode,
    'DIRECT_DISPOSABLE_WORKER_DENIED');
});
test('M26: scratch-only worker does not change unpublished 80-file npm inventory',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const paths=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(paths.length,80);
  assert.ok(!paths.includes('tools/m26-cross-process-ledger.mjs'));
  assert.ok(!paths.includes('tools/m26-ledger-worker.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('.github'));
  assert.equal(pkg.scripts.prepack,undefined);
});
