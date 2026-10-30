# M31 — parent-read OS evidence is stronger than a child claim, not effect provenance

M31 is a **source-only, first-party** extension of M29/M30 signed
receipt limitations. A child can honestly or falsely report that an
effect happened. The parent inspects **actual disposable operating-system
scratch files**, after observing the child clean exit, rather than
treating IPC as a trusted result. This is not a real user operation
or external receipt.

From a reviewed checkout on Node.js 20 or 22, run:

    node tools/m31-os-effect-witness.mjs

The CLI accepts **no arguments**, paths, URLs, credentials or runtime
targets. The worker rejects direct invocation. Each of the seven
fixed cases gets its **own new private OS temporary directory** and
a separate first-party Node.js child with a reduced environment and
IPC only. The child optionally creates an inert effect.marker with an
exclusive wx open, fixed bytes and fsync. The parent waits for the
child to exit before reading the directory with readdir, lstat and
readFile and checks exact data, type, size and inventory. A
parent-controlled removal or rewritten marker creates the second
observation. Each directory is deleted before a successful result.

## Seven distinct comparison worlds

| Fixed case | Child claim | Parent reads | Risk if blindly trusting claim |
| --- | --- | --- | --- |
| TRUTHFUL_COMMITTED | COMMITTED | PRIMARY, PRIMARY | No claim/disk mismatch |
| FALSE_COMMITTED_NO_MARKER | COMMITTED | ABSENT, ABSENT | **Lose** one fictional unperformed action |
| FALSE_ABSENT_WITH_MARKER | ABSENT | PRIMARY, PRIMARY | **Duplicate** a fictional already-marked action |
| TRUTHFUL_ABSENT | ABSENT | ABSENT, ABSENT | No claim/disk mismatch |
| CORRUPTED_MARKER | COMMITTED | CORRUPT, CORRUPT | Invalid local marker cannot prove outcome |
| REMOVED_BETWEEN_READS | COMMITTED | PRIMARY, ABSENT | Evidence changes after a valid read |
| REWRITTEN_BETWEEN_READS | COMMITTED | PRIMARY, REWRITTEN | A different valid-shaped marker is still drift |

The hypothetical lost/duplicated outcomes are **not real business
effects**; they demonstrate what a naive claim-only decision would do
in a fictional world. A passing oracle requires the exact seven
parent-observation pairs, IPC claim mismatch, two drift witnesses,
clean distinct OS child, successful scratch cleanup, and **zero**
guarded recovery/release transitions. For **all seven**, the defended
decision is QUARANTINE, including locally truthful cases.

## Limits and negative controls

The independent, source-owned reference oracle rejects forged disk
states, false cleanup, invented process identity or clean exit,
suppressed lost/duplicate/drift witnesses, fabricated external-effect
proof, unsafe transition, reordered/missing rows, sparse arrays and
getter-bearing evidence. Report fields contain only source-fixed
identifiers, booleans, counts and classifications; never paths,
marker bytes, credentials or untrusted claims.

This experiment **does perform real writes and reads to an isolated
OS temporary directory**. That is its only intentionally real
effect. File presence is not a receipt for a payment, remote tool
execution, application business effect or authenticated audit. A
local file can be stale, forged, replaced, deleted or lack external
correlation. The parent is not an independent third-party attestor,
and fsync is not a power-loss durability guarantee.

It does not use user-configured paths, arbitrary command execution,
external MCP servers, a real model/agent, Stable Bridge, secrets,
network, telemetry, external authorization or automatic retry.
In-doubt remote operations must **not** be released from quarantine
using this demonstration. No exactly-once, general OS isolation or
production recovery claim is made.

All M31 implementation and tests are outside the frozen, unpublished
**80-path npm candidate**. M6-J must include their SHA-256 hashes in
its bounded excluded-source custody, and existing 241st-file rejection
must still pass. Engineering acceptance requires full Windows/Ubuntu
x Node20/22 **4/4 PR CI**, followed by **separate 4/4 main-push CI
on exact merged SHA**. Independent real-user beta
[#59](../issues/59), third-party audit [#43](../issues/43) and
external-target authorization [#21](../issues/21) remain open.

## Engineering acceptance (2026-10-30)

[PR #319](../pull/319) passed [PR CI #41025402415](../actions/runs/41025402415)
**4/4** (Windows/Ubuntu Node.js 20/22), merged at exact SHA
`631ac0e5bcc4af94ef5dbeb928d4494937eb6ef9`, and separately
[main CI #41025873482](../actions/runs/41025873482) passed **4/4
on that same SHA**. [#317](../issues/317) closed for first-party
engineering scope. This remains neither authenticated business-effect
truth nor real-world recovery authorization; #21/#43/#59 stay open.
