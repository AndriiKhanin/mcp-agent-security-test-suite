# Product roadmap and progress

> **Mission:** Build a practical, free and open-source MCP/AI-agent security testing product that helps developers find contract, authorization and unsafe tool-execution mistakes **before deployment**. All future connections to external systems must be explicitly authorized, bounded and isolated. Passing tests is not a security certification.
>
> **Last reviewed:** 2026-10-24 · **Current main:** `v0.0.10-rc.1` · **M4-A accepted:** [Issue #23](../../issues/23), [PR #24](../../pull/24), [CI](../../actions/runs/39925449081) 4/4 PASS; **M4-B remains unauthorized**

This roadmap is the **source of truth for priorities and acceptance criteria**. GitHub Issues track the individual tasks; merged PRs and GitHub Actions runs are the evidence. Version names and milestone scope can change when requirements are better understood. Do not read future milestones as implemented features.

## Where we stand

| Indicator | Verified state | Evidence |
| --- | --- | --- |
| Public independently maintained source | **Done**; MIT license | [LICENSE](LICENSE) |
| First baseline | **v0.0.9**; 243 synthetic tests | [Original CI](../../actions/runs/39852303226) — 4/4 jobs passed |
| Latest candidate in `main` | **v0.0.10-rc.1**; 720 synthetic/local, M6-D inactive pinned adopter CI example, executable fictional Bash checks, M6-C exported-kit verification and fixed negative controls | [M6-D PR #148](../../pull/148), [main CI #40163810749](../../actions/runs/40163810749): **4/4 PASS, 720/720 tests/job**, 0 failed/skipped |
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
| **M4 — Authorized integration preview** | Universal adapter descriptors and safe first-party mock; external staging separate | **M4-A/B0/B1/B2/B3/B4/B5/B6-A/B6-B/B6-C/B6-D/B6-E/B6-F/B7-A/B7-B/B7-C/B8-A/B8-B/B9-A/B9-B/B9-C/B9-D/B10-A ENGINEERING DONE; EXTERNAL MCP TARGETS NOT AUTHORIZED** | [M4-A #23](../../issues/23), [M4-B0 #61](../../issues/61), [M4-B1 #63](../../issues/63), [RFC #21](../../issues/21) | Allowlist + explicit target authorization + strict default deny; no production probes |
| **M5 — Useful OSS beta** | Packaging, contribution loop, documented examples and community feedback | **IN PROGRESS — independent tester evidence pending** | [M5-01 #45](../../issues/45), [M5-02 #49](../../issues/49), [M5-03 #48](../../issues/48), [M5-04 #54](../../issues/54), [M5-05 #57](../../issues/57), [M5-06 #59](../../issues/59), [M5-07 #127](../../issues/127), [M5-08 #132](../../issues/132) | Repeatable installation/use, versioned releases, triaged external feedback |
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



## M6-E — readable, non-authorizing offline results

- **IN DEVELOPMENT — fictional report interpretation only:** [Issue #150](../../issues/150).
  Add source-owned fixed `readerGuide` strings to the existing JSON-v1
  output of `adapter-kit`, `adapter-quickstart`,
  `adapter-kit-verify` and `adapter-trace-expect`; distinguish
  clean synthetic PASS, correctly detected fictional safety FAIL,
  unexpected CI MISMATCH and invalid input. No free-text input
  interpolation, project scanning, additional executable command, new
  packaged paths or dependencies. Preserve legacy machine-readable
  exit codes and retain independent gates #21, #43 and #59 OPEN.

## M6-D — portable fictional adopter GitHub Actions example

- **DONE — fictional workflows only:** [Issue #147](../../issues/147), [merged PR #148](../../pull/148), [post-merge main CI #40163810749](../../actions/runs/40163810749): **4/4 PASS, 720/720 tests/job**, zero failures/skips.
  Add an inactive copy-only adopter CI recipe outside the packaged source
  that checks out a **fixed full Git SHA**, runs the source-owned kit
  verifier and clean/negative/mismatch symbolic expectations on
  Windows/Ubuntu Node20/22 with no npm install, credentials or user MCP
  contact. Verify the literal shell commands in a separate temporary
  adopter directory, reject tampered controls and clean up temp files.
  Existing 80 packaged paths preserved; no new runtime dependencies,
  paid APIs or npm publication. Real-target #21, independent audit #43,
  independent beta #59 remain OPEN.

## M6-C — one-command exported fictional kit CI verification

- **DONE — fixed offline fixtures only:** [Issue #144](../../issues/144), [merged PR #145](../../pull/145), [post-merge main CI #40127657693](../../actions/runs/40127657693): **4/4 PASS, 713/713 tests/job**, 0 failed/skipped.
  Run `adapter-kit-verify <local-kit-json>` to verify an exported `adapter-kit` JSON file against the canonical
  complete reviewed CLI report, then rerun quickstart and two fictional
  symbolic expectations in one CLI command with strict local UTF-8
  file-size/shape limits, generic safe errors and clear 0/1/2 exit
  semantics. No user-owned MCP testing, arbitrary process/network calls,
  proof of independent authorship or permission to publish. Preserve
  80-path npm inventory preserved, zero new dependencies, PR and main
  CI 4/4 verified. External gates #21, #43 and #59 remain OPEN.

## M6-B — guided fictional adopter kit and CI starter

- **DONE — reviewed fictional examples only:** [Issue #141](../../issues/141), [merged PR #142](../../pull/142), [code post-merge CI #40126257281](../../actions/runs/40126257281): **4/4 PASS, 703/703 tests/job**, 0 failed/skipped.
  Add selector-only `adapter-kit stdio|streamable-http` to emit a
  deterministic version-1 JSON plan, inert descriptor, clean and
  expected-negative symbolic CI examples, and literal human-readable
  interpretation. No scripts/files written or target services contacted by
  the kit generator. Prove three artifact roundtrips both in source and
  installed offline tarball from a separate fictional adopter workspace.
  Existing 80 reviewed packaged paths remain intact, with 4/4 CI verified;
  live server #21, independent audit #43 and independent beta #59 remain OPEN.

## M6-A — one-command offline adapter quickstart

- **DONE — fictional controls only:** [Issue #138](../../issues/138), [merged PR #139](../../pull/139), [post-merge main CI #40124135985](../../actions/runs/40124135985): **4/4 PASS, 693/693 tests/job**, zero failed/skipped.
  Introduce `adapter-quickstart <local-descriptor>` to combine inert
  validate-only onboarding and five fixed built-in fictional security
  controls with readable, redacted, structured next actions. No external
  MCP contact, executable stdio, credentials or unapproved live testing.
  A PASS means descriptor shape and fictional control behavior only,
  **never actual project safety**. Existing 80 reviewed package paths remain
  unchanged, with no new dependencies. External gates #21/#43/#59 remain OPEN.

## M5-08 — symbolic offline beta report consistency preflight

- **DONE, engineering-only claim consistency:** [Issue #132](../../issues/132), [merged PR #133](../../pull/133), [post-merge main CI #40114331305](../../actions/runs/40114331305): **4/4 PASS, 678/678 tests/job**, zero failed/skipped.
  Add a strict pure check for *manually sanitized fictional beta-report
  claims*, rejecting malformed/contradictory claims and returning
  `CLAIM_CONSISTENT_ONLY`. Explicitly never prove identity, actual
  execution, security certification or gate acceptance. No outreach,
  real MCP contact, private issue ingestion, network or process
  execution. Reviewed 80-path package inventory preserved; the independent
  external gates #59/#43/#21 remain OPEN.

## M5-07 — independent fictional beta evaluator preparation

- **DONE — materials only, not independent beta evidence:** [Issue #127](../../issues/127), [merged PR #128](../../pull/128), [main CI #40105602737](../../actions/runs/40105602737): **4/4 PASS, 664/664 tests/job**, zero failed/skipped. Consolidate a full public-source SHA-pinned offline evaluator path, optional local npm tarball identity check and sanitized opt-in first-hand feedback fields in the existing beta materials. Keep the 80-path package inventory, 4/4 PR and post-merge CI, and all three independent gates #21/#43/#59 **OPEN**. Do not invent independent participants, report private logs, contact a customer MCP target, publish a stable artifact or treat an archive digest as a signed attestation.

## M4-B10-A — isolated fictional downstream adopter

- **DONE — installed offline fictional adopter only:** [Issue #124](../../issues/124), [merged PR #125](../../pull/125), [post-merge main CI #40103582818](../../actions/runs/40103582818): **4/4 PASS, 658/658 tests/job**, zero failed/skipped.
  Extend existing reviewed R1 offline tarball installation test to run
  inert descriptor onboarding, anonymous synthetic trace validation,
  exact CI expectations and SDK import from a separate temporary adopter
  workspace. Verify success/failure/error 0/1/2, bounded and sanitized
  report handling, invalid files and direct symbolic-link denial, and
  automatic temp/cache cleanup. No new packaged paths, no new dependencies
  or live customer MCP targets. Engineering acceptance verified; reviewed
  80-path package inventory intact, external gates #21/#43/#59 OPEN.

## M4-B9-D — portable offline CI smoke

- **DONE — fictional CI example only:** [Issue #121](../../issues/121), [merged PR #122](../../pull/122), [post-merge main CI #40100711397](../../actions/runs/40100711397): **4/4 PASS, 658/658 tests/job**, zero failures/skips.
  Extend the existing reviewed `examples/offline-ci-check.mjs` with
  clean symbolic expectation MATCH, expected synthetic violation MATCH
  with observed safety FAIL, and unexpected violation MISMATCH / exit 1;
  execute it explicitly in the existing cross-platform CI workflow.
  No new npm packaged paths, no new runtime dependencies, no external
  MCP target/process/credential/network privileges. Engineering acceptance
  verified; this remains an offline demo, not an independent security audit.

## M4-B9-C — exact symbolic trace CI expectations

- **DONE (offline CI expectations only):** [Issue #118](../../issues/118), [merged PR #119](../../pull/119), [post-merge main CI #40098854001](../../actions/runs/40098854001): **4/4 PASS, 654/654 tests/job**, zero failed/skipped.
  Versioned `adapter-trace-expect` compares the exact complete ordinal
  synthetic trace rule set with explicitly authored expectations; it separates
  observed safety FAIL from CI expectation-match PASS and denies wildcards,
  partial matches, missing indices and status contradictions. The existing
  `adapter-synthetic-trace` remains unchanged. No real target contact,
  user process execution, credentials, runtime dependency or certification.
  Engineering-only acceptance is verified, with the reviewed 80-path package
  inventory intact. External authorization/review/beta gates #21/#43/#59 stay OPEN.

## M4-B9-B — strict user-authored symbolic traces

- **DONE (offline symbolic trace only):** [Issue #115](../../issues/115), [merged PR #116](../../pull/116), [post-merge main CI #40095371602](../../actions/runs/40095371602): **4/4 PASS, 633/633 tests/job**, zero failed/skipped.
  A separate `adapter-synthetic-trace <local-file>` profile accepts
  1–8 developer-authored enum/boolean-only events and an unchanged inert
  project descriptor, reusing the pure synthetic `auditRecords` checker.
  Clear difference between symbolic denial-without-effect and violated
  controls, fixed symbolic reports and no user content echoed. No arbitrary
  RPC, real MCP transcripts, credentials, DNS/network, stdio launch or
  target approval. The exact 80 reviewed npm paths remain unchanged, with zero new runtime dependencies; #21/#43/#59 remain OPEN.

## M4-B9-A — offline project fixture audit bundle

- **DONE (offline fixture audit only):** [Issue #112](../../issues/112),
  [merged PR #113](../../pull/113), [main CI #40080894639](../../actions/runs/40080894639): **4/4 PASS, 614/614 tests/job**, zero failed/skipped. `adapter-fixture-audit <local-file>`
  validates a strict project descriptor, then runs selected fixed in-code
  fictional permission, replay, escalation, negative denied-effect and clean
  trace checks, with per-case symbolic results. No project target/contact,
  process execution, arbitrary user trace, DNS, credential or authorization.
  Built-in negative-control detection is an expected PASS condition, not an
  actual vulnerability finding. Engineering acceptance verified; exact
  80-path npm inventory unchanged. External approval and independent review pending.

## M4-B8-B — offline provenance and single-use grant rehearsal

- **DONE (offline simulation only):** [Issue #109](../../issues/109), [merged PR #110](../../pull/110), [post-merge main CI #40077863059](../../actions/runs/40077863059): **4/4 PASS, 599/599 tests/job**, zero failed/skipped.
  Add fictional independent-input evidence snapshots bound to exact packet,
  operator and freshness, plus synchronous in-memory one-time state transitions.
  Negative cases include spoofed evidence, malformed provenance, target/method
  mismatch, replay, concurrent consume, revocation, expiry and safe report
  boundaries. Two separate state cells can independently accept a copied test
  grant: **this is not a durable replay ledger**. Every symbolic success still
  returns `REAL_TARGET_EXECUTION_NOT_AUTHORIZED`. No real MCP contact,
  DNS/TLS/SSRF enforcement, credentials or executable target method permitted.
  Engineering-only acceptance verified; real-target contact remains blocked until a separately approved and independently reviewed implementation.


## M4-B8-A — exact-target offline authorization decision simulation

- **DONE (simulation only; no external target authorization):** [Issue #106](../../issues/106), [merged PR #107](../../pull/107), [post-merge main CI #40075770866](../../actions/runs/40075770866): **4/4 PASS, 582/582 tests/job**, zero failed/skipped.
  A separate strict JSON packet and test-only evidence snapshot model exact
  nonproduction HTTPS host/443/path, modern `server/discover`, one request,
  five-minute maximum grant, synthetic consumed/revoked states, and distinct
  ownership/operator/egress/TLS/DNS/SSRF symbolic gates.
  Every simulated verdict, including a fictional PASS, explicitly preserves
  `REAL_TARGET_EXECUTION_NOT_AUTHORIZED` and zero transport execution.
  No independent provider, atomic replay ledger, remote DNS/TLS/SSRF controls,
  user MCP contact, generic stdio execution, or external staging permission.
  Engineering-only acceptance is recorded; a separate independent authorization
  gate remains mandatory before any external contact.

## M4-B7-C — finite offline project descriptor templates

- **M4-B7-C — DONE (safe offline template generator only):** [Issue #103](../../issues/103), [merged PR #104](../../pull/104), [post-merge main CI #40073451813](../../actions/runs/40073451813): **4/4 PASS, 566/566 tests/job, 0 failed/skipped**. `adapter-template stdio|streamable-http` emits exactly two literal fictional profile objects, all execution/network allowances **false**, under a versioned JSON report. Template selection never reads/writes a file, resolves an address, spawns a process or accesses a user MCP server. [Copy/paste and offline validator instructions](docs/GETTING_STARTED.md). The exact **80-path packaged file inventory** and R2/R5 security gates are unchanged. External target approval RFC #21, audit #43 and beta #59 stay OPEN.

## M4-B7-B — offline project onboarding and first-party demo

- **M4-B7-B — DONE (offline onboarding + independent first-party demo):** [Issue #100](../../issues/100), [merged PR #101](../../pull/101), [post-merge main CI #40072318839](../../actions/runs/40072318839): **4/4 PASS, 554/554 tests/job, 0 failed/skipped**. `adapter-onboard <file>` stays pure with readiness-v1 categorical evidence and **no network/process effects**; no-arg `adapter-onboarding-demo` uses an in-code fictional descriptor and ONLY first-party `127.0.0.1` MCP staging. Staging PASS **cannot authenticate a customer project or operator**; outputs `REAL_TARGET_NOT_ATTEMPTED`, `OPERATOR_NOT_VERIFIED`, `REAL_TARGET_NOT_AUTHORIZED`. [Onboarding steps](docs/GETTING_STARTED.md). Exact **80-path npm package** and prior R2/R5 gates preserved. External-target RFC #21, independent security #43 and beta #59 stay OPEN.

## M4-B7-A — test-only universal driver lifecycle to owned staging

- **M4-B7-A — DONE (first-party modern adapter only):** [Issue #97](../../issues/97), [merged PR #98](../../pull/98), [post-merge main CI #40007735850](../../actions/runs/40007735850): **4/4 PASS, 539/539 tests/job, 0 failed/skipped**. Adds a separate no-arg `adapter-staging-selftest` and fixed `connect/probe/close` facade executing only the owned temporary `127.0.0.1` MCP 2026-07-28 `server/discover` request. [Boundary](docs/UNIVERSAL_ADAPTER.md). Universal `adapter-check` stays **NOT_ATTEMPTED** with no network/process effects; no user URL, arbitrary worker, OAuth, tool calls or external targets. **80-path package** unchanged. Independent security review #43 and beta #59 still pending.

## M4-B6-F — incremental own staging SSE cancellation

- **M4-B6-F — DONE (owned localhost only):** [Issue #94](../../issues/94), [merged PR #95](../../pull/95), [post-merge main CI #40005050367](../../actions/runs/40005050367): **4/4 PASS, 526/526 tests/job, 0 failed/skipped**. Incremental UTF-8/SSE parsing (max **8192-byte partial frame**, **32768-byte total**), split CRLF, chunked oversized response rejection, abort after headers/log/final and **TCP socket-close acknowledgements** before reporting cleanup; unconfirmed closure fails closed. [Safety and bounds](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md). **80-path package** retained and R2/R5 release checks unchanged; no external MCP targets, OS sandbox or independent security certification.

## M4-B6-E — bounded first-party request-scoped SSE

- **M4-B6-E — DONE (finite first-party SSE only):** [Issue #91](../../issues/91), [merged PR #92](../../pull/92), [post-merge CI #40001080374](../../actions/runs/40001080374): **4/4 PASS, 510/510 tests/job, 0 failed/skipped**. Fixed request-related logging notice, SSE comments/keepalive, multiline data, HTTP fragment reassembly and strict rejection of unsolicited requests, missing/duplicate final, malformed UTF-8/events and excess notification/comment budgets. [Explicit narrow limits](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md). Preserved exact **80-path package inventory** and unchanged existing R2/R5 release gates. **Not** a general MCP client, OS sandbox, complete spec certification, real user-server authorization or npm publication.

## M4-B6-D — first-party modern protocol negative controls

- **M4-B6-D — DONE (narrow first-party protocol regression):** [Issue #88](../../issues/88), [merged PR #89](../../pull/89), [post-merge main CI #39996632533](../../actions/runs/39996632533): **4/4 PASS, 488/488 tests/job, 0 failed/skipped**. Exact HTTP/JSON-RPC distinctions for HeaderMismatch 400/-32020, UnsupportedProtocolVersion 400/-32022 with bounded accurate version metadata, MethodNotFound 404/-32601, duplicate headers, one-request limit and invalid SSE. [Limits](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md). Exact reviewed package inventory **80** paths; no remote user targets, full MCP conformance or independent audit. [External-target RFC #21](../../issues/21) stays OPEN.

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
- **R5-C independent assessor handoff refresh — DONE, PREPARATION ONLY:** [Issue #135](../../issues/135), [PR #136](../../pull/136) merged; [post-merge main CI #40117457697](../../actions/runs/40117457697) **4/4 PASS, 681/681 tests/job**, 0 failed/skipped. The guide describes the actual **80-path** candidate archive, reviewed public SHA, explicit offline reviewer commands and missing human sign-off. It does **not** fulfill R5-B #43; no release, external target or certification.
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
