/**
 * M4-B3: mock-only admission boundary. No user profiles, untrusted JSON,
 * external target selection or authentic user authorization are accepted.
 *
 * A private suite-owned authority creates fictional in-process envelopes.
 * These envelopes grant NOTHING beyond two existing first-party fixed mocks.
 * Direct low-level driver APIs remain developer test utilities, not a
 * security sandbox or a runtime access-control system for real MCP servers.
 */
import { randomUUID,createHash,createPublicKey,verify as cryptoVerify } from 'node:crypto';
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

/** F2 source-only pre-contact check; syntax is never ownership or consent.
 * No DNS, socket, network, token, process or external target interaction. */
export function reviewF2StagingIntent(intent) {
  const verdict=rule=>Object.freeze({status:'FAIL',rule,
    connectionStatus:'NOT_ATTEMPTED',operatorVerified:false,
    ownershipVerified:false,executionEnabled:false,externalTargetContacted:false});
  try {
    if(!intent || Object.getPrototypeOf(intent)!==Object.prototype)
      return verdict('F2_INTENT_REJECTED');
    const props=Object.getOwnPropertyDescriptors(intent);
    if(Reflect.ownKeys(props).length!==3 ||
       !['endpoint','protocolVersion','method'].every(k=>Object.hasOwn(props,k)&&
         Object.hasOwn(props[k],'value')&&props[k].enumerable))
      return verdict('F2_INTENT_REJECTED');
    const endpoint=props.endpoint.value,protocolVersion=props.protocolVersion.value,
      method=props.method.value;
    if(protocolVersion!=='2026-07-28'||method!=='server/discover'||
       typeof endpoint!=='string'||endpoint.length>512||
       !/^https:\/\/[a-z0-9.-]+\/mcp$/.test(endpoint))
      return verdict('F2_INTENT_REJECTED');
    const target=new URL(endpoint),host=target.hostname;
    if(target.href!==endpoint||target.port||!host.includes('.')||
       host.split('.').some(x=>!x||x.startsWith('xn--')||
         !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||
       /^(?:\d+\.){3}\d+$/.test(host))
      return verdict('F2_INTENT_REJECTED');
    return verdict('F2_AUTHORITY_NOT_VERIFIED');
  } catch {return verdict('F2_INTENT_REJECTED');}
}

/** F2-A: fixed normative 2026-07-28 discovery wire fixture, SOURCE ONLY.
 * No endpoint, HTTP client, transport, authority, credential or network effect.
 * Matching this wire fixture NEVER approves a staging connection.
 * References: official 2026-07-28 server/discover and Streamable HTTP specs. */
const F2_DISCOVERY_BODY=JSON.stringify({
  jsonrpc:'2.0',id:'f2-discover-fixture-1',method:'server/discover',
  params:{_meta:{
    'io.modelcontextprotocol/protocolVersion':'2026-07-28',
    'io.modelcontextprotocol/clientInfo':{
      name:'mcp-agent-security-test-suite-fixture',version:'0.0.10-rc.1'
    },
    'io.modelcontextprotocol/clientCapabilities':{}
  }}
});
const F2_DISCOVERY_HEADERS=Object.freeze({
  'Content-Type':'application/json',
  Accept:'application/json, text/event-stream',
  'MCP-Protocol-Version':'2026-07-28',
  'Mcp-Method':'server/discover'
});

/** Construct ONLY an inert, fixed first-party request description.
 * The endpoint and any HTTP adapter deliberately do not exist here. */
export function buildF2OfflineDiscoveryFixture() {
  return Object.freeze({
    profile:'F2_SOURCE_DISCOVERY_2026_07_28',
    request:Object.freeze({
      httpMethod:'POST',
      headers:F2_DISCOVERY_HEADERS,
      body:F2_DISCOVERY_BODY
    }),
    requestSha256:createHash('sha256').update(F2_DISCOVERY_BODY,'utf8').digest('hex'),
    connectionStatus:'NOT_ATTEMPTED',executionEnabled:false,
    operatorVerified:false,ownershipVerified:false,externalTargetContacted:false
  });
}

/** Compare candidate wire bytes against the REVIEWED, exact source fixture.
 * This is not generic MCP conformance, host validation or consent review.
 * Capture descriptors once; never call untrusted property getters or echo inputs.
 * IMPORTANT: Proxy getPrototypeOf/ownKeys/getOwnPropertyDescriptor traps can run
 * arbitrary caller code during inspection. This validator is NOT an OS/process
 * sandbox; source data must be obtained from an isolated, trusted JSON parser,
 * not arbitrary executable JS objects, before any real security boundary. */
export function reviewF2OfflineDiscoveryFixture(candidate) {
  const verdict=matched=>Object.freeze({
    status:matched?'PASS':'FAIL',fixtureMatches:matched,
    rule:matched?'F2_SOURCE_WIRE_FIXTURE_MATCH':'F2_SOURCE_WIRE_FIXTURE_REJECTED',
    connectionStatus:'NOT_ATTEMPTED',executionEnabled:false,
    operatorVerified:false,ownershipVerified:false,externalTargetContacted:false
  });
  const own=(object,names)=>{
    if(!object||typeof object!=='object'||
       Object.getPrototypeOf(object)!==Object.prototype)return null;
    const descriptors=Object.getOwnPropertyDescriptors(object);
    if(Reflect.ownKeys(descriptors).length!==names.length||
       !names.every(name=>Object.hasOwn(descriptors,name)&&
         Object.hasOwn(descriptors[name],'value')&&
         descriptors[name].enumerable))return null;
    return Object.fromEntries(names.map(name=>[name,descriptors[name].value]));
  };
  try {
    const request=own(candidate,['httpMethod','headers','body']);
    const headers=request&&own(request.headers,
      ['Content-Type','Accept','MCP-Protocol-Version','Mcp-Method']);
    if(!request||!headers||request.httpMethod!=='POST'||
       typeof request.body!=='string'||
       Buffer.byteLength(request.body,'utf8')>4096||
       request.body!==F2_DISCOVERY_BODY)return verdict(false);
    return verdict(Object.keys(F2_DISCOVERY_HEADERS).every(
      name=>headers[name]===F2_DISCOVERY_HEADERS[name]));
  } catch {return verdict(false);}
}

/** F2-A: bounded, no-contact JSON discovery response evidence only.
 * This function accepts bytes already captured in a fictional fixture.
 * It cannot open a socket or authenticate any alleged server. The server's
 * instructions or self-reported identity are never elevated to authority.
 * SSE and real target evidence remain separate F2 requirements. */
export function inspectF2OfflineDiscoveryJsonResponse(contentType,body) {
  const verdict=(matched,rule)=>Object.freeze({
    status:matched?'PASS':'FAIL',schemaMatched:matched,rule,
    connectionStatus:'NOT_ATTEMPTED',executionEnabled:false,
    operatorVerified:false,ownershipVerified:false,externalTargetContacted:false
  });
  const reject=()=>verdict(false,'F2_SOURCE_DISCOVERY_RESPONSE_REJECTED');
  if(contentType!=='application/json'||typeof body!=='string'||
     !body.length||Buffer.byteLength(body,'utf8')>32768)return reject();
  try {
    const message=JSON.parse(body);
    const record=o=>o!==null&&typeof o==='object'&&
      !Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
    if(!record(message)||message.jsonrpc!=='2.0'||
       message.id!=='f2-discover-fixture-1'||Object.hasOwn(message,'error')||
       !record(message.result))return reject();
    const discovery=message.result,versions=discovery.supportedVersions;
    if(discovery.resultType!=='complete'||!record(discovery.capabilities)||
       !Array.isArray(versions)||versions.length===0||versions.length>8||
       versions.some(v=>typeof v!=='string'||
         !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v))||
       new Set(versions).size!==versions.length)return reject();
    if(!versions.includes('2026-07-28'))
      return verdict(false,'F2_SOURCE_DISCOVERY_VERSION_UNSUPPORTED');
    // Never copy untrusted result.instructions or _meta.serverInfo into
    // the output. Schema match is NOT operator proof or approval to connect.
    return verdict(true,'F2_SOURCE_DISCOVERY_RESPONSE_MATCH');
  } catch {return reject();}
}

/** F2 offline Ed25519 evidence verification only. An untrusted supplied key
 * is NOT an independently anchored issuer, target or operator identity.
 * Even a valid signature NEVER enables network traffic or consumes a grant. */
export function inspectF2SignedGrantEvidence(intent,evidence,nowMs=Date.now()) {
  const result=(rule,signatureVerified=false)=>Object.freeze({
    status:'FAIL',rule,signatureVerified,operatorVerified:false,
    ownershipVerified:false,executionEnabled:false,
    connectionStatus:'NOT_ATTEMPTED',externalTargetContacted:false
  });
  // Snapshot exact own data descriptors before any validation or signature
  // use. Never re-read attacker-controlled objects through getters/Proxy get.
  // This prevents check/use drift inside this offline inspector; a Proxy can
  // still lie about descriptors and no network authority is established.
  const snapshot=(o,names)=>{
    if(!o||typeof o!=='object'||Object.getPrototypeOf(o)!==Object.prototype)
      return null;
    const props=Object.getOwnPropertyDescriptors(o);
    if(Reflect.ownKeys(props).length!==names.length||
       !names.every(k=>Object.hasOwn(props,k)&&Object.hasOwn(props[k],'value')&&
         props[k].enumerable))return null;
    return Object.fromEntries(names.map(k=>[k,props[k].value]));
  };
  try {
    const pinnedIntent=snapshot(intent,['endpoint','protocolVersion','method']);
    if(!pinnedIntent||
       reviewF2StagingIntent(pinnedIntent).rule!=='F2_AUTHORITY_NOT_VERIFIED')
      return result('F2_INTENT_REJECTED');
    const captured=snapshot(evidence,['grant','signature','issuerPublicKeyPem']);
    const g=captured&&snapshot(captured.grant,
      ['schemaVersion','endpoint','protocolVersion','method','operatorId',
        'issuerId','intentSha256','nonce','issuedAt','expiresAt']);
    if(!captured||!g||!Number.isSafeInteger(nowMs)||nowMs<0)
      return result('F2_SIGNED_EVIDENCE_REJECTED');
    if(g.schemaVersion!==1||typeof g.operatorId!=='string'||
       !/^[a-zA-Z][\w.-]{0,63}$/.test(g.operatorId)||
       typeof g.issuerId!=='string'||
       !/^[a-zA-Z][\w.-]{0,63}$/.test(g.issuerId)||
       typeof g.nonce!=='string'||!/^[0-9a-f]{32}$/.test(g.nonce)||
       typeof g.intentSha256!=='string'||!/^[0-9a-f]{64}$/.test(g.intentSha256)||
       typeof captured.signature!=='string'||
       !/^[A-Za-z0-9_-]{86}$/.test(captured.signature)||
       typeof captured.issuerPublicKeyPem!=='string'||
       captured.issuerPublicKeyPem.length>256||
       !Number.isSafeInteger(g.issuedAt)||!Number.isSafeInteger(g.expiresAt)||
       g.issuedAt<0||g.expiresAt<=g.issuedAt||
       g.expiresAt-g.issuedAt>300_000)
      return result('F2_SIGNED_EVIDENCE_REJECTED');
    const digest=createHash('sha256').update(JSON.stringify([
      pinnedIntent.endpoint,pinnedIntent.protocolVersion,pinnedIntent.method
    ]),'utf8').digest('hex');
    if(g.endpoint!==pinnedIntent.endpoint||g.protocolVersion!==pinnedIntent.protocolVersion||
       g.method!==pinnedIntent.method||g.intentSha256!==digest)
      return result('F2_GRANT_SCOPE_MISMATCH');
    const signature=Buffer.from(captured.signature,'base64url');
    if(signature.length!==64||signature.toString('base64url')!==captured.signature)
      return result('F2_SIGNED_EVIDENCE_REJECTED');
    const key=createPublicKey(captured.issuerPublicKeyPem);
    if(key.asymmetricKeyType!=='ed25519')
      return result('F2_SIGNED_EVIDENCE_REJECTED');
    const message=Buffer.from('F2-SIGNED-INTENT-V1\n'+JSON.stringify([
      g.schemaVersion,g.endpoint,g.protocolVersion,g.method,g.operatorId,
      g.issuerId,g.intentSha256,g.nonce,g.issuedAt,g.expiresAt
    ]),'utf8');
    if(!cryptoVerify(null,message,key,signature))
      return result('F2_SIGNATURE_INVALID');
    if(g.issuedAt>nowMs||g.expiresAt<=nowMs)
      return result('F2_GRANT_EXPIRED_OR_NOT_YET_VALID',true);
    // External key input has no issuer trust anchor, verified target control,
    // authenticated operator, durable replay/revocation or egress proof.
    return result('F2_TRUST_ANCHOR_NOT_ESTABLISHED',true);
  } catch {return result('F2_SIGNED_EVIDENCE_REJECTED');}
}
