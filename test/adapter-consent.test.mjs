import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { descriptorFingerprint, evaluateAdapterConsent, REVIEWABLE_METHODS } from '../src/adapter-consent.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function project(type='stdio') {
  const file=type==='stdio'?'stdio-project.json':'streamable-http-project.json';
  return JSON.parse(readFileSync(join(root,'examples','adapter-profiles',file),'utf8'));
}
function envelope(type='stdio',now=Date.now()) {
  const descriptor=project(type);
  return {policySchemaVersion:1,descriptor,
    request:{project:descriptor.project.name,transport:type,
      method:'initialize',operatorId:'fictional-reviewer'},
    claim:{operatorId:'fictional-reviewer',
      projectFingerprint:descriptorFingerprint(descriptor),
      transport:type,methods:['initialize'],issuedAt:now-1000,
      expiresAt:now+60_000,nonce:'fictional-reviewed-001',revoked:false}};
}
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,shell:false,encoding:'utf8',timeout:15000,maxBuffer:65536
});
const deny=v=>assert.throws(()=>evaluateAdapterConsent(v),/INVALID_ADAPTER_CONSENT_INPUT/);

test('M4-B2: self-asserted consistency PASS on both inert portable transports, NEVER permits execution',()=>{
  assert.deepEqual(REVIEWABLE_METHODS,['initialize','ping']);
  for(const type of ['stdio','streamable-http']) {
    const result=evaluateAdapterConsent(envelope(type));
    assert.equal(result.status,'PASS');
    assert.equal(result.reviewRule,'NONE');
    assert.equal(result.authorizationStatus,'UNVERIFIED_SELF_ASSERTION');
    assert.equal(result.operatorVerified,false);
    assert.equal(result.connectionStatus,'NOT_ATTEMPTED');
    assert.equal(result.executionEnabled,false);
    assert.deepEqual(result.findings,[]);
    assert.ok(!JSON.stringify(result).includes('fictional-reviewer'));
    assert.ok(!JSON.stringify(result).includes('mcp.example.org'));
  }
});

test('M4-B2: canonical descriptor hash is order-independent but binds project/transport/arguments',()=>{
  const a=project();
  const reordered={policy:a.policy, protocolVersion:a.protocolVersion,
    transport:{args:a.transport.args, command:a.transport.command,type:a.transport.type},
    project:{name:a.project.name},adapterSchemaVersion:a.adapterSchemaVersion};
  assert.equal(descriptorFingerprint(a),descriptorFingerprint(reordered));
  assert.match(descriptorFingerprint(a),/^[a-f0-9]{64}$/);
  const different={...a,transport:{...a.transport,args:['changed-server.mjs']}};
  assert.notEqual(descriptorFingerprint(a),descriptorFingerprint(different));
  const e=envelope();
  e.descriptor=different;
  assert.equal(evaluateAdapterConsent(e).reviewRule,'ADAPTER_IDENTITY_MISMATCH');
  e.descriptor=project('streamable-http');
  assert.equal(evaluateAdapterConsent(e).status,'FAIL');
});

test('M4-B2: mismatched project, operator, transport or grant hash fail closed',()=>{
  for(const mutate of [
    e=>{e.request.project='different-project';},
    e=>{e.request.operatorId='different-reviewer';},
    e=>{e.request.transport='streamable-http';},
    e=>{e.claim.transport='streamable-http';},
    e=>{e.claim.projectFingerprint='0'.repeat(64);}
  ]) {
    const e=envelope(); mutate(e);
    assert.equal(evaluateAdapterConsent(e).reviewRule,'ADAPTER_IDENTITY_MISMATCH');
  }
});

test('M4-B2: missing, expired, premature, overly long or revoked grant cannot pass',()=>{
  const t=Date.now();
  for(const mutate of [
    e=>{e.claim.expiresAt=e.claim.issuedAt;},
    e=>{e.claim.issuedAt=t-120000;e.claim.expiresAt=t-60000;},
    e=>{e.claim.issuedAt=t+1000;e.claim.expiresAt=t+2000;},
    e=>{e.claim.expiresAt=e.claim.issuedAt+300001;},
    e=>{e.claim.revoked=true;}
  ]) {
    const e=envelope('stdio',t);mutate(e);
    assert.equal(evaluateAdapterConsent(e).status,'FAIL');
    assert.equal(evaluateAdapterConsent(e).executionEnabled,false);
  }
});

test('M4-B2: method allowlist cannot authorize tools/call, resource read or escalation',()=>{
  const e=envelope();
  e.request.method='ping';
  assert.equal(evaluateAdapterConsent(e).reviewRule,'ADAPTER_METHOD_DENIED');
  e.claim.methods=['initialize','ping'];
  assert.equal(evaluateAdapterConsent(e).status,'PASS');
  for(const method of ['tools/call','resources/read','notifications/cancelled','*','ping ']) {
    e.request.method=method;
    deny(e);
  }
  e.request.method='initialize';
  for(const methods of [['initialize','tools/call'],['*'],['ping','ping'],[],['initialize','ping','other']]) {
    e.claim.methods=methods;deny(e);
  }
});

test('M4-B2: replay signal applies only within supplied in-memory Set, never durable authorization',()=>{
  const e=envelope(); const seen=new Set();
  const first=evaluateAdapterConsent(e,{seenNonces:seen});
  assert.equal(first.status,'PASS');
  assert.equal(seen.has(e.claim.nonce),true);
  const second=evaluateAdapterConsent(e,{seenNonces:seen});
  assert.equal(second.reviewRule,'ADAPTER_SIMULATED_REPLAY');
  assert.equal(second.executionEnabled,false);
  assert.equal(evaluateAdapterConsent(e).status,'PASS'); // proves non-durability
  const t=Date.now();
  const premature=envelope('stdio',t);
  assert.equal(evaluateAdapterConsent(premature,{nowMs:t-5000}).status,'FAIL');
  deny({...e,unexpected:'private-data'});
});

test('M4-B2: malformed claim, unknown keys, insecure project and private values denied',()=>{
  const a=envelope();
  for(const mutate of [
    e=>{e.policySchemaVersion=2;},
    e=>{delete e.claim.nonce;},
    e=>{e.claim.morePermissions=true;},
    e=>{e.request.extra='FICTIONAL_SECRET';},
    e=>{e.claim.methods='initialize';},
    e=>{e.claim.nonce='private\ncanary';},
    e=>{e.claim.expiresAt='2099-01-01';},
    e=>{e.descriptor.policy.allowNetwork=true;},
    e=>{e.descriptor.transport.command='node;echo SECRET';},
    e=>{e.claim.operatorId='operator@private.invalid';},
  ]) {const e=structuredClone(a);mutate(e);deny(e);}
  const http=envelope('streamable-http');
  http.descriptor.transport.endpoint='https://127.0.0.1/mcp';
  deny(http);
});

test('M4-B2: bundled expired fictional public example is denied with generic JSON-v1 report',()=>{
  const file=join('examples','adapter-profiles','consent-expired.json');
  const x=cli('adapter-policy-check',file);
  assert.equal(x.status,1,x.stderr);
  const v=JSON.parse(x.stdout);
  assert.equal(v.command,'adapter-policy-check');
  assert.equal(v.reportSchemaVersion,1);
  assert.equal(v.status,'FAIL');
  assert.equal(v.reviewRule,'ADAPTER_GRANT_EXPIRED_OR_INVALID');
  assert.equal(v.executionEnabled,false);
  assert.equal(v.connectionStatus,'NOT_ATTEMPTED');
  assert.ok(!x.stdout.includes('fictional-reviewer'));
  assert.ok(!x.stdout.includes('server.mjs'));
  assert.ok(v.summary.ruleCodes.includes('ADAPTER_GRANT_EXPIRED_OR_INVALID'));
});

test('M4-B2: CLI accepts locally generated short-lived self-assertion without granting execution',()=>{
  const directory=mkdtempSync(join(tmpdir(),'adapter-consent-test-'));
  try {
    const path=join(directory,'fictional-request.json');
    writeFileSync(path,JSON.stringify(envelope()),{mode:0o600});
    const x=cli('adapter-policy-check',path);
    assert.equal(x.status,0,x.stderr);
    const v=JSON.parse(x.stdout);
    assert.equal(v.status,'PASS');
    assert.equal(v.authorizationStatus,'UNVERIFIED_SELF_ASSERTION');
    assert.equal(v.operatorVerified,false);
    assert.equal(v.executionEnabled,false);
    assert.equal(v.connectionStatus,'NOT_ATTEMPTED');
    assert.ok(!(x.stdout+x.stderr).includes(directory));
    assert.ok(!x.stdout.includes('fictional-reviewed-001'));
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('M4-B2: unexpected flags, secret paths, missing file or duplicate JSON keys never echo values',()=>{
  const dir=mkdtempSync(join(tmpdir(),'adapter-consent-errors-'));
  try {
    const duplicate=join(dir,'private-canary.json');
    writeFileSync(duplicate,'{"policySchemaVersion":1,"policySchemaVersion":1}');
    for(const args of [
      ['adapter-policy-check'],
      ['adapter-policy-check','--url=https://private.example.org/mcp'],
      ['adapter-policy-check',duplicate],
      ['adapter-policy-check','fictional-secret-path.json','--execute']
    ]) {
      const x=cli(...args);
      assert.equal(x.status,2);
      const report=JSON.parse(x.stdout);
      assert.equal(report.status,'ERROR');
      assert.equal(report.reportSchemaVersion,1);
      assert.ok(['INVALID_CLI_ARGUMENTS','INVALID_OR_UNREADABLE_INPUT'].includes(report.errorCode));
      assert.ok(!(x.stdout+x.stderr).includes('private-canary'));
      assert.ok(!(x.stdout+x.stderr).includes('fictional-secret-path'));
      assert.ok(!(x.stdout+x.stderr).includes('private.example.org'));
    }
  } finally {rmSync(dir,{recursive:true,force:true});}
});
