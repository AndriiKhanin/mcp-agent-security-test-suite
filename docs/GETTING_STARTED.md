# Getting started: offline security contract checks

**For developers and contributors.** This independent MIT-licensed package uses Node.js **20 or newer**, Git and **no npm installation or paid API**. It tests only fictional security contracts. Do not provide credentials, customer logs or production target addresses. Passing these tests does not mean a real MCP server is secure.

## First run from a clean clone

Copy these commands into a terminal (Windows PowerShell 7, CMD, Linux shell, or macOS shell):

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
node --version
node src/cli.mjs demo
node examples/offline-ci-check.mjs
node --test
```

The new **zero-argument** `demo` command emits a versioned JSON report with `command: "demo"`, `status: "PASS"`, `checks: 2` and both fictional expectations marked `matched: true`. The intentionally unsafe negotiation fixture must be detected for the whole demo to pass. Do not interpret this as a scan of your computer or any MCP target. The separately supplied `examples/offline-ci-check.mjs` script below remains available for compact terminal summaries.

Expected demonstration (the exact messages are fixed and intentionally contain no fixture payloads):

```text
SAFE_FIXTURE_PASS: expected synthetic denials caused no unauthorized effects
EXPECTED_FAIL_DETECTED: RETRY_PARAMS_CHANGED, exit code 1
DEMO_PASS: both offline contract checks behaved as expected
```

The script succeeds with process exit **0 only if both cases behaved exactly as expected**. It does **not** accept custom target/executable options, connect to the network, invoke paid services, or run arbitrary files. It calls the bundled CLI with two hard-coded fictional fixture paths.

## Understand PASS versus a security denial

**First check (`scenario`):** the fixture `fixtures/scenario-denial.json` contains fictional actions where nine invalid requests are **properly denied**, and two authorized requests produce a fictional write/read. The entire scenario is **PASS** (`0`) because the security policy enforced those denials without unauthorized effects. A denied tool call does *not* automatically mean the test failed.

**Second check (`negotiate`):** the fixture `fixtures/mcp-negotiate-unsafe-params.json` intentionally mutates a tool request's parameters between a failed protocol-version attempt and the retry. The validator must return **FAIL** (`1`) with `RETRY_PARAMS_CHANGED`, proving that the negative security control was detected. The example script treats that *expected failure* as successful security-test evidence.

**Invalid fixture/arguments:** the CLI returns `ERROR` with exit code **2** and only a generic machine-readable error code. No input data or path should appear in that error object. See [CLI JSON v1](CLI_REPORTS.md) for exact schema.

To observe individual results (the second command *intentionally returns nonzero*):

```sh
node src/cli.mjs scenario fixtures/scenario-denial.json
node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json
```

For fixed local stdio mock transport, run:

```sh
node src/cli.mjs stdio fixtures/stdio-mock-safe.json
node src/cli.mjs stdio fixtures/stdio-mock-unsafe.json
```

The latter is also a deliberately failing fictional control. The stdio worker is a fixed first-party batch test double, **not a real target**, an OS sandbox, or full MCP interoperability. See [stdio mock limits](STDIO_MOCK.md).

## CI example

Use [examples/offline-contract-check.yml](../examples/offline-contract-check.yml) as a template for your own repository's `.github/workflows/offline-contract-check.yml`. The sample uses SHA-pinned GitHub Actions, `permissions: contents: read`, `persist-credentials: false`, Node.js 22, and a single safe command:

```sh
node examples/offline-ci-check.mjs
```

The example workflow assumes the **same repository files** (the script and fictional fixtures) are checked out. If adapting it for a different repository, vendor the reviewed test files and script deliberately; do not add production credentials, network targets or shell-driven scans. The example lives in `examples/` so it is not a duplicate active GitHub workflow; the repository's existing four-job `.github/workflows/ci.yml` remains the acceptance gate.

## Contributing and boundaries

1. Start with a [GitHub Issue](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues), using fictional examples only.
2. Make a feature branch, include at least one positive and one **negative** control, and run `node --test`.
3. Explain violated rule names without copying secret-like fixture values to your PR.
4. A change can be considered accepted only after the four-job Windows/Ubuntu × Node20/22 CI matrix passes in PR and again on merged `main`.

See [CONTRIBUTING.md](../CONTRIBUTING.md), [THREAT_MODEL.md](THREAT_MODEL.md), [NEGATIVE_CONTROLS.md](NEGATIVE_CONTROLS.md), and [ROADMAP.md](../ROADMAP.md). The design of live target integration is future, separate, and requires explicit authorization.
