# M16 — three deliberately vulnerable first-party MCP-shaped attack families

Run from a **reviewed source checkout**, on Node.js 20+:

```sh
node tools/owned-attack-matrix.mjs
```

This optional, **source-only** fixed demonstration has no CLI options.
Each of six scenarios starts a new ephemeral IPv4 `127.0.0.1` HTTP
listener, sends one or two actual JSON-RPC-shaped `tools/call` POSTs,
checks exact replies and observed in-memory effect counters, then closes
responses/sockets. The only "archive" / "vault" / "ledger" are inert
fictional objects; **no real file or data store is ever accessed**.
There is local loopback network traffic, but no external target,
credentials, model invocation, user endpoints, user code, telemetry,
or Stable Bridge operation.

## Differential cases

| Source-owned case | Intentionally unsafe behavior | Protected counterpart |
| --- | --- | --- |
| `FORGED_UNSAFE` / `FORGED_GUARDED` | A deterministic susceptible toy client treats a `ticket.get` tool-result `claimedOwner` as authorization and sends `vault.erase`; permissive server witnesses one protected fictional effect | Guarded server rejects the identical untrusted-authority call with HTTP 403; zero protected effects |
| `REPLAY_UNSAFE` / `REPLAY_GUARDED` | The same already-authorized `ledger.commit` operation ID is sent twice. Permissive server witnesses **two** effects | Guarded server witnesses **one** effect and rejects the second request with HTTP 409 |
| `TAMPER_UNSAFE` / `TAMPER_GUARDED` | Fictional server intentionally sends a JSON-RPC reply with the wrong ID (`99` for request `1`) plus a forged owner claim. Susceptible client follows it and a permissive server witnesses one extra effect | Strict toy client checks the response ID, rejects the tampered reply and makes **no** second request |

The report is `PASS` (6/6 matches) **only if all three intentionally
unsafe effects are detected and all three protected cases exhibit their
required observed denials/absence of unauthorized calls**. Thus a
`PASS` does **not** mean the deliberately vulnerable clients or
servers are safe. Negative mutation tests fail if an unsafe effect is
missing, an expected guarded denial is absent, status codes differ,
the response identity is not checked, or socket/response close counts
are fabricated. All reported names and mismatch keys are
source-authored; no message contents or user private values are echoed.

## Scope and limits

The bad client is **deliberately programmed** to trust a fixed string and
ignore the forged JSON-RPC ID; it is not a real LLM and cannot establish
the rate or impact of genuine prompt-injection attacks. The lab does not
prove arbitrary MCP clients or servers are secure and is not complete
MCP protocol conformance, a vulnerability scan, independent beta
evidence, or a security audit.

This is entirely separate from M15, the original five-case voluntary
M5 beta protocol and the unshipped 80-path npm candidate. The external
approval/review gates [#21](../issues/21), [#43](../issues/43) and
[#59](../issues/59) remain open. Acceptance requires PR CI and a
separately verified post-merge main CI each to pass **4/4**
(Ubuntu/Windows × Node.js 20/22).
