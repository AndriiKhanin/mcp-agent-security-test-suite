# MCP Agent Security Test Suite — v0.0.10-rc.1

**Release candidate for validation before the stable v0.0.10 release.** Synthetic contract tests only; not a vulnerability scanner or security certification.

Zero-runtime-dependency Node.js 20+ project for synthetic security-contract tests for MCP-shaped tools and agent execution. Offline-first: no real MCP server, credentials, external connections, real tool execution, live vulnerability scanning, independent OAuth verification or security certification. The optional first-party `loopback` command opens a temporary **local-only IPv4 127.0.0.1 socket**; it never contacts an external target.

## Modules

- `scenario` — synthetic authorization, replay, scoped resources and failure semantics
- `stdio` — fixed local JSON-RPC-over-stdio batch mock: fictional initialize, tool list, allowed read and denied write; no user executable or inherited credentials. See [limits](docs/STDIO_MOCK.md). Not a general MCP server or OS sandbox.
- `loopback` — owner-approved M4-A fixed **127.0.0.1 ephemeral HTTP** ping test with strict Host/Origin/method/version controls and no external destinations, credentials or tool calls; see [local transport limits](docs/LOOPBACK_HTTP_MOCK.md). Opens a temporary local socket, not a live MCP scanner.
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

## Candidate packaging (not yet published)

The prerelease package declares an executable `mcp-agent-security`, an audited `files` allowlist and zero dependencies. `npm run release:preflight` checks the archive manifest in offline dry-run mode; the full `node --test` suite also performs a **disposable offline local tarball installation smoke**, verifies the installed CLI and deletes all temp files. The [R2 exact package inventory guard](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/32) fails on unreviewed new or missing packaged file paths; it does not inspect the safety of approved file contents. No registry access or publication occurs. Do not run `npm publish` or create stable tags without separate explicit approval. See [release readiness](docs/RELEASE_READINESS.md), the [R3 internal release review](docs/R3_INTERNAL_RELEASE_REVIEW.md), the [R4 offline artifact-integrity checks](docs/R4_ARTIFACT_INTEGRITY.md) and the [R5 independent-review handoff](docs/R5_INDEPENDENT_REVIEW.md). None substitutes for the still-open [R5-B independent reviewer release gate](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) or permission to publish.

## Test

Requires Node.js 20+.

```bash
node --test
node src/cli.mjs scenario fixtures/scenario-denial.json
node src/cli.mjs process fixtures/scenario-recovery.json
node src/cli.mjs stdio fixtures/stdio-mock-safe.json
node src/cli.mjs loopback fixtures/loopback-safe.json
# Synthetic invalid Origin, expected exit 1
node src/cli.mjs loopback fixtures/loopback-unsafe.json
# Deliberate synthetic protocol violation, expected exit 1
node src/cli.mjs stdio fixtures/stdio-mock-unsafe.json
node src/cli.mjs jsonrpc fixtures/jsonrpc-safe.json
node src/cli.mjs era fixtures/mcp-modern-safe.json
node src/cli.mjs negotiate fixtures/mcp-negotiate-safe.json
# Negative fixture: intentionally exits 1 with RETRY_PARAMS_CHANGED
node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json
```

CLI `0` = passing contracts, `1` = violations, `2` = invalid input. All invocations emit [versioned JSON schema v1](docs/CLI_REPORTS.md) on stdout, including generic input errors; existing command-specific fields are preserved. No `npm install` required.

Published v0.0.9 baseline passed 243 tests per CI job on Windows/Ubuntu with Node.js 20/22 (October 22, 2026). The v0.0.10-rc.1 main branch passed [post-merge GitHub Actions](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39941412361): **364/364** synthetic, fixed-localhost, package-preflight, disposable local-install, R4 archive-integrity and R5-A heuristic package-content tests on each Windows/Ubuntu Node20/22 job. The initial six tasks and **owner-approved M4-A local loopback mock** are complete ([PR #24](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/24)). **M4-B external MCP integrations, M5 and M6 remain unimplemented/unapproved.** Stable v0.0.10 has **not** been published; see [release preflight](docs/RELEASE_READINESS.md). These results do **not** establish complete MCP compliance, safety of external systems or an independent security audit.

We welcome nonconfidential problem statements or proposals. Never upload real private logs or credentials. Licensed under [MIT](LICENSE). Current repository maintains an open [roadmap](ROADMAP.md).

References: [MCP](https://modelcontextprotocol.io/), [JSON-RPC](https://www.jsonrpc.org/specification/), [OWASP Agentic Security](https://genai.owasp.org/). No affiliation or endorsement is claimed.
