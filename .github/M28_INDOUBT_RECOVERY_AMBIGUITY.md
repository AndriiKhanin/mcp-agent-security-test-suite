# M28 / M29 — first-party recovery ambiguity and signed-claim limitations

**Scope:** historical source-only, fictional recovery experiments. This
short current index preserves the [complete original M28 + M29 guide at
verified pre-F1 commit](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/blob/04f9bea1170549cf64dda715693151a1f988e074/.github/M28_INDOUBT_RECOVERY_AMBIGUITY.md).
For original matrices, assumptions, caveats and acceptance receipts,
use that permanently pinned Git version rather than a floating `main`.

## Reproduce with reviewed source only

```sh
node tools/m28-recovery-ambiguity.mjs
node tools/m29-signed-receipt-provenance.mjs
```

**M28 — 8/8 first-party synthetic controls.** Two hidden toy histories
can share an identical fsynced local `IN_DOUBT` marker even though
one effect occurred and the other did not. Blind retry duplicates
the already-completed effect; assume-done loses the never-completed
effect. Guarded recovery retains **unresolved quarantine** in both
worlds. Forged proof must not release that quarantine. The driver
also validates distinct-key controls and disposable scratch cleanup.
One witnessed duplicate and one witnessed loss are intentionally
negative cases, not actual recovery failures or observed field rates.
No customer file, user tool action, LLM or external MCP target is used.

**M29 — 12/12 source-owned receipt/signature controls.** Ephemeral
Ed25519 signatures verify the bytes of reviewed synthetic claims,
but an authentic signature does **not** establish that its claimed
effect actually occurred. Correctly signed false outcomes can still
induce lost or duplicate toy actions in a deliberately unsafe
signature-only resolver. Guarded recovery keeps quarantine until a
genuinely authenticated outcome-observation authority exists. M29
does **not** provide that authority or prove exactly-once execution.
No private customer signing keys, remote identity service or network
access are involved.

## Evidence and boundaries

- M28 [PR #309](../pull/309), [PR CI #41016927718](../actions/runs/41016927718),
  merge `2bf8a9f03159a7932582b63d0e6dbd4a53300340`,
  [exact main CI #41017290535](../actions/runs/41017290535):
  **4/4** Windows/Ubuntu Node20/22.
- M29 [PR #312](../pull/312), [PR CI #41019901819](../actions/runs/41019901819),
  merge `2ff47013ffb1e8cb74923863fce8a03d58a183c9`,
  [exact main CI #41020234312](../actions/runs/41020234312):
  **4/4** Windows/Ubuntu Node20/22.
- Neither command simulates a real external effect, independent
  signer identity, OS power failure, durable customer reconciliation,
  real agent/tool execution, Stable Bridge, or production approval.
  Their reports use source-owned categorical labels only.
- Both source-only tools/tests remain **excluded** from the
  unpublished **80-path npm candidate**. The excluded-source
  M6-J 240-file/2 MB cap remains a strict **deny-on-overflow** gate;
  this index consolidation does not relax it.
- Independent beta [#59](../issues/59), independent audit
  [#43](../issues/43), and real target authorization
  [#21](../issues/21) remain OPEN. Neither M28 nor M29 is
  real-world detection, security certification or release approval.
