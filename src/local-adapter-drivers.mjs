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

const TRANSPORTS = Object.freeze(['stdio','streamable-http']);
const STATUS = 'FIRST_PARTY_MOCK_ONLY';
const PROFILE = 'universal-fixed-local-mock-drivers-v1';
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

/** No CLI arguments or target profile; tests both fixed local mock transports. */
export async function runFirstPartyAdapterSelftest() {
  const outcomes=[];
  for(const transport of TRANSPORTS) {
    const driver=createFirstPartyDriver(transport);
    try {
      await driver.connect();
      outcomes.push(await driver.probe());
    } catch {
      outcomes.push(report(transport,null));
    } finally {
      await driver.close();
    }
  }
  const failures=outcomes.filter(x=>!x.matched);
  return {
    status:failures.length?'FAIL':'PASS',
    profile:PROFILE,
    connectionStatus:STATUS,
    externalTargetContacted:false,
    transportCount:2,
    passed:outcomes.length-failures.length,
    failed:failures.length,
    failureCount:failures.length,
    findingsTruncated:false,
    findings:failures.map((x,i)=>({step:i+1,rule:x.rule})),
    outcomes
  };
}
