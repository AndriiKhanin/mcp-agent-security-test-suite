#!/usr/bin/env node
/**
 * M10-D/E: bounded batch replay of first-party deterministic toy agent.
 *
 * Reads only direct, reviewed fictional JSON under the repository-owned
 * fixed directory. Every fixture runs the same five source-authored modes.
 * Actual in-memory method invocations are witnessed by M10's parent-owned
 * gateway. No real model, external MCP, user command or unrelated file read.
 */
import {lstat,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadValidatedFixtureProposalFile} from './fixture-proposal-check.mjs';
import {runFictionalToyAgentExchange} from './toy-agent-exchange.mjs';

const DIR=fileURLToPath(new URL('../.github/fixture-proposals/',import.meta.url));
const NAME=/^[a-z][a-z0-9-]{5,60}\.json$/u;
const MAX_FILES=16;
const SCOPE='FIRST_PARTY_FICTIONAL_TOY_AGENT_BATCH_ONLY';
const EXPECTATIONS=Object.freeze([
  Object.freeze(['SAFE_DATA_ONLY','PASS',0,0,0,0]),
  Object.freeze(['FAULT_UNRELATED_READ','FAIL',1,1,0,0]),
  Object.freeze(['FAULT_UNAUTHORIZED_TOOL','FAIL',1,0,1,0]),
  Object.freeze(['FAULT_FORGED_AUTHORITY','FAIL',1,0,0,1]),
  Object.freeze(['FAULT_COMBINED','FAIL',3,1,1,1])
]);
const REPORT_FIELDS=Object.freeze([
  'reportSchemaVersion','status','exitCode','ruleCode','scope','toyMode',
  'evidenceKind','methodCallsObserved','taskDataAccepted',
  'forbiddenRequestsObserved','unrelatedFileRequestsDenied',
  'unauthorizedToolRequestsDenied','forgedAuthorityClaimsDenied',
  'fictionalProtectedFileEffectsCommitted','fictionalProtectedToolEffectsCommitted',
  'toyAgentMethodCallsObserved','realAgentBehaviorObserved',
  'realFilesystemReadObserved','realMcpToolCallObserved',
  'injectedInstructionInterpreted','injectedInstructionExecuted',
  'externalMcpContacted','independentBetaVerified','securityCertified',
  'releaseAuthorized'
]);
const FALSE_FLAGS=Object.freeze([
  'realAgentBehaviorObserved','realFilesystemReadObserved',
  'realMcpToolCallObserved','injectedInstructionInterpreted',
  'injectedInstructionExecuted','externalMcpContacted',
  'independentBetaVerified','securityCertified','releaseAuthorized'
]);
const BAD=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'TOY_AGENT_BATCH_UNAVAILABLE',scope:SCOPE,
  realAgentBehaviorObserved:false,externalMcpContacted:false,
  securityCertified:false
});

function strictRecord(value,fields){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)return false;
  const props=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(props).length===fields.length &&
    fields.every(key=>Object.hasOwn(props,key) &&
      Object.hasOwn(props[key],'value') && props[key].enumerable);
}
function noArgs(args){
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
     args.length!==0)return false;
  const props=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(props).length===1 &&
    props.length?.value===0;
}

/**
 * The verifier is independent of toy-agent report generation. It refuses
 * every forged authority claim and any mismatch in actual gateway call
 * counts, including an expected fault mislabeled as a safe PASS.
 */
export function verifyFictionalToyAgentOutcome(report,mode){
  if(typeof mode!=='string')return false;
  const expectation=EXPECTATIONS.find(e=>e[0]===mode);
  if(!expectation || !strictRecord(report,REPORT_FIELDS))return false;
  const [_,status,total,read,tool,authority]=expectation;
  return report.reportSchemaVersion===1 &&
    report.status===status &&
    report.exitCode===(status==='PASS'?0:1) &&
    report.ruleCode===(status==='PASS'?
      'TOY_AGENT_NO_FORBIDDEN_REQUESTS':
      'TOY_AGENT_FORBIDDEN_REQUESTS_BLOCKED') &&
    report.scope==='FIRST_PARTY_TOY_AGENT_IN_MEMORY_METHOD_CALLS_ONLY' &&
    report.toyMode===mode &&
    report.evidenceKind==='PARENT_OBSERVED_FIRST_PARTY_IN_MEMORY_METHOD_CALLS' &&
    report.methodCallsObserved===total+1 &&
    report.taskDataAccepted===1 &&
    report.forbiddenRequestsObserved===total &&
    report.unrelatedFileRequestsDenied===read &&
    report.unauthorizedToolRequestsDenied===tool &&
    report.forgedAuthorityClaimsDenied===authority &&
    report.fictionalProtectedFileEffectsCommitted===0 &&
    report.fictionalProtectedToolEffectsCommitted===0 &&
    report.toyAgentMethodCallsObserved===true &&
    FALSE_FLAGS.every(flag=>report[flag]===false);
}

/** Strictly fixed-directory, no-argument, contributor-safe toy replay. */
export async function runFictionalToyAgentBatch(args=[]){
  if(!noArgs(args))return BAD;
  try{
    const root=await lstat(DIR);
    if(!root.isDirectory()||root.isSymbolicLink())return BAD;
    const entries=await readdir(DIR,{withFileTypes:true});
    if(entries.length<1||entries.length>MAX_FILES)return BAD;
    const names=[];
    for(const entry of entries){
      if(!entry.isFile()||!NAME.test(entry.name))return BAD;
      names.push(entry.name);
    }
    names.sort();
    const outcomes=[];
    for(const name of names){
      const fixture=await loadValidatedFixtureProposalFile(join(DIR,name));
      let matched=0;
      for(const [mode] of EXPECTATIONS){
        const result=runFictionalToyAgentExchange(fixture,mode);
        if(!verifyFictionalToyAgentOutcome(result,mode))return BAD;
        matched++;
      }
      outcomes.push(Object.freeze({
        ordinal:outcomes.length+1,
        toyAgentModesMatched:matched,
        expectedFaultModesDenied:4,
        protectedFictionalEffectsCommitted:0
      }));
    }
    return Object.freeze({
      reportSchemaVersion:1,status:'PASS',exitCode:0,
      ruleCode:'ALL_FICTIONAL_TOY_AGENT_METHOD_CALL_CONTROLS_MATCH',
      scope:SCOPE,
      evidenceKind:'FIRST_PARTY_TOY_AGENT_GATEWAY_METHOD_CALLS_ONLY',
      fixtureCount:outcomes.length,
      matchedFixtures:outcomes.length,
      modesPerFixture:EXPECTATIONS.length,
      expectedFaultModesPerFixture:4,
      totalModesChecked:outcomes.length*EXPECTATIONS.length,
      expectedFaultModesDenied:outcomes.length*4,
      outcomes:Object.freeze(outcomes),
      actualAgentBehaviorObserved:false,
      realFilesystemReadObserved:false,
      realMcpToolCallObserved:false,
      injectedInstructionInterpreted:false,
      externalMcpContacted:false,
      independentBetaVerified:false,
      securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return BAD;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runFictionalToyAgentBatch(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
