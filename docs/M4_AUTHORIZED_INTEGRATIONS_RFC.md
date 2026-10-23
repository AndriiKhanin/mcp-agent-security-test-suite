# RFC M4-00 — Authorized MCP integration testing: architecture and approval gates

**Status:** PROPOSED / DESIGN ONLY — **NOT APPROVED FOR IMPLEMENTATION**  
**Issue:** [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21)  
**As of:** 2026-10-23  
**Product:** the independent MIT [MCP Agent Security Test Suite](../README.md)

> This document is a safety/architecture proposal. It creates **no network-capable code, no new privileges, no secrets integration, no deployment, no paid API usage**, and **no permission to probe any real MCP endpoint**. M1–M3 remain offline synthetic. Explicit maintainer approval is required before implementation begins.

## 1. Why this milestone exists

The present project offers 330 developer-authored **synthetic** contract tests, structured CLI JSON reports, independent golden negative controls, and a fixed first-party stdio batch mock. These are useful for reproducible security regression design but **do not demonstrate actual MCP interoperability or real-world target safety**.

M4's proposed value is an evidence-based *pre-deployment diagnostic* for an operator's **own staging/sandbox MCP servers**, with a narrow, explicitly consented discovery profile at first. Later, independently reviewed capabilities could compare an endpoint's observed responses with declared, operator-approved security expectations. The tool must never silently turn a fictional test into a production scanner.

## 2. Versions and protocols must remain explicit

Do **not** treat the project's fictional negotiation fixtures as normative MCP protocol coverage.

| Profile | Transport and observed constraints | RFC decision |
| --- | --- | --- |
| Offline existing tests | Strict synthetic JSON-RPC and local JSONL, fixed worker/mock | **Already implemented**. Leave safe-by-default; no network |
| Legacy MCP 2025-11-25 or earlier | Supports stdio and Streamable HTTP with legacy initialization/session considerations | **Future separate conformance fixtures**, never silently infer modern behavior from a legacy error |
| MCP 2026-07-28 | Modern stateless core; different Streamable HTTP routing, no legacy standalone GET stream or protocol-level sessions | Prefer as a **new, explicitly pinned** future profile after authorization |
| Later revisions | Unknown | Default **deny** until independently scoped and tested; do not automatically negotiate broader behavior |

For 2026-07-28, distinguish modern header-based negotiation/error handling from legacy initialization. New client implementations need version-specific tests rather than permissive fallback. The current mock's label `2025-06-18` is fictional and does not certify legacy protocol interoperability.

**Normative source references for review (not implementation dependencies):**
- [Official MCP 2026-07-28 specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/index.mdx)
- [Official 2026-07-28 Streamable HTTP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/streamable-http.mdx)
- [Official 2026-07-28 authorization security considerations](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/authorization/security-considerations.mdx)
- [Official MCP security best practices](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/tutorials/security/security_best_practices.mdx)

## 3. Threat model, parties and boundaries

**Operator:** a human or authorized organization controlling the target, able to provide a verified environment ownership assertion and explicitly approve the exact test plan. An unchecked text box alone is not independent proof of ownership.

**Untrusted target:** every HTTP response, JSON-RPC error/result, tool descriptor, resource link, redirect and capability claim. Do not execute/interpret tool descriptions as instructions. Discovery itself may have side effects on a malicious endpoint; never claim it is zero-risk.

**Untrusted network:** DNS answers, HTTP proxies, TLS boundary, HTTP redirects, cross-origin URLs, metadata endpoints, changing IPs, resource exhaustion. DNS resolution at configuration time alone does not prevent rebinding at connection time.

**Untrusted local environment:** inherited proxy variables, environment tokens, credential stores and local files. Do not pass them to remote clients or children. JavaScript process isolation is **not** OS confinement.

**User-facing output:** schema-versioned, bounded and sanitized. Never include raw response bodies, tokens, Authorization headers, internal addresses, path contents, detailed parser exceptions or private server tool schemas by default.

## 4. Proposed phased delivery (all phases subject to approval)

### M4-A: fixed loopback transport *test fixture* — lowest-risk candidate

A first-party fixed HTTP mock bound exclusively to loopback, with a predetermined target, port-selection mechanism and deterministic responses. No arbitrary URL, external DNS, proxy use, credential reading or tool execution. It can validate HTTP message framing and version behavior without touching third-party systems. **Not built yet.** Even opening a localhost listener is an effectful architecture change and requires owner sign-off.

**Gate:** explicit approval for first-party loopback-only traffic; ephemeral binding, limited concurrent connections, strict Origin policy, graceful cleanup, no external network and positive/negative CI on both supported OSes.

### M4-B: explicitly authorized user-owned staging server — future preview

Only after M4-A is qualified, implement one **opt-in**, read-only discovery profile for **one specified operator-controlled staging endpoint** with reviewable config. Start with narrowly scoped protocol/version discovery; no `tools/call`, `resources/read`, mutations, subscriptions, sampling, elicitation, OAuth login or automatic retries. Some discovery methods (`tools/list`, etc.) can reveal sensitive metadata and are postponed until an explicit data-handling decision. An unauthenticated server refusing access is a safe terminal outcome — never auto-escalate scopes.

**Gate:** owner-approved target ownership and operator permission evidence; exact endpoint+method allowlist; reviewed secure HTTP client/TLS/DNS implementation; no automatic redirection; no inherited proxies/credentials; request/byte/time/retry limits; refusal tests for forbidden address spaces and unapproved methods; no logs of server content. **Not built or enabled.**

### M4-C: broader security diagnostics and auth — design remains open

Any OAuth use, signed authorization proofs, customer target access, multiple hosts, privileged tools, persistent user identity or operation mutation requires a **separate architecture and threat review**. Use an audited security library instead of inventing OAuth/token validation. Validate token audience/resource, prohibit token passthrough and prevent confused-deputy behavior. No credential storage or costly service is implied or authorized by this RFC.

## 5. Non-negotiable capability gates

No implementation may claim to satisfy these controls without tests and an architectural review:

| Gate | Required behavior | Mandatory negative controls |
| --- | --- | --- |
| Authorization | Deny by default; named operator ownership and explicit scope/target approval, not inferred from URL | Missing/revoked/mismatched consent prevents *all* contact |
| Exact target | Canonical scheme, host, port and path; verify against configured allowlist before connection and every request | Lookalike hostname, userinfo, alternate port, URL parsing tricks, redirect, cross-host links |
| DNS/network | Approved loopback profile OR separately approved HTTPS staging profile; resolve and pin at connection; no private/link-local/metadata/IPv6 bypass for external profile | Rebinding, IP literal, zone identifier, reserved ranges, DNS change, proxy variables; abort before sensitive requests |
| TLS | HTTPS with ordinary certificate validation and hostname checking for staging; never `rejectUnauthorized:false` | Invalid certificate/hostname and downgrade fail closed |
| Methods and scopes | Exact per-version allowlist, no automatic call of tools/resources or mutation; no permission escalation | Tool suggestions, changed method, unrecognized capabilities, step-up prompts |
| Version negotiation | Modern and legacy profiles implemented separately; strict handling of errors; bounded retry count | Unsupported version, changed retry payload, fallback ambiguity and malformed messages |
| Resources | Absolute deadline, request/response size caps, event caps, concurrency=1 first, bounded DNS/HTTP timers; deterministic cleanup | Hang, oversized response/stream, half-open connection, malformed data |
| Privacy | No parent credentials, proxy env, customer data, raw server content or token exposure; generic redacted findings | Fake canary, Authorization header injection, unsafe URL in diagnostic |
| Isolation | Fixed reviewed native executable/transport only; OS privilege limitations documented; no arbitrary stdio command | User-chosen executable path, shell metacharacters, suspicious filesystem access |
| CI/release | Approved change set, test-first negative controls, 4x Windows/Ubuntu Node20/22 green and post-merge verification | Failing one configuration or missing consent test stops release |

**Important:** even a successful authorization prompt is not an independent audit of ownership; external testing still requires a lawful, documented owner-controlled staging scope. Unsupported features stay disabled, not silently simulated as safe.

## 6. Proposed configuration boundary (illustrative data only)

Do **not** implement this as an executable configuration schema until the decision is accepted:

```json
{
  "profile": "m4-loopback-mock-proposed",
  "enabled": false,
  "target": "fixed-first-party-loopback-only",
  "transport": "http-loopback",
  "allowedMethods": ["protocol-discovery-only"],
  "allowCredentials": false,
  "allowToolExecution": false,
  "allowRedirects": false,
  "maxConcurrentRequests": 1,
  "maxRequests": 4,
  "maxResponseBytes": 32768,
  "deadlineMs": 5000
}
```

This is an **RFC example**, not a supported CLI/API option. An external profile must never accept arbitrary URL or pass-through credentials just because they appear in a JSON fixture.

## 7. Proposed Acceptance Checklist for M4 design and delivery

### Architecture approval — current gate (owner action required)
- [x] Current offline capabilities and limitations documented
- [x] Version-specific transport differences and official reference sources identified
- [x] Phased options and explicit no-contact boundaries documented
- [x] Threat classes, consent model and denial gates proposed
- [ ] **OWNER:** Select M4-A loopback-only fixture, M4-B staging discovery, or defer all networked work
- [ ] **OWNER:** Approve scope, consent/ownership evidence, exact methods and isolation requirement
- [ ] **OWNER:** Approve separate implementation Issue, including no-paid-API and no-production-contact rules

### Implementation acceptance — NOT STARTED
- [ ] Security tests first; failing negative controls before the implementation
- [ ] No child inheritance of secrets/proxy configuration, no arbitrary program or URL
- [ ] Transport/version conformance reviewed against actual pinned specification
- [ ] Network/consent/SSRF/redirect/TLS/timeout/cleanup adversarial tests
- [ ] 4/4 CI, positive and negative controls, reviewed PR, post-merge verification
- [ ] Real-world capability claims supported by operator-authorized evidence, not inferred from mock CI

## 8. Owner decisions required

1. **Start with M4-A?** Recommended: first-party loopback mock only; simpler and does not contact external systems.
2. **Later permit M4-B?** If yes, choose one operator-controlled staging endpoint class and a verifiable authorization process. No production by default.
3. **Transport profile:** strict 2026-07-28 Streamable HTTP modern first, with legacy protocol support deferred?
4. **Credential policy:** recommend no authentication or stored tokens in the first preview.
5. **Tool-operation policy:** recommend discovery-only initially; explicitly deny `tools/call` and all writes.
6. **Isolation:** define whether native loopback under normal user permissions is acceptable for a **fixed first-party mock**; do not treat it as safe for arbitrary code.
7. **Release strategy:** release stable offline v0.0.10 separately from any network-preview deliverable after its own review.

**Until answered:** status `PROPOSAL_ONLY / OWNER_APPROVAL_PENDING`. Continue improving offline reliability, packaging, documentation and test coverage; do **not** open sockets to targets or introduce runtime network transports.
