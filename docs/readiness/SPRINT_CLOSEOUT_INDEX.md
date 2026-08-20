# Sprint Closeout Index

Governed by: `docs/readiness/EVIDENCE_INDEX.md`. Created 2026-08-17. This program's work has shipped
across Sprints 5-32+ (per existing test-file naming like `sprint16PilotReadinessRls.test.ts`,
`sprint27-golden-path.spec.ts`, `sprint29-pilot-acceptance.spec.ts`). This index is the sprint-level
rollup; issue-level detail stays in `docs/readiness/EVIDENCE_INDEX.md`.

## Row schema

| Sprint | Scope | Plan | PRs | Commits | Tests | Deploy | Closeout | Status |
|---|---|---|---|---|---|---|---|---|

## Seeded entries (verified this session, 2026-08-17)

| Sprint | Scope | Plan | PRs | Commits | Tests | Deploy | Closeout | Status |
|---|---|---|---|---|---|---|---|---|
| Sprint 4 (referenced) | AI Workspace conversation memory | Not re-verified this pass (prior session) | #253 | Not enumerated this pass | Existing suite + 1 stale-assertion fix, 3/3 | Merged this session, not independently re-verified live | Not filed this pass | Deployed (unverified live this session) |
| Untitled (this session's reactive work) | Product Analytics real data | `~/.claude/plans/squishy-sprouting-plum.md` | #264 | `20260817130000_module_usage_events.sql` + route/component changes | 18/18 | Verified via `vercel inspect` + live 307 checks | `docs/readiness/EVIDENCE_INDEX.md` row `PROD-ANALYTICS-REAL-DATA` | Live verified |
| Untitled (reactive) | Force fresh Vercel rebuild for Resend env vars | None | #265 | `e974976` | N/A | Fresh deploymentId confirmed | `docs/readiness/EVIDENCE_INDEX.md` row `RESEND-FORCE-REBUILD` | Live verified (deploy); underlying bug not resolved |
| Untitled (reactive) | Invitation-email diagnostic instrumentation | None | #266 | `916cc6b` | 4/4 | `vercel ls` confirmed Ready ~9m post-merge | `docs/readiness/EVIDENCE_INDEX.md` row `INVITE-EMAIL-DIAG` | Deployed, pending live diagnostic read |
| Untitled (this pass) | Evidence-governance scaffold (this file and its siblings) | Founder's governance request, 2026-08-17 | TBD | TBD | N/A (docs-only) | N/A | This index + `docs/readiness/EVIDENCE_INDEX.md` | Implemented locally |

## Note on full historical backfill

Sprints 5 through ~26 (predating this session's active work) are not individually reconstructed here --
that would require re-deriving PRs, commits, and closeouts for historical work from git history alone,
which is possible in principle (`git log --grep="Sprint"` etc.) but was judged out of scope for this
governance-scaffold pass. Add a row with real citations when a specific past sprint is being actively
revisited.
