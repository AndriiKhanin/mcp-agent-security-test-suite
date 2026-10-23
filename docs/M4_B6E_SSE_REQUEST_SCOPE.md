# M4-B6-E — bounded first-party MCP request-scoped SSE

**Implementation candidate — CI/independent review pending.** [Issue #91](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/91).

This change expands only the finite reader of the project's first-party modern MCP staging mock. The mock binds a literal `127.0.0.1` socket at an OS-selected ephemeral port for one fixed `server/discover` request. It does NOT introduce a user-selected URL, generic MCP client, tools/call authorization, credential handling, remote deployment, OAuth, paid APIs, sandbox, or new publication.

## Pinned transport behavior

The [MCP 2026-07-28 Streamable HTTP specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) allows server-sent request-related notifications (e.g., progress or logging) before the matching final JSON-RPC response. SSE colon-prefixed comment lines carry no event data and must be ignored. Independent server-originated requests (sampling/elicitation/roots) are forbidden on the response stream; MRTR uses embedded input requests in a result and is NOT implemented here.

The trusted first-party test reader accepts:
- One exact reviewed result (`jsonrpc: "2.0", id: 1`, fixed `DiscoverResult`) as a JSON response **or** SSE final response.
- Before the SSE final response, at most **two** copies of one literal `notifications/message` logging object with `level: "info"` and a fictional no-secret payload. This test fixture scopes the event to the originating request by construction; it is NOT general notification correlation logic.
- At most **eight** SSE colon-prefixed comment lines; comments/keepalive blocks are ignored. CRLF and LF delimiters are handled. A reviewed final message with JSON payload split across no more than four `data:` lines is accepted.
- No more than **12** SSE blocks and no more than **32 KiB** total HTTP response bytes, one request, no redirect, bounded request deadline and forced finally-cleanup.

It rejects missing/duplicate final responses, notifications after final, unknown or unrelated notifications, unsolicited JSON-RPC requests, unknown SSE fields or event types, excessive events/comments/data lines, malformed JSON, strict UTF-8 errors, un-terminated events, redirects, timeouts and oversized responses. Only fixed symbolic failures go to JSON-v1 CLI reports; raw SSE content, actual host/port/PID, tokens and data remain absent.

The fixture is **narrower than full SSE/MCP interoperability** (e.g., arbitrary spec-valid request-related notification payloads, `id`/resume semantics, extended event fields, subscriptions, full MRTR, broader client conformance). The numeric limits and literal allowlists above are **local product test policy**, not general MCP requirements. This is not OS-level network tracing, target ownership verification, sandboxing, or a security certification.

## Repeatable acceptance

Current engineering expectation: Windows and Ubuntu × Node 20/22, 4/4 PR CI and 4/4 post-merge main CI, zero tests failed or skipped, source and installed npm archive smoke. Exact reviewed npm inventory **80→81 paths** (this one guide; new tests remain development-only), with no new runtime dependency. [Real-target RFC #21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21), independent security/provenance [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and external beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) remain OPEN.
