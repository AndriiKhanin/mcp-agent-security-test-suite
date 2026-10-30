# M27 — in-doubt crash windows are NOT exactly-once recovery

M26 proves that a verified spent-key marker prevents an already completed
operation from being applied a second time after an OS-worker restart.
M27 tests a different and deliberately harder **uncertain-outcome window**:
a worker reserves the operation and crashes *before* it can communicate
whether the effect was performed.

Run from a reviewed first-party source checkout on Node.js 20 or 22:

```sh
node tools/m27-indoubt-crash-replay.mjs
```

This command has **zero arguments**, uses only two source-owned Node child
workers per scenario and a newly created private temporary OS directory
per case. **Actual temporary file writes, `fsync` and child process
termination occur.** There is no external endpoint, MCP server or LLM.

## What the three independent cases demonstrate

| Case | First worker before forced OS exit | New worker response to old key | Evidence |
| --- | --- | --- | --- |
| `CRASH_BEFORE_EFFECT_GUARDED` | Exclusive `wx` pending marker is written and `fsync`ed; **zero** fictional effects | HTTP-like symbolic 423 `IN_DOUBT` — no second effect | The reserved key is quarantined even though no effect occurred; a **potentially lost operation** needs manual reconciliation |
| `CRASH_AFTER_EFFECT_GUARDED` | Marker exists; one actual IPC-witnessed fictional effect; **no acknowledgement** | Symbolic 423, zero replay effects | Preserves at-most-once within this toy model without pretending effect outcome is independently recoverable |
| `CRASH_AFTER_EFFECT_UNSAFE_RETRY` | Same one effect and no acknowledgement | Deliberately wrong retry policy returns 200, creates **one additional fictional effect** | The bad policy's duplicate execution is witnessed instead of hidden by a green summary |

Each new worker must also admit a **different fixed key** (200, one
fictional effect), proving that its block is key-scoped rather than a
global refusal. The parent checks that the original `alpha` marker
remains **in-doubt**, that the `beta` marker is marked spent, that the
original worker was actually terminated, that the fresh worker has a
different PID and exits normally, and that both markers and the entire
temporary directory are removed at the end.

The initial worker reports `CLAIMED` but deliberately never emits a
`RESULT` for the old action. On the after-effect cases it emits only
the synthetic `EFFECT` IPC witness. **This is not a real external
side effect**, and the marker does not contain a confirmation of
completion. The safe policy must not auto-expire or silently undo a
pending marker merely to make the test look successful.

## Interpretation and limitations

Expected report: `status: "PASS"`, `checked: 3`, `matched: 3`.
This means an unsafe duplicate was **detected** and two guarded
quarantine cases did not replay. It does not mean that a business
operation was exactly-once committed or successfully rolled back.

The first case demonstrates a genuine tradeoff: fail-closed quarantine
can lose availability and leave an operation in doubt. A production
implementation needs **separately authenticated reconciliation of the
real side effect** and manual or explicitly authorized recovery. M27
does not implement such reconciliation or grant any recovery authority.

The parent/worker IPC identities are source-owned test conventions, not
an authenticated permission protocol. This is **not** an independently
audited crash-consistency, distributed transaction or power-loss
durability proof. No OS-wide fault injection, external service,
real model, customer file, real credential, arbitrary executable,
caller-selected path/PID, telemetry or Stable Bridge is involved.

The new helpers are source-only, excluded from the fixed **unpublished
80-path npm candidate**. External tester beta [#59](../issues/59),
audit [#43](../issues/43) and real-target authorization [#21](../issues/21)
remain open. Engineering accepted on 2026-10-30:
[PR #306](../pull/306) passed [PR CI #41014727992](../actions/runs/41014727992)
**4/4** on Windows/Ubuntu × Node20/22 and merged as exact main SHA
`8b9d6b4a20d344090e0875362b47f39614a279b5`.
Independent [main CI #41015098532](../actions/runs/41015098532)
passed **4/4 on that same SHA**. This remains author-controlled,
synthetic crash-window evidence, **not** independently verified
exactly-once delivery, power-loss durability or safe real-world recovery.
