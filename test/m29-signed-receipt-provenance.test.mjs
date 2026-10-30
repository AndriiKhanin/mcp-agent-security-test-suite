/** M29 — source-owned cryptographic authenticity is NOT actual effect truth. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,sign,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  inspectOwnedReceipt,runSignedReceiptProvenanceLab,
  summarizeSignedReceiptProvenance
} from '../tools/m29-signed-receipt-provenance.mjs';

const ROWS=[
  ['SIGNED_TRUE_COMPLETE',1,true,true,true,true,1,0,0],
  ['SIGNED_FALSE_COMPLETE',0,true,true,true,true,1,1,0],
  ['SIGNED_TRUE_NO_EFFECT',0,true,true,true,true,1,0,0],
  ['SIGNED_FALSE_NO_EFFECT',1,true,true,true,true,1,0,1],
  ['TAMPERED_OUTCOME',1,false,true,true,true,0,0,0],
  ['WRONG_OPERATION',1,true,false,true,true,0,0,0],
  ['WRONG_MARKER',1,true,false,true,true,0,0,0],
  ['WRONG_EPOCH',1,true,false,true,true,0,0,0],
  ['EXPIRED',1,true,true,false,true,0,0,0],
  ['UNTRUSTED_SIGNER_KEY',1,false,true,true,true,0,0,0],
  ['REPLAYED_NONCE',1,true,true,true,false,1,0,0],
  ['UNSIGNED_CLAIM',1,false,true,true,true,0,0,0]
];
const observations=()=>ROWS.map(([id,world,signature,binding,window,
  unused,unsafe,loss,duplicate])=>({
  id,signatureVerified:signature,bindingMatched:binding,
  withinLogicalWindow:window,nonceUnused:unused,
  externalTrustEstablished:false,externalEffectTruthEstablished:false,
  guardedReleaseAuthorized:false,guardedDisposition:'QUARANTINE',
  guardedTransitions:0,unsafeSignatureOnlyTransitions:unsafe,
  unsafeLostOperations:loss,unsafeDuplicateEffects:duplicate,
  originalSyntheticEffects:world,independentNewKeyAllowed:true,
  ephemeralOnly:true
}));
const cli=(...args)=>spawnSync(process.execPath,
  ['tools/m29-signed-receipt-provenance.mjs',...args],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),
    encoding:'utf8',shell:false,windowsHide:true,timeout:20000,maxBuffer:65536
  });
const PENDING='FICTIONAL-IN-DOUBT-V1\n';
const FIELDS=['schemaVersion','issuer','operation','markerDigest','epoch',
  'nonce','outcome','notBeforeTick','expiresAtTick'];
function signed(keys,overrides={}){
  const payload={
    schemaVersion:1,issuer:'FICTIONAL_OBSERVER_A',
    operation:'fictional-operation-alpha',
    markerDigest:createHash('sha256').update(PENDING).digest('hex'),
    epoch:3,nonce:randomBytes(16).toString('hex'),
    outcome:'EFFECT_COMMITTED',notBeforeTick:4,expiresAtTick:10,
    ...overrides
  };
  const bytes=Buffer.from(JSON.stringify(Object.fromEntries(
    FIELDS.map(k=>[k,payload[k]]))));
  return {payload,signature:sign(null,bytes,keys.privateKey).toString('base64')};
}
test('M29-A: real ephemeral Ed25519 receipts remain quarantined without provenance',()=>{
  const report=runSignedReceiptProvenanceLab();
  assert.equal(report.status,'PASS',JSON.stringify(report));
  assert.equal(report.matched,12);
  assert.equal(report.checked,12);
  assert.equal(report.observedUnsafeSignedClaimLosses,1);
  assert.equal(report.observedUnsafeSignedClaimDuplicates,1);
  assert.equal(report.guardedQuarantinedCases,12);
  assert.equal(report.independentlyAuthenticatedSigner,false);
  assert.equal(report.actualEffectReconciled,false);
  assert.equal(report.exactlyOnceProven,false);
  assert.equal(report.realAgentTested,false);
  assert.equal(report.externalMcpContacted,false);
  assert.equal(report.cases[1].finding,'SIGNED_CLAIM_CAN_LOSE_OPERATION');
  assert.equal(report.cases[3].finding,'SIGNED_CLAIM_CAN_DUPLICATE_EFFECT');
  assert.equal(runSignedReceiptProvenanceLab().status,'PASS');
});

test('M29-B: independently authored result oracle rejects any forged success',()=>{
  const r=summarizeSignedReceiptProvenance(observations());
  assert.equal(r.status,'PASS');
  assert.equal(r.matched,12);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.cases));
  const mutations=[
    [0,'signatureVerified',false],
    [1,'unsafeLostOperations',0],
    [3,'unsafeDuplicateEffects',0],
    [4,'signatureVerified',true],
    [5,'bindingMatched',true],
    [6,'bindingMatched',true],
    [7,'bindingMatched',true],
    [8,'withinLogicalWindow',true],
    [9,'signatureVerified',true],
    [10,'nonceUnused',true],
    [11,'signatureVerified',true],
    [2,'guardedTransitions',1],
    [2,'guardedReleaseAuthorized',true],
    [0,'externalTrustEstablished',true],
    [1,'externalEffectTruthEstablished',true],
    [3,'guardedDisposition','SPENT'],
    [0,'unsafeSignatureOnlyTransitions',0],
    [4,'unsafeSignatureOnlyTransitions',1],
    [10,'unsafeSignatureOnlyTransitions',0],
    [11,'ephemeralOnly',false],
    [9,'independentNewKeyAllowed',false]
  ];
  for(const [index,key,value]of mutations){
    const altered=observations();
    altered[index][key]=value;
    const x=summarizeSignedReceiptProvenance(altered);
    assert.equal(x.status,'FAIL',index+':'+key);
    assert.equal(x.exitCode,1);
    assert.equal(x.matched,11,index+':'+key);
    assert.deepEqual(x.cases[index].mismatchedWitnessFields,[key]);
  }
});

test('M29-B: sparse, swapped and getter-bearing observations fail closed',()=>{
  for(const invalid of [null,[],{},[null]]){
    const r=summarizeSignedReceiptProvenance(invalid);
    assert.equal(r.status,'FAIL');
    assert.equal(r.matched,0);
  }
  const bad=observations();
  delete bad[4];
  assert.equal(summarizeSignedReceiptProvenance(bad).status,'FAIL');
  const extra=observations();extra.push(observations()[0]);
  assert.equal(summarizeSignedReceiptProvenance(extra).status,'FAIL');
  const swapped=observations();
  [swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.equal(summarizeSignedReceiptProvenance(swapped).status,'FAIL');
  let getterCalls=0;
  const getter=observations();
  Object.defineProperty(getter[0],'signatureVerified',{
    enumerable:true,get(){getterCalls++;throw Error('PRIVATE_CANARY');}
  });
  const r=summarizeSignedReceiptProvenance(getter);
  assert.equal(r.status,'FAIL');
  assert.equal(getterCalls,0);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_CANARY'));
});

test('M29-A: actual crypto verifies bytes and rejects tamper, wrong keys and replay',()=>{
  const keys=generateKeyPairSync('ed25519');
  const attacker=generateKeyPairSync('ed25519');
  const receipt=signed(keys);
  const yes=inspectOwnedReceipt(receipt,keys.publicKey,new Set());
  assert.equal(yes.cryptographicSignatureVerified,true);
  assert.equal(yes.bindingMatched,true);
  assert.equal(yes.withinLogicalWindow,true);
  assert.equal(yes.nonceUnused,true);
  assert.equal(yes.cryptographicallyEligible,true);
  assert.equal(yes.reason,'EXTERNAL_EFFECT_PROVENANCE_NOT_VERIFIED');
  assert.equal(yes.guardedReleaseAuthorized,false);
  assert.equal(yes.externalEffectTruthEstablished,false);
  const wrong=inspectOwnedReceipt(receipt,attacker.publicKey,new Set());
  assert.equal(wrong.cryptographicSignatureVerified,false);
  assert.equal(wrong.reason,'SIGNATURE_NOT_VERIFIED');
  const replay=inspectOwnedReceipt(receipt,keys.publicKey,
    new Set([receipt.payload.nonce]));
  assert.equal(replay.cryptographicSignatureVerified,true);
  assert.equal(replay.nonceUnused,false);
  assert.equal(replay.reason,'NONCE_ALREADY_USED');
  assert.equal(replay.guardedReleaseAuthorized,false);
  const tampered=structuredClone(receipt);
  tampered.payload.outcome='NO_EFFECT_OBSERVED';
  assert.equal(inspectOwnedReceipt(tampered,keys.publicKey)
    .cryptographicSignatureVerified,false);
  for(const patch of [
    {operation:'fictional-operation-beta'},
    {markerDigest:'0'.repeat(64)},{epoch:4}
  ]){
    const signedWrong=signed(keys,patch);
    const out=inspectOwnedReceipt(signedWrong,keys.publicKey);
    assert.equal(out.cryptographicSignatureVerified,true);
    assert.equal(out.bindingMatched,false);
    assert.equal(out.reason,'OPERATION_BINDING_REJECTED');
  }
  const expired=inspectOwnedReceipt(signed(keys,{expiresAtTick:7}),
    keys.publicKey);
  assert.equal(expired.cryptographicSignatureVerified,true);
  assert.equal(expired.withinLogicalWindow,false);
  assert.equal(expired.reason,'LOGICAL_WINDOW_REJECTED');
});

test('M29-B: malformed signed payload and malicious JS getters never authorize',()=>{
  const keys=generateKeyPairSync('ed25519');
  const intact=signed(keys);
  const malformed=[null,{},[],{payload:intact.payload,signature:''},
    {...intact,signature:'PRIVATE_CANARY'},
    {...intact,payload:{...intact.payload,private:'PRIVATE_CANARY'}},
    {...intact,payload:{...intact.payload,nonce:'PRIVATE_CANARY'}}];
  for(const item of malformed){
    const result=inspectOwnedReceipt(item,keys.publicKey);
    assert.equal(result.cryptographicSignatureVerified,false);
    assert.equal(result.guardedReleaseAuthorized,false);
    assert.equal(result.guardedDisposition,'QUARANTINE');
    assert.ok(!JSON.stringify(result).includes('PRIVATE_CANARY'));
  }
  let calls=0;
  const getter=structuredClone(intact);
  Object.defineProperty(getter.payload,'outcome',{enumerable:true,get(){
    calls++;throw Error('PRIVATE_CANARY');
  }});
  const rejected=inspectOwnedReceipt(getter,keys.publicKey);
  assert.equal(rejected.cryptographicSignatureVerified,false);
  assert.equal(calls,0);
});

test('M29-C: no-input CLI is safe and does not print signatures or private data',()=>{
  const good=cli();
  assert.equal(good.error,undefined);
  assert.equal(good.status,0,good.stderr||good.stdout);
  assert.equal(good.stderr,'');
  const report=JSON.parse(good.stdout);
  assert.equal(report.status,'PASS');
  assert.equal(report.matched,12);
  for(const literal of ['FICTIONAL-IN-DOUBT-V1',
    'fictional-operation-alpha','FICTIONAL_OBSERVER_A',
    'PRIVATE_CANARY','BEGIN PRIVATE KEY',
    'BEGIN PUBLIC KEY','https://']){
    assert.ok(!good.stdout.includes(literal),literal);
  }
  for(const arg of ['--target=https://example.invalid/mcp',
    '--signer-key=PRIVATE_CANARY','--trust-every-signature',
    '--user-file=PRIVATE_CANARY','--release-claim']){
    const result=cli(arg);
    assert.equal(result.status,2,arg);
    assert.equal(result.stderr,'');
    const out=JSON.parse(result.stdout);
    assert.equal(out.ruleCode,'SIGNED_RECEIPT_ARGUMENTS_NOT_ALLOWED');
    assert.equal(out.externalTrustEstablished,false);
    assert.ok(!(result.stdout+result.stderr).includes(arg));
  }
});

test('M29-C: source-only helper cannot alter frozen npm release inventory',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',
    import.meta.url),'utf8'));
  const inventory=JSON.parse(readFileSync(new URL(
    './expected-package-files.json',import.meta.url),'utf8'));
  assert.equal(inventory.length,80);
  assert.ok(!inventory.includes('tools/m29-signed-receipt-provenance.mjs'));
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('test'));
});
