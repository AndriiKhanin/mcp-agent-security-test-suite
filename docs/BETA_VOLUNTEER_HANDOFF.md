# Volunteer offline beta handoff — v0.0.10-rc.1

**Status: invitation-ready instructions only. No independent tester, outreach,
accepted external beta, live MCP evaluation, stable release or certification
is claimed.** The contributor must opt in independently. Do not send
unsolicited invitations or inspect real MCP servers.

## What to expect

This open-source project currently tests **fictional, local MCP-shaped
security contracts**. It cannot audit your own MCP service or authenticate
your project. You need Git, Node.js 20 or 22, and a disposable checkout.
Do not supply secrets, logs, production URLs or customer code.

## Reproducible offline-first check

Review the source and its [security boundaries](../SECURITY.md) before
running any commands. Choose the specific public revision agreed with the
maintainer. Do **not** substitute a floating branch for an agreed commit.

```sh
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd mcp-agent-security-test-suite
git switch --detach <AGREED_PUBLIC_40_CHARACTER_COMMIT_SHA>
node --version
node tools/beta-review.mjs
```

The clone uses the network to fetch *public source*. The last command
uses **only local Git metadata** and five bundled fictional acceptance
checks; it does not contact a user MCP server. The beta helper outputs a
self-reported Markdown card and rejects dirty/unverifiable checkouts.
The helper is present in a **source checkout**, not the npm package.

The tool's displayed SHA is **not independently authenticated**; inspect
the public GitHub commit and manually check it matches the agreed revision.
Its five checks can detect expected fictional failures. PASS is not an
MCP security assessment or confirmation of independent reviewer provenance.

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
[SECURITY.md](../SECURITY.md). Submission is **manual and optional**. No
telemetry or automatic GitHub Issue creation exists.

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
