# v0.0.10 stable release readiness — preflight, NOT a release

**Issue:** [R0 #26](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/26)  
**Candidate source version:** `0.0.10-rc.1` (do not silently bump it)  
**Disposition:** **R0 packaging preflight and R1 disposable offline installation ACCEPTED** by [PR #27](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/27), [PR #30](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/30) and [post-merge CI 39931897702](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39931897702) (**4/4 PASS; 357/357 per job**). Stable `v0.0.10` remains **NOT RELEASED**; no tag, persistent release tarball, GitHub Release, npm publication or destination approval is implied.

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
