# M20 — private-data-minimal volunteer beta intake preflight

This is an **optional source-only local preflight** for a consenting
independent beta tester or maintainer. It checks a **categorical,
self-reported** result for basic safety and internal consistency. It does
not collect identity, determine who ran a test, verify a public Git SHA
or satisfy independent beta [#59](../issues/59). It is **not a security
assessment**.

## Run

Review and run only the public first-party source in a disposable
checkout with Node.js 20/22. The CLI takes **no arguments** and reads
at most **4096 bytes of one UTF-8 JSON record from stdin**.

```sh
node tools/m20-beta-intake.mjs < public-fictional-beta-report.json
```

The shell supplies the file content over stdin; the program itself
**never opens any user-selected path**. The file name shown is only
an example. Create it with *only* the fields below, using public,
fictional-only information, not local paths, private URLs, freeform
logs, names, email addresses or credentials.

```json
{
  "schemaVersion": 1,
  "publicSourceSha": "2ad680ed2e4c322374fdabf3c2007e396f893a59",
  "candidateVersion": "0.0.10-rc.1",
  "operatingSystem": "UBUNTU",
  "nodeMajor": 20,
  "runnerStatus": "PASS",
  "matchedControls": 5,
  "evaluationPath": "SOURCE_RUNNER_ONLY",
  "archiveOutcome": "NOT_ATTEMPTED",
  "symbolicExitCodes": "NOT_CHECKED",
  "guideClarity": "CLEAR",
  "usabilityFinding": "NONE",
  "personallyRanProtocol": true,
  "fictionalOnlyConfirmed": true,
  "noSensitiveMaterialConfirmed": true
}
```

The values above are **illustrative, not actual independent test
evidence**. Do not copy the sample and claim to have executed a test.
The SHA is the historical **pinned M13 beta reference revision** from
[BETA_VOLUNTEER_HANDOFF.md](BETA_VOLUNTEER_HANDOFF.md), not the
latest `main`. A different 40-character public SHA is routed to human
source review instead of automatically accepted.

## Allowed values and consistency checks

- `operatingSystem`: `WINDOWS` or `UBUNTU`.
  `nodeMajor`: number `20` or `22`.
- `runnerStatus`: `PASS` (exactly five matches), `FAIL` (0–4
  matches), or `ERROR` (zero matches). These are volunteer **claims**,
  not imported or authenticated runner results.
- `evaluationPath`: `SOURCE_RUNNER_ONLY`,
  `SOURCE_RUNNER_AND_SMOKE`, `SOURCE_RUNNER_SMOKE_ARCHIVE`,
  `ATTEMPTED_UNABLE_TO_RUN`.
- `archiveOutcome`: `CHECKED`, `FAILED`, `NOT_ATTEMPTED`.
  An archive result requires the explicit archive evaluation path;
  other paths require `NOT_ATTEMPTED`.
- `symbolicExitCodes`: `MATCHED`, `MISMATCH`,
  `NOT_CHECKED`. A claim to check the 0/1/2 exits requires an
  evaluation path including smoke.
- `guideClarity`: `CLEAR`, `NEEDS_CLARIFICATION`, `BLOCKED`.
  `usabilityFinding`: `NONE`, `SETUP_FRICTION`,
  `CASE_MISMATCH`, `DOCUMENTATION`, `ACCESSIBILITY`.
- `personallyRanProtocol`, `fictionalOnlyConfirmed` and
  `noSensitiveMaterialConfirmed` are required boolean statements.
  **They are unverified self-attestations, not trusted identity or
  permission tokens.**

No other fields or freeform text are permitted. Invalid or duplicate
JSON keys, unknown values, getter-bearing objects in the JS API,
invalid UTF-8, oversized input, errors or secret-looking extra fields
are rejected without echoing any user values or stack traces.

## Three outcomes, no automatic external beta acceptance

| Exit | Example rule code | Meaning |
| --- | --- | --- |
| 0, `PASS` | `BETA_INTAKE_READY_FOR_MANUAL_TRIAGE` | Syntactically valid, internally consistent self-report on the pinned historical revision; human verification is still required |
| 0, `PASS` | `BETA_INTAKE_DEVIATION_READY_FOR_MANUAL_TRIAGE` or `BETA_INTAKE_BLOCKER_READY_FOR_MANUAL_TRIAGE` | A fictional failure or inability to run deserves manual follow-up, not suppression |
| 1, `FAIL` | `BETA_INTAKE_INCONSISTENT_SELF_REPORT`, `BETA_INTAKE_UNPINNED_SHA_MANUAL_REVIEW_REQUIRED` | Contradiction or public SHA requiring separate review; do not claim completed beta |
| 2, `ERROR` | `BETA_INTAKE_INVALID_OR_UNSAFE_INPUT` | Rejected malformed or potentially unsafe public-report schema |

**Always false**, including for exit 0:
`publicSourceVerified`, `independentTesterVerified`,
`independentBetaVerified`, `independentSecurityAuditCompleted`,
`externalMcpContacted`, `releaseAuthorized` and
`securityCertified`. A matching public commit string cannot prove
what code ran; a checked `personallyRanProtocol` box cannot establish
independent provenance.

The output emits only source-defined rule names, fixed disclosure
flags and a bounded count (0–5). It does **not** copy the raw JSON
record, source SHA, filenames, host paths, tokens or any other input.

## Real beta workflow and boundaries

Volunteers can run the reviewed [pinned beta procedure](BETA_VOLUNTEER_HANDOFF.md),
use this optional local self-report check, then **manually** submit a
minimal, sanitized result through the existing [GitHub beta report
form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose).
A maintainer must verify actual submission provenance and public
revision, reproduce discrepancies, review usability and obtain an
explicit owner decision. **No automatic GitHub posting, telemetry,
account connection or consent is implemented.**

The CLI makes **zero external network calls**; it performs no MCP,
LLM, Stable Bridge, filesystem-read, subprocess or real-tool operation.
It is source-only, outside the unpublished 80-path npm candidate.
Real-target authorization [#21](../issues/21), audit [#43](../issues/43)
and independent beta [#59](../issues/59) remain open. Engineering acceptance (2026-10-29): [PR #283](../pull/283)
passed [PR CI #40919148260](../actions/runs/40919148260)
**4/4** (Ubuntu/Windows Node20/22), then merged as
`5f07ef308f05106e15313a614460e577e6a72e14`.
Separate [main-push CI #40919664479](../actions/runs/40919664479)
also passed **4/4 on that exact SHA**. This is first-party
engineering repeatability only, **not** evidence of an independently
operated beta, authenticated reviewer identity or completed external audit.
