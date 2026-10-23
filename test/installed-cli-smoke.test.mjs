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

    // New M5 zero-config demo must also work from the actual installed tgz.
    const demo = invokeNode(executable, ['demo'], temp, env);
    assert.equal(demo.status, 0, 'installed demo must pass both fixed controls');
    const demoReport = JSON.parse(demo.stdout);
    assert.equal(demoReport.reportSchemaVersion, 1);
    assert.equal(demoReport.command, 'demo');
    assert.equal(demoReport.status, 'PASS');
    assert.deepEqual(demoReport.expectations.map(v => v.matched), [true, true]);
    assert.equal(demoReport.summary.failureCount, 0);

    const help = invokeNode(executable, ['--help'], temp, env);
    assert.equal(help.status, 0, 'installed CLI --help must pass');
    const helpReport=JSON.parse(help.stdout);
    assert.equal(helpReport.command,'help');
    assert.ok(helpReport.commands.includes('demo'));
    assert.ok(helpReport.commands.includes('version'));
    assert.equal(helpReport.reportSchemaVersion,1);

    const version = invokeNode(executable, ['--version'], temp, env);
    assert.equal(version.status,0,'installed CLI --version must pass');
    const versionReport=JSON.parse(version.stdout);
    assert.equal(versionReport.command,'version');
    assert.equal(versionReport.version,packageInfo.version);
    assert.equal(versionReport.packageName,packageInfo.name);
    assert.equal(versionReport.reportSchemaVersion,1);

    // Beta protocol must work from the real installed temporary npm tarball.
    const betaRunner = join(packageDir,'examples','beta-acceptance-check.mjs');
    assert.ok(existsSync(betaRunner),'beta runner must be packed');
    const beta = invokeNode(betaRunner, [], temp, env);
    assert.equal(beta.status,0,'installed beta acceptance must pass all fictional controls');
    const betaResult=JSON.parse(beta.stdout);
    assert.equal(betaResult.betaSchemaVersion,1);
    assert.equal(betaResult.profile,'fictional-beta-acceptance-v1');
    assert.deepEqual([betaResult.total,betaResult.passed,betaResult.failed],[5,5,0]);
    assert.ok(betaResult.cases.every(x=>x.matched===true));

    // The user's universal adapter descriptor can be checked from the installed
    // package, but MUST NOT connect to any stdio/HTTP target.
    for (const [file, expected] of [
      ['stdio-project.json','stdio'],
      ['streamable-http-project.json','streamable-http']
    ]) {
      const descriptorFile=join(packageDir,'examples','adapter-profiles',file);
      assert.ok(existsSync(descriptorFile));
      const adapter=invokeNode(executable,['adapter-check',descriptorFile],temp,env);
      assert.equal(adapter.status,0,'installed adapter config must validate offline');
      const result=JSON.parse(adapter.stdout);
      assert.equal(result.reportSchemaVersion,1);
      assert.equal(result.status,'PASS');
      assert.equal(result.connectionStatus,'NOT_ATTEMPTED');
      assert.equal(result.executionEnabled,false);
      assert.equal(result.transport,expected);
    }

    // Only fixed stdio child and ephemeral first-party 127.0.0.1 mock.
    const drivers=invokeNode(executable,['adapter-selftest'],temp,env);
    assert.equal(drivers.status,0,'installed local driver selftest must pass');
    const local=JSON.parse(drivers.stdout);
    assert.equal(local.reportSchemaVersion,1);
    assert.equal(local.command,'adapter-selftest');
    assert.equal(local.consentProfile,'fixed-first-party-admission-v1');
    assert.equal(local.authorizationStatus,'FIRST_PARTY_SYNTHETIC_ONLY');
    assert.equal(local.operatorVerified,false);
    assert.equal(local.status,'PASS');
    assert.equal(local.connectionStatus,'FIRST_PARTY_MOCK_ONLY');
    assert.equal(local.externalTargetContacted,false);
    assert.deepEqual([local.transportCount,local.passed,local.failed],[2,2,0]);
    assert.deepEqual(local.outcomes.map(o=>o.checked),[1,1]);
    assert.ok(local.outcomes.every(o=>o.gateStatus==='MOCK_ADMITTED' && o.mockProbeAttempted));
    // M4-B6-A: fixed first-party staging MCP 2026 discovery, packaged, no URLs.
    const staging=invokeNode(executable,['staging-selftest'],temp,env);
    assert.equal(staging.status,0,'installed local staging selftest must pass');
    const stagingReport=JSON.parse(staging.stdout);
    assert.equal(stagingReport.reportSchemaVersion,1);
    assert.equal(stagingReport.command,'staging-selftest');
    assert.equal(stagingReport.status,'PASS');
    assert.equal(stagingReport.allowedMethod,'server/discover');
    assert.equal(stagingReport.protocolVersion,'2026-07-28');
    assert.equal(stagingReport.externalTargetContacted,false);
    assert.deepEqual([stagingReport.received,stagingReport.accepted],[1,1]);

    // Intentional expired self-assertion: validates the offline policy
    // report from the actual installed package without authorizing access.
    const expired=join(packageDir,'examples','adapter-profiles','consent-expired.json');
    assert.ok(existsSync(expired),'reviewed consent fixture must be packed');
    const policyCheck=invokeNode(executable,['adapter-policy-check',expired],temp,env);
    assert.equal(policyCheck.status,1,'installed policy preview must deny expired consent');
    const policyResult=JSON.parse(policyCheck.stdout);
    assert.equal(policyResult.reportSchemaVersion,1);
    assert.equal(policyResult.command,'adapter-policy-check');
    assert.equal(policyResult.status,'FAIL');
    assert.equal(policyResult.reviewRule,'ADAPTER_GRANT_EXPIRED_OR_INVALID');
    assert.equal(policyResult.authorizationStatus,'UNVERIFIED_SELF_ASSERTION');
    assert.equal(policyResult.executionEnabled,false);
    assert.equal(policyResult.connectionStatus,'NOT_ATTEMPTED');

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
