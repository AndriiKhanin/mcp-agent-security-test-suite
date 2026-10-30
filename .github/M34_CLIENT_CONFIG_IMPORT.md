# M34 — import an existing MCP client config for offline validation

This first-party source-only tool is an **offline configuration bridge**.
It does **not** connect to a configured server or invoke a configured
command. It accepts a narrowly structured JSON configuration from
common MCP clients and validates one inert project descriptor using
the existing M24 preflight and its five **fictional first-party**
security controls.

## Input formats

Exactly one server entry, with a safe alphanumeric/hyphen/underscore
name, is required in either of these top-level objects:

- Claude-style: mcpServers with one stdio entry containing command and
  optional args, or one explicit HTTP/streamable-http entry.
- VS Code-style: servers with one explicit type: stdio plus command and
  optional args, or type: http plus url.

All other top-level fields, multiple servers, environment variables,
headers, executable paths, bearer tokens, auth grants and secrets
are rejected. Stdio commands must be simple executable basenames;
arguments are limited to 12 bounded static tokens with no absolute
paths, parent traversal, eval flags or common credential hints.
HTTP URLs must pass the existing narrowly scoped HTTPS descriptor
grammar; no DNS/TLS/ownership/SSRF safety is inferred.

Examples (fictional input, not real user endpoints):

    {"mcpServers":{"demo":{"command":"node","args":["server.mjs"]}}}

    {"servers":{"demo-http":{"type":"http","url":"https://mcp.example.org/mcp"}}}

The importer deliberately assigns protocolVersion 2026-07-28 as a
**static descriptor label**, not a negotiated MCP protocol version.

## Safe default — inspect with no data echo

From a reviewed project checkout, Node.js 20+:

Windows PowerShell:

    Get-Content -Raw -Encoding utf8 .\client-config.json | node tools/m34-client-config-bridge.mjs

Linux/macOS shell:

    cat ./client-config.json | node tools/m34-client-config-bridge.mjs

The local shell reads the named file at your discretion. The tool itself
reads only bounded stdin (4,096 bytes maximum, strict UTF-8 and strict
JSON with duplicate-key checks), writes no files and accepts no path,
URL, server name or secrets as CLI arguments.

Default PASS prints only categorical metadata (stdio or
streamable-http, descriptor validity, five fictional controls, and
permanent false connection/authorization claims). No input name,
command, argument, URL, token, parser diagnostics or local path is
included in the default report. Invalid config returns a generic ERROR
and exit 2, with no disclosure of the rejected content.

## Optional private local conversion

Only if you choose to create a **private local descriptor file**, use
the exact opt-in flag to emit normalized **user-supplied** fields:

PowerShell:

    Get-Content -Raw -Encoding utf8 .\client-config.json | node tools/m34-client-config-bridge.mjs --emit-descriptor > .\private-adapter.json
    Get-Content -Raw -Encoding utf8 .\private-adapter.json | node tools/m24-stdin-adapter-preflight.mjs

Linux/macOS:

    cat ./client-config.json | node tools/m34-client-config-bridge.mjs --emit-descriptor > ./private-adapter.json
    cat ./private-adapter.json | node tools/m24-stdin-adapter-preflight.mjs

The shell redirection is **your explicit local write**, not a tool
write. In export mode, stdout contains the complete inert descriptor,
which may include the original server name, executable basename,
arguments or HTTPS endpoint. Keep that file private; do not paste it
into public GitHub issues or attach it to beta reports. Never put
credentials or sensitive configuration in this bridge: there is **no
complete DLP/secret-scanning guarantee**.

The generated object has policy.mode validate-only and all allow
flags false. It is compatible with the existing M24 preflight; PASS
means the grammar and five built-in synthetic checks passed, not
that the user's project is safe or connected.

## Explicit non-goals and release boundary

No user-supplied executable runs. No filesystem path is opened by the
bridge. No MCP connection, HTTP, DNS, credential lookup, network socket,
real agent/LLM, Stable Bridge, telemetry, permission approval, target
ownership verification, actual tool execution or security
certification is attempted. If configuration contains headers,
environment variables or unsupported shapes, fix/sanitize it
**locally** rather than trying to bypass the input allowlist.

The bridge and its tests are **source-only**, outside the frozen
unpublished 80-file npm release candidate. M6-J's bounded complete
excluded-source SHA-256 custody continues to cover all added files
and reject overflow at file 241. Windows/Ubuntu Node20/22 PR CI 4/4
and exact merged SHA main-push CI 4/4 are required for engineering
acceptance. Real-target authorization [#21](../issues/21),
independent review [#43](../issues/43), and independent beta
[#59](../issues/59) remain open.
