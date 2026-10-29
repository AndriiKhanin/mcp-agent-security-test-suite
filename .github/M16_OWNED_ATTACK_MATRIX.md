# M16 — three deliberately vulnerable first-party MCP-shaped attack families

Run from a **reviewed source checkout**, on Node.js 20+:

```sh
node tools/owned-attack-matrix.mjs
```

This optional, **source-only** fixed demonstration has no CLI options.
Each of seven scenarios starts a new ephemeral IPv4 `127.0.0.1` HTTP
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
| `REPLAY_UNSAFE` / `REPLAY_GUARDED` | The same already-authorized `ledger.commit` operation ID is sent twice. Permissive server witnesses **two** effects | Guarded server tracks the previously committed **operation key** and witnesses **one** effect; it rejects the duplicate with HTTP 409 |
| `REPLAY_FRESH_GUARDED` | Positive control with **two distinct source-owned operation keys** on the same guarded listener | Both legitimate commits succeed (HTTP 200) and yield exactly **two** effects; proves the guard does not reject merely because a request is second |
| `TAMPER_UNSAFE` / `TAMPER_GUARDED` | Fictional server intentionally sends a JSON-RPC reply with the wrong ID (`99` for request `1`) plus a forged owner claim. Susceptible client follows it and a permissive server witnesses one extra effect | Strict toy client checks the response ID, rejects the tampered reply and makes **no** second request |

The report is `PASS` (7/7 matches) **only if all three intentionally
unsafe effects are detected, the three matching protected cases exhibit
required denials/absence of unauthorized calls, and the distinct-key
positive control admits a second valid operation**. Thus a
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
[#59](../issues/59) remain open. Engineering acceptance confirmed on 2026-10-29, after two bounded PRs:

- [PR #267](../pull/267) initially accepted six cases, with [PR CI
  #40869476641](../actions/runs/40869476641) **4/4 PASS** on rerun
  attempt 2 (the first attempt failed unrelated Windows Node22 M6
  offline npm packaging checks; the failure remains visible), and
  independently verified [main push CI #40870920568](../actions/runs/40870920568)
  **4/4 PASS** at commit `8e306334cfb48e87ac60c0977ba1495ae9cc4310`.
- [PR #268](../pull/268) fixed request-order-only replay refusal by
  using a **per-listener operation-key set** and adding a seventh positive
  control with two distinct keys. [PR CI #40871592873](../actions/runs/40871592873)
  **4/4 PASS**; independent [main CI #40872142693](../actions/runs/40872142693)
  **4/4 PASS** on exact merged commit
  `7587cb380c828df51d0d68cb6992f76e880433a8`.

These results prove only owned synthetic source contracts, not security
of actual models/third-party MCP servers or independent beta acceptance.
