/**
 * M4-B4: TEST-ONLY instrumentation of reviewed first-party mock attempt sites.
 * AsyncLocalStorage keeps concurrent tests separate. This is not OS tracing,
 * a security boundary, audit provenance, authentication, or a CLI feature.
 * Only fixed symbolic event names cross the observation seam.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
const scope=new AsyncLocalStorage();
const EVENTS=new Set(['driver-probe','stdio-spawn','http-bind','http-request']);

/** Called beside the actual first-party side-effect invocation, never by a
 * policy result constructor. No paths, payloads, ports or identities recorded.
 */
export function noteFirstPartyMockAttempt(name) {
  if(!EVENTS.has(name))throw new TypeError('INVALID_FIXED_MOCK_OBSERVATION');
  const attempts=scope.getStore();
  if(attempts)attempts.push(name);
}

/** For trusted in-repository tests only; not exposed by CLI/fixture JSON.
 * Recording is observational and cannot block or authorize a real effect.
 */
export async function observeFirstPartyMockAttempts(run) {
  if(typeof run!=='function')throw new TypeError('INVALID_MOCK_OBSERVER_TEST');
  const attempts=[];
  return scope.run(attempts,async()=>{
    const result=await run();
    return {result,attempts:Object.freeze([...attempts])};
  });
}
