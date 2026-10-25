#!/usr/bin/env node
/**
 * M6-I: NONPACKAGED first-party OFFLINE local npm archive receipt.
 * Not independent provenance, release authorization, a signed attestation,
 * an OS sandbox, or a scan of a real MCP project.
 *
 * snapshot                   deterministic local JSON, exit 0
 * verify <local-receipt.json> MATCH=0, MISMATCH=1, INVALID=2
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  existsSync,lstatSync,mkdtempSync,mkdirSync,
  readFileSync,readdirSync,rmSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=(bytes,algorithm,encoding='hex')=>
  createHash(algorithm).update(bytes).digest(encoding);
const decoder=new TextDecoder('utf-8',{fatal:true});
const FILE_LIMIT=1_048_576,ARCHIVE_LIMIT=2_000_000,RECEIPT_LIMIT=4096;
const hex=/^[0-9a-f]{64}$/u;
const reviewedScope=Object.freeze({
  rawLocalArchiveHashed:true,
  installedBytesComparedToLocalSource:true,
  publicSourceIndependentlyAuthenticated:false,
  artifactDigestIndependentlyAnchored:false,
  artifactSignatureVerified:false,
  independentAssessorCompleted:false,
  realMcpTargetsTested:false,
  stablePublicationAuthorized:false
});
const fields=(value,wanted)=>value&&typeof value==='object'&&
  !Array.isArray(value)&&Object.keys(value).length===wanted.length&&
  wanted.every(x=>Object.hasOwn(value,x));
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const deny=()=>{throw new TypeError('LOCAL_REVIEW_REJECTED');};
const isPath=p=>typeof p==='string'&&p.length>0&&p.length<256&&
  !p.startsWith('/')&&!p.includes('\\')&&!p.includes('//')&&
  p.split('/').every(s=>/^[A-Za-z0-9_.-]+$/u.test(s)&&s!=='.'&&s!=='..');
function checkedRelative(base,relative,limit=FILE_LIMIT){
  if(!isPath(relative))deny();
  const bits=relative.split('/');
  let location=base;
  for(let i=0;i<bits.length;i++){
    location=join(location,bits[i]);
    const st=lstatSync(location);
    if(st.isSymbolicLink()||
      (i===bits.length-1?!st.isFile():!st.isDirectory()))deny();
    if(i===bits.length-1&&(st.size<0||st.size>limit))deny();
  }
  const bytes=readFileSync(location);
  if(bytes.length>limit)deny();
  return bytes;
}
function sortedPaths(base){
  const result=[];
  function walk(dir,prefix=''){
    for(const entry of readdirSync(dir,{withFileTypes:true})){
      const rel=prefix+entry.name;
      if(!isPath(rel)||entry.isSymbolicLink())deny();
      if(entry.isDirectory())walk(join(dir,entry.name),rel+'/');
      else if(entry.isFile())result.push(rel);
      else deny();
      if(result.length>80)deny();
    }
  }
  walk(base);
  return result.sort();
}
function packageInfo(){
  const pkg=JSON.parse(decoder.decode(checkedRelative(root,'package.json',8192)));
  const paths=JSON.parse(decoder.decode(
    checkedRelative(root,'test/expected-package-files.json',8192)));
  if(pkg.name!=='mcp-agent-security-test-suite'||
    pkg.version!=='0.0.10-rc.1'||pkg.type!=='module'||
    pkg.scripts?.test!=='node --test'||
    !Array.isArray(paths)||paths.length!==80||
    paths.some(x=>!isPath(x))||
    !exact([...new Set(paths)].sort(),paths)||
    !exact(pkg.files,[
      'src','fixtures','docs','examples','README.md','LICENSE',
      'SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
    ])||
    ['dependencies','devDependencies','optionalDependencies','peerDependencies']
      .some(k=>Object.keys(pkg[k]??{}).length!==0)||
    ['preinstall','install','postinstall','prepare','prepack','postpack',
      'prepublish','prepublishOnly'].some(k=>Object.hasOwn(pkg.scripts??{},k)))
    deny();
  return {pkg,paths};
}
function npmBinary(){
  const possibilities=[
    process.env.npm_execpath,
    resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),
    resolve(dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')
  ];
  const selected=possibilities.find(x=>typeof x==='string'&&
    /(?:^|[/\\])npm-cli\.js$/iu.test(x)&&existsSync(x));
  if(!selected)deny();
  return selected;
}
function envFor(home){
  return {
    PATH:process.env.PATH??'',SystemRoot:process.env.SystemRoot??'',
    HOME:home,USERPROFILE:home,TMP:home,TEMP:home,TMPDIR:home,
    npm_config_cache:join(home,'cache'),npm_config_offline:'true',
    npm_config_ignore_scripts:'true',npm_config_audit:'false',
    npm_config_fund:'false',npm_config_update_notifier:'false',
    npm_config_progress:'false',npm_config_package_lock:'false',
    NODE_OPTIONS:''
  };
}
function npm(args,cwd,home){
  const result=spawnSync(process.execPath,[npmBinary(),...args],{
    cwd,env:envFor(home),shell:false,windowsHide:true,encoding:'utf8',
    timeout:60000,maxBuffer:1_048_576
  });
  if(result.error||result.status!==0)deny();
  return result.stdout;
}
export function expectedInstalledBytes(path,raw){
  if(path!=='src/cli.mjs')return raw;
  const old=Buffer.from('#!/usr/bin/env node\r\n');
  if(!raw.subarray(0,old.length).equals(old))return raw;
  return Buffer.concat([
    Buffer.from('#!/usr/bin/env node\n'),raw.subarray(old.length)
  ]);
}
export function compareSourceAndInstall(path,source,installed){
  if(!isPath(path)||!Buffer.isBuffer(source)||!Buffer.isBuffer(installed)||
    source.length>FILE_LIMIT||installed.length>FILE_LIMIT)deny();
  const wanted=expectedInstalledBytes(path,source);
  if(!wanted.equals(installed))deny();
  return {
    path,sourceBytes:source.length,installedBytes:installed.length,
    sourceSha256:hash(source,'sha256'),installedSha256:hash(installed,'sha256')
  };
}
export function inspectActualArchive(metadata,bytes,paths,pkg){
  if(!Array.isArray(metadata)||metadata.length!==1||!Buffer.isBuffer(bytes)||
    bytes.length<2000||bytes.length>ARCHIVE_LIMIT||!Array.isArray(paths)||
    paths.length!==80||!pkg)deny();
  const info=metadata[0];
  if(info.name!==pkg.name||info.version!==pkg.version||
    info.filename!=='mcp-agent-security-test-suite-0.0.10-rc.1.tgz'||
    !Number.isSafeInteger(info.size)||info.size!==bytes.length||
    info.shasum!==hash(bytes,'sha1')||
    info.integrity!=='sha512-'+hash(bytes,'sha512','base64')||
    !Array.isArray(info.files)||info.files.length!==paths.length||
    !exact(info.files.map(x=>x.path).sort(),paths))deny();
  return {
    archiveBytes:bytes.length,
    archiveSha256:hash(bytes,'sha256'),
    archiveSha512:hash(bytes,'sha512'),
    npmIntegrity:info.integrity
  };
}
export function canonicalReceipt(v){return JSON.stringify(v,null,2)+'\n';}
function tempArchive(packHome,dir,pkg,paths){
  const out=npm([
    'pack','--json','--offline','--ignore-scripts',
    '--pack-destination',dir
  ],root,packHome);
  const metadata=JSON.parse(out);
  const filename=join(dir,pkg.name+'-'+pkg.version+'.tgz');
  const st=lstatSync(filename);
  if(!st.isFile()||st.isSymbolicLink()||st.size>ARCHIVE_LIMIT)deny();
  const bytes=readFileSync(filename);
  const verified=inspectActualArchive(metadata,bytes,paths,pkg);
  return {filename,...verified};
}
export function createArchiveReceipt(){
  const {pkg,paths}=packageInfo();
  const dir=mkdtempSync(join(tmpdir(),'m6i-artifact-review-'));
  const first=join(dir,'pack-a'),second=join(dir,'pack-b');
  const install=join(dir,'install');
  const packHome1=join(dir,'cache-a'),packHome2=join(dir,'cache-b');
  const installHome=join(dir,'cache-install');
  for(const path of [first,second,install,packHome1,packHome2,installHome])
    mkdirSync(path);
  try{
    const a=tempArchive(packHome1,first,pkg,paths);
    const b=tempArchive(packHome2,second,pkg,paths);
    if(a.archiveSha256!==b.archiveSha256||
      a.archiveSha512!==b.archiveSha512||
      a.archiveBytes!==b.archiveBytes)deny();
    npm([
      'install','--offline','--ignore-scripts','--no-audit','--no-fund',
      '--no-save','--package-lock=false','--prefix',install,a.filename
    ],dir,installHome);
    const target=join(install,'node_modules',pkg.name);
    if(!exact(sortedPaths(target),paths))deny();
    const entries=paths.map(path=>
      compareSourceAndInstall(path,
        checkedRelative(root,path),checkedRelative(target,path)));
    const srcSize=entries.reduce((n,e)=>n+e.sourceBytes,0);
    const installedSize=entries.reduce((n,e)=>n+e.installedBytes,0);
    if(srcSize>ARCHIVE_LIMIT||installedSize>ARCHIVE_LIMIT)deny();
    return {
      receiptSchemaVersion:1,
      evidenceKind:'SELF_CHECKED_LOCAL_NPM_ARCHIVE_ONLY',
      packageName:pkg.name,candidateVersion:pkg.version,
      packagePathCount:paths.length,
      archiveBytes:a.archiveBytes,
      archiveSha256:a.archiveSha256,
      archiveSha512:a.archiveSha512,
      npmIntegrity:a.npmIntegrity,
      sourceBytesTotal:srcSize,
      installedBytesTotal:installedSize,
      installedIndexSha256:hash(Buffer.from(JSON.stringify(entries),'utf8'),'sha256'),
      scope:{...reviewedScope}
    };
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
}
function validReceipt(v){
  if(!fields(v,[
    'receiptSchemaVersion','evidenceKind','packageName','candidateVersion',
    'packagePathCount','archiveBytes','archiveSha256','archiveSha512',
    'npmIntegrity','sourceBytesTotal','installedBytesTotal',
    'installedIndexSha256','scope'
  ])||v.receiptSchemaVersion!==1||
    v.evidenceKind!=='SELF_CHECKED_LOCAL_NPM_ARCHIVE_ONLY'||
    v.packageName!=='mcp-agent-security-test-suite'||
    v.candidateVersion!=='0.0.10-rc.1'||
    v.packagePathCount!==80||
    !Number.isSafeInteger(v.archiveBytes)||
    v.archiveBytes<2000||v.archiveBytes>ARCHIVE_LIMIT||
    !hex.test(v.archiveSha256)||!hex.test(v.archiveSha512)||
    !hex.test(v.installedIndexSha256)||
    v.npmIntegrity!=='sha512-'+Buffer.from(v.archiveSha512,'hex').toString('base64')||
    !Number.isSafeInteger(v.sourceBytesTotal)||
    v.sourceBytesTotal<0||v.sourceBytesTotal>ARCHIVE_LIMIT||
    !Number.isSafeInteger(v.installedBytesTotal)||
    v.installedBytesTotal<0||v.installedBytesTotal>ARCHIVE_LIMIT||
    !fields(v.scope,Object.keys(reviewedScope))||
    Object.entries(reviewedScope).some(([key,value])=>v.scope[key]!==value))
    deny();
}
function load(path){
  if(typeof path!=='string'||!path||path.startsWith('-'))deny();
  const st=lstatSync(path);
  if(!st.isFile()||st.isSymbolicLink()||
    st.size<1||st.size>RECEIPT_LIMIT)deny();
  const raw=readFileSync(path);
  if(raw.length>RECEIPT_LIMIT)deny();
  const value=JSON.parse(decoder.decode(raw));
  if(decoder.decode(raw)!==canonicalReceipt(value))deny();
  validReceipt(value);
  return value;
}
export function verifyArchiveReceipt(value){
  validReceipt(value);
  return canonicalReceipt(value)===canonicalReceipt(createArchiveReceipt());
}
function reply(status,code){
  return JSON.stringify({
    status,code,evidenceKind:'SELF_CHECKED_LOCAL_NPM_ARCHIVE_ONLY',
    independentAssessorCompleted:false,stablePublicationAuthorized:false
  })+'\n';
}
function main(){
  const [command,...args]=process.argv.slice(2);
  try{
    if(command==='snapshot'&&args.length===0){
      const value=canonicalReceipt(createArchiveReceipt());
      if(Buffer.byteLength(value,'utf8')>RECEIPT_LIMIT)deny();
      process.stdout.write(value);return;
    }
    if(command==='verify'&&args.length===1){
      const matches=verifyArchiveReceipt(load(args[0]));
      process.stdout.write(reply(matches?'MATCH':'MISMATCH',
        matches?'M6I_LOCAL_ARCHIVE_MATCH':'M6I_LOCAL_ARCHIVE_MISMATCH'));
      if(!matches)process.exitCode=1;
      return;
    }
    deny();
  }catch{
    process.stdout.write(reply('INVALID','M6I_INVALID_OR_UNREADABLE_INPUT'));
    process.exitCode=2;
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main();
