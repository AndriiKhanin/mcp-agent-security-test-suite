/** M27: independent crash-window, replay and in-doubt witness tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  runIndoubtCrashLab,summarizeIndoubtCrash
} from '../tools/m27-indoubt-crash-replay.mjs';

const ids=['CRASH_BEFORE_EFFECT_GUARDED',
  'CRASH_AFTER_EFFECT_GUARDED','CRASH_AFTER_EFFECT_UNSAFE_RETRY'];
const reference=()=>ids.map((id,i)=>({
  id,firstProcessStarted:true,firstPrepared:true,
  claimedBeforeEffect:true,firstEffectStaged:i!==0,
  effectsBeforeCrash:i!==0?1:0,noFirstAck:true,
  firstKilled:true,firstExitObserved:true,markerSurvived:true,
  differentProcess:true,secondProcessStarted:true,
  staleStatus:i===2?200:423,replayEffects:i===2?1:0,
  freshStatus:200,freshEffects:1,
  pendingStillQuarantined:true,freshMarker:true,markerCount:2,
  secondClosed:true,firstPartyOnly:true,tempDirectoryRemoved:true
}));
const cli=(name,...args)=>spawnSync(process.execPath,[name,...args],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),
  encoding:'utf8',shell:false,windowsHide:true,
  timeout:45000,maxBuffer:65536
});

test('M27-B: synthetic crash window oracle keeps pending distinct from done',()=>{
  const r=summarizeIndoubtCrash(reference());
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.checked,3);
  assert.equal(r.matched,3);
  assert.equal(r.failed,0);
  assert.deepEqual(r.cases.map(x=>x.finding),[
    'IN_DOUBT_WITHOUT_EFFECT_STAYS_QUARANTINED',
    'UNACKNOWLEDGED_EFFECT_REPLAY_BLOCKED',
    'UNSAFE_IN_DOUBT_DUPLICATE_EFFECT_DETECTED'
  ]);
  assert.equal(r.actualOsWorkerKilled,true);
  assert.equal(r.disposableFilesystemUsed,true);
  assert.equal(r.exactlyOnceProven,false);
  assert.equal(r.powerLossDurabilityProven,false);
  assert.equal(r.realAgentTested,false);
  assert.equal(r.externalMcpContacted,false);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
});

test('M27-B: missing, duplicated or fabricated effect fails independent oracle',()=>{
  const changes=[
    [0,'firstEffectStaged',true],
    [0,'effectsBeforeCrash',1],
    [1,'effectsBeforeCrash',0],
    [2,'effectsBeforeCrash',0],
    [0,'claimedBeforeEffect',false],
    [1,'noFirstAck',false],
    [2,'noFirstAck',false],
    [0,'firstKilled',false],
    [1,'firstExitObserved',false],
    [2,'differentProcess',false],
    [0,'markerSurvived',false],
    [1,'staleStatus',200],
    [1,'replayEffects',1],
    [0,'staleStatus',200],
    [0,'replayEffects',1],
    [2,'staleStatus',423],
    [2,'replayEffects',0],
    [2,'pendingStillQuarantined',false],
    [1,'freshStatus',423],
    [1,'freshEffects',0],
    [0,'freshMarker',false],
    [2,'markerCount',1],
    [2,'secondClosed',false],
    [1,'firstPartyOnly',false],
    [0,'tempDirectoryRemoved',false]
  ];
  for(const [i,key,value] of changes){
    const x=reference();x[i][key]=value;
    const report=summarizeIndoubtCrash(x);
    assert.equal(report.status,'FAIL',i+':'+key);
    assert.equal(report.exitCode,1);
    assert.equal(report.matched,2);
    assert.deepEqual(report.cases[i].mismatchedWitnessFields,[key]);
  }
});

test('M27-B: sparse, re-ordered, accessors and foreign fields cannot forge a pass',()=>{
  for(const input of [null,{},[],[null]]){
    const r=summarizeIndoubtCrash(input);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const reordered=reference().reverse();
  assert.equal(summarizeIndoubtCrash(reordered).status,'FAIL');
  const sparse=reference();delete sparse[0];
  assert.equal(summarizeIndoubtCrash(sparse).status,'FAIL');
  const extra=reference();extra.push(reference()[0]);
  assert.equal(summarizeIndoubtCrash(extra).status,'FAIL');
  const forged=reference();forged[1].id='PRIVATE_CANARY';
  const invalid=summarizeIndoubtCrash(forged);
  assert.equal(invalid.status,'FAIL');
  assert.ok(!JSON.stringify(invalid).includes('PRIVATE_CANARY'));
  let calls=0;const getter=reference();
  Object.defineProperty(getter[2],'replayEffects',{enumerable:true,get(){
    calls++;throw Error('PRIVATE_CANARY');
  }});
  const denied=summarizeIndoubtCrash(getter);
  assert.equal(denied.status,'FAIL');
  assert.equal(calls,0);
  assert.ok(!JSON.stringify(denied).includes('PRIVATE_CANARY'));
});

test('M27-A: actual owned OS child killed after claim and after IPC effect',async()=>{
  const first=await runIndoubtCrashLab();
  assert.equal(first.status,'PASS',JSON.stringify(first));
  assert.equal(first.checked,3);
  assert.equal(first.matched,3);
  assert.ok(first.cases.every(x=>x.matched));
  assert.equal(first.unresolvedClaimsRetainedOutsideTest,false);
  const repeated=await runIndoubtCrashLab();
  assert.deepEqual(repeated,first,'each execution must clean private scratch');
});

test('M27-C: fixed zero-argument CLI rejects targets and direct worker startup',()=>{
  const out=cli('tools/m27-indoubt-crash-replay.mjs');
  assert.equal(out.error,undefined);
  assert.equal(out.status,0,out.stderr||out.stdout);
  assert.equal(out.stderr,'');
  const report=JSON.parse(out.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.matched,3);
  for(const secret of ['PRIVATE_CANARY','m27-owned-indoubt-',
    'claim-alpha.marker','FICTIONAL-IN-DOUBT-V1','SIGKILL',
    'http://','127.0.0.1','C:\\','/tmp/']){
    assert.ok(!out.stdout.includes(secret),'report echoed '+secret);
  }
  for(const arg of ['--target=https://example.invalid',
    '--dir=PRIVATE_CANARY','--pid=1234','--key=alpha',
    '--policy=INTENTIONALLY_UNSAFE_RETRY']){
    const bad=cli('tools/m27-indoubt-crash-replay.mjs',arg);
    assert.equal(bad.status,2,arg);
    assert.equal(bad.stderr,'');
    assert.equal(JSON.parse(bad.stdout).ruleCode,
      'INDOUBT_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
  const worker=cli('tools/m27-indoubt-worker.mjs');
  assert.equal(worker.status,2);
  assert.equal(worker.stderr,'');
  assert.equal(JSON.parse(worker.stdout).ruleCode,
    'DIRECT_DISPOSABLE_WORKER_DENIED');
});

test('M27-C: source-only scratch scenario does not alter unpublished candidate',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  const paths=JSON.parse(readFileSync(new URL('./expected-package-files.json',
    import.meta.url),'utf8'));
  assert.equal(paths.length,80);
  assert.equal(pkg.version,'0.0.10-rc.1');
  assert.ok(!paths.includes('tools/m27-indoubt-worker.mjs'));
  assert.ok(!paths.includes('tools/m27-indoubt-crash-replay.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('.github'));
  assert.equal(pkg.scripts.publish,undefined);
});
