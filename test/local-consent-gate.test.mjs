import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash,generateKeyPairSync,sign } from 'node:crypto';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGatedFixedMockCase,runGatedFirstPartySelftest,reviewF2StagingIntent,inspectF2SignedGrantEvidence,buildF2OfflineDiscoveryFixture,reviewF2OfflineDiscoveryFixture }
  from '../src/local-consent-gate.mjs';
import { runFirstPartyAdapterSelftest } from '../src/local-adapter-drivers.mjs';
import { runLocalStdioInitialization } from '../src/stdio-mcp-harness.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',shell:false,timeout:35_000,maxBuffer:65_536
});

test('M4-B3: CLI first-party selftest is consent-gated and still returns two fixed mocks',()=>{
  const x=cli('adapter-selftest');
  assert.equal(x.error,undefined);
  assert.equal(x.status,0,x.stderr);
  const report=JSON.parse(x.stdout);
  assert.deepEqual([report.command,report.reportSchemaVersion,report.profile,
  report.consentProfile,report.authorizationStatus,report.operatorVerified,
  report.status,report.externalTargetContacted,report.transportCount,
  report.passed,report.failed],['adapter-selftest',1,
  'universal-fixed-local-mock-drivers-v1','fixed-first-party-admission-v1',
  'FIRST_PARTY_SYNTHETIC_ONLY',false,'PASS',false,2,2,0]);
  assert.deepEqual(report.outcomes.map(o=>o.transport),['stdio','streamable-http']);
  assert.ok(report.outcomes.every(o=>o.gateStatus==='MOCK_ADMITTED' &&
  o.driverCreated && o.mockProbeAttempted && o.matched));
  assert.ok(!x.stdout.includes('mcp.example.org'));
  assert.ok(!x.stdout.includes('stdio-mcp-mock-worker'));
});

test('M4-B3: direct legacy driver selftest now routes through same fixed synthetic gate',async()=>{
  const report=await runFirstPartyAdapterSelftest();
  assert.equal(report.status,'PASS');
  assert.equal(report.authorizationStatus,'FIRST_PARTY_SYNTHETIC_ONLY');
  assert.ok(report.outcomes.every(o=>o.gateStatus==='MOCK_ADMITTED'));
});

test('M4-B3: denied revoked, expired and unapproved method never create driver or attempt probe',async()=>{
  for(const type of ['stdio','streamable-http']) {
  for(const [caseName,rule] of [
    ['revoked','ADAPTER_GRANT_REVOKED'],
    ['expired','ADAPTER_GRANT_EXPIRED_OR_INVALID'],
    ['wrong-method','ADAPTER_METHOD_DENIED'],
    ['forbidden-method','ADAPTER_POLICY_INPUT_REJECTED']
  ]) {
    const r=await runGatedFixedMockCase(type,{caseName});
    assert.deepEqual([r.status,r.rule,r.connectionStatus,r.gateStatus,
      r.driverCreated,r.mockProbeAttempted,r.executedFirstPartyMock,
      r.externalTargetContacted,r.checked],
      ['FAIL',rule,'NOT_ATTEMPTED','DENIED',false,false,false,false,0],caseName);
  }
  }
});

test('M4-B3: mismatched project, claimed owner and changed fixed descriptor denied before effect',async()=>{
  for(const type of ['stdio','streamable-http']) {
  for(const caseName of ['wrong-project','wrong-operator','changed-descriptor']) {
    const result=await runGatedFixedMockCase(type,{caseName});
    assert.deepEqual([result.status,result.rule,result.mockProbeAttempted,
      result.driverCreated],['FAIL','ADAPTER_IDENTITY_MISMATCH',false,false]);
    for(const canary of ['other.example.org','other-worker.mjs','unknown-operator'])
      assert.ok(!JSON.stringify(result).includes(canary));
  }
  }
});

test('M4-B3: process-local replay simulation rejects reused nonce before effects',async()=>{
  const seen=new Set();
  const r=await runGatedFixedMockCase('stdio',{caseName:'replay',seenNonces:seen});
  assert.equal(r.status,'FAIL');
  assert.equal(r.rule,'ADAPTER_SIMULATED_REPLAY');
  assert.equal(r.driverCreated,false);
  assert.equal(r.mockProbeAttempted,false);
  // Does not pretend to provide persistent replay protection or real grant.
  const admitted=await runGatedFixedMockCase('stdio',{seenNonces:seen});
  assert.equal(admitted.status,'PASS');
  assert.equal(admitted.gateStatus,'MOCK_ADMITTED');
});

test('M4-B3: fixed transport inventory rejects arbitrary endpoint, executable and caller-provided grants',async()=>{
  for(const [type,opts] of [
  ['unknown',{}],['stdio',{command:'node',args:['private.mjs']}],
  ['stdio',{claim:{operatorId:'forged'}}],
  ['stdio',{endpoint:'https://private.example.org/mcp'}],
  ['streamable-http',{url:'https://private.example.org/mcp'}],
  ['streamable-http',{caseName:'unapproved-scan'}],
  ['stdio',{nowMs:'2030-01-01'}],['stdio',{seenNonces:[]}],
  ['stdio',null]
  ]) {
  await assert.rejects(runGatedFixedMockCase(type,opts),
    /INVALID_FIXED_MOCK_ADMISSION_OPTIONS/);
  }
});

test('M4-B3: no extra CLI args can turn local test into real-target connection',()=>{
  for(const value of ['--url=https://private.example.org/mcp',
  'examples/adapter-profiles/stdio-project.json',
  '--operator=fictional-admin']) {
  const x=cli('adapter-selftest',value);
  assert.equal(x.status,2);
  const r=JSON.parse(x.stdout);
  assert.equal(r.status,'ERROR');
  assert.equal(r.errorCode,'INVALID_CLI_ARGUMENTS');
  assert.ok(!(x.stdout+x.stderr).includes(value));
  }
});

test('M4-B3: existing user adapter-check / adapter-policy-check remain inert',()=>{
  const config=cli('adapter-check','examples/adapter-profiles/stdio-project.json');
  assert.equal(config.status,0);
  const r=JSON.parse(config.stdout);
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.executionEnabled,false);
  const expired=cli('adapter-policy-check','examples/adapter-profiles/consent-expired.json');
  assert.equal(expired.status,1);
  const policy=JSON.parse(expired.stdout);
  assert.equal(policy.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(policy.operatorVerified,false);
});

test('M4-B3: repeat local selftest closes both first-party resources',async()=>{
  for(let i=0;i<2;i++){
  const result=await runGatedFirstPartySelftest();
  assert.deepEqual([result.status,result.outcomes.length,
    result.outcomes.every(o=>o.matched)],['PASS',2,true]);
  }
});


test('M4-B3: admitted stdio exchange sends and verifies initialize only',async()=>{
  const result=await runGatedFixedMockCase('stdio');
  assert.deepEqual([result.status,result.checked,result.gateStatus,
  result.mockProbeAttempted],['PASS',1,'MOCK_ADMITTED',true]);
  const fixed=runLocalStdioInitialization({timeoutMs:6000});
  assert.equal(fixed.status,'PASS');
  assert.deepEqual([fixed.checked,fixed.received,fixed.failureCount],[1,1,0]);
  assert.deepEqual(fixed.findings,[]);
});

test('M4-B3: initialize-only worker rejects any appended tools/call frame with no output',()=>{
  const worker=fileURLToPath(new URL('../src/stdio-mcp-mock-worker.mjs',import.meta.url));
  const initialize={jsonrpc:'2.0',id:1,method:'initialize',params:{
  protocolVersion:'2026-07-28',capabilities:{},
  clientInfo:{name:'fictional-client',version:'1'}}};
  const extra={jsonrpc:'2.0',id:2,method:'tools/call',
  params:{name:'fictional-write',arguments:{}}};
  const input=[initialize,extra].map(x=>JSON.stringify(x)).join('\n')+'\n';
  const out=spawnSync(process.execPath,[worker,'init-only'],{
  input,encoding:'utf8',shell:false,timeout:6000,maxBuffer:8192
  });
  assert.deepEqual([out.error,out.status,out.stdout,
  out.stderr.includes('fictional-write')],[undefined,2,'',false]);
});

test('F2: deny before network',()=>{
  const a={endpoint:'https://fixture.example.org/mcp',
  protocolVersion:'2026-07-28',method:'server/discover'};
  const bad=[{...a,method:'tools/call'}, {...a,protocolVersion:'2025-11-25'},
  {...a,endpoint:'https://127.0.0.1/mcp'}, {...a,grantApproved:true}];
  for(const [i,input] of [a,...bad].entries()){
  const r=reviewF2StagingIntent(input);
  assert.deepEqual([r.rule,r.connectionStatus,r.executionEnabled,
    r.externalTargetContacted],[
    i?'F2_INTENT_REJECTED':'F2_AUTHORITY_NOT_VERIFIED',
    'NOT_ATTEMPTED',false,false]);
  }
});

test('F2: signed intent verifies cryptographic integrity but never permits network',()=>{
  const i={endpoint:'https://fixture.example.org/mcp',
    protocolVersion:'2026-07-28',method:'server/discover'};
  const a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519');
  const g={schemaVersion:1,endpoint:i.endpoint,protocolVersion:i.protocolVersion,
    method:i.method,operatorId:'firstPartyOperator',issuerId:'firstPartyIssuer',
    intentSha256:createHash('sha256').update(JSON.stringify([
      i.endpoint,i.protocolVersion,i.method])).digest('hex'),
    nonce:'ab'.repeat(16),issuedAt:1000,expiresAt:120000};
  const msg=Buffer.from('F2-SIGNED-INTENT-V1\n'+JSON.stringify([
    g.schemaVersion,g.endpoint,g.protocolVersion,g.method,g.operatorId,
    g.issuerId,g.intentSha256,g.nonce,g.issuedAt,g.expiresAt]),'utf8');
  const e={grant:g,signature:sign(null,msg,a.privateKey).toString('base64url'),
    issuerPublicKeyPem:a.publicKey.export({format:'pem',type:'spki'})};
  const run=(ev,now=2000)=>inspectF2SignedGrantEvidence(i,ev,now);
  const good=run(e);
  assert.deepEqual([good.status,good.rule,good.signatureVerified,
    good.operatorVerified,good.ownershipVerified,good.executionEnabled,
    good.externalTargetContacted,good.connectionStatus],
    ['FAIL','F2_TRUST_ANCHOR_NOT_ESTABLISHED',true,
      false,false,false,false,'NOT_ATTEMPTED']);
  assert.equal(run(e,999).rule,'F2_GRANT_EXPIRED_OR_NOT_YET_VALID');
  assert.equal(run(e,120000).rule,'F2_GRANT_EXPIRED_OR_NOT_YET_VALID');
  assert.equal(run({...e,issuerPublicKeyPem:
    b.publicKey.export({format:'pem',type:'spki'})}).rule,'F2_SIGNATURE_INVALID');
  assert.equal(run({...e,signature:
    (e.signature[0]==='A'?'B':'A')+e.signature.slice(1)}).rule,
    'F2_SIGNATURE_INVALID');
  assert.equal(run({...e,grant:{...g,method:'tools/call'}}).rule,
    'F2_GRANT_SCOPE_MISMATCH');
  assert.equal(run({...e,approved:true}).rule,'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(run({...e,grant:{...g,nonce:'short'}}).rule,
    'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(run({...e,issuerPublicKeyPem:'BAD'}).rule,
    'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(run({...e,grant:{...g,expiresAt:301001}}).rule,
    'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(inspectF2SignedGrantEvidence({...i,method:'tools/call'},e,2000).rule,
    'F2_INTENT_REJECTED');
  assert.ok(!JSON.stringify(good).includes('firstPartyOperator'));
  assert.ok(!JSON.stringify(good).includes(i.endpoint));
  // Own-descriptor snapshots must be stable even if Proxy get lies/throws.
  // This is a no-contact inspection test, not a real MCP security claim.
  const noGet=o=>new Proxy(o,{get(){throw Error('UNTRUSTED_GET_EXECUTED');}});
  const captured=inspectF2SignedGrantEvidence(
    noGet(i),noGet({...e,grant:noGet(g)}),2000);
  assert.deepEqual([captured.rule,captured.signatureVerified,
    captured.externalTargetContacted],
    ['F2_TRUST_ANCHOR_NOT_ESTABLISHED',true,false]);
  const forgedIntent=new Proxy({...i,method:'tools/call'},{
    get(target,key){return key==='method'?'server/discover':Reflect.get(target,key);}
  });
  assert.equal(inspectF2SignedGrantEvidence(forgedIntent,e,2000).rule,
    'F2_INTENT_REJECTED');
  const forgedGrant=new Proxy({...g,method:'tools/call'},{
    get(target,key){return key==='method'?'server/discover':Reflect.get(target,key);}
  });
  assert.equal(run({...e,grant:forgedGrant}).rule,'F2_GRANT_SCOPE_MISMATCH');
  let accessorRead=false;
  const accessorGrant={...g};
  Object.defineProperty(accessorGrant,'nonce',{enumerable:true,
    get(){accessorRead=true;return g.nonce;}});
  assert.equal(run({...e,grant:accessorGrant}).rule,
    'F2_SIGNED_EVIDENCE_REJECTED');
  assert.equal(accessorRead,false);
});

test('F2: standalone intent uses captured values without property reads',()=>{
  const valid={endpoint:'https://fixture.example.org/mcp',
    protocolVersion:'2026-07-28',method:'server/discover'};
  let reads=0;
  const noGet=new Proxy(valid,{get(){reads++;throw Error('UNTRUSTED_GET_EXECUTED');}});
  assert.deepEqual(reviewF2StagingIntent(noGet),reviewF2StagingIntent(valid));
  assert.equal(reads,0);
  for(const [key,value] of [
    ['endpoint','https://127.0.0.1/mcp'],
    ['protocolVersion','2025-11-25'],
    ['method','tools/call']
  ]){
    const forged=new Proxy({...valid,[key]:value},{
      get(target,name){reads++;return name===key?valid[key]:Reflect.get(target,name);}
    });
    assert.equal(reviewF2StagingIntent(forged).rule,'F2_INTENT_REJECTED',key);
    assert.equal(reads,0,key);
  }
});

test('F2: standalone intent rejects malformed descriptors without invoking accessors',()=>{
  const valid={endpoint:'https://fixture.example.org/mcp',
    protocolVersion:'2026-07-28',method:'server/discover'};
  let reads=0;
  for(const key of Object.keys(valid)){
    const accessor={...valid};
    Object.defineProperty(accessor,key,{enumerable:true,
      get(){reads++;return valid[key];}});
    const hidden={...valid};
    Object.defineProperty(hidden,key,{enumerable:false});
    const missing={...valid};
    delete missing[key];
    for(const input of [accessor,hidden,missing]){
      assert.equal(reviewF2StagingIntent(input).rule,'F2_INTENT_REJECTED',key);
    }
  }
  for(const input of [
    {...valid,extra:true},
    {...valid,[Symbol('extra')]:true},
    Object.assign(Object.create(null),valid),
    new Proxy(valid,{getOwnPropertyDescriptor(){throw Error('UNTRUSTED_DESCRIPTOR');}})
  ]){
    const r=reviewF2StagingIntent(input);
    assert.deepEqual([r.status,r.rule,r.connectionStatus,r.executionEnabled,
      r.externalTargetContacted],['FAIL','F2_INTENT_REJECTED','NOT_ATTEMPTED',false,false]);
  }
  assert.equal(reads,0);
});

test('F2-A: fixed modern discovery wire is spec-shaped and never contacts a target',()=>{
  const fixture=buildF2OfflineDiscoveryFixture();
  const {request}=fixture;
  const body=JSON.parse(request.body);
  assert.deepEqual(Object.keys(request.headers).sort(),[
    'Accept','Content-Type','MCP-Protocol-Version','Mcp-Method'].sort());
  assert.deepEqual(request.headers,{
    'Content-Type':'application/json',
    Accept:'application/json, text/event-stream',
    'MCP-Protocol-Version':'2026-07-28',
    'Mcp-Method':'server/discover'
  });
  assert.equal(request.httpMethod,'POST');
  assert.deepEqual([body.jsonrpc,body.id,body.method],
    ['2.0','f2-discover-fixture-1','server/discover']);
  assert.deepEqual(Reflect.ownKeys(body.params),['_meta']);
  assert.deepEqual(body.params._meta,{
    'io.modelcontextprotocol/protocolVersion':'2026-07-28',
    'io.modelcontextprotocol/clientInfo':{
      name:'mcp-agent-security-test-suite-fixture',version:'0.0.10-rc.1'
    },
    'io.modelcontextprotocol/clientCapabilities':{}
  });
  assert.ok(Buffer.byteLength(request.body,'utf8')<=4096);
  assert.equal(fixture.requestSha256,
    createHash('sha256').update(request.body).digest('hex'));
  assert.deepEqual([
    fixture.connectionStatus,fixture.executionEnabled,
    fixture.operatorVerified,fixture.ownershipVerified,fixture.externalTargetContacted],
    ['NOT_ATTEMPTED',false,false,false,false]);
  assert.equal(reviewF2OfflineDiscoveryFixture(request).rule,
    'F2_SOURCE_WIRE_FIXTURE_MATCH');
  assert.ok(!Object.hasOwn(request,'endpoint'));
  assert.ok(!Object.hasOwn(request.headers,'Mcp-Name'));
});

test('F2-A: mismatched wire fields or added authority requests fail closed',()=>{
  const f=buildF2OfflineDiscoveryFixture().request;
  const wire=(edit={})=>({...f,...edit,headers:{...f.headers,...edit.headers}});
  const body=JSON.parse(f.body);
  const mutated=JSON.stringify({...body,method:'tools/call'});
  const missingMeta=JSON.stringify({...body,params:{}});
  for(const candidate of [
    wire({httpMethod:'GET'}),wire({httpMethod:'PUT'}),
    wire({body:mutated}),wire({body:missingMeta}),
    wire({body:f.body+' '}),
    wire({body:'x'.repeat(4097)}),
    {...wire(),endpoint:'https://unapproved.example.org/mcp'},
    {...wire(),headers:{...f.headers,'Mcp-Name':'malicious-tool'}},
    {...wire(),headers:{...f.headers,'Mcp-Method':'tools/call'}},
    {...wire(),headers:{...f.headers,'MCP-Protocol-Version':'2025-11-25'}},
    {...wire(),headers:{...f.headers,Accept:'application/json'}},
    {...wire(),headers:{...f.headers,'Content-Type':'text/plain'}},
    {...wire(),headers:{...f.headers,Authorization:'Bearer fictional'}},
    wire({headers:{...f.headers,Accept:'application/json'}}),
    null,[],Object.assign(Object.create(null),wire())
  ]) {
    const r=reviewF2OfflineDiscoveryFixture(candidate);
    assert.deepEqual([r.status,r.fixtureMatches,r.connectionStatus,
      r.executionEnabled,r.externalTargetContacted],
      ['FAIL',false,'NOT_ATTEMPTED',false,false]);
    assert.ok(!JSON.stringify(r).includes('unapproved.example.org'));
  }
});

test('F2-A: proxy getters and accessor-bearing wire objects never execute',()=>{
  const f=buildF2OfflineDiscoveryFixture().request;
  let reads=0;
  const noGet=x=>new Proxy(x,{
    get(){reads++;throw Error('UNTRUSTED_GET_EXECUTED');}
  });
  assert.equal(reviewF2OfflineDiscoveryFixture(
    noGet({...f,headers:noGet({...f.headers})})).fixtureMatches,true);
  assert.equal(reads,0);
  const spoof=new Proxy({...f,headers:{...f.headers,'Mcp-Method':'tools/call'}},{
    get(target,name){reads++;return name==='headers'?f.headers:Reflect.get(target,name);}
  });
  assert.equal(reviewF2OfflineDiscoveryFixture(spoof).fixtureMatches,false);
  assert.equal(reads,0);
  const withAccessor={...f};
  Object.defineProperty(withAccessor,'body',{enumerable:true,
    get(){reads++;return f.body;}});
  assert.equal(reviewF2OfflineDiscoveryFixture(withAccessor).fixtureMatches,false);
  assert.equal(reads,0);
  const withSymbol={...f,[Symbol('hidden')]:true};
  assert.equal(reviewF2OfflineDiscoveryFixture(withSymbol).fixtureMatches,false);
  const descTrap=new Proxy({...f},{getOwnPropertyDescriptor(){
    throw Error('UNTRUSTED_DESCRIPTOR');
  }});
  assert.equal(reviewF2OfflineDiscoveryFixture(descTrap).fixtureMatches,false);
  // Proxy introspection can execute traps. This is a verdict checker, never
  // an execution sandbox: trap side effects are not prevented by try/catch.
  let introspectionTraps=0;
  const ownKeysTrap=new Proxy({...f},{ownKeys(){
    introspectionTraps++;
    throw Error('UNTRUSTED_OWN_KEYS_TRAP');
  }});
  const protoTrap=new Proxy({...f},{getPrototypeOf(){
    introspectionTraps++;
    throw Error('UNTRUSTED_PROTOTYPE_TRAP');
  }});
  assert.equal(reviewF2OfflineDiscoveryFixture(ownKeysTrap).fixtureMatches,false);
  assert.equal(reviewF2OfflineDiscoveryFixture(protoTrap).fixtureMatches,false);
  assert.equal(introspectionTraps,2);
  const ok=reviewF2OfflineDiscoveryFixture(f);
  assert.deepEqual([ok.status,ok.fixtureMatches,ok.connectionStatus,
    ok.executionEnabled,ok.operatorVerified,ok.ownershipVerified,
    ok.externalTargetContacted],['PASS',true,'NOT_ATTEMPTED',
    false,false,false,false]);
  assert.equal(reads,0);
});
