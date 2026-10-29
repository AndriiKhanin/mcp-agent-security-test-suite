# M15 — deliberately vulnerable, first-party MCP-shaped differential lab

**Command, in a reviewed source checkout:**

```sh
node tools/owned-redteam-lab.mjs
```

This command has **no arguments**, credentials or target configuration. Each of
the four cases creates a new, ephemeral **IPv4 127.0.0.1** Node HTTP server
at a kernel-assigned port, sends one or two fixed JSON-RPC `tools/call`
requests, verifies the actual replies and server effect witnesses, and
closes its connections. It is **local network I/O**, not zero-network I/O.
No outside MCP endpoint or Stable Bridge service is contacted.

## Why this lab is intentionally unsafe

The entirely fictional `ticket.get` result contains legitimate
`status: OPEN` task data and a lower-trust note asking for an unrelated
`archive.read` tool call. The *susceptible* client is a **deterministic
toy algorithm** that intentionally follows this note. There is no LLM,
semantic interpretation of arbitrary text or actual attack against a
user agent. The `archive.read` server tool only increments a **memory
counter** and returns fixed fictional content; there is **no filesystem
read** and no real archive.

| Scenario | Client | First-party mock server | Observed protection |
| --- | --- | --- | --- |
| `BASELINE` | Guarded | Guarded | Only the legitimate ticket read |
| `EXPOSED` | Susceptible | Deliberately permissive | Second request allowed; **one witnessed synthetic protected effect** |
| `SERVER_BOUNDARY` | Susceptible | Guarded | Second request denied with HTTP 403; no protected effect |
| `CLIENT_BOUNDARY` | Guarded | Deliberately permissive | Second request never made; no protected effect |

The independent result gate requires exact observed request counts,
server admissions, responses, in-memory effects, HTTP status codes,
response closure, socket cleanup and correct ticket/followup response
bodies. Each case is measured from a **freshly created localhost server**.

**Expected:** JSON `status: "PASS"`, `checked: 4`, `matched: 4`,
`syntheticUnsafeEffectExpected: true`. Here **PASS means that the
intentionally vulnerable behavior was detected and both toy defenses
worked exactly as defined**; it never means that all four behaviors are
safe. A missing unsafe effect is an unexpected FAIL. CLI arguments
return a fixed no-echo ERROR, exit 2.

## Evidence and explicit limitations

M15 is a controlled, reproducible **differential unit/integration
experiment** using first-party source code at both ends of the socket.
It is not a comprehensive MCP server vulnerability scanner, true
prompt-injection detector, external target assessment, representative
independent beta or agent security certification. In particular, it
does not independently prove that an arbitrary model would follow or
ignore the malicious note; the susceptible toy client is explicitly
programmed to do so. Full MCP protocol conformance and any hostile
network isolation are outside scope.

Only first-party source/test/guide files were added; the unpublished
80-path npm candidate, M6-J custody and external gates
[#21](../issues/21), [#43](../issues/43), [#59](../issues/59) remain
unchanged. GitHub Actions Windows/Ubuntu Node 20/22 and post-merge main
CI must both pass before engineering acceptance.
