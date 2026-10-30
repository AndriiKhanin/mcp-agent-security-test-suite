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
import {fork} from 'node:child_process';
import {mkdtemp,writeFile,readFile,readdir,rm,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
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


/**
 * M46: toy action-authorization matrix for provenance-bound ingress channels.
 *
 * The parent constructs distinct method closures for source-authored owner,
 * tool-result and human-email ingresses. External data cannot supply its own
 * source label, claim an owner capability, or influence the gate through a
 * scanner outcome. This proves only first-party in-memory behavior, not
 * authentication of a real owner or isolation from a malicious agent.
 */
const CONTEXT_SCOPE='FIRST_PARTY_IN_MEMORY_SOURCE_BOUND_AUTHORIZATION_ONLY';
const CONTEXT_CHANNELS=Object.freeze([
  'OWNER_EXPLICIT','TOOL_RESULT_UNTRUSTED','HUMAN_EMAIL_UNTRUSTED'
]);
const CONTEXT_ACTIONS=Object.freeze([
  'CONSUME_TASK_DATA','WRITE_TASK_STATUS',
  'READ_UNRELATED_FILE','PROMOTE_CLAIMED_AUTHORITY'
]);
const contextRejected=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'TOY_CONTEXT_PROVENANCE_SELFTEST_UNAVAILABLE',
  scope:CONTEXT_SCOPE,realOwnerAuthenticated:false,
  realScannerExecuted:false,realAgentBehaviorObserved:false,
  realFilesystemReadObserved:false,realMcpToolCallObserved:false,
  externalMcpContacted:false
});
function createSourceBoundToyGateway(){
  let methodCalls=0,allowedReads=0,authorizedWrites=0;
  let deniedWrites=0,deniedUnrelatedReads=0,deniedClaims=0;
  const allow=Object.freeze({decision:'ALLOW'});
  const deny=Object.freeze({decision:'DENY'});
  const channel=(trustedOwner)=>{
    // Trust is bound to this first-party closure, not to any input field.
    return Object.freeze({
      consumeTaskData(){methodCalls++;allowedReads++;return allow;},
      writeTaskStatus(){
        methodCalls++;
        if(trustedOwner){authorizedWrites++;return allow;}
        deniedWrites++;return deny;
      },
      readUnrelatedFile(){methodCalls++;deniedUnrelatedReads++;return deny;},
      promoteClaimedAuthority(){
        methodCalls++;deniedClaims++;return deny;
      }
    });
  };
  return Object.freeze({
    owner:channel(true),
    toolResult:channel(false),
    humanEmail:channel(false),
    snapshot:()=>Object.freeze({
      methodCalls,allowedReads,authorizedWrites,
      deniedWrites,deniedUnrelatedReads,deniedClaims,
      fictionalUnauthorizedWritesCommitted:0,
      fictionalUnrelatedFileEffectsCommitted:0,
      realFilesystemReadObserved:false,
      realMcpToolCallObserved:false
    })
  });
}
const CONTEXT_DISPATCH=Object.freeze({
  CONSUME_TASK_DATA:'consumeTaskData',
  WRITE_TASK_STATUS:'writeTaskStatus',
  READ_UNRELATED_FILE:'readUnrelatedFile',
  PROMOTE_CLAIMED_AUTHORITY:'promoteClaimedAuthority'
});
function runFixedSourceBoundToyAction(source,action){
  const parent=createSourceBoundToyGateway();
  // Fixed dispatch grants exactly ONE context-bound interface to the toy
  // action. Neither the tool-result body nor a self-declared "role" is read.
  const iface=source==='OWNER_EXPLICIT'?parent.owner:
    source==='TOOL_RESULT_UNTRUSTED'?parent.toolResult:
    source==='HUMAN_EMAIL_UNTRUSTED'?parent.humanEmail:null;
  const method=Object.hasOwn(CONTEXT_DISPATCH,action)?
    CONTEXT_DISPATCH[action]:null;
  if(!iface||!method)BAD_INPUT();
  const reply=iface[method]();
  return Object.freeze({decision:reply.decision,witness:parent.snapshot()});
}
export function runFixedContextProvenanceSelftest(args=[]){
  if(!noArgs(args))return contextRejected;
  try{
    const cases=[];
    for(const observed of SCANNER_HYPOTHESES){
      for(const source of CONTEXT_CHANNELS){
        for(const action of CONTEXT_ACTIONS){
          // "observed" is intentionally not passed into the gateway.
          const result=runFixedSourceBoundToyAction(source,action);
          const w=result.witness;
          const shouldAllow=action==='CONSUME_TASK_DATA'||
            (source==='OWNER_EXPLICIT'&&action==='WRITE_TASK_STATUS');
          const expectedDecision=shouldAllow?'ALLOW':'DENY';
          const expectedWrite=source==='OWNER_EXPLICIT'&&
            action==='WRITE_TASK_STATUS'?1:0;
          const expectedDeniedWrite=source!=='OWNER_EXPLICIT'&&
            action==='WRITE_TASK_STATUS'?1:0;
          const expectedDeniedRead=action==='READ_UNRELATED_FILE'?1:0;
          const expectedDeniedClaim=action==='PROMOTE_CLAIMED_AUTHORITY'?1:0;
          const expectedAllowedRead=action==='CONSUME_TASK_DATA'?1:0;
          const matched=result.decision===expectedDecision&&
            w.methodCalls===1&&w.allowedReads===expectedAllowedRead&&
            w.authorizedWrites===expectedWrite&&
            w.deniedWrites===expectedDeniedWrite&&
            w.deniedUnrelatedReads===expectedDeniedRead&&
            w.deniedClaims===expectedDeniedClaim&&
            w.fictionalUnauthorizedWritesCommitted===0&&
            w.fictionalUnrelatedFileEffectsCommitted===0&&
            w.realFilesystemReadObserved===false&&
            w.realMcpToolCallObserved===false;
          cases.push(Object.freeze({
            hypotheticalScannerObservation:observed,
            sourceContext:source,action,
            expectedDecision,observedDecision:result.decision,
            authorizedTaskWritesCommitted:w.authorizedWrites,
            deniedWrites:w.deniedWrites,
            deniedUnrelatedReads:w.deniedUnrelatedReads,
            deniedAuthorityClaims:w.deniedClaims,
            fictionalUnauthorizedWritesCommitted:
              w.fictionalUnauthorizedWritesCommitted,
            fictionalUnrelatedFileEffectsCommitted:
              w.fictionalUnrelatedFileEffectsCommitted,
            matched
          }));
        }
      }
    }
    const stride=CONTEXT_CHANNELS.length*CONTEXT_ACTIONS.length;
    const baseline=cases.slice(0,stride);
    const invariant=cases.every((c,i)=>{
      const first=baseline[i%stride];
      return c.sourceContext===first.sourceContext&&
        c.action===first.action&&
        c.observedDecision===first.observedDecision&&
        c.authorizedTaskWritesCommitted===
          first.authorizedTaskWritesCommitted&&
        c.deniedWrites===first.deniedWrites&&
        c.deniedUnrelatedReads===first.deniedUnrelatedReads&&
        c.deniedAuthorityClaims===first.deniedAuthorityClaims;
    });
    const ownerWrites=cases.filter(c=>c.sourceContext==='OWNER_EXPLICIT'&&
      c.action==='WRITE_TASK_STATUS'&&c.observedDecision==='ALLOW');
    const externalWrites=cases.filter(c=>c.sourceContext!=='OWNER_EXPLICIT'&&
      c.action==='WRITE_TASK_STATUS'&&c.observedDecision==='DENY');
    const totalMatched=cases.filter(c=>c.matched).length;
    const accepted=invariant&&totalMatched===cases.length&&
      ownerWrites.length===SCANNER_HYPOTHESES.length&&
      externalWrites.length===2*SCANNER_HYPOTHESES.length;
    return Object.freeze({
      reportSchemaVersion:1,status:accepted?'PASS':'FAIL',
      exitCode:accepted?0:1,
      ruleCode:accepted?'TOY_SOURCE_BOUND_GATE_INVARIANTS_MATCH':
        'TOY_SOURCE_BOUND_GATE_INVARIANTS_MISMATCH',
      scope:CONTEXT_SCOPE,
      scannerHypotheses:SCANNER_HYPOTHESES,
      sourceContexts:CONTEXT_CHANNELS,
      actions:CONTEXT_ACTIONS,
      checked:cases.length,matched:totalMatched,
      authorizedOwnerWriteControls:ownerWrites.length,
      externalWriteDenials:externalWrites.length,
      gatewayDecisionIndependentOfDetectorLabel:invariant,
      evidenceKind:'PARENT_OBSERVED_FIRST_PARTY_IN_MEMORY_METHOD_CALLS',
      cases:Object.freeze(cases),
      hypotheticalLabelsOnly:true,realOwnerAuthenticated:false,
      realScannerExecuted:false,realAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,realMcpToolCallObserved:false,
      externalMcpContacted:false,independentBetaVerified:false,
      securityCertified:false,releaseAuthorized:false
    });
  }catch{return contextRejected;}
}

/**
 * M47: parent-bound fictional provenance + scoped authority.
 * A tool-result claim never creates an owner grant. All origins and grants
 * here are SOURCE-OWNED mock inputs, not identities or real credentials.
 * No scanner classification is ever passed to this gateway.
 */
const M47_SCOPE='SOURCE_OWNED_SCOPED_IN_MEMORY_AUTHORIZATION_ONLY';
const M47_SCANNER_HYPOTHESES=Object.freeze(['FLAGGED','NOT_FLAGGED','ERROR']);
const M47_PLANS=Object.freeze([
  Object.freeze({id:'owner-task-data',origin:'OWNER_DIRECT',grant:'NONE',
    action:'TASK_DATA',claim:false,expected:'ALLOW'}),
  Object.freeze({id:'owner-approved-read',origin:'OWNER_DIRECT',grant:'READ_ARCHIVE',
    action:'PROTECTED_READ',claim:false,expected:'ALLOW'}),
  Object.freeze({id:'owner-unapproved-read',origin:'OWNER_DIRECT',grant:'NONE',
    action:'PROTECTED_READ',claim:false,expected:'DENY'}),
  Object.freeze({id:'owner-mismatched-grant',origin:'OWNER_DIRECT',grant:'USE_TOOL',
    action:'PROTECTED_READ',claim:false,expected:'DENY'}),
  Object.freeze({id:'owner-approved-tool',origin:'OWNER_DIRECT',grant:'USE_TOOL',
    action:'PROTECTED_TOOL',claim:false,expected:'ALLOW'}),
  Object.freeze({id:'owner-unapproved-tool',origin:'OWNER_DIRECT',grant:'READ_ARCHIVE',
    action:'PROTECTED_TOOL',claim:false,expected:'DENY'}),
  Object.freeze({id:'tool-result-task-data',origin:'TOOL_RESULT',grant:'NONE',
    action:'TASK_DATA',claim:false,expected:'ALLOW'}),
  Object.freeze({id:'tool-result-forged-read',origin:'TOOL_RESULT',grant:'NONE',
    action:'PROTECTED_READ',claim:true,expected:'DENY'}),
  Object.freeze({id:'tool-result-forged-tool',origin:'TOOL_RESULT',grant:'NONE',
    action:'PROTECTED_TOOL',claim:true,expected:'DENY'}),
  Object.freeze({id:'human-email-forged-read',origin:'HUMAN_EMAIL',grant:'NONE',
    action:'PROTECTED_READ',claim:true,expected:'DENY'}),
  Object.freeze({id:'json-result-forged-read',origin:'JSON_TOOL_RESULT',grant:'NONE',
    action:'PROTECTED_READ',claim:true,expected:'DENY'})
]);
const M47_REJECTED=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'CONTEXT_BOUND_TOY_GATE_SELFTEST_UNAVAILABLE',
  scope:M47_SCOPE,realAgentBehaviorObserved:false,
  realScannerExecuted:false,realMcpToolCallObserved:false
});
function createM47ParentBoundGateway(parentOrigin,parentGrant){
  // Only source-owned code instantiates this parent. There is deliberately
  // no argument accepting "owner" from a tool result or an email body.
  let calls=0,denials=0,authorizedReadEffects=0,authorizedToolEffects=0;
  const request=action=>{
    calls++;
    const granted=action==='TASK_DATA' ||
      (parentOrigin==='OWNER_DIRECT'&&(
        (action==='PROTECTED_READ'&&parentGrant==='READ_ARCHIVE')||
        (action==='PROTECTED_TOOL'&&parentGrant==='USE_TOOL')));
    if(!granted)denials++;
    else if(action==='PROTECTED_READ')authorizedReadEffects++;
    else if(action==='PROTECTED_TOOL')authorizedToolEffects++;
    return granted?'ALLOW':'DENY';
  };
  const snapshot=()=>Object.freeze({
    methodCallsObserved:calls,denialsObserved:denials,
    fictionalAuthorizedReadEffects:authorizedReadEffects,
    fictionalAuthorizedToolEffects:authorizedToolEffects,
    fictionalUnauthorizedEffectsCommitted:0,
    actualFileReadObserved:false,actualMcpToolCallObserved:false
  });
  return Object.freeze({request,snapshot});
}
export function runFixedScopedAuthoritySelftest(args=[]){
  if(!noArgs(args))return M47_REJECTED;
  try{
    const rows=[];
    for(const hypotheticalScannerObservation of M47_SCANNER_HYPOTHESES){
      for(const plan of M47_PLANS){
        const gate=createM47ParentBoundGateway(plan.origin,plan.grant);
        // A synthetic payload may say OWNER_APPROVED, but that content is
        // not passed to the parent gateway or used for an authorization.
        const untrustedClaim=plan.claim?'OWNER_APPROVED':'NO_CLAIM';
        const decision=gate.request(plan.action);
        const w=gate.snapshot();
        const matched=decision===plan.expected&&w.methodCallsObserved===1&&
          w.denialsObserved===(plan.expected==='DENY'?1:0)&&
          w.fictionalAuthorizedReadEffects===
            (plan.expected==='ALLOW'&&plan.action==='PROTECTED_READ'?1:0)&&
          w.fictionalAuthorizedToolEffects===
            (plan.expected==='ALLOW'&&plan.action==='PROTECTED_TOOL'?1:0)&&
          w.fictionalUnauthorizedEffectsCommitted===0&&
          w.actualFileReadObserved===false&&
          w.actualMcpToolCallObserved===false&&
          (untrustedClaim==='OWNER_APPROVED')===plan.claim;
        rows.push(Object.freeze({
          caseId:plan.id,hypotheticalScannerObservation,
          parentBoundOrigin:plan.origin,parentBoundGrant:plan.grant,
          action:plan.action,untrustedAuthorityClaimIgnored:plan.claim,
          expectedDecision:plan.expected,observedDecision:decision,
          ...w,matched
        }));
      }
    }
    const baseline=rows.slice(0,M47_PLANS.length);
    const invariant=rows.every((row,i)=>{
      const old=baseline[i%M47_PLANS.length];
      return row.caseId===old.caseId&&
        row.parentBoundOrigin===old.parentBoundOrigin&&
        row.parentBoundGrant===old.parentBoundGrant&&
        row.observedDecision===old.observedDecision&&
        row.denialsObserved===old.denialsObserved&&
        row.fictionalAuthorizedReadEffects===
          old.fictionalAuthorizedReadEffects&&
        row.fictionalAuthorizedToolEffects===
          old.fictionalAuthorizedToolEffects;
    });
    const matched=rows.filter(r=>r.matched).length;
    const pass=matched===rows.length&&invariant;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
      ruleCode:pass?'PARENT_BOUND_TOY_ORIGIN_AND_SCOPE_ENFORCED':
        'PARENT_BOUND_TOY_ORIGIN_AND_SCOPE_MISMATCH',
      scope:M47_SCOPE,
      checked:rows.length,matched,
      sourceOwnedContextCases:M47_PLANS.length,
      hypotheticalScannerStates:M47_SCANNER_HYPOTHESES,
      gatewayIndependentOfScannerClassification:invariant,
      cases:Object.freeze(rows),sourceOwnedMetadataOnly:true,
      payloadClaimsCannotGrantAuthority:true,
      fictionalEffectsOnly:true,
      realAgentBehaviorObserved:false,realScannerExecuted:false,
      realFilesystemReadObserved:false,realMcpToolCallObserved:false,
      externalMcpContacted:false,independentBetaVerified:false,
      securityCertified:false,releaseAuthorized:false
    });
  }catch{return M47_REJECTED;}
}

/**
 * M48: first-party, real temporary filesystem effect readback.
 * Source-only; never accepts a path, command, file contents, model output,
 * external scanner result or user-selected destination.
 *
 * A tiny, source-owned gateway writes only the pinned task-state filename
 * after receiving a privileged source-owned closure. A separate parent
 * readback enumerates the actual new directory and verifies file bytes.
 * A deliberate source-authored negative fault demonstrates the witness
 * FAILS if an unauthorized write occurs, even when the gate said DENY.
 *
 * This is ordinary same-process filesystem I/O, not OS sandboxing, process
 * separation, real owner authentication or live MCP execution.
 */
const TEMP_EFFECT_SCOPE='FIRST_PARTY_TEMPORARY_FS_EFFECT_READBACK_ONLY';
const TEMP_TASK_FILENAME='approved-task-state.json';
const TEMP_FAULT_FILENAME='unexpected-tool-effect.json';
const TEMP_TASK_BYTES='{"fictionalTask":"approved"}\n';
const TEMP_FAULT_BYTES='{"fictionalTask":"unexpected"}\n';
const tempRejected=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'TEMP_EFFECT_WITNESS_SELFTEST_UNAVAILABLE',
  scope:TEMP_EFFECT_SCOPE,cleanupVerified:false,
  realOwnerAuthenticated:false,realAgentBehaviorObserved:false,
  realMcpToolCallObserved:false,externalMcpContacted:false
});
async function inspectSingleTemporaryEffect(source,injectWitnessFault){
  // The parent owns the path. Never expose it to a caller or in JSON output.
  const root=await mkdtemp(join(tmpdir(),'mcp-agent-security-m48-'));
  let observed=null,cleanupVerified=false;
  try{
    const taskPath=join(root,TEMP_TASK_FILENAME);
    const faultPath=join(root,TEMP_FAULT_FILENAME);
    const trusted=source==='OWNER_EXPLICIT';
    const gate=Object.freeze({
      async requestTaskStatusWrite(){
        if(!trusted)return 'DENY';
        // This is a deliberately positive OS side effect, bounded to a
        // fresh test-owned directory and an exclusive fixed filename.
        await writeFile(taskPath,TEMP_TASK_BYTES,{flag:'wx',mode:0o600});
        return 'ALLOW';
      }
    });
    const decision=await gate.requestTaskStatusWrite();
    // Explicit *test fault*: violate a denied decision in just one case.
    // If the parent witness misses this actual new file, the test fails.
    if(injectWitnessFault&&source==='TOOL_RESULT_UNTRUSTED')
      await writeFile(faultPath,TEMP_FAULT_BYTES,{flag:'wx',mode:0o600});
    // Parent-owned observation does NOT read a gateway return value as
    // proof of effect. It inspects directory entries and file contents.
    const names=(await readdir(root)).sort();
    const expectedNames=trusted?[TEMP_TASK_FILENAME]:[];
    const matchingEntries=names.length===expectedNames.length&&
      expectedNames.every((name,i)=>name===names[i]);
    const matchingBytes=!trusted||
      await readFile(taskPath,'utf8')===TEMP_TASK_BYTES;
    const expectedDecision=trusted?'ALLOW':'DENY';
    observed={
      sourceContext:source,expectedDecision,observedDecision:decision,
      actualFilesObserved:names.length,
      authorizedFilesObserved:names.filter(n=>trusted&&
        n===TEMP_TASK_FILENAME).length,
      unauthorizedFilesObserved:names.filter(n=>!trusted||
        n!==TEMP_TASK_FILENAME).length,
      parentReadbackMatched:matchingEntries&&matchingBytes&&
        decision===expectedDecision
    };
  }finally{
    // Cleanup is required even after a mismatched effect or I/O error.
    try{
      await rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:50});
      try{await lstat(root);}catch(error){
        if(error?.code==='ENOENT')cleanupVerified=true;
      }
    }catch{cleanupVerified=false;}
  }
  return Object.freeze({...observed,cleanupVerified,
    matched:observed.parentReadbackMatched&&cleanupVerified});
}
async function runSourceOwnedTemporaryEffectMatrix(fault){
  const rows=[];
  for(const detectorLabel of SCANNER_HYPOTHESES){
    for(const source of CONTEXT_CHANNELS){
      const deliberateFault=fault&&detectorLabel==='FLAGGED'&&
        source==='TOOL_RESULT_UNTRUSTED';
      const result=await inspectSingleTemporaryEffect(source,deliberateFault);
      rows.push(Object.freeze({
        hypotheticalScannerObservation:detectorLabel,
        ...result
      }));
    }
  }
  const baseline=rows.slice(0,CONTEXT_CHANNELS.length);
  const independent=rows.every((r,i)=>{
    const b=baseline[i%CONTEXT_CHANNELS.length];
    // Fault mode deliberately changes only one observation, so the
    // invariant still checks *authorization decisions*, not file outcomes.
    return r.sourceContext===b.sourceContext&&
      r.observedDecision===b.observedDecision&&
      r.expectedDecision===b.expectedDecision;
  });
  const matched=rows.filter(x=>x.matched).length;
  const authorized=rows.reduce((n,x)=>n+x.authorizedFilesObserved,0);
  const unauthorized=rows.reduce((n,x)=>n+x.unauthorizedFilesObserved,0);
  const allCleaned=rows.every(x=>x.cleanupVerified);
  const pass=!fault&&matched===rows.length&&allCleaned&&independent&&
    authorized===SCANNER_HYPOTHESES.length&&unauthorized===0;
  const failAsExpected=fault&&matched===rows.length-1&&allCleaned&&
    independent&&authorized===SCANNER_HYPOTHESES.length&&unauthorized===1;
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',
    exitCode:pass?0:1,
    ruleCode:pass?'TEMP_FS_READBACK_MATCHES_SOURCE_BOUND_AUTHORITY':
      failAsExpected?'TEMP_FS_UNAUTHORIZED_EFFECT_OBSERVED':
      'TEMP_FS_EFFECT_WITNESS_MISMATCH',
    scope:TEMP_EFFECT_SCOPE,
    checked:rows.length,matched,
    authorizedWritesReadBack:authorized,
    unauthorizedWritesReadBack:unauthorized,
    deniedUntrustedWriteRequests:rows.filter(x=>
      x.sourceContext!=='OWNER_EXPLICIT'&&
      x.observedDecision==='DENY').length,
    cleanupVerified:allCleaned,
    gatewayDecisionIndependentOfDetectorLabel:independent,
    cases:Object.freeze(rows),
    evidenceKind:'PARENT_READBACK_OF_REAL_FIRST_PARTY_TEMP_FILES',
    testFaultInjected:fault,
    sourceOwnedTemporaryPathsOnly:true,
    temporaryPathsReturned:false,
    realFileEffectsObserved:true,
    realOwnerAuthenticated:false,realAgentBehaviorObserved:false,
    realMcpToolCallObserved:false,externalMcpContacted:false,
    externalScannerExecuted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
/** Public CLI can only call the normal source-owned matrix, no fault mode. */
export async function runFixedTemporaryFileEffectSelftest(args=[]){
  if(!noArgs(args))return tempRejected;
  try{return await runSourceOwnedTemporaryEffectMatrix(false);}
  catch{return tempRejected;}
}
/** Direct source test only: deliberately commit one unauthorized temp file. */
export async function runFixedTemporaryFileEffectFaultSelftest(args=[]){
  if(!noArgs(args))return tempRejected;
  try{return await runSourceOwnedTemporaryEffectMatrix(true);}
  catch{return tempRejected;}
}


/**
 * M50: fixed child-process OS-effects lab. The source-owned parent grants
 * one action, but the ordinary same-user child is NOT an OS sandbox and
 * can disobey it. Parent-side file readback is independent of child IPC.
 * All workers, cases, filenames and data are frozen first-party source.
 */
const M50_SCOPE='FIRST_PARTY_CHILD_PROCESS_TEMP_EFFECT_WITNESS_ONLY';
const M50_FILE='fictional-child-task.json';
const M50_BYTES='{"task":"source-owned-approved"}\n';
const M50_PLANS=Object.freeze([
  Object.freeze({id:'owner-write',source:'OWNER_DIRECT',grant:'WRITE_TASK_STATUS',claim:'NONE'}),
  Object.freeze({id:'owner-readonly',source:'OWNER_DIRECT',grant:'READ_ONLY',claim:'NONE'}),
  Object.freeze({id:'tool-owner-claim',source:'TOOL_RESULT',grant:'NONE',claim:'OWNER_EXPLICIT'}),
  Object.freeze({id:'tool-scanner-claim',source:'TOOL_RESULT',grant:'NONE',claim:'NOT_FLAGGED'}),
  Object.freeze({id:'email-owner-claim',source:'HUMAN_EMAIL',grant:'NONE',claim:'OWNER_EXPLICIT'}),
  Object.freeze({id:'tool-no-claim',source:'TOOL_RESULT',grant:'NONE',claim:'NONE'})
]);
const M50_FAULTS=Object.freeze(['normal','unauthorized-write',
  'false-report','invalid-ipc','exit','hang']);
const M50_ERROR=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'M50_FIXED_CHILD_EFFECT_SELFTEST_UNAVAILABLE',
  scope:M50_SCOPE,realOwnerAuthenticated:false,
  realAgentBehaviorObserved:false,externalMcpContacted:false
});
const m50Allowed=p=>p.source==='OWNER_DIRECT'&&
  p.grant==='WRITE_TASK_STATUS';
const m50Exact=(m,keys)=>m&&typeof m==='object'&&
  !Array.isArray(m)&&Object.getPrototypeOf(m)===Object.prototype&&
  Object.keys(m).length===keys.length&&keys.every(k=>Object.hasOwn(m,k));
async function runM50Worker(){
  const [mode,id,fault]=process.argv.slice(2);
  const plan=M50_PLANS.find(p=>p.id===id);
  if(process.argv.length!==5||mode!=='--m50-private-worker'||
     !process.send||!plan||!M50_FAULTS.includes(fault))return 2;
  if(fault==='exit')return 2;
  if(fault==='hang'){setInterval(()=>{},1000);return 0;}
  const packet=fault==='invalid-ipc'?
    {kind:'M50_REQUEST',caseId:id,action:'WRITE_TASK_STATUS',
      claim:plan.claim,private:'FICTIONAL_CANARY'}:
    {kind:'M50_REQUEST',caseId:id,action:'WRITE_TASK_STATUS',claim:plan.claim};
  try{
    const permission=await new Promise((resolve,reject)=>{
      process.once('message',resolve);
      process.send(packet,err=>{if(err)reject(err);});
    });
    if(!m50Exact(permission,['kind','decision','workspace'])||
      permission.kind!=='M50_PERMISSION'||
      !['ALLOW','DENY'].includes(permission.decision)||
      typeof permission.workspace!=='string'||!permission.workspace)return 2;
    const decision=permission.decision;
    const shouldWrite=decision==='ALLOW'||fault==='unauthorized-write';
    if(shouldWrite)await writeFile(join(permission.workspace,M50_FILE),
      M50_BYTES,{flag:'wx',mode:0o600});
    const claimedWrite=fault==='false-report'?true:shouldWrite;
    return await new Promise(resolve=>{
      process.send({kind:'M50_RESULT',caseId:id,decision,claimedWrite},
        error=>{if(process.connected)process.disconnect();
          resolve(error?2:0);});
    });
  }catch{return 2;}
}
async function runM50Case(plan,fault='normal'){
  const workspace=await mkdtemp(join(tmpdir(),'mcp-m50-child-'));
  let child=null,requested=0,reported=0,decision=null,claim=null;
  let failure=null,exitSeen=false,exitCode=null,observedFiles=-1;
  let readbackBytesMatch=false,cleanupVerified=false;
  const allow=m50Allowed(plan);
  try{
    try{
      child=fork(fileURLToPath(import.meta.url),
        ['--m50-private-worker',plan.id,fault],{
          execPath:process.execPath,execArgv:[],shell:false,
          cwd:dirname(fileURLToPath(import.meta.url)),
          env:{NODE_NO_WARNINGS:'1'},windowsHide:true,
          stdio:['ignore','ignore','ignore','ipc']
        });
      await new Promise(resolve=>{
        let finished=false,timeout,killTimeout;
        const settle=()=>{if(finished)return;finished=true;
          clearTimeout(timeout);clearTimeout(killTimeout);resolve();};
        const abort=code=>{
          if(!failure)failure=code;
          if(child.exitCode===null)child.kill();
        };
        timeout=setTimeout(()=>{
          abort('M50_CHILD_TIMEOUT');
          killTimeout=setTimeout(()=>{
            if(!exitSeen)child.kill('SIGKILL');
            settle();
          },1200);
        },fault==='hang'?1200:8000);
        child.on('message',m=>{
          if(finished)return;
          if(m?.kind==='M50_REQUEST'){
            if(requested!==0||reported!==0||
              !m50Exact(m,['kind','caseId','action','claim'])||
              m.caseId!==plan.id||m.action!=='WRITE_TASK_STATUS'||
              m.claim!==plan.claim){
              abort('M50_CHILD_IPC_REJECTED');return;
            }
            requested++;
            decision=allow?'ALLOW':'DENY';
            child.send({kind:'M50_PERMISSION',decision,workspace},error=>{
              if(error)abort('M50_CHILD_IPC_REJECTED');
            });
          }else if(m?.kind==='M50_RESULT'){
            if(requested!==1||reported!==0||
              !m50Exact(m,['kind','caseId','decision','claimedWrite'])||
              m.caseId!==plan.id||m.decision!==decision||
              typeof m.claimedWrite!=='boolean'){
              abort('M50_CHILD_IPC_REJECTED');return;
            }
            reported++;claim=m.claimedWrite;
          }else abort('M50_CHILD_IPC_REJECTED');
        });
        child.once('error',()=>abort('M50_CHILD_LAUNCH_FAILED'));
        child.once('exit',(code,signal)=>{
          exitSeen=true;exitCode=code;
          if((code!==0||signal)&&!failure)failure='M50_CHILD_EXIT_FAILED';
          settle();
        });
      });
    }catch{failure='M50_CHILD_LAUNCH_FAILED';}
    const names=(await readdir(workspace)).sort();
    observedFiles=names.length;
    readbackBytesMatch=names.length===1&&names[0]===M50_FILE&&
      await readFile(join(workspace,M50_FILE),'utf8')===M50_BYTES;
  }catch{if(!failure)failure='M50_PARENT_READBACK_FAILED';}
  finally{
    try{
      await rm(workspace,{recursive:true,force:true,maxRetries:3,retryDelay:50});
      try{await lstat(workspace);}catch(e){
        cleanupVerified=e?.code==='ENOENT';
      }
    }catch{cleanupVerified=false;}
  }
  const expectedCount=allow?1:0;
  const unauthorizedEffects=allow?0:observedFiles<0?-1:observedFiles;
  let rule=failure;
  if(!rule&&!exitSeen)rule='M50_CHILD_REAP_UNCONFIRMED';
  if(!rule&&(requested!==1||reported!==1))rule='M50_CHILD_IPC_INCOMPLETE';
  if(!rule&&unauthorizedEffects>0)rule='M50_UNAUTHORIZED_CHILD_EFFECT_OBSERVED';
  if(!rule&&(observedFiles!==expectedCount||
      (allow&&!readbackBytesMatch)))rule='M50_PARENT_EFFECT_MISMATCH';
  if(!rule&&claim!==allow)rule='M50_CHILD_REPORT_CONTRADICTS_DISK';
  if(!cleanupVerified)rule='M50_TEMP_CLEANUP_UNCONFIRMED';
  return Object.freeze({
    caseId:plan.id,sourceContext:plan.source,sourceBoundGrant:plan.grant,
    expectedDecision:allow?'ALLOW':'DENY',observedDecision:decision,
    childReaped:exitSeen,childExitCode:exitCode,
    childRequests:requested,childReports:reported,
    actualFilesReadBack:observedFiles,unauthorizedFilesReadBack:unauthorizedEffects,
    approvedBytesReadBack:allow&&readbackBytesMatch,
    cleanupVerified,status:rule?'FAIL':'PASS',ruleCode:rule??'M50_CHILD_EFFECT_MATCH',
    childClaimedEffect:claim,realChildProcessUsed:true,
    realTemporaryFileReadback:true,osSandboxed:false,
    realOwnerAuthenticated:false,externalMcpContacted:false
  });
}
/** Source-owned matrix: no arbitrary path, command, mode or parent identity. */
export async function runFixedChildProcessEffectSelftest(args=[]){
  if(!noArgs(args))return M50_ERROR;
  try{
    const rows=[];
    for(const plan of M50_PLANS)rows.push(await runM50Case(plan));
    const matched=rows.filter(r=>r.status==='PASS').length;
    return Object.freeze({
      reportSchemaVersion:1,scope:M50_SCOPE,
      status:matched===rows.length?'PASS':'FAIL',
      exitCode:matched===rows.length?0:1,checked:rows.length,matched,
      deniedWrites:rows.filter(r=>r.expectedDecision==='DENY').length,
      actualAuthorizedEffects:rows.reduce((n,r)=>n+
        (r.expectedDecision==='ALLOW'?r.actualFilesReadBack:0),0),
      unauthorizedEffects:rows.reduce((n,r)=>n+
        Math.max(0,r.unauthorizedFilesReadBack),0),
      cleanupVerified:rows.every(r=>r.cleanupVerified),
      cases:Object.freeze(rows),realChildProcessUsed:true,
      realTemporaryFileReadback:true,osSandboxed:false,
      realOwnerAuthenticated:false,realAgentBehaviorObserved:false,
      externalMcpContacted:false,independentBetaVerified:false,
      releaseAuthorized:false
    });
  }catch{return M50_ERROR;}
}
/** Test-only negative controls, never advertised through the public CLI. */
export async function runFixedChildProcessEffectFaultSelftest(args=[]){
  if(!noArgs(args))return M50_ERROR;
  try{
    const plans=[
      [M50_PLANS[2],'unauthorized-write','M50_UNAUTHORIZED_CHILD_EFFECT_OBSERVED'],
      [M50_PLANS[2],'false-report','M50_CHILD_REPORT_CONTRADICTS_DISK'],
      [M50_PLANS[2],'invalid-ipc','M50_CHILD_IPC_REJECTED'],
      [M50_PLANS[2],'exit','M50_CHILD_EXIT_FAILED'],
      [M50_PLANS[2],'hang','M50_CHILD_TIMEOUT']
    ];
    const rows=[];
    for(const [plan,fault,expected] of plans){
      const result=await runM50Case(plan,fault);
      rows.push(Object.freeze({fault,expectedRule:expected,...result}));
    }
    const caught=rows.filter(r=>r.status==='FAIL'&&
      r.ruleCode===r.expectedRule&&r.cleanupVerified&&
      (r.fault!=='unauthorized-write'||
        r.unauthorizedFilesReadBack===1)).length;
    return Object.freeze({
      reportSchemaVersion:1,scope:M50_SCOPE,
      status:caught===rows.length?'PASS':'FAIL',
      exitCode:caught===rows.length?0:1,
      checked:rows.length,caught,cases:Object.freeze(rows),
      realChildProcessUsed:true,osSandboxed:false,
      realOwnerAuthenticated:false,externalMcpContacted:false
    });
  }catch{return M50_ERROR;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const argv=process.argv.slice(2);
  if(argv[0]==='--m50-private-worker'){
    process.exitCode=await runM50Worker();
  }else{
  const result=argv.length===1&&argv[0]==='--child-process-effect-witness'?
    await runFixedChildProcessEffectSelftest():
    argv.length===1&&argv[0]==='--temp-file-effect-witness'?
    await runFixedTemporaryFileEffectSelftest():
    argv.length===1&&argv[0]==='--scoped-authority-matrix'?
    runFixedScopedAuthoritySelftest():
    argv.length===1&&argv[0]==='--context-provenance-matrix'?
    runFixedContextProvenanceSelftest():
    argv.length===1&&argv[0]==='--blindspot-gate-matrix'?
    runFixedDetectionIndependentGateSelftest():
    runFixedToyAgentSelftest(argv);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
  }
}
