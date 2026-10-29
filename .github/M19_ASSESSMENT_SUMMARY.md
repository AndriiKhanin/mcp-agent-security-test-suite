# M19 — one-command, source-separated first-party assessment

Run in a **reviewed public source checkout** with Node.js 20 or newer:

```sh
node tools/m19-assessment-summary.mjs
```

This command takes **zero arguments**. It imports and executes five existing
first-party source-only tests, without spawning a child process or shell,
downloading anything, reading a user-chosen file, connecting to a user MCP
server or accessing Stable Bridge. Four owned wire labs bind only ephemeral
IPv4 `127.0.0.1` ports. The M18 symbolic benchmark additionally reads one
**fixed, checked-in, public fictional JSON fixture**; its embedded
instructions are never executed.

## Evidence separated by origin

| Suite | Source | Fixed cases | What actually happens |
| --- | --- | ---: | --- |
| M15 owned red-team | First-party local HTTP | 4 | Intentionally susceptible client and permissive/guarded toy server; observed synthetic effect counters |
| M16 owned attack matrix | First-party local HTTP | 7 | Forged authority, replay and wrong response IDs with real owned TCP exchanges |
| M16 fictional permission replay | First-party local HTTP | 9 | In-memory grant binding, expiry/revocation and repeat against controlled guarded and permissive policies |
| M17 concurrent replay | First-party local HTTP | 3 | Two concurrently in-flight HTTP calls and witnessed pre-effect reservation vs check/commit race |
| M18 symbolic classification | Author-supplied event codes | 32 | Pure symbolic events, rule precedence, abstention and synthetic TP/FP/FN/TN |

**Owned local wire checks: 23.** **Author-controlled symbolic checks: 32.**
**Total source-owned checks: 55.** These are counts of *author-written test
cases*, not 55 unique attacks, 55 independently assessed projects, a
user-facing detection rate or 55 observed real agents.

Expected JSON: `status: "PASS"`, `suiteCount: 5`,
`suitesMatched: 5`, `ownedLocalhostWireCases: 23`,
`authorControlledSymbolicCases: 32` and
`sourceOwnedChecksTotal: 55`. Results are deterministic **in meaning**;
socket ports and execution timing are not recorded.

The independent M19 gate uses source-authored fixed case IDs, expected
classifications, success rule codes, source-provenance flags, witnessed
case counts, negative baseline metrics and no-external/no-real-agent
assertions. It does **not** accept nested `status: PASS` as proof. Any
missing, duplicate, reordered, nonmatching, sparse or accessor-bearing
witness causes `FAIL`, not a flattering aggregate. Tests inject
incorrect results while preserving their nested `PASS` field.

Only source-defined suite identifiers, witness **field names** and counts
can appear in output. The JSON report never echoes a raw tool response,
mock token, prompt injection, user path or localhost endpoint. Arguments
return a fixed ERROR with exit code 2.

## Honest limitations and release boundaries

The local wire experiments test *first-party, intentionally programmed*
good and bad toy policies; they do not certify real-world MCP deployments
or general LLM resistance. M18 is **symbolic contract coverage**, not a
linguistic prompt-injection evaluation or estimate of real-world accuracy.
No independent user beta, external security audit, authorized third-party
target or actual external agent was tested by this command.

This helper is **source-only** and excluded from the frozen, unpublished
80-file npm candidate. No runtime dependency was added. Owner-target
approval [#21](../issues/21), independent security review
[#43](../issues/43), and independent beta result
[#59](../issues/59) remain open. M19 engineering acceptance (2026-10-29):
[PR #280](../pull/280) passed [PR CI #40911862973](../actions/runs/40911862973)
**4/4** on Windows/Ubuntu Node20/22; it merged as
`12b5eec7aa585e36f6d017075dcd485d8b019c1f`, and the independently
triggered [main CI #40912510667](../actions/runs/40912510667) passed
**4/4 on that exact SHA**. This demonstrates first-party engineering
repeatability, not independently operated user beta or security certification.
