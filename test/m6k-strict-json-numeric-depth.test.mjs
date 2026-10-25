/**
 * M6-K: first-party strict JSON security boundary, literal independent oracles.
 * This is not a general JSON parser certification, OS sandbox or MCP audit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../src/strict-json.mjs';
import {parseJsonl} from '../src/trace.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=join(root,'src','cli.mjs');
function call(file,cmd='scenario'){
  return spawnSync(process.execPath,[cli,cmd,file],{
    cwd:root,shell:false,windowsHide:true,encoding:'utf8',
    timeout:15000,maxBuffer:65536
  });
}
function fixture(fn){
  const dir=mkdtempSync(join(tmpdir(),'m6k-unsafe-json-'));
  try {
    const file=join(dir,'PRIVATE_CANARY.json');
    return fn({file,write:content=>writeFileSync(file,content)});
  }finally{rmSync(dir,{recursive:true,force:true});}
}
test('M6-K: top-level positive and negative floating overflow is rejected',()=>{
  for(const literal of ['1e309','-1e309','9.99e9999','-5E+900']){
    assert.throws(()=>parseStrictJson(literal),/JSON_NUMBER_OUT_OF_RANGE/,
      literal);
  }
  assert.equal(parseStrictJson('1e308'),1e308);
});
test('M6-K: nested numeric overflow never turns into a JSON-v1 PASS',()=>{
  for(const value of ['1e309','-1E400','999e999']){
    const input='{"evidence":{"claim":['+value+']}}';
    assert.throws(()=>parseStrictJson(input),/JSON_NUMBER_OUT_OF_RANGE/);
  }
  assert.deepEqual(parseStrictJson('{"evidence":{"claim":[1e6]}}'),
    {evidence:{claim:[1000000]}});
});
test('M6-K: nonzero positive/negative underflow is rejected, exact zero remains valid',()=>{
  for(const value of ['1e-9999','-1e-9999','0.00001e-9999','-2E-900']){
    assert.throws(()=>parseStrictJson('{"value":'+value+'}'),
      /JSON_NUMBER_OUT_OF_RANGE/,value);
  }
  for(const value of ['0e999','-0.000e-9999','0.0','0','-0']){
    assert.doesNotThrow(()=>parseStrictJson('{"value":'+value+'}'),value);
  }
});
test('M6-K: unsafe rounded integer precision is never accepted as an ID or policy value',()=>{
  for(const value of [
    '9007199254740992','9007199254740993',
    '-9007199254740992','1e20','-5e30'
  ])assert.throws(()=>parseStrictJson('{"requestId":'+value+'}'),
    /JSON_NUMBER_OUT_OF_RANGE/,value);
  for(const value of [
    '9007199254740991','-9007199254740991','1.25','1e10'
  ])assert.doesNotThrow(()=>parseStrictJson('{"requestId":'+value+'}'));
});
test('M6-K: excessive valid JSON nesting is rejected before native JSON.parse',()=>{
  for(const ch of ['[','{']){
    const start=ch==='['?'[':'{"x":';
    const end=ch==='['?']':'}';
    const deep=start.repeat(10000)+'null'+end.repeat(10000);
    assert.throws(()=>parseStrictJson(deep),/JSON_TOO_DEEP/);
  }
  assert.doesNotThrow(()=>parseStrictJson('['.repeat(64)+'0'+']'.repeat(64)));
});
test('M6-K: escaped quote, backslash, and bracket-like content cannot influence depth guard',()=>{
  const long='[{}]'.repeat(10000);
  const json=JSON.stringify({message:long,quoted:'braces }}} [[[ and \\" quote'});
  assert.deepEqual(parseStrictJson(json),JSON.parse(json));
  assert.deepEqual(parseStrictJson('{"a":"\\\\\\\"[{]","b":[1,2]}'),
    JSON.parse('{"a":"\\\\\\\"[{]","b":[1,2]}'));
});
test('M6-K: duplicate keys and malformed JSON rejection remain unchanged',()=>{
  assert.throws(()=>parseStrictJson('{"x":1,"\\u0078":2}'),
    /DUPLICATE_JSON_KEY/);
  assert.throws(()=>parseStrictJson('{"x":1,}'),SyntaxError);
  assert.deepEqual(parseStrictJson('{"x":null,"y":false,"z":"1e999"}'),
    {x:null,y:false,z:'1e999'});
});
test('M6-K: JSONL and CLI fail closed with static errors and no path or canary echo',()=>{
  assert.throws(()=>parseJsonl('{"decision":"DENY","effect":"NONE","v":1e309}'),
    /INVALID_JSON_LINE_1/);
  fixture(({file,write})=>{
    write('{"trace":"PRIVATE_CANARY","evidence":1e309}');
    const a=call(file);
    assert.equal(a.error,undefined);
    assert.equal(a.status,2);
    assert.equal(JSON.parse(a.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(a.stdout+a.stderr).includes('PRIVATE_CANARY'));
    assert.ok(!(a.stdout+a.stderr).includes(file));
    write('{"trace":"PRIVATE_CANARY","evidence":1e-9999}');
    const b=call(file,'jsonrpc');
    assert.equal(b.status,2);
    assert.equal(JSON.parse(b.stdout).errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(b.stdout+b.stderr).includes('PRIVATE_CANARY'));
    assert.ok(!(b.stdout+b.stderr).includes(file));
  });
});
