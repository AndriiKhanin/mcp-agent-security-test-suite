import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A conservative, first-party, source-relative hygiene preflight, NOT a
// comprehensive secret scanner, malware auditor or independent attestation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expected = JSON.parse(
  readFileSync(join(root, 'test', 'expected-package-files.json'), 'utf8')
);
const MAX_FILE_BYTES = 1024 * 1024;
const patterns = Object.freeze([
  ['PRIVATE_KEY_BLOCK', /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/u],
  ['GITHUB_TOKEN_SIGNATURE', /\b(?:gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{24,})\b/u],
  ['AWS_ACCESS_KEY_SIGNATURE', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u],
  ['OPENAI_KEY_SIGNATURE', /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/u],
]);
const permitted = new Set([
  'package.json', 'README.md', 'ROADMAP.md', 'SECURITY.md',
  'LICENSE', 'CONTRIBUTING.md'
]);
const prefixes = ['src/', 'docs/', 'fixtures/', 'examples/'];

function scanContent(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_FILE_BYTES)
    return 'R5_CONTENT_SIZE_OR_TYPE';
  let value;
  try { value = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return 'R5_INVALID_UTF8'; }
  if (value.includes('\0')) return 'R5_BINARY_CONTENT';
  for (const [code, pattern] of patterns) {
    if (pattern.test(value)) return 'R5_' + code;
  }
  return null;
}
function safePaths() {
  assert.ok(expected.length > 25 && expected.length <= 80,
    'R5_UNEXPECTED_FILE_COUNT');
  assert.deepEqual([...new Set(expected)].sort(), expected,
    'R5_NON_CANONICAL_MANIFEST');
  for (const path of expected) {
    assert.equal(typeof path, 'string');
    assert.ok(!path.startsWith('/') && !path.includes('\\') &&
      !path.split('/').includes('..') &&
      (permitted.has(path) || prefixes.some(prefix => path.startsWith(prefix))),
      'R5_UNREVIEWED_PATH');
  }
}

test('R5-A: inspect every reviewed package source as bounded UTF-8 with no known key signatures', () => {
  safePaths();
  const findings = [];
  for (const path of expected) {
    const reason = scanContent(readFileSync(join(root, path)));
    if (reason) findings.push({ path, rule: reason });
  }
  // Only published filenames + symbolic rule codes; NEVER sample bytes or tokens.
  assert.deepEqual(findings, [], 'R5_PACKAGE_CONTENT_PREFLIGHT_FAILED');
});

test('R5-A: fabricated credential signatures are rejected without returning source data', () => {
  const synthetic = [
    ['PRIVATE_KEY_BLOCK', ['-----BEGIN PRIVATE KEY-----', 'FICTIONAL', '-----END PRIVATE KEY-----'].join('\n')],
    ['GITHUB_TOKEN_SIGNATURE', 'ghp_' + 'A'.repeat(30)],
    ['GITHUB_TOKEN_SIGNATURE', 'github_pat_' + 'B'.repeat(30)],
    ['AWS_ACCESS_KEY_SIGNATURE', 'AKIA' + 'C'.repeat(16)],
    ['OPENAI_KEY_SIGNATURE', 'sk-proj-' + 'D'.repeat(30)],
  ];
  for (const [expectedCode, source] of synthetic) {
    const rule = scanContent(Buffer.from(source));
    assert.equal(rule, 'R5_' + expectedCode);
    assert.ok(!rule.includes(source), 'R5_ECHOED_FAKE_SECRET');
  }
});

test('R5-A: fail closed on oversized, binary and malformed UTF-8 data', () => {
  assert.equal(scanContent(Buffer.alloc(MAX_FILE_BYTES + 1, 65)),
    'R5_CONTENT_SIZE_OR_TYPE');
  assert.equal(scanContent(Buffer.from([0xff, 0xfe])),
    'R5_INVALID_UTF8');
  assert.equal(scanContent(Buffer.from([0x61, 0x00, 0x62])),
    'R5_BINARY_CONTENT');
  assert.equal(scanContent('not a Buffer'), 'R5_CONTENT_SIZE_OR_TYPE');
});

test('R5-A: benign fictional source and ordinary documentation remain accepted', () => {
  for (const source of [
    'Fictional note reader. Do not supply real credentials.',
    '# Example\nA local-only synthetic test and a versioned report.',
    'The source contains no production MCP endpoints.',
    '',
  ]) assert.equal(scanContent(Buffer.from(source, 'utf8')), null);
});


// R5-C: Handoff must track the actual manifest rather than historical R5-A.
test('R5-C: assessor handoff uses current inventory and verified public snapshot', () => {
  safePaths();
  const guide=readFileSync(join(root,'docs','R5_INDEPENDENT_REVIEW.md'),'utf8')
    .replace(/\r\n/g,'\n');
  const count=expected.length;
  assert.equal(count,80,'R5C_CURRENT_PACKAGE_COUNT_REQUIRES_REVIEW');
  assert.ok(guide.includes('**Current reviewed npm inventory: '+count+' paths**'),
    'R5C_HANDOFF_CURRENT_COUNT_MISMATCH');
  assert.ok(guide.includes('all '+count+' currently distributable paths'),
    'R5C_HANDOFF_SCOPE_STALE');
  assert.ok(guide.includes('**'+count+'-path inventory on the documented snapshot**'),
    'R5C_HANDOFF_ARCHIVE_COUNT_STALE');
  const sha='8720c7d7892f222a8203addeeef6eed8d2d24390';
  assert.match(sha,/^[0-9a-f]{40}$/);
  assert.ok(guide.includes('git switch --detach '+sha));
  assert.ok(guide.includes("$Expected = '"+sha+"'"));
  assert.ok(guide.includes('main CI #40115925583'));
  assert.ok(guide.includes('678/678 tests per Windows/Ubuntu Node 20/22 job'));
  assert.ok(guide.toLowerCase().includes('historical'));
  assert.ok(!/all 57 (?:current|distributable)|exact 57-path inventory/.test(guide),
    'R5C_HISTORICAL_COUNT_AS_CURRENT');
});

test('R5-C: assessor commands are balanced and offline-only', () => {
  const guide=readFileSync(join(root,'docs','R5_INDEPENDENT_REVIEW.md'),'utf8')
    .replace(/\r\n/g,'\n');
  const fence=String.fromCharCode(96).repeat(3);
  const boundaries=guide.split('\n').map(s=>s.trim())
    .filter(s=>s===fence||s===fence+'sh'||s===fence+'powershell');
  assert.deepEqual(boundaries,[fence+'sh',fence,fence+'powershell',fence]);
  assert.ok(guide.includes('test "$(git rev-parse HEAD)" = "8720c7d7892f222a8203addeeef6eed8d2d24390"'));
  assert.ok(guide.includes('npm test'));
  assert.ok(guide.includes('npm run release:preflight'));
  assert.ok(guide.includes('npm_config_offline=true npm pack --offline --ignore-scripts --json'));
  assert.ok(guide.includes("& npm pack --offline --ignore-scripts --json --pack-destination $ReviewDir"));
  assert.ok(guide.includes('(Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash'));
  assert.ok(guide.includes('sha256sum "$review_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"'));
  assert.ok(guide.includes("if ($Actual -ne $Expected) { throw 'Source SHA mismatch' }"));
  assert.ok(guide.includes('} finally {'));
  assert.ok(!guide.includes('npm publish --'));
});

test('R5-C: prepared audit document never closes independent gates', () => {
  const guide=readFileSync(join(root,'docs','R5_INDEPENDENT_REVIEW.md'),'utf8')
    .replace(/\r\n/g,'\n');
  for(const phrase of [
    'separately trusted',
    'NOT VERIFIED',
    'independent assessor',
    'all packaged',
    'Windows',
    'GitHub Release vs npm',
    'Release gate #43 remains OPEN',
    'Independent beta usability #59',
    'real-target testing authorization #21',
    'not a signed release',
    '80 paths'
  ])assert.ok(guide.toLowerCase().includes(phrase.toLowerCase()),phrase);
  assert.ok(guide.includes('no independent') || guide.includes('not an independent'));
  assert.ok(guide.includes('not a production credential vault') ||
            guide.includes('cannot prove a production credential vault'));
});
