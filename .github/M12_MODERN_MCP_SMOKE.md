# M12 — first-party modern MCP 2026-07-28 test matrix

Source-only local tests on temporary `127.0.0.1` listeners. **Not complete MCP conformance**, not a real AI agent, injection detector, sandbox, authenticated authorization, or an external MCP scan. No unreviewed endpoint, credentials, user-selected command/path or real system action.

**Complete original historical engineering notes:** [source at fixed verified commit](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/blob/7fd578f3fcdd914206c32bf26ed53003583b291b/.github/M12_MODERN_MCP_SMOKE.md). The full text remains available in Git history, and milestone evidence is preserved in [ROADMAP.md](../ROADMAP.md). This shorter operational index does not change any existing source/test cases or their expected results.

## M12-A/B/C — three separate modern JSON POSTs

```sh
node tools/m12-modern-http-smoke.mjs
node --test test/m12-modern-http-smoke.test.mjs
```

18 fixed controls: one expected PASS, 17 expected FAIL. One owned listener receives `server/discover`, `tools/list`, then fixed fictional `tools/call` for `FICTIONAL-Q17`. This sequence is a **demo**, not a required handshake. Validate `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, body `_meta`, JSON-RPC ID, UTF-8, data bounds, tool text, and socket closure. Refuse wrong header/protocol/method, legacy `initialize`, origin mismatch, malformed/duplicate JSON, forged/replayed reply, wrong content type, redirect, oversize or timeout. Embedded text is **data**, never executable authority. See [Issue #242](../issues/242).

## M12-G/H/I and J/K/L — bounded request-scoped SSE

```sh
node tools/m12-modern-sse.mjs
node --test test/m12-modern-sse.test.mjs
```

Initial SSE matrix: 24 controls (4 accepted / 20 denied), expanded through framing hardening to **40 (4 accepted / 36 denied)**. A valid stream has one source-owned `notifications/progress` tied to the request token and exactly one matching final JSON-RPC result. Accept framed fragmented bytes, CRLF, legal comments and multiline data. Deny reordered/duplicate/missing progress/final, forged authority, trailing frames, wrong IDs, duplicate keys, invalid UTF-8, truncated or oversized frames, unsupported `id:`/`retry:`, wrong origin/content type, redirect and bounded hangs. Validate limits and socket closure before delivering data to M10. See [#246](../issues/246), [#248](../issues/248).

## M12-M/N/O — exact first-party response headers

50 fixed SSE outcomes: 4 accepted / 46 denied. Verify literal `Content-Type: text/event-stream`, `Cache-Control: no-store`, `X-Accel-Buffering: no`, `Connection: close`, `Transfer-Encoding: chunked`; optionally Node's `Date`. Reject repeated header names from `rawHeaders`, Set-Cookie, synthetic session/auth, encoding/disposition/refresh, and wrong values. This is a **strict mock-specific contract**, not the general MCP HTTP standard. See [#250](../issues/250), [PR #251](../pull/251), subsequent [source-custody repair PR #253](../pull/253) and [main CI #40836248131](../actions/runs/40836248131).

## M12-P/Q/R — exact first-party request headers

**60 fixed cases: 4 accepted / 56 denied.** The inbound POST requires precisely `Host`, `Origin`, `Content-Type`, `Accept`, `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, `Content-Length`, `Connection`; `Connection: close`, exact body and method, no duplicate/unlisted names. Ten denials include synthetic proxy/session/parameter/owner grants, User-Agent, keep-alive, Cookie, Authorization and duplicate Accept. Denials produce HTTP 400, no toy tool delivery and closed response/TCP sockets. [PR #256](../pull/256) and [main CI #40838079608](../actions/runs/40838079608) were 4/4 PASS.

## Security and change constraints

Only reviewed Node 20/22 fixed source talks to owned ephemeral `127.0.0.1` HTTP. No user-specified hosts, live endpoints, real model decisions, unrelated OS file reads, credentials, semantic prompt-injection resilience claims, or generic MCP compliance. Real target gate [#21](../issues/21), independent security audit [#43](../issues/43), beta [#59](../issues/59) and owner publication decision remain OPEN. No test/control removal or behavior change is authorized by this guide consolidation. Maintain **240 excluded files / 2,000,000-byte cap** under M6-J; the **80-path unpublished npm candidate** is unchanged. Full historical rationale and exact prior CI receipts remain in the fixed source revision above and the roadmap.
