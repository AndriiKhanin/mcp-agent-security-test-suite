# Fictional-only external beta acceptance protocol (M5-05)

**Status:** engineering protocol for candidate `0.0.10-rc.1`. This document does **not** prove that an independent tester has run it. No real MCP servers, customer events, credentials, proprietary code, registry publication or external network tests are approved.

## F1 independent first-run beta — reviewed source candidate

This is a **fictional-only usability test**, not a live MCP assessment, vulnerability scanner, authorization, published npm package, independent security audit, or accepted beta. Submit feedback only if you independently and voluntarily run the commands. No target URL, credentials, proprietary configuration, customer files or production traces are needed.

## Reviewed baseline

- Repository: `AndriiKhanin/mcp-agent-security-test-suite`
- Exact source commit: `c85b03d01ccfbbd1acb1c21850638712824ed412`
- Context: maintainer-reported Windows Node.js 22.18.0 local full PASS; this does **not** establish independent Windows/Ubuntu beta or four-platform cloud CI for this revision.
- Supported beta environment: Windows or Ubuntu with Git and Node.js 20 or 22. Use a disposable checkout. Inspect source before execution, as local Node programs can execute code.
- This pin identifies the reviewed **pre-beta instruction baseline**, not a published release or a promise that later `main` is safe. Do not silently substitute a floating branch.

## Step 1 — verify the exact revision

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
git switch --detach c85b03d01ccfbbd1acb1c21850638712824ed412
git rev-parse HEAD
git status --short
node --version
```

Manually compare the complete SHA to the [public commit](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/commit/c85b03d01ccfbbd1acb1c21850638712824ed412). Stop if the SHA differs, if the checkout is dirty, or if Node is not version 20/22. A local Git command is not cryptographic proof of remote provenance.

## Step 2 — test the product's guided offline entry point

```sh
node src/cli.mjs start --text
node src/cli.mjs start examples/adapter-profiles/stdio-project.json --text
node src/cli.mjs start
```

The first two commands should exit **0** and print a human-readable summary explicitly stating the user MCP server was **not checked**. The last command should exit **0** with a JSON-v1 report, `productStage:"F1"`, `status:"PASS"`, `externalTargetContacted:false`, `operatorVerified:false` and `projectConnectionAuthorized:false`. These results cover only bundled fictional controls and the suite's disposable **127.0.0.1 loopback MCP mock**. Loopback traffic is still real local network activity, not an external server scan.

Do not pass a real client config or an actual server descriptor for this beta. If the local platform blocks loopback binding, report a local compatibility failure instead of claiming the project was tested.

## Step 3 — run the separate, fixed five-case fictional beta

```sh
node tools/beta-review.mjs
```

In the same clean pinned source checkout, this source-only helper reports local Git identity and executes five fixed first-party fictional acceptance checks. An expected intentionally unsafe scenario is detected by the checks; the combined report should indicate **PASS, 5/5 matched**, exit **0**. Actual mismatches are not an expected PASS. The generated report is locally self-reported; it cannot verify independent tester provenance.

The historical [M13 beta handoff](../.github/BETA_VOLUNTEER_HANDOFF.md) still pins `2ad680ed2e4c322374fdabf3c2007e396f893a59`; it remains a separate reproducible historical profile. Do not mix its CI attestation with the present revision.

## Step 4 — provide minimal independent usability feedback

Review and manually redact all text before posting to [independent beta gate #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) or the [public opt-in feedback form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose). Include only:

1. Public full 40-character revision; Windows or Ubuntu; Node 20 or 22.
2. Whether `start --text`, inert-descriptor `start --text`, and JSON `start` succeeded; observed exit code **0 / 1 / 2** for each.
3. Five-case `beta-review.mjs` verdict and matched count **0–5**; only public symbolic failure codes if needed.
4. What was confusing or inaccessible, plus a minimal fictional-only reproduction.

Do **not** paste raw reports, console histories, usernames, machine paths, local environment variables, proprietary server configs, access tokens, private endpoints or exploit details. Never upload your own real MCP client configuration, even if the command can validate a restricted inert shape. For confidential vulnerabilities follow [SECURITY.md](../SECURITY.md), not public issues.

## Reviewer interpretation

A volunteer result on this revision does not establish compatibility on other platforms or Node majors. No result means an independent run occurred until an actual voluntary report is reviewed. Maintainers must separately triage real feedback, rerun the full matrix on the *accepted* SHA, and obtain owner acceptance. F1 remains IN PROGRESS. F2 access still requires separate approval under [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21); beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) and independent audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) remain open.

---

## M14 — optional capability tour

For a **reviewed M14-or-later source checkout**, the following zero-argument
command demonstrates newer first-party features beyond the five fixed M5
beta checks:

```sh
node tools/beta-capability-tour.mjs
```

The script runs source-owned inert adapter smoke for both transports,
then four fixed in-memory fictional tool-result policy probes, a successful
request-scoped modern SSE result, and a rejected extra Authorization request
header. The last two use an ephemeral **IPv4 127.0.0.1** listener,
so this is *local loopback traffic*, not a zero-network operation.
Expected report: `status: "PASS"`, `checked: 4`, `matched: 4`,
`failed: 0`, `ruleCode: "ALL_FICTIONAL_CAPABILITIES_MATCH"`, exit 0.
Any mismatched observed witness returns `FAIL` / exit 1; forbidden
arguments or unavailable execution return `ERROR` / exit 2.
The output includes only source-authored symbolic case identifiers and
booleans, not the source fixture's embedded instruction, payloads or paths.

**Important version distinction:** the fixed M13 volunteer baseline
`2ad680ed2e4c322374fdabf3c2007e396f893a59` predates this optional
command. Do not claim it contains M14, and do not run unreviewed floating
`main` just to find it. A separately pinned M14 revision will be recorded
after its own PR and post-merge 4/4 CI complete. The original five-case
`node tools/beta-review.mjs` is still the **only** fixed M5 beta acceptance
protocol. The optional tour cannot verify independent participation, real
LLM injection resilience, external MCP server security or operator rights.
No release/real-target authorization is implied.

## M13-A/B/C — frozen self-service beta source snapshot and accurate combined report

Independent volunteers may use the explicitly pinned public commit
`2ad680ed2e4c322374fdabf3c2007e396f893a59` (four-job [main CI #40842071546](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40842071546): **4/4 PASS**).
After reviewing and cloning the **public source**, use
`git switch --detach 2ad680ed2e4c322374fdabf3c2007e396f893a59`, verify the exact full SHA with
`git rev-parse HEAD`, then run `node tools/beta-review.mjs` without
arguments. The [volunteer handoff](../.github/BETA_VOLUNTEER_HANDOFF.md)
contains the short copyable sequence. The historical pin is deliberate:
**do not silently substitute a floating `main`** or infer provenance from
local Git metadata. A different commit requires explicit revision review.

The combined Markdown report correctly names `beta-review.mjs` and refers
to the locally printed SHA; the separate `beta-feedback-card.mjs` retains
a manual SHA placeholder. Neither automatically submits feedback. This
stage improves developer ergonomics only, not beta evidence or real security.
Independent gate [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
remains OPEN pending a genuine consenting tester report.

## M7-P/Q/R — one-command local fictional beta review

A volunteer may run `node tools/beta-review.mjs` in a **clean public
checkout** with Node.js 20+ and Git installed. It performs the fixed
read-only local Git SHA/status check, refuses reported uncommitted or
untracked changes, and only then executes the existing five fixed offline
acceptance checks. The Markdown result labels its SHA as *locally reported*,
not independently verified. No user-supplied path, URL, server, command,
token or environment dump is accepted or printed. The command exits 0
for all five matched fictional checks, 1 for reported checkout changes
or fictional mismatches, and 2 for invalid use or unavailable evidence.

This is a convenient alternative to manually running
`node tools/beta-checkout-receipt.mjs` and
`node tools/beta-feedback-card.mjs` separately. Before voluntarily
sharing the output, an independent reviewer must manually compare the
SHA with the agreed public GitHub revision and sanitize any added
usability comments. Neither this script nor its output verifies remote
identity, independent execution or real MCP safety; manual acceptance
gate [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
remains open. The source-only `tools/` helper is not part of the npm
package and never submits feedback automatically.

## M7-M/N/O — local checkout receipt for volunteer beta review

Before executing the fixed offline beta controls in a clean public source
checkout, you may run:

```sh
node tools/beta-checkout-receipt.mjs
node tools/beta-feedback-card.mjs
```

The first command uses **only local, fixed Git read commands** to return
the full current commit SHA plus `NO_REPORTED_CHANGES` or
`CHANGES_PRESENT`. It never prints local filenames or raw Git
status output. Its JSON `sourceVerification:LOCAL_GIT_METADATA_ONLY`
**does not verify** the public remote, commit signature, ignored files,
external reviewer identity, or independent execution. A dirty checkout
returns exit 1. Invalid arguments or an inaccessible Git repository
return a static error with exit 2; a clean checkout returns exit 0.

The volunteer must still manually compare the SHA to the agreed, reviewed
public GitHub commit. Then run the second command to obtain the five-case
fictional feedback card and manually fill in system details and usability
feedback. This does not establish M5-06 independent beta acceptance:
consenting reviewer provenance, reproducible public revision, sanitized
feedback and human triage remain required. Neither command contacts MCP
servers or uploads evidence.

## M7-J/K/L — optional local beta feedback card

A volunteer using a **clean public checkout** can run the existing five fixed
fictional checks and produce a ready-to-review, minimal Markdown card:

```sh
node tools/beta-feedback-card.mjs
```

The tool accepts **no arguments**, runs the same local
`examples/beta-acceptance-check.mjs` five-case suite, and formats only fixed
case identifiers, symbolic results and instructions. It never records Git
identity, host details, credentials, endpoint URLs or participant information.
On matched controls it exits 0; if a fixed check fails it exits 1 and displays
the known mismatch rule; invalid invocation exits 2 with a static message.
The `tools/` script is available in a source checkout, **not** the npm
distribution.

The volunteer must manually fill in the full public commit SHA from
`git rev-parse HEAD`, Windows/Ubuntu, Node major, and optional sanitized
usability feedback. The card does not verify any of those fields. Do not
submit unreviewed terminal history or private paths. A volunteer may copy the
sanitized card into the public [fictional beta issue
form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose)
only after reviewing it. Genuine independent beta evidence requires a consenting
external developer, manual provenance verification and issue triage per
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59).
No public card, PASS, or author-run CI is a release or real-target authorization.

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

### M5-08 — offline consistency preflight for a future beta report

Reviewers may use the pure
`reviewBetaEvidenceSummary` export from
`examples/beta-acceptance-check.mjs` to check the **logical consistency of
a manually sanitized, symbolic CLAIM** before independent manual triage.
This helper reads no GitHub issues, never calls a real MCP target, and
never collects participant identities. It does not inspect or authenticate
the original environment. Do **not** paste real user reports or private
transcripts into it.

A valid input is exactly one version-1 plain record consisting of the
public fixed beta source SHA, candidate version, OS family (Windows or
Ubuntu), Node major (20 or 22), claimed runner PASS/FAIL, claimed number
of matches (0–5), and **all five** exact reviewed case identifiers in
canonical order, each with a boolean match and either `NONE` or one of
the fixed `BETA_PROCESS_FAILURE`, `BETA_REPORT_INVALID`,
`BETA_EXPECTATION_MISMATCH` symbolic codes. The helper rejects
unrecognized keys, URLs, names, private paths, arbitrary free-form text,
malformed fields, incoherent counts and false PASS statuses.

Successful structural checks return
`preflightStatus:CLAIM_CONSISTENT_ONLY`, never an accepted independent
evaluation. In every successful result,
`independentOriginVerified:false`, `actualExecutionVerified:false`,
`manualProvenanceReviewRequired:true`, `betaGateSatisfied:false`,
`securityCertified:false`, and `releaseAuthorized:false`.
Malformed claims produce the fixed
`INVALID_FICTIONAL_BETA_EVIDENCE_CLAIM` error, without reflecting the
input. This is **not** DLP: public reports must be reviewed by a human
before copying any information.

**No reviewer may treat** a self-declared consistent claim, author CI,
tool output, or a template as evidence that a consenting independent
developer actually ran the beta. The manual steps in
[#59](../../issues/59) remain necessary: establish an attributable
external source, check the reported public revision, reproduce fixed
fictional behavior, triage meaningful findings, verify fresh CI and
obtain explicit owner acceptance. Security audit [#43](../../issues/43)
and real-target authorization [#21](../../issues/21) stay separate.
No invitations or report retrieval occur automatically.

### 4. Independent acceptance remains a separate gate

The **independent usability gate** [#59](../../issues/59) remains OPEN
until a consenting independently operated tester provides a sanitized
first-hand report, a reviewer verifies provenance, triages findings,
reproduces results, fresh 4/4 CI passes, and the owner accepts the evidence.
A **manual provenance review** is mandatory; no author-run simulation is independent evidence.
The independent security audit [#43](../../issues/43) and real-target
authorization [#21](../../issues/21) also remain OPEN. A report template,
local pack, or successful author CI does not satisfy any of these gates.
