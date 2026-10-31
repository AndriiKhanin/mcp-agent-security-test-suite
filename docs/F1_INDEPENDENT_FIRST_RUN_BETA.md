# F1 independent first-run beta — reviewed source candidate

This is a **fictional-only usability test**, not a live MCP assessment, vulnerability scanner, authorization, published npm package, independent security audit, or accepted beta. Submit feedback only if you independently and voluntarily run the commands. No target URL, credentials, proprietary configuration, customer files or production traces are needed.

## Reviewed baseline

- Repository: `AndriiKhanin/mcp-agent-security-test-suite`
- Exact source commit: `c85b03d01ccfbbd1acb1c21850638712824ed412`
- Context: maintainer-reported Windows Node.js 22.18.0 local full PASS; this does **not** establish independent Windows/Ubuntu beta or four-platform cloud CI for this revision.
- Supported beta environment: Windows or Ubuntu with Git and Node.js 20 or 22. Use a disposable checkout. Inspect source before execution, as local Node programs can execute code.
- This pin identifies the reviewed **pre-beta instruction baseline**, not a published release or a promise that later `main` is safe. Do not silently substitute a floating branch.

## Step 1 — verify the exact revision

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
git switch --detach c85b03d01ccfbbd1acb1c21850638712824ed412
git rev-parse HEAD
git status --short
node --version
```

Manually compare the complete SHA to the [public commit](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/commit/c85b03d01ccfbbd1acb1c21850638712824ed412). Stop if the SHA differs, if the checkout is dirty, or if Node is not version 20/22. A local Git command is not cryptographic proof of remote provenance.

## Step 2 — test the product's guided offline entry point

```sh
node src/cli.mjs start --text
node src/cli.mjs start examples/adapter-profiles/stdio-project.json --text
node src/cli.mjs start
```

The first two commands should exit **0** and print a human-readable summary explicitly stating the user MCP server was **not checked**. The last command should exit **0** with a JSON-v1 report, `productStage:"F1"`, `status:"PASS"`, `externalTargetContacted:false`, `operatorVerified:false` and `projectConnectionAuthorized:false`. These results cover only bundled fictional controls and the suite's disposable **127.0.0.1 loopback MCP mock**. Loopback traffic is still real local network activity, not an external server scan.

Do not pass a real client config or an actual server descriptor for this beta. If the local platform blocks loopback binding, report a local compatibility failure instead of claiming the project was tested.

## Step 3 — run the separate, fixed five-case fictional beta

```sh
node tools/beta-review.mjs
```

In the same clean pinned source checkout, this source-only helper reports local Git identity and executes five fixed first-party fictional acceptance checks. An expected intentionally unsafe scenario is detected by the checks; the combined report should indicate **PASS, 5/5 matched**, exit **0**. Actual mismatches are not an expected PASS. The generated report is locally self-reported; it cannot verify independent tester provenance.

The historical [M13 beta handoff](../.github/BETA_VOLUNTEER_HANDOFF.md) still pins `2ad680ed2e4c322374fdabf3c2007e396f893a59`; it remains a separate reproducible historical profile. Do not mix its CI attestation with the present revision.

## Step 4 — provide minimal independent usability feedback

Review and manually redact all text before posting to [independent beta gate #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) or the [public opt-in feedback form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose). Include only:

1. Public full 40-character revision; Windows or Ubuntu; Node 20 or 22.
2. Whether `start --text`, inert-descriptor `start --text`, and JSON `start` succeeded; observed exit code **0 / 1 / 2** for each.
3. Five-case `beta-review.mjs` verdict and matched count **0–5**; only public symbolic failure codes if needed.
4. What was confusing or inaccessible, plus a minimal fictional-only reproduction.

Do **not** paste raw reports, console histories, usernames, machine paths, local environment variables, proprietary server configs, access tokens, private endpoints or exploit details. Never upload your own real MCP client configuration, even if the command can validate a restricted inert shape. For confidential vulnerabilities follow [SECURITY.md](../SECURITY.md), not public issues.

## Reviewer interpretation

A volunteer result on this revision does not establish compatibility on other platforms or Node majors. No result means an independent run occurred until an actual voluntary report is reviewed. Maintainers must separately triage real feedback, rerun the full matrix on the *accepted* SHA, and obtain owner acceptance. F1 remains IN PROGRESS. F2 access still requires separate approval under [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21); beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) and independent audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43) remain open.
