#!/usr/bin/env node
/**
 * M6-J: NONPACKAGED first-party OFFLINE reviewer handoff packet.
 * Captures package source/temporary archive and EXCLUDED CI/test/tool bytes.
 * No real MCP calls, signatures, authenticated Git source or audit sign-off.
 *
 * snapshot                 -> canonical local JSON (exit 0)
 * verify <local-packet>    -> MATCH=0, MISMATCH=1, INVALID=2
 */
import {createHash} from 'node:crypto';
import {
  lstatSync,readdirSync,readFileSync
} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReceipt} from './reviewer-receipt.mjs';
import {createArchiveReceipt} from './reviewer-archive.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const decoder=new TextDecoder('utf-8',{fatal:true});
const MAX_FILE_BYTES=1_048_576;
const MAX_TOTAL_BYTES=2_000_000;
// Complete excluded-source custody is preserved and size-bounded.
const MAX_PACKET_BYTES=65_536;
// Allow bounded growth of reviewed source-only test/guide/fixture files.
// Every file remains hashed in the canonical excluded-source inventory.
const MAX_EXCLUDED_FILES=240;
const SHA256=/^[0-9a-f]{64}$/u;
const SHA512=/^[0-9a-f]{128}$/u;
const roots=Object.freeze(['.github','test','tools']);
const gates=Object.freeze({
  assessorIdentity:'NOT_VERIFIED',
  sourceGitRevisionIndependentlyVerified:'NOT_VERIFIED',
  sourceReceiptSeparatelyAuthenticated:'NOT_VERIFIED',
  archiveDigestSeparatelyAnchored:'NOT_VERIFIED',
  independentSourceSecurityAudit:'NOT_VERIFIED',
  assessorSignedDecision:'NOT_VERIFIED',
  externalBetaObserved:'NOT_VERIFIED',
  realMcpTargetAuthorization:'NOT_VERIFIED',
  releaseApproved:'NOT_VERIFIED'
});
const scope=Object.freeze({
  firstPartySyntheticLocalOnly:true,
  packagedSourcePaths:80,
  excludedReviewRoots:['.github/','test/','tools/'],
  externalNetworkTargetsContacted:false,
  assessorConclusionsProvided:false,
  releaseArtifactPublished:false
});
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hasKeys=(a,keys)=>!!a&&typeof a==='object'&&!Array.isArray(a)&&
  Object.keys(a).length===keys.length&&keys.every(k=>Object.hasOwn(a,k));
const denied=()=>{throw new Error('M6J_INVALID_LOCAL_PACKET');};
function safeName(s) {
  return typeof s==='string'&&s.length>0&&s.length<=120&&
    /^[a-zA-Z0-9_.-]+$/u.test(s)&&s!=='.'&&s!=='..';
}
function excludedFileIndex(){
  const files=[];
  let total=0;
  function walk(dir,rel){
    const st=lstatSync(dir);
    if(!st.isDirectory()||st.isSymbolicLink())denied();
    for(const item of readdirSync(dir,{withFileTypes:true})){
      if(!safeName(item.name))denied();
      const path=join(dir,item.name);
      const label=rel+'/'+item.name;
      if(item.isSymbolicLink())denied();
      if(item.isDirectory())walk(path,label);
      else if(item.isFile()){
        const st=lstatSync(path);
        if(st.isSymbolicLink()||!st.isFile()||
          st.size<0||st.size>MAX_FILE_BYTES)denied();
        const bytes=readFileSync(path);
        if(bytes.length>MAX_FILE_BYTES)denied();
        total+=bytes.length;
        if(total>MAX_TOTAL_BYTES)denied();
        files.push({path:label,byteLength:bytes.length,sha256:sha(bytes)});
        if(files.length>MAX_EXCLUDED_FILES)denied();
      }else denied();
    }
  }
  for(const name of roots)walk(join(root,name),name);
  files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  if(files.length<50||files.length>MAX_EXCLUDED_FILES||
    !files.some(x=>x.path==='.github/workflows/ci.yml')||
    !files.some(x=>x.path==='test/expected-package-files.json')||
    !files.some(x=>x.path==='test/r5-content-preflight.test.mjs')||
    !files.some(x=>x.path==='tools/reviewer-receipt.mjs')||
    !files.some(x=>x.path==='tools/reviewer-archive.mjs')||
    !files.some(x=>x.path==='tools/reviewer-handoff.mjs')||
    !exact(files.map(x=>x.path),[...new Set(files.map(x=>x.path))].sort()))
    denied();
  return {
    fileCount:files.length,rawBytesTotal:total,
    indexSha256:sha(Buffer.from(JSON.stringify(files),'utf8')),
    files
  };
}
export function buildHandoff(){
  const source=createReceipt();
  const archive=createArchiveReceipt();
  if(source.packagePathCount!==80||archive.packagePathCount!==80||
    source.sourceBytesTotal!==archive.sourceBytesTotal)denied();
  const excluded=excludedFileIndex();
  return {
    handoffSchemaVersion:1,
    evidenceKind:'SELF_GENERATED_OFFLINE_ASSESSOR_HANDOFF_ONLY',
    candidateName:'mcp-agent-security-test-suite',
    candidateVersion:'0.0.10-rc.1',
    packagedSource:{
      fileCount:source.packagePathCount,rawBytesTotal:source.sourceBytesTotal,
      indexSha256:source.fileIndexSha256
    },
    localArchive:{
      byteLength:archive.archiveBytes,
      sha256:archive.archiveSha256,
      sha512:archive.archiveSha512,
      npmIntegrity:archive.npmIntegrity,
      installedIndexSha256:archive.installedIndexSha256
    },
    excludedReview:excluded,
    scope:{...scope,excludedReviewRoots:[...scope.excludedReviewRoots]},
    independentGates:{...gates}
  };
}
export const canonical=value=>JSON.stringify(value,null,2)+'\n';
export function validateHandoff(value){
  if(!hasKeys(value,[
    'handoffSchemaVersion','evidenceKind','candidateName',
    'candidateVersion','packagedSource','localArchive',
    'excludedReview','scope','independentGates'
  ])||value.handoffSchemaVersion!==1||
    value.evidenceKind!=='SELF_GENERATED_OFFLINE_ASSESSOR_HANDOFF_ONLY'||
    value.candidateName!=='mcp-agent-security-test-suite'||
    value.candidateVersion!=='0.0.10-rc.1'||
    !hasKeys(value.packagedSource,['fileCount','rawBytesTotal','indexSha256'])||
    value.packagedSource.fileCount!==80||
    !Number.isSafeInteger(value.packagedSource.rawBytesTotal)||
    value.packagedSource.rawBytesTotal<0||
    value.packagedSource.rawBytesTotal>MAX_TOTAL_BYTES||
    !SHA256.test(value.packagedSource.indexSha256)||
    !hasKeys(value.localArchive,[
      'byteLength','sha256','sha512','npmIntegrity','installedIndexSha256'
    ])||
    !Number.isSafeInteger(value.localArchive.byteLength)||
    value.localArchive.byteLength<2000||
    value.localArchive.byteLength>MAX_TOTAL_BYTES||
    !SHA256.test(value.localArchive.sha256)||
    !SHA512.test(value.localArchive.sha512)||
    value.localArchive.npmIntegrity!=='sha512-'+
      Buffer.from(value.localArchive.sha512,'hex').toString('base64')||
    !SHA256.test(value.localArchive.installedIndexSha256)||
    !hasKeys(value.excludedReview,[
      'fileCount','rawBytesTotal','indexSha256','files'
    ])||
    !Number.isSafeInteger(value.excludedReview.fileCount)||
    value.excludedReview.fileCount<50||
    value.excludedReview.fileCount>MAX_EXCLUDED_FILES||
    !Number.isSafeInteger(value.excludedReview.rawBytesTotal)||
    value.excludedReview.rawBytesTotal<0||
    value.excludedReview.rawBytesTotal>MAX_TOTAL_BYTES||
    !SHA256.test(value.excludedReview.indexSha256)||
    !Array.isArray(value.excludedReview.files)||
    value.excludedReview.files.length!==value.excludedReview.fileCount||
    !hasKeys(value.scope,Object.keys(scope))||
    !exact(value.scope,scope)||
    !hasKeys(value.independentGates,Object.keys(gates))||
    !exact(value.independentGates,gates))denied();
  let sum=0;
  const paths=[];
  for(const f of value.excludedReview.files){
    if(!hasKeys(f,['path','byteLength','sha256'])||
      typeof f.path!=='string'||f.path.length>256||
      !roots.some(x=>f.path.startsWith(x+'/'))||
      !f.path.split('/').every(safeName)||
      !Number.isSafeInteger(f.byteLength)||f.byteLength<0||
      f.byteLength>MAX_FILE_BYTES||!SHA256.test(f.sha256))
      denied();
    paths.push(f.path);
    sum+=f.byteLength;
  }
  if(!exact(paths,[...new Set(paths)].sort())||
    sum!==value.excludedReview.rawBytesTotal||
    sha(Buffer.from(JSON.stringify(value.excludedReview.files),'utf8'))!==
      value.excludedReview.indexSha256)denied();
  return true;
}
function readPacket(path){
  if(typeof path!=='string'||!path||path.startsWith('-'))denied();
  const st=lstatSync(path);
  if(!st.isFile()||st.isSymbolicLink()||
    st.size<1||st.size>MAX_PACKET_BYTES)denied();
  const bytes=readFileSync(path);
  if(bytes.length>MAX_PACKET_BYTES)denied();
  const text=decoder.decode(bytes),value=JSON.parse(text);
  if(text!==canonical(value))denied();
  validateHandoff(value);
  return value;
}
/**
 * A bounded read-only source fingerprint, without npm pack/install. This is
 * only a negative fast path: a matching packet STILL requires buildHandoff()
 * to recheck the archive, installed files and every excluded source byte.
 */
function quickLocalSourceFingerprint(){
  const testRoot=lstatSync(join(root,'test'));
  if(!testRoot.isDirectory()||testRoot.isSymbolicLink())denied();
  const indexPath=join(root,'test','expected-package-files.json');
  const indexStat=lstatSync(indexPath);
  if(!indexStat.isFile()||indexStat.isSymbolicLink()||
     indexStat.size<1||indexStat.size>8192)denied();
  const paths=JSON.parse(decoder.decode(readFileSync(indexPath)));
  if(!Array.isArray(paths)||paths.length!==80||
     !paths.every(p=>typeof p==='string'&&p.length<256&&
       p.split('/').every(safeName))||
     !exact(paths,[...new Set(paths)].sort()))denied();
  let total=0;
  const files=paths.map(path=>{
    let location=root;
    const bits=path.split('/');
    for(let i=0;i<bits.length;i++){
      location=join(location,bits[i]);
      const st=lstatSync(location);
      if(st.isSymbolicLink()||
         (i===bits.length-1?!st.isFile():!st.isDirectory()))denied();
      if(i===bits.length-1&&(st.size<0||st.size>MAX_FILE_BYTES))
        denied();
    }
    const bytes=readFileSync(location);
    if(bytes.length>MAX_FILE_BYTES)denied();
    total+=bytes.length;
    if(total>MAX_TOTAL_BYTES)denied();
    return {path,byteLength:bytes.length,sha256:sha(bytes)};
  });
  return {
    fileCount:files.length,rawBytesTotal:total,
    indexSha256:sha(Buffer.from(JSON.stringify(files),'utf8'))
  };
}
export function verifyHandoff(value){
  validateHandoff(value);
  // Do not run three isolated npm operations for a provably stale packet.
  // The positive path still executes every original independent check.
  const source=quickLocalSourceFingerprint();
  const excluded=excludedFileIndex();
  if(!exact(value.packagedSource,source)||
     !exact(value.excludedReview,excluded))return false;
  return canonical(value)===canonical(buildHandoff());
}
/**
 * M36: one-command pre-distribution diagnostic. This is a real, disposable
 * LOCAL npm pack/install and complete source-hash review via M6-J, not
 * an independent audit, Git provenance verification, or permission to publish.
 * No caller-supplied paths, commands, credentials or targets are accepted.
 */
const M36_PROFILE='m36-local-distribution-doctor-v1';
const DOCTOR_ERROR=Object.freeze({
  reportSchemaVersion:1,
  profile:M36_PROFILE,
  status:'ERROR',exitCode:2,
  ruleCode:'M36_OFFLINE_DISTRIBUTION_PRECHECK_UNAVAILABLE',
  releaseReady:false,releaseApproved:false,published:false,
  externalTargetAuthorized:false,independentAuditVerified:false,
  independentBetaVerified:false,
  checkoutCleanlinessVerified:false,
  gitSourceIndependentlyVerified:false,
  artifactSignatureVerified:false,
  externalMcpContacted:false,
  actualAgentObserved:false
});
export function runDistributionDoctor(args=[]){
  // Reject argument objects with accessors, holes, prototype changes, or
  // unexpected properties before looking at a single user input value.
  if(!Array.isArray(args)||Object.getPrototypeOf(args)!==
      Array.prototype||args.length!==0)return DOCTOR_ERROR;
  const slots=Object.getOwnPropertyDescriptors(args);
  if(Reflect.ownKeys(slots).length!==1||
     slots.length?.value!==0)return DOCTOR_ERROR;
  try{
    const packet=buildHandoff();
    validateHandoff(packet);
    if(packet.packagedSource.fileCount!==80||
       packet.excludedReview.fileCount>MAX_EXCLUDED_FILES||
       packet.excludedReview.files.length!==packet.excludedReview.fileCount||
       packet.independentGates.releaseApproved!=='NOT_VERIFIED'||
       packet.independentGates.externalBetaObserved!=='NOT_VERIFIED'||
       packet.independentGates.realMcpTargetAuthorization!=='NOT_VERIFIED'||
       packet.scope.externalNetworkTargetsContacted!==false||
       packet.scope.releaseArtifactPublished!==false)
      denied();
    return Object.freeze({
      reportSchemaVersion:1,
      profile:M36_PROFILE,status:'PASS',exitCode:0,
      ruleCode:'M36_LOCAL_ARCHIVE_AND_SOURCE_CUSTODY_MATCH',
      candidateName:packet.candidateName,
      candidateVersion:packet.candidateVersion,
      evidenceKind:'FIRST_PARTY_LOCAL_DISTRIBUTION_PRECHECK_ONLY',
      packagePathCount:packet.packagedSource.fileCount,
      packageSourceIndexSha256:packet.packagedSource.indexSha256,
      excludedSourcePathCount:packet.excludedReview.fileCount,
      excludedSourceLimit:MAX_EXCLUDED_FILES,
      excludedSourceIndexSha256:packet.excludedReview.indexSha256,
      localArchiveSha256:packet.localArchive.sha256,
      localArchiveSha512:packet.localArchive.sha512,
      localArchiveNpmIntegrity:packet.localArchive.npmIntegrity,
      localInstalledIndexSha256:packet.localArchive.installedIndexSha256,
      localArchivePackedAndInstalled:true,
      sourceAndInstalledBytesComparedLocally:true,
      excludedSourcesCompletelyHashed:true,
      distributionDecision:'BLOCKED_PENDING_INDEPENDENT_GATES_AND_OWNER',
      releaseReady:false,releaseApproved:false,published:false,
      externalTargetAuthorized:false,independentAuditVerified:false,
      independentBetaVerified:false,
      checkoutCleanlinessVerified:false,
      gitSourceIndependentlyVerified:false,
      artifactSignatureVerified:false,
      externalMcpContacted:false,
      actualAgentObserved:false,
      nextGates:Object.freeze([
        'INDEPENDENT_BETA_ISSUE_59',
        'INDEPENDENT_SECURITY_AUDIT_ISSUE_43',
        'REAL_TARGET_AUTHORIZATION_ISSUE_21',
        'EXPLICIT_OWNER_RELEASE_DECISION'
      ])
    });
  }catch{return DOCTOR_ERROR;}
}
const reply=(status,code)=>JSON.stringify({
  status,code,
  evidenceKind:'SELF_GENERATED_OFFLINE_ASSESSOR_HANDOFF_ONLY',
  independentAuditCompleted:false,releaseApproved:false
})+'\n';
function main(){
  const [cmd,...args]=process.argv.slice(2);
  try{
    if(cmd==='doctor'){
      const report=runDistributionDoctor(args);
      process.stdout.write(canonical(report));
      process.exitCode=report.exitCode;
      return;
    }
    if(cmd==='snapshot'&&args.length===0){
      const result=canonical(buildHandoff());
      if(Buffer.byteLength(result,'utf8')>MAX_PACKET_BYTES)denied();
      process.stdout.write(result);
      return;
    }
    if(cmd==='verify'&&args.length===1){
      const match=verifyHandoff(readPacket(args[0]));
      process.stdout.write(reply(
        match?'MATCH':'MISMATCH',
        match?'M6J_LOCAL_HANDOFF_MATCH':'M6J_LOCAL_HANDOFF_MISMATCH'));
      if(!match)process.exitCode=1;
      return;
    }
    denied();
  }catch{
    process.stdout.write(reply('INVALID','M6J_INVALID_OR_UNREADABLE_INPUT'));
    process.exitCode=2;
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main();
