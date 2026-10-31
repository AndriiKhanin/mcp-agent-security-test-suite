#!/usr/bin/env node
/**
 * Dependency-free, portable, offline contributor smoke.
 * Only reviewed bundled fictional fixtures and source-authored synthetic
 * event literals. No user-supplied data, external target contact, credentials,
 * network calls, arbitrary commands, or user executable paths.
 *
 * A CI matcher PASS is NEVER evidence that an observed safety FAIL passed.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const invoke = (mode,file) => {
  const run=spawnSync(process.execPath,['src/cli.mjs',mode,file],{
    cwd:root,encoding:'utf8',shell:false,windowsHide:true,
    env:{NODE_NO_WARNINGS:'1'},timeout:15000,maxBuffer:65536
  });
  if(run.error || run.signal || !Number.isSafeInteger(run.status))
    throw Error('EXECUTION_FAILED');
  let json;
  try {json=JSON.parse(run.stdout);} catch {throw Error('INVALID_CLI_JSON');}
  if(!json || json.reportSchemaVersion!==1 || json.command!==mode ||
     json.exitCode!==run.status) throw Error('SCHEMA_MISMATCH');
  return {exitCode:run.status,result:json};
};

// This is our OWN inert example descriptor. The endpoint is never resolved or
// contacted and cannot grant execution authority to a real project.
const fictionalDescriptor=Object.freeze({
  adapterSchemaVersion:1,
  project:{name:'fictional-ci-project'},
  transport:{type:'streamable-http',endpoint:'https://mcp.example.org/mcp'},
  protocolVersion:'2026-07-28',
  policy:{
    mode:'validate-only',allowNetwork:false,allowProcessSpawn:false,
    allowToolCalls:false,allowCredentials:false
  }
});
const cleanEvent=Object.freeze({
  decision:'DENY',effect:'NONE',ownerAuthorized:false,
  scopeAuthorized:false,leaseFresh:false,secretLogged:false
});
const expectedCase=(effect,expectedStatus,rules)=>({
  expectationSchemaVersion:1,
  mode:'synthetic-expectations-only',
  trace:{
    traceSchemaVersion:1,
    mode:'user-authored-synthetic-only',
    descriptor:fictionalDescriptor,
    events:[{...cleanEvent,effect}]
  },
  expectedStatus,
  expected:[{event:1,ruleCodes:[...rules]}]
});
const fixedRule='DENIED_ACTION_HAD_EFFECT';
const mismatchRules=[
  'SYMBOLIC_EXPECTATION_MISMATCH',
  'SYMBOLIC_STATUS_EXPECTATION_MISMATCH'
];
// No new packaged file: only a disposable local file inside a private tmp dir.
// The source hardcodes each input; there is no path selector or input parser.
function withSyntheticFile(fn){
  const dir=mkdtempSync(join(tmpdir(),'mcp-fictional-ci-'));
  const filename=join(dir,'synthetic.json');
  try {
    const runCase=data=>{
      const body=JSON.stringify(data);
      if(Buffer.byteLength(body,'utf8')>4096)
        throw Error('FIXED_FIXTURE_TOO_LARGE');
      writeFileSync(filename,body,{encoding:'utf8',flag:'w',mode:0o600});
      return invoke('adapter-trace-expect',filename);
    };
    return fn(runCase);
  } finally {
    rmSync(dir,{force:true,recursive:true});
  }
}
const exactRules=(values,expected)=>
  Array.isArray(values) && values.length===expected.length &&
  expected.every((rule,i)=>values[i]===rule);
function requireSymbolic(res,exitCode,observedSafety,match,expectedSafety,
  observedRules,matcherRules){
  const v=res.result;
  const wantedStatus=exitCode===0?'PASS':'FAIL';
  if(res.exitCode!==exitCode || v.status!==wantedStatus ||
     v.expectationStatus!==match ||
     v.expectedSafetyStatus!==expectedSafety ||
     v.observedSafetyStatus!==observedSafety ||
     v.reportMeaning!=='EXACT_SYNTHETIC_EXPECTATION_MATCH_ONLY' ||
     v.authorizationStatus!=='REAL_TARGET_EXECUTION_NOT_AUTHORIZED' ||
     v.targetEvidence!=='REAL_TARGET_NOT_ATTEMPTED' ||
     v.connectionStatus!=='NOT_ATTEMPTED' ||
     v.executionEnabled!==false || v.externalTargetContacted!==false ||
     v.projectConnectionAuthorized!==false ||
     v.recordsAreRealMcpObservations!==false ||
     v.operatorVerified!==false || v.checked!==1 ||
     v.observedFailureCount!==observedRules.length ||
     v.failureCount!==matcherRules.length ||
     !Array.isArray(v.observedFindings) ||
     !exactRules(v.observedFindings.map(f=>f.rule),observedRules) ||
     v.observedFindings.some(f=>f.event!==1) ||
     !Array.isArray(v.findings) ||
     !exactRules(v.findings.map(f=>f.rule),matcherRules) ||
     !Array.isArray(v.checks) || v.checks.length!==1 ||
     v.checks[0].event!==1 ||
     v.checks[0].expectationStatus!==match ||
     !exactRules(v.checks[0].observedRuleCodes,observedRules) ||
     v.summary?.failureCount!==matcherRules.length ||
     !exactRules(v.summary.ruleCodes,[...new Set(matcherRules)].sort()) ||
     JSON.stringify(v).includes('mcp.example.org') ||
     JSON.stringify(v).includes('fictional-ci-project'))
    throw Error('SYMBOLIC_CI_CONTRACT_MISMATCH');
}
/**
 * Local-only developer runner. Explicit opt-in, reviewed command allowlist,
 * no registry/install, no shell. The no-argument CI smoke is unchanged.
 * Logs stay in a private OS temp folder; NEVER upload them automatically.
 */
function runLocalSuite(mode){
  const quick=mode==='--local-quick';
  if(!/^v(?:20|22)\./.test(process.version)) throw Error('UNSUPPORTED_LOCAL_NODE');
  const env={...process.env,npm_config_offline:'true',
    npm_config_ignore_scripts:'true',npm_config_audit:'false',
    npm_config_fund:'false',npm_config_update_notifier:'false'};
  const git=(args)=>spawnSync('git',args,{
    cwd:root,env,encoding:'utf8',shell:false,windowsHide:true,
    timeout:10000,maxBuffer:65536});
  const head=git(['rev-parse','HEAD']);
  const status=git(['status','--porcelain']);
  if(head.status!==0||status.status!==0||
     !/^[0-9a-f]{40}$/.test(head.stdout.trim()))
    throw Error('LOCAL_GIT_CHECK_FAILED');
  const dir=mkdtempSync(join(tmpdir(),'mcp-local-ci-'));
  const stages=[
    {name:'regression',args:quick
      ? ['--test','test/cli.test.mjs','test/cli-discovery.test.mjs','test/demo.test.mjs']
      : ['--test']},
    {name:'fictional-smoke',args:[fileURLToPath(import.meta.url)]}
  ];
  const receipts=[];
  for(const stage of stages){
    const run=spawnSync(process.execPath,stage.args,{
      cwd:root,env,encoding:'utf8',shell:false,windowsHide:true,
      timeout:900000,maxBuffer:8*1024*1024});
    const log=join(dir,stage.name+'.log');
    writeFileSync(log,(run.stdout||'')+'\n'+(run.stderr||''),{
      encoding:'utf8',mode:0o600});
    const passed=!run.error&&!run.signal&&run.status===0;
    receipts.push({stage:stage.name,status:passed?'PASS':'FAIL',
      exitCode:Number.isInteger(run.status)?run.status:null,log});
    if(!passed) break;
  }
  const ok=receipts.length===stages.length&&
    receipts.every(x=>x.status==='PASS');
  const receipt={schemaVersion:1,mode:quick?'QUICK':'FULL',
    status:ok?'PASS':'FAIL',source:'LOCAL_CHECKOUT_ONLY',
    gitHead:head.stdout.trim(),workingTreeClean:status.stdout.trim()==='',
    platform:process.platform,node:process.version,
    externalTargetAssessed:false,independentCI:false,stages:receipts};
  const receiptPath=join(dir,'receipt.json');
  writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{
    encoding:'utf8',mode:0o600});
  process.stdout.write('LOCAL_CI_'+receipt.status+' '+receipt.mode+
    ' gitHead='+receipt.gitHead+' workingTreeClean='+
    receipt.workingTreeClean+' node='+receipt.node+'\n');
  process.stdout.write('LOCAL_CI_RECEIPT '+receiptPath+'\n');
  if(!ok) process.exitCode=1;
}

if(process.argv.length===3 &&
  ['--local-quick','--local-full'].includes(process.argv[2])){
  try{runLocalSuite(process.argv[2]);}
  catch{process.stderr.write('LOCAL_CI_ERROR: unable to run reviewed local checks\n');
    process.exitCode=2;}
} else try {
  if(process.argv.length!==2) throw Error('NO_CUSTOM_ARGUMENTS');
  const safe=invoke('scenario','fixtures/scenario-denial.json');
  if(safe.exitCode!==0 || safe.result.status!=='PASS' ||
     safe.result.actualFinal?.denied!==9 ||
     safe.result.actualFinal?.writes!==1 ||
     safe.result.summary.failureCount!==0)
    throw Error('SAFE_FIXTURE_FAILED');

  const unsafe=invoke('negotiate','fixtures/mcp-negotiate-unsafe-params.json');
  if(unsafe.exitCode!==1 || unsafe.result.status!=='FAIL' ||
     !unsafe.result.summary.ruleCodes.includes('RETRY_PARAMS_CHANGED') ||
     unsafe.result.summary.failureCount<1)
    throw Error('NEGATIVE_CONTROL_MISSED');

  withSyntheticFile(runCase=>{
    const clean=runCase(expectedCase('NONE','PASS',[]));
    requireSymbolic(clean,0,'PASS','MATCH','PASS',[],[]);

    const expectedBad=runCase(expectedCase('WRITE','FAIL',[fixedRule]));
    requireSymbolic(expectedBad,0,'FAIL','MATCH','FAIL',[fixedRule],[]);

    const unexpectedBad=runCase(expectedCase('WRITE','PASS',[]));
    requireSymbolic(unexpectedBad,1,'FAIL','MISMATCH','PASS',
      [fixedRule],mismatchRules);
  });

  // Fixed public messages contain no user-derived paths, tokens, or payloads.
  process.stdout.write('SAFE_FIXTURE_PASS: expected synthetic denials caused no unauthorized effects\n');
  process.stdout.write('EXPECTED_FAIL_DETECTED: RETRY_PARAMS_CHANGED, exit code 1\n');
  process.stdout.write('SYNTHETIC_CLEAN_MATCH: observed PASS, expectation MATCH, exit code 0\n');
  process.stdout.write('SYNTHETIC_EXPECTED_VIOLATION: observed FAIL, expectation MATCH, exit code 0\n');
  process.stdout.write('SYNTHETIC_UNEXPECTED_VIOLATION: observed FAIL, expectation MISMATCH, exit code 1\n');
  process.stdout.write('DEMO_PASS: all offline fictional contract checks behaved as expected\n');
} catch {
  process.stderr.write('DEMO_FAIL: offline example did not meet its fixed assertions\n');
  process.exitCode=1;
}
