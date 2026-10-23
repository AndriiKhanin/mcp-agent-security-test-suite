# M4-B6-A — first-party isolated modern MCP staging fixture

**Status: first-party local engineering ACCEPTED, external/user-owned MCP testing NOT AUTHORIZED.** Owner approved building an **owned test-only staging server**, but has **NOT approved external user-owned MCP contact**, hosting, remote deployment, credentials, tokens, arbitrary stdio programs or stable publication.

## Run

```sh
node src/cli.mjs staging-selftest
```

The new no-argument command starts a **temporary first-party HTTP server listening exclusively on IPv4 127.0.0.1 with an OS-selected ephemeral port**, runs one **owned loopback** discovery request, and closes the listener/connections in `finally`. No persistent service, manual port assignment, user-supplied host, dynamic executable, DNS lookup, remote TLS connection or API provider is used.

Unlike the M4-A fictional `ping` fixture, this fixture uses a real **MCP 2026-07-28-shaped** `server/discover` request: `POST /mcp`, `MCP-Protocol-Version` and `Mcp-Method: server/discover` header validation against the body, `params._meta` carrying version, fictional client info and capabilities, and `Accept: application/json, text/event-stream`. The server returns a finite `DiscoverResult` with `resultType: complete`, supported versions, capabilities and self-reported `_meta['io.modelcontextprotocol/serverInfo']`. Two fixed variants exercise JSON and a **single final SSE event**. They are a deliberately narrow conformance-shaped regression, **NOT comprehensive MCP compliance testing**.

## Hard boundaries

- **First-party localhost only:** destination and bind IP are literal fixed `127.0.0.1` values; bind uses port 0 with exclusive listener. CLI accepts no options or arbitrary target, method or credentials. An untrusted same-host process is outside the threat model; Host and Origin checks are not operator authentication.
- **Strict one-request discovery:** only exact POST, path, Origin, Host, content-type, `Mcp-Method`, `MCP-Protocol-Version`, mandatory `Accept`, body, and request size are accepted. No `tools/list`, `tools/call`, `resources/read`, login, subscriptions, mutations, initialize fallback, OAuth, cross-host response links or streaming input requests.
- **Fail closed:** reject mismatched routing headers, forged method, wrong host/origin, forbidden tool calls, malformed or oversized body. Client never follows redirect; wrong-id/canary/oversized/hanging responses fail. No implicit retries, SSE only one fixed message. Hard 4-KiB request and 32-KiB response bounds, deadline <= 5000 ms, close sockets in finally.
- **Privacy:** JSON-v1 CLI output emits only fixed symbolic rule IDs, transport/method/version and counters, not server response bodies, actual endpoint address/port, environment variables or credentials. This does not make the suite a DLP tool.
- **Reviewability:** finite fault selectors on *direct trusted test API only*; not available via CLI/profile JSON. Test-only `AsyncLocalStorage` observer records `staging-bind` and `staging-request` at reviewed call sites, not OS-level networking trace.

## What this does not prove

This is a dedicated *mock MCP staging fixture* in one ordinary Node process; loopback networking is a real side effect. Neither this nor M4-B4 constitute an OS sandbox, TLS or DNS/SSRF control for arbitrary remote targets, genuine ownership verification, credential security, independently verified protocol conformance, live scanner effectiveness or security certification. The first-party server result's `serverInfo` is **not authenticated**.

**The external-target authorization RFC [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21) remains OPEN.** Separate [R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and [M5-06 #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) also remain OPEN.

Official pinned protocol references: [modern MCP discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover), [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).

## Engineering acceptance

Tracking [M4-B6-A #79](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/79). Accepted through [merged PR #80](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/80), main commit `8e1a2fbfde472b998bc0667c6b4ebeb0708105e9`. [PR CI #39989886996](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39989886996) and [post-merge main CI #39990071235](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39990071235): **4/4 PASS, 457/457 tests per Windows/Ubuntu Node20/22 job**, zero failed/skipped, individual logs reviewed. Installed offline tarball selftest passed; exact packaged path inventory **73→75**. No remote deployment, independent conformance audit or external network contact was authorized.

The separately scoped [M4-B6-B fixed-process stage](FIRST_PARTY_STAGING_WORKER.md) runs this exact in-repository local fixture in a disposable child. It does not replace the in-process `staging-selftest` command or confer OS-sandbox protection.

The M4-B6-D [pinned modern discovery negative-control matrix](M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md) distinguishes required HTTP 400 HeaderMismatch vs UnsupportedProtocolVersion from 404 MethodNotFound, while documenting that the fixed SSE parser is intentionally narrower than general MCP conformance.
