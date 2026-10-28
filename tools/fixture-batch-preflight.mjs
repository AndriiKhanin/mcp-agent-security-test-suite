#!/usr/bin/env node
/**
 * M9-E: one-command source-only preflight for all fictional fixture proposals.
 *
 * Every file is opened only by the existing bounded M8 reader via the M9-C
 * bridge. No user-selected directory, arbitrary instruction, real file read
 * requested by a payload, process, model or external MCP target is executed.
 * Public reports include only fixed codes and ordinal counts, not content.
 */
import {lstat,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runFixturePolicyBridgeFile} from './fixture-policy-bridge.mjs';

const ROOT=fileURLToPath(new URL('../.github/fixture-proposals/',import.meta.url));
const SCOPE='REPOSITORY_FICTIONAL_FIXTURE_BATCH_PREFLIGHT_ONLY';
const FILE=/^[a-z][a-z0-9-]{5,60}\.json$/u;
const MAX_FIXTURES=16;
const FIXED_CASES=Object.freeze([
  Object.freeze(['TASK_DATA_AS_DATA','ALLOW','FICTIONAL_TASK_DATA_AS_DATA_ONLY']),
  Object.freeze(['UNRELATED_FILE_BLOCKED','DENY','FICTIONAL_CROSS_RESOURCE_READ_DENIED']),
  Object.freeze(['UNAUTHORIZED_TOOL_BLOCKED','DENY','FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED']),
  Object.freeze(['SPOOFED_TOOL_RESULT_AUTHORITY_BLOCKED','DENY','TOOL_RESULT_AUTHORITY_SPOOF_DENIED'])
]);
const DENIED_FLAGS=Object.freeze([
  'fixtureContentInterpreted','actualAgentBehaviorObserved',
  'realFilesystemReadObserved','untrustedInstructionExecuted',
  'externalMcpContacted','independentBetaVerified',
  'securityCertified','releaseAuthorized'
]);
const rejected=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'FICTIONAL_BATCH_PREFLIGHT_REJECTED',
  scope:SCOPE,actualAgentBehaviorObserved:false,
  realFilesystemReadObserved:false,externalMcpContacted:false,
  fixtureContentInterpreted:false,securityCertified:false
});

function plainRecord(value,fields){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)return false;
  const entries=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(entries).length===fields.length &&
    fields.every(key=>Object.hasOwn(entries,key) &&
      Object.hasOwn(entries[key],'value') && entries[key].enumerable);
}
function exactArray(value,size){
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
     value.length!==size)return false;
  const descriptors=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).length===size+1 &&
    Array.from({length:size},(_,i)=>descriptors[String(i)])
      .every(item=>item && item.enumerable && Object.hasOwn(item,'value'));
}
/**
 * Strictly qualify a FIRST-PARTY SYMBOLIC policy result. This is a synthetic
 * report-contract check, not validation of an agent or a source's provenance.
 */
export function verifyFictionalBridgeOutcome(report){
  const required=[
    'reportSchemaVersion','status','exitCode','ruleCode','scope',
    'evidenceKind','fixtureSchemaAccepted','expectedSafeBehaviorRecorded',
    'fixtureContentInterpreted','checked','matched','expectedDenials','cases',
    'fictionalTaskDataHandled','fictionalProtectedEffectsCommitted',
    'actualAgentBehaviorObserved','realFilesystemReadObserved',
    'untrustedInstructionExecuted','externalMcpContacted',
    'independentBetaVerified','securityCertified','releaseAuthorized'
  ];
  if(!plainRecord(report,required) ||
     report.reportSchemaVersion!==1 || report.status!=='PASS' ||
     report.exitCode!==0 ||
     report.ruleCode!=='FIXED_FIXTURE_POLICY_PROBES_MATCH' ||
     report.scope!=='VALIDATED_FICTIONAL_FIXTURE_FIXED_POLICY_PROBES_ONLY' ||
     report.evidenceKind!=='FIRST_PARTY_SIMULATED_POLICY_PROBES_ONLY' ||
     report.fixtureSchemaAccepted!==true ||
     report.expectedSafeBehaviorRecorded!==true ||
     report.checked!==4 || report.matched!==4 ||
     report.expectedDenials!==3 || report.fictionalTaskDataHandled!==1 ||
     report.fictionalProtectedEffectsCommitted!==0 ||
     DENIED_FLAGS.some(flag=>report[flag]!==false) ||
     !exactArray(report.cases,FIXED_CASES.length))return false;
  for(let i=0;i<FIXED_CASES.length;i++){
    const row=report.cases[i],expected=FIXED_CASES[i];
    if(!plainRecord(row,[
      'control','expectedDecision','expectedRuleCode','matched'
    ]) || row.control!==expected[0] ||
       row.expectedDecision!==expected[1] ||
       row.expectedRuleCode!==expected[2] ||
       row.matched!==true)return false;
  }
  return true;
}
function strictNoArgs(args){
  return exactArray(args,0);
}
/**
 * Scan the fixed repository fixture directory only. The file inventory is
 * bounded and fails closed for any non-json entry or symbolic policy mismatch.
 */
export async function runFictionalFixtureBatchPreflight(args=[]){
  if(!strictNoArgs(args))return rejected;
  try{
    const stat=await lstat(ROOT);
    if(!stat.isDirectory() || stat.isSymbolicLink())return rejected;
    const entries=await readdir(ROOT,{withFileTypes:true});
    if(entries.length<1 || entries.length>MAX_FIXTURES)return rejected;
    const names=[];
    for(const entry of entries){
      if(!entry.isFile() || !FILE.test(entry.name))return rejected;
      names.push(entry.name);
    }
    names.sort(); // Sorting is internal. Do not echo filenames.
    const results=[];
    for(const name of names){
      const report=await runFixturePolicyBridgeFile([join(ROOT,name)]);
      if(!verifyFictionalBridgeOutcome(report))return rejected;
      results.push(Object.freeze({
        ordinal:results.length+1,
        shape:'ACCEPTED',
        fixedPolicyControlsMatched:4,
        deniedSyntheticActions:3,
        protectedFictionalEffects:0
      }));
    }
    return Object.freeze({
      reportSchemaVersion:1,status:'PASS',exitCode:0,
      ruleCode:'ALL_FICTIONAL_FIXTURES_PASSED_STATIC_PREFLIGHT',
      scope:SCOPE,evidenceKind:'FIRST_PARTY_STATIC_FIXTURES_AND_FIXED_POLICY_ONLY',
      fixtureCount:results.length,passed:results.length,
      policyControlsPerFixture:4,
      expectedDenialsPerFixture:3,
      results:Object.freeze(results),
      fixtureContentInterpreted:false,
      actualAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,
      untrustedInstructionExecuted:false,
      externalMcpContacted:false,
      independentBetaVerified:false,
      securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return rejected;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runFictionalFixtureBatchPreflight(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
