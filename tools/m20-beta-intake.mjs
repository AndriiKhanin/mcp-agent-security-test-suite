#!/usr/bin/env node
/**
 * M20: privacy-minimal, untrusted self-report preflight for VOLUNTARY
 * fictional-only beta. Reads at most 4096 stdin bytes, no user file path,
 * GitHub API, MCP server, telemetry, agent, or credentials.
 *
 * READY_FOR_MANUAL_TRIAGE never means independently verified: a source
 * SHA and personal-execution checkbox are SELF-ATTESTED claims only.
 */
import {parseStrictJson} from '../src/strict-json.mjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PROFILE='m20-offline-beta-intake-v1';
const MAX_BYTES=4096;
const PINNED_SHA='2ad680ed2e4c322374fdabf3c2007e396f893a59';
const FIELDS=Object.freeze([
  'schemaVersion','publicSourceSha','candidateVersion',
  'operatingSystem','nodeMajor','runnerStatus','matchedControls',
  'evaluationPath','archiveOutcome','symbolicExitCodes',
  'guideClarity','usabilityFinding','personallyRanProtocol',
  'fictionalOnlyConfirmed','noSensitiveMaterialConfirmed'
]);
const OS=Object.freeze(['WINDOWS','UBUNTU']);
const RUNNER=Object.freeze(['PASS','FAIL','ERROR']);
const PATHS=Object.freeze([
  'SOURCE_RUNNER_ONLY','SOURCE_RUNNER_AND_SMOKE',
  'SOURCE_RUNNER_SMOKE_ARCHIVE','ATTEMPTED_UNABLE_TO_RUN'
]);
const ARCHIVE=Object.freeze(['CHECKED','FAILED','NOT_ATTEMPTED']);
const EXITS=Object.freeze(['MATCHED','MISMATCH','NOT_CHECKED']);
const CLARITY=Object.freeze(['CLEAR','NEEDS_CLARIFICATION','BLOCKED']);
const FRICTION=Object.freeze([
  'NONE','SETUP_FRICTION','CASE_MISMATCH','DOCUMENTATION','ACCESSIBILITY'
]);
const SHA=/^[0-9a-f]{40}$/u;
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const safe=(status,exitCode,ruleCode,extra={})=>Object.freeze({
  reportSchemaVersion:1,profile:PROFILE,status,exitCode,ruleCode,
  manualReviewerRequired:true,publicSourceVerified:false,
  independentTesterVerified:false,independentBetaVerified:false,
  realAgentBehaviorObserved:false,externalMcpContacted:false,
  independentSecurityAuditCompleted:false,
  releaseAuthorized:false,securityCertified:false,...extra
});
const inputError=()=>safe('ERROR',2,'BETA_INTAKE_INVALID_OR_UNSAFE_INPUT');
const isDenseArgs=args=>{
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
      args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
};
function validatedFields(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.getPrototypeOf(value)!==Object.prototype)return null;
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(descriptors).length!==FIELDS.length)return null;
  const normalized={};
  for(const name of FIELDS){
    const d=descriptors[name];
    if(!d||!own(d,'value')||!d.enumerable)return null;
    normalized[name]=d.value;
  }
  if(normalized.schemaVersion!==1||
     typeof normalized.publicSourceSha!=='string'||
     !SHA.test(normalized.publicSourceSha)||
     normalized.candidateVersion!=='0.0.10-rc.1'||
     !OS.includes(normalized.operatingSystem)||
     ![20,22].includes(normalized.nodeMajor)||
     !RUNNER.includes(normalized.runnerStatus)||
     !Number.isInteger(normalized.matchedControls)||
     normalized.matchedControls<0||normalized.matchedControls>5||
     !PATHS.includes(normalized.evaluationPath)||
     !ARCHIVE.includes(normalized.archiveOutcome)||
     !EXITS.includes(normalized.symbolicExitCodes)||
     !CLARITY.includes(normalized.guideClarity)||
     !FRICTION.includes(normalized.usabilityFinding)||
     typeof normalized.personallyRanProtocol!=='boolean'||
     typeof normalized.fictionalOnlyConfirmed!=='boolean'||
     typeof normalized.noSensitiveMaterialConfirmed!=='boolean')
    return null;
  return normalized;
}
/**
 * No original values are interpolated in output. Presence of a valid source
 * SHA is NOT verification of the revision. For any intake, acceptance and
 * independent provenance remain explicitly false, even with PASS/5.
 */
export function preflightBetaIntake(value){
  const r=validatedFields(value);
  if(!r)return inputError();
  if(!r.fictionalOnlyConfirmed||!r.noSensitiveMaterialConfirmed)
    return safe('ERROR',2,'BETA_INTAKE_PUBLIC_SAFETY_CONFIRMATION_MISSING');
  const unable=r.evaluationPath==='ATTEMPTED_UNABLE_TO_RUN';
  const usedArchive=r.evaluationPath==='SOURCE_RUNNER_SMOKE_ARCHIVE';
  const smoke=r.evaluationPath==='SOURCE_RUNNER_AND_SMOKE'||usedArchive;
  const contradictions=[
    r.runnerStatus==='PASS'&&r.matchedControls!==5,
    r.runnerStatus==='FAIL'&&r.matchedControls===5,
    r.runnerStatus==='ERROR'&&r.matchedControls!==0,
    unable&&(r.runnerStatus!=='ERROR'||r.matchedControls!==0),
    unable&&r.archiveOutcome!=='NOT_ATTEMPTED',
    unable&&r.symbolicExitCodes!=='NOT_CHECKED',
    !usedArchive&&r.archiveOutcome!=='NOT_ATTEMPTED',
    usedArchive&&r.archiveOutcome==='NOT_ATTEMPTED',
    !smoke&&r.symbolicExitCodes!=='NOT_CHECKED'
  ];
  if(contradictions.some(Boolean))
    return safe('FAIL',1,'BETA_INTAKE_INCONSISTENT_SELF_REPORT');
  if(!r.personallyRanProtocol)
    return safe('FAIL',1,'BETA_INTAKE_EXECUTION_NOT_SELF_ATTESTED');
  if(r.publicSourceSha!==PINNED_SHA)
    return safe('FAIL',1,'BETA_INTAKE_UNPINNED_SHA_MANUAL_REVIEW_REQUIRED');
  const blocker=unable||r.runnerStatus==='ERROR';
  const deviation=r.runnerStatus==='FAIL'||
    r.symbolicExitCodes==='MISMATCH'||r.archiveOutcome==='FAILED';
  return safe('PASS',0,
    blocker?'BETA_INTAKE_BLOCKER_READY_FOR_MANUAL_TRIAGE':
    deviation?'BETA_INTAKE_DEVIATION_READY_FOR_MANUAL_TRIAGE':
      'BETA_INTAKE_READY_FOR_MANUAL_TRIAGE',{
      selfReportedMatchedControls:r.matchedControls,
      selfReportedRunnerCategory:
        r.runnerStatus==='PASS'?'FIVE_FIXED_CONTROLS_REPORTED_MATCHED':
        r.runnerStatus==='FAIL'?'FICTIONAL_CONTROL_MISMATCH_REPORTED':
          'FICTIONAL_RUNNER_ERROR_REPORTED',
      matchesHistoricalPublicSha:true,
      sanitizedCategoricalFieldsOnly:true,
      publicReportTextEchoed:false
    });
}
/** Strict duplicate-free bounded JSON; always return generic no-echo errors. */
export function preflightBetaIntakeJson(text){
  if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>MAX_BYTES||
    !text.trim())return inputError();
  try{return preflightBetaIntake(parseStrictJson(text));}
  catch{return inputError();}
}
export async function runBetaIntakeStdin(args=[],input=process.stdin){
  if(!isDenseArgs(args))return safe('ERROR',2,'BETA_INTAKE_ARGUMENTS_NOT_ALLOWED');
  try{
    const chunks=[];let total=0;
    for await(const chunk of input){
      const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
      total+=b.length;
      if(total>MAX_BYTES)return inputError();
      chunks.push(b);
    }
    const raw=Buffer.concat(chunks);
    return preflightBetaIntakeJson(new TextDecoder('utf-8',{fatal:true})
      .decode(raw));
  }catch{return inputError();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=await runBetaIntakeStdin(process.argv.slice(2));
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
  process.exitCode=output.exitCode;
}
