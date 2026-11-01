# M23 — source-only community attack families

M23 compares unsafe and guarded **first-party deterministic toys** for metadata rug pulls, cross-server authority spoofing and synthetic error leaks. No real agent, server, secrets, files or external traffic.

## Run from a reviewed source checkout (Node 20/22)

```sh
node tools/m23-community-attack-families.mjs
```

No arguments allowed. Output contains only symbolic IDs and counters. PASS means **12/12 fixed toy controls matched**, not real-world protection.

## Fixed fictional controls

| Case | Unsafe toy | Guarded toy |
| --- | --- | --- |
| `RUG_UNCHANGED` | Handles approved task | Handles approved task |
| `RUG_DESCRIPTION_CHANGED` | Trusts changed description; one extra fictional protected effect | Rejects changed metadata |
| `MULTI_SAME_OWNER` | Handles legitimate data | Handles legitimate data |
| `MULTI_CROSS_OWNER` | Trusts cross-server result as authority | Rejects foreign owner |
| `MULTI_FORGED_OWNER_CLAIM` | Trusts claimed owner | Rejects forged ownership |
| `ERROR_SUCCESS_CONTROL` | Normal result | Normal result |
| `ERROR_GENERIC_CONTROL` | Generic error | Generic error |
| `ERROR_ENV_ECHO` | Includes fabricated environment marker in error | Returns fixed generic error |
| `ERROR_PATH_ECHO` | Includes fabricated path marker | Returns fixed generic error |
| `ERROR_HEADER_ECHO` | Includes fabricated header marker | Returns fixed generic error |
| `RUG_HIDDEN_DESCRIPTION_INSTRUCTION` | Treats HTML-comment-like instruction in a changed tool description as authority for an extra fictional effect | Rejects descriptor drift before execution |
| `RUG_SCHEMA_SWAP_AFTER_APPROVAL` | Trusts modified `inputSchema` after the fictional approval snapshot | Rejects schema identity drift before execution |

At fictional approval, M23 pins the description's **SHA-256** and serialized `inputSchema`; each toy session compares both, plus name/scope. Any mismatch is denied. A hash detects changes but **does not prove approval, ownership or safety of the initial description**. No real LLM, real MCP session, or authenticated TOCTOU enforcement is tested.

Expected: `checked: 12`, `matched: 12`, five unsafe toy effects and three synthetic error leaks; **zero** guarded effects/leaks. Negative mutations reject forged witnesses and missing enforcement.

## Privacy, scope and provenance

All markers are fixed synthetic strings. Do not submit private descriptions, credentials, logs, paths or headers. Source-only tooling remains outside the frozen 80-file npm candidate. M6-J hashes the excluded tree under unchanged limits. No release, audit or beta acceptance is implied.

**Historical baseline:** [PR #289](../pull/289) original **10/10**, 4/4 [PR CI](../actions/runs/40930112479) and [main CI](../actions/runs/40930780325). Neither covers these new cases; the 12-case revision needs its own exact-SHA full test.

Real-target consent [#21](../issues/21), independent audit [#43](../issues/43), and independent beta [#59](../issues/59) remain open. See the [M22 contributor protocol](../issues/287) for separate bounded scenario inputs; M23 does not reinterpret M8 tool-result fixtures as real approval.
