# MCP Agent Security Test Suite — v0.0.10-rc.1

**Release candidate for validation before the stable v0.0.10 release.** Synthetic contract tests only; not a vulnerability scanner or security certification.

Zero-runtime-dependency Node.js 20+ project for synthetic security-contract tests for MCP-shaped tools and agent execution. Offline-first: no **external/user-owned** MCP server, credentials, real tool execution, live vulnerability scanning, independent OAuth verification or security certification. M4-B6-A adds only a first-party ephemeral modern MCP-shaped staging listener on 127.0.0.1. The optional first-party `loopback` command opens a temporary **local-only IPv4 127.0.0.1 socket**; it never contacts an external target.

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

**M4-B5 next-stage architecture (not activated):** a [reviewable future target-approval decision packet](docs/M4_B5_TARGET_APPROVAL.md) defines independent ownership verification, operator consent, exact-method scope and SSRF/TLS/egress gates. It adds offline denial regressions, not remote connectivity; live MCP targets remain prohibited without a separate owner-approved implementation.

## First-party modern MCP staging selftest (M4-B6-A, local-only)

```sh
node src/cli.mjs staging-selftest
```

One temporary **127.0.0.1-only** staging MCP server and one fixed `server/discover` exchange using **MCP 2026-07-28** request metadata and mirrored HTTP headers, with JSON/SSE regression variants. [Safety boundaries and tests](docs/FIRST_PARTY_STAGING_MCP.md). No user server is contacted; no arbitrary URL, stdio program, credential, OAuth or remote deployment is supported.

## Fixed subprocess staging selftest (M4-B6-B; owned local process only)

```sh
node src/cli.mjs staging-process-selftest
```

Executes only the reviewed first-party 127.0.0.1 discovery staging fixture in a **disposable Node child process** with a reduced environment, ignored stdout/stderr and bounded IPC. No arbitrary executable, external destination or credential. Child-process separation **is not** an OS sandbox. See [worker safety guide](docs/FIRST_PARTY_STAGING_WORKER.md).

## Test-only staging resource witness (M4-B6-C)

[M4-B6-C resource verification](docs/STAGING_RESOURCE_WITNESS.md) independently probes whether our **own child** holds its temporary `127.0.0.1` TCP port and whether it can be rebound after worker exit, including failures. No public listener/target option, no external network or OS sandbox claim.

## Modern MCP discovery negative controls (M4-B6-D)

[The pinned first-party protocol-negative matrix](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md) checks exact HTTP/JSON-RPC status distinctions for header mismatch (`-32020`), unsupported version (`-32022`), method-not-found (`-32601`), and malformed SSE. This only tests our own temporary localhost fixture; it is not general MCP conformance or a real-target scanner.

## Bounded request-scoped SSE on owned staging (M4-B6-E)

[The finite SSE test scope](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md) admits the first-party server's reviewed request-related logging notice and SSE keepalive comments **before** the single final response, within strict finite limits. Unsolicited server RPCs, duplicate/missing finals, malformed UTF-8, excess events and unsupported payloads fail closed. **No generic MCP transport client or external target contact.**

## Bounded incremental first-party SSE cancellation (M4-B6-F)

[Transport and cleanup limits](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md) now cover finite incremental SSE decoding, split CRLF across chunks, cancel-after-headers/notice/final and oversized chunked streams. The ephemeral owned `127.0.0.1` response must close even on rejected or aborted tests. This remains a **test-only fixed first-party mock**, not generic MCP interoperability, real target scanning or an OS sandbox.

## Owned-only adapter staging bridge (M4-B7-A)

`node src/cli.mjs adapter-staging-selftest` tests the separate **fixed** modern Streamable HTTP adapter lifecycle against our own ephemeral `127.0.0.1` discovery fixture only. It uses no project descriptor, arbitrary URL or command. This is **not** project connectivity: `adapter-check <file>` remains validate-only, `connectionStatus: "NOT_ATTEMPTED"`, and cannot be used to enable this bridge. [Boundary and limitations](docs/UNIVERSAL_ADAPTER.md).

## Universal MCP project adapter (M4-B0: safe offline configuration preview)

Users can describe their own MCP projects using a [portable project descriptor](docs/UNIVERSAL_ADAPTER.md), choosing `stdio` or `streamable-http` without product-specific code:

```sh
node src/cli.mjs adapter-check examples/adapter-profiles/stdio-project.json
node src/cli.mjs adapter-check examples/adapter-profiles/streamable-http-project.json
```

These commands **validate configuration only** and return `connectionStatus: "NOT_ATTEMPTED"` and `executionEnabled: false`. [M4-B0 #61](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/61) is accepted; [M4-B1 #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63) tracks the next first-party local transport-driver stage. They do not connect to the user's server, execute the configured subprocess, perform DNS resolution or prove target ownership. Actual opt-in connections require a separately reviewed and authorized transport implementation. No external MCP contact has been approved.

## Offline adapter consent-policy preview (M4-B2 — engineering accepted)

[M4-B2 PR #68](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/68) and [main CI #39972783779](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39972783779) passed **4/4, 417/417 tests per job**, 0 failures/skips. The policy remains an **unverified self-assertion**, not a trusted user authorization.

```sh
node src/cli.mjs adapter-policy-check examples/adapter-profiles/consent-expired.json
```

This example **intentionally FAILS** (expired, fictional claim), and the output never grants execution: `authorizationStatus: "UNVERIFIED_SELF_ASSERTION"`, `connectionStatus: "NOT_ATTEMPTED"`, `executionEnabled: false`. The [policy guide](docs/ADAPTER_CONSENT_POLICY.md) explains exact descriptor fingerprints, five-minute consistency windows, strict method denials and why a self-asserted JSON claim **cannot** verify operator ownership or authorize a real MCP connection.

## First-party local driver selftest (M4-B1 + M4-B3 accepted)

[M4-B3 #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69) passed [PR #71](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/71) and [post-merge main CI #39979727977](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39979727977): **4/4 PASS, 428/428 tests per job**, zero failures/skips. Denied fictional admissions return before a mock driver is created. The next [M4-B4 #72](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/72) will add independently observed test-only effect counters; current booleans are **not OS audit evidence**.

The [M4-B3 admission design](docs/LOCAL_CONSENT_GATE.md) checks a fixed suite-owned fictional identity **before** constructing either mock driver. The stdio guarded path sends only `initialize` (no `tools/list` or `tools/call`); the HTTP guarded path sends the fixed local `ping`. The lower-level legacy test harness still exists for separate explicit synthetic security tests, not as real target authorization.

[Merged PR #65](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/65) and [main CI #39966437277](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39966437277): **4/4 PASS, 407/407 tests per job**. The offline permission consistency layer [M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66) has now been accepted; the next [M4-B3 mock enforcement #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69) remains strictly first-party-only. User-owned target execution remains prohibited.


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

Published v0.0.9 baseline passed 243 tests per CI job on Windows/Ubuntu with Node.js 20/22 (October 22, 2026). The v0.0.10-rc.1 main branch passed [post-merge GitHub Actions](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40005050367) after [M4-B6-F PR #95](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/95): **526/526** synthetic, local-only, packaging, onboarding, universal adapter, owned modern MCP staging, bounded incremental SSE, cancellation and first-party TCP socket-close assertions on each Windows/Ubuntu Node20/22 job, with zero failures/skips. The initial six tasks and **owner-approved M4-A local loopback mock** are complete ([PR #24](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/24)). **Real external MCP target integration remains unauthorized; M4-B6-A/B/C/D/E/F cover only our ephemeral first-party localhost fixture, tightly bounded streaming SSE/cancellation, fixed disposable child process and test-only TCP/PID witness, not an OS sandbox or complete MCP conformance. M5 external beta evidence and M6 maturity are still pending.** Stable v0.0.10 has **not** been published; see [release preflight](docs/RELEASE_READINESS.md). These results do **not** establish complete MCP compliance, safety of external systems or an independent security audit.

We welcome nonconfidential problem statements or proposals through the [synthetic-only GitHub Issue forms](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose). Report a reproduction with bundled fictional fixtures and symbolic rule codes only; see the [contributor feedback procedure](CONTRIBUTING.md). For confidential vulnerabilities use [SECURITY.md](SECURITY.md) rather than a public Issue. Never upload real private logs or credentials. Licensed under [MIT](LICENSE). Current repository maintains an open [roadmap](ROADMAP.md).

References: [MCP](https://modelcontextprotocol.io/), [JSON-RPC](https://www.jsonrpc.org/specification/), [OWASP Agentic Security](https://genai.owasp.org/). No affiliation or endorsement is claimed.
