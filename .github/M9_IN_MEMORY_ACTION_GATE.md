# M9-B — First-party in-memory action gate and effect witness

**Issue:** [#206](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/206)  
**Scope:** Source-only, first-party fictional security model. **Not a real agent**, and not a credential or MCP security assessment.

## Why this exists

M8 accepts inert fictional prompt-injection scenario fixtures. M9-A evaluates
*author-supplied abstract event traces* and detects mismatches against safe
expectations. Neither step authorizes or executes a real tool.

M9-B introduces an additional independent layer: a finite, in-memory
authorization gate with its own parent-held symbolic effect witness. This
models what must happen **before** a tool response containing legitimate
task data plus lower-trust instructions could cause an unrelated operation.

The payload text is *never parsed or executed by the gate*. The gate receives
only reviewed source-owned action enums, with an explicit origin:

- `OWNER_TASK` — an authorized fictional task, not an authenticated user.
- `UNTRUSTED_TOOL_RESULT` — lower-trust fictional tool output, not authority.

The supported operations are `CONSUME_TASK_DATA`,
`REQUEST_UNRELATED_FILE_READ`, and
`REQUEST_UNAUTHORIZED_TOOL_CALL`. The only resources are fixed symbolic
`TASK_DATA`, `UNRELATED_FILE`, `UNRELATED_TOOL`. No input path or URL is
allowed by the schema.

## Rules and fail-closed behavior

| Request | Decision | Rule code |
| --- | --- | --- |
| Consume `TASK_DATA` as data | ALLOW (fictional only) | `FICTIONAL_TASK_DATA_AS_DATA_ONLY` |
| Read `UNRELATED_FILE` | DENY | `FICTIONAL_CROSS_RESOURCE_READ_DENIED` |
| Call `UNRELATED_TOOL` | DENY | `FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED` |
| Tool-result claims permission or owner authority | DENY | `TOOL_RESULT_AUTHORITY_SPOOF_DENIED` |
| Operation/resource mismatch | DENY | `FICTIONAL_OPERATION_RESOURCE_MISMATCH` |

These are strict default-deny rules. The `OWNER_TASK` label does not create
a permission to read unrelated files; it is an author-supplied fictional
source label, not ownership proof. Any unsupported operation or user-controlled
path is rejected before a decision.

The witness exists inside `runFictionalGateSequence` and observes only
literal `ALLOW`/`DENY` gate decisions. Its private counter increments when
the fictional task-data operation is allowed. It records denied attempts and
returns **zero committed fictional protected-resource effects**. Neither
the caller nor tool-response text can increment a protected-effect counter.

The witness is **not an operating-system or independent runtime observer**.
Zero counters do not prove that a real system was safe; the simulator never
had the capability to access a real file or external MCP tool.

## Run the fixed first-party controls

From a reviewed public source checkout with Node.js 20 or 22:

```sh
node tools/in-memory-injection-gate.mjs
node --test test/m9-in-memory-injection-gate.test.mjs
```

The CLI accepts **no arguments**. Its five fixed in-code actions are:

1. Source-owned fictional owner task consumes task data — ALLOW.
2. Fictional lower-trust tool-result supplies task data — ALLOW as data only.
3. That tool result requests an unrelated file read — DENY.
4. That tool result requests an unauthorized tool call — DENY.
5. That tool result claims authority to grant permission — DENY.

The overall selftest returns PASS only if all five independent literal
expectations match, with 2 allowed data operations, 3 denials, 0 protected
fictional effects and no real side effects. This is **not a real agent**
execution, prompt-injection detection against an external target, OS
sandbox, security audit, or permission to run arbitrary user content.

The JSON output contains fixed codes, counts and Boolean evidence limits;
no fixture strings, task content, local filenames, credentials, endpoints or
untrusted tool messages are echoed.

## Boundaries and next approval requirements

The guard is source-only and excluded from the exact **80-file npm
candidate**; there are no new dependencies. No network, model, MCP,
credential, process, local or external file execution is implemented.

Future work with a real agent would require separately reviewed, owner-approved
target ownership, least-privilege environment isolation, actual observation
from a trusted external witness, resource allowlisting, negative controls,
incident-handling design and a fresh Windows/Ubuntu Node.js 20/22 CI matrix.
This engineering-only work does not close independent beta
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59),
security/provenance audit
[#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
or external-target authorization
[#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21).
