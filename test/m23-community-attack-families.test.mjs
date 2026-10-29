/** M23: community attack families, independent observations and negative controls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  runCommunityAttackFamilies,summarizeCommunityAttackFamilies
} from '../tools/m23-community-attack-families.mjs';

const names=[
  'RUG_UNCHANGED','RUG_DESCRIPTION_CHANGED',
  'MULTI_SAME_OWNER','MULTI_CROSS_OWNER','MULTI_FORGED_OWNER_CLAIM',
  'ERROR_SUCCESS_CONTROL','ERROR_GENERIC_CONTROL',
  'ERROR_ENV_ECHO','ERROR_PATH_ECHO','ERROR_HEADER_ECHO'
];
const types=[
  'RUG_PULL','RUG_PULL','MULTI_SERVER','MULTI_SERVER','MULTI_SERVER',
  'ERROR_CHANNEL','ERROR_CHANNEL','ERROR_CHANNEL','ERROR_CHANNEL',
  'ERROR_CHANNEL'
];
const witness=(v)=>({
  requests:1,allowed:v[0],denied:v[1],legitimateTasksHandled:v[2],
  protectedEffects:v[3],errorCanaryLeaks:v[4],
  actualEnvironmentReads:0,actualFilesystemReads:0,
  actualHeaderCaptures:0,externalRequests:0
});
const expected=[
  [[1,0,1,0,0],[1,0,1,0,0]],
  [[1,0,1,1,0],[0,1,0,0,0]],
  [[1,0,1,0,0],[1,0,1,0,0]],
  [[1,0,0,1,0],[0,1,0,0,0]],
  [[1,0,0,1,0],[0,1,0,0,0]],
  [[1,0,1,0,0],[1,0,1,0,0]],
  [[1,0,0,0,0],[1,0,0,0,0]],
  [[1,0,0,0,1],[1,0,0,0,0]],
  [[1,0,0,0,1],[1,0,0,0,0]],
  [[1,0,0,0,1],[1,0,0,0,0]]
];
const good=()=>names.map((id,i)=>({
  id,family:types[i],unsafe:witness(expected[i][0]),
  guarded:witness(expected[i][1])
}));
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/m23-community-attack-families.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    shell:false,encoding:'utf8',timeout:15000,maxBuffer:65536
  });
test('M23-A: ten source-authored controls compare all three suggested families',()=>{
  const r=summarizeCommunityAttackFamilies(good());
  assert.equal(r.status,'PASS');
  assert.equal(r.checked,10);
  assert.equal(r.matched,10);
  assert.equal(r.expectedUnsafeEffects,3);
  assert.equal(r.expectedUnsafeErrorLeakCases,3);
  assert.equal(r.guardedUnauthorizedEffectsExpected,0);
  assert.equal(r.guardedErrorLeaksExpected,0);
  assert.deepEqual(r.cases.map(x=>x.id),names);
  assert.deepEqual(r.cases.map(x=>x.finding),[
    'LEGITIMATE_OR_GENERIC_CONTROL_PRESERVED',
    'SYNTHETIC_UNAUTHORIZED_EFFECT_EXPOSED',
    'LEGITIMATE_OR_GENERIC_CONTROL_PRESERVED',
    'SYNTHETIC_UNAUTHORIZED_EFFECT_EXPOSED',
    'SYNTHETIC_UNAUTHORIZED_EFFECT_EXPOSED',
    'LEGITIMATE_OR_GENERIC_CONTROL_PRESERVED',
    'LEGITIMATE_OR_GENERIC_CONTROL_PRESERVED',
    'SYNTHETIC_ERROR_CHANNEL_LEAK_EXPOSED',
    'SYNTHETIC_ERROR_CHANNEL_LEAK_EXPOSED',
    'SYNTHETIC_ERROR_CHANNEL_LEAK_EXPOSED'
  ]);
  assert.equal(r.realAgentBehaviorObserved,false);
  assert.equal(r.realEnvironmentReadPerformed,false);
  assert.equal(r.realFilesystemReadPerformed,false);
  assert.equal(r.realRequestHeadersCaptured,false);
  assert.equal(r.externalMcpContacted,false);
  assert.equal(r.independentBetaVerified,false);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
});

test('M23-B: missing unsafe effects, leaked protected effects and fabricated control are FAIL',()=>{
  const changes=[
    [1,'unsafe','protectedEffects',0],
    [1,'guarded','protectedEffects',1],
    [1,'guarded','allowed',1],
    [1,'guarded','denied',0],
    [2,'guarded','allowed',0],
    [3,'unsafe','protectedEffects',0],
    [3,'guarded','protectedEffects',1],
    [4,'unsafe','protectedEffects',0],
    [4,'guarded','allowed',1],
    [5,'unsafe','legitimateTasksHandled',0],
    [6,'guarded','denied',1],
    [7,'unsafe','errorCanaryLeaks',0],
    [7,'guarded','errorCanaryLeaks',1],
    [8,'unsafe','errorCanaryLeaks',0],
    [8,'guarded','errorCanaryLeaks',1],
    [9,'unsafe','errorCanaryLeaks',0],
    [9,'guarded','errorCanaryLeaks',1],
    [9,'unsafe','actualHeaderCaptures',1],
    [7,'unsafe','actualEnvironmentReads',1],
    [8,'unsafe','actualFilesystemReads',1],
    [0,'guarded','externalRequests',1],
    [0,'guarded','requests',2]
  ];
  for(const [i,mode,key,value] of changes){
    const rows=good();
    rows[i][mode][key]=value;
    const result=summarizeCommunityAttackFamilies(rows);
    assert.equal(result.status,'FAIL',i+':'+mode+'.'+key);
    assert.equal(result.exitCode,1,i+':'+mode+'.'+key);
    assert.equal(result.matched,9,i+':'+mode+'.'+key);
    assert.deepEqual(result.cases[i].mismatchedWitnessFields,[mode+'.'+key]);
  }
});

test('M23-B: sparse, swapped, accessors and extraneous private data cannot forge match',()=>{
  for(const bad of [null,[],{},['PRIVATE_CANARY']]){
    const r=summarizeCommunityAttackFamilies(bad);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const reordered=good();
  [reordered[0],reordered[1]]=[reordered[1],reordered[0]];
  assert.equal(summarizeCommunityAttackFamilies(reordered).status,'FAIL');
  const missing=good();
  delete missing[4];
  assert.equal(summarizeCommunityAttackFamilies(missing).status,'FAIL');
  const extra=good();
  extra.push(good()[0]);
  assert.equal(summarizeCommunityAttackFamilies(extra).status,'FAIL');
  const fake=good();
  let executed=0;
  Object.defineProperty(fake[7].unsafe,'errorCanaryLeaks',{
    enumerable:true,get(){executed++;throw Error('PRIVATE_CANARY');}
  });
  const result=summarizeCommunityAttackFamilies(fake);
  assert.equal(result.status,'FAIL');
  assert.equal(result.matched,9);
  assert.equal(executed,0);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  const irrelevant=good();
  irrelevant[7].guarded.rawSecret='PRIVATE_CANARY';
  const output=summarizeCommunityAttackFamilies(irrelevant);
  assert.equal(output.status,'PASS');
  assert.ok(!JSON.stringify(output).includes('PRIVATE_CANARY'));
});

test('M23-A: actual first-party differential code witnesses exposed and guarded outcomes',()=>{
  const r=runCommunityAttackFamilies();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.checked,10);
  assert.equal(r.matched,10);
  assert.equal(r.sourceAuthoredToyOnly,true);
  assert.deepEqual(r,runCommunityAttackFamilies(),'stateless repeat');
});

test('M23-C: no-argument CLI, fixed report, no canary or caller data echo',()=>{
  const ok=cli();
  assert.equal(ok.error,undefined);
  assert.equal(ok.status,0,ok.stderr||ok.stdout);
  assert.equal(ok.stderr,'');
  const result=JSON.parse(ok.stdout);
  assert.equal(result.status,'PASS');
  assert.equal(result.matched,10);
  for(const text of [
    'SYNTHETIC_ENV_CANARY_NEVER_REAL',
    'SYNTHETIC_PATH_CANARY_NEVER_REAL',
    'SYNTHETIC_HEADERS_CANARY_NEVER_REAL',
    'ticket.status','fictional-alpha','fictional-beta',
    'Authorization:','PRIVATE_CANARY'
  ])assert.ok(!ok.stdout.includes(text),text);
  for(const arg of [
    '--target=https://secret.invalid/mcp',
    '--env=PRIVATE_CANARY','--headers=Authorization:Private',
    '--server=customer','--filename=private.env'
  ]){
    const bad=cli(arg);
    assert.equal(bad.status,2,arg);
    assert.equal(bad.stderr,'');
    const out=JSON.parse(bad.stdout);
    assert.equal(out.status,'ERROR');
    assert.equal(out.ruleCode,'COMMUNITY_FAMILY_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});

test('M23-C: no real system APIs and no change to unpublished 80-path candidate',()=>{
  const source=readFileSync(new URL('../tools/m23-community-attack-families.mjs',
    import.meta.url),'utf8');
  const manifest=JSON.parse(readFileSync(new URL('../package.json',
    import.meta.url),'utf8'));
  const expectedFiles=JSON.parse(readFileSync(
    new URL('./expected-package-files.json',import.meta.url),'utf8'));
  assert.equal(expectedFiles.length,80);
  assert.ok(!expectedFiles.some(p=>p.includes('m23-community')));
  assert.ok(!manifest.files.includes('tools'));
  assert.ok(!manifest.files.includes('.github'));
  assert.doesNotMatch(source,/from ['"]node:(?:fs|https?|net|child_process|os|worker_threads)['"]/);
  assert.doesNotMatch(source,/\bprocess\.env\b|\bfetch\s*\(|\bspawn\s*\(|\bexecFile\s*\(/);
  // These are fixed, structured FICTIONAL strings, never runtime values.
  assert.match(source,/MOCK_SETTING=SYNTHETIC_ENV_CANARY_NEVER_REAL/);
  assert.match(source,/\/fictional\/workspace\/SYNTHETIC_PATH_CANARY_NEVER_REAL/);
  assert.match(source,/x-fictional-request: demo; authorization: FictionalOnly/);
  assert.match(source,/jsonrpc:'2\.0',id:'synthetic-error-only'/);
  assert.match(source,/error:\{code:-32000,message:rendered\}/);
});
