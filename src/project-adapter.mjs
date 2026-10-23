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
