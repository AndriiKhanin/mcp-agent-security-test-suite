#!/usr/bin/env node
/**
 * M9-G: contributor-readable summary of source-only fictional checks.
 * No real AI agent, MCP server, user command, external files, model or
 * embedded tool-result instruction is executed by this module.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runFictionalFixtureBatchPreflight} from './fixture-batch-preflight.mjs';
import {runFictionalNegativeControlMatrix} from './fictional-negative-control-matrix.mjs';

const LIMIT=16;
const reject=()=>{throw new TypeError('INVALID_FICTIONAL_CONTRIBUTOR_REPORT');};
const ERROR=Object.freeze({
  exitCode:2,
  text:'ERROR: FICTIONAL_CONTRIBUTOR_SUMMARY_UNAVAILABLE\n'
});
const FALSE_FLAGS=Object.freeze([
  'fixtureContentInterpreted','actualAgentBehaviorObserved',
  'realFilesystemReadObserved','untrustedInstructionExecuted',
  'externalMcpContacted','independentBetaVerified',
  'securityCertified','releaseAuthorized'
]);
const BATCH_FIELDS=Object.freeze([
  'reportSchemaVersion','status','exitCode','ruleCode','scope','evidenceKind',
  'fixtureCount','passed','policyControlsPerFixture',
  'expectedDenialsPerFixture','results',...FALSE_FLAGS
]);
const MUTATION_FIELDS=Object.freeze([
  'reportSchemaVersion','status','exitCode','ruleCode','scope','evidenceKind',
  'fixtureCount','baselineChecksPassed','negativeControlsPerFixture',
  'negativeControlsChecked','negativeControlsRejected',
  'negativeControlsEscaped',...FALSE_FLAGS
]);
const ITEM_FIELDS=Object.freeze([
  'ordinal','shape','fixedPolicyControlsMatched','deniedSyntheticActions',
  'protectedFictionalEffects'
]);

function strictObject(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)return false;
  const desc=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(desc).length===keys.length &&
    keys.every(key=>Object.hasOwn(desc,key) &&
      Object.hasOwn(desc[key],'value') && desc[key].enumerable);
}
function strictArray(value,length){
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
     value.length!==length)return false;
  const desc=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(desc).length===length+1 &&
    Array.from({length},(_,i)=>desc[String(i)])
      .every(item=>item&&item.enumerable&&Object.hasOwn(item,'value'));
}
function flagsDenied(value){
  return FALSE_FLAGS.every(key=>value[key]===false);
}
/**
 * The renderer has no freeform output fields. Only bounded integer counts
 * from two separately source-generated first-party reports are formatted.
 * Input objects are never treated as proof of external observation.
 */
export function renderFictionalContributorSummary(batch,negative){
  if(!strictObject(batch,BATCH_FIELDS) ||
     !strictObject(negative,MUTATION_FIELDS))reject();
  const count=batch.fixtureCount;
  if(!Number.isSafeInteger(count)||count<1||count>LIMIT ||
     batch.reportSchemaVersion!==1 ||
     batch.status!=='PASS'||batch.exitCode!==0||
     batch.ruleCode!=='ALL_FICTIONAL_FIXTURES_PASSED_STATIC_PREFLIGHT'||
     batch.scope!=='REPOSITORY_FICTIONAL_FIXTURE_BATCH_PREFLIGHT_ONLY'||
     batch.evidenceKind!=='FIRST_PARTY_STATIC_FIXTURES_AND_FIXED_POLICY_ONLY'||
     batch.passed!==count||batch.policyControlsPerFixture!==4||
     batch.expectedDenialsPerFixture!==3||
     !strictArray(batch.results,count)||!flagsDenied(batch)||
     negative.reportSchemaVersion!==1||
     negative.status!=='PASS'||negative.exitCode!==0||
     negative.ruleCode!=='FIXED_FICTIONAL_NEGATIVE_CONTROLS_REJECTED'||
     negative.scope!=='FIRST_PARTY_SYMBOLIC_MUTATION_MATRIX_ONLY'||
     negative.evidenceKind!=='SOURCE_AUTHORED_SYNTHETIC_MUTATIONS_ONLY'||
     negative.fixtureCount!==count||
     negative.baselineChecksPassed!==count||
     negative.negativeControlsPerFixture!==43||
     negative.negativeControlsChecked!==count*43||
     negative.negativeControlsRejected!==count*43||
     negative.negativeControlsEscaped!==0||
     !flagsDenied(negative))reject();
  for(let i=0;i<count;i++){
    const item=batch.results[i];
    if(!strictObject(item,ITEM_FIELDS) ||
       item.ordinal!==i+1 || item.shape!=='ACCEPTED' ||
       item.fixedPolicyControlsMatched!==4 ||
       item.deniedSyntheticActions!==3 ||
       item.protectedFictionalEffects!==0)reject();
  }
  return [
    'MCP FICTIONAL FIXTURE CONTRIBUTOR REVIEW',
    'Scope: SOURCE-ONLY, FIRST-PARTY SYNTHETIC CHECKS',
    '',
    'Fictional fixtures accepted: '+count+'/'+count,
    'Fixed in-memory policy controls matched: '+(count*4)+'/'+(count*4),
    'Expected symbolic denials: '+(count*3)+'/'+(count*3),
    'Negative report mutations rejected: '+(count*43)+'/'+(count*43),
    '',
    'Actual AI agent behavior observed: NO',
    'Actual unrelated file read observed: NO',
    'External MCP target contacted: NO',
    'Independent beta verified: NO',
    'Independent security audit completed: NO',
    'Prompt-injection resilience certified: NO',
    'Stable release authorized: NO',
    '',
    'PASS means fictional schema, fixed policy, and negative-report checks only.',
    'It does not evaluate the attack wording or prove real-agent safety.',
    ''
  ].join('\n');
}
function emptyArgs(args){
  if(!Array.isArray(args) ||
     Object.getPrototypeOf(args)!==Array.prototype ||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1 && d.length?.value===0;
}
export async function runFictionalContributorSummary(args=[]){
  if(!emptyArgs(args))return ERROR;
  try{
    const batch=await runFictionalFixtureBatchPreflight();
    const negatives=await runFictionalNegativeControlMatrix();
    return Object.freeze({
      exitCode:0,
      text:renderFictionalContributorSummary(batch,negatives)
    });
  }catch{
    return ERROR; // No filename, fixture, tool text, token or stack disclosure.
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=await runFictionalContributorSummary(process.argv.slice(2));
  if(output.exitCode===0)process.stdout.write(output.text);
  else process.stderr.write(output.text);
  process.exitCode=output.exitCode;
}
