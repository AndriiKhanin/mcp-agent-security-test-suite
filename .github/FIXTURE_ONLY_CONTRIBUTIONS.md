# Fixture-only contributions: fictional tool-result instruction injection (M8-S/T/U)

**Fixture-only PRs are welcome.** A contributor may propose a completely fictional
JSON test case in `.github/fixture-proposals/` **without changing the test
runner**. The existing CI discovers and validates each proposal automatically.
Proposals are reviewed by a maintainer before merging.

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
