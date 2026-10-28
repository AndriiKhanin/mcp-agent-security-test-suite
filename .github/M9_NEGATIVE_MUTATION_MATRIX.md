# M9-F — Deterministic fictional negative-control mutation matrix

**Tracking:** [Issue #215](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/215)  
**Scope:** first-party, source-only **synthetic report-sensitivity test**. This is **not a real agent** and not a prompt-injection detector.

## Use

From a reviewed local source checkout using Node.js 20 or 22:

```sh
node tools/fictional-negative-control-matrix.mjs
node --test test/m9-negative-control-matrix.test.mjs
```

The zero-argument command visits the repository-owned, fixed
`.github/fixture-proposals/` directory. It reuses the M9-E batch preflight
and M8 bounded schema loader (1–16 fictional `.json` files only). Each
valid fixture passes through the fixed M9-C four-probe policy gate to
produce a **first-party baseline**. That baseline must match the strict
M9-E symbolic outcome contract.

The matrix then creates **43 fixed, source-authored negative variants per
fixture**, and demands that **every one** is rejected by the independent
M9-E report validator:

| Group | Count | Synthetic corruption tested |
| --- | ---: | --- |
| Top-level contract/authority | 21 | Status, exit code, provenance label, simulated scope, observation and authorization claims, zero protected effects |
| Four per-case mutations | 16 | Each of four controls is independently changed in matched flag, expected decision, rule code or control identity |
| Structural mutations | 6 | Missing, duplicated, reordered or appended control; unexpected top-level or nested authority field |
| **Total per fixture** | **43** | **All expected to be rejected** |

A `PASS` requires a valid baseline and all 43 negative variants rejected
**for every fixture**. The CLI only reports a total number of fixtures,
mutations checked, rejected and escaped, plus fixed public symbolic codes.
It never prints contributor-provided case IDs, filenames, paths, injected
text, token strings or arbitrary report fields.

## Claims and non-goals

- This **does not** run a real agent, semantic model, MCP server, tool or
  user command. It reads only the strict source-owned fictional fixture files,
  never a file requested in a tool-result injection.
- `PASS` confirms only that the *symbolic policy report contract* detects
  the fixed synthetic tamper patterns. It is **not** evidence of real
  prompt-injection detection, independent tester provenance, OS isolation
  or external security certification.
- The fixture's embedded instruction is **never interpreted** or executed.
  Contributors must never include real logs, private paths, credentials or
  production endpoints, since input schema checks are not a DLP scanner.
- All helpers remain source-only and excluded from the pinned npm
  candidate. No external dependencies or permissions have been added.

The [fixture-only contribution guide](FIXTURE_ONLY_CONTRIBUTIONS.md)
explains how to submit a fictional scenario without editing runner code.
The [batch preflight](M9_FIXTURE_BATCH_PREFLIGHT.md) and
[M9-C bridge](M9_FIXTURE_POLICY_BRIDGE.md) describe the underlying
fixed controls and limits. Independent beta
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59),
independent security audit
[#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
and real-target authorization
[#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21)
remain open and separate.
