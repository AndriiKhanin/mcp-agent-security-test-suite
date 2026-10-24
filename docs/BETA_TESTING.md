# Fictional-only external beta acceptance protocol (M5-05)

**Status:** engineering protocol for candidate `0.0.10-rc.1`. This document does **not** prove that an independent tester has run it. No real MCP servers, customer events, credentials, proprietary code, registry publication or external network tests are approved.

## Fresh-checkout procedure (Node.js 20 or 22; Windows / Ubuntu)

Use a public clean clone, *not* a privileged runtime or real MCP integration environment. The `git clone` step retrieves this public repository; **the subsequent beta check itself makes no network requests**.

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
git rev-parse HEAD
node --version
node examples/beta-acceptance-check.mjs
```

Use the exact revision of the beta protocol accepted by the project; record the **full commit SHA** from `git rev-parse HEAD` rather than only the floating `main` branch name. The script accepts **zero** arguments and invokes only the bundled first-party `src/cli.mjs` with fixed fictional examples, under strict child-process time and output bounds. No `npm install`, API keys, registry, external MCP target, external scanner, shell interpolation or telemetry are needed. A success report exits 0, has `betaSchemaVersion: 1`, `profile: "fictional-beta-acceptance-v1"`, `status: "PASS"`, `total: 5`, `passed: 5`, and `failed: 0`.

## Independent evaluator quick path (M5-07, no live targets)

This is an **opt-in manual evaluation** of an open-source prerelease.
There has been **no independent participant evidenced by author CI**.
Read [SECURITY.md](../SECURITY.md) before reporting a suspected vulnerability.
Do not test a real MCP endpoint, import private traces, add keys, or paste
a production server configuration. Use only the bundled fictional examples.

**Baseline for repeatability:** reviewed source commit
`65ded572c1720832ff3f59cb9cd0e3a6987edbdb`,
candidate `0.0.10-rc.1`. This is an **immutable public source identity**,
not a published npm release or an independently signed artifact. Later
revisions need their own full SHA and CI review. A public clone needs network
access **only to retrieve Git source**; all test and packaging steps below
are locally offline and must not contact MCP services.

### 1. Check source identity and prerequisites

In a clean, unprivileged directory with **Git, Node.js 20 or 22 and npm
bundled with Node**, run the following after obtaining the public repository:

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
git switch --detach 65ded572c1720832ff3f59cb9cd0e3a6987edbdb
git rev-parse HEAD
node --version
node -p "require('./package.json').version"
node examples/beta-acceptance-check.mjs
node examples/offline-ci-check.mjs
```

Before interpreting anything, verify the full output of `git rev-parse HEAD`
equals the selected SHA and the version is `0.0.10-rc.1`. If the commit
cannot be checked out, **stop**; do not substitute a different branch or
guess an identity. These examples run only the suite's fixed fictional
fixtures. The beta runner returns `PASS`, `total:5`, `passed:5`,
`failed:0`, and process exit **0** when all five fixed assertions match.
It returns **1** on a control mismatch and **2** for bad invocation. The
portable smoke returns outer exit **0** only after it verifies a clean
symbolic case, an **expected synthetic violation** with
`observedSafetyStatus:FAIL` but matcher `MATCH`, and an unexpected
symbolic violation with matcher `MISMATCH` and inner exit **1**.

PowerShell 7 on Windows can use the same commands (invoke `git`/`node`
directly, not `Invoke-Expression`). If a command exits nonzero, record
only which **fixed command** failed and its **numeric exit code**, never
your local path, shell transcript or environment variables.

### 2. Optional offline archive identity check

This confirms a *locally produced* tarball, **not** authenticity signed
by an independent publisher. On Windows PowerShell 7, from the checked-out
source root:

```powershell
$Pack = Join-Path $env:TEMP 'mcp-fictional-beta-pack'
$Cache = Join-Path $env:TEMP 'mcp-fictional-beta-cache'
New-Item -ItemType Directory -Force -Path $Pack, $Cache | Out-Null
$env:npm_config_cache = $Cache
& npm pack --offline --ignore-scripts --pack-destination $Pack
if ($LASTEXITCODE -ne 0) { throw 'Offline pack failed' }
$Archive = Join-Path $Pack 'mcp-agent-security-test-suite-0.0.10-rc.1.tgz'
if (-not (Test-Path -LiteralPath $Archive -PathType Leaf)) { throw 'Archive missing' }
$ArchiveDigest = (Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash
if ($ArchiveDigest -notmatch '^[A-Fa-f0-9]{64}

| Case identifier | Expected CLI result | Purpose |
| --- | --- | --- |
| `OFFLINE_HELP` | PASS / exit 0 | Reviewed offline command discovery |
| `LOCAL_VERSION` | PASS / exit 0, `0.0.10-rc.1` | Candidate metadata, **not** proof of npm publication |
| `FIXED_DEMO` | PASS / exit 0 | Two fictional positive and detected-negative expectations |
| `POLICY_DENIAL` | PASS / exit 0 | Nine simulated denials with no unauthorized effects, two allowed effects |
| `RETRY_MUTATION` | **FAIL / exit 1**, `RETRY_PARAMS_CHANGED` | An intentionally unsafe protocol retry must be detected |

**Important:** `RETRY_MUTATION` returning CLI `FAIL` is the **expected successful detection**. If it unexpectedly passes or reports the wrong rule, the combined beta verdict is FAIL. The runner prints **only fixed case identifiers, expected verdicts and symbolic failure codes**. It does not forward native command output, original exceptions or local paths. A wrong invocation (any argument or target URL) returns JSON `ERROR` with exit 2 and `BETA_ARGUMENTS_NOT_ALLOWED`. Failures have symbolic `BETA_*` codes; troubleshoot in public using fictional evidence only.

The runner can be called from a checked-out source tree or from its reviewed location inside a **locally installed disposable tarball**, and the project's CI verifies both forms. It does not attempt cross-platform byte-identical package builds.

## What a real beta tester should report

Use the [Synthetic beta acceptance report](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose) template in the public Issue chooser. If you prefer not to post publicly, do not submit confidential evidence at all; potential vulnerabilities go via [SECURITY.md](../SECURITY.md) in a private channel.

Include only: full **public Git commit SHA**, candidate version, OS family, Node major version, `PASS` or `FAIL` runner verdict, number of matched cases, list of `BETA_*` rule codes if anything was unexpected, and a *fictional-only* reproduction. You may describe whether the instructions were clear, what took extra steps and any accessibility/usefulness concern. **Do not include** shell history, environment dumps, screenshots with private details, copied raw native CLI results, actual user names or machine paths, real tokens, customer logs, private MCP endpoints, secrets, network destinations, or proof-of-exploitation. Required form checkboxes are not a sanitization mechanism: inspect your own text.

### Engineering and genuine external acceptance remain different

- **Engineering DONE only after:** this script and reporter form are reviewed, source and disposable installed-tarball tests are green on **Ubuntu/Windows × Node20/22**, and the merged main CI is 4/4 PASS. No real test participant is implied by these checks.
- **Independent usability evidence pending until:** an independently operated, consented developer submits a verifiable, sanitized report with public source commit, Node/OS, per-case verdict and feedback. It must be triaged and confirmed against the fixed candidate. Count only reports supported by actual evidence; do not invent testimonials, participation counts, adoption, or security effectiveness.
- **Stable release remains gated:** independent security/provenance assessment [R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43), owner authorization, final artifact identity and publication destination are separate obligations.

The synthetic policy checks are not a penetration test, real-server MCP conformance test or independent security certification.

## Engineering acceptance evidence (2026-10-23)

The script and opt-in form were accepted in [M5-05 Issue #57](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/57) through [merged PR #58](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/58), source commit `8f163154e1cacc617dbb48f603502daa80533c09`. [Post-merge main CI #39959008260](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39959008260) confirmed **4/4 PASS and 390/390 tests/job** across Windows/Ubuntu Node20/22, 0 failures/skips, including the actual disposable locally installed npm tarball check.

This verifies the test protocol itself, not independent usage, and does not imply any invitation was sent. [M5-06 independent beta feedback #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) is **OPEN**, as is [R5-B external security/provenance audit #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43).
) { throw 'Digest invalid' }
& node examples/beta-acceptance-check.mjs
if ($LASTEXITCODE -ne 0) { throw 'Offline beta contract failed' }
```

On Ubuntu/Linux, from that same source root:

```sh
pack_dir="$(mktemp -d)"
cache_dir="$(mktemp -d)"
npm_config_cache="$cache_dir" npm pack --offline --ignore-scripts --pack-destination "$pack_dir"
test -f "$pack_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"
sha256sum "$pack_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"
node examples/beta-acceptance-check.mjs
```

Keep the **64-digit archive SHA-256 locally** if you need to compare your
own archive to a copy of the same bytes. A digest computed from the archive
does not by itself establish publisher identity or reproducible builds.
The automated R1 package test goes further: it checks the locked **80-path
package inventory**, creates and installs a local tarball with
`--offline --ignore-scripts`, and exercises CLI plus packaged SDK from a
disposable fictional adopter workspace. It cleans archive, install and
temporary cache in `finally`. No `npm publish` or registry install is
part of this evaluation. Remove your optional `mcp-fictional-beta-*`
scratch directories after review.

### 3. Report minimal, manually reviewed evidence

Use the existing [opt-in public beta form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose)
**only if you actually ran the fixed commands yourself**. Include:

- Public full commit SHA and prerelease version; OS family and Node major
- Whether clone/check-out, offline pack and smoke worked (or were not run)
- Five-case beta verdict, count from 0 to 5, and **only** approved
  `OFFLINE_HELP`, `LOCAL_VERSION`, `FIXED_DEMO`, `POLICY_DENIAL`,
  `RETRY_MUTATION` and `BETA_*` symbolic identifiers
- Expected/observed command exit codes **0/1/2**, without raw report bodies
- Installation friction, documentation clarity, and a fictional-only
  reproduction if something failed

The public form is **not a data-loss prevention filter**. Never submit real
MCP URLs, tokens, API keys, OAuth responses, customer logs, shell history,
local paths, screenshots of private details or proprietary source.
For security findings use the [private reporting channel](../SECURITY.md).
No outreach, automatic upload, telemetry, or evidence submission is
performed by any of these steps.

### 4. Separate acceptance decisions

A developer's honest, first-hand **fictional-only** beta report can support
the independent usability gate [#59](../../issues/59) only after manual
provenance review, reproduction and triage. A green author-run GitHub Actions
job, a prepared form, a source clone, or a matching archive hash **does not**
constitute independent evidence. External real-target authorization [#21](../../issues/21)
and independent security/provenance review [#43](../../issues/43) remain
**OPEN**, independent of any beta usability result.

## Expected fixed controls

| Case identifier | Expected CLI result | Purpose |
| --- | --- | --- |
| `OFFLINE_HELP` | PASS / exit 0 | Reviewed offline command discovery |
| `LOCAL_VERSION` | PASS / exit 0, `0.0.10-rc.1` | Candidate metadata, **not** proof of npm publication |
| `FIXED_DEMO` | PASS / exit 0 | Two fictional positive and detected-negative expectations |
| `POLICY_DENIAL` | PASS / exit 0 | Nine simulated denials with no unauthorized effects, two allowed effects |
| `RETRY_MUTATION` | **FAIL / exit 1**, `RETRY_PARAMS_CHANGED` | An intentionally unsafe protocol retry must be detected |

**Important:** `RETRY_MUTATION` returning CLI `FAIL` is the **expected successful detection**. If it unexpectedly passes or reports the wrong rule, the combined beta verdict is FAIL. The runner prints **only fixed case identifiers, expected verdicts and symbolic failure codes**. It does not forward native command output, original exceptions or local paths. A wrong invocation (any argument or target URL) returns JSON `ERROR` with exit 2 and `BETA_ARGUMENTS_NOT_ALLOWED`. Failures have symbolic `BETA_*` codes; troubleshoot in public using fictional evidence only.

The runner can be called from a checked-out source tree or from its reviewed location inside a **locally installed disposable tarball**, and the project's CI verifies both forms. It does not attempt cross-platform byte-identical package builds.

## What a real beta tester should report

Use the [Synthetic beta acceptance report](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose) template in the public Issue chooser. If you prefer not to post publicly, do not submit confidential evidence at all; potential vulnerabilities go via [SECURITY.md](../SECURITY.md) in a private channel.

Include only: full **public Git commit SHA**, candidate version, OS family, Node major version, `PASS` or `FAIL` runner verdict, number of matched cases, list of `BETA_*` rule codes if anything was unexpected, and a *fictional-only* reproduction. You may describe whether the instructions were clear, what took extra steps and any accessibility/usefulness concern. **Do not include** shell history, environment dumps, screenshots with private details, copied raw native CLI results, actual user names or machine paths, real tokens, customer logs, private MCP endpoints, secrets, network destinations, or proof-of-exploitation. Required form checkboxes are not a sanitization mechanism: inspect your own text.

### Engineering and genuine external acceptance remain different

- **Engineering DONE only after:** this script and reporter form are reviewed, source and disposable installed-tarball tests are green on **Ubuntu/Windows × Node20/22**, and the merged main CI is 4/4 PASS. No real test participant is implied by these checks.
- **Independent usability evidence pending until:** an independently operated, consented developer submits a verifiable, sanitized report with public source commit, Node/OS, per-case verdict and feedback. It must be triaged and confirmed against the fixed candidate. Count only reports supported by actual evidence; do not invent testimonials, participation counts, adoption, or security effectiveness.
- **Stable release remains gated:** independent security/provenance assessment [R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43), owner authorization, final artifact identity and publication destination are separate obligations.

The synthetic policy checks are not a penetration test, real-server MCP conformance test or independent security certification.

## Engineering acceptance evidence (2026-10-23)

The script and opt-in form were accepted in [M5-05 Issue #57](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/57) through [merged PR #58](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/58), source commit `8f163154e1cacc617dbb48f603502daa80533c09`. [Post-merge main CI #39959008260](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39959008260) confirmed **4/4 PASS and 390/390 tests/job** across Windows/Ubuntu Node20/22, 0 failures/skips, including the actual disposable locally installed npm tarball check.

This verifies the test protocol itself, not independent usage, and does not imply any invitation was sent. [M5-06 independent beta feedback #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) is **OPEN**, as is [R5-B external security/provenance audit #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43).
