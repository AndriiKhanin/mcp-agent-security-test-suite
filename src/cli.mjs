#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { runScenario } from './scenario.mjs';
import { runMockMcpScenario } from './adapter-harness.mjs';
import { runWitnessedScenario } from './witness-harness.mjs';
import { runProcessMcpScenario } from './process-mcp-harness.mjs';
import { parseStrictJson } from './strict-json.mjs';
import { auditRecords, parseJsonl } from './trace.mjs';
import { auditJsonRpcExchange } from './jsonrpc-contract.mjs';
import { auditMcpEraTranscript } from './mcp-era-contract.mjs';
import { auditModernNegotiation } from './mcp-modern-negotiation.mjs';

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
async function main() {
  const args=process.argv.slice(2);
  if (args.length!==2 || !['scenario','trace','mock','witness','process','jsonrpc','era','negotiate'].includes(args[0]) || args[1].startsWith('-')) {
    process.stderr.write('USAGE: node src/cli.mjs scenario|trace|mock|witness|process|jsonrpc|era|negotiate <synthetic-file>\n');
    return 2;
  }
  try {
    const source = await readBoundedFile(args[1]);
    const result = args[0] === 'negotiate' ? auditModernNegotiation(parseStrictJson(source)) :
      args[0] === 'era' ? auditMcpEraTranscript(parseStrictJson(source)) :
      args[0] === 'jsonrpc' ? auditJsonRpcExchange(parseStrictJson(source)) :
      args[0] === 'scenario' ? runScenario(parseStrictJson(source)) :
      args[0] === 'mock' ? await runMockMcpScenario(parseStrictJson(source)) :
      args[0] === 'witness' ? await runWitnessedScenario(parseStrictJson(source)) :
      args[0] === 'process' ? await runProcessMcpScenario(parseStrictJson(source)) : auditRecords(parseJsonl(source));
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    return result.status==='PASS'?0:1;
  } catch {
    // Fail closed; never echo paths, input or parser messages.
    process.stderr.write('ERROR: INVALID_OR_UNREADABLE_INPUT\n');
    return 2;
  }
}
process.exitCode = await main();
