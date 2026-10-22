// Independent, OFFLINE and restrictive synthetic MCP protocol-era transcript checks.
// Not a network transport, SDK implementation or conformance certification.
const own = (obj, key) => Object.hasOwn(obj,key);
const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ident = value => (typeof value === 'string' && value.length > 0 && value.length <= 128) ||
  (typeof value === 'number' && Number.isSafeInteger(value));
const identKey = value => typeof value + ':' + String(value);
const isIdentity = x => obj(x) && typeof x.name === 'string' && x.name.length > 0 &&
  x.name.length <= 128 && typeof x.version === 'string' && x.version.length > 0 && x.version.length <= 128;
const VERSION = '2026-07-28';
const LEGACY = new Set(['2025-11-25','2025-06-18','2025-03-26','2024-11-05']);
const LIMIT = 256;

export function auditMcpEraTranscript(input) {
  if (!obj(input) || !['modern','legacy'].includes(input.era) ||
      !Array.isArray(input.events) || !input.events.length || input.events.length > LIMIT ||
      Object.keys(input).some(k => !['era','events'].includes(k))) {
    throw new TypeError('INVALID_MCP_ERA_TRANSCRIPT');
  }
  const errors = [];
  let failureCount = 0;
  const fail = (index, rule) => {
    ++failureCount;
    if (errors.length < 200) errors.push({index,rule});
  };
  const waiting = new Map();
  const used = new Set();
  let phase = 'START';
  let version = null;
  let sawInitialize = false, sawDiscovery = false, operations = 0;
  const modern = input.era === 'modern';

  for (const [i,event] of input.events.entries()) {
    const at = i + 1;
    if (!obj(event) || !['client','server'].includes(event.from) || !obj(event.message) ||
        Object.keys(event).some(k => !['from','message'].includes(k))) {
      fail(at,'INVALID_EVENT'); continue;
    }
    const msg = event.message;
    if (msg.jsonrpc !== '2.0') {fail(at,'INVALID_JSONRPC_VERSION');continue;}
    if (event.from === 'client') {
      if (typeof msg.method !== 'string' || msg.method.length === 0 || msg.method.length > 128 ||
          Object.keys(msg).some(k=>!['jsonrpc','id','method','params'].includes(k)) ||
          (own(msg,'params') && !obj(msg.params))) {
        fail(at,'INVALID_CLIENT_MESSAGE'); continue;
      }
      const request = own(msg,'id');
      if (request && !ident(msg.id)) {fail(at,'INVALID_REQUEST_ID');continue;}
      if (request) {
        const key = identKey(msg.id);
        if (used.has(key)) fail(at,'DUPLICATE_REQUEST_ID');
        else { used.add(key); waiting.set(key,{method:msg.method,at}); }
      }
      if (modern) {
        if (msg.method === 'initialize' || msg.method === 'notifications/initialized') {
          fail(at,'LEGACY_HANDSHAKE_IN_MODERN'); continue;
        }
        if (request) {
          const meta = msg.params?._meta;
          if (!obj(meta) || meta['io.modelcontextprotocol/protocolVersion'] !== VERSION ||
              !obj(meta['io.modelcontextprotocol/clientCapabilities'])) {
            fail(at,'MISSING_PER_REQUEST_META');
          } else if (own(meta,'io.modelcontextprotocol/clientInfo') &&
                     !isIdentity(meta['io.modelcontextprotocol/clientInfo'])) {
            fail(at,'INVALID_CLIENT_INFO');
          }
        }
        if (msg.method === 'server/discover') {
          sawDiscovery = true;
          if (!request) fail(at,'DISCOVERY_MUST_BE_REQUEST');
        } else operations++;
      } else {
        if (msg.method === 'initialize') {
          if (!request || phase !== 'START' || sawInitialize) {
            fail(at,'INVALID_LEGACY_INITIALIZE_SEQUENCE');
          } else {
            const par=msg.params;
            if (!obj(par) || !LEGACY.has(par.protocolVersion) || !obj(par.capabilities) ||
                !isIdentity(par.clientInfo)) fail(at,'INVALID_LEGACY_INITIALIZE');
            version=par?.protocolVersion;
            sawInitialize=true;
            phase='INITIALIZING';
          }
        } else if (msg.method === 'notifications/initialized') {
          if (request || phase !== 'INIT_REPLIED') fail(at,'INITIALIZED_OUT_OF_ORDER');
          else phase='READY';
        } else if (msg.method === 'server/discover') {
          fail(at,'MODERN_DISCOVERY_IN_LEGACY');
        } else if (msg.method !== 'ping' && phase !== 'READY') {
          fail(at,'LEGACY_OPERATION_BEFORE_INITIALIZED');
        } else if (msg.method !== 'ping') operations++;
      }
    } else {
      if (own(msg,'method') || !own(msg,'id') || !ident(msg.id) ||
          own(msg,'result') === own(msg,'error') ||
          Object.keys(msg).some(k => !['jsonrpc','id','result','error'].includes(k))) {
        fail(at,'INVALID_SERVER_RESPONSE');continue;
      }
      const key=identKey(msg.id);
      if (!waiting.has(key)) {fail(at,'UNMATCHED_SERVER_RESPONSE');continue;}
      const req=waiting.get(key); waiting.delete(key);
      if (own(msg,'error')) {
        if (!obj(msg.error) || !Number.isSafeInteger(msg.error.code) ||
            typeof msg.error.message !== 'string' || !msg.error.message.length || msg.error.message.length > 256) {
          fail(at,'INVALID_SERVER_ERROR');
        }
      }
      if (modern && req.method === 'server/discover' && own(msg,'result')) {
        const result=msg.result;
        if (!obj(result) || result.resultType !== 'complete' ||
            !Array.isArray(result.supportedVersions) ||
            result.supportedVersions.length < 1 || result.supportedVersions.length > 16 ||
            result.supportedVersions.some(v=>typeof v!=='string' || v.length>32) ||
            !obj(result.capabilities) ||
            !['public','private'].includes(result.cacheScope) ||
            !Number.isSafeInteger(result.ttlMs) || result.ttlMs < 0) {
          fail(at,'INVALID_MODERN_DISCOVERY_RESULT');
        }
      }
      if (!modern && req.method === 'initialize') {
        if (!own(msg,'result') || !obj(msg.result) || !LEGACY.has(msg.result.protocolVersion) ||
            !obj(msg.result.capabilities) || !isIdentity(msg.result.serverInfo) ||
            !LEGACY.has(version)) fail(at,'INVALID_LEGACY_INITIALIZE_RESULT');
        else phase='INIT_REPLIED';
      }
    }
  }
  for (const {at} of waiting.values()) fail(at,'MISSING_RESPONSE');
  if (!modern && phase !== 'READY') fail(0,'LEGACY_NOT_INITIALIZED');
  return {
    status: failureCount===0?'PASS':'FAIL',
    era:input.era, eventsChecked:input.events.length, observedOperations:operations,
    discoveryObserved:sawDiscovery, failureCount,
    findingsTruncated:failureCount>errors.length, findings:errors
  };
}
