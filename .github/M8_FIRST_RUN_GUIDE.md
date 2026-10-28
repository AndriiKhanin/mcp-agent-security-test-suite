# M8-O — Fictional adapter first-run walkthrough

From a reviewed **source checkout** with Node.js 20+, run:

```sh
node tools/adapter-first-run.mjs
```

The command returns a static JSON-v1 walkthrough after exercising fixed, source-authored fictional adapter smoke checks for both `stdio` and `streamable-http`. It accepts **zero arguments**. It reads no private descriptors or credentials, does not execute a user command, and contacts **no real MCP target**.

Read the five ordered steps. When using `node src/cli.mjs adapter-template stdio` or `streamable-http`, copy *only* the nested `template` object from the generated report to a local fictional JSON file (do not copy the report wrapper). Use `node src/cli.mjs adapter-check <local-descriptor-file>` to validate its inert shape.

A `PASS` is **not a security audit**, independent beta result, project interoperability proof, or stable-release authorization. Never paste tokens or private endpoints. The first-run helper is source-only and deliberately excluded from the exact locked npm package inventory. For the authorization boundary, see [descriptor safety checklist](M8_DESCRIPTOR_SAFETY_CHECKLIST.md); external beta issue #59 and independent review issue #43 are still open.

## M8-P/Q/R — optional human-readable source-only view

For a terminal explanation of the same two source-owned fictional checks, run:

```sh
node tools/adapter-first-run-view.mjs
```

This separate **fictional** human-readable view never opens a descriptor, uses no real MCP target, accepts no arguments and prints only hard-coded source text after strict in-memory verification. It never interpolates supplied report fields or secrets into terminal output. Unexpected flags, changed transports or result status fail closed. The original `node tools/adapter-first-run.mjs` keeps its JSON format and exit-code contract.

This command is **not a security audit** or proof of real server interoperability. Both tools live outside the reviewed npm package inventory; they require a public source checkout. External beta #59, independent audit #43 and real-target authorization remain open.
