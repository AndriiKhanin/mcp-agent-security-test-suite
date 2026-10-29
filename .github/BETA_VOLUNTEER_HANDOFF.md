# Volunteer offline beta handoff — v0.0.10-rc.1

**Status: public opt-in invitation [#195](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/195) published. No independent tester, accepted external beta, live MCP evaluation, stable release or certification is claimed.** The contributor must opt in independently. Do not send unsolicited invitations or inspect real MCP servers.

## What to expect

This open-source project currently tests **fictional, local MCP-shaped
security contracts**. It cannot audit your own MCP service or authenticate
your project. You need Git, Node.js 20 or 22, and a disposable checkout.
Do not supply secrets, logs, production URLs or customer code.

## Reproducible offline-first check

Review the source and its [security boundaries](../SECURITY.md) before
running any commands. The recommended public reference revision is
`2ad680ed2e4c322374fdabf3c2007e396f893a59`, verified by the four-platform
[main CI run #40842071546](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/actions/runs/40842071546).
This is a **fixed historical source snapshot**, not a promise that later
`main` changes have been reviewed or that an independent tester has run it.
You can evaluate this snapshot without waiting for a maintainer reply.
Do **not** substitute a floating branch for the reviewed commit.

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
git switch --detach 2ad680ed2e4c322374fdabf3c2007e396f893a59
git rev-parse HEAD
node --version
node tools/beta-review.mjs
```

The clone uses the network to fetch *public source*. The last command
uses **only local Git metadata** and five bundled fictional acceptance
checks; it does not contact a user MCP server. The beta helper outputs a
self-reported Markdown card and rejects dirty/unverifiable checkouts.
The helper is present in a **source checkout**, not the npm package.

The printed SHA from `git rev-parse HEAD` and the tool's displayed SHA
must both equal the complete pinned revision above. The local Git SHA is
**not independently authenticated**: independently inspect the
[public commit](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/commit/2ad680ed2e4c322374fdabf3c2007e396f893a59)
and manually compare it. If any SHA differs, stop and do not report a PASS.
Its five checks can detect expected fictional failures. PASS is not an MCP security assessment or confirmation of independent reviewer provenance.

## Optional deeper first-party tour (M14 source revisions only)

The pinned M13 baseline above deliberately contains the original **five**
fictional beta checks, not the later optional M14 tool. If you independently
review a newer **M14-or-later** public revision, you may additionally run
`node tools/beta-capability-tour.mjs`. It exercises two inert adapter
profiles, a fixed fictional tool-result policy, one accepted and one
rejected modern SSE reply over **ephemeral 127.0.0.1 only**. The optional
result should be **4/4 MATCH** with one expected synthetic denial, and
prints no fixture instructions or private payloads. It neither substitutes
for the five-case beta protocol nor constitutes independent security evidence.
Do not silently swap the pinned baseline or supply real URLs/credentials.

## Optional synthetic fixture contribution (separate from beta evidence)

A volunteer may also submit a **fixture-only PR** independently of runner
changes. See the [fixture-only contribution guide](FIXTURE_ONLY_CONTRIBUTIONS.md)
for a strict inert tool-result prompt-injection format, an example, and the
local `node tools/fixture-proposal-check.mjs` validation command. Proposed
tool-result instructions are treated only as untrusted data; nothing runs
an agent, an embedded command or an external MCP target. A schema PASS is
not a prompt-injection detection result.

A proposed fixture **does not** count as independent beta execution or
acceptance under #59. The five-case beta protocol above and its evidence
requirements remain separate. No unsolicited requests for real logs or
live-target access are allowed.

## Submit voluntary, minimal feedback

After running the test yourself, review the generated Markdown card and
provide only the following non-sensitive information through the existing
[opt-in fictional beta report form](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/new/choose):

- The **public** full 40-character commit SHA, Windows or Ubuntu, Node 20
  or 22, runner PASS/FAIL, matched count 0–5, and symbolic failure codes.
- Whether the setup worked, confusing documentation, reproducible *fictional*
  test mismatches, accessibility limitations and specific improvements.

Do not copy environment details, username, email address, local file paths,
private endpoints, tokens, transcripts, shell history, raw log output or
proprietary code. Do not post security vulnerabilities publicly; consult
[SECURITY.md](../SECURITY.md). Submission is **manual and optional**. No telemetry or automatic GitHub Issue creation exists.

## Maintainer triage and strict exit gate

**Issue [#59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59)
remains OPEN** until every item below is evidenced:

1. A genuinely independent, consenting developer actually ran the public
   fictional protocol and provided an attributable, sanitized report.
2. The reviewer checks the exact public commit SHA, OS/Node compatibility,
   five symbolic results and any issues; never treat author CI or the
   volunteer's unverified local receipt as independent provenance.
3. Any reproducible issue is filed and assessed for severity, scope,
   remediation PR, and four-job CI; follow-up results are linked.
4. Fresh `main` CI passes Windows and Ubuntu, Node.js 20 and 22.
5. The owner explicitly decides whether beta acceptance is complete.
   Independent security/provenance audit [#43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43),
   live external target authorization, and release publication remain
   separate blocked gates.

### Sanitized triage record (fill only after a real report exists)

| Field | Required value |
| --- | --- |
| Actual independent participant report | Link to genuine consenting submission; otherwise **NOT VERIFIED** |
| Reviewed public commit SHA | Full 40-character SHA after manual comparison |
| OS and Node major | Windows/Ubuntu, Node 20/22 |
| Fictional five-case outcome | PASS/FAIL, number matched, symbolic rule codes |
| Reproduction/triage | Source-backed fictional steps, severity, linked remediation |
| Independent origin and execution | Independently checked, or **NOT VERIFIED** |
| Fresh Windows/Ubuntu CI | Actual run URL and 4/4 result, or **PENDING** |
| Owner's explicit acceptance | Decision and reference, or **NOT AUTHORIZED** |

**Do not fill placeholder acceptance fields from author-created fixtures,
automated CI, draft reports or assumptions.**
