// OFFLINE synthetic test-profile validator for modern MCP version/capability errors.
// No network, no auth decisions, no real MCP transport and no auto-retry execution.
import { isDeepStrictEqual } from 'node:util';
export const UNSUPPORTED_PROTOCOL_VERSION = -32022;
export const MISSING_REQUIRED_CLIENT_CAPABILITY = -32021;
const own = (o,k) => Object.hasOwn(o,k);
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const string = (s,max=128) => typeof s==='string' && s.length>0 && s.length<=max;
const versions = v => Array.isArray(v) && v.length>0 && v.length<=16 &&
  v.every(x=>typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) && new Set(v).size===v.length;
const id = x => string(x) || Number.isSafeInteger(x);
const capabilitySet = x => record(x) && Object.keys(x).length<=32 &&
  Object.entries(x).every(([k,v])=>string(k,128) && record(v) && JSON.stringify(v).length<=2048);
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const VERSION_META_KEY = 'io.modelcontextprotocol/protocolVersion';
// Preserve the entire retry payload except the single negotiated version field.
// isDeepStrictEqual treats reordered object keys as equal; no arguments are logged.
function withoutNegotiatedVersion(params) {
  const copy = { ...params, _meta: { ...params._meta } };
  delete copy._meta[VERSION_META_KEY];
  return copy;
}
const fields = (v,names) => Object.keys(v).every(x=>names.includes(x));

export function auditModernNegotiation(input) {
  if (!record(input) || input.profile !== 'modern-2026-offline-negotiation' ||
      !fields(input,['profile','clientVersions','grantedCapabilities','steps']) ||
      !versions(input.clientVersions) || !capabilitySet(input.grantedCapabilities) ||
      !Array.isArray(input.steps) || !input.steps.length || input.steps.length>64) {
    throw new TypeError('INVALID_NEGOTIATION_FIXTURE');
  }
  let failureCount=0;
  const findings=[];
  const flag=(step,rule)=>{failureCount++;if(findings.length<200)findings.push({step,rule});};
  let pendingRetry = null;
  let pendingMethod = null; // method from the preceding unsupported-version response
  let pendingParams = null; // frozen-by-convention read-only baseline, with version omitted
  let completed = 0;
  const seenIds = new Set();
  // An invalid message cannot be skipped while preserving retry permission:
  // that would let a later unrelated exchange appear to complete the retry.
  const interruptPendingRetry = step => {
    if (pendingRetry === null) return;
    flag(step,'RETRY_INTERRUPTED_BY_INVALID_STEP');
    pendingRetry=null; pendingMethod=null; pendingParams=null;
  };
  for (let index=0;index<input.steps.length;index++) {
    const at=index+1, pair=input.steps[index];
    if (!record(pair) || !fields(pair,['request','response']) ||
        !record(pair.request) || !record(pair.response)) {
      interruptPendingRetry(at);
      flag(at,'INVALID_EXCHANGE_STEP'); continue;
    }
    const req=pair.request,res=pair.response;
    if (req.jsonrpc!=='2.0' || !id(req.id) || !string(req.method) ||
        req.method==='initialize' || req.method==='notifications/initialized' ||
        !fields(req,['jsonrpc','id','method','params']) || !record(req.params) ||
        !record(req.params._meta)) {
      interruptPendingRetry(at);
      flag(at,'INVALID_MODERN_REQUEST');continue;
    }
    const meta=req.params._meta;
    const requested=meta[VERSION_META_KEY];
    const capabilities=meta['io.modelcontextprotocol/clientCapabilities'];
    if (!string(requested,32) || !input.clientVersions.includes(requested) ||
        !capabilitySet(capabilities)) flag(at,'INVALID_PER_REQUEST_DECLARATION');
    if (capabilitySet(capabilities) && Object.entries(capabilities).some(([key,value])=>
        !own(input.grantedCapabilities,key) || !same(input.grantedCapabilities[key],value))) {
      flag(at,'UNAUTHORIZED_CAPABILITY_DECLARATION');
    }
    const key=typeof req.id+':'+String(req.id);
    if (seenIds.has(key)) flag(at,'REUSED_REQUEST_ID');
    seenIds.add(key);
    const wasRetry = pendingRetry !== null;
    if (wasRetry) {
      if (!pendingRetry.includes(requested)) flag(at,'RETRY_VERSION_NOT_MUTUALLY_SUPPORTED');
      if (req.method!==pendingMethod) flag(at,'RETRY_METHOD_CHANGED');
      if (!isDeepStrictEqual(withoutNegotiatedVersion(req.params), pendingParams)) {
        flag(at,'RETRY_PARAMS_CHANGED');
      }
      pendingRetry=null; pendingMethod=null; pendingParams=null;
    }
    if (res.jsonrpc!=='2.0' || !own(res,'id') ||
        typeof res.id!==typeof req.id || res.id!==req.id ||
        own(res,'result')===own(res,'error') ||
        !fields(res,['jsonrpc','id','result','error'])) {
      flag(at,'INVALID_NEGOTIATION_RESPONSE');continue;
    }
    if (own(res,'result')) { completed++; continue; }
    const error=res.error;
    if (!record(error) || !Number.isSafeInteger(error.code) ||
        !string(error.message,512) || !fields(error,['code','message','data'])) {
      flag(at,'INVALID_PROTOCOL_ERROR');continue;
    }
    if (error.code===UNSUPPORTED_PROTOCOL_VERSION) {
      // The strict synthetic profile permits one retry per unsupported-version
      // error, not a chain of automatic renegotiations after a failed retry.
      if (wasRetry) flag(at,'REPEATED_VERSION_NEGOTIATION');
      const data=error.data;
      if (!record(data) || !fields(data,['requested','supported']) ||
          !versions(data.supported) || data.requested!==requested ||
          data.supported.includes(requested)) {
        flag(at,'INVALID_UNSUPPORTED_VERSION_EVIDENCE');continue;
      }
      // Do not arm another pending retry after a completed retry attempt.
      if (wasRetry) continue;
      const overlap=data.supported.filter(v=>input.clientVersions.includes(v));
      if (overlap.length>0) {
        pendingRetry=overlap; pendingMethod=req.method;
        pendingParams=withoutNegotiatedVersion(req.params);
      } else if (index<input.steps.length-1) {
        flag(at,'RETRY_AFTER_NO_COMMON_VERSION');
      }
    } else if (error.code===MISSING_REQUIRED_CLIENT_CAPABILITY) {
      const data=error.data;
      if (!record(data) || !fields(data,['requiredCapabilities']) ||
          !capabilitySet(data.requiredCapabilities) ||
          Object.keys(data.requiredCapabilities).length===0 ||
          Object.entries(data.requiredCapabilities).every(([k,v])=>
            own(capabilities,k) && same(capabilities[k],v))) {
        flag(at,'INVALID_REQUIRED_CAPABILITY_EVIDENCE');
      }
    }
  }
  if (pendingRetry!==null) flag(0,'MISSING_MUTUAL_VERSION_RETRY');
  return {
    status:failureCount===0?'PASS':'FAIL', profile:input.profile,
    stepsChecked:input.steps.length, completedExchanges:completed,
    failureCount, findingsTruncated:failureCount>findings.length, findings
  };
}
