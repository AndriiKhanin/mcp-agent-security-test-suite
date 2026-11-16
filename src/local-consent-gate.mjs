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
import { parseStrictJson } from './strict-json.mjs';
import { lstatSync,realpathSync,writeFileSync } from 'node:fs';
import { basename,dirname,join,resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import { isIP } from 'node:net';
import https from 'node:https';
import { once } from 'node:events';

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
    const message=parseStrictJson(body);
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

/** F2-A: bounded offline SSE response stream verdict, not a transport.
 * It consumes only already-captured text. Unknown stream messages, replay
 * markers, standalone RPC requests, and events after the final response are
 * rejected. Parsing does not invoke tools, network or untrusted instructions.
 * Only the pinned fixture profile is accepted, not arbitrary SSE traffic. */
export function inspectF2OfflineDiscoverySseResponse(contentType,body) {
  const verdict=(matched,events=0,notifications=0)=>Object.freeze({
    status:matched?'PASS':'FAIL',schemaMatched:matched,
    rule:matched?'F2_SOURCE_DISCOVERY_SSE_RESPONSE_MATCH':
      'F2_SOURCE_DISCOVERY_SSE_RESPONSE_REJECTED',
    eventsObserved:events,notificationsObserved:notifications,
    connectionStatus:'NOT_ATTEMPTED',executionEnabled:false,
    operatorVerified:false,ownershipVerified:false,externalTargetContacted:false
  });
  const reject=()=>verdict(false);
  if(contentType!=='text/event-stream'||typeof body!=='string'||
     !body.length||Buffer.byteLength(body,'utf8')>32768||
     body.includes('\0'))return reject();
  try {
    const normalized=body.replace(/\r\n?/g,'\n');
    // A final SSE message is dispatched only at a blank line boundary.
    if(!normalized.endsWith('\n\n'))return reject();
    const lines=normalized.split('\n'),record=o=>
      o!==null&&typeof o==='object'&&!Array.isArray(o)&&
      Object.getPrototypeOf(o)===Object.prototype;
    let events=0,notifications=0,finalSeen=false,eventName='',data=[];
    for(const line of lines){
      if(line===''){
        if(data.length){
          if(finalSeen||++events>8)return reject();
          const payload=data.join('\n');
          if(Buffer.byteLength(payload,'utf8')>8192)return reject();
          const msg=parseStrictJson(payload);
          if(!record(msg)||msg.jsonrpc!=='2.0')return reject();
          if(Object.hasOwn(msg,'method')){
            if(Object.hasOwn(msg,'id')||Object.hasOwn(msg,'result')||
               Object.hasOwn(msg,'error')||!record(msg.params)||
               !['notifications/progress','notifications/message']
                 .includes(msg.method))return reject();
            notifications++;
          }else{
            if(!inspectF2OfflineDiscoveryJsonResponse(
              'application/json',payload).schemaMatched)return reject();
            finalSeen=true;
          }
          data=[];eventName='';
        }else if(eventName!=='')return reject();
        continue;
      }
      // Comments and request-scoped keep-alives never become instructions.
      if(line.startsWith(':'))continue;
      const colon=line.indexOf(':'),field=colon<0?line:line.slice(0,colon);
      let value=colon<0?'':line.slice(colon+1);
      if(value.startsWith(' '))value=value.slice(1);
      if(field==='data'){
        if(data.length>=64)return reject();
        data.push(value);
      }else if(field==='event'){
        if(value!=='message'||eventName!=='')return reject();
        eventName=value;
      }else{
        // id / retry / unknown fields are out of scope and fail closed,
        // rather than accidentally creating session or replay semantics.
        return reject();
      }
    }
    if(!finalSeen||data.length||eventName!=='')return reject();
    return verdict(true,events,notifications);
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

/** F2-B OFFLINE ONLY: no issuer/owner trust, network, or durable replay store.
 * This observes fictional grant claims in one JS process, NOT permission.
 * A reset/crash discards the journal; clock is a caller-supplied test clock.
 * No function returns actual authorization or a network execution token. */
export function createF2OfflineNonceJournal() {
  const seen=new Set(),revoked=new Set();
  const nonceOk=n=>typeof n==='string'&&/^[0-9a-f]{32}$/.test(n);
  const result=rule=>Object.freeze({
    status:'FAIL',rule,authorizationStatus:'NOT_ESTABLISHED',
    replayState:'IN_MEMORY_SOURCE_ONLY',signatureVerified:false,
    operatorVerified:false,ownershipVerified:false,
    connectionStatus:'NOT_ATTEMPTED',executionEnabled:false,
    externalTargetContacted:false
  });
  const used=()=>seen.size+[...revoked].filter(n=>!seen.has(n)).length;
  function observeGrantJson(body,nowMs) {
    if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>4096||
       !Number.isSafeInteger(nowMs)||nowMs<0)
      return result('F2_SOURCE_GRANT_REJECTED');
    try {
      // Strict JSON prevents duplicate keys and executable Proxy/getter input.
      const g=parseStrictJson(body);
      const keys=['schemaVersion','endpoint','protocolVersion','method',
        'operatorId','issuerId','intentSha256','nonce','issuedAt','expiresAt'];
      if(!g||typeof g!=='object'||Array.isArray(g)||
         Object.getPrototypeOf(g)!==Object.prototype||
         Reflect.ownKeys(g).length!==keys.length||
         !keys.every(k=>Object.hasOwn(g,k)))
        return result('F2_SOURCE_GRANT_REJECTED');
      if(g.schemaVersion!==1||!nonceOk(g.nonce)||
         typeof g.operatorId!=='string'||
         !/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(g.operatorId)||
         typeof g.issuerId!=='string'||
         !/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(g.issuerId)||
         typeof g.intentSha256!=='string'||!/^[0-9a-f]{64}$/.test(g.intentSha256)||
         !Number.isSafeInteger(g.issuedAt)||!Number.isSafeInteger(g.expiresAt)||
         g.issuedAt<0||g.expiresAt<=g.issuedAt||
         g.expiresAt-g.issuedAt>300000)
        return result('F2_SOURCE_GRANT_REJECTED');
      const scope={endpoint:g.endpoint,protocolVersion:g.protocolVersion,
        method:g.method};
      if(reviewF2StagingIntent(scope).rule!=='F2_AUTHORITY_NOT_VERIFIED')
        return result('F2_SOURCE_SCOPE_REJECTED');
      const digest=createHash('sha256').update(JSON.stringify([
        scope.endpoint,scope.protocolVersion,scope.method
      ]),'utf8').digest('hex');
      if(g.intentSha256!==digest)return result('F2_SOURCE_SCOPE_REJECTED');
      if(g.issuedAt>nowMs||g.expiresAt<=nowMs)
        return result('F2_SOURCE_GRANT_OUTSIDE_WINDOW');
      // Deliberately NOT a trusted signature or operator verification.
      if(revoked.has(g.nonce))return result('F2_SOURCE_NONCE_REVOKED');
      if(seen.has(g.nonce))return result('F2_SOURCE_NONCE_REPLAY');
      if(used()>=64)return result('F2_SOURCE_LEDGER_CAPACITY_STOP');
      seen.add(g.nonce);
      return result('F2_SOURCE_NONCE_OBSERVED_NO_AUTHORITY');
    } catch {return result('F2_SOURCE_GRANT_REJECTED');}
  }
  function revokeFixtureNonce(nonce) {
    if(!nonceOk(nonce))return result('F2_SOURCE_NONCE_REJECTED');
    if(!revoked.has(nonce)&&!seen.has(nonce)&&used()>=64)
      return result('F2_SOURCE_LEDGER_CAPACITY_STOP');
    revoked.add(nonce);
    return result('F2_SOURCE_NONCE_REVOKED');
  }
  const counters=()=>Object.freeze({seen:seen.size,revoked:revoked.size,
    durable:false,authorityEstablished:false,networkEnabled:false});
  return Object.freeze({observeGrantJson,revokeFixtureNonce,counters});
}


/** F2-B test-only OS marker witness; NOT a trusted admission/consent store.
 * The caller must supply an existing, disposable, private source-owned folder.
 * Atomic local filesystem 'wx' gives a one-winner observation marker, but
 * there is NO directory fsync, trusted ACL, tamper/path-swap protection,
 * authenticated revoker, or power-loss durability proof.
 * Never use this helper as permission for any network or tool effect. */
export function createF2OfflineDiskNonceWitness(directory) {
  const path=typeof directory==='string'&&directory.length<1024?
    resolvePath(directory):null;
  const result=rule=>Object.freeze({
    status:'FAIL',rule,authorizationStatus:'NOT_ESTABLISHED',
    replayState:'DISPOSABLE_OS_MARKER_SOURCE_ONLY',
    operatorVerified:false,ownershipVerified:false,
    connectionStatus:'NOT_ATTEMPTED',executionEnabled:false,
    externalTargetContacted:false,powerLossDurabilityProven:false
  });
  const isSafeRoot=()=>{
    if(!path||!basename(path).startsWith('mcp-f2b-owned-'))return false;
    const st=lstatSync(path);
    if(!st.isDirectory()||st.isSymbolicLink())return false;
    // Source-only scratch scope: the canonical directory must be a DIRECT
    // child of canonical os.tmpdir(), not an arbitrary similarly named path.
    // This does not attest the OS temp directory's ownership or integrity.
    if(dirname(realpathSync(path))!==realpathSync(tmpdir()))return false;
    // On POSIX require own private 0700 directory. Windows ACL assurance
    // is NOT provided; this remains a fictional-only laboratory helper.
    if(process.platform!=='win32'&&
       ((st.mode&0o077)!==0||st.uid!==process.getuid()))return false;
    return true;
  };
  const mark=(nonce,kind)=>{
    if(typeof nonce!=='string'||!/^[0-9a-f]{32}$/.test(nonce))
      return result('F2_SOURCE_NONCE_REJECTED');
    try {
      if(!isSafeRoot())return result('F2_SOURCE_DISK_ROOT_REJECTED');
      const digest=createHash('sha256').update(nonce,'utf8').digest('hex');
      // Neither nonce nor grant fields appear in filenames or verdicts.
      writeFileSync(join(path,'nonce-'+digest+'.mark'),
        kind==='REVOKED'?'FICTIONAL-REVOKED-V1\n':'FICTIONAL-SPENT-V1\n',
        {encoding:'utf8',flag:'wx',mode:0o600});
      return result('F2_SOURCE_OS_NONCE_MARKED_NO_AUTHORITY');
    }catch(error){
      if(error?.code==='EEXIST')
        return result('F2_SOURCE_OS_NONCE_ALREADY_MARKED');
      return result('F2_SOURCE_DISK_WITNESS_UNAVAILABLE');
    }
  };
  return Object.freeze({
    markObservedFixtureNonce:nonce=>mark(nonce,'SPENT'),
    markRevokedFixtureNonce:nonce=>mark(nonce,'REVOKED')
  });
}


/** F2-C: NO-CONTACT inspection of a fictional DNS/peer snapshot.
 * The record is UNTRUSTED source-only JSON. These are NOT actual DNS/socket
 * observations or trusted target/issuer/operator authority. No DNS, TLS,
 * HTTP, socket, proxy or other network operation exists in this helper.
 * A future transport must independently enforce peer-IP pinning, SNI,
 * certificate checks and no proxy/redirect at connection time. */
export function inspectF2OfflineResolvedRoute(body) {
  const verdict=(rule,routeShapeMatched=false)=>Object.freeze({
    status:'FAIL',rule,routeShapeMatched,
    operatorVerified:false,ownershipVerified:false,
    connectionStatus:'NOT_ATTEMPTED',executionEnabled:false,
    externalTargetContacted:false
  });
  const reject=()=>verdict('F2_SOURCE_ROUTE_REJECTED');
  if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>4096||
     body.length===0)return reject();
  const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
    Object.getPrototypeOf(o)===Object.prototype&&
    Reflect.ownKeys(o).length===keys.length&&
    keys.every(k=>Object.hasOwn(o,k));
  const isPublicV4=address=>{
    if(typeof address!=='string'||isIP(address)!==4)return false;
    const [a,b,c]=address.split('.').map(Number);
    // Conservative fail-closed policy. IPv6, including v4-mapped v6, is
    // unsupported in this v1 profile. No claim of exhaustive IANA coverage.
    return !(
      a===0||a===10||a===127||a>=224||
      (a===100&&b>=64&&b<=127)||
      (a===169&&b===254)||
      (a===172&&b>=16&&b<=31)||
      (a===192&&(b===0||b===168||(b===88&&c===99)))||
      (a===198&&(b===18||b===19||(b===51&&c===100)))||
      (a===203&&b===0&&c===113)
    );
  };
  try {
    const route=parseStrictJson(body);
    const keys=['schemaVersion','endpoint','protocolVersion','method',
      'dnsAnswersBefore','dnsAnswersAtConnect','selectedAddress',
      'peerAddress','redirectCount','proxyConfigured'];
    if(!exact(route,keys)||route.schemaVersion!==1||
       route.redirectCount!==0||route.proxyConfigured!==false)
      return reject();
    const scope={endpoint:route.endpoint,
      protocolVersion:route.protocolVersion,method:route.method};
    if(reviewF2StagingIntent(scope).rule!=='F2_AUTHORITY_NOT_VERIFIED')
      return reject();
    const before=route.dnsAnswersBefore,after=route.dnsAnswersAtConnect;
    if(!Array.isArray(before)||!Array.isArray(after)||
       before.length===0||before.length>8||
       before.length!==after.length||isIP(route.selectedAddress)!==4||
       isIP(route.peerAddress)!==4||
       !before.every(isPublicV4)||!after.every(isPublicV4)||
       new Set(before).size!==before.length||
       new Set(after).size!==after.length)
      return reject();
    const sortedBefore=[...before].sort(),sortedAfter=[...after].sort();
    if(sortedBefore.some((ip,i)=>ip!==sortedAfter[i])||
       !before.includes(route.selectedAddress)||
       route.peerAddress!==route.selectedAddress)
      return verdict('F2_SOURCE_ROUTE_MISMATCH');
    // Matching caller-supplied strings are NOT actual resolution or peer
    // evidence. Intent is still untrusted and no authority was established.
    return verdict('F2_SOURCE_ROUTE_SHAPE_MATCH_NO_AUTHORITY',true);
  } catch {return reject();}
}


/** F2-D: no-contact validation of a fictional HTTP discovery exchange.
 * Captures are untrusted data, never observed DNS/TLS/peer identity or
 * real HTTP. No socket, request, credential or execution permission.
 * Actual transport must enforce byte/time/peer caps at I/O time. */
export function inspectF2OfflineHttpDiscoveryExchange(raw) {
  const verdict=(rule,matched=false)=>Object.freeze({
    status:'FAIL',rule,httpShapeMatched:matched,
    operatorVerified:false,ownershipVerified:false,tlsPeerVerified:false,
    connectionStatus:'NOT_ATTEMPTED',executionEnabled:false,
    externalTargetContacted:false
  });
  const reject=()=>verdict('F2_SOURCE_HTTP_ENVELOPE_REJECTED');
  const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
    Object.getPrototypeOf(o)===Object.prototype&&
    Reflect.ownKeys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
  if(typeof raw!=='string'||!raw.length||
     Buffer.byteLength(raw,'utf8')>65536)return reject();
  try {
    const x=parseStrictJson(raw);
    if(!exact(x,['schemaVersion','request','statusCode','headers',
       'body','elapsedMs','redirectsFollowed'])||x.schemaVersion!==1||
       !Number.isSafeInteger(x.elapsedMs)||x.elapsedMs<0||x.elapsedMs>5000||
       x.redirectsFollowed!==0||
       !reviewF2OfflineDiscoveryFixture(x.request).fixtureMatches||
       typeof x.body!=='string'||Buffer.byteLength(x.body,'utf8')>32768||
       !Array.isArray(x.headers)||x.headers.length<1||x.headers.length>16)
      return reject();
    const names=new Set(),headers=Object.create(null);
    const allowed=new Set(['content-type','content-length',
      'cache-control','mcp-protocol-version','date']);
    for(const pair of x.headers){
      if(!Array.isArray(pair)||pair.length!==2||
         typeof pair[0]!=='string'||typeof pair[1]!=='string'||
         !/^[a-z][a-z0-9-]{0,63}$/.test(pair[0])||
         pair[1].length>256||/[\r\n\0]/.test(pair[1])||
         !allowed.has(pair[0])||names.has(pair[0]))return reject();
      names.add(pair[0]);headers[pair[0]]=pair[1];
    }
    if(!names.has('content-type'))return reject();
    if(names.has('content-length')&&
       (!/^(?:0|[1-9][0-9]{0,4})$/.test(headers['content-length'])||
        Number(headers['content-length'])!==Buffer.byteLength(x.body,'utf8')))
      return reject();
    if(x.statusCode===401||x.statusCode===403)
      return verdict('F2_SOURCE_HTTP_AUTH_STATUS_TERMINAL');
    if(Number.isSafeInteger(x.statusCode)&&x.statusCode>=300&&
       x.statusCode<400)return verdict('F2_SOURCE_HTTP_REDIRECT_REJECTED');
    if(x.statusCode!==200)return reject();
    if(names.has('mcp-protocol-version')&&
       headers['mcp-protocol-version']!=='2026-07-28')return reject();
    const mime=headers['content-type'];
    if(mime!=='application/json'&&mime!=='text/event-stream')return reject();
    const check=mime==='application/json'?
      inspectF2OfflineDiscoveryJsonResponse(mime,x.body):
      inspectF2OfflineDiscoverySseResponse(mime,x.body);
    if(!check.schemaMatched)return reject();
    // Even matching response structures confer zero privileges.
    return verdict('F2_SOURCE_HTTP_SHAPE_MATCH_NO_AUTHORITY',true);
  } catch {return reject();}
}


/** F2-E: REAL TLS on one source-owned disposable 127.0.0.1 HTTPS server.
 * This is a first-party laboratory selftest ONLY, NOT remote staging.
 * The certificate/key are test fixtures, never production trust anchors.
 * Endpoint, peer IP, hostname, method and request bytes are source fixed;
 * callers cannot select or contact an external service. A matching lab
 * exchange cannot grant an F2 user/operator/target permission. */
export async function runF2OwnedHttpsLabSelftest(options) {
  const report=(rule,matched=false,received=0,tlsLabVerified=false)=>
    Object.freeze({
      status:matched?'PASS':'FAIL',rule,
      profile:'F2_OWNED_LOOPBACK_TLS_FIXTURE_ONLY',
      ownedLabExchangeMatched:matched,ownedLabTlsVerified:tlsLabVerified,
      requestsReceived:received,operatorVerified:false,ownershipVerified:false,
      remoteStagingAuthorized:false,externalTargetContacted:false,
      realUserServerTested:false
    });
  const allowed=['allowed','sse','redirect','oversized','stall',
    'wrong-version','wrong-content-type','invalid-json','bad-utf8','untrusted-ca'];
  if(!options||Object.getPrototypeOf(options)!==Object.prototype||
     Reflect.ownKeys(options).some(k=>!['cert','key','fault','deadlineMs'].includes(k)))
    return report('F2_LAB_OPTIONS_REJECTED');
  // This is a LOCAL test API. It is NOT safe for executable untrusted
  // Proxy objects; never expose it as an admission boundary.
  const {cert,key,fault='allowed',deadlineMs=1500}=options;
  if(typeof cert!=='string'||typeof key!=='string'||
     !cert.startsWith('-----BEGIN CERTIFICATE-----')||
     !key.startsWith(['-----BEGIN','PRIVATE','KEY-----'].join(' '))||
     cert.length>4096||key.length>8192||
     !allowed.includes(fault)||!Number.isSafeInteger(deadlineMs)||
     deadlineMs<100||deadlineMs>4000)
    return report('F2_LAB_OPTIONS_REJECTED');
  const fixture=buildF2OfflineDiscoveryFixture();
  if(!reviewF2OfflineDiscoveryFixture(fixture.request).fixtureMatches||
     Buffer.byteLength(fixture.request.body,'utf8')>4096)
    return report('F2_LAB_FIXED_WIRE_REJECTED');
  const answer=JSON.stringify({jsonrpc:'2.0',id:'f2-discover-fixture-1',
    result:{resultType:'complete',supportedVersions:['2026-07-28'],
      capabilities:{tools:{}}}});
  let server,deadline,received=0;
  try {
    server=https.createServer({key,cert,minVersion:'TLSv1.2'},(req,res)=>{
      received++;
      if(received!==1||req.socket.remoteAddress!=='127.0.0.1'||
         req.method!=='POST'||req.url!=='/mcp'||
         req.headers.host!=='staging.example.org'||
         req.headers['mcp-method']!=='server/discover'||
         req.headers['mcp-protocol-version']!=='2026-07-28'||
         req.headers.authorization||req.headers.cookie) {
        res.writeHead(400,{'Connection':'close'});res.end();return;
      }
      let requestBytes=0,body='';
      req.on('data',chunk=>{
        requestBytes+=chunk.length;
        if(requestBytes>4096){req.destroy();return;}
        body+=chunk.toString('utf8');
      });
      req.on('end',()=>{
        if(body!==fixture.request.body){
          res.writeHead(400,{'Connection':'close'});res.end();return;
        }
        if(fault==='stall'){
          res.writeHead(200,{'Content-Type':'application/json',
            'Connection':'close'});
          res.write('{');return;
        }
        const payload=fault==='oversized'?'X'.repeat(32769):
          fault==='invalid-json'?'{bad':
          fault==='bad-utf8'?Buffer.from([0xff,0xfe,0xfd]):
          fault==='sse'?'data: '+answer+'\n\n':answer;
        const headers={
          'Content-Type':fault==='sse'?'text/event-stream':
            fault==='wrong-content-type'?'text/plain':'application/json',
          'Content-Length':String(Buffer.byteLength(payload,'utf8')),
          'Connection':'close',
          ...(fault==='redirect'?{Location:'https://elsewhere.invalid/mcp'}:{}),
          ...(fault==='wrong-version'?{'Mcp-Protocol-Version':'2025-11-25'}:{})
        };
        res.writeHead(fault==='redirect'?302:200,headers);
        res.end(payload);
      });
    });
    // Never allow the caller to specify the destination or bind address.
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    const port=server.address()?.port;
    if(!Number.isSafeInteger(port)||port<1)return report('F2_LAB_LISTENER_FAILED');
    const controller=new AbortController();
    deadline=setTimeout(()=>controller.abort(),deadlineMs);
    const started=Date.now();
    return await new Promise(resolveResult=>{
      // Preserve actual successful TLS peer evidence across an AbortSignal
      // error. A stalled HTTP response can time out AFTER TLS is verified.
      let verifiedTlsOnce=false;
      const noteTlsPeer=socket=>{
        if(socket?.authorized===true&&socket?.encrypted===true&&
           socket?.remoteAddress==='127.0.0.1')verifiedTlsOnce=true;
      };
      const req=https.request({
        hostname:'127.0.0.1',port,path:'/mcp',method:'POST',agent:false,
        servername:'staging.example.org',rejectUnauthorized:true,
        ca:fault==='untrusted-ca'?[]:cert,minVersion:'TLSv1.2',
        maxHeaderSize:4096,signal:controller.signal,
        headers:{...fixture.request.headers,
          Host:'staging.example.org',Connection:'close',
          'Content-Length':String(Buffer.byteLength(fixture.request.body,'utf8'))}
      },async res=>{
        const peerVerified=res.socket?.authorized===true&&
          res.socket?.encrypted===true&&
          res.socket?.remoteAddress==='127.0.0.1';
        if(peerVerified)verifiedTlsOnce=true;
        if(!peerVerified){
          res.destroy();resolveResult(report('F2_LAB_PEER_REJECTED',
            false,received));return;
        }
        let bytes=0;const chunks=[];
        try {
          for await(const chunk of res) {
            bytes+=chunk.length;
            if(bytes>32768){
              res.destroy();
              resolveResult(report('F2_LAB_RESPONSE_TOO_LARGE',
                false,received,true));return;
            }
            chunks.push(chunk);
          }
        }catch {
          resolveResult(report('F2_LAB_STREAM_REJECTED',
            false,received,true));return;
        }
        // Node may add a Connection: close transport header. Check it
        // separately rather than promoting any other unknown header.
        const pairs=[],raw=res.rawHeaders;
        if(raw.length>32)return resolveResult(
          report('F2_LAB_HEADERS_REJECTED',false,received,true));
        for(let i=0;i<raw.length;i+=2){
          const name=raw[i].toLowerCase(),value=raw[i+1];
          if(name==='connection'){
            if(value.toLowerCase()!=='close')
              return resolveResult(report('F2_LAB_HEADERS_REJECTED',
                false,received,true));
            continue;
          }
          pairs.push([name,value]);
        }
        // Fatal UTF-8: Node Buffer.toString() silently substitutes U+FFFD.
        // Invalid response bytes must never become trusted JSON/SSE text.
        let payload;
        try {payload=new TextDecoder('utf-8',{fatal:true}).decode(
          Buffer.concat(chunks));}
        catch {return resolveResult(report('F2_LAB_UTF8_REJECTED',
          false,received,true));}
        const exchanged={schemaVersion:1,request:fixture.request,
          statusCode:res.statusCode,headers:pairs,body:payload,
          elapsedMs:Date.now()-started,redirectsFollowed:0};
        const verdict=inspectF2OfflineHttpDiscoveryExchange(
          JSON.stringify(exchanged));
        return resolveResult(report(
          verdict.httpShapeMatched?'F2_OWNED_LAB_HTTPS_EXCHANGE_MATCH':
            'F2_LAB_EXCHANGE_REJECTED',
          verdict.httpShapeMatched,received,true));
      });
      // A stalled response can be aborted before the HTTP response callback
      // runs. Capture the independently verified handshake on the TLS socket.
      req.on('socket',socket=>{
        noteTlsPeer(socket);
        socket.once('secureConnect',()=>noteTlsPeer(socket));
      });
      req.on('error',()=>resolveResult(report(
        'F2_LAB_TLS_OR_DEADLINE_REJECTED',false,received,verifiedTlsOnce)));
      req.end(fixture.request.body);
    });
  }catch{
    return report('F2_LAB_SETUP_REJECTED',false,received);
  }finally{
    clearTimeout(deadline);
    if(server){
      server.closeAllConnections();
      await new Promise(done=>server.close(()=>done()));
    }
  }
}
