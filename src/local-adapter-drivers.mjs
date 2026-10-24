/**
 * M4-B1: transport-agnostic lifecycle for two FIXED first-party MCP-shaped
 * mocks only. No profile JSON, executable path, HTTP URL or plugin injection.
 *
 * 'connect' initializes local test state; 'probe' invokes existing reviewed
 * local mock harnesses with bounded resources and automatic cleanup.
 * Neither process isolation nor loopback means an OS security sandbox.
 */
import { runLocalStdioMock, runLocalStdioInitialization } from './stdio-mcp-harness.mjs';
import { runLoopbackHttpMock } from './loopback-http-mock.mjs';
import { runFirstPartyStagingSelftest } from './first-party-staging-mcp.mjs';
import { previewProjectOnboarding } from './project-adapter.mjs';
import { noteFirstPartyMockAttempt } from './mock-attempt-observer.mjs';

const TRANSPORTS = Object.freeze(['stdio','streamable-http']);
const STATUS = 'FIRST_PARTY_MOCK_ONLY';
const FAULTS = Object.freeze({
  stdio: Object.freeze(['none','wrong-id','invalid-json','oversized-output',
    'hang','changed-result','stderr-canary','env-probe']),
  'streamable-http': Object.freeze(['none','server-wrong-id','server-invalid-json',
    'server-oversized','server-redirect','server-hang','server-content-type',
    'server-canary','tool-call'])
});
const RULE = /^[A-Z][A-Z0-9_]{0,79}$/;
function reject() { throw new TypeError('INVALID_LOCAL_ADAPTER_DRIVER_OPTIONS'); }
function failState() { throw new Error('INVALID_LOCAL_ADAPTER_DRIVER_STATE'); }
function validate(transport, options) {
  if(!TRANSPORTS.includes(transport) || !options ||
     typeof options!=='object' || Array.isArray(options) ||
     Object.getPrototypeOf(options)!==Object.prototype ||
     Object.keys(options).some(key=>!['fault','deadlineMs','mode'].includes(key))) reject();
  const mode=options.mode??'legacy-batch';
  if(!['legacy-batch','initialize-only'].includes(mode) ||
     (mode==='initialize-only' && (transport!=='stdio' || options.fault!==undefined))) reject();
  const fault=options.fault??'none';
  const deadlineMs=options.deadlineMs??(transport==='stdio'?8000:5000);
  const max=transport==='stdio'?8000:5000;
  if(!FAULTS[transport].includes(fault) || !Number.isSafeInteger(deadlineMs) ||
     deadlineMs<250 || deadlineMs>max) reject();
  return {fault,deadlineMs,mode};
}
function report(transport, result, mode='legacy-batch') {
  const checked=transport==='stdio' && mode==='legacy-batch'?4:1;
  const success=result?.status==='PASS' &&
    result.checked===checked && result.failureCount===0 &&
    Array.isArray(result.findings) && result.findings.length===0 &&
    (transport==='stdio' ? result.received===(mode==='initialize-only'?1:4) :
      result.received===1 && result.accepted===1 && result.simulatedEffects===0);
  const rawRule=result?.findings?.[0]?.rule;
  const code=typeof rawRule==='string' && RULE.test(rawRule)
    ? rawRule : 'LOCAL_MOCK_CONTRACT_MISMATCH';
  return {
    status:success?'PASS':'FAIL',
    transport,
    connectionStatus:STATUS,
    executedFirstPartyMock:true,
    externalTargetContacted:false,
    checked,
    matched:success,
    rule:success?'NONE':code
  };
}

/** Only literal transport IDs + reviewed finite fault selectors, no user endpoints. */
export function createFirstPartyDriver(transport, options={}) {
  const {fault,deadlineMs,mode}=validate(transport,options);
  let state='new';
  return Object.freeze({
    async connect() {
      if(state!=='new') failState();
      state='connected';
      return {transport,connectionStatus:STATUS,externalTargetContacted:false};
    },
    async probe() {
      if(state!=='connected') failState();
      state='probed'; // single-shot; fail closed even on underlying rejection
      noteFirstPartyMockAttempt('driver-probe'); // test-only event at probe entry
      try {
        const native=transport==='stdio'
          ? (mode==='initialize-only'
            ? runLocalStdioInitialization({timeoutMs:deadlineMs})
            : runLocalStdioMock({fault,timeoutMs:deadlineMs}))
          : await runLoopbackHttpMock({fault,deadlineMs});
        return report(transport,native,mode);
      } catch {
        return report(transport,null,mode);
      }
    },
    async close() {
      if(state==='closed') return {closed:true};
      state='closed';
      return {closed:true};
    }
  });
}

/** Routes all first-party selftests through synthetic admission before any
 * built-in mock probe. Direct low-level driver remains a test utility only.
 */
export async function runFirstPartyAdapterSelftest() {
  const { runGatedFirstPartySelftest }=await import('./local-consent-gate.mjs');
  return runGatedFirstPartySelftest();
}


/**
 * M4-B7-A: a SEPARATE fixed modern transport adapter boundary. This is NOT
 * sourced from inspectProjectAdapter's user-controlled descriptor and cannot
 * be activated by changing a project policy. Only an internally owned
 * ephemeral 127.0.0.1 modern server/discover fixture runs here.
 */
const MODERN_FIXED_FAULTS=new Set(['allowed','sse','sse-comment-log',
  'wrong-origin','wrong-host','wrong-method','forbidden-tool','wrong-version',
  'response-redirect','response-oversized','response-hang',
  'response-sse-unsolicited','response-sse-stall-after-notice']);
const STAGING_STATUS='FIXED_FIRST_PARTY_STAGING_ONLY';
function checkModernOptions(options){
  if(!options || typeof options!=='object' || Array.isArray(options) ||
     Object.getPrototypeOf(options)!==Object.prototype ||
     Object.keys(options).some(k=>!['fault','deadlineMs'].includes(k))) {
    throw new TypeError('INVALID_FIXED_MODERN_ADAPTER_OPTIONS');
  }
  const fault=options.fault??'allowed',deadlineMs=options.deadlineMs??5000;
  if(!MODERN_FIXED_FAULTS.has(fault) || !Number.isSafeInteger(deadlineMs) ||
     deadlineMs<250 || deadlineMs>5000)
    throw new TypeError('INVALID_FIXED_MODERN_ADAPTER_OPTIONS');
  return {fault,deadlineMs};
}
function modernAdapterReport(native){
  // Native bytes/IDs/ports never cross this reporting boundary. Close must
  // be observed even when an intentional negative transport fault occurs.
  const witnessed=!!native && native.checked===1 && native.received===1 &&
    native.socketClosedCount===1 && native.externalTargetContacted===false &&
    Number.isSafeInteger(native.accepted) && native.accepted>=0 &&
    native.accepted<=1;
  const passed=witnessed && native.status==='PASS' &&
    native.accepted===1 && native.failureCount===0 &&
    Array.isArray(native.findings) && native.findings.length===0;
  const raw=Array.isArray(native?.findings)?native.findings[0]?.rule:null;
  const code=!witnessed?'FIXED_STAGING_RESOURCE_UNCONFIRMED':
    typeof raw==='string' && RULE.test(raw)?raw:
      'FIXED_STAGING_ADAPTER_MISMATCH';
  return {
    status:passed?'PASS':'FAIL',
    profile:'fixed-modern-first-party-adapter-bridge-v1',
    transport:'streamable-http',
    protocolVersion:'2026-07-28',
    allowedMethod:'server/discover',
    connectionStatus:STAGING_STATUS,
    adapterDescriptorUsed:false,projectConnectionAuthorized:false,
    executedFirstPartyMock:true,externalTargetContacted:false,
    operatorVerified:false,osSandboxed:false,
    checked:1,matched:passed,socketCleanupConfirmed:witnessed,
    failureCount:passed?0:1,findingsTruncated:false,
    findings:passed?[]:[{step:1,rule:code}]
  };
}
/** One fixed connect / probe / close lifecycle; no descriptor, endpoint,
 * stdio command, credential, dynamic transport or external target can enter.
 * Fault selectors are for trusted direct in-repository tests, not the CLI.
 */
export function createFixedModernStagingAdapter(options={}){
  const checked=checkModernOptions(options);
  let state='new';
  return Object.freeze({
    async connect(){
      if(state!=='new')failState();
      state='connected'; // state only; does NOT initiate any network I/O
      return {transport:'streamable-http',connectionStatus:STAGING_STATUS,
        externalTargetContacted:false};
    },
    async probe(){
      if(state!=='connected')failState();
      state='probed';
      noteFirstPartyMockAttempt('driver-probe');
      try{
        const result=await runFirstPartyStagingSelftest(checked);
        return modernAdapterReport(result);
      }catch{return modernAdapterReport(null);}
    },
    async close(){
      state='closed';
      return {closed:true};
    }
  });
}
/** Public no-argument CLI test delegates only to fixed owned staging. */
export async function runFixedModernStagingAdapterSelftest(){
  const driver=createFixedModernStagingAdapter();
  try{
    await driver.connect();
    return await driver.probe();
  }finally{await driver.close();}
}


// M4-B7-B: independent, internal fictional profile. This is never constructed
// from user files, CLI flags, user endpoints, credentials or policy assertions.
const FIXED_ONBOARDING_DESCRIPTOR=Object.freeze({
  adapterSchemaVersion:1,
  project:{name:'fictional-onboarding'},
  transport:{type:'streamable-http',endpoint:'https://mcp.example.org/mcp'},
  protocolVersion:'2026-07-28',
  policy:{mode:'validate-only',allowNetwork:false,allowProcessSpawn:false,
    allowToolCalls:false,allowCredentials:false}
});
/** No-argument, fixed first-party demo only. Does NOT connect the fictional
 * descriptor (whose URL is never resolved). Separate evidence channels ensure
 * a staging PASS is NEVER interpreted as customer ownership or authority.
 */
export async function runFixedOnboardingDemo(...args){
  if(args.length)throw new TypeError('INVALID_FIXED_ONBOARDING_DEMO_OPTIONS');
  const inspected=previewProjectOnboarding(FIXED_ONBOARDING_DESCRIPTOR);
  const staged=await runFixedModernStagingAdapterSelftest();
  const ok=staged.status==='PASS' &&
    staged.socketCleanupConfirmed===true &&
    staged.externalTargetContacted===false &&
    staged.adapterDescriptorUsed===false &&
    staged.projectConnectionAuthorized===false;
  return {
    status:ok?'PASS':'FAIL',
    profile:'fictional-first-party-onboarding-demo-v1',
    readinessSchemaVersion:1,
    descriptorEvidence:inspected.descriptorEvidence,
    stagingEvidence:ok?'FIRST_PARTY_STAGING_PASS':'FIRST_PARTY_STAGING_FAIL',
    targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
    operatorEvidence:'OPERATOR_NOT_VERIFIED',
    consentEvidence:'SELF_ASSERTED_CONSENT_NOT_EVALUATED',
    readinessStatus:'REAL_TARGET_NOT_AUTHORIZED',
    connectionStatus:'FIXED_FIRST_PARTY_STAGING_ONLY',
    projectConnectionAuthorized:false,
    executionEnabled:false,
    externalTargetContacted:false,
    operatorVerified:false,
    adapterDescriptorUsed:false,
    stagedFixtureOnly:true,
    socketCleanupConfirmed:staged.socketCleanupConfirmed===true,
    checks:2,
    failureCount:ok?0:1,
    findingsTruncated:false,
    findings:ok?[]:[{step:2,rule:'FIRST_PARTY_STAGING_DEMO_FAILED'}],
    nextActions:[
      {step:1,code:'VALIDATE_OWN_PROJECT_OFFLINE',command:'node src/cli.mjs adapter-onboard examples/adapter-profiles/streamable-http-project.json'},
      {step:2,code:'REAL_TARGET_REQUIRES_SEPARATE_AUTHORIZATION',command:null}
    ]
  };
}
