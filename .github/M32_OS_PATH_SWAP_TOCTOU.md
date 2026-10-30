# M32 — deterministic OS path-swap evidence

Source-only first-party lab (Node.js 20/22): run
`node tools/m32-path-swap-lab.mjs` for eight disposable IPC-barrier
cases. Parent reads metadata, a fixed child mutates an OS temporary
path, then parent reads again **after child exit**.

| Case | Witness |
| --- | --- |
| STABLE_MARKER | Stable bytes are not external truth |
| SWAP_SAME_SIZE | Same-size content replacement |
| REMOVE_AFTER_STAT | Existing path removed |
| CREATE_AFTER_ABSENCE | Absent path created |
| REPLACE_CORRUPT | Invalid bytes |
| REPLACE_OVERSIZE | Oversized bytes |
| ADD_FOREIGN_ENTRY | Unexpected directory entry |
| STABLE_ABSENT | Absence does not authenticate non-execution |

Two changes fool size-only evidence (same-size swap, extra entry);
six cases expose drift or invalid evidence. Source-owned checks cover
both readbacks, child exit, IPC barrier, cleanup and zero unsafe
transitions. Guarded policy is **QUARANTINE** in all eight cases.
Neither local readback nor stable metadata proves a signed external
effect, atomic filesystem transaction, sandbox, exactly-once execution
or power-loss durability.

## Security and release boundary

Only first-party temporary files and fixed child processes;
no user paths, external targets, credentials, real agents, telemetry
or trusted OS sandbox. Error reports omit private paths and bytes.
Sources remain outside the frozen unpublished 80-path npm candidate;
M6-J retains SHA-256 custody (240 files maximum; 241st denied).
Acceptance needs four Windows/Ubuntu Node20/22 CI jobs and exact
post-merge main verification. External beta [#59](../issues/59),
independent audit [#43](../issues/43) and target permission
[#21](../issues/21) remain open.

## Engineering acceptance (2026-10-30)

[PR #321](../pull/321) passed [PR CI #41026392937](../actions/runs/41026392937)
**4/4** on Windows/Ubuntu Node.js 20/22. The exact merged main
commit is `0f66d2af9ca882cff8179fa06e799f28a7c548fb`; separately
[main CI #41027413776](../actions/runs/41027413776) passed **4/4
on that same SHA**. Ubuntu Node20 executed **1337/1337 tests, zero
failures/skips**. [#320](../issues/320) closed for first-party
engineering scope only. External observer trust, remote effect proof,
release, independent beta, audit and real-target authorization
remain unverified.

## M50 — child effect witness (first party only)

Run `node tools/m32-path-swap-lab.mjs --child-process-effect-witness`.
Six fixed scenarios use the exact source-owned M32 child, IPC and a fresh
parent-allocated OS temporary directory. Only a trusted-owner context
with `WRITE_TASK_STATUS` may create the fixed fictional file; read-only
owner and tool-result/email contexts (even forged owner or scanner
clearance) are denied. Parent independently checks disk after child exit,
then verifies directory removal.

Five direct test-only controls must detect unauthorized child write
despite `DENY`, false IPC effect claim, malformed IPC, early exit and
bounded hang termination. No fault controls, arbitrary paths, commands,
credentials or remote targets are exposed through the public CLI.
Parent and child share an OS identity: **not process sandboxing**.
Accepted in [PR #359](../pull/359), CI 4/4 (1388/1388 per job).
External authorization, beta, audit and release remain unverified.

## M51 — actual OS file-handle rights (not process isolation)

`node tools/m32-path-swap-lab.mjs --os-filehandle-rights-witness`
runs three fixed, source-owned Node children on Windows/Linux.
Parent-controlled disposable files are independently read after exit:
a write on an `r` handle is denied; an `r+` write succeeds; and a
read-only-denied child **can reopen the same path in `r+` mode and write**.
A direct test-only liar changes disk bytes but reports no effect; parent
must reject the claim. Clean exits, file cleanup and exact CLI inputs
are tested in `test/m32-path-swap-lab.test.mjs`.

**Scope:** real OS handle restrictions, **not** filesystem confinement,
verified identity, arbitrary hostile-process sandboxing, live MCP/LLM,
external targets or certification. No user-selected path or credentials.

## M52 — preopened handle counterexample (source-only)

Direct test-only `runFixedPreopenedHandleSelftest()` starts the fixed M32
child on a parent-created temporary file. The child opens a writable
`r+` descriptor **before** opening a second, read-only `r` handle.
The second handle rejects writes, but the previously held `r+` handle
still changes bytes; the parent independently verifies the effect after
child exit and removes the temporary directory. Invalid API arguments
fail closed. This proves **absence of process confinement**, not an OS
sandbox or a revocation mechanism. No user paths, external MCP, or LLM.
