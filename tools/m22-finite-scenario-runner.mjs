#!/usr/bin/env node
/**
 * M22: reviewed, inert finite-action scenario contributions.
 * Strictly fixed .github/m22-scenarios directory; never user-selected paths,
 * network targets, real tools or natural-language instruction interpretation.
 */
import {open,lstat,readdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,basename,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../src/strict-json.mjs';
import {runFictionalGateSequence} from './in-memory-injection-gate.mjs';

const ROOT=resolve(fileURLToPath(new URL('../.github/m22-scenarios/',import.meta.url)));
const CASE=/^[a-z][a-z0-9-]{5,60}$/u;
const NAME=/^[a-z][a-z0-9-]{5,60}\.json$/u;
const MAX_FILE_BYTES=1024,MIN_FILES=5,MAX_FILES=12;
const ORIGINS=Object.freeze(['OWNER_TASK','UNTRUSTED_TOOL_RESULT']);
const OPERATIONS=Object.freeze([
  'CONSUME_TASK_DATA','REQUEST_UNRELATED_FILE_READ',
  'REQUEST_UNAUTHORIZED_TOOL_CALL'
]);
const RESOURCES=Object.freeze(['TASK_DATA','UNRELATED_FILE','UNRELATED_TOOL']);
const RULES=Object.freeze([
  'FICTIONAL_TASK_DATA_AS_DATA_ONLY',
  'FICTIONAL_CROSS_RESOURCE_READ_DENIED',
  'FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED',
  'TOOL_RESULT_AUTHORITY_SPOOF_DENIED',
  'FICTIONAL_OPERATION_RESOURCE_MISMATCH'
]);
const INVALID='INVALID_FINITE_SCENARIO';
const reject=()=>{throw new TypeError(INVALID);};
const errorReport=Object.freeze({
  reportSchemaVersion:1,profile:'m22-first-party-finite-action-contributors',
  status:'ERROR',exitCode:2,ruleCode:'M22_INVALID_OR_UNREADABLE_SCENARIOS',
  sourceOwnedFiniteActionsOnly:true,actualAgentBehaviorObserved:false,
  realFilesystemEffectObserved:false,externalMcpContacted:false,
  independentBetaVerified:false,securityCertified:false
});
function shape(data,fields){
  if(!data||typeof data!=='object'||Array.isArray(data)||
     Object.getPrototypeOf(data)!==Object.prototype)return null;
  const fieldsMap=Object.getOwnPropertyDescriptors(data);
  if(Reflect.ownKeys(fieldsMap).length!==fields.length||
    !fields.every(field=>fieldsMap[field]?.enumerable&&
      Object.hasOwn(fieldsMap[field],'value')))return null;
  return fieldsMap;
}
const value=(props,key)=>props[key].value;
function dense(array,min,max){
  if(!Array.isArray(array)||Object.getPrototypeOf(array)!==Array.prototype||
     array.length<min||array.length>max)return null;
  const desc=Object.getOwnPropertyDescriptors(array);
  if(Reflect.ownKeys(desc).length!==array.length+1||
     desc.length?.value!==array.length)return null;
  if(!Array.from({length:array.length},(_,i)=>desc[String(i)])
    .every(slot=>slot?.enumerable&&Object.hasOwn(slot,'value')))
    return null;
  return desc;
}
/** Validates only finite enum literals. Expected fields are untrusted claims. */
export function validateFiniteScenario(input,filename=null){
  const props=shape(input,[
    'schemaVersion','caseId','origin','operation','resource',
    'toolResultAuthorityClaim','expected'
  ]);
  if(!props)reject();
  const schema=value(props,'schemaVersion');
  const id=value(props,'caseId');
  const origin=value(props,'origin');
  const operation=value(props,'operation');
  const resource=value(props,'resource');
  const claim=value(props,'toolResultAuthorityClaim');
  const expected=shape(value(props,'expected'),[
    'guardedDecision','guardedRuleCode','permissiveDecision'
  ]);
  if(schema!==1||typeof id!=='string'||!CASE.test(id)||
    (filename!==null&&(typeof filename!=='string'||
      !NAME.test(filename)||filename!==id+'.json'))||
    !ORIGINS.includes(origin)||!OPERATIONS.includes(operation)||
    !RESOURCES.includes(resource)||typeof claim!=='boolean'||
    (origin==='OWNER_TASK'&&claim)||
    !expected||!['ALLOW','DENY'].includes(value(expected,'guardedDecision'))||
    !RULES.includes(value(expected,'guardedRuleCode'))||
    !['ALLOW','DENY'].includes(value(expected,'permissiveDecision')))reject();
  // Copy ONLY normalized enum values; never preserve caller object/getters.
  return Object.freeze({
    caseId:id,origin,operation,resource,toolResultAuthorityClaim:claim,
    expectedGuarded:value(expected,'guardedDecision'),
    expectedRule:value(expected,'guardedRuleCode'),
    expectedPermissive:value(expected,'permissiveDecision')
  });
}
/** Independent source-authored oracle, not the contributor's expectations. */
function independentOracle(s){
  if(s.origin==='UNTRUSTED_TOOL_RESULT'&&s.toolResultAuthorityClaim)
    return {decision:'DENY',ruleCode:RULES[3]};
  if(s.operation==='CONSUME_TASK_DATA'&&s.resource==='TASK_DATA')
    return {decision:'ALLOW',ruleCode:RULES[0]};
  if(s.operation==='REQUEST_UNRELATED_FILE_READ'&&
     s.resource==='UNRELATED_FILE')
    return {decision:'DENY',ruleCode:RULES[1]};
  if(s.operation==='REQUEST_UNAUTHORIZED_TOOL_CALL'&&
     s.resource==='UNRELATED_TOOL')
    return {decision:'DENY',ruleCode:RULES[2]};
  return {decision:'DENY',ruleCode:RULES[4]};
}
function runOne(s){
  const req={
    schemaVersion:1,origin:s.origin,operation:s.operation,
    resource:s.resource,toolResultAuthorityClaim:s.toolResultAuthorityClaim
  };
  const observed=runFictionalGateSequence([req]);
  const guarded=observed.decisions[0];
  const witness=observed.witness;
  // The deliberately wrong ALLOW_ALL toy has an in-memory effect counter.
  // It does not access an unrelated file/tool or issue an actual operation.
  const unsafeProtectedEffects=Number(
    s.origin==='UNTRUSTED_TOOL_RESULT'&&s.toolResultAuthorityClaim||
    s.operation!=='CONSUME_TASK_DATA'||s.resource!=='TASK_DATA'
  );
  return {
    decision:guarded.decision,ruleCode:guarded.ruleCode,
    guardedTaskDataHandled:witness.handledTaskData,
    guardedDenied:witness.deniedRequests,
    guardedProtectedEffects:witness.fictionalUnrelatedFileEffectsCommitted+
      witness.fictionalUnauthorizedToolEffectsCommitted,
    permissiveDecision:'ALLOW',
    permissiveProtectedEffects:unsafeProtectedEffects,
    noActualEffects:observed.actualFilesystemReadObserved===false&&
      observed.externalMcpContacted===false&&
      witness.actualFilesystemEffectsObserved===false&&
      witness.actualToolEffectsObserved===false
  };
}
const FIELDS=Object.freeze([
  'decision','ruleCode','guardedTaskDataHandled','guardedDenied',
  'guardedProtectedEffects','permissiveDecision',
  'permissiveProtectedEffects','noActualEffects'
]);
function exactObservation(observed,oracle){
  const props=shape(observed,FIELDS);
  const permitted=oracle.decision==='ALLOW';
  const expected={
    decision:oracle.decision,ruleCode:oracle.ruleCode,
    guardedTaskDataHandled:Number(permitted),guardedDenied:Number(!permitted),
    guardedProtectedEffects:0,permissiveDecision:'ALLOW',
    permissiveProtectedEffects:Number(!permitted),noActualEffects:true
  };
  return !!props&&FIELDS.every(k=>value(props,k)===expected[k]);
}
function normalizeSet(input){
  const descriptors=dense(input,MIN_FILES,MAX_FILES);
  if(!descriptors)reject();
  const cases=[];const seen=new Set();
  for(let i=0;i<input.length;i++){
    const s=validateFiniteScenario(descriptors[String(i)].value);
    if(seen.has(s.caseId))reject();
    seen.add(s.caseId);cases.push(s);
  }
  return cases;
}
/**
 * Strict independent witness comparator. Contributed "expected" answers
 * can only cause FAIL, never alter the guarded/unsafe policy or oracle.
 */
export function auditFiniteWitnesses(scenarios,observations){
  const cases=normalizeSet(scenarios);
  const witness=dense(observations,cases.length,cases.length);
  const rows=cases.map((s,i)=>{
    const oracle=independentOracle(s);
    const claimed=s.expectedGuarded===oracle.decision&&
      s.expectedRule===oracle.ruleCode&&
      s.expectedPermissive==='ALLOW';
    const observed=witness?
      exactObservation(witness[String(i)].value,oracle):false;
    return Object.freeze({
      ordinal:i+1,guardedClass:oracle.decision,ruleCode:oracle.ruleCode,
      contributorExpectationMatches:claimed,
      effectWitnessMatches:observed,matched:claimed&&observed
    });
  });
  const matched=rows.filter(x=>x.matched).length;
  const denied=rows.filter(x=>x.guardedClass==='DENY').length;
  const actualTaskCases=rows.length-denied;
  const status=matched===rows.length?'PASS':'FAIL';
  return Object.freeze({
    reportSchemaVersion:1,profile:'m22-first-party-finite-action-contributors',
    status,exitCode:status==='PASS'?0:1,
    ruleCode:status==='PASS'?'M22_ALL_FINITE_CONTROLS_MATCH':
      'M22_FINITE_CONTROLS_MISMATCH',
    checked:rows.length,matched,failed:rows.length-matched,
    guardedAllowed:actualTaskCases,guardedDenied:denied,
    deliberatelyPermissiveProtectedEffectsExpected:denied,
    guardedProtectedEffectsExpected:0,
    cases:Object.freeze(rows),
    sourceOwnedFiniteActionsOnly:true,
    contributorExpectedValuesTrusted:false,
    actualAgentBehaviorObserved:false,realFilesystemEffectObserved:false,
    externalMcpContacted:false,independentBetaVerified:false,
    securityCertified:false,releaseAuthorized:false
  });
}
/** In-memory test adapter: contributing a validated extra object changes
 * the count without modifying any runner source code or reading a path. */
export function runFiniteScenarioSet(scenarios){
  const cases=normalizeSet(scenarios);
  const observations=cases.map(runOne);
  return auditFiniteWitnesses(scenarios,observations);
}
async function readOne(filename){
  if(!NAME.test(filename))reject();
  const path=join(ROOT,filename);
  const before=await lstat(path);
  if(!before.isFile()||before.isSymbolicLink()||
     before.size<1||before.size>MAX_FILE_BYTES)reject();
  const handle=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{
    const stat=await handle.stat();
    if(!stat.isFile()||stat.dev!==before.dev||stat.ino!==before.ino||
       stat.size<1||stat.size>MAX_FILE_BYTES)reject();
    const bytes=Buffer.alloc(MAX_FILE_BYTES+1);
    let offset=0;
    while(offset<=MAX_FILE_BYTES){
      const r=await handle.read(bytes,offset,bytes.length-offset,offset);
      if(!r.bytesRead)break;
      offset+=r.bytesRead;
    }
    if(offset!==stat.size||offset>MAX_FILE_BYTES)reject();
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,offset));
    const value=parseStrictJson(text);
    validateFiniteScenario(value,filename);
    return value;
  }finally{await handle.close();}
}
async function fixedDirectory(){
  const rootStat=await lstat(ROOT);
  if(!rootStat.isDirectory()||rootStat.isSymbolicLink())reject();
  const entries=await readdir(ROOT,{withFileTypes:true});
  if(entries.length<MIN_FILES||entries.length>MAX_FILES)reject();
  for(const entry of entries){
    if(!entry.isFile()||entry.isSymbolicLink()||!NAME.test(entry.name))reject();
  }
  const names=entries.map(e=>e.name).sort();
  const fixtures=[];
  for(const name of names)fixtures.push(await readOne(name));
  return fixtures;
}
export async function runFixedFiniteScenarioDirectory(args=[]){
  if(!dense(args,0,0))return errorReport;
  try{
    const scenarios=await fixedDirectory();
    return runFiniteScenarioSet(scenarios);
  }catch{return errorReport;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runFixedFiniteScenarioDirectory(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
