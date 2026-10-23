# M4-B6-D — pinned first-party MCP discovery protocol negative controls

**Status:** change under CI review, NOT independent protocol certification. Tracking [Issue #88](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/88). No third-party MCP URL, arbitrary executable, production action, OAuth, credentials, externally deployed server, or publication is approved.

## Verified normative distinctions

This stage checks exact response status and JSON-RPC error code against the official [2026-07-28 Streamable HTTP specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) and [pinned schema](https://modelcontextprotocol.io/specification/2026-07-28/schema):

| Test-only fixed localhost request | Expected HTTP | Error code |
| --- | --- | --- |
| Missing `MCP-Protocol-Version` or `Mcp-Method`, or header/body mismatch | 400 | `-32020` HeaderMismatch |
| Unsupported `2099-01-01` version agreeing in header and body | 400 | `-32022` UnsupportedProtocolVersion |
| Unknown method with matching header/body, including denied `tools/call` | 404 | `-32601` MethodNotFound |
| Wrong Origin / Host or forbidden GET | 403 | Local strict first-party policy |
| Request after the fixture's single-request budget | 403 | Local strict first-party policy |

The `-32022` response contains the *fixed* `supported: ["2026-07-28"]` and a bounded, syntax-validated ten-character `requested` version (or the literal `INVALID_VERSION`), never raw arbitrary strings, URLs, credentials or parser messages. Test cases cover `2099-01-01` and legacy `2025-11-25`. The mock is not a generally configurable MCP implementation. A missing or mismatched version is **not** an unsupported-version error, and a method header/body mismatch is **not** a method-not-found error.

## Controlled adversarial corpus

A development-only test uses a trusted callback to receive the owned, ephemeral `127.0.0.1` port. It sends fixed HTTP requests directly to that **same listener** via Node's core HTTP transport; the port cannot be specified through public CLI, user JSON, DNS or a selected URL. The server's received/accepted counters are secondary to independently inspected HTTP statuses and response error codes. Tests include duplicate sensitive headers, absent body metadata, forbidden method, second request and GET. No tool is executed or remote host contacted.

For response handling, test-only finite modes generate an extra SSE final event, an SSE notification with no final result, an unsolicited JSON-RPC server request on SSE, a result with a wrong protocol version, and wrong response Content-Type. All MUST return the fixed symbolic failure `STAGING_RESPONSE_MISMATCH`, never raw payloads, tokens or event text. Existing limits on bytes, deadlines, redirect refusal and cleanup remain.

**Deliberate limitation:** compliant general MCP 2026-07-28 SSE responses MAY contain request-scoped progress/logging notifications and SSE comments before the final response. This first-party fixture's client accepts **only one fixed final SSE message event**, so it will fail some legitimate interoperable streams. These are stricter test-fixture rules, **NOT normative protocol requirements**. No claim of complete MCP conformance, real target authorization, authentication, OS sandbox or kernel-wide tracing is made.

The public commands `node src/cli.mjs staging-selftest` and `node src/cli.mjs staging-process-selftest` remain argument-free, offline/local-only, with the same report schema. The direct finite fault selectors exist for trusted in-repository tests only. No npm dependencies are introduced.

## Acceptance gate and restrictions

Requires **4/4 PR and post-merge main CI** across Ubuntu/Windows × Node.js 20/22, 0 failures/skips, reviewed package inventory **79→80 paths** (only this doc added; test file stays excluded). [External-target authorization #21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21), [independent security/provenance review #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and [independent external beta #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) remain OPEN. Do not claim approval for external/user-owned MCP contacts.

## Engineering acceptance (2026-10-23)

[M4-B6-D #88](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/88) accepted through [merged PR #89](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/89), main commit `7a46b8d387238d644425a86045adc5a2577f1f96`. [PR CI #39996467390](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39996467390) and [post-merge main CI #39996632533](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39996632533) both **4/4 PASS, 488/488 tests per Ubuntu/Windows Node20/22 job, 0 failures/skips**, individual logs inspected. Exactly one reviewed npm package path added (**79→80**, this guide); development tests remain outside shipped package. No external MCP target, full protocol conformance, OS sandbox or release permission was asserted.
