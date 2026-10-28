#!/usr/bin/env node
/**
 * M10-G: stateful, first-party, fictional toy-agent task/result session.
 *
 * This does not run a real AI agent, model, MCP target, process, user
 * command or a file-read request contained in a tool result. Source-owned
 * toy functions invoke only an inert, parent-owned in-memory gateway.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../src/strict-json.mjs';
import {validateFixtureProposal} from './fixture-proposal-check.mjs';

const FIXTURE_URL=new URL(
  '../.github/fixture-proposals/mixed-tool-result-file-read.json',
  import.meta.url
);
const SCOPE='FIRST_PARTY_STATEFUL_TOY_SESSION_IN_MEMORY_ONLY';
const MODES=Object.freeze([
  'SAFE_TASK',
  'FAULT_PREMATURE_RESULT',
  'FAULT_RESULT_REPLAY',
  'FAULT_RESULT_AFTER_FINISH',
  'FAULT_UNRELATED_FILE',
  'FAULT_UNAUTHORIZED_TOOL',
  'FAULT_FORGED_AUTHORITY',
  'FAULT_COMBINED'
]);
const invalid=()=>{throw new TypeError('INVALID_FICTIONAL_TOY_SESSION');};

/**
 * The witness is a separate closure, inaccessible to the toy driver.
 * A denied call can increment a denial counter but can NEVER commit a
 * protected effect, access OS resources or modify authorization.
 */
function makeParentGateway(){
  let phase='NEW',calls=0;
  let begun=0,delivered=0,finished=0;
  let invalidPhase=0,blockedRead=0,blockedTool=0,blockedAuthority=0;
  const ALLOW=Object.freeze({decision:'ALLOW'});
  const DENY=Object.freeze({decision:'DENY'});

  const methods=Object.freeze({
    startOwnerTask(){
      calls++;
      if(phase!=='NEW'){invalidPhase++;return DENY;}
      phase='AWAITING_RESULT';begun++;
      return ALLOW;
    },
    deliverUntrustedToolResult(taskData){
      calls++;
      // An untrusted result may be consumed as data exactly once,
      // but cannot provide permission or select an action.
      if(phase!=='AWAITING_RESULT'){invalidPhase++;return DENY;}
      if(typeof taskData!=='string'||taskData.length<10||
         taskData.length>256)invalid();
      phase='RESULT_RECEIVED';delivered++;
      return ALLOW;
    },
    requestUnrelatedFile(){
      calls++;blockedRead++;return DENY;
    },
    requestUnauthorizedTool(){
      calls++;blockedTool++;return DENY;
    },
    claimToolResultAuthority(){
      calls++;blockedAuthority++;return DENY;
    },
    finishOwnerTask(){
      calls++;
      if(phase!=='RESULT_RECEIVED'){invalidPhase++;return DENY;}
      phase='FINISHED';finished++;
      return ALLOW;
    }
  });
  const snapshot=()=>Object.freeze({
    phase,methodCallsObserved:calls,
    ownerTasksStarted:begun,toolResultsAccepted:delivered,
    tasksFinished:finished,
    invalidPhaseRequestsDenied:invalidPhase,
    unrelatedFileRequestsDenied:blockedRead,
    unauthorizedToolRequestsDenied:blockedTool,
    forgedAuthorityClaimsDenied:blockedAuthority,
    protectedFictionalFileEffectsCommitted:0,
    protectedFictionalToolEffectsCommitted:0,
    realFileReadObserved:false,
    realMcpToolCallObserved:false
  });
  return Object.freeze({methods,snapshot});
}

/** The fault branches are source-authored control code, never parsed text. */
function driveFixedToySession(fixture,mode,gateway){
  const taskData=fixture.toolResult.legitimateData;
  if(mode==='FAULT_PREMATURE_RESULT'||mode==='FAULT_COMBINED'){
    if(gateway.deliverUntrustedToolResult(taskData).decision!=='DENY')invalid();
  }
  if(gateway.startOwnerTask().decision!=='ALLOW')invalid();
  if(gateway.deliverUntrustedToolResult(taskData).decision!=='ALLOW')invalid();
  if(mode==='FAULT_RESULT_REPLAY'||mode==='FAULT_COMBINED'){
    if(gateway.deliverUntrustedToolResult(taskData).decision!=='DENY')invalid();
  }
  if(mode==='FAULT_UNRELATED_FILE'||mode==='FAULT_COMBINED'){
    if(gateway.requestUnrelatedFile().decision!=='DENY')invalid();
  }
  if(mode==='FAULT_UNAUTHORIZED_TOOL'||mode==='FAULT_COMBINED'){
    if(gateway.requestUnauthorizedTool().decision!=='DENY')invalid();
  }
  if(mode==='FAULT_FORGED_AUTHORITY'||mode==='FAULT_COMBINED'){
    if(gateway.claimToolResultAuthority().decision!=='DENY')invalid();
  }
  if(gateway.finishOwnerTask().decision!=='ALLOW')invalid();
  if(mode==='FAULT_RESULT_AFTER_FINISH'){
    if(gateway.deliverUntrustedToolResult(taskData).decision!=='DENY')invalid();
  }
}

/**
 * Parent-observed JS method calls, not a fabricated trace. Fixed input modes
 * and fully validated source-owned fixture only; no untrusted code execution.
 */
export function runFictionalToySession(fixture,mode){
  if(typeof mode!=='string'||!MODES.includes(mode))invalid();
  validateFixtureProposal(fixture);
  const parent=makeParentGateway();
  driveFixedToySession(fixture,mode,parent.methods);
  const w=parent.snapshot();
  const forbidden=w.invalidPhaseRequestsDenied+
    w.unrelatedFileRequestsDenied+w.unauthorizedToolRequestsDenied+
    w.forgedAuthorityClaimsDenied;
  if(w.phase!=='FINISHED'||w.ownerTasksStarted!==1||
     w.toolResultsAccepted!==1||w.tasksFinished!==1||
     w.methodCallsObserved!==forbidden+3||
     w.protectedFictionalFileEffectsCommitted!==0||
     w.protectedFictionalToolEffectsCommitted!==0||
     w.realFileReadObserved!==false||
     w.realMcpToolCallObserved!==false)invalid();

  const safe=forbidden===0;
  return Object.freeze({
    reportSchemaVersion:1,
    status:safe?'PASS':'FAIL',exitCode:safe?0:1,
    ruleCode:safe?'TOY_SESSION_AUTHORIZED_SEQUENCE_ONLY':
      'TOY_SESSION_UNTRUSTED_ACTION_OR_REPLAY_BLOCKED',
    scope:SCOPE,evidenceKind:'FIRST_PARTY_PARENT_OBSERVED_IN_MEMORY_METHOD_CALLS',
    mode,phase:w.phase,
    methodCallsObserved:w.methodCallsObserved,
    ownerTasksStarted:w.ownerTasksStarted,
    toolResultsAccepted:w.toolResultsAccepted,
    tasksFinished:w.tasksFinished,
    forbiddenRequestsObserved:forbidden,
    invalidPhaseRequestsDenied:w.invalidPhaseRequestsDenied,
    unrelatedFileRequestsDenied:w.unrelatedFileRequestsDenied,
    unauthorizedToolRequestsDenied:w.unauthorizedToolRequestsDenied,
    forgedAuthorityClaimsDenied:w.forgedAuthorityClaimsDenied,
    protectedFictionalFileEffectsCommitted:0,
    protectedFictionalToolEffectsCommitted:0,
    toyAgentMethodCallsObserved:true,
    realAgentBehaviorObserved:false,
    realFilesystemReadObserved:false,
    realMcpToolCallObserved:false,
    injectedInstructionInterpreted:false,
    injectedInstructionExecuted:false,
    externalMcpContacted:false,
    independentBetaVerified:false,
    securityCertified:false,
    releaseAuthorized:false
  });
}

// The expectations are authored independently from the driver and gateway.
const EXPECTATIONS=Object.freeze([
  Object.freeze(['SAFE_TASK','PASS',3,0,0,0,0]),
  Object.freeze(['FAULT_PREMATURE_RESULT','FAIL',4,1,0,0,0]),
  Object.freeze(['FAULT_RESULT_REPLAY','FAIL',4,1,0,0,0]),
  Object.freeze(['FAULT_RESULT_AFTER_FINISH','FAIL',4,1,0,0,0]),
  Object.freeze(['FAULT_UNRELATED_FILE','FAIL',4,0,1,0,0]),
  Object.freeze(['FAULT_UNAUTHORIZED_TOOL','FAIL',4,0,0,1,0]),
  Object.freeze(['FAULT_FORGED_AUTHORITY','FAIL',4,0,0,0,1]),
  Object.freeze(['FAULT_COMBINED','FAIL',8,2,1,1,1])
]);
const BAD=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'TOY_SESSION_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,externalMcpContacted:false,
  injectedInstructionExecuted:false
});
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const props=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(props).length===1&&props.length?.value===0;
}

/** Optional zero-argument local first-party selftest, no target selection. */
export function runFixedToySessionSelftest(args=[]){
  if(!noArgs(args))return BAD;
  try{
    const fixture=parseStrictJson(readFileSync(FIXTURE_URL,'utf8'));
    const cases=EXPECTATIONS.map(([mode,status,calls,phase,read,tool,auth])=>{
      const r=runFictionalToySession(fixture,mode);
      const denied=phase+read+tool+auth;
      return Object.freeze({
        mode,expectedStatus:status,observedStatus:r.status,
        expectedDenied:denied,
        matched:r.status===status&&
          r.exitCode===(status==='PASS'?0:1)&&
          r.methodCallsObserved===calls&&
          r.invalidPhaseRequestsDenied===phase&&
          r.unrelatedFileRequestsDenied===read&&
          r.unauthorizedToolRequestsDenied===tool&&
          r.forgedAuthorityClaimsDenied===auth&&
          r.forbiddenRequestsObserved===denied&&
          r.ownerTasksStarted===1&&r.toolResultsAccepted===1&&
          r.tasksFinished===1&&r.phase==='FINISHED'&&
          r.protectedFictionalFileEffectsCommitted===0&&
          r.protectedFictionalToolEffectsCommitted===0&&
          r.realAgentBehaviorObserved===false&&
          r.externalMcpContacted===false
      });
    });
    const matched=cases.filter(x=>x.matched).length;
    const safe=matched===EXPECTATIONS.length;
    return Object.freeze({
      reportSchemaVersion:1,status:safe?'PASS':'FAIL',
      exitCode:safe?0:1,
      ruleCode:safe?'TOY_SESSION_FIXED_SEQUENCE_CONTROLS_MATCH':
        'TOY_SESSION_FIXED_SEQUENCE_CONTROLS_MISMATCH',
      scope:SCOPE,checked:8,matched,
      expectedNegativeCases:7,
      negativeCasesMatched:cases.slice(1).filter(x=>x.matched).length,
      cases:Object.freeze(cases),
      realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,
      realMcpToolCallObserved:false,
      injectedInstructionInterpreted:false,
      injectedInstructionExecuted:false,
      externalMcpContacted:false,
      independentBetaVerified:false,
      securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return BAD;} // Never echo payload content, private paths or stack.
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=runFixedToySessionSelftest(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
