# v0.0.10 stable release readiness — preflight, NOT a release

> **Product finish line:** [F0–F6 roadmap](../ROADMAP.md#product-v10--finite-finish-line-authoritative-delivery-plan) and [single tracking #385](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/385). As of 2026-10-31, **F0 done, F1 next**, live external MCP authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21), independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59), independent review [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and owner publication permission **remain open**. Internal 4/4 CI is not release approval. Candidate `0.0.10-rc.1` unpublished.


## M36 — one-command offline candidate doctor (engineering accepted)

From a reviewed **source checkout**, run:

```sh
node tools/reviewer-handoff.mjs doctor
```

This extends the existing first-party M6-J reviewer handoff without
creating another release tool or source file. It executes actual
disposable local offline npm package + install checks and full local
source-byte SHA-256 custody: exact **80 packaged paths** and at most
**240 excluded .github/test/tools paths**. It returns a JSON v1 report
with locally computed package source index, excluded source index,
temporary raw archive SHA-256, SHA-512, matching npm `sha512-` integrity and installed-file index. These hashes are all self-computed, not signed or independently anchored. It never
copies the excluded test/tool source into the package, publishes an
artifact, contacts the registry or invokes a user MCP server.

`PASS` means ONLY local technical evidence was computed and reconciled.
The tool always returns `distributionDecision:
BLOCKED_PENDING_INDEPENDENT_GATES_AND_OWNER` and all publication,
independence, target-authority, signing and checkout-authentication
booleans **false**. It does not independently attest Git provenance
or release artifact identity. Invalid use/failure returns constant
`M36_OFFLINE_DISTRIBUTION_PRECHECK_UNAVAILABLE` and exit 2, without
echoing private path/token values. No stable tag, registry publication
or retained `.tgz` file is produced.

This command needs the source checkout and npm; the SOURCE-ONLY helper
is intentionally excluded from the frozen 80-file npm candidate.
It does not replace #43 independent audit, #59 genuine external beta,
#21 verified external MCP target approvals or owner's explicit release
decision. M36 engineering acceptance (2026-10-30):
[PR #331](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/331)
[PR CI #41036321059](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/41036321059)
**4/4 PASS** on Windows/Ubuntu Node20/22, merge SHA
`f13281d100634b9512ff698316b84927d1cec3f5`;
separately [main CI #41036858127](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/41036858127)
**4/4 PASS on the exact same SHA**. Ubuntu20: **1353/1353
tests**, 0 failed/skipped. [M36 issue #330](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/330)
closed for engineering only; stable release and independent
approval gates remain OPEN.


**Issue:** [R0 #26](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/26)  
**Candidate source version:** `0.0.10-rc.1` (do not silently bump it)  
**Disposition:** **R0–R4, R5-A and M5-01/02/03/04/05 engineering accepted** (R3 internal, R5-A heuristic; not an independent audit or beta validation). [M4-B0 PR #62](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/62) and [post-merge main CI #39962836679](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39962836679): **4/4 PASS, 397/397 tests per job**. Subsequently [M4-B1 PR #65](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/65) and [main CI #39966437277](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39966437277) confirmed **4/4 PASS, 407/407 tests per job**, only for fixed first-party local mocks. The subsequent offline [M4-B2 PR #68](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/68) and [main CI #39972783779](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39972783779) confirmed **4/4 PASS, 417/417 tests per job**. Following [M4-B3 PR #71](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/71), [main CI #39979727977](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39979727977) confirmed **4/4 PASS, 428/428 tests per job** for mock-only pre-effect admission. No verified user-owner authorization exists. This universal descriptor validation does not authorize actual target connections. Independent beta gate [M5-06 #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) and security gate [R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) OPEN. Stable `v0.0.10` remains **NOT RELEASED**; no tag, persistent release tarball, GitHub Release, npm publication or destination approval is implied.

## What is actually implemented

- MIT-licensed, zero-runtime-dependency Node.js >=20 security-contract test suite with fictional authorization, replay and MCP-shaped JSON-RPC fixtures.
- Additive JSON report schema v1. Explicit exit codes 0=PASS, 1=detected violation, 2=invalid input.
- First-party fixed stdio mock and owner-approved **M4-A first-party IPv4 loopback-only** mock. The latter **opens a temporary real OS socket** at `127.0.0.1`; no external MCP target or network scanning is supported.
- M4-A baseline: [PR #24](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/24), [CI](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39926302349) **353/353 per job**. After three R0 package tests, [main CI](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39928732232) confirmed **356/356 per job**; the added R1 disposable local tarball/CLI test raised this to [357/357 on main](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39931897702) on Ubuntu/Windows Node20/22.
- **M4-B external targets, credentials, OAuth, production testing, independent security certification and general MCP interoperability remain unimplemented and unapproved.**

These checks are intentionally synthetic; they are **not** real vulnerability detection or an independent audit.

## Candidate npm packaging contract

This is candidate package metadata, **not evidence of registry publication**:

| Item | Decision |
| --- | --- |
| Source version | Keep `0.0.10-rc.1` until explicit stable-release approval |
| Executable bin | `mcp-agent-security` → `src/cli.mjs`, with existing Node shebang |
| Included content | Reviewed `src/`, `fixtures/`, `docs/`, `examples/`, README, LICENSE, SECURITY, CONTRIBUTING, ROADMAP and npm's required `package.json` |
| Excluded content | Development `test/`, `.github/`, `.git/`, `node_modules/`, logs, archives, key files and `.env` material |
| Dependencies | No runtime, optional, peer or development dependency installation required |
| Lifecycle scripts | No automatic install, prepare, prepack, postpack or publish hooks |
| Offline manifest evidence | `npm pack --dry-run --json --ignore-scripts --offline` via bundled npm CLI, verified by `test/release-package.test.mjs`; creates **no distributable tarball** and never publishes |
| Local install smoke (R1) | `test/installed-cli-smoke.test.mjs` packs a disposable local `.tgz`, installs **only that local tarball** in an OS temp directory with offline mode and disabled lifecycle scripts, validates the installed CLI and deletes all temporary files; **no registry or release** |

The `files` allowlist prevents accidental broad packing, but is **not** proof of absence of secrets in legitimate source/fixtures. Maintainers must still review every changed file and generated artifact before publication.

## Reproducible local preflight

For a clean authorized checkout using Node.js >=20 and bundled npm (no install):

```sh
node --version
npm --version
npm run release:preflight
node --test
node examples/offline-ci-check.mjs
```

The R0 manifest test invokes **npm pack in dry-run and offline mode**. The R1 smoke also packs an actual `.tgz` **only into a disposable OS temp directory** and uses offline npm install from that local file with all lifecycle scripts disabled; it validates that the installed CLI handles PASS/FAIL/ERROR correctly and deletes the temporary tarball, npm cache and installation. Neither publishes a package nor contacts an npm registry. `npm test` includes both tests. Separately, M4-A tests briefly open fixed 127.0.0.1 TCP sockets, never remote targets.

## R2: exact package-file inventory lock — accepted

[R2 Issue #32](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/32) adds an explicit, sorted filename inventory under `test/expected-package-files.json`, **outside the packaged distribution**. The existing offline npm dry-run manifest test must match it exactly. Additional or missing packaged paths fail the test; an intentional package-content change therefore requires an explicit diff and inventory update. Separate synthetic mutation controls ensure both extra and missing filenames are rejected.

This check guards **package membership**, not the safety of bytes inside an already-approved file. It is **not** a secret scanner, independent security audit, protocol certification or release authorization. Acceptance evidence: [merged PR #33](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/33) (four reviewed files) and [post-merge main CI 39934465115](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39934465115) — **4/4 PASS, 358/358 tests per job**, 0 failures/skips. [Issue #32](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/32) is closed. Stable release remains gated.

## R3 internal source/package review — release remains blocked

[R3 Issue #35](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/35) records a [targeted internal review](R3_INTERNAL_RELEASE_REVIEW.md) of the synthetic source and its release surface. Its presence in `docs/` intentionally expands the exact package path inventory from the R2 historical baseline of **54** to **55** reviewed paths. The path lock does not attest package bytes, code provenance or secret absence. **This is not an independent review and does not satisfy the independent review, destination, version, authorization or post-publication gates below.** R3 internal-review delivery is **accepted** via [PR #36](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/36) and [post-merge main CI 39935969302](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39935969302) — **4/4 PASS and 358/358 tests per job**, 0 failures/skips. The independent review and release gates below remain unchecked.

## R4 — offline artifact reproducibility preflight (accepted)

[Issue #38](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/38) introduces a [two-pack local artifact test](R4_ARTIFACT_INTEGRITY.md) with per-job SHA-256/sha512 checks and source-to-installed-file byte comparisons. The new R4 document intentionally grows the exact package inventory from R3's **55** to **56** files. This is *not* an independently signed or uploaded artifact, a provenance attestation, or publication approval. The [six-file PR #39](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/39) merged after corrected 4/4 PR CI; [post-merge main CI 39938436907](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39938436907) passed **4/4, 360/360 per job**, 0 failed/skipped. The strict install-file comparison allows only npm's known first-line Windows bin-shebang CRLF→LF normalization for `src/cli.mjs`. R4 is accepted as **same-job** offline reproducibility evidence, not independent provenance. The release gates below remain open.

## R5-A — content hygiene and assessor handoff (accepted)

[R5-A Issue #41](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/41) adds a [bounded source-content preflight and independent reviewer checklist](R5_INDEPENDENT_REVIEW.md). New public documentation deliberately changes the expected package inventory to **57 paths**. The heuristic can detect only selected synthetic key/token signatures and invalid text; it is **not** a comprehensive private-source/secret audit, a third-party review or a provenance attestation. Engineering acceptance: [PR #42](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/42) merged; [main CI #39941412361](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39941412361) confirmed **4/4 PASS, 364/364 per job**, 0 failed/skipped. [R5-B independent review #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and the owner publication gates below remain **unchecked**.

## M5-01 — zero-argument bundled demo (accepted)

[M5-01 #45](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/45) adds `node src/cli.mjs demo` as a no-input smoke demonstration from source or the disposable installed package. It checks only two bundled fictional fixtures; extra CLI arguments are rejected, and no real MCP endpoints are contacted. [Main CI #39944760146](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39944760146) confirms **4/4 PASS and 370/370 tests per job**. This neither certifies the product nor authorizes a stable release.

## M5-02/03 — diagnostic guidance and OSS feedback (accepted engineering scope)

[M5-02 #49](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/49) added strictly bounded symbolic remediation guidance, accepted via [main CI #39953093188](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39953093188) (**4/4, 374/374**). [M5-03 #48](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/48) added fictional-only public GitHub feedback forms, with five tests and required disclosure confirmation, accepted via [PR #52](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/52) and [main CI #39955000316](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39955000316) (**4/4, 379/379**). Public forms cannot sanitize submitted text and confidential vulnerability reports must use the private reporting procedure in SECURITY.md. Neither step constitutes external adoption, independent security review or authorization to publish.

## M5-04 — local CLI discovery (accepted)

[M5-04 #54](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/54) adds canonical `help`/`version` commands with `--help/-h/--version/-V` aliases, using only static offline guidance and validated bundled `package.json` metadata. The installed local tarball smoke verifies both commands; [main CI #39956798014](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39956798014) passed **4/4, 384/384 tests per job**. No package membership change or publication implied. Independent review, owner consent, final version, destination and provenance remain open.

## M5-05 — fictional beta protocol (engineering accepted; external gate open)

[Issue #57](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/57) shipped an offline first-party runner with five fixed synthetic cases, of which one deliberately failing negative control must be detected. Two reviewed public package files expand exact membership **58 to 60**. [Merged PR #58](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/58) and [main CI #39959008260](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39959008260) were **4/4 PASS, 390/390 tests per job**. This attests only to engineering functionality, **not** that an independent developer has used it. Genuine beta-test results are tracked under [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59); independent source/security review [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and explicit publication permission remain mandatory.

## M4-B0 universal project configuration — accepted, connection disabled

[Issue #61](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/61), [merged PR #62](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/62) and [post-merge main CI #39962836679](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39962836679) confirmed **4/4 PASS, 397/397 tests per job**. The universal stdio/Streamable-HTTP descriptor performs validation only: `executionEnabled: false`, `connectionStatus: NOT_ATTEMPTED`. No real MCP project was contacted, and no secrets or arbitrary commands used. Four reviewed file paths increase package membership 60→64. [M4-B1 #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63) tracks fixed first-party mock transport execution; real target approvals and independent [R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) remain OPEN.

## M4-B1 fixed-local mock lifecycle — engineering accepted

[Issue #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63), [PR #65](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/65), and [CI #39966437277](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39966437277) establish **4/4 PASS, 407/407 tests/job** on first-party-only stdio and local IPv4 HTTP mocks. Exactly two shipped first-party paths extend the inventory **64→66**. This proves neither connection to user MCP servers nor security certification. [M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66) concerns offline permission checks only; explicit owner target approvals, R5-B and publication gates remain open.

## M4-B2 — offline permission consistency (accepted; authorization NOT verified)

[M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66) delivered an inert self-asserted permission envelope, a canonical descriptor SHA-256 consistency check, expiring/revoked/forbidden-method negative controls, a generic sanitized CLI and three reviewed packaged paths (**66→69**). [Merged PR #68](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/68) and [main CI #39972783779](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39972783779) were **4/4 PASS, 417/417 tests/job**. The hash is not a signature, the claim is not an authenticated grant, and nonce tracking is not durable. PASS never enables external contact or verifies owner identity. [M4-B3 mock-only #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69), independent R5-B #43, real target RFC #21 and owner release permission remain separate open gates.

## M4-B3 — mock-only pre-effect admission (accepted; not live authorization)

[Issue #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69) and [merged PR #71](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/71) add synthetic first-party operator consistency checked **before** constructing built-in drivers. The guarded stdio path uses one strict `initialize` request and rejects an appended `tools/call` message; HTTP uses only the existing first-party loopback ping. Rejected mock scenarios self-report no attempted probe, with supporting source-order review. The next [M4-B4 #72](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/72) specifically addresses independent test-only effect observation; neither stage is an OS sandbox or real authentication. Two reviewed package paths increase manifest **69→71**. [Post-merge main CI #39979727977](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39979727977) passed **4/4, 428/428 tests per job**, 0 failed/skipped. Real-target RFC #21, security review R5-B #43 and owner publication approval remain separate open gates.

## Explicit release gates — NOT ALL COMPLETE

- [x] Current source/license/package metadata inspected. `package.json` retains release-candidate version.
- [x] Define `bin` and an explicit package-file allowlist without adding dependencies or install scripts.
- [x] Add automated offline, dry-run package manifest test covering required paths and forbidden archive entries.
- [x] **Verified four CI jobs** (Ubuntu/Windows × Node20/22) on reviewed [PR #27](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/27): [run 39928377400](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39928377400), **4/4 PASS**.
- [x] **Verified post-merge main CI** [run 39928732232](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39928732232): **4/4, 356/356 per job, 0 failed/skipped**; main SHA `401df77d2e73d6c10e563f9b558b2abf480db587`. Package manifest is checked automatically by offline dry-run. R1 separately verified a **temporary local tarball install**; no persistent distribution artifact, registry publication or stable release was created.
- [ ] **Perform independent release/security review:** no secrets or private source, accurate threat claims, bounded local sockets, permissions/provenance, disclaimer and changelog.
- [ ] **Choose publication destination and owner authorization:** GitHub signed/annotated tag + Release only, npm registry, or both. Registry account name, 2FA, provenance and any public package-name collision must be checked *before* attempting npm publication.
- [x] **R1 disposable package installation smoke**: [automated test](../test/installed-cli-smoke.test.mjs) built an actual candidate tarball in OS temp, verified SHA256 and binary shim, installed from the tarball with `--offline --ignore-scripts`, exercised packaged CLI PASS/FAIL/ERROR and erased the artifact. [R1 PR CI](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39931628737) and [post-merge main CI](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39931897702) both **4/4 PASS, 357/357 per job**, 0 failures/skips. [Issue #29](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/29) closed with SHA/evidence. No distribution authorization granted.
- [ ] **Stable version decision:** only a separate reviewed PR may change `0.0.10-rc.1` → `0.0.10`, finalize changelog/release notes, and obtain separate explicit permission to tag/publish.
- [ ] **Post-publication verification:** check target tag/artifact hash, fresh installation, CLI exit codes and public documentation, after explicitly authorized publication.

**Release decision:** until all applicable gates pass and the owner approves the destination and publication, state stays **NOT RELEASED**. A passing test matrix alone does not change this status.

## Honest product status and roadmap

The initial M1–M3 six-issue roadmap is done; M4-A first-party local mock is done. This does **not** complete external MCP security testing, product 1.0, stable publication, or security certification. [Roadmap](../ROADMAP.md) · [Security Policy](../SECURITY.md) · [M4 approval RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md). Commercial/private Stable Bridge artifacts are not part of this repository or package.
