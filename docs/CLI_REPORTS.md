# CLI report contract — schema v1

The standalone MIT [MCP Agent Security Test Suite](../README.md) emits a machine-readable **JSON object on stdout** for every supported CLI invocation, including invalid input. Results are from **fictional offline contract checks**, not a live MCP server scan or a security certification.

**Applies to:** `node src/cli.mjs <command> <synthetic-file>`. Supported commands are `scenario`, `trace`, `mock`, `witness`, `process`, `stdio`, `loopback`, `jsonrpc`, `era`, and `negotiate`. Node.js 20+ and no `npm install` or paid API are required.

## Stable fields (v1)

| Field | Type | Meaning |
| --- | --- | --- |
| `reportSchemaVersion` | integer, exactly `1` | Major JSON report contract version, **not** package version |
| `command` | one of the ten supported command strings, or `null` | Validated command; unknown untrusted argument is never echoed |
| `status` | `"PASS"`, `"FAIL"`, `"ERROR"` | Test contracts pass, violations detected, or CLI input/usage invalid |
| `exitCode` | integer `0`, `1`, `2` | Mirrors process exit code |
| `summary.failureCount` | nonnegative integer | Number of violations reported by the validator, or length of legacy mismatch array |
| `summary.reportedFindings` | nonnegative integer | Number of detailed findings **actually present** in the output |
| `summary.findingsTruncated` | boolean | True when a validator signals that it omitted additional findings |
| `summary.ruleCodes` | lexicographically sorted unique array of symbolic codes | Codes from retained findings only; not counts of omitted findings |
| `errorCode` | symbolic string **only when** `status=ERROR` | Either `INVALID_CLI_ARGUMENTS` or `INVALID_OR_UNREADABLE_INPUT` |

These fields are **additive** to pre-existing command-specific top-level fields such as `findings`, `failures`, `mismatches`, `steps`, `checks`, `scenario`, `actualFinal`, `observedFinal` or `failureCount`. Existing consumers of `status` or a command's native finding arrays still work; consumers requiring only the versioned contract should select the common fields above. A new major schema version is necessary before deliberately removing or renaming v1 fields.

**Ordering:** native command-specific fields retain their stable sequence, and `reportSchemaVersion`, `command`, `exitCode`, `summary` follow in fixed order. `summary.ruleCodes` are sorted and deduplicated. CI should parse JSON keys structurally, not depend on property order.

### Exit codes

| Code | Status | Meaning |
| --- | --- | --- |
| `0` | `PASS` | Given fictional fixture satisfied the selected profile |
| `1` | `FAIL` | Violations or synthetic expectation mismatches found; findings are ordinary test output |
| `2` | `ERROR` | Invalid invocation, unreadable path, malformed/oversized input or failed processing; no input path, user payload or exception text is included in the **generic error report** |

`stderr` retains a fixed help/error string for humans. Do not treat `stderr` contents as JSON. When exit code is `2`, stdout holds a generic structured error with `command`, `errorCode` and an empty summary; the CLI does **not** emit full input, stack traces or exception text. Usage errors do not include unknown command text.

## Examples

Positive fictional fixture:

```sh
node src/cli.mjs negotiate fixtures/mcp-negotiate-safe.json
```

Excerpt of the JSON object (other native fields omitted):

```json
{
  "status": "PASS",
  "reportSchemaVersion": 1,
  "command": "negotiate",
  "exitCode": 0,
  "summary": {
    "failureCount": 0,
    "reportedFindings": 0,
    "findingsTruncated": false,
    "ruleCodes": []
  }
}
```

Negative fictional fixture — **expected exit code 1**:

```sh
node src/cli.mjs negotiate fixtures/mcp-negotiate-unsafe-params.json
```

A v1 summary includes `"status": "FAIL"`, `"exitCode": 1`, and a `summary.ruleCodes` entry for `RETRY_PARAMS_CHANGED`. The full output includes the validator's native bounded `findings` array, not the mutated tool-call arguments.

Bad invocation / invalid input (excerpt; `errorCode` is stable but deliberately generic):

```json
{
  "reportSchemaVersion": 1,
  "command": "scenario",
  "exitCode": 2,
  "status": "ERROR",
  "errorCode": "INVALID_OR_UNREADABLE_INPUT",
  "summary": {
    "failureCount": 0,
    "reportedFindings": 0,
    "findingsTruncated": false,
    "ruleCodes": []
  }
}
```

For workflows, check the operating-system exit code, then parse stdout JSON for `status`, `reportSchemaVersion` and `summary.ruleCodes`. The existing SHA-pinned repository [CI](../.github/workflows/ci.yml) exercises these cases on Ubuntu/Windows with Node20/22.

## Bounding, redaction and limitations

- `src/cli.mjs` reads at most 1 MiB and rejects non-regular files, invalid UTF-8 or invalid JSON; command validators bound their input counts and detail arrays. This does **not** constitute an OS sandbox or a safe arbitrary-file reader.
- Error handling never copies input filenames, source payloads, parser messages or exception stacks into generic CLI error objects. `summary.ruleCodes` only uses bounded uppercase internal-looking codes; nonmatching values are displayed as `UNCLASSIFIED_FINDING` in **summary**.
- Existing **native per-command detail fields remain unchanged** for backward compatibility. In particular, a fixture's syntactically valid fictional `scenario` identifier and some native result fields may appear in output. This is **not general-purpose DLP** and does not authorize real credentials or customer data as fixture input.
- `summary.reportedFindings` can be smaller than `summary.failureCount` when a validator truncates its detailed findings. Missing findings are not reconstructed or guessed; callers should honor `summary.findingsTruncated`.
- The report format itself makes no network connection, arbitrary subprocess, paid API call or remote target request. The optional `loopback` command separately opens a **fixed temporary local TCP listener on 127.0.0.1**, and never accepts an external URL. Existing `process` tests still use the fixed bundled child process, **not** untrusted binaries.
- All coverage is developer-authored synthetic regression evidence. It does not prove real MCP security, complete JSON-RPC/MCP conformance or independent certification.

See [SECURITY.md](../SECURITY.md), [threat model](THREAT_MODEL.md) and [Roadmap M2-01 (#5)](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/5).
