/** M25: independent policy-epoch/restart mutation and actual owned-wire controls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runApprovalEpochLab,summarizeApprovalEpochLab}
  from '../tools/m25-policy-epoch-restart.mjs';

const specs=[
  {id:'UNCHANGED_POLICY',change:'NONE',reissue:false},
  {id:'POLICY_DRIFT',change:'POLICY',reissue:false},
  {id:'RESTART_PENDING',change:'RESTART',reissue:false},
  {id:'POLICY_DRIFT_FRESH_APPROVAL',change:'POLICY',reissue:true},
  {id:'RESTART_FRESH_APPROVAL',change:'RESTART',reissue:true}
];
function reference(spec,guarded){
  const n=spec.reissue?2:1,changed=spec.change!=='NONE';
  const restart=spec.change==='RESTART',drift=spec.change==='POLICY';
  const denied=Number(guarded&&changed);
  const statuses=[denied?(restart?410:409):200,...(spec.reissue?[200]:[])];
  return {
    received:n,validated:n,admittedBeforeMutation:n,
    connections:n,responsesIssued:n,responsesClosed:n,socketsClosed:n,
    accepted:n-denied,denied,effects:n-denied,pendingActive:0,
    barriers:n,noEarlyResponseWitness:true,
    changeWhilePending:Number(changed),
    invalidatedAtRestart:Number(guarded&&restart),
    finalPolicyVersion:drift?2:1,
    finalGateGeneration:restart?2:1,
    bodyMatched:true,lastRoundHadEffect:spec.reissue||!denied,
    socketsRemaining:0,localLoopbackConfirmed:true,statuses
  };
}
const known=()=>specs.map(spec=>({
  id:spec.id,guarded:reference(spec,true),unsafe:reference(spec,false)
}));
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/m25-policy-epoch-restart.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    encoding:'utf8',shell:false,timeout:30000,maxBuffer:65536
  });

test('M25-A: separate oracle explicitly proves old approval fails, fresh works',()=>{
  const r=summarizeApprovalEpochLab(known());
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.exitCode,0);
  assert.equal(r.checked,5);
  assert.equal(r.matched,5);
  assert.equal(r.policyVersionBoundAtExecution,true);
  assert.equal(r.gateGenerationBoundAtExecution,true);
  assert.deepEqual(r.cases.map(x=>x.id),specs.map(x=>x.id));
  assert.equal(r.cases[1].expectedSafety,'POLICY_VERSION_MISMATCH_DENIED');
  assert.equal(r.cases[2].expectedSafety,
    'PENDING_APPROVAL_INVALIDATED_ON_RESTART');
  assert.equal(r.cases[3].expectedSafety,
    'STALE_DENIED_FRESH_APPROVAL_EXECUTED');
  assert.equal(r.cases[4].expectedSafety,
    'STALE_DENIED_FRESH_APPROVAL_EXECUTED');
  assert.equal(r.logicalRestartOnly,true);
  assert.equal(r.actualOsRestartPerformed,false);
  assert.equal(r.realAgentTested,false);
  assert.equal(r.externalMcpContacted,false);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
});

test('M25-B: old approval cannot commit after policy change or logical restart',()=>{
  const failures=[
    [1,'guarded','effects',1],
    [1,'guarded','accepted',1],
    [1,'guarded','denied',0],
    [1,'guarded','statuses',[200]],
    [1,'unsafe','effects',0],
    [1,'unsafe','statuses',[409]],
    [2,'guarded','effects',1],
    [2,'guarded','invalidatedAtRestart',0],
    [2,'guarded','pendingActive',1],
    [2,'guarded','statuses',[200]],
    [2,'unsafe','effects',0],
    [2,'unsafe','invalidatedAtRestart',1],
    [2,'unsafe','statuses',[410]],
    [3,'guarded','effects',2],
    [3,'guarded','statuses',[200,200]],
    [3,'guarded','statuses',[409,409]],
    [4,'guarded','effects',2],
    [4,'guarded','statuses',[200,200]],
    [4,'guarded','statuses',[410,410]],
    [4,'unsafe','effects',1],
    [4,'unsafe','statuses',[410,200]],
    [0,'guarded','effects',0],
    [0,'guarded','statuses',[409]]
  ];
  for(const [index,side,key,value] of failures){
    const rows=known();
    rows[index][side][key]=value;
    const result=summarizeApprovalEpochLab(rows);
    assert.equal(result.status,'FAIL',index+':'+side+'.'+key);
    assert.equal(result.exitCode,1);
    assert.equal(result.matched,4);
    assert.deepEqual(result.cases[index].mismatchedWitnessFields,
      [side+'.'+key]);
  }
});

test('M25-B: fake admission barriers, counts or socket cleanup fail closed',()=>{
  const mutations=[
    [1,'guarded','barriers',0],
    [2,'guarded','noEarlyResponseWitness',false],
    [3,'guarded','changeWhilePending',0],
    [2,'unsafe','finalGateGeneration',1],
    [1,'unsafe','finalPolicyVersion',1],
    [4,'guarded','lastRoundHadEffect',false],
    [0,'unsafe','admittedBeforeMutation',0],
    [4,'guarded','validated',1],
    [2,'unsafe','responsesClosed',0],
    [1,'guarded','socketsClosed',0],
    [3,'unsafe','socketsRemaining',1],
    [0,'guarded','localLoopbackConfirmed',false]
  ];
  for(const [index,side,key,value] of mutations){
    const rows=known();rows[index][side][key]=value;
    const r=summarizeApprovalEpochLab(rows);
    assert.equal(r.status,'FAIL',index+':'+side+'.'+key);
    assert.equal(r.matched,4);
    assert.deepEqual(r.cases[index].mismatchedWitnessFields,
      [side+'.'+key]);
  }
});

test('M25-B: sparse, reversed and getter-bearing witness records cannot pass',()=>{
  for(const v of [[],null,{},[{id:specs[0].id}]]){
    const r=summarizeApprovalEpochLab(v);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const swapped=known();[swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.equal(summarizeApprovalEpochLab(swapped).status,'FAIL');
  const sparse=known();delete sparse[2];
  assert.equal(summarizeApprovalEpochLab(sparse).status,'FAIL');
  const extra=known();extra.push(known()[0]);
  assert.equal(summarizeApprovalEpochLab(extra).status,'FAIL');
  const getter=known();
  let calls=0;
  Object.defineProperty(getter[2].guarded,'effects',{
    enumerable:true,get(){calls++;throw Error('PRIVATE_CANARY');}
  });
  const r=summarizeApprovalEpochLab(getter);
  assert.equal(r.status,'FAIL');
  assert.equal(r.matched,4);
  assert.equal(calls,0);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  const forged=known();
  forged[1].unsafe.private='PRIVATE_CANARY';
  assert.equal(summarizeApprovalEpochLab(forged).status,'PASS');
  assert.ok(!JSON.stringify(summarizeApprovalEpochLab(forged))
    .includes('PRIVATE_CANARY'));
});

test('M25-A: real socket exchange, mid-flight policy drift and logical restart',async()=>{
  const first=await runApprovalEpochLab();
  assert.equal(first.status,'PASS',JSON.stringify(first));
  assert.equal(first.matched,5);
  assert.equal(first.cases[2].matched,true);
  assert.equal(first.cases[3].matched,true);
  assert.equal(first.cases[4].matched,true);
  assert.equal(first.actualOsRestartPerformed,false);
  assert.equal(first.realFilesystemActionsPerformed,false);
  const repeat=await runApprovalEpochLab();
  assert.equal(repeat.status,'PASS','new listener must not inherit state');
});

test('M25-C: no-argument CLI reports only source-owned symbolic witnesses',()=>{
  const x=cli();
  assert.equal(x.error,undefined);
  assert.equal(x.status,0,x.stderr||x.stdout);
  assert.equal(x.stderr,'');
  const report=JSON.parse(x.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.checked,5);
  assert.equal(report.matched,5);
  for(const word of ['FIRST-PARTY-FAKE-APPROVAL-ONLY',
    'fictional-owned-record','fictional-approval-',
    '127.0.0.1','http://','IN_MEMORY_ONLY','PRIVATE_CANARY']){
    assert.ok(!x.stdout.includes(word),'leaked '+word);
  }
  for(const input of [
    '--target=https://example.invalid/mcp',
    '--policyVersion=2','--gate=RESTART',
    '--token=PRIVATE_CANARY','--host=0.0.0.0'
  ]){
    const bad=cli(input);
    assert.equal(bad.status,2,input);
    assert.equal(bad.stderr,'');
    const error=JSON.parse(bad.stdout);
    assert.equal(error.status,'ERROR');
    assert.equal(error.ruleCode,'APPROVAL_EPOCH_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(input));
  }
});

test('M25-C: helper remains outside the frozen 80-path npm release',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(inventory.length,80);
  assert.ok(!inventory.some(path=>path.includes('m25-policy-epoch-restart')));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
});
