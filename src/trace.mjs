/* Synthetic trace checker, tightened primitive and key validation. */
import { parseStrictJson } from './strict-json.mjs';
const KEYS = new Set(['decision', 'effect', 'ownerAuthorized', 'scopeAuthorized', 'leaseFresh', 'secretLogged']);
const MAX_REPORT = 200;
export function auditRecords(records) {
  if (!Array.isArray(records) || records.length > 10000) throw new Error('INVALID_EVENT_COLLECTION');
  const failures=[];
  let failureCount=0;
  function report(event, rule) {
    failureCount++;
    if (failures.length < MAX_REPORT) failures.push({event,rule});
  }
  if (!records.length) report(0, 'EMPTY_EVENT_SET');
  records.forEach((r, index) => {
    const event = index+1;
    if (!r || typeof r !== 'object' || Array.isArray(r) ||
        !['ALLOW','DENY'].includes(r.decision) || !['NONE','READ','WRITE'].includes(r.effect)) {
      report(event, 'INVALID_EVENT'); return;
    }
    if (Object.keys(r).some(key => !KEYS.has(key)) ||
        ['ownerAuthorized','scopeAuthorized','leaseFresh','secretLogged'].some(k => r[k] !== undefined && typeof r[k] !== 'boolean')) {
      report(event, 'INVALID_FIELDS');
    }
    if (r.secretLogged === true) report(event, 'FLAGGED_SECRET_IN_AUDIT_LOG');
    else if (r.secretLogged !== false) report(event, 'MISSING_LOG_SAFETY_EVIDENCE');
    if (r.decision === 'DENY' && r.effect !== 'NONE') report(event, 'DENIED_ACTION_HAD_EFFECT');
    if (r.decision === 'ALLOW' && r.effect !== 'NONE') {
      if (r.ownerAuthorized !== true || r.scopeAuthorized !== true) report(event,'EFFECT_WITHOUT_AUTHORIZATION');
      if (r.leaseFresh !== true) report(event,'EFFECT_WITHOUT_FRESH_LEASE');
    }
  });
  return { status: failureCount===0?'PASS':'FAIL', checked: records.length,
    failureCount, findingsTruncated: failureCount > failures.length, failures };
}
export function parseJsonl(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text,'utf8') > 1024*1024) throw new Error('OVERSIZED_INPUT');
  const records=[];
  text.split(/\r?\n/u).forEach((line,i) => {
    if (!line.trim()) return;
    if (line.length > 16384 || records.length === 10000) throw new Error('OVERSIZED_INPUT');
    try { records.push(parseStrictJson(line)); } catch { throw new Error('INVALID_JSON_LINE_'+(i+1)); }
  });
  if (!records.length) throw new Error('EMPTY_INPUT');
  return records;
}
