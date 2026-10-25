/**
 * M6-E: fixed fictional result explanation, never project safety / DLP.
 * JSON-v1 and existing CLI exit codes remain unchanged.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildCliReport,buildCliErrorReport
} from '../src/report-contract.mjs';
import {
  createOfflineAdopterKit,auditSymbolicTraceExpectations,
  previewOfflineAdapterQuickstart,verifyOfflineAdopterKit
} from '../src/project-adapter.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const call=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:100000
});
const kit=t=>createOfflineAdopterKit(t);
const reader=b=>b.readerGuide;
function boundaries(g){
  assert.equal(g.readerGuideSchemaVersion,1);
  assert.equal(g.reportScope,'FICTIONAL_OFFLINE_ASSERTIONS_ONLY');
  assert.equal(g.realProjectAssessed,false);
  assert.equal(g.externalMcpContactAuthorized,false);
  assert.equal(g.independentAuditCompleted,false);
  assert.equal(g.independentBetaVerified,false);
  assert.equal(g.ownerOperatorVerified,false);
  assert.equal(g.stableReleaseAuthorized,false);
  assert.ok(/^[A-Z_]+$/.test(g.code));
  assert.equal(typeof g.title,'string');
  assert.equal(typeof g.meaning,'string');
  assert.equal(g.nextSteps.length,2);
  assert.ok(g.nextSteps.every(s=>typeof s==='string'&&s.length<220));
}
function withJson(json,fn){
  const dir=mkdtempSync(join(tmpdir(),'m6e-guide-'));
  const p=join(dir,'synthetic.json');
  try {
    writeFileSync(p,typeof json==='string'?json:JSON.stringify(json),'utf8');
    return fn(p);
  }finally{rmSync(dir,{recursive:true,force:true});}
}
test('M6-E: prepared inert kit and quickstart get useful but non-authorizing guidance',()=>{
  for(const transport of ['stdio','streamable-http']){
    const x=kit(transport);
    const report=buildCliReport('adapter-kit',x);
    assert.equal(report.status,'PASS');
    assert.equal(report.exitCode,0);
    boundaries(reader(report));
    assert.equal(reader(report).code,'FICTIONAL_KIT_GENERATED');
    const q=buildCliReport('adapter-quickstart',
      previewOfflineAdapterQuickstart(x.starterDescriptor));
    boundaries(reader(q));
    assert.equal(reader(q).code,'DESCRIPTOR_SHAPE_AND_FICTIONAL_CONTROLS_MATCH');
    assert.ok(reader(q).meaning.includes('not a scan'));
    assert.equal(q.projectSafetyAssessed,false);
  }
});
test('M6-E: canonical kit verifier has fixed human instructions, unchanged PASS',()=>{
  for(const type of ['stdio','streamable-http']){
    const exp=buildCliReport('adapter-kit',kit(type));
    const verdict=buildCliReport('adapter-kit-verify',verifyOfflineAdopterKit(exp));
    assert.equal(verdict.status,'PASS');
    assert.equal(verdict.exitCode,0);
    assert.equal(verdict.checked,3);
    assert.equal(reader(verdict).code,'FICTIONAL_KIT_CONTRACT_MATCH');
    boundaries(reader(verdict));
  }
});
test('M6-E: fabricated clean trace PASS clearly says no observed fictional violation',()=>{
  for(const type of ['stdio','streamable-http']){
    const x=kit(type);
    const r=buildCliReport('adapter-trace-expect',
      auditSymbolicTraceExpectations(x.cleanExpectation));
    assert.equal(r.status,'PASS');
    assert.equal(r.observedSafetyStatus,'PASS');
    assert.equal(r.expectationStatus,'MATCH');
    assert.equal(reader(r).code,'CLEAN_FICTIONAL_TRACE_MATCH');
    assert.match(reader(r).meaning,/fabricated events/);
    boundaries(reader(r));
  }
});
test('M6-E: fabricated expected violation retains observed FAIL despite CI PASS',()=>{
  for(const type of ['stdio','streamable-http']){
    const x=kit(type);
    const r=buildCliReport('adapter-trace-expect',
      auditSymbolicTraceExpectations(x.expectedViolation));
    assert.equal(r.status,'PASS');
    assert.equal(r.exitCode,0);
    assert.equal(r.observedSafetyStatus,'FAIL');
    assert.equal(r.expectationStatus,'MATCH');
    assert.equal(r.observedFindings[0].rule,'DENIED_ACTION_HAD_EFFECT');
    assert.equal(reader(r).code,'FICTIONAL_VIOLATION_DETECTED_AS_EXPECTED');
    assert.ok(reader(r).meaning.includes('FAIL'));
    assert.ok(reader(r).meaning.includes('NOT a safe action'));
    boundaries(reader(r));
  }
});
test('M6-E: unexpected symbolic mismatch remains exit 1 and gets corrective steps',()=>{
  const mismatched=structuredClone(kit('stdio').expectedViolation);
  mismatched.expectedStatus='PASS';
  mismatched.expected[0].ruleCodes=[];
  const actual=buildCliReport('adapter-trace-expect',
    auditSymbolicTraceExpectations(mismatched));
  assert.equal(actual.status,'FAIL');
  assert.equal(actual.exitCode,1);
  assert.equal(actual.observedSafetyStatus,'FAIL');
  assert.equal(actual.expectationStatus,'MISMATCH');
  assert.equal(reader(actual).code,'FICTIONAL_EXPECTATION_MISMATCH');
  boundaries(reader(actual));
  assert.match(reader(actual).nextSteps[1],/fictional fixture/);
});
test('M6-E: otherwise inconsistent raw outcome never promotes safety',()=>{
  const x=buildCliReport('adapter-trace-expect',{
    status:'PASS',reportMeaning:'EXACT_SYNTHETIC_EXPECTATION_MATCH_ONLY',
    expectationStatus:'MATCH',observedSafetyStatus:'FAIL',
    observedFailureCount:0,
    opaqueMarker:'PRIVATE_CANARY'
  });
  assert.equal(reader(x).code,'OFFLINE_CONTROL_CHECK_FAILED');
  assert.ok(!JSON.stringify(reader(x)).includes('PRIVATE_CANARY'));
  boundaries(reader(x));
});
test('M6-E: generic invalid input / bad arguments use fixed, safe advice',()=>{
  for(const cmd of [
    'adapter-kit','adapter-quickstart','adapter-kit-verify',
    'adapter-trace-expect'
  ]){
    for(const code of ['INVALID_CLI_ARGUMENTS','INVALID_OR_UNREADABLE_INPUT']){
      const x=buildCliErrorReport(cmd,code);
      assert.equal(x.exitCode,2);
      assert.equal(x.status,'ERROR');
      assert.equal(x.errorCode,code);
      assert.equal(reader(x).code,'INVALID_OFFLINE_INPUT');
      assert.ok(reader(x).meaning.includes('not evaluated'));
      boundaries(reader(x));
    }
  }
});
test('M6-E: legacy report JSON, commands and exit codes are not changed',()=>{
  for(const [cmd,source] of [
    ['demo',{status:'PASS'}],['negotiate',{status:'FAIL',
      findings:[{event:1,rule:'RETRY_PARAMS_CHANGED'}]}]
  ]){
    const v=buildCliReport(cmd,source);
    assert.ok(!Object.hasOwn(v,'readerGuide'));
    assert.equal(v.exitCode,source.status==='PASS'?0:1);
  }
  assert.ok(!Object.hasOwn(buildCliErrorReport('scenario',
    'INVALID_OR_UNREADABLE_INPUT'),'readerGuide'));
});
test('M6-E: real CLI reports contain guidance with no project path or secrets',()=>{
  for(const transport of ['stdio','streamable-http']){
    const cmd=call('adapter-kit',transport);
    assert.equal(cmd.status,0,cmd.stderr);
    const x=JSON.parse(cmd.stdout);
    boundaries(reader(x));
    withJson(cmd.stdout,p=>{
      const run=call('adapter-kit-verify',p);
      assert.equal(run.status,0,run.stderr);
      const r=JSON.parse(run.stdout);
      boundaries(reader(r));
      assert.equal(reader(r).code,'FICTIONAL_KIT_CONTRACT_MATCH');
      assert.ok(!run.stdout.includes(p));
    });
    const bad=call('adapter-kit','--token=PRIVATE_CANARY');
    assert.equal(bad.status,2);
    const errored=JSON.parse(bad.stdout);
    boundaries(reader(errored));
    assert.ok(!(bad.stdout+bad.stderr).includes('PRIVATE_CANARY'));
  }
});
test('M6-E: CLI synthetic mismatch and invalid file report explain without input echo',()=>{
  const x=kit('stdio');
  const mismatch=structuredClone(x.expectedViolation);
  mismatch.expectedStatus='PASS';
  mismatch.expected[0].ruleCodes=[];
  withJson(mismatch,p=>{
    const run=call('adapter-trace-expect',p);
    assert.equal(run.status,1);
    const r=JSON.parse(run.stdout);
    assert.equal(reader(r).code,'FICTIONAL_EXPECTATION_MISMATCH');
    assert.equal(r.observedSafetyStatus,'FAIL');
    assert.ok(!run.stdout.includes(p));
  });
  withJson('{"private":"PRIVATE_CANARY"}',p=>{
    const run=call('adapter-trace-expect',p);
    assert.equal(run.status,2);
    const r=JSON.parse(run.stdout);
    assert.equal(reader(r).code,'INVALID_OFFLINE_INPUT');
    assert.ok(!run.stdout.includes('PRIVATE_CANARY'));
    assert.ok(!run.stdout.includes(p));
  });
});
test('M6-E: guidance values are fixed literals and do not echo attacker fields',()=>{
  for(const code of [
    'PRIVATE_CANARY',
    'https://private.example.org/mcp',
    'C:\\Users\\Private\\token.json',
    '\u202eEXFILTRATE'
  ]){
    const x=buildCliReport('adapter-kit-verify',{
      status:'FAIL',
      findings:[{rule:'PRIVATE_CANARY'}], privatePayload:code
    });
    assert.equal(reader(x).code,'OFFLINE_CONTROL_CHECK_FAILED');
    assert.ok(!JSON.stringify(reader(x)).includes(code));
    boundaries(reader(x));
  }
});
test('M6-E: documentation and 80-path package limit remain intact',()=>{
  for(const p of ['README.md','docs/GETTING_STARTED.md',
    'docs/UNIVERSAL_ADAPTER.md','ROADMAP.md'])
    assert.ok(readFileSync(join(root,p),'utf8').includes('M6-E'),p);
  const files=JSON.parse(readFileSync(
    join(root,'test/expected-package-files.json'),'utf8'));
  assert.equal(files.length,80);
  assert.ok(files.includes('src/report-contract.mjs'));
  assert.ok(!files.includes('test/m6e-reader-guidance.test.mjs'));
});
