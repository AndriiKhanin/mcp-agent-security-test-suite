# M11-S/T/U — Synthetic in-flight capability revocation

**Tracking:** [Issue #240](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/240)  
**Scope:** first-party, source-only **fictional** capabilities over owned
`127.0.0.1` HTTP. This is **not real authentication**, a real agent,
an LLM, MCP conformance testing, or security certification.

## What is measured

M11-P/Q/R checks stale synthetic capabilities between separate local runs.
M11-S/T/U adds a **TOCTOU-style boundary inside one overlapping run**:

1. Two source-authored fictional owners send distinct requests over
   simultaneous, disposable IPv4 loopback connections.
2. The owned server validates **both complete request bodies**, strict
   headers, fixed method, request ID and randomly generated *fictional*
   owner capability headers. It records admission decisions.
3. At a deterministic **admission barrier**, before any success-response
   bytes are issued, the test owner may revoke A, B or both capabilities.
4. Both responses still travel over real localhost HTTP and are
   independently checked against strict first-party JSON-RPC-shaped
   envelopes. The parent gate rechecks the live fictional capability
   **after validating on-wire bytes and immediately before calling**
   the independent M10 stateful toy gateway.
5. A revoked owner receives **zero** gateway deliveries. An unaffected
   owner may continue. No protected fictional file/tool effects occur.

Revocation is intentional source-authored test behavior. A `PASS` does
not mean a production credential system is correct: capabilities and
the authorization gate are entirely under the test's control, and
there is no hostile co-resident process or externally controlled agent.

## Execute in a reviewed source checkout

With Node.js 20 or 22:

```sh
node tools/m11-inflight-revocation.mjs
node --test test/m11-inflight-revocation.test.mjs
```

The zero-argument selftest runs **13 fixed modes**: one pristine PASS,
12 deliberately unsafe FAIL outcomes. Its controls include revoking
A, B or both after request admission; missing, incorrect or forged
authorization on the second request; swapped/replayed/wrong-ID reply;
extra authority claims; malformed and duplicate-key JSON. All effects
are restricted to fixed source-owned localhost operations.

The tests assert exact HTTP request processed/accepted/denied counts,
admission barrier timing, actual response bytes validated, rejected
post-revocation deliveries, successful toy gateway deliveries, and
response/TCP socket close counts. Every reviewed fictional fixture is
tested without using embedded instructions as commands.

Reports contain fixed rule codes, counters and Boolean security-limit
flags only. They **never** expose generated capability values, ephemeral
port numbers, names of contributor files, private paths or contents of
fictional injection strings. Extra CLI arguments are refused generically.

## Non-goals and preserved boundaries

- **Not real authentication:** random run-local strings represent
  **fictional owner capabilities**; no actual identity provider, token
  broker or user authorization system is involved.
- **Not a real AI agent:** toy-agent actions are trusted deterministic
  code; the embedded tool-result instruction is never semantically
  understood or executed.
- No third-party MCP server, arbitrary network target, process launch,
  shell command, credential use, unrelated OS file read or actual
  prompt-injection detection. The only network destination is the
  literal `127.0.0.1`, with OS-selected ephemeral ports.
- The original M4 strict discovery-only staging contract is unchanged.
  The new loopback mock is separate, disposable and source-only.
- No released assets are modified, no dependencies added, and the
  unpublished npm candidate remains exactly **80 paths**. All added
  files are in the bounded, SHA-256-verified M6-J excluded-source
  inventory.
- Approval for external targets
  [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
  independent audit
  [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
  and independent beta
  [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  remain open. No PR or CI result grants external scanning authority.

Engineering acceptance requires PR CI **4/4** on Ubuntu/Windows with
Node.js 20/22 and separate, verified post-merge main push CI **4/4**.
