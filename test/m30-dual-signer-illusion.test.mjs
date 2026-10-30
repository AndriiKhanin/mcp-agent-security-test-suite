/** M30 — source-owned dual Ed25519 quorum must not masquerade as effect proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {inspectOwnedPair,runDualSignerLab,summarizeDualSignerLab}
  from '../tools/m30-dual-signer-illusion.mjs';

const specs=[
  ['TWO_TRUE_COMPLETE',1,1,1,0,0],
  ['TWO_FALSE_COMPLETE',0,1,0,1,0],
  ['TWO_TRUE_NO_EFFECT',0,1,1,0,0],
  ['TWO_FALSE_NO_EFFECT',1,1,2,0,1],
  ['SIGNED_CONFLICT',1,0,1,0,0],
  ['ONE_SIGNATURE_TAMPERED',1,0,1,0,0],
  ['ROGUE_SECOND_KEY',1,0,1,0,0],
  ['REUSED_SECOND_NONCE',1,0,1,0,0],
  ['DUPLICATED_SIGNER_KEY',1,0,1,0,0],
  ['WRONG_SECOND_OPERATION',1,0,1,0,0],
  ['WRONG_SECOND_EPOCH',1,0,1,0,0],
  ['EXPIRED_SECOND',1,0,1,0,0],
  ['SECOND_UNSIGNED',1,0,1,0,0],
  ['REWRITTEN_SECOND_CLAIM',1,0,1,0,0]
];
function observation([id,world,quorum,effects,loss,duplicate]){
  return {
    id,firstSignatureVerified:true,
    secondSignatureVerified:![
      'ONE_SIGNATURE_TAMPERED','ROGUE_SECOND_KEY','SECOND_UNSIGNED',
      'REWRITTEN_SECOND_CLAIM'
    ].includes(id),
    firstBindingMatched:true,
    secondBindingMatched:![
      'WRONG_SECOND_OPERATION','WRONG_SECOND_EPOCH'
    ].includes(id),
    firstLogicalWindowValid:true,
    secondLogicalWindowValid:id!=='EXPIRED_SECOND',
    firstNonceUnused:true,
    secondNonceUnused:id!=='REUSED_SECOND_NONCE',
    distinctSignerKeys:id!=='DUPLICATED_SIGNER_KEY',
    claimsAgree:!['SIGNED_CONFLICT','REWRITTEN_SECOND_CLAIM']
      .includes(id),
    sourceOwnedCryptoQuorum:Boolean(quorum),
    independentSignerTrustEstablished:false,
    authenticatedRealEffectProven:false,
    guardedReleaseAuthorized:false,
    guardedDisposition:'QUARANTINE',
    guardedTransitions:0,
    originalSyntheticEffects:world,
    unsafeQuorumOnlyTransitions:quorum,
    unsafeSyntheticEffects:effects,
    unsafeLostOperations:loss,
    unsafeDuplicateEffects:duplicate,
    freshIndependentKeyAllowed:true,
    sourceOwnedEphemeralKeysOnly:true
  };
}
const observations=()=>specs.map(observation);
const cli=(...args)=>spawnSync(process.execPath,[
  'tools/m30-dual-signer-illusion.mjs',...args
],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),
  encoding:'utf8',shell:false,windowsHide:true,timeout:30000,
  maxBuffer:65536
});
const orderedKeys=['schemaVersion','issuer','operation','markerDigest',
  'epoch','nonce','outcome','notBeforeTick','expiresAtTick'];
function receipt(keys,issuer,outcome='EFFECT_COMMITTED'){
  const payload={
    schemaVersion:1,issuer,operation:'fictional-operation-alpha',
    markerDigest:createHash('sha256').update('FICTIONAL-IN-DOUBT-V1\n')
      .digest('hex'),
    epoch:3,nonce:randomBytes(16).toString('hex'),
    outcome,notBeforeTick:4,expiresAtTick:10
  };
  const bytes=Buffer.from(JSON.stringify(Object.fromEntries(
    orderedKeys.map(k=>[k,payload[k]])
  )));
  const signature=sign(null,bytes,keys.privateKey).toString('base64');
  return {payload,signature};
}

test('M30-A: 14 separate first-party crypto/quorum cases match exact independent oracle',()=>{
  const r=runDualSignerLab();
  assert.equal(r.status,'PASS',JSON.stringify(r));
  assert.equal(r.checked,14);
  assert.equal(r.matched,14);
  assert.equal(r.failed,0);
  assert.equal(r.sourceOwnedAgreedSignedReceipts,4);
  assert.equal(r.guardedCasesQuarantined,14);
  assert.equal(r.intentionalUnsafeLostOperations,1);
  assert.equal(r.intentionalUnsafeDuplicateEffects,1);
  assert.equal(r.cases[1].finding,
    'AGREED_SIGNED_LIE_LOSES_UNPERFORMED_ACTION');
  assert.equal(r.cases[3].finding,
    'AGREED_SIGNED_LIE_DUPLICATES_EFFECT');
  assert.equal(r.independentSignerTrustEstablished,false);
  assert.equal(r.realEffectReconciled,false);
  assert.equal(r.exactlyOnceProven,false);
  assert.equal(r.externalMcpContacted,false);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
  assert.equal(runDualSignerLab().status,'PASS','new ephemeral keys every run');
});

test('M30-B: independent 14-case witness oracle rejects forged safety signals',()=>{
  const base=summarizeDualSignerLab(observations());
  assert.equal(base.status,'PASS');
  assert.deepEqual(base.cases.map(x=>x.id),specs.map(x=>x[0]));
  const changes=[
    [0,'firstSignatureVerified',false],
    [1,'unsafeLostOperations',0],
    [3,'unsafeDuplicateEffects',0],
    [1,'unsafeQuorumOnlyTransitions',0],
    [2,'unsafeSyntheticEffects',0],
    [4,'claimsAgree',true],
    [5,'secondSignatureVerified',true],
    [6,'secondSignatureVerified',true],
    [7,'secondNonceUnused',true],
    [8,'distinctSignerKeys',true],
    [9,'secondBindingMatched',true],
    [10,'secondBindingMatched',true],
    [11,'secondLogicalWindowValid',true],
    [12,'secondSignatureVerified',true],
    [13,'secondSignatureVerified',true],
    [13,'claimsAgree',true],
    [1,'guardedReleaseAuthorized',true],
    [3,'guardedTransitions',1],
    [4,'guardedDisposition','SPENT'],
    [0,'independentSignerTrustEstablished',true],
    [2,'authenticatedRealEffectProven',true],
    [6,'sourceOwnedCryptoQuorum',true],
    [7,'freshIndependentKeyAllowed',false],
    [8,'sourceOwnedEphemeralKeysOnly',false]
  ];
  for(const [i,key,value] of changes){
    const changed=observations();
    changed[i][key]=value;
    const result=summarizeDualSignerLab(changed);
    assert.equal(result.status,'FAIL',i+':'+key);
    assert.equal(result.exitCode,1);
    assert.equal(result.matched,13,i+':'+key);
    assert.deepEqual(result.cases[i].mismatchedWitnessFields,[key]);
  }
});

test('M30-B: sparse, swapped, malicious getters, unsupported fields stay inert',()=>{
  for(const invalid of [null,[],{},[null]]){
    const r=summarizeDualSignerLab(invalid);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const sparse=observations();
  delete sparse[4];
  assert.equal(summarizeDualSignerLab(sparse).status,'FAIL');
  const swapped=observations();
  [swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.equal(summarizeDualSignerLab(swapped).status,'FAIL');
  const extra=observations();
  extra.push(observations()[0]);
  assert.equal(summarizeDualSignerLab(extra).status,'FAIL');
  let called=0;
  const getter=observations();
  Object.defineProperty(getter[1],'unsafeLostOperations',{
    enumerable:true,get(){
      called++;throw Error('PRIVATE_CANARY');
    }
  });
  const result=summarizeDualSignerLab(getter);
  assert.equal(result.status,'FAIL');
  assert.equal(called,0);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  const irrelevant=observations();
  irrelevant[3].secret='PRIVATE_CANARY';
  const safe=summarizeDualSignerLab(irrelevant);
  assert.equal(safe.status,'PASS');
  assert.ok(!JSON.stringify(safe).includes('PRIVATE_CANARY'));
});

test('M30-A: real crypto checks two trusted keys, forged signer and forged evidence bit',()=>{
  const a=generateKeyPairSync('ed25519');
  const b=generateKeyPairSync('ed25519');
  const c=generateKeyPairSync('ed25519');
  const first=receipt(a,'FICTIONAL_SIGNER_A');
  const second=receipt(b,'FICTIONAL_SIGNER_B');
  const ok=inspectOwnedPair([first,second],[a.publicKey,b.publicKey]);
  assert.equal(ok.firstSignatureVerified,true);
  assert.equal(ok.secondSignatureVerified,true);
  assert.equal(ok.distinctSignerKeys,true);
  assert.equal(ok.claimsAgree,true);
  assert.equal(ok.sourceOwnedCryptoQuorum,true);
  assert.equal(ok.guardedReleaseAuthorized,false);
  assert.equal(ok.authenticatedRealEffectProven,false);
  assert.equal(ok.guardedDisposition,'QUARANTINE');
  const liar={...second,payload:{...second.payload,
    authenticatedRealEffectProven:true}};
  assert.equal(inspectOwnedPair([first,liar],[a.publicKey,b.publicKey])
    .sourceOwnedCryptoQuorum,false);
  const rogue=inspectOwnedPair([first,second],[a.publicKey,c.publicKey]);
  assert.equal(rogue.secondSignatureVerified,false);
  assert.equal(rogue.sourceOwnedCryptoQuorum,false);
  const alias=receipt(a,'FICTIONAL_SIGNER_B');
  const fakeQuorum=inspectOwnedPair([first,alias],[a.publicKey,a.publicKey]);
  assert.equal(fakeQuorum.firstSignatureVerified,true);
  assert.equal(fakeQuorum.secondSignatureVerified,true);
  assert.equal(fakeQuorum.distinctSignerKeys,false);
  assert.equal(fakeQuorum.sourceOwnedCryptoQuorum,false);
  const used=inspectOwnedPair([first,second],[a.publicKey,b.publicKey],
    new Set([second.payload.nonce]));
  assert.equal(used.secondNonceUnused,false);
  assert.equal(used.sourceOwnedCryptoQuorum,false);
  let getters=0;
  const altered={...second};
  Object.defineProperty(altered,'signature',{
    enumerable:true,get(){
      getters++;throw Error('PRIVATE_CANARY');
    }
  });
  const rejected=inspectOwnedPair([first,altered],[a.publicKey,b.publicKey]);
  assert.equal(rejected.secondSignatureVerified,false);
  assert.equal(rejected.sourceOwnedCryptoQuorum,false);
  assert.equal(getters,0);
});

test('M30-C: fixed CLI rejects args, never echoes keys/signatures or fake outcome',()=>{
  const good=cli();
  assert.equal(good.error,undefined);
  assert.equal(good.status,0,good.stderr||good.stdout);
  assert.equal(good.stderr,'');
  const report=JSON.parse(good.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.checked,14);
  assert.equal(report.matched,14);
  for(const forbidden of ['FICTIONAL_SIGNER_A','fictional-operation-alpha',
    'FICTIONAL-IN-DOUBT','privateKey','PUBLIC KEY','PRIVATE KEY',
    'NO_EFFECT_OBSERVED','EFFECT_COMMITTED','PRIVATE_CANARY']){
    assert.ok(!good.stdout.includes(forbidden),forbidden);
  }
  for(const argument of ['--target=https://example.invalid/mcp',
    '--key=PRIVATE_CANARY','--operator=owner','--approve',
    '../user/credentials']){
    const bad=cli(argument);
    assert.equal(bad.status,2,argument);
    assert.equal(bad.stderr,'');
    const result=JSON.parse(bad.stdout);
    assert.equal(result.status,'ERROR');
    assert.equal(result.ruleCode,'DUAL_SIGNER_ARGUMENTS_NOT_ALLOWED');
    assert.ok(!(bad.stdout+bad.stderr).includes(argument));
  }
});

test('M30-C: source-only output excluded from unpublished npm 80-file package',()=>{
  const pkg=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  const inventory=JSON.parse(readFileSync(
    fileURLToPath(new URL('./expected-package-files.json',import.meta.url)),
    'utf8'));
  assert.equal(inventory.length,80);
  assert.ok(!inventory.includes('tools/m30-dual-signer-illusion.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
  assert.ok(!pkg.files.includes('.github'));
});
