# Product roadmap and progress

> **Mission:** Build a practical, free and open-source MCP/AI-agent security testing product that helps developers find contract, authorization and unsafe tool-execution mistakes **before deployment**. All future connections to external systems must be explicitly authorized, bounded and isolated. Passing tests is not a security certification.
>
> **Last reviewed:** 2026-10-30 · **Current candidate:** `v0.0.10-rc.1` (not published) · **M4-A accepted:** [Issue #23](../../issues/23), [PR #24](../../pull/24), [CI](../../actions/runs/39925449081) 4/4 PASS; **M4-B remains unauthorized**

This roadmap is the **source of truth for priorities and acceptance criteria**. GitHub Issues track the individual tasks; merged PRs and GitHub Actions runs are the evidence. Version names and milestone scope can change when requirements are better understood. Do not read future milestones as implemented features.

## Where we stand

| Indicator | Verified state | Evidence |
| --- | --- | --- |
| Public independently maintained source | **Done**; MIT license | [LICENSE](LICENSE) |
| First baseline | **v0.0.9**; 243 synthetic tests | [Original CI](../../actions/runs/39852303226) — 4/4 jobs passed |
| Latest candidate in `main` | **v0.0.10-rc.1**, unpublished; M10-A/F toy-agent engineering merged, first external fixture accepted via PR #212, independent-beta acceptance still **PENDING** | [PR #212](../../pull/212), [main CI #1053](../../actions/runs/40687127717): **4/4 PASS** |
| Supported automated test matrix | **Windows + Ubuntu, Node.js 20 + 22** | [CI workflow](.github/workflows/ci.yml) |
| Security boundary model | **DONE**; offline synthetic threat model and future adapter checklist | [Threat model](docs/THREAT_MODEL.md), [PR #9](../../pull/9) |
| Original M1–M3 issue plan | **6/6 original issues complete**; newer M5 external beta gate **OPEN** | [Original issues #2–#7](../../issues?q=is%3Aissue); [open gate #59](../../issues/59) |
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
| **M7 — Usable offline adopter onboarding** | Plain-language first-run guide, dual-transport fictional walkthrough, local beta tools and volunteer handoff | **ENGINEERING DONE — M7-A through M7-U; independent evaluation NOT VERIFIED** | [PR #188](../../pull/188), [#189](../../pull/189), [#190](../../pull/190), [#191](../../pull/191), [#192](../../pull/192), [#193](../../pull/193), [#194](../../pull/194) | Synthetic and documentation CI 4/4; genuine independent user feedback remains [M5-06 #59](../../issues/59) |
| **M8 — Offline adopter safety and fixture contributions** | Dual-transport source-only smoke, human-readable first run, and inert fixture-only intake | **M8-A through M8-R engineering merged; M8-S/T/U MERGED (PR #203, PR CI 4/4; post-merge not separately verified)** | [PRs #197–#202](../../pulls?q=is%3Apr+is%3Amerged), fixture-only guide | Four-job CI + reviewed synthetic contracts; no claim of live injection defense |
| **M9 — Symbolic prompt-injection contract evaluation** | First-party inert evaluator and separately labeled author-supplied event traces | **ENGINEERING DONE M9-A through M9-L; no real agent observed** | [#204](../../issues/204), [RFC](.github/M9_SYMBOLIC_INJECTION_RFC.md) | 4/4 CI and independently reviewed boundary; real-agent execution not authorized |
| **M10 — First-party toy-agent method-call evaluation** | Deterministic in-memory agent/gateway, state and method-call witness, not real LLM execution | **ENGINEERING ACCEPTED M10-A through M10-I; not a real agent** | [Issue #221](../../issues/221), [Guide](.github/M10_TOY_AGENT_EXCHANGE.md) | Four-job PR CI and real in-memory deny evidence; no real external MCP testing |
| **M11 — Owned loopback tool-result trust boundary** | Separate first-party discovery and disposable MCP-shaped tool response over real IPv4 loopback, then stateful toy gateway | **M11-A through M11-U ENGINEERING ACCEPTED; no external MCP or real agent** | [#228](../../issues/228), [#230](../../issues/230), [#232](../../issues/232), [#234](../../issues/234), [#236](../../issues/236), [#238](../../issues/238), [#240](../../issues/240), [guide](.github/M11_INFLIGHT_REVOCATION.md) | Exact local wire/deny controls, socket cleanup, 4/4 CI and independently verified push CI |
| **M12 — Source-owned modern MCP protocol subset** | First-party 2026-07-28 metadata/header and tools/list/call wire safety | **M12-A through M12-R ENGINEERING ACCEPTED; no external targets or real agent** | [#242](../../issues/242), [#244](../../issues/244), [#246](../../issues/246), [#248](../../issues/248), [#250](../../issues/250), [#255](../../issues/255), [guide](.github/M12_MODERN_MCP_SMOKE.md) | Strict modern header/body checks, 4/4 CI + main push acceptance; **not full MCP conformance** |
| **M13 — Self-service fictional beta handoff** | Frozen source revision, correct combined review card and pinned volunteer instructions | **M13-A/B/C ENGINEERING ACCEPTED; independent beta still OPEN** | [#258](../../issues/258), [PR #259](../../pull/259), [handoff](.github/BETA_VOLUNTEER_HANDOFF.md) | Matched 4/4 PR and main CI; independent consenting tester report remains [#59](../../issues/59) |
| **M14 — Optional first-party capability tour** | Four deeper synthetic demonstrations for volunteers | **ENGINEERING ACCEPTED — first-party source only** | [#261](../../issues/261), [PR #262](../../pull/262), [main CI #40846079531](../../actions/runs/40846079531) | PR and main CI 4/4; genuine beta #59 separate |
| **M15 — Owned deliberately vulnerable MCP lab** | Differential intentionally susceptible/guarded toy agent and local server, observed effects | **ENGINEERING ACCEPTED — 4/4 PR + 4/4 main CI** | [#263](../../issues/263), [PR #264](../../pull/264), [main CI #40857820827](../../actions/runs/40857820827), [guide](.github/M15_OWNED_REDTEAM_LAB.md) | One synthetic unsafe effect witnessed + both defenses; real-agent tests remain separate |
| **M16 — Owned authority/replay/response-tamper differential** | Four owned attack-family and permission-grant differential controls | **M16-A through M16-G ENGINEERING ACCEPTED; no real agent** | [#266](../../issues/266), [#270](../../issues/270), [PR #271](../../pull/271), [main CI #40875297476](../../actions/runs/40875297476) | 7/7 earlier attack witnesses + 9/9 guarded/permissive grant comparisons; independently verified 4/4 CI |

| **M17 — Concurrent replay race on owned MCP-shaped HTTP** | Deterministic two-request overlap exposes check-then-commit double effect and proves per-key pre-effect reservation | **ENGINEERING ACCEPTED — PR + main CI 4/4** | [#273](../../issues/273), [PR #274](../../pull/274), [main CI #40886331660](../../actions/runs/40886331660), [guide](.github/M17_CONCURRENT_REPLAY_RACE.md) | 3/3 first-party witnesses, 4/4 PR + 4/4 main CI; real-agent evidence separate |

| **M18 — Measurable symbolic classification QA** | Exhaustive authored profile/event combinations and separate rule oracle; three-way alert/clear/abstain confusion accounting | **ENGINEERING ACCEPTED — PR + main CI 4/4** | [#276](../../issues/276), [PR #277](../../pull/277), [main CI #40908374045](../../actions/runs/40908374045), [guide](.github/M18_SYMBOLIC_EVALUATION_BENCHMARK.md) | 32/32 symbolic reference cases, TP/FP/FN/TN and bad baselines; no external-efficacy inference |

| **M19 — Single first-party assessment summary** | Source-separated one-command integration of all owned-wire and symbolic evidence without falsely aggregating real attacks | **ENGINEERING ACCEPTED — PR + main CI 4/4** | [#279](../../issues/279), [PR #280](../../pull/280), [main CI #40912510667](../../actions/runs/40912510667), [guide](.github/M19_ASSESSMENT_SUMMARY.md) | Five verified report gates / 23 wire + 32 symbolic source-owned cases; independent beta pending |

| **M20 — Privacy-minimal beta intake preflight** | Bounded stdin JSON; categorical consistency checks, no-echo and explicit human provenance requirement | **M20-A/B/C ENGINEERING ACCEPTED — PR/main CI 4/4** | [#282](../../issues/282), [PR #283](../../pull/283), [main CI #40919664479](../../actions/runs/40919664479), [guide](.github/M20_BETA_INTAKE_PREFLIGHT.md) | Human triage only, no independent beta claim; 4/4 PR + 4/4 main CI verified |

| **M21 — Bounded multi-report beta triage** | Strict offline batch of 2–4 M20 categorical self-reports, repeated-pattern flags and conservative attribution | **ENGINEERING ACCEPTED — PR/main CI 4/4; beta not independently verified** | [#285](../../issues/285), [PR #286](../../pull/286), [main CI #40926082743](../../actions/runs/40926082743), [guide](.github/M21_BETA_BATCH_TRIAGE.md) | Categorically scoped triage, no verified unique testers, no untrusted input echo |

| **M22 — Finite-action contributed security scenarios** | Reviewed enum-only JSON fixtures auto-discovered by a fixed source-only runner | **ENGINEERING ACCEPTED — PR/main CI 4/4** | [#287](../../issues/287), [PR #291](../../pull/291), [main CI #40941967881](../../actions/runs/40941967881), [guide](.github/M22_FINITE_SCENARIO_CONTRIBUTIONS.md) | 8/8 source-owned cases, ninth auto-discovered, forged expected decisions and malformed files fail closed |

| **M23 — Community-requested attack-family demonstration** | Fixed toy controls for tool-description rug pulls, multi-server authority crossing and error-channel leaks | **ENGINEERING ACCEPTED — PR + main CI 4/4** | [#288](../../issues/288), [PR #289](../../pull/289), [main CI #40930780325](../../actions/runs/40930780325), [guide](.github/M23_COMMUNITY_ATTACK_FAMILIES.md) | 10/10 source-owned comparisons + negative mutations; no live MCP/model certification |

| **M24 — Stdin-only adopter adapter preflight** | No-file shell pipeline for validating portable stdio/HTTPS project descriptors and five built-in fictional controls | **ENGINEERING ACCEPTED — PR/main CI 4/4** | [#293](../../issues/293), [PR #294](../../pull/294), [main CI #40945169177](../../actions/runs/40945169177), [guide](.github/M24_STDIN_ADAPTER_PREFLIGHT.md) | 1281/1281 Windows20 PR tests; 4/4 PR + exact main CI; no real target contact |

| **M25 — Policy-version drift + logical gate restart** | Community request: stale approval cannot authorize delayed execution after policy change or gate-generation replacement | **ENGINEERING ACCEPTED — PR/main CI 4/4** | [#296](../../issues/296), [PR #297](../../pull/297), [main CI #40950548884](../../actions/runs/40950548884), [guide](.github/M25_APPROVAL_POLICY_EPOCH.md) | 5/5 owned-wire scenarios, protected stale denial and fresh reapproval; no real OS restart claim |

| **M25-D — Actual disposable gate OS process crash/relaunch** | Parent-owned IPC and real process exit distinguish stale-approval rejection from unsafe reexecution | **ENGINEERING ACCEPTED — PR/main CI 4/4** | [#299](../../issues/299), [PR #300](../../pull/300), [main CI #41008307216](../../actions/runs/41008307216), [guide](.github/M25D_OS_PROCESS_RESTART.md) | 3/3 observed toy cases, negative mutations, independent PR/main CI; real durability unverified |

| **M26 — Disposable cross-process spent-key ledger** | Guarded spent-key claim survives owned OS child crash; two concurrent workers race on exclusive marker; deliberately transient comparator exposes replay | **ENGINEERING ACCEPTED — PR/main CI 4/4** | [#302](../../issues/302), [PR #303](../../pull/303), [main CI #41013215418](../../actions/runs/41013215418), [guide](.github/M26_CROSS_PROCESS_LEDGER.md) | Three OS+disk scenarios witnessed; separately checked main 4/4; no power-loss durability claim |

| **M27 — In-doubt effect crash / recovery boundary** | Disposable child forced to exit after fsynced pending reservation, with/without observed synthetic effect; guarded quarantine vs unsafe retry | **ENGINEERING ACCEPTED — 4/4 PR + 4/4 main CI** | [#305](../../issues/305), [PR #306](../../pull/306), [main CI #41015098532](../../actions/runs/41015098532), [guide](.github/M27_INDOUBT_CRASH_RECOVERY.md) | Three witnessed owned crash cases; at-most-once quarantine not exactly-once recovery |

| **M28 — In-doubt recovery ambiguity** | Same fsynced pending marker across two hidden fictional effect worlds; blind retry/skip vs quarantine and forged proof | **ENGINEERING ACCEPTED — PR/main CI 4/4** | [#308](../../issues/308), [PR #309](../../pull/309), [main CI #41017290535](../../actions/runs/41017290535), [guide](.github/M28_INDOUBT_RECOVERY_AMBIGUITY.md) | 8/8 first-party cases, exact loss/duplicate and quarantine witnesses; no external recovery |

| **M29 — Signed receipt authenticity ≠ verified outcome** | Real ephemeral Ed25519 signatures with exact operation/marker/epoch binding, invalid and replayed receipt controls, and deceptive signed outcome comparison | **ENGINEERING ACCEPTED — PR/main 4/4** | [#311](../../issues/311), [PR #312](../../pull/312), [main CI #41020234312](../../actions/runs/41020234312), [M28/M29 guide](.github/M28_INDOUBT_RECOVERY_AMBIGUITY.md) | 12/12 first-party signed cases, guarded quarantine; external signer never verified |

| **M30 — Two signed claims ≠ effect provenance** | Ephemeral dual Ed25519 signatures, signer-key diversity, false consensus and quarantine after conflicting or deceptive outcomes | **ENGINEERING ACCEPTED — PR/main 4/4** | [#314](../../issues/314), [PR #315](../../pull/315), [main CI #41023181163](../../actions/runs/41023181163), [guide](.github/M30_DUAL_SIGNER_QUORUM.md) | 14/14 source-owned crypto cases, PR/main CI 4/4; no independently verified effect provenance |
| **M31 — Independent parent OS observation ≠ remote effect provenance** | Seven first-party disposable child/parent disk scenarios; false IPC claims, corrupted and drifting marker, conservative quarantine | **ENGINEERING ACCEPTED — PR/main 4/4** | [#317](../../issues/317), [PR #319](../../pull/319), [main CI #41025873482](../../actions/runs/41025873482), [guide](.github/M31_PARENT_OS_EFFECT_EVIDENCE.md) | Independent first/second OS reads, real scratch cleanup, exact negative-mutation oracle; PR + matched main CI 4/4 required |

| **M32 — Deterministic OS path-swap TOCTOU** | Eight first-party IPC-barrier marker-swap/absence/anomaly cases exposing size-only false confidence | **ENGINEERING ACCEPTED — PR/main 4/4** | [#320](../../issues/320), [PR #321](../../pull/321), [main CI #41027413776](../../actions/runs/41027413776), [guide](.github/M32_OS_PATH_SWAP_TOCTOU.md) | 8/8 first-party OS cases; 1337/1337 Ubuntu20 tests; PR and exact main CI 4/4, no external effect proof |

| **M34 — Self-service existing MCP config import** | Import one inert Claude-style or VS Code-style server entry into existing validate-only adapter descriptor | **ENGINEERING ACCEPTED — PR/main 4/4** | [#323](../../issues/323), [PR #324](../../pull/324), [main CI #41030636334](../../actions/runs/41030636334), [guide](.github/M34_CLIENT_CONFIG_IMPORT.md) | Default private no-echo report, explicit local export, M24 roundtrip, exact 4/4 PR and main CI; no real server contact |
| **M35 — Explainable offline report** | Human-readable M34/M24 onboarding evidence with separate fictional controls and NOT TESTED scope | **ENGINEERING ACCEPTED — PR/main 4/4** | [#326](../../issues/326), [PR #327](../../pull/327), [main CI #41033817795](../../actions/runs/41033817795), [getting started](docs/GETTING_STARTED.md) | 1350/1350 Ubuntu20; no real-target scores, exact 4/4 PR/main CI, bounded 240-file custody |
| **M36 — Local offline distribution doctor** | Source-checkout command reuses M6-J source SHA-256 custody and temporary offline npm pack/install | **ENGINEERING ACCEPTED — PR/main CI 4/4; release blocked** | [#330](../../issues/330), [PR #331](../../pull/331), [main CI #41036858127](../../actions/runs/41036858127), [readiness](docs/RELEASE_READINESS.md) | 80 packaged + 240 fully hashed excluded files, 1353/1353 Ubuntu20; no publication approval |
| **M37 — One-command source-only first run** | M8 two-transport synthetic smoke + M35 two-format fictional importer, readable text/JSON and private next-step instructions | **ENGINEERING ACCEPTED — PR/main CI 4/4** | [#335](../../issues/335), [PR #336](../../pull/336), [main CI #41050360958](../../actions/runs/41050360958), [getting started](docs/GETTING_STARTED.md) | 1358/1358 Ubuntu20; no real MCP/user config; 240/240 M6-J custody; exact 4/4 PR and main CI |
| **M38 — Independent fictional scanner comparisons** | Export two fixed clean/mixed tool-result pairs and classify self-reported third-party rule detector outcomes | **ENGINEERING ACCEPTED — PR/main CI 4/4; first external scanner self-reports received (v0.2.0/v0.3.0), not reproduced** | [#338](../../issues/338), [PR #339](../../pull/339), [main CI #41061833450](../../actions/runs/41061833450), [volunteer #329](../../issues/329), [guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md) | Four fixed fictional cases; 1363/1363 Ubuntu20; exact 4/4 PR/main; no scanner execution or beta claim |


## M43 — first external M38 scanner feedback (PR #346 merged, CI 4/4; self-reported external results)

- [Firstwatch v0.2.0 report](../../issues/329#issuecomment-6529063336) and
  [v0.3.0 follow-up](../../issues/329#issuecomment-6529886202) from
  external maintainer `dave8172` report the **same four fixed M38 cases**
  at source SHA `39e411a7926a5acf6e5abf392fcdfa0de2db59ec`.
- For **each** reported version separately, author-label comparison is
  **TP=0, FP=0, FN=2, TN=2, ERROR=0**. Both clean rows were classified clean;
  both mixed (injection-labeled) rows were also classified clean.
  This is **external contributor self-report**, not our execution, verification,
  independent beta #59, or population-level accuracy evidence.
- Version pins: [firstwatch 0.2.0](https://github.com/dave8172/firstwatch/commit/6bc3093a5f2731e2136515470bb14059507bda95)
  and [firstwatch 0.3.0](https://github.com/dave8172/firstwatch/commit/719f8264bde20b290c42db19907a47098a67e75c).
  The contributor reports follow-up rule changes, JSON value scanning, a
  careful action-confirmation mode and inclusion of both source fixtures in
  their own regression scorecard; these product claims remain attributed.
- **Methodological guardrail:** two versions of the *same scanner* are not
  two independent detectors. Do not feed them as two unrelated scanner IDs
  into M39–M42 and interpret repeated misses as cross-product agreement.
- [Follow-up #345](../../issues/345): explicit-agent-addressed variants,
  benign business-text negatives, JSON tool-result representation and
  detection-versus-action-authorization should be reviewed separately.
  Original M38 four-case baseline must remain unchanged.
- M43 source regression replays the **published four classifications** through
  the existing local evaluator. It does not install or execute Firstwatch.

## M39 — multi-detector self-reported fictional classification (PR #341 merged; CI 4/4)

- Local `--compare-detector-batch` accepts 1–8 sanitized scanner aliases and strict 16 KiB JSON with the four existing M38 cases; reports per-detector/per-case TP/FP/FN/TN/ERROR relative only to author labels.
- [PR #341](../../pull/341) merged after 4/4 PR CI; no new scanner runs, real targets or provenance attestation. Two versions of the same scanner are not two independent vendors or detectors. Post-merge `main` CI not independently verified.

## M40 — local reviewer queue for independent fictional detector feedback (PR #342 merged; CI 4/4)

- Extend the existing M39 strict four-case, 1–8-scanner batch format with `--review-detector-batch`; no new network, files, scanner process or real MCP target.
- Emit categorized FN/FP/ERROR review actions with the approved case IDs and sanitized scanner aliases; retain overall TP/FP/FN/TN/ERROR counts.
- Reuse source-owned M38 labels and M39 validation; reject duplicate keys, malformed/oversized stdin and unsupported CLI arguments without reflecting input.
- Add CLI and source tests plus a contributor walkthrough; independent scanner execution, real-world assurance and publication remain unverified.
- **Engineering merged:** [PR #342](../../pull/342), PR CI 4/4. Post-merge `main` CI was not independently verified for this milestone; no real scanner or beta conclusion.

## M41 — comparison of self-reported detector disagreements (PR #343 merged; CI PASS)

- Source-only `--analyze-detector-disagreements` consumes the existing M39 strict batch JSON and returns per-case FLAGGED/NOT_FLAGGED/ERROR votes, split decisions, and repeated injection misses.
- ERROR observations abstain. Consensus is a vote count, not a ground truth judgment. A `REPEATED_MISS` occurs when at least two self-reported scanners did not flag an author-labeled injection.
- The fixed four fictional cases, one-to-eight scanner aliases, bounded 16 KiB stdin, no scanner execution, no target contact and no new packaged assets remain unchanged.
- New tests cover split votes, tie, repeated misses, single-detector case, malformed JSON, invalid UTF-8, and CLI argument denial.
- Engineering merged: [PR #343](../../pull/343), PR CI success. Post-merge `main` CI not independently verified; external scanner results, beta, audit and authorization remain separate.

## M42 — deterministic fictional-detector issue priorities (PR #344 merged; CI 4/4)

- Implement `--prioritize-detector-issues` on the same strict, offline M39 four-case batch.
- Prioritize repeated self-reported injection misses (two or more), single misses, false positives, and scanner-error-only cases, with deterministic tie breaks and stable approved case IDs.
- Output only categorized local-review recommendations; these are **review-order priorities**, not real vulnerability severity, external efficacy measurements or verified results.
- Preserve existing 16 KiB bounded stdin, strict duplicate-free JSON, scanner-count/case-order controls, zero target contact, and frozen package/source custody.
- Source/CLI regression covers repeated misses, counts, deterministic sorting, error precedence, no-findings case, malformed JSON, invalid UTF-8 and extra-flag denial.
- Engineering merged: [PR #344](../../pull/344), PR CI 4/4. Post-merge `main` CI not separately verified; independent beta, external execution and publication remain separate.

## M44 — new public contextual scanner contrasts (PR #347 merged; CI 4/4)

- Extend the source-only, opt-in fictional-detector fixture workflow with a **separate six-row** contextual contrast profile: normal human-to-human email instructions, explicit AI-addressed tool-result task switches and prerequisites, and clean/mixed JSON tool results.
- Export via `--export-context-contrasts`; accept strict six-row, 4096-byte UTF-8 report via `--triage-context-contrasts` and calculate TP/FP/FN/TN/ERROR **only relative to author-written labels**.
- M38 original four cases and M39–M42 formats remain unchanged. M44 is a public reviewed test set, **not held-out**, a scanner execution, a proof of prevented tool calls, or an independent security beta.
- Zero real targets, credentials, network, remote scanner calls or additional source paths; use current source-only script and test files.
- Engineering merged: [PR #347](../../pull/347), PR CI 4/4. Post-merge `main` CI not separately verified. Follow-up [#345](../../issues/345) retains separate detection-vs-enforcement investigation.

## M45 — authorization independent of hypothetical detector outcomes (PR #348 merged; CI 4/4)

- `node tools/toy-agent-exchange.mjs --blindspot-gate-matrix` adds **15 deterministic first-party in-memory trials** (3 hypothetical detector labels × 5 fixed toy-agent gateway modes). The detector labels are **source-owned hypotheses**, not output from Firstwatch or any independent scanner.
- All forbidden toy method calls are observed and denied by the parent-owned in-memory gateway in each hypothesis; the report checks that gateway decisions are invariant to the detector label and fictional protected effects remain zero. A fault-mode `FAIL` means a denied forbidden call was detected, not a protected side effect.
- [PR #348](../../pull/348) merged after PR CI 4/4. This is **not a real LLM, third-party agent, filesystem permission boundary, authorized external MCP test, real scanner accuracy result or product certification**. Post-merge `main` CI not separately verified.
- Next product gate: separately approved and isolated evaluation with genuine agent/tool execution and independent side-effect observation. Owner authorization and first-party staging controls must be established before expanding external contact; see [#21](../../issues/21), [#59](../../issues/59) and [#345](../../issues/345).

## M46 — parent-bound instruction origin and toy scope enforcement (PR CI pending)

- Add `--context-authority-matrix` to the **existing source-only M10 toy
  gateway**, exercising 11 fixed, reviewed origin/scope/action cases across
  three hypothetical scanner labels (33 in-memory trials).
- A tool result, JSON tool field or human email claiming "owner approved"
  cannot create a permission: only source-authored parent-owned metadata
  drives the toy gateway. Explicit owner grants allow only matching
  fictional scoped actions; wrong/absent grants deny.
- Preserve no-arg M10 five-case output and M45 `--blindspot-gate-matrix`.
  Count authorized toy effects and denied requests separately. No scanner,
  real model, filesystem, MCP endpoint, network or credential operation.
- **Important limitation:** all provenance labels and grants are supplied
  by our test code, not cryptographically verified, and allowed effects
  exist only in JavaScript memory. This is not proof of a real agent's
  privilege separation or provenance integrity.
- CI acceptance requires four OS/runtime jobs; post-merge `main` CI,
  real integration and beta/audit authorization remain distinct gates.
  [Context testing #345](../../issues/345) tracks later work.

We will not claim a release is production-ready merely because a synthetic test suite passes.

## M38-A/B/C — four-case external rule-scanner comparison (engineering accepted)

- [Issue #338](../../issues/338), external opt-in
  [comparison #329](../../issues/329): source-only
  `tools/fixture-batch-preflight.mjs --export-detector-cases`
  emits **exactly four fixed fictional text records** (two
  BENIGN/INJECTION pairs); every text is checked against existing
  reviewed public source fixture descriptions. No scanner, model
  or MCP target is run.
- **M38-A:** the historical no-argument static fixture batch command
  stays unchanged; explicit export mode is the only operation
  revealing the published fictional text.
- **M38-B:** `--triage-detector-results` consumes 2048-byte bounded,
  duplicate-free strict UTF-8 JSON over stdin, exactly four ordered
  `FLAGGED | NOT_FLAGGED | ERROR` classifications. Reports
  TP/FP/FN/TN/ERROR relative to author labels **only**. Unknown
  outcomes are errors, not successes. Forged authority fields,
  accessors, sparse arrays, wrong IDs and extra args fail closed;
  stdout has only categorical findings, never user input.
- **M38-C:** contribution guide, README, CONTRIBUTING and roadmap
  include local Windows/Linux/macOS commands and voluntary sanitized
  independent feedback instructions. At initial M38 engineering acceptance,
  no external results had been observed; later Firstwatch self-reports are
  documented under M43. Scanner output remains **not authenticated**, and
  four author-labeled samples are not population-level effectiveness evidence.
- **Source custody:** existing tool/test/docs modified only, no
  new file paths at M6-J 240/240 SHA-256 custody cap; 241st file
  denied. Unpublished npm candidate remains frozen 80 paths.
- **Engineering accepted 2026-10-30:** [PR #339](../../pull/339)
  [PR CI #41061123812](../../actions/runs/41061123812)
  **4/4 PASS** Windows/Ubuntu Node20/22; Ubuntu20
  **1363/1363 tests**, 0 failed/skipped. Squash-merged SHA
  `39e411a7926a5acf6e5abf392fcdfa0de2db59ec`;
  independently [main CI #41061833450](../../actions/runs/41061833450)
  **4/4 PASS on the identical SHA**. [Issue #338](../../issues/338)
  closed for first-party engineering only. [Voluntary scanner
  comparison #329](../../issues/329) remains OPEN awaiting
  real independently submitted four-row classifications.
  External beta #59, real-target authorization #21 and
  independent audit #43 remain OPEN.

## M37-A/B/C — zero-config adopter first run (engineering accepted)

- [Issue #335](../../issues/335). Source-only
  `node tools/adapter-first-run-view.mjs --self-check`
  (human readable) or exact `--self-check-json` (fixed schema)
  merges M8 two-transport fictional adapter smoke (2/2) with
  **two static M34/M35 client-format examples** (2/2, stdio/HTTPS).
  Both re-evaluate the same five unrelated first-party fictional
  controls, **not a scanner detection accuracy rate**.
- **M37-A:** no user stdin/config, executable, credentials, remote
  MCP, real LLM, network connection, DNS or filesystem side effects.
  Output provides the exact M35 local private stdin route and
  separate M36 local release doctor.
- **M37-B:** direct strict source-owned report/arrays/transport
  validation refuses extra approval/status fields, accessors,
  sparse arrays, mismatched expectations and unauthorized CLI flags.
  Persistent `riskRating:NOT_SCORED`, independent beta, audit,
  release and target-authority flags false.
- **M37-C:** reuse existing `tools/adapter-first-run-view.mjs`
  and `test/m8-first-run-view.test.mjs`, plus README, roadmap and
  getting started. **No new excluded-source files** at M6-J
  240/240 SHA-256 custody limit; 241st-file denial remains.
  Frozen unpublished 80-path npm candidate has no new paths
  or new release permission.
- **Accepted 2026-10-30:** [PR #336](../../pull/336)
  [PR CI #41049886879](../../actions/runs/41049886879)
  **4/4 PASS** Windows/Ubuntu Node20/22, Ubuntu20
  **1358/1358** tests (0 failures, 0 skipped). Squash-merged
  exact SHA `84a6e7d487e0dd022a4cbd7a748fa2703fc25743`;
  independent [main CI #41050360958](../../actions/runs/41050360958)
  **4/4 PASS on identical SHA**. [Issue #335](../../issues/335)
  closed for first-party engineering only. External beta #59,
  real MCP target authority #21 and independent audit #43 remain OPEN.

## M36-A/B/C — local distribution doctor (engineering accepted)

- [Issue #330](../../issues/330) tracks a source-only
  `node tools/reviewer-handoff.mjs doctor` command. It reuses the
  existing M6-J local source inventory, temporary offline npm
  tarball + install validation, and SHA-256 comparison, without
  expanding the unpublished npm 80-path package.
- **M36-A:** bounded categorical JSON-v1 local preflight;
  80 packaged file hashes, 240 fully indexed excluded files,
  actual local pack/install evidence and local SHA-256 indexes.
  It must never claim independently anchored Git, signing,
  real MCP target security or publication approval.
- **M36-B:** same existing source-only tool/test paths updated,
  no extra .github/test/tools files. Deny extra arguments and
  forged approval attempts. M6-J remains 240 maximum and
  **241st-entry denial**; lifecycle script restrictions retained.
- **M36-C:** [README](README.md),
  [getting started](docs/GETTING_STARTED.md),
  [release readiness](docs/RELEASE_READINESS.md); technical
  [PR #331](../../pull/331) [PR CI #41036321059](../../actions/runs/41036321059)
  **4/4 PASS**; squash merge SHA
  `f13281d100634b9512ff698316b84927d1cec3f5`;
  independent [main CI #41036858127](../../actions/runs/41036858127)
  **4/4 PASS on exact same SHA**. Ubuntu20 1353/1353 tests.
  [Issue #330](../../issues/330) closed for engineering only.
- **Publication BLOCKED:** external beta #59, audit #43,
  real-target authorization #21, and explicit owner release
  decision remain independent requirements.

## M35-A/B/C — explainable offline report, not a vulnerability scan (engineering accepted)

- [Issue #326](../../issues/326). Source-only
  `node tools/m35-offline-onboarding-report.mjs` accepts the
  existing M34 one-server client-config format over bounded stdin.
  Exact `--json` selects machine-readable output; default is an
  English human-readable report with independent headings:
  descriptor preflight, five **fixed first-party fictional**
  controls, untested security dimensions, and next actions.
- **M35-A:** Risk always `NOT_SCORED`; no real MCP server, LLM,
  external effect, TLS/DNS/SSRF, credential handling or owner grant
  evaluated. Valid shape exits 0; invalid/unsupported exits 2,
  with controls explicitly **NOT_EVALUATED**.
- **M35-B:** Source-owned categorical text, no user name/URL/command,
  forged saved report rejected by private in-process issued-report
  identity. Negative matrix: fraudulent approval/severity fields,
  env/headers/secrets, malformed UTF-8/JSON, duplicate key, TTY,
  oversize, accessor/prototype/sparse inputs and unsupported options.
- **M35-C:** [copy-paste guidance](docs/GETTING_STARTED.md),
  [README](README.md), this roadmap. Exactly two new excluded-source
  files (tool + test) fill the existing M6-J 240-file custody cap,
  without weakening complete SHA-256 inventory or its 241st-file
  overflow denial. Unpublished npm 80-path candidate unchanged.
- **Accepted 2026-10-30:** [PR #327](../../pull/327)
  [PR CI #41033447378](../../actions/runs/41033447378)
  **4/4 PASS** (Windows/Ubuntu, Node20/22);
  Ubuntu20 **1350/1350 tests**, 0 failures/skips.
  Squash merge SHA `a5b9245178ce375dbcd08bd0eb82477c8760d8ac`;
  independently [main CI #41033817795](../../actions/runs/41033817795)
  **4/4 PASS on exact same SHA**. [#326](../../issues/326)
  closed for engineering only. The separate external gates #21
  (target authority), #43 (audit) and #59 (independent beta) remain OPEN.

## M34-A/B/C — common MCP client config to inert descriptor (engineering accepted)

- [Issue #323](../../issues/323): source-only stdin bridge
  `node tools/m34-client-config-bridge.mjs` converts exactly one narrowly
  supported `mcpServers` or `servers` entry into an inert stdio/HTTPS
  `validate-only` descriptor, then invokes M24 preflight and five
  first-party fictional controls.
- **M34-A:** strict 4 KiB/8-second stdin, UTF-8 and duplicate-key deny,
  no input file read, zero target/process contact, no env/headers/
  credentials/active permissions, generic no-echo default report.
- **M34-B:** exact `--emit-descriptor` opt-in emits locally supplied
  nonsecret data to stdout for private user-controlled redirection.
  Cross-transport M24 roundtrip, schema and injection negatives,
  getter/hole/unknown-field refusals, no real-agent conclusions.
- **M34-C:** [scope and copy/paste](.github/M34_CLIENT_CONFIG_IMPORT.md)
  and README, source-only code outside unpublished 80-path npm
  candidate; M6-J full indexed SHA-256 excluded-source inventory and
  241st-entry overflow denial preserved.
- **Accepted 2026-10-30:** [PR #324](../../pull/324)
  [PR CI #41030205354](../../actions/runs/41030205354)
  **4/4 PASS** (Ubuntu/Windows Node20/22), exact squash merge SHA
  `57e8a1ec962448af22015f50a330abf48086c843`.
  Independent [main push CI #41030636334](../../actions/runs/41030636334)
  **4/4 PASS on same SHA**; Ubuntu20 **1344/1344 tests**.
  [Issue #323](../../issues/323) closed for first-party engineering
  scope only. Independent beta #59, real target approval #21
  and external security audit #43 remain open.

## M32-A/B/C — deterministic first-party path-swap before read (engineering accepted)

- [Issue #320](../../issues/320): source-only fixed
  `node tools/m32-path-swap-lab.mjs`, eight disposable OS child cases.
  Parent observes initial bytes and metadata; an owned child performs a
  deterministic IPC-barrier mutation before the next parent file read.
- **M32-A:** same-size marker rewrite, removal, creation, corrupt or
  oversized marker, unexpected extra file, and two stable controls.
  Two changed/invalid cases still pass naive size-only checks; an
  honest post-barrier observer reports changed or invalid evidence.
- **M32-B:** independent per-row oracle checks parent observations,
  metadata presence, failed size-only comparison, child process PID and
  clean exit, barrier order, temp cleanup and all guarded QUARANTINE.
  Mutation controls reject false effects, release, hidden drift,
  getter-bearing, missing/reordered rows and raw-input echo.
- **M32-C:** [limits](.github/M32_OS_PATH_SWAP_TOCTOU.md), README,
  80-path frozen unpublished npm candidate unchanged, M6-J complete
  SHA-256 excluded-source custody and overflow deny kept.
  Acceptance requires PR CI **4/4** then separately matched main
  push CI **4/4**. No real MCP, Stable Bridge or business-effect proof.
- **Accepted 2026-10-30:** [PR #321](../../pull/321)
  [PR CI #41026392937](../../actions/runs/41026392937) **4/4 PASS**,
  squash merged at exact main SHA
  `0f66d2af9ca882cff8179fa06e799f28a7c548fb`, and independent
  [main push CI #41027413776](../../actions/runs/41027413776)
  **4/4 PASS on that same SHA**. [#320](../../issues/320) closed.
  This remains source-only OS observation, not external attestation,
  real agent security evaluation, exactly-once or release approval.


## M31-A/B/C — independent parent OS scratch observations (engineering accepted)

- [Issue #317](../../issues/317) adds a source-only zero-argument
  owned child/parent runner. Each of seven fixed scenarios uses a new
  isolated temporary directory; worker may write and fsync an inert
  fixed marker or make a false IPC claim. Parent reads disk after the
  worker exits; it never accepts IPC as authenticated effect truth.
- **M31-A:** cases include truthful marker/absence, false committed
  and absent claims, corrupt marker, and marker removal/rewrite between
  independent parent disk observations. A naive claim-only hypothetical
  resolver would lose one unperformed fictional action or duplicate
  one already-marked fictional action.
- **M31-B:** independent exact row oracle, malicious-getter, sparse
  input and negative mutation controls validate each disk observation,
  process/cleanup witness, case order and unconditional quarantine.
- **M31-C:** [scope limits](.github/M31_PARENT_OS_EFFECT_EVIDENCE.md),
  README, source-only CLI and 80-path unpublished npm package unchanged.
  M6-J hashes the added excluded-source files within its bounded
  240-file index. Acceptance requires PR CI **4/4** followed by
  independently matched main-push CI **4/4**.
- **Engineering acceptance (2026-10-30):** [PR #319](../../pull/319)
  [PR CI #41025402415](../../actions/runs/41025402415) **4/4 PASS**,
  exact merged main SHA `631ac0e5bcc4af94ef5dbeb928d4494937eb6ef9`,
  independently [main CI #41025873482](../../actions/runs/41025873482)
  **4/4 on that SHA**. [Issue #317](../../issues/317) closed.
  The actual OS scratch I/O is not a
  business effect, authenticated independent observer, authorized
  remote MCP connection or exactly-once recovery. #21/#43/#59 OPEN.

## M30-A/B/C — dual-signer agreement still does not prove real effects (engineering accepted)

- [Issue #314](../../issues/314): fixed source-only
  `node tools/m30-dual-signer-illusion.mjs` generates **new ephemeral
  Ed25519 keypairs for each of 14 fictional recovery claims**. It
  verifies two actual cryptographic signatures, two source-owned
  issuer/key anchors, exact operation/marker/epoch binding, time
  windows, single-use nonces and distinct public keys.
- **M30-A:** a deliberately vulnerable signed-quorum-only resolver
  treats two agreeing claims as effect truth. Two separate adversarial
  worlds prove this would **lose an operation** that was never
  performed or **duplicate an effect** already performed. Conflicting
  receipts, signature tampering, rogue signers, one key under two
  aliases, nonce reuse, wrong scope and expiry cannot form a valid
  source-owned cryptographic quorum.
- **M30-B:** independent per-field oracle rejects any false
  crypto acceptance, missed lost/duplicate witness, forged real-effect
  provenance, premature release of quarantine and getter-driven input
  side effects. **Every guarded result remains QUARANTINED**, even
  if two ephemeral first-party signatures verify.
- **M30-C:** [scope guide](.github/M30_DUAL_SIGNER_QUORUM.md),
  README, fixed no-argument CLI, Windows/Ubuntu Node20/22 PR and
  separate post-merge main CI **4/4**. No real independently trusted
  identity, authenticated outcome observation, exactly-once
  reconciliation, user MCP, real files/credentials, model calls,
  telemetry, Stable Bridge or publication. Unpublished 80-file
  package and #21/#43/#59 gates remain unchanged.
  [PR #315](../../pull/315) passed
  [PR CI #41022817744](../../actions/runs/41022817744) **4/4**
  (Windows/Ubuntu Node20/22), merged at exact main SHA
  `77dfbb5bf932797813ba21c266c2519bc455e67a`, and independently
  [main CI #41023181163](../../actions/runs/41023181163) passed
  **4/4 on that same SHA**. M6-J's excluded-source custody grew from
  bounded 224 to **240** files after the actual source count reached
  227; all paths remain hashed and the 241st-file reject control
  passed. This is first-party engineering acceptance only, not proof
  of independent effect truth, trusted signers or real-world release.

## M29-A/B/C — signed outcome authenticity versus trusted effect provenance (engineering accepted)

- [Issue #311](../../issues/311): source-only
  `node tools/m29-signed-receipt-provenance.mjs` generates **ephemeral
  Ed25519 keypairs** and verifies actual signatures over fictional
  operation, marker digest, logical epoch, nonce and outcome fields.
  Private keys never leave the first-party process and are never logged.
- **M29-A:** twelve cases check valid, deceptive-but-valid and
  tampered signatures; wrong operation/marker/epoch, expired receipt,
  rogue signer key, reused nonce and unsigned claims. Guarded policy
  keeps all unresolved operations quarantined without separately
  authenticated **real outcome provenance**; signing does not establish
  the truth of a claimed effect.
- **M29-B:** unsafe signature-only decision explicitly loses one
  unperformed synthetic operation or duplicates one performed effect
  when the source-owned signer lies. Fixed independent oracle rejects
  fabricated verifications, false release, missed loss/duplication and
  hostile accessor-bearing witness input.
- **M29-C:** [M28/M29 security explanation](.github/M28_INDOUBT_RECOVERY_AMBIGUITY.md),
  README, source-only helper with zero CLI args. No real credentials,
  customer file, external MCP, independently trusted signer,
  authenticated business outcome, LLM, Stable Bridge or exactly-once
  guarantee. Frozen unpublished **80-path** candidate unchanged;
  #21/#43/#59 remain OPEN. [PR #312](../../pull/312) passed
  [PR CI #41019901819](../../actions/runs/41019901819) **4/4** and
  merged as exact main SHA `2ff47013ffb1e8cb74923863fce8a03d58a183c9`.
  Independently triggered [main CI #41020234312](../../actions/runs/41020234312)
  passed **4/4 on that same SHA** (Ubuntu/Windows Node20/22).
  These are first-party engineering checks, not an independent signer
  audit, customer recovery or release authorization.

## M28-A/B/C — two-world recovery ambiguity (engineering accepted)

- [Issue #308](../../issues/308): source-only
  `node tools/m28-recovery-ambiguity.mjs` produces eight isolated
  fictional recovery outcomes from **identical fsynced IN_DOUBT marker
  bytes**, with and without an earlier in-memory effect. New disposable
  temporary directories and a new-key positive control are required.
- **M28-A:** deliberately blind retry completes the no-effect world but
  **duplicates** an already completed effect; blind assume-completed
  preserves the completed world but **loses** the other operation.
  Guarded quarantine blocks repeats but leaves both worlds unresolved.
  Source-only forged receipt claims must **not** release quarantine.
- **M28-B:** independent exact field oracle checks in-memory effect,
  duplicate/loss/unresolved counts, identical marker digest, clean
  scratch inventory and disposal. Negative mutations fail on missing
  duplicates/losses, fake proof acceptance, forged marker state and
  false cleanup.
- **M28-C:** [scope guide](.github/M28_INDOUBT_RECOVERY_AMBIGUITY.md),
  README, Windows/Ubuntu Node20/22 PR and main CI. This is a
  deterministic first-party information-boundary illustration, **not
  real effect reconciliation, exactly-once recovery or a process crash
  simulator** (M27 already tests disposable OS crashes). No external
  targets, real credentials, LLM, Stable Bridge, user files or release
  authorization. The unpublished 80-path package and #21/#43/#59 gates
  stay unchanged. [PR #309](../../pull/309) passed
  [PR CI #41016927718](../../actions/runs/41016927718) **4/4**,
  merged as exact SHA `2bf8a9f03159a7932582b63d0e6dbd4a53300340`,
  and separately [main CI #41017290535](../../actions/runs/41017290535)
  passed **4/4 on the same SHA**. This is author-controlled
  engineering acceptance only, not independent beta or real recovery.

## M27-A/B/C — unresolved-claim crash windows (engineering accepted)

- [Issue #305](../../issues/305): `node tools/m27-indoubt-crash-replay.mjs`
  owns a private temporary OS directory and fixed Node child workers.
  It records a fictional pending marker using exclusive `wx` and `fsync`,
  then forcibly terminates the process **before** any effect or **after**
  an IPC-witnessed effect but before an acknowledgement.
- **M27-A:** a guarded new worker rejects unresolved old-key replay
  with symbolic 423 in either crash window, while a different key remains
  allowed (200). A deliberately broken comparator admits an
  **additional witnessed synthetic effect** after the old effect and crash.
  Do not auto-expire an unresolved claim or call its outcome "success".
- **M27-B:** independent source-owned effect, marker, process-exit,
  fresh-key, no-ack, cleanup and bad-policy mutation witnesses. Strictly
  distinguish **at-most-once quarantine** from **exactly-once recovery**:
  crashing before an effect can leave a legitimately pending operation
  unavailable until independently authorized reconciliation.
- **M27-C:** [scope guide](.github/M27_INDOUBT_CRASH_RECOVERY.md),
  source-only tests and README. Require PR and separate matched main
  CI **4/4** (Windows/Ubuntu Node 20/22). 80-path unpublished npm
  candidate unchanged. Real credentials, external MCP, production
  database, actual user effect, Stable Bridge and real model excluded.
  Independent beta/audit/authorization gates #59/#43/#21 remain OPEN.
  [PR #306](../../pull/306) passed
  [PR CI #41014727992](../../actions/runs/41014727992) **4/4**,
  merged as exact SHA `8b9d6b4a20d344090e0875362b47f39614a279b5`.
  Separate [main CI #41015098532](../../actions/runs/41015098532)
  passed **4/4 on that exact SHA** (Windows/Ubuntu Node20/22).
  This establishes only first-party engineering acceptance; independently
  authorized real-effect reconciliation remains unverified.

## M26-A/B/C — disposable cross-process replay ledger (engineering accepted)

- [Issue #302](../../issues/302) adds source-only
  `node tools/m26-cross-process-ledger.mjs`. Only owned Node workers,
  source-constant fictionally named keys and a newly created private
  OS scratch directory are used; **real temporary disk writes occur**.
  No external MCP, real credentials, customer files, real model,
  caller-selected processes/paths or Stable Bridge.
- **M26-A:** guarded worker atomically creates and `fsync`s a marker
  before acknowledging a synthetic effect. Parent confirms the actual
  child process exit after SIGKILL, then a different child rejects that
  spent key (409) and permits a distinct new key (200). Deliberately
  transient in-memory-only policy exposes the old key's replay.
- **M26-B:** two separate guarded workers must both confirm PREPARED
  before either is RELEASED for the same source-owned key. Exactly one
  exclusive file claim/fictional effect is allowed; the other is denied.
  Parent separately witnesses effects, marker files, child closure and
  deletion of the entire scratch directory.
- **M26-C:** independent mutated witness tests, direct-worker denial,
  no-echo fixed CLI, [limitations](.github/M26_CROSS_PROCESS_LEDGER.md)
  and frozen unpublished **80-path** package. Passing does **not**
  prove power-loss durability, real authorization or a production
  transactional store. Independent review/beta/target gates
  #43/#59/#21 remain OPEN. [PR #303](../../pull/303) passed
  [PR CI #41012856455](../../actions/runs/41012856455) **4/4**,
  then merged as exact main SHA
  `c53dfad239b3c8af356e8050572920cde943e05c`.
  Independent [main CI #41013215418](../../actions/runs/41013215418)
  passed **4/4 on that same SHA**, Windows/Ubuntu Node20/22.
  Initial worker IPC close callback and M6-J 40 KiB handoff-capacity
  failures were corrected before merge (bounded 64 KiB packet,
  full source hashes and oversize-denial tests retained).
  Engineering acceptance only; no power-loss durability certification.

## M25-D — actual first-party worker process termination (engineering accepted)

- [Issue #299](../../issues/299): source-only
  `node tools/m25d-os-crash-relaunch.mjs` runs a fixed child Node.js
  worker with an ephemeral IPv4 localhost listener. No caller-selected
  executable, PID, endpoint, token or user MCP server.
- Child admission IPC confirms a real HTTP request is **accepted but not
  executed**. Parent forcibly terminates exactly that spawned child,
  verifies its OS exit and the abandoned pending HTTP exchange, and
  observes zero protected fictional effects from the old process.
- A fresh child has a **different random generation**, but the **same
  policy version**. Protected mode rejects the old synthetic approval
  (410) before any effect and allows a new approval (200). Deliberately
  vulnerable mode wrongly admits the stale grant to expose a witnessed
  unsafe effect. An unchanged-process positive control also must succeed.
- [Scope guide](.github/M25D_OS_PROCESS_RESTART.md), mutation tests,
  subprocess and loopback cleanup, source-only 80-path package custody.
  This is an actual OS process kill and re-fork but **NOT** authenticated
  real authorization, persisted crash recovery, an external MCP test,
  a real model, a secret-bearing workload or security certification.
  Stable Bridge never contacted. #21/#43/#59 remain OPEN.
  [PR #300](../../pull/300) passed [PR CI #41007941306](../../actions/runs/41007941306)
  **4/4** on Windows/Ubuntu Node20/22, then merged as exact SHA
  `79592457788f86de05db977203633ccf7eec43d7`.
  Independent [main CI #41008307216](../../actions/runs/41008307216)
  passed **4/4 on that same SHA**. The initial timing mismatch in
  parent-observed IPC effect counts was corrected using ordered SYNC
  acknowledgments before merge; the failed run was not waived.
  Engineering acceptance only: no production crash-durability guarantee.

## M25-A/B/C — community policy-version and logical restart TOCTOU (engineering accepted)

- [Issue #296](../../issues/296), based on concrete scenarios proposed
  by **TheAsymmetricMind**: approve, then change policy before the action
  executes; restart the gate while approval is still pending. A stale
  authorization must **not** survive either boundary.
- **M25-A:** source-only `node tools/m25-policy-epoch-restart.mjs` uses
  real ephemeral IPv4 127.0.0.1 HTTP with an explicit admission barrier.
  Compare five cases: unchanged positive, policy drift deny, pending
  restart deny, and new-grant positives after each invalidation. Guard
  must recheck **both** server-owned policy version and logical gate
  generation immediately before any simulated commit. Deliberately
  vulnerable comparison must expose stale-approval execution.
- **M25-B:** independent fixed oracle verifies exact 14 local requests
  across 10 disposable servers, before-effect change/invalidation
  counters, HTTP status/response bodies, fictional effect totals,
  closed responses/sockets and no remaining pending approvals. Negative
  mutations detect false stale acceptance, false fresh denial, fake
  invalidation and forged observations without echoing test data.
- **M25-C:** [scope guide](.github/M25_APPROVAL_POLICY_EPOCH.md),
  README and Windows/Ubuntu Node20/22 PR + post-merge main CI **4/4**.
  This is a **logical in-process restart**, not an OS process crash or
  durable recovery test; NOT real authorization, external MCP, LLM
  execution or certification. Stable Bridge untouched, 80-file
  unpublished npm candidate unchanged; #21/#43/#59 remain OPEN.
  [PR #297](../../pull/297) passed [PR CI #40950036873](../../actions/runs/40950036873)
  **4/4** and merged as exact main SHA
  `d1e7d0cddb11668df5e7d96325a8d9b283b58f32`. Separate
  [main CI #40950548884](../../actions/runs/40950548884) passed
  **4/4 on the same SHA**. Initial witness-semantics regression failed
  and was repaired before merge, not waived. Engineering acceptance only;
  an actual OS crash/relaunch and pending-approval persistence test
  remains unverified.

## M24-A/B/C — privacy-minimal user adapter stdin preflight (engineering accepted)

- [Issue #293](../../issues/293): source-only
  `node tools/m24-stdin-adapter-preflight.mjs` reads one strictly parsed,
  **maximum 4,096-byte** descriptor from noninteractive stdin without a
  user-selected file path, executable or remote MCP contact.
- **M24-A:** reuse current hardened `inspectProjectAdapter` and
  `previewOfflineAdapterQuickstart` validators in fail-closed order.
  Five *fixed first-party* fictional controls remain independent of
  arbitrary real project data. Generic status shows transport category
  and version only — never names, endpoints, command, arguments or tokens.
- **M24-B:** tests prove both inert transports, strict UTF-8 and JSON
  duplicate-key rejection, active permission denial, bounded/no-echo
  stdin behavior, no arbitrary CLI args, accessor-bearing JS denial,
  no process execution and frozen 80-path unpublished candidate.
- **M24-C:** [Windows/Linux instructions](.github/M24_STDIN_ADAPTER_PREFLIGHT.md),
  README and regression CI (Ubuntu/Windows Node20/22, PR **4/4** then
  separately verified main **4/4**). Descriptor preflight does not
  perform DNS, network, subprocess, identity/consent authorization
  or *actual real-agent/real-project* security evaluation. Stable
  Bridge excluded; gates #21/#43/#59 remain open.
  [PR #294](../../pull/294) passed
  [PR CI #40944605846](../../actions/runs/40944605846) **4/4**,
  merged as exact SHA `cba0a4ef1c5a09b245f03ee70cd6d53b93d41642`,
  and independent [main CI #40945169177](../../actions/runs/40945169177)
  passed **4/4 on the identical SHA**. This is *engineering acceptance*
  of an inert descriptor preflight only, not independent beta or live MCP testing.

## M22-A/B/C — reviewed finite-action contributor scenarios (engineering accepted)

- [Issue #287](../../issues/287): `node tools/m22-finite-scenario-runner.mjs`
  reads only the fixed `.github/m22-scenarios/` directory, **5–12**
  regular JSON files of **1–1,024 bytes each**. Exact filenames, bounded
  reads, strict UTF-8 and duplicate-key checks, no unknown fields, no
  symlinks or user path/URL arguments. It never executes supplied code.
- **M22-A:** eight committed enum-only cases include two authorized
  task-data controls and six denied attempts across untrusted resource,
  extra tool, spoofed claims, owner-side forbidden access and mismatch.
  The existing M9-B in-memory policy is checked against a **separate
  source-authored oracle**, not the contributor's asserted expectations.
  The deliberately permissive toy must expose precisely six fictional
  protected counter effects; guarded policy must expose zero.
- **M22-B:** source-only CI tests copy reviewed runner/dependencies into
  a disposable **separate temporary directory**, add a ninth valid
  scenario without editing runner code, and require `checked=9`.
  Wrong expected guarded/permissive decisions yield **FAIL**; unsafe
  malformed or symlinked files yield **ERROR**. Additional negative
  mutations detect fake guarded decisions, missing unsafe effects,
  forged witness status and raw-input echo.
- **M22-C:** [schema and contribution guide](.github/M22_FINITE_SCENARIO_CONTRIBUTIONS.md),
  README, 80-path npm candidate unchanged, M6-J full excluded-source
  hashing widened only to **224 entries** while preserving size limits,
  40 KiB canonical packet and 2 MB reviewed-source cap. This is *not*
  independent model/agent testing or semantic prompt-injection coverage.
  No external MCP, Stable Bridge, real files, secrets or telemetry;
  owner/independent gates #21/#43/#59 remain OPEN. [PR #291](../../pull/291)
  passed [PR CI #40941191039](../../actions/runs/40941191039)
  **4/4** on Windows/Ubuntu Node20/22 and merged as
  `5d4c7f81ead97183184f33142dc14b8d62a782e1`.
  Independent [main CI #40941967881](../../actions/runs/40941967881)
  passed **4/4 on that same SHA**. These are first-party engineering
  results, not independent user beta or live-agent validation.

## M23-A/B/C — community-requested trust-boundary scenarios (engineering accepted)

- [Issue #288](../../issues/288) covers three X-suggested gaps:
  metadata changes **after tool registration**, cross-server claims of
  resource authority, and error-response echo of environment-like
  variables, paths or request headers.
- **M23-A:** a source-only, no-argument
  `node tools/m23-community-attack-families.mjs` runs ten fixed
  *first-party in-memory toy* controls. Three protected effects and
  three error-channel leaks must be exposed in deliberately unsafe toys
  while guarded counterparts deny or redact, preserving benign outcomes.
- **M23-B:** independent source-authored expected outcomes and mutations
  reject forged PASS, missing unsafe effects, guarded leaks, false
  denials and malicious witness objects. Synthetic error markers are
  literal fictional strings — no real environment, headers, file or
  credentials are read.
- **M23-C:** [guide](.github/M23_COMMUNITY_ATTACK_FAMILIES.md),
  README, regression CI, strict no-echo output and fixed unpublished
  80-path package. M8's existing fixture schema does *not* represent
  these three families and must not be mislabelled as a semantic
  rug-pull or multi-server tester; separate M22 [#287](../../issues/287)
  now has a separate finite-action scenario contribution contract.
  No user MCP targets, LLM, networking or Stable Bridge. Independent
  beta #59, audit #43 and external approval #21 remain OPEN. [PR #289](../../pull/289)
  passed [PR CI #40930112479](../../actions/runs/40930112479) **4/4**,
  merged as exact SHA `713092bb51ef182c26d1c60dfd56b37dc6b1630f`,
  and separate [main CI #40930780325](../../actions/runs/40930780325)
  passed **4/4 on the same SHA** (Windows/Ubuntu Node20/22).
  Engineering acceptance is **not** real-agent validation or independent beta.

## M21-A/B/C — privacy-minimal multi-report preflight (engineering accepted)

- [Issue #285](../../issues/285) adds a source-only
  `node tools/m21-beta-batch.mjs` entrypoint, reading at most
  **16,384 bytes** of strict UTF-8 JSON from stdin, containing **2–4**
  fully validated [M20](.github/M20_BETA_INTAKE_PREFLIGHT.md)
  fictional self-reports. No user-selected paths, identities,
  external MCP targets, credentials or network activity.
- **M21-A:** reuse the exact M20 single-report policy for each record,
  reject malformed/unsafe entries, calculate source-owned triage
  categories and self-reported OS/Node coverage. No GitHub posting.
- **M21-B:** label identical categorical patterns as **possible collisions**
  without assigning tester identities, deduplicating evidence or treating
  different patterns as different people. Every result explicitly has
  `independentTestersVerified: 0` and
  `independentBetaVerified: false`; contradictory or stale reports
  still require separate manual review.
- **M21-C:** [schema and limits](.github/M21_BETA_BATCH_TRIAGE.md),
  README, regression/mutation/no-echo tests and source-only custody.
  Preserve pinned M13 historical test instructions and unpublished
  **80-path** npm candidate. Independent beta #59, audit #43 and
  real-target approval #21 remain OPEN. [PR #286](../../pull/286)
  passed [PR CI #40925522858](../../actions/runs/40925522858)
  **4/4** and merged as `e2e282012df24f6263c0d1658810142b8c416ba0`;
  independent [main CI #40926082743](../../actions/runs/40926082743)
  passed **4/4 on that exact SHA** (Windows/Ubuntu Node20/22).
  This closes engineering scope only, not real independent beta.

## M20-A/B/C — safety-bounded voluntary beta intake preflight (engineering accepted)

- **M20-A:** [Issue #282](../../issues/282) adds the source-only,
  argument-free `node tools/m20-beta-intake.mjs`. It accepts one
  **max-4096-byte UTF-8 JSON** report over stdin, never an arbitrary path.
  Exact schema and categorical allowlists cover public candidate SHA,
  version, OS/Node, five fictional fixed-control results, exercise scope,
  optional archive and usability categories. No freeform user text,
  credentials, tool results, raw logs or network requests.
- **M20-B:** malformed/duplicate-key/inconsistent results fail closed;
  source SHA mismatch requires **manual review**, not automatic acceptance.
  User-asserted independent execution, fictional-only scope and
  no-sensitive-data statements remain unverified declarations, **never
  authenticated provenance**. Even a syntactically valid `PASS` is
  `READY_FOR_MANUAL_TRIAGE` and cannot close [beta #59](../../issues/59),
  real-target authorization #21 or independent audit #43.
- **M20-C:** [strict input format](.github/M20_BETA_INTAKE_PREFLIGHT.md),
  source-only mutation tests, no-echo and zero external-MCP/no Stable Bridge
  controls. The original publicly pinned M13 volunteer procedure and
  **unpublished 80-path npm candidate** remain unchanged. [PR #283](../../pull/283)
  passed [PR CI #40919148260](../../actions/runs/40919148260) **4/4**
  (Ubuntu/Windows Node20/22), merged as exact commit
  `5f07ef308f05106e15313a614460e577e6a72e14`, and independent
  [main CI #40919664479](../../actions/runs/40919664479) passed
  **4/4 on the same SHA**. This engineering acceptance leaves independent
  user beta #59, security audit #43 and owner target gate #21 OPEN.

## M19-A/B/C — first-party one-command evidence assessment (engineering accepted)

- **M19-A:** [Issue #279](../../issues/279) adds
  `node tools/m19-assessment-summary.mjs` — a zero-argument source-only
  command running five established checks: M15 (4), M16 attack matrix (7),
  M16 permission scope (9), M17 concurrent replay (3), M18 symbolic
  classifications (32). Counts remain **separate by evidence source**:
  23 actual first-party localhost-wire cases and 32 author-supplied
  symbolic cases, never 55 observed real attacks or real model results.
- **M19-B:** independent source-authored case-ID/classification
  expectations, checked/matched/failed consistency, observed case-row
  validation, denied external/agent assertions, and M18 baseline/metric
  checks. Fake nested `PASS`, false unsupported evidence, missing or
  forged witness rows and accessor-bearing data must fail closed.
- **M19-C:** [scope guide](.github/M19_ASSESSMENT_SUMMARY.md),
  README, source-only test suite, 80-file unpublished package unchanged.
  No Stable Bridge, user MCP server, LLM or new runtime dependency.
  Independent beta #59, audit #43 and target authorization #21 stay
  OPEN. [PR #280](../../pull/280) passed
  [PR CI #40911862973](../../actions/runs/40911862973) **4/4**,
  merged as `12b5eec7aa585e36f6d017075dcd485d8b019c1f`,
  and separately [main CI #40912510667](../../actions/runs/40912510667)
  passed **4/4 on that same SHA** (Windows/Ubuntu Node20/22).
  Engineering acceptance does not satisfy the external beta or audit gate.

## M18-A/B/C — symbolic measurement and negative-control benchmark (engineering accepted)

- [Issue #276](../../issues/276): fixed source-only
  `node tools/m18-symbolic-evaluation.mjs` tests **32** profile ×
  event-set combinations, beyond M9's original four static controls.
  A separate source-authored label/rule oracle classifies **28 symbolic
  attacks, two benign controls and two insufficient/contradictory
  evidence** cases; this is NOT independently collected real traffic.
- **M18-A:** compare exact M9 evaluator rule precedence and expected
  safety classifications. Abstain on missing evidence rather than
  treating every symbolic `FAIL` as a detected attacker action.
- **M18-B:** explicitly count TP/FP/FN/TN, precision, recall, FPR,
  FNR, coverage, abstentions and unsupported claims. Fixed degraded
  baselines **always-clear** and **always-alert** expose FN and FP;
  naive FAIL-is-attack baseline exposes unsupported allegations.
  Strict negative mutations reject hidden attacks, false classifications,
  corrupt verdicts, source gettors, missing rows and forged evidence.
- **M18-C:** [scope and limitations](.github/M18_SYMBOLIC_EVALUATION_BENCHMARK.md),
  README and Windows/Ubuntu Node20/22 CI. [PR #277](../../pull/277)
  passed [PR CI #40907812910](../../actions/runs/40907812910) **4/4**,
  merged as `e10da27f12c9419658f79bcb281273f63db513cc`,
  and separately triggered [main CI #40908374045](../../actions/runs/40908374045)
  passed **4/4 on that exact SHA**. M6-J excluded-source index capacity
  increased in a bounded, fully hashed manner from 176 to 192 files
  (193 rejected), without touching the **80-path unpublished** npm candidate.
  No user MCP server, LLM, external tool, arbitrary file, credential,
  Stable Bridge or actual attack effectiveness measured. Owner/external
  gates #21/#43/#59 remain OPEN.

## M17-A/B/C — deterministic concurrent replay race (engineering accepted)

- [Issue #273](../../issues/273): `node tools/m17-concurrent-replay-lab.mjs`
  creates **three separate first-party ephemeral IPv4 loopback servers**
  and sends two concurrent `tools/call` requests per scenario. The
  server holds both responses until it has received both complete request
  bodies, witnessing **actual overlap**, not a sequential imitation.
- **M17-A:** deliberately vulnerable check-then-commit admits two effects
  for the same operation key; guarded pre-effect reservation admits one
  and returns HTTP 409 on the duplicate. A different-key positive control
  admits both. No remote MCP service or actual database is involved.
- **M17-B:** verify exact reply IDs/statuses, side-effect counters, duplicate
  detection, two socket connections and full close, and no-early-response
  rendezvous. Independent mutation cases fail on fabricated overlap,
  lost unsafe effects, missed guarded denials or false-positive denials.
- **M17-C:** [guide](.github/M17_CONCURRENT_REPLAY_RACE.md),
  source-only command, README and frozen npm 80-file candidate.
  **M17 cannot prove real-agent, real-user or remote-server security**.
  Gates #21/#43/#59 stay OPEN. [PR #274](../../pull/274) passed
  [PR CI #40885722243](../../actions/runs/40885722243) **4/4**,
  merged at exact commit `472fc64efc4ec18a6dbaac54b4f3de36896657ae`,
  and independent [main CI #40886331660](../../actions/runs/40886331660)
  passed **4/4 on that same SHA**. This is engineering acceptance only,
  not independently operated beta or real-target security validation.

## M16-E/F/G — isolated permission-grant scope and replay differential (engineering accepted)

- [Issue #270](../../issues/270): new source-only
  `node tools/m16-permission-replay-lab.mjs` exercises nine independent
  permission scenarios and a deliberately permissive counterpart over
  **ephemeral IPv4 127.0.0.1 only**. These are fixed fictional token strings,
  not real credentials, OAuth validation or user-server permissions.
- **M16-E:** accept one valid request, then deny replay; independently reject
  wrong project, tool, resource, expired grant, revoked grant and forged
  token or approval. Each case uses a fresh server to avoid masking
  independent policy failures through prior token consumption.
- **M16-F:** verify real HTTP statuses, parent-observed in-memory effects,
  responses and sockets closed, exact body witnesses, independent mutation
  sensitivity and strict no-echo symbolic reporting. Expected `PASS` means
  intentionally vulnerable behavior was exposed, not certified safe.
- **M16-G:** [guide](.github/M16_PERMISSION_REPLAY_LAB.md), README and
  Windows/Ubuntu Node 20/22 CI. Preserve the unpublished **80-path**
  package candidate and owner/external gates #21/#43/#59. No Stable Bridge,
  external MCP targets, real agent, real filesystem effects or telemetry.
  [PR #271](../../pull/271) passed [PR CI #40874846038](../../actions/runs/40874846038)
  **4/4**, and merged as `9e53becf1d0413c1ca9292ad95d0b4524cb84146`.
  Separate [main CI #40875297476](../../actions/runs/40875297476)
  passed **4/4 on the exact merge SHA, attempt 2**. Attempt 1 ended
  **CANCELLED** after three PASS jobs and one cancelled Windows Node22 job;
  retrying only that cancelled job completed successfully. Historical
  cancellation is preserved; no independent beta or actual-agent claim.

## M16-A/B/C/D — owned authority, replay and reply-tamper matrix (engineering accepted)

- [Issue #266](../../issues/266): `node tools/owned-attack-matrix.mjs`
  runs seven first-party real HTTP checks over fresh ephemeral
  `127.0.0.1` servers. The deliberately unsafe pairs witness
  **one unauthorized effect from forged tool-data authority**, **two
  effects from replay of the same synthetic idempotency key** and
  **one extra effect from a wrong-ID JSON-RPC reply**.
- Each guarded counterpart must witness respectively **HTTP 403
  with zero effect**, **HTTP 409 with exactly one initial effect**, and
  **no follow-on request**. M16-D additionally requires a **fresh distinct
  operation key** to succeed with HTTP 200 and a second legitimate effect,
  proving the replay guard is keyed, not simply request-order denial. Strict source-owned independent counters,
  precise HTTP replies, cleanup and negative mutations prevent silently
  treating intentionally unsafe behavior as safe.
- [Guide](.github/M16_OWNED_ATTACK_MATRIX.md) states limits.
  Source-only; unchanged unpublished 80-path npm candidate.
  **Not** a real LLM, user MCP test, security audit or independent beta.
  Owner/independent gates #21/#43/#59 remain OPEN. Initial
  [PR #267](../../pull/267) passed second-attempt
  [CI #40869476641](../../actions/runs/40869476641) **4/4**;
  first attempt's Windows Node22 M6 archive contention failure remains
  historical. The merged `8e306334cfb48e87ac60c0977ba1495ae9cc4310`
  passed independently triggered
  [main CI #40870920568](../../actions/runs/40870920568) **4/4**.
  M16-D keyed replay and fresh-key admission shipped via
  [PR #268](../../pull/268):
  [PR CI #40871592873](../../actions/runs/40871592873) **4/4 PASS**;
  merge SHA `7587cb380c828df51d0d68cb6992f76e880433a8`;
  independently triggered [main CI #40872142693](../../actions/runs/40872142693)
  **4/4 PASS** on that exact SHA. Engineering acceptance only; no real
  agent, user server, external authority, independent beta or audit.

## M15-A/B/C — intentionally vulnerable owned MCP differential lab (engineering accepted)

- [Issue #263](../../issues/263) adds `node tools/owned-redteam-lab.mjs`
  as a fixed, no-argument **source-only** comparison. Four independent
  ephemeral IPv4 127.0.0.1 servers each respond to a legitimate fictional
  `ticket.get` request containing untrusted text. The deterministic,
  deliberately susceptible toy client follows it into an unrelated
  `archive.read` request; a permissive mock then witnesses exactly one
  **in-memory** protected effect, not a real read or model operation.
- Independent server-boundary and client-boundary cases must witness **zero**
  protected effects; both negative controls and actual socket/response cleanup
  are verified. `PASS` means **one intentional synthetic vulnerability was
  detected**, not that the vulnerable client is safe.
- [Guide](.github/M15_OWNED_REDTEAM_LAB.md) distinguishes MCP-shaped local
  experimentation from real-agent security or full protocol conformance.
  No Stable Bridge, credentials, external MCP server, real file read or
  user-driven URL. 80-path unpublished candidate and external gates
  #21/#43/#59 unchanged. [PR #264](../../pull/264) passed
  [PR CI #40857361062](../../actions/runs/40857361062) **4/4** and
  merged as `a606df890a8664566a482b439e1e1bb0c1bc9bc7`;
  independently triggered [main CI #40857820827](../../actions/runs/40857820827)
  passed **4/4** on the **same SHA**. A Windows socket-close witness race
  was repaired before merge; no external beta or security audit claimed.

## M14-A/B/C — optional broader first-party beta tour (engineering accepted)

- [Issue #261](../../issues/261): make newer first-party capabilities
  visible in an opt-in **source-only**, zero-argument demo. Four fixed
  checks cover adapter kits for both inert transports, M9 fictional
  tool-result policy, M12 accepted SSE, and M12 rejection of an
  unreviewed Authorization header before toy-gateway delivery.
- Strict witness checks require exact observed local HTTP acceptance/denial,
  on-wire response/socket close, gateway delivery counts, zero protected
  fictional effects, no external MCP contact and no real-agent claims.
- Fixed output cannot echo fixture texts, commands, URLs, credentials or
  arbitrary report fields. The **five-case M5 beta protocol is unchanged**,
  as are the unpublished 80-path candidate and external gates #21/#43/#59.
- [PR #262](../../pull/262) and separate post-merge
  [main CI #40846079531](../../actions/runs/40846079531) each passed
  **4/4**; this is engineering acceptance, not independent beta evidence.


## M13-A/B/C — self-service pinned fictional beta handoff (engineering accepted)

- **M13-A:** The voluntary handoff now identifies the immutable public
  source commit `2ad680ed2e4c322374fdabf3c2007e396f893a59` as the
  recommended independent **offline** beta revision. This is the corrected
  beta card implementation, not the earlier M12-only snapshot. Its
  [post-merge main CI #40842071546](../../actions/runs/40842071546)
  passed **4/4** on Windows/Ubuntu Node20/22. The contributor must manually
  compare the full Git SHA with GitHub; local Git metadata does not prove
  independently verified origin or execution.
- **M13-B:** The combined `node tools/beta-review.mjs` card names the
  command actually run and points to its locally reported SHA. Separate
  standalone `beta-feedback-card.mjs` manual fields remain unchanged.
- **M13-C:** Focused regression tests for both presentation profiles and
  the pin. [PR #259](../../pull/259) passed
  [PR CI #40841574872](../../actions/runs/40841574872) **4/4 PASS**,
  merged as `2ad680ed2e4c322374fdabf3c2007e396f893a59`; an
  independent [main push CI #40842071546](../../actions/runs/40842071546)
  also passed **4/4**. Docs pin reconciliation has its own PR/CI.
  Unpublished **80-path** candidate and M6-J SHA-256 custody preserved.
  **No real agent, external MCP target, automatic feedback submission,
  security review or independent beta execution is claimed.** Owner gates
  [#21](../../issues/21), [#43](../../issues/43), and [#59](../../issues/59)
  remain OPEN.

## M12-P/Q/R — exact first-party incoming SSE request headers (engineering accepted)

- [Issue #255](../../issues/255) extends the completed M12-M/N/O
  response header gate to **incoming** first-party modern `tools/call` POST.
- **M12-P:** require the exact reviewed set of HTTP request headers,
  case-insensitive no-duplicates, and `Connection: close`, in addition to
  existing request body, Origin, version, method and tool-name checks.
  Unknown or synthetic asserted authority is denied before returning SSE.
- **M12-Q:** 10 new request-denial modes cover fictitious proxy auth,
  synthetic session/parameter/owner grants, extra headers, User-Agent,
  keep-alive, Cookie, Authorization and duplicate Accept. Require
  HTTP 400, observed denial, response/socket closure and zero toy
  gateway deliveries. M12 total: **60** (4 accepted, 56 denied).
- **M12-R:** docs and tests only in existing source files; preserve
  unpublished **80-path** npm candidate, M6-J complete SHA-256 custody,
  and external authorization/audit/beta blocks #21/#43/#59.
  **Engineering accepted:** [PR #256](../../pull/256) merged at
  `fbc6f89` after [PR CI #40837699443](../../actions/runs/40837699443)
  **4/4 PASS**. Independent [main push CI #40838079608](../../actions/runs/40838079608)
  **4/4 PASS** on Windows/Ubuntu Node20/22. No real external
  MCP contact, security certification or release authorization.

## M6-J CI reliability — source-digest fast rejection (engineering accepted)

- [Issue #252](../../issues/252) addresses the independently observed
  [main CI #40834843057](../../actions/runs/40834843057) failure:
  Windows Node.js 22 returned `INVALID` (2) instead of `MISMATCH` (1)
  for an intentionally tampered M6-J reviewer handoff; other 3/4
  platforms passed, and the failing job passed 1187/1188 tests.
- Verify strictly bounded source and excluded-source SHA-256 bytes
  before costly offline npm pack/install when the packet cannot match.
  Still perform the complete two-pack/install verification on a match;
  no external contact, release authority or changes to 80-path package.
  Repaired in [PR #253](../../pull/253), independently verified
  [post-merge main CI #40836248131](../../actions/runs/40836248131)
  **4/4 PASS**. This does not erase the original failed run.

## M12-M/N/O — strict first-party modern SSE response-header gate (engineering accepted)

- [Issue #250](../../issues/250): reject missing, unexpected or duplicate HTTP response fields even when body SSE data is valid; strict source-owned Node 20/22 header allowlist, not a complete HTTP/MCP conformance rule.
- Add ten fixed negative modes covering cookie/session/authorization, response encoding/disposition/refresh, altered cache/buffering/connection and duplicate content type; require rejection before M10 delivery and exact HTTP/TCP close witnesses.
- M12 selftest: **50** controls (4 accepted, 46 rejected). Preserve the unpublished **80-path** candidate and complete SHA-256 excluded-source custody. External gates #21/#43/#59 stay open.
- **Engineering accepted:** [PR #251](../../pull/251),
  [PR CI #40834338360](../../actions/runs/40834338360) **4/4 PASS**.
  Initial [main CI #40834843057](../../actions/runs/40834843057)
  was **3/4** due to pre-existing M6-J reviewer handoff slow-path
  mismatch/invalid classification (Windows Node22, 1187/1188).
  [M6-J repair PR #253](../../pull/253) passed
  [PR CI #40835857787](../../actions/runs/40835857787)
  **4/4**, merged as `704d4a3c`; independently checked
  [main CI #40836248131](../../actions/runs/40836248131) **4/4 PASS**.
  External gates #21/#43/#59 remain OPEN.

## M12-J/K/L — fail-closed SSE frame and result hardening (engineering accepted)

- [Issue #248](../../issues/248) extends the accepted source-only,
  127.0.0.1 request-scoped modern SSE test, without adding external
  contact, arbitrary tools, inputs or a new packaged runtime file.
- **M12-J:** 16 additional negative controls reject forged progress
  parameters, missing/duplicate progress, altered JSON-RPC/result data,
  unsupported SSE id/retry/duplicate-event fields, malformed frame lines
  and comment-only frames after final response.
- **M12-K:** fixed on-wire matrix becomes **40** (4 accepted, 36 denied),
  with explicit rejection before M10 toy gateway delivery, observed
  HTTP/response/socket closure and non-echoing reports.
- **M12-L:** update contributor documentation and exact source-only
  regression; preserve the **80-path unpublished npm candidate** and
  full bounded M6-J SHA-256 excluded-source inventory.
- **Engineering accepted:** [PR #249](../../pull/249) merged as
  `6aea8047`; independent [main push CI](../../actions/runs/40767450604)
  **4/4 PASS** on Windows/Ubuntu Node20/22.
  External approval #21, audit #43 and beta #59 stay OPEN.

## M12-G/H/I — request-scoped modern SSE tool-result stream (merged engineering)

- [Issue #246](../../issues/246) adds source-only
  `tools/m12-modern-sse.mjs`, a separate disposable first-party
  `127.0.0.1` modern `tools/call` POST returning an actual
  `text/event-stream`. The source-owned request includes fixed modern
  protocol metadata and a fictional progress token.
- **M12-G:** strict bounded SSE receiver validates byte fragments,
  CRLF, comments, multiline data, exactly one request-related
  `notifications/progress`, and a matching final JSON-RPC response
  **before** sending fictional data to the independent M10 toy gateway.
- **M12-H:** 24 source-authored controls (4 PASS/20 expected FAIL)
  covering unauthorized server requests, replay/duplicate or forged
  finals, wrong ID/token, malformed/duplicate JSON, invalid UTF-8,
  unknown events, overlong/flooded/truncated frames, stalled stream,
  wrong content type, redirect and wrong Origin/method.
  Verify actual HTTP request/deny counters and TCP cleanup.
- **M12-I:** strict zero-argument CLI, fixture-only regression,
  [modern transport limits](.github/M12_MODERN_MCP_SMOKE.md#m12-ghi--request-scoped-sse-response-checks),
  unchanged **80-path unpublished npm candidate** and bounded
  M6-J **176-file full SHA-256** excluded-source custody, with
  a fail-closed 177-file negative test.
- **Engineering accepted:** [PR #247](../../pull/247) merged as
  `29431b8a`; independent [main push CI](../../actions/runs/40757846239)
  **4/4 PASS** on Windows/Ubuntu Node20/22. No complete conformance,
  real LLM, external MCP testing or release approval. #21/#43/#59
  remain OPEN.

## M12-D/E/F — modern 2026-07-28 x-mcp-header parity (merged engineering)

- [Issue #244](../../issues/244) adds source-only
  `tools/m12-header-parameter-mirror.mjs`, a separate disposable
  first-party `127.0.0.1` server/client pair for one fixed
  `tools/call` request. Four primitive string/integer/boolean
  parameters are annotated with `x-mcp-header`, mirrored to
  `Mcp-Param-*` and checked against the body **before** the
  fictional response can enter the M10 toy gateway.
- **M12-D:** deterministic header-value encoding/decoding with
  canonical UTF-8 Base64 sentinel for Unicode, padded strings and
  sentinel-like text. Strict reviewed schema annotation names,
  duplicate-case detection and primitive types only.
- **M12-E:** 26 source-authored outcomes (4 PASS, 22 expected FAIL).
  Missing/mismatched/duplicate/noncanonical headers, invalid JSON
  and forged response authority must fail closed. Header mismatch
  returns HTTP 400 / JSON-RPC `-32020`; TCP cleanup and denial
  counters are independently checked.
- **M12-F:** zero-argument CLI, regression over every reviewed fictional
  fixture, non-echo report, [design](.github/M12_HEADER_MIRROR.md),
  unchanged 80-path unpublished npm candidate and complete M6-J
  SHA-256 excluded-source custody. Still not full MCP conformance,
  actual LLM test or general authorization gateway.
- **Engineering accepted:** [PR #245](../../pull/245) merged at `d4a35563`; [PR CI #1147](../../actions/runs/40754677970) **4/4 PASS**, independent [post-merge main CI #1148](../../actions/runs/40755339363) **4/4 PASS**. External #21/#43/#59 remain OPEN.

## M12-A/B/C — source-only modern MCP 2026-07-28 HTTP subset (merged engineering)

- [Issue #242](../../issues/242) adds
  `tools/m12-modern-http-smoke.mjs`: one **separate, disposable,
  first-party** 127.0.0.1 HTTP mock serving fixed modern
  `server/discover`, `tools/list` and `tools/call` requests.
  This is **not complete MCP conformance** and does not modify the
  M4 strict discovery-only staging implementation.
- **M12-A:** pin the real modern `2026-07-28` request shape:
  each POST carries `params._meta` protocolVersion, clientInfo,
  clientCapabilities; `Accept`, `MCP-Protocol-Version`,
  `Mcp-Method` and `Mcp-Name` (when calling a tool) must agree with
  body values. Tools/list advertises one fictional schema; tools/call
  returns `resultType: "complete"` and only validated fictional
  tool-result data reaches the stateful M10 toy gate.
- **M12-B:** seventeen source-owned failure cases include mismatched
  metadata headers, invalid/legacy versions, Origin rejection,
  malformed/duplicate JSON, replayed/forged tool results, redirect,
  oversized and stalled reply. Verify actual observed HTTP
  requests, accepted/denied decisions and TCP cleanup, with
  zero private input echo or protected effects.
- **M12-C:** zero-argument CLI, all reviewed fictional fixtures,
  strict no-target/credential args, [scope document](.github/M12_MODERN_MCP_SMOKE.md),
  exact 80-path unpublished npm candidate and complete M6-J SHA-256
  excluded-source custody. No real LLM, external MCP or actual
  prompt-injection resistance claim.
- **Engineering accepted:** [PR #243](../../pull/243) merged at `16c2cb92`; independent [main push CI](../../actions/runs/40752319970) **4/4 PASS**. External #21/#43/#59 remain open.

## M11-S/T/U — fictional in-flight owner capability revocation (merged engineering)

- [Issue #240](../../issues/240) adds
  `tools/m11-inflight-revocation.mjs`, a source-only test with two
  **concurrent** fixed `127.0.0.1` requests and randomly generated,
  ephemeral **fictional** owner capabilities.
- **M11-S:** deterministic source-owned admission barrier waits until
  both HTTP request bodies are fully validated. Revoke A, B or both
  **before sending any success reply**. Recheck the owner's live
  fictional capability *after byte-validating the actual HTTP reply*
  and immediately before calling the independent M10 toy gateway.
- **M11-T:** one safe PASS and **12 expected negative modes** including
  all three in-flight revocations, bad/missing/forged request
  authority, replayed/swapped/wrong-ID or extra-authority replies,
  malformed and duplicate-key JSON. Assert processed/accepted/denied
  HTTP requests, response bytes, revocation denials, toy deliveries,
  and exact socket/response cleanup. No embedded instruction executes.
- **M11-U:** zero-argument local selftest, per-fixture regression,
  strict target-option rejection, [scope documentation](.github/M11_INFLIGHT_REVOCATION.md),
  preserved 80-path npm inventory and full M6-J SHA-256 source custody.
- **Engineering accepted:** [PR #241](../../pull/241) merged at `a5838ee1`, [PR CI #1129](../../actions/runs/40749175506) **4/4 PASS**, independent [main push CI #1130](../../actions/runs/40749770236) **4/4 PASS**. This remains synthetic-only: **not real authentication, OS isolation or an LLM evaluation**. External #21/#43/#59 remain open.

## M11-P/Q/R — synthetic capability rotation across independent runs (merged engineering)

- [Issue #238](../../issues/238) introduces source-only
  `tools/m11-owner-epoch.mjs`: two **sequential, independent** disposable
  127.0.0.1 HTTP listeners, where the first is fully shut down before
  the second is created. Each uses its own source-generated **fictional**
  capability and fixed JSON-RPC-shaped owner/epoch request.
- **M11-P:** the second local run refuses stale first-run authority.
  Only byte-validated, exact source-owned responses enter distinct
  M10 toy gateways; no embedded tool-result instruction is interpreted.
- **M11-Q:** one clean rotation and **17 expected negative controls**
  cover stale/missing/forged authority, wrong request ID/owner,
  post-completion replay, swapped/forged/invalid replies, redirects,
  oversized bodies and timeout. Check actual HTTP accepted/denied
  requests, toy gateway deliveries and socket cleanup per run.
- **M11-R:** strict zero-argument CLI, tests for each reviewed fixture,
  privacy-safe fixed reports and [design](.github/M11_OWNER_EPOCH.md).
  No external server, LLM, arbitrary file read, shell or real
  credentials. Exact 80-path npm candidate and M6-J full hashed
  excluded-source custody remain unchanged.
- **Engineering merged:** [PR #239](../../pull/239) into `main` at `9ad9b2c8`. [Post-merge push CI #1120](../../actions/runs/40728195371) **4/4 PASS**; no real authentication, LLM evaluation or certified injection defense. External #21/#43/#59 remain open.

## M11-M/N/O — owned concurrent fictional owner isolation (merged engineering)

- [Issue #236](../../issues/236) adds source-only
  `tools/m11-owner-isolation.mjs`: two simultaneous, fixed fictional
  owner requests on a disposable `127.0.0.1` listener, with
  per-run source-generated in-memory **synthetic owner capabilities**.
  The code accepts no external hosts, ports, commands or credentials.
- **M11-M:** validate exact owner capability header, request ID,
  fictional owner/session marker and strictly bounded on-wire JSON
  before allowing data from each request into its distinct M10 toy
  gateway. Both valid reply orders must succeed.
- **M11-N:** 15 fixed negative controls for wrong/missing/swapped owner
  capability, malformed request/response, reused ID, forged authority,
  redirect, size/time limits and response-data swaps. Independent
  counters verify observed accepts/denials, gateway sessions and
  shutdown of both response and TCP sockets. No embedded text is
  interpreted or echoed.
- **M11-O:** strict zero-argument CLI, fixture-corpus regressions,
  [design](.github/M11_OWNER_ISOLATION.md), exact 80-path npm
  candidate and complete bounded M6-J excluded-source SHA-256 custody.
- **Engineering accepted:** [PR #237](../../pull/237) merged at `579a5da1`, independent [main push CI #1111](../../actions/runs/40723378613) **4/4 PASS** on Windows/Ubuntu Node20/22. This remains synthetic owner separation, **not real authentication**, LLM behavior, or external MCP authorization. #21/#43/#59 remain open.

## M11-J/K/L — in-flight owned HTTP cancellation and late-response isolation (merged engineering)

- [Issue #234](../../issues/234): new source-only
  `tools/m11-cancelled-response.mjs`. Two owned fictional HTTP requests
  enter a disposable `127.0.0.1` listener, but the owner cancels A
  **after both validated request bodies are processed**. The listener
  witnesses A's response closure before sending an independently
  checked B response.
- **M11-J:** A cannot be readmitted after abort; a deliberately
  attempted late response is suppressed after socket closure. Only
  B's exact ID/session/content can enter M10's toy gateway.
- **M11-K:** 14 fixed scenarios (two positive, 12 expected negative)
  cover cross-session/replayed responses, wrong IDs, added authority,
  malformed/duplicate JSON, redirects, oversized or stalled replies,
  duplicated request IDs and forged headers. Independently check
  real HTTP request/deny counts, both socket closes and zero
  protected fictional effects.
- **M11-L:** no-argument CLI, regression across all reviewed fixtures,
  [design and limitations](.github/M11_CANCELLED_RESPONSE.md), exact
  80-path npm candidate, and full M6-J bounded excluded-source hashing.
- **Engineering accepted:** [PR #235](../../pull/235) merged as `e9d736a9`; independent [main push CI #1102](../../actions/runs/40716067377) **4/4 PASS** on Windows/Ubuntu Node20/22. This is a local first-party cancellation witness, not a real LLM or external target. Beta/audit/authorization #59/#43/#21 remain open.

## M11-G/H/I — overlapping localhost requests with per-response correlation (merged engineering)

- [Issue #232](../../issues/232) introduces
  `tools/m11-concurrent-response.mjs`. Two first-party source-owned
  JSON-RPC-shaped HTTP requests are **concurrently in flight**
  against one disposable `127.0.0.1` listener (OS-selected port).
  The server records overlapping pending requests and supports
  both A-before-B and deliberately **B-before-A** response issuance.
- **M11-G:** validate actual response bytes and exact request ID,
  fictional session marker, approved content and status **per client**
  before independently passing a tool result to its M10 toy gateway.
- **M11-H:** 13 deliberate negative fault modes reject replayed/swapped
  results, unexpected authority, malformed/duplicate-key responses,
  redirects, oversized/stalled output, duplicated or unknown request
  IDs and forged headers. Count actual HTTP accepts/denials, response
  closures and TCP socket cleanup; a failed second reply never
  manufactures a second successful gateway session.
- **M11-I:** zero-argument CLI, regression coverage for all reviewed
  fictional fixture proposals, privacy-safe fixed counts,
  [design guide](.github/M11_CONCURRENT_RESPONSE.md), preserved M4
  discovery-only contract and exact 80-path npm candidate; M6-J
  continues to SHA-256 hash every excluded source.
- **Engineering accepted:** [PR #233](../../pull/233) merged at
  `a47087ae`; independent [main push CI #1093](../../actions/runs/40711380740)
  **4/4 PASS** across Windows/Ubuntu × Node20/22. This does not
  measure semantic LLM prompt-injection resistance or authorize
  external MCP targets; #21/#43/#59 remain open.

## M11-D/E/F — two-session owned loopback response and replay binding (merged engineering)

- [Issue #230](../../issues/230): source-only
  `tools/m11-replay-session.mjs` checks an accepted M11-A/B/C owned
  discovery/transport prerequisite, then verifies two distinct
  fixed `127.0.0.1` JSON-RPC-shaped tool requests in order.
- **M11-D:** bind every on-wire response to exact source-owned request
  ID, fictional task-session marker and strictly reviewed JSON content
  **before** delivering the result to its independent M10 toy gateway.
  Both legitimate task results can be consumed as data; no embedded
  instruction may select an action or provide authority.
- **M11-E:** 15 negative fixed modes cover stale/replayed/swapped
  response bodies, malformed envelopes, duplicates, extra authority,
  forged request metadata, repeated IDs, wrong order and
  post-completion replay, redirect, oversized body and timeout.
  Independently check actual HTTP request/deny counts, number of
  toy sessions completed, and cleanup of every socket/response.
- **M11-F:** no-argument CLI, strict API argument validation,
  cross-fixture and no-echo regression tests, [reviewed design](.github/M11_REPLAY_SESSION.md),
  unchanged protected M4 discovery contract and exact 80-path npm
  candidate, with M6-J full bounded hashed excluded-source custody.
- **Engineering accepted:** [PR #231](../../pull/231), [PR CI #1082](../../actions/runs/40705618413) **4/4 PASS**, independent [main CI #1083](../../actions/runs/40706248682) **4/4 PASS** (1066/1066 in verified Ubuntu Node20). This is first-party loopback evidence, **not** actual LLM resistance to prompt injection, independent audit or real-target authorization. External #21/#43/#59 remain open.

## M11-A/B/C — fixed owned localhost tool-result trust bridge (merged engineering)

- [Issue #228](../../issues/228) adds
  `tools/m11-loopback-tool-result.mjs`, a source-only, zero-argument
  two-stage first-party local test: the existing M4-B6-A strict
  `server/discover` staging call, followed by **a separate**
  ephemeral `127.0.0.1` MCP-shaped `tools/call` response mock.
  The protected discovery server still denies `tools/call`.
- The client validates the exact JSON-RPC-shaped envelope, source-owned
  fictional task data, request/response bounds, fixed method/version/
  Origin/Host, socket cleanup and timeouts. Actual loopback response
  bytes enter the M10 stateful toy gateway **as data only**; no
  embedded instruction is interpreted.
- `test/m11-loopback-tool-result.test.mjs` requires one positive
  and ten negative source-authored transport/discovery controls,
  invalid-option rejection, privacy non-echo, cross-fixture positive
  coverage, no external tool/process/model calls and the unchanged
  80-path npm candidate. [Design](.github/M11_LOOPBACK_TOOL_RESULT.md).
- **Engineering accepted:** [PR #229](../../pull/229), [PR CI #1072](../../actions/runs/40702189623) **4/4 PASS**, independent [main push CI #1073](../../actions/runs/40702705968) **4/4 PASS**. This is a real *first-party localhost* HTTP transfer, **not** real-agent prompt-injection safety, MCP conformance or authorized external testing. #21/#43/#59 remain open.

## M10-G/H/I — stateful toy-agent task/result witness (merged engineering)

- [Issue #226](../../issues/226): source-only
  `tools/toy-agent-session.mjs` adds a parent-owned in-memory state
  machine (`NEW → AWAITING_RESULT → RESULT_RECEIVED → FINISHED`).
  The toy agent must start one fictional task, consume one tool result
  **only as untrusted data**, and then finish.
- The parent gateway independently counts actual in-memory JavaScript
  method calls and rejects premature, replayed and post-completion
  tool-result deliveries. Unrelated read/tool calls and forged authority
  claims are denied with **zero** protected effects.
- [M10-G/H/I design](.github/M10_TOY_AGENT_SESSION.md) and
  `test/m10-toy-agent-session.test.mjs` check eight fixed source-owned
  scenarios (one PASS, seven expected FAIL), all contributor fixtures,
  cross-session witness isolation, false claims, no-echo CLI and the
  unchanged 80-path npm release inventory.
- **Engineering accepted:** [PR #227](../../pull/227), [PR CI #1061](../../actions/runs/40689253808) **4/4 PASS**, and independent [post-merge main CI #1062](../../actions/runs/40689852321) **4/4 PASS**. This is **not** an LLM, real-agent prompt-injection assessment, OS-level file witness, external MCP contact or release approval. #21/#43/#59 remain open.

## M10-D/E/F — batch toy-agent gateway replay for fictional fixtures (merged engineering)

- [Issue #223](../../issues/223): `tools/toy-agent-batch.mjs` replays
  every strictly bounded source-owned fictional JSON contribution through
  the deterministic M10 toy-agent/gateway method-call harness, in five
  reviewed fixed modes (one safe and four deliberately unsafe).
- The separate verifier checks exact method-call and denial counts, no
  protected effects, no external operations and rejects forged real-agent
  evidence. A single mismatch fails the batch without echoing file names
  or injected text.
- `test/m10-toy-agent-batch.test.mjs` covers each contribution, negative
  report mutations, hidden/accessor properties, no-echo CLI and the locked
  npm inventory. [Contributor guide](.github/M10_TOY_AGENT_BATCH.md).
- **Engineering merged:** [PR #224](../../pull/224), [PR CI #1044](../../actions/runs/40678464485) successful. Latest combined [main push CI #1053](../../actions/runs/40687127717) **4/4 PASS**. Still **not a real AI agent** or semantic prompt-injection detector; #21/#43/#59 remain open.

## M10-A/B/C — first-party toy-agent method-call witness (merged engineering)

- **M10-A:** [Issue #221](../../issues/221) implements a deterministic
  source-owned toy agent that consumes a validated fictional tool result
  and calls only a parent-owned in-memory gateway. Unlike M9, the gateway
  counts actual in-memory method invocations, not caller-authored event lists.
- **M10-B:** five reviewed cases cover safe data-only processing and four
  deliberate fault modes (unrelated file request, unauthorized tool request,
  forged authority, and combined). All protected effects remain zero;
  the four expected fault outcomes must be FAIL while the aggregate
  fixed selftest must match all five predictions.
- **M10-C:** `tools/toy-agent-exchange.mjs` runs without arguments, and
  `test/m10-toy-agent-exchange.test.mjs` verifies strict input boundaries,
  exact observed counters, all fictional fixtures, no-echo output and
  unchanged npm 80-path inventory. [Guide](.github/M10_TOY_AGENT_EXCHANGE.md).
- **Engineering merged:** [PR #222](../../pull/222), [PR CI #1034](../../actions/runs/40677630122) **4/4 PASS** (1013/1013 per verified Ubuntu job); post-merge main CI not separately verified. **Not an LLM, real agent, semantic injection
  detector, OS sandbox, real file access, or external MCP target.**
  Independent external beta #59, audit #43, and real-target #21 open.

## M9-J/K/L — public fixture privacy hygiene and submission checklist (merged engineering)

- [Issue #219](../../issues/219) adds conservative, no-echo privacy
  indicators to the M8 strict fictional fixture validator for obvious
  URL schemes, absolute home paths, email-shaped strings, common token
  prefixes, private-key headers and IPv4 literals.
- **M9-J:** refuses clearly private-looking material in the fixture's
  three bounded public text fields without evaluating any injected
  instructions or contacting external services.
- **M9-K:** extends the existing fixture test suite with synthetic
  rejection examples in every freeform text field and positive tests
  preserving safe fictional scenario submissions.
- **M9-L:** adds a GitHub PR template and guidance requiring manual
  sanitization and explaining that this is **not a complete secret
  scanner** nor an assessment of a real AI agent.
- **Engineering merged:** [PR #220](../../pull/220), [PR CI #1023](../../actions/runs/40675851048) **4/4 PASS** (1000/1000 per verified Ubuntu job); separate post-merge verification pending. Pinned 80-path npm inventory unchanged.
  External approval/beta/audit gates #21/#59/#43 remain open.

## M9-G/H/I — human-readable fictional contributor review (merged engineering)

- [Issue #217](../../issues/217) adds source-only
  `node tools/fixture-contributor-summary.mjs`, combining the M9-E
  bounded fixture batch and the M9-F **43 mutations per fixture**.
- **M9-G:** strict report renderer accepts only exact first-party
  symbolic schemas, verified bounded integer counts and all explicit
  false real-agent/authorization claims. It prints no contributor data,
  file names, paths or attack text.
- **M9-H:** deterministic CLI and tampering tests reject forged PASS,
  conflicting counters, prototype/accessor-backed JS objects, hidden
  properties, extra arguments and authority escalation claims.
- **M9-I:** README and the fixture-only contributor guide explain
  a single safe command and distinguish fictional report sensitivity
  from actual agent security assessment.
- **Engineering merged:** [PR #218](../../pull/218), [PR CI #1014](../../actions/runs/40668580343) **4/4 PASS**, 997/997 per verified Ubuntu job. Separate post-merge main CI not yet confirmed. No real MCP target, model, prompt execution, independent beta or audit. #21/#43/#59 open.

## M9-F — fictional policy report negative-control matrix (merged engineering)

- [Issue #215](../../issues/215) adds source-only
  `tools/fictional-negative-control-matrix.mjs`, which loads all reviewed
  fictional fixtures (maximum 16) through the M8/M9-C/M9-E preflight.
- Each pristine source-authored symbolic result must PASS the independently
  checked M9-E contract. **43 fixed mutations per fixture** must then
  be rejected, covering forged authority/observation flags, rule and
  decision tampering, protected effects and duplicated/missing controls.
- `test/m9-negative-control-matrix.test.mjs` verifies deterministic
  rejection, every fixture's coverage, no-echo responses and the exact
  80-path npm package inventory. All local commands remain source-only.
- **Engineering merged:** [PR #216](../../pull/216), [PR CI #1003](../../actions/runs/40667424349) **4/4 PASS** (989/989 per verified Ubuntu job); separate post-merge main verification pending. This is synthetic regression sensitivity,
  **not** real-agent prompt-injection detection, independent beta,
  independent audit or external target authorization (#59/#43/#21).

## M9-E — one-command fictional fixture batch preflight (merged engineering)

- [Issue #213](../../issues/213): `tools/fixture-batch-preflight.mjs`
  discovers only the fixed repo-owned `.github/fixture-proposals/` folder.
  It rejects symlinks, non-JSON entries, extra CLI arguments, empty sets
  and collections over 16 files, and never echoes paths or payload text.
- Every contribution is passed through the bounded M8 file loader and
  M9-C source-authored four-probe policy bridge. The batch verifier
  independently checks all four fixed symbolic decisions, three
  denials, zero protected fictional effects and explicit no-real-execution
  flags; a single mismatch fails the entire batch.
- `test/m9-fixture-batch-preflight.test.mjs` covers deterministic
  ordering, malformed symbolic outcome mutations, getter/symbol
  injection, no-echo CLI, file enumeration and locked npm 80-path inventory.
- **Engineering merged:** [PR #214](../../pull/214), [PR CI #994](../../actions/runs/40666262279) **4/4 PASS** (980/980 per verified Ubuntu job); separate post-merge main CI verification pending. This is not real agent
  execution, semantic prompt-injection assessment, independent beta or
  real-target authorization. Issues #21/#43/#59 remain open.

## M9-D — zero-write fictional fixture template generator (merged engineering)

- [Issue #210](../../issues/210) adds
  `node tools/fixture-proposal-template.mjs <case-id>`, a source-only,
  no-write generator of **raw JSON** matching the strict M8 fixture schema.
- Validated lowercase fictional IDs are used solely in a local fixture
  file name; unsafe or extra arguments are rejected without echo.
- `test/m9-fixture-proposal-template.test.mjs` checks deterministic
  safe output, malformed/secret-looking IDs, CLI no-echo, compatibility
  with M8 validation and M9-C fixed policy checks, and unchanged npm
  80-file inventory.
- The generator does **not** execute the injected instruction, contact
  external MCP servers, write files, run agents, or evaluate semantic
  prompt-injection resilience.
- **Engineering merged:** [PR #211](../../pull/211) after PR CI 4/4 PASS; main post-merge CI independently not yet confirmed. External beta/audit/real-target approvals #59/#43/#21 remain open.

## M9-C — fixture-only JSON to fixed policy-gate bridge (merged engineering)

- [Issue #208](../../issues/208) extends M8 fixture-only submissions with
  the [source-only M9-C bridge](.github/M9_FIXTURE_POLICY_BRIDGE.md).
  Contributors submit a synthetic `.github/fixture-proposals/*.json`
  without editing test-runner source.
- `tools/fixture-policy-bridge.mjs` uses the strict M8 bounded loader and
  M9-B in-memory policy witness. **Only four fixed source-authored probes**
  run: task data accepted as data; unrelated file-read request denied;
  unauthorized tool call denied; forged tool-result authority denied.
- `test/m9-fixture-policy-bridge.test.mjs` discovers all fixture proposals
  and tests strict schema/path/argument controls, no echo, zero protected
  simulated effects and preservation of the 80-file npm inventory.
- **Not a semantic prompt-injection detector:** the contents of a fixture's
  embedded instructions are never interpreted or fed to a model, and
  no real agent/MCP/file operation is observed. A `PASS` is limited to
  fixed synthetic policy gate controls.
- **Engineering merged:** [PR #209](../../pull/209), [PR CI #975](../../actions/runs/40646461057) **4/4 PASS** (962/962 per verified Ubuntu job); separate post-merge main CI not verified. #21/#43/#59 remain open.

## M9-B — parent-owned in-memory fictional action gate (merged engineering)

- [Issue #206](../../issues/206): source-only
  [M9-B gate design](.github/M9_IN_MEMORY_ACTION_GATE.md) separates
  lower-trust `UNTRUSTED_TOOL_RESULT` data from task authority.
- `tools/in-memory-injection-gate.mjs` applies a strict allowlist to
  source-owned action/resource enums. Legitimate `TASK_DATA` may be
  consumed as data, but a fictional unrelated file read, unauthorized
  tool call or forged tool-result approval is rejected.
- The in-memory parent-owned witness records permitted task-data handling
  separately from denied action proposals, with zero committed protected
  effects. **This does not observe OS or real-agent effects.**
- `test/m9-in-memory-injection-gate.test.mjs` checks positive and
  negative controls, forged authority, resource mismatch, dense data
  bounds, privacy/no-echo CLI and unchanged 80-file npm inventory.
- **Engineering merged:** [PR #207](../../pull/207), [PR CI #961](../../actions/runs/40645338212) **4/4 PASS** (952/952 per verified Ubuntu job); post-merge main CI not separately verified. No actual MCP/model execution, real filesystem access, customer data, independent beta or audit. #21/#43/#59 remain open.

## M9-A — first-party symbolic injection evaluator (merged engineering)

- [Issue #204](../../issues/204) defines the next safe extension:
  [M9 symbolic trust-boundary RFC](.github/M9_SYMBOLIC_INJECTION_RFC.md),
  which explicitly separates expected safe behavior, author-supplied
  symbolic observations and real-agent behavior (**not observed**).
- Source-only `tools/symbolic-injection-evaluator.mjs` compares a single
  reviewed fictional tool-result fixture against four fixed symbolic trace
  examples: clean task, injected instruction rejected, unrelated file-read
  request, and unauthorized tool-call request. Both negative examples must
  produce symbolic FAIL for the combined selftest to PASS.
- `test/m9-symbolic-injection.test.mjs` guards event validation, cross-resource
  violations, missing rejection evidence, attempted false-success claims,
  no-echo reporting, zero-argument CLI and release inventory boundaries.
- **Engineering merged:** [PR #205](../../pull/205) and [PR CI #953](../../actions/runs/40644593810) **4/4 PASS**, 938/938 per tested Linux job. Separate post-merge main CI verification pending. No actual agent execution, unrelated
  file read, external MCP contact, real prompt-injection detection, beta
  evidence, independent audit or authorization is asserted. #21/#43/#59
  remain open.

## M8-S/T/U — independent fictional fixture-only intake (merged engineering)

- **M8-S — source-only intake:** `tools/fixture-proposal-check.mjs` validates a
  bounded **fictional** tool-result prompt-injection JSON proposal placed in
  `.github/fixture-proposals/`. No agent, tool, local file requested by a
  payload, external MCP target, credentials or user-supplied executable runs.
  JSON structure is checked only; no claim of actual prompt-injection detection.
- **M8-T — automated safety gates:** all submitted proposal files are
  auto-discovered by tests, with positive and malicious-shape controls for
  extra fields, untrusted instruction text, unauthorized actions, duplicate
  JSON keys, and generic no-echo errors. Fixture-only PRs require no runner
  changes. The published npm package file inventory must remain unchanged.
- **M8-U — voluntary contributor handoff:** [fixture-only guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md)
  and [CONTRIBUTING](CONTRIBUTING.md) explain how to contribute a synthetic
  mixed-data/instruction case; the [beta volunteer handoff](.github/BETA_VOLUNTEER_HANDOFF.md)
  distinguishes a case proposal from **actual independent beta execution**.
- **Engineering merged:** [PR #203](../../pull/203), [PR CI #945](../../actions/runs/40642598475)
  **4/4 PASS** (925/925 tests per job); separate post-merge main CI verification pending. A fixture shape PASS is not a model
  safety assessment, independent beta [#59](../../issues/59), audit [#43](../../issues/43)
  or real-target approval [#21](../../issues/21).



## M7-S/T/U — independent beta handoff preparation

- **M7-S:** concise [voluntary beta handoff](.github/BETA_VOLUNTEER_HANDOFF.md) with exact public-source revision selection, offline-first test instructions, and minimal opt-in feedback fields.
- **M7-T:** source-backed assertions ensure the instructions preserve the fictional-only scope, privacy boundaries, independent evidence and owner-acceptance requirements.
- **M7-U:** README links to the handoff so a voluntary independent contributor can find it; engineering completion does **not** satisfy [M5-06 #59](../../issues/59). The owner has authorized invitations and an opt-in call is published in [#195](../../issues/195); external user MCP servers remain off limits, and the acceptance checklist remains open.

## M8-D/E/F — offline descriptor troubleshooting

- **M8-D:** fixed, source-authored privacy-safe `readerGuide` for existing
  `adapter-check` and `adapter-onboard` PASS/ERROR results. It shows
  local schema/policy repair steps without accessing a real MCP server.
- **M8-E:** CLI and pure-function regressions cover successful fictional
  descriptors, invalid private input and no-echo failure behavior.
- **M8-F:** README shows how to use the existing local validation command;
  preserve JSON-v1 and default-deny authorization.
- **Gate:** Windows/Ubuntu × Node 20/22 4/4 CI, followed by post-merge main
  verification. No independent beta, real-project testing or external
  target approval is implied.

## M8 — quick dual-transport fictional adapter smoke

- **M8-A:** `node tools/adapter-smoke.mjs` runs the existing fixed in-memory kit/quickstart checks for both `stdio` and `streamable-http`; no manual JSON export, file writes, external process or MCP target contact.
- **M8-B:** negative CLI argument controls and two-transport output assertions, including the non-packaged source-only boundary.
- **M8-C:** README discovery, with explicit separation between a convenient synthetic smoke and future authorized real-project interoperability.
- **Acceptance:** Windows/Ubuntu Node20/22 CI 4/4 and verified post-merge `main`; does not satisfy independent beta [#59](../../issues/59) or real MCP approval.

## M7 onboarding evidence (verified through 2026-10-26)

- **M7-A/B/C:** offline first-run guide and reviewed commands — [PR #188](../../pull/188).
- **M7-D/E/F:** actual local walkthroughs for both `stdio` and `streamable-http`, tampered-kit denial and progress evidence — [PR #189](../../pull/189).
- **M7-G/H/I:** reject contradictory, accessor-backed and malformed synthetic beta-summary claims — [PR #190](../../pull/190).
- **M7-J/K/L:** source-only, opt-in fictional beta Markdown feedback card — [PR #191](../../pull/191).
- **M7-M/N/O:** read-only local checkout SHA/dirty-state receipt without local file-path disclosure — [PR #192](../../pull/192).
- **M7-P/Q/R:** one-command clean-checkout fictional beta review — [PR #193](../../pull/193).
- **M7-S/T/U:** optional independent-volunteer handoff outside locked npm-package inventory and opt-in public invitation [#195](../../issues/195) — [PR #194](../../pull/194). The owner authorized outreach on 2026-10-26.
- **Engineering acceptance:** final post-merge [main CI #40358493703](../../actions/runs/40358493703) **4/4 PASS** on Windows/Ubuntu with Node.js 20/22. These are first-party offline tests, not external adoption or live MCP proof.
- **External evidence still required:** [M5-06 #59](../../issues/59) stays **OPEN** pending a real consenting independent developer, sanitized reproducible feedback, manual provenance review, triage, fresh CI and owner acceptance. Independent audit [#43](../../issues/43), actual MCP target authorization and release are separate gates.

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



## M6-M — sparse synthetic trace fail-closed boundary

- **DONE — direct offline synthetic trace audit fix:** [Issue #174](../../issues/174),
  [merged implementation PR #175](../../pull/175),
  [PR CI #40184100043](../../actions/runs/40184100043) and
  [post-merge main CI #40184294598](../../actions/runs/40184294598):
  **4/4 PASS, 797/797 tests/job**, zero failed/skipped on Windows/Ubuntu
  Node20/22. Corrected a real validation bug: `Array.forEach` skipped
  sparse holes, allowing `auditRecords(new Array(1))` to report
  `PASS` without checking an event. Direct `auditRecords` now refuses
  sparse/accessor-backed/hidden-index event arrays before traversal.
  Records must contain ordinary own-data fields, denying inherited
  authorization flags, getters, hidden/symbol fields and foreign
  prototypes without executing ordinary getters. Ten new literal
  tests cover the bypass, symbolic errors, legacy fictional JSONL,
  200-finding truncation and CLI JSON-v1 PASS/FAIL/no echo.
  The package remains **80 files**, zero new runtime dependencies,
  credentials, real target execution or npm publication. This is not
  an independent audit or malicious JS Proxy sandbox. Gates #21/#43/#59
  remain OPEN.

## M6-L — direct fictional policy data boundary

- **DONE — first-party offline policy API validation hardening:**
  [Issue #171](../../issues/171), [implementation PR #172](../../pull/172),
  [PR CI #40180123223](../../actions/runs/40180123223) and
  [post-merge main CI #40180428936](../../actions/runs/40180428936):
  **4/4 PASS, 787/787 tests/job**, zero failures/skips on Windows/Ubuntu
  Node20/22. The direct JS `src/policy.mjs` module now accepts only
  ordinary own-data records and dense own-data scope/action arrays,
  rejecting inherited owner/grant fields, getters/accessors, sparse
  arrays, unexpected symbols/hidden properties and foreign prototypes
  before such fields can influence synthetic decisions. Eight independent
  tests cover failures without invoking ordinary getters and preservation
  of existing first-party fixture PASS behavior. Explicit limitation:
  this is NOT an OS/JS Proxy sandbox or real-world operator proof.
  npm package stays **80 paths**, zero new dependencies or runtime
  privileges. Independent gates #21/#43/#59 still OPEN.

## M6-K — strict JSON numeric and depth fail-closed hardening

- **DONE — actual first-party input validation fix:** [Issue #168](../../issues/168),
  [merged PR #169](../../pull/169), [PR CI #40178865822](../../actions/runs/40178865822)
  and [post-merge main CI #40179073042](../../actions/runs/40179073042):
  **4/4 PASS, 779/779 tests/job**, zero fail/skipped on Windows/Ubuntu
  Node20/22. First-party `src/strict-json.mjs` now pre-bounds quoted-string-
  aware JSON nesting before native parsing and rejects JSON numbers silently
  converted to `Infinity`, nonzero values rounded to zero, or integer values
  outside safe JS integer precision. Eight new literal negative and positive
  controls exercise top-level and nested numeric overflow/underflow,
  precision, deep arrays/objects, escapes/quoted brackets, duplicate keys,
  malformed JSON, JSONL and sanitized CLI exit2. Existing JSON-v1 public
  command compatibility maintained; **80 shipped npm paths** and zero
  dependencies/new execution capabilities. This is not an external MCP target
  security audit or stable-release approval. #21/#43/#59 remain OPEN.

## M6-J — bounded first-party independent assessor handoff

- **DONE — local engineering handoff, not independent review:**
  [Issue #165](../../issues/165), [merged PR #166](../../pull/166),
  [PR CI #40176896559](../../actions/runs/40176896559) and
  [post-merge main CI #40177103990](../../actions/runs/40177103990):
  **4/4 PASS, 771/771 tests/job**, zero failures/skips on Windows/Ubuntu
  Node20/22. Eight new tests verify optional nonpackaged
  `tools/reviewer-handoff.mjs` source/archive receipts and additional
  deterministic per-file SHA-256 inventory for every source under
  excluded `.github/`, `test/`, `tools/` review surfaces (not
  shipped npm files). Negative controls reject altered content and
  internally inconsistent/forged packets, invalid UTF-8, duplicate keys,
  oversized inputs, symlinks and unauthorized gate claims; 0/1/2
  MATCH/MISMATCH/INVALID exits are preserved. Source archive still
  exactly **80 paths**, zero new runtime dependencies, no release or
  external MCP contact. Nine independent approval/provenance/evidence
  fields remain **NOT_VERIFIED**. Author-operated self-consistent
  receipts are not external provenance or an audit. Gates #21, #43 and
  #59 are still OPEN.

## M6-I — offline archive custody and installed byte-receipt

- **DONE — strictly local engineering preflight:** [Issue #162](../../issues/162),
  [merged implementation PR #163](../../pull/163), [PR CI #40175558109](../../actions/runs/40175558109)
  and [post-merge main CI #40175726328](../../actions/runs/40175726328):
  **4/4 PASS, 763/763 tests/job**, zero failed/skipped on Windows/Ubuntu
  Node20/22. Eight new tests cover exact raw installed byte comparisons,
  npm archive SHA-256/SHA-512 and metadata, two-pack reproducibility,
  hostile/forged canonical receipts, direct symlink and unsafe path guards,
  and the only permitted Windows CLI shebang normalization. The opt-in
  `tools/reviewer-archive.mjs` generates a local SHA/integrity receipt
  from temporary offline npm archives; the 80-file installed package is
  verified and temporary archives are removed. Packaged file count remains
  **80**, with zero new runtime dependencies, install hooks or live target
  access. **Self-computed artifact hashes are not independent provenance,
  source authentication, audit approval or release permission.** Gates
  #21 (real MCP targets), #43 (independent security audit) and #59
  (independent external beta) remain **OPEN**.

## M6-H — nonpackaged reviewer source-byte receipt

- **DONE — engineering-only local source-byte preflight:** [Issue #159](../../issues/159),
  [merged PR #160](../../pull/160),
  [PR CI #40173187361](../../actions/runs/40173187361) and
  [post-merge main CI #40173346649](../../actions/runs/40173346649):
  **4/4 PASS, 755/755 tests/job**, zero failures/skips on Windows/Ubuntu
  Node 20/22. Eight new tests cover deterministic `snapshot`/
  `verify` receipts against the exact **80-file** offline npm dry-run
  inventory, SHA-256 of each raw source file and canonical ordered index,
  malformed/duplicate JSON, invalid UTF-8, oversize/symlink/path
  rejection, simulated source mutations and forged approval claims.
  The opt-in tool lives in nonpackaged `tools/`, zero new runtime
  dependencies or executable install/publish hooks. **Caveat:** a local
  self-consistent receipt can be forged, is not a signed source identity,
  does not hash the produced tarball, and does not satisfy independent
  assessor/security/provenance gate #43. Real-target authorization #21,
  external independent beta #59 and publication consent remain OPEN.

## M6-G — backward-compatibility/authorization regression guard

- **DONE — fictional offline public contract maintenance only:**
  [Issue #156](../../issues/156), [merged PR #157](../../pull/157),
  [PR CI #40169124810](../../actions/runs/40169124810),
  [post-merge main CI #40169200481](../../actions/runs/40169200481):
  **4/4 PASS, 747/747 tests/job**, 0 failures/skips on Windows/Ubuntu
  Node20/22. Eight new independent literal compatibility tests pin selected
  JSON-v1 help/version and both inert transport contract semantics,
  quickstart, exported kit verification, fictional clean/detected/mismatch
  0/1/2 exits and the separate M6-F text-only view. Negative controls reject
  malformed/forged PASS/readerGuide/authority values, invalid UTF-8,
  oversize, duplicate JSON keys, ANSI/secret/path echo and leaf symlinks.
  A test-owned runtime preloader witnesses selected Node first-party
  network/process API calls on non-contact command paths; it is not
  an OS sandbox, proof of absence of all egress or independent audit.
  The unrelated installed offline npm tarball regression remains covered.
  No new runtime dependencies/paid APIs, no new CLI command, no package
  inventory change (**80 paths**) or stable npm publish. Real-target
  #21, independent security review #43 and external beta #59 stay **OPEN**.

## M6-F — strictly opt-in fictional terminal report interpretation

- **DONE — fictional offline UX only:** [Issue #153](../../issues/153),
  [merged PR #154](../../pull/154), [PR CI #40166068973](../../actions/runs/40166068973)
  and [post-merge main CI #40166187805](../../actions/runs/40166187805):
  **4/4 PASS, 739/739 tests/job**, zero failures/skips on Ubuntu/Windows
  Node20/22. `adapter-report-view <local-expectation-json>` recomputes
  **only bounded fictional Boolean/enum symbolic assertions** and prints
  reviewed human-language guidance, two next steps and explicit no-authority
  conditions. Unlike existing JSON-v1 commands, the new text view is opt-in
  only. Strict adversarial source and installed offline npm-tarball checks
  for both fictional transports reject untrusted report claims,
  ANSI/control injection, paths, malformed/oversized/UTF-8 data and leaf
  symlinks. The 80-path npm package inventory and zero new dependencies
  remain unchanged. Real target #21, independent audit #43, and genuine
  independent beta #59 remain **OPEN**; no stable npm publication.

## M6-E — readable, non-authorizing offline results

- **DONE — fictional report interpretation only:** [Issue #150](../../issues/150), [merged PR #151](../../pull/151), [post-merge main CI #40164911500](../../actions/runs/40164911500): **4/4 PASS, 732/732 tests/job**, zero failed/skipped.
  Add source-owned fixed `readerGuide` strings to the existing JSON-v1
  output of `adapter-kit`, `adapter-quickstart`,
  `adapter-kit-verify` and `adapter-trace-expect`; distinguish
  clean synthetic PASS, correctly detected fictional safety FAIL,
  unexpected CI MISMATCH and invalid input. No free-text input
  interpolation, project scanning, additional executable command, new
  packaged paths or dependencies. Preserve legacy machine-readable
  exit codes; 80 reviewed packaged paths unchanged, no new dependencies.
  Independent gates #21, #43 and #59 remain OPEN.

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
