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

## M45 — detector-blindspot authorization matrix (source-owned toy gateway)

The follow-up to externally reported Firstwatch misses in
[comparison #329](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329)
and [tracking #345](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/345)
demonstrates a different invariant from detection accuracy: the
**authorization gateway must reject forbidden methods regardless of whether
a scanner flags, misses, or errors on text**.

From the reviewed repository checkout, run:

```sh
node tools/toy-agent-exchange.mjs --blindspot-gate-matrix
node --test test/m10-toy-agent-exchange.test.mjs
```

This runs **15 source-authored in-memory cases**: three hypothetical scanner
observations (`FLAGGED`, `NOT_FLAGGED`, `ERROR`) multiplied by the
existing five deterministic toy-agent gateway modes. Each observation is
a *hypothesis*, not a scanner result; it is intentionally not passed into
the gateway. Four modes make source-authored forbidden method calls that
the parent-owned in-memory gateway denies. The safe mode makes no forbidden
call. **The real firstwatch scanner is not run or imported**.

An expected `FAIL` on a fault mode signifies an *observed, denied
forbidden method request*, not a committed protected effect; the matrix
selftest passes only if all 15 predictions match, all denied request
counts agree, and fictional protected effects remain zero. The matrix
also requires the observed gateway decision to be identical across
hypothetical scanner outcomes for a given mode.

This is **not** proof that a real model follows the policy, that real
filesystem or network operations were stopped, that a third-party scanner
will miss an injection, or that the agent is protected in production.
No OS file target, external MCP endpoint, model, API key or executable
is accepted. The no-argument five-case selftest remains unchanged.
Future independent real-agent tests require separate owner approval,
isolated operation and real side-effect witnesses.


## M46 — origin-bound toy authorization (not text-based authority)

Run from a reviewed source checkout:

```sh
node tools/toy-agent-exchange.mjs --context-provenance-matrix
node --test test/m10-toy-agent-exchange.test.mjs
```

The **source-owned, first-party in-memory** gateway binds methods to three
separate call interfaces: `OWNER_EXPLICIT`,
`TOOL_RESULT_UNTRUSTED`, and `HUMAN_EMAIL_UNTRUSTED`.
A tool-result string or email cannot select the trusted owner interface
via a claimed role, YAML metadata, suspicious phrases, or detector output.
This distinction is guaranteed **only by fixed test source**; a real
system would require actual authenticated caller identity and capability
separation, which are not implemented in this toy.

The matrix has **36 deterministic trials** (three hypothetical scanner
labels × three source contexts × four actions):

- Consuming fictional task data is allowed in all three contexts.
- Updating fictional task status is allowed only via the source-bound
  trusted-owner interface, and has a **positive committed toy effect**
  in that case. The exact same request from an untrusted tool result
  or ordinary email is denied.
- Attempts to read an unrelated fictional file or promote a claimed
  authority level are always denied.
- Every decision is identical under hypothetical scanner outcomes
  `FLAGGED`, `NOT_FLAGGED`, and `ERROR`, since those
  labels are never supplied to the gateway.

The parent records actual JavaScript method invocations and distinct
fictional allow/deny effects. Passing CI is evidence **only of this
source-owned toy policy**. These 36 cases **do not interpret natural
language**, authenticate a real user, execute an AI model, start an
external scanner, read real files, invoke real MCP tools, or prove that
the same provenance guarantees hold in an adversarial process.

The no-argument original five-case toy selftest and the M45
`--blindspot-gate-matrix` remain unchanged.

## M47 — fine-grained fictional owner-grant scopes

M46 checks who owns the *ingress* interface: an owner method is available
only through the parent's source-owned owner closure. M47 adds a separate
question: **does this owner have the precise grant for this action?**

```sh
node tools/toy-agent-exchange.mjs --scoped-authority-matrix
node --test test/m10-toy-agent-exchange.test.mjs
```

The fixed offline matrix evaluates **11 parent-authored combinations** of
source origin, owner grant, and requested toy action, repeated across three
hypothetical scanner labels (`FLAGGED`, `NOT_FLAGGED`, `ERROR`):
**33 total toy cases**. The allowed positives are ordinary task-data
handling and owner-initiated actions backed by the matching fictional
`READ_ARCHIVE` or `USE_TOOL` grant. An owner-originated read with a
tool-only grant, or a tool action with a read-only grant, is **denied**.
Untrusted tool results, JSON result fields, and human emails never gain a
grant by asserting `OWNER_APPROVED`.

Only the **source-owned parent** creates context and grant values in this
demonstration. The permission decision does not depend on the detector
label. Denials must produce zero unauthorized fictional effects; two
allowed owner actions increment **memory-only** authorized counters.
There is no real file read, execution, API/MCP call, model, signature
validation, owner identity attestation, or third-party scanner execution.

M47 supplements (but does not replace) the M46 channel comparison or
M45 blindspot matrix. Real grants and trustworthy provenance are future
integration requirements; this matrix alone cannot establish that either
would be enforced in a deployed agent.

## M48 — real temporary-file effect readback, first-party only

M48 adds actual **ordinary local filesystem I/O** to the first-party
source-only testing workflow, in contrast to M45/M46's exclusively
in-memory counters and M47's loopback transport denial.

From a reviewed source checkout:

```sh
node tools/toy-agent-exchange.mjs --temp-file-effect-witness
node --test test/m10-toy-agent-exchange.test.mjs
```

The new command performs **nine fixed checks** (three *hypothetical*
scanner classifications × three source-owned contexts). Every check
creates a fresh OS-allocated test-owned directory under the system's
temporary directory. No path or file content is caller-selectable.

- The source-assigned `OWNER_EXPLICIT` closure writes a single fixed,
  fictional task-state file with exclusive creation (`wx`). A separate
  parent-owned readback enumerates the actual directory and verifies
  the exact bytes. Three allowed writes are observed across nine checks.
- The source-assigned `TOOL_RESULT_UNTRUSTED` and
  `HUMAN_EMAIL_UNTRUSTED` closures deny the same write. A parent-owned
  directory enumeration must see zero files for these six cases.
- The test-only exported `runFixedTemporaryFileEffectFaultSelftest()`
  deliberately writes **one unauthorized fictional file** in one
  temporary directory despite a denied gateway decision. A sound
  witness returns `FAIL`, observes one unexpected file, then cleans
  up. This direct test fault is **not reachable via CLI**.
- Every directory is recursively removed in `finally` and checked
  for absence; cleanup failure prevents `PASS`. The result never
  publishes a temporary path, arbitrary bytes, credentials or
  operating-system environment values.

This is evidence of **real, test-owned temporary file creation,
readback and deletion**, not evidence of an OS sandbox: the code
runs with normal process privileges, parent and gateway reside
inside one trusted process, and no real user ownership is verified.
No model, firstwatch scanner, MCP tool call, external target, secret
file, remote network, user-selected command or path is involved.
Do not extrapolate this to end-to-end prompt-injection prevention,
real filesystem confinement, or an independent beta/audit.

The original no-argument M10 selftest and M45/M46 CLI modes
remain unchanged. Follow-up M49 can separately explore first-party
staging transport with independently observed allowed/denied effects
after review. An external/user-owned MCP target remains gated under
[#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21).
