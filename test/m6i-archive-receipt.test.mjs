/**
 * M6-I: offline candidate archive and local install byte-custody regressions.
 * No release, trusted signature, independent reviewer or real MCP target.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  mkdtempSync,writeFileSync,readFileSync,rmSync,symlinkSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  canonicalReceipt,createArchiveReceipt,verifyArchiveReceipt,
  compareSourceAndInstall,expectedInstalledBytes,inspectActualArchive
} from '../tools/reviewer-archive.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=join(root,'tools','reviewer-archive.mjs');
const hash=(b,a,encoding='hex')=>createHash(a).update(b).digest(encoding);
const run=(...args)=>spawnSync(process.execPath,[cli,...args],{
  cwd:root,shell:false,windowsHide:true,encoding:'utf8',
  timeout:150000,maxBuffer:131072,env:{...process.env,NODE_OPTIONS:''}
});
const temp=fn=>{
  const dir=mkdtempSync(join(tmpdir(),'m6i-receipt-test-'));
  try{return fn({dir,save(name,body){
    const path=join(dir,name);writeFileSync(path,body);return path;
  }});}
  finally{rmSync(dir,{recursive:true,force:true});}
};
function expectedReply(result,status,code,exit){
  assert.equal(result.error,undefined);
  assert.equal(result.status,exit,'unexpected local archive review exit');
  assert.equal(result.stderr,'');
  assert.deepEqual(JSON.parse(result.stdout),{
    status,code,evidenceKind:'SELF_CHECKED_LOCAL_NPM_ARCHIVE_ONLY',
    independentAssessorCompleted:false,stablePublicationAuthorized:false
  });
}
function info(bytes,paths){
  return [{
    name:'mcp-agent-security-test-suite',
    version:'0.0.10-rc.1',
    filename:'mcp-agent-security-test-suite-0.0.10-rc.1.tgz',
    size:bytes.length,
    shasum:hash(bytes,'sha1'),
    integrity:'sha512-'+hash(bytes,'sha512','base64'),
    files:paths.map(path=>({path}))
  }];
}
const pkg={name:'mcp-agent-security-test-suite',version:'0.0.10-rc.1'};
const paths=JSON.parse(readFileSync(join(root,
  'test','expected-package-files.json'),'utf8'));

test('M6-I: exact local source bytes reject changed install contents and foreign paths',()=>{
  const source=Buffer.from('fictional source content');
  const equal=compareSourceAndInstall('docs/CLI_REPORTS.md',source,Buffer.from(source));
  assert.equal(equal.sourceBytes,source.length);
  assert.equal(equal.installedBytes,source.length);
  assert.equal(equal.sourceSha256,hash(source,'sha256'));
  assert.equal(equal.installedSha256,equal.sourceSha256);
  assert.throws(()=>compareSourceAndInstall('docs/CLI_REPORTS.md',
    source,Buffer.from('fictional source contenT')));
  assert.throws(()=>compareSourceAndInstall('../private/secret',source,source));
  assert.throws(()=>compareSourceAndInstall('docs/CLI_REPORTS.md',
    source,Buffer.alloc(1048577)));
});
test('M6-I: only Windows first-line Node bin shebang may be normalized',()=>{
  const crlf=Buffer.from('#!/usr/bin/env node\r\nfictional();\r\n');
  const normalized=Buffer.from('#!/usr/bin/env node\nfictional();\r\n');
  assert.deepEqual(expectedInstalledBytes('src/cli.mjs',crlf),normalized);
  assert.equal(compareSourceAndInstall('src/cli.mjs',crlf,normalized).installedBytes,
    normalized.length);
  assert.throws(()=>compareSourceAndInstall('src/cli.mjs',crlf,
    Buffer.from('#!/usr/bin/env node\nfictional();\n')));
  assert.deepEqual(expectedInstalledBytes('docs/test.txt',crlf),crlf);
  assert.throws(()=>compareSourceAndInstall('docs/test.txt',crlf,normalized));
});
test('M6-I: actual tarball metadata must match SHA1, SHA512 and all 80 paths',()=>{
  assert.equal(paths.length,80);
  const bytes=Buffer.alloc(2500,0x41);
  const canonical=info(bytes,paths);
  const digest=inspectActualArchive(canonical,bytes,paths,pkg);
  assert.equal(digest.archiveSha256,hash(bytes,'sha256'));
  assert.equal(digest.archiveSha512,hash(bytes,'sha512'));
  assert.equal(digest.npmIntegrity,canonical[0].integrity);
  for(const mutation of [
    x=>{x[0].size++;},
    x=>{x[0].shasum='0'.repeat(40);},
    x=>{x[0].integrity='sha512-WRONG';},
    x=>{x[0].filename='../bad.tgz';},
    x=>{x[0].name='private-package';},
    x=>{x[0].files[0].path='private/.env';},
    x=>{x[0].files.pop();}
  ]){
    const forged=structuredClone(canonical);mutation(forged);
    assert.throws(()=>inspectActualArchive(forged,bytes,paths,pkg));
  }
  const corrupted=Buffer.from(bytes);corrupted[5]^=1;
  assert.throws(()=>inspectActualArchive(canonical,corrupted,paths,pkg));
});
test('M6-I: first-party actual .tgz byte receipt has safe deterministic schema',()=>{
  const receipt=createArchiveReceipt();
  assert.equal(receipt.receiptSchemaVersion,1);
  assert.equal(receipt.evidenceKind,'SELF_CHECKED_LOCAL_NPM_ARCHIVE_ONLY');
  assert.equal(receipt.packageName,pkg.name);
  assert.equal(receipt.candidateVersion,pkg.version);
  assert.equal(receipt.packagePathCount,80);
  assert.ok(receipt.archiveBytes>2000&&receipt.archiveBytes<2000000);
  for(const key of ['archiveSha256','installedIndexSha256'])
    assert.match(receipt[key],/^[a-f0-9]{64}$/);
  assert.match(receipt.archiveSha512,/^[a-f0-9]{128}$/);
  assert.equal(receipt.npmIntegrity,
    'sha512-'+Buffer.from(receipt.archiveSha512,'hex').toString('base64'));
  assert.deepEqual(receipt.scope,{
    rawLocalArchiveHashed:true,
    installedBytesComparedToLocalSource:true,
    publicSourceIndependentlyAuthenticated:false,
    artifactDigestIndependentlyAnchored:false,
    artifactSignatureVerified:false,
    independentAssessorCompleted:false,
    realMcpTargetsTested:false,
    stablePublicationAuthorized:false
  });
  const text=canonicalReceipt(receipt);
  assert.equal(JSON.parse(text).archiveSha256,receipt.archiveSha256);
  assert.ok(!text.includes(process.cwd()));
  assert.ok(!text.includes('\u001b'));
  assert.ok(!text.includes('PRIVATE_CANARY'));
  assert.ok(!text.includes('approvalGranted'));
  assert.ok(Buffer.byteLength(text)<4096);
});
test('M6-I: actual CLI snapshot and offline rebuild verify a saved receipt',()=>{
  const snapshot=run('snapshot');
  assert.equal(snapshot.status,0,snapshot.stderr);
  assert.equal(snapshot.stderr,'');
  assert.equal(snapshot.stdout,canonicalReceipt(JSON.parse(snapshot.stdout)));
  temp(({save})=>{
    const filename=save('local-archive.json',snapshot.stdout);
    expectedReply(run('verify',filename),
      'MATCH','M6I_LOCAL_ARCHIVE_MATCH',0);
    const value=JSON.parse(snapshot.stdout);
    value.archiveSha256='0'.repeat(64);
    const altered=save('altered.json',canonicalReceipt(value));
    expectedReply(run('verify',altered),
      'MISMATCH','M6I_LOCAL_ARCHIVE_MISMATCH',1);
    const fake=JSON.parse(snapshot.stdout);
    fake.scope.independentAssessorCompleted=true;
    expectedReply(run('verify',save('fake.json',canonicalReceipt(fake))),
      'INVALID','M6I_INVALID_OR_UNREADABLE_INPUT',2);
  });
});
test('M6-I: forged release/assessor authority and malformed receipts fail closed',()=>{
  const baseline={
    receiptSchemaVersion:1,evidenceKind:'SELF_CHECKED_LOCAL_NPM_ARCHIVE_ONLY',
    packageName:pkg.name,candidateVersion:pkg.version,
    packagePathCount:80,archiveBytes:2500,
    archiveSha256:'a'.repeat(64),archiveSha512:'b'.repeat(64),
    npmIntegrity:'sha512-'+Buffer.from('b'.repeat(64),'hex').toString('base64'),
    sourceBytesTotal:50,installedBytesTotal:50,
    installedIndexSha256:'c'.repeat(64),
    scope:{
      rawLocalArchiveHashed:true,
      installedBytesComparedToLocalSource:true,
      publicSourceIndependentlyAuthenticated:false,
      artifactDigestIndependentlyAnchored:false,
      artifactSignatureVerified:false,
      independentAssessorCompleted:false,
      realMcpTargetsTested:false,
      stablePublicationAuthorized:false
    }
  };
  for(const edit of [
    x=>{x.scope.stablePublicationAuthorized=true;},
    x=>{x.scope.independentAssessorCompleted=true;},
    x=>{x.scope.artifactSignatureVerified=true;},
    x=>{x.auditStatus='PASS';},
    x=>{x.packagePathCount=79;},
    x=>{x.npmIntegrity='sha512-bad';}
  ]){
    const altered=structuredClone(baseline);
    edit(altered);
    assert.throws(()=>verifyArchiveReceipt(altered));
  }
  temp(({save})=>{
    const validShape=canonicalReceipt(baseline);
    for(const [i,input] of [
      Buffer.from([0xff,0xfe,0x1b,0x5b]),
      Buffer.alloc(4097,'A'),
      '{"secret":"PRIVATE_CANARY","secret":"dup"}\n',
      validShape.replace('"receiptSchemaVersion": 1,',
        '"receiptSchemaVersion": 1, "receiptSchemaVersion": 1,'),
      validShape.replaceAll('\n','\r\n'),
      validShape.slice(0,-1)+' ',
      JSON.stringify({approved:true,token:'PRIVATE_CANARY'})
    ].entries()){
      const filename=save('negative-'+i+'.json',input);
      const result=run('verify',filename);
      expectedReply(result,'INVALID','M6I_INVALID_OR_UNREADABLE_INPUT',2);
      assert.ok(!(result.stdout+result.stderr).includes(filename));
      assert.ok(!(result.stdout+result.stderr).includes('PRIVATE_CANARY'));
      assert.ok(!(result.stdout+result.stderr).includes('\u001b'));
    }
  });
});
test('M6-I: bad CLI args and direct symlink receipt are sanitized',()=>{
  for(const args of [
    [],['snapshot','PRIVATE_CANARY'],['verify'],
    ['verify','PRIVATE_CANARY','unexpected'],['publish','PRIVATE_CANARY'],
    ['verify','--PRIVATE_CANARY']
  ]){
    const res=run(...args);
    expectedReply(res,'INVALID','M6I_INVALID_OR_UNREADABLE_INPUT',2);
    assert.ok(!(res.stdout+res.stderr).includes('PRIVATE_CANARY'));
  }
  temp(({save,dir})=>{
    const target=save('PRIVATE_CANARY-source.json',canonicalReceipt({fake:true}));
    const link=join(dir,'link.json');
    try{symlinkSync(target,link,'file');}
    catch(error){
      assert.ok(process.platform==='win32'&&
        ['EPERM','EACCES','ENOTSUP'].includes(error.code));
      return;
    }
    const res=run('verify',link);
    expectedReply(res,'INVALID','M6I_INVALID_OR_UNREADABLE_INPUT',2);
    assert.ok(!(res.stdout+res.stderr).includes(target));
    assert.ok(!(res.stdout+res.stderr).includes('PRIVATE_CANARY'));
  });
});
test('M6-I: npm package stays 80 paths with no new runtime dependencies or scripts',()=>{
  assert.equal(paths.length,80);
  assert.deepEqual([...new Set(paths)].sort(),paths);
  assert.ok(!paths.includes('tools/reviewer-archive.mjs'));
  assert.ok(!paths.includes('test/m6i-archive-receipt.test.mjs'));
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  for(const kind of ['dependencies','devDependencies','optionalDependencies','peerDependencies'])
    assert.equal(Object.keys(pkg[kind]??{}).length,0);
  for(const kind of ['prepack','prepublish','prepublishOnly','postpack','postinstall'])
    assert.equal(Object.hasOwn(pkg.scripts,kind),false);
});
