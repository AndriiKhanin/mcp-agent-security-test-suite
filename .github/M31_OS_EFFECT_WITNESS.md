# M31 — Actual disposable OS-file evidence versus deceptive claims

M29/M30 proved that one or two authentic signed statements can contradict a
fictional effect. M31 adds real OS-backed evidence: a restricted first-party
child process creates (or omits) an inert, fsynced scratch file, and a
separate parent process uses `lstatSync` and exact `readFileSync`
bytes to observe it **twice**, without trusting the child's claimed outcome.

Run from a reviewed source checkout (Node.js 20+):

```sh
node tools/m31-os-effect-witness.mjs
```

The source-only command accepts **zero arguments** and the worker denies
direct invocation. Each of seven cases creates its own random temporary
directory via `mkdtempSync` under `os.tmpdir()`. An isolated child
performs one fixed source-owned action, the parent reads the result,
optionally the worker mutates it and the parent reads again. The worker
then exits; all scratch files and directories are removed.

## Seven independently read cases

| Case | Claimed outcome | Parent readback (first, second) | Risk of trusting claim |
| --- | --- | --- | --- |
| `TRUTHFUL_COMMITTED` | Committed | Valid, valid | Consistent local evidence only |
| `DECEPTIVE_COMMITTED_NO_EFFECT` | Committed | Absent, absent | Blind skip loses operation |
| `DECEPTIVE_ABSENT_REAL_EFFECT` | Absent | Valid, valid | Blind retry duplicates effect |
| `TRUTHFUL_ABSENT` | Absent | Absent, absent | Absent marker is not external proof |
| `MALFORMED_MARKER` | Committed | Invalid, invalid | Unexpected bytes are denied |
| `MARKER_REMOVED_AFTER_READ` | Committed | Valid, absent | Prior reading is stale |
| `MARKER_REWRITTEN_AFTER_READ` | Committed | Valid, invalid | Prior reading is stale |

Each worker uses exactly one fixed fictional marker name and fixed bytes.
The parent inspects actual OS file metadata and content; unexpected
files, sizes, values and symlinks are never accepted as a valid marker.
Mutation occurs **between two real parent observations**.

The independent source-owned oracle requires **7/7** matching witnesses:
worker identity distinct from the parent, IPC command admission,
first/second actual file readback, claim consistency, readback drift,
hypothetical lost/duplicate effect, clean worker exit and full cleanup.
Negative mutation tests reject forged evidence, missing drift,
false release authority and unclosed scratch resources.

**All guarded decisions remain `QUARANTINE` with zero recovery
transitions.** Even valid local scratch evidence does not establish
actual third-party business-effect provenance. An OS fsync does not
prove power-loss durability or exactly-once processing.

## Explicit security boundaries

This source-only experiment **does perform real local OS process and
temporary file I/O**, but no real customer file access, model/LLM
execution, external MCP contact, arbitrary executable, credential
use, network transmission, production operation, telemetry or
Stable Bridge action. The temporary worker accepts no user paths
or external targets. This is author-run synthetic engineering,
**not** independent beta, an OS sandbox or a security certification.

The unpublished 80-path npm candidate remains unchanged. The
bounded M6-J custody index still hashes all three new excluded
source/test/guide files, with its byte and count ceilings unchanged.

External authorization [#21](../issues/21), independent security
audit [#43](../issues/43) and actual beta evidence [#59](../issues/59)
remain OPEN. Engineering acceptance requires Windows/Ubuntu Node20/22
PR CI **4/4** and separately matched post-merge `main` CI **4/4**.
