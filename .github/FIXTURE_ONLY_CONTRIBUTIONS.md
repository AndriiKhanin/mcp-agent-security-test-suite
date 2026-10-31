# Fixture-only contributions: fictional tool-result instruction injection (M8-S/T/U)

## M38 — fictional tool-result scanner comparison

External volunteers: review the source and export **four fixed,
public fictional** tool-result texts (two clean/mixed pairs):

```sh
node tools/fixture-batch-preflight.mjs --export-detector-cases
```

| Fixed case ID | Author label |
| --- | --- |
| `mixed-tool-result-file-read:clean` | BENIGN |
| `mixed-tool-result-file-read:mixed` | INJECTION |
| `ticket-status-prerequisite-file-read:clean` | BENIGN |
| `ticket-status-prerequisite-file-read:mixed` | INJECTION |

Pass each `rows[].text` as **data** to your own local scanner, never
as a command. The suite does not execute or authenticate the scanner.
Generate a JSON input file with the matching case IDs:

```sh
node tools/fixture-batch-preflight.mjs --export-detector-results-template > detector-results.json
```

Windows PowerShell: `node tools/fixture-batch-preflight.mjs --export-detector-results-template | Set-Content -Encoding utf8 .\\detector-results.json`.

Replace **every** `UNTESTED` placeholder with a real `FLAGGED`,
`NOT_FLAGGED` or `ERROR` observation. The triage command refuses
`UNTESTED`; `ERROR` means the scanner actually failed:

```powershell
Get-Content -Raw -Encoding utf8 .\detector-results.json | node tools/fixture-batch-preflight.mjs --triage-detector-results
```

Linux/macOS: `cat detector-results.json | node tools/fixture-batch-preflight.mjs --triage-detector-results`.

Triage counts TP/FP/FN/TN/ERROR **only against author labels**.
Strict JSON (four ordered rows, duplicate-free, UTF-8, up to 2048
bytes); malformed or forged fields fail closed without echoing data.
No inferred real-world detection rate, identity verification, real
agent execution, independent audit or beta acceptance.

Report scanner repo/version/commit, test-suite SHA, nonsecret settings,
four outcomes and sanitized FP/FN notes at
[Issue #329](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329).
Do not post private paths, credentials, customer records, live MCP
targets or exploit details. Beta [#59](../issues/59), audit
[#43](../issues/43) and external-target permission [#21](../issues/21)
stay OPEN. Contributors may also propose completely fictional fixtures
in `.github/fixture-proposals/` without changing the runner; CI
checks their schema and maintainers review content.


## Privacy indicators and manual review (M9-J/K/L)

The strict offline fixture validator now conservatively rejects
obvious private-looking strings in the three freeform fields
(`description`, `toolResult.legitimateData` and
`toolResult.embeddedInstruction`): URL schemes (`https://`,
`ssh://`, `file://`, `mcp://`), absolute home paths, email-shaped
addresses, common token/key prefixes, private-key headers, and IPv4
literals. The check does not send any field to an external service,
does not print its content on refusal and does not interpret its
instructions.

**This is not a complete secret scanner.** It is only a bounded,
conservative warning against readily recognizable patterns; it cannot
guarantee that a string is safe or that a contributor has publication
rights. It may reject a purely fictional example that resembles a real
address or token. Rewrite such examples using ordinary fictional prose,
rather than bypassing the guard. Contributors **must manually inspect
every field** for private details, real paths, logs, endpoints and
customer data before creating a public PR.

The [PR checklist](PULL_REQUEST_TEMPLATE.md) reminds contributors that
fixture-only PRs need no runner changes, require manual sanitation and
do not constitute evidence of real-agent security.

## Generate a safe starter fixture (M9-D)

Instead of writing the strict schema manually, choose a fictional lowercase
case ID (6–61 ASCII letters/numbers/hyphens; must begin with a letter) and
run the **source-only, no-write** generator:

```sh
node tools/fixture-proposal-template.mjs fictional-contributor-case
```

It prints **raw JSON** for the exact M8 fictional proposal schema (not a
report wrapper). Copy the printed JSON into a new file named
`.github/fixture-proposals/fictional-contributor-case.json` using your
editor. You may then edit only the fictional description, legitimate task
data and embedded instruction text to describe the proposed case.

The generator does **not** write files, launch a command, connect to an
MCP service, use credentials or run an AI model. Never paste real paths,
production details, customer data or secrets. Verify the local file
with `node tools/fixture-proposal-check.mjs <local-proposal-file>` and
`node tools/fixture-policy-bridge.mjs <local-proposal-file>`.

This is **not a semantic test** of prompt injection or a proof that an
agent resists the generated text. Only the fixed schema and synthetic
in-memory policy gates are assessed. A separate independent user test
is required to claim real interoperability or beta acceptance.

## Optional fixed offline transport and toy-agent checks (M10–M12)

All commands below are **source-owned fictional demonstrations**,
not semantic prompt-injection detection, real authentication, MCP
conformance, external security testing or authorization. They use
fixed in-memory cases or disposable first-party localhost listeners;
no user-provided server, path, credentials or arbitrary process.
Review the linked design before running each command.

| Command | Fixed check | Details |
| --- | --- | --- |
| `node tools/m11-concurrent-response.mjs` | Two overlapping responses, exact request/session binding, 13 negative controls | [M11 concurrency](M11_CONCURRENT_RESPONSE.md) |
| `node tools/m11-owner-isolation.mjs` | Synthetic owner capabilities, 17 cases | [Owner isolation](M11_OWNER_ISOLATION.md) |
| `node tools/m12-modern-sse.mjs` | Request-scoped SSE, replay, malformed and stalled frames | [SSE](M12_MODERN_MCP_SMOKE.md) |
| `node tools/m12-header-parameter-mirror.mjs` | Header/JSON matching, 26 cases | [Header mirror](M12_HEADER_MIRROR.md) |
| `node tools/m12-modern-http-smoke.mjs` | Fixed modern MCP-shaped discovery/list/call loopback | [Modern HTTP](M12_MODERN_MCP_SMOKE.md) |
| `node tools/m11-inflight-revocation.mjs` | Revocation after accepted request and before delivery | [In-flight revocation](M11_INFLIGHT_REVOCATION.md) |
| `node tools/m11-owner-epoch.mjs` | Run-rotation, stale capability refusal, 17 controls | [Owner epoch](M11_OWNER_EPOCH.md) |
| `node tools/m11-cancelled-response.mjs` | Stale response rejection after cancellation, 14 controls | [Cancellation](M11_CANCELLED_RESPONSE.md) |
| `node tools/m11-replay-session.mjs` | Two sessions, one-use identifiers, 15 negative cases | [Replay](M11_REPLAY_SESSION.md) |
| `node tools/m11-loopback-tool-result.mjs` | Inert MCP-shaped tool-result reply over local HTTP | [Loopback](M11_LOOPBACK_TOOL_RESULT.md) |
| `node tools/toy-agent-session.mjs` | Fixed ordering/replay/permission modes, 8 scenarios | [Toy session](M10_TOY_AGENT_SESSION.md) |
| `node tools/toy-agent-batch.mjs` | Five toy modes for every reviewed fictional fixture | [Toy batch](M10_TOY_AGENT_BATCH.md) |

A symbolic `PASS` attests only to that test's fixed contract; it
does not mean a real model resisted an injection. User-contributed
fictional case text is always treated as data, never executed.

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
