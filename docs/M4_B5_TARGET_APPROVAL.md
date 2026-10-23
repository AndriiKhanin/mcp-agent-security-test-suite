# M4-B5 — decision packet for a future user-owned MCP target preview

**Status: DESIGN + OFFLINE NON-CONTACT REGRESSION ONLY. NO REAL-TARGET IMPLEMENTATION OR OWNER APPROVAL.**  
**Tracking:** [M4-B5 #76](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/76); original [M4 real-target RFC #21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21).  
**Baseline:** fixed first-party mock [M4-B4 #72](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/72), 438/438 tests per job.  
**Candidate:** `0.0.10-rc.1`; no npm publish or stable release approval.

This document is a **decision record for a proposed future capability**, not a runnable configuration, login guide or authorization. No user-owned URL is contacted; no real MCP stdio command is executed; no DNS, authentication, TLS, credential, OAuth or network code is added by M4-B5. The existing `adapter-check` and `adapter-policy-check` commands remain validation-only. A `PASS` from either **must never** permit target access.

## 1. Product workflow: three independent gates, then an effect boundary

1. **Configuration validation (implemented, M4-B0):** a bounded project-neutral descriptor specifies a claimed project, transport and pinned protocol version. Validation proves *shape*, not project ownership, safe DNS, TLS or permission.
2. **Permission consistency (implemented, M4-B2):** a fictional operator string, nonce, timestamp, method and descriptor SHA-256 must agree. The hash proves canonical equality only; the grant is **UNVERIFIED_SELF_ASSERTION**, not authentication.
3. **Authenticated operator + independently verified target authority (future / NOT IMPLEMENTED):** associate the operator with a separately verified identity, organization and authority over the exact **staging** target. A text checkbox, a target-provided statement, DNS hostname knowledge, TLS alone or possession of an arbitrary URL is not sufficient proof. Define a trustworthy verification channel and revocation source; never let the candidate endpoint attest its own ownership. If verification is unavailable, deny, with no network activity.
4. **One-time, per-run owner approval and pre-effect admission (future / NOT IMPLEMENTED):** approval binds an authenticated operator, organization, exact canonical origin/port/path, pinned protocol version, permitted RPC method, fixed request budget, isolated environment and bounded expiry. Reject cancellation/revocation, wrong audience, expired grants and replay **before socket creation**. Revalidate before **each request**, not only at first connection. Record only safe symbolic outcomes. Do not reuse fictional M4-B2 grants as real authority.
5. **Reviewed transport isolation (future / NOT IMPLEMENTED):** even when the preceding gates pass, a separately approved transport enforces DNS, TLS, origin/path, method, byte, time and shutdown boundaries. Consent does not replace technical network controls.

The application must use a trusted, independently reviewed authorization implementation for authentication and token validation if those are ever needed. **No homegrown OAuth, self-signed local "ownership tokens", silent token forwarding, embedded secrets in JSON, or credentials inherited from environment variables.** All grants must be scoped to the intended resource (audience), independent issuer, method and single test run.

## 2. Suggested first real preview, subject to explicit approval

| Decision | Proposed conservative choice | Why |
| --- | --- | --- |
| Target | One owner-controlled **non-production HTTPS staging** MCP endpoint per run | No uncontrolled scanning; scope is visible |
| Transport | Streamable HTTP only, pinned to **2026-07-28** | Explicit modern profile, no silent legacy fallback |
| Method | Proposed fixed `server/discover` only, on a single POST; no tool/resource list | Version-scoped capability discovery, not tool execution |
| Credentials | **None** in the first preview | Authentication challenges are terminal; no escalation or auto-login |
| Operator | Separately authenticated and authorization verified by a reviewed provider/process | Project descriptor is never identity proof |
| Grant | Exact target, version, method, request hash, short TTL and single-run nonce with durable replay/revocation authority | No generic wildcard grant |
| Network | Block until approved egress isolation + DNS/TLS/SSRF review exists | URL syntax checks alone are insufficient |
| Output | Bounded symbolic report; no raw server payload, schema, URL, IP or auth header | Avoid exposing target metadata |
| Rollout | Disabled by default, separate opt-in implementation issue and owner confirmation | Offline CLI behavior stays unchanged |

`server/discover` and the modern HTTP headers are **proposed future wire-level behavior**, not implemented CLI features. Do **not** send legacy `initialize` on an implicitly upgraded 2026 target. The 2026-07-28 profile requires per-request protocol metadata and HTTP headers such as `MCP-Protocol-Version` and `Mcp-Method`; POST responses may be JSON or a bounded request-scoped stream. Long-lived legacy GET streams and legacy protocol-level sessions are not adopted in the modern proposal. All streaming, MRTR input requests, subscriptions and server-recommended additional methods would be denied in the first preview. Normative compatibility must be tested against the **pinned** specification prior to contact.

`stdio` is **not included** in the first real target preview: launching user-nominated code requires an independently specified executable allowlist, OS sandbox/permission isolation, safe environment, working-directory and filesystem boundaries. Node subprocess separation by itself is not a sandbox. Do not use the fixed fictional `stdio` mock as permission to start user-supplied executables.

## 3. Exact target and network boundary (future requirements, no implementation)

- Parse then verify the **exact** HTTPS origin, explicit expected port and canonical path against a separately approved allowlist. Reject userinfo, query, fragment, ambiguous percent-encoding, dot segments, alternate protocols/ports, Unicode/IDNA ambiguity, wildcards and URLs received from the server.
- Prevent **SSRF**: reject localhost, all loopback, link-local, unspecified, private, reserved, multicast and cloud metadata ranges for both IPv4/IPv6. Review IPv4-mapped IPv6 and host normalization. `mcp.example.org` is a fictional documentation name, not an approved staging target.
- Resolve through a controlled resolver at the **time of each connection**; validate the complete A/AAAA answer set and CNAME chain; pin the actual remote peer IP to the allowed result, detect DNS rebinding and refuse changed or mixed private/public results. Close on uncertainty. DNS at proposal-validation time is not enough.
- Use TLS hostname and certificate verification; do not disable trust checks, follow redirects, upgrade/downgrade protocols, honor inherited `HTTP_PROXY`, `HTTPS_PROXY` or `NO_PROXY`, or trust target-provided resource links. A server-side `Origin` check is not a substitute for client-side egress restrictions.
- Require a fixed **single request**, concurrency 1, strict end-to-end deadline including resolution, bounded response and stream/event counts, byte caps, no retries, no cache reuse across owners and deterministic close. Reject unexpected content types, malformed RPC, unsolicited method calls or prompts before reading further.
- Deny **all** `tools/call`, `resources/read`, `tools/list`, mutation, sampling, elicitation, subscriptions, extra follow-up requests, privilege changes or requests to add scopes. A capability advertised by a target does not extend the permitted method list.
- Default external-target report contains only status, checked protocol profile, symbolic failure code, fixed next step, and safe aggregate counts. Never copy raw server metadata, credentials, exception messages, endpoint addresses or complete DNS answers to stdout, CI, issues or telemetry.

Before enabling a target-capable transport, a reviewer must verify not just input validation but effective confinement and pre-effect denial. Require test evidence for blocked attempts **independent of fields returned by the runner**. Existing M4-B4 `AsyncLocalStorage` observation is source-level, **not OS network/process tracing**.

## 4. Negative-control acceptance matrix for a future implementation

| Class | Mandatory synthetic/isolated failure case | Required observation |
| --- | --- | --- |
| Owner/permission | Unknown, expired, revoked, forged or different-operator grant | Zero connect attempts |
| Target identity | Unapproved target, lookalike hostname, wrong port/path, target-changed alias | Zero connect attempts |
| Request scope | `tools/call`, `tools/list`, resource access, repeated request or method escalation | Zero forbidden method dispatch |
| URL parser | Userinfo, fragment, query, alternate scheme, encoded traversal, normalized-host collision | Deny before resolution |
| DNS/SSRF | Mixed A/AAAA, rebinding, private/link-local/metadata, IPv4-mapped IPv6 | Deny before HTTP data |
| TLS | Invalid certificate, hostname mismatch, protocol downgrade | No application request |
| Redirect/proxy | 3xx redirect, proxy environment, hostile PAC/forwarding | No second destination or reused credentials |
| HTTP/version | Header/body version mismatch, wrong `Mcp-Method`, unsupported legacy negotiation | Refuse; no implicit fallback |
| Response | Large body, malicious stream, unsolicited requests, malformed JSON, hang | Bounded termination and cleanup |
| Isolation/privacy | User executable, auth token in config, raw response canary in errors/logs | Deny; no leakage |
| Replay/TTL | Reused nonce, changed approval, parallel duplicate request | No repeated contact |
| Consent withdrawal | Revoke between approval and request, or between two phases | Stop before next network effect |

All future control tests must be independent of target self-reported counters; include at least one positive **approved mock** and one intentionally broken negative control to prove the observer works. Tests of real staged environments require explicit documented permission and cannot be substituted by synthetic CI.

## 5. Explicit owner decision record — PENDING

These are proposals, **not decisions already granted**. Record a new dated, issue-linked explicit approval before any actual connection capability:
- [ ] Approve `one non-production, operator-controlled HTTPS staging endpoint only` as the initial target class.
- [ ] Approve a trusted operator authentication and independent target-ownership verification mechanism; identify who attests ownership and how revocation is checked.
- [ ] Approve strict modern `2026-07-28` `server/discover` only, request budget 1, no legacy fallback or `tools/call`.
- [ ] Approve zero-credential/terminal-401 policy and exactly how the owner supplies/reviews target identity *without storing it in public logs*.
- [ ] Approve reviewed DNS/TLS/proxy/SSRF protection and execution isolation, specifying evidence/test method.
- [ ] Approve a **new implementation issue** limited to these choices, with independent threat review before any real-target attempt.

**Non-substitution:** M4-B5 documentation/tests, M4-B2 self-asserted grants, M4-B4 mock observation, GitHub Actions success and the user's general "continue" are **not** permission to send a network packet to a real MCP endpoint. Keep [RFC #21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21) OPEN until the real authorization gate is resolved. Keep [R5-B independent audit #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and [M5-06 external beta #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) OPEN separately.

## References

- [Official MCP 2026-07-28 specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/index.mdx)
- [Official 2026-07-28 Streamable HTTP transport](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/streamable-http.mdx)
- [Original M4 architecture / approval RFC](M4_AUTHORIZED_INTEGRATIONS_RFC.md)
- [Current offline universal descriptor](UNIVERSAL_ADAPTER.md) and [fictional consent policy](ADAPTER_CONSENT_POLICY.md)
