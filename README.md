# MCP Agent Security Test Suite

A new, independent project for reproducible testing of **synthetic** MCP and AI-agent security scenarios.

> **Public project scaffold — source release pending.** The first code release is undergoing an independent-source and licensing review. This repository currently does **not** offer an installable or certified security product.

## Intended scope

The initial independently developed prototype covers:

- Fictional tool authorization checks: owner, resource audience, scope, expiration, replay and approval.
- Deterministic fault and recovery scenarios, including uncertain post-commit outcomes.
- In-memory mock tool calls and harness-owned synthetic-effect observation.
- Offline JSON-RPC message correlation, with separate modern and legacy MCP transcript test profiles.
- Synthetic protocol version and capability negotiation errors.

The existing prototype has passed **243 of 243 tests on Windows (Node.js 22.18.0)** as of 2026-10-22. These are developer-authored tests of synthetic fixtures, **not** independently verified security findings or certification. The code and test report are not published here yet.

## Safety boundaries

This project will **not** publish proprietary agent runtimes, internal customer data, credentials or real activity logs. The initial public release will not connect to external MCP servers, make remote calls or execute arbitrary tools. Process separation in the prototype is not an operating-system sandbox.

A passing test can only show consistency with the tested rules and supplied synthetic evidence; it does not prove that an actual agent or MCP server is secure.

## Status and participation

See [ROADMAP.md](ROADMAP.md) for release gates and planned improvements, and [SECURITY.md](SECURITY.md) before sharing a security report. Issues are welcome for use-case discussion, but **do not attach private logs, real secrets, internal endpoint URLs or confidential source code**.

License and source publication are pending owner IP/provenance review. Until a license is added, please do not assume permission to redistribute a future source snapshot.

## Reference specifications

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
- [OWASP Agentic Security Initiative](https://genai.owasp.org/)

No affiliation with, endorsement by or certification from the reference organizations is implied.
