/**
 * M6-F: opt-in human terminal UX for strictly validated, FICTIONAL
 * symbolic expectation files. This is never a target scan or saved-report
 * provenance validator. JSON-v1 output for prior commands remains unchanged.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,symlinkSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOfflineAdopterKit} from '../src/project-adapter.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=(...args)=>spawnSync(process.execPath,
  ['src/cli.mjs',...args],{
    cwd:root,encoding:'utf8',shell:false,timeout:20000,maxBuffer:65536
  });
function withFile(bytes,fn){
  const d=mkdtempSync(join(tmpdir(),'m6f-terminal-'));
  const p=join(d,'fictional-input.json');
  try{
    writeFileSync(p,bytes);
    return fn(p,d);
  }finally{rmSync(d,{recursive:true,force:true});}
}
function view(bytes,exit,expected,observed,code){
  withFile(bytes,p=>{
    const out=cli('adapter-report-view',p);
    assert.equal(out.error,undefined);
    assert.equal(out.status,exit,out.stderr);
    assert.equal(out.stderr,'');
    assert.match(out.stdout,/^FICTIONAL ONLY - offline symbolic expectation/);
    assert.ok(out.stdout.includes('CI expectation: '+expected));
    assert.ok(out.stdout.includes('Observed fictional safety: '+observed));
    assert.ok(out.stdout.includes('Exit code: '+exit));
    assert.ok(out.stdout.includes('Next steps:\n1. '));
    assert.ok(out.stdout.includes('\n2. '));
    assert.match(out.stdout,/Real project assessed: NO/);
    assert.match(out.stdout,/Real MCP target execution: NOT AUTHORIZED/);
    assert.match(out.stdout,/Operator ownership: NOT VERIFIED/);
    assert.match(out.stdout,/Independent security audit: NOT COMPLETED/);
    assert.match(out.stdout,/Independent external beta: NOT VERIFIED/);
    assert.match(out.stdout,/Stable publication: NOT AUTHORIZED/);
    assert.ok(!out.stdout.includes(p));
    assert.ok(!out.stdout.includes('mcp.example.org'));
    assert.ok(!out.stdout.includes('\\u001b'));
    assert.ok(!out.stdout.includes('PRIVATE_CANARY'));
    assert.ok(!out.stdout.trimStart().startsWith('{'),'terminal view must not mix JSON and text');
    assert.ok(out.stdout.length<2100,'source-owned terminal output is bounded');
    assert.ok(code==='CLEAN'||code==='DETECTED'||code==='MISMATCH'||code==='INVALID');
  });
}
test('M6-F: clean and detected fictional controls have distinct human views on both transports',()=>{
  for(const type of ['stdio','streamable-http']){
    const kit=createOfflineAdopterKit(type);
    view(JSON.stringify(kit.cleanExpectation),0,'MATCH','PASS','CLEAN');
    view(JSON.stringify(kit.expectedViolation),0,'MATCH','FAIL','DETECTED');
    const original=cli('adapter-kit',type);
    assert.equal(original.status,0);
    assert.equal(JSON.parse(original.stdout).reportSchemaVersion,1);
    assert.equal(JSON.parse(original.stdout).command,'adapter-kit');
  }
});
test('M6-F: unexpected symbolic mismatch returns exit 1, even with an observed violation',()=>{
  for(const type of ['stdio','streamable-http']){
    const mismatch=structuredClone(createOfflineAdopterKit(type).expectedViolation);
    mismatch.expectedStatus='PASS';
    mismatch.expected[0].ruleCodes=[];
    view(JSON.stringify(mismatch),1,'MISMATCH','FAIL','MISMATCH');
    withFile(JSON.stringify(mismatch),p=>{
      const native=cli('adapter-trace-expect',p);
      assert.equal(native.status,1);
      assert.equal(JSON.parse(native.stdout).expectationStatus,'MISMATCH');
    });
  }
});
test('M6-F: invalid file format, forged report, duplicate key, bad UTF-8 and oversize exit 2',()=>{
  const kit=createOfflineAdopterKit('stdio');
  for(const input of [
    '{broken PRIVATE_CANARY',
    '{"x":1,"x":2,"private":"PRIVATE_CANARY"}',
    JSON.stringify({status:'PASS',reportSchemaVersion:1,readerGuide:{
      code:'CLEAN_FICTIONAL_TRACE_MATCH',private:'PRIVATE_CANARY'}}),
    Buffer.from([0xff,0xfe,0x1b,0x5b,0x31,0x6d]),
    Buffer.alloc(4097,0x41)
  ])view(input,2,'NOT EVALUATED','NOT EVALUATED','INVALID');
  const rogue=structuredClone(kit.cleanExpectation);
  rogue.trace.events[0].attack='PRIVATE_CANARY\u001b[31m';
  view(JSON.stringify(rogue),2,'NOT EVALUATED','NOT EVALUATED','INVALID');
});
test('M6-F: unsafe ANSI/control/private input never reflected to terminal',()=>{
  for(const poison of [
    'PRIVATE_CANARY',
    '\u001b[2J\u001b[H',
    '\u202ePRIVATE_CANARY',
    'https://private.example.org',
    'C:\\Users\\PRIVATE_CANARY\\secret.json'
  ]){
    const tampered=structuredClone(createOfflineAdopterKit('streamable-http').cleanExpectation);
    tampered.extra=poison;
    withFile(JSON.stringify(tampered),p=>{
      const out=cli('adapter-report-view',p);
      assert.equal(out.status,2);
      assert.ok(!out.stdout.includes(poison));
      assert.ok(!out.stdout.includes('\u001b'));
      assert.ok(!out.stdout.includes(p));
      assert.ok(!out.stderr.includes(poison));
    });
  }
});
test('M6-F: direct file symlink is rejected without leaking its destination',()=>{
  const dir=mkdtempSync(join(tmpdir(),'m6f-link-'));
  try{
    const target=join(dir,'PRIVATE_CANARY-destination.json');
    const link=join(dir,'shortcut.json');
    writeFileSync(target,JSON.stringify(createOfflineAdopterKit('stdio').cleanExpectation));
    try{symlinkSync(target,link,'file');}
    catch(e){
      // Windows locked-down CI can deny symlink creation to ordinary users.
      assert.ok(process.platform==='win32' &&
        ['EPERM','EACCES','ENOTSUP'].includes(e.code));
      return;
    }
    const out=cli('adapter-report-view',link);
    assert.equal(out.status,2);
    assert.match(out.stdout,/NOT EVALUATED/);
    assert.ok(!(out.stdout+out.stderr).includes('PRIVATE_CANARY'));
    assert.ok(!(out.stdout+out.stderr).includes(target));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('M6-F: bad arguments and missing file are terminal-only, sanitized exit 2',()=>{
  for(const args of [
    ['adapter-report-view'],
    ['adapter-report-view','--token=PRIVATE_CANARY'],
    ['adapter-report-view','PRIVATE_CANARY-does-not-exist.json'],
    ['adapter-report-view','fictional.json','PRIVATE_CANARY']
  ]){
    const out=cli(...args);
    assert.equal(out.status,2);
    assert.match(out.stdout,/FICTIONAL ONLY/);
    assert.match(out.stdout,/Exit code: 2/);
    assert.ok(!(out.stdout+out.stderr).includes('PRIVATE_CANARY'));
    assert.ok(!out.stdout.startsWith('{'));
  }
});
test('M6-F: JSON CI contract and package inventory remain unchanged',()=>{
  const expected=JSON.parse(readFileSync(join(root,'test/expected-package-files.json'),'utf8'));
  assert.equal(expected.length,80);
  assert.ok(!expected.includes('test/m6f-terminal-view.test.mjs'));
  const kit=createOfflineAdopterKit('stdio');
  withFile(JSON.stringify(kit.expectedViolation),p=>{
    const native=cli('adapter-trace-expect',p);
    assert.equal(native.status,0);
    const result=JSON.parse(native.stdout);
    assert.equal(result.reportSchemaVersion,1);
    assert.equal(result.command,'adapter-trace-expect');
    assert.equal(result.exitCode,0);
    assert.equal(result.observedSafetyStatus,'FAIL');
    assert.equal(result.expectationStatus,'MATCH');
    assert.equal(result.readerGuide.code,
      'FICTIONAL_VIOLATION_DETECTED_AS_EXPECTED');
  });
});
