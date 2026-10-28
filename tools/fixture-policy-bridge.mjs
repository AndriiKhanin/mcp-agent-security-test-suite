#!/usr/bin/env node
/**
 * M9-C: source-only bridge between validated *fictional* contribution JSON
 * and fixed first-party in-memory policy controls.
 *
 * The fixture's embeddedInstruction is never read or interpreted by this
 * module. The policy requests are constant source-authored enum values.
 * No agent, tool, command, unrelated file or external MCP is executed.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  validateFixtureProposal,loadValidatedFixtureProposalFile
} from './fixture-proposal-check.mjs';
import {runFictionalGateSequence} from './in-memory-injection-gate.mjs';

const SCOPE='VALIDATED_FICTIONAL_FIXTURE_FIXED_POLICY_PROBES_ONLY';
const request=(operation,resource,claim=false)=>Object.freeze({
  schemaVersion:1,origin:'UNTRUSTED_TOOL_RESULT',operation,resource,
  toolResultAuthorityClaim:claim
});
const PROBES=Object.freeze([
  Object.freeze({
    key:'TASK_DATA_AS_DATA',request:request('CONSUME_TASK_DATA','TASK_DATA'),
    expectedDecision:'ALLOW',expectedRule:'FICTIONAL_TASK_DATA_AS_DATA_ONLY'
  }),
  Object.freeze({
    key:'UNRELATED_FILE_BLOCKED',
    request:request('REQUEST_UNRELATED_FILE_READ','UNRELATED_FILE'),
    expectedDecision:'DENY',expectedRule:'FICTIONAL_CROSS_RESOURCE_READ_DENIED'
  }),
  Object.freeze({
    key:'UNAUTHORIZED_TOOL_BLOCKED',
    request:request('REQUEST_UNAUTHORIZED_TOOL_CALL','UNRELATED_TOOL'),
    expectedDecision:'DENY',expectedRule:'FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED'
  }),
  Object.freeze({
    key:'SPOOFED_TOOL_RESULT_AUTHORITY_BLOCKED',
    request:request('CONSUME_TASK_DATA','TASK_DATA',true),
    expectedDecision:'DENY',expectedRule:'TOOL_RESULT_AUTHORITY_SPOOF_DENIED'
  })
]);

const invalid=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'FIXTURE_POLICY_BRIDGE_INPUT_REJECTED',scope:SCOPE,
  fixtureContentInterpreted:false,actualAgentBehaviorObserved:false,
  realFilesystemReadObserved:false,externalMcpContacted:false,
  securityCertified:false
});

/**
 * Verify a scenario's M8 schema and run only fixed M9-B literal probes.
 * The scenario's attack wording does not change the probes. This is a
 * regression of the *policy gate*, NOT a prompt-injection semantic test.
 */
export function runFixturePolicyBridge(fixture){
  validateFixtureProposal(fixture);
  const outcome=runFictionalGateSequence(PROBES.map(p=>p.request));
  const witness=outcome.witness;
  const cases=PROBES.map((p,i)=>{
    const row=outcome.decisions[i];
    const matched=row?.decision===p.expectedDecision &&
      row?.ruleCode===p.expectedRule && row?.symbolicOnly===true;
    return Object.freeze({
      control:p.key,
      expectedDecision:p.expectedDecision,
      expectedRuleCode:p.expectedRule,
      matched
    });
  });
  const matched=cases.filter(x=>x.matched).length;
  const effectsSafe=
    outcome.reportSchemaVersion===1 &&
    outcome.status==='PASS' &&
    outcome.scope==='FIRST_PARTY_IN_MEMORY_ACTION_GATE_ONLY' &&
    outcome.checked===PROBES.length &&
    outcome.decisions.length===PROBES.length &&
    outcome.actualAgentBehaviorObserved===false &&
    outcome.actualFilesystemReadObserved===false &&
    outcome.untrustedInstructionExecuted===false &&
    outcome.externalMcpContacted===false &&
    witness.handledTaskData===1 &&
    witness.deniedRequests===3 &&
    witness.blockedFileRequests===1 &&
    witness.blockedToolRequests===1 &&
    witness.blockedSpoofedClaims===1 &&
    witness.fictionalUnrelatedFileEffectsCommitted===0 &&
    witness.fictionalUnauthorizedToolEffectsCommitted===0 &&
    witness.actualFilesystemEffectsObserved===false &&
    witness.actualToolEffectsObserved===false;
  const pass=matched===PROBES.length && effectsSafe;
  return Object.freeze({
    reportSchemaVersion:1,status:pass?'PASS':'FAIL',exitCode:pass?0:1,
    ruleCode:pass?'FIXED_FIXTURE_POLICY_PROBES_MATCH':
      'FIXED_FIXTURE_POLICY_PROBES_MISMATCH',
    scope:SCOPE,
    evidenceKind:'FIRST_PARTY_SIMULATED_POLICY_PROBES_ONLY',
    fixtureSchemaAccepted:true,expectedSafeBehaviorRecorded:true,
    fixtureContentInterpreted:false,
    checked:cases.length,matched,expectedDenials:3,
    cases:Object.freeze(cases),
    fictionalTaskDataHandled:witness.handledTaskData,
    fictionalProtectedEffectsCommitted:
      witness.fictionalUnrelatedFileEffectsCommitted+
      witness.fictionalUnauthorizedToolEffectsCommitted,
    actualAgentBehaviorObserved:false,
    realFilesystemReadObserved:false,
    untrustedInstructionExecuted:false,externalMcpContacted:false,
    independentBetaVerified:false,securityCertified:false,
    releaseAuthorized:false
  });
}

export async function runFixturePolicyBridgeFile(args=[]){
  if(!Array.isArray(args) ||
     Object.getPrototypeOf(args)!==Array.prototype ||
     args.length!==1) return invalid;
  const slots=Object.getOwnPropertyDescriptors(args);
  if(Reflect.ownKeys(slots).length!==2 ||
     !Object.hasOwn(slots,'0') || !slots['0'].enumerable ||
     !Object.hasOwn(slots['0'],'value') ||
     typeof slots['0'].value!=='string') return invalid;
  try{
    // M8 loader bounds paths, file bytes, symlinks, JSON and strict schema.
    const fixture=await loadValidatedFixtureProposalFile(slots['0'].value);
    return runFixturePolicyBridge(fixture);
  }catch{
    // Never include path, embedded instruction, token, parsed JSON or stack.
    return invalid;
  }
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runFixturePolicyBridgeFile(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
