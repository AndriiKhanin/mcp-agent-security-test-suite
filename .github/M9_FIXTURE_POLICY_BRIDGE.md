# M9-C — Link fixture-only proposals to fixed fictional policy controls

**Tracking:** [Issue #208](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/208)  
**Scope:** source-only synthetic fixture schema and first-party in-memory policy gate. This is **not a semantic test** of prompt injection.

## What the bridge actually verifies

A new contributor may submit **only** one sanitized JSON file under
`.github/fixture-proposals/`. The M8 file reader checks the direct
repository-local filename, matches the `caseId`, rejects symlinks,
bounds content to 4096 bytes and applies the strict JSON and schema
validation **before** the M9-C bridge performs any policy checks.

A valid fixture triggers four **static, source-authored** M9-B in-memory
policy probes. The author-supplied `toolResult.legitimateData` and
`toolResult.embeddedInstruction` fields are checked only for schema
constraints. Their contents are never parsed as requests, interpreted
as authority, passed to a model or echoed.

| Fixed synthetic probe | Required result |
| --- | --- |
| `TASK_DATA` is consumed as fictional task data | `ALLOW` |
| Unrelated file-read request | `DENY` |
| Unauthorized extra tool-call request | `DENY` |
| Tool-result text claims extra authority | `DENY` |

The parent-owned in-memory witness must record exactly one accepted
fictional data action, three denials, and **zero protected simulated
effects**. The bridge checks independent literal rule codes, rejection
counts and all no-real-execution flags.

## Contributor usage

From a reviewed public source checkout (Node.js 20 or 22):

```sh
node tools/fixture-policy-bridge.mjs .github/fixture-proposals/mixed-tool-result-file-read.json
node --test test/m9-fixture-policy-bridge.test.mjs
```

Replace the first filename with your own fictional proposal in that exact
directory. CI automatically discovers **all** fixture-proposal JSON files
and executes the same four fixed policy probes for each; a fixture-only PR
requires no change to the test runner.

The CLI accepts exactly one checked local proposal filename; unsupported
paths, hidden array fields, malformed JSON, duplicate keys, invalid
permissions, missing files and extra arguments fail closed with a
constant symbolic error report. The policy report never contains
fixture strings, paths, credentials, model messages or hidden data.

## Important limitations

This bridge is **not a prompt-injection detector**, not a semantic test
of the contributor's wording, and not an external agent's behavior
measurement. A changed attack phrase can pass with the same result
because only the *fixed gate's* response to its source-owned test actions
is assessed. A `PASS` means a validated fictional fixture successfully
triggered the standard offline policy checks; it does **not** prove that
an agent would resist the fixture's actual embedded instruction.

No untrusted instruction is executed; no unrelated real file is read;
no arbitrary process is launched; no external MCP server, live model,
customer data or credential is accessed. The checked 80-file npm
candidate remains unchanged. An independent security audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43),
genuine independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
and any real-target authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21)
are separate gates.
