# M4-A — Fixed first-party IPv4 loopback HTTP mock

**Status:** owner-approved scope; acceptance requires [Issue #23](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/23) and a four-job GitHub CI run on the merged main branch.

This module is an **offline, local-only transport test**, not a real MCP server, general HTTP client, scanner, authentication layer, OS sandbox or security certification. **It opens a temporary TCP listener on `127.0.0.1`**. Although it contacts no external host, it **does use local networking** and is more effectful than earlier in-memory/stdio fixtures.

## Fixed profile

The command `loopback` accepts a synthetic fixture with **only** `profile` and `fault`, and uses built-in Node.js `http` modules (no npm dependency or paid API).

```sh
node src/cli.mjs loopback fixtures/loopback-safe.json
# JSON v1 PASS, exit 0

node src/cli.mjs loopback fixtures/loopback-unsafe.json
# JSON v1 FAIL, exit 1, LOOPBACK_REQUEST_DENIED (bad Origin)

node --test test/loopback-http.test.mjs
```

The harness always constructs exactly **one** hard-coded request:

| Aspect | Fixed value |
| --- | --- |
| Listener | `127.0.0.1:0` (OS-selected ephemeral port), IPv4 only |
| Client destination | `127.0.0.1` plus the actual port of that **same local listener** |
| Request | `POST /mcp`, JSON-RPC `{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}` |
| Version label | `MCP-Protocol-Version: 2026-07-28` |
| Header checks | Exact Host, `Origin: http://127.0.0.1`, Content-Type / Accept `application/json`, content length |
| Positive response | `{"jsonrpc":"2.0","id":1,"result":{}}` |
| Authentication | None (no real credentials, OAuth, token exchange or secrets) |
| Side effects | None except creation/termination of the temporary loopback listener and HTTP exchange |

This is a **fixed illustrative MCP-shaped ping**, **not** a normative conformance test for the full modern Streamable HTTP protocol. No initialize sequence, dynamic routing, tool listing, resource reads, subscriptions, tool execution, authentication or external destinations are supported.

## Fail-closed controls and limits

- **No arbitrary endpoint:** the fixture cannot choose scheme, host, path, port, request body, method, executable, proxy or credentials. Unexpected keys are errors; direct API options are similarly restricted to enumerated fictional faults and a bounded timeout.
- **Allowlist:** the server is IPv4-bound to `127.0.0.1` only. The built-in client uses a literal IPv4 address with `agent:false`, never DNS, redirects or proxy APIs. Only `POST /mcp` with one matching fixed ping message is accepted.
- **Host / Origin:** both are checked exactly, alongside protocol version, Content-Type, Accept and content length. Duplicate sensitive headers and transfer-encoding are denied. **Origin/Host validation is not authentication**; another process on the same machine may be able to reach the temporary port.
- **Input / output:** request body ≤4096 bytes; UTF-8 fatal decoder and duplicate-key strict JSON parser; response buffer ≤8192 bytes; exactly one expected envelope, ID and result. Malformed payloads and wrong response bodies fail closed.
- **Deadlines:** overall fixed 5000ms deadline, test-only direct override bounded to 250–5000ms; abort pending request, close listener and destroy remaining connections in `finally`.
- **Privacy:** CLI JSON result contains only fixed host literal, operation counts and symbolic finding codes. It does not return selected port, received bodies, response data, Authorization headers, error stacks or environment variables.
- **No credentials:** code never reads credential stores, proxies or tokens. Node core HTTP client does not automatically use the parent's proxy environment. Do not mistake this for proof that the entire host is secured.
- **Deny tool calls:** the only accepted JSON-RPC method is `ping`. A test-only `tools/call` fixture fault is sent to **this fixed first-party local mock** and rejected before accepting any simulated operation. No real tool is invoked.

## Synthetic negative controls

The regression corpus exercises wrong/missing Origin, wrong Host, method, path, version, fake tool-call request, malformed or oversized body, wrong response ID, invalid JSON/Content-Type, oversized or canary-containing response, HTTP 302 redirect and hanging mock. Redirects are reported but **never followed**.

To run on a clean checkout, execute `node --test`. Acceptance additionally requires four green GitHub Actions jobs on Windows/Ubuntu × Node20/22 before merging and another successful four-job run on `main`.

## Residual risk and further approval

- It temporarily binds a real OS socket under the user's account; other local processes may attempt to connect during its lifetime. This test is **not** an OS sandbox or a protection boundary against hostile local code.
- It does not discover or connect to real MCP services, cannot verify target ownership, and does not prove TLS, SSRF/rebinding defenses, interoperability or auth for an external system.
- The full external-target integration preview **M4-B remains explicitly NOT approved**. A separate decision is required before any remote URL, DNS, HTTPS to external targets, authenticated access, live MCP scanner or production probing.
- No private/commercial Stable Bridge sources, credentials or logs are required.

See the [M4 architecture RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md), [threat model](THREAT_MODEL.md) and the [public roadmap](../ROADMAP.md).
