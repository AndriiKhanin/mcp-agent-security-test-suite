/**
 * M4-B5: synthetic/offline preflight protections ONLY.
 * Nothing here verifies real ownership, accesses DNS, or contacts a target.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectProjectAdapter } from '../src/project-adapter.mjs';
import { evaluateAdapterConsent, descriptorFingerprint } from '../src/adapter-consent.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixture=name=>JSON.parse(readFileSync(join(root,'examples','adapter-profiles',name),'utf8'));
const demoHttp=()=>fixture('streamable-http-project.json');
const run=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,shell:false,encoding:'utf8',timeout:15000,maxBuffer:65536
});

test('M4-B5: valid HTTP descriptor is syntax-only, no execution or ownership',()=>{
  const x=inspectProjectAdapter(demoHttp());
  assert.equal(x.status,'PASS');
  assert.equal(x.transport,'streamable-http');
  assert.equal(x.protocolVersion,'2026-07-28');
  assert.equal(x.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(x.executionEnabled,false);
  assert.ok(!Object.hasOwn(x,'operatorVerified'));
  assert.ok(!JSON.stringify(x).includes('mcp.example.org'));
});

test('M4-B5: portable stdio descriptor remains inert even with a plausible executable',()=>{
  const x=inspectProjectAdapter(fixture('stdio-project.json'));
  assert.equal(x.status,'PASS');
  assert.equal(x.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(x.executionEnabled,false);
  assert.ok(!JSON.stringify(x).includes('server.mjs'));
});

test('M4-B5: caller-controlled execution or authentication flags cannot be promoted',()=>{
  const base=demoHttp();
  for(const mutation of [
    {mode:'connect'}, {allowNetwork:true},{allowProcessSpawn:true},
    {allowToolCalls:true},{allowCredentials:true}
  ]) {
    const altered={...base,policy:{...base.policy,...mutation}};
    assert.throws(()=>inspectProjectAdapter(altered),/INVALID_PROJECT_ADAPTER_CONFIG/);
  }
  for(const extra of [{approved:true},{ownershipConfirmed:true},
    {credential:'fictional-canary'},{allowRealTargets:true}]) {
    assert.throws(()=>inspectProjectAdapter({...base,...extra}),
      /INVALID_PROJECT_ADAPTER_CONFIG/);
  }
});

test('M4-B5: syntactically valid self-asserted grant remains UNVERIFIED and has no contact authority',()=>{
  const d=demoHttp(),t=Date.now();
  const e={policySchemaVersion:1,descriptor:d,
    request:{project:d.project.name,transport:'streamable-http',
      method:'initialize',operatorId:'fictional-maintainer'},
    claim:{operatorId:'fictional-maintainer',projectFingerprint:descriptorFingerprint(d),
      transport:'streamable-http',methods:['initialize'],issuedAt:t-1000,
      expiresAt:t+10000,nonce:'fictional-nonce-01',revoked:false}};
  const report=evaluateAdapterConsent(e,{nowMs:t});
  assert.equal(report.status,'PASS');
  assert.equal(report.authorizationStatus,'UNVERIFIED_SELF_ASSERTION');
  assert.equal(report.operatorVerified,false);
  assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(report.executionEnabled,false);
  assert.ok(!JSON.stringify(report).includes(d.transport.endpoint));
});

test('M4-B5: fictional claims never authorize modern network discovery or privileged calls',()=>{
  const d=demoHttp(),t=Date.now();
  const e={policySchemaVersion:1,descriptor:d,
    request:{project:d.project.name,transport:'streamable-http',
      method:'server/discover',operatorId:'fictional-maintainer'},
    claim:{operatorId:'fictional-maintainer',projectFingerprint:descriptorFingerprint(d),
      transport:'streamable-http',methods:['server/discover'],issuedAt:t-1000,
      expiresAt:t+10000,nonce:'fictional-nonce-02',revoked:false}};
  assert.throws(()=>evaluateAdapterConsent(e,{nowMs:t}),/INVALID_ADAPTER_CONSENT_INPUT/);
  e.request.method='tools/call';e.claim.methods=['initialize'];
  assert.throws(()=>evaluateAdapterConsent(e,{nowMs:t}),/INVALID_ADAPTER_CONSENT_INPUT/);
  e.request.method='initialize';e.claim.revoked=true;
  const deny=evaluateAdapterConsent(e,{nowMs:t});
  assert.equal(deny.status,'FAIL');
  assert.equal(deny.executionEnabled,false);
  assert.equal(deny.connectionStatus,'NOT_ATTEMPTED');
});

test('M4-B5: HTTP syntax preflight does not bless risky alternate destinations',()=>{
  const base=demoHttp();
  for(const endpoint of [
    'http://mcp.example.org/mcp','https://127.0.0.1/mcp',
    'https://localhost/mcp','https://mcp.example.org:8443/mcp',
    'https://u:fictional@mcp.example.org/mcp',
    'https://mcp.example.org/mcp?token=fictional',
    'https://mcp.example.org/%2e%2e/admin',
    'https://mcp.example.org/mcp#private',
    'https://[::1]/mcp'
  ]) {
    assert.throws(()=>inspectProjectAdapter({...base,
      transport:{...base.transport,endpoint}}),/INVALID_PROJECT_ADAPTER_CONFIG/);
  }
});

test('M4-B5: public adapter-selftest cannot be redirected to a user endpoint',()=>{
  for(const token of [
    '--url=https://private.example.org/mcp','--operator=fictional-owner',
    '--method=server/discover','--connect', 'examples/adapter-profiles/stdio-project.json'
  ]) {
    const r=run('adapter-selftest',token);
    assert.equal(r.status,2);
    const report=JSON.parse(r.stdout);
    assert.equal(report.status,'ERROR');
    assert.equal(report.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(r.stdout+r.stderr).includes(token));
  }
});

test('M4-B5: CLI config check is still no-contact and reports sanitized output',()=>{
  const r=run('adapter-check','examples/adapter-profiles/streamable-http-project.json');
  assert.equal(r.status,0,r.stderr);
  const report=JSON.parse(r.stdout);
  assert.equal(report.command,'adapter-check');
  assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(report.executionEnabled,false);
  assert.ok(!r.stdout.includes('mcp.example.org'));
});

test('M4-B5: future architecture remains an explicit approval gate, not an enable flag',()=>{
  const text=readFileSync(join(root,'docs','M4_B5_TARGET_APPROVAL.md'),'utf8');
  for(const section of [
    'NO REAL-TARGET IMPLEMENTATION OR OWNER APPROVAL',
    'UNVERIFIED_SELF_ASSERTION','Authenticated operator',
    'SSRF','DNS','TLS','redirect','revocation','2026-07-28',
    'server/discover','tools/call','zero-credential',
    'independent','## 5. Explicit owner decision record'
  ]) assert.ok(text.toLowerCase().includes(section.toLowerCase()),
    'missing approval requirement '+section);
  const packet=readFileSync(join(root,'docs','M4_AUTHORIZED_INTEGRATIONS_RFC.md'),'utf8');
  assert.ok(packet.includes('M4_B5_TARGET_APPROVAL.md'));
});
