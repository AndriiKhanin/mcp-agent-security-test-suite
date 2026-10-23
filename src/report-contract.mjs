/**
 * Stable, additive JSON contract for the OFFLINE CLI. Direct module APIs retain
 * their original per-command return values. This is NOT a secret/DLP scanner.
 */
export const REPORT_SCHEMA_VERSION = 1;
export const CLI_COMMANDS = Object.freeze([
  'scenario','trace','mock','witness','process','jsonrpc','era','negotiate'
]);
const COMMANDS = new Set(CLI_COMMANDS);
const ERRORS = new Set(['INVALID_CLI_ARGUMENTS','INVALID_OR_UNREADABLE_INPUT']);
const RULE = /^[A-Z][A-Z0-9_]{0,127}$/;
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
    }
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
    summary:EMPTY_SUMMARY()
  };
}
