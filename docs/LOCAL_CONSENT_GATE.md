# M4-B3 — fixed local mock admission gate

This engineering stage is tracked in [M4-B3 #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69). **It does not connect to a user MCP server or authenticate an owner.** It applies an in-memory **fictional first-party** permission consistency check before running the two existing local mocks.

## Same command, now checked before probing

```sh
node src/cli.mjs adapter-selftest
```

The stable JSON-v1 CLI report still identifies both drivers `stdio` and `streamable-http`, and adds `consentProfile: "fixed-first-party-admission-v1"`, `authorizationStatus: "FIRST_PARTY_SYNTHETIC_ONLY"` and `operatorVerified: false`. On successful local tests each outcome contains `gateStatus: "MOCK_ADMITTED"`. It executes only the fixed repository-owned stdio child and the temporary `127.0.0.1` HTTP ping. The descriptor's illustrative HTTPS hostname is **never resolved** or connected.

## Admission sequence

The `src/local-consent-gate.mjs` module constructs **private, program-generated** fictitious envelopes for the exact built-in mock identities. For each single-shot case:

1. Construct the specific first-party descriptor, known fixed transport, requested method (`initialize` for stdio or `ping` for HTTP), fictional operator and process-local nonce.
2. Before creating any driver, check the bounded offline policy (`src/adapter-consent.mjs`): exact canonical descriptor SHA-256, claimed operator/transport/project, expiry up to five minutes, nonce already observed and permitted method. The local fixture uses a 30-second grant.
3. Separately match the descriptor, method and claimed operator against **literal first-party mock identity**, without trusting a client-supplied JSON grant.
4. On denial, return a bounded symbolic FAIL: `connectionStatus: "NOT_ATTEMPTED"`, `driverCreated: false`, `mockProbeAttempted: false` and `executedFirstPartyMock: false`. The code returns **before** constructing a driver, opening a loopback socket or spawning the mock worker.
5. Only for internally admitted fixed mocks, create the existing bounded first-party driver; connect, probe once and close in a `finally` block.

The public test helper `runGatedFixedMockCase` supports a **finite set of first-party synthetic fault selectors only**: `revoked`, `expired`, `wrong-project`, `wrong-operator`, `wrong-method`, `changed-descriptor`, `replay` and `forbidden-method`. No caller-supplied descriptor, URL, executable path, custom method, credentials or raw MCP payloads can be used. A test can provide a process-local replay Set or a synthetic time override; **neither is real-world authorization**. Negative controls assert zero attempted mock effects. The direct lower-level `createFirstPartyDriver()` remains an intentionally unprivileged test utility, not a comprehensive security boundary for arbitrary code running in the Node process.

## Critical limitations

- **Synthetic, not authenticated:** an in-memory example does not prove control of a user-owned project. A self-computed SHA-256 is not a signature. This gate must **never** be reused as real authorization.
- **Not an OS sandbox:** the fixed child and loopback server run with ordinary user privileges. Code in the same process can directly call low-level test harnesses. This validates intended call ordering, not prevention of arbitrary host activity.
- **No real target:** `adapter-check` and `adapter-policy-check` still do not connect; even their PASS states leave `connectionStatus: "NOT_ATTEMPTED"` and `executionEnabled: false`.
- **No persistent anti-replay:** only a caller-supplied in-memory Set detects simulated nonce reuse in one process.
- **No real security certification:** these tests assess only first-party, MCP-shaped fictional exchanges.

An actual portable stdio or Streamable-HTTP connection requires separately approved target ownership evidence, authenticated operator grants, durable revocation/replay protection, strict target/method allowlists and reviewed OS/TLS/DNS/SSRF/credential controls. See [M4 authorization RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md), [M4-B2 permission preview](ADAPTER_CONSENT_POLICY.md), and independent [R5-B review #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43). Candidate remains `0.0.10-rc.1`; no stable release or real MCP contact is authorized.
