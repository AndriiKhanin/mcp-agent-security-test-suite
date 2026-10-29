# M23 — community-requested first-party attack-family differential

This source-only experiment adds **three distinct security families**
proposed in public X feedback: changing tool metadata after registration
("rug pulls"), cross-server authority claims, and secret-like material
echoed into an error response. It complements the finite policy fixture
plan [M22 #287](../issues/287). It is **not** a new M8 user fixture format:
the current M8 schema represents only untrusted tool-result text, so it
cannot truthfully encode all three of these other trust boundaries.

## Run

From a reviewed source checkout using Node.js 20 or 22:

```sh
node tools/m23-community-attack-families.mjs
```

The command accepts **zero arguments**, performs **no network access**,
does not read environment variables, files, credentials or actual request
headers, and cannot contact Stable Bridge or a user's MCP server.
The user-visible JSON is **source-only**, with fixed case identifiers
and bounded counters. It does not expose underlying synthetic markers.

## Fixed toy scenarios

| Control | Intentionally vulnerable toy | Guarded toy |
| --- | --- | --- |
| `RUG_UNCHANGED` | Allows the original registered description | Allows the same original description |
| `RUG_DESCRIPTION_CHANGED` | Trusts changed description, permits one fictional extra protected action | Rejects the descriptor mismatch before execution |
| `MULTI_SAME_OWNER` | Allows legitimate task data | Allows legitimate task data |
| `MULTI_CROSS_OWNER` | Treats a different server's tool result as authorization | Denies cross-owner protected effect |
| `MULTI_FORGED_OWNER_CLAIM` | Trusts the claimed origin despite a different actual fictional owner | Compares to server-owned resource ownership and denies |
| `ERROR_SUCCESS_CONTROL` | Normal response with no leak | Normal response with no leak |
| `ERROR_GENERIC_CONTROL` | Generic failure with no leak | Generic failure with no leak |
| `ERROR_ENV_ECHO` | Error string includes a **fabricated** environment-like marker | Returns a fixed generic error |
| `ERROR_PATH_ECHO` | Error string includes a **fabricated** path-like marker | Returns a fixed generic error |
| `ERROR_HEADER_ECHO` | Error string includes a **fabricated** header-like marker | Returns a fixed generic error |

The "unsafe" tool is a deterministic toy policy that has deliberately
incorrect behavior. Nothing interprets arbitrary text; there is **no
real LLM**, real authorization, file opening, tool execution or actual
server routing. The metadata is an in-memory object, not a software
installation. Cross-server ownership is represented by two *literal*
source-owned names, not authenticated multi-server isolation.
The synthetic error contexts are **literal strings in the source
file**, not environment variables, paths or headers obtained from a host.

The **independent fixed-source expected-outcome table** requires
exactly **10/10** case matches, including three intentionally exposed
protected effects and three intentionally exposed error-channel leaks
under the permissive toys, and **zero protected effects and zero leaks**
on guarded counterparts. Three benign controls must stay permitted.
Negative mutations detect hidden unsafe behavior, falsely denied
legitimate operations, leaking guarded paths, false "secure" outcomes,
sparse arrays, getter-bearing observations and absent evidence.

Expected terminal result: `status: "PASS"`, `checked: 10`,
`matched: 10`. A green result means **the intentionally vulnerable
toy outcomes were identified and the fixed guarded outcomes matched**,
not that the permissive toy is safe.

## Contribution pathway and limitations

These three attack families could motivate *future separate contributor
schemas*. Contributors can discuss a scenario without sending real
credentials or proprietary logs. Do **not** submit actual error messages
from your workplace, real header dumps, private paths, private tool
descriptions, internal network topology, or environment snapshots.
A sanitized fictional submission still needs explicit review. There is
no security certification, natural-language prompt-injection test,
independent user beta or live MCP interoperability evidence here.

The source-only helper and tests are excluded from the unpublished
fixed **80-path** npm candidate. M6-J still hashes every excluded source
file with strict upper bounds; neither the shipping package nor
release gates are modified. External target approval
[#21](../issues/21), independent security audit [#43](../issues/43)
and independent beta [#59](../issues/59) remain OPEN.
Engineering acceptance requires 4/4 Windows/Ubuntu Node20/22 PR CI and
separate 4/4 matched post-merge main CI.
