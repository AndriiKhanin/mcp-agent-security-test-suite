# Contributing

This is an early independent OSS release. Contributions are welcome through GitHub Issues and pull requests.

Start with [Getting Started](docs/GETTING_STARTED.md): run `node examples/offline-ci-check.mjs` to see one fictional PASS and one deliberately detected FAIL. A [reviewed CI template](examples/offline-contract-check.yml) uses pinned Actions and minimal permissions.

1. Discuss significant design changes in a public Issue without sharing secrets or private device details.
2. Keep fixtures fictional; never include production logs, customer information, tokens, personal paths or confidential infrastructure references.
3. Preserve offline defaults, bounded parsing, deterministic negative controls and compatibility with supported Node.js versions.
4. Run `node examples/offline-ci-check.mjs` and `node --test` locally; describe the expected-negative-control behavior in your PR, then require four green CI jobs.
5. By submitting, you agree that your contribution may be distributed under the repository’s MIT License. Only submit code you have the right to license.

Release candidates must pass the [offline package preflight](docs/RELEASE_READINESS.md). A contributor PR or green CI does not authorize `npm publish`, a stable tag or external MCP-target probing.

See [SECURITY.md](SECURITY.md) for security reporting.
