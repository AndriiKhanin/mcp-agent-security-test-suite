# MCP Agent Security Test Suite — v0.0.10-rc.1

**Release candidate for validation before the stable v0.0.10 release.** Synthetic contract tests only; not a vulnerability scanner or security certification.

Zero-runtime-dependency Node.js 20+ project for synthetic security-contract tests for MCP-shaped tools and agent execution. Offline-first: no **external/user-owned** MCP server, credentials, real tool execution, live vulnerability scanning, independent OAuth verification or security certification. M4-B6-A adds only a first-party ephemeral modern MCP-shaped staging listener on 127.0.0.1. The optional first-party `loopback` command opens a temporary **local-only IPv4 127.0.0.1 socket**; it never contacts an external target.

## Modules

- `scenario` — synthetic authorization, replay, scoped resources and failure semantics
- `stdio` — fixed local JSON-RPC-over-stdio batch mock: fictional initialize, tool list, allowed read and denied write; no user executable or inherited credentials. See [limits](docs/STDIO_MOCK.md). Not a general MCP server or OS sandbox.
- `loopback` — owner-approved M4-A fixed **127.0.0.1 ephemeral HTTP** ping test with strict Host/Origin/method/version controls and no external destinations, credentials or tool calls; see [local transport limits](docs/LOOPBACK_HTTP_MOCK.md). Opens a temporary local socket, not a live MCP scanner.
- `mock`, `witness`, `process` — fixed simulated tools, parent-owned in-memory effects and forked in-repository mock worker. Process isolation is *not* an OS sandbox.
- `trace` — consistency checks for fictional action logs; does not actually search for secrets.
- `jsonrpc` — offline request/reply envelope checks with a deliberately strict profile.
- `era` — explicitly selected synthetic modern (2026) and legacy (2025) MCP transcript profiles.
- `negotiate` — fictional modern version/capability error and safe retry checks; v0.0.10 adds a strict replay-payload invariant: retry must preserve every parameter except the negotiated protocol version (strict project profile, not a normative MCP requirement).

## Security scope and threat model

This is an **offline synthetic contract-testing tool**, not a live scanner, authorization service, OS sandbox, OAuth validator or security certification. Fixture grants and mock results cannot authenticate users or demonstrate the safety of a real MCP server. The built-in child process runs with normal OS permissions; it must not be used to execute untrusted code.

Read the source-grounded [threat model](docs/THREAT_MODEL.md) for assets, attacker capabilities, trust boundaries, residual risks and the mandatory authorization checklist for any future adapter. The [independent negative-control corpus](docs/NEGATIVE_CONTROLS.md) documents literal failure expectations, fault-injected examples and their limitations. All real-network integrations remain **unimplemented** and require separately approved, explicitly allowlisted user-owned test environments. See [Security Policy](SECURITY.md) for responsible disclosure.

## External-beta evidence consistency boundary (M5-08)

A pure offline `reviewBetaEvidenceSummary` helper checks only whether
a **manually sanitized, symbolic beta-report claim** is internally
consistent with the five fixed fictional controls. Its result
`CLAIM_CONSISTENT_ONLY` is not independent tester provenance,
actual execution, security certification or authorization. User names,
URLs, commands, logs and credentials are not accepted. Genuine
independent usability evidence remains an open manual acceptance gate
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59).
[Reviewer limitations and field contract](docs/BETA_TESTING.md#m5-08--offline-consistency-preflight-for-a-future-beta-report).

## Cancelled first-party HTTP requests and isolated late results (M11-J/K/L)

From a reviewed source checkout run:

```sh
node tools/m11-cancelled-response.mjs
```

This **source-only** selftest puts two fictional MCP-shaped HTTP requests
in flight against a disposable first-party `127.0.0.1` listener. It
cancels request A only after both request bodies are processed, verifies
that A's response/socket actually closes, then checks request B
independently. A late attempt to deliver A's response is suppressed
**without sending bytes to a closed socket**. The B reply must match its
exact ID, fictional session marker and reviewed body before being
passed as data to the M10 toy gateway.

Fourteen fixed checks expect two safe PASS and 12 deliberate negative FAIL
cases, including a swapped response, forged approval, duplicated JSON
keys, redirect, timeout and replayed request ID. All public output
contains only fixed codes/counts. This is **not a real AI agent**, remote
MCP scan or semantic injection assessment. See the
[cancellation design](.github/M11_CANCELLED_RESPONSE.md) and
[Issue #234](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/234).

## Two fictional owners on one isolated localhost transport (M11-M/N/O)

From a reviewed repository checkout, run:

```sh
node tools/m11-owner-isolation.mjs
```

The source-only test runs **two overlapping fictional owner sessions** on
a disposable `127.0.0.1` HTTP listener. Each source-owned request has
its own task ID, owner/session marker and one-run **ephemeral synthetic
capability**. Both strictly validated on-wire responses must match the
right owner before any data reaches an independent M10 toy gateway.
Seventeen fixed controls include two valid delivery orders and fifteen
deliberate failures (cross-owner capability, swapped response, forged
approval, duplicate JSON key, redirect, oversized/stalled reply, etc.).

This is **not real authentication**, an LLM, external MCP testing or
semantic prompt-injection detection. Capabilities are not user credentials;
the test never prints them. See the
[M11 owner isolation design](.github/M11_OWNER_ISOLATION.md) and
[Issue #236](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/236).

## Concurrent first-party HTTP response correlation (M11-G/H/I)

In a reviewed source checkout, run:

```sh
node tools/m11-concurrent-response.mjs
```

The first-party local mock now launches **two overlapping HTTP
requests**, then deliberately issues their responses in either order.
The client must match every returned response to its own exact
JSON-RPC ID, fictional session marker, and approved on-wire data
**before** invoking the M10 toy gateway. The suite includes two safe
positive modes and 13 negative modes for swapped/replayed responses,
request ID reuse, forged headers, malformed JSON, redirects, oversized
or stalled responses. Actual request and socket-close counters are
checked, but OS packet arrival order is **not** claimed.

This is **not a real AI agent** or semantic prompt-injection test,
and neither external MCP servers nor unrelated files are accessed.
See the [concurrent correlation guide](.github/M11_CONCURRENT_RESPONSE.md)
and [Issue #232](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/232).

## Fresh fictional owner capabilities across independent runs (M11-P/Q/R)

Run the source-only fixed localhost test:

```sh
node tools/m11-owner-epoch.mjs
```

Two **separate** reviewed first-party `127.0.0.1` HTTP listeners
are started and fully shut down in sequence. Each issues its own
source-generated synthetic capability; the next run **must reject a
capability from the prior run**, even if the request shape is otherwise
correct. The tool result reaches a distinct M10 toy gateway only after
strict on-wire request ID, fictional owner/epoch and content validation.

The selftest expects **one clean PASS and 17 deliberate FAIL controls**,
including stale/replayed authority, forged requests, swapped responses
and incomplete replies. No user target, real credential, external MCP,
arbitrary command or AI agent is exercised. This **does not prove real
authentication or LLM prompt-injection resilience**. See the
[owner-epoch guide](.github/M11_OWNER_EPOCH.md) and
[Issue #238](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/238).

## Strict request-scoped SSE tool-result checks (M12-G/H/I)

Run this reviewed source-only modern MCP 2026-07-28 Streamable HTTP
SSE demonstration:

```sh
node tools/m12-modern-sse.mjs
```

The fixed first-party client sends one `tools/call` POST to a separate
disposable `127.0.0.1` listener. Its response is a bounded
`text/event-stream` with one request-scoped fictional progress
notification followed by a final JSON-RPC tool response. The client
strictly verifies each frame, UTF-8, IDs, exact fictional data and
the final response before passing any tool content into the M10
deterministic toy gateway. Valid fragmented chunks, CRLF, comments
and multiline data are accepted; M12-J/K/L established 40 checks,
M12-M/N/O expanded this to 50, and M12-P/Q/R expands the first-party
matrix to **60** (4 accepted, 56 deliberately rejected). Forged
progress/result metadata, SSE id/retry control lines and a comment frame
after the final reply are rejected before any toy gateway delivery.
M12-M/N/O additionally denies ten unreviewed response-header variants,
including legacy session/cookie fields, altered caching and duplicate
Content-Type, even when the SSE body bytes would otherwise be valid.
The response-header allowlist is specific to the first-party mock, not
complete MCP or HTTP conformance. M12-P/Q/R also enforces the fixed
incoming request-header allowlist and rejects unreviewed/duplicate
headers, including fictional Proxy-Authorization, Mcp-Session-Id,
Mcp-Param-Owner, Cookie and forged owner claims before tool admission.
The allowlist is source-owned and not intended as a general MCP client.

This is **not complete MCP conformance**, a real LLM evaluation,
external MCP test, independent security audit or authorization
to scan user servers. See the [source-only modern SSE scope](
.github/M12_MODERN_MCP_SMOKE.md#m12-ghi--request-scoped-sse-response-checks)
and [Issue #246](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/246).
The added fail-closed framing controls are tracked in
[Issue #248](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/248).
Response header hardening is tracked in
[Issue #250](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/250).
Request-side header custody is tracked in
[Issue #255](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/255).

## Modern MCP x-mcp-header parameter mirror (M12-D/E/F)

In a reviewed source checkout (Node.js 20+), run:

```sh
node tools/m12-header-parameter-mirror.mjs
```

This zero-argument, source-only demonstration mirrors **four primitive
fictional tool parameters** into 2026-07-28 `Mcp-Param-*` headers on
a disposable **127.0.0.1** HTTP server. It requires exact agreement
between the JSON body and HTTP headers, including canonical Base64
handling for Unicode, padded text and Base64-sentinel-like text.
Conflicts fail with HTTP 400 and JSON-RPC `-32020` (`HeaderMismatch`).
Only verified fictional response data enters the M10 toy gateway.

The 26 fixed controls include four expected PASS and 22 expected
FAIL outcomes. This is **not complete MCP conformance**, a real AI
agent, external server test or semantic prompt-injection detector.
See the [M12 header-mirror guide](.github/M12_HEADER_MIRROR.md)
and [Issue #244](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/244).

## Modern MCP 2026-07-28 owned localhost smoke (M12-A/B/C)

In a reviewed source checkout, run the opt-in, source-only test:

```sh
node tools/m12-modern-http-smoke.mjs
```

This is a **separate first-party modern MCP Streamable HTTP subset**
test: fixed `server/discover`, `tools/list` and `tools/call` requests
use the published 2026-07-28 `_meta` envelope and mandatory
`MCP-Protocol-Version`/`Mcp-Method`/`Mcp-Name` headers. Actual HTTP
bytes flow only over an OS-selected `127.0.0.1` port. A strictly
verified fictional tool result is consumed as data by the M10
stateful toy agent, without executing its embedded instruction.

The zero-argument selftest expects **one clean PASS and 17 negative
FAIL outcomes**, including modern header/body mismatch, unsupported
version, wrong Origin, legacy `initialize`, malformed JSON, forged
tool results, redirect and timeout. **This is not complete MCP
conformance**, an actual LLM test, or authorization to contact external
servers. See the [M12 scope](.github/M12_MODERN_MCP_SMOKE.md),
[Issue #242](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/242)
and the [official MCP transport specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).

## Revoke an in-flight fictional owner capability (M11-S/T/U)

From a reviewed local source checkout (Node.js 20/22), run:

```sh
node tools/m11-inflight-revocation.mjs
```

Two source-owned fictional owners send overlapping requests to a
disposable `127.0.0.1` HTTP listener. After **both complete requests**
have been validated but **before** either reply is released, fixed
negative controls revoke A, B or both. The parent checks capability
status again **after receiving real on-wire bytes**, before the M10
stateful toy gateway can consume the data. Revoked responses are
blocked even if the original HTTP request was accepted.

The 13 fixed selftest cases require one clean PASS and 12 expected
FAIL outcomes, including revocation, forged owner authority and
replayed or malformed replies. Protected fictional effects remain
zero. This is **not real authentication**, a live LLM prompt-injection
test or authorization to access external MCP targets. See the
[M11 in-flight revocation guide](.github/M11_INFLIGHT_REVOCATION.md)
and [Issue #240](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/240).

## Cross-session replay and response-binding checks (M11-D/E/F)

Use the source-only, zero-argument test on a reviewed local checkout:

```sh
node tools/m11-replay-session.mjs
```

The first-party harness checks the accepted M11 discovery/local transport,
then runs **two distinct fictional tool requests** over a separate
disposable `127.0.0.1` listener. Each HTTP response must match its fixed
request ID, task-session marker and reviewed fictional content.
Source-owned negative controls reject replayed or swapped responses,
reused request IDs, forged authority, premature or post-completion
requests, malformed JSON, redirects and stalled replies **before
untrusted text enters the M10 toy-agent gateway**.

The CLI requires one safe PASS and 15 expected negative FAIL outcomes;
every response/session count and TCP socket close is checked. **This is
not a real AI agent**, LLM prompt-injection assessment, third-party MCP
scan or OS sandbox. See the [M11 replay guide](.github/M11_REPLAY_SESSION.md)
and [Issue #230](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/230).

## First-party localhost tool-result trust bridge (M11-A/B/C)

In a reviewed source checkout, run the fixed two-stage local demonstration:

```sh
node tools/m11-loopback-tool-result.mjs
```

The source-only test first runs the existing **discovery-only staging**
MCP mock, then starts a **separate, disposable 127.0.0.1 HTTP server**
with an MCP-shaped fictional `tools/call` reply. The reply contains
legitimate task data plus an embedded instruction; actual on-wire bytes
are strictly checked before the decoded result enters the M10 stateful
toy-agent gateway. Eleven source-authored cases require one clean PASS
and ten expected FAIL results. The original discovery server still
**rejects tools/call**, and no third-party MCP destination is contacted.

**This is not a real AI agent**, comprehensive MCP server, OS sandbox
or semantic prompt-injection detector. The toy agent does not interpret
embedded instructions; only approved fictional source files are read.
See the [M11 local-transport design](.github/M11_LOOPBACK_TOOL_RESULT.md)
and [Issue #228](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/228).

## Stateful fictional toy-agent task/result session (M10-G/H/I)

Run the source-only deterministic eight-case session test:

```sh
node tools/toy-agent-session.mjs
```

A first-party toy agent calls a separate **in-memory gateway** that records
the actual JavaScript method-call sequence: one owner task starts, one
fictional tool result is accepted as data, and the task finishes. Early,
replayed and post-completion tool results are denied. Extra unrelated
file-read requests, unauthorized tool calls and forged permission
claims are also denied. The combined selftest expects one clean PASS
and seven deliberately unsafe FAIL outcomes, all with zero protected
effects.

**This is not a real AI agent**, LLM, external MCP target or semantic
prompt-injection detector. No tool-result instructions are executed,
and the witness does not observe real OS file reads or network access.
See the [stateful session design](.github/M10_TOY_AGENT_SESSION.md)
and [Issue #226](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/226).

## Run toy-agent gateway checks over all fictional fixtures (M10-D/E/F)

From a reviewed source checkout:

```sh
node tools/toy-agent-batch.mjs
```

The source-only batch runs the **actual in-memory JavaScript method-call**
toy-agent harness in five fixed modes for every valid fictional JSON
contributor fixture (up to 16). A separate verifier confirms the safe
PASS, four expected fault-mode FAIL results, exact denied-request counters
and zero committed protected effects. The JSON summary is ordinal-only,
without scenario names, paths or tool-result text.

This is **not a real agent**, semantic prompt-injection detector or
authorization to contact third-party MCP servers. Read the
[toy-agent batch guide](.github/M10_TOY_AGENT_BATCH.md)
and [Issue #223](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/223).

## In-memory toy-agent method-call exchange (M10-A/B/C)

Run the first-party, source-only toy-agent demonstration:

```sh
node tools/toy-agent-exchange.mjs
```

Unlike M9's author-supplied symbolic event reports, this exercise makes
**real in-memory JavaScript method calls** from a small deterministic
toy agent to a separately parent-owned gateway. Four source-authored
fault modes deliberately request a fictional unrelated file read,
unauthorized tool call or forged authority. The gateway counts each
attempt, denies all protected actions, and records zero protected effects.
The five-case combined selftest passes only if all safe and expected-FAIL
outcomes match.

**This is not a real AI agent**, external MCP evaluation, semantic
prompt-injection detector, OS sandbox or security certification. Its
source-owned fault modes do not interpret or execute the contributor's
embedded instruction. See the
[full M10 trust-boundary guide](.github/M10_TOY_AGENT_EXCHANGE.md)
and [Issue #221](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/221).

## Public fictional fixture privacy guard (M9-J/K/L)

The source-only validator rejects some obvious private-looking strings in
contributed fictional JSON: URL schemes, local home paths, email addresses,
credential-like prefixes, key headers and IPv4 literals. Rejections return
constant non-echoing errors; **this is not a complete secret scanner**.
Contributors must still sanitize all details manually. See the
[fixture guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md) and
[PR checklist](.github/PULL_REQUEST_TEMPLATE.md).

## Contributor-friendly offline fictional review (M9-G/H/I)

From a reviewed source checkout with Node.js 20+, run one command:

```sh
node tools/fixture-contributor-summary.mjs
```

This source-only command combines the **M9-E fictional batch fixture preflight**
and **M9-F negative mutation matrix** into one small human-readable
summary. It verifies the four fixed policy controls and 43 deliberately
corrupted symbolic reports **per fixture**, then prints only bounded counts
and explicit limitations. It accepts no arguments, user-defined commands,
real endpoints, private paths or credentials.

This is **not a real agent** or semantic prompt-injection detector.
No actual MCP target is contacted and no unrelated file is read. A
successful synthetic review does not establish independent beta evidence,
security certification or release permission. See the
[fixture-only contributor guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md).

## Challenge synthetic policy results with negative controls (M9-F)

Run a zero-argument source-only mutation sensitivity check from a reviewed
checkout:

```sh
node tools/fictional-negative-control-matrix.mjs
```

For **every** fictional JSON contributor fixture, this checks the pristine
M9-C policy report and then applies **43 fixed negative mutations** to
authority flags, protected-effect counters, fixed deny rules, and the
four-case report inventory. Every corrupted symbolic result must be rejected.
Outputs include only safe counts and fixed rule codes.

This is **not a real agent** test, semantic prompt-injection detector,
credential validator, or permission to contact external MCP servers.
See the [M9-F mutation-matrix guide](.github/M9_NEGATIVE_MUTATION_MATRIX.md).

## Validate all fictional fixture-only PR submissions at once (M9-E)

From a reviewed source checkout, run:

```sh
node tools/fixture-batch-preflight.mjs
```

This source-only command checks **every** fictional JSON fixture under the
fixed `.github/fixture-proposals/` directory, up to 16 files. It combines
strict schema validation with the M9-C four **fixed in-memory policy probes**
per fixture and emits a privacy-safe ordinal summary. Unknown files,
symlinks, malformed content, extra arguments, and failed symbolic controls
are rejected without echoing input paths or injected instructions.

This is **not a real agent** or semantic prompt-injection detector, and
does not open a file requested by the injected text or contact an external
MCP target. See the [batch preflight guide](.github/M9_FIXTURE_BATCH_PREFLIGHT.md)
and [Issue #213](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/213).

## Generate a fictional fixture without writing scripts (M9-D)

A contributor can generate a complete synthetic fixture as **raw JSON**
without manually recreating the strict schema:

```sh
node tools/fixture-proposal-template.mjs fictional-contributor-case
```

Copy the printed JSON into a reviewed source checkout under
`.github/fixture-proposals/fictional-contributor-case.json` and edit the
fictional fields in a text editor. The generator creates no files and
runs no MCP tools. Then use the existing fixture checker and the fixed
policy bridge for local verification. This is **not a semantic test**
or a real-agent prompt-injection assessment. See the
[fixture-only contribution guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md).

## Fixture-only policy bridge (M9-C)

A contributor can add an inert JSON test case under
`.github/fixture-proposals/` without changing runner source. From a
reviewed source checkout, validate and run its fixed in-memory gate
checks:

```sh
node tools/fixture-policy-bridge.mjs .github/fixture-proposals/mixed-tool-result-file-read.json
```

CI discovers all fixture proposal files automatically. The source-only
bridge validates the file and runs four **source-authored synthetic**
policy controls: task data permitted as data, unrelated file read denied,
unauthorized tool call denied, and spoofed authority denied. It never
executes or interprets the submitted instruction.

**This is not a semantic test** and not a real agent prompt-injection
detector. `PASS` only asserts fixture shape and fixed in-memory policy
behavior, not a model's response to the submitted attack text. See the
[M9-C safety contract](.github/M9_FIXTURE_POLICY_BRIDGE.md).

## First-party in-memory action gate (M9-B)

Run the new source-only, zero-argument selftest in a reviewed checkout:

```sh
node tools/in-memory-injection-gate.mjs
```

This first-party fictional gate models consumption of legitimate task data
while denying unrelated file-read requests, unapproved tool calls and
claims of extra authority embedded in lower-trust tool results. Its private
**in-memory witness** records 2 permitted data operations, 3 denials and
zero committed protected effects in the fixed demonstration.

This is **not a real agent** and does not test actual filesystem effects,
real MCP servers, credentials or real-world prompt-injection resilience.
The input is only source-owned symbolic action/resource enums, never
executable tool-response content. See the
[in-memory gate design](.github/M9_IN_MEMORY_ACTION_GATE.md) and
[Issue #206](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/206).

## First-party symbolic prompt-injection controls (M9-A)

In a reviewed source checkout with Node.js 20+, run:

```sh
node tools/symbolic-injection-evaluator.mjs
```

This source-only selftest checks four fixed **fictional, symbolic** tool-result
outcomes: clean task data, rejected injected text, an unauthorized unrelated
file-read *request*, and an unauthorized tool-call *request*. The latter two
are expected negative controls; the selftest succeeds only when they are
identified as symbolic failures.

This is **not a real AI agent**, not an MCP prompt-injection detector, and
not an independent security assessment. It reads only one reviewed fictional
fixture and does **not** follow an embedded instruction, read unrelated
files, execute tools, contact real MCP servers or certify safety. Its
reports distinguish author-supplied symbolic events from authenticated
real-agent observations, which remain unavailable. See the
[trust-boundary RFC](.github/M9_SYMBOLIC_INJECTION_RFC.md) and
[design Issue #204](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/204).

## Contribute a fictional tool-result injection case (M8-S/T/U)

**Fixture-only contributions are welcome**, independently of runner changes.
A synthetic tool result can mix legitimate task data and an instruction to
read an unrelated file. Propose a JSON file under
`.github/fixture-proposals/` following the [fixture-only guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md);
check it using `node tools/fixture-proposal-check.mjs <local-proposal-file>`.
New fixture files are automatically schema-checked in CI on both supported
operating systems.

This is **shape validation only**, not an AI-agent execution, prompt-injection
detector, security audit or authorization for live MCP traffic. Do not submit
real paths, endpoints, credentials, logs or proprietary content.

## Human-readable fictional first run (M8-P/Q/R)

From a reviewed source checkout with Node.js 20+, run:

```sh
node tools/adapter-first-run-view.mjs
```

This opt-in, **fictional** terminal guide explains the fixed in-memory `stdio` and `streamable-http` checks. It accepts no arguments, does not read project descriptors or contact any real MCP target. A local PASS is **not a security audit** or release authorization. For structured JSON instead, run `node tools/adapter-first-run.mjs`. Both helpers are source-only and excluded from the npm package. See the [first-run guide](.github/M8_FIRST_RUN_GUIDE.md).

## Copying a fictional adapter template correctly (M8-G/H/I)

Run `node src/cli.mjs adapter-template stdio` (or
`streamable-http`) to receive a JSON-v1 **report**. For your local
descriptor file, copy **only the nested `template` object**, not
the entire report wrapper; then check it with
`node src/cli.mjs adapter-check <local-descriptor-file>`.
The new `readerGuide` explains this distinction in every successful
template report. Neither check runs the fictional command or contacts
the described endpoint. Replace fictional values only in a disposable
offline descriptor, and never paste credentials.

## Offline descriptor troubleshooting (M8-D/E/F)

The existing `adapter-check` and `adapter-onboard` JSON-v1 reports now
include a fixed `readerGuide` on both successful validation and rejected
input. For a local inert example, try:

```sh
node src/cli.mjs adapter-check examples/adapter-profiles/stdio-project.json
```

On errors, the guide suggests comparing the strict schema with bundled
examples and checking the `validate-only` policy (all execution/network/
credential flags must be false). The same static checklist applies to
unreadable, malformed, unauthorized or otherwise invalid input: it does
**not** reveal the user's file contents, path, offending field, token or
endpoint. This is not live MCP interoperability or a security audit.

## Fast offline adapter smoke (M8-A/B/C)

From a reviewed public **source checkout** with Node.js 20+, run:

```sh
node tools/adapter-smoke.mjs
```

This zero-argument script runs the existing fixed fictional adapter-kit
verification and descriptor quickstart for **both** `stdio` and
`streamable-http` in memory. It does not create configuration files,
start user processes, contact endpoints, ask for tokens, or check your
project. It is excluded from the npm package. `PASS` reports only the
two bundled fictional controls matching; real interoperability and
independent security review remain unverified.

## Start here: built-in fictional adapter guide (M7-A/B/C)

For an ordered, **non-executing** first-run plan, run:

```sh
node src/cli.mjs adapter-guide
```

This returns a JSON-v1 report with four fixed steps: choose a `stdio` or
`streamable-http` fictional kit, export it to a local file, verify that
exported kit, and optionally review the inert descriptor with
`adapter-quickstart`. The commands are static examples, not instructions
to execute user-supplied binaries, connect endpoints or scan MCP servers.
The guide accepts **no input path, endpoint, configuration, or flags**.
Its `limits` explicitly state that external target contact, ownership
verification, independent beta/audit evidence and stable release
authorization have **not** occurred. It requires Node.js 20+ and no
runtime dependencies. See [Getting Started](docs/GETTING_STARTED.md).

## Offline beta batch triage (M21, source only)

For maintainers reviewing **two to four** voluntarily supplied, already
sanitized **fictional** beta self-reports, an optional command can categorize
them without echoing data or treating self-attestation as verification:

```sh
node tools/m21-beta-batch.mjs < sanitized-fictional-batch.json
```

It accepts a bounded (16 KiB), strict UTF-8 JSON array of complete
[M20](.github/M20_BETA_INTAKE_PREFLIGHT.md) report records. It counts
claimed outcomes and OS/Node combinations, flags identical categorical
report *patterns* and rejects inconsistent or unsafe records. **Identical
records do not prove the same person, and different records do not prove
different people.** `independentTestersVerified` remains **0**, and
`independentBetaVerified` remains **false** in every outcome. No network,
real agent, credentials, uploads, arbitrary files or Stable Bridge.
See [M21 guide](.github/M21_BETA_BATCH_TRIAGE.md). Source-only, outside
the unpublished 80-file npm candidate.

## Privacy-minimal volunteer beta report preflight (M20, source only)

An independent, consenting beta tester can optionally check a **categorical,
self-reported** fictional result *before* manually submitting it for
review. From a reviewed public source checkout:

```sh
node tools/m20-beta-intake.mjs < public-fictional-beta-report.json
```

This reads only a **bounded 4096-byte UTF-8 JSON record from stdin**, not a
user-selected filename. It rejects private text fields, extra properties,
bad source/version/OS/Node format, inconsistent PASS/FAIL/ERROR counts and
contradictory claimed exercises. It never echoes input, contacts external
services, posts GitHub issues, calls an MCP server or uses Stable Bridge.

A valid `PASS` result means **READY FOR MANUAL TRIAGE**, not that a
tester is independently verified or that beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) is
accepted. An unpinned public SHA or failed consistency check is reported
without automatic approval; real provenance and volunteer ownership
require separate human verification. See the
[M20 beta intake format and example](.github/M20_BETA_INTAKE_PREFLIGHT.md).
This utility is excluded from the unpublished 80-file npm candidate.

## One-command first-party assessment (M19, source only)

To reproduce all **five** bounded first-party security evaluations from a
reviewed source checkout, run:

```sh
node tools/m19-assessment-summary.mjs
```

The report separately records **23 first-party localhost-wire test cases**
(M15, M16, M17) and **32 source-authored symbolic cases** (M18).
An independent fixed-source gate checks actual cases, classifications,
negative controls, provenance and false security claims — a nested
`PASS` alone cannot certify the aggregate. **55 source-owned test
cases are not 55 real attacks, real-world accuracy or independent beta.**
The helper accepts no arguments or network target; it uses only
first-party ephemeral loopback mocks and a fixed checked-in fictional
fixture. No external MCP, real LLM, credentials, data collection or
Stable Bridge. See [M19 guide](.github/M19_ASSESSMENT_SUMMARY.md).
The unpublished 80-file npm candidate is unchanged.

## Contributed finite-action security fixtures (M22, source only)

A contributor can add a reviewed **enum-only JSON file** to the fixed
`.github/m22-scenarios/` directory, without changing runner code. In a
first-party source checkout, run:

```sh
node tools/m22-finite-scenario-runner.mjs
```

The eight sample cases exercise legitimate owner/untrusted task data,
unrelated resource requests, unauthorized extra tools, spoofed
tool-result authority and operation/resource mismatch. The runner
enforces **5–12 source-owned files**, at most **1,024 bytes each**,
strict duplicate-key UTF-8 JSON, exact filenames and enum-only fields.
It compares M9-B's actual **in-memory guarded policy** to a separate
source-authored oracle and a **deliberately permissive** toy. Wrong
contributor expectations fail, malformed records are rejected, and an
additional reviewed valid file is automatically included.

A passing `8/8` means **fictional policy decisions and protected
effect counters matched**. It is not an assessment of arbitrary
natural-language prompt injections, real MCP servers, LLMs or
user-contributed executable code. The runner reads only approved JSON fixtures, and tests create disposable
local copies; it never reads a protected unrelated file or contacts a
network target, credential service, external tool or Stable Bridge.
See [strict contribution guide](.github/M22_FINITE_SCENARIO_CONTRIBUTIONS.md).
The tool and scenario files are source-only and excluded from the
unpublished 80-path npm candidate.

## Community-requested rug-pull, multi-server and error-leak cases (M23)

From a **reviewed source checkout**, run this fixed source-only
demonstration:

```sh
node tools/m23-community-attack-families.mjs
```

Ten **first-party deterministic toy** cases compare intentionally
vulnerable and guarded policies for tool-description changes after
registration, cross-server resource ownership, and error responses
echoing fabricated environment-, path- and header-like markers.
A matching `10/10 PASS` means the deliberately unsafe effects/leaks
were **observed in the toy** and guarded controls matched, **not**
that real servers or AI agents are secure.

No real environment variables, filesystem content, HTTP headers,
user targets, network access, model execution, credentials, telemetry
or Stable Bridge. This is **not** an M8 contributor JSON schema:
those fixtures specifically represent untrusted tool-result text.
See the [M23 scope guide](.github/M23_COMMUNITY_ATTACK_FAMILIES.md)
and [M22's separate enum-only contributor fixture runner](.github/M22_FINITE_SCENARIO_CONTRIBUTIONS.md).
The helper remains outside the unpublished 80-path npm candidate.

## Private stdin-only adapter preflight (M24, source only)

Want to check an adapter descriptor **without creating another file or
contacting your MCP server**? Pipe a reviewed local JSON descriptor into:

```powershell
Get-Content -Raw -Encoding utf8 .\descriptor.json | node tools/m24-stdin-adapter-preflight.mjs
```

Linux/macOS: `cat ./descriptor.json | node tools/m24-stdin-adapter-preflight.mjs`.

The helper accepts one **bounded 4 KiB strict JSON document** from stdin,
no arguments, and runs the existing offline descriptor validator plus
**five unrelated fixed fictional safety controls**. It does not spawn the
specified `stdio` command, resolve/connect to a supplied HTTPS endpoint,
read filesystem resources itself, or handle credentials. It emits only
source-owned categorical status and `NOT_ATTEMPTED` / `REAL_TARGET_NOT_AUTHORIZED`,
**never user paths, endpoints, commands, arguments or project names**.
An accepted descriptor is not proof that the server or agent is safe.

See [M24 guide](.github/M24_STDIN_ADAPTER_PREFLIGHT.md) and the inert
`node src/cli.mjs adapter-template stdio` /
`node src/cli.mjs adapter-template streamable-http` examples.
This source-only helper is outside the unpublished 80-file npm candidate.

## Symbolic classification benchmark (M18, source only)

From a reviewed first-party source checkout run:

```sh
node tools/m18-symbolic-evaluation.mjs
```

This **offline** author-controlled benchmark tests **32** combinations of
fictional trace profiles and symbolic event sets against the existing M9
evaluator. A separately written oracle distinguishes **28 attack-labelled,
2 benign and 2 insufficient-evidence** cases. It reports TP/FP/FN/TN,
precision/recall/FPR/FNR and abstentions, and exposes deliberately
ineffective `alwaysClear`, `alwaysAlert` and `FAIL-is-attack`
reference baselines. Passing `32/32` confirms only that this
**source-authored symbolic classifier** matches its reference rules;
it **does not establish accuracy on real prompt injections, agent outputs
or user servers**, nor justify claiming 100% real-world detection.
No external network, credentials, real agent, filesystem scan,
Stable Bridge or user-supplied arguments. See the
[M18 evaluation guide](.github/M18_SYMBOLIC_EVALUATION_BENCHMARK.md).
This command is source-only and excluded from the unpublished npm candidate.

## Real disposable gate process crash/relaunch (M25-D, source only)

From a reviewed first-party source checkout:

```sh
node tools/m25d-os-crash-relaunch.mjs
```

This complements M25's **logical** gate-generation invalidation with
an **actual** process-level failure: a first-party child accepts a fictional
request but deliberately holds it before executing, the parent forcibly kills
that exact child, and a new child is launched with a new generation. The
old pending HTTP request must abort. A guarded replacement denies the
stale approval (HTTP 410), then accepts a fresh approval (200). A separately
**intentionally unsafe** replacement demonstrates the bad behavior by
accepting the stale approval.

`3/3 PASS` means this differential was **observed**, not that the
vulnerable toy or real production gates are safe. The command only launches
its own fixed test worker, uses ephemeral `127.0.0.1` sockets and
in-memory fictional effects, and never touches Stable Bridge, real
user credentials, unrelated files or external MCP servers. It does **not**
establish crash-safe persistence or independent security certification.
[Process-level scope and evidence](.github/M25D_OS_PROCESS_RESTART.md).
The tools are source-only and excluded from the unpublished npm package.

## Community-requested approval policy drift and gate restart (M25, source only)

From a reviewed first-party source checkout run:

```sh
node tools/m25-policy-epoch-restart.mjs
```

A fixed **local** MCP-shaped HTTP experiment tests two practical
authorization gaps raised by **TheAsymmetricMind**: approve a request,
then change policy before it executes; or logically restart the gate
while approval is still pending. The guarded toy binds an approval to
the exact **policy version and gate generation**, rechecks them before
the simulated effect, and kills pending approvals on generation
replacement. A deliberately unsafe toy incorrectly executes the
stale request. Fresh approval after either change must still work.

Five cases, 10 disposable `127.0.0.1` servers, 14 fixed requests.
`5/5 PASS` means the synthetic unsafe behavior was **observed** and
the guarded controls matched, not that real MCP servers or agents have
been certified. **Restart here is a logical in-memory generation
replacement, not a crashed and relaunched OS process.**
No arbitrary endpoints, credentials, real files, subprocesses, external
MCP servers or Stable Bridge. See the
[M25 test guide](.github/M25_APPROVAL_POLICY_EPOCH.md).
The helper is source-only, outside the unpublished npm package.

## Concurrent first-party replay race (M17, source only)

From a **reviewed source checkout**, run:

```sh
node tools/m17-concurrent-replay-lab.mjs
```

This optional, fixed test checks what **serial replay tests cannot**:
two genuinely overlapping MCP-shaped `tools/call` requests with the same
fictional operation key. Three independent ephemeral `127.0.0.1` mock
servers deliberately synchronize both requests before replying. The
unsafe *check-then-commit* mock witnesses **two** in-memory protected
effects; atomic pre-effect reservation permits **one**, denying the duplicate
with HTTP 409; a different-key positive control allows both.

`3/3 PASS` means the unsafe race was **actually detected**, both guarded
controls matched and response/socket cleanup was observed. It does **not**
mean the intentionally vulnerable mock, real LLMs or customer MCP servers
are secure. The command accepts no targets, secrets or arguments and does
not access real files, external services or Stable Bridge.
See [M17 guide](.github/M17_CONCURRENT_REPLAY_RACE.md).
This source helper is outside the unpublished 80-file npm candidate.

## Additional owned permission-grant differential lab (M16-E/F/G, source only)

In a reviewed first-party source checkout, run:

```sh
node tools/m16-permission-replay-lab.mjs
```

Nine independent synthetic cases compare a source-owned **guarded** grant to a
deliberately permissive policy over 18 ephemeral IPv4 `127.0.0.1` servers
(20 fixed HTTP requests). In addition to valid one-time use and replay,
the checks deliberately exercise wrong project/tool/resource, expiry,
revocation, forged token and forged approval. A guarded failure must deny
the action **without an in-memory effect**; a deliberately permissive
counterpart must expose it. `9/9 PASS` means this differential was
observed, **not that the permissive policy is safe**. No real bearer token,
agent, external MCP target, user code, real files, telemetry or Stable Bridge.
See [M16 extension guide](.github/M16_PERMISSION_REPLAY_LAB.md). The helper
is source-only and excluded from the unpublished npm candidate.

## Additional owned attack-family matrix (M16, source only)

Run `node tools/owned-attack-matrix.mjs` from a **reviewed source checkout**
to reproduce three distinct *intentionally unsafe* MCP-shaped behaviors:
a forged owner claim inside untrusted tool-result data, a replayed
fictional ledger operation, and a wrong-ID JSON-RPC reply. A second guarded
case for each attack proves the matching server/client boundary. An
additional **distinct-key positive control** verifies the guarded replay
server admits a new operation instead of blindly rejecting request #2.
Seven ephemeral `127.0.0.1` servers exchange fixed requests with a
deterministic toy client. `7/7 PASS` means all three *synthetic* unsafe
effects, three protected variants and the fresh-key allowance were witnessed;
it is **not** real-agent or external-server security evidence. No real
file access, user target, model, credentials or Stable Bridge. Source-only,
not part of the unpublished npm candidate. See
[attack matrix guide](.github/M16_OWNED_ATTACK_MATRIX.md).

## Intentionally vulnerable MCP-shaped red-team lab (M15, source only)

In a **reviewed first-party source checkout**, try the fixed differential
experiment:

```sh
node tools/owned-redteam-lab.mjs
```

Four ephemeral `127.0.0.1` servers reproduce a fictional ticket response
containing lower-trust text. A deliberately susceptible **deterministic toy
client** makes an unauthorized second tool call; a deliberately permissive
mock **accepts it** and records one synthetic protected in-memory effect.
Separate server-guarded and client-guarded runs block the same effect.
Expected `4/4 PASS` means **the intentional synthetic vulnerability was
actually witnessed and the fixed defenses worked**, not that the vulnerable
client or real models are safe. No real files, models, remote MCP server,
credentials, telemetry or Stable Bridge are used. This helper is source-only,
not part of the unpublished npm package or the independent five-case beta
protocol. See [lab guide](.github/M15_OWNED_REDTEAM_LAB.md).

## Optional first-party capability tour (M14-A/B/C)

In an **M14 or later reviewed public source checkout** (not the older
M13-pinned baseline), run:

```sh
node tools/beta-capability-tour.mjs
```

This opt-in, source-only command checks two inert adapter profiles, a
fictional tool-result action policy, and two disposable **127.0.0.1**
modern SSE exchanges: one approved response and one intentionally denied
Authorization-header request. The four controls must all **MATCH**;
expected synthetic DENY is a successful rejection, not live-target safety.
Only fixed identifiers/counts/booleans are printed. No external MCP server,
real model, user code, credentials or user-supplied URL is accessed.

**This is supplementary**: it neither replaces the existing five-case
independent beta protocol nor counts as a genuine participant report.
The helper is excluded from the unpublished npm candidate. See the
[beta testing guide](docs/BETA_TESTING.md#m14--optional-capability-tour).

## Voluntary independent-beta instructions (M7-S/T/U)

A short [volunteer handoff](.github/BETA_VOLUNTEER_HANDOFF.md)
explains how an independent developer can opt in, use a **pinned, previously
4/4-CI-verified public commit** (rather than guessing which revision to test),
run the clean-source `beta-review` command, manually verify the public commit
and send only sanitized fictional feedback. A public opt-in volunteer invitation is now published in [Issue #195](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/195); no independent participant or real MCP security assessment is claimed.
Acceptance [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
remains open.

## One-command local fictional beta review (M7-P/Q/R)

From a **clean public source checkout**, run
`node tools/beta-review.mjs`. This read-only source helper combines a
local Git SHA/dirty-state receipt with five existing fictional acceptance
checks, and prints an optional Markdown feedback draft. It fails closed if
the checkout has reported changes, and accepts no target or argument.
It does **not** validate public Git provenance, real MCP targets, or an
independent reviewer. See [beta testing](docs/BETA_TESTING.md).

## Check the local beta checkout before reporting (M7-M/N/O)

In a source checkout (Git available), run
`node tools/beta-checkout-receipt.mjs` to obtain a local full Git SHA
and a clean/changed status without printing file paths. It reports only
**local metadata**, not trusted source provenance. Compare its SHA
manually to the reviewed public commit before running
`node tools/beta-feedback-card.mjs`. The helper never scans MCP
targets or submits a beta report. See [beta protocol](docs/BETA_TESTING.md).

## Optional fictional beta feedback card (M7-J/K/L)

To run the five fixed offline beta controls and create a minimal Markdown
draft for a future consenting independent reviewer, use a public source
checkout and run `node tools/beta-feedback-card.mjs`. The result contains
only symbolic fixed-case outcomes and placeholders for **manually verified**
public commit SHA, OS, Node version and sanitized usability feedback. No
external MCP target is contacted, no issue is submitted automatically, and
no independent reviewer has yet been verified. See
[beta handoff instructions](docs/BETA_TESTING.md#m7-jkl--optional-local-beta-feedback-card).

## One-command offline project quickstart (M6-A)

Run `node src/cli.mjs adapter-quickstart
examples/adapter-profiles/streamable-http-project.json` to validate only
the **local inert descriptor shape** and execute five fixed fictional
security-contract controls. The report includes ordered symbolic results,
static interpretation and next steps. A negative-control
`fictionalObservedStatus:FAIL` may correctly correspond to
`controlStatus:PASS`. **A PASS is not a real project security audit**;
no MCP server, hostname, user code or credentials are contacted or run.
[Instructions and output limits](docs/GETTING_STARTED.md#m6-a--first-run-project-quickstart-inert-descriptor-only).

## Guided offline adopter kit (M6-B)

For a reproducible fictional starter configuration plus two exact symbolic
CI expectations, run `node src/cli.mjs adapter-kit stdio` or choose
`streamable-http`. The command emits **JSON only**: a descriptor template,
clean/expected-violation examples, a fixed plan and a plain-language summary.
It does not write files, launch project processes, contact servers, or
authorize a real-target assessment. Follow the [three-file setup and CI
walkthrough](docs/GETTING_STARTED.md#m6-b--guided-fictional-adopter-kit-one-selector-no-server-contact).

## One-command exported kit CI check (M6-C)

After exporting `node src/cli.mjs adapter-kit stdio > fictional-kit.json`,
run `node src/cli.mjs adapter-kit-verify fictional-kit.json` to
verify its exact **source-owned fictional** JSON structure and the
three built-in offline CI checks with a single exit-code gate. Invalid
or modified files are rejected without raw input echo; an expected
invented violation retains `observedSafetyStatus:FAIL` even when
`expectationStatus:MATCH`. It never connects to your MCP server,
establishes independent provenance or certifies your project.
[Portable Windows/Linux workflow and limits](docs/GETTING_STARTED.md#m6-c--verify-a-fictional-exported-starter-kit-with-one-ci-command).

## Copy-only GitHub Actions example for fictional CI (M6-D)

The [inactive portable adopter workflow](.github/examples/fictional-adopter-ci.yml)
can be inspected and copied into a separate repo. It pins the public
test-suite source to a full commit SHA and runs local
`adapter-kit`, `adapter-kit-verify` and
`adapter-trace-expect` checks on Ubuntu/Windows Node 20/22
without an npm registry install. GitHub public source/toolchain
fetches may require network; **no user MCP target is contacted**.
[Safety limits and optional fabricated assertions](docs/GETTING_STARTED.md#m6-d--portable-copy-only-github-actions-recipe-fictional-controls).
A green job is **not a security audit or independent beta evidence**.

## Reading fictional CI results (M6-E)

The offline `adapter-kit`, `adapter-quickstart`,
`adapter-kit-verify` and `adapter-trace-expect` commands now return
a source-authored `readerGuide` with a plain-language result and
specific next steps alongside the unchanged JSON-v1/exit-code contract.
An **expected fabricated violation** still has
`observedSafetyStatus:FAIL` when `expectationStatus:MATCH` and
the CI job exits 0; a true expectation mismatch exits 1, malformed
input exits 2. The guide is strictly fictional-only and does not
establish any MCP server's real security or provenance.
[Results and boundaries](docs/GETTING_STARTED.md#m6-e--readable-explanations-alongside-existing-json-reports).

## Opt-in human terminal view for fictional checks (M6-F)

`node src/cli.mjs adapter-report-view fictional-clean.json` prints a
**terminal-only**, static explanation of a validated local *fictional
symbolic expectation*. See the [runnable M6-F walkthrough](docs/GETTING_STARTED.md#m6-f--opt-in-terminal-only-view-of-fictional-symbolic-expectations)
to generate both `stdio`/`streamable-http` examples and see
clean MATCH/observed PASS, expected violation MATCH/observed **FAIL**,
unexpected MISMATCH (exit 1), and invalid data (exit 2). This opt-in
command **recomputes** the result from strict enum/Boolean inputs; it
rejects arbitrary saved reports and never prints paths, customer logs,
tokens, credentials or ANSI escapes. Existing JSON-v1 CLI/CI output and
exit codes are unchanged. No real project, operator or target was verified.

## Fictional trace event admission hardening (M6-M)

The direct `auditRecords` API now rejects sparse arrays that would
otherwise skip unaudited entries during `forEach`, and refuses inherited
authorization fields or getter properties in synthetic event objects.
Valid JSONL trace inputs and JSON-v1 CLI success/failure meanings remain
unchanged. A local `PASS` is only a verdict about fabricated events, not
an independent audit or authorization to connect to any real MCP server.
These checks are **not** a sandbox for caller-supplied malicious JS Proxies.

## Offline policy API input safety (M6-L)

The direct JavaScript offline note-policy validator in `src/policy.mjs`
now refuses authorization-shaped objects with inherited fields, getter
properties or sparse/action accessor arrays. Its accepted structures
must be ordinary own-data records and dense arrays, preserving the
same first-party fictional scenario results and public CLI JSON shape.
This is an API-level input consistency check only, **not** isolation
from executable user-supplied JavaScript Proxies, real MCP server
execution, a credential or authorization authority.

## Strict fictional JSON inputs (M6-K)

All CLI JSON-v1 fictional-input commands share `src/strict-json.mjs`.
The bounded parser rejects duplicate object keys, excessively deep
nesting, and numeric values that would be silently converted by JavaScript
to infinite values, zero via nonzero underflow, or unsafe rounded integers.
Invalid files return exit code **2** with a static error report, without
echoing private input or path. This does not certify a live MCP
implementation, parse arbitrary customer data, or authorize external
network/process access.

## Offline independent-assessor handoff preparation (M6-J)

The optional nonpackaged `node tools/reviewer-handoff.mjs snapshot`
creates a **local-first handoff packet** combining the shipped 80-file
source inventory, disposable npm archive and installed-byte hashes, and
hashes of security-relevant code excluded from the npm package under
`.github/`, `test/`, and `tools/`. Save its JSON in a trusted local file,
then check it using `node tools/reviewer-handoff.mjs verify
<local-packet.json>`. It does **not** verify a separately trusted Git
revision, sign any artifact, engage a qualified independent reviewer,
contact real MCP targets, or grant stable-release permission. All genuine
external gates are deliberately `NOT_VERIFIED`. Consult the
[R5 review handoff](docs/R5_INDEPENDENT_REVIEW.md) and obtain
independent assessor evidence before claiming a release gate is satisfied.

## Offline actual archive review (M6-I)

The optional **nonpackaged** `tools/reviewer-archive.mjs` can produce
a temporary first-party tarball custody receipt with
`node tools/reviewer-archive.mjs snapshot`. Save its JSON in your
own disposable directory, then use `node tools/reviewer-archive.mjs verify
<local-receipt.json>` to rebuild and compare. The script uses offline
npm, disables all lifecycle hooks, checks exact installed bytes against
the 80-file manifest and source, and deletes temporary artifacts. This is
**not** an independently trusted artifact digest, a signed release,
an independent security review, or authorization for any real MCP target.
See [R5 reviewer handoff](docs/R5_INDEPENDENT_REVIEW.md).

## Local independent-review preparation (M6-H)

For a *preliminary*, nonauthorizing byte inventory on an already obtained
public source checkout, use `node tools/reviewer-receipt.mjs snapshot`
and `node tools/reviewer-receipt.mjs verify <local-receipt.json>`.
This optional `tools/` script is **not** in the npm package. It compares
the fixed package-file list with an offline npm dry-run and checks reviewed
source file bytes, but does not itself verify Git provenance or real archive
bytes, sign anything, contact user MCP servers or complete an independent
security audit. See [assessor handoff](docs/R5_INDEPENDENT_REVIEW.md#m6-h--deterministic-local-source-byte-receipt-engineering-preview).

## Public CLI compatibility guard (M6-G)

A dedicated **test-only** regression suite pins literal expected fields for
the existing machine-readable JSON-v1 offline commands, clean and deliberately
broken fictional CI assertions, plus the separately opt-in M6-F terminal
view. It checks the installed local npm tarball from an unrelated fictional
workspace and rejects input/authority spoofing. Run the full local test set
with `node --test`. These are compatibility checks for selected public
contract invariants, not a promise that every JSON detail is frozen or that
real MCP security, protocol conformance or independent review has occurred.
[Contract limits](docs/CLI_REPORTS.md#m6-g-public-v1-compatibility-regression-guard).

## Quickstart

For an independent **fictional-only** beta evaluation, see the [fixed public SHA, offline archive and safe feedback checklist](docs/BETA_TESTING.md#independent-evaluator-quick-path-m5-07-no-live-targets). This is only evaluation guidance; there is no independently verified beta participant yet. Real MCP servers, npm publication and security certification remain outside scope.

Start from a clean clone using [Getting Started](docs/GETTING_STARTED.md). It gives one reproducible PASS, one intentionally detected FAIL and a [SHA-pinned offline CI example](examples/offline-contract-check.yml); no paid API or npm installation.

```sh
node src/cli.mjs --help
node src/cli.mjs --version
node src/cli.mjs demo
node examples/offline-ci-check.mjs
```

`--help` lists only the bundled offline synthetic commands; `--version` reports the package's locally installed candidate version (not registry publication). Both use JSON schema v1 and reject extra arguments.

The new `demo` mode runs two **bundled fictional fixtures**, validates both an expected PASS and an intentionally detected FAIL, and returns one machine-readable JSON report without requiring any fixture path. It is **not** an MCP server scan or a security assessment of the host.

**M5-02 remediation preview:** FAIL reports also provide bounded, fixed-text `guidance` for three representative synthetic rule codes, with approved next steps and bundled offline reproduction commands. Generic usage/input errors have fixed guidance too. Unrecognized rules are never interpolated into advice; existing native result fields are **not** a DLP filter. See [CLI guidance contract](docs/CLI_REPORTS.md).

**M4-B5 next-stage architecture (not activated):** a [reviewable future target-approval decision packet](docs/M4_B5_TARGET_APPROVAL.md) defines independent ownership verification, operator consent, exact-method scope and SSRF/TLS/egress gates. It adds offline denial regressions, not remote connectivity; live MCP targets remain prohibited without a separate owner-approved implementation.

## First-party modern MCP staging selftest (M4-B6-A, local-only)

```sh
node src/cli.mjs staging-selftest
```

One temporary **127.0.0.1-only** staging MCP server and one fixed `server/discover` exchange using **MCP 2026-07-28** request metadata and mirrored HTTP headers, with JSON/SSE regression variants. [Safety boundaries and tests](docs/FIRST_PARTY_STAGING_MCP.md). No user server is contacted; no arbitrary URL, stdio program, credential, OAuth or remote deployment is supported.

## Fixed subprocess staging selftest (M4-B6-B; owned local process only)

```sh
node src/cli.mjs staging-process-selftest
```

Executes only the reviewed first-party 127.0.0.1 discovery staging fixture in a **disposable Node child process** with a reduced environment, ignored stdout/stderr and bounded IPC. No arbitrary executable, external destination or credential. Child-process separation **is not** an OS sandbox. See [worker safety guide](docs/FIRST_PARTY_STAGING_WORKER.md).

## Test-only staging resource witness (M4-B6-C)

[M4-B6-C resource verification](docs/STAGING_RESOURCE_WITNESS.md) independently probes whether our **own child** holds its temporary `127.0.0.1` TCP port and whether it can be rebound after worker exit, including failures. No public listener/target option, no external network or OS sandbox claim.

## Modern MCP discovery negative controls (M4-B6-D)

[The pinned first-party protocol-negative matrix](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md) checks exact HTTP/JSON-RPC status distinctions for header mismatch (`-32020`), unsupported version (`-32022`), method-not-found (`-32601`), and malformed SSE. This only tests our own temporary localhost fixture; it is not general MCP conformance or a real-target scanner.

## Bounded request-scoped SSE on owned staging (M4-B6-E)

[The finite SSE test scope](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md) admits the first-party server's reviewed request-related logging notice and SSE keepalive comments **before** the single final response, within strict finite limits. Unsolicited server RPCs, duplicate/missing finals, malformed UTF-8, excess events and unsupported payloads fail closed. **No generic MCP transport client or external target contact.**

## Bounded incremental first-party SSE cancellation (M4-B6-F)

[Transport and cleanup limits](docs/M4_B6D_DISCOVERY_NEGATIVE_CONTROLS.md) now cover finite incremental SSE decoding, split CRLF across chunks, cancel-after-headers/notice/final and oversized chunked streams. The ephemeral owned `127.0.0.1` response must close even on rejected or aborted tests. This remains a **test-only fixed first-party mock**, not generic MCP interoperability, real target scanning or an OS sandbox.

## Reviewable project profile templates (M4-B7-C)

`node src/cli.mjs adapter-template stdio` and `node src/cli.mjs adapter-template streamable-http` print **literal fictional JSON descriptor templates** nested under `template`. Copy only that object to your own local JSON file, then run `adapter-onboard <file>` to validate its shape without any networking or execution. All permissions in each emitted template are false; its fictional `node` command and `https://mcp.example.org/mcp` URL **are never run or contacted**. This is not a target-ownership or production readiness signal. [Instructions](docs/GETTING_STARTED.md).

## Offline onboarding preview (M4-B7-B)

`node src/cli.mjs adapter-onboard examples/adapter-profiles/streamable-http-project.json` validates one descriptor and reports **no real connection or verified operator**. A separate `node src/cli.mjs adapter-onboarding-demo` combines an **in-code fictional descriptor** with a fixed first-party localhost staging check; it does **not** connect a user project. Both reports keep descriptor evidence, owned-mock evidence and unverified real-target authority clearly distinct. See the [onboarding instructions](docs/GETTING_STARTED.md).

## Owned-only adapter staging bridge (M4-B7-A)

`node src/cli.mjs adapter-staging-selftest` tests the separate **fixed** modern Streamable HTTP adapter lifecycle against our own ephemeral `127.0.0.1` discovery fixture only. It uses no project descriptor, arbitrary URL or command. This is **not** project connectivity: `adapter-check <file>` remains validate-only, `connectionStatus: "NOT_ATTEMPTED"`, and cannot be used to enable this bridge. [Boundary and limitations](docs/UNIVERSAL_ADAPTER.md).

## Universal MCP project adapter (M4-B0: safe offline configuration preview)

Users can describe their own MCP projects using a [portable project descriptor](docs/UNIVERSAL_ADAPTER.md), choosing `stdio` or `streamable-http` without product-specific code:

```sh
node src/cli.mjs adapter-check examples/adapter-profiles/stdio-project.json
node src/cli.mjs adapter-check examples/adapter-profiles/streamable-http-project.json
```

These commands **validate configuration only** and return `connectionStatus: "NOT_ATTEMPTED"` and `executionEnabled: false`. [M4-B0 #61](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/61) is accepted; [M4-B1 #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63) tracks the next first-party local transport-driver stage. They do not connect to the user's server, execute the configured subprocess, perform DNS resolution or prove target ownership. Actual opt-in connections require a separately reviewed and authorized transport implementation. No external MCP contact has been approved.

## Offline adapter consent-policy preview (M4-B2 — engineering accepted)

[M4-B2 PR #68](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/68) and [main CI #39972783779](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39972783779) passed **4/4, 417/417 tests per job**, 0 failures/skips. The policy remains an **unverified self-assertion**, not a trusted user authorization.

```sh
node src/cli.mjs adapter-policy-check examples/adapter-profiles/consent-expired.json
```

This example **intentionally FAILS** (expired, fictional claim), and the output never grants execution: `authorizationStatus: "UNVERIFIED_SELF_ASSERTION"`, `connectionStatus: "NOT_ATTEMPTED"`, `executionEnabled: false`. The [policy guide](docs/ADAPTER_CONSENT_POLICY.md) explains exact descriptor fingerprints, five-minute consistency windows, strict method denials and why a self-asserted JSON claim **cannot** verify operator ownership or authorize a real MCP connection.

## First-party local driver selftest (M4-B1 + M4-B3 accepted)

[M4-B3 #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69) passed [PR #71](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/71) and [post-merge main CI #39979727977](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39979727977): **4/4 PASS, 428/428 tests per job**, zero failures/skips. Denied fictional admissions return before a mock driver is created. The next [M4-B4 #72](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/72) will add independently observed test-only effect counters; current booleans are **not OS audit evidence**.

The [M4-B3 admission design](docs/LOCAL_CONSENT_GATE.md) checks a fixed suite-owned fictional identity **before** constructing either mock driver. The stdio guarded path sends only `initialize` (no `tools/list` or `tools/call`); the HTTP guarded path sends the fixed local `ping`. The lower-level legacy test harness still exists for separate explicit synthetic security tests, not as real target authorization.

[Merged PR #65](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/65) and [main CI #39966437277](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39966437277): **4/4 PASS, 407/407 tests per job**. The offline permission consistency layer [M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66) has now been accepted; the next [M4-B3 mock enforcement #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69) remains strictly first-party-only. User-owned target execution remains prohibited.


```sh
node src/cli.mjs adapter-selftest
```

This no-argument mode uses only the known first-party stdio child and temporary `127.0.0.1` HTTP mock through a common `connect → probe → close` lifecycle. It does **not** use your project descriptor, contact an external MCP target, or authenticate a real server. [Driver scope and limitations](docs/LOCAL_ADAPTER_DRIVERS.md).

## Fictional-only beta self-check (M5-05)

The [beta acceptance protocol](docs/BETA_TESTING.md) describes a clean public checkout and a zero-input runner:

```sh
node examples/beta-acceptance-check.mjs
```

It checks five **bundled fictional** cases, including one intentionally detected `FAIL`, and emits bounded JSON with exact expected statuses and symbolic rule codes. It does **not** connect to an external MCP target, independently certify security, sanitize arbitrary user input, or claim any real developer has participated. Real independent feedback must be submitted voluntarily using the [fictional beta report form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose), with no credentials, private logs or machine paths. **Engineering M5-05 is accepted; independent participation is NOT verified** and is tracked in [M5-06 #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59).

## Exact-target gate simulation (M4-B8-A, offline only)

[Merged PR #107](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/107) added the pure `simulateExactTargetAuthorization(packet, testEvidenceSnapshot, {nowMs})` API for a **fictional nonproduction HTTPS target**. It models exact host/port/path/version/method matching, one-request ceilings, TTL/revocation/replay-declaration and distinct simulated ownership/operator/egress/TLS/DNS/SSRF gates. No external network, credentials, process launch, or real operator verification occurs. **Even a simulated `PASS` always returns `REAL_TARGET_EXECUTION_NOT_AUTHORIZED` and `executionEnabled:false`.** It has no durable replay ledger, independent verification or actual DNS/TLS/SSRF enforcement. See [the decision packet and limitations](docs/M4_B5_TARGET_APPROVAL.md). [Post-merge main CI #40075770866](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40075770866): **4/4 PASS, 582/582 tests per job**, zero failures/skips. Reviewed npm inventory remains 80 paths. Real target RFC #21, independent security review #43 and beta #59 stay open.

## Offline evidence and single-use rehearsal (M4-B8-B)

[Merged PR #110](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/110) adds a test-only versioned evidence snapshot boundary and a disposable synchronous one-time permit state machine. An exact SHA-256 digest binds the fictional target and operator to a claimed proof but **does not authenticate either one**. Within one isolated memory cell, a single consume succeeds; duplicates, revoked, expired and mismatched requests are rejected. Separate cells **can each consume a copied grant**, so there is **no real durable or cross-process replay protection**. All reports permanently deny real-target execution. No customer MCP contact, credentials, DNS/TLS/SSRF network controls or executable grant APIs were added. [M4-B5 decision record](docs/M4_B5_TARGET_APPROVAL.md) describes the design and missing gates. [Main CI #40077863059](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40077863059): **4/4 PASS, 599/599 tests per job**, 0 failed/skipped; reviewed npm inventory unchanged at 80 paths.

## Offline project fixture audit (M4-B9-A)

[PR #113](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/113) is merged; [code main CI #40080894639](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40080894639) verified **4/4 PASS, 614/614 tests/job**, zero failed/skipped on Ubuntu/Windows Node20/22. No npm publication or real-target permission.

`node src/cli.mjs adapter-fixture-audit <fictional-bundle-file>` combines a
portable **inert** stdio or HTTPS project descriptor with up to five
pre-reviewed fictional security controls: permission denial, replay denial,
unknown tool denial, an intentionally failing denied-write negative control
and a passing clean trace. The command returns bounded JSON-v1 per-check
evidence. A whole-bundle `PASS` means our synthetic fixture expectations
were satisfied; it **does not** measure the real project/server. No untrusted
trace, executable code, dynamic fixture path or user-controlled endpoint is
ever dispatched by this command; the input is limited to 16 KiB.
[Copy/paste quickstart](docs/GETTING_STARTED.md).

**External/user MCP servers remain uncontacted and unauthorized.**
`REAL_TARGET_NOT_ATTEMPTED`, `OPERATOR_NOT_VERIFIED`,
`REAL_TARGET_NOT_AUTHORIZED`, and `executionEnabled:false` are
unconditional, regardless of fixture status.

## User-authored symbolic project traces (M4-B9-B)

[Implementation PR #116](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/116) is merged. [Verified post-merge main CI #40095371602](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40095371602) **4/4 PASS, 633/633 tests/job**, zero failed/skipped across Windows/Ubuntu Node20/22. No security certification or external permission.

`node src/cli.mjs adapter-synthetic-trace <symbolic-trace-file>`
allows a developer to audit **up to eight explicitly fictional, enum/boolean
only decision/effect assertions** with a previously reviewed inert adapter
descriptor. This is separate from `adapter-fixture-audit` and retains
the reviewed offline `auditRecords` invariants. A trace `PASS` is
not a fixed negative-control PASS, a real MCP scan or actual security
attestation. The strict 4096-byte input cannot contain user tool names,
raw MCP messages, endpoint requests, commands, credentials or arbitrary
fixture paths. [Complete fictional sample](docs/GETTING_STARTED.md).
The mode returns symbolic event ordinals, fixed rule codes and permanent
`REAL_TARGET_EXECUTION_NOT_AUTHORIZED`; no external target contact.

## Exact synthetic CI expectations (M4-B9-C)

[Merged implementation PR #119](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/119) and [code post-merge CI #40098854001](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40098854001) confirm **4/4 PASS, 654/654 tests per job**, zero failures/skips, on Ubuntu/Windows Node 20/22. Synthetic assertion success is not real-target approval or security certification.

`node src/cli.mjs adapter-trace-expect <fictional-expectation-file>`
compares every anonymous symbolic trace event with an explicit canonical
expected-rule list and an expected overall safety status. It returns
`observedSafetyStatus`, `expectationStatus`, and separate observed
findings: CI may pass for a correctly predicted fictional violation without
ever claiming the observed safety status passed. No wildcards, unknown
rules, missing event indices or partial matches. The JSON input has a
4096-byte cap and the original `adapter-synthetic-trace` behavior remains
unchanged. [Complete copy/paste example](docs/GETTING_STARTED.md).
**Still offline-only; no MCP target execution or authorization.**

## Portable offline regression smoke (M4-B9-D)

[Merged code PR #122](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/122) and [post-merge main CI #40100711397](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40100711397) confirm **4/4 PASS, 658/658 tests/job**, zero failures/skips, across Windows/Ubuntu Node20/22. The direct portable CI smoke also passes in all four jobs. This is offline engineering evidence only, not real server testing or security certification.

From a local clone, run `node examples/offline-ci-check.mjs` on Node.js
20+ without any npm install. The reviewed example now exercises a clean
symbolic CI expectation, an **expected synthetic violation** (CI matches
while `observedSafetyStatus` stays FAIL) and an **unexpected violation**
(CI matcher exits nonzero), in addition to the existing two fictional
security-contract cases. It creates only fixed temporary local data and
cleans it up; no user MCP process, external network, credentials or actual
project trace is touched. The normal [GitHub Actions matrix](.github/workflows/ci.yml)
runs it as an explicit smoke step. [Windows PowerShell, exit semantics and
portable CI instructions](docs/GETTING_STARTED.md).

## Installed-package fictional downstream rehearsal (M4-B10-A)

[Merged implementation PR #125](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/125) and [code post-merge CI #40103582818](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40103582818) demonstrate **4/4 PASS, 658/658 tests/job**, zero failures/skips, Windows/Ubuntu Node20/22. The existing installed tarball smoke now covers a separate fictional adopter directory and packaged SDK import, with generic sanitized negative cases. This remains an offline demo, not an independently validated customer integration.

The offline R1 tarball test now goes beyond in-repository fixtures: it
installs the reviewed package using only a disposable local npm cache,
then checks **CLI usage and SDK import from a separate fictional project
directory**. This covers validate-only descriptor onboarding, symbolic
auditing, exact CI expectation matching and fail-closed bad inputs.
The installed CLI is invoked explicitly, so it does not rely on the
source repository's current working directory. No package publication,
customer MCP connection or security certification is implied.
[Portable Node and Windows PowerShell reproduction](docs/GETTING_STARTED.md).

## Candidate packaging (not yet published)

The prerelease package declares an executable `mcp-agent-security`, an audited `files` allowlist and zero dependencies. `npm run release:preflight` checks the archive manifest in offline dry-run mode; the full `node --test` suite also performs a **disposable offline local tarball installation smoke**, verifies the installed CLI and deletes all temp files. The [R2 exact package inventory guard](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/32) fails on unreviewed new or missing packaged file paths; it does not inspect the safety of approved file contents. No registry access or publication occurs. Do not run `npm publish` or create stable tags without separate explicit approval. See [release readiness](docs/RELEASE_READINESS.md), the [R3 internal release review](docs/R3_INTERNAL_RELEASE_REVIEW.md), the [R4 offline artifact-integrity checks](docs/R4_ARTIFACT_INTEGRITY.md) and the [R5 independent-review handoff](docs/R5_INDEPENDENT_REVIEW.md). The [R5-C assessor handoff refresh](docs/R5_INDEPENDENT_REVIEW.md#r5-c--assessor-operated-zero-customer-contact-handoff) documents the current **80-path** package and a full public Git SHA for an engineering snapshot; it is not an independently anchored artifact or an auditor sign-off. None substitutes for the still-open [R5-B independent reviewer release gate](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) or permission to publish.

## Test

Requires Node.js 20+.

```bash
node --test
node src/cli.mjs scenario fixtures/scenario-denial.json
node src/cli.mjs process fixtures/scenario-recovery.json
node src/cli.mjs stdio fixtures/stdio-mock-safe.json
node src/cli.mjs loopback fixtures/loopback-safe.json
# Synthetic invalid Origin, expected exit 1
node src/cli.mjs loopback fixtures/loopback-unsafe.json
# Deliberate synthetic protocol violation, expected exit 1
node src/cli.mjs stdio fixtures/stdio-mock-unsafe.json
node src/cli.mjs jsonrpc fixtures/jsonrpc-safe.json
node src/cli.mjs era fixtures/mcp-modern-safe.json
node src/cli.mjs negotiate fixtures/mcp-negotiate-safe.json
# Negative fixture: intentionally exits 1 with RETRY_PARAMS_CHANGED
node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json
```

CLI `0` = passing contracts, `1` = violations, `2` = invalid input. All invocations emit [versioned JSON schema v1](docs/CLI_REPORTS.md) on stdout, including generic input errors; existing command-specific fields are preserved. No `npm install` required.

Published v0.0.9 baseline passed 243 tests per CI job on Windows/Ubuntu with Node.js 20/22 (October 22, 2026). The v0.0.10-rc.1 main branch passed [post-merge GitHub Actions](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40164911500) after [M6-E PR #151](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/151): **732/732** synthetic, local-only, packaging, fictional adapter-template output, read-only user-descriptor onboarding and fixed first-party staging checks on each Windows/Ubuntu Node20/22 job, with zero failures/skips. The initial six tasks and **owner-approved M4-A local loopback mock** are complete ([PR #24](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/24)). **Real external MCP target integration remains unauthorized; M4-B6-A/B/C/D/E/F and M4-B7-A/B/C cover only our own ephemeral localhost fixture and completely inert project descriptor readiness previews and fictional template generation. The fixed adapter facade, bounded SSE/cancellation, disposable child process and test-only TCP/PID witness are not a real-user project connector, OS sandbox or complete MCP conformance. M5 external beta evidence and M6 maturity are still pending.** Stable v0.0.10 has **not** been published; see [release preflight](docs/RELEASE_READINESS.md). These results do **not** establish complete MCP compliance, safety of external systems or an independent security audit.

We welcome nonconfidential problem statements or proposals through the [synthetic-only GitHub Issue forms](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose). Report a reproduction with bundled fictional fixtures and symbolic rule codes only; see the [contributor feedback procedure](CONTRIBUTING.md). For confidential vulnerabilities use [SECURITY.md](SECURITY.md) rather than a public Issue. Never upload real private logs or credentials. Licensed under [MIT](LICENSE). Current repository maintains an open [roadmap](ROADMAP.md).

References: [MCP](https://modelcontextprotocol.io/), [JSON-RPC](https://www.jsonrpc.org/specification/), [OWASP Agentic Security](https://genai.owasp.org/). No affiliation or endorsement is claimed.
