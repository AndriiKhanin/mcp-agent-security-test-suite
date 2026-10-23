import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const bin='src/cli.mjs';
test('R0: package stays prerelease with license, engine and no dependency install',()=>{
  assert.equal(pkg.name,'mcp-agent-security-test-suite');
  assert.match(pkg.version,/^0\.0\.10-rc\.[1-9]\d*$/);
  assert.equal(pkg.license,'MIT');
  assert.equal(pkg.type,'module');
  assert.equal(pkg.engines.node,'>=20');
  for(const kind of ['dependencies','devDependencies','optionalDependencies','peerDependencies']){
    assert.equal(Object.keys(pkg[kind]??{}).length,0,kind);
  }
  assert.equal(pkg.scripts.test,'node --test');
  assert.equal(pkg.bin['mcp-agent-security'],bin);
  const source=readFileSync(join(root,bin),'utf8');
  assert.match(source,/^#!\/usr\/bin\/env node\r?\n/);
  for(const script of ['preinstall','install','postinstall','prepare','prepack','postpack','prepublish','prepublishOnly']){
    assert.equal(Object.hasOwn(pkg.scripts,script),false,script);
  }
});
test('R0: package allowlist is explicit, audited and remains minimal',()=>{
  const permitted=[
    'src','fixtures','docs','examples',
    'README.md','LICENSE','SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
  ];
  assert.deepEqual(pkg.files,permitted);
  assert.equal(pkg.private,undefined);
});
test('R0: offline npm pack dry-run contains only reviewed source/fixtures/docs',()=>{
  // Use Node to launch the npm CLI, avoiding user-selected binaries or shells.
  const npmCandidates=[
    process.env.npm_execpath,
    resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),
    resolve(dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js')
  ];
  const npmCli=npmCandidates.find(p=>typeof p==='string'&&
    /(?:^|[/\\])npm-cli\.js$/i.test(p)&&existsSync(p));
  assert.ok(npmCli,'npm CLI must be available for a trustworthy package gate');
  const cache=mkdtempSync(join(tmpdir(),'mcp-pack-audit-'));
  let run;
  try{
    run=spawnSync(process.execPath,[npmCli,'pack','--dry-run','--json',
      '--ignore-scripts','--offline'],{
      cwd:root,encoding:'utf8',shell:false,windowsHide:true,
      timeout:30000,maxBuffer:1048576,
      env:{
        PATH:process.env.PATH??'',
        SystemRoot:process.env.SystemRoot??'',
        HOME:cache,USERPROFILE:cache,TMP:cache,TEMP:cache,TMPDIR:cache,
        npm_config_cache:cache,npm_config_offline:'true',
        npm_config_ignore_scripts:'true',npm_config_audit:'false',
        npm_config_fund:'false',npm_config_update_notifier:'false'
      }
    });
  }finally{rmSync(cache,{recursive:true,force:true});}
  assert.equal(run.error,undefined,'npm offline pack process error');
  assert.equal(run.status,0,'offline npm pack dry-run must succeed');
  const output=JSON.parse(run.stdout);
  assert.equal(output.length,1);
  assert.equal(output[0].name,pkg.name);
  assert.equal(output[0].version,pkg.version);
  const paths=output[0].files.map(f=>f.path.replaceAll('\\','/'));
  assert.ok(paths.length>=25 && paths.length<=80,'bounded package contents');
  assert.equal(paths.length,new Set(paths).size,'no duplicate paths');
  for(const required of [
    'package.json','README.md','LICENSE','SECURITY.md',
    'src/cli.mjs','src/loopback-http-mock.mjs',
    'src/stdio-mcp-harness.mjs','src/report-contract.mjs',
    'fixtures/loopback-safe.json','fixtures/loopback-unsafe.json',
    'docs/CLI_REPORTS.md','docs/LOOPBACK_HTTP_MOCK.md',
    'docs/THREAT_MODEL.md','examples/offline-ci-check.mjs'
  ]) assert.ok(paths.includes(required),'package missing '+required);
  const allowedPrefixes=['src/','fixtures/','docs/','examples/'];
  const allowedRoots=new Set([
    'package.json','README.md','LICENSE','SECURITY.md',
    'CONTRIBUTING.md','ROADMAP.md'
  ]);
  for(const path of paths){
    assert.ok(allowedRoots.has(path)||
      allowedPrefixes.some(prefix=>path.startsWith(prefix)),
      'unexpected packaged file '+path);
    assert.equal(/(^|[/\\])(?:\.env(?:\.|$)|node_modules|\.git|\.github|test)(?:[/\\]|$)|\.(?:pem|pfx|key|zip|log)$/i.test(path),false,
      'sensitive or nonrelease item '+path);
    assert.ok(!path.includes('..'),'path traversal in archive');
  }
  assert.ok(output[0].size<2_000_000,'package payload too large');
});
