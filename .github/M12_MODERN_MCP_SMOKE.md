# M12-A/B/C — Modern MCP 2026-07-28 first-party Streamable HTTP subset

**Tracking:** [Issue #242](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/242)  
**Scope:** fixed, source-owned loopback test. This is **not complete MCP conformance**, not a general MCP server, real AI agent, real security scan or certification.

## Why this exists

Earlier M11 tests deliberately used a narrow *MCP-shaped* fictional
`tools/call` response. M12 exercises the **actual modern-era request
envelope** on disposable first-party `127.0.0.1` HTTP listeners.
It follows the published [2026-07-28 Streamable HTTP transport](
https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
and [tools message shapes](
https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
for a **small subset** of their functionality.

The modern era is *stateless*: there is no legacy `initialize` handshake,
no protocol-level session ID, and every request declares its protocol
version, client capabilities and clientInfo in `params._meta`.
Modern HTTP requires `MCP-Protocol-Version` and `Mcp-Method` headers,
plus `Mcp-Name` on `tools/call`; they must agree with JSON body fields.
The client declares `Accept: application/json, text/event-stream`.

This source-owned demonstration deliberately sends exactly three
**separate** POST requests to one temporary listener:

1. `server/discover` — advertises protocol version and a single
   fictional `tools` capability. Its response is
   `resultType: "complete"` and includes source-authored serverInfo in
   `result._meta`.
2. `tools/list` — reports one fixed fictional ticket-status tool
   and its JSON Schema. This is a list response, not a tool execution.
3. `tools/call` — calls only that fixed fictitious tool with
   `FICTIONAL-Q17`. The result uses `resultType: "complete"`,
   `content`, `isError:false` and serverInfo. Its text contains
   legitimate fictional task data **and** an embedded instruction,
   which remains untrusted data. Only the exact byte-validated result
   reaches the M10 source-owned stateful toy-agent gate.

**The three-step sequence is our demo's sequence, not a mandatory
handshake imposed on modern MCP**. No third-party endpoint is contacted.

## Usage

From a reviewed source checkout with Node.js 20 or 22:

```sh
node tools/m12-modern-http-smoke.mjs
node --test test/m12-modern-http-smoke.test.mjs
```

The zero-argument selftest runs **18 source-authored controls**: one
expected PASS and **17 expected FAIL**. Negative controls cover
missing/mismatched method/name/protocol headers; unsupported protocol;
legacy `initialize`; wrong origin; malformed or duplicate-key JSON;
replayed or forged tool reply; unreviewed tool text; wrong content
type; redirect; oversized body; and a bounded hanging response.

For every test, the owned listener observes actual HTTP requests and
their accepted/denied decisions. The tool-result client checks the
exact JSON-RPC response ID and structure, fixed source-owned content,
bounds and UTF-8 before the M10 gateway can consume it. No response
text or local port is echoed in the public symbolic report. Every TCP
connection is checked for close.

## Security and completeness limits

- **Not complete MCP conformance**: this demo covers only JSON-body
  responses for three fixed methods. It does not implement SSE
  streaming, subscriptions, MRTR, `x-mcp-header` parameter routing,
  flexible tool catalogs, general authentication, backward
  compatibility negotiation, or real external targets. The existing
  M4 standalone discovery SSE tests remain a separate surface.
- The test listener is **not a remotely accessible MCP service**.
  Both ends are fixed reviewed source; host is literal `127.0.0.1`
  and the port is allocated by the OS. No user-supplied address,
  credential, command, process, file path or arbitrary tool can be
  passed to the zero-argument CLI.
- **No real AI agent, LLM, semantic prompt-injection evaluation,
  unrelated OS file read, private data or client-controlled
  execution**. The embedded instruction is not parsed or executed.
- Declared server capabilities and identity are **fictional**, not
  independent trust or authorization evidence. No OS sandbox or
  real authentication is claimed.
- The protected M4 discovery-only staging server is unchanged:
  its `tools/call` denial remains enforced. M12's separate
  disposable test mock must not broaden that authorization.
- All changes are source-only and outside the exact **80-path
  unpublished npm candidate**. Every added file remains under
  M6-J's bounded SHA-256 excluded-source custody.
- External targets require separate owner authorization
  [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21);
  independent audit
  [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
  and beta
  [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  remain open.

Engineering acceptance requires full **4/4** Windows/Ubuntu Node.js
20/22 PR CI, squash merge, and an independently verified **4/4**
post-merge main push CI. None of these results authorizes release.
