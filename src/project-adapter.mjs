import {createHash} from 'node:crypto';
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
