# M4-B2 — offline operator consent consistency (NOT real authorization)

Stage: [M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66). This is a **portable, non-executing policy preview**, not a real target connector or trusted grant verifier.

## Try the denied example

```sh
node src/cli.mjs adapter-policy-check examples/adapter-profiles/consent-expired.json
```

Expected: JSON CLI schema v1, `status: "FAIL"`, exit code **1**, with `ADAPTER_GRANT_EXPIRED_OR_INVALID`; `executionEnabled: false`, `operatorVerified: false`, `authorizationStatus: "UNVERIFIED_SELF_ASSERTION"`, and `connectionStatus: "NOT_ATTEMPTED"`. The example deliberately carries **fictional** and expired claim data. No network calls, DNS, process spawn, credential access or MCP tool invocation occurs.

A real operator would use a **private**, out-of-repository file with a separately approved authenticated authorization mechanism. The included `claim` values are **self-assertions, not cryptographic signatures** and **cannot authorize a connection**, even when the consistency result is PASS. The public JSON demo should never be mistaken for an access credential.

## Policy envelope v1

An input file has exactly four top-level keys: `policySchemaVersion: 1`, `descriptor` (the existing strict M4-B0 project schema), `request` and `claim`.

- `request`: exact `project` name, `transport` (`stdio` or `streamable-http`), `method` (`initialize` or `ping` only), and `operatorId`.
- `claim`: matching `operatorId`, `transport`, a lowercase 64-hex `projectFingerprint` SHA-256 of the **canonical validated descriptor**, a non-empty subset of `methods`, integer `issuedAt` and `expiresAt` as Unix milliseconds, a single-use `nonce` and `revoked: false`. The maximum validity interval is **five minutes**. Missing fields, unknown keys, malformed timestamps, unknown methods and unsafe descriptors return a generic `ERROR` without disclosing contents.
- On an otherwise valid envelope the evaluator emits PASS only for internally consistent identity, method, non-revoked and non-expired metadata; an expired/revoked/mismatched request emits FAIL and an exact symbolic rule. These are **simulated admission outcomes**, never proof of the operator's identity or lawful ownership.
- The optional in-memory `seenNonces` parameter detects replays within **one evaluator process only**. It is **not durable**, not an independent replay store and not automatically persisted across CLI launches. The CLI always uses the current process clock and does not accept a caller-provided `nowMs` input field. A self-asserted timestamp can still be forged; an actual runtime must use server-side trusted expiration, authenticated proof and durable anti-replay enforcement.

The canonical SHA-256 binds the normalized ordered descriptor fields, protocol, transport and arguments. It protects against accidental mismatch only; **it is not a signature or an ownership attestation**. A malicious caller may recompute the hash and fabricate a claim.

## Security gates for real use

Actual connection requires a new reviewed stdio/HTTP driver bound to explicit ownership approval, transport identity and method allowlists, OS process/network/DNS/TLS/SSRF safeguards, safe credential handling, persistent grant source + revocation, and independent security review. No `tools/call`, `resources/read`, mutation or arbitrary capability is supported by this preview. The existing `adapter-check` remains a nonconnecting descriptor validator, and `adapter-selftest` still runs only first-party mocks.

[Real integration authorization RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md) · [M4-B0 configuration guide](UNIVERSAL_ADAPTER.md) · [Independent security gate R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43). Candidate remains `0.0.10-rc.1`, unpublished as stable.

## M4-B2 engineering acceptance — 2026-10-23

[M4-B2 #66](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/66) was merged in [PR #68](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/68); [post-merge main CI #39972783779](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39972783779) confirmed **4/4 PASS, 417/417 tests per Windows/Ubuntu Node20/22 job**, 0 failed/skipped. The reviewed exact archive grew **66→69**. This is engineering acceptance of non-executing, self-asserted consistency rules only, NOT verified authorization. [M4-B3 #69](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/69) is the next first-party mock-only enforcement task.
