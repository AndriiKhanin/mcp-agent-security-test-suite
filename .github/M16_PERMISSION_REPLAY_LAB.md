# M16-E/F/G — fictional permission-grant binding and replay lab

This **source-only** optional extension complements the already accepted
[M16-A/B/C/D owned attack matrix](M16_OWNED_ATTACK_MATRIX.md). The earlier
matrix checks forged authority, idempotency-key replay, wrong-ID replies and
fresh-key acceptance. This new extension focuses on **independent capability
binding, expiry and revocation predicates**, not duplicate coverage claims.

## Run (reviewed first-party source only)

```sh
node tools/m16-permission-replay-lab.mjs
```

The helper accepts **zero arguments**. It owns both ends of **18 ephemeral
IPv4 `127.0.0.1` HTTP interactions** (9 cases, guarded and deliberately
permissive configuration). The `REPLAY` case makes two calls per configuration;
the other eight cases make one each, so **20 requests total**. All ports are
kernel-assigned and closed before report generation. There are **no external
destinations**, no Stable Bridge interaction, no user-submitted endpoint,
no real credentials, no real LLM, no real filesystem action and no telemetry.

### Independent capability checks

| Case | Guarded toy policy | Deliberately permissive toy policy |
| --- | --- | --- |
| FRESH_BOUND | One accepted synthetic effect | One accepted synthetic effect |
| REPLAY | Initial 200 then replay 403; effect count 1 | Both 200; effect count 2 |
| WRONG_PROJECT | 403; zero effects | 200; one exposed effect |
| WRONG_TOOL | 403; zero effects | 200; one exposed effect |
| WRONG_RESOURCE | 403; zero effects | 200; one exposed effect |
| EXPIRED | 403; zero effects | 200; one exposed effect |
| REVOKED | 403; zero effects | 200; one exposed effect |
| FORGED_TOKEN | 403; zero effects | 200; one exposed effect |
| FORGED_APPROVAL | 403 despite asserted approval | 200; one exposed effect |

Each case gets a fresh, isolated *first-party mock server* so a consumed
nonce cannot conceal a missing project/tool/resource/expiry/revocation check.
The guarded policy compares a request against a **source-owned fictional
grant**, checks the server-owned logical tick and revocation flag, and
consumes the grant on successful use. The permissive policy is intentionally
wrong: it admits all source-owned well-formed requests. Both produce only
in-memory effect counters. The literal `FICTIONAL-CAPABILITY-ONLY` is a
test string, not a bearer credential or authorization proof.

The independent report oracle demands exact HTTP status sequences, server
admission/denial counts, effect counts, response and socket closure witnesses,
expected JSON-RPC reply bodies and loopback listener binding. It rejects
missing effects, false denials, leaked replay, forged witness claims, sparse
arrays and accessor-bearing input. The CLI report only emits fixed case
identifiers and symbolic witness field names; no mock token, payload, paths
or listener URLs.

**Expected result:** JSON `status: "PASS"`, `checked: 9`,
`matched: 9`, `expectedUnsafeCases: 8`. This means all **deliberately
vulnerable** behaviors were witnessed and all guarded equivalents behaved as
expected. It emphatically **does not mean the permissive server is secure**.

## Security meaning and boundaries

This is a differential **toy integration test** on real localhost sockets,
not an agent, an OAuth implementation, a cryptographic token verifier,
operator authentication or a full compliant MCP server. The fictional
"project" is not authenticated identity. The fixed logical clock does not
prove real-time token expiration enforcement. This lab cannot certify real
MCP deployments or demonstrate resistance by arbitrary LLMs.

No production registry publication or 80-file npm package changes.
Owner authorization #21, independent audit #43 and independent beta #59
remain open. PR CI must pass Windows/Ubuntu Node 20/22 (4/4), followed by
separate matched main-push 4/4 acceptance.
