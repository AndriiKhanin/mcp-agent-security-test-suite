# Product roadmap and progress

> **Mission:** Build a practical, free and open-source MCP/AI-agent security testing product that helps developers find contract, authorization and unsafe tool-execution mistakes **before deployment**. All future connections to external systems must be explicitly authorized, bounded and isolated. Passing tests is not a security certification.
>
> **Last reviewed:** 2026-10-23 · **Current main:** `v0.0.10-rc.1` · **M4-A accepted:** [Issue #23](../../issues/23), [PR #24](../../pull/24), [CI](../../actions/runs/39925449081) 4/4 PASS; **M4-B remains unauthorized**

This roadmap is the **source of truth for priorities and acceptance criteria**. GitHub Issues track the individual tasks; merged PRs and GitHub Actions runs are the evidence. Version names and milestone scope can change when requirements are better understood. Do not read future milestones as implemented features.

## Where we stand

| Indicator | Verified state | Evidence |
| --- | --- | --- |
| Public independently maintained source | **Done**; MIT license | [LICENSE](LICENSE) |
| First baseline | **v0.0.9**; 243 synthetic tests | [Original CI](../../actions/runs/39852303226) — 4/4 jobs passed |
| Latest candidate in `main` | **v0.0.10-rc.1**; 474 synthetic/local, packaging, consent, modern owned staging, worker/TCP resource witness and negative controls | [M4-B6-C PR #86](../../pull/86), [post-merge main CI #39994153624](../../actions/runs/39994153624): **4/4 PASS, 474/474 tests/job**, 0 failed/skipped |
| Supported automated test matrix | **Windows + Ubuntu, Node.js 20 + 22** | [CI workflow](.github/workflows/ci.yml) |
| Security boundary model | **DONE**; offline synthetic threat model and future adapter checklist | [Threat model](docs/THREAT_MODEL.md), [PR #9](../../pull/9) |
| Tracked near-term roadmap work | **6/6 issues complete** | [Open issues](../../issues?q=is%3Aissue+is%3Aopen) |
| Real external MCP-server interoperability/security testing | **Not yet implemented** | See **M4**; no live-scanner claim |
| Deployment, hosted service, npm release, certification | **Not yet delivered**; R0/R1 local packaging and install checks accepted, publication not authorized | [Release gates](docs/RELEASE_READINESS.md), [R0 #26](../../issues/26), [R1 #29](../../issues/29) |

The numbers above measure **engineering acceptance only**, not commercial traction, protocol certification or proven effectiveness against real attacks.

## Milestone overview

| Milestone | Focus | Status | Tracking | Exit gate |
| --- | --- | --- | --- | --- |
| **M0 — Foundation** | MIT public source, offline harness, version-retry protection, automated CI | **DONE** | [PR #1](../../pull/1); [post-merge CI](../../actions/runs/39910034366) | 4/4 OS/runtime jobs green, scoped public source |
| **M1 — Trustworthy security core** | Threat model, retry state-machine hardening, independent negative controls | **DONE — 3/3** | [#2](../../issues/2), [#3](../../issues/3), [#4](../../issues/4) | Deterministic deny cases, bounded/report-safe failures, CI 4/4 |
| **M2 — Developer experience** | Machine-readable reports, usable quickstart and CI integration | **DONE — 2/2** | [#5](../../issues/5), [#7](../../issues/7) | External developer can run a fictional PASS and expected FAIL and understand the results |
| **M3 — Safe adapter foundation** | Explicitly bounded local, fixed stdio MCP mock adapter | **DONE — 1/1** | [#6](../../issues/6) | Cross-platform mock interoperability without arbitrary commands, credentials or external network |
| **M4 — Authorized integration preview** | Universal adapter descriptors and safe first-party mock; external staging separate | **M4-A/B0/B1/B2/B3/B4/B5/B6-A/B6-B/B6-C DONE; M4-B6-D FIRST-PARTY PROTOCOL NEGATIVES IN PROGRESS; EXTERNAL MCP TARGETS NOT AUTHORIZED** | [M4-A #23](../../issues/23), [M4-B0 #61](../../issues/61), [M4-B1 #63](../../issues/63), [RFC #21](../../issues/21) | Allowlist + explicit target authorization + strict default deny; no production probes |
| **M5 — Useful OSS beta** | Packaging, contribution loop, documented examples and community feedback | **IN PROGRESS — independent tester evidence pending** | [M5-01 #45](../../issues/45), [M5-02 #49](../../issues/49), [M5-03 #48](../../issues/48), [M5-04 #54](../../issues/54), [M5-05 #57](../../issues/57), [M5-06 #59](../../issues/59) | Repeatable installation/use, versioned releases, triaged external feedback |
| **M6 — Product maturity / 1.0 candidate** | Stable contracts, threat-model upkeep, independent review and maintainability | **FUTURE** | Issues to be scoped | Stable versioned public API/CLI, negative-control coverage, externally reviewed limits and maintenance policy |

We will not claim a release is production-ready merely because a synthetic test suite passes.

## Ordered near-term backlog

These are actual GitHub Issues, not aspirational checkmarks. **Close each only when its Definition of Done is evidenced by a merged PR and verified CI.**

1. **DONE — [M1-01 · Threat model and scope boundaries (#2)](../../issues/2)** — documented trust boundaries and future adapter gates in [THREAT_MODEL.md](docs/THREAT_MODEL.md); [merged PR #9](../../pull/9) and [post-merge CI](../../actions/runs/39912395585) verified 4/4.
2. **DONE — [M1-02 · Fail-closed retry-state transitions (#3)](../../issues/3)** — added nine regression tests and strict fail-closed retry checks; [merged PR #11](../../pull/11) and [post-merge CI](../../actions/runs/39913669267) verified 4/4.
3. **DONE — [M1-03 · Independent negative-control corpus (#4)](../../issues/4)** — 18 golden mutations and 25 security regressions in [NEGATIVE_CONTROLS.md](docs/NEGATIVE_CONTROLS.md); [merged PR #13](../../pull/13) and [main CI](../../actions/runs/39915007747) verified 4/4.
4. **DONE — [M2-01 · Versioned machine-readable CLI reports (#5)](../../issues/5)** — additive schema v1, 23 regression tests, safe error summaries and [CLI report contract](docs/CLI_REPORTS.md); [merged PR #15](../../pull/15) and [post-merge CI](../../actions/runs/39917058997) verified 4/4.
5. **DONE — [M3-01 · Fixed local stdio mock adapter (#6)](../../issues/6)** — fixed finite JSON-RPC stdio batch mock with hard resource limits; [docs](docs/STDIO_MOCK.md), [merged PR #17](../../pull/17) and [postmerge CI](../../actions/runs/39919803356) 4/4 PASS.
6. **DONE — [M2-02 · Developer tutorial and CI recipe (#7)](../../issues/7)** — [clean-clone walkthrough](docs/GETTING_STARTED.md), [offline example](examples/offline-ci-check.mjs) and [pinned CI recipe](examples/offline-contract-check.yml); [merged PR #19](../../pull/19) and [postmerge CI](../../actions/runs/39921138853) 4/4 PASS.

**Dependencies:** M1-01 informs the security invariants in M1-02 and M1-03; M2-01 and M3-01 support the complete developer example in M2-02. We may work on independent pieces in parallel, but must still satisfy those acceptance gates.

**Acceptance of the current short-term plan:** all six Issues (#2–#7) are completed with merged PRs and four-job post-merge CI. **This is not Product 1.0 or completion of M4–M6.** Work involving real MCP targets requires a separately scoped and owner-approved architecture with target ownership and explicit allowlisting.

## What a complete product should deliver

- **Pre-deployment security checks:** developers select reproducible checks for permissions, cross-resource boundaries, replay, tool calls, protocol negotiation and failure handling.
- **Safe target configuration:** start with entirely fictional fixtures, then fixed local mocks. Only later consider explicit opt-in, user-owned staging servers, never arbitrary external scanning by default.
- **Actionable results:** machine-readable CI artifacts and a human-friendly explanation of the violated invariant, without echoing confidential data.
- **Repeatability:** a security regression can be represented by a sanitized fixture and rerun locally and in CI on supported platforms.
- **Accessible OSS workflow:** good documentation, no compulsory paid APIs, clear extension interfaces and reviewable contributions.

## Standard delivery and progress policy

1. Pick the highest-priority unblocked Issue; mark it as **in progress** in its discussion or PR link. Do not invent progress percentages.
2. Implement only the scoped change in a fresh feature branch; use synthetic data, no secrets and no unrelated proprietary source.
3. Add a positive example and a negative control; validate changed code against its documented requirements.
4. Open a PR referencing the Issue, review the exact diff and run **four** required jobs: Ubuntu/Windows × Node.js 20/22.
5. Merge only after all four jobs pass; verify the post-merge `main` CI before claiming delivery. Stop on unexpected results.
6. Close the linked Issue with PR and CI evidence, then update **this progress table**, version/release notes if applicable, and choose the next Issue.

**Progress report format:** `DONE / IN PROGRESS / BLOCKED / NEXT`, relevant GitHub links, verified test count and risks. A pending item is not a completed milestone.

## M5 beta onboarding (active)

- **M5-06 — OPEN EXTERNAL VALIDATION GATE:** [Issue #59](../../issues/59) requires an actual consenting independent developer's reproducible fictional-only test report, public source SHA and triaged findings. **No independently executed beta report has been verified.** R5-B #43 is a separate independent security audit.
- **M5-05 — DONE (engineering only):** [Issue #57](../../issues/57) accepted through [PR #58](../../pull/58) and [post-merge main CI #39959008260](../../actions/runs/39959008260), **4/4 PASS, 390/390 per job**, 0 failed/skipped. Added [five-case fictional acceptance runner](examples/beta-acceptance-check.mjs), [external beta instructions](docs/BETA_TESTING.md), opt-in beta form, negative controls and disposable installed-package smoke. Exactly two reviewed shipped paths grew package inventory **58→60**. Green CI is **not** evidence of any independent beta participant.

- **M5-04 — DONE:** [Issue #54](../../issues/54) accepted via [merged PR #55](../../pull/55) and [post-merge main CI #39956798014](../../actions/runs/39956798014), **4/4 PASS, 384/384 tests per job**, 0 failed/skipped. CLI `help`/`version` and standard aliases return bounded JSON-v1, read only reviewed bundled metadata, reject extra arguments and pass disposable local package smoke. This is neither remote capability discovery nor publication proof. Independent [R5-B #43](../../issues/43) and final release authorization remain open.

- **M5-03 — DONE:** [Issue #48](../../issues/48), [merged PR #52](../../pull/52), and [post-merge main CI #39955000316](../../actions/runs/39955000316) confirm **4/4 PASS, 379/379 tests per job**. GitHub Issue Forms, mandatory metadata/privacy confirmation, private-vulnerability routing, reproducible fictional-only contributor guidance and five structural/mutation controls are accepted. Forms remain outside the npm archive. They do **not** sanitize user-submitted text; independent [R5-B #43](../../issues/43) and release authorization remain open.

- **M5-02 — DONE:** [Issue #49](../../issues/49), [merged PR #50](../../pull/50) and [post-merge main CI #39953093188](../../actions/runs/39953093188) verified **4/4 PASS, 374/374 tests per job**. Strictly allowlisted, bounded human-readable guidance and three reproducible fictional negative controls are integrated into JSON v1. Native fields are not DLP-filtered; publication and independent [R5-B #43](../../issues/43) remain unapproved.
- **M5-01 — DONE:** [Issue #45](../../issues/45) delivered `node src/cli.mjs demo` with no arguments, verifying one bundled synthetic PASS and one expected negative control from both source and the candidate's temporarily installed package. [Merged PR #46](../../pull/46) and [post-merge main CI #39944760146](../../actions/runs/39944760146): **4/4 PASS, 370/370 tests per job**. This is not a live scanner; independent [R5-B #43](../../issues/43) and release authorization remain open.

## M4-B2 — offline consent consistency preview

- **M4-B2 — DONE (offline self-asserted consistency only):** [Issue #66](../../issues/66) delivered via [PR #68](../../pull/68), with [post-merge main CI #39972783779](../../actions/runs/39972783779), **4/4 PASS, 417/417 tests per job**, zero failed/skipped. Portable policy-envelope version, exact canonical descriptor SHA-256, short fictional five-minute lifetime, strict `initialize`/`ping` methods, revoked/expired/mismatch/replay controls and generic `adapter-policy-check` CLI. Three reviewed package paths increase inventory **66→69**. The operator is **NOT authenticated** and real connection remains disabled.
- **M4-B3 — DONE (first-party mock only):** [Issue #69](../../issues/69), [merged PR #71](../../pull/71), [post-merge main CI #39979727977](../../actions/runs/39979727977): **4/4 PASS, 428/428 tests per job**, zero failed/skipped. First-party fictional admission precedes driver construction; denied requests return before running the mock. Guarded stdio transmits **only one `initialize`**, never `tools/call`; HTTP transmits only fixed loopback `ping`. Two reviewed packaged paths advance **69→71**. The direct low-level legacy mock is a separate test utility, not real authorization.
- **M4-B4 — DONE (test-only):** [Issue #72](../../issues/72), [merged PR #74](../../pull/74), [post-merge main CI #39983335810](../../actions/runs/39983335810): **4/4 PASS, 438/438 tests per job, 0 failures/skips**. Bounded test observer measures source-site attempts at fixed driver probe, stdio worker spawn and loopback bind/request independently of response flags, with denied and positive controls plus concurrent isolation. The checked package inventory is **72** paths; not kernel process/network tracing, real authorization or external server access.

## M4-B6-D — first-party modern protocol negative controls

- **M4-B6-D — IN PROGRESS:** [Issue #88](../../issues/88) tests exact MCP 2026-07-28 HTTP/JSON-RPC error distinctions, missing/duplicate headers, unsupported versions, unknown methods, single-request budget, unsolicited and malformed SSE, all against the same fixed `127.0.0.1` staging. [Scope and limitations](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md). Package inventory **79→80**. No external user target, production action, full conformance or independent audit.

## M4-B6 — owner-approved first-party isolated staging only

- **M4-B6-A — DONE (own local staging test-only):** [Issue #79](../../issues/79), [merged PR #80](../../pull/80), [post-merge main CI #39990071235](../../actions/runs/39990071235) **4/4 PASS, 457/457 tests/job, 0 failed/skipped**. Temporary literal `127.0.0.1` fixed first-party MCP 2026-07-28 `server/discover`, modern header/body validation, JSON/SSE, negative controls, cleanup and installed-package smoke. [Boundaries](docs/FIRST_PARTY_STAGING_MCP.md). Exact reviewed package path count **75**. This is not a remotely deployed staging server, a sandbox or authorization to contact user targets. [Real-target RFC #21](../../issues/21) remains OPEN.
- **M4-B6-B — DONE (owned child-process only):** [Issue #82](../../issues/82), [merged PR #83](../../pull/83), [post-merge main CI #39991717781](../../actions/runs/39991717781): **4/4 PASS, 466/466 tests/job, 0 failures/skips**. Fixed bundled worker, scrubbed environment, strict IPC, deadline, early-exit/hang/malformed-output negative controls and installed-package smoke. [Worker boundary guide](docs/FIRST_PARTY_STAGING_WORKER.md). Reviewed inventory now **78** paths. Separate process is **NOT an OS sandbox**, and user targets are not authorized. [M4 real-target RFC #21](../../issues/21) remains OPEN.
- **M4-B6-C — DONE (first-party resource evidence only):** [Issue #85](../../issues/85), [merged PR #86](../../pull/86), [post-merge CI #39994153624](../../actions/runs/39994153624): **4/4 PASS, 474/474 tests/job, 0 failed/skipped**. Test-only parent OS TCP bind witness verifies our fixed child's ephemeral `127.0.0.1` port is **BUSY** during operation and **FREE** after observed exit or forced kill; checks PID, malformed IPC, forbidden local methods/Host/Origin, and waits for child exit after worker timeout. [Exact limitations](docs/STAGING_RESOURCE_WITNESS.md). Package inventory now **79** paths. Not OS/kernel tracing, remote egress confinement, independent audit or authorization for user-owned MCP targets. [External-target RFC #21](../../issues/21) remains OPEN.

## M4-B5 — future user-target authorization decision (no live connection)

- **M4-B5 — DONE (design and offline non-contact verification only):** [Issue #76](../../issues/76), [merged PR #77](../../pull/77), [post-merge main CI #39986507745](../../actions/runs/39986507745): **4/4 PASS, 447/447 tests/job, 0 failed/skipped**. [Decision packet](docs/M4_B5_TARGET_APPROVAL.md) defines independent ownership and operator evidence, exact per-method/target consent, TLS/DNS/SSRF/isolation gates and tests preservation of inert universal adapter APIs. Inventory now **73** packaged paths. **Real-target RFC #21** remains open for explicit owner authorization; no DNS/network, credentials, authentication or user-controlled process implementation.

## M4-B1 — fixed first-party transport drivers

- **M4-B1 — DONE (fixed first-party only):** [Issue #63](../../issues/63), [merged PR #65](../../pull/65) and [main CI #39966437277](../../actions/runs/39966437277): **4/4 PASS, 407/407 tests per job**, 0 failed/skipped. One lifecycle, two fixed local mocks, strict negative tests and installed-package smoke. Package inventory **64→66**. No user-selected commands, endpoints or credentials.
- **M4-B2 — DONE:** [Issue #66](../../issues/66) implements OFFLINE policy consistency only. The mock-only enforcement continuation is [M4-B3 #69](../../issues/69). External MCP targets remain gated by [M4 RFC #21](../../issues/21).

## Universal project adapter (M4-B0)

- **M4-B0 — DONE (descriptor validation only):** [Issue #61](../../issues/61) accepted via [PR #62](../../pull/62) and [post-merge main CI #39962836679](../../actions/runs/39962836679), **4/4 PASS, 397/397 tests per job**, 0 failed/skipped. A reusable stdio/Streamable-HTTP descriptor, `adapter-check` CLI, source validator and project-neutral examples are included. Four reviewed package paths grew **60→64**. `PASS` means only valid configuration; **no connections or subprocesses**. **Next:** [M4-B1 #63](../../issues/63) fixed first-party local transport drivers. Real user-owned target contact still requires approved [RFC #21](../../issues/21) security gates.

## Release gates and boundaries

- **R5-A content preflight and auditor handoff — DONE:** [Issue #41](../../issues/41) accepted through [PR #42](../../pull/42) and [post-merge main CI](../../actions/runs/39941412361), **4/4 PASS, 364/364 per job**. The bounded heuristic scanned all 57 package-source paths; this does not demonstrate absence of secrets or malware.
- **R5-B independent security/provenance review — OPEN RELEASE GATE:** [Issue #43](../../issues/43) requires review by an assessor independent of the author, an independently verified final artifact and explicit owner publication permission. R5-A does not satisfy R5-B.

- **R4 offline artifact integrity — DONE:** [Issue #38](../../issues/38) accepted via [merged PR #39](../../pull/39) and [post-merge main CI](../../actions/runs/39938436907), **4/4 PASS, 360/360 tests per job**. Two isolated same-job offline packs match byte-for-byte, metadata digests are verified, and all 56 installed file bytes match checkout source except npm's exact Windows bin-shebang CRLF→LF normalization. This is **not** independent provenance, a security audit or release authorization.

- **R3 internal release review — DONE:** [Issue #35](../../issues/35) accepted via [merged PR #36](../../pull/36) and [post-merge main CI](../../actions/runs/39935969302), **4/4 PASS, 358/358 tests per job**. The reviewed [internal risk report](docs/R3_INTERNAL_RELEASE_REVIEW.md) records 55 packaged paths and explicitly leaves the **independent security review and publication gates OPEN**. No stable-release permission has been granted.
- **R2 package inventory hardening — DONE:** [Issue #32](../../issues/32) accepted via [merged PR #33](../../pull/33) and [main CI](../../actions/runs/39934465115), 4/4 PASS with 358/358 tests per job. A 54-path exact offline package inventory and two mutation controls prevent unnoticed file additions or omissions. This is **not** a content-security audit or approval to tag or publish.


- A `-rc` package is a **release candidate**, not a stable or independently security-audited product. Stable `v0.0.10` and npm publication remain unapproved; see [R0 release readiness](docs/RELEASE_READINESS.md).
- Preserve genuine public MIT provenance. Never import commercial/private Stable Bridge code, history, secrets, internal logs or credentials.
- Default execution is offline, synthetic and deterministic. No paid API calls or live-system scanning without separately approved design and authorization.
- Process separation does **not** equal an OS sandbox; avoid that security claim until independently demonstrated.
- Protocol-shaped tests are not a formal guarantee of conformance to all versions of MCP or JSON-RPC.
- External contributions or claims about real users must be supported by evidence.
- Any major architectural pivot, networked adapter, collection of telemetry, deployment or paid service requires explicit owner review.

## Decisions pending future milestones

M1–M3 acceptance evidence is complete. The [M4-00 architecture RFC](docs/M4_AUTHORIZED_INTEGRATIONS_RFC.md) now records the authorization, transport-version, risk and owner-decision gates for an optional future integration preview. The maintainer approved **only M4-A first-party temporary 127.0.0.1 HTTP mock** on 2026-10-23 (tracked in [#23](../../issues/23)); it is subject to implementation PR and CI acceptance. No external-target testing (M4-B), authentication, credential handling, real MCP scanning or production traffic is approved. See [loopback boundaries](docs/LOOPBACK_HTTP_MOCK.md). Distribution channel, support policy and independent audit scope remain future decisions.
