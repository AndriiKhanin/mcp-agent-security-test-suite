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

## M4-B7-A — fixed modern local adapter staging (engineering CI pending)

For a **separate**, explicit first-party-only smoke test, run `node src/cli.mjs adapter-staging-selftest` without any arguments. The new internal `createFixedModernStagingAdapter()` uses `connect()` (**state change only, no network**), one `probe()` over the already reviewed `runFirstPartyStagingSelftest()` with a fixed `127.0.0.1:0` listener and MCP 2026-07-28 `server/discover`, and terminal `close()`. The implementation uses no user-provided descriptor or address, supports only a fixed first-party mocked request and always denies external targets. Direct test-only fault selectors are not CLI inputs.

The JSON-v1 report uses `connectionStatus: "FIXED_FIRST_PARTY_STAGING_ONLY"`, `adapterDescriptorUsed: false`, `projectConnectionAuthorized: false`, `externalTargetContacted: false`, `osSandboxed: false`, and a symbolic `socketCleanupConfirmed`. The latter checks the existing Node TCP socket-close observation (not OS/kernel tracing), and a missing resource acknowledgment fails closed. This is **not** actual customer MCP interoperability, credential management, TLS/DNS/SSRF control, target ownership verification or a security certification. `inspectProjectAdapter()` and `adapter-check` remain unchanged: they cannot initiate network/process effects or interpret a config PASS as authorization. Existing 80-path package inventory and independent release gates are preserved.
