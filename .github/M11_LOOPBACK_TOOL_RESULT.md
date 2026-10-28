# M11-A/B/C — First-party loopback MCP-shaped tool-result trust bridge

**Tracking:** [Issue #228](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/228)  
**Scope:** reviewed source checkout only, fixed first-party test fixtures, one-off IPv4 127.0.0.1 connections. **Not a real AI agent** or a security certification.

## Purpose and physical boundary

M10 verified parent-owned **in-memory** JavaScript method calls. M11 adds a
real, **bounded local TCP/HTTP transfer** of a fictional tool-result message
before the result reaches the stateful M10 toy-agent gateway.

The flow deliberately contains **two separate first-party HTTP servers**:

1. The existing, unchanged M4-B6-A staging server handles a strict
   `server/discover` call on `127.0.0.1` with an OS-selected ephemeral port.
   It continues to **deny** `tools/call` and every external target.
2. A separate, source-only, disposable, MCP-shaped `tools/call` response
   fixture binds **another** ephemeral `127.0.0.1` port. It accepts
   exactly one literal reviewed JSON-RPC-shaped request
   (`owned-fictional-ticket-status`) and emits a response containing
   *both* legitimate fictional task data and a fictional embedded instruction.
   The loopback client reads real on-wire bytes, validates the exact response
   envelope and source-owned fixture data, then passes the decoded
   `toolResult` to M10's stateful, independently witnessed toy gateway.

This is **not one general-purpose MCP server**, a full MCP implementation,
a remote-connection test, a standards compliance assertion or an LLM.
No request is made to a customer MCP server, and no real file read is
attempted because of the embedded instruction.

The body format is a narrow *first-party* MCP-shaped JSON-RPC fixture, not a
general transport profile. Users cannot supply IPs, ports, hosts, paths,
commands, credentials, methods, model selections or executable contents.
`127.0.0.1` is fixed in code; both ports are selected by the OS using
`port:0`, and all listeners are closed in `finally`. The project
makes **no claim of an OS sandbox**; another hostile process on the same
host is outside the test's protection model.

## Run

In a reviewed repository checkout (Node.js 20 or 22):

```sh
node tools/m11-loopback-tool-result.mjs
node --test test/m11-loopback-tool-result.test.mjs
```

The command accepts **zero arguments** and runs eleven fixed source-owned
controls: one clean PASS and ten expected FAIL outcomes.

| Control | Expected outcome |
| --- | --- |
| Valid discovery, valid local fictional tool reply, M10 safe toy session | PASS |
| Wrong JSON-RPC response ID | FAIL |
| Unexpected authority-bearing response field | FAIL |
| Malformed JSON response | FAIL |
| Duplicate JSON key | FAIL |
| Wrong content type | FAIL |
| HTTP redirect (never followed) | FAIL |
| Oversized response | FAIL |
| Wrong client Origin | FAIL |
| Hanging response and bounded abort | FAIL |
| Existing discovery's forbidden `tools/call` request | FAIL; tool-result service never contacted |

All responses and request bodies have hard byte limits, requests carry fixed
`Host` / `Origin` / `Mcp-Method` / `MCP-Protocol-Version` headers,
and client-side response validation checks exact JSON structure and
content before passing it to the toy session. Duplicate JSON keys are
rejected. Server and client socket cleanup counts are checked and a
cleanup failure cannot pass as a successful test.

The tool result's **embedded instruction is not interpreted**; the
first-party toy agent consumes only its legitimate task data as data.
An actual LLM might respond differently. The report makes no claim
that an actual prompt-injection attempt was semantically detected, that
a real model resisted attack wording, or that the gateway can enforce
security outside the source-owned toy harness.

## Evidence limitations

The test verifies first-party loopback HTTP behavior, actual response-byte
delivery and literal **in-memory** toy-agent gateway calls. Instrumented
`staging-bind` / `staging-request` events are local source-level
observation, not independent packet capture or OS tracing.

- **No user-owned/external MCP contact.** Local sockets are real network
  side effects; the only destination is the literal fixed loopback address.
- **No real agent**, LLM, arbitrary tool execution, customer data,
  credential, user-supplied process, unrelated file read or semantic
  prompt-injection detection.
- Source-only utilities and tests remain outside the pinned **80-path npm
  candidate**; the full M6-J SHA-256 excluded-source inventory includes
  every new file.
- Error and success JSON contain **only fixed rule codes, counts and
  Boolean limit flags**: no response body, port, filename, paths, fixture
  IDs, tool-result text or secrets are emitted.
- External target authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
  independent security audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
  and independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  remain open. Green local/CI results do not close them or authorize
  npm publication.

Any future actual-agent/MCP integration needs an explicitly reviewed
owner-approved real-target scope, stronger sandboxing and independently
witnessed OS/resource effects. None of those authorities is granted by M11.
