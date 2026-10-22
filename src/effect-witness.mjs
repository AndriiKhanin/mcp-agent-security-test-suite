/**
 * A test-owned, in-memory witness for synthetic tool effects.
 * Only its deliberately narrow effect port is passed to a mock adapter.
 * The witness snapshot itself is never provided to a driver under test.
 * NOT an external process or adversarially tamper-proof recorder.
 */
export function createEffectWitness() {
  let notes = 0, reads = 0, writes = 0, calls = 0;
  const snapshot = () => Object.freeze({ notes, reads, writes, calls });
  const effects = Object.freeze({
    markCall() { calls += 1; },
    readNote() { reads += 1; },
    writeNote() { writes += 1; notes += 1; },
    deleteNote() { writes += 1; notes = Math.max(0, notes - 1); },
  });
  return Object.freeze({ effects, snapshot });
}
