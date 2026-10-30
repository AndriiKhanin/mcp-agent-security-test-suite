# M26 — cross-process replay ledger in disposable OS scratch space

M25-D proved that an owned, pending approval is rejected after actual
worker process termination when the gate generation changes. M26 tests a
different property: **one fictional operation key must not be committed
twice, even when the old process has died or when two workers share an
on-disk spent-key ledger**.

From a **reviewed first-party source checkout** with Node.js 20 or 22:

```sh
node tools/m26-cross-process-ledger.mjs
```

This command takes **zero arguments**, has no target configuration, and
starts **only the source-owned** `tools/m26-ledger-worker.mjs` child using
the current Node.js executable. It does **not** contact an MCP server,
Stable Bridge, a real agent or any remote endpoint.

## Three actual OS-process demonstrations

| Scenario | First-party evidence | Correct interpretation |
| --- | --- | --- |
| `GUARDED_CRASH_REPLAY` | A child commits fixed key A, creates a marker with exclusive `wx` and successfully `fsync`s it. The parent confirms an effect and **kills that exact child**. A new child sharing the temporary directory denies A (409, zero new effects), while new key B is accepted (200) | Fixed spent-key marker survives the tested worker restart |
| `TRANSIENT_UNSAFE_REPLAY` | An intentionally vulnerable child remembers spent keys in memory only. After the parent kills it, a new worker incorrectly accepts A a second time (200, one extra fictional effect) and admits B | Deliberately detected cross-process double execution |
| `GUARDED_PARALLEL_CLAIM` | Two different OS workers both acknowledge `PREPARED` for A before either receives `RELEASE`. Both independently try an exclusive `wx` file claim. Exactly **one** succeeds (200), one is denied (409), and the parent sees one marker and one effect event | Cross-process atomic single-winner admission, including the positive overlap witness |

The parent owns and enumerates a newly created private temporary
directory (`m26-owned-ledger-*` under the OS temporary directory).
The only file names a worker can generate are the fixed `spent-alpha.marker`
and `spent-beta.marker`. The content is a fixed **non-secret** text marker.
The parent independently checks marker names, exact file content, counts,
child exit events, IPC `EFFECT` events, denied status codes, distinct
process identities, both-worker admission barriers and **removal of the
temporary directory after completion**.

The worker is denied direct ordinary CLI use, and neither the parent
nor the worker accepts caller-selected PIDs, paths, commands, endpoints,
tokens or arbitrary operation keys. The subprocess environment is
restricted; child stdout/stderr are suppressed during the owned test.
All final reports use fixed symbolic case IDs, counts and negative-control
witness field names rather than raw paths, PIDs, OS errors or contents.

## Expected witness and deliberate limitations

The fixed report should show `status: "PASS"`, `matched: 3` and
`checked: 3`. **PASS means the deliberately unsafe policy was exposed
and the two guarded configurations behaved as expected**. It does not
mean the vulnerable mode is secure.

Independent mutation tests must reject missing prior effects, a falsely
accepted guarded replay, an unreal duplicate, an unobserved process exit,
a fabricated two-worker barrier, two successful concurrent claims and
unremoved scratch directories.

**Actual temporary filesystem writes and subprocess termination happen
in this test**; unlike M25's in-memory-only cases, this is not zero-file
I/O. This is nevertheless **not proof of power-loss/disk-failure
durability** or a hardened production transactional store: a successful
file `fsync` cannot guarantee recovery from every storage/controller
failure, and no independent crash-consistency fault injector is used.
The marker is not a signed token, operator approval, authenticated
source or real user resource. No real LLM, third-party MCP or arbitrary
user process is involved.

The tool and tests are **source-only** and not part of the fixed
**unpublished 80-file npm candidate**. Independent security audit
[#43](../issues/43), real-target approval [#21](../issues/21) and
beta [#59](../issues/59) remain OPEN. Engineering accepted on 2026-10-30: [PR #303](../pull/303) passed
[PR CI #41012856455](../actions/runs/41012856455) **4/4** and
merged as main SHA `c53dfad239b3c8af356e8050572920cde943e05c`.
The independent [main CI #41013215418](../actions/runs/41013215418)
passed **4/4 on that exact SHA** (Windows/Ubuntu Node20/22).
Initial worker IPC close-callback and bounded M6-J handoff size
failures were fixed before merging; no failure was waived.
This is engineering evidence, not independent beta or production durability.
