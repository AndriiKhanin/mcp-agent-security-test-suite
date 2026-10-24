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


## Independent evaluator quick path (M5-07, no live targets)

Only an opt-in fictional offline beta evaluation is permitted. No real
MCP endpoints, customer data, credentials, arbitrary processes or scans.
A matching archive digest or author-run CI is not independently operated
beta evidence, signed provenance or a published npm release.

**Reviewed baseline:** public source SHA
`65ded572c1720832ff3f59cb9cd0e3a6987edbdb`,
version `0.0.10-rc.1`; later revisions require a separately reviewed SHA.

### 1. Verify source identity and exercise fixed controls

With Git and Node.js 20 or 22 on Ubuntu or Windows PowerShell 7:

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

Confirm the full Git SHA matches before interpreting any result.
Git clone retrieves public source over the network; the commands that
follow perform only local fictional checks. The beta runner expects five
fictional matches, overall PASS and process exit **0**, reports a mismatch
with exit **1**, and rejects invalid invocation with exit **2**.
The portable smoke expects clean synthetic PASS, expected synthetic
violation with `observedSafetyStatus:FAIL` but matcher MATCH, and an
unexpected violation (inner matcher exit **1**). An expected symbolic
failure is not real target authorization.

### 2. Optional offline archive identity check

This verifies a locally generated tarball; it is **not** proof of
a signed release or byte-identical cross-platform builds.

PowerShell 7, at the fixed source root:

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
if ($ArchiveDigest.Length -ne 64) { throw 'Digest invalid' }
& node examples/beta-acceptance-check.mjs
if ($LASTEXITCODE -ne 0) { throw 'Offline beta contract failed' }
```

Ubuntu/Linux, at the same fixed source root:

```sh
pack_dir="$(mktemp -d)"
cache_dir="$(mktemp -d)"
npm_config_cache="$cache_dir" npm pack --offline --ignore-scripts --pack-destination "$pack_dir"
test -f "$pack_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"
sha256sum "$pack_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"
node examples/beta-acceptance-check.mjs
```

The **R1 package test** independently checks the reviewed **80-path**
npm inventory, disposable locally installed tarball, packaged CLI/SDK,
and cleanup. An archive digest computed by the author is not independent
publisher identity proof. No `npm publish` or registry install takes
place. Remove the optional local `mcp-fictional-beta-*` scratch
directories after review; these example commands do not clean them.

### 3. Submit only voluntary, minimal fictional feedback

Use the [opt-in public beta form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose)
only if you personally performed the checks. Include only the public
source commit, version, OS family, Node major, which offline commands
ran, whether the local archive was checked, status, 0–5 fixed matches,
symbolic rule codes and exit codes **0/1/2**, installation friction
and documentation clarity.

The form is not a data-loss prevention filter. Never include customer
MCP URLs, tokens, private transcripts, environment dumps, local paths,
shell history, screenshots of private information, credentials or
proprietary source. For security vulnerabilities use
[SECURITY.md](../SECURITY.md) rather than public issues.
No outreach, automatic upload, telemetry, private data collection or
live target access is part of this protocol.

### 4. Independent acceptance remains a separate gate

The **independent usability gate** [#59](../../issues/59) remains OPEN
until a consenting independently operated tester provides a sanitized
first-hand report, a reviewer verifies provenance, triages findings,
reproduces results, fresh 4/4 CI passes, and the owner accepts the evidence.
A **manual provenance review** is mandatory; no author-run simulation is independent evidence.
The independent security audit [#43](../../issues/43) and real-target
authorization [#21](../../issues/21) also remain OPEN. A report template,
local pack, or successful author CI does not satisfy any of these gates.
