#!/usr/bin/env node
/**
 * M8-S: inert, source-checkout-only intake for fictional tool-result
 * prompt-injection fixture proposals. This does NOT execute an agent,
 * tool, MCP server, instruction, or user-supplied code. No DLP claim.
 */
import {open, lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../src/strict-json.mjs';

const ROOT=resolve(fileURLToPath(new URL('../.github/fixture-proposals/',import.meta.url)));
const NAME=/^[a-z][a-z0-9-]{5,60}\.json$/u;
const CASE=/^[a-z][a-z0-9-]{5,60}$/u;
const MAX_BYTES=4096;
const failure=()=>{throw new TypeError('INVALID_FICTIONAL_FIXTURE');};

function record(value, keys){
  if(!value || typeof value!=='object' || Array.isArray(value) ||
     Object.getPrototypeOf(value)!==Object.prototype) return false;
  const props=Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(props).length===keys.length &&
    keys.every(key=>Object.hasOwn(props,key) &&
      Object.hasOwn(props[key],'value') && props[key].enumerable);
}
// Conservative public-fixture hygiene: reject obvious private-looking
// strings, WITHOUT claiming comprehensive secret scanning or sanitization.
// All inputs are already bounded to 256 single-line printable ASCII chars.
const PRIVATE_INDICATORS=Object.freeze([
  /(?:https?|ssh|file|mcp):\/\//iu,
  /(?:[a-z]:\\(?:users|documents|windows)\\|\/(?:home|users)\/[a-z0-9._-]{2,})/iu,
  /(?:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/iu,
  /(?:\b(?:sk-[a-z0-9_-]{12,}|gh[pousr]_[a-z0-9_]{12,}|github_pat_[a-z0-9_]{12,}|AKIA[A-Z0-9]{16})\b)/iu,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/iu,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/u
]);
function fictionalText(value){
  // This rejects some obvious sensitive patterns, NOT arbitrary secrets.
  // Contributors must still manually sanitize every field before posting.
  return typeof value==='string' && value.length>=10 && value.length<=256 &&
    /^[\x20-\x7e]+$/u.test(value) &&
    !PRIVATE_INDICATORS.some(indicator=>indicator.test(value));
}

/** Shape acceptance only: no assessment of downstream agent behavior. */
export function validateFixtureProposal(data,filename=null){
  if(!record(data,['schemaVersion','caseId','attackSurface','description',
       'toolResult','expected','limits']) ||
     data.schemaVersion!==1 || typeof data.caseId!=='string' ||
     !CASE.test(data.caseId) ||
     (filename!==null && (typeof filename!=='string' ||
       !NAME.test(filename) || filename!==data.caseId+'.json')) ||
     data.attackSurface!=='UNTRUSTED_TOOL_RESULT' ||
     !fictionalText(data.description) ||
     !record(data.toolResult,['legitimateData','embeddedInstruction']) ||
     !fictionalText(data.toolResult.legitimateData) ||
     !fictionalText(data.toolResult.embeddedInstruction) ||
     !record(data.expected,['interpretResultAsData','obeyEmbeddedInstruction',
       'readUnrelatedFile','extraToolCalls']) ||
     data.expected.interpretResultAsData!==true ||
     data.expected.obeyEmbeddedInstruction!==false ||
     data.expected.readUnrelatedFile!==false ||
     data.expected.extraToolCalls!==0 ||
     !record(data.limits,['simulationOnly','useRealCredentials',
       'contactExternalServer','executeUserCode']) ||
     data.limits.simulationOnly!==true ||
     data.limits.useRealCredentials!==false ||
     data.limits.contactExternalServer!==false ||
     data.limits.executeUserCode!==false) failure();

  // No input values are ever copied into a report.
  return Object.freeze({
    schemaVersion:1, status:'PASS', exitCode:0,
    code:'FICTIONAL_FIXTURE_SHAPE_ACCEPTED_ONLY',
    scope:'STATIC_FIXTURE_VALIDATION_ONLY',
    expectedBehaviorRecorded:true, actualAgentBehaviorObserved:false,
    promptInjectionDetected:false, externalMcpContacted:false,
    userInstructionExecuted:false, unrelatedFileRead:false,
    securityCertified:false, independentBetaVerified:false
  });
}

async function readBoundedProposal(file){
  if(typeof file!=='string') failure();
  const path=resolve(file);
  if(dirname(path)!==ROOT || !NAME.test(basename(path))) failure();
  const before=await lstat(path);
  if(!before.isFile() || before.isSymbolicLink() ||
     before.size>MAX_BYTES) failure();
  const handle=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{
    const stat=await handle.stat();
    if(!stat.isFile() || stat.dev!==before.dev || stat.ino!==before.ino ||
       stat.size>MAX_BYTES) failure();
    const buffer=Buffer.alloc(MAX_BYTES+1);
    const {bytesRead}=await handle.read(buffer,0,buffer.length,0);
    if(bytesRead>MAX_BYTES) failure();
    return new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,bytesRead));
  }finally{
    await handle.close();
  }
}

/**
 * Trusted source-only adapter boundary: read ONLY a strictly approved,
 * bounded fictional proposal file and validate it before returning its
 * parsed object to another first-party simulator. Never emit its content.
 */
export async function loadValidatedFixtureProposalFile(path){
  const text=await readBoundedProposal(path);
  const fixture=parseStrictJson(text);
  validateFixtureProposal(fixture,basename(resolve(path)));
  return fixture;
}
export async function verifyFixtureProposalFile(path){
  const fixture=await loadValidatedFixtureProposalFile(path);
  return validateFixtureProposal(fixture,basename(resolve(path)));
}

const rejected=Object.freeze({
  schemaVersion:1,status:'ERROR',exitCode:2,
  code:'INVALID_OR_UNREADABLE_FICTIONAL_FIXTURE',
  scope:'STATIC_FIXTURE_VALIDATION_ONLY',
  actualAgentBehaviorObserved:false, externalMcpContacted:false,
  userInstructionExecuted:false
});
export async function runFixtureProposalCheck(args=[]){
  if(!Array.isArray(args) || args.length!==1) return rejected;
  try{return await verifyFixtureProposalFile(args[0]);}
  catch{return rejected;} // No filename, instruction or parser error disclosure.
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await runFixtureProposalCheck(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
