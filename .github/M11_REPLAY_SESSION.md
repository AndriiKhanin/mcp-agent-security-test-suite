# M11-D/E/F — First-party two-session MCP-shaped replay and response correlation

**Tracking:** [Issue #230](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/230)  
**Scope:** only two disposable source-owned `127.0.0.1` sessions and their strictly bounded HTTP/JSON bytes. This is **not a real AI agent**, an LLM prompt-injection detector, a general-purpose MCP client, or an OS sandbox.

## What is new

M11-A/B/C demonstrated one owned loopback `tools/call` result reaching the
M10 in-memory toy-agent gateway. M11-D/E/F adds a **separate two-session
state machine** after that existing accepted discovery/transport prerequisite:

```text
first-party M11 discovery and first-party tool-result preflight
   |
   v
owned localhost listener (OS-selected port; host fixed at 127.0.0.1)
   |
   +-- request id=41, FICTIONAL-SESSION-A --> exact reply A
   |                                   |
   |                             first M10 toy session
   |
   +-- request id=42, FICTIONAL-SESSION-B --> exact reply B
                                       |
                                 second M10 toy session
   |
   +-- end; a third request, reused ID or out-of-order request is denied
```

The listener admits only the next **source-owned fixed** JSON-RPC-shaped
request, literal `tools/call` method name, the fixed `/mcp` route,
literal JSON fields and strict `Host`/`Origin`/`Content-Type`/
`Accept`/MCP-version headers. It does not accept credentials or
authority-bearing extra properties. Server counters are incremented
from **actual HTTP requests**; client counters advance only after
validating **actual response bytes** and the expected response ID,
session binding, content and exact decoded fictional data.

A first-party toy agent gets only the legitimate fictional task data
from each verified response. The **embedded instruction is never
interpreted or executed**. The two M10 gateway sessions are independent:
the code never exposes its private witness counters or real OS
permissions to source-owned tool-result text.

## One-command verification

In a reviewed source checkout, Node.js 20 or 22:

```sh
node tools/m11-replay-session.mjs
node --test test/m11-replay-session.test.mjs
```

The CLI accepts **zero arguments**, reads two fixed reviewed fictional
fixtures under `.github/fixture-proposals/` and runs **16 first-party
controls**: one clean PASS and 15 expected FAIL outcomes.

| Source-authored control group | Negative behavior required to be denied |
| --- | --- |
| Response correlation | Replayed first response, swapped first-session content, wrong second response ID |
| Authority and structure | Unexpected approval field, duplicate JSON object key, malformed JSON |
| HTTP transport | Incorrect content type, redirect (never followed), oversized or stalled second response |
| Request/session state | Repeated first request, forged request authority, credential-like request header |
| Ordering and completion | Second request before first, third request after two completed results |

All requests/responses are size bounded. The second response is never
delivered to the toy gateway on a correlation failure, even when the
owned mock accepted that HTTP request. The test also checks fixed
request/response and TCP socket close counts, including failed
transactions. Any unconfirmed cleanup invalidates the outcome.

The CLI prints only fixed rule codes, bounded counts/Boolean status
flags and source-authored control labels. It does **not** print
contributor case IDs, response bodies, embedded instructions, filenames,
ports, credentials or private paths. Invalid CLI arguments return a
fixed, non-echoing error.

## Exact limitations

- The two HTTP clients and servers are **reviewed first-party code**.
  They bind and connect **only to the literal IPv4 loopback**
  `127.0.0.1`, on an OS-selected ephemeral port. There is no user-
  selected port, host, URL, method, executable or arbitrary command.
- The existing M4 staging `server/discover` server remains unchanged,
  refuses `tools/call`, and is tested separately by the existing M11
  prerequisite. A new **separate** owned response mock exercises
  `tools/call` without broadening M4's authorization.
- **No real agent, LLM, customer MCP server, credentials, unrelated
  file read, process spawn or semantic prompt-injection analysis**.
  Success means our source-owned client correctly binds fictional
  responses to its fictional session IDs. It does **not** prove that
  an AI model will resist the wording of an injection.
- No OS-level proof of socket isolation, code integrity or independent
  security assurance is claimed. A hostile co-resident process is
  outside this test's protection model.
- Exact **80-path npm release candidate** is unchanged. All new
  source-only files remain in the fully hashed, bounded M6-J excluded-
  source custody. This is neither a release nor a certification.
- Real-target approval [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
  independent audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43),
  and external beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  remain open and cannot be satisfied by the synthetic checks alone.

CI must pass Windows/Ubuntu with Node.js 20/22 **4/4**, and a separate
post-merge main push CI must be independently verified before declaring
M11-D/E/F engineering accepted.
