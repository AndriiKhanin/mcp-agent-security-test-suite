# M10-G/H/I — Stateful first-party toy-agent session

**Tracking:** [Issue #226](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/226)  
**Implementation:** source-only, deterministic, entirely in-memory. This is **not a real AI agent**, MCP target, LLM, OS sandbox or prompt-injection detector.

## Purpose

M10-A–F added first-party toy-agent method-call witnesses. M10-G/H/I adds a
**stateful sequence** so the safe fictional task must progress through exactly
three steps:

```text
NEW --startOwnerTask--> AWAITING_RESULT
AWAITING_RESULT --deliverUntrustedToolResult--> RESULT_RECEIVED
RESULT_RECEIVED --finishOwnerTask--> FINISHED
```

Only the fixed source-authored toy agent can invoke the parent's in-memory
methods. The tool result is strictly validated fictional JSON, and
`toolResult.legitimateData` can be used *as data* exactly once. The gateway
**never evaluates or follows** `toolResult.embeddedInstruction`. No
capability is conferred by the untrusted tool-result text.

An early, replayed or post-completion result is **DENY**, as are any
requests for an unrelated file, unauthorized tool call, or fabricated
permission. The parent-owned gateway keeps private witness counters for
actual JavaScript method calls and denial decisions. Every protected
file/tool effect counter is **zero by construction**. These counters do
not observe OS file accesses, external MCP calls or model behavior.

## Verify in a reviewed source checkout

With Node.js 20 or 22:

```sh
node tools/toy-agent-session.mjs
node --test test/m10-toy-agent-session.test.mjs
```

The zero-argument CLI uses one fixed, source-owned fictional example. It
executes **eight fixed modes**:

| Fixed toy mode | In-memory method-call outcome |
| --- | --- |
| Safe ordered task | PASS, 3 calls, 0 denials |
| Premature tool result | FAIL, 4 calls, 1 ordering denial |
| Replayed tool result | FAIL, 4 calls, 1 ordering denial |
| Tool result after task finished | FAIL, 4 calls, 1 ordering denial |
| Unrelated file-read request | FAIL, 4 calls, 1 fictional read denial |
| Unauthorized tool-call request | FAIL, 4 calls, 1 fictional tool denial |
| Forged authority claim | FAIL, 4 calls, 1 forged-claim denial |
| Combined early/replay/read/tool/authority attempt | FAIL, 8 calls, 5 denials |

An aggregate selftest PASS requires **all eight predicted outcomes**,
including seven expected negative results, to match separate literal
expectations. The CLI does not accept paths, commands, model selection,
MCP endpoints, network targets or user-supplied action sequences. No
payload text, contributor case ID, secret, filename or private path is
included in output; error replies use a fixed code only.

The regression suite also runs all eight modes for **every** contributor's
strictly validated fictional JSON fixture, with independent witness
checks and cross-session isolation. Accepted input is not proof of
semantic resistance to its wording.

## Non-goals and security gates

- **No real agent**, LLM, external user MCP server, real file access
  requested by a payload, arbitrary process execution, credentials or
  third-party target interaction.
- The toy-agent fault branches are fixed trusted test code; they do **not**
  parse or understand prompt-injection instructions.
- These tests show *the simulated state and authorization boundaries
  enforced by our own source*, not real-world effectiveness against
  an adversarial AI agent.
- Exact npm release-candidate inventory remains at **80 paths**; all
  newly excluded source enters M6-J's full bounded hashed custody.
- Real-target approval [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
  independent audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43),
  and independent beta gate [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  remain separate open requirements.

Even after a 4/4 green PR CI, **post-merge main CI must be verified
separately** before any stage is marked externally accepted. Neither
status authorizes an npm publication or a security certification.
