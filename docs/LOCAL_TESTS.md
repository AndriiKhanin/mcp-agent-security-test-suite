# Local test execution (Windows laptop; GitHub Actions manual only)

**Policy, 2026-10-31:** normal development uses local checks. [CI workflow](../.github/workflows/ci.yml) is `workflow_dispatch` **only**: no `push`, `pull_request` or scheduled cloud jobs. Retain its Windows/Ubuntu × Node 20/22 matrix as an **explicit manual independent/release gate**. Do not register an always-on public-repository self-hosted runner on a personal laptop; untrusted PR code is unsafe to run automatically. Never treat a local PASS as independent beta, real-target authorization or security certification.

## Windows: one local command

Use a **reviewed checkout of our repository**, not an unknown fork or unreviewed pull request. Requires Node.js 20 or 22, npm (bundled with Node) and Git on PATH. No dependency install, credentials or external MCP targets are required.

```powershell
git clone https://github.com/AndriiKhanin/mcp-agent-security-test-suite.git
cd .\mcp-agent-security-test-suite
node --version
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\local-ci.ps1 -Quick
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\local-ci.ps1
```

Run the `-Quick` command during normal editing (selected CLI tests + fixed synthetic smoke). Run without `-Quick` before merging significant changes: `node --test` on the entire source checkout + `node examples/offline-ci-check.mjs`. These are the *same commands* as the old GitHub workflow (`npm test` maps to `node --test`). The runner forces offline npm configuration and ignores npm lifecycle scripts; it never downloads dependencies, publishes, makes a GitHub API call, changes git history or executes user-provided MCP endpoints.

The script prints `LOCAL_CI PASS` or `LOCAL_CI FAIL` and writes `receipt.json` + `console.log` to a fresh temp folder (`%TEMP%\mcp-local-ci-...`). The receipt includes the exact Git commit, Node version, mode, tracked-working-tree dirty flag and log path. **Only a PASS with the intended SHA and no unreviewed edits is valid evidence.** Preserve failed logs locally; never paste private machine details or credentials into public issues.

For both supported Windows Node versions, select an installed Node 20 and then Node 22 with your normal version manager, running the full command each time. The script explicitly rejects other versions. It **does not silently install or change Node versions**.

## Optional Ubuntu verification on the same laptop (WSL2)

Only if Ubuntu/WSL2 and compatible Node are already installed, open your *reviewed* checkout from an Ubuntu terminal, and run:

```bash
node --version
node --test
node examples/offline-ci-check.mjs
```

Repeat for Node 20 and Node 22 after selecting each version in Ubuntu. Ubuntu is a **separate** environment: running Windows tests alone does not establish cross-platform coverage. If WSL2 or a second Node version is unavailable, label it **NOT RUN**, not PASS; request one **manual** GitHub workflow run only for an important release gate. Do not install WSL2, change Windows settings or install Node variants automatically without the laptop owner's explicit choice.

## Release/merge criteria and remaining limitations

1. Ordinary commits/PRs: local quick checks; before a substantive merge, full Windows local checks on supported version(s). Store git SHA and local evidence. CI may remain unverified in GitHub by design.
2. Before an approved prerelease/stable publication or high-risk security change, explicitly run the **manual** GitHub Actions matrix and independently verify all four jobs on the **exact candidate SHA**. Never claim 4/4 unless that run exists.
3. Do not merge an untested shell script on the basis of documentation alone. If a locally installed Windows runner cannot be executed in the current session, report it as **PENDING LOCAL EXECUTION** and use the operator-provided receipt to close the gate.
4. Existing strict 240-file / 2 MB source custody, unpublished 80-path npm candidate, and external permission [#21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21) are unchanged. All scenarios and mocks remain first-party fictional; no live customer scanner capability.

Tracking: [finite product finish line #385](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/385). To restore automatic GitHub checks later, require a deliberate reviewed workflow change and a budget decision, not an accidental push.
