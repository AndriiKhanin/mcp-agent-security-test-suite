/** M24: stdin-only non-executing project adapter onboarding safety controls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  inspectStdinAdapterDescriptor,runStdinAdapterPreflight
} from '../tools/m24-stdin-adapter-preflight.mjs';
import {createOfflineAdapterTemplate,OFFLINE_FIXTURE_CASES}
  from '../src/project-adapter.mjs';
import {observeFirstPartyMockAttempts}
  from '../src/mock-attempt-observer.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const fixture=type=>structuredClone(
  createOfflineAdapterTemplate(type).template
);
const cli=(input,...args)=>spawnSync(process.execPath,
  ['tools/m24-stdin-adapter-preflight.mjs',...args],{
    cwd:root,encoding:'utf8',input,shell:false,timeout:20000,
    maxBuffer:20000,windowsHide:true
  });
const report=process=>JSON.parse(process.stdout);
const safe=r=>{
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.profile,'m24-offline-stdin-adapter-preflight-v1');
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.ruleCode,'OFFLINE_DESCRIPTOR_AND_FICTIONAL_CONTROLS_MATCH');
  assert.equal(r.scope,'NO_REAL_TARGET_CONTACT_OR_AUTHORIZATION');
  assert.equal(r.checked,5);
  assert.equal(r.matched,5);
  assert.deepEqual(r.controlIds,OFFLINE_FIXTURE_CASES);
  assert.equal(r.descriptorEvidence,'DESCRIPTOR_SHAPE_VALIDATED');
  assert.equal(r.fictionalControlEvidence,
    'FIRST_PARTY_FIXED_FICTIONAL_CASES_ONLY');
  assert.equal(r.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  for(const k of [
    'executionEnabled','projectConnectionAuthorized',
    'externalTargetContacted','operatorVerified',
    'realProjectAssessed','actualAgentBehaviorObserved',
    'independentBetaVerified','securityCertified'
  ])assert.equal(r[k],false,k);
};
const bad=proc=>{
  assert.equal(proc.status,2,proc.stderr);
  assert.equal(proc.stderr,'');
  const value=report(proc);
  assert.equal(value.status,'ERROR');
  assert.equal(value.exitCode,2);
  assert.equal(value.ruleCode,'M24_INVALID_OR_UNREADABLE_DESCRIPTOR');
  assert.equal(value.externalTargetContacted,false);
  assert.equal(value.connectionStatus,'NOT_ATTEMPTED');
  return value;
};

test('M24-A: both stdio and HTTPS transport validate via stdin without contacts',async()=>{
  for(const type of ['stdio','streamable-http']){
    const x=fixture(type);
    x.project.name='PRIVATE_PROJECT_CANARY';
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>inspectStdinAdapterDescriptor(x)
    );
    safe(result);
    assert.equal(result.transport,type);
    assert.equal(result.protocolVersion,'2026-07-28');
    assert.deepEqual(attempts,[]);
    const p=cli(JSON.stringify(x));
    assert.equal(p.error,undefined);
    assert.equal(p.status,0,p.stderr);
    assert.equal(p.stderr,'');
    assert.deepEqual(report(p),result);
    for(const sensitive of [
      x.project.name,
      ...(type==='stdio'?[x.transport.command,...x.transport.args]:
        [x.transport.endpoint])
    ])assert.ok(!p.stdout.includes(sensitive),'no input echo: '+type);
  }
});
test('M24-A: earlier declared protocol is accepted as inert descriptor only',()=>{
  const x=fixture('stdio');
  x.protocolVersion='2025-11-25';
  const p=cli(JSON.stringify(x));
  assert.equal(p.status,0,p.stderr);
  safe(report(p));
  assert.equal(report(p).protocolVersion,'2025-11-25');
  assert.equal(report(p).connectionStatus,'NOT_ATTEMPTED');
});

test('M24-B: injected fields, active permissions and credentials fail closed',()=>{
  const mutations=[
    x=>{x.policy.allowNetwork=true;},
    x=>{x.policy.allowProcessSpawn=true;},
    x=>{x.policy.allowToolCalls=true;},
    x=>{x.policy.allowCredentials=true;},
    x=>{x.policy.mode='execute';},
    x=>{x.credentials='PRIVATE_CANARY';},
    x=>{x.authorization={approved:true};},
    x=>{x.project.name='../../PRIVATE_CANARY';},
    x=>{x.transport.args=['--eval','PRIVATE_CANARY'];},
    x=>{x.transport.command='node -e PRIVATE_CANARY';},
    x=>{x.protocolVersion='not-valid';}
  ];
  for(const [i,mutate] of mutations.entries()){
    const x=fixture('stdio');mutate(x);
    const p=cli(JSON.stringify(x));
    bad(p);
    assert.ok(!p.stdout.includes('PRIVATE_CANARY'),String(i));
  }
  for(const change of [
    x=>{x.transport.endpoint='https://example.org/mcp?token=PRIVATE_CANARY';},
    x=>{x.transport.endpoint='https://user:pass@example.org/mcp';},
    x=>{x.transport.endpoint='http://example.org/mcp';},
    x=>{x.transport.endpoint='https://example.org/mcp#private';},
    x=>{x.transport.extra='PRIVATE_CANARY';}
  ]){
    const x=fixture('streamable-http');change(x);
    bad(cli(JSON.stringify(x)));
  }
});

test('M24-B: strict JSON rejects malformed UTF-8, dup keys and oversize stdin',()=>{
  for(const input of [
    '', ' ', '{"adapterSchemaVersion":1,"adapterSchemaVersion":1}',
    '{bad-json}', '{"secret":"PRIVATE_CANARY"}',
    Buffer.from([0x7b,0x22,0xc3,0x28,0x22,0x7d]),
    Buffer.alloc(4097,0x20),JSON.stringify(fixture('stdio'))+' garbage'
  ]){
    const p=cli(input);bad(p);
    assert.ok(!p.stdout.includes('PRIVATE_CANARY'));
  }
  const full=JSON.stringify(fixture('stdio'));
  bad(cli(full,'--target=https://user.example/mcp'));
  bad(cli(full,'--token=PRIVATE_CANARY'));
});

test('M24-B: no filesystem effects from a syntactically inert stdio command',()=>{
  const dir=mkdtempSync(join(tmpdir(),'m24-norun-'));
  try{
    const path=join(dir,'PRIVATE_CANARY-would-be-created');
    const x=fixture('stdio');
    // The current schema treats command as inert: descriptor validation
    // never spawns it. Even a nonsense command can be a valid *shape*.
    x.transport.command='fictional-node';
    x.transport.args=['safe-script'];
    const p=cli(JSON.stringify(x));
    assert.equal(p.status,0,p.stderr);
    safe(report(p));
    assert.equal(existsSync(path),false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('M24-B: direct JS caller getters/proxies are not evaluated',async()=>{
  const input=fixture('stdio');
  let reads=0;
  Object.defineProperty(input.transport,'command',{
    enumerable:true,get(){reads++;throw Error('PRIVATE_CANARY');}
  });
  const result=inspectStdinAdapterDescriptor(input);
  assert.equal(result.status,'ERROR');
  assert.equal(reads,0);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  const inherited=Object.create(fixture('stdio'));
  assert.equal(inspectStdinAdapterDescriptor(inherited).status,'ERROR');
  const tty=Readable.from([JSON.stringify(fixture('stdio'))]);
  tty.isTTY=true;
  const t=await runStdinAdapterPreflight([],tty);
  assert.equal(t.status,'ERROR');
  assert.equal(t.ruleCode,'M24_INVALID_OR_UNREADABLE_DESCRIPTOR');
});

test('M24-B: async direct stdin API handles chunks and rejects extra args',async()=>{
  const input=JSON.stringify(fixture('streamable-http'));
  const chunks=[Buffer.from(input.slice(0,15)),Buffer.from(input.slice(15))];
  const r=await runStdinAdapterPreflight([],Readable.from(chunks));
  safe(r);
  assert.equal(r.transport,'streamable-http');
  const denied=await runStdinAdapterPreflight(['--user=PRIVATE_CANARY'],
    Readable.from([input]));
  assert.equal(denied.status,'ERROR');
  const noData=await runStdinAdapterPreflight([],Readable.from([]));
  assert.equal(noData.status,'ERROR');
  const tooLarge=await runStdinAdapterPreflight([],
    Readable.from([Buffer.alloc(4096,0x20),Buffer.from('x')]));
  assert.equal(tooLarge.status,'ERROR');
});

test('M24-C: no fixed 80-path npm candidate changes or real-target claims',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
  const inv=JSON.parse(readFileSync(
    new URL('./expected-package-files.json',import.meta.url)));
  assert.equal(inv.length,80);
  assert.ok(!inv.includes('tools/m24-stdin-adapter-preflight.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('.github'));
  const source=readFileSync(new URL('../tools/m24-stdin-adapter-preflight.mjs',
    import.meta.url),'utf8');
  assert.doesNotMatch(source,/from ['"]node:(?:http|https|net|tls|child_process)['"]/);
  assert.doesNotMatch(source,/\b(?:fetch|spawn|execFile|createConnection)\s*\(/);
  assert.match(source,/OFFLINE_DESCRIPTOR_AND_FICTIONAL_CONTROLS_MATCH/);
  assert.match(source,/realProjectAssessed:false/);
});
