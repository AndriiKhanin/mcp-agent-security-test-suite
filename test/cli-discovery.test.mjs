import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCliVersionResult, buildCliHelpResult, CLI_COMMANDS } from '../src/report-contract.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const run=(...args)=>spawnSync(process.execPath,['src/cli.mjs',...args],{
  cwd:root,encoding:'utf8',timeout:15000,maxBuffer:65536,shell:false
});
function parsed(...args){
  const r=run(...args);
  assert.equal(r.error,undefined);
  const data=JSON.parse(r.stdout);
  assert.equal(data.reportSchemaVersion,1);
  assert.equal(data.exitCode,r.status);
  return {r,data};
}

test('M5-04: canonical and aliased help enumerate only reviewed fictional modes',()=>{
  const {r,data}=parsed('help');
  assert.equal(r.status,0);
  assert.equal(data.command,'help');
  assert.equal(data.status,'PASS');
  assert.deepEqual(data.commands,CLI_COMMANDS);
  assert.equal(data.commands.length,17);
  assert.equal(data.commands.every(x=>/^[a-z]+(?:-[a-z]+)*$/.test(x)),true);
  assert.deepEqual(data.summary,{failureCount:0,reportedFindings:0,
    findingsTruncated:false,ruleCodes:[]});
  assert.ok(data.examples.every(s=>s.startsWith('node src/cli.mjs ')));
  for (const arg of ['--help','-h']) {
    const alias=parsed(arg);
    assert.equal(alias.r.status,0);
    assert.deepEqual(alias.data,data);
  }
});

test('M5-04: version reads only trusted candidate metadata and supports aliases',()=>{
  const canonical=parsed('version');
  assert.equal(canonical.r.status,0);
  assert.equal(canonical.data.command,'version');
  assert.equal(canonical.data.status,'PASS');
  assert.equal(canonical.data.packageName,pkg.name);
  assert.equal(canonical.data.version,pkg.version);
  assert.equal(canonical.data.minimumNodeVersion,'20');
  assert.equal(canonical.data.exitCode,0);
  assert.ok(!canonical.r.stdout.includes(root));
  for (const arg of ['--version','-V']) {
    const alias=parsed(arg);
    assert.equal(alias.r.status,0);
    assert.deepEqual(alias.data,canonical.data);
  }
});

test('M5-04: extra arguments and arbitrary URLs always yield generic sanitized error',()=>{
  for (const args of [
    ['help','fictional-private-file.json'],
    ['--help','https://fictional-secret.invalid'],
    ['version','--exec=fictional-command'],
    ['--version','fictional-private-file.json'],
    ['-V','--endpoint=https://fictional-secret.invalid'],
    ['--unknown','fictional-path']
  ]) {
    const {r,data}=parsed(...args);
    assert.equal(r.status,2);
    assert.equal(data.status,'ERROR');
    assert.equal(data.errorCode,'INVALID_CLI_ARGUMENTS');
    assert.ok(!(r.stdout+r.stderr).includes(args[1]));
  }
});

test('M5-04: malformed and substituted metadata is rejected by pure verifier',()=>{
  const valid=buildCliVersionResult(pkg);
  assert.equal(valid.version,pkg.version);
  for(const bad of [
    null, {}, {...pkg,name:'fictional-other-package'},
    {...pkg,version:'SYNTHETIC_SHOULD_NOT_ECHO'},
    {...pkg,engines:{node:'>=1'}},
    {...pkg,version:1}
  ]) {
    assert.throws(()=>buildCliVersionResult(bad),/INVALID_BUNDLED_PACKAGE_METADATA/);
  }
  assert.ok(!JSON.stringify(valid).includes('SYNTHETIC_SHOULD_NOT_ECHO'));
});

test('M5-04: fixed help never echoes caller-derived values or endpoints',()=>{
  const help=buildCliHelpResult();
  assert.equal(help.status,'PASS');
  assert.equal(help.profile,'local-offline-cli-help-v1');
  assert.ok(!JSON.stringify(help).includes('https://'));
  assert.ok(!JSON.stringify(help).includes('fictional-private'));
  assert.ok(help.commands.includes('demo'));
  assert.ok(help.commands.includes('help'));
  assert.ok(help.commands.includes('version'));
});
