# Security Policy

**Status:** early v0.0.9 synthetic-only test suite; no production or real MCP target testing is supported.

For private vulnerability disclosures, use GitHub’s **Report a vulnerability** feature if available, or contact the repository owner privately through a trusted channel. Do not publish exploit details or secrets in GitHub Issues.

Do not upload API keys, OAuth tokens, real agent logs, confidential MCP tool responses, private endpoints, or customer data. Only fictional fixtures are expected by the initial test suite.

The library does not claim to provide a sandbox for malicious programs, independent verification of third-party MCP servers, OAuth token validation, or security certification. The process-separated tests use the launching account’s usual permissions and must only run the bundled fixed synthetic worker.

No guaranteed response SLA is offered at this stage. Non-sensitive feature requests are welcome through Issues.
