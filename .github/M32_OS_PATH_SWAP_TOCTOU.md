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
