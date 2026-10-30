# Contributing

## Independent detector comparisons (M38, fictional only)

Independent security-tool maintainers can review and classify exactly
four **first-party fictional** tool-result strings without modifying our
runner or providing a real MCP target:

```sh
node tools/fixture-batch-preflight.mjs --export-detector-cases
```

Use your own rule-based scanner locally, on disposable test material.
Report all clean/mixed classifications, including **misses, false
positives and errors**, not just successes. The opt-in
`--triage-detector-results` mode consumes one tiny, bounded, strict
JSON document over local stdin and calculates only the confusion
matrix **relative to our author-written labels**. This does not run
or verify the external scanner. Follow the
[M38 reviewer guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md#m38--independent-scanner-comparison-on-fixed-fictional-tool-results)
and [comparison Issue #329](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/329).
Report the scanner's public version/commit and rule settings manually,
with no credentials, customer examples, URLs or private logs. This
comparison is distinct from the independently executed beta protocol
[#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59).


This is an early independent OSS release. Contributions are welcome through GitHub Issues and pull requests.

Start with [Getting Started](docs/GETTING_STARTED.md): run `node examples/offline-ci-check.mjs` to see one fictional PASS and one deliberately detected FAIL. A [reviewed CI template](examples/offline-contract-check.yml) uses pinned Actions and minimal permissions.

1. Discuss significant design changes in a public Issue without sharing secrets or private device details.
2. Keep fixtures fictional; never include production logs, customer information, tokens, personal paths or confidential infrastructure references.
3. Preserve offline defaults, bounded parsing, deterministic negative controls and compatibility with supported Node.js versions.
4. Run `node examples/offline-ci-check.mjs` and `node --test` locally; describe the expected-negative-control behavior in your PR, then require four green CI jobs.
5. By submitting, you agree that your contribution may be distributed under the repository’s MIT License. Only submit code you have the right to license.

Release candidates must pass the [offline package preflight](docs/RELEASE_READINESS.md). A contributor PR or green CI does not authorize `npm publish`, a stable tag or external MCP-target probing.

See [SECURITY.md](SECURITY.md) for security reporting.

## Fixture-only prompt-injection proposals (M8-S/T/U)

**Fixture-only PRs are accepted for review separately from runner changes.**
For a synthetic tool result that mixes useful task data with a malicious
instruction, add one JSON file under `.github/fixture-proposals/` and follow
the [fixture-only contributor guide](.github/FIXTURE_ONLY_CONTRIBUTIONS.md).
Run `node tools/fixture-proposal-check.mjs <local-proposal-file>` locally.
The CI suite automatically validates proposed fixture shapes without running
an AI agent, external MCP server, user command or embedded instruction.
This is **not** a prompt-injection detection test or security audit; future
runner support is a separate scoped change. Never include real file paths,
credentials, customer data or production snippets.

## Public beta feedback: fictional-only reproduction (M5-03)

Open the [Issue chooser](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose) and select **Synthetic bug report** or **Synthetic feature request**. The GitHub forms collect a release-candidate version, operating system, Node.js version, an offline command, a symbolic `summary.ruleCodes` value, a fictional reproduction, and expected versus observed behavior. The feature form asks for a fictional positive and negative control and whether the proposal requires separate authorization.

**Safe example:** From the public checkout, run `node src/cli.mjs demo` (expected `PASS`/exit 0), or `node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json` (intentionally expected `FAIL`/exit 1 with `RETRY_PARAMS_CHANGED`). For a report, cite the command and the rule code only; describe reproduction steps in your own words using only bundled public fictional fixtures. Do not upload an environment dump, raw native JSON report, or full stack trace. Native report fields are not a general secret-filtering mechanism.

**Before submitting publicly**, remove all API keys, OAuth secrets, private MCP URLs, personally identifiable information, customer records, proprietary paths/source, production traces and exploitation details. A form checkbox is a reminder and cannot technically sanitize a report; review your own text and attachments. Suspected security vulnerabilities or confidential findings must use the [private disclosure procedure](SECURITY.md), **never** the public issue form. No public issue or green test constitutes owner permission for live-target probing or a stable release. No response-time guarantee or external-user adoption claim is made.

## Independent beta-test feedback (M5-05)

The [fictional-only beta protocol](docs/BETA_TESTING.md) runs `node examples/beta-acceptance-check.mjs` without arguments from a clean public checkout. It verifies five fixed first-party synthetic cases. The intentionally unsafe negotiation must be detected (`FAIL` inside the CLI), while the **combined beta report** is `PASS` only if all five expectations match. Share only public source SHA, OS/Node versions, overall verdict, count of matched controls and symbolic beta codes via the [beta Issue form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose). Do not send raw native reports or real private material. The issue-form confirmation is not automatic sanitization. The presence of this protocol or green CI **does not mean any independent tester has participated**.
