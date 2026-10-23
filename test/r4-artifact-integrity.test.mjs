import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// R4: temporary, first-party npm archives only. This is not a signed release,
// remote provenance verification, registry publication or security certification.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const expectedPaths = Object.freeze(JSON.parse(
  readFileSync(join(root, 'test', 'expected-package-files.json'), 'utf8')
));
const npmCli = [
  process.env.npm_execpath,
  resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
  resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
].find(p => typeof p === 'string' &&
  /(?:^|[/\\])npm-cli\.js$/i.test(p) && existsSync(p));

const hash = (bytes, algorithm, encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding);

function assertExactPaths(paths) {
  assert.deepEqual([...paths].sort(), expectedPaths, 'R4_PACK_FILE_LIST_CHANGED');
}
function assertSameArchive(first, second) {
  assert.equal(hash(first, 'sha256'), hash(second, 'sha256'),
    'R4_ARCHIVE_DIGEST_MISMATCH');
  assert.ok(first.equals(second), 'R4_ARCHIVE_BYTES_MISMATCH');
}
function assertSourceBytes(source, installed, label = 'synthetic') {
  assert.equal(hash(source, 'sha256'), hash(installed, 'sha256'),
    'R4_FILE_CONTENT_MISMATCH:' + label);
  assert.ok(source.equals(installed), 'R4_FILE_BYTES_MISMATCH:' + label);
}
// npm normalizes only the CRLF ending of a Node bin shebang to LF when
// packing on Windows. Check that exact, known byte transformation and reject
// all other changes, including changes to the remainder of the same file.
function expectedInstalledBytes(path, source) {
  if (path !== 'src/cli.mjs') return source;
  const crlf = Buffer.from('#!/usr/bin/env node\r\n');
  if (!source.subarray(0, crlf.length).equals(crlf)) return source;
  const lf = Buffer.from('#!/usr/bin/env node\n');
  return Buffer.concat([lf, source.subarray(crlf.length)]);
}
function runNpm(args, cwd, env) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd, env, shell: false, windowsHide: true, encoding: 'utf8',
    timeout: 45_000, maxBuffer: 1_048_576,
  });
  assert.equal(result.error, undefined, 'R4_NPM_PROCESS_ERROR');
  assert.equal(result.status, 0, 'R4_OFFLINE_NPM_COMMAND_FAILED');
  return result.stdout;
}
function restrictedEnv(home) {
  return {
    PATH: process.env.PATH ?? '',
    SystemRoot: process.env.SystemRoot ?? '',
    HOME: home, USERPROFILE: home, TMP: home, TEMP: home, TMPDIR: home,
    npm_config_cache: join(home, 'cache'),
    npm_config_offline: 'true',
    npm_config_ignore_scripts: 'true',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false',
    npm_config_progress: 'false',
    npm_config_package_lock: 'false',
  };
}
function inspectPack(stdout, destination) {
  const entries = JSON.parse(stdout);
  assert.equal(entries.length, 1, 'R4_SINGLE_PACKAGE_ONLY');
  const info = entries[0];
  assert.equal(info.name, pkg.name);
  assert.equal(info.version, pkg.version);
  assert.equal(info.filename, 'mcp-agent-security-test-suite-0.0.10-rc.1.tgz');
  const location = resolve(destination, info.filename);
  assert.ok(location.startsWith(resolve(destination) + sep), 'R4_PACKAGE_PATH_ESCAPE');
  assert.ok(statSync(location).isFile(), 'R4_PACKAGE_NOT_FILE');
  const bytes = readFileSync(location);
  assert.ok(bytes.length > 2_000 && bytes.length < 2_000_000,
    'R4_PACKAGE_SIZE_OUT_OF_BOUNDS');
  assert.equal(info.size, bytes.length, 'R4_PACKAGE_SIZE_MISMATCH');
  assert.equal(info.shasum, hash(bytes, 'sha1'), 'R4_NPM_SHASUM_MISMATCH');
  assert.equal(info.integrity, 'sha512-' + hash(bytes, 'sha512', 'base64'),
    'R4_NPM_INTEGRITY_MISMATCH');
  assertExactPaths(info.files.map(file => file.path.replaceAll('\\', '/')));
  return { location, bytes, sha256: hash(bytes, 'sha256') };
}

test('R4: integrity guards reject synthetic archive/content/path mutations', () => {
  assert.equal(pkg.version, '0.0.10-rc.1');
  assert.deepEqual([...new Set(expectedPaths)].sort(), expectedPaths,
    'R4_MANIFEST_SORT_UNIQUE_REQUIRED');
  const original = Buffer.from('fictional-public-archive');
  const modified = Buffer.from(original);
  modified[4] ^= 1;
  assert.doesNotThrow(() => assertSameArchive(original, Buffer.from(original)));
  assert.throws(() => assertSameArchive(original, modified),
    /R4_ARCHIVE_DIGEST_MISMATCH/);
  assert.doesNotThrow(() => assertExactPaths(expectedPaths));
  assert.throws(() => assertExactPaths(
    [...expectedPaths, 'src/fictional-unreviewed-file.mjs']
  ), /R4_PACK_FILE_LIST_CHANGED/);
  assert.throws(() => assertExactPaths(
    expectedPaths.filter(path => path !== 'src/cli.mjs')
  ), /R4_PACK_FILE_LIST_CHANGED/);
  assert.doesNotThrow(() => assertSourceBytes(original, Buffer.from(original)));
  assert.throws(() => assertSourceBytes(original, modified),
    /R4_FILE_CONTENT_MISMATCH/);
  const crlfCli = Buffer.from('#!/usr/bin/env node\r\nfictional();\r\n');
  const expectedCli = Buffer.from('#!/usr/bin/env node\nfictional();\r\n');
  assertSourceBytes(expectedCli, expectedInstalledBytes('src/cli.mjs', crlfCli));
  assertSourceBytes(crlfCli, expectedInstalledBytes('docs/fictional.txt', crlfCli));
  const unrelatedChange = Buffer.from('#!/usr/bin/env node\nfictional();\n');
  assert.throws(() =>
    assertSourceBytes(expectedInstalledBytes('src/cli.mjs', crlfCli), unrelatedChange),
    /R4_FILE_CONTENT_MISMATCH/);
});

test('R4: two offline packs match and temporary installation matches all source bytes', {
  timeout: 130_000,
}, () => {
  assert.ok(npmCli, 'R4_REVIEWED_BUNDLED_NPM_REQUIRED');
  const temp = mkdtempSync(join(tmpdir(), 'mcp-r4-artifact-integrity-'));
  const a = join(temp, 'pack-a');
  const b = join(temp, 'pack-b');
  const install = join(temp, 'install');
  const homeA = join(temp, 'home-a');
  const homeB = join(temp, 'home-b');
  const homeInstall = join(temp, 'home-install');
  for (const dir of [a, b, install, homeA, homeB, homeInstall]) mkdirSync(dir);
  try {
    const flags = ['pack', '--json', '--offline', '--ignore-scripts'];
    const first = inspectPack(runNpm([...flags, '--pack-destination', a],
      root, restrictedEnv(homeA)), a);
    const second = inspectPack(runNpm([...flags, '--pack-destination', b],
      root, restrictedEnv(homeB)), b);
    assertSameArchive(first.bytes, second.bytes);
    assert.equal(first.sha256, second.sha256, 'R4_ARCHIVE_DIGEST_MISMATCH');

    // Install the exact first local tarball; no registry, global install or hooks.
    runNpm([
      'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund',
      '--no-save', '--package-lock=false', '--prefix', install, first.location,
    ], temp, restrictedEnv(homeInstall));
    const installedRoot = join(install, 'node_modules', pkg.name);
    for (const path of expectedPaths) {
      assert.ok(!path.includes('..') && !path.startsWith('/'),
        'R4_UNSAFE_MANIFEST_PATH');
      const originalFile = join(root, path);
      const installedFile = join(installedRoot, path);
      assert.ok(statSync(installedFile).isFile(), 'R4_INSTALLED_FILE_MISSING');
      const sourceBytes = readFileSync(originalFile);
      assertSourceBytes(expectedInstalledBytes(path, sourceBytes),
        readFileSync(installedFile), path);
    }
  } finally {
    // Delete both actual tgz archives, three npm homes/caches and installation.
    rmSync(temp, { recursive: true, force: true });
  }
});
