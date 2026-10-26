/**
 * Stable, additive JSON contract for the OFFLINE CLI. Direct module APIs retain
 * their original per-command return values. This is NOT a secret/DLP scanner.
 */
export const REPORT_SCHEMA_VERSION = 1;
export const CLI_COMMANDS = Object.freeze([
  'scenario','trace','mock','witness','process','stdio','loopback','jsonrpc','era','negotiate','demo','help','version','adapter-check','adapter-selftest','adapter-policy-check','staging-selftest','staging-process-selftest','adapter-staging-selftest','adapter-onboard','adapter-onboarding-demo','adapter-template','adapter-fixture-audit','adapter-synthetic-trace','adapter-trace-expect','adapter-quickstart','adapter-kit','adapter-kit-verify','adapter-report-view','adapter-guide'
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


/**
 * M6-E: fixed public-language interpretation for four offline onboarding
 * commands. No user-provided report fields, paths, endpoints, rule labels,
 * tokens, errors or trace contents are interpolated into prose. All messages
 * concern fictional controls ONLY, never customer MCP security.
 */
const READER_COMMANDS=new Set([
  'adapter-kit','adapter-quickstart',
  'adapter-kit-verify','adapter-trace-expect','adapter-check','adapter-onboard'
]);
const DESCRIPTOR_GUIDE=Object.freeze({
  VALID:Object.freeze({
    code:'OFFLINE_DESCRIPTOR_VALIDATED',
    title:'Offline descriptor accepted',
    meaning:'Only local descriptor shape and deny-by-default policy were checked. No real MCP endpoint or user code was contacted.',
    nextSteps:Object.freeze([
      'Review the expected transport and protocol version in the local JSON report.',
      'Run the bundled adapter-smoke source example before considering any separately authorized integration.'
    ])
  }),
  INVALID:Object.freeze({
    code:'OFFLINE_DESCRIPTOR_INPUT_REJECTED',
    title:'Offline descriptor could not be validated',
    meaning:'The file or descriptor was rejected. The report cannot identify a particular failing field without disclosing input-derived details.',
    nextSteps:Object.freeze([
      'Compare the local JSON with examples/adapter-profiles/stdio-project.json or streamable-http-project.json: exact keys and protocolVersion are required.',
      'Use validate-only policy: allowNetwork, allowProcessSpawn, allowToolCalls and allowCredentials must all be false; check UTF-8 and 1 MiB maximum.'
    ])
  })
});
const READER_KINDS=Object.freeze({
  KIT_READY:Object.freeze({
    code:'FICTIONAL_KIT_GENERATED',
    title:'Fictional starter kit generated',
    meaning:'The example kit is inert JSON. No project was connected or inspected.',
    nextSteps:Object.freeze([
      'Save the fictional kit JSON in a disposable workspace.',
      'Run adapter-kit-verify against that local example before editing CI.'
    ])
  }),
  QUICKSTART_READY:Object.freeze({
    code:'DESCRIPTOR_SHAPE_AND_FICTIONAL_CONTROLS_MATCH',
    title:'Descriptor syntax and fictional controls matched',
    meaning:'This is not a scan of a real project or proof that its MCP server is safe.',
    nextSteps:Object.freeze([
      'Review the inert descriptor fields without running its server.',
      'Use adapter-kit for fixed fictional CI examples.'
    ])
  }),
  KIT_VERIFIED:Object.freeze({
    code:'FICTIONAL_KIT_CONTRACT_MATCH',
    title:'Exported fictional kit checks matched',
    meaning:'The report describes fixed local assertions only; it does not establish who ran them.',
    nextSteps:Object.freeze([
      'Inspect the three fictional check results before enabling the copied CI example.',
      'Seek separate authorization and independent review before any real MCP testing.'
    ])
  }),
  CLEAN_MATCH:Object.freeze({
    code:'CLEAN_FICTIONAL_TRACE_MATCH',
    title:'Clean fictional trace matches the expected rules',
    meaning:'The fabricated events show no observed violation. No real MCP activity was evaluated.',
    nextSteps:Object.freeze([
      'Keep the synthetic expectation and event rules explicitly fictional.',
      'Test a separate expected-denial violation control.'
    ])
  }),
  DETECTED_MATCH:Object.freeze({
    code:'FICTIONAL_VIOLATION_DETECTED_AS_EXPECTED',
    title:'Expected violation detected in fabricated events',
    meaning:'Observed safety is FAIL even though the CI expectation is MATCH. This is NOT a safe action.',
    nextSteps:Object.freeze([
      'Preserve observedSafetyStatus FAIL when recording the result.',
      'Fix any corresponding real-world design only after authorized review; do not run this fixture against a live server.'
    ])
  }),
  MISMATCH:Object.freeze({
    code:'FICTIONAL_EXPECTATION_MISMATCH',
    title:'Symbolic CI expectation did not match',
    meaning:'The fabricated events did not produce the expected contract result; the CI gate failed.',
    nextSteps:Object.freeze([
      'Review only the expected symbolic rule codes and Boolean event fields.',
      'Fix the expected contract or fictional fixture, then rerun the offline check.'
    ])
  }),
  CONTROL_FAILED:Object.freeze({
    code:'OFFLINE_CONTROL_CHECK_FAILED',
    title:'An internal fictional check did not match',
    meaning:'The offline CI contract failed; this is not a finding from a real MCP server.',
    nextSteps:Object.freeze([
      'Review the fixed fictional control expectations without connecting a server.',
      'Use the local offline test suite to reproduce the mismatch.'
    ])
  }),
  INVALID_INPUT:Object.freeze({
    code:'INVALID_OFFLINE_INPUT',
    title:'Input or command arguments were rejected',
    meaning:'The request was not evaluated. No claim about any project or server can be made.',
    nextSteps:Object.freeze([
      'Check the documented command name and local fictional JSON schema.',
      'Verify UTF-8, exact allowed fields, file permissions and command-specific size limits.'
    ])
  })
});
function fixedReaderGuide(command, result, error=false){
  if(!READER_COMMANDS.has(command)) return undefined;
  let key='CONTROL_FAILED';
  if(command==='adapter-check' || command==='adapter-onboard'){
    // The same generic literal checklist for parse, file, policy and schema
    // failures. Never derive a diagnosis from private file data or exceptions.
    const fixed=DESCRIPTOR_GUIDE[error || result.status!=='PASS'?'INVALID':'VALID'];
    return {
      readerGuideSchemaVersion:1,
      code:fixed.code,title:fixed.title,meaning:fixed.meaning,
      nextSteps:[...fixed.nextSteps],
      reportScope:'FICTIONAL_OFFLINE_ASSERTIONS_ONLY',
      realProjectAssessed:false,externalMcpContactAuthorized:false,
      independentAuditCompleted:false,independentBetaVerified:false,
      ownerOperatorVerified:false,stableReleaseAuthorized:false
    };
  }
  if(error) key='INVALID_INPUT';
  else if(result.status==='PASS'){
    if(command==='adapter-kit') key='KIT_READY';
    else if(command==='adapter-quickstart') key='QUICKSTART_READY';
    else if(command==='adapter-kit-verify') key='KIT_VERIFIED';
    else if(command==='adapter-trace-expect'){
      key=result.reportMeaning==='EXACT_SYNTHETIC_EXPECTATION_MATCH_ONLY' &&
        result.expectationStatus==='MATCH' &&
        result.observedSafetyStatus==='PASS' &&
        result.observedFailureCount===0
        ?'CLEAN_MATCH':
        result.reportMeaning==='EXACT_SYNTHETIC_EXPECTATION_MATCH_ONLY' &&
        result.expectationStatus==='MATCH' &&
        result.observedSafetyStatus==='FAIL' &&
        Number.isSafeInteger(result.observedFailureCount) &&
        result.observedFailureCount>0
        ?'DETECTED_MATCH':'CONTROL_FAILED';
    }
  }else if(command==='adapter-trace-expect' &&
           result.expectationStatus==='MISMATCH')key='MISMATCH';
  const fixed=READER_KINDS[key];
  return {
    readerGuideSchemaVersion:1,
    ...{code:fixed.code,title:fixed.title,meaning:fixed.meaning,
      nextSteps:[...fixed.nextSteps]},
    reportScope:'FICTIONAL_OFFLINE_ASSERTIONS_ONLY',
    realProjectAssessed:false,
    externalMcpContactAuthorized:false,
    independentAuditCompleted:false,
    independentBetaVerified:false,
    ownerOperatorVerified:false,
    stableReleaseAuthorized:false
  };
}

const EMPTY_SUMMARY = () => ({
  failureCount:0, reportedFindings:0, findingsTruncated:false, ruleCodes:[]
});

function checkCommand(command,nullable=false) {
  if (nullable && command===null) return;
  if (!COMMANDS.has(command)) throw new TypeError('INVALID_REPORT_COMMAND');
}

/** M6-S/T: no accessor invocation during report construction. Not a Proxy sandbox. */
function ownDataRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).every(key =>
    typeof key === 'string' && Object.hasOwn(descriptors[key], 'value') &&
    descriptors[key].enumerable);
}
function reportRowsValid(rows) {
  if (!Array.isArray(rows) || Object.getPrototypeOf(rows) !== Array.prototype ||
      rows.length > 10000) return false;
  const descriptors = Object.getOwnPropertyDescriptors(rows);
  if (Reflect.ownKeys(descriptors).length !== rows.length + 1) return false;
  for (let i = 0; i < rows.length; i++) {
    const slot = descriptors[String(i)];
    if (!slot || !Object.hasOwn(slot, 'value') || !slot.enumerable ||
        !ownDataRecord(slot.value)) return false;
  }
  return true;
}

/** Add stable public fields but preserve all legacy command-specific fields. */
export function buildCliReport(command,result) {
  checkCommand(command);
  if (!ownDataRecord(result) ||
      (result.status!=='PASS' && result.status!=='FAIL')) {
    throw new TypeError('INVALID_REPORT_STATUS');
  }
  const rows = ['findings','failures','mismatches']
    .map(key=>result[key]).find(Array.isArray) ?? [];
  if (!reportRowsValid(rows)) throw new TypeError('INVALID_REPORT_FINDINGS');
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
    guidance: result.status==='FAIL' ? safeGuidance(ruleCodes) : [],
    ...(fixedReaderGuide(command,result) ? {readerGuide:fixedReaderGuide(command,result)} : {})
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
    guidance:[{...ERROR_GUIDES[errorCode]}],
    ...(fixedReaderGuide(command,null,true) ? {readerGuide:fixedReaderGuide(command,null,true)} : {})
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


/**
 * M7-A: fixed first-run plan. No paths, hosts, arguments or secrets from
 * callers enter these messages; these are inert commands to be run manually.
 * Steps 3 and 4 are optional local fictional checks, not live MCP tests.
 */
export function buildAdapterGuideResult() {
  return {
    status:'PASS',
    profile:'offline-adapter-first-run-guide-v1',
    guideSchemaVersion:1,
    scope:'FICTIONAL_LOCAL_ONLY',
    steps:[
      {step:1,code:'SELECT_TEMPLATE',command:'node src/cli.mjs adapter-kit stdio',
       alternative:'node src/cli.mjs adapter-kit streamable-http',
       meaning:'Review an inert descriptor and fixed fictional test plan. No server is started.'},
      {step:2,code:'EXPORT_KIT',command:'node src/cli.mjs adapter-kit stdio > fictional-kit.json',
       alternative:'node src/cli.mjs adapter-kit streamable-http > fictional-kit.json',
       meaning:'Store only the generated fictional starter JSON locally.'},
      {step:3,code:'VERIFY_LOCAL_KIT',command:'node src/cli.mjs adapter-kit-verify fictional-kit.json',
       alternative:null,meaning:'Verify the exported symbolic kit and its fixed CI controls.'},
      {step:4,code:'REVIEW_INERT_DESCRIPTOR',command:'node src/cli.mjs adapter-quickstart examples/adapter-profiles/stdio-project.json',
       alternative:'node src/cli.mjs adapter-quickstart examples/adapter-profiles/streamable-http-project.json',
       meaning:'Check descriptor syntax and fixed fictional controls; do not contact the described endpoint.'}
    ],
    limits:{
      externalMcpTargetContacted:false,
      projectCodeExecuted:false,
      ownershipVerified:false,
      independentBetaVerified:false,
      independentSecurityAuditCompleted:false,
      stableReleaseAuthorized:false
    },
    nextAction:'CHOOSE_STDIO_OR_STREAMABLE_HTTP_FICTIONAL_TEMPLATE',
    failureCount:0,findingsTruncated:false,findings:[]
  };
}

/** Reviewed, literal-only offline command discovery, not remote capability probing. */
export function buildCliHelpResult() {
  return {
    status:'PASS',
    profile:'local-offline-cli-help-v1',
    commands:[...CLI_COMMANDS],
    syntax:[
      'node src/cli.mjs help',
      'node src/cli.mjs version',
      'node src/cli.mjs demo',
      'node src/cli.mjs adapter-check examples/adapter-profiles/stdio-project.json',
      'node src/cli.mjs adapter-selftest',
      'node src/cli.mjs staging-selftest',
      'node src/cli.mjs staging-process-selftest',
      'node src/cli.mjs adapter-staging-selftest',
      'node src/cli.mjs adapter-onboard examples/adapter-profiles/streamable-http-project.json',
      'node src/cli.mjs adapter-quickstart examples/adapter-profiles/streamable-http-project.json',
      'node src/cli.mjs adapter-onboarding-demo',
      'node src/cli.mjs adapter-template stdio',
      'node src/cli.mjs adapter-template streamable-http',
      'node src/cli.mjs adapter-guide',
      'node src/cli.mjs adapter-kit stdio',
      'node src/cli.mjs adapter-kit streamable-http',
      'node src/cli.mjs adapter-kit-verify fictional-kit.json',
      'node src/cli.mjs adapter-report-view fictional-clean-ci.json',
      'node src/cli.mjs adapter-fixture-audit <fictional-bundle-file>',
      'node src/cli.mjs adapter-synthetic-trace <symbolic-trace-file>',
      'node src/cli.mjs adapter-trace-expect <fictional-expectation-file>',
      'node src/cli.mjs adapter-policy-check examples/adapter-profiles/consent-expired.json',
      'node src/cli.mjs <fixture-command> <bundled-fictional-file>'
    ],
    examples:[
      'node src/cli.mjs demo',
      'node src/cli.mjs scenario fixtures/scenario-denial.json',
      'node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json'
    ],
    scope:'fictional offline contract checks and fixed first-party localhost mock only'
  };
}

/** Expose only allowlisted release-candidate metadata read from local package.json. */
export function buildCliVersionResult(metadata) {
  if (!metadata || typeof metadata !== 'object' ||
      metadata.name !== 'mcp-agent-security-test-suite' ||
      typeof metadata.version !== 'string' ||
      !/^[0-9]+\.[0-9]+\.[0-9]+(?:-rc\.[0-9]+)?$/.test(metadata.version) ||
      metadata.engines?.node !== '>=20') {
    throw new TypeError('INVALID_BUNDLED_PACKAGE_METADATA');
  }
  return {
    status:'PASS',
    packageName:'mcp-agent-security-test-suite',
    version:metadata.version,
    minimumNodeVersion:'20',
    scope:'local candidate metadata; does not claim publication'
  };
}
