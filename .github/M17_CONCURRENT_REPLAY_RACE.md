# M17 — real localhost concurrent replay race (first-party only)

Run from a **reviewed source checkout** on Node.js 20 or 22:

```sh
node tools/m17-concurrent-replay-lab.mjs
```

M17 addresses a specific gap after M16: ordinary serial replay checks do not
prove that **two in-flight requests with the same operation key** cannot both
pass a check-before-effect race.

## Exactly what happens

Each of three scenarios creates its own ephemeral IPv4 `127.0.0.1` HTTP
listener and sends **two actual concurrent JSON-RPC-shaped `tools/call` POSTs
on separate sockets**. A source-owned rendezvous withholds **both** responses
until both request bodies have been fully received. An observer verifies that
there were **zero responses before this rendezvous**, so the recorded overlap
is not an author-supplied fictional claim or an inferred timing estimate.

| Case | Policy | Actual effects expected | Actual replies expected |
| --- | --- | --- | --- |
| `UNSAFE_SAME_KEY` | Intentionally broken check-then-commit: both overlapping requests inspect a key before either commits | **2** synthetic effects (vulnerability witnessed) | 200 + 200 |
| `GUARDED_SAME_KEY` | Atomic key reservation when the request is admitted, before asynchronous work | **1** synthetic effect; duplicate denied | 200 + 409 |
| `GUARDED_DISTINCT_KEY` | Same key-reservation policy, two different legitimate operation keys | **2** synthetic effects (positive control) | 200 + 200 |

A successful report has `status: "PASS"`, `checked: 3`, `matched: 3`.
**PASS means the intentionally vulnerable race was exposed and the two
guarded controls behaved as expected, not that all three scenarios are safe.**
The exact 200/409 ordering may depend on which request arrives first;
the report compares the **multiset** of responses and separately binds
each JSON-RPC response ID to its actual request.

The independent fixed-source result gate compares the observed socket
connections and closure events, validated request bodies, no-early-reply
rendezvous, duplicate count, HTTP replies, exact JSON-RPC result/error
bodies and real in-memory effect counts. Negative mutations reject fake
overlap, missing unsafe effects, failed protected denial, false-positive
denial of the different-key control, forged statuses and missing cleanup.
No request data, token, host address or private input appears in the
output; only source-defined case and witness field names are reported.

## Isolation, limitations and engineering gate

This test uses **local network I/O on ephemeral `127.0.0.1` sockets**;
it is not a zero-network operation, OS sandbox, authorized remote MCP
assessment or full MCP conformance suite. The "ledger" and "commit" are
entirely fictional in-memory counters, not a database or filesystem.
No real agent/model, credentials, external MCP server, arbitrary command,
telemetry, user-supplied URL, actual filesystem action or Stable Bridge
operation is involved. The two policies are intentionally implemented by
the test harness, not independently audited external software.

It is a source-only helper, **excluded from the unpublished 80-path npm
candidate**. Real-target authorization [#21](../issues/21),
independent audit [#43](../issues/43) and beta evidence [#59](../issues/59)
remain OPEN. Engineering acceptance requires GitHub Actions
Windows/Ubuntu with Node.js 20/22 **4/4 PASS** on the PR, then a **separate
4/4 PASS on the exact post-merge main commit**. A green synthetic result
does not claim an independently operated beta or a release.
