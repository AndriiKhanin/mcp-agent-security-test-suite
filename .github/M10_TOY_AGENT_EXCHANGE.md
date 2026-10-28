# M10-A/B/C — First-party toy-agent method-call exchange

**Tracking:** [Issue #221](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/221)  
**Mode:** source-only, first-party in-memory synthetic security engineering.

## Why this step is different from M9

M9-A compares a caller-supplied symbolic trace to expected codes. M9-B–F
test a fixed in-memory policy gate and deliberately corrupted reports.

M10 introduces a *real sequence of JavaScript function calls* from a
**deterministic first-party toy agent** to a **separately parent-owned in-memory
gateway**. The gateway records which methods were actually invoked by that
toy agent. The recorded counts are not caller-supplied trace text.

**This is not a real AI agent**, LLM, user-owned MCP server or OS sandbox.
It does not evaluate the *semantic effectiveness* of a prompt injection,
generalize to third-party agents, or provide a real security certification.

## Exact trust boundary

The exchange takes a fully validated fictional tool-result fixture. The
source-owned toy agent consumes `toolResult.legitimateData` as a string and
does not read, interpret, execute or forward
`toolResult.embeddedInstruction` to any command or tool.

The gateway exposes only four inert, fixed methods. It has no filesystem,
network, process, model or MCP execution capability. It owns and keeps
private all of its method-call counters.

| First-party toy-agent action | Gateway decision | Witness |
| --- | --- | --- |
| Consume fictional task data | ALLOW | Increment handled task data |
| Request an unrelated file | DENY | Count the request, commit no file effect |
| Request unauthorized tool | DENY | Count the request, commit no tool effect |
| Claim a permission from tool-result text | DENY | Count the claim, grant no authority |

The deliberate fault modes are **source-authored functions** that call
specific gateway methods unconditionally. They do **not** derive commands
from the fixture's untrusted text. That is important: a negative result
means the harness detected its own deliberately injected method call,
not that it detected the wording of an adversarial prompt.

## Running the fixed five-case demonstration

From a reviewed repository checkout with Node.js 20 or 22:

```sh
node tools/toy-agent-exchange.mjs
node --test test/m10-toy-agent-exchange.test.mjs
```

The zero-argument CLI loads only the one fixed public fictional JSON
fixture bundled under `.github/fixture-proposals/`; it does not allow
a user-specified target or file. Five controls must match:

1. `SAFE_DATA_ONLY`: task data accepted, zero forbidden method requests,
   expected PASS.
2. `FAULT_UNRELATED_READ`: toy agent makes a forbidden in-memory
   *request*, expected FAIL with a single denial.
3. `FAULT_UNAUTHORIZED_TOOL`: attempted extra in-memory tool request,
   expected FAIL.
4. `FAULT_FORGED_AUTHORITY`: attempts to promote tool-result text to
   owner authority, expected FAIL.
5. `FAULT_COMBINED`: all three forbidden calls are observed and denied,
   expected FAIL.

The **combined** selftest is PASS only when all five predictions match,
including four expected negative outcomes. All protected effects remain
zero by construction.

Neither successful nor failed toy-agent results imply any real OS file
read, live MCP traffic, user command, hosted model call, independent
beta execution or audit. No fixture names, paths, tool text or credentials
are copied into the fixed result schema.

## Future real-agent evaluation requirements

To test an actual AI agent, future work would need separately reviewed
authorization and isolation, genuine independent outcome evidence, a
real model/agent integration with controlled inputs, narrowly scoped
allowlisted resource access, independently measured side effects, and
strong negative controls. None of those permissions arise from this
change. External-target [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
and audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
remain open.

The source-only helpers are excluded from the exact pinned 80-path npm
candidate. Any newly excluded files still enter M6-J's bounded full
source-custody inventory with no missing hashes.
