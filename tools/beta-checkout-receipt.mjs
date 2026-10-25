#!/usr/bin/env node
/**
 * M7-M/N: local Git checkout metadata for voluntary fictional beta.
 * Does NOT authenticate a remote, verify a signature, contact an MCP server,
 * collect Git identity, print filenames, or attest independent use.
 * This tools/ helper is not included in the candidate npm package.
 */
import {spawnSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const REV=/^[0-9a-f]{40}$/u;
const safeError=()=>({receiptSchemaVersion:1,status:'ERROR',exitCode:2,
  errorCode:'LOCAL_CHECKOUT_NOT_VERIFIABLE',
  sourceVerification:'LOCAL_GIT_METADATA_ONLY',
  independentOriginVerified:false,actualBetaExecutionVerified:false,
  externalMcpContacted:false,betaGateSatisfied:false,releaseAuthorized:false});

/** Only derived booleans and a strictly validated public commit SHA survive.
 * Git porcelain may contain private local file names: never echo it. */
export function formatCheckoutReceipt(head,porcelain){
  if(typeof head!=='string' || !REV.test(head) ||
     typeof porcelain!=='string' || Buffer.byteLength(porcelain,'utf8')>131072)
    return safeError();
  const dirty=porcelain.length!==0;
  return {
    receiptSchemaVersion:1,status:dirty?'FAIL':'PASS',exitCode:dirty?1:0,
    sourceSha:head,
    workingTree:dirty?'CHANGES_PRESENT':'NO_REPORTED_CHANGES',
    sourceVerification:'LOCAL_GIT_METADATA_ONLY',
    ignoredFilesChecked:false,remoteIdentityVerified:false,
    commitSignatureVerified:false,independentOriginVerified:false,
    actualBetaExecutionVerified:false,externalMcpContacted:false,
    betaGateSatisfied:false,releaseAuthorized:false,
    nextAction:dirty?'USE_CLEAN_PUBLIC_CHECKOUT':'MANUALLY_COMPARE_PUBLIC_SHA_AND_RUN_BETA'
  };
}
function git(args){
  const result=spawnSync('git',args,{
    cwd:ROOT,shell:false,windowsHide:true,encoding:'utf8',
    timeout:10000,maxBuffer:131072,
    env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}
  });
  if(result.error || result.signal || result.status!==0 ||
     typeof result.stdout!=='string') return null;
  return result.stdout;
}
export function inspectLocalCheckout(argv){
  if(!Array.isArray(argv) || argv.length!==0) return {
    ...safeError(),errorCode:'CHECKOUT_RECEIPT_ARGUMENTS_NOT_ALLOWED'
  };
  const prefix=git(['rev-parse','--show-prefix']);
  // Check only the reviewed source root, never a parent or nested repo.
  if(prefix!=='' && prefix!=='\n') return safeError();
  const head=git(['rev-parse','--verify','HEAD']);
  const changes=git(['status','--porcelain=v1','--untracked-files=normal']);
  if(head===null || changes===null) return safeError();
  return formatCheckoutReceipt(head.trim(),changes);
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=inspectLocalCheckout(process.argv.slice(2));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.exitCode;
}
