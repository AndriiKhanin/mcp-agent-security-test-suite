// Independent, offline JSON-RPC 2.0 envelope contract checker.
// Strict testing profile, not a complete MCP implementation or network transport.
// Never invokes a method, opens a socket, runs a command or emits request payloads.
const own = (v, k) => Object.hasOwn(v, k);
// Direct-JS envelope inputs must be plain, enumerable own data records.
 // This is a structural guard, not a sandbox for hostile Proxy objects.
const record = v => {
  if (!v || typeof v !== 'object' || Array.isArray(v) ||
      Object.getPrototypeOf(v) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(v);
  return Reflect.ownKeys(descriptors).every(key =>
    typeof key === 'string' && Object.hasOwn(descriptors[key], 'value') &&
    descriptors[key].enumerable);
};
const denseMessages = value => {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      value.length > MAX_MESSAGES) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) return false;
  for (let i = 0; i < value.length; i++) {
    const slot = descriptors[String(i)];
    if (!slot || !Object.hasOwn(slot, 'value') || !slot.enumerable) return false;
  }
  return true;
};
/** M6-U/V/W: bounded JSON-shaped evidence, without reading accessors.
 * Direct JS only; not an adversarial Proxy sandbox. */
function jsonData(value, budget = { remaining: 10000, bytes: 1024 * 1024 }, depth = 0) {
  if (--budget.remaining < 0 || depth > 32) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') {
    budget.bytes -= Buffer.byteLength(value, 'utf8');
    return budget.bytes >= 0;
  }
  if (typeof value === 'number') return Number.isFinite(value) &&
    (!Number.isInteger(value) || Number.isSafeInteger(value));
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 10000) return false;
    const desc = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(desc).length !== value.length + 1) return false;
    for (let i = 0; i < value.length; i++) {
      const field = desc[String(i)];
      if (!field || !Object.hasOwn(field, 'value') || !field.enumerable ||
          !jsonData(field.value, budget, depth + 1)) return false;
    }
    return true;
  }
  if (!record(value)) return false;
  const desc = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(desc)) {
    budget.bytes -= Buffer.byteLength(key, 'utf8');
    if (budget.bytes < 0 || !jsonData(desc[key].value, budget, depth + 1)) return false;
  }
  return true;
}
const idValid = v => (typeof v === 'string' && v.length > 0 && v.length <= 128) ||
  (typeof v === 'number' && Number.isSafeInteger(v));
const idKey = v => typeof v + ':' + String(v);
const MAX_MESSAGES = 256;
const MAX_FINDINGS = 200;
const MAX_METHOD = 128;
const REQUEST_FIELDS = new Set(['jsonrpc', 'method', 'params', 'id']);
const RESPONSE_FIELDS = new Set(['jsonrpc', 'id', 'result', 'error']);

/**
 * Compare pairs of JSON-RPC 2.0 request and response envelopes, including
 * notifications and out-of-order batch replies. Use only fictional inputs.
 * Deliberately stricter than generic JSON-RPC in rejecting null ids, extension
 * top-level fields, non-integer numbers and non-object/array params.
 * This is a test profile, not a claim that those exclusions are universally
 * required by the JSON-RPC standard or MCP.
 */
export function auditJsonRpcExchange(exchange) {
  if (!record(exchange) || !denseMessages(exchange.requests) ||
      !denseMessages(exchange.responses) ||
      Object.keys(exchange).some(k => k !== 'requests' && k !== 'responses') ||
      exchange.requests.length < 1 || exchange.requests.length > MAX_MESSAGES ||
      exchange.responses.length > MAX_MESSAGES) {
    throw new TypeError('INVALID_JSONRPC_EXCHANGE');
  }
  const findings = [];
  let failureCount = 0;
  const flag = (side, index, rule) => {
    failureCount++;
    if (findings.length < MAX_FINDINGS) findings.push({ side, index, rule });
  };
  const requests = new Map();
  const seenResponses = new Set();
  for (const [i, req] of exchange.requests.entries()) {
    const at = i + 1;
    if (!record(req) || req.jsonrpc !== '2.0' ||
        typeof req.method !== 'string' || req.method.length < 1 ||
        req.method.length > MAX_METHOD || req.method.startsWith('rpc.') ||
        Object.keys(req).some(k => !REQUEST_FIELDS.has(k)) ||
        (own(req,'params') && (!record(req.params) && !Array.isArray(req.params) ||
          !jsonData(req.params)))) {
      flag('request', at, 'INVALID_REQUEST');
      continue;
    }
    if (!own(req,'id')) continue; // JSON-RPC notification: no response required/allowed.
    if (!idValid(req.id)) {
      flag('request', at, 'INVALID_REQUEST_ID');
      continue;
    }
    const key = idKey(req.id);
    if (requests.has(key)) flag('request', at, 'DUPLICATE_REQUEST_ID');
    else requests.set(key, at);
  }
  for (const [i, res] of exchange.responses.entries()) {
    const at = i + 1;
    if (!record(res) || res.jsonrpc !== '2.0' || !own(res,'id') ||
        !idValid(res.id) || Object.keys(res).some(k => !RESPONSE_FIELDS.has(k)) ||
        own(res,'result') === own(res,'error') ||
        (own(res,'result') && !jsonData(res.result)) ||
        (own(res,'error') && (!record(res.error) || !Number.isSafeInteger(res.error.code) ||
          typeof res.error.message !== 'string' || res.error.message.length < 1 ||
          res.error.message.length > 256 ||
          Object.keys(res.error).some(k => k !== 'code' && k !== 'message' && k !== 'data') ||
          (own(res.error,'data') && !jsonData(res.error.data))))) {
      flag('response', at, 'INVALID_RESPONSE');
      continue;
    }
    const key = idKey(res.id);
    if (seenResponses.has(key)) flag('response', at, 'DUPLICATE_RESPONSE_ID');
    else seenResponses.add(key);
    if (!requests.has(key)) flag('response', at, 'UNMATCHED_RESPONSE_ID');
  }
  for (const [key, at] of requests) {
    if (!seenResponses.has(key)) flag('request', at, 'MISSING_RESPONSE');
  }
  return {
    status: failureCount ? 'FAIL' : 'PASS',
    requestCount: exchange.requests.length,
    responseCount: exchange.responses.length,
    failureCount,
    findingsTruncated: failureCount > findings.length,
    findings
  };
}
