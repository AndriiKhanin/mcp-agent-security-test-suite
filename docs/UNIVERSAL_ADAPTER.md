# Universal MCP project adapter — configuration-only preview (M4-B0)

**Status: Stage 1 — safe descriptor checking, NOT a working connection.** Tracking: [#61](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/61). The adapter is **not specific to Stable Bridge**. It is a public, project-neutral contract that can later be used by opt-in, reviewed transport clients. No external target, arbitrary executable, credentials, OAuth, tool invocation or remote scanning is currently authorized or performed.

## Single command for the developer

With Node.js >=20 and a public checkout:

```sh
node src/cli.mjs adapter-check examples/adapter-profiles/stdio-project.json
node src/cli.mjs adapter-check examples/adapter-profiles/streamable-http-project.json
```

Both examples produce CLI JSON report schema `1` with `command: "adapter-check"`, `status: "PASS"`, `connectionStatus: "NOT_ATTEMPTED"` and `executionEnabled: false`. **PASS means only that the configuration is structurally acceptable; nothing is contacted and the user does not yet have a connected project.** Invalid schema, unexpected fields, unsafe flags, unapproved URL formats and other errors return a generic `ERROR` report, exit 2. Paths, command text, endpoints, token values and parser exceptions are never copied into diagnostics. The existing CLI output model is not a comprehensive secret scanner.

### Example — a local stdio project descriptor

```json
{
  "adapterSchemaVersion": 1,
  "project": {"name": "my-local-mcp"},
  "transport": {"type": "stdio", "command": "node", "args": ["server.mjs"]},
  "protocolVersion": "2026-07-28",
  "policy": {
    "mode": "validate-only",
    "allowNetwork": false,
    "allowProcessSpawn": false,
    "allowToolCalls": false,
    "allowCredentials": false
  }
}
```

This is **inert configuration**. The `node server.mjs` command is never spawned or evaluated. Command names must be simple basenames, argument strings are length-bounded and known token/secret/evaluation flags are rejected. Do not put private filesystem paths, credentials or personally identifiable information into public examples.

### Example — a Streamable HTTP staging descriptor

```json
{
  "adapterSchemaVersion": 1,
  "project": {"name": "my-mcp-api"},
  "transport": {"type": "streamable-http", "endpoint": "https://mcp.example.org/mcp"},
  "protocolVersion": "2026-07-28",
  "policy": {
    "mode": "validate-only",
    "allowNetwork": false,
    "allowProcessSpawn": false,
    "allowToolCalls": false,
    "allowCredentials": false
  }
}
```

Use `mcp.example.org` **only as an illustrative public hostname**. The validator accepts narrowly shaped HTTPS URLs with ASCII domain labels and a literal path but rejects credentials in URLs, query strings, fragments, IP literals, loopback names, ambiguous encodings, unusual ports and certain internal-use DNS suffixes. **This offline syntactic check cannot establish ownership, DNS safety, TLS trust, routing validity or the safety of actually connecting.** DNS rebinding and SSRF defenses must run at *connection time*, not merely when parsing JSON.

## Portable adapter contract and future implementation

The public module `src/project-adapter.mjs` exposes `inspectProjectAdapter()`, `ADAPTER_TRANSPORTS` and `ADAPTER_PROTOCOLS`. A valid descriptor selects either `stdio` or `streamable-http` but contains no dynamic code, transport execution permission or credential material. Custom future transports must get their own reviewed implementations and negative tests; this preview does not automatically activate plugin code.

The owner-approved next engineering phase should build separate reviewed transport drivers with a **uniform response interface**, consent and exact method/endpoint allowlists, per-request bounds, state-machine version rules, no uncontrolled child process, no redirects or inherited proxy credentials, DNS resolution pinning and a strict refusal path. A real stdio project requires a reviewed executable-launch boundary; an HTTP project requires separately approved network/TLS/SSRF controls and target ownership verification. Never infer those rights from a `PASS` or `allowNetwork` flag.

Official references: [2026-07-28 MCP transport overview](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/index.mdx), [2026-07-28 HTTP transport](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/streamable-http.mdx), [M4 authorization RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md). Legacy 2025-11-25 config designation is accepted for future design only; no claim of verified version interoperability.

**Separate open gates:** [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21) M4-B real-target authorization, [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) independent security/provenance, [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) independent beta feedback. Stable release and npm publication remain unapproved.

## Local transport drivers (M4-B1)

The [local driver interface](LOCAL_ADAPTER_DRIVERS.md) adds `adapter-selftest` to exercise only two **fixed first-party** stdio/loopback mocks via `connect/probe/close`. It does not connect the project described by `adapter-check`; project profiles remain inert. Real user-project runtime connections require separate approval.

## Separate offline consent policy (M4-B2)

The [M4-B2 policy preview](ADAPTER_CONSENT_POLICY.md) checks a self-asserted, short-lived grant against the **exact** canonical project descriptor SHA-256, method and expiry in memory. It is never a signed operator grant and always returns `operatorVerified: false`, `executionEnabled: false` and `connectionStatus: "NOT_ATTEMPTED"`. An example expired claim is included for a deliberately denied CLI run. A future real transport needs independently verified authority and network/host safeguards.

## M4-B0 engineering acceptance — 2026-10-23

The configuration-only preview passed [PR #62](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/62) and [post-merge main CI #39962836679](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39962836679): **4/4 PASS, 397/397 tests per Windows/Ubuntu Node20/22 job**, no failures/skips. No live target contact or independent review is claimed. The next locally safe first-party driver layer is tracked in [M4-B1 #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63).

## Fixed local transport driver acceptance

[M4-B1 #63](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/63) and [main CI #39966437277](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39966437277) confirm **4/4 PASS, 407/407 tests/job**. The no-argument local driver selftest is not a connection to the project given to adapter-check. Offline consistency rules were accepted under [M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66) via [main CI #39972783779](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39972783779): 4/4 PASS, 417/417 tests/job. Mock-only authorization-enforcement design is next under [M4-B3 #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69). Real target execution remains unapproved.

## M4-B7-A — fixed modern local adapter staging (engineering accepted)

For a **separate**, explicit first-party-only smoke test, run `node src/cli.mjs adapter-staging-selftest` without any arguments. The new internal `createFixedModernStagingAdapter()` uses `connect()` (**state change only, no network**), one `probe()` over the already reviewed `runFirstPartyStagingSelftest()` with a fixed `127.0.0.1:0` listener and MCP 2026-07-28 `server/discover`, and terminal `close()`. The implementation uses no user-provided descriptor or address, supports only a fixed first-party mocked request and always denies external targets. Direct test-only fault selectors are not CLI inputs.

The JSON-v1 report uses `connectionStatus: "FIXED_FIRST_PARTY_STAGING_ONLY"`, `adapterDescriptorUsed: false`, `projectConnectionAuthorized: false`, `externalTargetContacted: false`, `osSandboxed: false`, and a symbolic `socketCleanupConfirmed`. The latter checks the existing Node TCP socket-close observation (not OS/kernel tracing), and a missing resource acknowledgment fails closed. This is **not** actual customer MCP interoperability, credential management, TLS/DNS/SSRF control, target ownership verification or a security certification. `inspectProjectAdapter()` and `adapter-check` remain unchanged: they cannot initiate network/process effects or interpret a config PASS as authorization. Existing 80-path package inventory and independent release gates are preserved.

[M4-B7-A engineering acceptance](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/97): [merged PR #98](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/98), main commit `a143cabf238d06dd7102957587eb8bd1d9ea2947`. [PR CI #40007557534](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40007557534) and [post-merge main CI #40007735850](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40007735850): **4/4 PASS, 539/539 tests/job, 0 failed/skipped** (Windows/Ubuntu × Node20/22; logs reviewed). Thirteen developer-only tests added without changing the **80-path** npm package manifest. This is local engineering evidence, not independent review or approval for real user targets.

## M4-B7-B — project-neutral onboarding evidence (engineering CI pending)

Use `node src/cli.mjs adapter-onboard examples/adapter-profiles/streamable-http-project.json` for a **pure offline** onboarding preview of a narrowly validated project descriptor. It returns schema `readinessSchemaVersion: 1`, `descriptorEvidence: "DESCRIPTOR_VALIDATED"`, `stagingEvidence: "FIRST_PARTY_STAGING_NOT_ATTEMPTED"`, `targetEvidence: "REAL_TARGET_NOT_ATTEMPTED"`, `operatorEvidence: "OPERATOR_NOT_VERIFIED"` and `readinessStatus: "REAL_TARGET_NOT_AUTHORIZED"`. This action **never** performs network, DNS, process spawning, credentials reading, or project-side actions.

Only after a **separate** explicit command `node src/cli.mjs adapter-onboarding-demo`, the program internally constructs a fixed **fictional** descriptor and probes **our own ephemeral 127.0.0.1 MCP 2026-07-28 server/discover**. Its literal `stagingEvidence: "FIRST_PARTY_STAGING_PASS"` does not prove connectivity to or ownership of the project from the offline preview. It always reports `REAL_TARGET_NOT_ATTEMPTED`, `OPERATOR_NOT_VERIFIED`, `REAL_TARGET_NOT_AUTHORIZED` and false execution authority. This command takes **no arguments**. `adapter-policy-check` remains a **separately invoked** unsigned self-asserted simulated consent check; even a PASS is never operator verification. No stage result is accepted from a user JSON field. No external/user MCP URL is fetched or even resolved.

Next steps: review a fictional profile, optionally review the deliberately expired fictional consent claim, optionally run the independent owned staging demo, then stop. Actual live connection needs separate verified target ownership, scoped operator approval and security/egress review under [real-target RFC #21](M4_AUTHORIZED_INTEGRATIONS_RFC.md). These preview outcomes are not security certification or release approval. All text in reports is literal/categorical (only the allowlisted transport/version labels are copied from a validated schema); raw filenames, endpoints, commands, tokens and user-provided project names are never reported.

### M4-B7-B engineering acceptance — 2026-10-24

[Issue #100](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/100) accepted via [merged PR #101](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/101), source main commit `d2bd054971244896334ee6e3ca1d3c0f1effa254`. [PR CI #40072230569](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40072230569) and [post-merge main CI #40072318839](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40072318839): **4/4 PASS, 554/554 tests per Windows/Ubuntu Node20/22 job, 0 failed/skipped**, each job log inspected. Adds 15 development-only readiness/consent/negative-scope tests, keeps the exact reviewed **80-file** package inventory and pre-existing R2/R5 checks. The onboarding output makes no claim of operator verification, real target permission, full MCP conformance, independent security audit, or release readiness.

## M4-B7-C — safe static template selection (engineering accepted)

`adapter-template stdio|streamable-http` returns a **fixed, fictional descriptor** under `template`, checked with the unchanged `inspectProjectAdapter()` grammar. No user-provided host, path, executable, env var, credential or network policy can influence its contents. It reports `FICTIONAL_TEMPLATE_VALIDATED`, `REAL_TARGET_NOT_ATTEMPTED`, `OPERATOR_NOT_VERIFIED`, `REAL_TARGET_NOT_AUTHORIZED`, `NOT_ATTEMPTED` and all false execution/authorization booleans. This is not a connection or a verified authorization grant. `adapter-template` never reads/writes a file, runs a command or opens a network socket.

For a safe customer onboarding step, copy only the nested `template` JSON object to a local file and run `adapter-onboard <file>`. The locally generated profile is still **inert**, and `adapter-onboarding-demo` remains an **unrelated** first-party mock. Specific `stdio` / `streamable-http` selectors are the only values accepted; arbitrary user-supplied templates, URLs, commands, file paths and flags fail before reading any input. This leaves the exact 80-path npm release inventory unchanged. [Step-by-step setup](GETTING_STARTED.md).

**M4-B7-C acceptance, 2026-10-24:** [Issue #103](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/103) accepted via [PR #104](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/104), source main `c6076f5533e7590336039f4f8ab588734933d905`. [PR CI #40073341292](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40073341292) and [post-merge main CI #40073451813](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40073451813): **4/4 PASS, 566/566 tests/job on Windows/Ubuntu Node20/22, 0 failures/skips**. Twelve developer-only negative/positive tests, exact **80-path** npm inventory and strict R2/R5 gates retained. No real target, process execution, operator ownership verification, complete MCP conformance, independent review or release is implied.


## M4-B9-A — optional fictional project fixture bundle

`adapter-fixture-audit <local-json-file>` combines an unchanged,
**validate-only** portable descriptor with selection of 1–5 reviewed,
**in-code synthetic** cases: `permission-denial`, `replay-denial`,
`tool-escalation-denial`, `denied-effect-negative`, and `clean-trace`.
The operator can reorder or select those five IDs, not inject raw records,
URLs, commands or execution flags. The CLI reads at most 16 KiB from the
specified local JSON file; it never opens a project MCP socket.

The audit's `PASS` means each fictional positive/negative control produced
its built-in expected outcome. An expected broken case detected as FAIL is
a correctly functioning **negative control**, not a real vulnerability
discovered in the named project. Output includes symbolic per-case detection,
`DESCRIPTOR_VALIDATED`, `OFFLINE_FIXTURE_EVALUATED`, and permanent
`REAL_TARGET_EXECUTION_NOT_AUTHORIZED`. The name/URL/process descriptor
is **not** included in reports. This is not a security certification, a
live scanner, operator verification, DLP or permission to execute user code.
See [the exact copy/paste example](GETTING_STARTED.md).


## M4-B9-B — developer-authored symbolic traces, not live transcripts

The separate `adapter-synthetic-trace <symbolic-trace-file>` CLI is an
opt-in offline profile, `user-authored-synthetic-only`, which reads a
maximum 4096-byte local JSON object with a **validate-only descriptor**
and 1–8 symbolic decision/effect event records. Each event contains only
two small string enums (`ALLOW`/`DENY`, `NONE`/`READ`/`WRITE`)
and four booleans. No command, host, URL, identity, scope name, tool name,
payload, argument, header, token, raw transcript or external fixture
reference is allowed in events.

The existing pure `auditRecords` enforces denied-effect, unauthorized-effect,
stale-lease and caller-flagged-secret invariants. Its symbolic PASS/FAIL is
**separate** from the fixed-control `adapter-fixture-audit` PASS (which may
include an intentionally broken native control that is correctly detected).
Reports omit input record fields, free text and descriptor details. A
`DENY` with `NONE` is a correct symbolic denial, whereas `DENY`
with `WRITE` is a failed safety control. No replay correlation can be
inferred from anonymous booleans. See [copy/paste instructions](GETTING_STARTED.md).

The new API cannot read a real MCP transcript, invoke a tool, authenticate
the operator, contact a user server or grant any network/process permission.
`REAL_TARGET_EXECUTION_NOT_AUTHORIZED` and `executionEnabled:false`
remain invariant even when synthetic tests pass.


## M4-B9-C — exact synthetic expectation matching for CI

Use `adapter-trace-expect <local-json-file>` to verify explicitly
specified symbolic rule codes at every ordinal event of an inert
`adapter-synthetic-trace` v1 input. Its wrapper has version 1, mode
`synthetic-expectations-only`, nested `trace`, exact
`expectedStatus` (`PASS` or `FAIL`), and a dense `expected`
array of 1–8 `{event,ruleCodes}` entries. Every index is mandatory,
and each rule must be a uniquely ordered member of the four reviewed
symbolic safety rules. No wildcard, aliases, unexpected rule, sparse
arrays, extra fields, real MCP identifiers or dynamic matcher predicates.

`status` and shell exit code describe **expectation agreement**, not the
underlying safety verdict. `observedSafetyStatus` and
`observedFindings` always preserve the complete synthetic audit output;
`expectationStatus` is `MATCH` or `MISMATCH`. An expected violation
can satisfy CI but is still an observed safety FAIL, never a real
security finding or target authorization. `fixedFixtureControls:NOT_RUN`
prevents confusion with earlier baked-in negative controls.

The command reads at most 4096 bytes and never executes/connects using
the validated descriptor. See [reproducible examples](GETTING_STARTED.md).
