# R3 — Internal pre-release security and package review

**Review date:** 2026-10-23  
**Tracked task:** [Issue #35](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/35)  
**Baseline:** `main` at `1acd5f404bcd4bf9e149bcb0b01350e5d1c90c69`, package `0.0.10-rc.1`.  
**Baseline verification:** [CI run 39934937380](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39934937380): **4/4 success**, **358/358 tests per Windows/Ubuntu × Node20/22 job**, no failed/skipped tests.  
**Disposition:** **INTERNAL REVIEW DOCUMENTED; STABLE RELEASE BLOCKED**. This review is not independent assurance, a vulnerability scan, an SBOM attestation, or permission to tag or publish.

## Method and evidence boundary

This was a targeted manual, source-level review of the public GitHub repository, relevant fixture/test contracts and published security documentation. The inspection covered the CLI and JSON parser (`src/cli.mjs`, `src/strict-json.mjs`); policy/oracles/witnesses (`src/policy.mjs`, `src/scenario.mjs`, `src/mock-mcp.mjs`, `src/adapter-harness.mjs`, `src/effect-witness.mjs`, `src/witness-harness.mjs`); JSON-RPC, era, retry and trace validators; first-party subprocess and stdio worker/harness pairs; fixed loopback HTTP module; report contract; packaging tests; package metadata; release documentation; and the four-job CI workflow.

This review **did not** independently execute hostile samples or audit the Node.js/npm binaries, OS permissions, GitHub runner integrity, dependency/toolchain provenance, network environment, or real MCP endpoints. The 358 tests are *developer-authored regression evidence*, not a penetration test. This review did **not** search every possible source string for secrets, verify source ownership beyond the visible public repository, or prove that every byte in the package is safe. The existing R1 disposable local package smoke is cited from CI, not misrepresented as an independently reproduced release artifact. No external system was probed and no package was published.

## Scoped findings and residual risks

| ID | Severity for a **stable release decision** | Source-grounded observation | Treatment |
| --- | --- | --- | --- |
| **R3-01** | **BLOCKING RELEASE GATE** | Package `files` allowlist, zero dependencies and absence of install/publish lifecycle hooks are asserted in [R0 tests](../test/release-package.test.mjs). R2 compares the offline `npm pack` output against an exact path inventory. A path inventory **does not verify file contents** or provenance, and a temporary tarball's self-calculated SHA256 is not an externally anchored release digest. | Independent review of every included file and final artifact, provenance/signature/attestation decision, and secret/private-source inspection **remain open**. Do not advertise supply-chain certification. |
| **R3-02** | **MEDIUM — documented trust boundary** | The `process` and `stdio` drivers launch only fixed repository-owned Node children (`src/process-mcp-harness.mjs`, `src/stdio-mcp-harness.mjs`). Child processes inherit normal OS authority and cannot be considered an OS sandbox. `witness` counters detect *fictional* effects only. | Keep arbitrary executables and private/untrusted workloads out of supported scope. Before implementing any broader adapter, require a separate OS isolation/security review. |
| **R3-03** | **MEDIUM — documented local threat model** | The `loopback` module binds `127.0.0.1:0`, sends one fixed `ping`, bounds body/response/deadline and closes its listener; however another local process can contact that port. Host and Origin headers are not identity/authentication. | Continue to limit the module to synthetic fixed requests; no arbitrary URL, credentials, tool execution or external-target claims. An adversarial local-host review would be required before treating it as a protection boundary. |
| **R3-04** | **MEDIUM — unsupported capability** | Offline policy and MCP-shaped transcript checks validate supplied fictional fields (`src/policy.mjs`, `src/jsonrpc-contract.mjs`, `src/mcp-era-contract.mjs`, `src/mcp-modern-negotiation.mjs`). Their PASS cannot authenticate a person, attest to a real grant, or prove modern/legacy MCP conformance. CLI errors are generic, but the report contract explicitly preserves some fictional native fields and does not implement general DLP. | Maintain the synthetic-only marketing and input policy. Real target tests, OAuth, full interoperability and third-party logs are **not authorized or implemented**. |
| **R3-05** | **LOW — documentation drift** | The threat model previously called a 356-test CI run the latest while main had passed 358 tests. | Correct the current-evidence link while preserving the earlier R0/M4 counts as historical evidence. |
| **R3-06** | **BLOCKING RELEASE GATE** | `docs/RELEASE_READINESS.md` still has unchecked independent security review, distribution destination/maintainer approval, final stable-version decision and post-publication gates. No signed tag/Release or npm registry publication was authorized. | Leave stable release status **NOT RELEASED**. Treat this R3 internal review as traceability, not independent sign-off or blanket owner consent. |

These are release risks, existing limitations and a corrected documentation error, **not claims of confirmed exploitable vulnerabilities**. A targeted review finding no proven exploit must not be phrased as proof of absence of vulnerabilities.

## Control-to-test traceability

| Surface | Implementation and negative-control evidence | Assertion supported / not supported |
| --- | --- | --- |
| CLI input and error output | `src/cli.mjs`, `src/strict-json.mjs`, `test/cli.test.mjs`, `test/strict-json.test.mjs`, `test/report-contract.test.mjs` | Bounded synthetic file parsing and generic CLI error reporting; **not** secure arbitrary-file confinement or general data loss prevention |
| Synthetic authorization/effects | `src/policy.mjs`, `src/effect-witness.mjs`, `test/security-negative-controls.test.mjs`, `test/witness-harness.test.mjs` | Independent fictional expectations and in-memory witnessed effects; **not** real principal authorization |
| IPC and stdio mocks | `src/process-mcp-harness.mjs`, `src/stdio-mcp-harness.mjs`, `test/process-mcp.test.mjs`, `test/stdio-mcp.test.mjs` | Fixed child, bounded batch/deadlines, crash/error controls; **not** arbitrary untrusted child isolation |
| Local HTTP mock | `src/loopback-http-mock.mjs`, `test/loopback-http.test.mjs` | Fixed IPv4 loopback listener, deny controls and cleanup; **not** authenticating local peers or validating remote MCP |
| Packaging and install | `package.json`, `test/release-package.test.mjs`, `test/expected-package-files.json`, `test/installed-cli-smoke.test.mjs` | Offline package path constraints and disposable installed CLI PASS/FAIL/ERROR; **not** artifact provenance, byte-level audit or registry release |
| Automation provenance | `.github/workflows/ci.yml` | Read-only workflow permission, SHA-pinned actions, four OS/Node jobs; **not** independent code audit or guaranteed uncompromised infrastructure |

## Checked engineering criteria, not a release sign-off

- [x] Public tracked file list and packaging metadata inspected; no required runtime dependencies or install scripts declared in `package.json`.
- [x] CLI/file, local-only HTTP, mock stdio/process, policy and output boundaries inspected at source level and matched to existing regression evidence.
- [x] Exact package-file inventory expanded deliberately from **54 to 55** only because this report is now included in `docs/`, with a reviewable one-line manifest addition. R2's earlier **54-path** historical acceptance remains true.
- [x] Clear distinction between synthetic evidence and independent evaluation retained in public docs; inaccurate “latest CI 356” wording corrected.
- [ ] Independently review all **55 packaged files and their bytes** for secrets/private data, code provenance and unexpected execution capability.
- [ ] Decide and verify final publication method, registry namespace/account protections where applicable, immutable artifact hash and provenance.
- [ ] Explicit owner authorization for release tag/version/destination and separate post-publication checks.

**No auto-publish:** this R3 record does not authorize `npm publish`, `git tag`, GitHub Release creation, credential access, external target scans, real MCP adapters or a stable version change. See [release readiness](RELEASE_READINESS.md), [SECURITY](../SECURITY.md), [threat model](THREAT_MODEL.md), and [roadmap](../ROADMAP.md).
