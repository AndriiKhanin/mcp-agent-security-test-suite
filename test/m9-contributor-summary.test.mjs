import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runFictionalFixtureBatchPreflight} from '../tools/fixture-batch-preflight.mjs';
import {runFictionalNegativeControlMatrix} from '../tools/fictional-negative-control-matrix.mjs';
import {
  renderFictionalContributorSummary,runFictionalContributorSummary
} from '../tools/fixture-contributor-summary.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
async function baseline(){
  return Promise.all([
    runFictionalFixtureBatchPreflight(),
    runFictionalNegativeControlMatrix()
  ]);
}

test('M9-H: pristine reports produce a bounded readable fictional-only summary',async()=>{
  const [batch,mutations]=await baseline();
  const text=renderFictionalContributorSummary(batch,mutations);
  assert.equal(typeof text,'string');
  assert.match(text,/MCP FICTIONAL FIXTURE CONTRIBUTOR REVIEW/);
  assert.ok(text.includes('Fictional fixtures accepted: '+batch.fixtureCount+'/'+batch.fixtureCount));
  assert.ok(text.includes('Fixed in-memory policy controls matched: '+
    (batch.fixtureCount*4)+'/'+(batch.fixtureCount*4)));
  assert.ok(text.includes('Negative report mutations rejected: '+
    (batch.fixtureCount*43)+'/'+(batch.fixtureCount*43)));
  for(const message of [
    'Actual AI agent behavior observed: NO',
    'Actual unrelated file read observed: NO',
    'External MCP target contacted: NO',
    'Independent beta verified: NO',
    'Independent security audit completed: NO',
    'Prompt-injection resilience certified: NO',
    'Stable release authorized: NO',
    'does not evaluate the attack wording or prove real-agent safety'
  ])assert.ok(text.includes(message),message);
  assert.equal(text,renderFictionalContributorSummary(batch,mutations));
});

test('M9-H: every authority or real-execution flag in either report is denied',async()=>{
  const [batch,mutations]=await baseline();
  for(const field of [
    'fixtureContentInterpreted','actualAgentBehaviorObserved',
    'realFilesystemReadObserved','untrustedInstructionExecuted',
    'externalMcpContacted','independentBetaVerified',
    'securityCertified','releaseAuthorized'
  ]){
    for(let source=0;source<2;source++){
      const b=clone(batch),m=clone(mutations);
      (source===0?b:m)[field]=true;
      assert.throws(()=>renderFictionalContributorSummary(b,m),
        /INVALID_FICTIONAL_CONTRIBUTOR_REPORT/,field);
    }
  }
});

test('M9-H: mismatched totals and corrupt negative counts cannot claim PASS',async()=>{
  const [batch,mutations]=await baseline();
  const changes=[
    [0,'status','FAIL'],
    [0,'exitCode',1],
    [0,'scope','REAL_AGENT'],
    [0,'ruleCode','RELEASE_APPROVED'],
    [0,'evidenceKind','INDEPENDENT_ATTESTATION'],
    [0,'fixtureCount',0],
    [0,'passed',batch.fixtureCount+1],
    [0,'policyControlsPerFixture',3],
    [0,'expectedDenialsPerFixture',2],
    [1,'status','FAIL'],
    [1,'exitCode',1],
    [1,'scope','REAL_TARGET'],
    [1,'ruleCode','PRODUCTION_SAFE'],
    [1,'evidenceKind','VERIFIED_EXTERNAL_MODEL'],
    [1,'fixtureCount',batch.fixtureCount+1],
    [1,'baselineChecksPassed',0],
    [1,'negativeControlsPerFixture',42],
    [1,'negativeControlsChecked',0],
    [1,'negativeControlsRejected',0],
    [1,'negativeControlsEscaped',1]
  ];
  for(const [source,key,value] of changes){
    const b=clone(batch),m=clone(mutations);
    (source===0?b:m)[key]=value;
    assert.throws(()=>renderFictionalContributorSummary(b,m),
      /INVALID_FICTIONAL_CONTRIBUTOR_REPORT/,key);
  }
});

test('M9-H: nested rows and unexpected properties fail before text rendering',async()=>{
  const [batch,mutations]=await baseline();
  const changes=[
    b=>{b.results[0].shape='UNKNOWN';},
    b=>{b.results[0].ordinal=2;},
    b=>{b.results[0].fixedPolicyControlsMatched=3;},
    b=>{b.results[0].deniedSyntheticActions=2;},
    b=>{b.results[0].protectedFictionalEffects=1;},
    b=>{b.results[0].secret='PRIVATE_CANARY';},
    b=>{b.results.push(b.results[0]);},
    b=>{delete b.results[0];},
    b=>{b.untrustedText='PRIVATE_CANARY';}
  ];
  for(const change of changes){
    const b=clone(batch);
    change(b);
    assert.throws(()=>renderFictionalContributorSummary(b,mutations),
      /INVALID_FICTIONAL_CONTRIBUTOR_REPORT/);
  }
  const m=clone(mutations);
  m.untrustedText='PRIVATE_CANARY';
  assert.throws(()=>renderFictionalContributorSummary(batch,m),
    /INVALID_FICTIONAL_CONTRIBUTOR_REPORT/);
});

test('M9-H: accessors, inherited records, hidden properties and symbols fail closed',async()=>{
  const [batch,mutations]=await baseline();
  const samples=[];
  const prototype=Object.create(batch);samples.push(prototype);
  const getter=clone(batch);
  Object.defineProperty(getter,'status',{enumerable:true,
    get(){throw new Error('HOSTILE_GETTER_MUST_NOT_RUN');}});
  samples.push(getter);
  const secret=clone(batch);
  secret[Symbol('secret')]='PRIVATE_CANARY';samples.push(secret);
  const nested=clone(batch);
  Object.defineProperty(nested.results[0],'secret',{value:'PRIVATE_CANARY'});
  samples.push(nested);
  const rowGetter=clone(batch);
  Object.defineProperty(rowGetter.results,0,{enumerable:true,
    get(){throw new Error('HOSTILE_ROW_GETTER_MUST_NOT_RUN');}});
  samples.push(rowGetter);
  for(const value of samples)
    assert.throws(()=>renderFictionalContributorSummary(value,mutations),
      /INVALID_FICTIONAL_CONTRIBUTOR_REPORT/);
});

test('M9-H: one-command CLI is deterministic, zero-argument and never echoes input',()=>{
  const run=(...args)=>spawnSync(process.execPath,[
    'tools/fixture-contributor-summary.mjs',...args
  ],{encoding:'utf8'});
  const first=run(),second=run();
  assert.equal(first.status,0,first.stderr);
  assert.equal(first.stderr,'');
  assert.equal(first.stdout,second.stdout);
  assert.match(first.stdout,/Scope: SOURCE-ONLY, FIRST-PARTY SYNTHETIC CHECKS/);
  for(const arg of ['PRIVATE_CANARY','../../secret.json','--url=https://private.invalid']){
    const bad=run(arg);
    assert.equal(bad.status,2);
    assert.equal(bad.stdout,'');
    assert.equal(bad.stderr,'ERROR: FICTIONAL_CONTRIBUTOR_SUMMARY_UNAVAILABLE\n');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});

test('M9-H: direct zero-argument API rejects hidden fields and untrusted arrays',async()=>{
  const extras=[];
  Object.defineProperty(extras,'private',{value:'PRIVATE_CANARY'});
  const getter=[];
  Object.defineProperty(getter,'0',{get(){throw Error('GETTER_MUST_NOT_RUN');}});
  const symbol=[];
  symbol[Symbol('secret')]='PRIVATE_CANARY';
  for(const args of [extras,getter,symbol,['private'],['one','two'],[null]]){
    const r=await runFictionalContributorSummary(args);
    assert.deepEqual(r,{
      exitCode:2,text:'ERROR: FICTIONAL_CONTRIBUTOR_SUMMARY_UNAVAILABLE\n'
    });
  }
});

test('M9-I: documentation and 80-path npm release inventory remain unchanged',()=>{
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  const guide=readFileSync(new URL('../.github/FIXTURE_ONLY_CONTRIBUTIONS.md',
    import.meta.url),'utf8');
  const roadmap=readFileSync(new URL('../ROADMAP.md',import.meta.url),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  for(const text of [readme,guide])
    assert.match(text,/node tools\/fixture-contributor-summary\.mjs/);
  assert.match(roadmap,/M9-G\/H\/I/);
  assert.deepEqual(pkg.files,[
    'src','fixtures','docs','examples','README.md',
    'LICENSE','SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
  ]);
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('.github'));
});
