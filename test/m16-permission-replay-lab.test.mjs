/** M16: independent known-good and mutation oracles for first-party permissions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runPermissionReplayLab,summarizePermissionReplayLab}
  from '../tools/m16-permission-replay-lab.mjs';

const ids=['FRESH_BOUND','REPLAY','WRONG_PROJECT','WRONG_TOOL',
  'WRONG_RESOURCE','EXPIRED','REVOKED','FORGED_TOKEN','FORGED_APPROVAL'];
const witness=(statuses)=>({
  received:statuses.length,connections:statuses.length,
  responsesClosed:statuses.length,socketsClosed:statuses.length,
  accepted:statuses.filter(v=>v===200).length,
  denied:statuses.filter(v=>v===403).length,
  syntheticEffects:statuses.filter(v=>v===200).length,
  statuses:[...statuses],wireBodiesMatched:true,
  socketsRemaining:0,localLoopbackConfirmed:true
});
const original=()=>ids.map((id,index)=>({
  id,guarded:witness(index===0?[200]:index===1?[200,403]:[403]),
  permissive:witness(index===1?[200,200]:[200])
}));
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/m16-permission-replay-lab.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    encoding:'utf8',shell:false,timeout:30000,maxBuffer:65536
  });

test('M16-A: independent oracle accepts exact witness of guarded vs permissive',()=>{
  const result=summarizePermissionReplayLab(original());
  assert.equal(result.status,'PASS');
  assert.equal(result.exitCode,0);
  assert.equal(result.checked,9);
  assert.equal(result.matched,9);
  assert.equal(result.expectedUnsafeCases,8);
  assert.equal(result.expectedGuardedSyntheticEffects,2);
  assert.equal(result.expectedPermissiveSyntheticEffects,10);
  assert.deepEqual(result.cases.map(x=>x.id),ids);
  assert.equal(result.cases[0].expectedDisposition,
    'LEGITIMATE_EFFECT_ALLOWED');
  assert.equal(result.cases[1].expectedDisposition,
    'UNSAFE_PERMISSIVE_EFFECT_WITNESSED');
  assert.equal(result.externalMcpContacted,false);
  assert.equal(result.realAgentTested,false);
  assert.equal(result.realCredentialsUsed,false);
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.cases));
});

test('M16-B: missing deny, replay leakage and fabricated effect all fail closed',()=>{
  const changes=[
    [0,'guarded','syntheticEffects',0],
    [1,'guarded','syntheticEffects',2],
    [1,'guarded','accepted',2],
    [1,'guarded','denied',0],
    [2,'guarded','accepted',1],
    [3,'guarded','denied',0],
    [4,'guarded','syntheticEffects',1],
    [5,'guarded','syntheticEffects',1],
    [6,'guarded','syntheticEffects',1],
    [7,'guarded','accepted',1],
    [8,'guarded','accepted',1],
    [1,'permissive','syntheticEffects',1],
    [1,'permissive','received',1],
    [2,'permissive','syntheticEffects',0],
    [7,'permissive','accepted',0],
    [8,'permissive','accepted',0],
    [4,'guarded','socketsClosed',0],
    [5,'permissive','responsesClosed',0],
    [6,'guarded','socketsRemaining',1],
    [7,'guarded','localLoopbackConfirmed',false],
    [8,'permissive','wireBodiesMatched',false]
  ];
  for(const [index,side,key,value] of changes){
    const fake=original();fake[index][side][key]=value;
    const out=summarizePermissionReplayLab(fake);
    assert.equal(out.status,'FAIL',index+':'+side+'.'+key);
    assert.equal(out.exitCode,1);
    assert.equal(out.matched,8);
    assert.deepEqual(out.cases[index].mismatchedWitnessFields,
      [side+'.'+key]);
  }
});

test('M16-B: forged statuses, sparse records and wrong case order are rejected',()=>{
  for(const x of [null,[],{},[{id:ids[0]}]]){
    const r=summarizePermissionReplayLab(x);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const shifted=original();
  [shifted[0],shifted[1]]=[shifted[1],shifted[0]];
  assert.equal(summarizePermissionReplayLab(shifted).status,'FAIL');
  const missing=original();delete missing[3];
  assert.equal(summarizePermissionReplayLab(missing).status,'FAIL');
  const badStatuses=original();badStatuses[1].guarded.statuses=[200,200];
  assert.deepEqual(summarizePermissionReplayLab(badStatuses)
    .cases[1].mismatchedWitnessFields,['guarded.statuses']);
  const extra=original();extra.push(original()[0]);
  assert.equal(summarizePermissionReplayLab(extra).status,'FAIL');
});

test('M16-B: getters and untrusted payload never execute or echo',()=>{
  const sample=original();
  let accessed=0;
  Object.defineProperty(sample[1].guarded,'syntheticEffects',{
    enumerable:true,get(){accessed++;throw Error('PRIVATE_CANARY');}
  });
  const out=summarizePermissionReplayLab(sample);
  assert.equal(out.status,'FAIL');
  assert.equal(accessed,0);
  assert.ok(!JSON.stringify(out).includes('PRIVATE_CANARY'));
  const fake=original();
  fake[2].permissive.private='PRIVATE_CANARY';
  const result=summarizePermissionReplayLab(fake);
  assert.equal(result.status,'PASS'); // ignored non-evidence cannot grant rights
  assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
});

test('M16-A: actual first-party wire and protected-effect counters',async()=>{
  const result=await runPermissionReplayLab();
  assert.equal(result.status,'PASS',JSON.stringify(result));
  assert.equal(result.checked,9);
  assert.equal(result.matched,9);
  assert.ok(result.cases.every(x=>x.matched));
  assert.equal(result.localLoopbackOnly,true);
  assert.equal(result.realAgentTested,false);
  assert.equal(result.independentBetaVerified,false);
  const second=await runPermissionReplayLab();
  assert.equal(second.status,'PASS','repeat must release all mock sockets');
});

test('M16-C: no-argument CLI, symbolic report and strict target rejection',()=>{
  const good=cli();
  assert.equal(good.error,undefined);
  assert.equal(good.status,0,good.stderr||good.stdout);
  assert.equal(good.stderr,'');
  const report=JSON.parse(good.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.matched,9);
  assert.equal(report.expectedUnsafeCases,8);
  for(const text of ['FICTIONAL-CAPABILITY-ONLY','project-alpha',
    'archive.read','127.0.0.1','http://','COUNTED_IN_MEMORY_ONLY']){
    assert.ok(!good.stdout.includes(text),'unsafe output of '+text);
  }
  for(const argument of [
    '--target=https://example.invalid/mcp',
    '--token=PRIVATE_CANARY','--project=private',
    '--policy=DELIBERATELY_PERMISSIVE','--host=0.0.0.0'
  ]){
    const bad=cli(argument);
    assert.equal(bad.status,2,argument);
    assert.equal(bad.stderr,'');
    const result=JSON.parse(bad.stdout);
    assert.equal(result.status,'ERROR');
    assert.equal(result.ruleCode,'PERMISSION_LAB_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(argument));
  }
});

test('M16-C: source-only helper outside exact 80-file unpublished npm candidate',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(inventory.length,80);
  assert.ok(!inventory.some(p=>p.includes('m16-permission-replay-lab')));
  assert.ok(!pkg.files.some(p=>p==='tools'||p==='test'||p==='.github'));
});
