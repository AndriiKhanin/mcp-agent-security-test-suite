# Security Policy

**Status:** `v0.0.10-rc.1`, MIT-licensed **synthetic/offline** security-contract test suite. Real MCP target scanning, production security testing, authentication verification and security certification are **not supported**. See the [threat model](docs/THREAT_MODEL.md) for assets, attacker assumptions, trust boundaries, implementation evidence and residual risks.

## Responsible disclosure

For a potential vulnerability in this repository's code, use GitHub's private **Report a vulnerability** feature **if enabled**, or contact the repository owner privately through an already trusted channel. Do **not** post exploit payloads, customer records, secrets, private infrastructure details, or reproducible real-target attack instructions to public Issues or PRs. Non-sensitive bug reports and feature requests are welcome in Issues. No guaranteed response SLA is offered.

## Data and execution boundaries

- Use **fictional** fixtures and synthetic canaries only. Do not supply real API keys, OAuth tokens, credentials, customer information, private MCP endpoints, real agent logs or confidential tool responses.
- Test author-supplied grant, owner, origin, scope, resource and nonce fields are **mock data**. A passing scenario does not authenticate a person, establish legal target authorization, verify OAuth or prevent real tool side effects.
- `process` uses a **fixed first-party Node.js child** under ordinary OS account permissions, with a parent-owned in-memory observer. Process separation and reduced environment variables do **not** confer an OS sandbox or protection against malicious native code. Never run arbitrary third-party executables through the harness.
- The `trace` command checks fictional declared safety fields but does **not** search actual files or logs for secrets. Report sanitization is bounded to the implemented synthetic format and is **not** a DLP guarantee.
- JSON-RPC/MCP transcript checks use intentionally restrictive or fictional **offline profiles**, not universal protocol conformance.

## Future real-system testing

No external-target transport is implemented or authorized by the current release. Any future adapter must pass the [pre-connection authorization checklist](docs/THREAT_MODEL.md#5-required-checklist-for-any-future-adapter-not-yet-implemented) before being enabled: explicit operator consent and ownership verification; exact staging-target and operation allowlists; read-only default; no secrets in logs; process and network bounds with cleanup; fail-closed negotiation; no paid services without separate approval; documented threat review and negative controls.

The standalone public repository must never receive source, credentials, internal paths or logs from any separate private or commercial project.
