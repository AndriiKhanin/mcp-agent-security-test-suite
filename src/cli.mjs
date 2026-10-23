#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runScenario } from './scenario.mjs';
import { runMockMcpScenario } from './adapter-harness.mjs';
import { runWitnessedScenario } from './witness-harness.mjs';
import { runProcessMcpScenario } from './process-mcp-harness.mjs';
import { runStdioMockScenario } from './stdio-mcp-harness.mjs';
import { runLoopbackHttpScenario } from './loopback-http-mock.mjs';
import { parseStrictJson } from './strict-json.mjs';
import { auditRecords, parseJsonl } from './trace.mjs';
import { auditJsonRpcExchange } from './jsonrpc-contract.mjs';
import { auditMcpEraTranscript } from './mcp-era-contract.mjs';
import { auditModernNegotiation } from './mcp-modern-negotiation.mjs';
import { CLI_COMMANDS, buildCliReport, buildCliErrorReport, buildOfflineDemoResult, buildCliHelpResult, buildCliVersionResult } from './report-contract.mjs';

async function readBoundedFile(path) {
  // Open a single handle with O_NOFOLLOW where available; reject non-regular file.
  const fs = await import('node:fs');
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const h = await open(path, flags);
  try {
    const stat = await h.stat();
    if (!stat.isFile() || stat.size > 1024*1024) throw new Error('INVALID_FILE');
    const buff = Buffer.alloc(1024*1024 + 1);
    const { bytesRead } = await h.read(buff, 0, buff.length, 0);
    if (bytesRead > 1024*1024) throw new Error('OVERSIZED_FILE');
    // strict UTF-8 decoding prevents silent malformed input replacement.
    return new TextDecoder('utf-8', {fatal: true}).decode(buff.subarray(0, bytesRead));
  } finally { await h.close(); }
}
const emit = payload => process.stdout.write(JSON.stringify(payload,null,2)+'\n');

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
  const noFile = command === 'demo' || command === 'help' || command === 'version';
  if (!CLI_COMMANDS.includes(command) ||
      (noFile ? args.length !== 1 : args.length !== 2 || args[1].startsWith('-'))) {
    process.stderr.write('USAGE: node src/cli.mjs help|version|demo OR scenario|trace|mock|witness|process|stdio|loopback|jsonrpc|era|negotiate <synthetic-file>\n');
    emit(buildCliErrorReport(CLI_COMMANDS.includes(command)?command:null,'INVALID_CLI_ARGUMENTS'));
    return 2;
  }
  try {
    if (command === 'help') {
      const report = buildCliReport('help', buildCliHelpResult());
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
    if (command === 'demo') {
      const report = buildCliReport('demo', await runOfflineDemo());
      emit(report);
      return report.exitCode;
    }
    const source = await readBoundedFile(args[1]);
    const result = args[0] === 'negotiate' ? auditModernNegotiation(parseStrictJson(source)) :
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
    // Fail closed; never echo paths, input or parser messages.
    process.stderr.write('ERROR: INVALID_OR_UNREADABLE_INPUT\n');
    emit(buildCliErrorReport(args[0],'INVALID_OR_UNREADABLE_INPUT'));
    return 2;
  }
}
process.exitCode = await main();
