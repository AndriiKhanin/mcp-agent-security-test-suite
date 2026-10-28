#!/usr/bin/env node
/**
 * M8-M: a no-argument, source-only first-run assistant for fictional adapters.
 * Fixed, public literals only. Never reads an input descriptor, spawns a
 * process, connects to an MCP target, or treats synthetic PASS as certification.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOfflineAdapterSmoke} from './adapter-smoke.mjs';

const STEP_CODES=Object.freeze([
  'REVIEW_FICTIONAL_SCOPE',
  'GENERATE_TEMPLATE',
  'COPY_NESTED_TEMPLATE_ONLY',
  'VALIDATE_OFFLINE',
  'INTERPRET_SYNTHETIC_RESULT',
]);
export function runOfflineFirstRun(args=[]){
  if(!Array.isArray(args)||args.length!==0)
    return {schemaVersion:1,status:'ERROR',exitCode:2,errorCode:'FIRST_RUN_ARGUMENTS_NOT_ALLOWED'};
  const smoke=runOfflineAdapterSmoke();
  if(smoke.status!=='PASS'||smoke.exitCode!==0||smoke.checked!==2||
    smoke.passed!==2||smoke.failed!==0||smoke.externalMcpContacted!==false||
    smoke.actualProjectAssessed!==false||smoke.projectCodeExecuted!==false||
    smoke.independentBetaVerified!==false||smoke.securityCertified!==false||
    !Array.isArray(smoke.checks)||
    smoke.checks.length!==2||
    smoke.checks.some((c,i)=>c.transport!==['stdio','streamable-http'][i]||c.matched!==true)){
    return {schemaVersion:1,status:'FAIL',exitCode:1,errorCode:'FICTIONAL_SMOKE_NOT_VERIFIED'};
  }
  const steps=[
    {code:STEP_CODES[0],instruction:'Use a reviewed source checkout with Node.js 20+. This only checks built-in fictional controls.'},
    {code:STEP_CODES[1],instruction:'Run node src/cli.mjs adapter-template stdio or node src/cli.mjs adapter-template streamable-http.'},
    {code:STEP_CODES[2],instruction:'Copy only the nested template object into a local inert JSON descriptor, not the report wrapper. Never paste credentials.'},
    {code:STEP_CODES[3],instruction:'Run node src/cli.mjs adapter-check <local-descriptor-file>. No user process or target is contacted.'},
    {code:STEP_CODES[4],instruction:'PASS means local fictional checks only; it does not assess a real project or authorize an MCP connection.'},
  ];
  return {schemaVersion:1,profile:'first-party-fictional-first-run-v1',
    status:'PASS',exitCode:0,scope:'SOURCE_ONLY_FICTIONAL',
    transports:['stdio','streamable-http'],steps,
    smokePassed:2,externalMcpContacted:false,userProcessExecuted:false,
    userDescriptorRead:false,realProjectAssessed:false,
    operatorVerified:false,independentBetaVerified:false,
    independentAuditCompleted:false,stableReleaseAuthorized:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let result;
  try{result=runOfflineFirstRun(process.argv.slice(2));}
  catch{result={schemaVersion:1,status:'ERROR',exitCode:2,errorCode:'FIRST_RUN_UNAVAILABLE'};}
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}
