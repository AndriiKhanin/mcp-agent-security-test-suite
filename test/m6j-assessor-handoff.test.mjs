/**
 * M6-J — reviewer handoff still NOT independent audit or target authorization.
 * All values here are first-party offline local engineering only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  mkdtempSync,writeFileSync,readFileSync,rmSync,symlinkSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildHandoff,validateHandoff,verifyHandoff,canonical
} from '../tools/reviewer-handoff.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const handoff=join(root,'tools','reviewer-handoff.mjs');
const run=(...args)=>spawnSync(process.execPath,[handoff,...args],{
  cwd:root,shell:false,windowsHide:true,encoding:'utf8',
  timeout:180000,maxBuffer:131072,env:{...process.env,NODE_OPTIONS:''}
});
let cached;
const sample=()=>structuredClone(cached??=buildHandoff());
const sha=b=>createHash('sha256').update(b).digest('hex');
function withDir(callback){
  const dir=mkdtempSync(join(tmpdir(),'m6j-local-handoff-'));
  try{return callback({dir,save(name,bytes){
    const path=join(dir,name);writeFileSync(path,bytes);return path;
  }});}
  finally{rmSync(dir,{recursive:true,force:true});}
}
function expectedReply(runResult,status,exit,code){
  assert.equal(runResult.error,undefined);
  assert.equal(runResult.status,exit,'unexpected reviewer handoff exit');
  assert.equal(runResult.stderr,'');
  assert.deepEqual(JSON.parse(runResult.stdout),{
    status,code,evidenceKind:'SELF_GENERATED_OFFLINE_ASSESSOR_HANDOFF_ONLY',
    independentAuditCompleted:false,releaseApproved:false
  });
}
test('M6-J: local handoff includes shipped source, actual temporary archive and excluded code',()=>{
  const s=sample();
  assert.equal(s.handoffSchemaVersion,1);
  assert.equal(s.candidateName,'mcp-agent-security-test-suite');
  assert.equal(s.candidateVersion,'0.0.10-rc.1');
  assert.equal(s.packagedSource.fileCount,80);
  assert.ok(s.packagedSource.rawBytesTotal>20000);
  assert.match(s.packagedSource.indexSha256,/^[0-9a-f]{64}$/);
  assert.match(s.localArchive.sha256,/^[0-9a-f]{64}$/);
  assert.match(s.localArchive.sha512,/^[0-9a-f]{128}$/);
  assert.equal(s.localArchive.npmIntegrity,
    'sha512-'+Buffer.from(s.localArchive.sha512,'hex').toString('base64'));
  assert.match(s.localArchive.installedIndexSha256,/^[0-9a-f]{64}$/);
  assert.ok(s.excludedReview.fileCount>=50&&s.excludedReview.fileCount<=224);
  assert.equal(s.excludedReview.files.length,s.excludedReview.fileCount);
  assert.deepEqual(s.excludedReview.files.map(x=>x.path),
    [...s.excludedReview.files.map(x=>x.path)].sort());
  assert.equal(s.excludedReview.rawBytesTotal,
    s.excludedReview.files.reduce((n,x)=>n+x.byteLength,0));
  for(const path of [
    '.github/workflows/ci.yml',
    '.github/ISSUE_TEMPLATE/beta_feedback.yml',
    'test/expected-package-files.json',
    'test/r5-content-preflight.test.mjs',
    'test/m6j-assessor-handoff.test.mjs',
    'tools/reviewer-receipt.mjs',
    'tools/reviewer-archive.mjs',
    'tools/reviewer-handoff.mjs',
    'tools/m18-symbolic-evaluation.mjs',
    'test/m18-symbolic-evaluation.test.mjs',
    '.github/M18_SYMBOLIC_EVALUATION_BENCHMARK.md',
    '.github/M22_FINITE_SCENARIO_CONTRIBUTIONS.md',
    '.github/m22-scenarios/owner-task-data.json',
    'test/m22-finite-scenario-runner.test.mjs',
    'tools/m22-finite-scenario-runner.mjs'
  ])assert.ok(s.excludedReview.files.some(x=>x.path===path),path);
  assert.ok(!s.excludedReview.files.some(x=>x.path==='src/cli.mjs'));
  assert.equal(validateHandoff(s),true);
});
test('M6-J: every independent gate remains NOT_VERIFIED and no private paths/canary emitted',()=>{
  const packet=sample();
  const gates=packet.independentGates;
  assert.equal(Object.keys(gates).length,9);
  for(const [name,status] of Object.entries(gates)){
    assert.equal(status,'NOT_VERIFIED',name);
  }
  assert.deepEqual(packet.scope,{
    firstPartySyntheticLocalOnly:true,
    packagedSourcePaths:80,
    excludedReviewRoots:['.github/','test/','tools/'],
    externalNetworkTargetsContacted:false,
    assessorConclusionsProvided:false,
    releaseArtifactPublished:false
  });
  const text=canonical(packet);
  assert.ok(!text.includes(process.cwd()));
  assert.ok(!text.includes('PRIVATE_CANARY'));
  assert.ok(!text.includes('\u001b'));
  assert.ok(!text.includes('"timestamp"'));
  assert.ok(!text.includes('"assessorName"'));
  assert.ok(Buffer.byteLength(text,'utf8')<65536);
});
test('M6-J: CLI writes canonical packet, accepts exact locally rechecked evidence',()=>{
  const snapshot=run('snapshot');
  assert.equal(snapshot.status,0,snapshot.stderr);
  assert.equal(snapshot.stderr,'');
  assert.equal(snapshot.stdout,canonical(JSON.parse(snapshot.stdout)));
  withDir(({save})=>{
    const path=save('first-party-only.json',snapshot.stdout);
    expectedReply(run('verify',path),'MATCH',0,'M6J_LOCAL_HANDOFF_MATCH');
  });
});
test('M6-J: altered archive or source digest is a MISMATCH, never approval',()=>{
  const altered=sample();
  altered.localArchive.sha256='0'.repeat(64);
  assert.equal(validateHandoff(altered),true);
  assert.equal(verifyHandoff(altered),false);
  const another=sample();
  another.packagedSource.indexSha256='f'.repeat(64);
  assert.equal(validateHandoff(another),true);
  withDir(({save})=>{
    expectedReply(run('verify',save('tampered.json',canonical(another))),
      'MISMATCH',1,'M6J_LOCAL_HANDOFF_MISMATCH');
  });
});
test('M6-J: CLI rejects internally consistent stale excluded bytes as MISMATCH',()=>{
  const altered=sample();
  altered.excludedReview.files[0].sha256='f'.repeat(64);
  altered.excludedReview.indexSha256=sha(Buffer.from(
    JSON.stringify(altered.excludedReview.files),'utf8'));
  assert.equal(validateHandoff(altered),true);
  assert.equal(verifyHandoff(altered),false);
  withDir(({save})=>{
    expectedReply(run('verify',save('stale-source.json',canonical(altered))),
      'MISMATCH',1,'M6J_LOCAL_HANDOFF_MISMATCH');
  });
});

test('M6-J: tampered excluded file inventory, count and forged gates fail closed',()=>{
  const base=sample();
  for(const change of [
    x=>{x.independentGates.assessorSignedDecision='APPROVED';},
    x=>{x.independentGates.independentSourceSecurityAudit='VERIFIED';},
    x=>{x.scope.externalNetworkTargetsContacted=true;},
    x=>{x.scope.releaseArtifactPublished=true;},
    x=>{x.auditApproved=true;},
    x=>{x.excludedReview.fileCount--;},
    x=>{x.excludedReview.files[0].path='../secret';},
    x=>{x.excludedReview.files[0].path=x.excludedReview.files[1].path;},
    x=>{x.excludedReview.files[0].sha256='0'.repeat(64);},
    x=>{x.excludedReview.files[0].sourceBytes='PRIVATE_CANARY';},
    x=>{x.excludedReview.files.push(x.excludedReview.files[0]);}
  ]){
    const item=structuredClone(base);change(item);
    assert.throws(()=>validateHandoff(item));
  }
});
test('M6-J: internally consistent but invented excluded digest still mismatches actual tree',()=>{
  const x=sample();
  const entry=x.excludedReview.files[0];
  entry.sha256='f'.repeat(64);
  x.excludedReview.indexSha256=sha(Buffer.from(
    JSON.stringify(x.excludedReview.files),'utf8'));
  assert.equal(validateHandoff(x),true);
  assert.equal(verifyHandoff(x),false);
});
test('M6-J: expanded custody stays bounded at 224 fully indexed files',()=>{
  const x=sample();
  while(x.excludedReview.files.length<=224){
    const i=x.excludedReview.files.length;
    x.excludedReview.files.push({
      path:'tools/zz-fictional-excluded-bound-'+String(i).padStart(3,'0')+'.mjs',
      byteLength:0,sha256:'0'.repeat(64)
    });
  }
  x.excludedReview.files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  x.excludedReview.fileCount=x.excludedReview.files.length;
  x.excludedReview.indexSha256=sha(Buffer.from(
    JSON.stringify(x.excludedReview.files),'utf8'));
  assert.equal(x.excludedReview.fileCount,225);
  assert.throws(()=>validateHandoff(x),/M6J_INVALID_LOCAL_PACKET/);
});
test('M6-J: noncanonical/malformed/oversize/private/invalid UTF-8 receipt never leaks',()=>{
  withDir(({save})=>{
    const valid=canonical(sample());
    const values=[
      Buffer.from([0xff,0xfe,0x1b,0x5b]),
      Buffer.alloc(65537,0x41),
      '{"private":"PRIVATE_CANARY","private":"duplicate"}\n',
      valid.replace('"handoffSchemaVersion": 1,',
        '"handoffSchemaVersion": 1, "handoffSchemaVersion": 1,'),
      valid.replace(/\n/g,'\r\n'),
      valid.slice(0,-1)+' ',
      JSON.stringify({private:'PRIVATE_CANARY',releaseApproved:true})
    ];
    for(const [i,bytes] of values.entries()){
      const path=save('negative-'+i+'.json',bytes);
      const res=run('verify',path);
      expectedReply(res,'INVALID',2,'M6J_INVALID_OR_UNREADABLE_INPUT');
      assert.ok(!(res.stdout+res.stderr).includes('PRIVATE_CANARY'));
      assert.ok(!(res.stdout+res.stderr).includes(path));
      assert.ok(!(res.stdout+res.stderr).includes('\u001b'));
    }
  });
});
test('M6-J: no release commands, symlink inputs, additional args or shipped paths',()=>{
  for(const args of [
    [],['snapshot','PRIVATE_CANARY'],['verify'],
    ['verify','PRIVATE_CANARY','second'],['publish','PRIVATE_CANARY'],
    ['verify','--PRIVATE_CANARY']
  ]){
    const res=run(...args);
    expectedReply(res,'INVALID',2,'M6J_INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(res.stdout+res.stderr).includes('PRIVATE_CANARY'));
  }
  withDir(({dir,save})=>{
    const src=save('PRIVATE_CANARY-packet.json',canonical(sample()));
    const link=join(dir,'link.json');
    try{symlinkSync(src,link,'file');}
    catch(e){
      assert.ok(process.platform==='win32'&&
        ['EPERM','EACCES','ENOTSUP'].includes(e.code));
      return;
    }
    const res=run('verify',link);
    expectedReply(res,'INVALID',2,'M6J_INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(res.stdout+res.stderr).includes('PRIVATE_CANARY'));
  });
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  const paths=JSON.parse(readFileSync(join(root,
    'test/expected-package-files.json'),'utf8'));
  assert.equal(paths.length,80);
  assert.ok(!paths.includes('tools/reviewer-handoff.mjs'));
  assert.ok(!paths.includes('test/m6j-assessor-handoff.test.mjs'));
  for(const k of ['dependencies','devDependencies','optionalDependencies','peerDependencies'])
    assert.equal(Object.keys(pkg[k]??{}).length,0);
  for(const k of ['prepack','publish','prepublishOnly','postinstall'])
    assert.equal(Object.hasOwn(pkg.scripts,k),false);
});
