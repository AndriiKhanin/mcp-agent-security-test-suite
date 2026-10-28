## Contribution category

- [ ] Fixture-only JSON proposal — **no runner, executable, workflow, or dependency changes**
- [ ] Code/docs change — describe the intended trust boundary and authorization separately

## Fixture-only checklist (when applicable)

- [ ] My new fixture lives only under `.github/fixture-proposals/` with a matching fictional `caseId` and filename.
- [ ] I reviewed **every** freeform field manually: no real names, credentials, tokens, API keys, email addresses, personal paths, private URLs, logs or production information.
- [ ] My scenario is wholly fictional, and I have the right to publish its contents under the repository's MIT license.
- [ ] The expected behavior refuses embedded instructions, unrelated file reads and unauthorized tool calls.
- [ ] I ran `node tools/fixture-contributor-summary.mjs` in a reviewed source checkout.
- [ ] I understand that an automated check is **not a comprehensive secret scanner** or sanitization tool.
- [ ] I understand that green CI is **not evidence of a real agent resisting prompt injection**, beta acceptance or security certification.

See the [fixture-only contribution guide](FIXTURE_ONLY_CONTRIBUTIONS.md).
The fixture intake must not read unrelated resources or contact external MCP targets.

## Changes and review

Describe the positive fictional behavior and the expected negative control
without copying private logs, stack traces or real credentials.

For other PR types, state which source contracts or release-candidate boundaries
change and why. Any external agent/MCP target contact needs separate explicit
owner authorization. No PR merge authorizes a production release.

**Local checks (source-only):** describe Node.js version and relevant PASS/FAIL
codes. CI must pass Ubuntu/Windows × Node.js 20/22 (4/4). Maintainer review
and privacy checks are still required.
