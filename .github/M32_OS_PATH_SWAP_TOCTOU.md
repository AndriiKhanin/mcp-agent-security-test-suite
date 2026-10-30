# M32 — deterministic OS path-swap between metadata check and read

**Source-only first-party security lab.** M31 established that reading a
disposable OS marker is more informative than trusting a child IPC claim.
M32 tests a narrower residual risk: **path-based checks can observe
different files or different bytes across a lstat/read boundary**.

From reviewed source on Node.js 20 or 22:

    node tools/m32-path-swap-lab.mjs

This command accepts no arguments. Each of eight fixed cases creates
a distinct private temporary directory and one first-party child with
a reduced environment. An IPC barrier ensures that the parent first
observes the initial directory state and metadata, and the child then
performs a fixed real OS mutation before the parent opens and reads the
same filename again. The child exits cleanly before the second read,
so a failing case does not depend on an unreliable sleep or race timing.

## Eight bounded cases

| Case | First parent state | After barrier | Key observation |
| --- | --- | --- | --- |
| STABLE_MARKER | PRIMARY | PRIMARY | Stable local data is not external truth |
| SWAP_SAME_SIZE | PRIMARY | SWAPPED | Same byte length can hide different contents |
| REMOVE_AFTER_STAT | PRIMARY | ABSENT | Previously present path disappears |
| CREATE_AFTER_ABSENCE | ABSENT | PRIMARY | Previously absent path becomes present |
| REPLACE_CORRUPT | PRIMARY | CORRUPT | Invalid replacement bytes |
| REPLACE_OVERSIZE | PRIMARY | ANOMALY | Oversized replacement |
| ADD_FOREIGN_ENTRY | PRIMARY | ANOMALY | Extra file invalidates exact inventory |
| STABLE_ABSENT | ABSENT | ABSENT | Absence does not authenticate non-execution |

Two changed/invalid cases would still pass a deliberately inadequate
**marker-size-only** predicate: same-size content swap and extra
unexpected directory entry. Six scenarios expose change or invalid
evidence. The independent source-owned oracle checks both observations,
metadata presence, inaccurate size-only conclusions, child PID/exit,
deterministic barrier completion, cleanup and zero unsafe transitions.

The guarded policy is **QUARANTINE in all eight cases**, even when local
state looks stable. This is a first-party demonstration, not a
cryptographically authenticated observer, robust inode pinning,
atomic filesystem read transaction, signed external receipt, general
sandbox, real business effect, automatic recovery or exactly-once
guarantee. The parent can still be mistaken, and the filesystem might
change after either observation. Cross-platform file identifiers and
power-loss durability are **not** certified.

## Security and release boundary

All files are source-owned inert markers in automatically generated
OS temp directories; there is no caller-provided filesystem path,
external service, user MCP target, credentials, real model/agent,
Stable Bridge, privileged action, network call or telemetry. Error
reports never echo file names, full paths or bytes. The actual worker
rejects direct CLI calls.

Files and tests remain outside the unpublished 80-path npm candidate.
M6-J must continue indexing all excluded-source files with SHA-256,
within the bounded 240-file cap and with its 241st-file deny control.
Acceptance requires Windows/Ubuntu x Node20/22 **4/4 PR CI**, a merge
and **independently matched main-push 4/4 CI on the exact merged SHA**.
Independent beta [#59](../issues/59), audit [#43](../issues/43)
and external target authorization [#21](../issues/21) remain open.

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
