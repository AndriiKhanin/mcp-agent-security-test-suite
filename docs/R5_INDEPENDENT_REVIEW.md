# R5 — Independent security review handoff (NOT completed)

**Purpose:** provide a bounded source and package evidence pack to an assessor who is independent of the project's code author and can record their own conclusions. **Engineering delivery:** [R5-A #41](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/41) DONE. **Independent release gate:** [R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) OPEN. No assessor has been engaged or approved by this document. This is not proof of a completed independent audit.

## Current candidate and trustworthy starting points

**R5-C prepared handoff, NOT an independent finding or approval:** [Issue #135](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/135).
The reviewed engineering baseline for this handoff is the **public Git source commit**
`8720c7d7892f222a8203addeeef6eed8d2d24390`, candidate
`0.0.10-rc.1`, with [main CI #40115925583](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40115925583):
**4/4 PASS, 678/678 tests per Windows/Ubuntu Node 20/22 job**, no failed/skipped
tests. This is an **internal snapshot**; a reviewer must check the actual final
commit again. It is not a signed release, independently anchored digest,
independent assessor run, or permission to publish.

- The maintainer's internal R3 source review and risk register: [R3](R3_INTERNAL_RELEASE_REVIEW.md). Its scope is narrower than an independent product security assessment.
- The R4 same-job disposable artifact byte checks: [R4](R4_ARTIFACT_INTEGRITY.md), [verified main CI](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39938909362) at commit `f4416117755390399e9d0646a31df8e16e7a3dc8`, 4/4 OS/Node jobs and 360/360 tests per job. This is a **historical baseline**, not a cryptographic signature on a future deliverable.
- The active version remains `0.0.10-rc.1`, with **no stable artifact or publication authorization**. M4-B remote testing, credentials, OAuth and general MCP conformance are not implemented or approved.
- [Exact package path inventory](../test/expected-package-files.json) lives outside the distributable archive. Historically, R5-A grew the R4 inventory from 56 to **57** packaged paths. That count is historical only. **Current reviewed npm inventory: 80 paths**, as listed in the checked-in [`test/expected-package-files.json`](../test/expected-package-files.json). The manifest is intentionally outside the archive. Later commits must re-verify the exact actual file count/bytes; do not assume the SHA above identifies any subsequently changed tree.

## Proposed independent assessment procedure

1. **Establish assessor independence and scope.** Record reviewer affiliation, consent, date, source commit SHA, Node/npm versions and host OS. Obtain source through a trustworthy public origin and independently verify its exact Git revision. The maintainer should not supply unpublished proprietary source, local private paths, tokens or credentials.
2. **Read and inspect all 80 currently distributable paths and code execution surfaces.** Review licensing/provenance, package metadata and script hooks, entrypoint, dependency assumptions, file I/O, process invocation, synthetic policy/witness, fixed HTTP/stdio IPC, error sanitization, CI permissions and complete threat model. Check for credentials/private data using assessor-selected tools and human judgement, not just the bundled preflight.
3. **Run the full current tests from a clean checkout.** Use supported Node 20 or 22 and bundled npm, `npm test` and `npm run release:preflight`. Tests include temporary fixed first-party loopback listeners on `127.0.0.1`; these do not authorize external traffic. Do not supply real MCP targets, credentials, private logs or arbitrary process paths.
4. **Independently rebuild a temporary candidate artifact.** Use `npm pack --offline --ignore-scripts --json` in a disposable destination with a separate isolated npm cache. Record the *actual final candidate* Git SHA, exact **80-path inventory on the documented snapshot** (recount for any future source revision), output filename, raw SHA-256 digest, npm integrity data, npm/Node versions and toolchain provenance. Compare archive and source contents to an independently approved reference supplied over a separately trusted channel, not only to self-computed values in the same run. Dispose of local archives if no release retention is authorized.
5. **Report findings privately.** Classify severity, affected exact path/commit, reproducibility using fictional data only, mitigations and retest evidence. Never post exploit instructions, private logs, keys or identifiable data in public issues. Use the project's [security policy](../SECURITY.md) for private disclosure.
6. **Publish a scoped sign-off decision only after evidence.** Record what was assessed, exclusions, unresolved findings, independent reviewer's sign-off, final source identity, artifact digest/provenance and remaining risks. A passing engineering CI alone is not an independent sign-off.

## R5-A automatic source-content preflight

`test/r5-content-preflight.test.mjs` originally added limited pattern checks against 57 R5-A historical source paths; the current test enumerates the updated **80-path manifest**: file-size limit, valid UTF-8, no embedded NUL and a few high-confidence private-key/token **signatures**. Synthetic positive/negative controls demonstrate rejects. Results contain only file paths and symbolic rule codes; no offending bytes. It runs with `node --test` and has no new runtime dependency, network request or install hook.

**Limitations:** This is a heuristic, not an enterprise secret scanner or DLP guarantee. Unrecognized token formats, split/encoded material, ordinary passwords, unexpected copyrighted source, malicious code or unsafe behavior may pass. Benign strings may trigger false positives. A PASS does not attest source author, license rights, independent build provenance or readiness for live MCP target testing.

## R5-A verified engineering evidence

- [PR #42](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/42) merged at `34d07b2a2bf17bfea626b10524401c4aabaab0a9`.
- [Post-merge main CI #39941412361](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39941412361): **4/4 PASS, 364/364 tests per Windows/Ubuntu Node20/22 job**, 0 failed/skipped.
- This only attests that author-defined synthetic checks passed on the reviewed revision. It is NOT independent inspection of source, a signed release or publication consent.

## R5-C — assessor-operated, zero-customer-contact handoff

This is a **reproducible first-party documentation package only**. It has
not been independently executed or reviewed. Before starting, the owner must
authorize and identify an independent assessor and approve the assessment scope
per [release gate #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43).
The following commands operate only against the **public repository and its
fictional test fixtures**. Cloning public Git source can require internet
access; after the source is already fetched, the test and packaging steps use
only local files, npm offline mode, and fixed first-party loopback mocks.

### Exact source and permission boundary

- Independently obtain the public source and check out full commit
  `8720c7d7892f222a8203addeeef6eed8d2d24390`
  in a clean disposable working directory. Verify the output of
  `git rev-parse HEAD` exactly matches. Check that `package.json` declares
  `0.0.10-rc.1`; there is **no** signed release or npm registry artifact.
- Compare the real `npm pack --json --offline --ignore-scripts` file entries
  with all **80** exact entries in `test/expected-package-files.json`.
  A path lock cannot verify file bytes or independent source provenance.
- Review **all** packaged `src/`, `docs/`, `fixtures/`, `examples/`
  and top-level metadata bytes, plus relevant **excluded repository** review
  surfaces (`.github/workflows/ci.yml`, `test/`, checkout history,
  toolchain, read-only permissions and package scripts). The archive omits
  those excluded files: review their security impact separately, do not call
  them part of the 80 packaged paths. Confirm absence of unexpected install,
  prepare, prepack or publish lifecycle scripts and dependencies.
- Explicitly assess exact input/capabilities boundaries: CLI path access,
  JSON parser and output redaction, mock process/stdin/stdout behavior, local
  `127.0.0.1` listener and SSE/HTTP, grant/consent replay simulation,
  fictional token examples, and the `REAL_TARGET_NOT_AUTHORIZED` reporting
  boundary. The checker cannot prove a production credential vault, OS sandbox,
  general DLP, TLS/DNS/SSRF protections or real MCP-server interoperability.
- Treat the only permitted execution as first-party scripted offline test
  suites; **do not** contact user MCP endpoints, load private transcripts,
  invoke arbitrary stdio children or send OAuth tokens.

### Minimal assessor reproduction

On **Ubuntu** with Git, Node.js 20/22 and the bundled npm installed, in an
already fetched public checkout, run:

```sh
git switch --detach 8720c7d7892f222a8203addeeef6eed8d2d24390
test "$(git rev-parse HEAD)" = "8720c7d7892f222a8203addeeef6eed8d2d24390"
node --version
npm --version
node -p "require('./package.json').version"
npm test
npm run release:preflight
review_dir="$(mktemp -d)"
review_cache="$(mktemp -d)"
trap 'rm -rf "$review_dir" "$review_cache"' EXIT
npm_config_cache="$review_cache" npm_config_offline=true npm pack --offline --ignore-scripts --json --pack-destination "$review_dir"
test -f "$review_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"
sha256sum "$review_dir/mcp-agent-security-test-suite-0.0.10-rc.1.tgz"
```

On **Windows PowerShell 7**, from the already fetched public source root:

```powershell
$Expected = '8720c7d7892f222a8203addeeef6eed8d2d24390'
& git switch --detach $Expected
if ($LASTEXITCODE -ne 0) { throw 'Cannot check out source' }
$Actual = (& git rev-parse HEAD).Trim()
if ($Actual -ne $Expected) { throw 'Source SHA mismatch' }
& node --version
& npm --version
& node -p "require('./package.json').version"
& npm test
if ($LASTEXITCODE -ne 0) { throw 'Tests failed' }
& npm run release:preflight
if ($LASTEXITCODE -ne 0) { throw 'Package preflight failed' }
$ReviewDir = Join-Path $env:TEMP ('mcp-r5-review-' + [guid]::NewGuid().ToString('N'))
$Cache = Join-Path $env:TEMP ('mcp-r5-cache-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $ReviewDir, $Cache | Out-Null
try {
  $env:npm_config_cache = $Cache
  $env:npm_config_offline = 'true'
  & npm pack --offline --ignore-scripts --json --pack-destination $ReviewDir
  if ($LASTEXITCODE -ne 0) { throw 'Offline pack failed' }
  $Archive = Join-Path $ReviewDir 'mcp-agent-security-test-suite-0.0.10-rc.1.tgz'
  if (-not (Test-Path -LiteralPath $Archive -PathType Leaf)) { throw 'Archive missing' }
  (Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash
} finally {
  Remove-Item -LiteralPath $ReviewDir, $Cache -Recurse -Force -ErrorAction SilentlyContinue
}
```

Both examples calculate a *local* archive hash; **neither supplies an
independent artifact reference digest**, signs a package or proves
cross-OS reproducible builds. The assessor must obtain any accepted comparison
digest, signing identity or chain of custody from a **separately trusted
channel** and explicitly document that method. Repackaging on Windows may
normalize only the first-line shebang CRLF of `src/cli.mjs`; the existing
R4 test checks that narrow difference, not arbitrary newline rewriting.
Temporary artifact files should not be published or retained as a release.

### Human assessor report and decision checklist (not pre-filled)

The independent assessor, **not a repository CI bot**, must independently
record or mark **NOT VERIFIED** for each item:

1. Independence, assessor identity/affiliation, consent, review date and
   precise scope; source SHA, OS, Node/npm versions, and whether every
   current packaged byte and excluded security-relevant repo path was reviewed.
2. All discovered findings with severity, exact reviewed source location,
   fictional reproduction steps, residual uncertainty and remediation PR.
   Findings should use a private disclosure route when sensitive.
3. Exact locally rebuilt tarball SHA-256, npm `shasum`/`integrity`,
   path count and any differences from a **separately verified** reference;
   custody, source trust, signing/attestation evidence and toolchain limits.
4. Complete retest of significant findings, fresh post-remediation
   Windows/Ubuntu × Node 20/22 CI, exact **final** source SHA and artifact digest.
5. Signed or attributable scoped sign-off, conditional findings, rejection,
   or **NOT VERIFIED**; make all excluded capabilities and unresolved
   high-severity risks explicit. A template or unchecked item is **not**
   approval; maintainer-authored summaries are not assessor evidence.
6. Separate owner decision for exact version/tag, GitHub Release vs npm,
   final signing/publication method, and post-publication checks. No current
   permission to tag, sign or publish is implied.

**Release gate #43 remains OPEN** until an actual independent assessor
performs and attests to these steps. Independent beta usability #59 and
real-target testing authorization #21 also remain OPEN.

## Outstanding release gates

- [ ] Independent reviewer identified, authorized and supplied with a fixed assessment scope
- [ ] Independent inspection of **all packaged bytes** and native capabilities, plus findings and remediation tracking
- [ ] Independent artifact rebuild/hash comparison, provenance and signature/attestation policy
- [ ] Explicit owner approval for the exact release version, destination, tag/registry action and post-publication verification

**Status: NOT RELEASED.** No signing keys, release tags, registry logins, npm publication, external targets, paid APIs or private project files may be used merely because this handoff exists.

## M6-H — deterministic local source-byte receipt (engineering preview)

The project has a **nonpackaged, opt-in** utility,
`tools/reviewer-receipt.mjs`. From an already obtained and **independently
anchored** public source checkout, using Node 20/22 with bundled npm:

Generate the receipt using `node tools/reviewer-receipt.mjs snapshot > reviewer-source-receipt.json`; then check it using `node tools/reviewer-receipt.mjs verify reviewer-source-receipt.json`. Both commands are first-party local operations.

The first command compares the checked-in **80-path** expected manifest
against npm's actual `pack --dry-run --json --ignore-scripts --offline`
inventory, then emits a deterministic canonical JSON list of each
distributable source file's relative path, exact raw byte length and SHA-256.
The index SHA-256 covers the ordered file records. No timestamps, absolute
paths or personal input should appear in successful output. This utility
does not produce or publish a .tgz archive and the `tools/` and `test/`
files are deliberately excluded from the npm package.

The second command rejects noncanonical, forged, malformed, oversized,
invalid UTF-8 and symlinked receipt files, changed manifest/bytes and
additional purported permissions. It returns a static `MATCH` (exit 0),
`MISMATCH` (exit 1) or `INVALID` (exit 2) envelope without echoing receipt
contents, paths or private data. Repeat this in a fresh, disposable
checkout on the exact commit to be assessed.

**Essential independent steps remain manual:** independently verify the
full source Git SHA from a trusted origin, confirm the integrity of the
receipt via a separately trusted channel, review excluded `.github/` and
`test/` source, independently rebuild and hash the *actual* npm archive,
handle first-line shebang CRLF normalization as described under R4, and
perform a genuine independent assessment with documented signed/attributable
conclusions. A malicious actor who can rewrite source and receipt can
generate mutually consistent hashes; **the receipt is not signed**, and
a self-computed MATCH cannot attest source provenance, artifact bytes,
operator identity, real MCP security, completed audit, or release approval.
The independent security gate [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
remains OPEN.

## M6-I — temporary npm archive and installed-byte receipt (internal only)

The opt-in **nonpackaged** script `tools/reviewer-archive.mjs` extends
M6-H's source-byte index to the **actual temporary candidate .tgz**. From
an already obtained, separately authenticated public source checkout, invoke
`node tools/reviewer-archive.mjs snapshot > local-archive-receipt.json`
and `node tools/reviewer-archive.mjs verify local-archive-receipt.json`.

It runs two isolated `npm pack --offline --ignore-scripts --json` builds
in disposable system temporary directories, compares the actual two archive
digests, checks SHA-1 and SHA-512 against npm metadata, and installs **only
the temporary local tarball** with `npm install --offline --ignore-scripts`
and lifecycle hooks disabled. All **80 installed files** must have the
expected paths and match reviewed source bytes, allowing only the documented
first-line Node CLI shebang CRLF-to-LF normalization on Windows. It
produces a bounded canonical receipt containing the actual local .tgz
SHA-256, SHA-512, npm integrity and installed byte-index SHA-256.
Temporary packages, npm homes/caches and installation directories are
removed after checking; the command does **not** keep, publish, upload
or sign any artifact. Exit codes: 0 exact local MATCH, 1 well-formed
but differing locally regenerated receipt, 2 invalid/unreadable or unsafe
input. Never provide private credentials, MCP endpoints or production data.

**Assessor trust warning:** archive hashing provides a local custody
measurement, *not* independent artifact provenance. Anyone able to
rewrite the checkout and locally generated receipt can make both
self-consistent. The actual assessor must independently establish an
immutable Git source SHA, separately anchor the receipt/digest,
inspect excluded `.github/` and `test/` code, and review the archive
with independently chosen tooling before delivering a scoped sign-off.
Do not claim byte-identical cross-OS tarballs or a public npm release from
the local two-pack check. Gates #21 (external targets), #43 (independent
security and provenance review), and #59 (real independent beta) remain OPEN.

## M6-J — deterministic first-party assessor handoff (not an audit)

The **nonpackaged**, **opt-in** `tools/reviewer-handoff.mjs` creates a
bounded canonical local JSON packet combining M6-H's 80 shipped source-file
hash index, M6-I's actual **temporary** npm archive SHA-256/SHA-512 and
installed-byte index, and an **additional sorted per-file SHA-256 inventory**
for all regular files under `.github/`, `test/`, and `tools/`. These
excluded security-relevant inputs do **not** become npm package members.

From an already obtained public source checkout that you have separately
verified against a trusted full Git commit SHA, execute the optional local
command `node tools/reviewer-handoff.mjs snapshot > local-review-handoff.json`.
To re-evaluate the packet against the current local checkout, execute
`node tools/reviewer-handoff.mjs verify local-review-handoff.json`.
A verified local MATCH has exit 0; changed self-consistent but different
local inputs produce MISMATCH exit 1; unsafe/noncanonical, symlinked,
malformed, oversized, duplicate-key or permission-forged receipts produce
INVALID exit 2. These commands invoke only the public project's offline
npm pack/install flows against temporary local archives. They do not
persist a tarball, contact a user MCP server, or upload anything.

The packet intentionally records all nine independent gate fields as
`NOT_VERIFIED`: assessor identity, source SHA authentication,
separately trusted source-receipt provenance, independently anchored
archive digest, assessor source/security audit, signed assessor decision,
external independent beta, external MCP target authorization, and
publication approval. It contains **no** inferred signer, source revision,
timestamp, target permission, qualified reviewer, or stability claim.

**Independent assessor instructions:** obtain the fixed public checkout
and full Git revision through a trusted channel; independently review
and hash the packed source **and** excluded test/CI/reviewer tool code;
evaluate raw archive bytes and independently anchor a reference artifact
digest; report actual environment/toolchain, findings, security boundary
observations, residual risk, attribution and a signed/attributable scoped
decision. The maintainer must separately authorize scope and all
publication steps. These first-party tools are themselves review surfaces:
self-generated matching receipts can be forged along with their checkout;
local two-pack agreement is NOT a cross-OS or third-party provenance proof.
R5-B independent security gate #43, real-target approval #21 and
independent external beta #59 remain **OPEN**.
