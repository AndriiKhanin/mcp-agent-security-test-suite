import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A disposable LOCAL npm tarball install smoke. Nothing is published.
 * No install/pack lifecycle scripts, custom URLs, registries, or credentials.
 * Only fixed packaged synthetic fixtures are executed; no real MCP targets.
 */
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageInfo = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

const npmCli = [
  process.env.npm_execpath,
  resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
  resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
].find(p => typeof p === 'string' &&
  /(?:^|[/\\])npm-cli\.js$/i.test(p) && existsSync(p));

function invokeNode(script, args, cwd, env) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd, env, shell: false, windowsHide: true,
    encoding: 'utf8', timeout: 45_000, maxBuffer: 1_048_576,
  });
}

test('R1: packed CLI installs from a temporary offline archive and handles PASS/FAIL/ERROR', {
  timeout: 110_000,
}, () => {
  assert.ok(npmCli, 'bundled npm CLI required for offline packaging');
  assert.equal(packageInfo.version, '0.0.10-rc.1');
  assert.equal(packageInfo.bin['mcp-agent-security'], 'src/cli.mjs');

  const temp = mkdtempSync(join(tmpdir(), 'mcp-r1-install-smoke-'));
  const packDir = join(temp, 'packed');
  const installDir = join(temp, 'installed');
  const cache = join(temp, 'npm-cache');
  mkdirSync(packDir);
  mkdirSync(installDir);

  const env = {
    PATH: process.env.PATH ?? '',
    SystemRoot: process.env.SystemRoot ?? '',
    HOME: temp, USERPROFILE: temp, TMP: temp, TEMP: temp, TMPDIR: temp,
    npm_config_cache: cache,
    npm_config_offline: 'true',
    npm_config_ignore_scripts: 'true',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_progress: 'false',
    npm_config_update_notifier: 'false',
    npm_config_package_lock: 'false',
  };

  try {
    // Real *local* tarball, unlike R0's --dry-run. The only destination is
    // the isolated temp directory. The npm registry is never used.
    const packed = invokeNode(npmCli, [
      'pack', '--json', '--offline', '--ignore-scripts',
      '--pack-destination', packDir,
    ], projectRoot, env);
    assert.equal(packed.error, undefined, 'offline pack process failed');
    assert.equal(packed.status, 0, 'offline pack must succeed');
    const descriptions = JSON.parse(packed.stdout);
    assert.equal(descriptions.length, 1);
    const descriptor = descriptions[0];
    assert.equal(descriptor.name, packageInfo.name);
    assert.equal(descriptor.version, packageInfo.version);
    assert.match(descriptor.filename, /^mcp-agent-security-test-suite-0\.0\.10-rc\.1\.tgz$/);
    const artifact = resolve(packDir, descriptor.filename);
    assert.ok(artifact.startsWith(resolve(packDir) + sep));
    assert.ok(statSync(artifact).isFile());
    const bytes = readFileSync(artifact);
    assert.ok(bytes.length > 2_000 && bytes.length < 2_000_000);
    const archiveSha256 = createHash('sha256').update(bytes).digest('hex');
    assert.match(archiveSha256, /^[0-9a-f]{64}$/);

    // Install only the just-built local tarball; lifecycle hooks and any
    // registry resolution are explicitly disabled. No global install.
    const installed = invokeNode(npmCli, [
      'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund',
      '--no-save', '--package-lock=false', '--prefix', installDir, artifact,
    ], temp, env);
    assert.equal(installed.error, undefined, 'offline install process failed');
    assert.equal(installed.status, 0, 'offline local tarball install must succeed');

    const packageDir = join(installDir, 'node_modules', packageInfo.name);
    const installedPackage = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    assert.equal(installedPackage.version, packageInfo.version);
    assert.deepEqual(installedPackage.bin, packageInfo.bin);
    assert.ok(existsSync(join(packageDir, 'LICENSE')));
    assert.ok(existsSync(join(packageDir, 'docs', 'RELEASE_READINESS.md')));
    assert.ok(!existsSync(join(packageDir, 'test')));
    assert.ok(!existsSync(join(packageDir, '.github')));
    const wrapper = join(installDir, 'node_modules', '.bin',
      process.platform === 'win32' ? 'mcp-agent-security.cmd' : 'mcp-agent-security');
    assert.ok(existsSync(wrapper), 'npm should create the advertised CLI bin link');

    const executable = join(packageDir, installedPackage.bin['mcp-agent-security']);
    const safe = invokeNode(executable,
      ['scenario', join(packageDir, 'fixtures', 'scenario-denial.json')], temp, env);
    assert.equal(safe.status, 0, 'installed CLI safe contract must pass');
    const safeReport = JSON.parse(safe.stdout);
    assert.equal(safeReport.reportSchemaVersion, 1);
    assert.equal(safeReport.command, 'scenario');
    assert.equal(safeReport.status, 'PASS');
    assert.equal(safeReport.exitCode, 0);

    const negative = invokeNode(executable,
      ['negotiate', join(packageDir, 'fixtures', 'mcp-negotiate-unsafe-params.json')],
      temp, env);
    assert.equal(negative.status, 1, 'installed CLI must detect the fictional negative control');
    const negativeReport = JSON.parse(negative.stdout);
    assert.equal(negativeReport.reportSchemaVersion, 1);
    assert.equal(negativeReport.status, 'FAIL');
    assert.equal(negativeReport.exitCode, 1);
    assert.ok(negativeReport.summary.ruleCodes.includes('RETRY_PARAMS_CHANGED'));

    const fakePath = join(temp, 'FICTIONAL_MISSING_INPUT_DO_NOT_ECHO.json');
    const invalid = invokeNode(executable, ['scenario', fakePath], temp, env);
    assert.equal(invalid.status, 2, 'invalid input must fail closed');
    const errorReport = JSON.parse(invalid.stdout);
    assert.equal(errorReport.status, 'ERROR');
    assert.equal(errorReport.exitCode, 2);
    assert.equal(errorReport.errorCode, 'INVALID_OR_UNREADABLE_INPUT');
    assert.ok(!(invalid.stdout + invalid.stderr).includes('FICTIONAL_MISSING_INPUT_DO_NOT_ECHO'));
  } finally {
    // Includes the actual versioned tarball, temp install and isolated cache.
    rmSync(temp, { recursive: true, force: true });
  }
});
