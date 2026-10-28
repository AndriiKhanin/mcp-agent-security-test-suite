# Fixture-only contributions: fictional tool-result instruction injection (M8-S/T/U)

**Fixture-only PRs are welcome.** A contributor may propose a completely fictional
JSON test case in `.github/fixture-proposals/` **without changing the test
runner**. The existing CI discovers and validates each proposal automatically.
Proposals are reviewed by a maintainer before merging.

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

## Optional overlapping first-party HTTP reply test (M11-G/H/I)

```sh
node tools/m11-concurrent-response.mjs
```

This source-only command overlaps two source-owned fictional HTTP
requests at a disposable `127.0.0.1` listener, deliberately allows
response B to be issued before A, then checks exact request ID,
session markers and body binding. It has 13 negative controls and
accepts no user endpoint, credential, filename or command. It does
**not** evaluate the semantic effect of prompt injection on a real
LLM. See the [concurrency guide](M11_CONCURRENT_RESPONSE.md).

## Optional owned HTTP cancellation test (M11-J/K/L)

```sh
node tools/m11-cancelled-response.mjs
```

This source-only test checks a **first-party** owned cancellation while
another fictional `127.0.0.1` request remains in flight. A closed
response must never deliver a stale tool result into the surviving
M10 toy session. The CLI accepts no URLs, paths, arbitrary commands,
models, credentials or customer endpoints. The 14 fixed controls are
synthetic and **do not evaluate a real AI agent** or attack wording.
See the [M11 cancellation design](M11_CANCELLED_RESPONSE.md).

## Optional owned two-session replay test (M11-D/E/F)

```sh
node tools/m11-replay-session.mjs
```

This test uses two fixed, public **fictional** fixtures and a disposable
first-party IPv4 loopback listener to require source-owned session IDs,
one-use request identifiers and exact response correlation. It checks
15 deliberate negative cases, but **does not** interpret the attack
wording, run a real agent, contact a user MCP target or grant external
testing permission. No contributor can supply a URL, command or
credential to this test. See [M11 replay guide](M11_REPLAY_SESSION.md).

## Optional first-party local HTTP check (M11-A/B/C)

Run `node tools/m11-loopback-tool-result.mjs` for a finite review of a
**fixed** fictional tool-result transported over localhost HTTP to the
first-party toy gateway. It uses two disposable owned servers: the
existing discovery-only test and a **separate** MCP-shaped response
mock. This is not an LLM attack evaluation and does not grant
permission to contact any user MCP server. No contributor input can
choose a network target, port, executable or command; CI separately
discovers contributor fixtures through the bounded M8 loader. See
[M11 guide](M11_LOOPBACK_TOOL_RESULT.md).

## Optional stateful toy-agent task/result check (M10-G/H/I)

The source-only stateful example checks ordering and replay protection
across one fixed fictional tool-result exchange:

```sh
node tools/toy-agent-session.mjs
```

Eight fixed source-authored modes check safe task progression, early,
replayed and late results, and denied read/tool/authority requests.
The test suite automatically repeats these controls for every
approved fictional contributor fixture. The tool result's instruction
text is never parsed or executed and no real file, MCP service, model
or third-party agent is accessed. See the
[stateful toy-session guide](M10_TOY_AGENT_SESSION.md).

## Optional in-memory toy-agent replay of every fictional case (M10-D/E/F)

To check every fictional fixture against the independent in-memory
toy-agent gateway method-call observer:

```sh
node tools/toy-agent-batch.mjs
```

Each file receives five fixed first-party toy modes (one safe,
four deliberately failing). The zero-argument batch expects exact
`PASS`/`FAIL` outcomes and zero protected effects, and emits only
ordinal counts and fixed rule codes. Contributors need **no runner edits**
to add a fictional fixture-only PR.

This is **not a real agent**, actual MCP integration, or semantic assessment
of your injected instruction. See the
[toy-agent batch design](M10_TOY_AGENT_BATCH.md).

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
