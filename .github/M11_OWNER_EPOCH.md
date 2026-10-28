# M11-P/Q/R — Run-local fictional owner capability rotation over loopback

**Tracking:** [Issue #238](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/238)  
**Scope:** source-only, fixed first-party fictional fixtures, two independent ephemeral IPv4 loopback listeners. **Not a real AI agent**, production authentication mechanism, OS sandbox or prompt-injection detector.

## Why this exists

M11-M/N/O tests two distinct fictional owners within **one** concurrent
local server run. M11-P/Q/R checks a different security property:
**a synthetic capability from an old run cannot be accepted by a newly
started run**, even if the caller constructs an otherwise valid-shaped
fictional request.

Two source-generated 24-byte random values are retained inside one
function invocation. They are **synthetic** values only, not user secrets.
The first local HTTP server binds to fixed `127.0.0.1` with OS-selected
port 0, accepts exactly one fixed owner/epoch request, emits a fictional
tool result, and **fully shuts down** before the second server is even
created. The second server binds to a fresh local listener and checks
its *own* independently generated capability and fixed request ID,
owner marker, epoch marker and exact JSON-RPC-shaped request.

A stale capability from the first local run receives a **DENY** at the
second server. The second result is delivered to an independent M10
stateful toy gateway only if its HTTP response bytes and every expected
source-owned field match exactly. The tool-result instruction text
remains inert data and cannot select a file, tool, endpoint or operation.

No capability value, response body, contributor text, file path, IP port,
private data or credential is included in the public result.

## Source-only commands

Use Node.js 20/22 in a reviewed checkout:

```sh
node tools/m11-owner-epoch.mjs
node --test test/m11-owner-epoch.test.mjs
```

The CLI accepts **zero arguments**. It uses two fixed reviewed fictional
JSON fixtures and executes **18 source-authored controls**:

| Group | Checks | Expected |
| --- | ---: | --- |
| New owner capability in each fully separate localhost run | 1 | PASS |
| Old, missing, invalid, forged or mismatched request authority | 7 | FAIL |
| Same-run request replay after successful completion | 1 | FAIL |
| Wrong/swapped/forged/malformed/duplicate reply, HTTP content type, redirect or size | 8 | FAIL |
| Incomplete but syntactically valid response and timeout | 1 | FAIL |

A green selftest requires the safe case to PASS and **all 17 negative
cases to FAIL** with the independently expected fixed rule code. Tests
inspect *actual local HTTP accepted/denied request counts*, number of
in-memory toy gateway sessions admitted, and response/TCP socket closure
counts. A missing close or unexpected status is never counted as a
passing security control.

All HTTP clients and servers are reviewed first-party Node.js code with
literal `127.0.0.1` as the only network address. They never use a
customer MCP URL, arbitrary port, user executable, API key or LLM.

## Scope and evidence limits

- **Synthetic owner capabilities are not real authentication** and the
  demo does not claim that tokens are secure against other processes,
  malware or production attackers.
- The HTTP fixture is **MCP-shaped**, not a complete or standards-certified
  MCP server or a general-purpose MCP client.
- The observed gateway is a deterministic **first-party toy agent**. Its
  inability to follow fictional injection text is engineered by the
  test code. The tests do **not** prove LLM prompt-injection resistance.
- No unrelated OS file read, production workflow, external host, real
  credentials or user MCP server is touched. Inputs come only from
  the fixed strict M8 fictional fixture loader.
- All new code stays under source-only `tools/` and `test/`, outside
  the frozen **80-path npm candidate**. M6-J continues to enumerate
  and SHA-256 hash every excluded source path under its bounded cap.
- External-target approval [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21),
  independent security audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43),
  and independently executed beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
  remain open and cannot be satisfied by this synthetic demo.

Require full PR CI **4/4** across Ubuntu/Windows Node 20/22 and separately
verified post-merge main push CI before recording engineering acceptance.
