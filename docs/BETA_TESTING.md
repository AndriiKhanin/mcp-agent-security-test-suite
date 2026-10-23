# Fictional-only external beta acceptance protocol (M5-05)

**Status:** engineering protocol for candidate `0.0.10-rc.1`. This document does **not** prove that an independent tester has run it. No real MCP servers, customer events, credentials, proprietary code, registry publication or external network tests are approved.

## Fresh-checkout procedure (Node.js 20 or 22; Windows / Ubuntu)

Use a public clean clone, *not* a privileged runtime or real MCP integration environment. The `git clone` step retrieves this public repository; **the subsequent beta check itself makes no network requests**.

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
git rev-parse HEAD
node --version
node examples/beta-acceptance-check.mjs
```

Use the exact revision of the beta protocol accepted by the project; record the **full commit SHA** from `git rev-parse HEAD` rather than only the floating `main` branch name. The script accepts **zero** arguments and invokes only the bundled first-party `src/cli.mjs` with fixed fictional examples, under strict child-process time and output bounds. No `npm install`, API keys, registry, external MCP target, external scanner, shell interpolation or telemetry are needed. A success report exits 0, has `betaSchemaVersion: 1`, `profile: "fictional-beta-acceptance-v1"`, `status: "PASS"`, `total: 5`, `passed: 5`, and `failed: 0`.

## Expected fixed controls

| Case identifier | Expected CLI result | Purpose |
| --- | --- | --- |
| `OFFLINE_HELP` | PASS / exit 0 | Reviewed offline command discovery |
| `LOCAL_VERSION` | PASS / exit 0, `0.0.10-rc.1` | Candidate metadata, **not** proof of npm publication |
| `FIXED_DEMO` | PASS / exit 0 | Two fictional positive and detected-negative expectations |
| `POLICY_DENIAL` | PASS / exit 0 | Nine simulated denials with no unauthorized effects, two allowed effects |
| `RETRY_MUTATION` | **FAIL / exit 1**, `RETRY_PARAMS_CHANGED` | An intentionally unsafe protocol retry must be detected |

**Important:** `RETRY_MUTATION` returning CLI `FAIL` is the **expected successful detection**. If it unexpectedly passes or reports the wrong rule, the combined beta verdict is FAIL. The runner prints **only fixed case identifiers, expected verdicts and symbolic failure codes**. It does not forward native command output, original exceptions or local paths. A wrong invocation (any argument or target URL) returns JSON `ERROR` with exit 2 and `BETA_ARGUMENTS_NOT_ALLOWED`. Failures have symbolic `BETA_*` codes; troubleshoot in public using fictional evidence only.

The runner can be called from a checked-out source tree or from its reviewed location inside a **locally installed disposable tarball**, and the project's CI verifies both forms. It does not attempt cross-platform byte-identical package builds.

## What a real beta tester should report

Use the [Synthetic beta acceptance report](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose) template in the public Issue chooser. If you prefer not to post publicly, do not submit confidential evidence at all; potential vulnerabilities go via [SECURITY.md](../SECURITY.md) in a private channel.

Include only: full **public Git commit SHA**, candidate version, OS family, Node major version, `PASS` or `FAIL` runner verdict, number of matched cases, list of `BETA_*` rule codes if anything was unexpected, and a *fictional-only* reproduction. You may describe whether the instructions were clear, what took extra steps and any accessibility/usefulness concern. **Do not include** shell history, environment dumps, screenshots with private details, copied raw native CLI results, actual user names or machine paths, real tokens, customer logs, private MCP endpoints, secrets, network destinations, or proof-of-exploitation. Required form checkboxes are not a sanitization mechanism: inspect your own text.

### Engineering and genuine external acceptance remain different

- **Engineering DONE only after:** this script and reporter form are reviewed, source and disposable installed-tarball tests are green on **Ubuntu/Windows × Node20/22**, and the merged main CI is 4/4 PASS. No real test participant is implied by these checks.
- **Independent usability evidence pending until:** an independently operated, consented developer submits a verifiable, sanitized report with public source commit, Node/OS, per-case verdict and feedback. It must be triaged and confirmed against the fixed candidate. Count only reports supported by actual evidence; do not invent testimonials, participation counts, adoption, or security effectiveness.
- **Stable release remains gated:** independent security/provenance assessment [R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43), owner authorization, final artifact identity and publication destination are separate obligations.

The synthetic policy checks are not a penetration test, real-server MCP conformance test or independent security certification.
