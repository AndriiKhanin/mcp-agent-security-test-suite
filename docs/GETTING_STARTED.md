# Getting started: offline security contract checks

**For developers and contributors.** This independent MIT-licensed package uses Node.js **20 or newer**, Git and **no npm installation or paid API**. It tests only fictional security contracts. Do not provide credentials, customer logs or production target addresses. Passing these tests does not mean a real MCP server is secure.

## First run from a clean clone

Copy these commands into a terminal (Windows PowerShell 7, CMD, Linux shell, or macOS shell):

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
node --version
node src/cli.mjs --help
node src/cli.mjs --version
node src/cli.mjs demo
node examples/offline-ci-check.mjs
node --test
```

The offline `--help` command returns a JSON-v1 list of supported first-party fictional commands and fixed examples; `--version` reads only the bundled package metadata and displays the candidate version, without claiming any registry publication. Both reject extra options or target paths. The **zero-argument** `demo` command emits a versioned JSON report with `command: "demo"`, `status: "PASS"`, `checks: 2` and both fictional expectations marked `matched: true`. The intentionally unsafe negotiation fixture must be detected for the whole demo to pass. Do not interpret this as a scan of your computer or any MCP target. The separately supplied `examples/offline-ci-check.mjs` script below remains available for compact terminal summaries.

Expected demonstration (the exact messages are fixed and intentionally contain no fixture payloads):

```text
SAFE_FIXTURE_PASS: expected synthetic denials caused no unauthorized effects
EXPECTED_FAIL_DETECTED: RETRY_PARAMS_CHANGED, exit code 1
DEMO_PASS: both offline contract checks behaved as expected
```

The script succeeds with process exit **0 only if both cases behaved exactly as expected**. It does **not** accept custom target/executable options, connect to the network, invoke paid services, or run arbitrary files. It calls the bundled CLI with two hard-coded fictional fixture paths.

## Understand PASS versus a security denial

**First check (`scenario`):** the fixture `fixtures/scenario-denial.json` contains fictional actions where nine invalid requests are **properly denied**, and two authorized requests produce a fictional write/read. The entire scenario is **PASS** (`0`) because the security policy enforced those denials without unauthorized effects. A denied tool call does *not* automatically mean the test failed.

**Second check (`negotiate`):** the fixture `fixtures/mcp-negotiate-unsafe-params.json` intentionally mutates a tool request's parameters between a failed protocol-version attempt and the retry. The validator must return **FAIL** (`1`) with `RETRY_PARAMS_CHANGED`, proving that the negative security control was detected. The example script treats that *expected failure* as successful security-test evidence.

**Invalid fixture/arguments:** the CLI returns `ERROR` with exit code **2** and only a generic machine-readable error code. No input data or path should appear in that error object. See [CLI JSON v1](CLI_REPORTS.md) for exact schema.

To observe individual results (the second command *intentionally returns nonzero*):

```sh
node src/cli.mjs scenario fixtures/scenario-denial.json
node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json
```

For fixed local stdio mock transport, run:

```sh
node src/cli.mjs stdio fixtures/stdio-mock-safe.json
node src/cli.mjs stdio fixtures/stdio-mock-unsafe.json
```

The latter is also a deliberately failing fictional control. The stdio worker is a fixed first-party batch test double, **not a real target**, an OS sandbox, or full MCP interoperability. See [stdio mock limits](STDIO_MOCK.md).

## Diagnose a fictional failure without sharing private input (M5-02)

An intentionally failing contract report contains an additive `guidance` array with approved rule descriptions, a next action and an offline reproduction command for three representative violations. Run:

```sh
node src/cli.mjs trace fixtures/trace-unsafe.jsonl
node src/cli.mjs trace fixtures/trace-unsafe-secret.jsonl
node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json
```

Each is an **expected FAIL** (exit 1). Check `summary.ruleCodes` and `guidance`, not raw payload text. When the input itself is invalid (exit 2), guidance recommends the safe `demo` baseline rather than guessing which confidential part of the input failed. Unknown rule strings do not produce improvised guidance.

**Privacy boundary:** only `guidance` and the generic error report use these fixed templates; existing per-command/native result fields can still contain fictional caller-supplied values. Never paste real customer events or credentials into fixtures. See [CLI diagnostic format](CLI_REPORTS.md).

## CI example

Use [examples/offline-contract-check.yml](../examples/offline-contract-check.yml) as a template for your own repository's `.github/workflows/offline-contract-check.yml`. The sample uses SHA-pinned GitHub Actions, `permissions: contents: read`, `persist-credentials: false`, Node.js 22, and a single safe command:

```sh
node examples/offline-ci-check.mjs
```

The example workflow assumes the **same repository files** (the script and fictional fixtures) are checked out. If adapting it for a different repository, vendor the reviewed test files and script deliberately; do not add production credentials, network targets or shell-driven scans. The example lives in `examples/` so it is not a duplicate active GitHub workflow; the repository's existing four-job `.github/workflows/ci.yml` remains the acceptance gate.

## Report reproducible synthetic feedback (M5-03)

Use the [GitHub Issue chooser](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose) to report a **fictional bug** or suggest an **offline-first feature**. For bug reports, include the candidate version (for example `0.0.10-rc.1`), OS, Node version, the exact bundled offline command, a symbolic `summary.ruleCodes` entry such as `RETRY_PARAMS_CHANGED`, a minimal fictional reproduction and expected/observed outcomes. Do not paste native report payloads or confidential host details. The form requires a privacy confirmation but cannot independently filter what you type. For possible security vulnerabilities use [SECURITY.md](../SECURITY.md) and a private channel, not public Issues. Full [safe-feedback rules](../CONTRIBUTING.md).

## Configure your own MCP project (universal adapter preview)

The [universal adapter guide](UNIVERSAL_ADAPTER.md) documents two supported connection descriptors: local `stdio` and `streamable-http`. Try `node src/cli.mjs adapter-check examples/adapter-profiles/stdio-project.json` or `node src/cli.mjs adapter-check examples/adapter-profiles/streamable-http-project.json`. A `PASS` means configuration validation only; `connectionStatus` is always `NOT_ATTEMPTED` and `executionEnabled` is always false. No actual MCP project can be connected via this preview yet. Do not put tokens, customer logs or private system paths into public fixtures.

## Review offline project permission consistency (M4-B2)

Try `node src/cli.mjs adapter-policy-check examples/adapter-profiles/consent-expired.json`. The included fictional example deliberately **fails** with `ADAPTER_GRANT_EXPIRED_OR_INVALID`. This is a demonstration of fail-closed consent consistency, **not operator verification, login or access**. Even an internally consistent short-lived self-assertion can never enable a connection. See [consent policy limitations](ADAPTER_CONSENT_POLICY.md).

## Optional independent beta acceptance (M5-05)

Run `node examples/beta-acceptance-check.mjs` from the public checkout, with **no arguments**. It returns a separate, bounded `betaSchemaVersion: 1` JSON report with exactly five fixed, offline fictional controls. Four must give CLI PASS (including `help`, `version`, `demo` and a synthetic denial scenario); the deliberately mutated negotiation must give CLI FAIL with `RETRY_PARAMS_CHANGED`. The **combined** beta result is PASS only if all expectations match. Record the exact public Git commit SHA and submit only sanitized evidence using the [beta feedback form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose). Never use real MCP servers or credentials. Full [beta procedure and independent acceptance criteria](BETA_TESTING.md).

## Contributing and boundaries

1. Start with a [GitHub Issue](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues), using fictional examples only.
2. Make a feature branch, include at least one positive and one **negative** control, and run `node --test`.
3. Explain violated rule names without copying secret-like fixture values to your PR.
4. A change can be considered accepted only after the four-job Windows/Ubuntu × Node20/22 CI matrix passes in PR and again on merged `main`.

See [CONTRIBUTING.md](../CONTRIBUTING.md), [THREAT_MODEL.md](THREAT_MODEL.md), [NEGATIVE_CONTROLS.md](NEGATIVE_CONTROLS.md), and [ROADMAP.md](../ROADMAP.md). The design of live target integration is future, separate, and requires explicit authorization.

## Offline universal MCP project onboarding (M4-B7-B)

This workflow **does not connect to your MCP project**. The two checked-in project examples are **fictional**, contain no real credentials and are used only to demonstrate the read-only configuration grammar.

```sh
node src/cli.mjs adapter-onboard examples/adapter-profiles/stdio-project.json
node src/cli.mjs adapter-onboard examples/adapter-profiles/streamable-http-project.json
node src/cli.mjs adapter-policy-check examples/adapter-profiles/consent-expired.json
node src/cli.mjs adapter-onboarding-demo
```

The first two commands are **pure offline** and return `DESCRIPTOR_VALIDATED` with `REAL_TARGET_NOT_ATTEMPTED`, `FIRST_PARTY_STAGING_NOT_ATTEMPTED` and `OPERATOR_NOT_VERIFIED`. The third deliberately uses an **expired, self-asserted fictional consent** claim and should produce a **FAIL** exit status 1; it does not use signed ownership verification. The fourth takes **no arguments**, tests a different in-code fictional descriptor against the project's *own temporary localhost fixture* and returns `FIRST_PARTY_STAGING_PASS` separately from `REAL_TARGET_NOT_ATTEMPTED`. It does **not** connect to the profile you just validated. Neither a `PASS` profile nor a green local demo authorizes target access.

Actual deployment, operator and target verification, OAuth, network/SSRF controls, arbitrary stdio executables and real MCP server connections are **not implemented**. Only non-sensitive fictional test data should be put into the supplied example commands. See [Universal Adapter](UNIVERSAL_ADAPTER.md) and [M4 real-target approval](M4_AUTHORIZED_INTEGRATIONS_RFC.md).

**Engineering acceptance:** [M4-B7-B #100](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/100), [PR #101](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/101), [post-merge main CI #40072318839](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40072318839): **4/4 PASS, 554/554 tests/job** on Windows/Ubuntu and Node20/22 with zero failures/skips. This is first-party/offline acceptance only; not third-party pilot evidence.

## Generate a fixed fictional adapter profile without executing it (M4-B7-C)

Run either command:

```sh
node src/cli.mjs adapter-template stdio
node src/cli.mjs adapter-template streamable-http
```

The JSON-v1 CLI response has a `template` object that matches the current `adapterSchemaVersion: 1` descriptor grammar. **Copy only `template`** (not the surrounding CLI report) into a local file, for example `my-local-project.json`. For guidance, the checked-in fictional examples in `examples/adapter-profiles/stdio-project.json` and `examples/adapter-profiles/streamable-http-project.json` use the same safety defaults.

```sh
node src/cli.mjs adapter-onboard my-local-project.json
```

This validates **only JSON syntax and the fixed descriptor rules**. It neither resolves nor contacts the sample hostname `mcp.example.org`; likewise, it never starts the template's fictional `node server.mjs`. The `PASS` report is **not proof of operator identity, ownership, readiness to execute, protocol compatibility or server safety**. Template generation never writes a file. Changing the template for your own project still cannot enable real execution; permissions must remain `validate-only` and all `allow*` false. Do not insert real credentials, private log data or secret URLs. There is no option to supply an arbitrary endpoint, command or template type for execution.

The optional `adapter-onboarding-demo` command remains a **separate** test against our own fixed first-party localhost mock, and does not use your template or saved project file. A real MCP server connection requires independent exact-target ownership verification and new owner-approved safety controls under [RFC #21](M4_AUTHORIZED_INTEGRATIONS_RFC.md).

**Template engineering acceptance (2026-10-24):** [M4-B7-C #103](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/103), [PR #104](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/104), [post-merge main CI #40073451813](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40073451813) — **4/4 PASS, 566/566 tests/job**, zero failures/skips, including safe copy/paste round-trip tests. This is fictional local-only tooling, not real user MCP connectivity.


## M4-B9-A — audit a fictional project bundle without contacting its server

1. Choose a descriptor: `node src/cli.mjs adapter-template streamable-http`
   emits a JSON report. Copy **only** the `template` object as the
   `descriptor` value below. The hostname is an inert documentation string.
2. Create your own local file `offline-project-bundle.json` with this
   **entirely fictional** example:

```json
{
  "bundleSchemaVersion": 1,
  "mode": "offline-fictional-only",
  "descriptor": {
    "adapterSchemaVersion": 1,
    "project": { "name": "fictional-http-project" },
    "transport": {
      "type": "streamable-http",
      "endpoint": "https://mcp.example.org/mcp"
    },
    "protocolVersion": "2026-07-28",
    "policy": {
      "mode": "validate-only",
      "allowNetwork": false,
      "allowProcessSpawn": false,
      "allowToolCalls": false,
      "allowCredentials": false
    }
  },
  "checks": [
    { "caseId": "permission-denial" },
    { "caseId": "replay-denial" },
    { "caseId": "tool-escalation-denial" },
    { "caseId": "denied-effect-negative" },
    { "caseId": "clean-trace" }
  ]
}
```

3. Run `node src/cli.mjs adapter-fixture-audit offline-project-bundle.json`.
   JSON v1 reports descriptor readiness and five **bundled in-code synthetic**
   security controls independently. The deliberately broken
   `denied-effect-negative` control is expected to produce a native
   detection; detecting it correctly makes the overall fixture audit PASS.
   All case IDs and their expected outcomes are fixed, not caller-configurable.
   A nonmatching control makes the audit FAIL (exit 1); malformed input returns
   a generic error (exit 2). Bundle file size is limited to **16 KiB**.

**Security boundary:** This does NOT run checks on the MCP installation or
the endpoint supplied in the descriptor. It performs local read-only descriptor
validation and our own fictional comparisons, with **no new socket, child
process, credentials, target DNS, or real tool calls**. The results always
contain `REAL_TARGET_NOT_ATTEMPTED`, `OPERATOR_NOT_VERIFIED`,
`REAL_TARGET_NOT_AUTHORIZED`, `REAL_TARGET_EXECUTION_NOT_AUTHORIZED`,
and `executionEnabled:false`. No user-provided trace or external fixture
file path is accepted inside the bundle. Never submit a real credential,
private MCP transcript, private URL or actual customer data as a fixture.


## M4-B9-B — author a tiny symbolic security trace (no MCP contact)

`adapter-fixture-audit` uses five built-in fictional cases, while the
separate `adapter-synthetic-trace` command evaluates **your explicitly
authored symbolic event assumptions**. This is NOT an import of MCP logs and
cannot inspect a live server.

1. Save the JSON below in a local file named `symbolic-trace.json`.
   The descriptor is inert and validates only the shape of the configuration;
   the example HTTPS hostname is never resolved or contacted.
2. Run `node src/cli.mjs adapter-synthetic-trace symbolic-trace.json`.

```json
{
  "traceSchemaVersion": 1,
  "mode": "user-authored-synthetic-only",
  "descriptor": {
    "adapterSchemaVersion": 1,
    "project": { "name": "fictional-http-project" },
    "transport": {
      "type": "streamable-http",
      "endpoint": "https://mcp.example.org/mcp"
    },
    "protocolVersion": "2026-07-28",
    "policy": {
      "mode": "validate-only",
      "allowNetwork": false,
      "allowProcessSpawn": false,
      "allowToolCalls": false,
      "allowCredentials": false
    }
  },
  "events": [
    {
      "decision": "DENY",
      "effect": "NONE",
      "ownerAuthorized": false,
      "scopeAuthorized": false,
      "leaseFresh": false,
      "secretLogged": false
    },
    {
      "decision": "ALLOW",
      "effect": "READ",
      "ownerAuthorized": true,
      "scopeAuthorized": true,
      "leaseFresh": true,
      "secretLogged": false
    }
  ]
}
```

This example produces an offline symbolic `PASS`: a denied action had no
effect, and a declared allowed read met the chosen model's conditions.

To deliberately test the negative control, change the first event's
`effect` to `WRITE`. The command will exit `1` with the fixed symbolic
`DENIED_ACTION_HAD_EFFECT` rule. An `ALLOW`/`READ` or `ALLOW`/`WRITE`
without `ownerAuthorized` or `scopeAuthorized` yields
`EFFECT_WITHOUT_AUTHORIZATION`; without `leaseFresh` it yields
`EFFECT_WITHOUT_FRESH_LEASE`. `secretLogged:true` reports only the
caller-supplied flag, not any inspected secret bytes.

The schema permits **1–8** event records and exactly **six**
enum/boolean-only event fields: `decision` (`ALLOW`/`DENY`),
`effect` (`NONE`/`READ`/`WRITE`), and four boolean flags
(`ownerAuthorized`, `scopeAuthorized`, `leaseFresh`, `secretLogged`).
The CLI reads a maximum of **4096 bytes**; duplicate JSON keys, unexpected
fields and user-supplied tool names, URLs, HTTP bodies, credentials,
resource identifiers and execution flags are rejected.

Output distinguishes `USER_AUTHORED_SYNTHETIC_TRACE_EVALUATED` from
`fixedFixtureControls:NOT_RUN`, and includes only fixed rule codes,
counts and ordinal event numbers. A passing symbolic assertion **does not**
prove any real project action was safe, detect actual secret exposure or
verify target ownership. Replay-specific analysis is **not** provided by
these anonymous events; the separately invoked fixed
`adapter-fixture-audit` contains a replay-denial demonstration. No
network, DNS, child-process, credential or real MCP tool interaction occurs.


## M4-B9-C — exact symbolic trace regression expectations in CI

`adapter-trace-expect` is an **opt-in local-only assertion** tool, separate
from `adapter-synthetic-trace`. It compares a complete, explicitly declared
set of symbolic rule codes for **every** event with the existing anonymous
synthetic trace audit. It never runs a real MCP server or authenticates the
descriptor. A successful expected negative-control detection can yield an
outer **CI PASS**, while `observedSafetyStatus` remains **FAIL**.

Save the following as `symbolic-expectation.json` in your own test
workspace. The example descriptor is inert: its URL is never contacted.

```json
{
  "expectationSchemaVersion": 1,
  "mode": "synthetic-expectations-only",
  "trace": {
    "traceSchemaVersion": 1,
    "mode": "user-authored-synthetic-only",
    "descriptor": {
      "adapterSchemaVersion": 1,
      "project": { "name": "fictional-http-project" },
      "transport": {
        "type": "streamable-http",
        "endpoint": "https://mcp.example.org/mcp"
      },
      "protocolVersion": "2026-07-28",
      "policy": {
        "mode": "validate-only",
        "allowNetwork": false,
        "allowProcessSpawn": false,
        "allowToolCalls": false,
        "allowCredentials": false
      }
    },
    "events": [
      {
        "decision": "DENY",
        "effect": "NONE",
        "ownerAuthorized": false,
        "scopeAuthorized": false,
        "leaseFresh": false,
        "secretLogged": false
      }
    ]
  },
  "expectedStatus": "PASS",
  "expected": [{ "event": 1, "ruleCodes": [] }]
}
```

Run: `node src/cli.mjs adapter-trace-expect symbolic-expectation.json`.
The outer `status:PASS`, `expectationStatus:MATCH` and
`observedSafetyStatus:PASS` produce exit code **0**, suitable for a
local or CI step with normal nonzero-exit-code failure behavior.

For an **expected synthetic violation**, change the event
`"effect": "NONE"` to `"effect": "WRITE"`, change
`"expectedStatus": "PASS"` to `"expectedStatus": "FAIL"`, and
change the expectation to:

```json
"expected": [
  { "event": 1, "ruleCodes": ["DENIED_ACTION_HAD_EFFECT"] }
]
```

Now the command still exits **0** if the exact violation was detected.
Its output makes the distinction explicit:
`status:PASS`, `expectationStatus:MATCH`,
`expectationOutcome:VIOLATION_DETECTED_AS_EXPECTED`,
`observedSafetyStatus:FAIL`, `observedFailureCount:1`.

For a deliberately **failing CI regression**, keep the original clean
expectation (`expectedStatus:PASS`, empty `ruleCodes`) while changing the
event effect to `WRITE`. The observed synthetic violation is unexpected:
`status:FAIL`, `expectationStatus:MISMATCH`,
`observedSafetyStatus:FAIL`, exit code **1**. Malformed expectation JSON,
duplicate keys or forbidden fields instead exit **2** with a generic
sanitized error.

The strict schema permits 1–8 dense event entries, exactly one
`expected` entry per ordinal event, and canonical, uniquely ordered
rule-code arrays containing only:
`FLAGGED_SECRET_IN_AUDIT_LOG`, `DENIED_ACTION_HAD_EFFECT`,
`EFFECT_WITHOUT_AUTHORIZATION`, and
`EFFECT_WITHOUT_FRESH_LEASE`. Wildcards, partial matching, unknown or
duplicate codes, missing event indices and status contradictions are
rejected. Files are limited to **4096 bytes**.

Important: **outer CI PASS means only exact agreement with a fictional
assertion.** Even an expected synthetic violation remains an observed
safety FAIL. No actual user MCP transcript is parsed; no credentials, real
target probing, network calls or executable actions are enabled.


## M4-B9-D — portable fictional regression smoke (Windows + CI)

**From a clean clone, using only Node.js 20+ and checked-in code**, run one
command to exercise the existing offline contract fixtures **and** three
end-to-end synthetic trace assertions:

```sh
node examples/offline-ci-check.mjs
```

The script has no arguments, does not install dependencies, download content,
connect to a server or run user-configurable executables. It uses a tightly
bounded (max 4096-byte) JSON file in a disposable system temporary directory,
populated exclusively from fixed fictional literals in the reviewed example
source; that file is removed in a `finally` block. The temporary directory
is not an MCP target or external resource.

PowerShell 7 / Windows (replace the illustrative clone path):

```powershell
Set-Location -LiteralPath 'C:\path\to\mcp-agent-security-test-suite'
& node '.\examples\offline-ci-check.mjs'
if ($LASTEXITCODE -ne 0) { throw 'Offline synthetic CI smoke failed' }
```

The output contains only constant messages, including these three distinct
assertions:

```text
SYNTHETIC_CLEAN_MATCH: observed PASS, expectation MATCH, exit code 0
SYNTHETIC_EXPECTED_VIOLATION: observed FAIL, expectation MATCH, exit code 0
SYNTHETIC_UNEXPECTED_VIOLATION: observed FAIL, expectation MISMATCH, exit code 1
```

**Exit code explanation:** for each nested `adapter-trace-expect` call,
**0** means exact expectation match (including a precisely anticipated
synthetic violation); **1** means expectation mismatch; **2** means invalid
or unreadable input. The top-level smoke script succeeds with exit code
**0 only when all three fixed assertions** have the specified results; it
exits **1** if any assertion fails. In particular, the middle case's
`observedSafetyStatus:FAIL` is checked explicitly, so no synthetic
violation is silently called safe.

GitHub Actions already executes the script explicitly in the standard
Windows/Ubuntu and Node.js 20/22 test matrix. A repository that wishes to
adopt this **fictional baseline** can add the following step after cloning or
vendoring reviewed project source and configuring Node.js:

```yaml
- name: Run offline fictional security contract smoke
  run: node examples/offline-ci-check.mjs
```

No secret/environment configuration is required. The example exercises
the **reviewed built-in test assumptions**, not any real customer MCP
server, its code, an actual authorization decision, or private transcripts.
A successful CI job is evidence only that the offline example worked.
