/** M28 — first-party ambiguity, invalid recovery claims and non-echo QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runRecoveryAmbiguityLab,summarizeRecoveryAmbiguity}
  from '../tools/m28-recovery-ambiguity.mjs';

const policies=['BLIND_RETRY','ASSUME_DONE','GUARDED_QUARANTINE',
  'GUARDED_FORGED_PROOF'];
const worlds=['NO_EFFECT','EFFECT_ALREADY_OCCURRED'];
const rows=()=>policies.flatMap((policy,p)=>worlds.map((world,w)=>({
  id:policy+'_'+world,policy,world,
  firstPartyMarkerWritten:true,identicalPendingBytes:true,
  originalEffects:w,attemptedReplay:p===0?1:0,
  syntheticEffects:w+(p===0?1:0),
  duplicateEffects:p===0&&w===1?1:0,
  lostOperations:p===1&&w===0?1:0,
  unresolvedClaims:p>=2?1:0,
  forgedProofBlocked:p===3?1:0,
  markerState:p<2?'SPENT':'IN_DOUBT',
  noClaimAutoRelease:true,freshEffectCount:1,
  exactScratchInventory:true,firstPartyOnly:true,
  tempDirectoryRemoved:true
})));
const cli=(name,...args)=>spawnSync(process.execPath,[name,...args],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),shell:false,
  encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:65536
});

test('M28-A: identical marker cannot distinguish effect/no effect and safe resolution',()=>{
  const report=summarizeRecoveryAmbiguity(rows());
  assert.equal(report.status,'PASS');
  assert.equal(report.exitCode,0);
  assert.equal(report.checked,8);
  assert.equal(report.matched,8);
  assert.equal(report.failed,0);
  assert.equal(report.ruleCode,'RECOVERY_AMBIGUITY_WITNESSED');
  assert.deepEqual(report.cases.map(x=>x.finding),[
    'BLIND_RETRY_APPEARS_TO_COMPLETE',
    'BLIND_RETRY_DUPLICATES_EFFECT',
    'BLIND_SKIP_LOSES_OPERATION',
    'BLIND_SKIP_APPEARS_SAFE',
    'IN_DOUBT_REMAINS_QUARANTINED',
    'IN_DOUBT_REMAINS_QUARANTINED',
    'UNVERIFIED_RECEIPT_CANNOT_RELEASE_QUARANTINE',
    'UNVERIFIED_RECEIPT_CANNOT_RELEASE_QUARANTINE'
  ]);
  assert.equal(report.intentionalBlindRetryDuplicates,1);
  assert.equal(report.intentionalBlindSkipLosses,1);
  assert.equal(report.unresolvedGuardedOutcomes,4);
  assert.equal(report.forgedProofClaimsRejected,2);
  assert.equal(report.independentNewKeyActions,8);
  assert.equal(report.indistinguishablePendingMarkersCompared,true);
  assert.equal(report.independentEffectReceiptVerified,false);
  assert.equal(report.exactlyOnceProven,false);
  assert.equal(report.powerLossDurabilityProven,false);
  assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.cases));
});

test('M28-B: negative mutation matrix rejects synthetic duplicate/loss/false recovery',()=>{
  const mutations=[
    [0,'originalEffects',1],[1,'originalEffects',0],
    [1,'attemptedReplay',0],[1,'syntheticEffects',1],
    [1,'duplicateEffects',0],[2,'lostOperations',0],
    [2,'syntheticEffects',1],[2,'markerState','IN_DOUBT'],
    [3,'lostOperations',1],[4,'unresolvedClaims',0],
    [4,'markerState','SPENT'],[5,'unresolvedClaims',0],
    [5,'syntheticEffects',2],[6,'forgedProofBlocked',0],
    [6,'markerState','SPENT'],[7,'forgedProofBlocked',0],
    [7,'unresolvedClaims',0],[7,'markerState','SPENT'],
    [0,'identicalPendingBytes',false],
    [1,'firstPartyMarkerWritten',false],
    [3,'noClaimAutoRelease',false],
    [4,'freshEffectCount',0],[5,'exactScratchInventory',false],
    [6,'firstPartyOnly',false],[7,'tempDirectoryRemoved',false]
  ];
  for(const [index,key,value] of mutations){
    const fake=rows();
    fake[index][key]=value;
    const r=summarizeRecoveryAmbiguity(fake);
    assert.equal(r.status,'FAIL',index+':'+key);
    assert.equal(r.exitCode,1,index+':'+key);
    assert.equal(r.matched,7,index+':'+key);
    assert.deepEqual(r.cases[index].mismatchedWitnessFields,[key]);
  }
});

test('M28-B: sparse/extra/reordered/accessor-bearing observations never forge PASS',()=>{
  for(const x of [null,{},[],[null]]){
    const r=summarizeRecoveryAmbiguity(x);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const swapped=rows();[swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.equal(summarizeRecoveryAmbiguity(swapped).status,'FAIL');
  const sparse=rows();delete sparse[3];
  assert.equal(summarizeRecoveryAmbiguity(sparse).status,'FAIL');
  const extra=rows();extra.push(rows()[0]);
  assert.equal(summarizeRecoveryAmbiguity(extra).status,'FAIL');
  const hidden=rows();hidden[6].private='PRIVATE_CANARY';
  const ignored=summarizeRecoveryAmbiguity(hidden);
  assert.equal(ignored.status,'PASS');
  assert.ok(!JSON.stringify(ignored).includes('PRIVATE_CANARY'));
  const getter=rows();let called=0;
  Object.defineProperty(getter[1],'duplicateEffects',{enumerable:true,get(){
    called++;throw Error('PRIVATE_CANARY');
  }});
  const result=summarizeRecoveryAmbiguity(getter);
  assert.equal(result.status,'FAIL');
  assert.equal(called,0);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
});

test('M28-A: real scratch files, identical pending bytes and disposal',()=>{
  const r=runRecoveryAmbiguityLab();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.checked,8);
  assert.equal(r.matched,8);
  assert.ok(r.cases.every(c=>c.matched));
  assert.equal(r.disposableFilesystemUsed,true);
  assert.equal(r.realAgentTested,false);
  assert.equal(r.externalMcpContacted,false);
  assert.equal(r.independentEffectReceiptVerified,false);
  const again=runRecoveryAmbiguityLab();
  assert.equal(again.status,'PASS','fresh scratch dirs must not retain state');
});

test('M28-C: no-argument CLI, safe categorical output and direct argument denial',()=>{
  const ok=cli('tools/m28-recovery-ambiguity.mjs');
  assert.equal(ok.error,undefined);
  assert.equal(ok.status,0,ok.stderr||ok.stdout);
  assert.equal(ok.stderr,'');
  const result=JSON.parse(ok.stdout);
  assert.equal(result.status,'PASS');
  assert.equal(result.checked,8);
  assert.equal(result.matched,8);
  for(const term of ['PRIVATE_CANARY','FICTIONAL-IN-DOUBT-V1',
    'FICTIONAL_UNTRUSTED_CLAIM_IS_NOT_A_RECEIPT',
    'm28-owned-ambiguity-','/tmp/','https://','127.0.0.1']){
    assert.ok(!ok.stdout.includes(term),'sensitive simulation text: '+term);
  }
  for(const arg of ['--target=https://private.invalid',
    '--receipt=PRIVATE_CANARY','--policy=BLIND_RETRY',
    '--root=../../private','--approve']){
    const denied=cli('tools/m28-recovery-ambiguity.mjs',arg);
    assert.equal(denied.status,2,arg);
    assert.equal(denied.stderr,'');
    const response=JSON.parse(denied.stdout);
    assert.equal(response.status,'ERROR');
    assert.equal(response.ruleCode,'RECOVERY_AMBIGUITY_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(denied.stdout+denied.stderr).includes(arg));
  }
});

test('M28-C: disposable source-only lab remains outside frozen npm inventory',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(inventory.length,80);
  assert.ok(!inventory.includes('tools/m28-recovery-ambiguity.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
  for(const key of ['dependencies','devDependencies',
    'optionalDependencies','peerDependencies'])
    assert.equal(Object.keys(pkg[key]??{}).length,0);
});
