# R5 — Independent security review handoff (NOT completed)

**Purpose:** provide a bounded source and package evidence pack to an assessor who is independent of the project's code author and can record their own conclusions. **Tracking:** [R5-A #41](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/41). No assessor has been engaged or approved by this document. This is not proof of a completed independent audit.

## Current candidate and trustworthy starting points

- The maintainer's internal R3 source review and risk register: [R3](R3_INTERNAL_RELEASE_REVIEW.md). Its scope is narrower than an independent product security assessment.
- The R4 same-job disposable artifact byte checks: [R4](R4_ARTIFACT_INTEGRITY.md), [verified main CI](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/39938909362) at commit `f4416117755390399e9d0646a31df8e16e7a3dc8`, 4/4 OS/Node jobs and 360/360 tests per job. This is a **historical baseline**, not a cryptographic signature on a future deliverable.
- The active version remains `0.0.10-rc.1`, with **no stable artifact or publication authorization**. M4-B remote testing, credentials, OAuth and general MCP conformance are not implemented or approved.
- [Exact package path inventory](../test/expected-package-files.json) lives outside the distributable archive. Adding this handoff document moves the R4 inventory from 56 to **57 public packaged paths**; additions or omissions must fail R2's offline manifest check.

## Proposed independent assessment procedure

1. **Establish assessor independence and scope.** Record reviewer affiliation, consent, date, source commit SHA, Node/npm versions and host OS. Obtain source through a trustworthy public origin and independently verify its exact Git revision. The maintainer should not supply unpublished proprietary source, local private paths, tokens or credentials.
2. **Read and inspect all 57 distributable paths and code execution surfaces.** Review licensing/provenance, package metadata and script hooks, entrypoint, dependency assumptions, file I/O, process invocation, synthetic policy/witness, fixed HTTP/stdio IPC, error sanitization, CI permissions and complete threat model. Check for credentials/private data using assessor-selected tools and human judgement, not just the bundled preflight.
3. **Run the full current tests from a clean checkout.** Use supported Node >=20 and bundled npm, `npm test` and `npm run release:preflight`. Tests include temporary local loopback listeners on `127.0.0.1`. Do not supply real MCP targets or secrets.
4. **Independently rebuild a temporary candidate artifact.** Use `npm pack --offline --ignore-scripts --json` in a disposable destination. Record the *final candidate* Git SHA, exact 57-path inventory, output filename, raw SHA-256 digest, npm integrity data, npm/Node versions and toolchain provenance. Compare archive and source contents to an independently approved reference supplied over a separately trusted channel, not only to self-computed values in the same run. Dispose of local archives if no release retention is authorized.
5. **Report findings privately.** Classify severity, affected exact path/commit, reproducibility using fictional data only, mitigations and retest evidence. Never post exploit instructions, private logs, keys or identifiable data in public issues. Use the project's [security policy](../SECURITY.md) for private disclosure.
6. **Publish a scoped sign-off decision only after evidence.** Record what was assessed, exclusions, unresolved findings, independent reviewer's sign-off, final source identity, artifact digest/provenance and remaining risks. A passing engineering CI alone is not an independent sign-off.

## R5-A automatic source-content preflight

`test/r5-content-preflight.test.mjs` adds limited pattern checks against all 57 current package source files: file-size limit, valid UTF-8, no embedded NUL and a few high-confidence private-key/token **signatures**. Synthetic positive/negative controls demonstrate rejects. Results contain only file paths and symbolic rule codes; no offending bytes. It runs with `node --test` and has no new runtime dependency, network request or install hook.

**Limitations:** This is a heuristic, not an enterprise secret scanner or DLP guarantee. Unrecognized token formats, split/encoded material, ordinary passwords, unexpected copyrighted source, malicious code or unsafe behavior may pass. Benign strings may trigger false positives. A PASS does not attest source author, license rights, independent build provenance or readiness for live MCP target testing.

## Outstanding release gates

- [ ] Independent reviewer identified, authorized and supplied with a fixed assessment scope
- [ ] Independent inspection of **all packaged bytes** and native capabilities, plus findings and remediation tracking
- [ ] Independent artifact rebuild/hash comparison, provenance and signature/attestation policy
- [ ] Explicit owner approval for the exact release version, destination, tag/registry action and post-publication verification

**Status: NOT RELEASED.** No signing keys, release tags, registry logins, npm publication, external targets, paid APIs or private project files may be used merely because this handoff exists.
