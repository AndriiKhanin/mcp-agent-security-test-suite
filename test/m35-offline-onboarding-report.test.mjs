/** M35 — report honesty, own evidence scope and non-echo UI tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  inspectOfflineOnboarding,renderOfflineOnboardingReport,
  runOfflineOnboardingReport
} from '../tools/m35-offline-onboarding-report.mjs';
import {observeFirstPartyMockAttempts}
  from '../src/mock-attempt-observer.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const fixtures=()=>[
  {mcpServers:{PRIVATE_CANARY:{command:'node',args:['server.mjs']}}},
  {servers:{PRIVATE_CANARY:{type:'stdio',command:'node',args:['server.mjs']}}},
  {servers:{PRIVATE_CANARY:{type:'http',url:'https://mcp.example.org/mcp'}}}
];
const cli=(input,...args)=>spawnSync(process.execPath,
  ['tools/m35-offline-onboarding-report.mjs',...args],{
    cwd:root,input,encoding:'utf8',shell:false,timeout:20000,
    maxBuffer:20000,windowsHide:true,env:{...process.env,NODE_OPTIONS:''}
  });
const notEcho=output=>{
  for(const banned of [
    'PRIVATE_CANARY','https://mcp.example.org','server.mjs',
    'node -e','private-token','Authorization:'
  ])assert.ok(!output.includes(banned),banned);
};
function claimsDenied(r){
  assert.equal(r.reportSchemaVersion,1);
  assert.equal(r.profile,'m35-readable-offline-onboarding-v1');
  assert.equal(r.verdict,r.status==='PASS'?'CONFIGURATION_ONLY':'NO_ASSESSMENT');
  assert.equal(r.riskRating,'NOT_SCORED');
  assert.equal(r.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(r.scope,
    'ONE_INERT_CLIENT_CONFIG_AND_FIXED_FICTIONAL_CONTROLS_ONLY');
  for(const k of ['externalTargetContacted','configuredProcessSpawned',
    'projectConnectionAuthorized','operatorVerified','realProjectAssessed',
    'actualAgentBehaviorObserved','independentBetaVerified',
    'securityCertified','stableReleaseAuthorized'])
    assert.equal(r[k],false,k);
  assert.equal(r.descriptor.targetTested,false);
  assert.equal(r.fictionalControls.projectSpecific,false);
  assert.equal(r.fictionalControls.actualAttackEfficacyMeasured,false);
  assert.equal(r.notTested.length,8);
  assert.ok(r.notTested.includes('REAL_MCP_TARGET_CONNECTIVITY'));
  assert.ok(r.notTested.includes('INDEPENDENT_BETA_AND_SECURITY_AUDIT'));
  assert.ok(r.notTested.includes('TLS_DNS_AND_SSRF_DEFENSES'));
  assert.ok(r.notTested.includes('CREDENTIAL_HANDLING'));
  assert.ok(r.notTested.includes('EXTERNAL_TOOL_EFFECTS'));
  assert.ok(r.notTested.includes('SECURITY_CERTIFICATION_AND_RELEASE'));
  assert.ok(r.nextActions.length>=2);
  assert.ok(r.nextActions.every(a=>
    typeof a.code==='string'&&typeof a.advice==='string'));
}
function passes(r,transport){
  claimsDenied(r);
  assert.equal(r.status,'PASS');
  assert.equal(r.exitCode,0);
  assert.equal(r.ruleCode,'OFFLINE_ONBOARDING_SHAPE_ACCEPTED');
  assert.equal(r.descriptor.status,'SHAPE_VALIDATED');
  assert.equal(r.descriptor.transport,transport);
  assert.equal(r.descriptor.policy,'VALIDATE_ONLY');
  assert.equal(r.fictionalControls.count,5);
  assert.equal(r.fictionalControls.status,'FIRST_PARTY_SYNTHETIC_MATCH');
}
function rejected(r){
  claimsDenied(r);
  assert.equal(r.status,'ERROR');
  assert.equal(r.exitCode,2);
  assert.equal(r.ruleCode,'OFFLINE_ONBOARDING_INPUT_REJECTED');
  assert.equal(r.descriptor.status,'NOT_EVALUATED');
  assert.equal(r.descriptor.transport,'NOT_EVALUATED');
  assert.equal(r.fictionalControls.count,0);
  assert.equal(r.fictionalControls.status,'NOT_EVALUATED');
}
test('M35-A: three supported formats yield fixed categorical no-echo readable reports',async()=>{
  for(const config of fixtures()){
    const source=JSON.stringify(config);
    const expected=config.servers?.PRIVATE_CANARY?.type==='http'?
      'streamable-http':'stdio';
    const {result,attempts}=await observeFirstPartyMockAttempts(
      ()=>inspectOfflineOnboarding(config));
    assert.deepEqual(attempts,[]);
    passes(result,expected);
    const text=renderOfflineOnboardingReport(result);
    assert.ok(text.startsWith('MCP Agent Security Test Suite'));
    assert.match(text,/DESCRIPTOR PREFLIGHT/);
    assert.match(text,/FICTIONAL CONTRACT CONTROLS/);
    assert.match(text,/NOT TESTED/);
    assert.match(text,/NEXT ACTIONS/);
    assert.match(text,/5\/5 reviewed first-party fictional checks matched/);
    assert.match(text,/RISK RATING: NOT_SCORED/);
    assert.match(text,/REAL TARGET CONTACT: NOT_ATTEMPTED/);
    assert.match(text,/SECURITY CERTIFICATION: NOT_GRANTED/);
    notEcho(text);
    const p=cli(source);
    assert.equal(p.error,undefined);
    assert.equal(p.status,0,p.stderr);
    assert.equal(p.stderr,'');
    assert.equal(p.stdout,text);
    notEcho(p.stdout);
    const json=cli(source,'--json');
    assert.equal(json.status,0,json.stderr);
    assert.equal(json.stderr,'');
    assert.deepEqual(JSON.parse(json.stdout),result);
    notEcho(json.stdout);
  }
});
test('M35-A: explicitly rejected input is never misrepresented as a scanned project',()=>{
  const result=inspectOfflineOnboarding({mcpServers:{}});
  rejected(result);
  const view=renderOfflineOnboardingReport(result);
  assert.match(view,/Input rejected; descriptor not evaluated/);
  assert.match(view,/Not evaluated due to invalid or unsupported input/);
  assert.doesNotMatch(view,/5\/5 reviewed first-party/);
  assert.match(view,/No configuration acceptance or permission granted/);
  assert.equal(view.includes('REAL TARGET CONTACT: NOT_ATTEMPTED'),true);
  assert.equal(cli('{"mcpServers":{}}').status,2);
});
test('M35-B: malicious and forged report inputs have zero evidence authority',()=>{
  const forged={
    status:'PASS',profile:'m35-readable-offline-onboarding-v1',
    securityScore:100,riskRating:'LOW',externalTargetContacted:true,
    projectConnectionAuthorized:true,
    descriptor:{transport:'streamable-http'}
  };
  assert.throws(()=>renderOfflineOnboardingReport(forged),
    /UNTRUSTED_OFFLINE_REPORT/);
  const valid=inspectOfflineOnboarding(fixtures()[0]);
  passes(valid,'stdio');
  assert.throws(()=>{valid.status='CERTIFIED';},TypeError);
  assert.throws(()=>{valid.descriptor.transport='real-live-server';},TypeError);
  assert.throws(()=>{valid.notTested.push('COVERED');},TypeError);
  assert.throws(()=>renderOfflineOnboardingReport({...valid}),
    /UNTRUSTED_OFFLINE_REPORT/);
  assert.throws(()=>renderOfflineOnboardingReport(
    JSON.parse(JSON.stringify(valid))),/UNTRUSTED_OFFLINE_REPORT/);
  const malicious=[
    {mcpServers:{PRIVATE_CANARY:{
      command:'node',args:['server.mjs'],securityScore:100}}},
    {mcpServers:{PRIVATE_CANARY:{command:'node',args:['server.mjs']}},
      operatorVerified:true},
    {mcpServers:{PRIVATE_CANARY:{command:'node',args:['server.mjs']}},
      securityCertified:true},
    {mcpServers:{PRIVATE_CANARY:{command:'node',args:['server.mjs']}},
      report:{status:'PASS',externalTargetContacted:true}},
    {servers:{PRIVATE_CANARY:{type:'http',
      url:'https://mcp.example.org/mcp',headers:{Authorization:'private-token'}}}},
    {servers:{PRIVATE_CANARY:{type:'stdio',command:'node',
      args:[],env:{TOKEN:'private-token'}}}},
    {servers:{one:{type:'stdio',command:'node'},
      two:{type:'stdio',command:'node'}}},
    {mcpServers:{PRIVATE_CANARY:{command:'node',
      args:['--token=private-token']}}},
    {mcpServers:{PRIVATE_CANARY:{command:'node',
      args:['/home/private-token']}}},
    {mcpServers:{PRIVATE_CANARY:{command:'node',
      args:['-e','node -e']}}},
    {servers:{PRIVATE_CANARY:{type:'http',url:'https://mcp.example.org/mcp?auth=private-token'}}},
    {servers:{PRIVATE_CANARY:{type:'sse',url:'https://mcp.example.org/mcp'}}}
  ];
  for(const config of malicious){
    rejected(inspectOfflineOnboarding(config));
    const p=cli(JSON.stringify(config));
    assert.equal(p.status,2,p.stderr);
    notEcho(p.stdout);
    const j=cli(JSON.stringify(config),'--json');
    assert.equal(j.status,2,j.stderr);
    rejected(JSON.parse(j.stdout));
    notEcho(j.stdout);
  }
});
test('M35-B: accessor, sparse input and inherited objects fail without evaluating getters',()=>{
  let calls=0;
  const source=fixtures()[0];
  Object.defineProperty(source.mcpServers.PRIVATE_CANARY,'command',{
    enumerable:true,get(){calls++;throw Error('private-token');}
  });
  rejected(inspectOfflineOnboarding(source));
  assert.equal(calls,0);
  rejected(inspectOfflineOnboarding(Object.create(fixtures()[0])));
  const x=fixtures()[0];x.mcpServers.PRIVATE_CANARY.args=Array(2);
  x.mcpServers.PRIVATE_CANARY.args[0]='server.mjs';
  rejected(inspectOfflineOnboarding(x));
  const y=fixtures()[0];
  Object.defineProperty(y.mcpServers,'PRIVATE_CANARY',{
    enumerable:true,get(){calls++;throw Error('private-token');}
  });
  rejected(inspectOfflineOnboarding(y));
  assert.equal(calls,0);
  const badReport={...inspectOfflineOnboarding(fixtures()[0])};
  Object.defineProperty(badReport,'status',{
    enumerable:true,get(){calls++;throw Error('private-token');}
  });
  assert.throws(()=>renderOfflineOnboardingReport(badReport),
    /UNTRUSTED_OFFLINE_REPORT/);
  assert.equal(calls,0);
});
test('M35-B: strict UTF-8/JSON size bound, duplicate keys, extra flags, TTY fail closed',async()=>{
  for(const input of [
    '', ' ', '{bad}', '{"mcpServers":{},"mcpServers":{}}',
    Buffer.from([0x7b,0x22,0xc3,0x28,0x22,0x7d]),
    Buffer.alloc(4097,0x20),
    JSON.stringify(fixtures()[0])+' EXTRA',
    '{"mcpServers":{"PRIVATE_CANARY":{"command":"node","command":"node"}}}'
  ]){
    const p=cli(input);
    assert.equal(p.status,2,p.stderr);
    notEcho(p.stdout);
    const j=cli(input,'--json');
    assert.equal(j.status,2,j.stderr);
    rejected(JSON.parse(j.stdout));
  }
  const source=JSON.stringify(fixtures()[0]);
  for(const args of [
    ['--help'],['--emit-descriptor'],['--target=private-token'],
    ['--json','--json'],['--json','--unsafe']
  ]){
    const p=cli(source,...args);
    assert.equal(p.status,2,p.stderr);
    rejected((await runOfflineOnboardingReport(args,
      Readable.from([Buffer.from(source)]))).report);
    notEcho(p.stdout);
  }
  const tty=Readable.from([Buffer.from(source)]);tty.isTTY=true;
  rejected((await runOfflineOnboardingReport([],tty)).report);
  const streamed=await runOfflineOnboardingReport(['--json'],
    Readable.from([
      Buffer.from(source.slice(0,10)),Buffer.from(source.slice(10))
    ]));
  assert.equal(streamed.format,'json');
  passes(streamed.report,'stdio');
});
test('M35-C: tool uses existing M34 bounded parser, no effect APIs or package expansion',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
  const frozen=JSON.parse(readFileSync(
    new URL('./expected-package-files.json',import.meta.url)));
  assert.equal(pkg.version,'0.0.10-rc.1');
  assert.equal(frozen.length,80);
  assert.ok(!frozen.includes('tools/m35-offline-onboarding-report.mjs'));
  assert.ok(!frozen.includes('test/m35-offline-onboarding-report.test.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  const text=readFileSync(new URL('../tools/m35-offline-onboarding-report.mjs',
    import.meta.url),'utf8');
  assert.doesNotMatch(text,
    /from ['"]node:(?:http|https|net|tls|child_process|fs|fs\/promises)['"]/u);
  assert.doesNotMatch(text,
    /\b(?:fetch|spawn|execFile|createConnection|writeFile|readFile|readFileSync)\s*\(/u);
  assert.match(text,/runClientConfigBridge/);
  assert.match(text,/realProjectAssessed:false/);
  assert.match(text,/securityCertified:false/);
  // M6-J independently verifies every excluded-source digest and hard
  // refuses an inventory with 241 files; never loosen that bound.
});
