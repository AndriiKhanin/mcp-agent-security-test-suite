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


## M12-G/H/I — Request-scoped SSE response checks

**Tracking:** [Issue #246](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/246). This is an additional **source-only** first-party `127.0.0.1` test. The earlier JSON-response M12-A/B/C server and the M4 protected staging server are unchanged.

The [MCP 2026-07-28 Streamable HTTP specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) allows a server's single POST response to contain an SSE stream with related notifications before the final JSON-RPC response. This demo covers **only one finite request-scoped stream**, not `subscriptions/listen`, arbitrary notifications, SSE resumption, MRTR, authentication or a general MCP server.

From a reviewed checkout with Node 20 or 22:

```sh
node tools/m12-modern-sse.mjs
node --test test/m12-modern-sse.test.mjs
```

The client sends exactly one source-owned modern `tools/call` POST with fixed `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, `Accept`, Origin and request `_meta`. The temporary server uses an OS-selected port on literal `127.0.0.1`. A valid SSE stream contains one `notifications/progress` notification bound to a fictional request token, followed by the exact fixed JSON-RPC final response ID. The server deliberately fragments bytes on the wire. The receiver bounds input to 8192 bytes, eight blocks, four comments, 4096 bytes/frame, and validates fatal UTF-8, event names, JSON duplicate keys, ordering, IDs and the exact reviewed tool result.

**Fixed matrix: 24 controls**, comprising **four expected PASS** (fragmented, CRLF, SSE comments and multiline `data:`) and **20 expected FAIL** (final-first, duplicate/late final, unsolicited server request, wrong ID/progress token, fake authority, malformed/duplicate JSON, invalid UTF-8, too many comments, oversized or truncated frame, unknown event, missing final, wrong content type, redirect, bounded hanging response, wrong Origin or method).

No untrusted tool-result text is passed to the M10 toy gateway **until the entire on-wire SSE response is validated**, including exactly one matching progress notification and one matching final response. All protected fictional effects remain zero. Every owned HTTP connection must close; failures use fixed non-echoing rule codes and never disclose response bodies, paths, ports or tokens.

**Not complete MCP conformance. Not a real AI agent, LLM test, OS sandbox, credential validation, semantic prompt-injection detector or security certification.** Only first-party source-owned sockets are contacted. All new source-only files are included in M6-J's complete, bounded SHA-256 custody; the limit is expanded to **176**, and 177 files are still rejected. The exact **80-path unpublished npm candidate** remains unchanged.

External server authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21), independent security audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) remain OPEN. Require 4/4 CI on Windows/Ubuntu Node20/22, merge and separately verified post-merge main push CI; no release is authorized.


## M12-J/K/L — Fail-closed SSE framing hardening

**Tracking:** [Issue #248](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/248). This continues the source-only first-party M12-G/H/I demonstration, without contacting any external MCP endpoint, running a real agent, or adding a general SSE transport.

Run `node tools/m12-modern-sse.mjs` or `node --test test/m12-modern-sse.test.mjs` from the reviewed checkout. The fixed matrix now covers **40** outcomes: **4 expected PASS**, **36 expected FAIL**. Sixteen additional malformed on-wire cases reject missing/duplicated/forged progress events, altered final JSON-RPC IDs/fields, extra result content or server identity, mismatched result text, unknown `id:`/`retry:` control fields, duplicated `event:`, lone-CR framing, blank or extra final data and a trailing comment after completion. Initial keepalive comments remain allowed. After a complete final response, even comment-only frames fail closed; no later bytes can be interpreted as granting new authority.

Each run checks actual owned HTTP request counts, response/TCP socket close witnesses and zero protected fictional effects. Rejected content never enters M10. Reports include fixed symbolic counters only, not the fictional fixture content. The unchanged unpublished npm candidate contains **80** reviewed paths; M6-J continues to hash every bounded excluded source. This is **not full MCP conformance**, semantic injection detection, real-agent testing, independent audit, real-target permission or release authorization. External gates [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21), [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) remain open. Require PR CI 4/4 and a separate post-merge main CI 4/4 before engineering acceptance.
