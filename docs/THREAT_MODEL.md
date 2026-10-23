# Threat model and trust boundaries

**Status:** M1-01 design baseline for `v0.0.10-rc.1` (reviewed 2026-10-23).  
**Scope:** the standalone MIT-licensed, offline MCP Agent Security Test Suite.  
**Security claim:** reproducible checks of *fictional* authorization, protocol, trace and mock-tool contracts. **Not** an MCP implementation, a live vulnerability scanner, an OS sandbox, an OAuth validator, an independent audit or proof that an agent is safe.

This document distinguishes **implemented controls** from **future design requirements**. The [roadmap](../ROADMAP.md) and tracked [M1-01 issue](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/2) govern progress. Any claim about actual third-party MCP behavior requires separate implementation, authorization, and independent evaluation.

## 1. Assets and security objectives

| Asset / property | Desired invariant | Current evidence and boundary |
| --- | --- | --- |
| Fictional tool authorization | An untrusted origin, wrong owner/resource, stale generation, expired grant or insufficient scope yields a denial | `src/policy.mjs` evaluates a synthetic policy; grants are fixture objects, **not** cryptographic credentials |
| Fake-tool state | Denied operations have no simulated read/write effects; expected writes are observed | `src/adapter-harness.mjs`, `src/witness-harness.mjs`, `src/effect-witness.mjs` use in-memory counters/ledgers; not proof of real-world effects |
| Replay boundary | Reuse of a committed nonce for fictional mutations is rejected | `src/policy.mjs` tracks committed nonces in a private in-memory `Set` per test; no distributed or persistent replay registry |
| Protocol and retry integrity | Contract violations, mismatched response IDs, unauthorized capability declarations and altered retry parameters are surfaced | `src/jsonrpc-contract.mjs`, `src/mcp-era-contract.mjs`, `src/mcp-modern-negotiation.mjs`; these are intentionally strict **offline profiles**, not full specification compliance |
| Results and synthetic traces | Useful rule codes without echoing action arguments, input paths or secret-like sample payloads | `src/cli.mjs` sanitizes caught errors; report functions contain bounded findings; this is **not** a general-purpose secret detector |
| Maintainer trust and provenance | Public commits, reviewable changes, bounded fixtures and reproducible CI | `LICENSE`, `CONTRIBUTING.md`, `.github/workflows/ci.yml`; CI tests developer-authored behaviors, not independent certification |
| Host environment and credentials | Never imply isolation of arbitrary code, network targets or real secrets | Only repository-owned fictional fixtures are within the supported usage; process separation is not privilege separation |

## 2. Actors and attacker capabilities

- **Maintainer / tester:** controls the offline fixture selection, source checkout, local Node process and any future permitted target configuration. Maintainer actions are not automatically safe if the host or dependencies are compromised.
- **Fixture author / untrusted content:** can influence synthetic scenario actions, tool names, grants, versions, JSON-RPC messages and trace records. Assume malformed, contradictory, duplicated-key, oversized and maliciously crafted inputs. These objects provide **no** real-world authorization.
- **Fault-injected mock adapter:** may falsely report success/denial, omit or manufacture fictional effects, crash, claim fake snapshots or leak a **fictional canary**. The provided worker is a fixed test double; a malicious native dependency or arbitrary executable is outside this model.
- **Future MCP endpoint (not implemented):** may be malicious, unreliable, compromised or impersonated; may return untrusted tool schemas, prompts, results and errors. No connection to any endpoint is supported today.
- **Compromised machine/CI runner/maintainer account:** can change source, memory, files or tool outputs. Current library does not defend against a fully compromised host or a malicious test runner.

Threats tested here are **modeled**, not attacks executed against live services.

## 3. Trust-boundary map

| Boundary | Implemented behavior | Residual risk / limitation |
| --- | --- | --- |
| Caller-selected file → CLI parser | `src/cli.mjs` opens a regular file with a 1 MiB bound, uses `O_NOFOLLOW` when supported, fatal UTF-8 decoding, and `src/strict-json.mjs` rejects duplicate keys | The caller chooses the path; this is **not** a filename allowlist or secure confinement. Platform semantics and filesystem races differ; do not feed sensitive local files |
| Parsed fixture → policy oracle | `validateScenario` restricts shapes/action count and `decide` checks owner, resource, grant generation/time, scopes, approval and replay | The owner/grant fields are **unauthenticated test data**. A PASS does not authenticate a real user or grant |
| Oracle → in-memory mock | `src/mock-mcp.mjs` exposes only fake note tools and intentional defects | Effects are fictional; the mock does not implement real tools, external resources or transport |
| Test harness → parent-owned witness | `src/effect-witness.mjs` stores simulated effects separately from the adapter under test | A shared host/process still controls both; the witness is not an adversarially tamper-proof external oracle |
| Parent Node process → fixed stdio mock over JSON-RPC JSONL | `src/stdio-mcp-harness.mjs` uses only a fixed in-repository child, hard-coded fictional batch, reduced child environment, no shell and bounded runtime/output; validates responses and denies fake writes | Offline finite batch test double, not an interactive general-purpose MCP endpoint, OS sandbox or protection against malicious Node/runtime |
| Parent Node process → fixed worker over IPC | `src/process-mcp-harness.mjs` forks a known repository child with fixed arguments, a reduced environment, timeouts, and parent-owned effect ledger | Child code inherits the launch account's OS rights; `fork` + IPC is **not an OS sandbox**. No arbitrary untrusted child code is safe to run |
| Fixture → JSON-RPC/MCP-shaped validators | Request/reply envelope, era, capability and retry rules are checked without a real transport | Profiles are intentionally restrictive or fictional; real MCP behavior may differ. Reported PASS is not MCP certification |
| Validator → stdout/stderr/CI | Rule IDs, indexes, counters and defined return codes; the CLI catches input errors without printing the path | Outputs from future extensions or direct library use need their own redaction tests; rules do **not** scan real secrets |
| Local tests → public repository | GitHub PR, reviewable diff, pinned CI Actions and four OS/Node combinations | CI does not imply security review, trustworthy third-party contributions or safe downstream consumers |

## 4. Threats, implemented defenses and remaining work

| Threat / failure mode | Status today | Follow-up |
| --- | --- | --- |
| Unauthorized fictional write/read, wrong audience/owner/scope, stale or expired grant | **Modeled and checked** via fixture policy tests | [M1-03](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/4): independent negative-control coverage |
| Replay of a committed synthetic mutation; unknown post-commit outcome | **Modeled and checked** in in-memory test executions | [M1-03](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/4): targeted mutation corpus |
| False success, denial with side effects, forged synthetic snapshot | **Modeled and checked** with mock/witness/worker fault injection | [M1-03](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/4): independent behavioral oracle |
| Retry changes method, protocol version, parameters or capability claims | **Modeled**; v0.0.10-rc.1 rejects modified retry parameters except selected version | [M1-02](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/3): malformed/interleaved state transitions |
| Invalid JSON-RPC/era transcript, repeated IDs or contradictory error evidence | **Partially modeled** under strict synthetic profiles | [M1-02](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/3); no assertion of universal protocol conformance |
| Sensitive data in actual third-party agent traces or results | **Not supported/verified**; synthetic canary and marker fields only | [M2-01](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/5): report schema and redaction tests |
| Malicious arbitrary binaries or external MCP servers | **Not isolated, not supported** | [M3-01](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/6): fixed local mock; later M4 authorization design |
| OAuth compromise, supply-chain malware, sandbox escape, production isolation | **Out of scope** | Future independent architecture/security review before making such claims |

### Assumptions and non-goals

Current test runs assume an authorized operator on a trusted developer machine or CI runner, trusted checkout of this project's source and Node.js runtime, **fictional** inputs and a fixed first-party child process. The suite neither makes outbound network connections to test targets nor runs arbitrary external commands as part of the documented modes. It does not accept third-party production logs or credentials as supported fixtures. It is not an authenticated policy decision point, network penetration tester, malware runner, product certification or host-defense boundary.

`process` tests run a child process under ordinary OS permissions. Do **not** use them to execute untrusted code. Any success is evidence about the specified synthetic contract only; **do not** infer actual target authorization or data confidentiality.

## 5. Required checklist for any future adapter (not yet implemented)

**No network-capable adapter may be described as safe or enabled by default without documented evidence for *every* gate below.** The [M3 local mock](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/6) remains fully offline. A future M4 integration is a separate owner-reviewed design decision.

- [ ] **Explicit authorization:** recorded opt-in from the operator who controls the test target, limited to a named, user-owned *staging or sandbox* environment; refuse unclear ownership or third-party hosts.
- [ ] **Exact target allowlist:** canonical endpoint/transport and approved operations are checked **before** connection and before each operation. Deny all targets/redirects outside the allowlist; no arbitrary host/IP ranges, shell command or production endpoint fallback.
- [ ] **Read-only by default:** enforce a default-deny operation and scope policy. Mutating, destructive, credential-revealing or externally visible actions require distinct explicit approval, and are outside the initial integration preview.
- [ ] **Isolation:** fixed, reviewed adapter executable; do not treat Node subprocess isolation as an OS sandbox. A future genuinely untrusted adapter requires independently reviewed OS/VM/container controls and least-privilege host access.
- [ ] **No credential leakage:** never place API keys, OAuth tokens, customer content, private URLs or real logs in fixtures, issue reports, traces, CI artifacts or telemetry. Explicitly redact user-facing results and test redaction with synthetic canaries.
- [ ] **Resource bounds:** limit input and output sizes, event counts, concurrency, retries, redirect count, execution time and child-process lifetime. Enforce deadlines and deterministic cleanup; deny unexpected transport messages.
- [ ] **Fail-closed protocol:** reject unsupported negotiation, authorization ambiguity, modified retries, missing provenance and unrecognized capabilities without silently widening scopes or retrying effects.
- [ ] **Offline/no-cost default:** do not require or silently invoke paid APIs, cloud telemetry, analytics, model endpoints or external scanning. Any optional network action requires separate approval with a clear cost/target disclosure.
- [ ] **Auditability:** record only sanitized rule codes, versions, outcome and counts. Link feature PRs to tested threat cases and four successful Linux/Windows Node20/22 jobs; document residual risk.
- [ ] **Release gate:** security and maintainer review of the full trust boundary, threat model update, positive **and** negative test fixtures, external-target ownership check, rollback plan and explicit owner authorization before launch.

## 6. Validation and change control

- The offline baseline is `node --test`; for released `v0.0.10-rc.1`, [post-merge CI](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39910034366) recorded four green jobs (Ubuntu/Windows × Node.js 20/22), with 254 synthetic tests in each.
- A `FAIL` in an intentionally unsafe fixture is **expected** and does not mean the suite is compromised; assert rule identity and no unsupported side effects.
- New threat assumptions must become tracked Issues. Every significant change needs a scoped PR, positive and negative test, and observed CI evidence; do not close acceptance criteria by documentation assertion alone.
- Responsible disclosure: see [SECURITY.md](../SECURITY.md). Never put real vulnerabilities, tokens, private system information or personal data in a public fixture.
- This model does not claim completeness. As genuine adapters and external users become possible, revisit both adversary capabilities and authorization requirements **before** broadening support.
