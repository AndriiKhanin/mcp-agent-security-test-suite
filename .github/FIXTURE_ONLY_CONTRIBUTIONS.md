# Fixture-only contributions: fictional tool-result instruction injection (M8-S/T/U)

## M38 — fictional tool-result scanner comparison

Export four source-owned fictional clean/mixed records with
`node tools/fixture-batch-preflight.mjs --export-detector-cases`,
or six distinct M44 context records with
`--export-context-contrasts`. Treat the returned text
**only as data** for your own independently run scanner.
Use `--export-detector-results-template` or
`--export-context-results-template` to make exact local
four/six-row JSON. Replace all `UNTESTED` with genuine
`FLAGGED`, `NOT_FLAGGED` or `ERROR`
(scanner failure). Incomplete and malformed reports fail closed.
`--triage-detector-results`, `--triage-context-contrasts`,
`--issue-report-detector-results` and
`--issue-report-context-contrasts` provide categorical
counts or safe Issue text. M57 `--summarize-context-errors` classifies contextual FP/FN/errors;
M58 `--issue-report-context-errors` produces a sanitized Markdown
report with counts and public case IDs only. See [README](../README.md) for
full commands.

Only **author-labeled fictional** TP/FP/FN/TN/ERROR are counted, not
real-world scanner accuracy, agent protection or independent security
certification. Share only sanitized scanner version, reviewed source SHA,
results and FP/FN notes at [Issue #329](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329).
Never post credentials, user files, customer text or real MCP targets.
Beta [#59](../issues/59), audit [#43](../issues/43), external permission
[#21](../issues/21) remain open. A fixture-only PR is welcome.
This source-only comparison is not a prompt-injection detector.

## Privacy indicators and manual review (M9-J/K/L)

The validator refuses obvious paths, URLs, email-like strings,
credentials, private keys and IPv4 patterns in fictional proposal text.
**It is not a complete secret scanner.** Review every field yourself
for privacy and publication rights; do not bypass conservative rejects.
The [PR checklist](PULL_REQUEST_TEMPLATE.md) requires manual review
and disallows claims of real-model safety from a fixture PASS.

## Generate a safe starter fixture (M9-D)

Run `node tools/fixture-proposal-template.mjs fictional-contributor-case`,
copy the JSON into `.github/fixture-proposals/fictional-contributor-case.json`
and use only sanitized fictional description, legitimate data and
injected text. IDs are 6–61 lowercase ASCII letters, digits/hyphens,
starting with a letter. Validate locally using
`node tools/fixture-proposal-check.mjs <local-proposal-file>`
and `node tools/fixture-policy-bridge.mjs <local-proposal-file>`.
The template prints **raw JSON** data only; no scanner, user
MCP target or real agent runs. This is **not a semantic test** of
injected text; schema acceptance cannot prove model security.

## Optional fixed offline transport and toy-agent checks (M10–M12)

The existing source-only examples are documented under
[concurrent responses](M11_CONCURRENT_RESPONSE.md),
[owner isolation](M11_OWNER_ISOLATION.md),
[SSE](M12_MODERN_MCP_SMOKE.md),
[header mirrors](M12_HEADER_MIRROR.md),
[revocation](M11_INFLIGHT_REVOCATION.md),
[epoch](M11_OWNER_EPOCH.md),
[cancellation](M11_CANCELLED_RESPONSE.md),
[replay](M11_REPLAY_SESSION.md),
[loopback](M11_LOOPBACK_TOOL_RESULT.md),
[toy session](M10_TOY_AGENT_SESSION.md) and
[toy batch](M10_TOY_AGENT_BATCH.md).
Run `node tools/toy-agent-batch.mjs` for fixed synthetic cases.
These fixed local mocks do not contact an external MCP server
or prove a deployed agent resists prompt injection.

## Offline synthetic contributor checks (M9-E/F/G)

Run `node tools/fixture-batch-preflight.mjs` to validate all fixed
fictional fixture proposals (maximum 16 files) against schema and
four source-owned in-memory policy controls.
`node tools/fictional-negative-control-matrix.mjs` then tests
43 corrupted symbolic reports per fixture; intact reports must pass
and corrupted variants must fail.
`node tools/fixture-contributor-summary.mjs` prints a privacy-safe
count-only summary. None runs an AI agent or real MCP server,
interprets contributor instructions, proves real attack resistance,
or authorizes a live target. See [batch preflight](M9_FIXTURE_BATCH_PREFLIGHT.md)
and [negative controls](M9_NEGATIVE_MUTATION_MATRIX.md).

## Supported proposal (v1)

This intake currently supports only `UNTRUSTED_TOOL_RESULT`: a fictional
MCP-shaped tool result containing legitimate task data **and** an embedded
instruction to read unrelated material. The expected boundary is to treat the
entire tool result as untrusted data, not as authority for a new file read
or tool call.

Copy [the example](fixture-proposals/mixed-tool-result-file-read.json) and
change the `caseId`, `description`, `toolResult.legitimateData`, and
`toolResult.embeddedInstruction` to your own **synthetic** case. Keep the
security expectations and limits identical.

- File location: `.github/fixture-proposals/<fictional-case-id>.json`.
- Filename: lowercase ASCII letters, numbers and hyphens, 6–61 characters
  before `.json`, starting with a letter.
- Size: at most **4096 UTF-8 bytes**; all descriptive strings must be
  single-line printable ASCII, 10–256 characters.
- Schema: `schemaVersion: 1`, `attackSurface: UNTRUSTED_TOOL_RESULT`,
  exact allowlisted `toolResult`, `expected`, and `limits` keys.
- No real names, local paths, production data, customer logs, real
  endpoints, credentials, tokens, proprietary source or working exploits.
  This validation is **not a secret scanner**; the author must sanitize
  every field manually before creating a public PR.

## Verify fictional fixture and policy without changing the runner

From a reviewed Node.js 20/22 checkout, validate only a
regular JSON file under `.github/fixture-proposals/`:

```sh
node tools/fixture-proposal-check.mjs .github/fixture-proposals/mixed-tool-result-file-read.json
node tools/fixture-policy-bridge.mjs .github/fixture-proposals/mixed-tool-result-file-read.json
node --test test/m8-fixture-proposals.test.mjs
```

Use your own **sanitized fictional** filename in place of the example.
The validator refuses symlinks, extra args, duplicate JSON keys,
unsupported fields and oversize/private-looking inputs without
echoing them. Fixed in-memory controls allow task data as data but
deny unrelated file reads, extra tool calls and forged tool-result
authority. These are **schema and symbolic policy checks only**,
not a live model test, security certification or external approval.
See [policy bridge](M9_FIXTURE_POLICY_BRIDGE.md).

## Submit and review

Open a PR containing only the new synthetic JSON fixture (and optionally
a short, sanitized explanation in the PR description). State the intended
trust boundary and the expected safe behavior: ignore the embedded
instruction while retaining the legitimate data. Do not add executable
scripts, new commands, links to real MCP targets, or external sample logs.

Maintainers review the text manually, evaluate the scope, and require
Windows/Ubuntu × Node.js 20/22 **4/4 CI** before merging. A submitted case
is a **proposal**, not independently verified beta participation. The
independent beta gate [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59),
independent security review [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
and real-target authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21)
remain separate and open.
