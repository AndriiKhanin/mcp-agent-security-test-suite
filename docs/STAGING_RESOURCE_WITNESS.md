# M4-B6-C — test-only parent-observed first-party resource witness

**Scope: test-only, owned localhost.** [Issue #85](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/85). No user MCP endpoint, arbitrary program, production deployment, OAuth, credentials or external network access is authorized.

The existing fixed worker uses the reviewed modern MCP 2026-07-28 discovery fixture over an ephemeral `127.0.0.1` TCP listener. This stage strengthens the evidence with a **separate parent-side test process observer**, not with a worker-generated “port closed” flag.

- Trusted worker sends **private ephemeral-port + PID** metadata exclusively over test IPC. The parent checks the complete message shape, literal loopback address, numeric port range and actual forked PID before use.
- Parent independently attempts `net.createServer().listen(127.0.0.1, same-port)`. During the worker's listener lifetime, `EADDRINUSE` is required; **after the child exit is observed**, a fresh bind must succeed. Parent closes its probe listener immediately.
- Positive `server/discover` and purposely held/killed child modes verify separate PID, release signal or forced exit, listener closure and rebinding.
- A deliberately malformed private IPC witness is rejected **without opening a probing socket**. Bad `tools/call` method, Origin and Host are sent only to our **same first-party local staging port** and must be denied; source-level counters/response claims are secondary.
- Existing public `staging-selftest` and `staging-process-selftest` remain argument-free. No private witness port/PID, raw requests, address, tokens or resource descriptors appear in CLI output. The observer lives under `test/`, excluded from npm artifacts.
- The parent runtime now waits for an observed child `exit` event after timeout/invalid IPC before returning the symbolic failure. If child reaping cannot be confirmed in a bounded fallback, result is **FAIL** with `STAGING_WORKER_REAP_UNCONFIRMED`; do not claim cleanup succeeded.

**Limitations:** This is a concrete OS TCP bind availability probe on one fixed trusted first-party port, and source-limited Node process lifecycle evidence. It is **not kernel-wide socket tracing**, malicious-host confinement, PID ownership attestation for arbitrary executables, OS sandboxing, formal security certification or genuine server ownership proof. Local ports are subject to races and same-host hostile processes are outside this test's security claim. All external MCP-target authorization remains blocked under [RFC #21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21).

**Acceptance gate:** four PR CI jobs and four post-merge main jobs (Ubuntu/Windows × Node 20/22), no failures/skips, exact reviewed npm inventory now **79** paths, no stable release or npm publication approval. Independent R5-B [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) and external beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) remain OPEN.
