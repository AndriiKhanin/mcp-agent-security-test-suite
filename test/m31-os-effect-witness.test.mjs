/** M31: independently authored real scratch-effect observation control matrix. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runOsEffectWitness,summarizeOsEffectWitness}
  from '../tools/m31-os-effect-witness.mjs';

const specs=[
  ['TRUTHFUL_COMMITTED','COMMITTED','VALID','VALID',true,true,0,0,false,false],
  ['DECEPTIVE_COMMITTED_NO_EFFECT','COMMITTED','ABSENT','ABSENT',false,false,1,0,false,false],
  ['DECEPTIVE_ABSENT_REAL_EFFECT','ABSENT','VALID','VALID',false,false,0,1,false,false],
  ['TRUTHFUL_ABSENT','ABSENT','ABSENT','ABSENT',true,true,0,0,false,false],
  ['MALFORMED_MARKER','COMMITTED','INVALID','INVALID',false,false,0,0,false,false],
  ['MARKER_REMOVED_AFTER_READ','COMMITTED','VALID','ABSENT',true,false,0,0,true,true],
  ['MARKER_REWRITTEN_AFTER_READ','COMMITTED','VALID','INVALID',true,false,0,0,true,true]
];
const reference=()=>specs.map(([id,claim,first,second,firstAgrees,
    secondAgrees,lost,duplicate,drift,mutated])=>({
  id,claim,workerStarted:true,differentProcess:true,actionAck:true,
  mutationAck:mutated,firstReadback:first,secondReadback:second,
  firstClaimMatches:firstAgrees,secondClaimMatches:secondAgrees,
  readbackDrift:drift,hypotheticalClaimOnlyLost:lost,
  hypotheticalClaimOnlyDuplicate:duplicate,
  guardedDisposition:'QUARANTINE',guardedTransitions:0,
  cleanExit:true,sourceOwnedOnly:true,temporaryDirectoryRemoved:true
}));
const cli=(script,...args)=>spawnSync(process.execPath,[script,...args],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),
  encoding:'utf8',shell:false,windowsHide:true,
  timeout:60000,maxBuffer:65536,env:{...process.env,NODE_OPTIONS:''}
});

test('M31-B: source-authored real OS readback oracle requires seven cases',()=>{
  const report=summarizeOsEffectWitness(reference());
  assert.equal(report.status,'PASS');
  assert.equal(report.exitCode,0);
  assert.equal(report.checked,7);
  assert.equal(report.matched,7);
  assert.equal(report.expectedDeceptiveLossCases,1);
  assert.equal(report.expectedDeceptiveDuplicateCases,1);
  assert.equal(report.expectedDriftingReadbacks,2);
  assert.equal(report.expectedGuardedAutomatedTransitions,0);
  assert.equal(report.cases[1].finding,
    'CLAIM_ONLY_RESOLVER_WOULD_LOSE_OPERATION');
  assert.equal(report.cases[2].finding,
    'CLAIM_ONLY_RETRY_WOULD_DUPLICATE_EFFECT');
  assert.equal(report.cases[5].finding,
    'DOUBLE_OBSERVATION_CHANGED_QUARANTINED');
  assert.equal(report.cases[6].finding,
    'DOUBLE_OBSERVATION_CHANGED_QUARANTINED');
  assert.equal(report.realBusinessEffectProven,false);
  assert.equal(report.independentEffectProvenance,false);
  assert.equal(report.exactlyOnceExternalEffectProven,false);
  assert.equal(report.externalMcpContacted,false);
  assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.cases));
});

test('M31-B: fake child, effect, drift, cleanup and release witnesses fail closed',()=>{
  const changes=[
    [0,'workerStarted',false],[1,'differentProcess',false],
    [2,'actionAck',false],[5,'mutationAck',false],
    [1,'firstReadback','VALID'],[2,'firstReadback','ABSENT'],
    [4,'firstReadback','VALID'],[5,'secondReadback','VALID'],
    [6,'secondReadback','VALID'],
    [0,'firstClaimMatches',false],[1,'secondClaimMatches',true],
    [5,'secondClaimMatches',true],[5,'readbackDrift',false],
    [6,'readbackDrift',false],
    [1,'hypotheticalClaimOnlyLost',0],
    [2,'hypotheticalClaimOnlyDuplicate',0],
    [0,'guardedDisposition','COMPLETE'],
    [1,'guardedTransitions',1],
    [2,'cleanExit',false],[3,'sourceOwnedOnly',false],
    [4,'temporaryDirectoryRemoved',false],[5,'claim','ABSENT'],
    [6,'id','PRIVATE_CANARY']
  ];
  for(const [i,key,value] of changes){
    const rows=reference();rows[i][key]=value;
    const result=summarizeOsEffectWitness(rows);
    assert.equal(result.status,'FAIL',i+':'+key);
    assert.equal(result.exitCode,1,i+':'+key);
    assert.equal(result.matched,6,i+':'+key);
    assert.deepEqual(result.cases[i].mismatchedWitnessFields,[key]);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  }
});

test('M31-B: reordered, sparse, accessor-bearing and extra rows cannot pass',()=>{
  for(const rows of [null,{},[],[null]]){
    const r=summarizeOsEffectWitness(rows);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const swapped=reference();
  [swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.equal(summarizeOsEffectWitness(swapped).status,'FAIL');
  const sparse=reference();delete sparse[3];
  assert.equal(summarizeOsEffectWitness(sparse).status,'FAIL');
  const extra=reference();extra.push(reference()[0]);
  assert.equal(summarizeOsEffectWitness(extra).status,'FAIL');
  let accessed=0;
  const getter=reference();
  Object.defineProperty(getter[4],'firstReadback',{
    enumerable:true,get(){accessed++;throw Error('PRIVATE_CANARY');}
  });
  const r=summarizeOsEffectWitness(getter);
  assert.equal(r.status,'FAIL');
  assert.equal(r.matched,6);
  assert.equal(accessed,0);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  const foreign=reference();foreign[0].private='PRIVATE_CANARY';
  const safe=summarizeOsEffectWitness(foreign);
  assert.equal(safe.status,'PASS');
  assert.ok(!JSON.stringify(safe).includes('PRIVATE_CANARY'));
});

test('M31-A: real disposable OS workers and parent disk observations',async()=>{
  const report=await runOsEffectWitness();
  assert.equal(report.status,'PASS',JSON.stringify(report));
  assert.equal(report.checked,7);
  assert.equal(report.matched,7);
  assert.ok(report.cases.every(x=>x.matched));
  assert.equal(report.disposableFilesystemUsed,true);
  assert.equal(report.expectedGuardedAutomatedTransitions,0);
  assert.equal(report.releaseAuthorized,false);
  assert.equal(report.independentBetaVerified,false);
});

test('M31-C: no-argument fixed CLI and direct OS worker denied',()=>{
  const run=cli('tools/m31-os-effect-witness.mjs');
  assert.equal(run.error,undefined);
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.equal(run.stderr,'');
  const parsed=JSON.parse(run.stdout);
  assert.equal(parsed.status,'PASS');
  assert.equal(parsed.checked,7);
  assert.equal(parsed.matched,7);
  for(const text of ['PRIVATE_CANARY','m31-owned-effect-',
    'M31-FICTIONAL-COMMITTED-EFFECT','effect.marker',
    'http://','127.0.0.1','C:\\Users\\','/tmp/']){
    assert.ok(!run.stdout.includes(text),'unsafe output: '+text);
  }
  for(const arg of ['--target=https://private.invalid/mcp',
    '--root=/tmp/PRIVATE_CANARY','--mode=COMMIT','--token=PRIVATE_CANARY']){
    const invalid=cli('tools/m31-os-effect-witness.mjs',arg);
    assert.equal(invalid.status,2,arg);
    assert.equal(invalid.stderr,'');
    const bad=JSON.parse(invalid.stdout);
    assert.equal(bad.ruleCode,'M31_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(invalid.stdout+invalid.stderr).includes(arg));
  }
  const child=cli('tools/m31-owned-effect-worker.mjs',
    '--owned-effect-worker');
  assert.equal(child.status,2);
  assert.equal(child.stderr,'');
  assert.equal(JSON.parse(child.stdout).ruleCode,
    'DIRECT_OWNED_WORKER_DENIED');
});

test('M31-C: source-only OS scenario stays outside fixed npm candidate',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(inventory.length,80);
  assert.ok(!inventory.some(x=>x.includes('m31-owned-effect')));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
  assert.ok(!pkg.files.includes('.github'));
});
