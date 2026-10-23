# MCP Agent Security Test Suite — v0.0.10-rc.1

**Release candidate for validation before the stable v0.0.10 release.** Synthetic contract tests only; not a vulnerability scanner or security certification.

Zero-runtime-dependency Node.js 20+ project for synthetic security-contract tests for MCP-shaped tools and agent execution. Offline-only: no real MCP server, credentials, external connections, real tool execution, live vulnerability scanning, independent OAuth verification or security certification.

## Modules

- `scenario` — synthetic authorization, replay, scoped resources and failure semantics
- `stdio` — fixed local JSON-RPC-over-stdio batch mock: fictional initialize, tool list, allowed read and denied write; no user executable or inherited credentials. See [limits](docs/STDIO_MOCK.md). Not a general MCP server or OS sandbox.
- `mock`, `witness`, `process` — fixed simulated tools, parent-owned in-memory effects and forked in-repository mock worker. Process isolation is *not* an OS sandbox.
- `trace` — consistency checks for fictional action logs; does not actually search for secrets.
- `jsonrpc` — offline request/reply envelope checks with a deliberately strict profile.
- `era` — explicitly selected synthetic modern (2026) and legacy (2025) MCP transcript profiles.
- `negotiate` — fictional modern version/capability error and safe retry checks; v0.0.10 adds a strict replay-payload invariant: retry must preserve every parameter except the negotiated protocol version (strict project profile, not a normative MCP requirement).

## Security scope and threat model

This is an **offline synthetic contract-testing tool**, not a live scanner, authorization service, OS sandbox, OAuth validator or security certification. Fixture grants and mock results cannot authenticate users or demonstrate the safety of a real MCP server. The built-in child process runs with normal OS permissions; it must not be used to execute untrusted code.

Read the source-grounded [threat model](docs/THREAT_MODEL.md) for assets, attacker capabilities, trust boundaries, residual risks and the mandatory authorization checklist for any future adapter. The [independent negative-control corpus](docs/NEGATIVE_CONTROLS.md) documents literal failure expectations, fault-injected examples and their limitations. All real-network integrations remain **unimplemented** and require separately approved, explicitly allowlisted user-owned test environments. See [Security Policy](SECURITY.md) for responsible disclosure.

## Quickstart

Start from a clean clone using [Getting Started](docs/GETTING_STARTED.md). It gives one reproducible PASS, one intentionally detected FAIL and a [SHA-pinned offline CI example](examples/offline-contract-check.yml); no paid API or npm installation.

```sh
node examples/offline-ci-check.mjs
```

## Test

Requires Node.js 20+.

```bash
node --test
node src/cli.mjs scenario fixtures/scenario-denial.json
node src/cli.mjs process fixtures/scenario-recovery.json
node src/cli.mjs stdio fixtures/stdio-mock-safe.json
# Deliberate synthetic protocol violation, expected exit 1
node src/cli.mjs stdio fixtures/stdio-mock-unsafe.json
node src/cli.mjs jsonrpc fixtures/jsonrpc-safe.json
node src/cli.mjs era fixtures/mcp-modern-safe.json
node src/cli.mjs negotiate fixtures/mcp-negotiate-safe.json
# Negative fixture: intentionally exits 1 with RETRY_PARAMS_CHANGED
node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json
```

CLI `0` = passing contracts, `1` = violations, `2` = invalid input. All invocations emit [versioned JSON schema v1](docs/CLI_REPORTS.md) on stdout, including generic input errors; existing command-specific fields are preserved. No `npm install` required.

Published v0.0.9 baseline passed 243 tests per CI job on Windows/Ubuntu with Node.js 20/22 (October 22, 2026). The v0.0.10-rc.1 main branch passed [post-merge GitHub Actions](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39921138853): **330/330** developer-authored synthetic tests in each of four Windows/Ubuntu Node20/22 jobs. The current six-task roadmap is complete; future M4–M6 product capabilities are **not** implemented. These results do **not** establish complete MCP compliance, safety of external systems or an independent security audit.

We welcome nonconfidential problem statements or proposals. Never upload real private logs or credentials. Licensed under [MIT](LICENSE). Current repository maintains an open [roadmap](ROADMAP.md).

References: [MCP](https://modelcontextprotocol.io/), [JSON-RPC](https://www.jsonrpc.org/specification/), [OWASP Agentic Security](https://genai.owasp.org/). No affiliation or endorsement is claimed.
