# R4 — Temporary offline artifact integrity and reproducibility

**Scope:** [Issue #38](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/38); candidate `0.0.10-rc.1`. **NOT a release, independent rebuild attestation, signature, npm publication or security certification.**

## What the automated test verifies

`test/r4-artifact-integrity.test.mjs` runs entirely from trusted checked-out first-party source, Node.js and bundled npm. Within **each OS/Node CI job** it:

1. Invokes `npm pack --json --offline --ignore-scripts` twice from the **same checkout**, into two distinct OS-temporary directories with isolated npm homes and caches. It verifies each real archive's bounded size, exact name and version.
2. Recalculates SHA-1 against npm's `shasum`, SHA-512 against npm's `integrity` descriptor and its own SHA-256 for both archives. The two archive byte streams and SHA-256 digests **must agree**.
3. Checks both packaging descriptors against the exact sorted package path list in `test/expected-package-files.json`. Intentional additions to public `docs/`, `src/`, `fixtures/` or `examples/` must explicitly update this separate manifest. The reviewed R3 baseline had 55 packaged paths; adding this R4 document makes **56**.
4. Installs the first *local* tarball with `--offline --ignore-scripts --no-audit --no-fund --no-save`, then compares the SHA-256 and bytes of **every packaged file** against the corresponding source checkout file, allowing only npm's exact Windows CRLF-to-LF normalization on the first shebang line of the fixed `src/cli.mjs` bin. No other EOL or content changes are accepted.
5. Exercises independent synthetic negative controls that reject changed archive bytes, changed installed-file bytes and added/removed manifest paths. It removes both tarballs, all isolated npm homes/cache and the installation in a `finally` block.

Run as part of `node --test`; `npm test` invokes the same suite. The R4 test intentionally does **not** emit, publish, upload, sign or retain a release archive. Its checks run against the current sources, not the final owner-approved published artifact.

## Evidence and limitations

- **Same-job reproducibility, not global reproducible builds.** Two packs use the same checkout and Node/npm toolchain. They do not prove byte equality across Linux and Windows, different npm versions, different CI runners or different build times.
- **Self-computed digests, not provenance.** A SHA-256, the npm SHA-1 `shasum` and SHA-512 `integrity` are calculated or verified in that job; none is a signature, externally anchored hash, independent source identity attestation or third-party audit.
- **Source-to-installed bytes, not source trust.** Exact equality (aside from the explicitly checked single-shebang newline normalization on Windows) detects other differences in the test's packaging/install path, but cannot prove that the checked-out source itself contains no malicious code, secrets, private material, harmful dependencies or unwanted effects.
- **Offline test, no publication.** The script uses local archives with npm offline mode and disabled lifecycle scripts; no npm registry, credentials, tags, signing keys or external MCP targets are needed. The existing fixed first-party loopback regression suite may open temporary `127.0.0.1` sockets.
- **Rebuild evidence is conditional.** Acceptance requires the scoped PR, four successful Windows/Ubuntu × Node20/22 CI jobs, a merge and four successful post-merge jobs. A future *actual release* requires separate source/content review, final artifact hash/attestation decision, explicit owner authorization, destination selection and independent validation.

See [release readiness](RELEASE_READINESS.md), [R3 internal review](R3_INTERNAL_RELEASE_REVIEW.md), [threat model](THREAT_MODEL.md) and [roadmap](../ROADMAP.md).

## Accepted engineering evidence (2026-10-23)

- [Issue #38](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/38) closed after [PR #39](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/pull/39) merged at `7297b2e919dfa15efc16b518f7d23084b77e12ae`.
- [Corrected PR CI 39938264780](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39938264780) and [post-merge main CI 39938436907](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39938436907): **4/4 PASS, 360/360 tests on each Windows/Ubuntu Node20/22 job**, 0 failed/skipped. Earlier red Windows jobs were resolved by the strictly scoped npm bin-shebang normalization check; they are not counted as passing.
- **Release disposition:** Still NOT RELEASED. Independent source review, final artifact identity/provenance, owner destination decision, explicit authorization and final post-publication verification remain separate outstanding obligations.
