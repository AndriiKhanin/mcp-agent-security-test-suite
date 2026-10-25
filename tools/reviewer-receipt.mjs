#!/usr/bin/env node
/**
 * M6-H — NONPACKAGED, first-party offline source-byte receipt.
 * Neither a release artifact nor a signature, independent reviewer,
 * independently anchored source revision, OS sandbox or approval.
 *
 * snapshot             -> canonical, deterministic JSON to stdout (exit 0)
 * verify receipt.json  -> static MATCH (0), MISMATCH (1) or INVALID (2)
 *
 * Do not point at private projects: commands operate on this public checkout
 * and use bundled npm only in --offline --ignore-scripts --dry-run mode.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  existsSync,lstatSync,mkdtempSync,readFileSync,rmSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MAX_FILES=80;
const MAX_FILE_BYTES=1_048_576;
const MAX_TOTAL_BYTES=2_000_000;
const MAX_RECEIPT_BYTES=32_768;
const SHA=/^[0-9a-f]{64}$/u;
const utf8=new TextDecoder('utf-8',{fatal:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const scope=Object.freeze({
  sourceRevisionIndependentlyAnchored:false,
  archiveBytesVerified:false,
  artifactSignatureVerified:false,
  independentAssessorCompleted:false,
  realMcpTargetsTested:false,
  stablePublicationAuthorized:false
});
const keys=(value,expected)=>!!value&&
  typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===expected.length&&
  expected.every(k=>Object.hasOwn(value,k));
function fail(code){throw new Error(code);}
function plainPath(path) {
  return typeof path==='string' && path.length>0 && path.length<256 &&
    path===path.replaceAll('\\','/') &&
    !path.startsWith('/') && !path.includes('//') &&
    path.split('/').every(s=>s!=='.'&&s!=='..'&&s!=='' &&
      /^[A-Za-z0-9_.-]+$/u.test(s));
}
function checkedFile(path,maxSize=MAX_FILE_BYTES){
  if(!plainPath(path))fail('UNSAFE_REVIEW_PATH');
  let step=root;
  const bits=path.split('/');
  for(let i=0;i<bits.length;i++){
    step=join(step,bits[i]);
    // No direct or ancestor symlinks: do not follow pointers out of checkout.
    const st=lstatSync(step);
    if(st.isSymbolicLink()||(i===bits.length-1?!st.isFile():!st.isDirectory()))
      fail('UNSAFE_REVIEW_FILE');
    if(i===bits.length-1 && (st.size>maxSize||st.size<0))
      fail('REVIEW_FILE_OVERSIZE');
  }
  const buffer=readFileSync(step);
  if(buffer.length>maxSize)fail('REVIEW_FILE_OVERSIZE');
  return buffer;
}
function inventory(){
  const bytes=checkedFile('test/expected-package-files.json',8192);
  const items=JSON.parse(utf8.decode(bytes));
  if(!Array.isArray(items)||items.length!==MAX_FILES||
     items.some(p=>!plainPath(p))||
     JSON.stringify([...new Set(items)].sort())!==JSON.stringify(items))
    fail('REVIEW_INVENTORY_INVALID');
  return items;
}
function npmCli(){
  const candidates=[
    resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),
    resolve(dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js'),
    process.env.npm_execpath
  ];
  const found=candidates.find(p=>typeof p==='string'&&
    /(?:^|[/\\])npm-cli\.js$/iu.test(p)&&existsSync(p));
  if(!found)fail('REVIEW_NPM_UNAVAILABLE');
  return found;
}
function actualOfflineInventory(){
  const cache=mkdtempSync(join(tmpdir(),'m6h-review-npm-'));
  try{
    const child=spawnSync(process.execPath,[
      npmCli(),'pack','--dry-run','--json','--ignore-scripts','--offline'
    ],{
      cwd:root,shell:false,encoding:'utf8',windowsHide:true,
      timeout:45000,maxBuffer:1048576,
      env:{
        PATH:process.env.PATH??'',SystemRoot:process.env.SystemRoot??'',
        HOME:cache,USERPROFILE:cache,TMP:cache,TEMP:cache,TMPDIR:cache,
        npm_config_cache:cache,npm_config_offline:'true',
        npm_config_ignore_scripts:'true',npm_config_audit:'false',
        npm_config_fund:'false',npm_config_update_notifier:'false',
        npm_config_progress:'false',NODE_OPTIONS:''
      }
    });
    if(child.error||child.status!==0)fail('REVIEW_OFFLINE_PACK_FAILED');
    const info=JSON.parse(child.stdout);
    if(!Array.isArray(info)||info.length!==1||
       !Array.isArray(info[0]?.files)||info[0].size>MAX_TOTAL_BYTES)
      fail('REVIEW_PACK_MANIFEST_INVALID');
    return {
      paths:info[0].files.map(f=>f.path?.replaceAll('\\','/')).sort(),
      name:info[0].name,
      version:info[0].version
    };
  }finally{rmSync(cache,{recursive:true,force:true});}
}
function inputs(){
  const paths=inventory();
  const pkg=JSON.parse(utf8.decode(checkedFile('package.json',8192)));
  if(pkg.name!=='mcp-agent-security-test-suite'||
    pkg.version!=='0.0.10-rc.1'||pkg.type!=='module'||
    pkg.scripts?.test!=='node --test'||
    ['dependencies','devDependencies','optionalDependencies','peerDependencies']
      .some(x=>Object.keys(pkg[x]??{}).length>0)||
    ['preinstall','install','postinstall','prepare','prepack','postpack',
      'prepublish','prepublishOnly'].some(x=>Object.hasOwn(pkg.scripts,x)))
    fail('REVIEW_CANDIDATE_CONTRACT_CHANGED');
  const pack=actualOfflineInventory();
  if(pack.name!==pkg.name||pack.version!==pkg.version||
     JSON.stringify(pack.paths)!==JSON.stringify(paths))
    fail('REVIEW_PACK_PATH_MISMATCH');
  return {paths,pkg};
}
export function createReceipt(){
  const {paths,pkg}=inputs();
  let total=0;
  const files=paths.map(path=>{
    const bytes=checkedFile(path);
    total+=bytes.length;
    if(total>MAX_TOTAL_BYTES)fail('REVIEW_TOTAL_BYTES_LIMIT');
    return {path,byteLength:bytes.length,sha256:sha(bytes)};
  });
  return {
    receiptSchemaVersion:1,
    evidenceKind:'LOCAL_PUBLIC_SOURCE_BYTE_PRECHECK_ONLY',
    packageName:pkg.name,candidateVersion:pkg.version,
    packagePathCount:files.length,
    sourceBytesTotal:total,
    fileIndexSha256:sha(Buffer.from(JSON.stringify(files),'utf8')),
    files,scope:{...scope}
  };
}
export function canonicalReceipt(value){return JSON.stringify(value,null,2)+'\n';}
function validateReceipt(receipt,paths){
  if(!keys(receipt,[
    'receiptSchemaVersion','evidenceKind','packageName','candidateVersion',
    'packagePathCount','sourceBytesTotal','fileIndexSha256','files','scope'
  ])||receipt.receiptSchemaVersion!==1||
    receipt.evidenceKind!=='LOCAL_PUBLIC_SOURCE_BYTE_PRECHECK_ONLY'||
    receipt.packageName!=='mcp-agent-security-test-suite'||
    receipt.candidateVersion!=='0.0.10-rc.1'||
    receipt.packagePathCount!==paths.length||
    !Number.isSafeInteger(receipt.sourceBytesTotal)||
    receipt.sourceBytesTotal<0||receipt.sourceBytesTotal>MAX_TOTAL_BYTES||
    !SHA.test(receipt.fileIndexSha256)||
    !Array.isArray(receipt.files)||receipt.files.length!==paths.length||
    !keys(receipt.scope,Object.keys(scope))||
    Object.entries(scope).some(([k,v])=>receipt.scope[k]!==v))
    fail('REVIEW_RECEIPT_SCHEMA_INVALID');
  for(let i=0;i<paths.length;i++){
    const f=receipt.files[i];
    if(!keys(f,['path','byteLength','sha256'])||
      f.path!==paths[i]||!Number.isSafeInteger(f.byteLength)||
      f.byteLength<0||f.byteLength>MAX_FILE_BYTES||!SHA.test(f.sha256))
      fail('REVIEW_RECEIPT_ENTRY_INVALID');
  }
}
function readReceipt(path){
  if(typeof path!=='string'||!path||path.startsWith('-'))
    fail('REVIEW_INPUT_INVALID');
  // A caller may keep the receipt anywhere. Never echo its location.
  const stat=lstatSync(path);
  if(!stat.isFile()||stat.isSymbolicLink()||
     stat.size<1||stat.size>MAX_RECEIPT_BYTES)fail('REVIEW_INPUT_INVALID');
  const bytes=readFileSync(path);
  if(bytes.length>MAX_RECEIPT_BYTES)fail('REVIEW_INPUT_INVALID');
  const contents=utf8.decode(bytes);
  const object=JSON.parse(contents);
  // Canonical-only input rejects repeated JSON keys, extras with duplicate
  // normalization, alternate encodings, CRLF and injected control data.
  if(contents!==canonicalReceipt(object))fail('REVIEW_INPUT_INVALID');
  return object;
}
export function verifyReceipt(receipt){
  const fresh=createReceipt();
  validateReceipt(receipt,fresh.files.map(f=>f.path));
  return canonicalReceipt(fresh)===canonicalReceipt(receipt);
}
const reply=(status,code)=>JSON.stringify({
  status,code,
  evidenceKind:'LOCAL_PUBLIC_SOURCE_BYTE_PRECHECK_ONLY',
  independentAssessorCompleted:false,
  stablePublicationAuthorized:false
})+'\n';
function main(){
  const [command,...args]=process.argv.slice(2);
  try{
    if(command==='snapshot'&&args.length===0){
      const out=canonicalReceipt(createReceipt());
      if(Buffer.byteLength(out,'utf8')>MAX_RECEIPT_BYTES)
        fail('REVIEW_RECEIPT_OVERSIZE');
      process.stdout.write(out);
      return;
    }
    if(command==='verify'&&args.length===1){
      const receipt=readReceipt(args[0]);
      const matches=verifyReceipt(receipt);
      process.stdout.write(reply(matches?'MATCH':'MISMATCH',
        matches?'M6H_LOCAL_BYTES_MATCH':'M6H_LOCAL_BYTES_MISMATCH'));
      if(!matches)process.exitCode=1;
      return;
    }
    fail('REVIEW_COMMAND_INVALID');
  }catch{
    // No stack trace, source content, received JSON, private path or user
    // exception in output. A local receipt can be forged; no sign-off.
    process.stdout.write(reply('INVALID','M6H_INVALID_OR_UNREADABLE_INPUT'));
    process.exitCode=2;
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main();
