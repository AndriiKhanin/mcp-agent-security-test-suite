/* Synthetic trace checker; validated direct JS records never imply real MCP authority. */
import { parseStrictJson } from './strict-json.mjs';
const KEYS = new Set(['decision', 'effect', 'ownerAuthorized', 'scopeAuthorized', 'leaseFresh', 'secretLogged']);
const MAX_REPORT = 200;

/**
 * Enforce dense own-data arrays BEFORE traversal. Array.forEach skips holes:
 * a one-slot sparse trace previously yielded PASS without evaluating an event.
 * This is a direct JS API trust boundary, NOT protection from hostile Proxies.
 */
function denseEvents(records) {
  if (!Array.isArray(records) || Object.getPrototypeOf(records)!==Array.prototype ||
      records.length>10000) return false;
  const desc=Object.getOwnPropertyDescriptors(records);
  if(Reflect.ownKeys(desc).length!==records.length+1) return false;
  for(let i=0;i<records.length;i++) {
    const field=desc[String(i)];
    if(!field || !Object.hasOwn(field,'value')) return false;
  }
  return true;
}
function eventShape(event) {
  if(!event || typeof event!=='object' || Array.isArray(event) ||
     Object.getPrototypeOf(event)!==Object.prototype) return 'INVALID_EVENT';
  const desc=Object.getOwnPropertyDescriptors(event);
  for(const key of Reflect.ownKeys(desc)) {
    if(typeof key!=='string' || !KEYS.has(key) ||
       !Object.hasOwn(desc[key],'value')) return 'INVALID_FIELDS';
  }
  if(!Object.hasOwn(desc,'decision') || !Object.hasOwn(desc,'effect') ||
     !['ALLOW','DENY'].includes(desc.decision.value) ||
     !['NONE','READ','WRITE'].includes(desc.effect.value))
    return 'INVALID_EVENT';
  if(['ownerAuthorized','scopeAuthorized','leaseFresh','secretLogged']
    .some(k=>Object.hasOwn(desc,k) && desc[k].value!==undefined &&
      typeof desc[k].value!=='boolean')) return 'INVALID_FIELDS';
  return null;
}
export function auditRecords(records) {
  if(!denseEvents(records)) throw new Error('INVALID_EVENT_COLLECTION');
  const failures=[];
  let failureCount=0;
  function report(event, rule) {
    failureCount++;
    if(failures.length<MAX_REPORT) failures.push({event,rule});
  }
  if(!records.length) report(0,'EMPTY_EVENT_SET');
  records.forEach((r,index)=>{
    const event=index+1;
    const shape=eventShape(r);
    if(shape){report(event,shape);return;}
    if(r.secretLogged===true) report(event,'FLAGGED_SECRET_IN_AUDIT_LOG');
    else if(r.secretLogged!==false) report(event,'MISSING_LOG_SAFETY_EVIDENCE');
    if(r.decision==='DENY' && r.effect!=='NONE') report(event,'DENIED_ACTION_HAD_EFFECT');
    if(r.decision==='ALLOW' && r.effect!=='NONE') {
      if(r.ownerAuthorized!==true || r.scopeAuthorized!==true)
        report(event,'EFFECT_WITHOUT_AUTHORIZATION');
      if(r.leaseFresh!==true) report(event,'EFFECT_WITHOUT_FRESH_LEASE');
    }
  });
  return {status:failureCount===0?'PASS':'FAIL',checked:records.length,
    failureCount,findingsTruncated:failureCount>failures.length,failures};
}
export function parseJsonl(text) {
  if(typeof text!=='string' || Buffer.byteLength(text,'utf8')>1024*1024)
    throw new Error('OVERSIZED_INPUT');
  const records=[];
  text.split(/\r?\n/u).forEach((line,i)=>{
    if(!line.trim())return;
    if(line.length>16384 || records.length===10000)
      throw new Error('OVERSIZED_INPUT');
    try{records.push(parseStrictJson(line));}
    catch{throw new Error('INVALID_JSON_LINE_'+(i+1));}
  });
  if(!records.length)throw new Error('EMPTY_INPUT');
  return records;
}
