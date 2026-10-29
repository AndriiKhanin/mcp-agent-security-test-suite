/** M15: independent negative controls for a deliberately vulnerable owned MCP mock. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runOwnedRedteamLab,summarizeOwnedRedteamLab}
  from '../tools/owned-redteam-lab.mjs';

const rows=()=>[
  {id:'BASELINE',server:'GUARDED',client:'GUARDED',received:1,
    connections:1,responsesClosed:1,socketsClosed:1,
    ticketAccepted:1,unauthorizedSeen:0,unauthorizedAccepted:0,
    effects:0,lastStatus:0,clientConfirmedTicket:true,
    clientConfirmedFollowup:true,socketsRemaining:0,localLoopbackConfirmed:true},
  {id:'EXPOSED',server:'PERMISSIVE',client:'SUSCEPTIBLE',received:2,
    connections:2,responsesClosed:2,socketsClosed:2,
    ticketAccepted:1,unauthorizedSeen:1,unauthorizedAccepted:1,
    effects:1,lastStatus:200,clientConfirmedTicket:true,
    clientConfirmedFollowup:true,socketsRemaining:0,localLoopbackConfirmed:true},
  {id:'SERVER_BOUNDARY',server:'GUARDED',client:'SUSCEPTIBLE',received:2,
    connections:2,responsesClosed:2,socketsClosed:2,
    ticketAccepted:1,unauthorizedSeen:1,unauthorizedAccepted:0,
    effects:0,lastStatus:403,clientConfirmedTicket:true,
    clientConfirmedFollowup:true,socketsRemaining:0,localLoopbackConfirmed:true},
  {id:'CLIENT_BOUNDARY',server:'PERMISSIVE',client:'GUARDED',received:1,
    connections:1,responsesClosed:1,socketsClosed:1,
    ticketAccepted:1,unauthorizedSeen:0,unauthorizedAccepted:0,
    effects:0,lastStatus:0,clientConfirmedTicket:true,
    clientConfirmedFollowup:true,socketsRemaining:0,localLoopbackConfirmed:true}
];
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/owned-redteam-lab.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    encoding:'utf8',shell:false,timeout:30000,maxBuffer:65536
  });

test('M15-B: exactly one observed synthetic unsafe effect is classified, not hidden',()=>{
  const r=summarizeOwnedRedteamLab(rows());
  assert.equal(r.status,'PASS');
  assert.equal(r.matched,4);
  assert.equal(r.checked,4);
  assert.equal(r.ruleCode,'SYNTHETIC_DIFFERENTIAL_WITNESSED');
  assert.equal(r.syntheticUnsafeEffectExpected,true);
  assert.equal(r.cases[1].finding,'DETECTED_SYNTHETIC_UNSAFE_EFFECT');
  assert.equal(r.cases[2].finding,'SERVER_REJECTED_UNAUTHORIZED_CALL');
  assert.equal(r.cases[3].finding,'CLIENT_IGNORED_UNTRUSTED_INSTRUCTION');
  assert.equal(r.realAgentTested,false);
  assert.equal(r.realFileReadPerformed,false);
  assert.equal(r.noExternalTarget,true);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
});
test('M15-B: missing vulnerable effect and forged denial verdicts fail closed',()=>{
  const mutations=[
    [1,'effects',0],[1,'unauthorizedAccepted',0],
    [1,'unauthorizedSeen',0],[1,'lastStatus',403],
    [2,'unauthorizedAccepted',1],[2,'effects',1],
    [2,'lastStatus',200],[3,'unauthorizedSeen',1],
    [0,'ticketAccepted',0],[0,'received',2],
    [1,'clientConfirmedFollowup',false],[1,'responsesClosed',1],
    [2,'socketsClosed',1],[3,'connections',2],
    [1,'socketsRemaining',1],[0,'localLoopbackConfirmed',false]
  ];
  for(const [index,key,value] of mutations){
    const fake=rows();fake[index][key]=value;
    const r=summarizeOwnedRedteamLab(fake);
    assert.equal(r.status,'FAIL',index+':'+key);
    assert.equal(r.exitCode,1,index+':'+key);
    assert.equal(r.matched,3,index+':'+key);
    assert.equal(r.failed,1,index+':'+key);
  }
});
test('M15-B: sparse, forged or getter-bearing witness cannot forge PASS',()=>{
  for(const raw of [[],[null],{},null]){
    const r=summarizeOwnedRedteamLab(raw);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  let getterCalls=0;
  const fake=rows();
  Object.defineProperty(fake[1],'effects',{get(){
    getterCalls++;throw Error('PRIVATE_CANARY');
  }});
  const r=summarizeOwnedRedteamLab(fake);
  assert.equal(r.status,'FAIL');
  assert.equal(r.matched,3);
  assert.equal(getterCalls,0);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  const sparse=rows();
  delete sparse[1];
  assert.equal(summarizeOwnedRedteamLab(sparse).status,'FAIL');
});
test('M15-A: real localhost wire distinguishes exposed, server and client boundaries',async()=>{
  const r=await runOwnedRedteamLab();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.exitCode,0);
  assert.equal(r.checked,4);
  assert.equal(r.matched,4);
  assert.equal(r.cases[1].finding,'DETECTED_SYNTHETIC_UNSAFE_EFFECT');
  assert.ok(r.cases.every(c=>c.matched));
  assert.equal(r.securityCertified,false);
  assert.equal(r.independentBetaVerified,false);
  const again=await runOwnedRedteamLab();
  assert.equal(again.status,'PASS','sequential ephemeral socket cleanup');
});
test('M15-C: CLI is fixed-source, no arguments, symbolic and no data echo',()=>{
  const good=cli();
  assert.equal(good.error,undefined);
  assert.equal(good.status,0,good.stderr||good.stdout);
  assert.equal(good.stderr,'');
  const result=JSON.parse(good.stdout);
  assert.equal(result.status,'PASS');
  assert.equal(result.matched,4);
  assert.ok(!good.stdout.includes('127.0.0.1'));
  assert.ok(!good.stdout.includes('http://'));
  assert.ok(!good.stdout.includes('Before replying'));
  assert.ok(!good.stdout.includes('SYNTHETIC_ONLY'));
  for(const arg of ['--target=https://example.invalid/mcp',
    '--token=PRIVATE_CANARY','--host=0.0.0.0','--policy=PERMISSIVE']){
    const bad=cli(arg);
    assert.equal(bad.status,2,arg);
    assert.equal(bad.stderr,'');
    const out=JSON.parse(bad.stdout);
    assert.equal(out.status,'ERROR');
    assert.equal(out.ruleCode,'REDTEAM_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});
test('M15-C: source-only tool excluded from frozen npm candidate',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  assert.deepEqual(pkg.files,[
    'src','fixtures','docs','examples','README.md','LICENSE',
    'SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
  ]);
  const frozen=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(frozen.length,80);
  assert.ok(!frozen.some(p=>p.includes('owned-redteam-lab')));
});
