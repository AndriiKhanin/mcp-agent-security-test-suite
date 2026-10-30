#!/usr/bin/env node
/**
 * M35 — explainable offline onboarding ONLY.
 *
 * Consumes a one-server MCP client config on bounded stdin via the existing
 * M34 parser. Never reads a filesystem path, contacts any MCP target,
 * runs a configured command, loads credentials, or claims actual agent
 * behaviour. Both text and JSON outputs consist only of source-owned
 * categorical values; user names/URLs/commands/arguments never appear.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectClientConfig,runClientConfigBridge}
  from './m34-client-config-bridge.mjs';

const PROFILE='m35-readable-offline-onboarding-v1';
const ISSUED=new WeakSet();
const UNTESTED=Object.freeze([
  'REAL_MCP_TARGET_CONNECTIVITY',
  'REAL_AGENT_OR_LLM_BEHAVIOR',
  'EXTERNAL_TOOL_EFFECTS',
  'TARGET_OWNERSHIP_AND_OPERATOR_AUTHORIZATION',
  'TLS_DNS_AND_SSRF_DEFENSES',
  'CREDENTIAL_HANDLING',
  'INDEPENDENT_BETA_AND_SECURITY_AUDIT',
  'SECURITY_CERTIFICATION_AND_RELEASE'
]);
const ACTIONS_PASS=Object.freeze([
  Object.freeze({
    code:'REVIEW_PRIVATE_DESCRIPTOR_IF_NEEDED',
    advice:'Optional: privately export the inert descriptor with the M34 --emit-descriptor flag.'
  }),
  Object.freeze({
    code:'KEEP_REAL_TARGET_DISABLED',
    advice:'Do not execute the configured command or contact the MCP server based on this result.'
  }),
  Object.freeze({
    code:'SEEK_SEPARATE_VERIFIED_AUTHORIZATION',
    advice:'Real-target evaluation requires separately verified ownership, scoped permission and security review.'
  })
]);
const ACTIONS_ERROR=Object.freeze([
  Object.freeze({
    code:'REVIEW_ONE_SERVER_INPUT',
    advice:'Supply one supported stdio or HTTPS MCP client entry, without env, headers or credential material.'
  }),
  Object.freeze({
    code:'RUN_OFFLINE_FICTIONAL_DEMO',
    advice:'Use the bundled first-party offline demo separately; it cannot validate a real server.'
  })
]);
function makeReport(transport){
  const valid=transport==='stdio'||transport==='streamable-http';
  const report=Object.freeze({
    reportSchemaVersion:1,
    profile:PROFILE,
    status:valid?'PASS':'ERROR',
    exitCode:valid?0:2,
    ruleCode:valid?'OFFLINE_ONBOARDING_SHAPE_ACCEPTED':
      'OFFLINE_ONBOARDING_INPUT_REJECTED',
    scope:'ONE_INERT_CLIENT_CONFIG_AND_FIXED_FICTIONAL_CONTROLS_ONLY',
    verdict:valid?'CONFIGURATION_ONLY':'NO_ASSESSMENT',
    riskRating:'NOT_SCORED',
    descriptor:Object.freeze({
      status:valid?'SHAPE_VALIDATED':'NOT_EVALUATED',
      transport:valid?transport:'NOT_EVALUATED',
      policy:valid?'VALIDATE_ONLY':'NOT_EVALUATED',
      targetTested:false
    }),
    fictionalControls:Object.freeze({
      status:valid?'FIRST_PARTY_SYNTHETIC_MATCH':'NOT_EVALUATED',
      count:valid?5:0,
      projectSpecific:false,
      actualAttackEfficacyMeasured:false
    }),
    notTested:UNTESTED,
    nextActions:valid?ACTIONS_PASS:ACTIONS_ERROR,
    connectionStatus:'NOT_ATTEMPTED',
    externalTargetContacted:false,
    configuredProcessSpawned:false,
    projectConnectionAuthorized:false,
    operatorVerified:false,
    realProjectAssessed:false,
    actualAgentBehaviorObserved:false,
    independentBetaVerified:false,
    securityCertified:false,
    stableReleaseAuthorized:false
  });
  ISSUED.add(report);
  return report;
}
function reportFromM34(result){
  // Never parse an untrusted saved report or consume self-asserted
  // "verified"/"approved"/"score" from a client-config JSON.
  // The M34 result is recomputed locally from the input each time.
  if(result?.status==='PASS' &&
     result.profile==='m34-offline-client-config-bridge-v1' &&
     result.ruleCode==='CLIENT_CONFIG_CONVERTIBLE_OFFLINE_ONLY' &&
     result.exitCode===0 &&
     result.protocolVersion==='2026-07-28' &&
     result.declaredProtocolNegotiated===false &&
     result.checkedFictionalControls===5 &&
     result.descriptorEvidence==='CONVERTIBLE_AND_VALIDATE_ONLY' &&
     result.realProjectEvidence==='NOT_EVALUATED' &&
     result.connectionStatus==='NOT_ATTEMPTED' &&
     result.externalTargetContacted===false &&
     result.processSpawned===false &&
     result.projectConnectionAuthorized===false &&
     result.realProjectAssessed===false &&
     result.operatorVerified===false &&
     result.securityCertified===false)
    return makeReport(result.transport);
  return makeReport(null);
}
/** Pure, privacy-minimal direct API, recomputes the M34 preflight. */
export function inspectOfflineOnboarding(input){
  try{return reportFromM34(inspectClientConfig(input));}
  catch{return makeReport(null);}
}
const DISPLAY={
  stdio:'stdio',
  'streamable-http':'streamable-http',
  NOT_EVALUATED:'not evaluated'
};
function textReport(report){
  if(!ISSUED.has(report))throw new TypeError('UNTRUSTED_OFFLINE_REPORT');
  const good=report.status==='PASS';
  const lines=[
    'MCP Agent Security Test Suite — offline onboarding',
    'Status: '+report.status+' ('+report.ruleCode+')',
    'Scope: one inert client config and fixed fictional controls only',
    '',
    'DESCRIPTOR PREFLIGHT',
    '  '+(good?'Shape validated; transport: '+DISPLAY[report.descriptor.transport]:
      'Input rejected; descriptor not evaluated'),
    '  '+(good?'Policy: validate-only; no execution permission':
      'No configuration acceptance or permission granted'),
    '',
    'FICTIONAL CONTRACT CONTROLS',
    '  '+(good?'5/5 reviewed first-party fictional checks matched':
      'Not evaluated due to invalid or unsupported input'),
    '  These are NOT tests of your configured MCP server.',
    '',
    'NOT TESTED'
  ];
  for(const code of UNTESTED)lines.push('  - '+code);
  lines.push('','NEXT ACTIONS');
  for(const [i,action] of report.nextActions.entries())
    lines.push('  '+(i+1)+'. '+action.advice);
  lines.push('','RISK RATING: NOT_SCORED',
    'REAL TARGET CONTACT: NOT_ATTEMPTED',
    'AUTHORIZATION: NOT_GRANTED',
    'SECURITY CERTIFICATION: NOT_GRANTED');
  return lines.join('\n')+'\n';
}
/**
 * Only privately minted reports can be rendered. A saved or caller-forged
 * JSON "PASS", severity or approval field has no evidence authority.
 */
export function renderOfflineOnboardingReport(report){
  return textReport(report);
}
function formatFromArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==
     Array.prototype||args.length>1)return null;
  const d=Object.getOwnPropertyDescriptors(args);
  if(Reflect.ownKeys(d).length!==args.length+1||
     d.length?.value!==args.length)return null;
  if(args.length===0)return 'text';
  const arg=d[0];
  if(!arg?.enumerable||!Object.hasOwn(arg,'value'))return null;
  return arg.value==='--json'?'json':null;
}
/**
 * One-shot CLI over M34 bounded, strict UTF-8/JSON 4 KiB stdin gate.
 * Wrong flags/TTY fail closed without reading the input stream.
 */
export async function runOfflineOnboardingReport(args=[],stream=process.stdin){
  const format=formatFromArgs(args);
  if(format===null)return {format:'text',report:makeReport(null)};
  try{
    const source=await runClientConfigBridge([],stream);
    return {format,report:reportFromM34(source)};
  }catch{return {format,report:makeReport(null)};}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {format,report}=await runOfflineOnboardingReport(process.argv.slice(2));
  process.stdout.write(format==='json'?JSON.stringify(report,null,2)+'\n':
    renderOfflineOnboardingReport(report));
  process.exitCode=report.exitCode;
}
