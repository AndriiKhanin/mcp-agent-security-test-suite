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
