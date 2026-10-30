#!/usr/bin/env node
/**
 * M8-P: opt-in terminal-only interpretation of fixed, fictional first-run
 * controls. The renderer never interpolates untrusted descriptors or reports.
 * It does not run real targets, spawn user commands or contact external MCP.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runOfflineFirstRun} from './adapter-first-run.mjs';
import {inspectOfflineOnboarding} from './m35-offline-onboarding-report.mjs';

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


/**
 * M37: one command demonstrates first-party M8 adapter smoke and the M35
 * client-config grammar for TWO source-owned fictional examples. It neither
 * reads a user project nor makes a model/MCP/network/process call.
 *
 * Each M35 result independently reruns five fixed fictional checks.
 * These are NOT real-world scanner detection counts or server tests.
 */
const M37_PROFILE='m37-offline-adopter-self-check-v1';
const M37_NEXT=Object.freeze([
  'TO_CHECK_A_PRIVATE_ONE_SERVER_CONFIG_USE_M35_STDIN',
  'TO_VERIFY_LOCAL_DISTRIBUTION_USE_M36_DOCTOR_SEPARATELY',
  'REAL_TARGET_TESTING_REQUIRES_SEPARATE_OWNER_AUTHORIZATION'
]);
const M37_DENIED=Object.freeze({
  reportSchemaVersion:1,profile:M37_PROFILE,status:'ERROR',exitCode:2,
  ruleCode:'M37_BUNDLED_SELF_CHECK_UNAVAILABLE',
  scope:'FIRST_PARTY_FIXED_OFFLINE_ONLY',
  realProjectAssessed:false,actualAgentBehaviorObserved:false,
  externalMcpContacted:false,userProcessExecuted:false,
  projectConnectionAuthorized:false,independentBetaVerified:false,
  independentAuditVerified:false,releaseApproved:false,
  npmPublished:false,securityCertified:false
});
const issuedM37=new WeakSet();
const M37_STDIO=Object.freeze({
  mcpServers:Object.freeze({
    fictional_stdio:Object.freeze({command:'node',args:Object.freeze(['server.mjs'])})
  })
});
const M37_HTTP=Object.freeze({
  servers:Object.freeze({
    fictional_https:Object.freeze({
      type:'http',url:'https://mcp.example.org/mcp'
    })
  })
});
const STEP_IDS=Object.freeze([...REQUIRED_STEPS]);
const M35_UNTESTED=Object.freeze([
  'REAL_MCP_TARGET_CONNECTIVITY','REAL_AGENT_OR_LLM_BEHAVIOR',
  'EXTERNAL_TOOL_EFFECTS','TARGET_OWNERSHIP_AND_OPERATOR_AUTHORIZATION',
  'TLS_DNS_AND_SSRF_DEFENSES','CREDENTIAL_HANDLING',
  'INDEPENDENT_BETA_AND_SECURITY_AUDIT','SECURITY_CERTIFICATION_AND_RELEASE'
]);
const M35_ACTIONS=Object.freeze([
  'REVIEW_PRIVATE_DESCRIPTOR_IF_NEEDED',
  'KEEP_REAL_TARGET_DISABLED',
  'SEEK_SEPARATE_VERIFIED_AUTHORIZATION'
]);
const M8_RECORD_FIELDS=Object.freeze([
  'schemaVersion','profile','status','exitCode','scope','transports',
  'steps','smokePassed','externalMcpContacted','userProcessExecuted',
  'userDescriptorRead','realProjectAssessed','operatorVerified',
  'independentBetaVerified','independentAuditCompleted',
  'stableReleaseAuthorized'
]);
const M35_RECORD_FIELDS=Object.freeze([
  'reportSchemaVersion','profile','status','exitCode','ruleCode','scope',
  'verdict','riskRating','descriptor','fictionalControls','notTested',
  'nextActions','connectionStatus','externalTargetContacted',
  'configuredProcessSpawned','projectConnectionAuthorized',
  'operatorVerified','realProjectAssessed','actualAgentBehaviorObserved',
  'independentBetaVerified','securityCertified','stableReleaseAuthorized'
]);
function ownPlain(obj,keys){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
    Object.getPrototypeOf(obj)!==Object.prototype)return false;
  const d=Object.getOwnPropertyDescriptors(obj);
  const found=Reflect.ownKeys(d);
  return found.length===keys.length&&found.every(k=>
    typeof k==='string'&&keys.includes(k)&&
    d[k].enumerable&&Object.hasOwn(d[k],'value'));
}
function ownArray(a,size){
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==
    Array.prototype||a.length!==size)return false;
  const d=Object.getOwnPropertyDescriptors(a);
  return Reflect.ownKeys(d).length===size+1&&
    d.length?.value===size&&
    Array.from({length:size},(_,i)=>d[String(i)]).every(
      v=>v?.enumerable&&Object.hasOwn(v,'value'));
}
const is=(o,k,v)=>Object.getOwnPropertyDescriptor(o,k)?.value===v;
function matchFirstRun(x){
  if(!ownPlain(x,M8_RECORD_FIELDS)||
    !is(x,'schemaVersion',1)||
    !is(x,'profile','first-party-fictional-first-run-v1')||
    !is(x,'status','PASS')||!is(x,'exitCode',0)||
    !is(x,'scope','SOURCE_ONLY_FICTIONAL')||
    !is(x,'smokePassed',2)||
    !ownArray(x.transports,2)||
    !ALLOWED_TRANSPORTS.every((v,i)=>x.transports[i]===v)||
    !ownArray(x.steps,STEP_IDS.length)||
    !x.steps.every((v,i)=>ownPlain(v,['code','instruction'])&&
      v.code===STEP_IDS[i]&&typeof v.instruction==='string')||
    DENIED_FLAGS.some(k=>!is(x,k,false)))return false;
  return true;
}
function matchM35(x,transport){
  if(!ownPlain(x,M35_RECORD_FIELDS)||
    !is(x,'reportSchemaVersion',1)||
    !is(x,'profile','m35-readable-offline-onboarding-v1')||
    !is(x,'status','PASS')||!is(x,'exitCode',0)||
    !is(x,'ruleCode','OFFLINE_ONBOARDING_SHAPE_ACCEPTED')||
    !is(x,'scope','ONE_INERT_CLIENT_CONFIG_AND_FIXED_FICTIONAL_CONTROLS_ONLY')||
    !is(x,'verdict','CONFIGURATION_ONLY')||
    !is(x,'riskRating','NOT_SCORED')||
    !is(x,'connectionStatus','NOT_ATTEMPTED')||
    !ownPlain(x.descriptor,['status','transport','policy','targetTested'])||
    !is(x.descriptor,'status','SHAPE_VALIDATED')||
    !is(x.descriptor,'transport',transport)||
    !is(x.descriptor,'policy','VALIDATE_ONLY')||
    !is(x.descriptor,'targetTested',false)||
    !ownPlain(x.fictionalControls,[
      'status','count','projectSpecific','actualAttackEfficacyMeasured'])||
    !is(x.fictionalControls,'status','FIRST_PARTY_SYNTHETIC_MATCH')||
    !is(x.fictionalControls,'count',5)||
    !is(x.fictionalControls,'projectSpecific',false)||
    !is(x.fictionalControls,'actualAttackEfficacyMeasured',false)||
    !ownArray(x.notTested,M35_UNTESTED.length)||
    !M35_UNTESTED.every((v,i)=>x.notTested[i]===v)||
    !ownArray(x.nextActions,M35_ACTIONS.length)||
    !M35_ACTIONS.every((v,i)=>
      ownPlain(x.nextActions[i],['code','advice'])&&
      x.nextActions[i].code===v&&
      typeof x.nextActions[i].advice==='string')||
    ['externalTargetContacted','configuredProcessSpawned',
     'projectConnectionAuthorized','operatorVerified',
     'realProjectAssessed','actualAgentBehaviorObserved',
     'independentBetaVerified','securityCertified',
     'stableReleaseAuthorized'].some(k=>!is(x,k,false)))return false;
  return true;
}
const noArguments=args=>{
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==
      Array.prototype||args.length!==0)return false;
  const d=Object.getOwnPropertyDescriptors(args);
  return Reflect.ownKeys(d).length===1&&d.length?.value===0;
};
/**
 * Strict independent observer of the three locally computed source-owned
 * reports. Direct callers cannot insert approval claims or getters.
 */
export function summarizeOfflineAdopterSelfCheck(firstRun,stdio,http){
  try{
    if(!matchFirstRun(firstRun)||
       !matchM35(stdio,'stdio')||
       !matchM35(http,'streamable-http'))return M37_DENIED;
    const result=Object.freeze({
      reportSchemaVersion:1,profile:M37_PROFILE,
      status:'PASS',exitCode:0,ruleCode:'M37_FIXED_ONBOARDING_MATCH',
      scope:'FIRST_PARTY_FIXED_OFFLINE_ONLY',
      adapterSmoke:Object.freeze({checked:2,matched:2}),
      clientConfigExamples:Object.freeze({
        checked:2,matched:2,transports:Object.freeze([
          'stdio','streamable-http'
        ]),
        fiveFictionalControlsPerExample:true
      }),
      riskRating:'NOT_SCORED',
      realProjectAssessed:false,actualAgentBehaviorObserved:false,
      externalMcpContacted:false,userProcessExecuted:false,
      projectConnectionAuthorized:false,independentBetaVerified:false,
      independentAuditVerified:false,releaseApproved:false,
      npmPublished:false,securityCertified:false,
      nextActions:M37_NEXT
    });
    issuedM37.add(result);
    return result;
  }catch{return M37_DENIED;}
}
export function runOfflineAdopterSelfCheck(args=[]){
  if(!noArguments(args))return M37_DENIED;
  try{
    const m8=runOfflineFirstRun();
    const stdio=inspectOfflineOnboarding(M37_STDIO);
    const http=inspectOfflineOnboarding(M37_HTTP);
    return summarizeOfflineAdopterSelfCheck(m8,stdio,http);
  }catch{return M37_DENIED;}
}
const M37_VIEW=Object.freeze([
  'MCP AGENT SECURITY TEST SUITE — FIRST RUN (NO CONFIG REQUIRED)',
  '',
  'Bundled fictional adapter smoke: PASS (2/2)',
  'Offline client config examples: PASS (2/2)',
  '  Claude-style mcpServers / stdio: shape validated',
  '  VS Code-style servers / HTTPS: shape validated',
  '  Each example also reuses 5 FIXED FICTIONAL controls.',
  '',
  'NEXT STEPS',
  '  1. To inspect YOUR one-server config privately:',
  '     cat client-config.json | node tools/m35-offline-onboarding-report.mjs',
  '     PowerShell: Get-Content -Raw -Encoding utf8 .\\client-config.json | node tools/m35-offline-onboarding-report.mjs',
  '  2. For local npm candidate integrity (maintainers only):',
  '     node tools/reviewer-handoff.mjs doctor',
  '  3. For real target evaluation: get separate owner authorization.',
  '',
  'NOT TESTED: any real MCP server, real LLM, external effects,',
  '            credentials, ownership, independent audit or beta.',
  'RISK RATING: NOT_SCORED',
  'External MCP servers contacted: NO',
  'User process executed: NO',
  'Real project assessed: NO',
  'Independent beta: NOT VERIFIED',
  'Security certification: NOT GRANTED',
  'Stable release: NOT AUTHORIZED',
  ''
].join('\n'));
export function renderOfflineAdopterSelfCheckText(report){
  if(!issuedM37.has(report))throw new TypeError('M37_UNTRUSTED_SELF_CHECK_REPORT');
  return M37_VIEW;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length===3&&
     ['--self-check','--self-check-json'].includes(process.argv[2])){
    const report=runOfflineAdopterSelfCheck();
    if(report.status==='PASS'){
      process.stdout.write(process.argv[2]==='--self-check'?
        renderOfflineAdopterSelfCheckText(report):
        JSON.stringify(report,null,2)+'\n');
    }else{
      process.stdout.write(JSON.stringify(report,null,2)+'\n');
    }
    process.exitCode=report.exitCode;
  }else if(process.argv.length!==2){
    process.stderr.write('ERROR: FIRST_RUN_VIEW_ARGUMENTS_NOT_ALLOWED\n');
    process.exitCode=2;
  }else{
    try{
      process.stdout.write(renderOfflineFirstRunText(runOfflineFirstRun()));
    }catch{
      process.stderr.write('ERROR: FICTIONAL_FIRST_RUN_NOT_VERIFIED\n');
      process.exitCode=1;
    }
  }
}
