/**
 * Reject duplicate JSON object keys before JSON.parse erases the evidence.
 * Parsing below runs ONLY after a successful JSON.parse syntax check, and
 * never emits object names, keys or payloads in errors.
 */
export function parseStrictJson(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > 1024*1024)
    throw new Error('INVALID_INPUT_SIZE');
  // Bound nesting BEFORE JSON.parse constructs potentially huge object graphs.
  // Literal brackets inside quoted strings do not affect this limit.
  let nesting=0,quoted=false,escaped=false;
  for(let n=0;n<source.length;n++){
    const c=source[n];
    if(quoted){
      if(escaped) escaped=false;
      else if(c==='\\') escaped=true;
      else if(c==='"') quoted=false;
    }else if(c==='"') quoted=true;
    else if(c==='{' || c==='['){
      if(++nesting>65) throw new Error('JSON_TOO_DEEP');
    }else if(c==='}' || c===']') nesting--;
  }
  const parsed = JSON.parse(source);
  let i = 0;
  function skip() { while (/\s/u.test(source[i] || '') && i < source.length) i++; }
  function stringToken() {
    const begin=i;
    i++; // initial quote
    while (i < source.length) {
      if (source[i] === '\\') {i+=2; continue;}
      if (source[i++] === '"') return source.slice(begin, i);
    }
    throw new Error('INVALID_JSON');
  }
  function value(depth) {
    if (depth > 64) throw new Error('JSON_TOO_DEEP');
    skip();
    if (source[i] === '{') {
      i++; skip();
      const keys=new Set();
      if (source[i] === '}') { i++; return; }
      for (;;) {
        skip();
        const token=stringToken();
        const key=JSON.parse(token);
        if (keys.has(key)) throw new Error('DUPLICATE_JSON_KEY');
        keys.add(key);
        skip(); i++; // colon, validated by JSON.parse above
        value(depth+1);
        skip();
        if (source[i] === '}') {i++; return;}
        i++; // comma, validated by JSON.parse above
      }
    }
    if (source[i] === '[') {
      i++; skip();
      if (source[i] === ']') {i++; return;}
      for (;;) {
        value(depth+1); skip();
        if (source[i] === ']') {i++; return;}
        i++; // comma
      }
    }
    if (source[i] === '"') { stringToken(); return; }
    // Native JSON.parse silently converts out-of-range JSON numbers to
    // Infinity, 0 after nonzero underflow, or an unsafe rounded integer.
    // Never expose those values as trustworthy policy/evidence fields.
    const begin=i;
    while(i<source.length && !/[\s,}\]]/u.test(source[i])) i++;
    const raw=source.slice(begin,i);
    if(/^-?(?:0|[1-9])/u.test(raw)){
      const number=Number(raw);
      const significand=raw.split(/[eE]/u)[0];
      if(!Number.isFinite(number) ||
         (number===0 && /[1-9]/u.test(significand)) ||
         (Number.isInteger(number) && !Number.isSafeInteger(number)))
        throw new Error('JSON_NUMBER_OUT_OF_RANGE');
    }
  }
  value(0); skip();
  if (i !== source.length) throw new Error('INVALID_JSON');
  return parsed;
}
