/**
 * Stable, additive JSON contract for the OFFLINE CLI. Direct module APIs retain
 * their original per-command return values. This is NOT a secret/DLP scanner.
 */
export const REPORT_SCHEMA_VERSION = 1;
export const CLI_COMMANDS = Object.freeze([
  'scenario','trace','mock','witness','process','stdio','loopback','jsonrpc','era','negotiate','demo'
]);
const COMMANDS = new Set(CLI_COMMANDS);
const ERRORS = new Set(['INVALID_CLI_ARGUMENTS','INVALID_OR_UNREADABLE_INPUT']);
const RULE = /^[A-Z][A-Z0-9_]{0,127}$/;

/**
 * M5-02: reviewed literal advice only. Never interpolate native finding text,
 * paths, parameter values or exception messages. This is not redaction/DLP.
 */
const GUIDE_LIMIT = 3;
const GUIDES = Object.freeze({
  DENIED_ACTION_HAD_EFFECT: Object.freeze({
    code:'DENIED_ACTION_HAD_EFFECT',
    explanation:'A fictional denied action still produced an effect.',
    nextStep:'Make denial produce NONE; assert no read or write occurs.',
    exampleCommand:'node src/cli.mjs trace fixtures/trace-unsafe.jsonl'
  }),
  FLAGGED_SECRET_IN_AUDIT_LOG: Object.freeze({
    code:'FLAGGED_SECRET_IN_AUDIT_LOG',
    explanation:'A synthetic audit event explicitly flags logged secret material.',
    nextStep:'Remove confidential fields from logs; keep only sanitized boolean evidence.',
    exampleCommand:'node src/cli.mjs trace fixtures/trace-unsafe-secret.jsonl'
  }),
  RETRY_PARAMS_CHANGED: Object.freeze({
    code:'RETRY_PARAMS_CHANGED',
    explanation:'A fictional protocol-version retry changed other request parameters.',
    nextStep:'Keep the method and every parameter except the negotiated protocol version unchanged.',
    exampleCommand:'node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json'
  })
});
const ERROR_GUIDES = Object.freeze({
  INVALID_CLI_ARGUMENTS: Object.freeze({
    code:'INVALID_CLI_ARGUMENTS',
    explanation:'Invalid command or argument count.',
    nextStep:'Try the no-argument fictional demo.',
    exampleCommand:'node src/cli.mjs demo'
  }),
  INVALID_OR_UNREADABLE_INPUT: Object.freeze({
    code:'INVALID_OR_UNREADABLE_INPUT',
    explanation:'Invalid or unreadable fictional input.',
    nextStep:'Check UTF-8 and 1 MiB size limit.',
    exampleCommand:'node src/cli.mjs demo'
  })
});
function safeGuidance(codes) {
  return codes.filter(code=>Object.hasOwn(GUIDES,code))
    .slice(0,GUIDE_LIMIT).map(code=>({...GUIDES[code]}));
}

const EMPTY_SUMMARY = () => ({
  failureCount:0, reportedFindings:0, findingsTruncated:false, ruleCodes:[]
});

function checkCommand(command,nullable=false) {
  if (nullable && command===null) return;
  if (!COMMANDS.has(command)) throw new TypeError('INVALID_REPORT_COMMAND');
}

/** Add stable public fields but preserve all legacy command-specific fields. */
export function buildCliReport(command,result) {
  checkCommand(command);
  if (!result || typeof result!=='object' ||
      (result.status!=='PASS' && result.status!=='FAIL')) {
    throw new TypeError('INVALID_REPORT_STATUS');
  }
  const rows = ['findings','failures','mismatches']
    .map(key=>result[key]).find(Array.isArray) ?? [];
  const failureCount = Number.isSafeInteger(result.failureCount) && result.failureCount>=0
    ? result.failureCount : rows.length;
  const ruleCodes = [...new Set(rows.map(row=>
    typeof row?.rule==='string' && RULE.test(row.rule)
      ? row.rule : 'UNCLASSIFIED_FINDING'))].sort();
  const exitCode = result.status==='PASS'?0:1;
  return {
    ...result,
    reportSchemaVersion:REPORT_SCHEMA_VERSION,
    command,
    exitCode,
    summary:{
      failureCount,
      reportedFindings:rows.length,
      findingsTruncated:result.findingsTruncated===true,
      ruleCodes
    },
    guidance: result.status==='FAIL' ? safeGuidance(ruleCodes) : []
  };
}

/** For user/file/parser failures never serialize the exception or user input. */
export function buildCliErrorReport(command,errorCode) {
  checkCommand(command,true);
  if (!ERRORS.has(errorCode)) throw new TypeError('INVALID_REPORT_ERROR_CODE');
  return {
    reportSchemaVersion:REPORT_SCHEMA_VERSION,
    command,
    exitCode:2,
    status:'ERROR',
    errorCode,
    summary:EMPTY_SUMMARY(),
    guidance:[{...ERROR_GUIDES[errorCode]}]
  };
}


/**
 * Fixed first-run demonstration verdict. Accept only the *known synthetic*
 * positive and negative controls. Never copy untrusted fixture fields.
 * This is not an assessment of any real user's MCP installation.
 */
export function buildOfflineDemoResult(positive, negative) {
  const positiveMatches = positive?.status === 'PASS' &&
    positive.checks === 11 && positive.actualFinal?.denied === 9 &&
    positive.actualFinal?.allowed === 2 && positive.actualFinal?.writes === 1 &&
    positive.actualFinal?.reads === 1 &&
    Array.isArray(positive.mismatches) && positive.mismatches.length === 0;
  const negativeMatches = negative?.status === 'FAIL' &&
    negative.failureCount === 1 && Array.isArray(negative.findings) &&
    negative.findings.length === 1 &&
    negative.findings[0]?.rule === 'RETRY_PARAMS_CHANGED';
  const findings = [];
  if (!positiveMatches) findings.push({step:1, rule:'DEMO_POSITIVE_CONTROL_MISMATCH'});
  if (!negativeMatches) findings.push({step:2, rule:'DEMO_NEGATIVE_CONTROL_MISSED'});
  return {
    status: findings.length ? 'FAIL' : 'PASS',
    profile:'bundled-fictional-demo-v1',
    checks:2,
    expectations:[
      {name:'SYNTHETIC_AUTHORIZATION_DENIALS',matched:positiveMatches},
      {name:'SYNTHETIC_RETRY_MUTATION_DETECTED',matched:negativeMatches}
    ],
    failureCount:findings.length,
    findingsTruncated:false,
    findings
  };
}
