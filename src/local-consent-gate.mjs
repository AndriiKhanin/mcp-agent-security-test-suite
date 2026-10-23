/**
 * M4-B3: mock-only admission boundary. No user profiles, untrusted JSON,
 * external target selection or authentic user authorization are accepted.
 *
 * A private suite-owned authority creates fictional in-process envelopes.
 * These envelopes grant NOTHING beyond two existing first-party fixed mocks.
 * Direct low-level driver APIs remain developer test utilities, not a
 * security sandbox or a runtime access-control system for real MCP servers.
 */
import { randomUUID } from 'node:crypto';
import { descriptorFingerprint, evaluateAdapterConsent } from './adapter-consent.mjs';
import { createFirstPartyDriver } from './local-adapter-drivers.mjs';

const PROFILE='fixed-first-party-admission-v1';
const OWNER='suite-fixed-mock';
const BASE_POLICY=Object.freeze({
  mode:'validate-only',
  allowNetwork:false,
  allowProcessSpawn:false,
  allowToolCalls:false,
  allowCredentials:false
});
const CONFIG=Object.freeze({
  stdio:Object.freeze({method:'initialize',project:'suite-stdio-mock',
    transport:Object.freeze({type:'stdio',command:'node',args:Object.freeze(['stdio-mcp-mock-worker.mjs'])})}),
  'streamable-http':Object.freeze({method:'ping',project:'suite-http-mock',
    transport:Object.freeze({type:'streamable-http',endpoint:'https://mcp.example.org/mcp'})})
});
const CASES=Object.freeze(['allowed','revoked','expired','wrong-project',
  'wrong-operator','wrong-method','changed-descriptor','replay','forbidden-method']);
const FAIL=()=>{throw new TypeError('INVALID_FIXED_MOCK_ADMISSION_OPTIONS');};
function descriptorFor(type) {
  const c=CONFIG[type]; if(!c)FAIL();
  return {adapterSchemaVersion:1,project:{name:c.project},
    transport:c.transport.type==='stdio'
      ? {type:'stdio',command:c.transport.command,args:[...c.transport.args]}
      : {type:'streamable-http',endpoint:c.transport.endpoint},
    protocolVersion:'2026-07-28',policy:{...BASE_POLICY}};
}
function issued(type,nowMs) {
  const c=CONFIG[type];
  const descriptor=descriptorFor(type);
  return {
    policySchemaVersion:1,descriptor,
    request:{project:c.project,transport:type,method:c.method,operatorId:OWNER},
    claim:{operatorId:OWNER,projectFingerprint:descriptorFingerprint(descriptor),
      transport:type,methods:[c.method],issuedAt:nowMs-1000,
      expiresAt:nowMs+30_000,nonce:'mock-'+randomUUID(),revoked:false}
  };
}
function validateOptions(type,options) {
  if(!Object.hasOwn(CONFIG,type) || !options ||
     typeof options!=='object' || Array.isArray(options) ||
     Object.getPrototypeOf(options)!==Object.prototype ||
     Object.keys(options).some(k=>!['caseName','seenNonces','nowMs'].includes(k)))FAIL();
  const scenario=options.caseName??'allowed';
  const now=options.nowMs??Date.now();
  const seen=options.seenNonces??new Set();
  if(!CASES.includes(scenario) || !Number.isSafeInteger(now) ||
     now<2000 || !(seen instanceof Set))FAIL();
  return {scenario,now,seen};
}
function rejected(type,rule) {
  return {status:'FAIL',transport:type,connectionStatus:'NOT_ATTEMPTED',
    executedFirstPartyMock:false,externalTargetContacted:false,
    checked:0,matched:false,rule,
    gateStatus:'DENIED',driverCreated:false,mockProbeAttempted:false};
}

/** Mock-only policy check before creating any fixed driver or local effect.
 * A successful self-assertion never establishes user ownership.
 */
export async function runGatedFixedMockCase(type,options={}) {
  const {scenario,now,seen}=validateOptions(type,options);
  const envelope=issued(type,now);
  switch(scenario) {
    case 'revoked': envelope.claim.revoked=true;break;
    case 'expired': envelope.claim.expiresAt=now-1;break;
    case 'wrong-project': envelope.request.project='other-project';break;
    case 'wrong-operator': envelope.claim.operatorId='unknown-operator';break;
    case 'wrong-method': envelope.request.method=type==='stdio'?'ping':'initialize';break;
    case 'changed-descriptor':
      if(type==='stdio') envelope.descriptor.transport.args=['other-worker.mjs'];
      else envelope.descriptor.transport.endpoint='https://other.example.org/mcp';
      break;
    case 'forbidden-method': envelope.request.method='tools/call';break;
    case 'replay':seen.add(envelope.claim.nonce);break;
  }
  let evaluation;
  try {
    evaluation=evaluateAdapterConsent(envelope,{nowMs:now,seenNonces:seen});
  } catch {
    return rejected(type,'ADAPTER_POLICY_INPUT_REJECTED');
  }
  // Enforce first-party identity separately from self-asserted envelope.
  // A valid fingerprint is only a consistency check, never authorization.
  const fixed=CONFIG[type];
  const mockIdentity=envelope.descriptor.project.name===fixed.project &&
    envelope.request.operatorId===OWNER &&
    envelope.request.transport===type &&
    envelope.claim.operatorId===OWNER &&
    envelope.request.method===fixed.method &&
    descriptorFingerprint(envelope.descriptor)===descriptorFingerprint(descriptorFor(type));
  const rule=evaluation.status!=='PASS'?evaluation.reviewRule:
    !mockIdentity?'ADAPTER_FIXED_MOCK_IDENTITY_DENIED':'NONE';
  if(rule!=='NONE') return rejected(type,rule);
  // Fixed-only factory. Never pass the descriptor, claimed executable or URL.
  const driver=createFirstPartyDriver(type,type==='stdio'?{mode:'initialize-only'}:{});
  try {
    await driver.connect();
    const result=await driver.probe();
    return {...result,gateStatus:'MOCK_ADMITTED',
      driverCreated:true,mockProbeAttempted:true};
  } catch {
    return {status:'FAIL',transport:type,connectionStatus:'FIRST_PARTY_MOCK_ONLY',
      executedFirstPartyMock:true,externalTargetContacted:false,
      checked:0,matched:false,rule:'FIXED_MOCK_EXECUTION_FAILED',
      gateStatus:'MOCK_ADMITTED',driverCreated:true,mockProbeAttempted:true};
  } finally {
    await driver.close();
  }
}

/** Preserves M4-B1 two-outcome report shape while actually guarding probes. */
export async function runGatedFirstPartySelftest() {
  const outcomes=[];
  for(const type of ['stdio','streamable-http'])
    outcomes.push(await runGatedFixedMockCase(type));
  const bad=outcomes.filter(o=>!o.matched);
  return {
    status:bad.length?'FAIL':'PASS',
    profile:'universal-fixed-local-mock-drivers-v1',
    consentProfile:PROFILE,
    authorizationStatus:'FIRST_PARTY_SYNTHETIC_ONLY',
    operatorVerified:false,
    connectionStatus:'FIRST_PARTY_MOCK_ONLY',
    externalTargetContacted:false,transportCount:2,
    passed:outcomes.length-bad.length,failed:bad.length,
    failureCount:bad.length,findingsTruncated:false,
    findings:bad.map((o,i)=>({step:i+1,rule:o.rule})),outcomes
  };
}
