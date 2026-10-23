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

export function betaSummary(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length!==BETA_CASES.length ||
      outcomes.some((out,i)=>out?.id!==BETA_CASES[i].id ||
        typeof out?.matched!=='boolean' ||
        !['NONE','BETA_PROCESS_FAILURE','BETA_REPORT_INVALID',
          'BETA_EXPECTATION_MISMATCH'].includes(out?.rule))) {
    throw new TypeError('BETA_INVALID_SUMMARY_INPUT');
  }
  const failures = outcomes.filter(x=>!x.matched).length;
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
