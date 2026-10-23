# M4-B6-B — disposable fixed first-party staging process

**Status: implementation / engineering CI pending**. [Issue #82](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/82). Owner authorized building **our own isolated staging** only. No external/user-owned MCP, remote deployment, customer credentials or unreviewed process execution.

## Run

```sh
node src/cli.mjs staging-process-selftest
```

This no-argument command launches the exact repository-owned `src/first-party-staging-worker.mjs` path, with `fork`, no shell, no user argv except a fixed reviewed test mode, empty inherited CLI arguments, Node `execArgv: []`, ignored stdio and an explicit minimal environment (`NODE_NO_WARNINGS` only). The child itself executes the existing M4-B6-A **ephemeral IPv4 127.0.0.1** `server/discover` staging exchange. The server and client both reside in this short-lived **trusted child**, not in a remotely addressable service.

The child returns only a fixed symbolic IPC result to the parent. The parent checks exact message keys and values, waits for **clean process exit**, enforces an absolute maximum timeout of 8 seconds, kills only its spawned child on timeout, ignores child stdout/stderr and emits the stable JSON-v1 result without response bodies, credentials, actual port or any untrusted values. Direct-module finite fault cases exercise early exit, hang and malformed IPC; none are exposed through public CLI.

There is **no operating-system security sandbox**: this child runs with the parent OS user's privileges. Process separation, scrubbed env, no shell, and ignored output reduce accidental coupling but cannot confine malicious code or a compromised host. No claim that this process cannot make arbitrary OS calls if its fixed source were changed maliciously.

## Engineering controls

- Parent process accepts only literal `normal`, `exit`, `hang` or `invalid-ipc` trusted test selectors with bounded deadline. Any URL, arbitrary worker path, credentials, shell parameters or unknown option is rejected before starting a child. Public command accepts NO parameters.
- Worker rejects unexpected argv and requires IPC; no user-selected project profiles or server connections. The default worker does one fixed modern discovery round trip and closes the owned socket.
- Unexpected message type, extra IPC fields, canary data, missing message, nonzero exit and timeout all fail closed to **fixed symbolic codes**.
- Worker environment is explicitly constructed; it does not copy parent proxy variables, tokens or other environment entries, and no program/user path is inherited.
- Positive, malformed/hung and repeated/parallel test controls run on Windows/Ubuntu Node20/22 and in a disposable offline npm tarball.
- Never mistake an accepted fixed-worker test or an M4-B2 self-asserted envelope for verified permission to contact real MCP projects.

## Separation from future real integration

Real external target [authorization RFC #21](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/21), independent [R5-B #43](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/43), and actual independent [M5-06 #59](https://github.com/AndriiKhanin/mcp-agent-security-test-suite/issues/59) remain open. Remote TLS/DNS/SSRF protection, operator ownership verification, durable grant revocation, OAuth, actual user MCP methods and production operation are NOT implemented or authorized. No stable v0.0.10/npm publication has been approved.

## Acceptance

After reviewed PR 4/4 CI and post-merge main CI 4/4, record actual job/test counts, commit and package 78-path manifest here. Do not claim accepted before verified evidence.
