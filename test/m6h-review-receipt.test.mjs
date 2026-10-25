/**
 * M6-H: first-party offline reviewer receipt — TESTS ONLY.
 * No tests in this file constitute independent security assessment.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {
  mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createReceipt,canonicalReceipt,verifyReceipt
} from '../tools/reviewer-receipt.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const script=join(root,'tools','reviewer-receipt.mjs');
const run=(...args)=>spawnSync(process.execPath,[script,...args],{
  cwd:root,encoding:'utf8',shell:false,windowsHide:true,
  timeout:45000,maxBuffer:1048576,env:{...process.env,NODE_OPTIONS:''}
});
function temp(fn){
  const dir=mkdtempSync(join(tmpdir(),'m6h-receipt-test-'));
  try{return fn({dir,save(name,bytes){
    const file=join(dir,name);writeFileSync(file,bytes);return file;
  }});}finally{rmSync(dir,{force:true,recursive:true});}
}
function safeReply(r,status,exit,code){
  assert.equal(r.error,undefined,'no subprocess crash');
  assert.equal(r.status,exit,'reviewer receipt CLI exit');
  assert.equal(r.stderr,'');
  const output=JSON.parse(r.stdout);
  assert.deepEqual(output,{
    status,code,evidenceKind:'LOCAL_PUBLIC_SOURCE_BYTE_PRECHECK_ONLY',
    independentAssessorCompleted:false,
    stablePublicationAuthorized:false
  });
  return output;
}
test('M6-H: canonical deterministic source receipt has exact 80 files and no authority fields',()=>{
  const a=createReceipt(),b=createReceipt();
  assert.equal(canonicalReceipt(a),canonicalReceipt(b));
  assert.equal(a.receiptSchemaVersion,1);
  assert.equal(a.packageName,'mcp-agent-security-test-suite');
  assert.equal(a.candidateVersion,'0.0.10-rc.1');
  assert.equal(a.packagePathCount,80);
  assert.equal(a.files.length,80);
  assert.equal(a.files[0].path,'CONTRIBUTING.md');
  assert.ok(a.files.some(x=>x.path==='src/cli.mjs'));
  assert.ok(a.files.some(x=>x.path==='docs/R5_INDEPENDENT_REVIEW.md'));
  assert.deepEqual(a.files.map(f=>f.path),
    [...a.files.map(f=>f.path)].sort());
  assert.equal(a.files.reduce((sum,f)=>sum+f.byteLength,0),a.sourceBytesTotal);
  assert.match(a.fileIndexSha256,/^[0-9a-f]{64}$/);
  assert.deepEqual(a.scope,{
    sourceRevisionIndependentlyAnchored:false,
    archiveBytesVerified:false,
    artifactSignatureVerified:false,
    independentAssessorCompleted:false,
    realMcpTargetsTested:false,
    stablePublicationAuthorized:false
  });
  const text=canonicalReceipt(a);
  assert.ok(!text.includes(process.cwd()));
  assert.ok(!text.includes('PRIVATE_CANARY'));
  assert.ok(!text.includes('\u001b'));
  assert.ok(!text.includes('"timestamp"'));
  assert.ok(!text.includes('"gitSha"'));
  assert.ok(Buffer.byteLength(text)<32768);
});
test('M6-H: CLI snapshot is deterministic and exact saved receipt verifies',()=>{
  const snap=run('snapshot');
  assert.equal(snap.status,0,snap.stderr);
  assert.equal(snap.stderr,'');
  assert.equal(snap.stdout,canonicalReceipt(JSON.parse(snap.stdout)));
  const again=run('snapshot');
  assert.equal(again.status,0);
  assert.equal(again.stdout,snap.stdout);
  temp(({save})=>{
    const path=save('public-source.json',snap.stdout);
    safeReply(run('verify',path),'MATCH',0,'M6H_LOCAL_BYTES_MATCH');
  });
});
test('M6-H: modifying byte digests or count cannot produce a passing verification',()=>{
  const baseline=createReceipt();
  for(const mode of ['digest','length','index','total']){
    const value=structuredClone(baseline);
    if(mode==='digest')value.files[5].sha256='0'.repeat(64);
    if(mode==='length')value.files[3].byteLength++;
    if(mode==='index')value.fileIndexSha256='1'.repeat(64);
    if(mode==='total')value.sourceBytesTotal++;
    assert.equal(verifyReceipt(value),false,'must fail: '+mode);
  }
});
test('M6-H: syntactically valid source/approval receipt forgeries fail closed',()=>{
  const baseline=createReceipt();
  for(const [mutation,why] of [
    [x=>{x.scope.independentAssessorCompleted=true;},'fake assessor'],
    [x=>{x.scope.stablePublicationAuthorized=true;},'fake release'],
    [x=>{x.scope.archiveBytesVerified=true;},'fake archive check'],
    [x=>{x.files[0].path='../outside';},'path traversal'],
    [x=>{x.files.push(x.files[0]);},'duplicate file'],
    [x=>{x.files[0].private='PRIVATE_CANARY';},'extra field'],
    [x=>{x.success=true;},'false PASS claim']
  ]){
    const forged=structuredClone(baseline);
    mutation(forged);
    assert.throws(()=>verifyReceipt(forged),undefined,why);
  }
});
test('M6-H: invalid UTF-8, duplicate JSON keys and noncanonical content never echo',()=>{
  temp(({save})=>{
    const good=canonicalReceipt(createReceipt());
    const inputs=[
      Buffer.from([0xff,0xfe,0x1b,0x5b]),
      '{"a":1,"a":2,"private":"PRIVATE_CANARY"}\n',
      Buffer.from('{"private":"PRIVATE_CANARY\u001b[31m"}\n'),
      Buffer.alloc(32769,0x41),
      good.replace('\n  "receiptSchemaVersion"',
        '\n  "receiptSchemaVersion"')+' ',
      good.replace('"receiptSchemaVersion": 1,',
        '"receiptSchemaVersion": 1, "receiptSchemaVersion": 1,'),
      good.replace(/\n/g,'\r\n')
    ];
    for(const [i,bytes] of inputs.entries()){
      const path=save('invalid-'+i+'.json',bytes);
      const result=run('verify',path);
      safeReply(result,'INVALID',2,'M6H_INVALID_OR_UNREADABLE_INPUT');
      assert.ok(!(result.stdout+result.stderr).includes('PRIVATE_CANARY'));
      assert.ok(!(result.stdout+result.stderr).includes(path));
      assert.ok(!(result.stdout+result.stderr).includes('\u001b'));
    }
  });
});
test('M6-H: canonical malicious receipt modifications are MISMATCH or INVALID, never approval',()=>{
  temp(({save})=>{
    const original=createReceipt();
    const modified=structuredClone(original);
    modified.files[0].sha256='f'.repeat(64);
    safeReply(run('verify',save('mutated.json',canonicalReceipt(modified))),
      'MISMATCH',1,'M6H_LOCAL_BYTES_MISMATCH');
    const forged=structuredClone(original);
    forged.scope.sourceRevisionIndependentlyAnchored=true;
    safeReply(run('verify',save('forged.json',canonicalReceipt(forged))),
      'INVALID',2,'M6H_INVALID_OR_UNREADABLE_INPUT');
  });
});
test('M6-H: direct receipt symlink and nonexistent paths fail without path echo',()=>{
  temp(({dir,save})=>{
    const target=save('PRIVATE_CANARY-target.json',canonicalReceipt(createReceipt()));
    const link=join(dir,'shortcut.json');
    try{symlinkSync(target,link,'file');}
    catch(error){
      assert.ok(process.platform==='win32'&&
        ['EPERM','EACCES','ENOTSUP'].includes(error.code));
      return;
    }
    for(const r of [run('verify',link),
      run('verify',join(dir,'PRIVATE_CANARY-missing.json'))]){
      safeReply(r,'INVALID',2,'M6H_INVALID_OR_UNREADABLE_INPUT');
      assert.ok(!(r.stdout+r.stderr).includes('PRIVATE_CANARY'));
      assert.ok(!(r.stdout+r.stderr).includes(link));
    }
  });
});
test('M6-H: strict CLI args; receipt implementation is excluded from 80-file npm archive',()=>{
  for(const args of [
    [],['snapshot','PRIVATE_CANARY'],['verify'],
    ['verify','PRIVATE_CANARY','extra'],['send','PRIVATE_CANARY'],
    ['verify','--PRIVATE_CANARY']
  ]){
    const r=run(...args);
    safeReply(r,'INVALID',2,'M6H_INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(r.stdout+r.stderr).includes('PRIVATE_CANARY'));
  }
  const shipped=JSON.parse(readFileSync(
    join(root,'test','expected-package-files.json'),'utf8'));
  assert.equal(shipped.length,80);
  assert.ok(!shipped.includes('tools/reviewer-receipt.mjs'));
  assert.ok(!shipped.includes('test/m6h-review-receipt.test.mjs'));
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  assert.equal(pkg.version,'0.0.10-rc.1');
  for(const k of ['dependencies','devDependencies',
    'optionalDependencies','peerDependencies'])
    assert.equal(Object.keys(pkg[k]??{}).length,0);
});
