# Bug/Fix Traceability

Governed by: `docs/readiness/EVIDENCE_INDEX.md` (this file is the bug-specific slice of that index).
Created 2026-08-20. This repo has **143** commits matching a `fix` conventional-commit prefix on `main`
(verified via `git log origin/main --oneline --grep="^fix" -E | wc -l`, 2026-08-20 -- Paxel's message
cited "126 fix commits"; the verified count is 143, and this document uses the verified figure).

## Row schema

| Bug | Source report | A-number | Fix commit | Test proof | Live proof | Closeout |
|---|---|---|---|---|---|---|

## Seeded entries (verified this session, 2026-08-20)

| Bug | Source report | A-number | Fix commit | Test proof | Live proof | Closeout |
|---|---|---|---|---|---|---|
| Invitation emails fail to send in production ("send.triaxisventures.com domain is not verified") | Live QA screenshot, Settings page: "Invitation created, but the email could not be sent." | None assigned (tracked as `INVITE-EMAIL-DIAG` in `docs/readiness/EVIDENCE_INDEX.md`) | `916cc6b` (diagnostic instrumentation; root-cause fix not yet identified) | `invitationEmail.test.ts` 4/4 passed | Repeated live retest in Settings, still failing as of PR #265's merge; diagnostic deployed via PR #266 to get a first-party answer | Pending -- root cause not yet found |
| Stale TP-2 test assertion in RAG query route type (`{ question?: string; limit?: number }` missing `conversationId`/`documentIds`) | Pre-existing failing test discovered during this session's PR #253 verification pass | None assigned | Commit within PR #253 (updated `src/app/api/rag/query/route.test.ts` assertion) | 3/3 passed locally (excluding stray `.claude/worktrees/` duplicates) | N/A (test-only fix, no live surface) | Covered by PR #253's own description, not a separate closeout doc |

## Note on full historical backfill

The remaining ~141 `fix`-prefixed commits on `main` predate this traceability table and are not
individually backfilled here -- doing so would require re-deriving A-numbers and evidence for commits
that were not tracked this way at the time, risking invented evidence. `git log --oneline --grep="^fix"`
against `main` remains the authoritative raw list if a specific historical fix needs to be looked up and
added here with real sourcing.
