# Fictional fixture-only contributions and scanner comparisons

This guide is a quickstart. The [complete historical guide at the reviewed
M62 commit](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/blob/fc1068606df11133a836b92675424bee37c4d123/.github/FIXTURE_ONLY_CONTRIBUTIONS.md)
preserves the former detailed instructions without consuming the bounded
current source-test custody budget.

## Run a public, inert scanner comparison (M38/M44/M56–M58/M63)

From a reviewed Node.js 20/22 source checkout:

```sh
node tools/fixture-batch-preflight.mjs --export-detector-cases
node tools/fixture-batch-preflight.mjs --export-detector-results-template > detector-results.json
node tools/fixture-batch-preflight.mjs --export-context-contrasts
node tools/fixture-batch-preflight.mjs --export-context-results-template > context-results.json
```

The four fixed M38 clean/mixed rows and six separate M44 contextual
rows are **public fiction**, never real user MCP traffic. Pass each
exported `rows[].text` **as data only** to your own reviewed scanner.
Manually replace each `UNTESTED` with its genuinely observed
`FLAGGED`, `NOT_FLAGGED` or `ERROR`; do not mark unrun tests as ERROR.

```sh
node tools/fixture-batch-preflight.mjs --triage-detector-results < detector-results.json
node tools/fixture-batch-preflight.mjs --issue-report-detector-results < detector-results.json
node tools/fixture-batch-preflight.mjs --triage-context-contrasts < context-results.json
node tools/fixture-batch-preflight.mjs --issue-report-context-errors < context-results.json
```

For Windows PowerShell use:
`Get-Content -Raw -Encoding utf8 .\context-results.json | node tools/fixture-batch-preflight.mjs --issue-report-context-errors`.

M57 `--summarize-context-errors` groups source-label FP/FN/ERROR
by task-change, prerequisite and JSON tool-result contexts.
M63 `--compare-context-versions` (after acceptance) compares **two
complete six-row M44 results** for one scanner's baseline and candidate
versions. It reports per-row author-label regression/improvement/unknown;
a scanner error is not an improvement, and a regression is not a PASS.

Share public scanner name, **version/commit for each run**, source SHA,
exact categorical observations and sanitized notes at
[scanner feedback #329](../issues/329). A self-report cannot authenticate
scanner execution, measure population recall, prove blocked tool calls,
or fulfill independent beta [#59](../issues/59). No network or external
MCP contact is performed by this suite.

## Contribute a fictional `UNTRUSTED_TOOL_RESULT` fixture

Create a source-only case with
`node tools/fixture-proposal-template.mjs fictional-contributor-case`.
Copy the emitted **raw JSON** into the reviewed source-only template;
Use the reviewed template and
[example](fixture-proposals/mixed-tool-result-file-read.json).
Place the sanitized JSON in
`.github/fixture-proposals/<fictional-case-id>.json`.
Case IDs must start with a lowercase ASCII letter and use lowercase
letters, digits and hyphens, **6–61 characters** before `.json`.

Retain schemaVersion 1 and the exact allowlisted
`toolResult`, `expected`, `limits` structure. Only the fictional
`caseId`, `description`, `toolResult.legitimateData` and
`toolResult.embeddedInstruction` may be edited within the template.
Maximum fixture size: **4096 UTF-8 bytes**; descriptive fields
are single-line printable ASCII, 10–256 characters each.
The embedded instruction is malicious **test data**, never a command.

```sh
node tools/fixture-proposal-check.mjs .github/fixture-proposals/mixed-tool-result-file-read.json
node tools/fixture-policy-bridge.mjs .github/fixture-proposals/mixed-tool-result-file-read.json
node --test test/m8-fixture-proposals.test.mjs
node tools/fixture-batch-preflight.mjs
node tools/fictional-negative-control-matrix.mjs
node tools/fixture-contributor-summary.mjs
```

The checker denies symlinks, unsupported fields, malformed JSON and
obvious privacy indicators, but **is not a complete secret scanner**.
Review every public string manually. Never submit real names, file
paths, credentials, email addresses, logs, user targets, private
source or exploit scripts. A **fixture-only PR** should add only a fictional fixture
and concise explanation. Maintainers manually review it and require
Windows/Ubuntu × Node.js 20/22 CI **4/4 PASS** before merge.

## Exact limits and supporting references

Source acceptance is only offline validation and in-memory symbolic
policy testing. It is **not a semantic test**, **not a prompt-injection detector**,
and **not a real model security assessment**. It does not verify a real
model, scanner, MCP server, OS sandbox or attack prevention. Tool-result text and JSON
values cannot confer task authority. Use `node tools/toy-agent-batch.mjs` for additional local fixed toy
checks; no external user tool is executed. The first-party mock and
toy-agent walkthroughs are indexed in
[M10](M10_TOY_AGENT_SESSION.md),
[M11](M11_LOOPBACK_TOOL_RESULT.md),
[M12](M12_MODERN_MCP_SMOKE.md),
[batch preflight](M9_FIXTURE_BATCH_PREFLIGHT.md) and
[negative mutation matrix](M9_NEGATIVE_MUTATION_MATRIX.md).
See [PR checklist](PULL_REQUEST_TEMPLATE.md) for provenance and privacy.
The separate gates for independent beta [#59](../issues/59),
independent audit [#43](../issues/43) and external target consent
[#21](../issues/21) remain **OPEN**; npm publication is unapproved.
