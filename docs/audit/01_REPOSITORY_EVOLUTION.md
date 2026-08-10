# Phase 1 -- Repository Forensics

Direct `git`/`gh` measurements against `axxess-triaxis/AXXESSTRIAXIS`, HEAD at time of this phase. Builds on Phase 0's resolved baseline (39-day repo history, 100% of AXXESS per founder confirmation, 613 of 669 commits founder-authored).

## Current-state size

| Metric | Value |
|---|---|
| Tracked files (current HEAD) | 1,354 |
| Test files (`*.test.ts`/`*.test.tsx`) | 251 |
| Branches (local + remote refs) | 139 |
| Tags | 1 |
| CI workflow files (`.github/workflows/`) | 15 |

## Lines of code, by category (current HEAD, tracked files only)

| Category | Lines |
|---|---|
| TS/TSX/JS/JSX | 73,051 |
| SQL (migrations) | 5,475 |
| Markdown (docs) | 51,845 |
| JSON/YAML/CSS | 21,531 |
| **Sum of the above 4 categories** | **151,902** |
| **All tracked files, full total** | **330,622** |

**Gap not reconciled:** the full-repo total (330,622) exceeds the sum of the 4 categories above (151,902) by ~178,720 lines. Checked one obvious candidate -- lockfiles (`pnpm-lock.yaml` and similar) -- which account for only 18,114 of that gap, leaving ~160,600 lines unaccounted for by category. Not chased further this phase; the remaining gap is most likely other tracked file types not covered by the 4 extensions checked (e.g., `.svg`, `.png`-adjacent text assets, config files with other extensions, `.mjs`, `.cjs`, lockfiles for `apps/*` sub-packages). Recorded honestly as unreconciled rather than forced to match.

**Not yet done this phase:** LOC growth *over time* (a time series, not just the current snapshot) -- the protocol's "code growth over time" and "LOC by language" (a proper per-language breakdown, not the coarse category buckets above) are deferred; this phase established the current-state numbers only.

## Pull requests and issues

| Metric | Value |
|---|---|
| Total PRs (via `gh pr list --state all`) | 183 |
| Merged | 166 |
| Open | 2 |
| Closed, not merged | 15 |
| Observed PR number range | 1 to 217 |

**Inference, not independently confirmed:** GitHub shares one number sequence between PRs and Issues in a repo. Since 183 PRs were returned but the highest PR number seen is 217, roughly 34 numbers in that range are most likely Issues, not PRs. This was not verified by independently pulling the issues list -- recorded as a plausible explanation for the gap, not a confirmed fact.

## Epochs -- not established this phase, deliberately

Commit messages contain extensive sprint labels, but in inconsistent formats: `Sprint N`, `sprint-N`, `sprintN`, observed spanning roughly 1 through 42, with gaps and out-of-sequence outliers (e.g., "Sprint 41" appears only 3 times, out of numeric order relative to the surrounding chronology). This is too unreliable to force into a clean "Epoch 1/2/3..." table by label-matching alone -- per this audit's own instruction not to force epoch labels where git history doesn't cleanly support them.

**Deferred to Phase 2 (Product Capability Audit):** real epoch boundaries will be constructed by tracing the actual first-appearance implementation commits of major capabilities (multi-tenancy, RAG, agentic tool-calling, AXXESS Lite, mobile/Capacitor) rather than from sprint number labels, which don't reliably map to chronology or scope on their own.

## What this phase establishes

- Current repository size and shape (files, tests, branches, LOC by rough category).
- PR/merge activity volume (166 merged PRs is a real, directly-pulled number).
- That sprint labeling exists as a working convention but isn't clean enough evidence on its own for epoch construction.

## What this phase does NOT establish

- Whether any of this reflects real product capability (Phase 2) or customer-facing maturity.
- LOC growth trajectory over time (only current-state totals were pulled).
- Whether the ~34 number gap in PRs 1-217 is actually issues, versus e.g. deleted/never-created PR numbers -- unconfirmed inference only.
- Any reconciliation with the specific external claims the audit protocol names as examples ("250,000+ LOC," "1,350+ tests," "170 merged PRs") -- that reconciliation is explicitly Phase 14 (Claims Register)'s job, not this phase's. This phase's own current-state numbers (330,622 total lines across a broad file-type net; 251 test files, not test *cases*; 166 merged PRs) should not be read as confirming or refuting those claims without that later, deliberate comparison.
