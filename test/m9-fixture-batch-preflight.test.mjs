import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {
  verifyFictionalBridgeOutcome,runFictionalFixtureBatchPreflight
} from '../tools/fixture-batch-preflight.mjs';
import {runFixturePolicyBridge} from '../tools/fixture-policy-bridge.mjs';
import {loadValidatedFixtureProposalFile} from '../tools/fixture-proposal-check.mjs';

const root=fileURLToPath(new URL('../.github/fixture-proposals/',import.meta.url));
const example=JSON.parse(readFileSync(join(root,'mixed-tool-result-file-read.json'),'utf8'));
const original=runFixturePolicyBridge(example);
const clone=o=>JSON.parse(JSON.stringify(o));

test('M9-E: bridge outcomes require every fixed control and every no-execution flag',()=>{
  assert.equal(verifyFictionalBridgeOutcome(original),true);
  assert.equal(original.checked,4);
  assert.equal(original.expectedDenials,3);
  assert.equal(original.fictionalProtectedEffectsCommitted,0);
  for(const flag of [
    'fixtureContentInterpreted','actualAgentBehaviorObserved',
    'realFilesystemReadObserved','untrustedInstructionExecuted',
    'externalMcpContacted','independentBetaVerified','securityCertified',
    'releaseAuthorized'
  ])assert.equal(original[flag],false,flag);
});

test('M9-E: mutated symbolic verdicts and authorization claims fail qualification',()=>{
  const modifications=[
    x=>{x.status='FAIL';},
    x=>{x.exitCode=1;},
    x=>{x.scope='REAL_MCP';},
    x=>{x.ruleCode='FIXTURE_POLICY_BRIDGE_INPUT_REJECTED';},
    x=>{x.evidenceKind='REAL_AGENT_PROVENANCE';},
    x=>{x.fixtureSchemaAccepted=false;},
    x=>{x.expectedSafeBehaviorRecorded=false;},
    x=>{x.checked=3;},
    x=>{x.matched=3;},
    x=>{x.expectedDenials=2;},
    x=>{x.fictionalTaskDataHandled=2;},
    x=>{x.fictionalProtectedEffectsCommitted=1;},
    x=>{x.cases[1].matched=false;},
    x=>{x.cases[1].expectedDecision='ALLOW';},
    x=>{x.cases[1].expectedRuleCode='AUTHORIZED';},
    x=>{x.cases[1].control='PRIVATE_CANARY';},
    x=>{x.cases.pop();},
    x=>{x.extra='SECRET';}
  ];
  for(const change of modifications){
    const item=clone(original);
    change(item);
    assert.equal(verifyFictionalBridgeOutcome(item),false);
  }
  for(const flag of [
    'fixtureContentInterpreted','actualAgentBehaviorObserved',
    'realFilesystemReadObserved','untrustedInstructionExecuted',
    'externalMcpContacted','independentBetaVerified','securityCertified',
    'releaseAuthorized'
  ]){
    const x=clone(original);x[flag]=true;
    assert.equal(verifyFictionalBridgeOutcome(x),false,flag);
  }
});

test('M9-E: JS accessors, hidden keys and sparse output cannot spoof a PASS',()=>{
  const inherited=Object.create(original);
  const getter=clone(original);
  Object.defineProperty(getter,'status',{
    enumerable:true,get(){throw Error('GETTER_MUST_NOT_RUN');}
  });
  const rows=clone(original);rows.cases=[...rows.cases];
  Object.defineProperty(rows.cases,0,{
    enumerable:true,get(){throw Error('CASE_GETTER_MUST_NOT_RUN');}
  });
  const sparse=clone(original);sparse.cases[1]=undefined;
  delete sparse.cases[1];
  const extra=clone(original);extra.cases[Symbol('hidden')]='secret';
  const hidden=clone(original);
  Object.defineProperty(hidden.cases[0],'secret',{value:1});
  for(const item of [inherited,getter,rows,sparse,extra,hidden]){
    assert.equal(verifyFictionalBridgeOutcome(item),false);
  }
});

test('M9-E: fixed directory batch preflight is deterministic and privacy-safe',async()=>{
  const a=await runFictionalFixtureBatchPreflight();
  const b=await runFictionalFixtureBatchPreflight();
  assert.deepEqual(a,b);
  assert.equal(a.status,'PASS');
  assert.equal(a.exitCode,0);
  assert.equal(a.ruleCode,'ALL_FICTIONAL_FIXTURES_PASSED_STATIC_PREFLIGHT');
  const files=readdirSync(root);
  assert.ok(files.length>0 && files.length<=16);
  assert.equal(a.fixtureCount,files.length);
  assert.equal(a.passed,files.length);
  assert.equal(a.policyControlsPerFixture,4);
  assert.equal(a.expectedDenialsPerFixture,3);
  assert.deepEqual(a.results.map(r=>r.ordinal),files.map((_,i)=>i+1));
  for(const row of a.results){
    assert.equal(row.shape,'ACCEPTED');
    assert.equal(row.fixedPolicyControlsMatched,4);
    assert.equal(row.deniedSyntheticActions,3);
    assert.equal(row.protectedFictionalEffects,0);
  }
  const text=JSON.stringify(a);
  for(const name of files)assert.ok(!text.includes(name),name);
  assert.ok(!text.includes(example.toolResult.embeddedInstruction));
  assert.ok(!text.includes(example.caseId));
  for(const flag of [
    'fixtureContentInterpreted','actualAgentBehaviorObserved',
    'realFilesystemReadObserved','untrustedInstructionExecuted',
    'externalMcpContacted','independentBetaVerified','securityCertified',
    'releaseAuthorized'
  ])assert.equal(a[flag],false,flag);
});

test('M9-E: every filename in the contribution directory has an approved bridge outcome',async()=>{
  const names=readdirSync(root);
  for(const name of names){
    assert.match(name,/^[a-z][a-z0-9-]{5,60}\.json$/);
    const fixture=await loadValidatedFixtureProposalFile(join(root,name));
    const report=runFixturePolicyBridge(fixture);
    assert.equal(verifyFictionalBridgeOutcome(report),true);
  }
});

test('M9-E: no-argument contract rejects inputs, symbols and hidden array fields',async()=>{
  const badArgs=[
    ['PRIVATE_CANARY'],
    ['--target=https://secret.invalid'],
    ['../../secret.json'],
    [null],
    ['one','two'],
    [undefined]
  ];
  const extra=[];
  Object.defineProperty(extra,'payload',{value:'PRIVATE_CANARY'});
  badArgs.push(extra);
  const getter=[];
  Object.defineProperty(getter,'0',{get(){throw Error('GETTER_NEVER_RUN');}});
  badArgs.push(getter);
  const symbol=[];
  symbol[Symbol('PRIVATE')]='PRIVATE_CANARY';
  badArgs.push(symbol);
  for(const args of badArgs){
    const r=await runFictionalFixtureBatchPreflight(args);
    assert.equal(r.status,'ERROR');
    assert.equal(r.exitCode,2);
    assert.equal(r.ruleCode,'FICTIONAL_BATCH_PREFLIGHT_REJECTED');
    assert.equal(r.actualAgentBehaviorObserved,false);
    assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
  }
});

test('M9-E: CLI reports only fixed symbolic content, no file or argument echo',()=>{
  const run=(...args)=>spawnSync(process.execPath,[
    'tools/fixture-batch-preflight.mjs',...args
  ],{encoding:'utf8'});
  const good=run();
  assert.equal(good.status,0,good.stderr);
  assert.equal(good.stderr,'');
  const body=JSON.parse(good.stdout);
  assert.equal(body.status,'PASS');
  assert.equal(body.fixtureCount,readdirSync(root).length);
  assert.equal(body.actualAgentBehaviorObserved,false);
  assert.ok(!good.stdout.includes(example.caseId));
  for(const arg of ['PRIVATE_CANARY','--url=https://private.invalid','../../secret.json']){
    const bad=run(arg);
    assert.equal(bad.status,2);
    assert.equal(bad.stderr,'');
    assert.equal(JSON.parse(bad.stdout).ruleCode,
      'FICTIONAL_BATCH_PREFLIGHT_REJECTED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});

test('M9-E: shape validity and policy probes cannot imply real-agent safety',async()=>{
  const result=await runFictionalFixtureBatchPreflight();
  assert.equal(result.evidenceKind,
    'FIRST_PARTY_STATIC_FIXTURES_AND_FIXED_POLICY_ONLY');
  assert.equal(result.actualAgentBehaviorObserved,false);
  assert.equal(result.securityCertified,false);
  assert.equal(result.externalMcpContacted,false);
  assert.equal(result.releaseAuthorized,false);
  assert.equal(result.independentBetaVerified,false);
});

test('M9-E: contributor guide and exact 80-path npm inventory remain intact',()=>{
  const guide=readFileSync(new URL('../.github/M9_FIXTURE_BATCH_PREFLIGHT.md',
    import.meta.url),'utf8');
  const contributing=readFileSync(new URL('../.github/FIXTURE_ONLY_CONTRIBUTIONS.md',
    import.meta.url),'utf8');
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  const roadmap=readFileSync(new URL('../ROADMAP.md',import.meta.url),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('../package.json',
    import.meta.url),'utf8'));
  for(const text of [guide,contributing,readme])
    assert.match(text,/node tools\/fixture-batch-preflight\.mjs/);
  assert.match(roadmap,/M9-E/);
  assert.match(guide,/not.*(?:real agent|prompt-injection detector)/i);
  assert.deepEqual(pkg.files,[
    'src','fixtures','docs','examples','README.md',
    'LICENSE','SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
  ]);
});
