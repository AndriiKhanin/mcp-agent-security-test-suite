#!/usr/bin/env node
/**
 * Dependency-free offline contributor smoke demo.
 * Runs ONLY two bundled fictional fixtures; not an external target scanner.
 * Deliberately treats a detected security violation as a successful negative
 * control only when status, code, rule, and v1 schema all match.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const invoke = (mode,file) => {
  const run=spawnSync(process.execPath,['src/cli.mjs',mode,file],{
    cwd:root,encoding:'utf8',shell:false,windowsHide:true,
    env:{NODE_NO_WARNINGS:'1'},timeout:15000,maxBuffer:65536
  });
  if(run.error || run.signal || !Number.isSafeInteger(run.status)) throw Error('EXECUTION_FAILED');
  let json;
  try {json=JSON.parse(run.stdout);} catch {throw Error('INVALID_CLI_JSON');}
  if(!json || json.reportSchemaVersion!==1 || json.command!==mode ||
     json.exitCode!==run.status) throw Error('SCHEMA_MISMATCH');
  return {exitCode:run.status,result:json};
};
try{
  if(process.argv.length!==2) throw Error('NO_CUSTOM_ARGUMENTS');
  const safe=invoke('scenario','fixtures/scenario-denial.json');
  if(safe.exitCode!==0 || safe.result.status!=='PASS' ||
     safe.result.actualFinal?.denied!==9 || safe.result.actualFinal?.writes!==1 ||
     safe.result.summary.failureCount!==0) throw Error('SAFE_FIXTURE_FAILED');

  const unsafe=invoke('negotiate','fixtures/mcp-negotiate-unsafe-params.json');
  if(unsafe.exitCode!==1 || unsafe.result.status!=='FAIL' ||
     !unsafe.result.summary.ruleCodes.includes('RETRY_PARAMS_CHANGED') ||
     unsafe.result.summary.failureCount<1) throw Error('NEGATIVE_CONTROL_MISSED');

  // The messages below are fixed, avoiding raw fixture or error echo.
  process.stdout.write('SAFE_FIXTURE_PASS: expected synthetic denials caused no unauthorized effects\n');
  process.stdout.write('EXPECTED_FAIL_DETECTED: RETRY_PARAMS_CHANGED, exit code 1\n');
  process.stdout.write('DEMO_PASS: both offline contract checks behaved as expected\n');
} catch {
  process.stderr.write('DEMO_FAIL: offline example did not meet its fixed assertions\n');
  process.exitCode=1;
}
