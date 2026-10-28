import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {
  verifyFictionalToyAgentOutcome,runFictionalToyAgentBatch
} from '../tools/toy-agent-batch.mjs';
import {runFictionalToyAgentExchange} from '../tools/toy-agent-exchange.mjs';
import {loadValidatedFixtureProposalFile} from '../tools/fixture-proposal-check.mjs';

const root=fileURLToPath(new URL('../.github/fixture-proposals/',import.meta.url));
const fixture=JSON.parse(readFileSync(
  join(root,'mixed-tool-result-file-read.json'),'utf8'
));
const clone=x=>JSON.parse(JSON.stringify(x));
const MODES=[
  'SAFE_DATA_ONLY','FAULT_UNRELATED_READ',
  'FAULT_UNAUTHORIZED_TOOL','FAULT_FORGED_AUTHORITY','FAULT_COMBINED'
];

test('M10-E: independent verifier accepts all five first-party gateway observations',()=>{
  for(const mode of MODES){
    const report=runFictionalToyAgentExchange(fixture,mode);
    assert.equal(verifyFictionalToyAgentOutcome(report,mode),true,mode);
    assert.equal(report.toyAgentMethodCallsObserved,true);
    assert.equal(report.realAgentBehaviorObserved,false);
  }
});

test('M10-E: each reported protected effect, real observation or authority claim denies',()=>{
  const mode='FAULT_UNRELATED_READ';
  const original=runFictionalToyAgentExchange(fixture,mode);
  const mutations=[
    ['status','PASS'],['exitCode',0],
    ['ruleCode','TOY_AGENT_NO_FORBIDDEN_REQUESTS'],
    ['scope','REAL_AI_AGENT'],['toyMode','SAFE_DATA_ONLY'],
    ['evidenceKind','INDEPENDENT_AGENT_ATTESTATION'],
    ['methodCallsObserved',1],['taskDataAccepted',0],
    ['forbiddenRequestsObserved',0],
    ['unrelatedFileRequestsDenied',0],
    ['unauthorizedToolRequestsDenied',1],
    ['forgedAuthorityClaimsDenied',1],
    ['fictionalProtectedFileEffectsCommitted',1],
    ['fictionalProtectedToolEffectsCommitted',1],
    ['toyAgentMethodCallsObserved',false],
    ['realAgentBehaviorObserved',true],
    ['realFilesystemReadObserved',true],
    ['realMcpToolCallObserved',true],
    ['injectedInstructionInterpreted',true],
    ['injectedInstructionExecuted',true],
    ['externalMcpContacted',true],
    ['independentBetaVerified',true],
    ['securityCertified',true],
    ['releaseAuthorized',true]
  ];
  for(const [field,value] of mutations){
    const changed=clone(original);
    changed[field]=value;
    assert.equal(verifyFictionalToyAgentOutcome(changed,mode),false,field);
  }
  assert.equal(verifyFictionalToyAgentOutcome(original,'SAFE_DATA_ONLY'),false);
  assert.equal(verifyFictionalToyAgentOutcome(original,'REAL_AGENT'),false);
});

test('M10-E: prototype, accessors and hidden JS fields cannot forge gateway evidence',()=>{
  const report=runFictionalToyAgentExchange(fixture,'SAFE_DATA_ONLY');
  const getter=clone(report);
  Object.defineProperty(getter,'status',{enumerable:true,
    get(){throw new Error('NEVER_EXECUTE_UNTRUSTED_GETTER');}});
  const unknown=clone(report);unknown.secret='PRIVATE_CANARY';
  const hidden=clone(report);
  Object.defineProperty(hidden,'secret',{value:'PRIVATE_CANARY'});
  const symbol=clone(report);
  symbol[Symbol('hidden')]='PRIVATE_CANARY';
  const inherited=Object.create(report);
  for(const candidate of [getter,unknown,hidden,symbol,inherited,null,[],{}]){
    assert.equal(
      verifyFictionalToyAgentOutcome(candidate,'SAFE_DATA_ONLY'),false
    );
  }
});

test('M10-D: every fictional fixture has five real in-memory method-call cases',async()=>{
  const files=readdirSync(root);
  assert.ok(files.length>0&&files.length<=16);
  for(const name of files){
    const value=await loadValidatedFixtureProposalFile(join(root,name));
    for(const mode of MODES){
      const result=runFictionalToyAgentExchange(value,mode);
      assert.equal(verifyFictionalToyAgentOutcome(result,mode),true);
      assert.equal(result.fictionalProtectedFileEffectsCommitted,0);
      assert.equal(result.fictionalProtectedToolEffectsCommitted,0);
    }
  }
});

test('M10-D: batch is deterministic and outputs only ordinal numbers',async()=>{
  const a=await runFictionalToyAgentBatch();
  const b=await runFictionalToyAgentBatch();
  assert.deepEqual(a,b);
  assert.equal(a.status,'PASS');
  assert.equal(a.exitCode,0);
  assert.equal(a.ruleCode,'ALL_FICTIONAL_TOY_AGENT_METHOD_CALL_CONTROLS_MATCH');
  const files=readdirSync(root);
  assert.equal(a.fixtureCount,files.length);
  assert.equal(a.matchedFixtures,files.length);
  assert.equal(a.modesPerFixture,5);
  assert.equal(a.expectedFaultModesPerFixture,4);
  assert.equal(a.totalModesChecked,files.length*5);
  assert.equal(a.expectedFaultModesDenied,files.length*4);
  assert.deepEqual(a.outcomes.map(x=>x.ordinal),files.map((_,i)=>i+1));
  for(const row of a.outcomes){
    assert.equal(row.toyAgentModesMatched,5);
    assert.equal(row.expectedFaultModesDenied,4);
    assert.equal(row.protectedFictionalEffectsCommitted,0);
  }
  const output=JSON.stringify(a);
  for(const file of files)assert.ok(!output.includes(file));
  assert.ok(!output.includes(fixture.caseId));
  assert.ok(!output.includes(fixture.toolResult.embeddedInstruction));
  assert.ok(!output.includes(root));
});

test('M10-E: synthetic batch cannot assert real agent observations or safety',async()=>{
  const r=await runFictionalToyAgentBatch();
  assert.equal(r.evidenceKind,
    'FIRST_PARTY_TOY_AGENT_GATEWAY_METHOD_CALLS_ONLY');
  for(const field of [
    'actualAgentBehaviorObserved','realFilesystemReadObserved',
    'realMcpToolCallObserved','injectedInstructionInterpreted',
    'externalMcpContacted','independentBetaVerified',
    'securityCertified','releaseAuthorized'
  ])assert.equal(r[field],false,field);
  assert.ok(Object.isFrozen(r.outcomes));
  assert.ok(Object.isFrozen(r.outcomes[0]));
  assert.ok(Object.isFrozen(r));
});

test('M10-E: no user-defined paths or extra arguments enter the batch',async()=>{
  const attempts=[
    ['PRIVATE_CANARY'],['--target=https://private.invalid'],
    ['../../secret.json'],[null],['one','two']
  ];
  const hidden=[];
  Object.defineProperty(hidden,'private',{value:'PRIVATE_CANARY'});
  attempts.push(hidden);
  const symbol=[];
  symbol[Symbol('private')]='PRIVATE_CANARY';
  attempts.push(symbol);
  const getter=[];
  Object.defineProperty(getter,0,{get(){throw Error('NEVER_EVALUATE_GETTER');}});
  attempts.push(getter);
  for(const args of attempts){
    const result=await runFictionalToyAgentBatch(args);
    assert.equal(result.status,'ERROR');
    assert.equal(result.exitCode,2);
    assert.equal(result.ruleCode,'TOY_AGENT_BATCH_UNAVAILABLE');
    assert.equal(result.realAgentBehaviorObserved,false);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  }
});

test('M10-F: zero-argument CLI returns JSON and never echoes user arguments',()=>{
  const run=(...args)=>spawnSync(process.execPath,[
    'tools/toy-agent-batch.mjs',...args
  ],{encoding:'utf8'});
  const ok=run();
  assert.equal(ok.status,0,ok.stderr);
  assert.equal(ok.stderr,'');
  const report=JSON.parse(ok.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.totalModesChecked,5*readdirSync(root).length);
  for(const value of ['PRIVATE_CANARY','--url=https://private.invalid','../../secret.json']){
    const bad=run(value);
    assert.equal(bad.status,2);
    assert.equal(bad.stderr,'');
    assert.equal(JSON.parse(bad.stdout).ruleCode,'TOY_AGENT_BATCH_UNAVAILABLE');
    assert.ok(!(bad.stdout+bad.stderr).includes(value));
  }
});

test('M10-F: docs, no external process and 80-path npm candidate stay unchanged',()=>{
  const docs=readFileSync(new URL('../.github/M10_TOY_AGENT_BATCH.md',
    import.meta.url),'utf8');
  const guide=readFileSync(new URL('../.github/FIXTURE_ONLY_CONTRIBUTIONS.md',
    import.meta.url),'utf8');
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  const roadmap=readFileSync(new URL('../ROADMAP.md',import.meta.url),'utf8');
  const source=readFileSync(new URL('../tools/toy-agent-batch.mjs',
    import.meta.url),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('../package.json',
    import.meta.url),'utf8'));
  for(const s of [docs,guide,readme])
    assert.match(s,/node tools\/toy-agent-batch\.mjs/);
  assert.match(roadmap,/M10-D\/E\/F/);
  assert.match(docs,/not a real (?:AI )?agent/i);
  assert.doesNotMatch(source,/from ['"]node:(?:net|http|https|child_process)['"]/);
  assert.deepEqual(pkg.files,[
    'src','fixtures','docs','examples','README.md','LICENSE',
    'SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
  ]);
});
