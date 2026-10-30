# M52 — Process confinement boundary and acceptance gates

Status: DESIGN / NOT IMPLEMENTED. This document is source-only and does not grant authorization for external targets.

## Finding from M51

A read-only file descriptor denies writes through that descriptor, but a same-user child with access to the path can reopen it with write permissions. Therefore a read-only handle is not a sandbox, and parent-observed filesystem effects do not prove confinement.

## Proposed engineering gate

1. Keep the existing M32 first-party disposable child-process lab; do not modify M10's no-process contract.
2. Use only parent-created temporary files, fixed in-repository child code and bounded IPC; never accept a user path, command, endpoint, credential or arbitrary child code.
3. Independently witness **both** the denied write via read-only descriptor and a successful same-user path reopen. Label the latter as a confinement failure, not a test failure.
4. Add a negative control for a child that reports denial while independently observable bytes changed. The parent must reject the false claim.
5. Require process exit, bounded timeout and temporary resource cleanup before reporting success.
6. Explicitly report `osSandboxed:false`, `externalTargetTested:false` and `confinementProven:false` unless a future separately reviewed platform-specific isolation mechanism is actually deployed and verified.
7. Preserve the immutable M6-J source custody cap (240 paths, 2,000,000 Git-tree bytes) and frozen npm package inventory. Prefer modifying existing tracked files over introducing new source paths.

## Acceptance

Implementation is not accepted until four CI jobs (Windows/Ubuntu, Node 20/22) pass, the existing negative controls remain intact, the repository custody budget is verified, and post-merge main CI is separately checked.

Independent beta #59, security review #43, real-target authorization #21, and owner release approval remain open. No stable release, npm publication, remote MCP connection or OS-sandbox claim is implied.
