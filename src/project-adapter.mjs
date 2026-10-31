import {createHash} from 'node:crypto';
import {runScenario} from './scenario.mjs';
import {auditRecords} from './trace.mjs';
import {buildCliReport} from './report-contract.mjs';
/**
 * Portable, *non-executing* MCP project connection descriptor.
 *
 * These validators are transport-agnostic. They NEVER spawn, fetch, resolve
 * DNS, read environment credentials, make HTTP calls or trust a consent flag.
 * M4-B0 is schema interpretation only, not connectivity or authorization.
 */
export const ADAPTER_SCHEMA_VERSION = 1;
export const ADAPTER_TRANSPORTS = Object.freeze(['stdio','streamable-http']);
export const ADAPTER_PROTOCOLS = Object.freeze(['2025-11-25','2026-07-28']);
const KEYS = Object.freeze({
  root:['adapterSchemaVersion','project','transport','protocolVersion','policy'],
  project:['name'],
  policy:['mode','allowNetwork','allowProcessSpawn','allowToolCalls','allowCredentials'],
  stdio:['type','command','args'],
  http:['type','endpoint']
});
const FAIL = () => { throw new TypeError('INVALID_PROJECT_ADAPTER_CONFIG'); };
const own = (v,k) => Object.prototype.hasOwnProperty.call(v,k);
function record(v,keys) {
  if (!v || typeof v!=='object' || Array.isArray(v) ||
      Object.getPrototypeOf(v)!==Object.prototype ||
      Object.keys(v).length!==keys.length ||
      !keys.every(k=>own(v,k))) FAIL();
}
const text = (s,max) => typeof s==='string' && s.length>=1 &&
  s.length<=max && !/[\u0000-\u001f\u007f]/u.test(s) &&
  s.trim()===s;
function checkedStdio(t) {
  record(t,KEYS.stdio);
  if (t.type!=='stdio' || !text(t.command,64) ||
      !/^[a-zA-Z][a-zA-Z0-9._-]*$/u.test(t.command) ||
      !Array.isArray(t.args) || t.args.length>12) FAIL();
  for(const arg of t.args) {
    if (!text(arg,128) || /(?:^|[-_])(?:token|secret|password|key)(?:$|[-_=])/iu.test(arg) ||
        /^(?:-e|-c|--eval|--exec|--require)$/u.test(arg)) FAIL();
  }
}
function checkedHttp(t) {
  record(t,KEYS.http);
  if(t.type!=='streamable-http' || !text(t.endpoint,256) ||
     !t.endpoint.startsWith('https://')) FAIL();
  let u;
  try { u=new URL(t.endpoint); } catch { FAIL(); }
  if(u.protocol!=='https:' || u.username || u.password ||
    u.search || u.hash || u.hostname.length>190 || u.port &&
    !/^[0-9]{1,5}$/u.test(u.port)) FAIL();
  // Require a conventional ASCII DNS name for this *configuration only*.
  // DNS/SSRF checks at connection time are NOT implemented.
  const host=u.hostname;
  if(!/^[a-z0-9.-]+$/u.test(host) || host.length<4 ||
     host.startsWith('.') || host.endsWith('.') || host.includes('..') ||
     !host.includes('.') || /^(?:[0-9.]+)$/u.test(host)) FAIL();
  for(const label of host.split('.')) {
    if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label) ||
       label.startsWith('xn--')) FAIL();
  }
  const domain=host.split('.').at(-1);
  if(['local','localhost','internal','test','invalid','arpa','home'].includes(domain)) FAIL();
  // Disallow ambiguous normalization, alternate ports, URL fragments,
  // encoded paths, dot segments, query strings and proxy-style authorities.
  const raw=t.endpoint.slice('https://'.length);
  if(!/^[a-zA-Z0-9.-]+(?::443)?\/[a-zA-Z0-9/_-]+$/u.test(raw) ||
      raw.includes('//') || raw.includes('..') || u.pathname==='/' ||
      u.href!==t.endpoint.replace(':443/','/')) FAIL();
}
const DRY = Object.freeze({
  mode:'validate-only',
  allowNetwork:false,
  allowProcessSpawn:false,
  allowToolCalls:false,
  allowCredentials:false
});
function checkedPolicy(p) {
  record(p,KEYS.policy);
  for(const [key,expected] of Object.entries(DRY)) {
    if(p[key]!==expected) FAIL();
  }
}
/**
 * Intentionally no driver.run/driver.connect method. Transport-specific
 * execution will need a new approved gated issue, not a config flag.
 */
export function inspectProjectAdapter(config) {
  record(config,KEYS.root);
  if(config.adapterSchemaVersion!==ADAPTER_SCHEMA_VERSION ||
     !ADAPTER_PROTOCOLS.includes(config.protocolVersion)) FAIL();
  record(config.project,KEYS.project);
  if(!text(config.project.name,64) ||
     !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/u.test(config.project.name)) FAIL();
  checkedPolicy(config.policy);
  const type=config.transport?.type;
  if(type==='stdio') checkedStdio(config.transport);
  else if(type==='streamable-http') checkedHttp(config.transport);
  else FAIL();
  return {
    status:'PASS',
    adapterSchemaVersion:ADAPTER_SCHEMA_VERSION,
    transport:type,
    protocolVersion:config.protocolVersion,
    connectionStatus:'NOT_ATTEMPTED',
    executionEnabled:false,
    capabilities:['DESCRIPTOR_VALIDATED'],
    scope:'configuration validation only; no MCP server contact or ownership verification'
  };
}


/**
 * F1 installed-CLI bridge for exactly ONE safe client config entry.
 * Strictly inert: does not read credentials, spawn or contact a target.
 * Unknown fields (including env, headers and auth) fail closed.
 */
export function importOfflineClientConfig(input) {
  if(!plainFiniteTree(input)) FAIL();
  const top=Object.keys(input);
  if(top.length!==1 || !['mcpServers','servers'].includes(top[0])) FAIL();
  const kind=top[0],entries=input[kind];
  if(!entries || typeof entries!=='object' || Array.isArray(entries)) FAIL();
  const names=Object.keys(entries);
  if(names.length!==1 || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/u.test(names[0])) FAIL();
  const server=entries[names[0]];
  if(!server || typeof server!=='object' || Array.isArray(server)) FAIL();
  const keys=Object.keys(server),type=server.type;
  let transport;
  if(type===undefined || type==='stdio'){
    if(kind==='servers' && type!=='stdio') FAIL();
    if(!keys.every(k=>['type','command','args'].includes(k)) ||
       !keys.includes('command') || typeof server.command!=='string') FAIL();
    const args=server.args===undefined?[]:server.args;
    if(!Array.isArray(args) || args.length>12 ||
       args.some(a=>typeof a!=='string' || !/^[A-Za-z0-9_@./-]{1,128}$/u.test(a) ||
         a.startsWith('/') || a.startsWith('~') || a.includes('..') ||
         a.includes('//') || /^[A-Za-z]:/u.test(a) ||
         /(?:token|secret|passwd|password|credential|apikey|api_key|bearer)/iu.test(a))) FAIL();
    transport={type:'stdio',command:server.command,args:[...args]};
  } else if(type==='http'||type==='streamable-http'){
    if(keys.length!==2 || !keys.includes('type') ||
       !keys.includes('url') || typeof server.url!=='string') FAIL();
    transport={type:'streamable-http',endpoint:server.url};
  } else FAIL();
  const descriptor={
    adapterSchemaVersion:1,project:{name:names[0]},transport,
    protocolVersion:'2026-07-28',policy:{...DRY}
  };
  // Reuse the exact packaged descriptor validator; never trust a client
  // config's alleged permission or protocol negotiation claim.
  previewProjectOnboarding(descriptor);
  return descriptor;
}

/**
 * M4-B7-B: project-neutral readiness for a validated descriptor only.
 * This is PURE; it does not read files, inspect env, run processes, connect
 * or accept external proof of staging/operator authorization.
 */
export function previewProjectOnboarding(config){
  const validated=inspectProjectAdapter(config); // throws before any output
  return {
    status:'PASS',
    profile:'offline-project-onboarding-v1',
    readinessSchemaVersion:1,
    adapterSchemaVersion:validated.adapterSchemaVersion,
    transport:validated.transport,
    protocolVersion:validated.protocolVersion,
    descriptorEvidence:'DESCRIPTOR_VALIDATED',
    stagingEvidence:'FIRST_PARTY_STAGING_NOT_ATTEMPTED',
    targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
    operatorEvidence:'OPERATOR_NOT_VERIFIED',
    consentEvidence:'SELF_ASSERTED_CONSENT_NOT_EVALUATED',
    readinessStatus:'REAL_TARGET_NOT_AUTHORIZED',
    connectionStatus:'NOT_ATTEMPTED',
    executionEnabled:false,
    projectConnectionAuthorized:false,
    externalTargetContacted:false,
    operatorVerified:false,
    nextActions:[
      {step:1,code:'REVIEW_OFFLINE_DESCRIPTOR',command:'node src/cli.mjs adapter-check examples/adapter-profiles/streamable-http-project.json'},
      {step:2,code:'REVIEW_FICTIONAL_CONSENT_ONLY',command:'node src/cli.mjs adapter-policy-check examples/adapter-profiles/consent-expired.json'},
      {step:3,code:'OPTIONAL_SEPARATE_OWNED_STAGING_DEMO',command:'node src/cli.mjs adapter-staging-selftest'},
      {step:4,code:'SEPARATE_VERIFIED_TARGET_APPROVAL_REQUIRED',command:null}
    ],
    failureCount:0,
    findingsTruncated:false,
    findings:[]
  };
}


/**
 * M4-B7-C: two literal, non-executing descriptor templates. The example
 * command and hostname are inert strings, NOT an instruction to launch/connect.
 * No caller-supplied values or environment can enter the returned descriptor.
 */
export function createOfflineAdapterTemplate(transport){
  if(transport!=='stdio' && transport!=='streamable-http')
    throw new TypeError('INVALID_ADAPTER_TEMPLATE_TYPE');
  const descriptor={
    adapterSchemaVersion:ADAPTER_SCHEMA_VERSION,
    project:{name:transport==='stdio'?'fictional-stdio-project':'fictional-http-project'},
    transport:transport==='stdio'
      ?{type:'stdio',command:'node',args:['server.mjs']}
      :{type:'streamable-http',endpoint:'https://mcp.example.org/mcp'},
    protocolVersion:'2026-07-28',
    policy:{...DRY}
  };
  // Assert our own reviewed emitted example can roundtrip through the
  // existing inert schema validator without extending any execution boundary.
  const checked=inspectProjectAdapter(descriptor);
  return {
    status:'PASS',
    profile:'offline-adapter-template-v1',
    templateSchemaVersion:1,
    template:descriptor,
    transport:checked.transport,
    descriptorEvidence:'FICTIONAL_TEMPLATE_VALIDATED',
    stagingEvidence:'FIRST_PARTY_STAGING_NOT_ATTEMPTED',
    targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
    operatorEvidence:'OPERATOR_NOT_VERIFIED',
    readinessStatus:'REAL_TARGET_NOT_AUTHORIZED',
    connectionStatus:'NOT_ATTEMPTED',
    executionEnabled:false,
    projectConnectionAuthorized:false,
    externalTargetContacted:false,
    operatorVerified:false,
    nextAction:'COPY_TEMPLATE_OBJECT_TO_LOCAL_FILE_THEN_RUN_ADAPTER_ONBOARD',
    failureCount:0,
    findingsTruncated:false,
    findings:[]
  };
}


/**
 * M4-B8-A: a PURE and non-authoritative simulation of future per-target gates.
 *
 * Both arguments are UNTRUSTED JSON-shaped data. The optional second argument
 * is a test-only evidence snapshot, NOT a real verification provider. Even a
 * synthetic PASS never grants a network/process capability. No connector,
 * fetcher, credential provider, socket or executable dispatch exists here.
 * Reuse/revocation state cannot be established durably by this pure function.
 */
export const TARGET_DECISION_SCHEMA_VERSION = 1;
const DECISION_FIELDS=Object.freeze({
  root:['decisionSchemaVersion','target','request','grant'],
  target:['scheme','host','port','path','environment','protocolVersion'],
  request:['method','maxRequests','maxResponseBytes','deadlineMs','maxRetries','followRedirects'],
  grant:['status','state','nonce','issuedAtMs','expiresAtMs','scope'],
  scope:['scheme','host','port','path','protocolVersion','method','maxRequests'],
  evidence:['provenance','ownership','operator','egress','tls','dns','ssrf']
});
const TEST_EVIDENCE_STATES=['SIMULATED_PASS','UNKNOWN','SIMULATED_FAIL'];
function isDataRecord(obj,fields){
  if(!obj || typeof obj!=='object' || Array.isArray(obj) ||
      Object.getPrototypeOf(obj)!==Object.prototype) return false;
  const descriptors=Object.getOwnPropertyDescriptors(obj);
  return Reflect.ownKeys(descriptors).length===fields.length &&
    fields.every(k=>own(descriptors,k) && own(descriptors[k],'value'));
}
function safeTargetTuple(target){
  if(target.scheme!=='https' || target.port!==443 ||
      target.environment!=='nonproduction' ||
      target.protocolVersion!=='2026-07-28' ||
      typeof target.host!=='string' || typeof target.path!=='string' ||
      !/^[a-z0-9.-]{4,190}$/u.test(target.host) ||
      !/^\/[A-Za-z0-9/_-]{1,128}$/u.test(target.path) ||
      target.path.includes('//') || target.path.includes('..') ||
      target.path.endsWith('/')) return false;
  try {
    // Reuse the already-reviewed *inert* canonical URL grammar; never resolve.
    inspectProjectAdapter({
      adapterSchemaVersion:ADAPTER_SCHEMA_VERSION,
      project:{name:'fictional-target-decision'},
      transport:{type:'streamable-http',endpoint:'https://'+target.host+target.path},
      protocolVersion:'2026-07-28',
      policy:{...DRY}
    });
    return true;
  } catch { return false; }
}
function decisionReport(codes){
  const findings=codes.slice(0,12).map(rule=>({rule}));
  const passed=findings.length===0;
  return {
    status:passed?'PASS':'FAIL',
    profile:'fictional-target-decision-preview-v1',
    decisionSchemaVersion:TARGET_DECISION_SCHEMA_VERSION,
    simulationStatus:passed?'SIMULATED_GATES_PASS':'SIMULATED_DENY',
    evidenceTrust:'TEST_ONLY_NOT_INDEPENDENT',
    authorizationStatus:'REAL_TARGET_EXECUTION_NOT_AUTHORIZED',
    connectionStatus:'NOT_ATTEMPTED',
    executionEnabled:false,
    projectConnectionAuthorized:false,
    externalTargetContacted:false,
    operatorVerified:false,
    nextAction:'INDEPENDENT_APPROVAL_AND_NETWORK_SECURITY_REVIEW_REQUIRED',
    failureCount:codes.length,
    findingsTruncated:codes.length>findings.length,
    findings
  };
}
/**
 * Exact-target decision model, with no effects and no real authority.
 *
 * 'evidence' represents a snapshot emitted by a **fictional test provider**.
 * A caller can forge it: the provenance marker is deliberately TEST_ONLY.
 * Neither matching mock statuses nor profile/onboarding PASS authorize contact.
 * Passing the same UNUSED grant twice will also simulate PASS twice; a future
 * trusted replay ledger and atomic consume-before-effect gate are mandatory.
 */
export function simulateExactTargetAuthorization(packet,evidence,options={}){
  try {
    const nowMs=options?.nowMs;
    if(!isDataRecord(packet,DECISION_FIELDS.root) ||
       !isDataRecord(packet.target,DECISION_FIELDS.target) ||
       !isDataRecord(packet.request,DECISION_FIELDS.request) ||
       !isDataRecord(packet.grant,DECISION_FIELDS.grant) ||
       !isDataRecord(packet.grant.scope,DECISION_FIELDS.scope))
      return decisionReport(['INVALID_AUTHORIZATION_PACKET']);
    const {target,request,grant}=packet;
    const codes=[];
    if(packet.decisionSchemaVersion!==TARGET_DECISION_SCHEMA_VERSION)
      codes.push('INVALID_AUTHORIZATION_PACKET');
    if(!safeTargetTuple(target)) codes.push('TARGET_NOT_CANONICAL');
    if(request.method!=='server/discover' || request.maxRequests!==1 ||
       !Number.isSafeInteger(request.maxResponseBytes) ||
       request.maxResponseBytes<1 || request.maxResponseBytes>32768 ||
       !Number.isSafeInteger(request.deadlineMs) ||
       request.deadlineMs<1 || request.deadlineMs>5000 ||
       request.maxRetries!==0 || request.followRedirects!==false)
      codes.push('REQUEST_OUT_OF_SCOPE');
    const scope=grant.scope;
    if(!DECISION_FIELDS.scope.every(k=>
        scope[k]===(k==='method'?request.method:
                    k==='maxRequests'?request.maxRequests:target[k])))
      codes.push('GRANT_SCOPE_MISMATCH');
    if(grant.status!=='SIMULATED_APPROVED')
      codes.push('GRANT_NOT_APPROVED');
    if(grant.state==='REVOKED') codes.push('GRANT_REVOKED');
    else if(grant.state==='CONSUMED') codes.push('GRANT_REPLAYED');
    else if(grant.state!=='UNUSED') codes.push('GRANT_STATE_INVALID');
    if(typeof grant.nonce!=='string' ||
       !/^[a-zA-Z0-9_-]{16,64}$/u.test(grant.nonce) ||
       !Number.isSafeInteger(nowMs) || nowMs<0 ||
       !Number.isSafeInteger(grant.issuedAtMs) ||
       !Number.isSafeInteger(grant.expiresAtMs) ||
       grant.issuedAtMs<0 || grant.expiresAtMs<=grant.issuedAtMs ||
       grant.expiresAtMs-grant.issuedAtMs>300000 ||
       nowMs<grant.issuedAtMs || nowMs>=grant.expiresAtMs)
      codes.push('GRANT_TIME_OR_NONCE_INVALID');
    if(!isDataRecord(evidence,DECISION_FIELDS.evidence) ||
       evidence.provenance!=='TEST_ONLY_NOT_INDEPENDENT' ||
       !DECISION_FIELDS.evidence.slice(1).every(k=>
         TEST_EVIDENCE_STATES.includes(evidence[k])))
      codes.push('TEST_EVIDENCE_INVALID');
    else {
      for(const [key,rule] of [
        ['ownership','OWNERSHIP_NOT_VERIFIED'],
        ['operator','OPERATOR_NOT_VERIFIED'],
        ['egress','EGRESS_PREFLIGHT_NOT_VERIFIED'],
        ['tls','TLS_PREFLIGHT_NOT_VERIFIED'],
        ['dns','DNS_PREFLIGHT_NOT_VERIFIED'],
        ['ssrf','SSRF_PREFLIGHT_NOT_VERIFIED']
      ]) if(evidence[key]!=='SIMULATED_PASS') codes.push(rule);
    }
    return decisionReport(codes);
  } catch {
    // No exception text, user-supplied hostname, nonce or grants in reports.
    return decisionReport(['INVALID_AUTHORIZATION_PACKET']);
  }
}


/**
 * M4-B8-B: DISPOSABLE, IN-MEMORY SECURITY MODEL ONLY.
 *
 * The caller can forge every synthetic evidence field and fingerprint. This
 * models an API boundary but cannot establish real identity, authorization,
 * durable replay protection or actual network isolation.
 */
export const FICTIONAL_EVIDENCE_SCHEMA_VERSION=1;
export const FICTIONAL_REHEARSAL_SCHEMA_VERSION=1;
const FICTIONAL_PROVIDER='OWNED_SYNTHETIC_PROVIDER_V1';
const FICTIONAL_ISSUER='FICTIONAL_OFFLINE_ISSUER_V1';
const SNAPSHOT_FIELDS=Object.freeze([
  'evidenceSchemaVersion','provenance','providerId','issuer','operatorId',
  'packetFingerprint','issuedAtMs','expiresAtMs','checks'
]);
const PROOF_CHECKS=Object.freeze(['ownership','operator','egress','tls','dns','ssrf']);
const EXACT_TEST_PROOF=Object.freeze({
  provenance:'TEST_ONLY_NOT_INDEPENDENT',
  ownership:'SIMULATED_PASS',operator:'SIMULATED_PASS',
  egress:'SIMULATED_PASS',tls:'SIMULATED_PASS',
  dns:'SIMULATED_PASS',ssrf:'SIMULATED_PASS'
});
const isFictionalOperator=x=>typeof x==='string' &&
  /^fictional-[a-z0-9-]{8,48}$/u.test(x);
const isSafeClock=x=>Number.isSafeInteger(x) && x>=0;
const snapshotCodes=(packet,operatorId,snapshot,nowMs)=>{
  if(!isDataRecord(snapshot,SNAPSHOT_FIELDS) ||
     !isDataRecord(snapshot?.checks,PROOF_CHECKS))
    return ['TEST_PROVIDER_SNAPSHOT_INVALID'];
  const errors=[];
  if(snapshot.evidenceSchemaVersion!==FICTIONAL_EVIDENCE_SCHEMA_VERSION ||
     snapshot.provenance!=='TEST_ONLY_NOT_INDEPENDENT' ||
     snapshot.providerId!==FICTIONAL_PROVIDER ||
     snapshot.issuer!==FICTIONAL_ISSUER)
    errors.push('TEST_PROVIDER_PROVENANCE_INVALID');
  if(snapshot.operatorId!==operatorId)
    errors.push('TEST_PROVIDER_OPERATOR_MISMATCH');
  if(snapshot.packetFingerprint!==fingerprintFictionalTargetPacket(packet,operatorId))
    errors.push('TEST_PROVIDER_PACKET_MISMATCH');
  if(!isSafeClock(nowMs) ||
     !isSafeClock(snapshot.issuedAtMs) ||
     !isSafeClock(snapshot.expiresAtMs) ||
     snapshot.expiresAtMs<=snapshot.issuedAtMs ||
     snapshot.expiresAtMs-snapshot.issuedAtMs>60000 ||
     snapshot.issuedAtMs<packet.grant.issuedAtMs ||
     snapshot.expiresAtMs>packet.grant.expiresAtMs ||
     nowMs<snapshot.issuedAtMs || nowMs>=snapshot.expiresAtMs)
    errors.push('TEST_PROVIDER_EVIDENCE_STALE');
  if(!PROOF_CHECKS.every(key=>snapshot.checks[key]==='SIMULATED_PASS'))
    errors.push('TEST_PROVIDER_GATE_DENIED');
  return errors;
};
const rehearsalReport=(codes,state,operation)=>{
  const base=decisionReport(codes);
  return {
    ...base,
    profile:'fictional-one-time-permit-rehearsal-v1',
    rehearsalSchemaVersion:FICTIONAL_REHEARSAL_SCHEMA_VERSION,
    rehearsalState:state,
    operation
  };
};

/** Deterministic tuple digest. It is NOT a signature, authority or secret. */
export function fingerprintFictionalTargetPacket(packet,operatorId){
  if(!isFictionalOperator(operatorId) ||
     !isDataRecord(packet,DECISION_FIELDS.root) ||
     !isDataRecord(packet.target,DECISION_FIELDS.target) ||
     !isDataRecord(packet.request,DECISION_FIELDS.request) ||
     !isDataRecord(packet.grant,DECISION_FIELDS.grant) ||
     !isDataRecord(packet.grant.scope,DECISION_FIELDS.scope) ||
     simulateExactTargetAuthorization(packet,EXACT_TEST_PROOF,{
       nowMs:packet.grant.issuedAtMs
     }).status!=='PASS') throw new TypeError('INVALID_TEST_DECISION_PACKET');
  // Arrays with fixed field order avoid object-key insertion-order drift.
  const material=[
    TARGET_DECISION_SCHEMA_VERSION,operatorId,
    DECISION_FIELDS.target.map(k=>packet.target[k]),
    DECISION_FIELDS.request.map(k=>packet.request[k]),
    DECISION_FIELDS.grant.filter(k=>k!=='scope').map(k=>packet.grant[k]),
    DECISION_FIELDS.scope.map(k=>packet.grant.scope[k])
  ];
  return createHash('sha256').update(JSON.stringify(material),'utf8').digest('hex');
}

/**
 * Validate a fictional separately supplied provider snapshot. Every field is
 * caller-forgeable; even PASS represents only consistency in a local example.
 */
export function inspectFictionalEvidenceSnapshot(packet,operatorId,snapshot,options={}){
  try {
    const nowMs=options?.nowMs;
    fingerprintFictionalTargetPacket(packet,operatorId);
    return rehearsalReport(snapshotCodes(packet,operatorId,snapshot,nowMs),
      'NOT_ISSUED','INSPECT_TEST_EVIDENCE');
  } catch {
    return rehearsalReport(['TEST_PROVIDER_INPUT_INVALID'],
      'NOT_ISSUED','INSPECT_TEST_EVIDENCE');
  }
}

/**
 * One deliberately local mutable state cell, with synchronous transitions.
 * A consume check and transition happen in one JS turn (no await).
 * This is NOT atomic across processes, machines or independently created cells.
 */
export function createFictionalPermitRehearsal(packet,operatorId){
  let fingerprint;
  try { fingerprint=fingerprintFictionalTargetPacket(packet,operatorId); }
  catch { throw new TypeError('INVALID_TEST_REHEARSAL_INPUT'); }
  const pinned=structuredClone(packet);
  let state='REQUESTED',snapshotExpiry=null;
  const clock=options=>{
    if(!isDataRecord(options,['nowMs']) || !isSafeClock(options.nowMs))
      return null;
    return options.nowMs;
  };
  const expired=nowMs=>nowMs>=pinned.grant.expiresAtMs ||
    (snapshotExpiry!==null && nowMs>=snapshotExpiry);
  const stateDeny=()=>{
    if(state==='ISSUED') return 'TEST_GRANT_ALREADY_ISSUED';
    if(state==='CONSUMED') return 'TEST_GRANT_REPLAYED';
    if(state==='REVOKED') return 'TEST_GRANT_REVOKED';
    if(state==='EXPIRED') return 'TEST_GRANT_EXPIRED';
    return 'TEST_GRANT_NOT_ISSUED';
  };
  const api=Object.freeze({
    current(){
      return rehearsalReport([],state,'INSPECT_REHEARSAL_STATE');
    },
    issue(snapshot,options){
      try {
        const nowMs=clock(options);
        if(nowMs===null) return rehearsalReport(
          ['TEST_CLOCK_INVALID'],state,'ISSUE');
        if(state!=='REQUESTED') return rehearsalReport(
          [stateDeny()],state,'ISSUE');
        if(expired(nowMs)){
          state='EXPIRED';
          return rehearsalReport(['TEST_GRANT_EXPIRED'],state,'ISSUE');
        }
        const base=simulateExactTargetAuthorization(
          pinned,EXACT_TEST_PROOF,{nowMs});
        if(base.status!=='PASS') return rehearsalReport(
          ['TEST_BASE_GATE_DENIED'],state,'ISSUE');
        const reasons=snapshotCodes(pinned,operatorId,snapshot,nowMs);
        if(reasons.length) return rehearsalReport(reasons,state,'ISSUE');
        if(snapshot.packetFingerprint!==fingerprint) return rehearsalReport(
          ['TEST_PROVIDER_PACKET_MISMATCH'],state,'ISSUE');
        // Snapshot consists of primitive-only values. Keep expiration only.
        snapshotExpiry=snapshot.expiresAtMs;
        state='ISSUED';
        return rehearsalReport([],state,'ISSUE');
      } catch {
        return rehearsalReport(['TEST_PROVIDER_INPUT_INVALID'],state,'ISSUE');
      }
    },
    consume(candidatePacket,candidateOperator,options){
      try {
        const nowMs=clock(options);
        if(nowMs===null) return rehearsalReport(
          ['TEST_CLOCK_INVALID'],state,'CONSUME');
        if(state!=='ISSUED') return rehearsalReport(
          [stateDeny()],state,'CONSUME');
        if(expired(nowMs)){
          state='EXPIRED';
          return rehearsalReport(['TEST_GRANT_EXPIRED'],state,'CONSUME');
        }
        if(candidateOperator!==operatorId) return rehearsalReport(
          ['TEST_CONSUMER_OPERATOR_MISMATCH'],state,'CONSUME');
        if(fingerprintFictionalTargetPacket(candidatePacket,candidateOperator)!==
           fingerprint) return rehearsalReport(
          ['TEST_CONSUMER_SCOPE_MISMATCH'],state,'CONSUME');
        // Synchronous compare-then-set, no network or async callback.
        state='CONSUMED';
        return rehearsalReport([],state,'CONSUME');
      } catch {
        return rehearsalReport(['TEST_CONSUMER_SCOPE_MISMATCH'],state,'CONSUME');
      }
    },
    revoke(options){
      const nowMs=clock(options);
      if(nowMs===null) return rehearsalReport(
        ['TEST_CLOCK_INVALID'],state,'REVOKE');
      if(state==='REQUESTED' || state==='ISSUED'){
        state='REVOKED';
        return rehearsalReport([],state,'REVOKE');
      }
      return rehearsalReport([stateDeny()],state,'REVOKE');
    },
    expire(options){
      const nowMs=clock(options);
      if(nowMs===null) return rehearsalReport(
        ['TEST_CLOCK_INVALID'],state,'EXPIRE');
      if(state==='REQUESTED' || state==='ISSUED'){
        if(!expired(nowMs)) return rehearsalReport(
          ['TEST_GRANT_NOT_EXPIRED'],state,'EXPIRE');
        state='EXPIRED';
        return rehearsalReport([],state,'EXPIRE');
      }
      return rehearsalReport([stateDeny()],state,'EXPIRE');
    }
  });
  return api;
}


/**
 * M4-B9-A: A selected subset of *reviewed in-code fictional fixtures*, joined
 * to an otherwise inert descriptor for convenient offline project onboarding.
 * User JSON can choose fixed case IDs only; no arbitrary interactions, target
 * URLs, commands, source paths, tool calls, or network transports are executed.
 * Every result describes OUR fixtures, never the user's real MCP installation.
 */
export const OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION=1;
export const OFFLINE_FIXTURE_CASES=Object.freeze([
  'permission-denial','replay-denial','tool-escalation-denial',
  'denied-effect-negative','clean-trace'
]);
const OFFLINE_CASE_SET=new Set(OFFLINE_FIXTURE_CASES);

// Defence in depth for the exported JS API (CLI input is strict JSON).
// Reject getters, non-JSON prototypes, cyclic graphs, symbols and huge trees.
function plainFiniteTree(value,seen=new WeakSet(),budget={remaining:160},depth=0){
  if(--budget.remaining<0 || depth>8) return false;
  if(value===null || typeof value==='boolean') return true;
  if(typeof value==='string') return value.length<=512;
  if(typeof value==='number') return Number.isSafeInteger(value);
  if(!value || typeof value!=='object' || seen.has(value)) return false;
  seen.add(value);
  const array=Array.isArray(value);
  if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))
    return false;
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const keys=Reflect.ownKeys(descriptors);
  if(keys.length>160 || (array && value.length>12)) return false;
  return keys.every(k=>{
    if(typeof k!=='string') return false;
    if(array && k==='length') return true;
    const descriptor=descriptors[k];
    if(!Object.hasOwn(descriptor,'value')) return false;
    return plainFiniteTree(descriptor.value,seen,budget,depth+1);
  });
}
const fixturePolicy=()=>({
  owner:'fictional-owner',resource:'mcp://fictional-resource',
  scopes:['note:read','note:write'],generation:2
});
const fixtureGrant=nonce=>({
  owner:'fictional-owner',resource:'mcp://fictional-resource',
  scopes:['note:read','note:write'],generation:2,
  notBefore:0,expiresAt:999,nonce
});
const fixtureAction=(tool,expected,nonce='synthetic-grant-01')=>({
  tool,owner:'fictional-owner',resource:'mcp://fictional-resource',
  origin:'owner',grant:fixtureGrant(nonce),expected
});
function fixtureScenario(caseId){
  let actions;
  if(caseId==='permission-denial'){
    actions=[{...fixtureAction('write-note',{
      decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'
    }),owner:'fictional-other'}];
  } else if(caseId==='replay-denial'){
    actions=[
      fixtureAction('write-note',{decision:'ALLOW',reason:'AUTHORIZED',effect:'WRITE'}),
      fixtureAction('write-note',{decision:'DENY',reason:'REPLAYED_NONCE',effect:'NONE'})
    ];
  } else {
    actions=[fixtureAction('execute-shell',{
      decision:'DENY',reason:'UNKNOWN_TOOL',effect:'NONE'
    })];
  }
  return {
    version:1,id:'fictional-offline-'+caseId,clock:100,
    policy:fixturePolicy(),actions
  };
}
function runReviewedCase(caseId){
  if(caseId==='clean-trace'){
    const outcome=auditRecords([
      {decision:'ALLOW',effect:'READ',ownerAuthorized:true,
        scopeAuthorized:true,leaseFresh:true,secretLogged:false},
      {decision:'DENY',effect:'NONE',secretLogged:false}
    ]);
    return {observedStatus:outcome.status,matched:outcome.status==='PASS' &&
      outcome.checked===2 && outcome.failureCount===0,
      expectedRule:'CLEAN_SYNTHETIC_TRACE'};
  }
  if(caseId==='denied-effect-negative'){
    const outcome=auditRecords([
      {decision:'DENY',effect:'WRITE',secretLogged:false}
    ]);
    return {observedStatus:outcome.status,matched:outcome.status==='FAIL' &&
      outcome.failureCount===1 &&
      outcome.failures[0]?.rule==='DENIED_ACTION_HAD_EFFECT',
      expectedRule:'DENIED_ACTION_HAD_EFFECT'};
  }
  const outcome=runScenario(fixtureScenario(caseId));
  const expected=caseId==='permission-denial'
    ? ['OWNER_MISMATCH']
    : caseId==='replay-denial'
      ? ['AUTHORIZED','REPLAYED_NONCE']
      : ['UNKNOWN_TOOL'];
  const matched=outcome.status==='PASS' && outcome.checks===expected.length &&
    outcome.mismatches.length===0 &&
    outcome.steps.every((step,index)=>step.reason===expected[index]) &&
    outcome.steps.at(-1).decision==='DENY' &&
    outcome.steps.at(-1).effect==='NONE';
  return {observedStatus:outcome.status,matched,
    expectedRule:expected.at(-1)};
}
export function auditOfflineProjectFixtureBundle(bundle){
  const invalid=()=>{throw new TypeError('INVALID_OFFLINE_PROJECT_FIXTURE_BUNDLE');};
  try{
    if(!plainFiniteTree(bundle) ||
       !isDataRecord(bundle,['bundleSchemaVersion','mode','descriptor','checks']) ||
       bundle.bundleSchemaVersion!==OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION ||
       bundle.mode!=='offline-fictional-only' ||
       !Array.isArray(bundle.checks) || bundle.checks.length<1 ||
       bundle.checks.length>OFFLINE_FIXTURE_CASES.length ||
       !bundle.checks.every(check=>isDataRecord(check,['caseId']) &&
         OFFLINE_CASE_SET.has(check.caseId)) ||
       new Set(bundle.checks.map(check=>check.caseId)).size!==bundle.checks.length)
      invalid();
    // Strict existing descriptor validation: no allowNetwork/process/tools flags.
    const descriptor=inspectProjectAdapter(bundle.descriptor);
    const checks=bundle.checks.map(({caseId})=>{
      try{
        const verdict=runReviewedCase(caseId);
        return {caseId,expectedControl:verdict.expectedRule,
          observedStatus:verdict.observedStatus,
          checkStatus:verdict.matched?'PASS':'FAIL',
          expectationMet:verdict.matched};
      } catch {
        return {caseId,expectedControl:'REVIEWED_SYNTHETIC_CONTROL',
          observedStatus:'ERROR',checkStatus:'FAIL',expectationMet:false};
      }
    });
    const findings=checks.filter(c=>c.checkStatus==='FAIL')
      .map(c=>({rule:'OFFLINE_CONTROL_MISMATCH',caseId:c.caseId}));
    return {
      status:findings.length?'FAIL':'PASS',
      profile:'fictional-project-fixture-audit-v1',
      bundleSchemaVersion:OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION,
      adapterSchemaVersion:descriptor.adapterSchemaVersion,
      transport:descriptor.transport,
      protocolVersion:descriptor.protocolVersion,
      descriptorEvidence:'DESCRIPTOR_VALIDATED',
      fixtureEvidence:'OFFLINE_FIXTURE_EVALUATED',
      stagingEvidence:'FIRST_PARTY_STAGING_NOT_ATTEMPTED',
      targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
      operatorEvidence:'OPERATOR_NOT_VERIFIED',
      readinessStatus:'REAL_TARGET_NOT_AUTHORIZED',
      authorizationStatus:'REAL_TARGET_EXECUTION_NOT_AUTHORIZED',
      connectionStatus:'NOT_ATTEMPTED',
      executionEnabled:false,
      projectConnectionAuthorized:false,
      externalTargetContacted:false,
      operatorVerified:false,
      fixturesAreProjectSpecific:false,
      checks,
      failureCount:findings.length,findingsTruncated:false,findings
    };
  }catch{
    invalid();
  }
}


/**
 * M4-B9-B: explicitly opt-in, entirely symbolic developer-authored trace.
 *
 * The schema is a tiny language of six enum/boolean fields, not a transport
 * transcript. No identifiers, tool names, arguments, credentials, response
 * bodies or addresses are accepted. Only the existing inert adapter descriptor
 * may contain a textual endpoint/command, which is NEVER used for execution.
 */
export const SYMBOLIC_PROJECT_TRACE_SCHEMA_VERSION=1;
export const SYMBOLIC_PROJECT_TRACE_MAX_EVENTS=8;
const SYMBOLIC_TRACE_EVENT_KEYS=Object.freeze([
  'decision','effect','ownerAuthorized','scopeAuthorized','leaseFresh',
  'secretLogged'
]);
const SYMBOLIC_TRACE_ALLOWED_RULES=new Set([
  'FLAGGED_SECRET_IN_AUDIT_LOG',
  'DENIED_ACTION_HAD_EFFECT',
  'EFFECT_WITHOUT_AUTHORIZATION',
  'EFFECT_WITHOUT_FRESH_LEASE'
]);
const symbolicShapeError=()=>{throw new TypeError('INVALID_SYMBOLIC_PROJECT_TRACE');};

/**
 * A result of PASS evaluates only caller-authored symbolic assumptions; it
 * is NOT an authorized real target, observation of host effects or safe grant.
 */
export function auditSymbolicProjectTrace(input){
  try{
    if(!plainFiniteTree(input) ||
       !isDataRecord(input,['traceSchemaVersion','mode','descriptor','events']) ||
       input.traceSchemaVersion!==SYMBOLIC_PROJECT_TRACE_SCHEMA_VERSION ||
       input.mode!=='user-authored-synthetic-only' ||
       !Array.isArray(input.events) ||
       input.events.length<1 ||
       input.events.length>SYMBOLIC_PROJECT_TRACE_MAX_EVENTS ||
       !input.events.every(e=>
         isDataRecord(e,SYMBOLIC_TRACE_EVENT_KEYS) &&
         (e.decision==='ALLOW'||e.decision==='DENY') &&
         (e.effect==='NONE'||e.effect==='READ'||e.effect==='WRITE') &&
         ['ownerAuthorized','scopeAuthorized','leaseFresh','secretLogged']
           .every(k=>typeof e[k]==='boolean')))
      symbolicShapeError();
    const descriptor=inspectProjectAdapter(input.descriptor);
    // Recreate primitive-only records before reusing the pure existing trace
    // audit. Do not pass user-defined prototypes or original mutable objects.
    const records=input.events.map(e=>({
      decision:e.decision,effect:e.effect,
      ownerAuthorized:e.ownerAuthorized,scopeAuthorized:e.scopeAuthorized,
      leaseFresh:e.leaseFresh,secretLogged:e.secretLogged
    }));
    const native=auditRecords(records);
    if(!['PASS','FAIL'].includes(native.status) ||
       native.checked!==records.length ||
       !Array.isArray(native.failures) ||
       native.failureCount!==native.failures.length ||
       native.failures.some(f=>
         !Number.isSafeInteger(f.event) || f.event<1 ||
         f.event>records.length || !SYMBOLIC_TRACE_ALLOWED_RULES.has(f.rule)))
      symbolicShapeError();
    const findings=native.failures.map(({event,rule})=>({event,rule}));
    const checks=records.map((event,i)=>{
      const at=i+1;
      const ruleCodes=findings.filter(f=>f.event===at).map(f=>f.rule);
      const symbolicOutcome=event.decision==='DENY'
        ? event.effect==='NONE'
          ? 'DENIAL_WITHOUT_EFFECT'
          : 'DENIED_EFFECT_OBSERVED'
        : event.effect==='NONE'
          ? 'NO_EFFECT_OBSERVED'
          : 'ALLOW_WITH_SYMBOLIC_EFFECT';
      return {event:at,checkStatus:ruleCodes.length?'FAIL':'PASS',
        symbolicOutcome,ruleCodes};
    });
    return {
      status:native.status,
      profile:'user-authored-symbolic-project-trace-v1',
      traceSchemaVersion:SYMBOLIC_PROJECT_TRACE_SCHEMA_VERSION,
      adapterSchemaVersion:descriptor.adapterSchemaVersion,
      transport:descriptor.transport,
      protocolVersion:descriptor.protocolVersion,
      descriptorEvidence:'DESCRIPTOR_VALIDATED',
      traceEvidence:'USER_AUTHORED_SYNTHETIC_TRACE_EVALUATED',
      traceOrigin:'USER_AUTHORED_SYMBOLIC_ONLY',
      fixedFixtureControls:'NOT_RUN',
      stagingEvidence:'FIRST_PARTY_STAGING_NOT_ATTEMPTED',
      targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
      operatorEvidence:'OPERATOR_NOT_VERIFIED',
      readinessStatus:'REAL_TARGET_NOT_AUTHORIZED',
      authorizationStatus:'REAL_TARGET_EXECUTION_NOT_AUTHORIZED',
      connectionStatus:'NOT_ATTEMPTED',
      executionEnabled:false,
      projectConnectionAuthorized:false,
      externalTargetContacted:false,
      operatorVerified:false,
      recordsAreRealMcpObservations:false,
      recordsChecked:records.length,
      checks,
      failureCount:findings.length,
      findingsTruncated:false,
      findings
    };
  }catch{
    symbolicShapeError();
  }
}


/**
 * M4-B9-C: exact expectations for a *fictional* symbolic trace. This does not
 * alter the older adapter-synthetic-trace v1 semantics. CI may PASS when an
 * expected, explicitly enumerated synthetic violation is detected, but the
 * observed safety status remains FAIL and no real target is authorized.
 */
export const SYMBOLIC_TRACE_EXPECTATION_SCHEMA_VERSION=1;
const EXPECTATION_RULE_ORDER=Object.freeze([
  'FLAGGED_SECRET_IN_AUDIT_LOG',
  'DENIED_ACTION_HAD_EFFECT',
  'EFFECT_WITHOUT_AUTHORIZATION',
  'EFFECT_WITHOUT_FRESH_LEASE'
]);
const EXPECTATION_RULE_INDEX=new Map(EXPECTATION_RULE_ORDER.map((rule,i)=>[rule,i]));
const expectationInvalid=()=>{throw new TypeError('INVALID_SYMBOLIC_TRACE_EXPECTATIONS');};
function exactDenseArray(a,max){
  if(!Array.isArray(a) || a.length<1 || a.length>max ||
     Object.getPrototypeOf(a)!==Array.prototype) return false;
  const d=Object.getOwnPropertyDescriptors(a);
  if(Reflect.ownKeys(d).length!==a.length+1) return false;
  return Array.from({length:a.length},(_,i)=>
    Object.hasOwn(d,String(i)) && Object.hasOwn(d[String(i)],'value'))
    .every(Boolean);
}
const orderedRuleCodes=codes=>{
  if(!Array.isArray(codes) || codes.length>EXPECTATION_RULE_ORDER.length ||
     Object.getPrototypeOf(codes)!==Array.prototype) return false;
  const desc=Object.getOwnPropertyDescriptors(codes);
  if(Reflect.ownKeys(desc).length!==codes.length+1) return false;
  let last=-1;
  for(let i=0;i<codes.length;i++){
    if(!Object.hasOwn(desc,String(i)) ||
       !Object.hasOwn(desc[String(i)],'value')) return false;
    const rule=desc[String(i)].value;
    const index=EXPECTATION_RULE_INDEX.get(rule);
    if(index===undefined || index<=last) return false;
    last=index;
  }
  return true;
};

/**
 * Input shape:
 * {expectationSchemaVersion:1,mode:'synthetic-expectations-only',
 *  trace:<exact existing symbolic v1 trace>,
 *  expectedStatus:'PASS'|'FAIL',
 *  expected:[{event:1,ruleCodes:[...fixed codes]}, ... one per event]}
 *
 * Exact expectation equality applies to every ordinal event and every rule;
 * no partial matches, wildcards, sets, duplicate rule labels, or default
 * expectations. The output deliberately keeps OBSERVATION and CI MATCH apart.
 */
export function auditSymbolicTraceExpectations(input){
  try{
    if(!plainFiniteTree(input) ||
       !isDataRecord(input,[
         'expectationSchemaVersion','mode','trace','expectedStatus','expected'
       ]) ||
       input.expectationSchemaVersion!==SYMBOLIC_TRACE_EXPECTATION_SCHEMA_VERSION ||
       input.mode!=='synthetic-expectations-only' ||
       !['PASS','FAIL'].includes(input.expectedStatus) ||
       !isDataRecord(input.trace,[
         'traceSchemaVersion','mode','descriptor','events'
       ]) ||
       !exactDenseArray(input.trace.events,SYMBOLIC_PROJECT_TRACE_MAX_EVENTS) ||
       !exactDenseArray(input.expected,SYMBOLIC_PROJECT_TRACE_MAX_EVENTS) ||
       input.expected.length!==input.trace.events.length ||
       !input.expected.every((e,i)=>
         isDataRecord(e,['event','ruleCodes']) &&
         e.event===i+1 && orderedRuleCodes(e.ruleCodes)))
      expectationInvalid();

    const expectedFailureCount=input.expected.reduce(
      (n,e)=>n+e.ruleCodes.length,0
    );
    // An intentional expected violation must name one or more exact rules,
    // while an expected safety PASS cannot silently accept a violation.
    if((input.expectedStatus==='PASS') !== (expectedFailureCount===0))
      expectationInvalid();

    const observed=auditSymbolicProjectTrace(input.trace);
    if(observed.checks.length!==input.expected.length ||
       observed.failureCount!==observed.findings.length ||
       observed.findingsTruncated) expectationInvalid();

    const mismatches=[];
    for(let i=0;i<input.expected.length;i++){
      const actual=observed.checks[i].ruleCodes;
      const expected=input.expected[i].ruleCodes;
      // Order fixed by the reviewed checker, but equality must be exact.
      if(actual.length!==expected.length ||
         actual.some((code,j)=>code!==expected[j]))
        mismatches.push({event:i+1,rule:'SYMBOLIC_EXPECTATION_MISMATCH'});
    }
    if(observed.status!==input.expectedStatus)
      mismatches.push({event:0,rule:'SYMBOLIC_STATUS_EXPECTATION_MISMATCH'});

    const match=mismatches.length===0;
    return {
      status:match?'PASS':'FAIL', // this is only a CI EXPECTATION verdict
      profile:'offline-symbolic-trace-expectations-v1',
      expectationSchemaVersion:SYMBOLIC_TRACE_EXPECTATION_SCHEMA_VERSION,
      reportMeaning:'EXACT_SYNTHETIC_EXPECTATION_MATCH_ONLY',
      expectedSafetyStatus:input.expectedStatus,
      observedSafetyStatus:observed.status,
      expectationStatus:match?'MATCH':'MISMATCH',
      expectationOutcome:input.expectedStatus==='FAIL'
        ? 'VIOLATION_DETECTED_AS_EXPECTED'
        : 'NO_VIOLATIONS_EXPECTED',
      // Preserve the fact that the observed synthetic violations occurred
      // even if the outer CI matcher returns PASS.
      observedFailureCount:observed.failureCount,
      observedFindings:observed.findings.map(f=>({
        event:f.event,rule:f.rule
      })),
      checked:observed.recordsChecked,
      checks:observed.checks.map(c=>({
        event:c.event,
        observedSafetyStatus:c.checkStatus,
        symbolicOutcome:c.symbolicOutcome,
        observedRuleCodes:[...c.ruleCodes],
        expectationStatus:mismatches.some(m=>m.event===c.event)
          ? 'MISMATCH':'MATCH'
      })),
      failureCount:mismatches.length,
      findingsTruncated:false,
      findings:mismatches,
      // Explicitly inherit the non-authority boundary from the inert trace.
      descriptorEvidence:observed.descriptorEvidence,
      traceEvidence:observed.traceEvidence,
      traceOrigin:observed.traceOrigin,
      fixedFixtureControls:'NOT_RUN',
      targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
      operatorEvidence:'OPERATOR_NOT_VERIFIED',
      readinessStatus:'REAL_TARGET_NOT_AUTHORIZED',
      authorizationStatus:'REAL_TARGET_EXECUTION_NOT_AUTHORIZED',
      connectionStatus:'NOT_ATTEMPTED',
      executionEnabled:false,
      projectConnectionAuthorized:false,
      externalTargetContacted:false,
      operatorVerified:false,
      recordsAreRealMcpObservations:false
    };
  }catch{
    expectationInvalid();
  }
}


/**
 * M6-A: one local-file developer workflow. It validates only the static,
 * validate-only descriptor and evaluates code-owned FICTIONAL controls.
 * It never dispatches any MCP request, launches the supplied command or
 * resolves/connects to the supplied endpoint. PASS ≠ a safe real project.
 */
export const OFFLINE_ADAPTER_QUICKSTART_VERSION=1;
const QUICKSTART_CASE_EXPLANATIONS=Object.freeze({
  'permission-denial':'Fictional owner mismatch is denied without an effect.',
  'replay-denial':'Fictional repeated grant is denied without an effect.',
  'tool-escalation-denial':'Fictional unknown tool is denied without an effect.',
  'denied-effect-negative':'An intentionally broken fictional denial is detected by the control.',
  'clean-trace':'A fictional clean trace passes the selected contract checks.'
});
const QUICKSTART_NEXT_ACTIONS=Object.freeze([
  Object.freeze({order:1,code:'DESCRIPTOR_SHAPE_REVIEWED',
    explanation:'Review the inert local descriptor. No project server was contacted.'}),
  Object.freeze({order:2,code:'FICTIONAL_CONTROLS_ONLY',
    explanation:'Read the five fictional case results. They are not findings about your project.'}),
  Object.freeze({order:3,code:'OPTIONAL_SYMBOLIC_TRACE',
    explanation:'Use adapter-synthetic-trace with fabricated boolean-only events for offline assertions.'}),
  Object.freeze({order:4,code:'REAL_TARGET_APPROVAL_NOT_GRANTED',
    explanation:'Real MCP testing requires separate verified ownership, independent review and explicit approval.'})
]);
export function previewOfflineAdapterQuickstart(config){
  // The legacy descriptor checker validates named fields, whereas this new
  // entrypoint also rejects symbols, accessors, cycles and foreign prototypes.
  if(!plainFiniteTree(config)) throw new TypeError('INVALID_OFFLINE_QUICKSTART_DESCRIPTOR');
  const descriptor=previewProjectOnboarding(config);
  // This object is code-authored, never user-selected or retrieved.
  const fictional=auditOfflineProjectFixtureBundle({
    bundleSchemaVersion:OFFLINE_FIXTURE_BUNDLE_SCHEMA_VERSION,
    mode:'offline-fictional-only',
    descriptor:config,
    checks:OFFLINE_FIXTURE_CASES.map(caseId=>({caseId}))
  });
  const valid=descriptor.status==='PASS' &&
    fictional.status==='PASS' &&
    fictional.checks.length===OFFLINE_FIXTURE_CASES.length &&
    fictional.checks.every((c,i)=>c.caseId===OFFLINE_FIXTURE_CASES[i] &&
      c.expectationMet===true && c.checkStatus==='PASS');
  const findings=valid?[]:[{rule:'OFFLINE_QUICKSTART_CONTROL_MISMATCH'}];
  return {
    status:valid?'PASS':'FAIL',
    profile:'offline-adapter-quickstart-v1',
    quickstartSchemaVersion:OFFLINE_ADAPTER_QUICKSTART_VERSION,
    adapterSchemaVersion:descriptor.adapterSchemaVersion,
    transport:descriptor.transport,
    protocolVersion:descriptor.protocolVersion,
    descriptorEvidence:'DESCRIPTOR_SHAPE_ONLY',
    fictionalControlEvidence:'BUILTIN_FICTIONAL_CASES_ONLY',
    targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
    operatorEvidence:'OPERATOR_NOT_VERIFIED',
    readinessStatus:'REAL_TARGET_NOT_AUTHORIZED',
    authorizationStatus:'REAL_TARGET_EXECUTION_NOT_AUTHORIZED',
    connectionStatus:'NOT_ATTEMPTED',
    executionEnabled:false,
    projectConnectionAuthorized:false,
    externalTargetContacted:false,
    operatorVerified:false,
    fixturesAreProjectSpecific:false,
    projectSafetyAssessed:false,
    securityCertified:false,
    checked:fictional.checks.length,
    controls:fictional.checks.map(c=>({
      caseId:c.caseId,
      controlStatus:c.checkStatus,
      expectedRule:c.expectedControl,
      fictionalObservedStatus:c.observedStatus,
      explanation:QUICKSTART_CASE_EXPLANATIONS[c.caseId]
    })),
    interpretation:'PASS_MEANS_DESCRIPTOR_AND_FIXED_FICTIONAL_CONTROLS_ONLY',
    nextActions:QUICKSTART_NEXT_ACTIONS.map(v=>({...v})),
    failureCount:findings.length,
    findingsTruncated:false,
    findings
  };
}


/**
 * M6-B: a portable, source-authored starter KIT, not a setup executor.
 * The sole caller-controlled input is the fixed stdio|streamable-http enum.
 * This returns inert JSON example data and literal command arguments only;
 * it never writes a file, contacts a URL, starts a process or scans a project.
 */
export const OFFLINE_ADOPTER_KIT_SCHEMA_VERSION=1;
const KIT_COMMANDS=Object.freeze([
  Object.freeze({order:1,code:'SAVE_FICTIONAL_DESCRIPTOR',
    filename:'fictional-descriptor.json',sourceField:'starterDescriptor'}),
  Object.freeze({order:2,code:'REVIEW_DESCRIPTOR_AND_FICTIONAL_CONTROLS',
    command:'adapter-quickstart',filename:'fictional-descriptor.json',
    expectedExitCode:0}),
  Object.freeze({order:3,code:'SAVE_CLEAN_SYMBOLIC_ASSERTION',
    filename:'fictional-clean-ci.json',sourceField:'cleanExpectation'}),
  Object.freeze({order:4,code:'RUN_CLEAN_SYMBOLIC_CI',
    command:'adapter-trace-expect',filename:'fictional-clean-ci.json',
    expectedExitCode:0}),
  Object.freeze({order:5,code:'SAVE_EXPECTED_VIOLATION_ASSERTION',
    filename:'fictional-negative-ci.json',sourceField:'expectedViolation'}),
  Object.freeze({order:6,code:'RUN_EXPECTED_VIOLATION_CI',
    command:'adapter-trace-expect',filename:'fictional-negative-ci.json',
    expectedExitCode:0}),
  Object.freeze({order:7,code:'RUN_PORTABLE_FIXED_SMOKE_SEPARATELY',
    codeOnly:'node examples/offline-ci-check.mjs',
    expectedExitCode:0})
]);
function fixedKitExpectation(descriptor,effect,expectedStatus,rules){
  return {
    expectationSchemaVersion:1,
    mode:'synthetic-expectations-only',
    trace:{
      traceSchemaVersion:1,
      mode:'user-authored-synthetic-only',
      descriptor,
      events:[{
        decision:'DENY',effect,ownerAuthorized:false,
        scopeAuthorized:false,leaseFresh:false,secretLogged:false
      }]
    },
    expectedStatus,
    expected:[{event:1,ruleCodes:[...rules]}]
  };
}
export function createOfflineAdopterKit(transport){
  const template=createOfflineAdapterTemplate(transport);
  const descriptor=template.template;
  const quickstart=previewOfflineAdapterQuickstart(descriptor);
  const clean=fixedKitExpectation(descriptor,'NONE','PASS',[]);
  const expectedViolation=fixedKitExpectation(descriptor,'WRITE','FAIL',
    ['DENIED_ACTION_HAD_EFFECT']);
  const cleanResult=auditSymbolicTraceExpectations(clean);
  const negativeResult=auditSymbolicTraceExpectations(expectedViolation);
  if(quickstart.status!=='PASS' || quickstart.checked!==5 ||
     quickstart.projectSafetyAssessed!==false ||
     cleanResult.status!=='PASS' || cleanResult.observedSafetyStatus!=='PASS' ||
     cleanResult.expectationStatus!=='MATCH' ||
     negativeResult.status!=='PASS' || negativeResult.observedSafetyStatus!=='FAIL' ||
     negativeResult.expectationStatus!=='MATCH' ||
     negativeResult.observedFailureCount!==1 ||
     negativeResult.observedFindings[0]?.rule!=='DENIED_ACTION_HAD_EFFECT')
    throw new TypeError('OFFLINE_KIT_INTERNAL_CONTROL_MISMATCH');
  return {
    status:'PASS',
    profile:'guided-fictional-offline-adopter-kit-v1',
    kitSchemaVersion:OFFLINE_ADOPTER_KIT_SCHEMA_VERSION,
    transport,
    descriptorEvidence:'FICTIONAL_TEMPLATE_AND_SHAPE_VALIDATED',
    fictionalControlEvidence:'FIVE_CODE_OWNED_CONTROLS_MATCHED',
    syntheticCiEvidence:'TWO_EXACT_FICTIONAL_MATCHES_ONLY',
    starterDescriptor:descriptor,
    cleanExpectation:clean,
    expectedViolation,
    expectedResults:{
      quickstart:{exitCode:0,shapeStatus:'PASS',fictionalControlsMatched:5,
        projectSafetyAssessed:false},
      cleanCi:{exitCode:0,observedSafetyStatus:'PASS',expectationStatus:'MATCH'},
      expectedViolationCi:{exitCode:0,observedSafetyStatus:'FAIL',
        expectationStatus:'MATCH',observedRule:'DENIED_ACTION_HAD_EFFECT'}
    },
    plan:KIT_COMMANDS.map(step=>({...step})),
    humanSummary:[
      'This kit contains only fixed fictional examples, not your project configuration.',
      'Quickstart PASS validates descriptor syntax and five built-in fictional controls only.',
      'Expected violation CI exit 0 still means the fictional observed safety status is FAIL.',
      'Save the three reviewed JSON fields locally before executing their fixed offline checks.',
      'Live MCP connections, user processes, credentials and release permissions remain unavailable.'
    ],
    interpretation:'FICTIONAL_STARTER_KIT_NOT_PROJECT_ASSESSMENT',
    targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
    operatorEvidence:'OPERATOR_NOT_VERIFIED',
    authorizationStatus:'REAL_TARGET_EXECUTION_NOT_AUTHORIZED',
    connectionStatus:'NOT_ATTEMPTED',
    executionEnabled:false,
    projectConnectionAuthorized:false,
    externalTargetContacted:false,
    operatorVerified:false,
    projectSafetyAssessed:false,
    fixturesAreProjectSpecific:false,
    securityCertified:false,
    releaseAuthorized:false,
    failureCount:0,findingsTruncated:false,findings:[]
  };
}


/**
 * M6-C: comparison of a locally exported, wholly FICTIONAL kit to the
 * immutable two-selector source-owned schema, including the CLI wrapper.
 * This code does NOT validate report provenance or any real MCP system.
 */
export const OFFLINE_KIT_VERIFIER_SCHEMA_VERSION=1;
function exactCanonicalKitTree(actual,reference,budget={left:1200},depth=0,path=new WeakSet()){
  if(--budget.left<0 || depth>16) return false;
  if(reference===null || typeof reference!=='object')
    return Object.is(actual,reference);
  if(!actual || typeof actual!=='object' ||
     Array.isArray(actual)!==Array.isArray(reference) ||
     Object.getPrototypeOf(actual)!==
       (Array.isArray(reference)?Array.prototype:Object.prototype) ||
     path.has(actual)) return false;
  const actualProps=Object.getOwnPropertyDescriptors(actual);
  const referenceProps=Object.getOwnPropertyDescriptors(reference);
  const actualKeys=Reflect.ownKeys(actualProps);
  const referenceKeys=Reflect.ownKeys(referenceProps);
  if(actualKeys.length!==referenceKeys.length) return false;
  for(const key of actualKeys){
    if(typeof key!=='string' || !Object.hasOwn(referenceProps,key) ||
       !Object.hasOwn(actualProps[key],'value')) return false;
  }
  path.add(actual);
  for(const key of referenceKeys){
    if(!exactCanonicalKitTree(actualProps[key].value,referenceProps[key].value,
      budget,depth+1,path)){
      path.delete(actual);
      return false;
    }
  }
  path.delete(actual);
  return true;
}
function invalidExportedKit(){
  throw new TypeError('INVALID_OFFLINE_EXPORTED_KIT');
}
export function verifyOfflineAdopterKit(input){
  // Do not read a caller-controlled getter, URL, command, identity or key.
  try{
    if(!input || Array.isArray(input) ||
       Object.getPrototypeOf(input)!==Object.prototype)
      invalidExportedKit();
    const descriptor=Object.getOwnPropertyDescriptor(input,'transport');
    if(!descriptor || !Object.hasOwn(descriptor,'value') ||
       !ADAPTER_TRANSPORTS.includes(descriptor.value)) invalidExportedKit();
    const baseline=buildCliReport('adapter-kit',
      createOfflineAdopterKit(descriptor.value));
    // Strictly accept the complete, serialized CLI JSON-v1 report, not a
    // trust-me PASS flag, trimmed config, arbitrary trace or copied logs.
    if(!exactCanonicalKitTree(input,baseline)) invalidExportedKit();

    const quick=previewOfflineAdapterQuickstart(baseline.starterDescriptor);
    const clean=auditSymbolicTraceExpectations(baseline.cleanExpectation);
    const negative=auditSymbolicTraceExpectations(baseline.expectedViolation);
    const checks=[
      {
        code:'FICTIONAL_DESCRIPTOR_AND_FIXED_CONTROLS',
        matched:quick.status==='PASS' && quick.checked===5 &&
          quick.controls.length===5 &&
          quick.controls[3].fictionalObservedStatus==='FAIL' &&
          quick.controls[3].controlStatus==='PASS' &&
          quick.projectSafetyAssessed===false,
        observedSafetyStatus:'REAL_PROJECT_NOT_ASSESSED',
        fictionalControlsMatched:quick.controls.filter(
          c=>c.controlStatus==='PASS').length
      },
      {
        code:'CLEAN_SYMBOLIC_EXPECTATION',
        matched:clean.status==='PASS' &&
          clean.observedSafetyStatus==='PASS' &&
          clean.expectationStatus==='MATCH' &&
          clean.observedFailureCount===0,
        observedSafetyStatus:clean.observedSafetyStatus,
        expectationStatus:clean.expectationStatus
      },
      {
        code:'EXPECTED_SYMBOLIC_VIOLATION_DETECTED',
        matched:negative.status==='PASS' &&
          negative.observedSafetyStatus==='FAIL' &&
          negative.expectationStatus==='MATCH' &&
          negative.observedFailureCount===1 &&
          negative.observedFindings.length===1 &&
          negative.observedFindings[0].rule==='DENIED_ACTION_HAD_EFFECT',
        observedSafetyStatus:negative.observedSafetyStatus,
        expectationStatus:negative.expectationStatus,
        observedRule:'DENIED_ACTION_HAD_EFFECT'
      }
    ];
    const findings=checks.filter(c=>!c.matched)
      .map(c=>({rule:'OFFLINE_KIT_INTERNAL_CONTROL_MISMATCH',
        check:c.code}));
    return {
      status:findings.length===0?'PASS':'FAIL',
      profile:'offline-exported-fictional-kit-verification-v1',
      verificationSchemaVersion:OFFLINE_KIT_VERIFIER_SCHEMA_VERSION,
      kitSchemaVersion:OFFLINE_ADOPTER_KIT_SCHEMA_VERSION,
      transport:descriptor.value,
      sourceEvidence:'SOURCE_OWNED_KIT_SHAPE_AND_FIXED_CONTROLS_ONLY',
      interpretation:'CI_MATCH_NOT_INDEPENDENT_PROVENANCE_OR_PROJECT_SECURITY',
      checked:checks.length,checks,
      targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
      operatorEvidence:'OPERATOR_NOT_VERIFIED',
      authorizationStatus:'REAL_TARGET_EXECUTION_NOT_AUTHORIZED',
      connectionStatus:'NOT_ATTEMPTED',
      executionEnabled:false,
      externalTargetContacted:false,
      projectConnectionAuthorized:false,
      operatorVerified:false,
      projectSafetyAssessed:false,
      fixturesAreProjectSpecific:false,
      independentOriginVerified:false,
      securityCertified:false,
      releaseAuthorized:false,
      failureCount:findings.length,
      findingsTruncated:false,findings
    };
  }catch{invalidExportedKit();}
}
