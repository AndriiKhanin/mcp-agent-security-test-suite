import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {Readable} from 'node:stream';
import {
  verifyFictionalBridgeOutcome,runFictionalFixtureBatchPreflight,
  exportFictionalDetectorCases,triageFictionalDetectorResults,
  triageFictionalDetectorJson,runFictionalDetectorTriageStdin,
  compareFictionalDetectorBatch,compareFictionalDetectorBatchJson,
  runFictionalDetectorBatchStdin,
  reviewFictionalDetectorBatch,reviewFictionalDetectorBatchJson,
  runFictionalDetectorReviewStdin
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


const m38Export=()=>exportFictionalDetectorCases();
const m38Input=observations=>({
  reportSchemaVersion:1,sourceProfile:'m38-fictional-detector-cases-v1',
  results:m38Export().rows.map((r,i)=>({
    caseId:r.caseId,observed:observations[i]
  }))
});
const m38Cli=(args=[],input)=>spawnSync(process.execPath,
  ['tools/fixture-batch-preflight.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    input,encoding:'utf8',timeout:15000,windowsHide:true,
    env:{...process.env,NODE_OPTIONS:''}
  });
const denyM38=x=>{
  assert.equal(x.reportSchemaVersion,1);
  assert.equal(x.profile,'m38-fictional-detector-comparison-v1');
  assert.equal(x.status,'ERROR');
  assert.equal(x.exitCode,2);
  assert.equal(x.ruleCode,'M38_INVALID_OR_UNREADABLE_COMPARISON');
  assert.equal(x.manualReviewRequired,true);
  assert.equal(x.limits.scannerExecuted,false);
  assert.equal(x.limits.realMcpTargetContacted,false);
  assert.equal(x.limits.independentBetaVerified,false);
  assert.equal(x.limits.releaseAuthorized,false);
};
test('M38-A: export exactly two clean and two mixed approved fictional texts',()=>{
  const pack=m38Export();
  assert.equal(pack.reportSchemaVersion,1);
  assert.equal(pack.profile,'m38-fictional-detector-cases-v1');
  assert.equal(pack.status,'PASS');
  assert.equal(pack.exitCode,0);
  assert.equal(pack.authorLabelsOnly,true);
  assert.equal(pack.scannerResultsIncluded,false);
  assert.equal(pack.caseCount,4);
  assert.deepEqual(pack.rows.map(x=>x.expectedLabel),
    ['BENIGN','INJECTION','BENIGN','INJECTION']);
  assert.deepEqual(pack.rows.map(x=>x.caseId),[
    'mixed-tool-result-file-read:clean',
    'mixed-tool-result-file-read:mixed',
    'ticket-status-prerequisite-file-read:clean',
    'ticket-status-prerequisite-file-read:mixed'
  ]);
  for(const [j,name] of [
    'mixed-tool-result-file-read.json',
    'ticket-status-prerequisite-file-read.json'
  ].entries()){
    const source=JSON.parse(readFileSync(join(root,name),'utf8'));
    const baseline=source.toolResult.legitimateData;
    const injected=baseline+'\n'+source.toolResult.embeddedInstruction;
    assert.equal(pack.rows[j*2].text,baseline);
    assert.equal(pack.rows[j*2+1].text,injected);
    assert.equal(pack.rows[j*2].sourceCaseId,source.caseId);
    assert.equal(pack.rows[j*2+1].sourceCaseId,source.caseId);
  }
  assert.equal(Object.isFrozen(pack),true);
  assert.equal(Object.isFrozen(pack.rows),true);
  assert.equal(Object.isFrozen(pack.rows[0]),true);
  assert.equal(pack.limits.scannerExecuted,false);
  assert.equal(pack.limits.securityCertified,false);
  const a=m38Cli(['--export-detector-cases']);
  assert.equal(a.status,0,a.stderr);
  assert.equal(a.stderr,'');
  assert.deepEqual(JSON.parse(a.stdout),pack);
  assert.ok(Buffer.byteLength(a.stdout)<4096);
  for(const forbidden of [
    'PRIVATE_CANARY','sk-',process.cwd(),'C:\\Users\\'
  ])assert.ok(!a.stdout.includes(forbidden),forbidden);
});
test('M38-B: self-reported TP FP FN TN and ERROR counted without false certification',()=>{
  const sets=[
    {observations:['NOT_FLAGGED','FLAGGED','NOT_FLAGGED','FLAGGED'],
      expected:{TP:2,FP:0,FN:0,TN:2,ERROR:0},classified:4},
    {observations:['FLAGGED','NOT_FLAGGED','NOT_FLAGGED','FLAGGED'],
      expected:{TP:1,FP:1,FN:1,TN:1,ERROR:0},classified:4},
    {observations:['NOT_FLAGGED','ERROR','ERROR','NOT_FLAGGED'],
      expected:{TP:0,FP:0,FN:1,TN:1,ERROR:2},classified:2}
  ];
  for(const entry of sets){
    const data=m38Input(entry.observations);
    const report=triageFictionalDetectorResults(data);
    assert.equal(report.status,'PASS');
    assert.equal(report.exitCode,0);
    assert.equal(report.ruleCode,'SELF_REPORTED_DETECTOR_RESULTS_CLASSIFIED_ONLY');
    assert.equal(report.resultsSelfReportedOnly,true);
    assert.equal(report.manualReviewRequired,true);
    assert.equal(report.noEstimatedPopulationPerformance,true);
    assert.deepEqual(report.outcomes,entry.expected);
    assert.equal(report.classifiedCount,entry.classified);
    assert.equal(report.caseCount,4);
    assert.equal(report.results.length,4);
    assert.equal(report.limits.scannerIdentityVerified,false);
    assert.equal(report.limits.scannerExecuted,false);
    assert.equal(report.limits.independentlyReproduced,false);
    assert.equal(report.limits.independentBetaVerified,false);
    assert.equal(report.limits.securityCertified,false);
    assert.equal(report.limits.realAgentObserved,false);
    for(const x of report.results)assert.equal(x.caseId.includes('PRIVATE'),false);
    assert.equal(Object.isFrozen(report),true);
    assert.equal(Object.isFrozen(report.results),true);
    assert.equal(Object.isFrozen(report.results[0]),true);
    const p=m38Cli(['--triage-detector-results'],JSON.stringify(data));
    assert.equal(p.error,undefined);
    assert.equal(p.status,0,p.stderr);
    assert.equal(p.stderr,'');
    assert.deepEqual(JSON.parse(p.stdout),report);
    assert.ok(!p.stdout.includes('Fictional ticket T42'));
    assert.ok(!p.stdout.includes('Fictional order Q17'));
    assert.ok(!p.stdout.includes('PRIVATE_CANARY'));
  }
});
test('M38-B: invalid classifications, forged provenance and unknown fields fail closed',()=>{
  const base=m38Input(['NOT_FLAGGED','FLAGGED','NOT_FLAGGED','FLAGGED']);
  const changes=[
    x=>{x.results[0].observed='PASS';},
    x=>{x.results[0].observed='SCANNED_REAL_SERVER';},
    x=>{x.results[0].caseId='PRIVATE_CANARY';},
    x=>{x.results[1].caseId=x.results[0].caseId;},
    x=>{x.results[2].observed=null;},
    x=>{x.results[3].observed=4;},
    x=>{x.results[1].scannerVerified=true;},
    x=>{x.results[1].rule='PRIVATE_CANARY';},
    x=>{x.results.pop();},
    x=>{x.results.push({caseId:'extra',observed:'FLAGGED'});},
    x=>{x.authorized=true;},
    x=>{x.scannerName='PRIVATE_CANARY';},
    x=>{x.sourceProfile='REAL_AGENT_SCAN';},
    x=>{x.reportSchemaVersion=2;}
  ];
  for(const mutate of changes){
    const x=structuredClone(base);mutate(x);
    denyM38(triageFictionalDetectorResults(x));
  }
  let called=0;
  const get=structuredClone(base);
  Object.defineProperty(get.results[0],'observed',{
    enumerable:true,get(){called++;throw Error('PRIVATE_CANARY');}
  });
  denyM38(triageFictionalDetectorResults(get));
  assert.equal(called,0);
  const sparse=structuredClone(base);
  delete sparse.results[1];
  denyM38(triageFictionalDetectorResults(sparse));
  const inherited=Object.create(base);
  denyM38(triageFictionalDetectorResults(inherited));
  const foreign=structuredClone(base);
  Object.setPrototypeOf(foreign.results,{});
  denyM38(triageFictionalDetectorResults(foreign));
  const hidden=structuredClone(base);
  Object.defineProperty(hidden,'hidden',{value:'PRIVATE_CANARY'});
  denyM38(triageFictionalDetectorResults(hidden));
  denyM38(exportFictionalDetectorCases(['--publish']));
  denyM38(exportFictionalDetectorCases(Array(1)));
  denyM38(exportFictionalDetectorCases(Object.create([])));
});
test('M38-B: strict UTF-8, bounded JSON, duplicate keys and unsupported modes deny without echo',async()=>{
  const data=m38Input(['NOT_FLAGGED','FLAGGED','NOT_FLAGGED','FLAGGED']);
  const accepted=JSON.stringify(data);
  const invalid=[
    '', ' ', '{bad}', accepted+' extra',
    '{"reportSchemaVersion":1,"reportSchemaVersion":1}',
    JSON.stringify({...data,private:'PRIVATE_CANARY'}),
    Buffer.from([0xff,0xfe,0x00]),
    Buffer.alloc(2049,0x20)
  ];
  for(const value of invalid){
    if(typeof value==='string')denyM38(triageFictionalDetectorJson(value));
    const res=m38Cli(['--triage-detector-results'],value);
    assert.equal(res.status,2,res.stderr);
    assert.equal(res.stderr,'');
    const parsed=JSON.parse(res.stdout);
    denyM38(parsed);
    assert.ok(!res.stdout.includes('PRIVATE_CANARY'));
  }
  for(const args of [
    ['--export-detector-cases','--publish'],
    ['--triage-detector-results','--target=PRIVATE_CANARY'],
    ['--unknown','PRIVATE_CANARY']
  ]){
    const p=m38Cli(args,accepted);
    assert.equal(p.status,2,p.stderr);
    assert.equal(p.stderr,'');
    assert.ok(!p.stdout.includes('PRIVATE_CANARY'));
  }
  const tty=Readable.from([Buffer.from(accepted)]);
  tty.isTTY=true;
  denyM38(await runFictionalDetectorTriageStdin([],tty));
  const streamed=Readable.from([
    Buffer.from(accepted.slice(0,18)),Buffer.from(accepted.slice(18))
  ]);
  const ok=await runFictionalDetectorTriageStdin([],streamed);
  assert.equal(ok.status,'PASS');
  const invalidArgs=[
    ['PRIVATE_CANARY'],Array(1),Object.create([]),
    Object.create(null)
  ];
  for(const args of invalidArgs)
    denyM38(await runFictionalDetectorTriageStdin(args,
      Readable.from([Buffer.from(accepted)])));
});
test('M38-C: source-only comparative mode does not expand unpublished package or M6-J custody',()=>{
  const packageConfig=JSON.parse(readFileSync(
    new URL('../package.json',import.meta.url),'utf8'));
  const paths=JSON.parse(readFileSync(
    new URL('./expected-package-files.json',import.meta.url),'utf8'));
  assert.equal(packageConfig.version,'0.0.10-rc.1');
  assert.equal(paths.length,80);
  assert.ok(!packageConfig.files.includes('tools'));
  assert.ok(!paths.includes('tools/fixture-batch-preflight.mjs'));
  const tool=readFileSync(new URL('../tools/fixture-batch-preflight.mjs',
    import.meta.url),'utf8');
  assert.doesNotMatch(tool,
    /from ['"]node:(?:child_process|https|http|net|tls)['"]/u);
  assert.match(tool,/scannerExecuted:false/);
  assert.match(tool,/M38_INPUT_MAX=2048/);
  const custody=readFileSync(new URL('../tools/reviewer-handoff.mjs',
    import.meta.url),'utf8');
  assert.match(custody,/const MAX_EXCLUDED_FILES=240/);
  assert.match(custody,/if\(files.length>MAX_EXCLUDED_FILES\)denied\(\)/);
});

test('M39: two scanner aliases produce accurate aggregate and per-case classifications',async()=>{
  const obs=[
    ['NOT_FLAGGED','FLAGGED','NOT_FLAGGED','FLAGGED'],
    ['FLAGGED','NOT_FLAGGED','ERROR','FLAGGED']
  ];
  const input={reportSchemaVersion:1,
    sourceProfile:'m38-fictional-detector-cases-v1',
    scanners:obs.map((observations,i)=>({
      scannerId:'detector-'+(i+1),results:m38Input(observations).results
    }))
  };
  const r=compareFictionalDetectorBatch(input);
  assert.equal(r.status,'PASS');
  assert.equal(r.scannerCount,2);
  assert.deepEqual(r.totals,{TP:3,FP:1,FN:1,TN:2,ERROR:1});
  assert.deepEqual(r.cases[0].classifications,
    {TP:0,FP:1,FN:0,TN:1,ERROR:0});
  assert.deepEqual(r.cases[1].classifications,
    {TP:1,FP:0,FN:1,TN:0,ERROR:0});
  assert.equal(r.resultsSelfReportedOnly,true);
  assert.equal(r.limits.scannerExecuted,false);
  const cli=m38Cli(['--compare-detector-batch'],JSON.stringify(input));
  assert.equal(cli.status,0,cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout),r);
  const stream=Readable.from([Buffer.from(JSON.stringify(input))]);
  assert.deepEqual(await runFictionalDetectorBatchStdin([],stream),r);
  for(const change of [
    x=>x.scanners.push(structuredClone(x.scanners[0])),
    x=>x.scanners[0].scannerId='../secret',
    x=>x.scanners[1].scannerId=x.scanners[0].scannerId,
    x=>x.scanners[0].results[0].observed='UNKNOWN',
    x=>x.scanners[0].results.reverse(),
    x=>x.scanners[1].privateConfig='secret',
    x=>x.scanners=[],
    x=>x.scanners=Array(1),
    x=>x.sourceProfile='unknown'
  ]){
    const bad=structuredClone(input);change(bad);
    assert.equal(compareFictionalDetectorBatch(bad).status,'ERROR');
  }
  assert.equal(compareFictionalDetectorBatchJson(
    '{"reportSchemaVersion":1,"reportSchemaVersion":1}').status,'ERROR');
  assert.equal(compareFictionalDetectorBatchJson(' '.repeat(16385)).status,'ERROR');
  const invalid=m38Cli(['--compare-detector-batch'],Buffer.from([0xff]));
  assert.equal(invalid.status,2);
  assert.ok(!invalid.stdout.includes('secret'));
});

test('M40: reviewer queue prioritizes FN, FP and ERROR without scanner execution',async()=>{
  const input={reportSchemaVersion:1,sourceProfile:'m38-fictional-detector-cases-v1',
    scanners:[
      {scannerId:'scanner-one',results:m38Input([
        'FLAGGED','NOT_FLAGGED','NOT_FLAGGED','FLAGGED'
      ]).results},
      {scannerId:'scanner-two',results:m38Input([
        'NOT_FLAGGED','FLAGGED','ERROR','ERROR'
      ]).results}
    ]};
  const report=reviewFictionalDetectorBatch(input);
  assert.equal(report.status,'PASS');
  assert.deepEqual(report.counts,{TP:2,FP:1,FN:1,TN:2,ERROR:2});
  assert.equal(report.findingCount,4);
  assert.deepEqual(report.reviewQueue.map(x=>x.finding),[
    'FP','FN','ERROR','ERROR'
  ]);
  assert.equal(report.independentReproductionConfirmed,false);
  assert.equal(report.resultsSelfReportedOnly,true);
  assert.equal(report.manualReviewRequired,true);
  assert.equal(report.limits.scannerExecuted,false);
  const json=JSON.stringify(input);
  const cli=m38Cli(['--review-detector-batch'],json);
  assert.equal(cli.status,0,cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout),report);
  assert.ok(!cli.stdout.includes('Fictional ticket T42'));
  assert.ok(!cli.stdout.includes('Fictional order Q17'));
  assert.deepEqual(await runFictionalDetectorReviewStdin([],
    Readable.from([Buffer.from(json)])),report);
  for(const invalid of [
    '',
    '{"reportSchemaVersion":1,"reportSchemaVersion":1}',
    JSON.stringify({...input,claim:'REAL_SCAN_VERIFIED'}),
    JSON.stringify({...input,scanners:[...input.scanners,input.scanners[0]]}),
    ' '.repeat(16385)
  ])assert.equal(reviewFictionalDetectorBatchJson(invalid).status,'ERROR');
  assert.equal(m38Cli(['--review-detector-batch'],
    Buffer.from([0xff])).status,2);
  assert.equal(m38Cli(['--review-detector-batch','--unsafe'],json).status,2);
  assert.equal(Object.isFrozen(report.reviewQueue),true);
});
