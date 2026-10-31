#!/usr/bin/env node
import { open, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runScenario } from './scenario.mjs';
import { runMockMcpScenario } from './adapter-harness.mjs';
import { runWitnessedScenario } from './witness-harness.mjs';
import { runProcessMcpScenario } from './process-mcp-harness.mjs';
import { runStdioMockScenario } from './stdio-mcp-harness.mjs';
import { runLoopbackHttpScenario } from './loopback-http-mock.mjs';
import { runFirstPartyStagingSelftest } from './first-party-staging-mcp.mjs';
import { runFirstPartyStagingProcessSelftest } from './staging-process-harness.mjs';
import { parseStrictJson } from './strict-json.mjs';
import { inspectProjectAdapter, previewProjectOnboarding, createOfflineAdapterTemplate, auditOfflineProjectFixtureBundle, auditSymbolicProjectTrace, auditSymbolicTraceExpectations, previewOfflineAdapterQuickstart, createOfflineAdopterKit, verifyOfflineAdopterKit, importOfflineClientConfig } from './project-adapter.mjs';
import { evaluateAdapterConsent } from './adapter-consent.mjs';
import { runFirstPartyAdapterSelftest, runFixedModernStagingAdapterSelftest, runFixedOnboardingDemo } from './local-adapter-drivers.mjs';
import { auditRecords, parseJsonl } from './trace.mjs';
import { auditJsonRpcExchange } from './jsonrpc-contract.mjs';
import { auditMcpEraTranscript } from './mcp-era-contract.mjs';
import { auditModernNegotiation } from './mcp-modern-negotiation.mjs';
import { CLI_COMMANDS, buildCliReport, buildCliErrorReport, buildOfflineDemoResult, buildCliHelpResult, buildCliVersionResult, buildAdapterGuideResult } from './report-contract.mjs';

async function readBoundedFile(path,maxBytes=1024*1024) {
  // Open a single handle with O_NOFOLLOW where available; reject non-regular file.
  const fs = await import('node:fs');
  // Reject a direct symlink even on platforms without O_NOFOLLOW (Windows).
  // O_NOFOLLOW adds a race-resistant leaf check where supported by the OS.
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('INVALID_FILE');
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const h = await open(path, flags);
  try {
    const stat = await h.stat();
    // Fail closed if the entry changed between lstat and open. This does not
    // claim secure resolution of every symlink in the ancestor directory tree.
    if (!stat.isFile() || stat.dev !== before.dev || stat.ino !== before.ino ||
        stat.size > maxBytes) throw new Error('INVALID_FILE');
    const buff = Buffer.alloc(maxBytes + 1);
    const { bytesRead } = await h.read(buff, 0, buff.length, 0);
    if (bytesRead > maxBytes) throw new Error('OVERSIZED_FILE');
    // strict UTF-8 decoding prevents silent malformed input replacement.
    return new TextDecoder('utf-8', {fatal: true}).decode(buff.subarray(0, bytesRead));
  } finally { await h.close(); }
}
const emit = payload => process.stdout.write(JSON.stringify(payload,null,2)+'\n');

/**
 * M6-F: this view consumes ONLY a report just computed locally from a strictly
 * validated fictional expectation. Never parse arbitrary saved reports or
 * print any caller-controlled field. JSON CI outputs remain the default.
 */
const TERMINAL_STATES=Object.freeze({
  CLEAN_FICTIONAL_TRACE_MATCH:Object.freeze({status:'PASS',exit:0,expectation:'MATCH'}),
  FICTIONAL_VIOLATION_DETECTED_AS_EXPECTED:Object.freeze({status:'PASS',exit:0,expectation:'MATCH'}),
  FICTIONAL_EXPECTATION_MISMATCH:Object.freeze({status:'FAIL',exit:1,expectation:'MISMATCH'}),
  INVALID_OFFLINE_INPUT:Object.freeze({status:'ERROR',exit:2,expectation:'NOT EVALUATED'})
});
function emitFictionalTerminalView(report){
  const guide=report.readerGuide;
  const state=guide && Object.hasOwn(TERMINAL_STATES,guide.code)
    ? TERMINAL_STATES[guide.code] : null;
  if(!state || report.status!==state.status ||
     report.exitCode!==state.exit ||
     guide.reportScope!=='FICTIONAL_OFFLINE_ASSERTIONS_ONLY' ||
     guide.realProjectAssessed!==false ||
     guide.externalMcpContactAuthorized!==false ||
     guide.independentAuditCompleted!==false ||
     guide.independentBetaVerified!==false ||
     guide.ownerOperatorVerified!==false ||
     guide.stableReleaseAuthorized!==false ||
     !Array.isArray(guide.nextSteps) || guide.nextSteps.length!==2)
    throw new TypeError('UNSUPPORTED_FICTIONAL_TERMINAL_RESULT');
  const observed=state.exit===2?'NOT EVALUATED':
    report.observedSafetyStatus==='PASS'?'PASS':
    report.observedSafetyStatus==='FAIL'?'FAIL':null;
  if(observed===null || (state.exit===0 &&
      ((guide.code==='CLEAN_FICTIONAL_TRACE_MATCH' && observed!=='PASS') ||
       (guide.code==='FICTIONAL_VIOLATION_DETECTED_AS_EXPECTED' && observed!=='FAIL'))) ||
     (state.exit!==2 && report.expectationStatus!==state.expectation))
    throw new TypeError('UNSUPPORTED_FICTIONAL_TERMINAL_RESULT');
  // The guide is made from reviewed source literals by buildCliReport only.
  process.stdout.write([
    'FICTIONAL ONLY - offline symbolic expectation, not a real MCP assessment',
    'CI expectation: '+state.expectation,
    'Observed fictional safety: '+observed,
    'Exit code: '+state.exit,
    'Result: '+guide.title,
    'Meaning: '+guide.meaning,
    'Next steps:',
    '1. '+guide.nextSteps[0],
    '2. '+guide.nextSteps[1],
    'Real project assessed: NO',
    'Real MCP target execution: NOT AUTHORIZED',
    'Operator ownership: NOT VERIFIED',
    'Independent security audit: NOT COMPLETED',
    'Independent external beta: NOT VERIFIED',
    'Stable publication: NOT AUTHORIZED'
  ].join('\n')+'\n');
}

/**
 * F1: human-facing view contains only reviewed literals and fixed enums.
 * Never interpolate descriptor paths, project names, endpoints or payloads.
 * The JSON-v1 report remains the default contract for CI callers.
 */
function emitStartText(report) {
  if (report.command!=='start' || report.productStage!=='F1' ||
      !['PASS','FAIL'].includes(report.status) ||
      !['PASS','FAIL'].includes(report.demoStatus) ||
      !['PASS','FAIL'].includes(report.stagingStatus) ||
      !['NOT_PROVIDED','DESCRIPTOR_VALIDATED','CLIENT_CONFIG_VALIDATED_OFFLINE'].includes(report.descriptorEvidence) ||
      report.externalTargetContacted!==false ||
      report.projectConnectionAuthorized!==false ||
      report.executionEnabled!==false || report.operatorVerified!==false ||
      !['NOT_APPLICABLE','EXPLICIT_SERVER_SELECTED','SINGLE_SERVER_ENTRY'].includes(report.selectionEvidence))
    throw new TypeError('INVALID_F1_TEXT_REPORT');
  process.stdout.write([
    'MCP Agent Security — guided offline first run (F1)',
    'Result: '+report.status+' (first-party evidence only)',
    'Bundled fictional controls: '+report.demoStatus,
    'Disposable local MCP mock: '+report.stagingStatus,
    'Local descriptor: '+(report.descriptorEvidence==='DESCRIPTOR_VALIDATED'?'VALIDATED OFFLINE':
      report.descriptorEvidence==='CLIENT_CONFIG_VALIDATED_OFFLINE'?'CLIENT CONFIG VALIDATED OFFLINE':'NOT PROVIDED'),
    'Server selection: '+(report.selectionEvidence==='EXPLICIT_SERVER_SELECTED'?'EXPLICIT OFFLINE':
      report.selectionEvidence==='SINGLE_SERVER_ENTRY'?'SINGLE ENTRY':'NOT APPLICABLE'),
    'User MCP server checked: NO',
    'User MCP server contacted: NO',
    'User project command executed: NO',
    'Operator ownership verified: NO',
    'This is NOT a security assessment of your MCP server.',
    'Next: use start --client-config <client-config.json> --server NAME --text to select one entry offline.',
    'Real staging checks require separate owner authorization under Issue #21.',
    'For CI, omit --text to receive the stable JSON-v1 report.'
  ].join('\n')+'\n');
}

async function runOfflineDemo() {
  // No caller-controlled paths: these two fictional fixtures are shipped in
  // the reviewed npm package and opened via the same bounded input helper.
  const positiveSource = await readBoundedFile(fileURLToPath(
    new URL('../fixtures/scenario-denial.json', import.meta.url)
  ));
  const negativeSource = await readBoundedFile(fileURLToPath(
    new URL('../fixtures/mcp-negotiate-unsafe-params.json', import.meta.url)
  ));
  return buildOfflineDemoResult(
    runScenario(parseStrictJson(positiveSource)),
    auditModernNegotiation(parseStrictJson(negativeSource))
  );
}

async function main() {
  const args=process.argv.slice(2);
  const aliases = Object.freeze({
    '--help':'help', '-h':'help', '--version':'version', '-V':'version'
  });
  const command = Object.hasOwn(aliases, args[0]) ? aliases[args[0]] : args[0];
  const startText=command==='start' && args.at(-1)==='--text';
  const startArgs=startText?args.slice(0,-1):args;
  const clientConfig=startArgs[0]==='start' && startArgs[1]==='--client-config';
  const serverSelected=clientConfig && startArgs[3]==='--server';
  const noFile = command === 'start' || command === 'demo' || command === 'help' || command === 'version' || command === 'adapter-guide' || command === 'adapter-selftest' || command === 'staging-selftest' || command === 'staging-process-selftest' || command === 'adapter-staging-selftest' || command === 'adapter-onboarding-demo';
  // Only two reviewed selectors are legal. Never treat template selection as
  // a file path, process command, URL, flag or caller-provided descriptor.
  const validArgs=command==='start' ? (clientConfig ?
      (!startArgs[2]?.startsWith('-') &&
       (startArgs.length===3 ||
        (startArgs.length===5 && serverSelected &&
         /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/u.test(startArgs[4])))) :
      (startArgs.length===1 || (startArgs.length===2 && !startArgs[1].startsWith('-'))))
    : (command==='adapter-template' || command==='adapter-kit')
    ? args.length===2 && ['stdio','streamable-http'].includes(args[1])
    : noFile ? args.length===1
      : args.length===2 && !args[1].startsWith('-');
  if (!CLI_COMMANDS.includes(command) || !validArgs) {
    if(command==='adapter-report-view'){
      emitFictionalTerminalView(buildCliErrorReport('adapter-trace-expect','INVALID_CLI_ARGUMENTS'));
      return 2;
    }
    process.stderr.write('USAGE: node src/cli.mjs start [local-descriptor.json] [--text] OR start --client-config <client-config.json> [--server NAME] [--text] OR help|version|demo|adapter-guide|adapter-selftest|staging-selftest|staging-process-selftest|adapter-staging-selftest|adapter-onboarding-demo OR adapter-template|adapter-kit stdio|streamable-http OR adapter-report-view|adapter-kit-verify|adapter-quickstart|adapter-trace-expect|adapter-synthetic-trace|adapter-fixture-audit|adapter-onboard|adapter-check|adapter-policy-check|scenario|trace|mock|witness|process|stdio|loopback|jsonrpc|era|negotiate <synthetic-file>\n');
    emit(buildCliErrorReport(CLI_COMMANDS.includes(command)?command:null,'INVALID_CLI_ARGUMENTS'));
    return 2;
  }
  try {
    if (command === 'help') {
      const report = buildCliReport('help', buildCliHelpResult());
      emit(report);
      return report.exitCode;
    }
    if (command === 'adapter-guide') {
      const report=buildCliReport('adapter-guide',buildAdapterGuideResult());
      emit(report);
      return report.exitCode;
    }
    if (command === 'version') {
      const metadata = parseStrictJson(await readBoundedFile(fileURLToPath(
        new URL('../package.json', import.meta.url)
      )));
      const report = buildCliReport('version', buildCliVersionResult(metadata));
      emit(report);
      return report.exitCode;
    }
    if (command === 'staging-process-selftest') {
      const report=buildCliReport('staging-process-selftest',await runFirstPartyStagingProcessSelftest());
      emit(report);
      return report.exitCode;
    }
    if (command === 'staging-selftest') {
      const report=buildCliReport('staging-selftest',await runFirstPartyStagingSelftest());
      emit(report);
      return report.exitCode;
    }
    if (command === 'adapter-kit') {
      const report=buildCliReport('adapter-kit',createOfflineAdopterKit(args[1]));
      emit(report);
      return report.exitCode;
    }
    if (command === 'adapter-template') {
      const report=buildCliReport('adapter-template',createOfflineAdapterTemplate(args[1]));
      emit(report);
      return report.exitCode;
    }
    if (command === 'adapter-onboarding-demo') {
      const report=buildCliReport('adapter-onboarding-demo',await runFixedOnboardingDemo());
      emit(report);
      return report.exitCode;
    }
    if (command === 'adapter-staging-selftest') {
      const report=buildCliReport('adapter-staging-selftest',await runFixedModernStagingAdapterSelftest());
      emit(report);
      return report.exitCode;
    }
    if (command === 'adapter-selftest') {
      const report=buildCliReport('adapter-selftest',await runFirstPartyAdapterSelftest());
      emit(report);
      return report.exitCode;
    }
    if (command === 'start') {
      // F1: one installed-package entry point; caller's descriptor is inert.
      // The staging demo is always the *fixed first-party loopback*, never
      // derived from the supplied config or its embedded command/endpoint.
      const descriptor=clientConfig
        ? previewProjectOnboarding(importOfflineClientConfig(
            parseStrictJson(await readBoundedFile(startArgs[2],4096)),
            serverSelected?startArgs[4]:null))
        : startArgs.length===2
          ? previewProjectOnboarding(parseStrictJson(await readBoundedFile(startArgs[1],4096)))
          : null;
      const demo=await runOfflineDemo();
      const staged=await runFixedOnboardingDemo();
      const findings=[];
      if(demo.status!=='PASS') findings.push({rule:'BUNDLED_DEMO_MISMATCH'});
      if(staged.status!=='PASS') findings.push({rule:'FIRST_PARTY_STAGING_DEMO_MISMATCH'});
      const report=buildCliReport('start',{
        status:findings.length?'FAIL':'PASS',
        profile:'f1-guided-offline-first-run-v1',productStage:'F1',
        scope:'FICTIONAL_CHECKS_AND_FIXED_FIRST_PARTY_LOOPBACK_ONLY',
        demoStatus:demo.status,stagingStatus:staged.status,
        descriptorEvidence:clientConfig?'CLIENT_CONFIG_VALIDATED_OFFLINE':descriptor?'DESCRIPTOR_VALIDATED':'NOT_PROVIDED',
        selectionEvidence:clientConfig?(serverSelected?'EXPLICIT_SERVER_SELECTED':'SINGLE_SERVER_ENTRY'):'NOT_APPLICABLE',
        supportedTransportProfiles:['stdio','streamable-http'],
        targetEvidence:'REAL_TARGET_NOT_ATTEMPTED',
        connectionStatus:'FIXED_FIRST_PARTY_STAGING_ONLY',
        externalTargetContacted:false,projectConnectionAuthorized:false,
        operatorVerified:false,executionEnabled:false,
        nextActions:[
          {step:1,command:'mcp-agent-security start --client-config <client-config.json> --server NAME',
           meaning:'Offline config validation only; no user server is launched.'},
          {step:2,command:'mcp-agent-security start',
           meaning:'Repeat source-owned tests and the disposable local mock.'},
          {step:3,command:null,
           meaning:'Real staging target checks need separate authorization under Issue #21.'}
        ],
        failureCount:findings.length,findingsTruncated:false,findings
      });
      if(startText) emitStartText(report);
      else emit(report);
      return report.exitCode;
    }
    if (command === 'demo') {
      const report = buildCliReport('demo', await runOfflineDemo());
      emit(report);
      return report.exitCode;
    }
    if(command==='adapter-report-view'){
      // Strict <=4KiB direct-symlink-rejecting UTF-8 reader; only the same
      // enum/Boolean expectation grammar as adapter-trace-expect is accepted.
      const fictional=parseStrictJson(await readBoundedFile(args[1],4096));
      const result=auditSymbolicTraceExpectations(fictional);
      const report=buildCliReport('adapter-trace-expect',result);
      emitFictionalTerminalView(report);
      return report.exitCode;
    }
    const source = await readBoundedFile(args[1],command==='adapter-kit-verify'?16384:command==='adapter-quickstart'?4096:command==='adapter-trace-expect'?4096:command==='adapter-synthetic-trace'?4096:command==='adapter-fixture-audit'?16384:1024*1024);
    const result = command === 'adapter-kit-verify' ? verifyOfflineAdopterKit(parseStrictJson(source)) :
      command === 'adapter-quickstart' ? previewOfflineAdapterQuickstart(parseStrictJson(source)) :
      command === 'adapter-trace-expect' ? auditSymbolicTraceExpectations(parseStrictJson(source)) :
      command === 'adapter-synthetic-trace' ? auditSymbolicProjectTrace(parseStrictJson(source)) :
      command === 'adapter-fixture-audit' ? auditOfflineProjectFixtureBundle(parseStrictJson(source)) :
      args[0] === 'adapter-onboard' ? previewProjectOnboarding(parseStrictJson(source)) :
      args[0] === 'adapter-policy-check' ? evaluateAdapterConsent(parseStrictJson(source)) :
      args[0] === 'adapter-check' ? inspectProjectAdapter(parseStrictJson(source)) :
      args[0] === 'negotiate' ? auditModernNegotiation(parseStrictJson(source)) :
      args[0] === 'era' ? auditMcpEraTranscript(parseStrictJson(source)) :
      args[0] === 'jsonrpc' ? auditJsonRpcExchange(parseStrictJson(source)) :
      args[0] === 'scenario' ? runScenario(parseStrictJson(source)) :
      args[0] === 'mock' ? await runMockMcpScenario(parseStrictJson(source)) :
      args[0] === 'witness' ? await runWitnessedScenario(parseStrictJson(source)) :
      args[0] === 'process' ? await runProcessMcpScenario(parseStrictJson(source)) :
      args[0] === 'stdio' ? runStdioMockScenario(parseStrictJson(source)) :
      args[0] === 'loopback' ? await runLoopbackHttpScenario(parseStrictJson(source)) : auditRecords(parseJsonl(source));
    const report = buildCliReport(args[0],result);
    emit(report);
    return report.exitCode;
  } catch {
    if(command==='adapter-report-view'){
      emitFictionalTerminalView(buildCliErrorReport('adapter-trace-expect','INVALID_OR_UNREADABLE_INPUT'));
      return 2;
    }
    // Fail closed; never echo paths, input or parser messages.
    process.stderr.write('ERROR: INVALID_OR_UNREADABLE_INPUT\n');
    emit(buildCliErrorReport(args[0],'INVALID_OR_UNREADABLE_INPUT'));
    return 2;
  }
}
process.exitCode = await main();
