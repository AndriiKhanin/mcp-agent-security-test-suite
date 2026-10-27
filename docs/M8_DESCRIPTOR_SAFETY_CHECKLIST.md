# M8-J — Offline descriptor safety checklist

This checklist applies only to the **fictional, inert** adapter descriptors accepted by `adapter-check` and `adapter-onboard`. It does not authorize connection to a user-owned MCP server.

## Safe first run

1. Use a reviewed source checkout and Node.js 20+.
2. Generate a fictional example using `node src/cli.mjs adapter-template stdio` or `node src/cli.mjs adapter-template streamable-http`.
3. Copy **only** the nested `template` object from the JSON-v1 report into a local descriptor JSON file. The full report wrapper is not a descriptor.
4. Keep every execution, network and credential flag set to `false`; use fictional values only. Never paste a real token, private hostname, production command, or customer data.
5. Run `node src/cli.mjs adapter-check <local-descriptor-file>` to validate shape only. Optionally run `node src/cli.mjs adapter-onboard <local-descriptor-file>` for the existing fictional onboarding report.
6. Interpret `PASS` as a local schema/fictional-control result, **not** a real interoperability test, vulnerability assessment, security certification, or permission to connect.

## Negative expectations

- Supplying the entire `adapter-template` report wrapper instead of its nested `template` must not be treated as a valid descriptor.
- Invalid or unreadable descriptors must fail closed and must not echo paths, file content, tokens, commands or endpoint details.
- Neither descriptor validation nor fictional onboarding may spawn a user command, contact an endpoint, or request credentials.
- No real-target beta acceptance or independent tester provenance can be inferred from these local results.

## Release gate

Before expanding beyond fictional descriptors, require a separately reviewed threat model, explicit owner authorization, exact target allowlisting, credential-handling design, negative-control tests, and independent verification. Existing external-beta acceptance issue #59 remains open until independently supported evidence is available.
