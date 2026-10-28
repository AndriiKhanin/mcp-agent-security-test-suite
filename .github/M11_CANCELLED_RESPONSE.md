# M11-J/K/L — Owned cancellation and late-response isolation

**Tracking:** [Issue #234](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/234).  
**Scope:** reviewed, source-only, first-party toy HTTP exchanges on the literal IPv4 loopback address. **Not a real AI agent**, MCP client security certification, LLM prompt-injection evaluation or OS sandbox.

## Cancellation lifecycle

M11-G/H/I established two simultaneously outstanding localhost requests with correct response IDs, even when responses are issued in reverse order. M11-J/K/L checks a different trust boundary: one **owner-initiated in-flight cancellation** while an independent peer request remains outstanding.

```text
existing approved M11-A/B/C discovery and local wire preflight
                         |
 disposable listener 127.0.0.1, OS-selected ephemeral port
                         |
         +---------------+--------------+
         |                              |
  fictional request A            fictional request B
      id = 81                         id = 82
         |                              |
       both request bodies parsed and validated
         |
    owner aborts A; its TCP connection closes
         |                              |
    no reply A accepted         exact reviewed reply B
    optional source-owned               |
    late-write attempt is      strict JSON-RPC ID and
    suppressed, not sent        fictional-session binding
                                        |
                               M10 stateful toy gateway
                               consumes task data only
```

The cancellation request comes from **fixed source-owned control code**.
It is not a model decision or an instruction parsed from the MCP-shaped
tool result. The server waits for two requests to be processed before
initiating cancellation, avoiding race-prone clock assumptions.
The peer B response is only sent **after A's server-side response closes**.

The source-only late-attempt check inspects a closed response and counts
that an attempted late reply would be suppressed. No stale bytes are
actually written to the closed socket. This is a first-party lifecycle
control, **not** independent OS packet capture or proof against hostile
co-resident software.

## Run locally

On Windows or Ubuntu in a reviewed source checkout with Node.js 20/22:

```sh
node tools/m11-cancelled-response.mjs
node --test test/m11-cancelled-response.test.mjs
```

The zero-argument CLI reads exactly two reviewed fictional fixtures and
runs **14 fixed controls**, requiring two expected safe PASS outcomes
and twelve expected negative FAIL outcomes.

| Control | Expected behavior |
| --- | --- |
| Cancel A while B remains pending | A canceled/closed, B accepted once |
| Simulate stale A attempt after close | Late write suppressed, B accepted |
| Cross-session or replayed A result as B | Reject B before gateway |
| Wrong response ID or forged approval | Reject B before gateway |
| Duplicate key, malformed JSON, wrong content type | Reject B |
| Redirect or oversized response | Reject B without following redirects |
| Stalled B response | Abort B at bounded deadline |
| Reused request ID or forged Authorization header | Deny B at owned HTTP server |

All tool-result request/response bodies are bounded and strictly
checked; all requests use the literal `127.0.0.1` with the OS selecting
a disposable port. Source-owned fixed RPC method, headers and JSON
schema are required; no user argument can pick another host, port,
path, executable, model, credential or MCP endpoint.

A safe outcome requires real HTTP request counts and **both socket and
response closure** witnesses, exactly one observed cancellation and one
accepted peer result with one M10 toy gateway session. Negative tests
must confirm no B result is delivered on invalid input. Each public
report contains only fixed rule codes, integers and Boolean facts:
never case IDs, original payload strings, paths, network ports or
private data.

## Claims that remain forbidden

- **No real AI agent, LLM, external MCP service, arbitrary command,
  unrelated file read or semantic prompt-injection detection.** The
  M10 toy agent is fixed first-party JavaScript and cannot interpret
  injected instructions.
- No OS-level network isolation guarantees, authenticated remote peer,
  hostile-process resistance or independent security audit.
- The protected M4 discovery-only staging MCP server is unchanged.
  These additional source-owned MCP-shaped responses come from a
  **separate, disposable** localhost service.
- Exact 80-path npm release-candidate inventory remains unchanged.
  Every new excluded source file is included in M6-J bounded SHA-256
  inventory and must pass full CI before merging.
- Real-target authorization [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
  independent security audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
  and independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  stay open.

Accept engineering only after Windows/Ubuntu Node.js 20/22 PR CI **4/4**
and independent post-merge `main` push CI **4/4**. A passing synthetic
suite never establishes deployed-agent security or grants release approval.
