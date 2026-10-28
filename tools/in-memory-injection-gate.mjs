#!/usr/bin/env node
/**
 * M9-B: first-party in-memory authorization gate for fictional tool-result
 * action proposals. Requests are only finite source-owned enum values.
 *
 * This module never parses/obeys injected text, reads a real resource,
 * starts a process, calls a tool, connects to an MCP server or runs a model.
 * Its effect witness observes private in-memory counters, not OS effects.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const SCOPE='FIRST_PARTY_IN_MEMORY_ACTION_GATE_ONLY';
const ORIGINS=Object.freeze(['OWNER_TASK','UNTRUSTED_TOOL_RESULT']);
const OPERATIONS=Object.freeze([
  'CONSUME_TASK_DATA','REQUEST_UNRELATED_FILE_READ','REQUEST_UNAUTHORIZED_TOOL_CALL'
]);
const RESOURCES=Object.freeze(['TASK_DATA','UNRELATED_FILE','UNRELATED_TOOL']);
const invalid=()=>{throw new TypeError('INVALID_FICTIONAL_ACTION_REQUEST');};

function plainData(value,fields){
  if(!value || typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype) return false;
  const props=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(props).length===fields.length &&
    fields.every(key=>Object.hasOwn(props,key)&&
      Object.hasOwn(props[key],'value')&&props[key].enumerable);
}
function normalizeRequest(input){
  if(!plainData(input,[
    'schemaVersion','origin','operation','resource','toolResultAuthorityClaim'
  ]) || input.schemaVersion!==1 ||
     !ORIGINS.includes(input.origin) ||
     !OPERATIONS.includes(input.operation) ||
     !RESOURCES.includes(input.resource) ||
     typeof input.toolResultAuthorityClaim!=='boolean' ||
     (input.origin==='OWNER_TASK' && input.toolResultAuthorityClaim))
    invalid();
  return input;
}
const decision=(result,ruleCode)=>Object.freeze({
  decisionSchemaVersion:1,decision:result,ruleCode,
  scope:SCOPE,
  executedRealTool:false,accessedRealFile:false,
  externalMcpContacted:false,authenticatedOperator:false
});

/** Pure rule, no effects. A tool result can supply data but not authority. */
export function decideFictionalAction(input){
  const request=normalizeRequest(input);
  if(request.origin==='UNTRUSTED_TOOL_RESULT' &&
     request.toolResultAuthorityClaim)
    return decision('DENY','TOOL_RESULT_AUTHORITY_SPOOF_DENIED');
  if(request.operation==='CONSUME_TASK_DATA' &&
     request.resource==='TASK_DATA')
    return decision('ALLOW','FICTIONAL_TASK_DATA_AS_DATA_ONLY');
  if(request.operation==='REQUEST_UNRELATED_FILE_READ' &&
     request.resource==='UNRELATED_FILE')
    return decision('DENY','FICTIONAL_CROSS_RESOURCE_READ_DENIED');
  if(request.operation==='REQUEST_UNAUTHORIZED_TOOL_CALL' &&
     request.resource==='UNRELATED_TOOL')
    return decision('DENY','FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED');
  return decision('DENY','FICTIONAL_OPERATION_RESOURCE_MISMATCH');
}

function denseSequence(value){
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
     value.length<1||value.length>8) invalid();
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(descriptors).length!==value.length+1)invalid();
  const rows=[];
  for(let i=0;i<value.length;i++){
    const entry=descriptors[String(i)];
    if(!entry||!entry.enumerable||!Object.hasOwn(entry,'value'))invalid();
    rows.push(normalizeRequest(entry.value));
  }
  return rows;
}

/**
 * The private witness is *not* the simulated adapter. It only commits
 * approved fictional task-data handling, and can never perform IO.
 * No request can increment a protected-resource effect counter.
 */
function createParentOwnedWitness(){
  let handledTaskData=0,deniedRequests=0;
  let blockedFileRequests=0,blockedToolRequests=0,blockedSpoofedClaims=0;
  const observe=(request,verdict)=>{
    if(verdict.decision==='ALLOW'){
      if(request.operation!=='CONSUME_TASK_DATA' ||
         request.resource!=='TASK_DATA' ||
         verdict.ruleCode!=='FICTIONAL_TASK_DATA_AS_DATA_ONLY')invalid();
      handledTaskData++;
    }else if(verdict.decision==='DENY'){
      deniedRequests++;
      if(verdict.ruleCode==='FICTIONAL_CROSS_RESOURCE_READ_DENIED')
        blockedFileRequests++;
      if(verdict.ruleCode==='FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED')
        blockedToolRequests++;
      if(verdict.ruleCode==='TOOL_RESULT_AUTHORITY_SPOOF_DENIED')
        blockedSpoofedClaims++;
    }else invalid();
  };
  const snapshot=()=>Object.freeze({
    handledTaskData,deniedRequests,
    blockedFileRequests,blockedToolRequests,blockedSpoofedClaims,
    fictionalUnrelatedFileEffectsCommitted:0,
    fictionalUnauthorizedToolEffectsCommitted:0,
    actualFilesystemEffectsObserved:false,
    actualToolEffectsObserved:false
  });
  return Object.freeze({observe,snapshot});
}

export function runFictionalGateSequence(requests){
  const inputs=denseSequence(requests);
  const witness=createParentOwnedWitness();
  const rows=[];
  for(const request of inputs){
    const verdict=decideFictionalAction(request);
    witness.observe(request,verdict);
    // Never echo input values or any fictional tool-result text.
    rows.push(Object.freeze({
      decision:verdict.decision,
      ruleCode:verdict.ruleCode,
      symbolicOnly:true
    }));
  }
  return Object.freeze({
    reportSchemaVersion:1,
    status:'PASS',exitCode:0,scope:SCOPE,
    evidenceKind:'FIRST_PARTY_IN_MEMORY_EFFECT_WITNESS_ONLY',
    checked:rows.length,decisions:rows,
    witness:witness.snapshot(),
    actualAgentBehaviorObserved:false,
    actualFilesystemReadObserved:false,
    untrustedInstructionExecuted:false,
    externalMcpContacted:false,
    independentBetaVerified:false,
    securityCertified:false,
    releaseAuthorized:false
  });
}

const fixedRequest=(origin,operation,resource,claim=false)=>({
  schemaVersion:1,origin,operation,resource,toolResultAuthorityClaim:claim
});
const FIXED_REQUESTS=Object.freeze([
  Object.freeze(fixedRequest('OWNER_TASK','CONSUME_TASK_DATA','TASK_DATA')),
  Object.freeze(fixedRequest('UNTRUSTED_TOOL_RESULT','CONSUME_TASK_DATA','TASK_DATA')),
  Object.freeze(fixedRequest('UNTRUSTED_TOOL_RESULT','REQUEST_UNRELATED_FILE_READ','UNRELATED_FILE')),
  Object.freeze(fixedRequest('UNTRUSTED_TOOL_RESULT','REQUEST_UNAUTHORIZED_TOOL_CALL','UNRELATED_TOOL')),
  Object.freeze(fixedRequest('UNTRUSTED_TOOL_RESULT','CONSUME_TASK_DATA','TASK_DATA',true))
]);
const FIXED_EXPECTATIONS=Object.freeze([
  'FICTIONAL_TASK_DATA_AS_DATA_ONLY',
  'FICTIONAL_TASK_DATA_AS_DATA_ONLY',
  'FICTIONAL_CROSS_RESOURCE_READ_DENIED',
  'FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED',
  'TOOL_RESULT_AUTHORITY_SPOOF_DENIED'
]);
const rejection=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'FICTIONAL_GATE_SELFTEST_UNAVAILABLE',scope:SCOPE,
  actualAgentBehaviorObserved:false,externalMcpContacted:false,
  untrustedInstructionExecuted:false
});

/** Zero-argument literal demonstration; negative denials are expected PASS. */
export function runFixedFictionalGateSelftest(args=[]){
  if(!Array.isArray(args)||args.length!==0)return rejection;
  try{
    const report=runFictionalGateSequence(FIXED_REQUESTS);
    const matched=report.decisions.filter((row,i)=>
      row.ruleCode===FIXED_EXPECTATIONS[i] &&
      row.decision===(i<2?'ALLOW':'DENY')
    ).length;
    const witness=report.witness;
    const safe=matched===5 &&
      witness.handledTaskData===2 &&
      witness.deniedRequests===3 &&
      witness.blockedFileRequests===1 &&
      witness.blockedToolRequests===1 &&
      witness.blockedSpoofedClaims===1 &&
      witness.fictionalUnrelatedFileEffectsCommitted===0 &&
      witness.fictionalUnauthorizedToolEffectsCommitted===0 &&
      witness.actualFilesystemEffectsObserved===false &&
      witness.actualToolEffectsObserved===false;
    return Object.freeze({
      reportSchemaVersion:1,
      status:safe?'PASS':'FAIL',exitCode:safe?0:1,
      ruleCode:safe?'FIXED_FICTIONAL_GATE_EXPECTATIONS_MATCH':
        'FIXED_FICTIONAL_GATE_EXPECTATIONS_MISMATCH',
      scope:SCOPE,checked:5,matched,expectedDenied:3,
      witness,decisions:report.decisions,
      actualAgentBehaviorObserved:false,
      actualFilesystemReadObserved:false,
      externalMcpContacted:false,
      untrustedInstructionExecuted:false,
      independentBetaVerified:false,
      securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return rejection;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=runFixedFictionalGateSelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
