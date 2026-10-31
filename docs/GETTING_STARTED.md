# F1 — guided source or installed first run

**Current delivery stage: F1 (one user journey); NOT real MCP scanning.**
In a reviewed source checkout with Node.js 20 or 22:

```sh
node src/cli.mjs start --text
node src/cli.mjs start examples/adapter-profiles/stdio-project.json --text
node src/cli.mjs start  # JSON-v1 for CI
```

In a disposable local installation of the unpublished candidate,
use `mcp-agent-security start` or
`mcp-agent-security start <local-descriptor.json> --text`.
Omit `--text` for machine-readable JSON (the default CI contract).
The text view prints only fixed local check statuses, the inert
descriptor validation result and an explicit **user MCP server NOT
checked** warning; it cannot print private paths, endpoint names,
project commands or raw descriptor content. This one command
runs the **two fixed bundled fictional controls**, performs a bounded
**first-party ephemeral 127.0.0.1 staging mock** check, and optionally
validates the supplied descriptor's *inert* shape. It does **not**
launch the descriptor's stdio command, resolve/contact the supplied
HTTP endpoint, obtain credentials or execute any project tool.

The JSON-v1 output includes `productStage:"F1"`,
`descriptorEvidence` (`DESCRIPTOR_VALIDATED` or `NOT_PROVIDED`),
`demoStatus`, `stagingStatus`, static `nextActions`, and
`externalTargetContacted:false`,
`projectConnectionAuthorized:false`, `operatorVerified:false`.
Status PASS/exit 0 confirms **only** the included fictional controls
and first-party mock. A failed included check yields FAIL/1.
Malformed/oversized/private input or wrong invocation yields ERROR/2
and does not print the input path/content. The 4 KiB descriptor limit
is intentional. Do not supply customer credentials or production URLs.

The first-party local HTTP socket is an actual loopback effect, not a
network isolation guarantee. No arbitrary external MCP connection
exists yet. External staging under [Issue #21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21)
requires separate review and explicit approval; product F2/F3 are
**not complete**. The v0.0.10-rc.1 package is not published to npm.

**Next:** review the offline configuration result, read
[UNIVERSAL_ADAPTER.md](UNIVERSAL_ADAPTER.md), then follow the
[product F0–F6 roadmap](../ROADMAP.md#product-v10--finite-finish-line-authoritative-delivery-plan).

## F1 supported and unsupported project inputs

| What a developer supplies | Installed `start` behavior | Real project tested? |
| --- | --- | --- |
| Nothing (`start --text`) | Two fictional checks and a fixed first-party temporary loopback demo | **No** |
| A single **universal project descriptor** v1 with `stdio` or `streamable-http` transport (`start descriptor.json --text`) | Strictly reads up to 4 KiB and validates supported descriptor fields, then runs only unrelated fixed first-party checks | **No** |
| Standard Claude-style `mcpServers` / VS Code-style `servers` client config directly | **Not accepted by packaged `start`**; source-only offline converter/report instructions in [M35](#m35--first-party-readable-offline-onboarding-source-checkout) | **No** |
| Operator-owned staging MCP HTTPS URL, HTTP session/token, or OAuth credentials | **Not connected or authenticated**; F2 and authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21) not accepted | **No** |
| Arbitrary stdio executable, MCP tool call, production server or private agent workspace | **Never launched or contacted by `start`** | **No** |

**Platform scope:** reviewed Node.js 20 and 22 on Windows and Ubuntu.
The accepted descriptor's `protocolVersion` field is a **schema label**
(`2025-11-25` or `2026-07-28`), not evidence that a real server of
that version was contacted, negotiated or certified.

**Copyable first-run progression** (source checkout, no private data):

```sh
node src/cli.mjs start --text
node src/cli.mjs adapter-template stdio
node src/cli.mjs start examples/adapter-profiles/stdio-project.json --text
node src/cli.mjs start examples/adapter-profiles/stdio-project.json
```

The template command prints a **JSON report wrapper**, not a directly
usable input descriptor; save **only** its nested `template` object
into a local descriptor file before passing it to `start`. The final
command outputs JSON-v1 for CI, with status codes 0 (fixed checks
matched), 1 (fixed checks failed) and 2 (invalid/unavailable input).
No command above tests a user-controlled server or grants authority.

**Independent feedback:** [fictional-only beta #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59).
The full v1.0 flow from own authorized staging → observed findings →
remediation/CI is still F2–F4 work, not a current feature.

---

## M37 — one-command first run (no config, no user server)

From an independently reviewed source checkout with Node.js 20+:

PowerShell, Linux or macOS:

```sh
node tools/adapter-first-run-view.mjs --self-check
```

For a fixed-schema machine-readable report:

```sh
node tools/adapter-first-run-view.mjs --self-check-json
```

This exercises only **bundled first-party source**. M8's fictional
adapter smoke verifies two inert transport examples (2/2). M35
independently parses two **fixed fictional** MCP client shapes
(2/2): `mcpServers` stdio and `servers` HTTPS, reusing five
*unchanged synthetic controls per example*. No file argument, stdin
input, external MCP server, configured command, credential, model,
DNS or HTTP request is used by this command. Zero-argument
`node tools/adapter-first-run-view.mjs` remains the earlier
M8 guide; all other arguments are rejected with exit 2 and no echo.

A PASS means only this local, fixed first-party test path works on
the current checkout. This is **not a real security scan, security
audit or security certification**, does not establish independent
beta participation, and does not grant any real server permission.
The JSON `riskRating` remains `NOT_SCORED`.

**Next:** for your *own private client config* inspect the supported
M34/M35 input restrictions and use a local pipe:

```powershell
Get-Content -Raw -Encoding utf8 .\client-config.json | node tools/m35-offline-onboarding-report.mjs
```

Linux/macOS: `cat ./client-config.json | node tools/m35-offline-onboarding-report.mjs`.
Do not paste real credentials, production URLs or customer data.
For *release maintainers* the separate
`node tools/reviewer-handoff.mjs doctor` performs the frozen local
npm pack/install SHA-256/512 custody checks; it does **not**
publish an npm package. Actual real-target authorization #21,
independent audit #43 and external beta #59 remain separate
unfulfilled gates.

---

## M35 — first-party readable offline onboarding (source checkout)


## M36 — local distribution doctor (no publication)

In a reviewed source checkout with Git, Node.js 20/22 and bundled npm,
run exactly this command:

```sh
node tools/reviewer-handoff.mjs doctor
```

The helper is **source-only**, not part of the frozen 80-file npm
candidate. It combines the existing M6-J hashed handoff, real temporary
`npm pack --offline --ignore-scripts`, offline local install, and
source/installed-byte comparison. It cleans temporary local archives.
The JSON `status: "PASS"` is a local diagnostic only; check
`distributionDecision: "BLOCKED_PENDING_INDEPENDENT_GATES_AND_OWNER"`,
`releaseReady: false`, `published: false`, and the open gates
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59),
[#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43),
[#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21).
This diagnostic does not independently authenticate Git HEAD, verify
checkout cleanliness, verify a release signature or approve production.

The tool takes **no flags or user paths** after `doctor`.
An unsupported argument returns exit 2 and a bounded generic ERROR;
never provide credentials or production projects. A successful local
preflight exits 0, but a real release still needs independent assessment,
reviewed owner approval and separately anchored artifact identity.


This is a zero-contact **configuration shape report**, not a vulnerability
scan. It accepts one approved MCP client JSON entry in `mcpServers`
or `servers` (see [M34 input limits](../.github/M34_CLIENT_CONFIG_IMPORT.md)).
The existing M34 importer performs strict 4 KiB stdin, UTF-8 and
duplicate-key validation, then the M24 inert descriptor gate.

On **PowerShell** with Node.js 20+:

```powershell
Get-Content -Raw -Encoding utf8 .\client-config.json | node tools/m35-offline-onboarding-report.mjs
Get-Content -Raw -Encoding utf8 .\client-config.json | node tools/m35-offline-onboarding-report.mjs --json
```

On Linux/macOS:

```sh
cat ./client-config.json | node tools/m35-offline-onboarding-report.mjs
cat ./client-config.json | node tools/m35-offline-onboarding-report.mjs --json
```

For a **fictional** local example, create `client-config.json` with:

```json
{"mcpServers":{"fictional-example":{"command":"node","args":["server.mjs"]}}}
```

A successful text report includes `DESCRIPTOR PREFLIGHT`,
`FICTIONAL CONTRACT CONTROLS`, `NOT TESTED` and `NEXT ACTIONS`.
It states "5/5 reviewed first-party fictional checks matched", but
**these five are unchanged bundled fixtures** — they do not run the
named command, inspect a customer MCP server or discover a real
vulnerability. In both text/JSON modes, `riskRating` is
`NOT_SCORED`, real contact is `NOT_ATTEMPTED`, and authorization is
not granted. No raw name, path, endpoint or command text is echoed.

Invalid client configs are rejected without a project assessment:
exit **2**, `OFFLINE_ONBOARDING_INPUT_REJECTED`; syntactic/fixed
fictional PASS exits **0**, `OFFLINE_ONBOARDING_SHAPE_ACCEPTED`.
The tool cannot certify your software or establish owner approval.
To work with real external MCP servers, #21 needs separate explicit
owner authorization and secure target drivers; independent beta
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) and security audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) are still
open. No deployment or npm publication is implied.

Engineering evidence: [M35 PR #327](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/327)
passed [PR CI #41033447378](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/41033447378)
and independent [main CI #41033817795](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/41033817795),
**4/4 PASS each** on exact M35 merged SHA
`a5b9245178ce375dbcd08bd0eb82477c8760d8ac`.
Ubuntu20 **1350/1350 tests**, 0 failures/skips. This is
source-only acceptance; it does not close external gates.

### Hard boundaries

The M35 helper performs no filesystem read of its own beyond loading
reviewed source modules. The local shell supplies stdin; it does not
attempt DNS, HTTP, process launching, access to credentials, network
telemetry, or real agent inference. It never reads a stored report as
evidence; report text is rendered only from locally minted categorical
results. Use private test configs, never customer secrets. Opt-in M34
`--emit-descriptor` remains a **separate** operation that can disclose
input fields to your local stdout, unlike the M35 report.

## M7-A/B/C — built-in fictional adapter first-run guide

On Node.js 20+ in a clean source checkout, get a reviewed sequence
without supplying a project path, executable or URL:

```sh
node src/cli.mjs adapter-guide
```

The fixed JSON-v1 plan has four steps: (1) select either inert
`stdio` or `streamable-http` adapter kit, (2) export the kit to a
local `fictional-kit.json`, (3) verify its fixed synthetic checks,
and (4) optionally run the existing offline `adapter-quickstart` on
a bundled inert example. It uses no user-supplied configuration,
credentials, process launch or external MCP connection.

For example, follow the stdio branch:

```sh
node src/cli.mjs adapter-kit stdio > fictional-kit.json
node src/cli.mjs adapter-kit-verify fictional-kit.json
node src/cli.mjs adapter-quickstart examples/adapter-profiles/stdio-project.json
```

You can choose `streamable-http` instead. Neither route connects to
the endpoint named in its fictional descriptor. The guide states
`externalMcpTargetContacted:false`, `ownershipVerified:false`,
`independentBetaVerified:false` and
`stableReleaseAuthorized:false`. No result can be used as real
server authorization or security certification.

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
SYNTHETIC_CLEAN_MATCH: observed PASS, expectation MATCH, exit code 0
SYNTHETIC_EXPECTED_VIOLATION: observed FAIL, expectation MATCH, exit code 0
SYNTHETIC_UNEXPECTED_VIOLATION: observed FAIL, expectation MISMATCH, exit code 1
DEMO_PASS: all offline fictional contract checks behaved as expected
```

The script succeeds with process exit **0 only if all five fixed assertions behave exactly as expected** (two bundled fixture controls and three synthetic CI expectation comparisons). An **expected** inner symbolic violation is still an observed safety FAIL, never a claim that real target execution is safe. It accepts no target/executable arguments, makes no external network connection, and runs only the bundled first-party CLI with reviewed synthetic data.

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

## Optional independent fictional beta evaluation (M5-07)

The [SHA-pinned evaluator checklist](BETA_TESTING.md#independent-evaluator-quick-path-m5-07-no-live-targets) describes a clean public clone, fixed beta runner, portable smoke, optional offline local archive hash and safe opt-in feedback fields. **Independent usability evidence has not yet been received or accepted**; see [open beta gate #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59). Never report a green author CI job as an independent tester result. No real MCP connectivity is approved.

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


## M4-B10-A — exercise an offline package from a separate fictional project

This workflow verifies the **actual locally generated npm tarball**, not a
published package and not an external MCP server. The repository's automated
R1 installed-package test runs these same steps against a disposable sibling
directory, covering **descriptor onboarding**, **synthetic trace rules**,
**exact expectation matching**, **SDK import**, **invalid/oversized inputs**,
and direct-symlink rejection where the operating system supports creating the
link. It uses only source-defined fictional data and never connects to the
descriptor's URL.

A reviewer with a **previously checked-out** copy of this repository and
Node.js 20+ can follow the portable shell outline (adapt the local paths):

```sh
# Run from the already checked-out source root, not a customer MCP directory.
mkdir -p /tmp/mcp-fictional-package
npm pack --offline --ignore-scripts --pack-destination /tmp/mcp-fictional-package
# In a separate disposable directory:
mkdir -p /tmp/mcp-fictional-adopter
cd /tmp/mcp-fictional-adopter
npm install --offline --ignore-scripts --no-audit --no-fund \
  --no-save --package-lock=false \
  /tmp/mcp-fictional-package/mcp-agent-security-test-suite-0.0.10-rc.1.tgz
node ./node_modules/mcp-agent-security-test-suite/src/cli.mjs \
  adapter-onboard ./node_modules/mcp-agent-security-test-suite/examples/adapter-profiles/streamable-http-project.json
```

For **Windows PowerShell 7**, the same offline-only package-adoption exercise
can use a disposable directory beneath the local user's temporary folder:

```powershell
Set-Location -LiteralPath 'C:\path\to\already-checked-out-repository'
$Pack = Join-Path $env:TEMP 'mcp-fictional-pack'
$Adopter = Join-Path $env:TEMP 'mcp-fictional-adopter'
New-Item -ItemType Directory -Force -Path $Pack, $Adopter | Out-Null
& npm pack --offline --ignore-scripts --pack-destination $Pack
if ($LASTEXITCODE -ne 0) { throw 'Offline package creation failed' }
Set-Location -LiteralPath $Adopter
$Tarball = Join-Path $Pack 'mcp-agent-security-test-suite-0.0.10-rc.1.tgz'
& npm install --offline --ignore-scripts --no-audit --no-fund --no-save --package-lock=false $Tarball
if ($LASTEXITCODE -ne 0) { throw 'Offline local tarball installation failed' }
$Cli = Join-Path $Adopter 'node_modules\mcp-agent-security-test-suite\src\cli.mjs'
$Descriptor = Join-Path $Adopter 'node_modules\mcp-agent-security-test-suite\examples\adapter-profiles\streamable-http-project.json'
& node $Cli adapter-onboard $Descriptor
if ($LASTEXITCODE -ne 0) { throw 'Offline descriptor preview failed' }
```

To exercise your **own fictional symbolic CI assertions**, create local
`symbolic-trace.json` and `symbolic-expectation.json` inside the adopter
directory using the complete strict JSON examples from
[M4-B9-B](#m4-b9-b--author-a-tiny-symbolic-security-trace-no-mcp-contact)
and [M4-B9-C](#m4-b9-c--exact-symbolic-trace-regression-expectations-in-ci).
Invoke the installed binary **by explicit path** from that directory:

```sh
node ./node_modules/mcp-agent-security-test-suite/src/cli.mjs \
  adapter-synthetic-trace symbolic-trace.json
node ./node_modules/mcp-agent-security-test-suite/src/cli.mjs \
  adapter-trace-expect symbolic-expectation.json
```

Expect **exit 0** for a clean observation or an exact CI expectation match,
**exit 1** for a symbolic violation/expectation mismatch, and **exit 2**
for malformed, inaccessible, symlinked-leaf (when detectable) or oversized
input. The installed CLI's own report preserves
`observedSafetyStatus` separately from `expectationStatus`.
All files remain bounded, and the tests delete their temporary package,
installation, cache, and fictional project even if an assertion fails.
Any manual scratch directories created by the commands above should be
removed after review.

**Boundary:** packaging/installing locally from our reviewed source is not
npm publishing or independently verified customer adoption. An offline PASS
does not prove any real MCP project's safety, endpoint ownership, operator
consent, or authorization. No DNS/TLS/SSRF checks, OAuth, credentials,
arbitrary stdio, live MCP calls, or user-target contact are involved.


## M6-A — first-run project quickstart (inert descriptor only)

Use **one command** to verify the *shape* of a local MCP project descriptor
and run the suite's five **built-in fictional contract controls**. The
descriptor is validated but **never executed**. The project hostname and
stdio command are neither contacted nor started.

From the source root (Node.js 20/22):

```sh
node src/cli.mjs adapter-quickstart examples/adapter-profiles/streamable-http-project.json
```

Or on Windows PowerShell 7, using the reviewed local checkout:

```powershell
& node '.\src\cli.mjs' adapter-quickstart '.\examples\adapter-profiles\streamable-http-project.json'
if ($LASTEXITCODE -ne 0) { throw 'Offline descriptor quickstart failed' }
```

A **PASS** (exit 0) means the descriptor obeys validate-only syntax and
each of the five code-owned *fictional* controls matched its expected
outcome. It does **not** mean a server, token, project configuration,
vulnerability or user authorization was checked. The intentional
`denied-effect-negative` scenario has `fictionalObservedStatus:FAIL`
and `controlStatus:PASS`: the tool correctly detects the seeded failure.
A broken built-in control exits **1**. A malformed, missing, oversized
(above 4096 bytes), unauthorized or direct-symlink descriptor exits
**2** with a generic error. This command does not accept custom
events, logs, URL flags or executable commands.

The JSON-v1 report contains a `controls` table of **symbolic** case IDs,
fixed explanations and ordered `nextActions`. It always shows
`projectSafetyAssessed:false`, `executionEnabled:false`,
`connectionStatus:NOT_ATTEMPTED`, and
`authorizationStatus:REAL_TARGET_EXECUTION_NOT_AUTHORIZED`.
The five controls are **not project-specific**. To test your own invented
Boolean action assertions offline, use the separately bounded
`adapter-synthetic-trace` and `adapter-trace-expect` modes.

**No real MCP server is contacted.** Do not use the report as an audit
certificate, a connection grant, or external-target permission; gates
[#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
[#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
and [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
remain separate.


## M6-B — guided fictional adopter kit (one selector, no server contact)

From a checked-out source tree using Node.js 20/22, **select only one of
`stdio` or `streamable-http`**. This **single command produces a
JSON-v1 starter plan**, not a script or executable integration:

```sh
node src/cli.mjs adapter-kit streamable-http > fictional-kit.json
```

For Windows PowerShell 7 use:

```powershell
& node '.\src\cli.mjs' adapter-kit streamable-http > fictional-kit.json
if ($LASTEXITCODE -ne 0) { throw 'Offline kit generation failed' }
```

All data is reviewed **fictional example** data. Its `starterDescriptor`
contains a literal placeholder HTTPS endpoint or stdio program name, but
the generator never uses those fields to make a network/process call.
The generated `plan` lists three fixed filenames and checks. The
`humanSummary` is static text; no user input or private project settings
are interpolated into it.

To save the **three reviewed JSON objects** from the plan in a disposable,
fictional working directory (Node 20/22; the same command runs in Bash and
PowerShell 7), run this command while `fictional-kit.json` is in the
current directory:

```sh
node --input-type=module -e "import {readFileSync,writeFileSync} from 'node:fs';const k=JSON.parse(readFileSync('fictional-kit.json','utf8'));for(const [n,v] of [['fictional-descriptor.json',k.starterDescriptor],['fictional-clean-ci.json',k.cleanExpectation],['fictional-negative-ci.json',k.expectedViolation]])writeFileSync(n,JSON.stringify(v));"
```

Run these **fixed offline commands** from that same directory, using an
absolute path to your checkout's `src/cli.mjs` if not at the source root:

```sh
node src/cli.mjs adapter-quickstart fictional-descriptor.json
node src/cli.mjs adapter-trace-expect fictional-clean-ci.json
node src/cli.mjs adapter-trace-expect fictional-negative-ci.json
```

From a separate locally installed prerelease tarball, instead use
`node <installed-package-path>/src/cli.mjs ...`, without any npm registry
access. Run `node examples/offline-ci-check.mjs` **from the checked-out
source root only** for the additional fixed portable CI smoke.
For CI integration, run both `adapter-trace-expect` assertions in your
trusted Node 20/22 CI job after placing these locally generated **fictional**
files into that job's workspace. Both expected matches exit **0**; malformed
input exits **2** and an unexpected symbolic mismatch exits **1**.

The three safe distinctions are:
- `adapter-quickstart` PASS = local descriptor shape and five fixed
  fictional controls, **not the project's safety**.
- `fictional-negative-ci.json` expects
  `observedSafetyStatus:FAIL` together with
  `expectationStatus:MATCH` and CLI exit 0. The seeded violation did
  happen in invented records, and the test correctly recognized it.
- Real MCP server execution/ownership/provenance remains
  `REAL_TARGET_EXECUTION_NOT_AUTHORIZED`, `NOT_ATTEMPTED` and
  `projectSafetyAssessed:false`, regardless of any green result.

**No real MCP server, production code, credentials, shell scripts, private
logs, network requests or external customer targets are processed by the
kit generator.** It does not create or modify files; the optional
copy/paste extraction command shown above writes only three local fictional
JSON objects at explicitly fixed filenames. This is not independent beta
evidence, authorization or a security certificate. Gates #21, #43 and #59
remain OPEN.


## M6-C — verify a fictional exported starter kit with one CI command

First export an inert, reviewed kit once (from the checked-out source root):

```sh
node src/cli.mjs adapter-kit streamable-http > fictional-kit.json
node src/cli.mjs adapter-kit-verify fictional-kit.json
```

For Windows PowerShell 7, use the exact same local JSON file:

```powershell
& node '.\src\cli.mjs' adapter-kit streamable-http > fictional-kit.json
if ($LASTEXITCODE -ne 0) { throw 'Offline kit export failed' }
& node '.\src\cli.mjs' adapter-kit-verify fictional-kit.json
if ($LASTEXITCODE -ne 0) { throw 'Offline fictional CI gate failed' }
```

In your trusted CI job, after the fictional kit JSON file is already
present in the workspace, **only one command is required to verify it**:

```sh
node src/cli.mjs adapter-kit-verify fictional-kit.json
```

When called outside the source directory, use the **absolute path to the
installed local npm package's** `src/cli.mjs`. No registry, real project
server or target-connecting workflow is used. The command reads at most
**16 KiB**, rejects direct symlinks, duplicate JSON keys, malformed
UTF-8, extra fields and any modification to the code-owned fictional
kit. It never imports customer logs, executes descriptor commands or
contacts their placeholder endpoints.

The verifier recalculates **three fixed symbolic controls**: descriptor
shape and five internal fictional checks, clean symbolic CI, and the
deliberately broken synthetic-denial case. A successful last check shows
`observedSafetyStatus:FAIL` and `expectationStatus:MATCH`;
this is **correct detection of an invented violation**, not a real-world
safety PASS.

CLI exit **0** = exact fictional kit structure and CI controls matched;
exit **1** = a fixed internal control mismatch; exit **2** = invalid
input, unreadable file or unsupported argument. The `status:PASS`
report still contains `projectSafetyAssessed:false`,
`independentOriginVerified:false`,
`authorizationStatus:REAL_TARGET_EXECUTION_NOT_AUTHORIZED`, and
`connectionStatus:NOT_ATTEMPTED`. The verifier does not establish who
created the file, whether a real user ran any checks, or whether a
target's credentials/permissions are valid.

No external MCP targets are authorized, no npm stable release is
published and independent security/beta gates #21/#43/#59 remain OPEN.


## M6-D — portable copy-only GitHub Actions recipe (fictional controls)

The public sample
[`.github/examples/fictional-adopter-ci.yml`](../.github/examples/fictional-adopter-ci.yml)
is **INACTIVE** inside this repository. It is stored under
`.github/examples/`, not `.github/workflows/`, and is excluded from
the reviewed **80-path npm archive**. After reading and approving it,
copy it into your own repository as
`.github/workflows/fictional-mcp-check.yml`. The sample does not
modify this repository, publish a package or require an npm registry
install.

It uses GitHub-hosted **Ubuntu and Windows, Node.js 20 and 22**, with
read-only repository permissions. It separately checks out your adopter
repository and the **public testing-suite source pinned to exact SHA
`e05288d854aef3604fd014ea94ed72503bc13104`**, verifies
`git rev-parse HEAD` and the `0.0.10-rc.1` candidate version.
The two GitHub Actions are individually pinned to reviewed full commit
SHAs, not moving version tags. **GitHub checkout, setup-node, and
CI infrastructure may use the internet** to fetch publicly available
source/toolchain bytes; once those are ready, the scripted contract
checks only local first-party fictional files and never connects to
**any user MCP target**. The source pin is a *historical code identity*,
not a signed, independently audited supply-chain attestation. Changing
the pinned source requires a fresh security and CI review.

The sample's fixed job generates `fictional-kit.json` in a disposable
runner directory, runs `adapter-kit-verify`, and evaluates its three
source-owned checks. It also evaluates fixed clean and intentionally
violated symbolic expectations using `adapter-trace-expect`, and
deliberately submits an *incorrect* expectation to confirm exit code
**1**. A simulated denied write triggers
`observedSafetyStatus:FAIL` with `expectationStatus:MATCH` and exit
**0** when the violation is detected **as expected**. This does not
mean the action would be safe or permitted against a live MCP server.
Invalid or unreadable JSON exits **2**; fixed CI checks that unexpectedly
change must fail the job. Only fixed, nonsensitive messages are printed;
temporary output JSON is deleted with an exit trap. The workflow never
calls `npm install`, `npm ci`, `npm publish`, a real MCP server or a
user-supplied executable.

**Optional fictional developer-authored assertions (separate from the
fixed template).** In a disposable development workspace, you can
author your own *synthetic-only* `adapter-trace-expect` JSON with exactly
the reviewed enum/Boolean event fields. The M6-B exported
`cleanExpectation` is a useful schema example. Start with its copy
and change only the symbolic event `decision`, `effect`,
`ownerAuthorized`, `scopeAuthorized`, `leaseFresh`,
`secretLogged` and matching `expectedStatus`/
`expected[].ruleCodes` values. Do not use private project logs,
actual tool arguments, customer endpoints, tokens, commands, headers
or identifiers. Check it locally with
`node reviewed-suite/src/cli.mjs adapter-trace-expect fictional-contract.json`
from a workspace containing the separately checked-out suite. The
strict CLI reports `MISMATCH` with exit **1** if an otherwise valid
synthetic expectation disagrees with an observed symbolic violation.
The copy-only example does **not** automatically load or collect your
repository's files: adding such an opt-in CI assertion is a separate
reviewed workflow change.

**NOT a security audit.** A green workflow demonstrates only reproducible
**fictional** contract checks; it does not verify your server, your
credentials, independently establish source provenance or make a
certification. Do not use it as a release gate for real MCP effects.
Actual user-target authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
independent security review [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
and real independently submitted beta evidence
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
remain OPEN. Do not invite, authenticate or impersonate a real
participant based on these local examples.


## M6-E — readable explanations alongside existing JSON reports

The reviewed offline CLI still emits **JSON report schema v1**, and its
exit codes are unchanged: **0** means the specified *fictional CI
expectation* matched, **1** means the check or expectation did not match,
and **2** means bad arguments, invalid input or an unreadable file.
For four onboarding commands — `adapter-kit`, `adapter-quickstart`,
`adapter-kit-verify` and `adapter-trace-expect` — the output also
includes a constant-only `readerGuide` object:

- `code`, `title`, `meaning` and two ordered `nextSteps`: fixed
  reviewed explanations that do **not** interpolate event contents,
  project names, paths, endpoints, errors, secrets or actual tool calls.
- `reportScope:FICTIONAL_OFFLINE_ASSERTIONS_ONLY` and explicit
  `realProjectAssessed:false`, `externalMcpContactAuthorized:false`,
  `ownerOperatorVerified:false`, `independentAuditCompleted:false`,
  `independentBetaVerified:false`, `stableReleaseAuthorized:false`.

Use the previously documented source-owned starter JSON to generate a
report:

```sh
node src/cli.mjs adapter-kit streamable-http > fictional-kit.json
node src/cli.mjs adapter-kit-verify fictional-kit.json > fictional-verdict.json
```

On Windows PowerShell 7 the equivalent commands are:

```powershell
& node '.\src\cli.mjs' adapter-kit streamable-http > fictional-kit.json
if ($LASTEXITCODE -ne 0) { throw 'Kit generation failed' }
& node '.\src\cli.mjs' adapter-kit-verify fictional-kit.json > fictional-verdict.json
if ($LASTEXITCODE -ne 0) { throw 'Fictional kit check failed' }
```

Open `fictional-verdict.json` and inspect the `readerGuide` object.
For a normal fictional kit it uses
`FICTIONAL_KIT_CONTRACT_MATCH` — the package's fixed internal controls
match; it does not establish who ran the check or what is safe on a real
MCP target.

Three **different** `adapter-trace-expect` outcomes are important:

| Fictional case | Outer CLI | Observed safety | Reader guidance |
| --- | --- | --- | --- |
| Clean invented events | PASS, exit 0 | PASS | `CLEAN_FICTIONAL_TRACE_MATCH` |
| Correctly detected invented denied write | PASS, exit 0 | **FAIL** | `FICTIONAL_VIOLATION_DETECTED_AS_EXPECTED` |
| Deliberately incorrect expectation | FAIL, exit 1 | **FAIL** | `FICTIONAL_EXPECTATION_MISMATCH` |
| Malformed/unreadable local JSON | ERROR, exit 2 | Not evaluated | `INVALID_OFFLINE_INPUT` |

**Critical:** a CI matcher PASS with `observedSafetyStatus:FAIL` is
*not a safe action*. It means the checker correctly found the planted
violation in invented Boolean events. Unexpected symbolic mismatches
remain nonzero and the guidance tells developers to review only the
allowed symbolic rule codes. Invalid input never becomes a security
finding. Legacy CLI commands and established report fields remain
unchanged; `readerGuide` is an additive convenience field. JSON-v1
output remains suitable for CI automation; the separate opt-in M6-F text view is never emitted by JSON commands;
no user-controlled formatting is enabled.

**This is NOT a real-project audit, privacy/DLP filter or operator
authorization.** It cannot verify that the caller owns an MCP server,
that the test was independently run or that a project is production
safe. Separate gates [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
[#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
and [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
remain open.

## M6-F — opt-in terminal-only view of fictional symbolic expectations

`adapter-report-view <local-expectation-json>` reads **only** a 4 KiB-or-smaller
strict UTF-8 local **fictional symbolic expectation input** (the same
Boolean/enum-only schema as `adapter-trace-expect`). It recalculates the
result from the input using the source-owned offline checker and prints
only fixed `readerGuide` words, verified PASS/FAIL enums, two next steps,
and prominent **FICTIONAL ONLY** / **NOT AUTHORIZED** disclaimers.
It does **not** read arbitrary saved CLI reports, unknown logs, customer
traces or certificates. In particular, a self-declared `status:PASS` or
`readerGuide` in a JSON file is rejected as invalid rather than displayed.

From an already checked-out copy, with Node.js 20+ and no npm install,
prepare source-authored fictional inputs (Bash and PowerShell 7 both accept
these lines; no shell execution occurs inside the output):

```sh
node src/cli.mjs adapter-kit stdio > fictional-kit.json
node -e "const f=require('node:fs');const k=JSON.parse(f.readFileSync('fictional-kit.json','utf8'));f.writeFileSync('fictional-clean.json',JSON.stringify(k.cleanExpectation));f.writeFileSync('fictional-negative.json',JSON.stringify(k.expectedViolation));const m=structuredClone(k.expectedViolation);m.expectedStatus='PASS';m.expected[0].ruleCodes=[];f.writeFileSync('fictional-mismatch.json',JSON.stringify(m));"
node src/cli.mjs adapter-report-view fictional-clean.json
node src/cli.mjs adapter-report-view fictional-negative.json
```

The first human view exits **0** with `CI expectation: MATCH` and
`Observed fictional safety: PASS`. The second also exits **0**, but
explicitly prints `Observed fictional safety: FAIL`: the invented
denied-write violation was **detected as expected, not deemed safe**.
The next command is an intentionally failing demonstration:

```sh
node src/cli.mjs adapter-report-view fictional-mismatch.json
```

It prints `CI expectation: MISMATCH`, `Observed fictional safety: FAIL`
and exits **1**. Missing, malformed, duplicated-key, oversized, unsafe,
direct-symlink or forged report inputs exit **2** with generic fixed
instructions and `Observed fictional safety: NOT EVALUATED`.
Run these from a disposable fictional workspace; do not include actual
private endpoints, project logs, personal identifiers or credentials.

PowerShell 7 from a checked-out repository on Windows:

```powershell
Set-Location -LiteralPath 'C:\path\to\mcp-agent-security-test-suite'
& node '.\src\cli.mjs' adapter-report-view '.\fictional-clean.json'
if ($LASTEXITCODE -ne 0) { throw 'Fictional clean check failed' }
& node '.\src\cli.mjs' adapter-report-view '.\fictional-negative.json'
if ($LASTEXITCODE -ne 0) { throw 'Expected fictional violation check failed' }
```

For **CI and machine consumers**, keep the original JSON contract:
`node src/cli.mjs adapter-trace-expect fictional-clean.json` and check
its JSON-v1 `status`, `readerGuide`, `observedSafetyStatus` and exit
code. The new view is strictly opt-in and outputs **human text only**, never
JSON or ANSI terminal control codes. Existing JSON commands and their
exit codes are unchanged. The installed offline npm-tarball smoke and
source tests exercise both `stdio` and `streamable-http` examples
under Windows/Ubuntu Node20/22.

**FICTIONAL ONLY:** a green result is NOT an assessment of any real
MCP target, project, code, network, or owner. Operator approval was NOT
verified; independent security review and genuine beta were NOT completed;
external MCP contact, arbitrary process execution and stable npm publication
remain unauthorized. Gates [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
[#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43),
and [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
remain OPEN.
