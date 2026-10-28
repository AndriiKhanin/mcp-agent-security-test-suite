# M11-G/H/I — Concurrent owned-loopback response correlation

**Tracking:** [Issue #232](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/232)  
**Scope:** source-only, two first-party HTTP requests on a disposable IPv4 loopback listener. **Not a real AI agent**, remote MCP security scanner or semantic prompt-injection detector.

## Why this stage matters

M11-D/E/F verified two **sequential** fictional tool-result transactions.
M11-G/H/I verifies that **two requests are in flight together**, each
using its own TCP connection to a first-party `127.0.0.1` listener.
A response can be issued by the test server in either order, but it is
accepted only when its JSON-RPC request ID, fixed session marker, exact
fictional task data, response structure, and byte limits match the
corresponding client expectation.

The sequence begins with the previously accepted M11-A/B/C
discovery-and-owned-loopback preflight. The protected discovery-only
M4 staging server is not modified and still rejects `tools/call`.

The source-owned client constructs two literal JSON-RPC-shaped
`tools/call` requests with identifiers **61 and 62** and fictional
session names `FICTIONAL-OVERLAP-A` and `FICTIONAL-OVERLAP-B`.
It sends them with `Promise.all`, not a serial request loop.
The listener buffers replies until both requests arrive, demonstrating
two simultaneously pending transactions. The tests then have the server
issue either A-before-B or **B-before-A** responses.

The server records actual HTTP requests accepted/denied and its own
**response issuance order**. This is not an assertion about arrival
order at the operating system or a packet-capture trace.
Each client parses the received bytes independently; only a fully
validated toolResult is passed to its own M10 first-party stateful
toy gateway.

## Source-only test command

From a reviewed checkout using Node.js 20 or 22:

```sh
node tools/m11-concurrent-response.mjs
node --test test/m11-concurrent-response.test.mjs
```

The zero-argument CLI checks **15 fixed source-authored modes**:

| Group | Expected behavior |
| --- | --- |
| Ordered A then B | PASS — both individually validated |
| Reversed B then A | PASS — reversed issuance does not confuse IDs |
| Swapped/replayed response, wrong ID | FAIL — corrupt reply never reaches the wrong gateway |
| Unexpected authority, duplicate key, invalid JSON | FAIL — exact on-wire envelope required |
| Redirect, wrong content type, oversized or stalled response | FAIL — no redirect follow, bounded body/deadline and cleanup |
| Replayed first request, unknown second ID, forged authorization header | FAIL — server denies the invalid second request |

All accepted inputs are **fixed fictional JSON fixtures** validated
by the existing bounded M8 schema. The CLI does not accept network
targets, paths, arbitrary request IDs, methods, processes or commands.
Both client and server use literal `127.0.0.1`, with an OS-selected
ephemeral port and explicit socket cleanup. HTTP bodies are bounded;
malformed responses must never be forwarded to the toy gateway.

A corrupted second response can leave the legitimate first result
accepted, but **never** creates a second toy gateway session.
No response body, fixture ID, injected text, port, address, filename,
credential or arbitrary raw error is printed in the result. Counts
and a fixed response-issuance label are the only public witnesses.

## Limits and release controls

- This is a controlled **first-party source-code exercise**, not a
  real AI agent or LLM execution, and the toy gateway does **not**
  interpret malicious wording. No user-owned MCP target is contacted.
- The test does not verify OS-level network isolation against another
  hostile local process or certify transport conformance with all MCP
  protocol variants. HTTP parser/system-layer guarantees remain outside
  the test's evidence.
- The first-party tool result is **not** granted authority, cannot
  request an actual unrelated file read, and cannot launch processes,
  inspect user credentials or select remote connections.
- Source-only scripts/tests/docs remain outside the unchanged **80-path
  npm candidate** and inside M6-J's full bounded hashed excluded-source
  custody.
- External target authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
  independent audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43),
  and independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  remain separate and open.

Require **4/4** CI on Windows/Ubuntu × Node.js 20/22, merge, and
separately verified **4/4 post-merge main push CI** before marking
engineering accepted. Synthetic success is not production approval.
