# M23 — source-only community attack families

M23 compares deliberately unsafe and guarded **first-party deterministic toys**. It tests the *expected effects* of three families: tool-metadata changes ("rug pulls"), cross-server authority spoofing, and fabricated secret-like text in error responses. There is no real agent, user MCP connection, tool execution, environment read, file access, credential use, or external network traffic.

## Run from a reviewed source checkout (Node 20/22)

```sh
node tools/m23-community-attack-families.mjs
```

Zero CLI arguments only. Output is a bounded JSON report with symbolic case IDs and counters, not the underlying synthetic attack strings. A PASS means the source-authored unsafe-versus-guarded differential matched **12/12 fixed controls**, not that a real product is immune to these attacks.

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

For the last two cases, the approved metadata is a **literal in-memory snapshot**, not a signed grant or verified MCP registration. The hidden description is fixed inert text; the schema swap changes the fixed `required` list. They measure a source-authored toy's enforcement decision, **not** detection by a real language model, actual authenticated post-approval TOCTOU resistance, or schema changes at a real endpoint.

Expected: `status: "PASS"`, `checked: 12`, `matched: 12`; five intentionally unsafe fictional protected effects, three synthetic error leaks, and **zero protected effects and leaks** in guarded cases. Independent expectation data and negative mutations reject missing effects, compromised guarded cases, malformed/sparse witness rows and misleading PASS claims. Benign controls remain permitted.

## Privacy, scope and provenance

Synthetic error contexts are hard-coded and **never read** from the host. Never submit actual private tool descriptions, credentials, logs, paths, headers or customer data. The tool and tests are **source-only**, excluded from the frozen 80-path unpublished npm candidate. M6-J still hashes all excluded source bytes under its unchanged limits. No external target authorization, independent audit, release or beta acceptance follows from a green local report.

**Historical baseline:** the original **10/10** case version was reviewed in [PR #289](../pull/289), merged as `713092bb51ef182c26d1c60dfd56b37dc6b1630f`; both [PR CI](../actions/runs/40930112479) and [main CI](../actions/runs/40930780325) passed 4/4. Those historical runs **do not** cover the two new cases. The 12-case revision requires its own exact-commit test evidence before merge.

Real-target consent [#21](../issues/21), independent audit [#43](../issues/43), and independent beta [#59](../issues/59) remain open. See the [M22 contributor protocol](../issues/287) for separate bounded scenario inputs; M23 does not reinterpret M8 tool-result fixtures as real approval.
