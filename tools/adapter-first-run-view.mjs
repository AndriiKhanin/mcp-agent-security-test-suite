#!/usr/bin/env node
/**
 * M8-P: opt-in terminal-only interpretation of fixed, fictional first-run
 * controls. The renderer never interpolates untrusted descriptors or reports.
 * It does not run real targets, spawn user commands or contact external MCP.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOfflineFirstRun} from './adapter-first-run.mjs';

const REQUIRED_STEPS = Object.freeze([
  'REVIEW_FICTIONAL_SCOPE',
  'GENERATE_TEMPLATE',
  'COPY_NESTED_TEMPLATE_ONLY',
  'VALIDATE_OFFLINE',
  'INTERPRET_SYNTHETIC_RESULT'
]);
const ALLOWED_TRANSPORTS = Object.freeze(['stdio','streamable-http']);
const FIXED_VIEW = Object.freeze([
  'MCP ADAPTER FIRST RUN - FICTIONAL OFFLINE CONTROLS ONLY',
  '',
  'Local built-in fictional adapter smoke: PASS (2/2)',
  'Transports checked: stdio, streamable-http',
  '',
  '1. Review a public source checkout and use Node.js 20+.',
  '2. Generate a fictional template:',
  '   node src/cli.mjs adapter-template stdio',
  '   node src/cli.mjs adapter-template streamable-http',
  '3. Copy only the nested template object into a local fictional JSON file.',
  '   Do not copy the entire JSON report or include real credentials.',
  '4. Validate the local inert JSON descriptor:',
  '   node src/cli.mjs adapter-check <local-descriptor-file>',
  '5. Interpret PASS as local synthetic checks, not a real security assessment.',
  '',
  'External MCP servers contacted: NO',
  'User process executed: NO',
  'User descriptor read by this command: NO',
  'Real project assessed: NO',
  'Operator ownership: NOT VERIFIED',
  'Independent beta: NOT VERIFIED',
  'Independent security audit: NOT COMPLETED',
  'Stable release: NOT AUTHORIZED',
  ''
].join('\n'));

const DENIED_FLAGS = Object.freeze([
  'externalMcpContacted', 'userProcessExecuted', 'userDescriptorRead',
  'realProjectAssessed', 'operatorVerified', 'independentBetaVerified',
  'independentAuditCompleted', 'stableReleaseAuthorized'
]);

export function renderOfflineFirstRunText(report){
  if(!report || typeof report!=='object' ||
    report.schemaVersion!==1 ||
    report.profile!=='first-party-fictional-first-run-v1' ||
    report.status!=='PASS'||report.exitCode!==0||
    report.scope!=='SOURCE_ONLY_FICTIONAL'||report.smokePassed!==2||
    !Array.isArray(report.transports)||
    report.transports.length!==ALLOWED_TRANSPORTS.length||
    report.transports.some((x,i)=>x!==ALLOWED_TRANSPORTS[i])||
    !Array.isArray(report.steps)||report.steps.length!==REQUIRED_STEPS.length||
    report.steps.some((x,i)=>!x||typeof x!=='object'||x.code!==REQUIRED_STEPS[i])||
    DENIED_FLAGS.some(flag=>report[flag]!==false)){
    throw new TypeError('FICTIONAL_FIRST_RUN_NOT_VERIFIED');
  }
  // Never render supplied report strings: all output is a fixed source literal.
  return FIXED_VIEW;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==2){
    process.stderr.write('ERROR: FIRST_RUN_VIEW_ARGUMENTS_NOT_ALLOWED\n');
    process.exitCode=2;
  } else {
    try{
      process.stdout.write(renderOfflineFirstRunText(runOfflineFirstRun()));
    }catch{
      process.stderr.write('ERROR: FICTIONAL_FIRST_RUN_NOT_VERIFIED\n');
      process.exitCode=1;
    }
  }
}
