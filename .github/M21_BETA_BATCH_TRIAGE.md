# M21 — bounded offline batch triage of fictional beta self-reports

M20 validates **one** categorical self-report. This optional source-only
extension validates **two to four** reports in one batch and identifies
repeated categorical *patterns*. It **cannot identify distinct humans**,
corroborate a source revision, authenticate a tester or complete
[independent beta #59](../issues/59).

## Run in a reviewed source checkout

```sh
node tools/m21-beta-batch.mjs < sanitized-fictional-batch.json
```

The program itself never opens the supplied shell filename. It reads
**only standard input**, a maximum of **16,384 bytes**, interpreted as
exactly one strict UTF-8 JSON array with **2–4** records. Each record
has the precise fixed, no-freeform-text [M20 schema](M20_BETA_INTAKE_PREFLIGHT.md).
Nested duplicate JSON keys, unknown fields, malicious JS accessors,
extra array entries, sparse indices and malformed input fail closed.
There are no user-defined URLs, paths, identities, credentials or logs.

Example of the envelope shape (fill with reviewed **fictional public**
M20 records and omit all personal data):

```json
[
  {"schemaVersion":1, "publicSourceSha":"<public SHA>"},
  {"schemaVersion":1, "publicSourceSha":"<public SHA>"}
]
```

The two shortened objects above illustrate the **array envelope only**:
they intentionally lack required M20 fields and will **not** pass.
For a valid input, supply two to four complete M20 records; consult
the linked guide. No report generator, uploader or telemetry is installed.

## Categories and interpretations

For every record, M21 calls the actual M20 preflight. It emits only
source-owned rule codes and a sequential **position 1–4**:

| Class | Meaning |
| --- | --- |
| `NOMINAL` | Consistent fictional protocol outcome, for manual review |
| `DEVIATION` | Fictional controls or archive/smoke deviations need triage |
| `BLOCKER` | Claimed fictional runner could not execute |
| `REVISION_REVIEW` | Supplied public commit SHA differs from fixed historical pin |
| `NO_EXECUTION_CLAIM` | Person did not self-attest running the protocol |
| `INCONSISTENT` | Contradictory categorical fields |
| `REJECTED` | Invalid schema or unsafe/public-safety confirmation missing |

A batch with schema-unsafe records returns `ERROR` (exit **2**)
without inspecting their content further. A batch with internally
contradictory or unpinned records returns `FAIL` (exit **1**) and
remains available for human review. If all records are eligible for
manual triage, the batch returns `PASS` (exit **0**); this is **not**
independent beta verification. A possible repeated pattern receives
`BETA_BATCH_PATTERN_COLLISION_MANUAL_REVIEW`.

`selfReportedPlatformMatrix` counts source-claimed
Windows/Ubuntu × Node 20/22 reports; it is **not independently
witnessed environment coverage**.

`exactCategoryPatternPairs` counts pairs of **completely identical
M20 categorical records** within the single batch (two identical
records = one pair; three identical = three pairs). The tool does not
persist hashes or input bytes, and it never echoes original records.
Identical categorical reports might be submitted by different testers;
different reports might be submitted by the same person. **Neither
case establishes uniqueness or identity**. Even when all four
categories differ, `independentTestersVerified: 0` and
`uniqueHumanCountUnknown: true`.

All outcomes contain `manualReviewRequired: true`,
`independentBetaVerified: false`,
`sourceRevisionAuthenticated: false`,
`realAgentBehaviorObserved: false`,
`externalMcpContacted: false`, `releaseAuthorized: false`
and `securityCertified: false`. Only a human reviewer with independently
verified provenance can decide whether a voluntarily submitted report
satisfies any part of #59.

## Scope, custody and acceptance

No network, MCP, LLM, subprocess, Stable Bridge, real file access,
GitHub issue creation, identities, account linking or telemetry is used.
The tool and tests remain **source-only**, outside the unpublished
80-file npm candidate. Owner target gate [#21](../issues/21),
independent audit [#43](../issues/43) and beta [#59](../issues/59)
stay open. Engineering acceptance requires **4/4 PR CI** and a
separate **4/4 main-push CI** on Ubuntu/Windows × Node 20/22,
including M6-J excluded-source custody checks.
