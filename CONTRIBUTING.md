# Contributing



## M42: prioritize fictional scanner findings for manual review

After preparing the M39 `detector-batch.json`, generate an ordered review
summary without executing any scanner or contacting a target:

```powershell
Get-Content -Raw -Encoding utf8 .\detector-batch.json | node tools/fixture-batch-preflight.mjs --prioritize-detector-issues
```

Linux/macOS: `cat detector-batch.json | node tools/fixture-batch-preflight.mjs --prioritize-detector-issues`.

The report orders only the four fixed fictional case IDs. A missed
author-labeled injection reported by at least two distinct scanner aliases
gets `P1_REPEATED_INJECTION_MISS`; one miss gets
`P2_INJECTION_MISS`; benign-case false positives get
`P3_FALSE_POSITIVE`; error-only cases get `P4_SCANNER_ERROR`.
Higher priority categories take precedence over errors. Sort order within
a category is deterministic by miss count, false-positive count,
error count, and fixed source case order. No arbitrary file paths, payload
text or user-provided names are emitted. These are **manual review
priorities, not incident severity ratings or proof of scanner effectiveness**.
Before editing a scanner rule, independently reproduce the relevant case,
record the scanner version, and understand its intended detection policy.
Never publish private output or credentials.

## M43: interpreting independent volunteer reports

The first version-pinned third-party reports are from the maintainer of
[Firstwatch](https://github.com/dave8172/firstwatch): [v0.2.0](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329#issuecomment-6529063336)
and [v0.3.0](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329#issuecomment-6529886202).
For **each version**, the contributor reports two clean cases correctly
not flagged (2 TN) and two author-labeled injection cases not flagged
(2 FN), with zero TP/FP/errors. These are the volunteer's own reported
observations; our test suite **did not run, certify, or independently
reproduce** the scanner or confirm its protection of an AI agent.

Do **not** interpret two releases of the same scanner as two independently
developed detectors. When comparing versions of the same implementation,
report each version separately and keep its exact commit pinned. An M39
batch can distinguish sanitized aliases, but it cannot authenticate the
underlying scanner family, release, installation or provenance.

The missed cases illustrate a detection tradeoff: broad task-switch
language can appear in benign human conversation as well as in tool-result
injections. Add separately reviewed benign controls and explicit AI-addressed
variants rather than changing the original four fixed M38 cases or
optimizing a rule only to known examples. Check action-authorization and
side-effect prevention separately from detection. Follow-up is tracked
in [#345](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/345).

## M41: compare fictional scanner disagreements

Using the same local `detector-batch.json` from M39, run:

```powershell
Get-Content -Raw -Encoding utf8 .\detector-batch.json | node tools/fixture-batch-preflight.mjs --analyze-detector-disagreements
```

Linux/macOS: `cat detector-batch.json | node tools/fixture-batch-preflight.mjs --analyze-detector-disagreements`.

The JSON output reports `FLAGGED`, `NOT_FLAGGED`, and `ERROR` vote
counts for each of the four fixed fictional cases. A disagreement means both
`FLAGGED` and `NOT_FLAGGED` were reported; errors are **not votes**.
The reported consensus is only a strict count-based majority (or `TIE`
/ `NO_CLASSIFICATIONS`), **not** a correctness or truth judgment.
An injection case missed by two or more self-reporting scanners receives
`REPEATED_MISS` review priority. Scanner identities are unverified
sanitized aliases; no real-world detection rate, independent validation or
execution of an external scanner is implied. Do not share private logs,
customer data or credentials.

## M40: generate a reviewer queue for fictional scanner findings

After preparing the same local `detector-batch.json` file documented in M39,
derive a short, machine-readable review queue:

```powershell
Get-Content -Raw -Encoding utf8 .\detector-batch.json | node tools/fixture-batch-preflight.mjs --review-detector-batch
```

Linux/macOS: `cat detector-batch.json | node tools/fixture-batch-preflight.mjs --review-detector-batch`.

This produces a bounded JSON summary containing each scanner's sanitized
alias, source-owned case ID, finding (`FN`, `FP`, or `ERROR`), and a
categorical reviewer action. True positives and true negatives are included
in the aggregate counts but omitted from the review queue. For each queued
item, manually confirm the scanner's version, input handling and any rule
configuration from independently collected evidence. Never interpret
self-reported categories as independently reproduced proof. No external
scanner runs, credentials, private logs, customer transcripts or MCP
targets are involved. No network upload is performed.

## M39: compare multiple fictional scanner reports locally

From a reviewed source checkout, export the same four public fictional cases
with `node tools/fixture-batch-preflight.mjs --export-detector-cases`.
Each volunteer runs their own detector separately. Make a local JSON file
`detector-batch.json` with this structure:

```json
{
  "reportSchemaVersion": 1,
  "sourceProfile": "m38-fictional-detector-cases-v1",
  "scanners": [
    {
      "scannerId": "scanner-a",
      "results": [
        {"caseId": "mixed-tool-result-file-read:clean", "observed": "NOT_FLAGGED"},
        {"caseId": "mixed-tool-result-file-read:mixed", "observed": "FLAGGED"},
        {"caseId": "ticket-status-prerequisite-file-read:clean", "observed": "NOT_FLAGGED"},
        {"caseId": "ticket-status-prerequisite-file-read:mixed", "observed": "ERROR"}
      ]
    }
  ]
}
```

The values above illustrate the format, **not actual external observations**.
Include 1–8 scanners with unique lowercase local aliases (no real identities),
exactly four rows in the prescribed order for each scanner, and only
`FLAGGED`, `NOT_FLAGGED` or `ERROR` as observations.

Windows PowerShell:

```powershell
Get-Content -Raw -Encoding utf8 .\detector-batch.json | node tools/fixture-batch-preflight.mjs --compare-detector-batch
```

Linux/macOS:

```sh
cat detector-batch.json | node tools/fixture-batch-preflight.mjs --compare-detector-batch
```

This mode emits per-scanner and per-case TP/FP/FN/TN/ERROR totals relative
to the author labels, and aggregate counts. It validates strict JSON, limits
stdin to 16 KiB and never starts scanners or connects to targets. It does
not prove scanner provenance, identity, real-agent safety, beta acceptance,
security certification or generalizable accuracy. Share only sanitized
category counts and independently recorded scanner version details in
[comparison issue #329](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329).
Do not include private outputs, file paths, credentials or customer data.


## Independent detector comparisons (M38, fictional only)

Independent security-tool maintainers can review and classify exactly
four **first-party fictional** tool-result strings without modifying our
runner or providing a real MCP target:

```sh
node tools/fixture-batch-preflight.mjs --export-detector-cases
```

Use your own rule-based scanner locally, on disposable test material.
Report all clean/mixed classifications, including **misses, false
positives and errors**, not just successes. The opt-in
`--triage-detector-results` mode consumes one tiny, bounded, strict
JSON document over local stdin and calculates only the confusion
matrix **relative to our author-written labels**. This does not run
or verify the external scanner. Follow the
[M38 reviewer guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md#m38--independent-scanner-comparison-on-fixed-fictional-tool-results)
and [comparison Issue #329](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329).
Report the scanner's public version/commit and rule settings manually,
with no credentials, customer examples, URLs or private logs. This
comparison is distinct from the independently executed beta protocol
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59).


This is an early independent OSS release. Contributions are welcome through GitHub Issues and pull requests.

Start with [Getting Started](docs/GETTING_STARTED.md): run `node examples/offline-ci-check.mjs` to see one fictional PASS and one deliberately detected FAIL. A [reviewed CI template](examples/offline-contract-check.yml) uses pinned Actions and minimal permissions.

1. Discuss significant design changes in a public Issue without sharing secrets or private device details.
2. Keep fixtures fictional; never include production logs, customer information, tokens, personal paths or confidential infrastructure references.
3. Preserve offline defaults, bounded parsing, deterministic negative controls and compatibility with supported Node.js versions.
4. Run `node examples/offline-ci-check.mjs` and `node --test` locally; describe the expected-negative-control behavior in your PR, then require four green CI jobs.
5. By submitting, you agree that your contribution may be distributed under the repository’s MIT License. Only submit code you have the right to license.

Release candidates must pass the [offline package preflight](docs/RELEASE_READINESS.md). A contributor PR or green CI does not authorize `npm publish`, a stable tag or external MCP-target probing.

See [SECURITY.md](SECURITY.md) for security reporting.

## Fixture-only prompt-injection proposals (M8-S/T/U)

**Fixture-only PRs are accepted for review separately from runner changes.**
For a synthetic tool result that mixes useful task data with a malicious
instruction, add one JSON file under `.github/fixture-proposals/` and follow
the [fixture-only contributor guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md).
Run `node tools/fixture-proposal-check.mjs <local-proposal-file>` locally.
The CI suite automatically validates proposed fixture shapes without running
an AI agent, external MCP server, user command or embedded instruction.
This is **not** a prompt-injection detection test or security audit; future
runner support is a separate scoped change. Never include real file paths,
credentials, customer data or production snippets.

## Public beta feedback: fictional-only reproduction (M5-03)

Open the [Issue chooser](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose) and select **Synthetic bug report** or **Synthetic feature request**. The GitHub forms collect a release-candidate version, operating system, Node.js version, an offline command, a symbolic `summary.ruleCodes` value, a fictional reproduction, and expected versus observed behavior. The feature form asks for a fictional positive and negative control and whether the proposal requires separate authorization.

**Safe example:** From the public checkout, run `node src/cli.mjs demo` (expected `PASS`/exit 0), or `node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json` (intentionally expected `FAIL`/exit 1 with `RETRY_PARAMS_CHANGED`). For a report, cite the command and the rule code only; describe reproduction steps in your own words using only bundled public fictional fixtures. Do not upload an environment dump, raw native JSON report, or full stack trace. Native report fields are not a general secret-filtering mechanism.

**Before submitting publicly**, remove all API keys, OAuth secrets, private MCP URLs, personally identifiable information, customer records, proprietary paths/source, production traces and exploitation details. A form checkbox is a reminder and cannot technically sanitize a report; review your own text and attachments. Suspected security vulnerabilities or confidential findings must use the [private disclosure procedure](SECURITY.md), **never** the public issue form. No public issue or green test constitutes owner permission for live-target probing or a stable release. No response-time guarantee or external-user adoption claim is made.

## Independent beta-test feedback (M5-05)

The [fictional-only beta protocol](docs/BETA_TESTING.md) runs `node examples/beta-acceptance-check.mjs` without arguments from a clean public checkout. It verifies five fixed first-party synthetic cases. The intentionally unsafe negotiation must be detected (`FAIL` inside the CLI), while the **combined beta report** is `PASS` only if all five expectations match. Share only public source SHA, OS/Node versions, overall verdict, count of matched controls and symbolic beta codes via the [beta Issue form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose). Do not send raw native reports or real private material. The issue-form confirmation is not automatic sanitization. The presence of this protocol or green CI **does not mean any independent tester has participated**.
