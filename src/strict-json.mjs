/**
 * Reject duplicate JSON object keys before JSON.parse erases the evidence.
 * Parsing below runs ONLY after a successful JSON.parse syntax check, and
 * never emits object names, keys or payloads in errors.
 */
export function parseStrictJson(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > 1024*1024)
    throw new Error('INVALID_INPUT_SIZE');
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
    // JSON.parse already checked scalar grammar, including escapes and numbers.
    while (i < source.length && !/[\s,}\]]/u.test(source[i])) i++;
  }
  value(0); skip();
  if (i !== source.length) throw new Error('INVALID_JSON');
  return parsed;
}
