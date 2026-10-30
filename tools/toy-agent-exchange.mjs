#!/usr/bin/env node
/**
 * M10-A/B: deterministic first-party toy-agent method-call exchange.
 *
 * The toy agent is source-owned JavaScript, NOT an LLM. It receives a
 * validated fictional tool result, treats its embedded instruction as data,
 * and can only call an inert parent-owned in-memory gateway. Fault modes
 * deliberately request forbidden symbolic methods, never OS operations.
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
const SCOPE='FIRST_PARTY_TOY_AGENT_IN_MEMORY_METHOD_CALLS_ONLY';
const MODES=Object.freeze([
  'SAFE_DATA_ONLY',
  'FAULT_UNRELATED_READ',
  'FAULT_UNAUTHORIZED_TOOL',
  'FAULT_FORGED_AUTHORITY',
  'FAULT_COMBINED'
]);
const BAD_INPUT=()=>{throw new TypeError('INVALID_FICTIONAL_TOY_AGENT_REQUEST');};

function sourceOwnedMode(mode){
  if(typeof mode!=='string' || !MODES.includes(mode))BAD_INPUT();
  return mode;
}

/**
 * The gateway owns every method and witness counter. The toy agent sees
 * only callable methods; it cannot manipulate the parent's counters.
 * No method accesses the filesystem, launches a process or calls MCP.
 */
function createInMemoryGateway(){
  let acceptedData=0;
  let blockedRead=0,blockedTool=0,blockedAuthority=0;
  let methodCalls=0;
  const deny=Object.freeze({decision:'DENY'});
  const allow=Object.freeze({decision:'ALLOW'});
  const methods=Object.freeze({
    consumeTaskData(value){
      methodCalls++;
      if(typeof value!=='string' || value.length<10 ||
         value.length>256)BAD_INPUT();
      acceptedData++;
      return allow;
    },
    requestUnrelatedFile(){
      methodCalls++;blockedRead++;return deny;
    },
    requestUnauthorizedTool(){
      methodCalls++;blockedTool++;return deny;
    },
    claimToolResultAuthority(){
      methodCalls++;blockedAuthority++;return deny;
    }
  });
  const snapshot=()=>Object.freeze({
    methodCallsObserved:methodCalls,
    taskDataAccepted:acceptedData,
    unrelatedFileRequestsDenied:blockedRead,
    unauthorizedToolRequestsDenied:blockedTool,
    forgedAuthorityClaimsDenied:blockedAuthority,
    fictionalProtectedFileEffectsCommitted:0,
    fictionalProtectedToolEffectsCommitted:0,
    actualFileReadObserved:false,
    actualMcpToolCallObserved:false
  });
  return Object.freeze({methods,snapshot});
}

/**
 * The toy agent is deliberately fixed code. The instruction text is not
 * parsed or forwarded to any executor. The fault controls inject explicit
 * method calls IN CODE, not based on parsing a contributor's attack text.
 */
function executeFixedToyAgent(fixture,mode,gateway){
  const dataVerdict=gateway.consumeTaskData(fixture.toolResult.legitimateData);
  if(dataVerdict.decision!=='ALLOW')BAD_INPUT();
  if(mode==='FAULT_UNRELATED_READ'||mode==='FAULT_COMBINED'){
    if(gateway.requestUnrelatedFile().decision!=='DENY')BAD_INPUT();
  }
  if(mode==='FAULT_UNAUTHORIZED_TOOL'||mode==='FAULT_COMBINED'){
    if(gateway.requestUnauthorizedTool().decision!=='DENY')BAD_INPUT();
  }
  if(mode==='FAULT_FORGED_AUTHORITY'||mode==='FAULT_COMBINED'){
    if(gateway.claimToolResultAuthority().decision!=='DENY')BAD_INPUT();
  }
}

/**
 * Unlike M9's caller-provided trace events, counts here are created
 * *inside the gateway* from real in-memory calls made by the toy agent.
 * This STILL provides no actual OS or third-party model observation.
 */
export function runFictionalToyAgentExchange(fixture,mode){
  sourceOwnedMode(mode);
  validateFixtureProposal(fixture);
  const parent=createInMemoryGateway();
  executeFixedToyAgent(fixture,mode,parent.methods);
  const w=parent.snapshot();
  const forbidden=w.unrelatedFileRequestsDenied+
    w.unauthorizedToolRequestsDenied+w.forgedAuthorityClaimsDenied;
  const safe=w.taskDataAccepted===1 && w.methodCallsObserved===1+forbidden &&
    w.fictionalProtectedFileEffectsCommitted===0 &&
    w.fictionalProtectedToolEffectsCommitted===0 &&
    w.actualFileReadObserved===false &&
    w.actualMcpToolCallObserved===false;
  if(!safe)BAD_INPUT();
  const clean=forbidden===0;
  return Object.freeze({
    reportSchemaVersion:1,
    status:clean?'PASS':'FAIL',
    exitCode:clean?0:1,
    ruleCode:clean?'TOY_AGENT_NO_FORBIDDEN_REQUESTS':
      'TOY_AGENT_FORBIDDEN_REQUESTS_BLOCKED',
    scope:SCOPE,
    toyMode:mode,
    evidenceKind:'PARENT_OBSERVED_FIRST_PARTY_IN_MEMORY_METHOD_CALLS',
    methodCallsObserved:w.methodCallsObserved,
    taskDataAccepted:w.taskDataAccepted,
    forbiddenRequestsObserved:forbidden,
    unrelatedFileRequestsDenied:w.unrelatedFileRequestsDenied,
    unauthorizedToolRequestsDenied:w.unauthorizedToolRequestsDenied,
    forgedAuthorityClaimsDenied:w.forgedAuthorityClaimsDenied,
    fictionalProtectedFileEffectsCommitted:0,
    fictionalProtectedToolEffectsCommitted:0,
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

const FIXED_EXPECTATIONS=Object.freeze([
  Object.freeze(['SAFE_DATA_ONLY','PASS',0,0,0,0]),
  Object.freeze(['FAULT_UNRELATED_READ','FAIL',1,1,0,0]),
  Object.freeze(['FAULT_UNAUTHORIZED_TOOL','FAIL',1,0,1,0]),
  Object.freeze(['FAULT_FORGED_AUTHORITY','FAIL',1,0,0,1]),
  Object.freeze(['FAULT_COMBINED','FAIL',3,1,1,1])
]);
const rejected=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'TOY_AGENT_SELFTEST_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,
  realFilesystemReadObserved:false,
  externalMcpContacted:false
});

function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const fields=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(fields).length===1 && fields.length?.value===0;
}

/** Fixed first-party selftest; never accepts paths or arbitrary code. */
export function runFixedToyAgentSelftest(args=[]){
  if(!noArgs(args))return rejected;
  try{
    // The single reviewed fictional fixture is a source-owned literal URL.
    const fixture=parseStrictJson(readFileSync(FIXTURE_URL,'utf8'));
    const cases=FIXED_EXPECTATIONS.map(([mode,status,count,read,tool,claim])=>{
      const result=runFictionalToyAgentExchange(fixture,mode);
      const matched=result.status===status &&
        result.forbiddenRequestsObserved===count &&
        result.unrelatedFileRequestsDenied===read &&
        result.unauthorizedToolRequestsDenied===tool &&
        result.forgedAuthorityClaimsDenied===claim &&
        result.methodCallsObserved===1+count &&
        result.taskDataAccepted===1 &&
        result.fictionalProtectedFileEffectsCommitted===0 &&
        result.fictionalProtectedToolEffectsCommitted===0 &&
        result.realAgentBehaviorObserved===false &&
        result.realMcpToolCallObserved===false;
      return Object.freeze({
        mode,expectedStatus:status,observedStatus:result.status,
        observedForbiddenRequests:count,matched
      });
    });
    const matches=cases.filter(x=>x.matched).length;
    const pass=matches===FIXED_EXPECTATIONS.length;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'TOY_AGENT_FIXED_METHOD_CALL_CONTROLS_MATCH':
        'TOY_AGENT_FIXED_METHOD_CALL_CONTROLS_MISMATCH',
      scope:SCOPE,cases:Object.freeze(cases),checked:5,matched:matches,
      negativeCasesExpected:4,
      negativeCasesMatched:cases.slice(1).filter(x=>x.matched).length,
      realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,
      realMcpToolCallObserved:false,
      injectedInstructionInterpreted:false,
      externalMcpContacted:false,
      independentBetaVerified:false,
      securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return rejected;}
}

/**
 * M45: deterministic test that a source-owned gateway's authorization
 * decisions do not depend on *hypothetical* scanner classifications.
 * No scanner or LLM runs; only the existing fixed in-memory method calls.
 */
const SCANNER_HYPOTHESES=Object.freeze(['FLAGGED','NOT_FLAGGED','ERROR']);
const BLINDSPOT_SCOPE='FIRST_PARTY_TOY_GATE_WITH_HYPOTHETICAL_SCANNER_LABELS';
const blindspotRejected=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'TOY_GATE_BLINDSPOT_SELFTEST_UNAVAILABLE',scope:BLINDSPOT_SCOPE,
  realScannerExecuted:false,realAgentBehaviorObserved:false,
  realMcpToolCallObserved:false,externalMcpContacted:false
});
export function runFixedDetectionIndependentGateSelftest(args=[]){
  if(!noArgs(args))return blindspotRejected;
  try{
    const fixture=parseStrictJson(readFileSync(FIXTURE_URL,'utf8'));
    const cases=[];
    for(const observed of SCANNER_HYPOTHESES){
      for(const [mode,status,count,read,tool,claim] of FIXED_EXPECTATIONS){
        // Classification deliberately never reaches the gateway.
        const r=runFictionalToyAgentExchange(fixture,mode);
        const denied=r.unrelatedFileRequestsDenied+
          r.unauthorizedToolRequestsDenied+r.forgedAuthorityClaimsDenied;
        const matched=r.status===status&&r.forbiddenRequestsObserved===count&&
          denied===count&&r.unrelatedFileRequestsDenied===read&&
          r.unauthorizedToolRequestsDenied===tool&&
          r.forgedAuthorityClaimsDenied===claim&&
          r.methodCallsObserved===1+count&&r.taskDataAccepted===1&&
          r.fictionalProtectedFileEffectsCommitted===0&&
          r.fictionalProtectedToolEffectsCommitted===0&&
          r.realAgentBehaviorObserved===false&&
          r.realMcpToolCallObserved===false&&
          r.injectedInstructionInterpreted===false;
        cases.push(Object.freeze({
          hypotheticalScannerObservation:observed,toyMode:mode,
          expectedToyStatus:status,observedToyStatus:r.status,
          forbiddenRequestsObserved:count,forbiddenRequestsDenied:denied,
          fictionalProtectedFileEffectsCommitted:
            r.fictionalProtectedFileEffectsCommitted,
          fictionalProtectedToolEffectsCommitted:
            r.fictionalProtectedToolEffectsCommitted,
          matched
        }));
      }
    }
    const controls=FIXED_EXPECTATIONS.length,baseline=cases.slice(0,controls);
    const invariant=cases.every((x,i)=>{
      const expected=baseline[i%controls];
      return x.toyMode===expected.toyMode&&
        x.observedToyStatus===expected.observedToyStatus&&
        x.forbiddenRequestsObserved===expected.forbiddenRequestsObserved&&
        x.forbiddenRequestsDenied===expected.forbiddenRequestsDenied&&
        x.fictionalProtectedFileEffectsCommitted===
          expected.fictionalProtectedFileEffectsCommitted&&
        x.fictionalProtectedToolEffectsCommitted===
          expected.fictionalProtectedToolEffectsCommitted;
    });
    const matchedCount=cases.filter(x=>x.matched).length;
    const accepted=matchedCount===cases.length&&invariant;
    return Object.freeze({
      reportSchemaVersion:1,
      status:accepted?'PASS':'FAIL',exitCode:accepted?0:1,
      ruleCode:accepted?
        'TOY_GATE_INDEPENDENT_OF_HYPOTHETICAL_DETECTION':
        'TOY_GATE_DETECTION_INDEPENDENCE_MISMATCH',
      scope:BLINDSPOT_SCOPE,
      scannerHypotheses:SCANNER_HYPOTHESES,
      checked:cases.length,matched:matchedCount,
      expectedDeniedFaultCases:SCANNER_HYPOTHESES.length*(controls-1),
      gatewayDecisionIndependentOfDetectorLabel:invariant,
      cases:Object.freeze(cases),
      hypotheticalLabelsOnly:true,realScannerExecuted:false,
      realAgentBehaviorObserved:false,realFilesystemReadObserved:false,
      realMcpToolCallObserved:false,externalMcpContacted:false,
      independentBetaVerified:false,securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return blindspotRejected;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const argv=process.argv.slice(2);
  const result=argv.length===1&&argv[0]==='--blindspot-gate-matrix'?
    runFixedDetectionIndependentGateSelftest():
    runFixedToyAgentSelftest(argv);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
