# M28 — one in-doubt marker, two possible outcomes

**Status:** first-party source-only engineering experiment. No production
recovery, external effect reconciliation or exactly-once guarantee.

After [M27](M27_INDOUBT_CRASH_RECOVERY.md), the key question is what
to do when an owned operation's reservation survives a crash but its
result was not acknowledged. If the *only* persistent evidence is the
same pending marker, an effect may **already have happened** or may
**never have happened**. Both histories can have identical visible
local state.

Run from a reviewed source checkout:

```sh
node tools/m28-recovery-ambiguity.mjs
```

The zero-argument command creates eight independent disposable scratch
directories using the OS temporary directory. In each it writes and
`fsync`s the **identical** first-party `IN_DOUBT` marker and verifies
its bytes. Two author-controlled hidden worlds start with zero or one
**fictional in-memory effect**. The marker does **not** encode which
world applies; no real business operation or MCP tool runs. The driver
compares four policies in both worlds and checks a distinct-key
positive control every time.

| Recovery choice | No effect actually happened | Effect already happened |
| --- | --- | --- |
| **BLIND_RETRY** | One synthetic effect; appears to complete | Two total effects — **duplicate** |
| **ASSUME_DONE** | Zero effects — **lost operation** | One total effect; appears safe |
| **GUARDED_QUARANTINE** | No duplicate, but operation **unresolved** | No duplicate, but operation **unresolved** |
| **GUARDED_FORGED_PROOF** | Fake claim rejected; quarantine remains | Fake claim rejected; quarantine remains |

A non-authenticated `FICTIONAL_UNTRUSTED_CLAIM_IS_NOT_A_RECEIPT`
string cannot upgrade a pending marker to proven completion. This is a
fixed negative control; **no genuine external receipt is verified**.
Only future separately authorized, authenticated reconciliation could
distinguish and resolve outcomes for real operations.

## Observed result and acceptance

Expected summary: `8/8 PASS`, **one intentionally witnessed duplicate,
one intentionally witnessed loss, four unresolved guarded outcomes
and two rejected forged claims**. These counts are constructed
first-party fixture worlds, not real failure rates.

The independent result gate checks source-authored case order, exactly
matching synthetic effect counters, original effect state, whether
the marker remained pending or was unsafely overwritten, fresh-key
success, untrusted proof rejection, identical marker bytes, exactly two
files per scratch directory and complete scratch cleanup. It rejects
mutation of a single witness field, sparse arrays and getter-driven
input side effects. CLI output contains only fixed case names and
symbolic labels; never scratch paths, raw markers or untrusted strings.

**Limitations:** This module does **not** itself crash a process.
[M27](M27_INDOUBT_CRASH_RECOVERY.md) already provides independently
tested OS-worker termination. M28 illustrates the unresolved
*information problem* with source-owned toy worlds. It does not
simulate a real external effect, cryptographic proof, a trusted
operator approval, real filesystem recovery or power-loss durability.
The scratch file writes are real, but not customer-file operations.
No external network, MCP endpoint, LLM, credentials, Stable Bridge,
telemetry or caller-selected process/path is accessed.

The command, its tests and this guide are source-only, outside the
unchanged unpublished **80-path npm candidate**. Independent beta
[#59](../issues/59), security audit [#43](../issues/43) and real-target
authorization [#21](../issues/21) remain OPEN. Engineering acceptance (2026-10-30): [PR #309](../pull/309) passed
[PR CI #41016927718](../actions/runs/41016927718) **4/4** on
Windows/Ubuntu × Node20/22, merged as exact main SHA
`2bf8a9f03159a7932582b63d0e6dbd4a53300340`, and independent
[main CI #41017290535](../actions/runs/41017290535) passed
**4/4 on the same SHA**. These are first-party synthetic tests, not
independent beta, authenticated real-world reconciliation or release authorization.
