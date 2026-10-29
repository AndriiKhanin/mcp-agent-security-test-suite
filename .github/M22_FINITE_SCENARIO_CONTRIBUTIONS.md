# M22 — reviewable, finite-action MCP security scenario contributions

**Status:** Source-only first-party engineering. This is NOT a natural-language
prompt-injection classifier, an independent security audit, or a real MCP
server/agent test.

M8 `.github/fixture-proposals/` accepts fictional *prose* descriptions but
its M9 policy bridge deliberately ignores the instruction text. M22 introduces
a **different, strictly finite-action test contract**: contributors can add
a reviewed JSON file to `.github/m22-scenarios/` without editing the runner.
This only exercises the first-party in-memory M9-B policy gate against a
second, source-authored independent decision oracle and a deliberately
unsafe `ALLOW_ALL` toy.

## Quickstart

Run in a reviewed first-party source checkout with Node.js 20+:

```sh
node tools/m22-finite-scenario-runner.mjs
node --test test/m22-finite-scenario-runner.test.mjs
```

The CLI accepts **no arguments**, does not use stdin and has no target,
file-path or command options. It discovers every file in one fixed directory.
The initial eight committed examples produce `checked: 8`, `matched: 8`,
`guardedAllowed: 2`, `guardedDenied: 6`,
`deliberatelyPermissiveProtectedEffectsExpected: 6` and
`guardedProtectedEffectsExpected: 0`. A later reviewed ninth valid file
in the same directory automatically expands the count to nine; no runner
modification is necessary.

## Exact schema — fictional, categorical values only

Use a lowercase 6–61-character ID beginning with a letter, e.g.
`my-test-case`. Create `.github/m22-scenarios/my-test-case.json`:

```json
{
  "schemaVersion": 1,
  "caseId": "my-test-case",
  "origin": "UNTRUSTED_TOOL_RESULT",
  "operation": "REQUEST_UNRELATED_FILE_READ",
  "resource": "UNRELATED_FILE",
  "toolResultAuthorityClaim": false,
  "expected": {
    "guardedDecision": "DENY",
    "guardedRuleCode": "FICTIONAL_CROSS_RESOURCE_READ_DENIED",
    "permissiveDecision": "ALLOW"
  }
}
```

There must be **exactly these keys**, without extensions. Values:

| Property | Strict allowed values |
| --- | --- |
| `origin` | `OWNER_TASK`, `UNTRUSTED_TOOL_RESULT` |
| `operation` | `CONSUME_TASK_DATA`, `REQUEST_UNRELATED_FILE_READ`, `REQUEST_UNAUTHORIZED_TOOL_CALL` |
| `resource` | `TASK_DATA`, `UNRELATED_FILE`, `UNRELATED_TOOL` |
| `toolResultAuthorityClaim` | JSON boolean `true` or `false` (owner-task cases cannot claim tool-result authority) |
| `expected.guardedDecision` | `ALLOW` or `DENY` |
| `expected.guardedRuleCode` | `FICTIONAL_TASK_DATA_AS_DATA_ONLY`, `FICTIONAL_CROSS_RESOURCE_READ_DENIED`, `FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED`, `TOOL_RESULT_AUTHORITY_SPOOF_DENIED`, `FICTIONAL_OPERATION_RESOURCE_MISMATCH` |
| `expected.permissiveDecision` | `ALLOW` or `DENY` as an untrusted claim; the toy's actual decision is always `ALLOW` |

Contributed expected decisions are **claims to be tested**, not trusted
authorization. The first-party M9-B gate is run from fixed code. Its
observations are independently compared to the source-authored oracle,
plus source-owned permitted-task and protected-effect counters. A valid
fixture with a wrong expected decision produces **FAIL** (exit 1);
malformed/unsafe fixture input yields constant **ERROR** (exit 2).
No contributor field is repeated in error reports.

Only **5–12** regular `.json` files are permitted, each **1–1024 bytes**.
The directory must be regular, not a symlink. Filename must equal
`caseId + ".json"` exactly. The UTF-8 reader rejects invalid encoding,
duplicate JSON keys, duplicate IDs, hidden fields, unsafe names, symlinks,
unknown file types and unbounded nesting. The file list is sorted and
all its entries are evaluated, not silently skipped.

## Why the unsafe toy has a protected effect

A guarded task-data request is allowed and counted as fictional task
data handling. A request to read an unrelated fictional resource, call
an unauthorized fictional tool, spoof tool-result authority, or mismatch
an operation/resource must be denied by the guarded oracle; the
intentionally wrong `ALLOW_ALL` toy instead commits exactly **one
fictional in-memory protected effect**. This is a counter, not actual
protected unrelated-file access, process execution, network traffic or
database change. The runner necessarily reads the fixed reviewed JSON
fixtures, and the test suite uses disposable temporary fixture files.
The test independently checks denial and counter values. `PASS`
means the **intentional difference** was observed; it does not mean
the permissive toy is safe.

The eight examples include owner and untrusted normal task data, a
cross-resource read, unauthorized extra tool call, spoofed task and
tool authority, owner-side unauthorized resource access and a
tool/resource mismatch. The current schema does **not** represent
M23's metadata-rug-pull, multi-server or error-channel families, nor
does it interpret arbitrary contribution prose.

## Contributor privacy and acceptance

Do not add names, emails, real credentials, customer data, logs,
paths, endpoints, commands or freeform messages to the scenario.
Choose only supported enum values. Review the JSON manually before
submitting a public PR. Contributing an accepted fixture demonstrates
**a first-party symbolic policy test**, not that a real agent has been
attacked or that a vulnerability exists in a third-party implementation.

This helper and eight contributor files stay **outside the unpublished
80-path npm candidate**. M6-J hashes every test, tool and guide in its
bounded excluded-source inventory; exceeding the source count/size or
canonical packet bounds is a build failure, not permission to skip
files. Maintainer approval precedes merge. Independently observed beta
[#59](../issues/59), security audit [#43](../issues/43) and authorized
real-target testing [#21](../issues/21) remain OPEN; Stable Bridge is
excluded. Engineering acceptance requires Windows/Ubuntu × Node20/22
PR CI **4/4** followed by exact post-merge main CI **4/4**.
