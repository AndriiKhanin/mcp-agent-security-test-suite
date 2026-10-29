#!/usr/bin/env node
/**
 * M7-J/K: opt-in, source-only fictional beta feedback card.
 * Runs only the five fixed first-party checks from beta-acceptance-check.mjs.
 * No external targets, telemetry, credentials, issue submission or provenance proof.
 * This tools/ script is intentionally excluded from the npm package.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BETA_CASES,runBeta} from '../examples/beta-acceptance-check.mjs';

const RULES=new Set(['NONE','BETA_PROCESS_FAILURE','BETA_REPORT_INVALID','BETA_EXPECTATION_MISMATCH']);
const invalid=()=>{throw new TypeError('INVALID_FICTIONAL_BETA_CARD_INPUT');};

export function buildBetaFeedbackCard(result, mode='standalone') {
  // Both modes are source-owned presentation profiles; neither grants new authority.
  if(mode!=='standalone' && mode!=='combined-review') invalid();
  if(!result || typeof result!=='object' || Array.isArray(result) ||
     Object.getPrototypeOf(result)!==Object.prototype ||
     !Array.isArray(result.cases) || result.cases.length!==BETA_CASES.length ||
     Object.getPrototypeOf(result.cases)!==Array.prototype ||
     !['PASS','FAIL'].includes(result.status) ||
     result.betaSchemaVersion!==1 || result.profile!=='fictional-beta-acceptance-v1' ||
     result.candidate!=='0.0.10-rc.1' ||
     result.total!==BETA_CASES.length || !Number.isInteger(result.passed) ||
     !Number.isInteger(result.failed) || result.passed+result.failed!==BETA_CASES.length ||
     result.exitCode!==(result.status==='PASS'?0:1)) invalid();
  const rows=[];
  let matched=0;
  const slots=Object.getOwnPropertyDescriptors(result.cases);
  if(Reflect.ownKeys(slots).length!==BETA_CASES.length+1) invalid();
  for(let i=0;i<BETA_CASES.length;i++){
    const slot=slots[String(i)];
    if(!slot || !Object.hasOwn(slot,'value') || !slot.enumerable) invalid();
    const row=slot.value;
    if(!row || typeof row!=='object' || Array.isArray(row) ||
       Object.getPrototypeOf(row)!==Object.prototype) invalid();
    const fields=Object.getOwnPropertyDescriptors(row);
    if(Reflect.ownKeys(fields).length!==5 ||
       !['id','expectedStatus','expectedExit','matched','rule'].every(k=>
         Object.hasOwn(fields,k) && Object.hasOwn(fields[k],'value') &&
         fields[k].enumerable)) invalid();
    const expected=BETA_CASES[i];
    if(row.id!==expected.id || row.expectedStatus!==expected.status ||
       row.expectedExit!==expected.exit || typeof row.matched!=='boolean' ||
       !RULES.has(row.rule) || row.matched!==(row.rule==='NONE')) invalid();
    if(row.matched)matched++;
    // Never interpolate input fields, even when validated: use source literals.
    rows.push('- '+expected.id+': '+(row.matched?'MATCH':'MISMATCH')+
      (row.matched?'':' ('+row.rule+')'));
  }
  if(result.passed!==matched || result.failed!==BETA_CASES.length-matched ||
     (result.status==='PASS')!==(matched===BETA_CASES.length)) invalid();
  return [
    '# Fictional offline beta feedback — self-reported only',
    '',
    'Candidate: 0.0.10-rc.1',
    mode==='standalone'
      ? 'Public Git commit SHA: [fill manually from git rev-parse HEAD]'
      : 'Public Git commit SHA: see local Git HEAD above (independently verify)',
    'Operating system (Windows/Ubuntu): [fill manually]',
    'Node major (20/22): [fill manually]',
    'Commands used: node tools/'+(mode==='standalone'?'beta-feedback-card.mjs':'beta-review.mjs'),
    'Fixed check matches: '+matched+'/'+BETA_CASES.length,
    'Runner status: '+(result.status==='PASS'?'PASS':'FAIL'),
    '',
    '## Fixed fictional checks',
    ...rows,
    '',
    '## Usability feedback (optional; sanitize before sharing)',
    'Were the setup steps clear? [fill manually]',
    'What caused friction? [fill manually]',
    'What could be improved? [fill manually]',
    '',
    '## Important limits',
    'This card is not proof of independent origin or actual external execution.',
    'No real MCP server was assessed. No permission or security certification was granted.',
    'Do not paste names, local paths, tokens, logs, credentials, or private endpoints.',
    'Verify public SHA, runner output and submitter independently before counting beta evidence.',
    'Send vulnerabilities privately through SECURITY.md, not a public issue.'
  ].join('\n')+'\n';
}

export function runBetaFeedbackCard(argv) {
  if(!Array.isArray(argv) || argv.length!==0)
    return {exitCode:2,text:'ERROR: BETA_CARD_ARGUMENTS_NOT_ALLOWED\n'};
  const result=runBeta([]);
  return {exitCode:result.exitCode,text:buildBetaFeedbackCard(result)};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const output=runBetaFeedbackCard(process.argv.slice(2));
    process.stdout.write(output.text);
    process.exitCode=output.exitCode;
  }catch{
    process.stderr.write('ERROR: INVALID_FICTIONAL_BETA_CARD\n');
    process.exitCode=2;
  }
}
