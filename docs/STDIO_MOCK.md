# Fixed local stdio MCP-shaped mock

**M3-01:** https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/6 . Offline and fictional-only. Not a production MCP server, internet scanner, OS sandbox, OAuth validator, or security certification.

## Fixed exchange

The dedicated `src/stdio-mcp-harness.mjs` launches only the bundled `src/stdio-mcp-mock-worker.mjs` using `process.execPath`. It sends a deterministic batch of four JSON-RPC-shaped JSONL messages over stdin/stdout:

| Step | Fictional request | Expected response |
| --- | --- | --- |
| 1 | `initialize` | Fixed `2025-06-18` protocol-version label, fictional server information and tools capability |
| 2 | `tools/list` | One fixed `read-note` tool/schema |
| 3 | `tools/call` / `read-note` | Fixed `FICTIONAL_NOTE` result |
| 4 | `tools/call` / `write-note` | `SYNTHETIC_WRITE_DENIED` JSON-RPC error; no simulated effect |

Known synthetic faults include wrong response ID, invalid JSON, extra/missing line, changed content, oversized output, stderr canary, timeout/hanging child and parent-environment probe.

**Important limitation:** the four stdin requests are submitted as one batch, not interactively after each reply. This is a finite, scripted transport demonstration, not general MCP interoperability, dynamic discovery, notifications/subscriptions or full protocol-lifecycle compliance.

## Usage

Node.js 20+; zero runtime dependencies. Commands:

- `node src/cli.mjs stdio fixtures/stdio-mock-safe.json` — exit 0, versioned JSON PASS.
- `node src/cli.mjs stdio fixtures/stdio-mock-unsafe.json` — expected exit 1, `STDIO_RESPONSE_ID_OR_ENVELOPE_MISMATCH`.
- `node --test test/stdio-mcp.test.mjs` — positive and negative checks.
- `node --test` — entire offline regression suite.

The two-field fixture accepts only `profile: fixed-local-stdio-mock-v1` and one allowlisted fault name. Unknown keys, executables, methods or network-target parameters fail with a generic input error. No dynamic user-selected child command or shell is supported.

## Resource bounds and trust controls

- **Fixed launch:** `spawnSync(process.execPath,[absolute first-party worker,fixed enumerated fault],{shell:false})`, fixed script cwd and no PATH lookup of user-selected binaries.
- **Child environment:** exactly `NODE_NO_WARNINGS=1`, never inherited parent credentials/configuration; regression-tested with a fictional parent credential canary.
- **Input:** four fixed requests below 8 KiB; child independently limits all stdin to 8 KiB and lines to 4 KiB. Strict JSON and UTF-8 validation.
- **Output:** parent caps total buffer at 32 KiB and individual frames at 8 KiB; requires exactly four matching JSON-RPC responses. No untrusted stdout/stderr forwarding to callers.
- **Time and cleanup:** parent process timeout no greater than 8 seconds (test-only lower timeout within 250–8000 ms); Node subprocess runner terminates timed-out or over-buffer children.
- **Synthetic observations:** the mock has no filesystem, network, browser, credentials, or real effects. Fake mutation calls always receive denied synthetic errors.
- **Reports:** bounded `STDIO_*` error codes, steps and counts with CLI schema v1. Never echo child output, raw exceptions, token canaries or fixture paths.

## Residual risks

Child processes keep the invoking OS account privileges. **Process separation is not OS sandboxing.** Never substitute an untrusted third-party executable. Fixed responses do not demonstrate actual third-party MCP authorization or security. No paid APIs, external network targets or production systems are involved.

Acceptance requires a reviewed PR plus all four Ubuntu/Windows x Node20/22 jobs green. The accepted CI and merge evidence belong in Issue #6. See [Threat model](THREAT_MODEL.md) and [Roadmap](../ROADMAP.md).
