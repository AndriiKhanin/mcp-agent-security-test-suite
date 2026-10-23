# Independent synthetic negative controls

**Roadmap:** [M1-03 (#4)](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/4) · **Scope:** offline, fictional-only.
**Files:** [Golden data](../fixtures/security-negative-controls.json) and [the executable checks](../test/security-negative-controls.test.mjs).

## Why this corpus exists

A security test suite can pass because a validator and its tests make the **same mistaken assumption**. This corpus keeps explicit expected denial reasons and error rule codes in a separate, inspectable **golden-data JSON file**. The checks do not call `decide()` to calculate those expected outcomes.

Every authorization case starts from a freshly cloned **authorized fictional write** and applies exactly one deterministic mutation defined in golden data. The test then checks all three separate signals:

1. **Positive control:** the unmodified fictional write is allowed and produces exactly one *simulated* write.
2. **Denied control:** the mutated action has the literal expected `DENY` reason and produces no synthetic read/write effects in either the scenario runner or a **harness-owned in-memory effect witness**.
3. **Expectation trap:** when the mutated fixture falsely insists the action was authorized, the scenario runner must return `FAIL` with `EXPECTATION_MISMATCH`, even though the observed denied operation caused no simulated effect.

The tests also inject known fictional faults into the witness adapter: unauthorized writes, false-success responses, dropped authorized writes and a synthetic canary echo. They require **specific witness failure rules** rather than merely asserting a generic failure.

## Golden coverage

| Threat class | Expected synthetic evidence |
| --- | --- |
| Wrong caller or grant owner | `OWNER_MISMATCH` and no simulated effect |
| Wrong requested or granted resource (audience) | `AUDIENCE_MISMATCH` and no simulated effect |
| Old grant generation | `STALE_GENERATION` and no simulated effect |
| Not-yet-valid / expired grant | `NOT_YET_VALID` / `EXPIRED_GRANT` |
| Missing write scope in grant or policy | `INSUFFICIENT_SCOPE` and no simulated effect |
| Untrusted caller / unknown tool | `UNTRUSTED_ORIGIN` / `UNKNOWN_TOOL` |
| Simulated precommit fault or unapproved deletion | `SIMULATED_PRECOMMIT_FAILURE` / `APPROVAL_REQUIRED` |
| Reuse of a committed mutation nonce | `REPLAYED_NONCE` with exactly one prior simulated write |
| Precommit failure before nonce consumption | Later legitimate retry writes exactly once |
| Corrupted protocol retry method / arguments / capabilities / version / response ID | `RETRY_METHOD_CHANGED`, `RETRY_PARAMS_CHANGED`, `UNAUTHORIZED_CAPABILITY_DECLARATION`, `RETRY_VERSION_NOT_MUTUALLY_SUPPORTED`, `INVALID_NEGOTIATION_RESPONSE` |
| Fault-injected mock behavior | `DENIED_TOOL_SIDE_EFFECT`, `DENIAL_REPORTED_AS_SUCCESS`, `ALLOWED_EFFECT_MISMATCH`, `SYNTHETIC_CANARY_LEAK` |

The protocol cases compare a known-good two-step fictional retry transcript against an altered clone, and require the literal rule code from the corpus. Inputs are never copied into findings.

## Reproduction

```sh
node --test test/security-negative-controls.test.mjs
node --test
```

The repository's [CI](../.github/workflows/ci.yml) runs the full suite on Windows and Ubuntu with Node.js 20 and 22. A release can claim completion of M1-03 only **after** CI success on the merged public `main` branch, recorded in [Issue #4](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/4).

## Limitations and maintenance rules

- The golden values are **human-authored expectations**, which reduces coupling to the implementation but is not an external, mathematically independent or adversarially tamper-proof oracle. Their quality still depends on review and intentional negative controls.
- The parent-owned witness counts **fictional in-memory effects**, never filesystem, network or actual MCP tool side effects. It does not validate real-world authorization, OAuth, cryptographic token binding or security of a remote endpoint.
- Only a small, fixed set of explicitly defined mutations is exercised; this is **not** fuzzing, live penetration testing, an OS sandbox, full protocol conformance, or certification.
- Fixtures must stay small, bounded and synthetic. No real access tokens, passwords, production logs, personal paths, private system references or customer payloads.
- Extend the golden corpus when new invariants are implemented. For every new mutation require a stable expected denial/rule and absence of simulated effects where appropriate; avoid deriving expected values by calling the production policy oracle.
- No paid APIs or external services are required to run these checks.
