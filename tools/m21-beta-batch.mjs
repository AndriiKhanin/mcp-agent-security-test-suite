#!/usr/bin/env node
/**
 * M21: privacy-minimal batch triage of fictional beta self-reports.
 * Inputs are SELF-ATTESTED, never an independent reviewer provenance proof.
 * Zero network, filesystem paths, MCP connections, LLMs or credentials.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../src/strict-json.mjs';
import {preflightBetaIntake} from './m20-beta-intake.mjs';

const PROFILE='m21-beta-batch-triage-v1';
const MAX_BYTES=16384;
const MIN_RECORDS=2,MAX_RECORDS=4;
const PATTERN_FIELDS=Object.freeze([
  'schemaVersion','publicSourceSha','candidateVersion',
  'operatingSystem','nodeMajor','runnerStatus','matchedControls',
  'evaluationPath','archiveOutcome','symbolicExitCodes',
  'guideClarity','usabilityFinding','personallyRanProtocol',
  'fictionalOnlyConfirmed','noSensitiveMaterialConfirmed'
]);
const PLATFORMS=Object.freeze([
  'WINDOWS_NODE20','WINDOWS_NODE22','UBUNTU_NODE20','UBUNTU_NODE22'
]);
const RULE_CATEGORY=Object.freeze({
  BETA_INTAKE_READY_FOR_MANUAL_TRIAGE:'NOMINAL',
  BETA_INTAKE_DEVIATION_READY_FOR_MANUAL_TRIAGE:'DEVIATION',
  BETA_INTAKE_BLOCKER_READY_FOR_MANUAL_TRIAGE:'BLOCKER',
  BETA_INTAKE_UNPINNED_SHA_MANUAL_REVIEW_REQUIRED:'REVISION_REVIEW',
  BETA_INTAKE_EXECUTION_NOT_SELF_ATTESTED:'NO_EXECUTION_CLAIM',
  BETA_INTAKE_INCONSISTENT_SELF_REPORT:'INCONSISTENT',
  BETA_INTAKE_INVALID_OR_UNSAFE_INPUT:'REJECTED',
  BETA_INTAKE_PUBLIC_SAFETY_CONFIRMATION_MISSING:'REJECTED'
});
const safe=(status,exitCode,ruleCode,fields={})=>Object.freeze({
  reportSchemaVersion:1,profile:PROFILE,status,exitCode,ruleCode,
  manualReviewRequired:true,independentBetaVerified:false,
  independentTestersVerified:0,sourceRevisionAuthenticated:false,
  realAgentBehaviorObserved:false,externalMcpContacted:false,
  externalSecurityAuditCompleted:false,releaseAuthorized:false,
  securityCertified:false,uniqueHumanCountUnknown:true,
  ...fields
});
const reject=code=>safe('ERROR',2,code);
function dense(array,min,max) {
  if(!Array.isArray(array)||Object.getPrototypeOf(array)!==Array.prototype||
     array.length<min||array.length>max)return null;
  const descriptors=Object.getOwnPropertyDescriptors(array);
  if(Reflect.ownKeys(descriptors).length!==array.length+1||
     descriptors.length?.value!==array.length)return null;
  for(let i=0;i<array.length;i++){
    const d=descriptors[String(i)];
    if(!d?.enumerable||!Object.hasOwn(d,'value'))return null;
  }
  return descriptors;
}
function field(value,key){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(value,key);
  return d?.enumerable&&Object.hasOwn(d,'value')?d.value:undefined;
}
const counts=()=>({
  nominal:0,deviation:0,blocker:0,revisionReview:0,
  noExecutionClaim:0,inconsistent:0,rejected:0
});
const categoryKey=Object.freeze({
  NOMINAL:'nominal',DEVIATION:'deviation',BLOCKER:'blocker',
  REVISION_REVIEW:'revisionReview',NO_EXECUTION_CLAIM:'noExecutionClaim',
  INCONSISTENT:'inconsistent',REJECTED:'rejected'
});
function classify(rule) {
  return Object.hasOwn(RULE_CATEGORY,rule)?RULE_CATEGORY[rule]:null;
}
/**
 * Validated categories support triage only. Even four different reports
 * could all be from ONE person; collision count cannot identify people.
 * There is no hash, raw input or user-supplied value in the report.
 */
export function preflightBetaBatch(batch){
  const slots=dense(batch,MIN_RECORDS,MAX_RECORDS);
  if(!slots)return reject('BETA_BATCH_INVALID_OR_UNSAFE_INPUT');
  const originals=Array.from({length:batch.length},(_,i)=>slots[String(i)].value);
  const results=originals.map(r=>preflightBetaIntake(r));
  const rows=results.map((r,i)=>Object.freeze({
    position:i+1,classification:classify(r.ruleCode)||'REJECTED',
    ruleCode:classify(r.ruleCode)?r.ruleCode:
      'BETA_INTAKE_INVALID_OR_UNSAFE_INPUT'
  }));
  const categories=counts();
  for(const row of rows)categories[categoryKey[row.classification]]++;
  const anyUnsafe=results.some(r=>r.status==='ERROR'||
    classify(r.ruleCode)===null);
  const anyUnverified=results.some(r=>r.status==='FAIL');
  if(anyUnsafe)return reject('BETA_BATCH_CONTAINS_UNSAFE_REPORT');
  // Every item now conforms to M20's fixed, allowlisted schema.
  const matrix=Object.fromEntries(PLATFORMS.map(p=>[p,0]));
  const signatures=new Map();
  for(const item of originals){
    const combination=field(item,'operatingSystem')+'_NODE'+
      String(field(item,'nodeMajor'));
    matrix[combination]++;
    const signature=JSON.stringify(PATTERN_FIELDS.map(k=>field(item,k)));
    signatures.set(signature,(signatures.get(signature)||0)+1);
  }
  const collisionPairs=[...signatures.values()].reduce(
    (sum,n)=>sum+(n*(n-1))/2,0);
  const collisions=[...signatures.values()].filter(n=>n>=2).length;
  const status=anyUnverified?'FAIL':'PASS';
  const code=anyUnverified?
    'BETA_BATCH_CONTAINS_UNVERIFIED_OR_INCONSISTENT_REPORT':
    collisionPairs?'BETA_BATCH_PATTERN_COLLISION_MANUAL_REVIEW':
      'BETA_BATCH_READY_FOR_MANUAL_TRIAGE';
  return safe(status,anyUnverified?1:0,code,{
    selfReportedSubmissions:originals.length,
    triageCounts:Object.freeze(categories),
    selfReportedPlatformMatrix:Object.freeze(matrix),
    exactCategoryPatternPairs:collisionPairs,
    categoryPatternsRepeated:collisions,
    identicalPatternDoesNotProveSamePerson:true,
    distinctPatternsDoNotProveDistinctPeople:true,
    noRawReportsEchoed:true,records:Object.freeze(rows)
  });
}
export function preflightBetaBatchJson(text){
  if(typeof text!=='string'||!text.trim()||
     Buffer.byteLength(text,'utf8')>MAX_BYTES)
    return reject('BETA_BATCH_INVALID_OR_UNSAFE_INPUT');
  try{return preflightBetaBatch(parseStrictJson(text));}
  catch{return reject('BETA_BATCH_INVALID_OR_UNSAFE_INPUT');}
}
export async function runBetaBatchStdin(args=[],stream=process.stdin){
  if(!dense(args,0,0))return reject('BETA_BATCH_ARGUMENTS_NOT_ALLOWED');
  try{
    const chunks=[];let size=0;
    for await(const part of stream){
      const bytes=Buffer.isBuffer(part)?part:Buffer.from(part);
      size+=bytes.length;
      if(size>MAX_BYTES)return reject('BETA_BATCH_INVALID_OR_UNSAFE_INPUT');
      chunks.push(bytes);
    }
    const raw=Buffer.concat(chunks);
    return preflightBetaBatchJson(
      new TextDecoder('utf-8',{fatal:true}).decode(raw));
  }catch{return reject('BETA_BATCH_INVALID_OR_UNSAFE_INPUT');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runBetaBatchStdin(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
