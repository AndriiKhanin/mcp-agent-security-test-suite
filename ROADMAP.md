# Roadmap and release gates

## Phase 0 — Public project scaffold (current)

- Separate public repository created; commercial/private product remains unchanged.
- Publish boundaries, limitations and an honest engineering status.
- Collect potential developer requirements without requesting access to confidential systems.

## Phase 1 — Reviewed source release (pending)

- Create an exact-file release allowlist for independently written modules, tests and wholly fictional fixtures.
- Review all proposed files for secrets, private paths, proprietary algorithms, copyrighted code and real infrastructure details.
- Decide on an open-source license after confirming ownership and any contributors' rights.
- Run all tests against Node.js 20 and 22, on Windows and on GitHub Actions with reviewed immutable action pins.
- Release minimal docs, synthetic examples, contribution process and a security-reporting channel.
- Mark known limitations and only claim observed evidence.

## Phase 2 — Practical security-testing utility

- Add independent behavioral oracles and controlled negative cases.
- Clarify modern versus legacy MCP compatibility by protocol version.
- Add safe, owner-authorized fake-server transport tests that never hit production.
- Improve synthetic traces, error reports and documented use cases based on maintainer feedback.

## Explicit non-goals for the first release

No real-system exploit scanner, OAuth token oracle, arbitrary external target probing, OS sandbox, production integration or claim of certification. No paid API use is required.

## Grant application

Any Codex-for-OSS application will be prepared only once a genuine, openly licensed and maintained project exists. Neither eligibility nor grant approval is presumed.
