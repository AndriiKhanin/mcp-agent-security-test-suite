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
counts or safe Issue text. M57 `--summarize-context-errors`
separates contextual FP/FN/errors. See [README](../README.md) for
full commands.

Only **author-labeled fictional** TP/FP/FN/TN/ERROR are counted, not
real-world scanner accuracy, agent protection or independent security
certification. Share only sanitized scanner version, reviewed source SHA,
results and FP/FN notes at [Issue #329](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329).
Never post credentials, user files, customer text or real MCP targets.
Beta [#59](../issues/59), audit [#43](../issues/43), external permission
[#21](../issues/21) remain open. Fixture-only JSON PRs are welcome.

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

## Read one clear, privacy-safe fictional review (M9-G/H/I)

For a brief summary of the entire reviewed fictional fixture set:

```sh
node tools/fixture-contributor-summary.mjs
```

The command combines the M9-E fixed policy batch and M9-F 43-per-fixture
synthetic negative mutation sensitivity check. It reports only the
number of fictional scenarios checked, fixed controls matched,
symbolic denials, and corrupted reports rejected — **no case names,
file paths, injected instructions, tokens or customer data**.

It is **not a real agent** evaluation, independent beta test or
prompt-injection detector. This is a first-party synthetic contributor
convenience tool; a green result does not authorize any live MCP probe.

## Check that corrupted symbolic results cannot pass (M9-F)

To verify the fictional policy report's negative controls across **all**
contributor fixtures, use:

```sh
node tools/fictional-negative-control-matrix.mjs
```

The source-only matrix challenges the independent M9-E report validator
with 43 fixed, intentionally corrupted symbolic outcomes **per fixture**.
Every mutation must fail while the pristine result passes. The command
accepts no additional arguments, prints no fixture text or path, and
runs no agent or MCP server. This is **not a real agent** attack evaluation
or semantic prompt-injection detection. See the
[negative-control guide](M9_NEGATIVE_MUTATION_MATRIX.md).

## One-command check for all fictional proposals (M9-E)

After adding a **fictional** `.json` fixture, you can validate the
entire repo-owned contribution collection with:

```sh
node tools/fixture-batch-preflight.mjs
```

No filename or argument is needed. This checks every fixture file in
`.github/fixture-proposals/` using the strict schema validator and four
source-owned in-memory M9-C policy probes for each. It permits at most
16 regular JSON files; unexpected entries, invalid shapes, and failed
symbolic controls reject the batch. The report contains only counts and
ordinals, not fixture names, private paths or embedded instructions.

This is **not a real agent** test or a prompt-injection detector. It cannot
determine whether your injection wording would affect a deployed agent.
See the [batch preflight guide](M9_FIXTURE_BATCH_PREFLIGHT.md).

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

## Verify your fixture without a runner modification

From a reviewed public source checkout, using Node.js 20 or 22:

```sh
node tools/fixture-proposal-check.mjs .github/fixture-proposals/mixed-tool-result-file-read.json
node --test test/m8-fixture-proposals.test.mjs
```

Replace the filename in the first command with your proposed fixture.
The CLI accepts exactly one direct regular file inside the approved
directory. It rejects malformed/duplicate-key JSON, unexpected schema
fields, unauthorized target flags, extra arguments, symlinks and oversized
inputs without echoing private input or paths. Reports contain only fixed
status codes and Boolean limits. The test discovers all proposed fixtures,
so a **fixture-only PR** gets checked even without changing the runner.

A `PASS` means only **fictional fixture shape accepted**. It does
**not** execute an MCP tool, open an unrelated file, contact a target,
run an AI agent, detect prompt injection, prove the agent resists an
attack or certify security. The project is **not a prompt-injection detector**
at this stage. Runner support and actual model/agent-behavior testing require
a separately scoped implementation, positive/negative controls, security
review and authorization before any non-fictional execution.

## Optional fixed policy gate checks (M9-C)

After validating your proposal's shape, run the source-only policy bridge:

```sh
node tools/fixture-policy-bridge.mjs .github/fixture-proposals/mixed-tool-result-file-read.json
```

Substitute your own fictional JSON filename in the same directory. CI
automatically discovers every proposal and checks the same four fixed
in-memory controls: task data allowed as data, unrelated file read denied,
extra tool call denied, and tool-result authority spoofing denied.
The file content is never executed or passed to an AI agent.

This is **not a semantic test** of the injected instructions and **not a
prompt-injection detector**. A successful fixed-gate check verifies only
source-owned synthetic policy rules, not whether a real model would
ignore your particular malicious-looking text. See the
[policy bridge specification](M9_FIXTURE_POLICY_BRIDGE.md).

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
