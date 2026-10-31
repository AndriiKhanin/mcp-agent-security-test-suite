# M32–M52 — first-party OS evidence labs

All labs use **fixed in-repository children** and parent-owned disposable
OS temporary files on Node.js 20/22. No user-specified executable, path,
credentials, LLM, external MCP target, privileged sandbox or telemetry.
Parent readback is independent of child IPC but is **not** authenticated
external provenance, OS confinement, atomic recovery, exactly-once
execution, or security certification.

## M32 — actual path-swap TOCTOU

Run `node tools/m32-path-swap-lab.mjs`. Eight fixed cases use an IPC
barrier: parent records state/metadata, child mutates a temporary path,
then parent reads again **after observed child exit**.

| Case | Observation |
| --- | --- |
| STABLE_MARKER | Stable data does not attest an effect |
| SWAP_SAME_SIZE | Same-size content replacement |
| REMOVE_AFTER_STAT | Existing path removed |
| CREATE_AFTER_ABSENCE | Absent path created |
| REPLACE_CORRUPT | Invalid bytes |
| REPLACE_OVERSIZE | Oversized bytes |
| ADD_FOREIGN_ENTRY | Unexpected extra file |
| STABLE_ABSENT | Absence does not attest non-execution |

Two cases defeat a naive size-only check; six expose drift/invalidity.
All eight guarded decisions remain `QUARANTINE`. Source-owned tests check
IPC ordering, readbacks, cleanup and zero unsafe transitions.

[PR #321](../pull/321), [PR CI #41026392937](../actions/runs/41026392937)
**4/4 PASS**, merged `0f66d2af9ca882cff8179fa06e799f28a7c548fb`;
[main CI #41027413776](../actions/runs/41027413776) **4/4 on exact SHA**,
1337/1337 tests on Ubuntu20. Engineering only.

## M50 — child effects versus IPC claims

`node tools/m32-path-swap-lab.mjs --child-process-effect-witness`:
six fixed contexts (one owner grant, five denials) and parent OS
readback after exit/cleanup. Five private faults catch writes despite
denial, false claims, malformed IPC, early exit and timeout. IPC does
**not** confine a same-user child; no fault selection through CLI.
[PR #359](../pull/359), CI 4/4 (1388 tests/job).

## M51 — file handles do not confine paths

`node tools/m32-path-swap-lab.mjs --os-filehandle-rights-witness`:
real `r` write denial, `r+` positive write and same-user path reopen
bypass, with parent-read false-claim control and cleanup.
[PR #361](../pull/361), CI 4/4 (1392 tests/job).

## M52 — preopened writable handle bypass

Direct test-only `runFixedPreopenedHandleSelftest()` demonstrates a
held `r+` handle writing despite later `r` handle denial.
Parent verifies bytes, exit and cleanup; invalid input fails closed.
**Not an OS sandbox or revocation**.
[PR #363](../pull/363), CI 4/4 (1393 tests/job).

## Shared custody and open gates

Frozen unpublished npm candidate: **80 packaged paths**. M6-J hashes
all excluded source (maximum **240 files / 2,000,000 bytes**; overflow
denied). No scope relaxation or publication approval. Independent
beta [#59](../issues/59), security audit [#43](../issues/43), real
MCP target authorization [#21](../issues/21) and owner release
decision remain separate and **OPEN**.
