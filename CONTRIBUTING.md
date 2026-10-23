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

## Public beta feedback: fictional-only reproduction (M5-03)

Open the [Issue chooser](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose) and select **Synthetic bug report** or **Synthetic feature request**. The GitHub forms collect a release-candidate version, operating system, Node.js version, an offline command, a symbolic `summary.ruleCodes` value, a fictional reproduction, and expected versus observed behavior. The feature form asks for a fictional positive and negative control and whether the proposal requires separate authorization.

**Safe example:** From the public checkout, run `node src/cli.mjs demo` (expected `PASS`/exit 0), or `node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json` (intentionally expected `FAIL`/exit 1 with `RETRY_PARAMS_CHANGED`). For a report, cite the command and the rule code only; describe reproduction steps in your own words using only bundled public fictional fixtures. Do not upload an environment dump, raw native JSON report, or full stack trace. Native report fields are not a general secret-filtering mechanism.

**Before submitting publicly**, remove all API keys, OAuth secrets, private MCP URLs, personally identifiable information, customer records, proprietary paths/source, production traces and exploitation details. A form checkbox is a reminder and cannot technically sanitize a report; review your own text and attachments. Suspected security vulnerabilities or confidential findings must use the [private disclosure procedure](SECURITY.md), **never** the public issue form. No public issue or green test constitutes owner permission for live-target probing or a stable release. No response-time guarantee or external-user adoption claim is made.
