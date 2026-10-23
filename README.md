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
node src/cli.mjs --help
node src/cli.mjs --version
node src/cli.mjs demo
node examples/offline-ci-check.mjs
```

`--help` lists only the bundled offline synthetic commands; `--version` reports the package's locally installed candidate version (not registry publication). Both use JSON schema v1 and reject extra arguments.

The new `demo` mode runs two **bundled fictional fixtures**, validates both an expected PASS and an intentionally detected FAIL, and returns one machine-readable JSON report without requiring any fixture path. It is **not** an MCP server scan or a security assessment of the host.

**M5-02 remediation preview:** FAIL reports also provide bounded, fixed-text `guidance` for three representative synthetic rule codes, with approved next steps and bundled offline reproduction commands. Generic usage/input errors have fixed guidance too. Unrecognized rules are never interpolated into advice; existing native result fields are **not** a DLP filter. See [CLI guidance contract](docs/CLI_REPORTS.md).

## Universal MCP project adapter (M4-B0: safe offline configuration preview)

Users can describe their own MCP projects using a [portable project descriptor](docs/UNIVERSAL_ADAPTER.md), choosing `stdio` or `streamable-http` without product-specific code:

```sh
node src/cli.mjs adapter-check examples/adapter-profiles/stdio-project.json
node src/cli.mjs adapter-check examples/adapter-profiles/streamable-http-project.json
```

These commands **validate configuration only** and return `connectionStatus: "NOT_ATTEMPTED"` and `executionEnabled: false`. [M4-B0 #61](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/61) is accepted; [M4-B1 #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63) tracks the next first-party local transport-driver stage. They do not connect to the user's server, execute the configured subprocess, perform DNS resolution or prove target ownership. Actual opt-in connections require a separately reviewed and authorized transport implementation. No external MCP contact has been approved.

## Offline adapter consent-policy preview (M4-B2)

```sh
node src/cli.mjs adapter-policy-check examples/adapter-profiles/consent-expired.json
```

This example **intentionally FAILS** (expired, fictional claim), and the output never grants execution: `authorizationStatus: "UNVERIFIED_SELF_ASSERTION"`, `connectionStatus: "NOT_ATTEMPTED"`, `executionEnabled: false`. The [policy guide](docs/ADAPTER_CONSENT_POLICY.md) explains exact descriptor fingerprints, five-minute consistency windows, strict method denials and why a self-asserted JSON claim **cannot** verify operator ownership or authorize a real MCP connection.

## First-party local driver selftest (M4-B1 — accepted)

[Merged PR #65](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/65) and [main CI #39966437277](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39966437277): **4/4 PASS, 407/407 tests per job**. The next offline permission layer is [M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66); user-owned target execution remains prohibited.


```sh
node src/cli.mjs adapter-selftest
```

This no-argument mode uses only the known first-party stdio child and temporary `127.0.0.1` HTTP mock through a common `connect → probe → close` lifecycle. It does **not** use your project descriptor, contact an external MCP target, or authenticate a real server. [Driver scope and limitations](docs/LOCAL_ADAPTER_DRIVERS.md).

## Fictional-only beta self-check (M5-05)

The [beta acceptance protocol](docs/BETA_TESTING.md) describes a clean public checkout and a zero-input runner:

```sh
node examples/beta-acceptance-check.mjs
```

It checks five **bundled fictional** cases, including one intentionally detected `FAIL`, and emits bounded JSON with exact expected statuses and symbolic rule codes. It does **not** connect to an external MCP target, independently certify security, sanitize arbitrary user input, or claim any real developer has participated. Real independent feedback must be submitted voluntarily using the [fictional beta report form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose), with no credentials, private logs or machine paths. **Engineering M5-05 is accepted; independent participation is NOT verified** and is tracked in [M5-06 #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59).

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

Published v0.0.9 baseline passed 243 tests per CI job on Windows/Ubuntu with Node.js 20/22 (October 22, 2026). The v0.0.10-rc.1 main branch passed [post-merge GitHub Actions](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39962836679) after [M4-B1 PR #65](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/65): **407/407** synthetic, local-only, packaging, onboarding, beta-protocol and universal adapter configuration tests on each Windows/Ubuntu Node20/22 job. The initial six tasks and **owner-approved M4-A local loopback mock** are complete ([PR #24](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/24)). **M4-B external MCP integrations remain unauthorized; M5 is in progress, and M6 is future work.** Stable v0.0.10 has **not** been published; see [release preflight](docs/RELEASE_READINESS.md). These results do **not** establish complete MCP compliance, safety of external systems or an independent security audit.

We welcome nonconfidential problem statements or proposals through the [synthetic-only GitHub Issue forms](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose). Report a reproduction with bundled fictional fixtures and symbolic rule codes only; see the [contributor feedback procedure](CONTRIBUTING.md). For confidential vulnerabilities use [SECURITY.md](SECURITY.md) rather than a public Issue. Never upload real private logs or credentials. Licensed under [MIT](LICENSE). Current repository maintains an open [roadmap](ROADMAP.md).

References: [MCP](https://modelcontextprotocol.io/), [JSON-RPC](https://www.jsonrpc.org/specification/), [OWASP Agentic Security](https://genai.owasp.org/). No affiliation or endorsement is claimed.
