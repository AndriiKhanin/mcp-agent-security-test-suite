# M10-D/E/F — Batch toy-agent method-call replay for fictional contributors

**Tracking:** [Issue #223](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/223)  
**Scope:** source-only, bounded, deterministic in-memory first-party testing.

## Run

From a reviewed source checkout with Node.js 20 or Node.js 22:

```sh
node tools/toy-agent-batch.mjs
node --test test/m10-toy-agent-batch.test.mjs
```

The zero-argument command enumerates only direct regular JSON files under the
fixed repository `.github/fixture-proposals/` directory (1–16 files).
It rejects unknown entry types, symlinks, invalid names, extra arguments,
malformed JSON and mismatched fixture IDs using the existing M8 bounded
strict loader. It does not allow custom directories or arbitrary process
execution.

**Each valid fictional fixture is delivered to the exact first-party toy
agent added in M10-A/B/C**, once in each of five predetermined modes:

| Toy mode | Expected gateway observation |
| --- | --- |
| Safe data-only | One in-memory task-data method call, no forbidden request, PASS |
| Deliberate unrelated read request | One denied in-memory read request, FAIL |
| Deliberate unauthorized tool request | One denied in-memory tool request, FAIL |
| Deliberate forged permission | One rejected in-memory authority claim, FAIL |
| Deliberate combined fault | Three forbidden requests denied, FAIL |

A **separate strict outcome verifier** checks exact report fields, actual
toy-agent *in-memory method-call counts*, observed denial counters, all
zero protected-effect counters and every false real-agent/authorization
claim. It rejects a fault mislabeled PASS or a forged "real agent tested"
claim. The total batch is PASS only when the safe mode and all four
deliberate failure modes match **for every fixture**.

This is an improvement over M9's author-supplied traces: the source-owned
toy agent makes actual JavaScript gateway method calls and the gateway owns
its witness counters. The witness does **not** observe actual external
resource access or a deployed agent.

## Security and interpretation limits

- This is **not a real agent**, LLM, semantic prompt-injection detector,
  real MCP service, OS sandbox, independent security audit or certification.
- The fixed toy fault modes make deliberate method calls from trusted source
  code. They **do not** parse or follow the submitted fixture's
  `embeddedInstruction` or demonstrate whether such text could influence
  an LLM.
- No unrelated filesystem file requested by an injected instruction,
  external network endpoint, user command, model, credentials or MCP
  target is read or executed. The only files opened are approved bounded
  fictional contribution JSON files.
- The combined JSON report contains only public fixed rule codes, safe
  numeric counts and ordinal per-fixture results; it never prints
  contributor text, paths, case IDs, secrets or local filenames.
- The maximum 16-file cap and complete M6-J excluded-source inventory
  stay in force. The npm candidate's exact 80-path inventory is unchanged.

See the [toy-agent single-case design](M10_TOY_AGENT_EXCHANGE.md) and the
[fixture-only contributor guide](FIXTURE_ONLY_CONTRIBUTIONS.md).
Independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59),
security audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
and approval for real MCP targets
[#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21)
remain separate, open requirements.
