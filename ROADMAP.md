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
| Latest candidate in `main` | **v0.0.10-rc.1**; 364 synthetic/local/package-integrity and R5-A content hygiene tests | [R5-A PR #42](../../pull/42) and [post-merge CI](../../actions/runs/39941412361) — 4/4 jobs, 364/364 tests each |
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
| **M4 — Authorized integration preview** | Start with fixed first-party local loopback, external staging separate | **M4-A DONE (1/1); M4-B NOT AUTHORIZED** | [M4-A #23](../../issues/23), [RFC #21](../../issues/21) | Allowlist + explicit target authorization + strict default deny; no production probes |
| **M5 — Useful OSS beta** | Packaging, contribution loop, documented examples and community feedback | **IN PROGRESS — first-run demo** | [M5-01 #45](../../issues/45) | Repeatable installation/use, versioned releases, triaged external feedback |
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

- **M5-01 — IN PROGRESS:** [Issue #45](../../issues/45) adds a zero-argument offline CLI `demo`, verifying a known synthetic PASS and expected negative control from the candidate's installed package; it does not scan any user's MCP environment. Reviewed PR and CI acceptance pending. Independent [R5-B #43](../../issues/43) and release authorization remain open.

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
