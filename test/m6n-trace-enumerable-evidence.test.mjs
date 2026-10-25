/** M6-N: direct-JS trace evidence must survive JSON serialization. Offline only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRecords } from '../src/trace.mjs';

const valid = () => ({
  decision: 'ALLOW', effect: 'WRITE',
  ownerAuthorized: true, scopeAuthorized: true,
  leaseFresh: true, secretLogged: false
});

test('M6-N: hidden authorization evidence cannot produce PASS', () => {
  for (const key of ['ownerAuthorized', 'scopeAuthorized', 'leaseFresh']) {
    const event = valid();
    Object.defineProperty(event, key, { value: true, enumerable: false });
    assert.equal(Object.hasOwn(event, key), true);
    assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(event)), key), false);
    const result = auditRecords([event]);
    assert.equal(result.status, 'FAIL');
    assert.equal(result.checked, 1);
    assert.deepEqual(result.failures.map(f => f.rule), ['INVALID_FIELDS']);
  }
});

test('M6-N: hidden decision, effect, and audit safety fields are rejected', () => {
  for (const key of ['decision', 'effect', 'secretLogged']) {
    const event = valid();
    Object.defineProperty(event, key, { value: event[key], enumerable: false });
    assert.deepEqual(auditRecords([event]).failures.map(f => f.rule), ['INVALID_FIELDS']);
  }
});

test('M6-N: hidden unknown metadata remains rejected without echo', () => {
  const event = valid();
  Object.defineProperty(event, 'privateCanary', { value: 'SYNTHETIC_SECRET', enumerable: false });
  const result = auditRecords([event]);
  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.failures.map(f => f.rule), ['INVALID_FIELDS']);
  assert.ok(!JSON.stringify(result).includes('SYNTHETIC_SECRET'));
});

test('M6-N: ordinary enumerable allowed/denied observations retain behavior', () => {
  const allowed = auditRecords([valid()]);
  assert.equal(allowed.status, 'PASS');
  assert.equal(allowed.checked, 1);
  const denied = auditRecords([{ decision: 'DENY', effect: 'NONE', secretLogged: false }]);
  assert.equal(denied.status, 'PASS');
  const unsafe = auditRecords([{ ...valid(), ownerAuthorized: false }]);
  assert.equal(unsafe.status, 'FAIL');
  assert.ok(unsafe.failures.some(f => f.rule === 'EFFECT_WITHOUT_AUTHORIZATION'));
});
