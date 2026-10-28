# M9-E — One-command offline fictional fixture batch preflight

**Tracking:** [Issue #213](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/213)  
**Scope:** source-only, repository-owned fictional JSON fixture contributions.

This is **not a real agent**, a prompt-injection detector, an external MCP
evaluation, an independent security audit or a release gate approval.

## What the command does

From a reviewed source checkout with Node.js 20 or 22:

```sh
node tools/fixture-batch-preflight.mjs
node --test test/m9-fixture-batch-preflight.test.mjs
```

No arguments are accepted. The command looks only inside the fixed
`.github/fixture-proposals/` source directory. It requires 1–16 regular
`.json` files, canonical lowercase ASCII fictional filenames and strictly
bounded input; symbolic links, unexpected files and invalid fixture
contents fail closed. Individual proposals are checked by the existing
strict M8 loader and M9-C policy bridge.

For **each** valid fixture, the bridge runs the same four fixed first-party
in-memory policy controls:

| Source-owned synthetic control | Expected result |
| --- | --- |
| Consume legitimate fictional task data as data | ALLOW |
| Reject an unrelated fictional file-read request | DENY |
| Reject an unauthorized fictional tool-call request | DENY |
| Reject a forged tool-result authority claim | DENY |

The preflight independently checks exact symbolic rule codes, the three
expected denials and **zero protected fictional effects**. It then
prints one JSON-v1 report with a total count and ordinal results, not
filenames or input text. It does not execute or semantically analyze any
tool-result instruction. A contributor can submit a **fixture-only PR**:
the existing CI discovers every new file without requiring a runner change.

## Security boundaries

- No real agent, process, shell, model, MCP endpoint, network call,
  credential request or user-supplied script is executed.
- The only file reads are the reviewed, bounded JSON fixture inputs.
  There is **no unrelated real file read** requested by any payload.
- Error reports contain only a fixed rejection code. Successful reports
  contain ordinal indices, static rule names and counts. Neither paths,
  fixture names, embedded instructions nor user data are echoed.
- A `PASS` proves **only** that the fixture is accepted under the schema
  and four simulated policy probes matched. It does **not** establish that
  a real AI agent would resist the actual injection wording, authenticate
  a target or establish a contributor's identity.
- The directory has an explicit 16-file ceiling. Large batches require
  a separately reviewed change; input overflow must never bypass tests.
- This command is source-only, excluded from the exact 80-path npm
  release-candidate inventory. It adds no runtime dependency.

The [fixture-only guide](FIXTURE_ONLY_CONTRIBUTIONS.md) contains the format,
and [M9-C bridge documentation](M9_FIXTURE_POLICY_BRIDGE.md) explains
why the author-supplied prompt text does not drive the policy decisions.
Independent beta [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59),
independent security audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43)
and authorization for real targets [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21)
remain separate and open.
