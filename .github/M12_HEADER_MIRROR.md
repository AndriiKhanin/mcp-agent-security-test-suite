# M12-D/E/F — Modern MCP 2026-07-28 `x-mcp-header` source-owned trust boundary

**Tracking:** [Issue #244](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/244)  
**Scope:** fixed 127.0.0.1 first-party Streamable HTTP subset. This is **not complete MCP conformance**, not an external MCP scanner, actual AI agent, security certification or independent audit.

## Why header/body parity matters

Modern MCP 2026-07-28 allows tool input schema properties annotated
with `x-mcp-header` to be mirrored from `tools/call` JSON arguments
into HTTP headers named `Mcp-Param-{name}`. Clients must encode
strings that are not safe literal ASCII header values, or that
resemble the special Base64 sentinel, as
`=?base64?{canonical UTF-8 Base64}?=`.

A server consuming the body **must reject mismatched/missing headers
with HTTP 400 and JSON-RPC error `-32020` (`HeaderMismatch`)**.
Otherwise an intermediate policy gateway and the server can see
different values for the same parameter.

Reference: [MCP Streamable HTTP 2026-07-28 Request Metadata](
https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#request-metadata).

## First-party source-owned demonstration

```sh
node tools/m12-header-parameter-mirror.mjs
node --test test/m12-header-parameter-mirror.test.mjs
```

Both the HTTP server and client are source-owned. The listener uses
the literal address `127.0.0.1` and OS-selected ephemeral port.
The CLI has **zero arguments**; no external host, port, tool, model,
command, credential or file can be selected.

The mock's fixed tool definition advertises four primitive parameters:

| `x-mcp-header` | Body property | Type | Fixed safe value |
| --- | --- | --- | --- |
| `Ticket` | `ticket` | string | `FICTIONAL-Q17` |
| `Memo` | `memo` | string | source-authored ASCII/Unicode/padded/sentinel examples |
| `Priority` | `priority` | integer | `7` |
| `Enabled` | `enabled` | boolean | `true` |

The client mirrors all four parameters, alongside
`MCP-Protocol-Version`, `Mcp-Method` and `Mcp-Name`.
The server verifies the entire fixed reviewed JSON-RPC envelope,
all canonical header encodings and correspondence with its body.
It rejects missing, duplicated, malformed or extraneous
`Mcp-Param-*` fields, mismatched values, wrong method/name/version
and Origin, and malformed/duplicate-key JSON.

Only after matching the **actual on-wire HTTP reply bytes**, the
strictly validated fictional tool-result data can enter the
separate M10 deterministic stateful toy-agent gateway. The embedded
instruction text is transported as untrusted data and is **never
interpreted or executed**. The source-only gateway records fixed
in-memory method calls and reports zero fictional protected effects.

## Fixed controls

The zero-argument CLI requires **26** reviewed tests to match:

- **Four expected PASS**: ASCII, Unicode, leading/trailing whitespace,
  and a literal that resembles the Base64 sentinel.
- **Seventeen expected header/JSON FAIL**: missing ticket, memo or
  boolean header; mismatched ticket, memo, integer or boolean;
  malformed or noncanonical Base64, duplicate parameter,
  unexpected parameter, wrong method/name/version/Origin,
  duplicate JSON key and malformed JSON. Denial must be
  HTTP 400 / JSON-RPC `-32020`.
- **Five expected reply FAIL**: replayed response ID, forged result
  authority, redirect, oversized reply and bounded hanging reply.
  None can reach the toy-agent gateway.

Reports contain **only fixed control IDs, bounded counts, Boolean
flags and fixed rule codes**. No filenames, fixture text, URLs,
tokens, ephemeral ports, stack traces or injected instructions
are echoed. Socket/response closure must be independently observed;
an unconfirmed cleanup cannot pass.

The schema annotation checker also rejects invalid/duplicate
case-insensitive header names, non-primitive annotations and
malformed headers. It covers only our source-owned simple
`properties` paths, **not** a full JSON Schema engine, every nested
feature, or a general-purpose x-mcp-header validator.

## Security limits and acceptance

This is **not a real agent**, OS sandbox, LLM evaluation,
semantic prompt-injection detector, production MCP security
assessment or general MCP conformance certification. It does not
implement SSE streaming, MRTR, subscriptions, general authentication,
user-chosen adapters, complex JSON Schemas or external targets.

M12-D/E/F is source-only, excluded from the **exact 80-path
unpublished npm release candidate**, and included in full bounded
M6-J excluded-source SHA-256 custody. The protected M4
discovery-only staging server is unchanged.

Independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59),
independent audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
and owner authorization for external MCP targets
[#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21)
remain **OPEN**.

Engineering acceptance requires Windows/Ubuntu Node20/22 **4/4 CI**,
squash merge, then a separately verified main push CI for the exact SHA.
No CI result grants permission to publish a release or connect to
customer infrastructure.
