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

## M4-B4 test-only transport-attempt observation (ACCEPTED)

A reviewable, in-process `AsyncLocalStorage` instrumentation seam attaches **only when a trusted in-repository test calls** `observeFirstPartyMockAttempts(run)`. It records fixed symbolic attempts **at real first-party source call sites**, not fields from the authorization result: `driver-probe` at the driver probe entry, `stdio-spawn` immediately before the first-party worker `spawnSync`, `http-bind` immediately before `server.listen`, and `http-request` immediately before the fixed loopback `http.request`. Rejected mock admissions are expected to yield **zero observed attempts**. Positive controls must observe the expected events when the fixed mocks actually run. Concurrent tests have isolated scopes.

This improves source-level evidence over M4-B3's self-reported flags, but does **not** instrument kernel process creation, network syscalls, other modules or external activity. The observer records no addresses, ports, credentials or messages and does not appear in CLI JSON; raw external profile objects cannot register it. Arbitrary JavaScript in the same process may invoke the separate low-level drivers and bypass the admission helper. The observer itself neither prevents nor authorizes effects.

## Critical limitations

- **Synthetic, not authenticated:** an in-memory example does not prove control of a user-owned project. A self-computed SHA-256 is not a signature. This gate must **never** be reused as real authorization.
- **Not an OS sandbox:** the fixed child and loopback server run with ordinary user privileges. Code in the same process can directly call low-level test harnesses. This validates intended call ordering, not prevention of arbitrary host activity.
- **No real target:** `adapter-check` and `adapter-policy-check` still do not connect; even their PASS states leave `connectionStatus: "NOT_ATTEMPTED"` and `executionEnabled: false`.
- **No persistent anti-replay:** only a caller-supplied in-memory Set detects simulated nonce reuse in one process.
- **No real security certification:** these tests assess only first-party, MCP-shaped fictional exchanges.

An actual portable stdio or Streamable-HTTP connection requires separately approved target ownership evidence, authenticated operator grants, durable revocation/replay protection, strict target/method allowlists and reviewed OS/TLS/DNS/SSRF/credential controls. See [M4 authorization RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md), [M4-B2 permission preview](ADAPTER_CONSENT_POLICY.md), and independent [R5-B review #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43). Candidate remains `0.0.10-rc.1`; no stable release or real MCP contact is authorized.

## Engineering acceptance (2026-10-23)

[M4-B3 #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69) merged in [PR #71](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/71), commit `6da94f4f74168d621af0563bd83c913530de8e97`. [Post-merge main CI #39979727977](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39979727977): **4/4 PASS, 428/428 tests per Windows/Ubuntu Node20/22 job**, 0 failed/skipped. The exact package path lock became **71** files. The initial PR CI exposed a legacy non-gated selftest entrypoint, which was rerouted and verified without removing tests. This accepted engineering evidence is **not** an OS process/socket trace, independent reviewer audit, or verified external project permission. Further [M4-B4 #72](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/72) focuses on independently observed mock-denial effects.

## M4-B4 acceptance (2026-10-23)

[M4-B4 Issue #72](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/72) completed via [merged PR #74](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/74), main commit `0f3c7f9af80386c48736ce3a985d7cb732e70969`. The [PR CI #39983052573](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39983052573) and [post-merge CI #39983335810](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39983335810) passed **4/4 Windows/Ubuntu × Node 20/22 jobs**, **438/438 tests per job**, **0 failed or skipped**; individual job logs were inspected. Exact reviewed package inventory **71→72** paths.

The simulated pre-effect denials cause **zero observed first-party mock attempt events** in the instrumented code paths, while admitted tests emit positive events. This is stronger than returned booleans but it is still an *in-process test observation*, **not an operating-system audit**, a proof that no activity occurred anywhere in the host or a real MCP target security certificate. No user-owned target, credential handling, remote transport or publication was enabled.
