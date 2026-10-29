/** M17: independent, fixed-source race, negative-effect and cleanup controls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runConcurrentReplayLab,summarizeConcurrentReplay}
  from '../tools/m17-concurrent-replay-lab.mjs';

const ids=['UNSAFE_SAME_KEY','GUARDED_SAME_KEY','GUARDED_DISTINCT_KEY'];
const policies=['CHECK_THEN_COMMIT','RESERVE_BEFORE_EFFECT',
  'RESERVE_BEFORE_EFFECT'];
const observation=(i)=>{
  const unsafe=i===0,distinct=i===2;
  return {
    id:ids[i],policy:policies[i],received:2,connections:2,
    validatedBodies:2,accepted:unsafe||distinct?2:1,
    denied:unsafe||distinct?0:1,duplicateSeen:distinct?0:1,
    effects:unsafe||distinct?2:1,responsesIssued:2,
    responsesClosed:2,socketsClosed:2,overlapWitnessed:true,
    matchedBodies:true,statuses:unsafe||distinct?[200,200]:[200,409],
    socketsRemaining:0,localLoopbackOnly:true
  };
};
const observations=()=>ids.map((_,i)=>observation(i));
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/m17-concurrent-replay-lab.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),shell:false,
    encoding:'utf8',timeout:25000,maxBuffer:65536
  });

test('M17-B: independent oracle requires vulnerable double effect and defended outcome',()=>{
  const r=summarizeConcurrentReplay(observations());
  assert.equal(r.status,'PASS');
  assert.equal(r.checked,3);
  assert.equal(r.matched,3);
  assert.equal(r.failed,0);
  assert.equal(r.ruleCode,'CONCURRENT_REPLAY_DIFFERENTIAL_WITNESSED');
  assert.equal(r.intentionalUnsafeDoubleEffectExpected,true);
  assert.deepEqual(r.cases.map(x=>x.id),ids);
  assert.equal(r.cases[0].verdict,
    'INTENTIONAL_CONCURRENT_DOUBLE_EFFECT_DETECTED');
  assert.equal(r.cases[1].verdict,
    'SAME_KEY_ATOMIC_RESERVATION_DENIED_REPLAY');
  assert.equal(r.cases[2].verdict,'DISTINCT_KEYS_BOTH_ADMITTED');
  assert.equal(r.realAgentBehaviorObserved,false);
  assert.equal(r.externalMcpContacted,false);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
});

test('M17-B: independent witness mutation matrix fails closed',()=>{
  const changes=[
    [0,'effects',1],[0,'accepted',1],[0,'denied',1],
    [0,'duplicateSeen',0],[0,'overlapWitnessed',false],
    [0,'responsesIssued',1],[0,'statuses',[200,409]],
    [1,'effects',2],[1,'accepted',2],[1,'denied',0],
    [1,'duplicateSeen',0],[1,'statuses',[200,200]],
    [1,'overlapWitnessed',false],[1,'validatedBodies',1],
    [2,'effects',1],[2,'accepted',1],[2,'denied',1],
    [2,'duplicateSeen',1],[2,'statuses',[200,409]],
    [0,'responsesClosed',1],[1,'socketsClosed',1],
    [2,'socketsRemaining',1],[1,'matchedBodies',false],
    [0,'connections',1],[2,'received',1],[1,'localLoopbackOnly',false]
  ];
  for(const [i,key,value] of changes){
    const mutated=observations();
    mutated[i][key]=value;
    const r=summarizeConcurrentReplay(mutated);
    assert.equal(r.status,'FAIL',i+':'+key);
    assert.equal(r.exitCode,1,i+':'+key);
    assert.equal(r.matched,2,i+':'+key);
    assert.deepEqual(r.cases[i].mismatchedWitnessFields,[key]);
  }
});

test('M17-B: case confusion, sparse rows and fabricated fields fail safe',()=>{
  for(const bad of [null,{},[],[null],['PRIVATE_CANARY']]){
    const result=summarizeConcurrentReplay(bad);
    assert.equal(result.status,'FAIL');
    assert.equal(result.matched,0);
  }
  const swapped=observations();
  [swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.equal(summarizeConcurrentReplay(swapped).status,'FAIL');
  const sparse=observations();
  delete sparse[1];
  assert.equal(summarizeConcurrentReplay(sparse).status,'FAIL');
  const extra=observations();
  extra.push(observation(0));
  assert.equal(summarizeConcurrentReplay(extra).status,'FAIL');
  const statusSparse=observations();
  delete statusSparse[1].statuses[0];
  assert.equal(summarizeConcurrentReplay(statusSparse).status,'FAIL');
  const wrongOrder=observations();
  wrongOrder[1].statuses=[409,200];
  assert.deepEqual(summarizeConcurrentReplay(wrongOrder)
    .cases[1].mismatchedWitnessFields,['statuses']);
});

test('M17-B: no accessor-triggered side effect or private witness echo',()=>{
  const fake=observations();
  let getterCalls=0;
  Object.defineProperty(fake[0],'effects',{
    enumerable:true,get(){getterCalls++;throw Error('PRIVATE_CANARY');}
  });
  const r=summarizeConcurrentReplay(fake);
  assert.equal(r.status,'FAIL');
  assert.equal(r.matched,2);
  assert.equal(getterCalls,0);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  const irrelevant=observations();
  irrelevant[1].private='PRIVATE_CANARY';
  const harmless=summarizeConcurrentReplay(irrelevant);
  assert.equal(harmless.status,'PASS');
  assert.ok(!JSON.stringify(harmless).includes('PRIVATE_CANARY'));
});

test('M17-A: actual concurrent HTTP rendezvous, effects and socket cleanup',async()=>{
  const r=await runConcurrentReplayLab();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.matched,3);
  assert.ok(r.cases.every(x=>x.matched));
  assert.equal(r.localLoopbackOnly,true);
  assert.equal(r.realFilesystemActionPerformed,false);
  assert.equal(r.independentBetaVerified,false);
  const twice=await runConcurrentReplayLab();
  assert.equal(twice.status,'PASS','new ephemeral mock must not inherit state');
});

test('M17-C: CLI no args, no credential or endpoint input, fixed no-echo output',()=>{
  const x=cli();
  assert.equal(x.error,undefined);
  assert.equal(x.status,0,x.stderr||x.stdout);
  assert.equal(x.stderr,'');
  const r=JSON.parse(x.stdout);
  assert.equal(r.status,'PASS');
  assert.equal(r.checked,3);
  assert.equal(r.matched,3);
  for(const word of ['127.0.0.1','http://',
    'fictional-op-a','fictional-op-b','IN_MEMORY_ONLY',
    'ledger.commit','PRIVATE_CANARY']){
    assert.ok(!x.stdout.includes(word),word+' must not echo');
  }
  for(const arg of ['--target=https://private.invalid/mcp',
    '--port=1234','--token=PRIVATE_CANARY','--policy=CHECK_THEN_COMMIT',
    '--command=node']){
    const bad=cli(arg);
    assert.equal(bad.status,2,arg);
    assert.equal(bad.stderr,'');
    const err=JSON.parse(bad.stdout);
    assert.equal(err.status,'ERROR');
    assert.equal(err.ruleCode,'CONCURRENT_REPLAY_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});

test('M17-C: source-only helper does not change frozen npm candidate',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(inventory.length,80);
  assert.ok(!inventory.includes('tools/m17-concurrent-replay-lab.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
});
