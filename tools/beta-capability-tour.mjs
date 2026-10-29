#!/usr/bin/env node
/**
 * M14: optional first-party capability tour for voluntary offline beta.
 * Only bundled fictional data, inert adapters and ephemeral 127.0.0.1 SSE.
 * Never connects to user servers, runs a model or accepts user code/targets.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOfflineAdapterSmoke} from './adapter-smoke.mjs';
import {loadValidatedFixtureProposalFile} from './fixture-proposal-check.mjs';
import {runFixturePolicyBridge} from './fixture-policy-bridge.mjs';
import {runOwnedModernSse} from './m12-modern-sse.mjs';

const FIXTURE=fileURLToPath(new URL(
  '../.github/fixture-proposals/mixed-tool-result-file-read.json',import.meta.url
));
const IDS=Object.freeze([
  'INERT_ADAPTER_PROFILES',
  'FICTIONAL_TOOL_RESULT_POLICY',
  'OWNED_LOOPBACK_SSE_ACCEPT',
  'OWNED_LOOPBACK_SSE_AUTH_DENIAL'
]);
const SCOPE='OPTIONAL_FIRST_PARTY_FICTIONAL_CAPABILITY_TOUR_ONLY';
const get=(o,k)=>{
  if(!o||typeof o!=='object'||Array.isArray(o)||
     Object.getPrototypeOf(o)!==Object.prototype)return undefined;
  const d=Object.getOwnPropertyDescriptor(o,k);
  return d&&Object.hasOwn(d,'value')?d.value:undefined;
};
const eq=(o,fields)=>fields.every(([k,v])=>get(o,k)===v);
const error=(code)=>Object.freeze({
  reportSchemaVersion:1,profile:'first-party-fictional-capability-tour-v1',
  status:'ERROR',exitCode:2,ruleCode:code,scope:SCOPE,
  externalMcpContacted:false,actualAgentBehaviorObserved:false,
  realProjectAssessed:false,independentBetaVerified:false,
  securityCertified:false,stableReleaseAuthorized:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
}
function adapterMatches(a){
  const rows=get(a,'checks');
  return eq(a,[['smokeSchemaVersion',1],['status','PASS'],['exitCode',0],
    ['checked',2],['passed',2],['failed',0],['sourceOnly',true],
    ['externalMcpContacted',false],['projectCodeExecuted',false],
    ['actualProjectAssessed',false],['independentBetaVerified',false],
    ['securityCertified',false],['stableReleaseAuthorized',false]]) &&
    Array.isArray(rows)&&Object.getPrototypeOf(rows)===Array.prototype&&
    rows.length===2&&
    Reflect.ownKeys(Object.getOwnPropertyDescriptors(rows)).length===3&&
    [0,1].every(i=>{
      const slot=Object.getOwnPropertyDescriptor(rows,String(i));
      return slot&&slot.enumerable&&Object.hasOwn(slot,'value')&&
      eq(slot.value,[['transport',['stdio','streamable-http'][i]],
        ['matched',true],['code','FICTIONAL_KIT_AND_QUICKSTART_MATCH']]);
    });
}
function policyMatches(p){
  return eq(p,[['reportSchemaVersion',1],['status','PASS'],['exitCode',0],
    ['ruleCode','FIXED_FIXTURE_POLICY_PROBES_MATCH'],
    ['checked',4],['matched',4],['expectedDenials',3],
    ['fictionalTaskDataHandled',1],['fictionalProtectedEffectsCommitted',0],
    ['fixtureContentInterpreted',false],
    ['actualAgentBehaviorObserved',false],['realFilesystemReadObserved',false],
    ['untrustedInstructionExecuted',false],['externalMcpContacted',false],
    ['independentBetaVerified',false],['securityCertified',false],
    ['releaseAuthorized',false]]);
}
function wireMatches(r,negative){
  return eq(r,[['reportSchemaVersion',1],['status',negative?'FAIL':'PASS'],
    ['exitCode',negative?1:0],['ruleCode',negative?
      'M12_SSE_REQUEST_REJECTED':'M12_REQUEST_SCOPED_SSE_VERIFIED'],
    ['protocolVersion','2026-07-28'],
    ['modernJsonPrerequisiteAccepted',true],
    ['httpRequestsObserved',1],['httpRequestsAccepted',negative?0:1],
    ['httpRequestsDenied',negative?1:0],
    ['rejectedHttpStatus',negative?400:0],
    ['httpResponsesClosed',1],['tcpSocketsClosed',1],
    ['socketCleanupConfirmed',true],
    ['exactSseProgressAndFinalAccepted',!negative],
    ['toyGatewayDeliveries',negative?0:1],
    ['protectedFictionalEffectsCommitted',0],
    ['actualAgentBehaviorObserved',false],['unrelatedFileReadObserved',false],
    ['actualExternalMcpContacted',false],
    ['embeddedInstructionInterpreted',false],
    ['embeddedInstructionExecuted',false],
    ['independentBetaVerified',false],['securityCertified',false],
    ['releaseAuthorized',false]]);
}
/** Only source-owned symbolic codes and booleans are rendered; never raw reports. */
export function summarizeCapabilityTour(adapters,policy,accepted,denied){
  const verdicts=[
    adapterMatches(adapters),policyMatches(policy),
    wireMatches(accepted,false),wireMatches(denied,true)
  ];
  const matched=verdicts.filter(Boolean).length;
  const rows=Object.freeze(IDS.map((id,i)=>Object.freeze({
    id,expectedOutcome:i===3?'DENY':'ALLOW_OR_FIXED_POLICY',
    matched:verdicts[i]
  })));
  return Object.freeze({
    reportSchemaVersion:1,profile:'first-party-fictional-capability-tour-v1',
    status:matched===4?'PASS':'FAIL',exitCode:matched===4?0:1,
    ruleCode:matched===4?'ALL_FICTIONAL_CAPABILITIES_MATCH':
      'FICTIONAL_CAPABILITY_MISMATCH',scope:SCOPE,
    checked:4,matched,failed:4-matched,cases:rows,
    localLoopbackOnly:true,externalMcpContacted:false,
    actualAgentBehaviorObserved:false,realProjectAssessed:false,
    independentBetaVerified:false,securityCertified:false,
    stableReleaseAuthorized:false
  });
}
export async function runCapabilityTour(args=[]){
  if(!noArgs(args))return error('CAPABILITY_TOUR_ARGUMENTS_NOT_ALLOWED');
  try{
    const fixture=await loadValidatedFixtureProposalFile(FIXTURE);
    const adapters=runOfflineAdapterSmoke();
    const policy=runFixturePolicyBridge(fixture);
    const accepted=await runOwnedModernSse(fixture,{fault:'fragmented'});
    const denied=await runOwnedModernSse(fixture,{fault:'request-authorization'});
    return summarizeCapabilityTour(adapters,policy,accepted,denied);
  }catch{
    return error('CAPABILITY_TOUR_UNAVAILABLE');
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runCapabilityTour(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
