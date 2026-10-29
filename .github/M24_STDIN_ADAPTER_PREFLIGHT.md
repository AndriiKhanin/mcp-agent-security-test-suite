# M24 — private stdin-only offline adapter descriptor preflight

**Status:** First-party source-only self-service improvement. This is not
a connection to the described MCP server, real-agent assessment, owner
authentication, execution permission or security certification.

An adopter can now check an existing \`stdio\` or \`streamable-http\` MCP
**descriptor** without creating another intermediate JSON file or exposing
their project name, endpoint, command or arguments in the result. The
validator accepts exactly **one UTF-8 JSON descriptor on stdin**, at most
**4,096 bytes**, and **no command-line arguments**.

## Examples (reviewed source checkout, Node.js 20+)

Windows PowerShell:

\`\`\`powershell
Get-Content -Raw -Encoding utf8 .\descriptor.json | node tools/m24-stdin-adapter-preflight.mjs
\`\`\`

Linux/macOS shell:

\`\`\`sh
cat ./descriptor.json | node tools/m24-stdin-adapter-preflight.mjs
\`\`\`

The shell reads your file at your direction. The source-only helper
**never reads any file path of its own choosing**, and does not write
any new file or launch the process specified by a \`stdio\` descriptor.
Do not place secrets, passwords, tokens or private files into descriptor
JSON. The published examples under \`examples/adapter-profiles\` are
safe fictional templates.

An accepted input is the **descriptor object itself**, not the full
wrapper report from \`adapter-template\`. For example, use the
\`template\` object inside:

\`\`\`sh
node src/cli.mjs adapter-template stdio
node src/cli.mjs adapter-template streamable-http
\`\`\`

Those two commands only generate **inert example values**. Replace
the fictional project details in a locally controlled JSON descriptor,
with the existing \`validate-only\` policy unchanged. A descriptor with
\`allowNetwork\`, \`allowProcessSpawn\`, \`allowToolCalls\` or
\`allowCredentials\` set to true is invalid.

## PASS/ERROR semantics

A source-owned PASS reports \`checked: 5\`, \`matched: 5\`,
\`descriptorEvidence: DESCRIPTOR_SHAPE_VALIDATED\`,
\`fictionalControlEvidence: FIRST_PARTY_FIXED_FICTIONAL_CASES_ONLY\`,
\`connectionStatus: NOT_ATTEMPTED\`,
\`readinessStatus: REAL_TARGET_NOT_AUTHORIZED\` and
\`realProjectAssessed: false\`. The five cases are the existing M6-A
fictional permission denial, replay denial, tool escalation, denied
effect, and clean symbolic trace. They are **not tailored to the
submitted descriptor**, nor evidence the user's server works.

Any malformed JSON, duplicate key, invalid UTF-8, empty or oversized
stdin, interactive terminal, extra argument, schema mismatch, active
policy or consent claim returns the same bounded generic
\`M24_INVALID_OR_UNREADABLE_DESCRIPTOR\` error and exit code **2**.
No supplied project string, URL, command, path, token or parser message
is echoed. A successful local shape check exits **0**.

## Boundary and acceptance

The helper imports only the existing pure \`inspectProjectAdapter\`,
\`previewOfflineAdapterQuickstart\` and strict JSON parser. It contains
**no HTTP/DNS/socket calls, subprocess, user file reads, environment
credential access or telemetry**. It does not use Stable Bridge or any
external MCP adapter. It does not resolve a hostname or evaluate
ownership or consent. This is a safe *configuration preflight*, not an
actual connection feature.

No runtime dependency or published npm candidate update; the helper
remains excluded from the pinned 80-file package. Independent beta
[#59](../issues/59), source audit [#43](../issues/43) and real
target/owner authorization [#21](../issues/21) remain open. Engineering
acceptance requires 4/4 PR CI and **separate** exact post-merge main
CI on Windows/Ubuntu with Node.js 20/22. Do not convert a preflight
PASS into approval to run arbitrary user commands or make connections.
