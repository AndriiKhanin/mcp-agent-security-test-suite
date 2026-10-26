/** M7-T: independent-beta handoff is readable, consistent, and cannot mark gate accepted. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const handoff=readFileSync(resolve(root,'docs/BETA_VOLUNTEER_HANDOFF.md'),'utf8');

test('M7-T: voluntary handoff uses only source checkout and the fixed offline beta entrypoint',()=>{
 for(const text of [
  'git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git',
  'git switch --detach <AGREED_PUBLIC_40_CHARACTER_COMMIT_SHA>',
  'node tools/beta-review.mjs',
  'Node.js 20 or 22',
  'disposable checkout',
  'source checkout'
 ]) assert.ok(handoff.includes(text),text);
 assert.equal((handoff.match(/^\`\`\`sh$/gm)||[]).length,1);
 assert.equal((handoff.match(/^\`\`\`$/gm)||[]).length,1);
});

test('M7-T: independent provenance and real target gates remain explicit',()=>{
 for(const phrase of [
  'Issue [#59]',
  'remains OPEN',
  'genuinely independent, consenting developer',
  'No independent tester',
  'does not contact a user MCP server',
  'not independently authenticated',
  'Independent security/provenance audit',
  'owner explicitly decides'
 ]) assert.ok(handoff.toLowerCase().includes(phrase.toLowerCase()),phrase);
});

test('M7-T: no automated outreach, publication or unauthorized real-target claims',()=>{
 for(const phrase of [
  'Do not send', 'not an MCP security assessment',
  'Submission is **manual and optional**',
  'No telemetry or automatic GitHub Issue creation exists',
  '**NOT VERIFIED**','**NOT AUTHORIZED**'
 ]) assert.ok(handoff.includes(phrase),phrase);
 assert.equal(handoff.includes('npm publish'),false);
});

test('M7-T: contributor guidance forbids direct sensitive output collection',()=>{
 for(const phrase of ['local file paths','private endpoints','tokens',
   'shell history','raw log output','proprietary code','SECURITY.md'])
  assert.ok(handoff.includes(phrase),phrase);
});
