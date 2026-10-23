import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Targeted structural checks for the reviewed GitHub Issue Forms.
// This is NOT a complete YAML parser or a moderation/privacy filter.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const forms = join(root, '.github', 'ISSUE_TEMPLATE');
const read = path => readFileSync(join(forms, path), 'utf8').replace(/\r\n/g, '\n');

function sections(source) {
  return source.split(/^  - type: /m).slice(1).map(item => {
    const id = item.match(/^    id: ([a-z][a-z0-9_]*)$/m)?.[1] ?? null;
    return { type: item.split('\n')[0].trim(), id, raw: item };
  });
}
function checkForm(source, ids) {
  const errors = [];
  if (!/^name: ".+"\ndescription: ".+"\ntitle: "\[[A-Za-z]+\]: "\nbody:\n/m.test(source))
    errors.push('M5_FORM_HEADER_INVALID');
  if (source.includes('\t') || source.includes('$' + '{{') || /^labels:/m.test(source))
    errors.push('M5_FORM_FORBIDDEN_STRUCTURE');
  const parsed = sections(source);
  const fields = parsed.filter(section => section.type !== 'markdown');
  if (!parsed.some(section => section.type === 'markdown'))
    errors.push('M5_FORM_WARNING_MISSING');
  if (parsed.length !== fields.length + 1 || fields.length < 4)
    errors.push('M5_FORM_FIELD_STRUCTURE');
  const actual = fields.map(section => section.id);
  if (new Set(actual).size !== actual.length ||
      ids.some(id => !actual.includes(id)))
    errors.push('M5_FORM_REQUIRED_FIELD_MISSING');
  for (const field of fields.filter(f => f.type !== 'checkboxes')) {
    if (!/^\s+validations:\n\s+required: true$/m.test(field.raw))
      errors.push('M5_FORM_REQUIRED_VALIDATION_MISSING');
  }
  const confirmation = fields.find(field => field.id === 'safe_disclosure');
  if (confirmation?.type !== 'checkboxes' ||
      !/^\s+options:\n\s+- label: ".+fictional.+"/m.test(confirmation.raw) ||
      !/^\s+required: true$/m.test(confirmation.raw))
    errors.push('M5_FORM_PRIVACY_CONFIRMATION_MISSING');
  if (!source.includes('SECURITY.md') || !source.includes('PUBLIC') ||
      !source.includes('private'))
    errors.push('M5_FORM_PRIVATE_DISCLOSURE_WARNING_MISSING');
  return [...new Set(errors)];
}
function checkConfig(source) {
  const failures = [];
  if (!/^blank_issues_enabled: false$/m.test(source))
    failures.push('M5_BLANK_ISSUES_ALLOWED');
  if (!/^contact_links:$/m.test(source) ||
      !/url: "https:\/\/github\.com\/AndriiKhanin\/mcp-agent-security-test-suite\/blob\/main\/SECURITY\.md"/.test(source))
    failures.push('M5_SECURITY_CONTACT_MISSING');
  return failures;
}
const bugIds = [
  'version','os','node_version','offline_command','rule_code','reproduction',
  'expected','actual','safe_disclosure'
];
const featureIds = [
  'problem','proposed_behavior','synthetic_example','security_scope',
  'safe_disclosure'
];

test('M5-03: public bug form collects reproducible fictional context with required privacy confirmation', () => {
  const raw = read('bug_report.yml');
  assert.deepEqual(checkForm(raw, bugIds), []);
  assert.match(raw, /RETRY_PARAMS_CHANGED/);
  assert.match(raw, /node --version/);
  assert.match(raw, /0\.0\.10-rc\.1/);
  for (const command of [
    'node src/cli.mjs demo',
    'node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json',
    'node src/cli.mjs trace fixtures/trace-unsafe.jsonl'
  ]) assert.ok(raw.includes(command), 'missing safe bundled example');
  assert.doesNotMatch(raw, /https:\/\/\S+\.invalid|api\.openai\.com/);
});

test('M5-03: public feature form collects fictional scope and prevents implicit live-target consent', () => {
  const raw = read('feature_request.yml');
  assert.deepEqual(checkForm(raw, featureIds), []);
  assert.match(raw, /Requires separate future approval \(no implementation requested yet\)/);
  assert.match(raw, /No private MCP targets/);
});

test('M5-03: issue chooser disables unstructured public reporting and routes security disclosures', () => {
  assert.deepEqual(checkConfig(read('config.yml')), []);
});

test('M5-03: tampered forms fail closed on missing fields and required disclosure', () => {
  const original = read('bug_report.yml');
  const missing = original.replace(/^    id: rule_code$/m, '    id: removed_code');
  assert.ok(checkForm(missing, bugIds).includes('M5_FORM_REQUIRED_FIELD_MISSING'));
  const noConsent = original.replace(
    /(\s+- label: "I confirm this report contains only fictional[^"]+"\n)          required: true/,
    '$1          required: false'
  );
  assert.ok(checkForm(noConsent, bugIds).includes('M5_FORM_PRIVACY_CONFIRMATION_MISSING'));
  const noWarning = original.replace('SECURITY.md', 'NO_SECURITY_POLICY');
  assert.ok(checkForm(noWarning, bugIds).includes('M5_FORM_PRIVATE_DISCLOSURE_WARNING_MISSING'));
  assert.ok(checkConfig('blank_issues_enabled: true\n').includes('M5_BLANK_ISSUES_ALLOWED'));
});

test('M5-03: issue forms stay outside npm archive; contributor documentation is safe', () => {
  const manifest = JSON.parse(
    readFileSync(join(root, 'test', 'expected-package-files.json'), 'utf8')
  );
  assert.equal(manifest.length, 80, 'M4-B6-E preserves the reviewed 80-path bounded inventory');
  for (const path of [
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/feature_request.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
    'test/issue-forms.test.mjs'
  ]) assert.ok(!manifest.includes(path), 'development-only file was packaged');
  const docs = readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8');
  assert.match(docs, /SECURITY\.md/);
  assert.match(docs, /node src\/cli\.mjs demo/);
  assert.match(docs, /summary\.ruleCodes/);
  assert.match(docs, /fictional-only/);
});


test('M5-05: independent beta intake requires fixed public revision and fictional-only consent',()=>{
  const raw=read('beta_feedback.yml');
  const betaIds=['source_commit','version','os','node_major','runner_result',
    'matched_count','deviations','usability','safe_disclosure','actual_test'];
  assert.deepEqual(checkForm(raw,betaIds),[]);
  assert.match(raw,/docs\/BETA_TESTING\.md/);
  assert.match(raw,/not independent beta-tester evidence/);
  assert.match(raw,/0\.0\.10-rc\.1/);
  assert.match(raw,/BETA_\*/);
  assert.match(raw,/personally ran the fixed fictional beta protocol/);
  const statement=sections(raw).find(x=>x.id==='actual_test');
  assert.equal(statement?.type,'checkboxes');
  assert.match(statement.raw,/^\s+required: true$/m);
  const missing=raw.replace(/^    id: source_commit$/m,'    id: missing_commit');
  assert.ok(checkForm(missing,betaIds).includes('M5_FORM_REQUIRED_FIELD_MISSING'));
  const noConsent=raw.replace(
    /(id: safe_disclosure[\s\S]*?required: )true/,
    '$1false'
  );
  assert.ok(checkForm(noConsent,betaIds).includes('M5_FORM_PRIVACY_CONFIRMATION_MISSING'));
  const noPersonalRun=raw.replace(
    /(id: actual_test[\s\S]*?required: )true/,
    '$1false'
  );
  const brokenStatement=sections(noPersonalRun).find(x=>x.id==='actual_test');
  assert.doesNotMatch(brokenStatement.raw,/^\s+required: true$/m);
});
