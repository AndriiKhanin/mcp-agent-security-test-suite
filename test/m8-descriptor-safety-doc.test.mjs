import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const checklist = readFileSync(new URL('../.github/M8_DESCRIPTOR_SAFETY_CHECKLIST.md', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

// Documentation contract only: these assertions never run an adapter or open a socket.
const requirements = Object.freeze([
  ['fictional scope', /fictional, inert/i],
  ['both transports', /adapter-template stdio[\s\S]*adapter-template streamable-http/i],
  ['nested template extraction', /only.*nested `template` object/i],
  ['wrapper rejection', /entire.*report wrapper.*not.*descriptor/i],
  ['execution disabled', /execution, network and credential flag.*`false`/i],
  ['privacy warning', /never paste a real token/i],
  ['local shape check', /adapter-check <local-descriptor-file>/i],
  ['offline onboarding', /adapter-onboard <local-descriptor-file>/i],
  ['fail closed', /fail closed/i],
  ['no sensitive echoes', /must not echo paths, file content, tokens, commands or endpoint details/i],
  ['no spawn or contact', /may spawn a user command, contact an endpoint, or request credentials/i],
  ['no security certification', /not.*security certification/i],
  ['explicit owner authorization', /explicit owner authorization/i],
  ['allowlisted target', /exact target allowlisting/i],
  ['independent beta gate', /issue #59 remains open/i],
]);

function missingRequirements(text) {
  return requirements.filter(([, pattern]) => !pattern.test(text)).map(([name]) => name);
}

test('M8-K: checklist preserves all offline descriptor safety requirements', () => {
  assert.deepEqual(missingRequirements(checklist), []);
});

test('M8-L: omission of each requirement is independently detected', () => {
  for (const [name, pattern] of requirements) {
    const match = checklist.match(pattern);
    assert.ok(match, name);
    const altered = checklist.replace(match[0], '[requirement removed]');
    assert.ok(missingRequirements(altered).includes(name), name);
  }
});

test('M8-L: README explains nested template and inert checking', () => {
  assert.match(readme, /copy \*\*only the nested `template` object\*\*/i);
  assert.match(readme, /adapter-check <local-descriptor-file>/i);
  assert.match(readme, /Neither check runs the fictional command or contacts/i);
});
