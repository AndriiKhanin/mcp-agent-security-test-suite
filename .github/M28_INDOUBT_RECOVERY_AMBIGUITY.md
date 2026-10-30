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


## M29 extension — authentic signature is not authentic effect provenance

From a reviewed source checkout:

```sh
node tools/m29-signed-receipt-provenance.mjs
```

This experiment complements the unsigned fake-claim rejection of M28.
It generates **ephemeral Ed25519 keypairs** and 12 fixed signed/unsigned
fictional receipt variants, then verifies the **actual cryptographic
signature** using a source-owned temporary public-key anchor. The
receipt body binds an exact operation, M28 marker SHA-256, logical epoch,
one-time nonce, outcome and validity window. It checks changed signed
content, mismatched operation/marker/epoch, expired timestamp, rogue
signer, nonce reuse and missing signature. No private keys are stored,
exported, printed or used with actual customers.

The key distinction is between these two facts:

- A valid Ed25519 signature establishes that *someone with the matching
  private key signed these bytes*. That does **not** establish the
  signer's independently authenticated organizational identity, access
  to a real effect observer, or the **truth of the outcome**.
- In two fixed negative controls, this first-party source-owned signer
  correctly signs an **incorrect** outcome. A deliberately unsafe
  signature-only resolver then **loses** an operation that never happened
  or **duplicates** one that already happened. The guarded policy does
  not let even a mathematically valid synthetic signature **release
  quarantine** until an independently authenticated outcome-observation
  authority exists. That external authority is **not available here**.

The zero-argument M29 command reports only source-authored categorical
case IDs, boolean witnesses and counts. Expected `12/12 PASS`
means all **limits and negative cases were witnessed**, **not** that
real outcome authentication, exactly-once execution or safe automatic
recovery has been implemented. There is no remote signer, MCP server,
user-provided identity key, actual side effect, credentials, network
contact, real operating-system attestation, telemetry or Stable Bridge.

M29 code/tests are source-only and excluded from the frozen 80-file
package. The M6-J excluded-source handoff continues to hash both added
files. Independent beta #59, independent audit #43 and real-target
authorization #21 remain open.


**M29 engineering acceptance (2026-10-30):** [PR #312](../pull/312)
passed [PR CI #41019901819](../actions/runs/41019901819)
**4/4** on Ubuntu/Windows Node20/22 and merged as exact main SHA
`2ff47013ffb1e8cb74923863fce8a03d58a183c9`. Separately
[main CI #41020234312](../actions/runs/41020234312) passed
**4/4 on the same SHA**. Both runs are first-party source tests, not
external identity verification, authentic effect provenance, production
reconciliation or certification. M29 [#311](../issues/311) covers
engineering only; #21/#43/#59 remain open.
