# MCP Agent Security Test Suite — v0.0.10-rc.1

**Release candidate for validation before the stable v0.0.10 release.** Synthetic contract tests only; not a vulnerability scanner or security certification.

Zero-runtime-dependency Node.js 20+ project for synthetic security-contract tests for MCP-shaped tools and agent execution. Offline-only: no real MCP server, credentials, external connections, real tool execution, live vulnerability scanning, independent OAuth verification or security certification.

## Modules

- `scenario` — synthetic authorization, replay, scoped resources and failure semantics
- `mock`, `witness`, `process` — fixed simulated tools, parent-owned in-memory effects and forked in-repository mock worker. Process isolation is *not* an OS sandbox.
- `trace` — consistency checks for fictional action logs; does not actually search for secrets.
- `jsonrpc` — offline request/reply envelope checks with a deliberately strict profile.
- `era` — explicitly selected synthetic modern (2026) and legacy (2025) MCP transcript profiles.
- `negotiate` — fictional modern version/capability error and safe retry checks; v0.0.10 adds a strict replay-payload invariant: retry must preserve every parameter except the negotiated protocol version (strict project profile, not a normative MCP requirement).

## Security scope and threat model

This is an **offline synthetic contract-testing tool**, not a live scanner, authorization service, OS sandbox, OAuth validator or security certification. Fixture grants and mock results cannot authenticate users or demonstrate the safety of a real MCP server. The built-in child process runs with normal OS permissions; it must not be used to execute untrusted code.

Read the source-grounded [threat model](docs/THREAT_MODEL.md) for assets, attacker capabilities, trust boundaries, residual risks and the mandatory authorization checklist for any future adapter. The [independent negative-control corpus](docs/NEGATIVE_CONTROLS.md) documents literal failure expectations, fault-injected examples and their limitations. All real-network integrations remain **unimplemented** and require separately approved, explicitly allowlisted user-owned test environments. See [Security Policy](SECURITY.md) for responsible disclosure.

## Test

Requires Node.js 20+.

```bash
node --test
node src/cli.mjs scenario fixtures/scenario-denial.json
node src/cli.mjs process fixtures/scenario-recovery.json
node src/cli.mjs jsonrpc fixtures/jsonrpc-safe.json
node src/cli.mjs era fixtures/mcp-modern-safe.json
node src/cli.mjs negotiate fixtures/mcp-negotiate-safe.json
# Negative fixture: intentionally exits 1 with RETRY_PARAMS_CHANGED
node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json
```

CLI `0` = passing contracts, `1` = violations, `2` = invalid input. No `npm install` required.

Published v0.0.9 baseline passed 243 tests per CI job on Windows/Ubuntu with Node.js 20/22 (October 22, 2026). The current v0.0.10-rc.1 main commit passed [post-merge GitHub Actions](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39910034366): 254/254 developer-authored synthetic tests in each of four jobs. These results do **not** establish complete MCP compliance, safety of external systems or an independent security audit.

We welcome nonconfidential problem statements or proposals. Never upload real private logs or credentials. Licensed under [MIT](LICENSE). Current repository maintains an open [roadmap](ROADMAP.md).

References: [MCP](https://modelcontextprotocol.io/), [JSON-RPC](https://www.jsonrpc.org/specification/), [OWASP Agentic Security](https://genai.owasp.org/). No affiliation or endorsement is claimed.
