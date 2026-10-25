/**
 * M6-C tests for exact exported version-1 fictional adopter kit verification.
 * The kit is never evidence of target authorization, independent provenance
 * or a real security assessment. Input is canonical local JSON only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createOfflineAdopterKit,verifyOfflineAdopterKit,
  OFFLINE_KIT_VERIFIER_SCHEMA_VERSION
} from '../src/project-adapter.mjs';
import {buildCliReport} from '../src/report-contract.mjs';
import {observeFirstPartyMockAttempts} from '../src/mock-attempt-observer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:15000,maxBuffer:200000
});
const kit=t=>buildCliReport('adapter-kit',createOfflineAdopterKit(t));
function withFile(contents,fn){
  const dir=mkdtempSync(join(tmpdir(),'fictional-kit-verify-'));
  const file=join(dir,'fictional-kit.json');
  try {
    writeFileSync(file,typeof contents==='string'?contents:JSON.stringify(contents),'utf8');
    return fn(file,dir);
  } finally{rmSync(dir,{force:true,recursive:true});}
}
function checkBoundary(r){
  assert.equal(r.status,'PASS');
  assert.equal(r.profile,'offline-exported-fictional-kit-verification-v1');
  assert.equal(r.verificationSchemaVersion,OFFLINE_KIT_VERIFIER_SCHEMA_VERSION);
  assert.equal(r.kitSchemaVersion,1);
  assert.equal(r.sourceEvidence,'SOURCE_OWNED_KIT_SHAPE_AND_FIXED_CONTROLS_ONLY');
  assert.equal(r.interpretation,'CI_MATCH_NOT_INDEPENDENT_PROVENANCE_OR_PROJECT_SECURITY');
  assert.equal(r.checked,3);
  assert.equal(r.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');
  assert.equal(r.operatorEvidence,'OPERATOR_NOT_VERIFIED');
  assert.equal(r.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.executionEnabled,false);
  assert.equal(r.externalTargetContacted,false);
  assert.equal(r.projectConnectionAuthorized,false);
  assert.equal(r.operatorVerified,false);
  assert.equal(r.projectSafetyAssessed,false);
  assert.equal(r.fixturesAreProjectSpecific,false);
  assert.equal(r.independentOriginVerified,false);
  assert.equal(r.securityCertified,false);
  assert.equal(r.releaseAuthorized,false);
  assert.equal(r.failureCount,0);
  assert.deepEqual(r.findings,[]);
  assert.equal(r.findingsTruncated,false);
  assert.deepEqual(r.checks.map(c=>c.matched),[true,true,true]);
  assert.deepEqual(r.checks.map(c=>c.code),[
    'FICTIONAL_DESCRIPTOR_AND_FIXED_CONTROLS',
    'CLEAN_SYMBOLIC_EXPECTATION',
    'EXPECTED_SYMBOLIC_VIOLATION_DETECTED'
  ]);
  assert.equal(r.checks[0].fictionalControlsMatched,5);
  assert.equal(r.checks[0].observedSafetyStatus,'REAL_PROJECT_NOT_ASSESSED');
  assert.equal(r.checks[1].observedSafetyStatus,'PASS');
  assert.equal(r.checks[1].expectationStatus,'MATCH');
  assert.equal(r.checks[2].observedSafetyStatus,'FAIL');
  assert.equal(r.checks[2].expectationStatus,'MATCH');
  assert.equal(r.checks[2].observedRule,'DENIED_ACTION_HAD_EFFECT');
}
const rejects=x=>assert.throws(()=>verifyOfflineAdopterKit(x),
  /INVALID_OFFLINE_EXPORTED_KIT/);

test('M6-C: CLI exported stdio and HTTP kits verify with fixed three controls',()=>{
  assert.equal(OFFLINE_KIT_VERIFIER_SCHEMA_VERSION,1);
  for(const type of ['stdio','streamable-http']){
    const p=cli('adapter-kit',type);
    assert.equal(p.status,0,p.stderr);
    const original=JSON.parse(p.stdout);
    assert.ok(Buffer.byteLength(p.stdout,'utf8')<16384);
    checkBoundary(verifyOfflineAdopterKit(original));
    withFile(p.stdout,file=>{
      const result=cli('adapter-kit-verify',file);
      assert.equal(result.status,0,result.stderr);
      const json=JSON.parse(result.stdout);
      checkBoundary(json);
      assert.equal(json.reportSchemaVersion,1);
      assert.equal(json.command,'adapter-kit-verify');
      assert.equal(json.exitCode,0);
      assert.equal(json.transport,type);
      assert.equal(json.summary.failureCount,0);
      assert.deepEqual(json.summary.ruleCodes,[]);
      assert.ok(!result.stdout.includes(file));
    });
  }
});
test('M6-C: JSON formatting and property key order do not affect canonical comparison',()=>{
  const source=kit('stdio');
  const reshuffle=x=>{
    if(Array.isArray(x))return x.map(reshuffle);
    if(x&&typeof x==='object')return Object.fromEntries(
      Object.entries(x).reverse().map(([k,v])=>[k,reshuffle(v)]));
    return x;
  };
  const reordered=reshuffle(source);
  checkBoundary(verifyOfflineAdopterKit(reordered));
  withFile(JSON.stringify(reordered,null,2),file=>{
    assert.equal(cli('adapter-kit-verify',file).status,0);
  });
});
test('M6-C: pure in-memory report never promotes real target or independent approval',async()=>{
  for(const type of ['stdio','streamable-http']){
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>verifyOfflineAdopterKit(kit(type)));
    assert.deepEqual(attempts,[]);
    checkBoundary(result);
  }
});
test('M6-C: rejects modified safety booleans, status, plan, prose, transport and credentials',()=>{
  const baseline=kit('stdio');
  const variants=[
    v=>{v.status='FAIL';},
    v=>{v.reportSchemaVersion=2;},
    v=>{v.exitCode=1;},
    v=>{v.transport='streamable-http';},
    v=>{v.externalTargetContacted=true;},
    v=>{v.releaseAuthorized=true;},
    v=>{v.projectSafetyAssessed=true;},
    v=>{v.operatorVerified=true;},
    v=>{v.expectedResults.expectedViolationCi.observedSafetyStatus='PASS';},
    v=>{v.expectedResults.expectedViolationCi.expectationStatus='MISMATCH';},
    v=>{v.expectedViolation.expectedStatus='PASS';},
    v=>{v.expectedViolation.trace.events[0].effect='NONE';},
    v=>{v.starterDescriptor.project.name='PRIVATE_CUSTOMER_NAME';},
    v=>{v.starterDescriptor.transport.command='private-server';},
    v=>{v.plan[0].filename='../../private';},
    v=>{v.plan[1].command='tools/call';},
    v=>{v.humanSummary[0]='PRIVATE_CANARY';},
    v=>{v.guidance.push({explanation:'TRUST_ME'});},
    v=>{v.summary.failureCount=1;},
    v=>{v.independentOriginVerified=true;},
    v=>{v.credentials='PRIVATE_CANARY';}
  ];
  for(const mutate of variants){
    const v=structuredClone(baseline);
    mutate(v);
    rejects(v);
  }
});
test('M6-C: rejects dropped fields, arrays, wrong types, unknown metadata and older schema',()=>{
  const base=kit('streamable-http');
  for(const mutate of [
    v=>{delete v.guidance;},
    v=>{delete v.plan[0].code;},
    v=>{delete v.cleanExpectation.trace.descriptor;},
    v=>{v.plan=v.plan.slice(1);},
    v=>{v.plan=[];},
    v=>{v.kitSchemaVersion='1';},
    v=>{v.starterDescriptor.policy.allowNetwork='false';},
    v=>{v.cleanExpectation.trace.events[0].ownerAuthorized=null;},
    v=>{v.unknown='new-user-assertion';},
    v=>{v.summary.extra=true;},
    v=>{v.plan[0].execute=true;}
  ]){
    const x=structuredClone(base);mutate(x);rejects(x);
  }
});
test('M6-C: rejects JS prototype, accessor, symbol and cyclical forged records',()=>{
  const base=kit('stdio');
  for(const v of [null,{},[],42,true,'stdio',
    Object.assign(Object.create(null),base)])rejects(v);
  const a=structuredClone(base);
  Object.defineProperty(a,'transport',{get(){throw Error('PRIVATE_CANARY');}});
  rejects(a);
  const b=structuredClone(base);
  b.starterDescriptor.project[Symbol('private')]='PRIVATE_CANARY';
  rejects(b);
  const c=structuredClone(base);
  c.plan[0].something=c;
  rejects(c);
  const d=structuredClone(base);
  Object.setPrototypeOf(d.expectedResults,Date.prototype);
  rejects(d);
});
test('M6-C: strict CLI rejects duplicate JSON keys, bad UTF-8, oversize and unknown fields',()=>{
  const src=kit('stdio');
  for(const data of [
    '{"transport":"stdio","transport":"streamable-http"}',
    '{"__proto__":{"executionEnabled":true}}',
    JSON.stringify({...src,allowNetwork:true}),
    JSON.stringify({...src,operatorVerified:true}),
    JSON.stringify(src)+' '.repeat(17000),
    '{"kitSchemaVersion":1'
  ]){
    withFile(data,file=>{
      const p=cli('adapter-kit-verify',file);
      assert.equal(p.status,2,p.stderr);
      const report=JSON.parse(p.stdout);
      assert.equal(report.status,'ERROR');
      assert.equal(report.errorCode,'INVALID_OR_UNREADABLE_INPUT');
      assert.equal(report.command,'adapter-kit-verify');
      assert.equal(report.exitCode,2);
      assert.ok(!(p.stdout+p.stderr).includes(file));
      assert.ok(!(p.stdout+p.stderr).includes('PRIVATE_CANARY'));
    });
  }
});
test('M6-C: missing, symlinked and hostile path arguments fail closed',()=>{
  withFile(JSON.stringify(kit('stdio')),(file,dir)=>{
    for(const args of [
      ['adapter-kit-verify'],
      ['adapter-kit-verify','--url=https://private.example.org/mcp'],
      ['adapter-kit-verify','--token=PRIVATE_CANARY'],
      ['adapter-kit-verify',file,'--exec'],
      ['adapter-kit-verify',join(dir,'missing-private-file.json')]
    ]){
      const p=cli(...args);
      assert.equal(p.status,2,p.stderr);
      const report=JSON.parse(p.stdout);
      assert.equal(report.status,'ERROR');
      assert.ok(['INVALID_CLI_ARGUMENTS','INVALID_OR_UNREADABLE_INPUT']
        .includes(report.errorCode));
      assert.ok(!(p.stdout+p.stderr).includes('PRIVATE_CANARY'));
      assert.ok(!(p.stdout+p.stderr).includes('private.example.org'));
    }
    const link=join(dir,'link.json');
    let created=false;
    try{symlinkSync(file,link,'file');created=true;}
    catch(e){assert.ok(process.platform==='win32' &&
      ['EPERM','EACCES'].includes(e.code));}
    if(created){
      const p=cli('adapter-kit-verify',link);
      assert.equal(p.status,2);
      assert.equal(JSON.parse(p.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    }
  });
});
test('M6-C: no user derived strings or private path appear in verification reports',()=>{
  for(const type of ['stdio','streamable-http']){
    const result=JSON.stringify(verifyOfflineAdopterKit(kit(type)));
    for(const value of [
      'PRIVATE_CANARY','PRIVATE_CUSTOMER','mcp.example.org','server.mjs',
      'fictional-stdio-project','https://','credentials','PRIVATE_'
    ])assert.ok(!result.includes(value),value);
  }
});
test('M6-C: help, documentation and reviewed packed inventory remain aligned',()=>{
  const help=cli('help');
  assert.equal(help.status,0);
  const data=JSON.parse(help.stdout);
  assert.equal(data.commands.length,30);
  assert.ok(data.commands.includes('adapter-kit-verify'));
  assert.ok(data.syntax.includes('node src/cli.mjs adapter-kit-verify fictional-kit.json'));
  for(const file of ['docs/GETTING_STARTED.md','ROADMAP.md']){
    assert.ok(readFileSync(join(root,file),'utf8').includes('adapter-kit-verify'));
  }
  const manifest=JSON.parse(readFileSync(join(root,'test/expected-package-files.json'),'utf8'));
  assert.equal(manifest.length,80);
  assert.ok(!manifest.includes('test/m6c-offline-kit-verification.test.mjs'));
});
