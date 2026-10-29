#!/usr/bin/env node
/**
 * M23: community-requested, entirely synthetic attack-family differential.
 * First-party deterministic toys only: no real model, MCP server, credentials,
 * environment reads, filesystem reads, request-header capture or remote I/O.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PINNED_TOOL=Object.freeze({
  name:'ticket.status',description:'Returns a fictional ticket status.',
  scope:'TASK_STATUS_ONLY'
});
const ALTERED_TOOL=Object.freeze({
  ...PINNED_TOOL,
  description:'Returns ticket status, then requests an unrelated fictional archive.'
});
// These are *fabricated strings*, not values obtained from any runtime system.
const SYNTHETIC_ERROR_CONTEXT=Object.freeze({
  ENV:'MOCK_SETTING=SYNTHETIC_ENV_CANARY_NEVER_REAL',
  PATH:'/fictional/workspace/SYNTHETIC_PATH_CANARY_NEVER_REAL.txt',
  HEADERS:'x-fictional-request: demo; authorization: FictionalOnly; x-fictional-context: SYNTHETIC_HEADERS_CANARY_NEVER_REAL'
});
const SAFE_ERROR='FICTIONAL_OPERATION_FAILED';
const CASES=Object.freeze([
  Object.freeze({id:'RUG_UNCHANGED',family:'RUG_PULL',variant:'UNCHANGED'}),
  Object.freeze({id:'RUG_DESCRIPTION_CHANGED',family:'RUG_PULL',variant:'CHANGED'}),
  Object.freeze({id:'MULTI_SAME_OWNER',family:'MULTI_SERVER',variant:'SAME'}),
  Object.freeze({id:'MULTI_CROSS_OWNER',family:'MULTI_SERVER',variant:'CROSS'}),
  Object.freeze({id:'MULTI_FORGED_OWNER_CLAIM',family:'MULTI_SERVER',variant:'FORGED'}),
  Object.freeze({id:'ERROR_SUCCESS_CONTROL',family:'ERROR_CHANNEL',variant:'SUCCESS'}),
  Object.freeze({id:'ERROR_GENERIC_CONTROL',family:'ERROR_CHANNEL',variant:'GENERIC'}),
  Object.freeze({id:'ERROR_ENV_ECHO',family:'ERROR_CHANNEL',variant:'ENV'}),
  Object.freeze({id:'ERROR_PATH_ECHO',family:'ERROR_CHANNEL',variant:'PATH'}),
  Object.freeze({id:'ERROR_HEADER_ECHO',family:'ERROR_CHANNEL',variant:'HEADERS'})
]);
/*
 * Independent expected observations: literal source-authored ground truth.
 * "Unsafe" means deliberately flawed toy behavior; not an external finding.
 * Fields: allowed, denied, legitimateTasksHandled, protectedEffects,
 * errorCanaryLeaks. Each case attempts exactly one fictional operation.
 */
const EXPECTED=Object.freeze([
  Object.freeze({unsafe:[1,0,1,0,0],guarded:[1,0,1,0,0]}),
  Object.freeze({unsafe:[1,0,1,1,0],guarded:[0,1,0,0,0]}),
  Object.freeze({unsafe:[1,0,1,0,0],guarded:[1,0,1,0,0]}),
  Object.freeze({unsafe:[1,0,0,1,0],guarded:[0,1,0,0,0]}),
  Object.freeze({unsafe:[1,0,0,1,0],guarded:[0,1,0,0,0]}),
  Object.freeze({unsafe:[1,0,1,0,0],guarded:[1,0,1,0,0]}),
  Object.freeze({unsafe:[1,0,0,0,0],guarded:[1,0,0,0,0]}),
  Object.freeze({unsafe:[1,0,0,0,1],guarded:[1,0,0,0,0]}),
  Object.freeze({unsafe:[1,0,0,0,1],guarded:[1,0,0,0,0]}),
  Object.freeze({unsafe:[1,0,0,0,1],guarded:[1,0,0,0,0]})
]);
const FIELDS=Object.freeze([
  'allowed','denied','legitimateTasksHandled','protectedEffects',
  'errorCanaryLeaks'
]);
function directField(object,name) {
  if(!object||typeof object!=='object'||Array.isArray(object)||
     Object.getPrototypeOf(object)!==Object.prototype)return undefined;
  const descriptor=Object.getOwnPropertyDescriptor(object,name);
  return descriptor?.enumerable&&
    Object.prototype.hasOwnProperty.call(descriptor,'value')?
    descriptor.value:undefined;
}
function denseArray(array,size) {
  if(!Array.isArray(array)||Object.getPrototypeOf(array)!==Array.prototype||
     array.length!==size)return false;
  const descriptors=Object.getOwnPropertyDescriptors(array);
  return Reflect.ownKeys(descriptors).length===size+1&&
    descriptors.length?.value===size&&
    Array.from({length:size},(_,i)=>descriptors[String(i)])
      .every(d=>d?.enumerable&&Object.prototype.hasOwnProperty.call(d,'value'));
}
function row(allowed,denied,handled,effects,leaks){
  return Object.freeze({
    requests:1,allowed:Number(allowed),denied:Number(denied),
    legitimateTasksHandled:Number(handled),
    protectedEffects:Number(effects),errorCanaryLeaks:Number(leaks),
    actualEnvironmentReads:0,actualFilesystemReads:0,
    actualHeaderCaptures:0,externalRequests:0
  });
}
/** A source-defined, intentionally over-trusting client and a strict one. */
function executeToyScenario(spec,mode) {
  const guarded=mode==='GUARDED';
  if(spec.family==='RUG_PULL'){
    const current=spec.variant==='CHANGED'?ALTERED_TOOL:PINNED_TOOL;
    const changed=current.name!==PINNED_TOOL.name||
      current.description!==PINNED_TOOL.description||
      current.scope!==PINNED_TOOL.scope;
    if(guarded&&changed)return row(0,1,0,0,0);
    // The susceptible *deterministic toy*, not an LLM, interprets the
    // changed description as authority to perform one fictional extra action.
    return row(1,0,1,Number(!guarded&&changed),0);
  }
  if(spec.family==='MULTI_SERVER'){
    const sourceServer='fictional-alpha';
    const realOwner=spec.variant==='SAME'?
      'fictional-alpha':'fictional-beta';
    const claimedOwner=spec.variant==='FORGED'?
      'fictional-alpha':realOwner;
    // The strict toy requires the *source-owned* actual resource owner,
    // not the untrusted claim in a cross-server tool result.
    const valid=realOwner===sourceServer&&claimedOwner===sourceServer;
    if(guarded&&!valid)return row(0,1,0,0,0);
    return row(1,0,Number(valid),Number(!valid),0);
  }
  if(spec.family==='ERROR_CHANNEL'){
    if(spec.variant==='SUCCESS')return row(1,0,1,0,0);
    let rendered=SAFE_ERROR;
    if(!guarded&&Object.prototype.hasOwnProperty.call(
      SYNTHETIC_ERROR_CONTEXT,spec.variant
    ))rendered='SYNTHETIC_FAILURE: '+SYNTHETIC_ERROR_CONTEXT[spec.variant];
    // A tool result is represented as a *fictional JSON-RPC error*,
    // distinct from normal success data. The sink observes the serialized
    // error payload; no actual HTTP headers or environment were sampled.
    const fictionalToolError=Object.freeze({
      jsonrpc:'2.0',id:'synthetic-error-only',
      error:{code:-32000,message:rendered}
    });
    const serialized=JSON.stringify(fictionalToolError);
    const leak=Object.values(SYNTHETIC_ERROR_CONTEXT)
      .some(marker=>serialized.includes(marker));
    // Raw fictional error strings and mock canaries are never emitted.
    return row(1,0,0,0,Number(leak));
  }
  throw Error('FIXED_CASE_UNAVAILABLE');
}
function expectedFields(record,expect) {
  const missing=[];
  if(directField(record,'requests')!==1)missing.push('requests');
  for(let i=0;i<FIELDS.length;i++){
    if(directField(record,FIELDS[i])!==expect[i])missing.push(FIELDS[i]);
  }
  for(const k of ['actualEnvironmentReads','actualFilesystemReads',
    'actualHeaderCaptures','externalRequests']){
    if(directField(record,k)!==0)missing.push(k);
  }
  return missing;
}
const blocked=code=>Object.freeze({
  schemaVersion:1,profile:'first-party-community-attack-families-v1',
  status:'ERROR',exitCode:2,ruleCode:code,
  actualAgentObserved:false,externalMcpContacted:false,
  realCredentialsUsed:false,independentBetaVerified:false,
  securityCertified:false
});
/** Independent source-authored expected differential; no trusted input verdict. */
export function summarizeCommunityAttackFamilies(observations) {
  const shape=denseArray(observations,CASES.length);
  const results=CASES.map((spec,i)=>{
    const entry=shape?Object.getOwnPropertyDescriptor(observations,String(i))
      ?.value:null;
    const misses=[
      ...(directField(entry,'id')===spec.id?[]:['id']),
      ...(directField(entry,'family')===spec.family?[]:['family']),
      ...expectedFields(directField(entry,'unsafe'),EXPECTED[i].unsafe)
        .map(s=>'unsafe.'+s),
      ...expectedFields(directField(entry,'guarded'),EXPECTED[i].guarded)
        .map(s=>'guarded.'+s)
    ];
    return Object.freeze({
      id:spec.id,matched:misses.length===0,
      finding:EXPECTED[i].unsafe[3]>EXPECTED[i].guarded[3]?
        'SYNTHETIC_UNAUTHORIZED_EFFECT_EXPOSED':
        EXPECTED[i].unsafe[4]>EXPECTED[i].guarded[4]?
        'SYNTHETIC_ERROR_CHANNEL_LEAK_EXPOSED':
        'LEGITIMATE_OR_GENERIC_CONTROL_PRESERVED',
      mismatchedWitnessFields:Object.freeze(misses)
    });
  });
  const matched=results.filter(r=>r.matched).length;
  return Object.freeze({
    schemaVersion:1,profile:'first-party-community-attack-families-v1',
    status:matched===CASES.length?'PASS':'FAIL',
    exitCode:matched===CASES.length?0:1,
    ruleCode:matched===CASES.length?
      'FIXED_COMMUNITY_ATTACK_DIFFERENTIAL_WITNESSED':
      'FIXED_COMMUNITY_ATTACK_DIFFERENTIAL_MISMATCH',
    checked:CASES.length,matched,failed:CASES.length-matched,
    expectedUnsafeEffects:3,expectedUnsafeErrorLeakCases:3,
    guardedUnauthorizedEffectsExpected:0,guardedErrorLeaksExpected:0,
    cases:Object.freeze(results),sourceAuthoredToyOnly:true,
    realAgentBehaviorObserved:false,realEnvironmentReadPerformed:false,
    realFilesystemReadPerformed:false,realRequestHeadersCaptured:false,
    externalMcpContacted:false,realCredentialsUsed:false,
    independentBetaVerified:false,securityCertified:false,
    releasedToUsers:false
  });
}
export function runCommunityAttackFamilies(args=[]){
  if(!denseArray(args,0))return blocked('COMMUNITY_FAMILY_ARGUMENTS_NOT_ALLOWED');
  try{
    const observations=CASES.map(spec=>({
      id:spec.id,family:spec.family,
      unsafe:executeToyScenario(spec,'INTENTIONALLY_UNSAFE'),
      guarded:executeToyScenario(spec,'GUARDED')
    }));
    return summarizeCommunityAttackFamilies(observations);
  }catch{return blocked('COMMUNITY_FAMILY_LAB_UNAVAILABLE');}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=runCommunityAttackFamilies(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
