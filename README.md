# MCP Agent Security Test Suite — v0.0.9

**Early open-source release.** Synthetic contract tests only; not a vulnerability scanner or security certification.

Zero-runtime-dependency Node.js 20+ project for synthetic security-contract tests for MCP-shaped tools and agent execution. Offline-only: no real MCP server, credentials, external connections, real tool execution, live vulnerability scanning, independent OAuth verification or security certification.

## Modules

- `scenario` — synthetic authorization, replay, scoped resources and failure semantics
- `mock`, `witness`, `process` — fixed simulated tools, parent-owned in-memory effects and forked in-repository mock worker. Process isolation is *not* an OS sandbox.
- `trace` — consistency checks for fictional action logs; does not actually search for secrets.
- `jsonrpc` — offline request/reply envelope checks with a deliberately strict profile.
- `era` — explicitly selected synthetic modern (2026) and legacy (2025) MCP transcript profiles.
- `negotiate` — fictional modern version/capability error and safe retry checks.

## Test

Requires Node.js 20+.

```bash
node --test
node src/cli.mjs scenario fixtures/scenario-denial.json
node src/cli.mjs process fixtures/scenario-recovery.json
node src/cli.mjs jsonrpc fixtures/jsonrpc-safe.json
node src/cli.mjs era fixtures/mcp-modern-safe.json
node src/cli.mjs negotiate fixtures/mcp-negotiate-safe.json
```

CLI `0` = passing contracts, `1` = violations, `2` = invalid input. No `npm install` required.

Previous owner Windows validation: 243/243 developer-authored tests PASS on Node.js 22.18.0, October 22, 2026. This does **not** establish compatibility with all platforms, compliance with MCP, safety of external systems or an independent audit.

We welcome nonconfidential problem statements or proposals. Never upload real private logs or credentials. Licensed under [MIT](LICENSE). Current repository maintains an open [roadmap](ROADMAP.md).

References: [MCP](https://modelcontextprotocol.io/), [JSON-RPC](https://www.jsonrpc.org/specification/), [OWASP Agentic Security](https://genai.owasp.org/). No affiliation or endorsement is claimed.
