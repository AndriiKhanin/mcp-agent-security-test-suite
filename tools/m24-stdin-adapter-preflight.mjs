#!/usr/bin/env node
/**
 * M24 — privacy-minimal, one-shot stdin-only adapter descriptor preflight.
 * This is a SOURCE-ONLY pure schema + first-party fictional controls check.
 * It never opens a user path, contacts the described server, resolves DNS,
 * spawns a process, loads credentials, or uses any MCP connector.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../src/strict-json.mjs';
import {
  inspectProjectAdapter,previewOfflineAdapterQuickstart,
  OFFLINE_FIXTURE_CASES
} from '../src/project-adapter.mjs';

const LIMIT=4096,DEADLINE_MS=8000;
const PROFILE='m24-offline-stdin-adapter-preflight-v1';
const MATCH='OFFLINE_DESCRIPTOR_AND_FICTIONAL_CONTROLS_MATCH';
const INVALID='M24_INVALID_OR_UNREADABLE_DESCRIPTOR';
const SCOPE='NO_REAL_TARGET_CONTACT_OR_AUTHORIZATION';
function denseEmpty(args) {
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==Array.prototype||
      args.length!==0)return false;
  const slots=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(slots).length===1&&slots.length?.value===0;
}
const FAILURE=Object.freeze({
  reportSchemaVersion:1,profile:PROFILE,status:'ERROR',exitCode:2,
  ruleCode:INVALID,scope:SCOPE,
  connectionStatus:'NOT_ATTEMPTED',
  projectConnectionAuthorized:false,
  externalTargetContacted:false,
  operatorVerified:false,
  realProjectAssessed:false,
  actualAgentBehaviorObserved:false,
  independentBetaVerified:false,
  securityCertified:false
});
const allowedControls=new Set(OFFLINE_FIXTURE_CASES);
/**
 * Pure read-only adapter validator. This function does NOT trust values
 * supplied in a descriptor to set any authorization or outcome bit.
 */
export function inspectStdinAdapterDescriptor(descriptor) {
  try {
    const schema=inspectProjectAdapter(descriptor);
    const check=previewOfflineAdapterQuickstart(descriptor);
    if(schema.status!=='PASS'||
       check.status!=='PASS'||
       schema.transport!==check.transport||
       schema.protocolVersion!==check.protocolVersion||
       check.profile!=='offline-adapter-quickstart-v1'||
       check.checked!==OFFLINE_FIXTURE_CASES.length||
       !Array.isArray(check.controls)||
       check.controls.length!==OFFLINE_FIXTURE_CASES.length||
       check.controls.some((row,i)=>
         row.caseId!==OFFLINE_FIXTURE_CASES[i]||
         !allowedControls.has(row.caseId)||
         row.controlStatus!=='PASS'
       )||
       schema.connectionStatus!=='NOT_ATTEMPTED'||
       schema.executionEnabled!==false||
       check.connectionStatus!=='NOT_ATTEMPTED'||
       check.executionEnabled!==false||
       check.projectConnectionAuthorized!==false||
       check.externalTargetContacted!==false||
       check.operatorVerified!==false||
       check.projectSafetyAssessed!==false||
       check.fixturesAreProjectSpecific!==false||
       check.securityCertified!==false||
       check.readinessStatus!=='REAL_TARGET_NOT_AUTHORIZED'||
       check.authorizationStatus!=='REAL_TARGET_EXECUTION_NOT_AUTHORIZED')
      return FAILURE;
    return Object.freeze({
      reportSchemaVersion:1,profile:PROFILE,
      status:'PASS',exitCode:0,ruleCode:MATCH,
      scope:SCOPE,
      transport:schema.transport,protocolVersion:schema.protocolVersion,
      descriptorEvidence:'DESCRIPTOR_SHAPE_VALIDATED',
      fictionalControlEvidence:'FIRST_PARTY_FIXED_FICTIONAL_CASES_ONLY',
      checked:check.checked,matched:check.controls.length,
      controlIds:Object.freeze([...OFFLINE_FIXTURE_CASES]),
      readinessStatus:'REAL_TARGET_NOT_AUTHORIZED',
      connectionStatus:'NOT_ATTEMPTED',
      executionEnabled:false,
      projectConnectionAuthorized:false,
      externalTargetContacted:false,
      operatorVerified:false,
      realProjectAssessed:false,
      actualAgentBehaviorObserved:false,
      independentBetaVerified:false,
      securityCertified:false
    });
  }catch {
    // Avoid reflecting project name, endpoint, command, token, path or
    // parser/schema diagnostics. No data from the user is rendered.
    return FAILURE;
  }
}
function boundedInput(stream) {
  return new Promise((resolvePromise,reject)=>{
    let settled=false,read=0;
    const buffers=[];
    let timer;
    function cleanup() {
      clearTimeout(timer);
      stream.off('data',onData);
      stream.off('end',onEnd);
      stream.off('error',onError);
      stream.pause?.();
    }
    function settle(err,value) {
      if(settled)return;
      settled=true;
      cleanup();
      if(err)reject(Error('FIXED_STDIN_BOUNDARY_REJECTED'));
      else resolvePromise(value);
    }
    function onData(chunk){
      if(!Buffer.isBuffer(chunk)){settle(true);return;}
      read+=chunk.byteLength;
      if(read>LIMIT){settle(true);return;}
      buffers.push(chunk);
    }
    function onEnd(){settle(read===0?true:null,Buffer.concat(buffers));}
    function onError(){settle(true);}
    timer=setTimeout(()=>settle(true),DEADLINE_MS);
    stream.on('data',onData);
    stream.once('end',onEnd);
    stream.once('error',onError);
    stream.resume?.();
  });
}
/** A one-shot CLI accepts no arguments and one closed stdin JSON document. */
export async function runStdinAdapterPreflight(args=[],stream=process.stdin){
  if(!denseEmpty(args)||!stream||stream.isTTY===true||
     typeof stream.on!=='function'||typeof stream.pause!=='function'||
     typeof stream.resume!=='function')return FAILURE;
  try {
    const bytes=await boundedInput(stream);
    if(bytes.byteLength<1||bytes.byteLength>LIMIT)return FAILURE;
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    const descriptor=parseStrictJson(text);
    return inspectStdinAdapterDescriptor(descriptor);
  }catch{return FAILURE;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await runStdinAdapterPreflight(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
