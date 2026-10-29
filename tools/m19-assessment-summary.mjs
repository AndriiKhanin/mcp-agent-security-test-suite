#!/usr/bin/env node
/**
 * M19: single command for first-party source-owned evidence, NOT a security
 * certification. Four owned localhost-wire labs + one M18 symbolic evaluator.
 * No subprocess, user target, credentials, shell, real LLM or Stable Bridge.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOwnedRedteamLab} from './owned-redteam-lab.mjs';
import {runOwnedAttackMatrix} from './owned-attack-matrix.mjs';
import {runPermissionReplayLab} from './m16-permission-replay-lab.mjs';
import {runConcurrentReplayLab} from './m17-concurrent-replay-lab.mjs';
import {runSymbolicBenchmark} from './m18-symbolic-evaluation.mjs';

const m15=['BASELINE','EXPOSED','SERVER_BOUNDARY','CLIENT_BOUNDARY'];
const m16a=['FORGED_UNSAFE','FORGED_GUARDED','REPLAY_UNSAFE',
  'REPLAY_GUARDED','REPLAY_FRESH_GUARDED','TAMPER_UNSAFE','TAMPER_GUARDED'];
const m16b=['FRESH_BOUND','REPLAY','WRONG_PROJECT','WRONG_TOOL',
  'WRONG_RESOURCE','EXPIRED','REVOKED','FORGED_TOKEN','FORGED_APPROVAL'];
const m17=['UNSAFE_SAME_KEY','GUARDED_SAME_KEY','GUARDED_DISTINCT_KEY'];
const m18=Array.from({length:32},(_,i)=>
  (i<16?'CLEAN_':'INJECTED_')+String(i%16).padStart(2,'0'));
const SPEC=Object.freeze([
  Object.freeze({id:'M15_OWNED_REDTEAM',scope:'OWNED_LOCALHOST_WIRE',
    checked:4,rule:'SYNTHETIC_DIFFERENTIAL_WITNESSED',
    profile:'owned-redteam-differential-v1',cases:Object.freeze(m15),
    field:'finding',expected:Object.freeze([
      'AUTHORIZED_ONLY_BASELINE','DETECTED_SYNTHETIC_UNSAFE_EFFECT',
      'SERVER_REJECTED_UNAUTHORIZED_CALL',
      'CLIENT_IGNORED_UNTRUSTED_INSTRUCTION'
    ]),realField:'realAgentTested',externalField:'noExternalTarget',
    externalValue:true}),
  Object.freeze({id:'M16_OWNED_ATTACK_MATRIX',scope:'OWNED_LOCALHOST_WIRE',
    checked:7,rule:'SEVEN_DIFFERENTIAL_WITNESSES_MATCH',
    profile:'owned-attack-matrix-v1',cases:Object.freeze(m16a),
    field:'verdict',expected:Object.freeze(m16a.map(id=>
      id.endsWith('UNSAFE')?'INTENTIONAL_SYNTHETIC_VIOLATION_WITNESSED':
        'SOURCE_OWNED_BOUNDARY_ENFORCED')),
    realField:'realAgentTested',externalField:'noExternalTarget',
    externalValue:true}),
  Object.freeze({id:'M16_PERMISSION_REPLAY',scope:'OWNED_LOCALHOST_WIRE',
    checked:9,rule:'FICTIONAL_PERMISSION_DIFFERENTIAL_WITNESSED',
    profile:'owned-permission-replay-differential-v1',cases:Object.freeze(m16b),
    field:'expectedDisposition',expected:Object.freeze(m16b.map(id=>
      id==='FRESH_BOUND'?'LEGITIMATE_EFFECT_ALLOWED':
        'UNSAFE_PERMISSIVE_EFFECT_WITNESSED')),
    realField:'realAgentTested',externalField:'externalMcpContacted',
    externalValue:false}),
  Object.freeze({id:'M17_CONCURRENT_REPLAY',scope:'OWNED_LOCALHOST_WIRE',
    checked:3,rule:'CONCURRENT_REPLAY_DIFFERENTIAL_WITNESSED',
    profile:'first-party-concurrent-replay-differential-v1',
    cases:Object.freeze(m17),field:'verdict',expected:Object.freeze([
      'INTENTIONAL_CONCURRENT_DOUBLE_EFFECT_DETECTED',
      'SAME_KEY_ATOMIC_RESERVATION_DENIED_REPLAY',
      'DISTINCT_KEYS_BOTH_ADMITTED'
    ]),realField:'realAgentBehaviorObserved',
    externalField:'externalMcpContacted',externalValue:false}),
  Object.freeze({id:'M18_SYMBOLIC_CLASSIFICATION',scope:'AUTHOR_CONTROLLED_SYMBOLIC',
    checked:32,rule:'SYMBOLIC_BENCHMARK_REFERENCE_MATCH',
    profile:'first-party-symbolic-evaluation-matrix-v1',cases:Object.freeze(m18),
    field:'groundTruth',expected:Object.freeze(m18.map((id,i)=>{
      const mask=i%16;
      return mask&14?'ATTACK':i===1||i===16?'INSUFFICIENT':'BENIGN';
    })),realField:'realAgentBehaviorObserved',
    externalField:'externalMcpContacted',externalValue:false})
]);
const sources=Object.freeze([
  runOwnedRedteamLab,runOwnedAttackMatrix,runPermissionReplayLab,
  runConcurrentReplayLab,runSymbolicBenchmark
]);
function field(obj,key){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
      Object.getPrototypeOf(obj)!==Object.prototype)return undefined;
  const desc=Object.getOwnPropertyDescriptor(obj,key);
  return desc?.enumerable&&Object.hasOwn(desc,'value')?desc.value:undefined;
}
function dense(a,n){
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||
     a.length!==n)return null;
  const d=Object.getOwnPropertyDescriptors(a);
  if(Reflect.ownKeys(d).length!==n+1||d.length?.value!==n)return null;
  for(let i=0;i<n;i++){
    const x=d[String(i)];
    if(!x?.enumerable||!Object.hasOwn(x,'value'))return null;
  }
  return d;
}
const noArgs=a=>!!dense(a,0);
const bad=code=>Object.freeze({
  reportSchemaVersion:1,profile:'m19-first-party-assessment-v1',
  status:'ERROR',exitCode:2,ruleCode:code,
  realAgentBehaviorObserved:false,externalMcpContacted:false,
  realWorldAttackAccuracyMeasured:false,independentBetaVerified:false,
  securityCertified:false
});
function checkSuite(spec,report){
  const mismatches=[];
  const require=(key,expected)=>{
    if(field(report,key)!==expected)mismatches.push(key);
  };
  require('reportSchemaVersion',1);
  require('profile',spec.profile);
  require('status','PASS');
  require('exitCode',0);
  require('ruleCode',spec.rule);
  require('checked',spec.checked);
  require('matched',spec.checked);
  require('failed',0);
  require(spec.realField,false);
  require(spec.externalField,spec.externalValue);
  require('independentBetaVerified',false);
  require('securityCertified',false);
  const cases=field(report,'cases');
  const desc=dense(cases,spec.checked);
  if(!desc)mismatches.push('cases.shape');
  else for(let i=0;i<spec.checked;i++){
    const row=desc[String(i)].value;
    if(field(row,'id')!==spec.cases[i])mismatches.push('cases.id');
    if(field(row,'matched')!==true)mismatches.push('cases.matched');
    if(field(row,spec.field)!==spec.expected[i])
      mismatches.push('cases.classification');
    if(spec.id==='M18_SYMBOLIC_CLASSIFICATION'){
      const label=spec.expected[i]==='ATTACK'?'ALERT':
        spec.expected[i]==='BENIGN'?'CLEAR':'ABSTAIN';
      if(field(row,'observedClassification')!==label)
        mismatches.push('cases.observedClassification');
    }
  }
  if(spec.id==='M18_SYMBOLIC_CLASSIFICATION'){
    require('realWorldErrorRatesMeasured',false);
    require('corpusProvenance','SOURCE_AUTHORED_COMBINATORIAL_VARIANTS');
    require('oracleProvenance','SOURCE_AUTHORED_INDEPENDENT_CLASSIFICATION');
    const metrics=field(report,'metrics');
    for(const [key,val] of Object.entries({
      checked:32,actualAttacks:28,actualBenign:2,
      actualInsufficient:2,truePositives:28,trueNegatives:2,
      falsePositives:0,falseNegatives:0,
      insufficientAbstentions:2,precision:1,recall:1,
      falsePositiveRate:0,falseNegativeRate:0,
      abstentionsCorrect:true
    })){
      if(field(metrics,key)!==val)mismatches.push('metrics.'+key);
    }
    const baselines=field(report,'baselines');
    if(field(field(baselines,'alwaysClear'),'falseNegatives')!==28)
      mismatches.push('baselines.alwaysClear');
    if(field(field(baselines,'alwaysAlert'),'falsePositives')!==2)
      mismatches.push('baselines.alwaysAlert');
    if(field(field(baselines,'naiveFailMeansAttack'),
      'unsupportedAttackClaims')!==2)
      mismatches.push('baselines.naiveFailMeansAttack');
  }else if(spec.id==='M15_OWNED_REDTEAM'){
    require('syntheticUnsafeEffectExpected',true);
    require('realFileReadPerformed',false);
  }else if(spec.id==='M16_OWNED_ATTACK_MATRIX'){
    require('intentionallyUnsafeCases',3);
    require('realFileReadPerformed',false);
  }else if(spec.id==='M16_PERMISSION_REPLAY'){
    require('expectedUnsafeCases',8);
    require('expectedGuardedSyntheticEffects',2);
    require('expectedPermissiveSyntheticEffects',10);
    require('realCredentialsUsed',false);
    require('localLoopbackOnly',true);
  }else if(spec.id==='M17_CONCURRENT_REPLAY'){
    require('intentionalUnsafeDoubleEffectExpected',true);
    require('realFilesystemActionPerformed',false);
    require('localLoopbackOnly',true);
  }
  return [...new Set(mismatches)];
}
/**
 * Pure independent source-authored audit of five existing first-party reports.
 * Never trusts nested PASS or its reported row count alone; never echoes
 * untrusted report values or attempts to run any payload.
 */
export function summarizeOwnedAssessment(reports){
  const desc=dense(reports,SPEC.length);
  const suites=SPEC.map((spec,i)=>{
    const input=desc?desc[String(i)].value:null;
    const mismatch=checkSuite(spec,input);
    return Object.freeze({
      id:spec.id,scope:spec.scope,
      checked:spec.checked,matched:mismatch.length===0,
      mismatchedWitnessFields:Object.freeze(mismatch)
    });
  });
  const matched=suites.filter(x=>x.matched).length;
  const valid=matched===SPEC.length;
  return Object.freeze({
    reportSchemaVersion:1,profile:'m19-first-party-assessment-v1',
    status:valid?'PASS':'FAIL',exitCode:valid?0:1,
    ruleCode:valid?'SOURCE_SEPARATED_EVIDENCE_MATCH':
      'FIRST_PARTY_EVIDENCE_MISMATCH',
    suiteCount:SPEC.length,suitesMatched:matched,
    ownedLocalhostWireCases:23,authorControlledSymbolicCases:32,
    sourceOwnedChecksTotal:55,
    suites:Object.freeze(suites),
    sourceOfEvidence:'FIRST_PARTY_CONTROLLED_SOURCE_AND_LOCALHOST_ONLY',
    realAgentBehaviorObserved:false,externalMcpContacted:false,
    realWorldAttackAccuracyMeasured:false,independentBetaVerified:false,
    independentSecurityAuditCompleted:false,externalTargetAuthorized:false,
    securityCertified:false,releaseAuthorized:false
  });
}
export async function runOwnedAssessment(args=[]){
  if(!noArgs(args))return bad('ASSESSMENT_ARGUMENTS_NOT_ALLOWED');
  try{
    const reports=[];
    for(const fn of sources)reports.push(await fn());
    return summarizeOwnedAssessment(reports);
  }catch{return bad('ASSESSMENT_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runOwnedAssessment(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
