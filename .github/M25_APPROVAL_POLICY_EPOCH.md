# M25 — policy-version drift and logical gate restart

Two community-proposed test cases from **TheAsymmetricMind**: an approval that was valid when issued can become stale before execution, and an in-flight approval must not survive replacement of the gate that admitted it.

This is a **first-party source-only differential experiment**. It demonstrates exactly these two failure modes on controlled, ephemeral IPv4 `127.0.0.1` HTTP sockets. It does not contact a real MCP server, start or restart a real process, use real credentials, or authorize any user action.

## Run

From a reviewed source checkout on Node.js 20+:

```sh
node tools/m25-policy-epoch-restart.mjs
```

No arguments are accepted. The command creates **10 independently owned ephemeral HTTP servers**, one guarded and one intentionally vulnerable for each of five fixed cases. Requests are real MCP-shaped `tools/call` POSTs. Approvals and writes are fictional, server-owned values and in-memory effect counters.

## Exact trust boundary

The server first validates the fictional request and records a **pending but not yet executed** operation. The caller holds its in-flight HTTP response while the test harness applies a source-owned policy-version increment or a **logical generation change**. The mutation occurs *after admission but before the effect*, at a deterministic admission barrier, without relying on arbitrary sleeps.

The guarded policy binds approval to the exact **policy version and gate generation** at admission, checks both again immediately before committing, and invalidates active pending approvals on a logical restart. The deliberately vulnerable policy trusts the earlier approval, skips revalidation, and incorrectly resumes pending work. No request can supply an arbitrary policy mutation.

| Case | Guarded mode | Deliberately unsafe mode |
| --- | --- | --- |
| `UNCHANGED_POLICY` | Valid approval executes once (HTTP 200) | Same positive control |
| `POLICY_DRIFT` | Old approval denied (HTTP 409), zero effects | Old approval executes (HTTP 200), one unsafe effect |
| `RESTART_PENDING` | Pending approval invalidated (HTTP 410), zero effects | Old pending approval resumes (HTTP 200), one unsafe effect |
| `POLICY_DRIFT_FRESH_APPROVAL` | Old approval denied (409), newly issued approval succeeds (200) | Both execute (200, 200) |
| `RESTART_FRESH_APPROVAL` | Pending old approval denied (410), newly issued approval succeeds (200) | Both execute (200, 200) |

The experiment produces **14 fixed local HTTP requests** across the 10 servers. Independent observations require exact request admission counts, policy/generation transitions, *pre-effect* mutation witness, protected effect counters, pending cancellation, per-request responses, response closure and TCP-socket cleanup. The benchmark only reports symbolic case IDs and observed mismatch **field names**, not raw mock data, host URLs or fictional approval strings. Separate mutation tests inject forged successes, missed invalidations, false denials of fresh approvals, bad status codes, fake ordering and unclosed sockets. They must **FAIL**.

**Expected result:** `status: "PASS"`, `checked: 5`, `matched: 5`. Here PASS means two intentionally unsafe paths were witnessed along with defended denial and positive controls. It never means that the deliberately unsafe configuration is safe.

## Material limitations

This models a gate **generation replacement inside a single running test process**. It does **not** kill and relaunch an operating-system process, prove crash-safe or durable persistence, or independently audit a production authorization service. Similarly, a version integer checked at commit is an intentionally simplified stand-in for a real immutable signed policy snapshot. No LLM reasoning, cryptographic capability, real credential, filesystem write, third-party MCP endpoint or model execution is present.

For production use, a durable gate would need explicit transaction/commit semantics, real provenance and monotonic versions, fail-closed generation cutovers, independent effect witnessing and crash/recovery tests. No such functionality is claimed here.

Preserve external gate approvals [#21](../issues/21), [#43](../issues/43), independent beta [#59](../issues/59) and the unpublished fixed 80-file npm package. This test is **source-only**, not a release qualification or real-target security attestation. Engineering acceptance requires 4/4 GitHub PR CI (Windows/Ubuntu × Node20/22) followed by a separate 4/4 run on the exact merged main SHA.
