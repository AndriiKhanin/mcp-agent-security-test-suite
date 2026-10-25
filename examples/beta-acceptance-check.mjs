import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// M5-05: local fictional acceptance; never launches external targets or
// interprets caller-provided paths. Outputs symbolic, bounded verdicts ONLY.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'src', 'cli.mjs');
const PROFILE = 'fictional-beta-acceptance-v1';
export const BETA_CASES = Object.freeze([
  Object.freeze({id:'OFFLINE_HELP', args:Object.freeze(['help']), status:'PASS', exit:0}),
  Object.freeze({id:'LOCAL_VERSION', args:Object.freeze(['version']), status:'PASS', exit:0}),
  Object.freeze({id:'FIXED_DEMO', args:Object.freeze(['demo']), status:'PASS', exit:0}),
  Object.freeze({id:'POLICY_DENIAL', args:Object.freeze(['scenario', join(root,'fixtures','scenario-denial.json')]), status:'PASS', exit:0}),
  Object.freeze({id:'RETRY_MUTATION', args:Object.freeze(['negotiate', join(root,'fixtures','mcp-negotiate-unsafe-params.json')]), status:'FAIL', exit:1}),
]);
const CASE_IDS = new Set(BETA_CASES.map(x=>x.id));
const counters = x=>x?.denied===9 && x?.allowed===2 && x?.writes===1 && x?.reads===1;

export function matchesBetaCase(id, exit, data) {
  if (!CASE_IDS.has(id) || !Number.isInteger(exit) || !data ||
      typeof data!=='object' || data.reportSchemaVersion!==1 ||
      data.exitCode!==exit) return false;
  switch (id) {
    case 'OFFLINE_HELP':
      return exit===0 && data.command==='help' && data.status==='PASS' &&
        Array.isArray(data.commands) &&
        ['demo','scenario','negotiate','version'].every(x=>data.commands.includes(x));
    case 'LOCAL_VERSION':
      return exit===0 && data.command==='version' && data.status==='PASS' &&
        data.packageName==='mcp-agent-security-test-suite' &&
        data.version==='0.0.10-rc.1';
    case 'FIXED_DEMO':
      return exit===0 && data.command==='demo' && data.status==='PASS' &&
        data.checks===2 && Array.isArray(data.expectations) &&
        data.expectations.length===2 && data.expectations.every(x=>x?.matched===true);
    case 'POLICY_DENIAL':
      return exit===0 && data.command==='scenario' && data.status==='PASS' &&
        data.checks===11 && counters(data.actualFinal) &&
        Array.isArray(data.mismatches) && data.mismatches.length===0;
    case 'RETRY_MUTATION':
      return exit===1 && data.command==='negotiate' && data.status==='FAIL' &&
        data.summary?.failureCount===1 &&
        Array.isArray(data.summary?.ruleCodes) &&
        data.summary.ruleCodes.length===1 &&
        data.summary.ruleCodes[0]==='RETRY_PARAMS_CHANGED';
    default:
      return false;
  }
}

/** M7-G/H/I: direct-JS beta summaries accept only dense first-party-shaped
 * symbolic evidence, never caller-controlled getters or contradictory rules.
 * This is not a Proxy sandbox or evidence of independent beta execution. */
function exactSummaryRows(rows) {
  if(!Array.isArray(rows) || Object.getPrototypeOf(rows)!==Array.prototype ||
     rows.length!==BETA_CASES.length) return false;
  const arrayProps=Object.getOwnPropertyDescriptors(rows);
  if(Reflect.ownKeys(arrayProps).length!==rows.length+1) return false;
  for(let i=0;i<rows.length;i++) {
    const slot=arrayProps[String(i)];
    if(!slot || !Object.hasOwn(slot,'value') || !slot.enumerable) return false;
    const item=slot.value;
    if(!item || typeof item!=='object' || Array.isArray(item) ||
       Object.getPrototypeOf(item)!==Object.prototype) return false;
    const props=Object.getOwnPropertyDescriptors(item);
    if(Reflect.ownKeys(props).length!==3) return false;
    for(const key of ['id','matched','rule']) {
      if(!Object.hasOwn(props,key) || !Object.hasOwn(props[key],'value') ||
         !props[key].enumerable) return false;
    }
    if(item.id!==BETA_CASES[i].id || typeof item.matched!=='boolean' ||
       !['NONE','BETA_PROCESS_FAILURE','BETA_REPORT_INVALID',
          'BETA_EXPECTATION_MISMATCH'].includes(item.rule) ||
       (item.matched && item.rule!=='NONE') ||
       (!item.matched && item.rule==='NONE')) return false;
  }
  return true;
}
export function betaSummary(outcomes) {
  if(!exactSummaryRows(outcomes)) throw new TypeError('BETA_INVALID_SUMMARY_INPUT');
  const failures=outcomes.filter(x=>!x.matched).length;
  return {
    betaSchemaVersion:1,
    profile:PROFILE,
    candidate:'0.0.10-rc.1',
    scope:'bundled fictional checks only; no external MCP targets',
    status:failures===0?'PASS':'FAIL',
    exitCode:failures===0?0:1,
    total:BETA_CASES.length,
    passed:BETA_CASES.length-failures,
    failed:failures,
    cases:outcomes.map((x,i)=>({
      id:x.id,
      expectedStatus:BETA_CASES[i].status,
      expectedExit:BETA_CASES[i].exit,
      matched:x.matched,
      rule:x.rule
    }))
  };
}

function observe(fixture) {
  const x=spawnSync(process.execPath,[cli,...fixture.args],{
    cwd:root,
    env:{PATH:process.env.PATH??'',SystemRoot:process.env.SystemRoot??''},
    shell:false,windowsHide:true,encoding:'utf8',timeout:12_000,maxBuffer:131_072
  });
  if (x.error || x.signal || !Number.isInteger(x.status)) {
    return {id:fixture.id,matched:false,rule:'BETA_PROCESS_FAILURE'};
  }
  let report;
  try {
    if (x.stdout.length>65_536) throw new Error('BOUND');
    report=JSON.parse(x.stdout);
  } catch {
    return {id:fixture.id,matched:false,rule:'BETA_REPORT_INVALID'};
  }
  const matched=matchesBetaCase(fixture.id,x.status,report);
  return {
    id:fixture.id,matched,
    rule:matched?'NONE':'BETA_EXPECTATION_MISMATCH'
  };
}

export function runBeta(argv) {
  if (argv.length!==0) return {
    betaSchemaVersion:1, profile:PROFILE, status:'ERROR', exitCode:2,
    errorCode:'BETA_ARGUMENTS_NOT_ALLOWED'
  };
  return betaSummary(BETA_CASES.map(observe));
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=runBeta(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exitCode=result.exitCode;
}


/**
 * M5-08: offline consistency preflight of a manually sanitized, symbolic
 * CLAIM. This does not receive GitHub identities, URLs, raw logs or evidence
 * sources; it NEVER establishes independent authorship, provenance or safety.
 * The original fixed runner is not changed.
 */
export const REVIEWED_FICTIONAL_BETA_SOURCE_SHA=
  '65ded572c1720832ff3f59cb9cd0e3a6987edbdb';
const BETA_EVIDENCE_RULES=new Set([
  'NONE','BETA_PROCESS_FAILURE','BETA_REPORT_INVALID',
  'BETA_EXPECTATION_MISMATCH'
]);
function ownPlainRecord(x,required){
  if(!x || typeof x!=='object' || Array.isArray(x) ||
     Object.getPrototypeOf(x)!==Object.prototype) return false;
  const descriptors=Object.getOwnPropertyDescriptors(x);
  const keys=Reflect.ownKeys(descriptors);
  return keys.length===required.length &&
    keys.every(k=>typeof k==='string' &&
      required.includes(k) &&
      Object.hasOwn(descriptors[k],'value'));
}
function densePlainFive(a){
  if(!Array.isArray(a)||a.length!==BETA_CASES.length||
     Object.getPrototypeOf(a)!==Array.prototype) return false;
  const props=Object.getOwnPropertyDescriptors(a);
  return Reflect.ownKeys(props).length===BETA_CASES.length+1 &&
    BETA_CASES.every((_,i)=>Object.hasOwn(props,String(i)) &&
      Object.hasOwn(props[String(i)],'value'));
}
const invalidEvidence=()=>{
  throw new TypeError('INVALID_FICTIONAL_BETA_EVIDENCE_CLAIM');
};
/**
 * Input must be EXACTLY:
 * { evidenceSchemaVersion:1, sourceSha:<reviewed SHA>,
 *   candidate:'0.0.10-rc.1', os:'Windows'|'Ubuntu',
 *   nodeMajor:20|22, runnerStatus:'PASS'|'FAIL', matchedCount:0..5,
 *   cases:[{id:<fixed identifier>,matched:boolean,rule:<known BETA_* or NONE>}]
 * }
 *
 * A structurally valid self-declared claim is NOT a beta participant,
 * identity proof, verified executed test or independent assessment.
 */
export function reviewBetaEvidenceSummary(claim){
  try {
    if(!ownPlainRecord(claim,[
      'evidenceSchemaVersion','sourceSha','candidate','os','nodeMajor',
      'runnerStatus','matchedCount','cases'
    ]) ||
      claim.evidenceSchemaVersion!==1 ||
      claim.sourceSha!==REVIEWED_FICTIONAL_BETA_SOURCE_SHA ||
      claim.candidate!=='0.0.10-rc.1' ||
      !['Windows','Ubuntu'].includes(claim.os) ||
      ![20,22].includes(claim.nodeMajor) ||
      !['PASS','FAIL'].includes(claim.runnerStatus) ||
      !Number.isSafeInteger(claim.matchedCount) ||
      claim.matchedCount<0 || claim.matchedCount>5 ||
      !densePlainFive(claim.cases)) invalidEvidence();

    let matched=0;
    const rows=[];
    for(let i=0;i<BETA_CASES.length;i++){
      const c=claim.cases[i];
      if(!ownPlainRecord(c,['id','matched','rule']) ||
        c.id!==BETA_CASES[i].id ||
        typeof c.matched!=='boolean' ||
        !BETA_EVIDENCE_RULES.has(c.rule) ||
        (c.matched && c.rule!=='NONE') ||
        (!c.matched && c.rule==='NONE')) invalidEvidence();
      if(c.matched)matched++;
      rows.push({caseId:BETA_CASES[i].id,
        claimStatus:c.matched?'MATCH_CLAIMED':'MISMATCH_CLAIMED',
        rule:c.rule});
    }
    if(matched!==claim.matchedCount ||
       (matched===BETA_CASES.length)!==(claim.runnerStatus==='PASS'))
      invalidEvidence();
    return {
      evidenceSchemaVersion:1,
      preflightStatus:'CLAIM_CONSISTENT_ONLY',
      candidate:'0.0.10-rc.1',
      sourceSha:REVIEWED_FICTIONAL_BETA_SOURCE_SHA,
      claimedOs:claim.os,
      claimedNodeMajor:claim.nodeMajor,
      claimedRunnerStatus:claim.runnerStatus,
      claimedMatchedCount:matched,
      total:BETA_CASES.length,
      cases:rows,
      independentOriginVerified:false,
      actualExecutionVerified:false,
      manualProvenanceReviewRequired:true,
      betaGateSatisfied:false,
      securityCertified:false,
      realTargetAuthorized:false,
      externalMcpContacted:false,
      releaseAuthorized:false,
      nextAction:'VERIFY_EXTERNAL_SOURCE_AND_TRIAGE_MANUALLY'
    };
  } catch {
    invalidEvidence();
  }
}
