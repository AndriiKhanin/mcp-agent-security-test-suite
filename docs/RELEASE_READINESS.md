# v0.0.10 stable release readiness — preflight, NOT a release

**Issue:** [R0 #26](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/26)  
**Candidate source version:** `0.0.10-rc.1` (do not silently bump it)  
**Disposition:** **R0–R4, R5-A and M5-01/02/03/04 engineering acceptance recorded** (R3 internal, R5-A heuristic; neither independent audit). Latest [M5-04 PR #55](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/55) and [post-merge main CI #39956798014](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39956798014): **4/4 PASS, 384/384 tests per job**. Stable `v0.0.10` remains **NOT RELEASED**; no tag, persistent release tarball, GitHub Release, npm publication or destination approval is implied.

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
