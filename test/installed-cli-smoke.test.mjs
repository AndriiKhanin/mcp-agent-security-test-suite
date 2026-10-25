import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, symlinkSync } from 'node:fs';
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
      assert.equal(result.readerGuide.readerGuideSchemaVersion,1);
      assert.equal(result.readerGuide.realProjectAssessed,false);
      assert.equal(result.readerGuide.externalMcpContactAuthorized,false);
      assert.equal(result.readerGuide.code,
        observedSafety===null
          ? 'DESCRIPTOR_SHAPE_AND_FICTIONAL_CONTROLS_MATCH'
          : observedSafety==='PASS'
            ? 'CLEAN_FICTIONAL_TRACE_MATCH'
            : 'FICTIONAL_VIOLATION_DETECTED_AS_EXPECTED');
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

    // M4-B6-B: own fixed staging worker runs in disposable process with safe IPC.
    const processStage=invokeNode(executable,['staging-process-selftest'],temp,env);
    assert.equal(processStage.status,0,'installed fixed staging worker must pass');
    const processReport=JSON.parse(processStage.stdout);
    assert.equal(processReport.command,'staging-process-selftest');
    assert.equal(processReport.reportSchemaVersion,1);
    assert.equal(processReport.childProcessUsed,true);
    assert.equal(processReport.osSandboxed,false);
    assert.equal(processReport.status,'PASS');
    assert.equal(processReport.externalTargetContacted,false);
    assert.equal(processReport.allowedMethod,'server/discover');

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

    // M4-B10-A: a realistic fictional adopter in an ISOLATED sibling cwd,
    // using the reviewed package installed from our offline npm tarball.
    // Nothing below imports modules or opens fixtures from the repository root.
    const adopter = join(temp,'fictional-downstream-project');
    mkdirSync(adopter);
    const assertInert = report => {
      assert.equal(report.reportSchemaVersion,1);
      assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
      assert.equal(report.executionEnabled,false);
      assert.equal(report.externalTargetContacted,false);
      assert.equal(report.projectConnectionAuthorized,false);
      assert.equal(report.operatorVerified,false);
      assert.ok(!JSON.stringify(report).includes('fictional-private-adopter'));
      assert.ok(!JSON.stringify(report).includes('mcp.example.org'));
    };
    const adopterRun=(mode,filepath)=>
      invokeNode(executable,[mode,filepath],adopter,env);
    const adopterDescriptor=JSON.parse(readFileSync(
      join(packageDir,'examples','adapter-profiles',
        'streamable-http-project.json'),'utf8'));
    adopterDescriptor.project.name='fictional-private-adopter';
    const descriptorFile=join(adopter,'local-adopterDescriptor.json');
    writeFileSync(descriptorFile,JSON.stringify(adopterDescriptor),'utf8');
    const onboard=adopterRun('adapter-onboard','local-adopterDescriptor.json');
    assert.equal(onboard.status,0,'downstream adopterDescriptor preview must pass');
    assert.equal(onboard.stderr,'');
    const preview=JSON.parse(onboard.stdout);
    assertInert(preview);
    assert.equal(preview.command,'adapter-onboard');
    assert.equal(preview.status,'PASS');
    assert.equal(preview.descriptorEvidence,'DESCRIPTOR_VALIDATED');
    assert.equal(preview.readinessStatus,'REAL_TARGET_NOT_AUTHORIZED');
    assert.equal(preview.targetEvidence,'REAL_TARGET_NOT_ATTEMPTED');

    // M6-A: installed CLI, invoked from an unrelated fictional adopter cwd.
    const quick=adopterRun('adapter-quickstart','local-adopterDescriptor.json');
    assert.equal(quick.status,0,'installed quickstart must run offline');
    assert.equal(quick.stderr,'');
    const dashboard=JSON.parse(quick.stdout);
    assertInert(dashboard);
    assert.equal(dashboard.command,'adapter-quickstart');
    assert.equal(dashboard.status,'PASS');
    assert.equal(dashboard.reportSchemaVersion,1);
    assert.equal(dashboard.quickstartSchemaVersion,1);
    assert.equal(dashboard.checked,5);
    assert.equal(dashboard.projectSafetyAssessed,false);
    assert.equal(dashboard.fixturesAreProjectSpecific,false);
    assert.equal(dashboard.authorizationStatus,
      'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
    assert.equal(dashboard.controls[3].fictionalObservedStatus,'FAIL');
    assert.equal(dashboard.controls[3].controlStatus,'PASS');
    assert.ok(!quick.stdout.includes('PRIVATE'));


    const synthetic=effect=>({
      traceSchemaVersion:1,mode:'user-authored-synthetic-only',
      descriptor:adopterDescriptor,events:[{
        decision:'DENY',effect,ownerAuthorized:false,
        scopeAuthorized:false,leaseFresh:false,secretLogged:false
      }]
    });
    const expected=(effect,status,codes)=>({
      expectationSchemaVersion:1,mode:'synthetic-expectations-only',
      trace:synthetic(effect),expectedStatus:status,
      expected:[{event:1,ruleCodes:codes}]
    });
    const traceFile=join(adopter,'local-synthetic.json');
    const assertionFile=join(adopter,'local-expectation.json');
    const save=(path,fixture)=>{
      const data=JSON.stringify(fixture);
      assert.ok(Buffer.byteLength(data,'utf8')<=4096);
      writeFileSync(path,data,'utf8');
    };

    // M6-B: installed kit selector, from sibling cwd, has no target contact.
    const kitCall=adopterRun('adapter-kit','streamable-http');
    assert.equal(kitCall.status,0,'installed kit selector must pass');
    assert.equal(kitCall.stderr,'');
    const kit=JSON.parse(kitCall.stdout);
    assert.equal(kit.command,'adapter-kit');
    assert.equal(kit.kitSchemaVersion,1);
    assert.equal(kit.transport,'streamable-http');
    assert.equal(kit.status,'PASS');
    assert.equal(kit.connectionStatus,'NOT_ATTEMPTED');
    assert.equal(kit.externalTargetContacted,false);
    assert.equal(kit.projectSafetyAssessed,false);
    assert.equal(kit.releaseAuthorized,false);
    assert.equal(kit.expectedResults.expectedViolationCi.observedSafetyStatus,'FAIL');
    assert.equal(kit.expectedResults.expectedViolationCi.expectationStatus,'MATCH');

    // M6-C: verify the *complete exported CLI report*, not an untrusted
    // status field, using the installed package and unrelated adopter cwd.
    const kitBytes=JSON.stringify(kit);
    assert.ok(Buffer.byteLength(kitBytes,'utf8')<16384);
    writeFileSync(join(adopter,'fictional-kit.json'),kitBytes,'utf8');
    const kitVerification=adopterRun('adapter-kit-verify','fictional-kit.json');
    assert.equal(kitVerification.status,0,'installed kit verification must pass');
    assert.equal(kitVerification.stderr,'');
    const kitVerdict=JSON.parse(kitVerification.stdout);
    assert.equal(kitVerdict.command,'adapter-kit-verify');
    assert.equal(kitVerdict.reportSchemaVersion,1);
    assert.equal(kitVerdict.verificationSchemaVersion,1);
    assert.equal(kitVerdict.status,'PASS');
    assert.equal(kitVerdict.checked,3);
    // M6-E: installer-delivered JSON exposes source-authored human reading
    // without changing exit semantics or authorizing real MCP testing.
    assert.equal(kitVerdict.readerGuide.code,'FICTIONAL_KIT_CONTRACT_MATCH');
    assert.equal(kitVerdict.readerGuide.realProjectAssessed,false);
    assert.equal(kitVerdict.readerGuide.independentAuditCompleted,false);
    assert.equal(kitVerdict.readerGuide.independentBetaVerified,false);
    assert.equal(kitVerdict.readerGuide.nextSteps.length,2);
    assert.deepEqual(kitVerdict.checks.map(x=>x.matched),[true,true,true]);
    assert.equal(kitVerdict.checks[2].observedSafetyStatus,'FAIL');
    assert.equal(kitVerdict.checks[2].expectationStatus,'MATCH');
    assert.equal(kitVerdict.independentOriginVerified,false);
    assert.equal(kitVerdict.projectSafetyAssessed,false);
    assert.equal(kitVerdict.authorizationStatus,
      'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
    const tampered=structuredClone(kit);
    tampered.expectedResults.expectedViolationCi.observedSafetyStatus='PASS';
    writeFileSync(join(adopter,'fictional-forged-kit.json'),JSON.stringify(tampered),'utf8');
    const rejected=adopterRun('adapter-kit-verify','fictional-forged-kit.json');
    assert.equal(rejected.status,2);
    const rejectedReport=JSON.parse(rejected.stdout);
    assert.equal(rejectedReport.errorCode,'INVALID_OR_UNREADABLE_INPUT');
    assert.equal(rejectedReport.readerGuide.code,'INVALID_OFFLINE_INPUT');
    assert.equal(rejectedReport.readerGuide.realProjectAssessed,false);
    assert.ok(!rejected.stdout.includes('fictional-forged-kit.json'));

    save(join(adopter,'fictional-descriptor.json'),kit.starterDescriptor);
    save(join(adopter,'fictional-clean-ci.json'),kit.cleanExpectation);
    save(join(adopter,'fictional-negative-ci.json'),kit.expectedViolation);
    for(const [command,file,observedSafety] of [
      ['adapter-quickstart','fictional-descriptor.json',null],
      ['adapter-trace-expect','fictional-clean-ci.json','PASS'],
      ['adapter-trace-expect','fictional-negative-ci.json','FAIL']
    ]){
      const run=adopterRun(command,file);
      assert.equal(run.status,0,'installed kit source artifact must roundtrip');
      const result=JSON.parse(run.stdout);
      assert.equal(result.status,'PASS');
      assert.equal(result.connectionStatus,'NOT_ATTEMPTED');
      assert.equal(result.externalTargetContacted,false);
      if(observedSafety!==null){
        assert.equal(result.observedSafetyStatus,observedSafety);
        assert.equal(result.expectationStatus,'MATCH');
      }else assert.equal(result.projectSafetyAssessed,false);
    }

    save(traceFile,synthetic('WRITE'));
    const unsafeTrace=adopterRun('adapter-synthetic-trace','local-synthetic.json');
    assert.equal(unsafeTrace.status,1);
    const observed=JSON.parse(unsafeTrace.stdout);
    assertInert(observed);
    assert.equal(observed.status,'FAIL');
    assert.deepEqual(observed.findings,[
      {event:1,rule:'DENIED_ACTION_HAD_EFFECT'}
    ]);

    const expectationCases=[
      ['NONE','PASS',[],0,'PASS','MATCH',[]],
      ['WRITE','FAIL',['DENIED_ACTION_HAD_EFFECT'],0,'FAIL','MATCH',
        ['DENIED_ACTION_HAD_EFFECT']],
      ['WRITE','PASS',[],1,'FAIL','MISMATCH',
        ['DENIED_ACTION_HAD_EFFECT']]
    ];
    for(const [effect,status,codes,exit,observedSafety,match,findings] of
      expectationCases) {
      save(assertionFile,expected(effect,status,codes));
      const out=adopterRun('adapter-trace-expect','local-expectation.json');
      assert.equal(out.status,exit,'adopter matcher exit contract');
      assert.equal(out.stderr,'');
      const result=JSON.parse(out.stdout);
      assertInert(result);
      assert.equal(result.command,'adapter-trace-expect');
      assert.equal(result.status,exit===0?'PASS':'FAIL');
      assert.equal(result.exitCode,exit);
      assert.equal(result.expectationStatus,match);
      assert.equal(result.observedSafetyStatus,observedSafety);
      assert.deepEqual(result.observedFindings.map(x=>x.rule),findings);
      assert.equal(result.reportMeaning,'EXACT_SYNTHETIC_EXPECTATION_MATCH_ONLY');
      assert.equal(result.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
    }

    // Import the installed SDK module from a *different* working directory.
    // Relative resolution is pinned to the installed artifact, not src/ in
    // the repository or an implicit shell/current-directory assumption.
    const sdkFile=join(adopter,'sdk-smoke.mjs');
    writeFileSync(sdkFile, [
      "import {readFileSync} from 'node:fs';",
      "import {auditSymbolicTraceExpectations} from '../installed/node_modules/mcp-agent-security-test-suite/src/project-adapter.mjs';",
      "const x=JSON.parse(readFileSync(new URL('./local-expectation.json',import.meta.url),'utf8'));",
      "const r=auditSymbolicTraceExpectations(x);",
      "if(r.status!=='FAIL' || r.observedSafetyStatus!=='FAIL' ||",
      "   r.expectationStatus!=='MISMATCH' ||",
      "   r.authorizationStatus!=='REAL_TARGET_EXECUTION_NOT_AUTHORIZED')",
      "  throw Error('FICTIONAL_SDK_CONTRACT_FAILED');",
      "process.stdout.write('FICTIONAL_DOWNSTREAM_SDK_PASS\\n');"
    ].join('\n')+'\n','utf8');
    const sdk=invokeNode(sdkFile,[],adopter,env);
    assert.equal(sdk.status,0,'downstream SDK import must run from installed package');
    assert.equal(sdk.stdout,'FICTIONAL_DOWNSTREAM_SDK_PASS\n');
    assert.equal(sdk.stderr,'');

    // Negative cases must fail closed and never echo input paths, URLs, data.
    const errors=[
      ['adapter-onboard','not-a-file.json'],
      ['adapter-onboard','missing-package-fixture.json']
    ];
    const extra={...adopterDescriptor,execute:true};
    writeFileSync(join(adopter,'extra.json'),JSON.stringify(extra),'utf8');
    errors.push(['adapter-onboard','extra.json']);
    const injection=synthetic('NONE');
    injection.events[0].method='tools/call';
    save(traceFile,injection);
    errors.push(['adapter-synthetic-trace','local-synthetic.json']);
    const forged=expected('WRITE','FAIL',['REPLAYED_NONCE']);
    save(assertionFile,forged);
    errors.push(['adapter-trace-expect','local-expectation.json']);
    writeFileSync(join(adopter,'too-large.json'),
      JSON.stringify(expected('NONE','PASS',[]))+' '.repeat(5000),'utf8');
    errors.push(['adapter-trace-expect','too-large.json']);
    for(const [mode,filename] of errors){
      const bad=adopterRun(mode,filename);
      assert.equal(bad.status,2,'invalid downstream input must return exit 2');
      const report=JSON.parse(bad.stdout);
      assert.equal(report.status,'ERROR');
      assert.equal(report.errorCode,'INVALID_OR_UNREADABLE_INPUT');
      assert.equal(report.exitCode,2);
      for(const secret of [
        'fictional-private-adopter','mcp.example.org',
        adopter,filename,'REPLAYED_NONCE'
      ])assert.ok(!(bad.stdout+bad.stderr).includes(secret),
        'no downstream raw input/path in error output');
    }

    // Direct leaf symlinks are invalid inputs; on Windows creating symlinks
    // itself can require permissions. In that case, validate the portable
    // direct-symlink guard separately without creating a privileged link.
    const link=join(adopter,'local-symlink.json');
    let linked=false;
    try {
      symlinkSync(descriptorFile,link,'file');
      linked=true;
    } catch(e) {
      assert.ok(process.platform==='win32' &&
        ['EPERM','EACCES'].includes(e.code),'unexpected link failure');
    }
    if(linked) {
      const denied=adopterRun('adapter-onboard','local-symlink.json');
      assert.equal(denied.status,2,'direct symlink must be denied');
      assert.equal(JSON.parse(denied.stdout).errorCode,
        'INVALID_OR_UNREADABLE_INPUT');
    }
    assert.ok(!existsSync(join(adopter,'src','cli.mjs')),
      'downstream project must not shadow the installed CLI');

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
