# M18 — symbolic classification benchmark with false-positive / false-negative accounting

This **source-only** evaluation extends the existing
[M9 symbolic event validator](M9_SYMBOLIC_INJECTION_RFC.md). M9's
four author-controlled tests established fixed policy rules. M18 measures
all **32** distinct valid combinations of two fictional trace profiles and
four optional event codes, including contradictory *rejected + attempted*
signals. It uses a separately implemented **author-written oracle** and
compares actual M9 evaluator decisions to that oracle.

Run in a reviewed public source checkout (Node.js 20+):

```sh
node tools/m18-symbolic-evaluation.mjs
```

The command has **no arguments**. It reads only one fixed, already public
repository-owned fictional fixture. It does not use paths from that fixture,
execute its embedded instruction or contact any MCP endpoint.

## Truth labels are three-way, not just PASS/FAIL

| Ground-truth label | Definition | Cases |
| --- | --- | ---: |
| `ATTACK` | Symbolic trace contains a fictional unrelated read, unauthorized tool request or followed untrusted instruction, regardless of any claimed rejection | 28 |
| `BENIGN` | Clean task-data-only trace or injected text explicitly rejected with no violation events | 2 |
| `INSUFFICIENT` | Clean profile falsely asserts a rejection, or injected profile provides no rejection/violation evidence | 2 |

The independent oracle additionally specifies **violation precedence**:
symbolic read attempt, then unauthorized tool request, then followed
instruction, then evidence mismatch, then exact expectation match.
A trace containing a purported rejection **and** a fictional violation is
still `ATTACK`. All 32 event arrays are generated locally with fixed,
reproducible order variations; case text itself is never interpreted.

The benchmark maps observed M9 rule codes to `ALERT`, `CLEAR` or
`ABSTAIN`. It then reports true positives (TP), false positives (FP),
false negatives (FN), true negatives (TN), predicted abstentions,
unsupported attack/safe claims, labelled-case coverage, precision, recall,
FPR and FNR. On insufficient evidence, an `ALERT` is counted as
`unsupportedAttackClaims`, **not** as a provable FP; likewise a `CLEAR`
is `unsupportedClearClaims`. An abstention on a labelled attack **does
not count as a detection** and is counted in FN.

Expected exact matched-author-oracle behavior:

| Metric | Expected |
| --- | ---: |
| True positives | 28 |
| False negatives | 0 |
| False positives | 0 |
| True negatives | 2 |
| Correct insufficient-evidence abstentions | 2 |
| Rule + class matches | 32/32 |

The exact source-written model is **synthetically correct by design**.
The values are not estimated production metrics and must **not** be
advertised as real-world 100% accuracy or recall.

## Intentionally broken baselines make the metrics meaningful

- `alwaysClear`: misses **28** labelled attacks — FN rate 100%.
- `alwaysAlert`: incorrectly alerts on **2** labelled benign traces —
  FPR 100%, plus 2 unsupported alerts on insufficient evidence.
- `naiveFailMeansAttack`: detects the 28 fictional attack-labelled
  traces but calls **both** insufficient-evidence traces attacks —
  2 unsupported allegations, despite 0 provable FP on benign examples.

Independent mutation tests alter rule precedence, invert an alert/clear
outcome, forge an evidence status, remove cases, introduce sparse arrays
and malicious JS accessors. All must cause benchmark failure, not a
silently inflated metric or arbitrary data echo. Report fields contain
only source-defined IDs, labels, rule names and bounded counters, never
the fixture's freeform text.

## What this does not prove

This is an **author-controlled exhaustive enumeration of a tiny
symbolic vocabulary**, not held-out independently authored natural-language
attacks, user-reported outcomes, real-agent observation or a model
generalization study. Event traces are author-supplied labels, not
authenticated evidence. No network traffic occurs in M18, and no real
files, tools, servers, users, credentials, executable commands,
external MCP targets, LLMs, telemetry or Stable Bridge are involved.

The new helper and tests are excluded from the **unpublished fixed 80-path
npm package**. Independent beta [#59](../issues/59), audit [#43](../issues/43)
and real-target approval [#21](../issues/21) remain open. Engineering
acceptance (2026-10-29): [PR #277](../pull/277) passed
[PR CI #40907812910](../actions/runs/40907812910) **4/4**,
merged as exact main SHA `e10da27f12c9419658f79bcb281273f63db513cc`,
and independently triggered [main CI #40908374045](../actions/runs/40908374045)
passed **4/4 on that SHA** (Windows/Ubuntu × Node20/22).
The originally overfull M6-J custody inventory was repaired with a bounded
192-file limit, **all files still hashed** and overflow rejected; the
unpublished 80-path package remained unchanged. This is **engineering**
acceptance, not proof of independently evaluated attack resistance.
