# M25-D — real disposable gate process termination and relaunch

This extends the already accepted [M25 logical policy/generation
experiment](M25_APPROVAL_POLICY_EPOCH.md). The original two cases were
suggested publicly by TheAsymmetricMind: approvals must be bound to the
policy checked at admission, and **pending approvals must not resume
after a gate restart**.

M25-D closes one engineering gap: actually **terminate an OS child process
while an HTTP request is admitted and still pending**, launch a different
child process and test the previously issued fictional approval.

## Run from a reviewed first-party source checkout

```sh
node tools/m25d-os-crash-relaunch.mjs
```

No arguments are supported. The parent starts only its fixed
`tools/m25d-crash-worker.mjs` child using the current Node.js executable.
It never accepts a PID, executable, URL, token, command, port or file
path from the user. Workers inherit a minimal environment without application
credentials. Only **children created by this test** can be forcibly killed.

## Real OS process sequence

1. A first-party worker binds to a kernel-selected **127.0.0.1** port,
   generates its own fresh random test generation and issues a **fictional,
   non-secret** approval bound to its policy version and generation.
2. A real HTTP `tools/call` POST is **admitted**, but the worker
   **does not send a reply or commit the synthetic effect**. An IPC admission
   event signals this deterministic pre-effect barrier to the parent.
3. The parent forcibly terminates **that exact child** with `SIGKILL`
   and independently observes its **OS process exit** and the
   **aborted HTTP request**. It requires zero prior synthetic effect events.
4. The parent launches a *new* worker with a different random
   gate generation but the **same policy version**. In guarded mode,
   the old generation is rejected with HTTP **410** and zero protected
   in-memory effects. A newly issued fictional approval is accepted
   with HTTP **200** and one synthetic effect.
5. A deliberately **unsafe** worker is given the same stale approval
   following a real process restart. It incorrectly ignores the
   generation binding and commits one synthetic effect. This is an
   **expected detected vulnerability** in the toy comparator.

| Case | Actual expectation |
| --- | --- |
| `UNCHANGED_PROCESS` | Normal authorization succeeds and worker shuts down cleanly |
| `CRASH_GUARDED` | Old pending request aborted, old process exits, old grant denied (410), new grant succeeds (200) |
| `CRASH_UNSAFE` | Same real crash/relaunch, but deliberately unguarded new worker accepts stale grant (200), exposing one unauthorized synthetic effect |

An **independent parent-owned IPC observer** records admitted-before-kill
events and fictional effect counters, while HTTP replies record statuses and
synthetic response bodies. The report contains only fixed case IDs, boolean
observations and counter mismatch **names**. Real process IDs, local ports,
random generations, token values and error strings never appear.

A `3/3 PASS` means the expected unsafe-versus-guarded behavior was
*witnessed*: it **does not** mean the intentionally unsafe server is safe.
The separate mutation suite must fail if a stale grant is accepted by
the protected mode, a fresh grant is denied, an exit was not observed,
the pending request continued, the old child committed an effect,
a generation did not change, or process cleanup was not confirmed.

## Limits and boundaries

Unlike M25-A/B/C, **real first-party OS child termination is performed**
here. However, this is still a purpose-built toy: there is **no
persistent approval store, durable transaction log, real model, real
credential, external MCP server, production authorization implementation
or authenticated independent observation source**. Consequently it does
not certify crash-safe persistence, recovery across a real deployment,
cryptographic approval binding or real-world attack resistance.

Worker subprocesses run with ordinary test-user OS privileges, not inside
an OS security sandbox; they contain only fixed first-party code and
fictional in-memory actions. All HTTP uses ephemeral IPv4 loopback,
without egress to external destinations. **Stable Bridge is not
installed, restarted, queried or touched.**

The worker and parent helper are **source-only** and excluded from the
unpublished 80-path npm candidate. Real-target approval [#21](../issues/21),
independent review [#43](../issues/43) and independent beta [#59](../issues/59)
remain open. Engineering accepted (2026-10-30): [PR #300](../pull/300) passed
[PR CI #41007941306](../actions/runs/41007941306) **4/4**
(Windows/Ubuntu Node20/22), then merged as exact main commit
`79592457788f86de05db977203633ccf7eec43d7`.
Independent [post-merge main CI #41008307216](../actions/runs/41008307216)
passed **4/4 on the same commit**. Earlier tests found an IPC/HTTP
witness-observation race; ordered child-to-parent SYNC receipts fixed it
before merge. This remains author-controlled engineering evidence, **not**
proof of durable production authorization recovery or an independent audit.
