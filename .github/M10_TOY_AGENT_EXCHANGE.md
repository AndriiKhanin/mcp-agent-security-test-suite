# M10–M59 — source-owned toy authorization experiments

**First-party synthetic engineering only. This is not a real AI agent,
authenticated owner, confined OS process, third-party MCP connector,
real scanner or security certification.** All modes except the
explicit M48 temporary-file witness use fixed in-memory effects.
No command accepts external endpoints, executable code, credentials,
user-selected paths, untrusted authority claims or actual approval.

## M10-A/B/C — real JavaScript calls, not caller-supplied traces

`node tools/toy-agent-exchange.mjs`
`node --test test/m10-toy-agent-exchange.test.mjs`

A source-owned toy consumes legitimate fictional task data, never executes
`toolResult.embeddedInstruction`. An independently parent-owned in-memory
gateway observes each method call. Five fixed modes include a safe
positive and four deliberately injected requests for unrelated read,
unauthorized tool or forged authority (including combined). The
fault modes must be **observed and denied**, while protected effects
remain zero. FAIL on a negative control is *expected*; a PASS selftest
means only all five source-authored predictions matched.
Source [issue #221](../issues/221).

## M45 — hypothetical scanner blind spot versus gate

`node tools/toy-agent-exchange.mjs --blindspot-gate-matrix`

15 trials = five fixed toy modes × `FLAGGED`/`NOT_FLAGGED`/`ERROR`
hypotheses. Labels are *not run scanner results* and never reach the
gateway; forbidden methods remain denied under all labels. No real
Firstwatch process or model runs. Compare [#329](../issues/329)
and follow-up [#345](../issues/345).

## M46 — ingress must be source-bound

`node tools/toy-agent-exchange.mjs --context-provenance-matrix`

36 fixed cases = three hypothetical labels × source-owned
`OWNER_EXPLICIT`, `TOOL_RESULT_UNTRUSTED`, `HUMAN_EMAIL_UNTRUSTED`
interfaces × four actions. Owner-only fictional task-status update
commits an in-memory positive; tool text and emails cannot choose that
interface by claiming `OWNER_APPROVED`. Unrelated file/tool/authority
methods remain denied. No independent real identity authentication.

## M47 — explicit scoped owner grants

`node tools/toy-agent-exchange.mjs --scoped-authority-matrix`

33 fixed cases = 11 owner-context/grant/action plans × three hypothetical
scanner labels. Only source-owned owner requests with the matching
`READ_ARCHIVE` or `USE_TOOL` toy grant may get their respective
fictional protected read or tool effect. Missing or mismatched grant,
tool-result-originated claims, JSON text and emails remain DENY.
Detector labels cannot upgrade permissions.

## M48 — real disposable OS effect witness, not sandbox

`node tools/toy-agent-exchange.mjs --temp-file-effect-witness`

Nine fixed local OS checks = three hypothetical scanner labels × owner,
tool-result or email source contexts. Source-owned owner creates one
fixed fictional task file in a fresh system temp directory; independent
parent readback confirms exact bytes. Six untrusted-context requests
must not write. A **direct test-only**, not public-CLI fault deliberately
writes despite denial; independent readback must detect FAIL. The
test removes its temporary directories. This is **not real user file
access**, confinement or trusted external evidence.

## M59 — bounded approval decisions, reviving old proposal #354

`node tools/toy-agent-exchange.mjs --approval-policy-matrix`

108 source-owned in-memory trials = nine action/origin/grant plans ×
baseline/careful × external-content unseen/seen × three hypothetical
scanner labels. The outcome is only `ALLOW`, `DENY` or
`REQUIRE_APPROVAL`.

- No grant, wrong grant or untrusted origin: **DENY**, never prompt
  for a forbidden operation. Detector hypotheses cannot change this.
- Authorized read-only work and plain task data: **ALLOW** with
  no approval prompt, in either policy mode.
- Only a correctly owner-granted, fictional **side-effecting tool action**
  in CAREFUL mode *after external content* gets `REQUIRE_APPROVAL`.
  It remains unanswered and commits zero toy tool effects.
- Baseline allows the same eligible toy action without this extra prompt.
  No simulated outcome grants real consent; no external-content string
  influences authenticated origin/grant (all fixed source values).

Acceptance expects 108 matching decisions, 45 ALLOW, 60 DENY,
three pending approvals, zero prompts for reads/denied requests,
nine permitted fictional tool counters and identical decisions across
the three hypothetical scanner labels. Values count *test-table cases*,
not measured user annoyance or real-world security.

## Shared limits and gates

No live agent, model, scanner, user-owned MCP, real owner click,
privilege escalation, endpoint, real deployment or release approval.
The parent source is trusted only within these **synthetic** tests.
The unpublished npm package remains frozen at **80 paths**; the M6-J
custody test separately indexes **all 240 excluded files** with
a strict **2,000,000-byte** ceiling (overflow denies, never raise limits).
Real target permission [#21](../issues/21), independent beta
[#59](../issues/59), security audit [#43](../issues/43) and
owner release decision remain OPEN.
