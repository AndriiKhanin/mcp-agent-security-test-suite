import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname,resolve } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=(...args)=>spawnSync(process.execPath,['examples/offline-ci-check.mjs',...args],
  {cwd:root,encoding:'utf8',shell:false,timeout:30000,maxBuffer:65536});

test('M2-02: clean local smoke example passes its safe and negative control',()=>{
  const x=run();
  assert.equal(x.status,0,x.stderr);
  assert.match(x.stdout,/SAFE_FIXTURE_PASS/);
  assert.match(x.stdout,/EXPECTED_FAIL_DETECTED: RETRY_PARAMS_CHANGED/);
  assert.match(x.stdout,/DEMO_PASS/);
  assert.ok(!x.stdout.includes('fictional-nonce'));
});
test('M2-02: example will not accept a custom target/command argument',()=>{
  const x=run('--host','https://fictional.invalid');
  assert.equal(x.status,1);
  assert.match(x.stderr,/DEMO_FAIL/);
  assert.ok(!x.stderr.includes('fictional.invalid'));
});
test('M2-02: example workflow uses SHA-pinned actions and minimum permissions',()=>{
  const raw=readFileSync(new URL('../examples/offline-contract-check.yml',import.meta.url),'utf8');
  assert.match(raw,/permissions:\s*\n\s*contents: read/);
  assert.match(raw,/checkout@1af3b93b6815bc44a9784bd300feb67ff0d1eeb3/);
  assert.match(raw,/setup-node@2028fbc5c25fe9cf00d9f06a71cc4710d4507903/);
  assert.match(raw,/persist-credentials: false/);
  assert.match(raw,/run: node examples\/offline-ci-check.mjs/);
  assert.doesNotMatch(raw,/secrets\./i);
  assert.doesNotMatch(raw,/curl |npm install|api\.openai\.com/i);
});
test('M2-02: canonical quickstart documentation includes the runnable smoke',()=>{
  const text=readFileSync(new URL('../docs/GETTING_STARTED.md',import.meta.url),'utf8');
  assert.match(text,/git clone https:\/\/github\.com\/AndriiKhanin\/mcp-agent-security-test-suite\.git/);
  assert.match(text,/node examples\/offline-ci-check\.mjs/);
  assert.match(text,/EXPECTED_FAIL_DETECTED/);
  assert.match(text,/node --test/);
});

test('M4-B9-D: portable offline CI smoke validates three distinct matcher outcomes',()=>{
  const runResult=run();
  assert.equal(runResult.status,0,runResult.stderr);
  assert.match(runResult.stdout,/SYNTHETIC_CLEAN_MATCH: observed PASS, expectation MATCH, exit code 0/);
  assert.match(runResult.stdout,/SYNTHETIC_EXPECTED_VIOLATION: observed FAIL, expectation MATCH, exit code 0/);
  assert.match(runResult.stdout,/SYNTHETIC_UNEXPECTED_VIOLATION: observed FAIL, expectation MISMATCH, exit code 1/);
  assert.match(runResult.stdout,/DEMO_PASS/);
  assert.doesNotMatch(runResult.stdout,/mcp\.example\.org|fictional-ci-project|mcp-fictional-ci-/);
});
test('M4-B9-D: smoke is non-parameterized and redacts hostile CLI input',()=>{
  for(const args of [
    ['--command','tools/call'],
    ['--endpoint','https://private.example.org/mcp'],
    ['--run','node dangerous.mjs']
  ]){
    const p=run(...args);
    assert.equal(p.status,1);
    assert.match(p.stderr,/DEMO_FAIL: offline example did not meet its fixed assertions/);
    assert.equal(p.stdout,'');
    assert.ok(!(p.stdout+p.stderr).includes(args[1]));
  }
});
test('M4-B9-D: portable CI workflow explicitly exercises the full fixed smoke',()=>{
  const local=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
  const sample=readFileSync(new URL('../examples/offline-contract-check.yml',import.meta.url),'utf8');
  for(const ci of [local,sample]){
    assert.match(ci,/run: node examples\/offline-ci-check\.mjs/);
    assert.doesNotMatch(ci,/secrets\.|npm install|curl |wget |http:\/\//);
  }
  assert.match(local,/persist-credentials: false/);
});
test('M4-B9-D: fixed fixture writer uses bounded local temp only, with cleanup',()=>{
  const source=readFileSync(new URL('../examples/offline-ci-check.mjs',import.meta.url),'utf8');
  assert.match(source,/mkdtempSync\(join\(tmpdir\(\),/);
  assert.match(source,/rmSync\(dir,\{force:true,recursive:true\}\)/);
  assert.match(source,/Buffer\.byteLength\(body,'utf8'\)>4096/);
  assert.match(source,/spawnSync\(process\.execPath/);
  assert.match(source,/shell:false/);
  assert.match(source,/process\.argv\.length!==2/);
  assert.match(source,/requireSymbolic\(expectedBad,0,'FAIL','MATCH','FAIL'/);
  assert.match(source,/requireSymbolic\(unexpectedBad,1,'FAIL','MISMATCH','PASS'/);
  assert.doesNotMatch(source,/fetch\(|https\.request\(|child_process\.exec\(|shell:true/);
});
