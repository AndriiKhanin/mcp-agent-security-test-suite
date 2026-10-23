# v0.0.10 stable release readiness — preflight, NOT a release

**Issue:** [R0 #26](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/26)  
**Candidate source version:** `0.0.10-rc.1` (do not silently bump it)  
**Disposition:** **Release candidate under review**. No stable `v0.0.10` tag, GitHub Release, npm publication or distribution approval is implied by passing CI.

## What is actually implemented

- MIT-licensed, zero-runtime-dependency Node.js >=20 security-contract test suite with fictional authorization, replay and MCP-shaped JSON-RPC fixtures.
- Additive JSON report schema v1. Explicit exit codes 0=PASS, 1=detected violation, 2=invalid input.
- First-party fixed stdio mock and owner-approved **M4-A first-party IPv4 loopback-only** mock. The latter **opens a temporary real OS socket** at `127.0.0.1`; no external MCP target or network scanning is supported.
- Previous main acceptance: [M4-A PR #24](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/24), [CI](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39926302349) **353/353 per job**, Ubuntu/Windows × Node20/22. Any additional preflight tests must be independently revalidated before updating the count.
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

The preflight test itself invokes **local npm pack in dry-run and offline mode** using fixed, non-user-supplied flags and ignores lifecycle scripts; it validates the JSON manifest's allowlist, required files, executable shebang and package metadata. `npm test` includes this audit. It does not create or upload artifacts, contact registries, or connect to real MCP targets. `node --test` still executes the **fixed local loopback** test and therefore briefly opens 127.0.0.1 TCP sockets.

## Explicit release gates — NOT ALL COMPLETE

- [x] Current source/license/package metadata inspected. `package.json` retains release-candidate version.
- [x] Define `bin` and an explicit package-file allowlist without adding dependencies or install scripts.
- [x] Add automated offline, dry-run package manifest test covering required paths and forbidden archive entries.
- [ ] **Verify four CI jobs** (Ubuntu/Windows × Node20/22) on a reviewed PR for this release-preflight change.
- [ ] **Verify post-merge main CI**, counts, test failures and a clean diff; record immutable SHA and exact package list.
- [ ] **Perform independent release/security review:** no secrets or private source, accurate threat claims, bounded local sockets, permissions/provenance, disclaimer and changelog.
- [ ] **Choose publication destination and owner authorization:** GitHub signed/annotated tag + Release only, npm registry, or both. Registry account name, 2FA, provenance and any public package-name collision must be checked *before* attempting npm publication.
- [ ] **Package installation smoke test** of an actual versioned, offline artifact after explicit release-artifact authorization (distinct from dry-run).
- [ ] **Stable version decision:** only a separate reviewed PR may change `0.0.10-rc.1` → `0.0.10`, finalize changelog/release notes, and obtain separate explicit permission to tag/publish.
- [ ] **Post-publication verification:** check target tag/artifact hash, fresh installation, CLI exit codes and public documentation, after explicitly authorized publication.

**Release decision:** until all applicable gates pass and the owner approves the destination and publication, state stays **NOT RELEASED**. A passing test matrix alone does not change this status.

## Honest product status and roadmap

The initial M1–M3 six-issue roadmap is done; M4-A first-party local mock is done. This does **not** complete external MCP security testing, product 1.0, stable publication, or security certification. [Roadmap](../ROADMAP.md) · [Security Policy](../SECURITY.md) · [M4 approval RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md). Commercial/private Stable Bridge artifacts are not part of this repository or package.
