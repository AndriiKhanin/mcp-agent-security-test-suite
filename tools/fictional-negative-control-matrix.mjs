#!/usr/bin/env node
/**
 * M9-F: deterministic negative-control sensitivity testing of the
 * first-party fictional policy report validator.
 *
 * Author-controlled mutations of source-generated SYMBOLIC reports only:
 * never interpret or execute a fixture's embeddedInstruction; never call a
 * model or external MCP target, read an unrelated file, or spawn a process.
 */
import {lstat,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadValidatedFixtureProposalFile} from './fixture-proposal-check.mjs';
import {runFixturePolicyBridge} from './fixture-policy-bridge.mjs';
import {
  runFictionalFixtureBatchPreflight,verifyFictionalBridgeOutcome
} from './fixture-batch-preflight.mjs';

const DIR=fileURLToPath(new URL('../.github/fixture-proposals/',import.meta.url));
const FILE=/^[a-z][a-z0-9-]{5,60}\.json$/u;
const LIMIT=16;
const SCOPE='FIRST_PARTY_SYMBOLIC_MUTATION_MATRIX_ONLY';

// Fixed, source-reviewed mutation vector; no contributor-defined functions.
const TOP_LEVEL=Object.freeze([
  ['SCHEMA','reportSchemaVersion',2],
  ['STATUS','status','FAIL'],
  ['EXIT_CODE','exitCode',1],
  ['RULE','ruleCode','FORGED_ACCEPTANCE'],
  ['SCOPE','scope','LIVE_MCP_TARGET'],
  ['EVIDENCE','evidenceKind','REAL_AGENT_ATTESTED'],
  ['SHAPE','fixtureSchemaAccepted',false],
  ['EXPECTATION','expectedSafeBehaviorRecorded',false],
  ['INTERPRETED','fixtureContentInterpreted',true],
  ['CHECKED','checked',3],
  ['MATCHED','matched',3],
  ['DENIALS','expectedDenials',2],
  ['DATA_COUNT','fictionalTaskDataHandled',2],
  ['EFFECTS','fictionalProtectedEffectsCommitted',1],
  ['AGENT','actualAgentBehaviorObserved',true],
  ['REAL_READ','realFilesystemReadObserved',true],
  ['INSTRUCTION','untrustedInstructionExecuted',true],
  ['NETWORK','externalMcpContacted',true],
  ['BETA','independentBetaVerified',true],
  ['AUDIT','securityCertified',true],
  ['RELEASE','releaseAuthorized',true]
]);
const CASE_TYPES=Object.freeze([
  'MATCHED','DECISION','RULE','CONTROL'
]);
const STRUCTURAL=Object.freeze([
  'DROP_CASE','DUPLICATE_CASE','REORDER_CASES',
  'APPEND_CASE','TOP_EXTRA_FIELD','CASE_EXTRA_FIELD'
]);

export const NEGATIVE_CONTROL_COUNT=
  TOP_LEVEL.length+4*CASE_TYPES.length+STRUCTURAL.length;

const failed=Object.freeze({
  reportSchemaVersion:1,status:'ERROR',exitCode:2,
  ruleCode:'FICTIONAL_NEGATIVE_MATRIX_UNAVAILABLE',
  scope:SCOPE,actualAgentBehaviorObserved:false,
  fixtureContentInterpreted:false,externalMcpContacted:false,
  independentBetaVerified:false,securityCertified:false
});

function makeMutations(original){
  // Original comes exclusively from the fixed source-owned policy bridge.
  // Never clone, stringify or execute contributor-supplied function objects.
  const next=()=>structuredClone(original);
  const mutations=[];
  for(const [tag,key,value] of TOP_LEVEL){
    const item=next();
    item[key]=value;
    mutations.push([tag,item]);
  }
  for(let i=0;i<4;i++){
    for(const kind of CASE_TYPES){
      const item=next(),row=item.cases[i];
      if(kind==='MATCHED')row.matched=false;
      else if(kind==='DECISION')
        row.expectedDecision=row.expectedDecision==='ALLOW'?'DENY':'ALLOW';
      else if(kind==='RULE')row.expectedRuleCode='FORGED_RULE';
      else row.control='FORGED_CONTROL';
      mutations.push(['CASE_'+(i+1)+'_'+kind,item]);
    }
  }
  for(const kind of STRUCTURAL){
    const item=next();
    if(kind==='DROP_CASE')item.cases.pop();
    else if(kind==='DUPLICATE_CASE')item.cases[1]=item.cases[0];
    else if(kind==='REORDER_CASES')
      [item.cases[0],item.cases[1]]=[item.cases[1],item.cases[0]];
    else if(kind==='APPEND_CASE')item.cases.push(item.cases[0]);
    else if(kind==='TOP_EXTRA_FIELD')item.unreviewedAuthority=true;
    else item.cases[0].unreviewedAuthority=true;
    mutations.push([kind,item]);
  }
  return mutations;
}

/** Pure source-authored mutation test of the fixture bridge's report. */
export function evaluateFictionalMutationSensitivity(fixture){
  const baseline=runFixturePolicyBridge(fixture); // M8 strict fixture schema
  if(!verifyFictionalBridgeOutcome(baseline))
    throw new TypeError('UNEXPECTED_SYMBOLIC_BASELINE');
  const mutations=makeMutations(baseline);
  if(mutations.length!==NEGATIVE_CONTROL_COUNT)
    throw new TypeError('NEGATIVE_CONTROL_INVENTORY_MISMATCH');
  let rejected=0;
  const acceptedMutations=[];
  for(const [id,mutated] of mutations){
    if(!verifyFictionalBridgeOutcome(mutated))rejected++;
    else acceptedMutations.push(id);
  }
  return Object.freeze({
    matrixSchemaVersion:1,
    status:acceptedMutations.length===0?'PASS':'FAIL',
    expectedNegativeControls:NEGATIVE_CONTROL_COUNT,
    rejectedNegativeControls:rejected,
    escapedNegativeControls:acceptedMutations.length,
    // Fixed mutation identifiers only; no contributor data or names.
    escapedControlIds:Object.freeze(acceptedMutations),
    baselineAccepted:true,
    actualAgentBehaviorObserved:false,
    fixtureContentInterpreted:false,
    externalMcpContacted:false,
    securityCertified:false
  });
}
function noArguments(args){
  if(!Array.isArray(args) || Object.getPrototypeOf(args)!==Array.prototype ||
     args.length!==0)return false;
  const descriptors=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(descriptors).length===1 &&
    descriptors.length?.value===0;
}

/** CI/CLI: independently challenge the policy verifier for every fixture. */
export async function runFictionalNegativeControlMatrix(args=[]){
  if(!noArguments(args))return failed;
  try{
    // Verify all files against existing independent M9-E batch contract.
    const batch=await runFictionalFixtureBatchPreflight();
    if(batch.status!=='PASS' || batch.exitCode!==0 ||
       batch.fixtureCount<1 || batch.fixtureCount>LIMIT ||
       batch.actualAgentBehaviorObserved!==false ||
       batch.fixtureContentInterpreted!==false)return failed;
    const st=await lstat(DIR);
    if(!st.isDirectory()||st.isSymbolicLink())return failed;
    const entries=await readdir(DIR,{withFileTypes:true});
    if(entries.length!==batch.fixtureCount)return failed;
    const names=[];
    for(const entry of entries){
      if(!entry.isFile()||!FILE.test(entry.name))return failed;
      names.push(entry.name);
    }
    names.sort();
    let rejected=0,escaped=0;
    for(const name of names){
      const fixture=await loadValidatedFixtureProposalFile(join(DIR,name));
      const result=evaluateFictionalMutationSensitivity(fixture);
      rejected+=result.rejectedNegativeControls;
      escaped+=result.escapedNegativeControls;
    }
    const expected=NEGATIVE_CONTROL_COUNT*names.length;
    const pass=escaped===0 && rejected===expected;
    return Object.freeze({
      reportSchemaVersion:1,status:pass?'PASS':'FAIL',
      exitCode:pass?0:1,
      ruleCode:pass?'FIXED_FICTIONAL_NEGATIVE_CONTROLS_REJECTED':
        'FICTIONAL_NEGATIVE_CONTROL_ESCAPED',
      scope:SCOPE,
      evidenceKind:'SOURCE_AUTHORED_SYNTHETIC_MUTATIONS_ONLY',
      fixtureCount:names.length,
      baselineChecksPassed:names.length,
      negativeControlsPerFixture:NEGATIVE_CONTROL_COUNT,
      negativeControlsChecked:expected,
      negativeControlsRejected:rejected,
      negativeControlsEscaped:escaped,
      actualAgentBehaviorObserved:false,
      fixtureContentInterpreted:false,
      realFilesystemReadObserved:false,
      externalMcpContacted:false,
      untrustedInstructionExecuted:false,
      independentBetaVerified:false,
      securityCertified:false,
      releaseAuthorized:false
    });
  }catch{return failed;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runFictionalNegativeControlMatrix(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
