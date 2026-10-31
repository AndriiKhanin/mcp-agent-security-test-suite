import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BETA_CASES, matchesBetaCase, betaSummary, runBeta, reviewBetaEvidenceSummary, REVIEWED_FICTIONAL_BETA_SOURCE_SHA } from '../examples/beta-acceptance-check.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=(...args)=>spawnSync(process.execPath,['examples/beta-acceptance-check.mjs',...args],{
  cwd:root, shell:false, encoding:'utf8', timeout:60_000, maxBuffer:65_536
});

test('M5-05: offline beta runner verifies exact five fixed positive and detected-negative cases',()=>{
  const x=run();
  assert.equal(x.error,undefined);
  assert.equal(x.status,0,x.stderr);
  const result=JSON.parse(x.stdout);
  assert.equal(result.betaSchemaVersion,1);
  assert.equal(result.profile,'fictional-beta-acceptance-v1');
  assert.equal(result.candidate,'0.0.10-rc.1');
  assert.equal(result.status,'PASS');
  assert.equal(result.exitCode,0);
  assert.deepEqual([result.total,result.passed,result.failed],[5,5,0]);
  assert.deepEqual(result.cases.map(c=>c.id),BETA_CASES.map(c=>c.id));
  assert.deepEqual(result.cases.map(c=>c.expectedStatus),['PASS','PASS','PASS','PASS','FAIL']);
  assert.deepEqual(result.cases.map(c=>c.expectedExit),[0,0,0,0,1]);
  assert.ok(result.cases.every(c=>c.matched===true && c.rule==='NONE'));
  assert.ok(!x.stdout.includes('fictional-nonce'));
  assert.ok(!x.stdout.includes(root));
});

test('M5-05: mutated or missing negative detection fails closed without leaking synthetic payload',()=>{
  const right={reportSchemaVersion:1,exitCode:1,command:'negotiate',
    status:'FAIL',summary:{failureCount:1,ruleCodes:['RETRY_PARAMS_CHANGED']}};
  assert.equal(matchesBetaCase('RETRY_MUTATION',1,right),true);
  const altered={...right, summary:{failureCount:1,ruleCodes:['SYNTHETIC_PRIVATE_SECRET']}};
  assert.equal(matchesBetaCase('RETRY_MUTATION',1,altered),false);
  assert.equal(matchesBetaCase('RETRY_MUTATION',0,{...right,exitCode:0,status:'PASS'}),false);
  assert.equal(matchesBetaCase('RETRY_MUTATION',1,null),false);
  const verdict=betaSummary(BETA_CASES.map(c=>({
    id:c.id,matched:c.id!=='RETRY_MUTATION',
    rule:c.id==='RETRY_MUTATION'?'BETA_EXPECTATION_MISMATCH':'NONE'
  })));
  assert.equal(verdict.status,'FAIL');
  assert.equal(verdict.exitCode,1);
  assert.deepEqual([verdict.passed,verdict.failed],[4,1]);
  assert.ok(!JSON.stringify(verdict).includes('SYNTHETIC_PRIVATE_SECRET'));
});

test('M5-05: wrong identity, missing case, malformed report or changed policy controls are rejected',()=>{
  assert.equal(matchesBetaCase('UNKNOWN_CASE',0,{}),false);
  assert.equal(matchesBetaCase('LOCAL_VERSION',0,{
    reportSchemaVersion:1,exitCode:0,status:'PASS',command:'version',
    version:'0.0.10-rc.999',packageName:'mcp-agent-security-test-suite'
  }),false);
  assert.equal(matchesBetaCase('POLICY_DENIAL',0,{
    reportSchemaVersion:1,exitCode:0,command:'scenario',
    status:'PASS',checks:11,actualFinal:{denied:9,allowed:2,writes:9,reads:1},
    mismatches:[]
  }),false);
  assert.throws(()=>betaSummary([]),/BETA_INVALID_SUMMARY_INPUT/);
  assert.throws(()=>betaSummary(Array(5).fill({id:'OFFLINE_HELP',matched:true,rule:'NONE'})),
    /BETA_INVALID_SUMMARY_INPUT/);
});

test('M5-05: user path, flag, URL and command arguments are rejected and never echoed',()=>{
  for(const arg of ['--target=https://fictional-private.invalid',
    'C:\\fictional-private-path\\secret.json','--exec=fictional-child']) {
    const x=run(arg);
    assert.equal(x.status,2);
    const report=JSON.parse(x.stdout);
    assert.deepEqual(report,{
      betaSchemaVersion:1,profile:'fictional-beta-acceptance-v1',
      status:'ERROR',exitCode:2,errorCode:'BETA_ARGUMENTS_NOT_ALLOWED'
    });
    assert.ok(!(x.stdout+x.stderr).includes(arg));
  }
});

test('M5-05: fixed runner does not accept variable command inventory or user-supplied cases',()=>{
  assert.equal(BETA_CASES.length,5);
  assert.deepEqual(BETA_CASES.map(c=>c.id),[
    'OFFLINE_HELP','LOCAL_VERSION','FIXED_DEMO','POLICY_DENIAL','RETRY_MUTATION'
  ]);
  assert.ok(BETA_CASES.every(c=>Object.isFrozen(c) && Object.isFrozen(c.args)));
  assert.equal(runBeta(['arbitrary-private-fixture']).errorCode,'BETA_ARGUMENTS_NOT_ALLOWED');
});


/* M5-07 — protect the manual evaluator guide, not fake independent evidence. */
const documented=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8').replace(/\r\n/g,'\n');

test('M5-07: evaluator pins an actual full public source SHA and remains fictional-only',()=>{
  const d=documented('docs/BETA_TESTING.md');
  const pin='65ded572c1720832ff3f59cb9cd0e3a6987edbdb';
  assert.match(pin,/^[0-9a-f]{40}$/);
  assert.ok(d.includes('git switch --detach '+pin));
  assert.ok(d.includes('git rev-parse HEAD'));
  assert.ok(d.includes('0.0.10-rc.1'));
  assert.ok(d.includes('node --version'));
  assert.ok(d.includes('node examples/beta-acceptance-check.mjs'));
  assert.ok(d.includes('node examples/offline-ci-check.mjs'));
  assert.ok(d.includes('No real MCP servers') || d.includes('No real\nMCP endpoints'));
  assert.ok(d.includes('not a published npm release') || d.includes('not independently operated'));
  assert.ok(d.includes('independently operated tester'));
});

test('M5-07: optional tarball check is offline, local and not represented as signed proof',()=>{
  const d=documented('docs/BETA_TESTING.md');
  for(const literal of [
    'npm pack --offline --ignore-scripts --pack-destination',
    'npm_config_cache',
    'Get-FileHash -LiteralPath $Archive -Algorithm SHA256',
    'sha256sum "$pack_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"',
    'An archive digest computed by the author',
    '80-path',
    'R1 package test'
  ])assert.ok(d.includes(literal),literal);
  assert.doesNotMatch(d,/^\s*(?:&\s*)?npm publish(?:\s|$)/m);
  const src=documented('test/installed-cli-smoke.test.mjs');
  for(const snippet of [
    "'pack', '--json', '--offline', '--ignore-scripts'",
    "'install', '--offline', '--ignore-scripts'",
    "npm_config_offline: 'true'",
    "rmSync(temp, { recursive: true, force: true })"
  ])assert.ok(src.includes(snippet),snippet);
  assert.match(documented('package.json'),/"version": "0\.0\.10-rc\.1"/);
  assert.equal(JSON.parse(documented('test/expected-package-files.json')).length,80);
});

test('M5-07: public beta issue template collects limited fictional feedback only',()=>{
  const form=documented('.github/ISSUE_TEMPLATE/beta_feedback.yml');
  for(const id of [
    'source_commit','version','os','node_major','runner_result',
    'matched_count','evaluation_path','offline_archive','exit_codes',
    'guide_clarity','install_friction','deviations','usability',
    'safe_disclosure','actual_test'
  ])assert.ok(form.includes('id: '+id),'missing form field '+id);
  assert.ok(form.includes('I personally ran the fixed fictional beta protocol'));
  assert.ok(form.includes('A green CI run is not independent beta-tester evidence.'));
  assert.ok(form.includes('Local archive check not attempted'));
  assert.ok(form.includes('Did not run enough exercises'));
  assert.ok(form.includes('required: false'));
  for(const suspicious of [
    'id: token','id: target_url','id: oauth','id: private_logs',
    'id: upload','id: raw_transcript','id: repository_secret'
  ])assert.ok(!form.includes(suspicious),suspicious);
});

test('M5-07: instructions separate expected symbolic detection from safety PASS',()=>{
  const d=documented('docs/BETA_TESTING.md');
  assert.ok(d.includes('observedSafetyStatus:FAIL'));
  assert.ok(d.includes('RETRY_PARAMS_CHANGED'));
  assert.ok(d.includes('process exit **0**'));
  assert.ok(d.includes('exit **1**'));
  assert.ok(d.includes('exit **2**'));
  assert.ok(d.includes('independent usability gate'));
  assert.ok(d.includes('manual'));
  assert.ok(d.includes('#59'));
  assert.ok(d.includes('#43'));
  assert.ok(d.includes('#21'));
  assert.ok(d.includes('No outreach, automatic upload, telemetry'));
  const quick=documented('docs/GETTING_STARTED.md');
  assert.ok(quick.includes('DEMO_PASS: all offline fictional contract checks behaved as expected'));
  assert.ok(quick.includes('SYNTHETIC_EXPECTED_VIOLATION: observed FAIL, expectation MATCH'));
  assert.ok(quick.includes('SYNTHETIC_UNEXPECTED_VIOLATION: observed FAIL, expectation MISMATCH'));
});

test('M5-07: independently operated beta acceptance cannot be inferred from CI',()=>{
  const repoReadme=documented('README.md');
  const roadmap=documented('ROADMAP.md');
  assert.ok(repoReadme.includes('independently verified beta participant yet'));
  assert.ok(roadmap.includes('not independent beta evidence'));
  assert.ok(roadmap.includes('all three independent gates #21/#43/#59'));
  const direct=run();
  assert.equal(direct.status,0,direct.stderr);
  const result=JSON.parse(direct.stdout);
  assert.equal(result.total,5);
  assert.equal(result.passed,5);
  assert.equal(result.failed,0);
  assert.ok(result.cases.every(row=>row.matched && row.rule==='NONE'));
  assert.notEqual(result.profile,'independent-beta-evidence');
});

test('M5-07: bad evaluator runner arguments remain generic even with fake secrets',()=>{
  for(const arg of [
    '--target=https://customer.example.invalid/mcp',
    '--token=fictional-private-secret',
    '--log=private-customer-transcript.json'
  ]) {
    const outcome=run(arg);
    assert.equal(outcome.status,2);
    const result=JSON.parse(outcome.stdout);
    assert.equal(result.status,'ERROR');
    assert.equal(result.errorCode,'BETA_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(outcome.stdout+outcome.stderr).includes(arg));
  }
});


test('P1 M5-07: Markdown fences are balanced and shell snippets cannot consume later sections',()=>{
  const full=documented('docs/BETA_TESTING.md');
  const guideStart=full.indexOf('## F1 independent first-run beta — reviewed source candidate');
  const legacyStart=full.indexOf('## M14 — optional capability tour');
  assert.ok(guideStart>=0 && legacyStart>guideStart,'F1 guide must precede historical beta sections');
  const guide=full.slice(guideStart,legacyStart);
  const d=full.slice(legacyStart);
  const codeMarker=line=>['```','```sh','```powershell'].includes(line.trim());
  const guideFences=guide.split('\n').filter(codeMarker);
  assert.equal(guideFences.length,6,'F1 guide has exactly three complete shell blocks');
  assert.equal(guideFences.filter(line=>line.trim()==='```sh').length,3);
  assert.ok(guide.includes('node src/cli.mjs start --text'));
  assert.ok(guide.includes('node tools/beta-review.mjs'));
  assert.ok(guide.includes('externalTargetContacted:false'));
  const fences=d.split('\n').filter(codeMarker);
  assert.equal(fences.length,14,'7 complete code blocks are expected, including optional M14 tour');
  let open=null,blocks=[];
  for(const line of d.split('\n')){
    const match=codeMarker(line) ? [line.trim(),line.trim().slice(3)] : null;
    if(match){
      if(open===null)open={lang:match[1]??'',lines:[]};
      else {blocks.push(open);open=null;}
    }else if(open!==null)open.lines.push(line);
  }
  assert.equal(open,null,'unterminated fenced block');
  assert.deepEqual(blocks.map(b=>b.lang),['sh','sh','sh','sh','sh','powershell','sh']);
  assert.deepEqual(blocks[0].lines,['node tools/beta-capability-tour.mjs']);
  assert.deepEqual(blocks[1].lines,[
    'node tools/beta-checkout-receipt.mjs',
    'node tools/beta-feedback-card.mjs'
  ]);
  assert.deepEqual(blocks[2].lines,['node tools/beta-feedback-card.mjs']);
  for(const [index,block] of blocks.entries()){
    assert.ok(block.lines.length>=(index===0?1:index===1?2:index===2?1:4),'empty/truncated fenced block');
    assert.ok(block.lines.every(line=>!/^#{1,4} /.test(line) && !line.startsWith('| Case identifier')),
      'a Markdown section/table was swallowed inside a shell block');
  }
  const ps=blocks.find(block=>block.lang==='powershell').lines.join('\n');
  assert.ok(ps.includes("if ($ArchiveDigest.Length -ne 64) { throw 'Digest invalid' }"));
  assert.ok(ps.includes('Get-FileHash -LiteralPath $Archive -Algorithm SHA256'));
  assert.ok(ps.includes('npm pack --offline --ignore-scripts --pack-destination $Pack'));
  assert.ok(ps.includes("if ($LASTEXITCODE -ne 0) { throw 'Offline beta contract failed' }"));
  const shell=blocks.at(-1).lines.join('\n');
  assert.ok(shell.includes('sha256sum "$pack_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"'));
});

test('P1 M5-07: previous duplicate-heading and misplaced-insertion regression is rejected',()=>{
  const d=documented('docs/BETA_TESTING.md');
  const headings=[
    '## Expected fixed controls',
    '## What a real beta tester should report',
    '## Engineering acceptance evidence (2026-10-23)',
    '## Independent evaluator quick path (M5-07, no live targets)'
  ];
  for(const h of headings){
    assert.equal(d.split('\n').filter(l=>l===h).length,1,h+' repeated');
  }
  const first=d.indexOf('## Expected fixed controls');
  const second=d.indexOf('## What a real beta tester should report');
  const third=d.indexOf('## Engineering acceptance evidence');
  const fourth=d.indexOf('## Independent evaluator quick path');
  assert.ok(first>=0&&first<second&&second<third&&third<fourth);
  assert.ok(!d.includes("if ($ArchiveDigest -notmatch '^[A-Fa-f0-9]{64}"));
  assert.ok(d.includes('No outreach, automatic upload, telemetry'));
});


/* M5-08: synthetically authored claims, NEVER a real participant result. */
const fictionalBetaClaim=()=>({
  evidenceSchemaVersion:1,
  sourceSha:REVIEWED_FICTIONAL_BETA_SOURCE_SHA,
  candidate:'0.0.10-rc.1',
  os:'Ubuntu',nodeMajor:22,
  runnerStatus:'PASS',matchedCount:5,
  cases:BETA_CASES.map(c=>({id:c.id,matched:true,rule:'NONE'}))
});
const rejectsEvidence=x=>assert.throws(()=>reviewBetaEvidenceSummary(x),
  /INVALID_FICTIONAL_BETA_EVIDENCE_CLAIM/);
const assertNotAccepted=r=>{
  assert.equal(r.preflightStatus,'CLAIM_CONSISTENT_ONLY');
  assert.equal(r.independentOriginVerified,false);
  assert.equal(r.actualExecutionVerified,false);
  assert.equal(r.manualProvenanceReviewRequired,true);
  assert.equal(r.betaGateSatisfied,false);
  assert.equal(r.securityCertified,false);
  assert.equal(r.realTargetAuthorized,false);
  assert.equal(r.externalMcpContacted,false);
  assert.equal(r.releaseAuthorized,false);
  assert.equal(r.nextAction,'VERIFY_EXTERNAL_SOURCE_AND_TRIAGE_MANUALLY');
};

test('M5-08: fictional internally consistent PASS claim is NOT independent beta evidence',()=>{
  const r=reviewBetaEvidenceSummary(fictionalBetaClaim());
  assertNotAccepted(r);
  assert.equal(r.claimedRunnerStatus,'PASS');
  assert.equal(r.claimedMatchedCount,5);
  assert.equal(r.total,5);
  assert.equal(r.sourceSha,REVIEWED_FICTIONAL_BETA_SOURCE_SHA);
  assert.deepEqual(r.cases.map(x=>x.claimStatus),Array(5).fill('MATCH_CLAIMED'));
});

test('M5-08: a consistent fictional failed beta claim still only needs manual review',()=>{
  const claim=fictionalBetaClaim();
  claim.runnerStatus='FAIL';
  claim.matchedCount=4;
  claim.cases[4]={id:'RETRY_MUTATION',matched:false,
    rule:'BETA_EXPECTATION_MISMATCH'};
  const r=reviewBetaEvidenceSummary(claim);
  assertNotAccepted(r);
  assert.equal(r.claimedRunnerStatus,'FAIL');
  assert.equal(r.claimedMatchedCount,4);
  assert.deepEqual(r.cases[4],{
    caseId:'RETRY_MUTATION',
    claimStatus:'MISMATCH_CLAIMED',
    rule:'BETA_EXPECTATION_MISMATCH'
  });
});

test('M5-08: exact reviewed public source identity is required',()=>{
  const claim=fictionalBetaClaim();
  assert.match(REVIEWED_FICTIONAL_BETA_SOURCE_SHA,/^[a-f0-9]{40}$/);
  for(const candidate of [
    '',null,'main','HEAD','a'.repeat(40),'../../private',123
  ])rejectsEvidence({...claim,sourceSha:candidate});
});

test('M5-08: no flexible candidate or unsupported machine identity is accepted',()=>{
  const c=fictionalBetaClaim();
  for(const changed of [
    {candidate:'0.0.11'},{os:'macOS'},{os:'ubuntu'},
    {os:'PRIVATE_HOSTNAME'},{nodeMajor:24},{nodeMajor:'22'},
    {runnerStatus:'ERROR'},{runnerStatus:'SAFE'},{matchedCount:'5'},
    {matchedCount:-1},{matchedCount:6},{matchedCount:2.5},
    {evidenceSchemaVersion:2},{evidenceSchemaVersion:'1'}
  ])rejectsEvidence({...c,...changed});
});

test('M5-08: evidence never accepts free-text names, links, credentials or logs',()=>{
  const c=fictionalBetaClaim();
  for(const injected of [
    {tester:'some-user'}, {email:'user@example.com'},
    {issueUrl:'https://github.com/private'},
    {endpoint:'https://customer.invalid/mcp'},
    {notes:'PRIVATE_CANARY'}, {logs:['PRIVATE_CANARY']},
    {token:'PRIVATE_CANARY'}, {path:'C:\\private\\logs'},
    {verified:true}, {independent:true},
    {approved:true},{securityCertified:true},{ownerApproved:true},
    {networkEnabled:true}
  ])rejectsEvidence({...c,...injected});
  const privateCase=fictionalBetaClaim();
  privateCase.cases[0]={...privateCase.cases[0],rawTranscript:'PRIVATE_CANARY'};
  rejectsEvidence(privateCase);
});

test('M5-08: mismatched counts or contradictory overall PASS fail closed',()=>{
  const c=fictionalBetaClaim();
  rejectsEvidence({...c,matchedCount:4});
  rejectsEvidence({...c,runnerStatus:'FAIL'});
  const d=fictionalBetaClaim();d.cases[0].matched=false;
  d.cases[0].rule='BETA_REPORT_INVALID';
  rejectsEvidence(d);
  rejectsEvidence({...d,matchedCount:4,runnerStatus:'PASS'});
});

test('M5-08: case order, missing and duplicated case IDs all fail closed',()=>{
  const c=fictionalBetaClaim();
  rejectsEvidence({...c,cases:c.cases.slice(0,4)});
  rejectsEvidence({...c,cases:[...c.cases,c.cases[0]]});
  rejectsEvidence({...c,cases:[...c.cases].reverse()});
  rejectsEvidence({...c,cases:[...c.cases.slice(0,4),c.cases[0]]});
  rejectsEvidence({...c,cases:[...c.cases.slice(0,4),{
    id:'UNKNOWN',matched:true,rule:'NONE'}]});
});

test('M5-08: rule codes are strictly symbolic and consistent with booleans',()=>{
  const c=fictionalBetaClaim();
  for(const val of [
    'RETRY_PARAMS_CHANGED','OWNER_APPROVED','*','PRIVATE_CANARY',
    'BETA_AUDIT_COMPLETE','',null,2
  ]){
    const x=fictionalBetaClaim();x.cases[0].rule=val;
    rejectsEvidence(x);
  }
  const x=fictionalBetaClaim();x.cases[0].rule='BETA_PROCESS_FAILURE';
  rejectsEvidence(x);
  const y=fictionalBetaClaim();y.cases[0].matched=false;
  rejectsEvidence(y);
  const z=fictionalBetaClaim();z.cases[0].matched='true';
  rejectsEvidence(z);
});

test('M5-08: malformed objects, accessors, symbols, cyclic graphs cannot enter the verifier',()=>{
  for(const v of [null,{},[],true,42,'claim'])rejectsEvidence(v);
  const c=fictionalBetaClaim();
  rejectsEvidence(Object.assign(Object.create(null),c));
  const accessor=fictionalBetaClaim();
  Object.defineProperty(accessor.cases[0],'rule',{
    get(){throw Error('PRIVATE_CANARY');}
  });
  rejectsEvidence(accessor);
  const symbol=fictionalBetaClaim();
  symbol.cases[0][Symbol.for('secret')]='PRIVATE_CANARY';
  rejectsEvidence(symbol);
  const cycle=fictionalBetaClaim();cycle.extra=cycle;
  rejectsEvidence(cycle);
  const weird=fictionalBetaClaim();
  weird.cases=Array.from(weird.cases);
  delete weird.cases[0];
  rejectsEvidence(weird);
});

test('M5-08: sanitized output cannot echo symbolic attacker fields',()=>{
  const c=fictionalBetaClaim();
  const result=reviewBetaEvidenceSummary(c);
  const output=JSON.stringify(result);
  for(const secret of [
    'private','PRIVATE_CANARY','https://','username','token',
    'OAuth','password','logs','externalEvidenceAccepted'
  ])assert.equal(output.includes(secret),false);
  assertNotAccepted(result);
  assert.equal(Object.keys(result).includes('tester'),false);
});

test('M5-08: preflight requires no external actions and leaves fixed beta runner intact',()=>{
  const observed=reviewBetaEvidenceSummary(fictionalBetaClaim());
  assertNotAccepted(observed);
  const actual=runBeta([]);
  assert.equal(actual.betaSchemaVersion,1);
  assert.equal(actual.total,5);
  assert.equal(actual.passed,5);
  assert.equal(actual.failed,0);
  assert.equal(actual.status,'PASS');
  assert.equal(runBeta(['--real-target']).errorCode,'BETA_ARGUMENTS_NOT_ALLOWED');
});

test('M5-08: public guide makes triage origin and security gates explicit',()=>{
  const doc=documented('docs/BETA_TESTING.md');
  assert.ok(doc.includes('M5-08'));
  assert.ok(doc.includes('CLAIM_CONSISTENT_ONLY'));
  assert.ok(doc.includes('manualProvenanceReviewRequired'));
  assert.ok(doc.includes('betaGateSatisfied'));
  assert.ok(doc.includes('No reviewer may treat'));
  assert.ok(doc.includes('#59'));
  assert.ok(doc.includes('#43'));
  assert.ok(doc.includes('#21'));
  assert.equal(JSON.parse(documented('test/expected-package-files.json')).length,80);
});
