# M11-M/N/O — Two-owner isolation over source-owned IPv4 loopback

**Tracking:** [Issue #236](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/236)

This is **not real authentication**, a real AI agent, a semantic prompt-injection
detector, an OS sandbox, or authorization to connect an external MCP target.

## Purpose

M11-G–L exercised concurrent fictional requests and cancellation. M11-M/N/O
adds two fixed **fictional owner** identities, each with a **source-generated
ephemeral 128-bit test capability** that exists only in memory during one
local test. They are not user credentials, real accounts, reusable secrets or
proof of cryptographic production-grade authentication.

Two requests are submitted concurrently to one disposable HTTP server:

```text
owned 127.0.0.1 listener (port selected by OS)
  A: fixed ID 81, owner A, session A, ephemeral capability A
  B: fixed ID 82, owner B, session B, ephemeral capability B
       |
       +-- exact owner-capability, request, header and method check
       +-- A/B response in source-owned order or deliberate reverse order
       +-- strict response owner/ID/session/content validation per client
       +-- independent M10 first-party toy gateway only for validated data
```

Both listener and client are reviewed first-party source. A correct-looking
but **wrong-owner** response must not enter the other toy gateway; a client
bearing another fictional owner's capability fails at the listener even
though it knows the task ID. The `embeddedInstruction` is transported as
text, **not interpreted or executed**. All protected simulated effects
remain zero, and actual request and TCP socket-close counts are recorded.

## Run from a reviewed source checkout

With Node.js 20 or 22:

```sh
node tools/m11-owner-isolation.mjs
node --test test/m11-owner-isolation.test.mjs
```

The zero-argument CLI verifies **17 fixed cases**: two ordered/reversed
positive cases and **15 negative cases**:

| Group | Fixed negative controls |
| --- | --- |
| Owner and request binding | Wrong/missing ephemeral capability, other-owner request body, reused request ID, unexpected approval, forged Authorization header |
| Response binding | Response from owner A substituted for B, swapped tool-result data, missing response owner, added approval claim |
| Transport robustness | Duplicate JSON key, redirect, unexpected content type, oversized result, stalled result with bounded timeout |

The listener refuses unexpected JSON fields, wrong methods, duplicate
security-sensitive HTTP headers, unknown request IDs, authorization/cookie
headers and inconsistent `Host`, `Origin`, fixed MCP-shaped method and
protocol-version headers. Only the literal fixed route `/mcp` can be used.
Requests and responses have fixed byte bounds. Source-generated capability
bytes never enter the public report, response payload, test fixture or
console output.

A positive case requires **two** observed accepted HTTP requests, two
validated owner-bound responses, **two** distinct successful toy sessions,
confirmed closure of both HTTP responses and both TCP sockets, and zero
protected fictional effects. Each negative case must return a fixed rule
code and never manufacture a second successful gateway execution.

## Trust and limitation statement

- Real networking occurs **only to `127.0.0.1`**, with an ephemeral
  OS-selected port; no user-provided host, port, URL, model, path, executable
  or MCP target is accepted.
- The first-party capability header is for **illustrating scoped binding**
  inside a self-owned toy listener. It is not a substitute for TLS,
  credential brokerage, signed protocol identity, multi-tenant isolation
  against hostile processes or an independently reviewed authentication
  implementation.
- The protected M4 staging server continues to be discovery-only and is
  not modified. The source-only example is not an MCP conformance test.
- No real agent, LLM, user MCP server, credentials, unrelated file read,
  external network call, process execution, or semantic evaluation of
  prompt-injection text takes place.
- This is source-only and outside the fixed **80-path npm release candidate**.
  The complete new source and tests remain inside the bounded M6-J
  SHA-256 custody.
- Real-target authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
  independent audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
  and independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  remain separate, open and unproven by these tests.

Acceptance requires **4/4** Windows/Ubuntu × Node.js 20/22 GitHub CI on the
PR, followed by merge and independently verified **4/4 post-merge push CI**
for the exact main commit. Green source-owned tests are not security
certification or production release approval.
