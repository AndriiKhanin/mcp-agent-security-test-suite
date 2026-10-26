#!/usr/bin/env node
/**
 * M8-A: one-command, source-only offline adapter smoke test for both transports.
 * No files, shells, network, subprocesses, credentials or external MCP target.
 * It tests ONLY source-authored fictional descriptors and synthetic controls.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOfflineAdopterKit,verifyOfflineAdopterKit,previewOfflineAdapterQuickstart} from '../src/project-adapter.mjs';
import {buildCliReport} from '../src/report-contract.mjs';

const TYPES=Object.freeze(['stdio','streamable-http']);
const fail=()=>{throw new TypeError('OFFLINE_ADAPTER_SMOKE_CONTROL_MISMATCH');};
export function runOfflineAdapterSmoke(args=[]){
 if(!Array.isArray(args) || args.length!==0) return {
   smokeSchemaVersion:1,status:'ERROR',exitCode:2,errorCode:'SMOKE_ARGUMENTS_NOT_ALLOWED'
 };
 const checks=[];
 for(const transport of TYPES){
   // Fully fixed source-owned selector and descriptors. No caller config.
   const kit=buildCliReport('adapter-kit',createOfflineAdopterKit(transport));
   const verified=verifyOfflineAdopterKit(kit);
   const quick=previewOfflineAdapterQuickstart(kit.starterDescriptor);
   const matched=kit.status==='PASS' && kit.exitCode===0 &&
     kit.transport===transport && kit.reportSchemaVersion===1 &&
     kit.executionEnabled===false && kit.externalTargetContacted===false &&
     verified.status==='PASS' && verified.checked===3 &&
     verified.transport===transport &&
     verified.projectSafetyAssessed===false &&
     verified.externalTargetContacted===false &&
     quick.status==='PASS' && quick.checked===5 &&
     quick.transport===transport &&
     quick.projectSafetyAssessed===false &&
     quick.externalTargetContacted===false;
   checks.push({transport,matched,code:matched?'FICTIONAL_KIT_AND_QUICKSTART_MATCH':'FICTIONAL_KIT_CONTROL_MISMATCH'});
 }
 const passed=checks.filter(x=>x.matched).length;
 return {
   smokeSchemaVersion:1,
   profile:'source-owned-fictional-adapter-smoke-v1',
   status:passed===TYPES.length?'PASS':'FAIL',
   exitCode:passed===TYPES.length?0:1,
   scope:'FIXED_FICTIONAL_LOCAL_ONLY',
   checked:TYPES.length,passed,failed:TYPES.length-passed,checks,
   sourceOnly:true,externalMcpContacted:false,projectCodeExecuted:false,
   actualProjectAssessed:false,operatorVerified:false,
   independentBetaVerified:false,securityCertified:false,
   stableReleaseAuthorized:false
 };
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let report;
 try{report=runOfflineAdapterSmoke(process.argv.slice(2));}
 catch{report={smokeSchemaVersion:1,status:'ERROR',exitCode:2,
   errorCode:'OFFLINE_ADAPTER_SMOKE_UNAVAILABLE'};}
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 process.exitCode=report.exitCode;
}
