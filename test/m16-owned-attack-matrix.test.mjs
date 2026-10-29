/** M16: independent mutation controls of actual first-party MCP-shaped wire evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runOwnedAttackMatrix,summarizeOwnedAttackMatrix}
  from '../tools/owned-attack-matrix.mjs';

const fixtures=()=>[
  {id:'FORGED_UNSAFE',kind:'FORGED',policy:'OPEN',received:2,connections:2,
    responsesClosed:2,socketsClosed:2,firstSeen:1,forgedSeen:1,
    duplicateSeen:0,denied:0,protectedEffects:1,lastStatus:200,
    firstMatched:true,followupMatched:true,
    wrongIdAccepted:false,wrongIdRejected:false,localBound:true},
  {id:'FORGED_GUARDED',kind:'FORGED',policy:'GUARD',received:2,connections:2,
    responsesClosed:2,socketsClosed:2,firstSeen:1,forgedSeen:1,
    duplicateSeen:0,denied:1,protectedEffects:0,lastStatus:403,
    firstMatched:true,followupMatched:true,
    wrongIdAccepted:false,wrongIdRejected:false,localBound:true},
  {id:'REPLAY_UNSAFE',kind:'REPLAY',policy:'OPEN',received:2,connections:2,
    responsesClosed:2,socketsClosed:2,firstSeen:1,forgedSeen:0,
    duplicateSeen:1,denied:0,protectedEffects:2,lastStatus:200,
    firstMatched:true,followupMatched:true,
    wrongIdAccepted:false,wrongIdRejected:false,localBound:true},
  {id:'REPLAY_GUARDED',kind:'REPLAY',policy:'GUARD',received:2,connections:2,
    responsesClosed:2,socketsClosed:2,firstSeen:1,forgedSeen:0,
    duplicateSeen:1,denied:1,protectedEffects:1,lastStatus:409,
    firstMatched:true,followupMatched:true,
    wrongIdAccepted:false,wrongIdRejected:false,localBound:true},
  {id:'TAMPER_UNSAFE',kind:'TAMPER',policy:'OPEN',received:2,connections:2,
    responsesClosed:2,socketsClosed:2,firstSeen:1,forgedSeen:1,
    duplicateSeen:0,denied:0,protectedEffects:1,lastStatus:200,
    firstMatched:true,followupMatched:true,
    wrongIdAccepted:true,wrongIdRejected:false,localBound:true},
  {id:'TAMPER_GUARDED',kind:'TAMPER',policy:'GUARD',received:1,connections:1,
    responsesClosed:1,socketsClosed:1,firstSeen:1,forgedSeen:0,
    duplicateSeen:0,denied:0,protectedEffects:0,lastStatus:200,
    firstMatched:true,followupMatched:true,
    wrongIdAccepted:false,wrongIdRejected:true,localBound:true}
];
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/owned-attack-matrix.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    shell:false,encoding:'utf8',timeout:30000,maxBuffer:65536
  });
test('M16-A: all six independent expected wire witnesses must match',()=>{
  const r=summarizeOwnedAttackMatrix(fixtures());
  assert.equal(r.status,'PASS');
  assert.equal(r.ruleCode,'SIX_DIFFERENTIAL_WITNESSES_MATCH');
  assert.deepEqual([r.checked,r.matched,r.failed],[6,6,0]);
  assert.equal(r.intentionallyUnsafeCases,3);
  assert.deepEqual(r.cases.map(x=>x.id),[
    'FORGED_UNSAFE','FORGED_GUARDED','REPLAY_UNSAFE',
    'REPLAY_GUARDED','TAMPER_UNSAFE','TAMPER_GUARDED'
  ]);
  assert.equal(r.cases.filter(x=>x.verdict==='INTENTIONAL_SYNTHETIC_VIOLATION_WITNESSED').length,3);
  assert.equal(r.realAgentTested,false);
  assert.equal(r.noExternalTarget,true);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
  assert.ok(r.cases.every(x=>x.matched&&Object.isFrozen(x)));
});
test('M16-B: a missing unsafe effect or fabricated safe denial fails closed',()=>{
  const mutations=[
    [0,'protectedEffects',0],[0,'forgedSeen',0],
    [1,'protectedEffects',1],[1,'denied',0],
    [1,'lastStatus',200],[2,'protectedEffects',1],
    [2,'duplicateSeen',0],[3,'protectedEffects',2],
    [3,'denied',0],[3,'lastStatus',200],
    [4,'protectedEffects',0],[4,'wrongIdAccepted',false],
    [4,'forgedSeen',0],[5,'wrongIdRejected',false],
    [5,'received',2],[5,'protectedEffects',1]
  ];
  for(const [i,k,v] of mutations){
    const observation=fixtures();observation[i][k]=v;
    const result=summarizeOwnedAttackMatrix(observation);
    assert.equal(result.status,'FAIL',i+':'+k);
    assert.equal(result.exitCode,1,i+':'+k);
    assert.equal(result.matched,5,i+':'+k);
    assert.deepEqual(result.cases[i].mismatchedWitnessFields,[k]);
  }
});
test('M16-B: forged responses and imperfect cleanup cannot claim a match',()=>{
  for(const [i,k,v] of [
    [0,'responsesClosed',0],[1,'socketsClosed',1],
    [2,'connections',1],[3,'received',1],
    [4,'firstMatched',false],[5,'followupMatched',false],
    [5,'localBound',false]
  ]){
    const obs=fixtures();obs[i][k]=v;
    assert.equal(summarizeOwnedAttackMatrix(obs).status,'FAIL');
  }
});
test('M16-B: no hostile accessors, private fields or prototype abuse',()=>{
  let getterRead=0;const obs=fixtures();
  Object.defineProperty(obs[4],'protectedEffects',{get(){
    getterRead++;throw Error('PRIVATE_CANARY');
  }});
  const r=summarizeOwnedAttackMatrix(obs);
  assert.equal(getterRead,0);
  assert.equal(r.status,'FAIL');
  assert.deepEqual(r.cases[4].mismatchedWitnessFields,['protectedEffects']);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  const augmented=fixtures();
  augmented[0].private='PRIVATE_CANARY';
  assert.equal(summarizeOwnedAttackMatrix(augmented).status,'PASS');
  assert.ok(!JSON.stringify(summarizeOwnedAttackMatrix(augmented))
    .includes('PRIVATE_CANARY'));
  const sparse=fixtures();delete sparse[1];
  assert.equal(summarizeOwnedAttackMatrix(sparse).status,'FAIL');
  for(const x of [null,{},[],[null]]){
    const out=summarizeOwnedAttackMatrix(x);
    assert.equal(out.status,'FAIL');
    assert.equal(out.matched,0);
  }
});
test('M16-C: actual independent owned HTTP servers expose all three attacks',async()=>{
  const r=await runOwnedAttackMatrix();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.matched,6);
  assert.equal(r.failed,0);
  assert.deepEqual(r.cases.map(x=>x.matched),Array(6).fill(true));
  assert.equal(r.intentionallyUnsafeCases,3);
  assert.equal(r.realFileReadPerformed,false);
  assert.equal(r.independentBetaVerified,false);
  const repeated=await runOwnedAttackMatrix();
  assert.equal(repeated.status,'PASS','owned ephemeral sockets reset between runs');
});
test('M16-C: no-args CLI emits only fixed symbolic output and rejects target input',()=>{
  const ok=cli();
  assert.equal(ok.error,undefined);
  assert.equal(ok.status,0,ok.stderr||ok.stdout);
  assert.equal(ok.stderr,'');
  const report=JSON.parse(ok.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.matched,6);
  for(const secret of ['http://','127.0.0.1','claimedOwner',
    'fictional-op-7','Synthetic permission denied','PRIVATE_CANARY']){
    assert.ok(!ok.stdout.includes(secret),secret);
  }
  for(const arg of ['--target=https://private.invalid/mcp',
    '--token=PRIVATE_CANARY','--host=0.0.0.0','--model=real']){
    const bad=cli(arg);
    assert.equal(bad.status,2,arg);
    assert.equal(bad.stderr,'');
    const out=JSON.parse(bad.stdout);
    assert.equal(out.status,'ERROR');
    assert.equal(out.ruleCode,'ATTACK_MATRIX_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});
test('M16-C: no npm package expansion or released candidate mutation',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  assert.equal(pkg.version,'0.0.10-rc.1');
  assert.deepEqual(pkg.files,[
    'src','fixtures','docs','examples','README.md','LICENSE',
    'SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
  ]);
  const frozen=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),'utf8'));
  assert.equal(frozen.length,80);
  assert.ok(!frozen.some(name=>name.includes('owned-attack-matrix')));
});
