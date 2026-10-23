# M4-B1 — first-party local MCP transport drivers

**Status:** implementation scope of [Issue #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63). This is **not** a connector to user-owned MCP projects.

## Run both reviewed local mocks

```sh
node src/cli.mjs adapter-selftest
```

The command accepts **no arguments** and runs only the repository-owned finite stdio test child and the temporary HTTP server on **127.0.0.1**. Its JSON-v1 `PASS` means both local mocks behaved as expected. Fields include `connectionStatus: "FIRST_PARTY_MOCK_ONLY"`, `externalTargetContacted: false`, `transportCount: 2` and symbolic per-driver results. The stdio mock exchanges four fixed fictional messages, including one allowed fictional read and one denied write. The HTTP mock sends one fixed `ping` to an ephemeral local listener. No arbitrary user child command, HTTP URL, credential, proxy setting or tool payload is accepted.

`adapter-check <json>` is **separate**: it validates a universal user project descriptor but still always reports `connectionStatus: "NOT_ATTEMPTED"`, `executionEnabled: false`. Running `adapter-selftest` does not connect that project.

## Driver lifecycle

`src/local-adapter-drivers.mjs` exports `createFirstPartyDriver(transport, options?)` with asynchronous `connect()`, `probe()`, `close()`. Only literal transport IDs `stdio` and `streamable-http` are accepted. `connect()` marks local driver state ready; `probe()` performs one bounded existing mock exchange; `close()` is terminal and idempotent. A probe before connect, a repeated probe, and reuse after close are rejected. Mock harnesses perform their own child/socket resource cleanup. This is **not** a dynamic plugin/transport loader.

For developer negative-control tests **only**, the driver accepts finite, allowlisted fault names and deadlines (stdio 250–8000 ms, HTTP 250–5000 ms). Client configuration cannot select them. Malformed responses, rejected unauthorized tools, redirects, oversized payloads, timeouts and canary outputs are reduced to symbolic result codes; raw response bodies, stderr, file paths and ports are not returned.

## Limitations and future project connection

This test **does** spawn a first-party child and **does** open a loopback socket, with the normal privileges of the invoking OS account. Neither is an OS sandbox; malicious processes on the same host are outside the protection claim. The fixed exchanges are MCP-shaped and **not full protocol conformance certification**.

For the actual universal adapter to connect to a user project, independently review and authorize real stdio launcher and HTTP client implementations behind this lifecycle, exact target/method allowlists, no default tool calls or mutations, explicit operator consent/revocation, credentials handling, TLS/DNS rebinding/SSRF defenses, no redirects/proxy inheritance, and resource/cleanup limits. The existing [M4 authorization RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md) and [M4-B1 Issue](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63) track these boundaries. No external MCP contact or stable publication has been authorized.

## Engineering acceptance — 2026-10-23

[M4-B1 #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63) was accepted through [PR #65](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/65) and [main CI #39966437277](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39966437277): **4/4 PASS, 407/407 tests/job**, 0 failures/skips. The next offline consent-policy stage is [M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66). No arbitrary target connection or stable release is authorized.
