# Evidence Index

Governed by: `CLAUDE.md` (The Evidence Chain -- Standing Rule). Created 2026-08-20 in direct response
to Paxel Report #17's core recommendation: the program's governance rules already exist, but nothing
joins an issue across its lifecycle. This file is that join table.

**What this is not:** a retroactive reconstruction of the full ~891-commit history. Assigning issue IDs
to work that predates this file would mean inventing identifiers that were never actually tracked at the
time -- itself a violation of the Evidence Chain's "do not invent missing evidence" rule. This index is
seeded with entries this session can verify directly (exact commit/PR/test evidence) and is populated
**going forward** from here. Historical rows should be added only when a specific piece of prior work is
being actively revisited and its evidence can be reconstructed from real artifacts (commit hash, PR
number, existing closeout doc) -- not backfilled in bulk from memory or estimate.

## Row schema

| Issue ID | Title | Origin plan | Research artifact | Implementation commit(s) | PR | Test evidence | Deploy evidence | Closeout artifact | Final status |
|---|---|---|---|---|---|---|---|---|---|

- **Issue ID**: a stable identifier (`A-###` for founder-numbered actionables, or a short slug for
  work that never got an A-number, e.g. `INVITE-EMAIL-DIAG`).
- **Final status**: use the exact vocabulary in `docs/readiness/STATUS_TAXONOMY.md` -- not a free-text
  summary.
- Link related memories/decisions with the row's Issue ID from `docs/readiness/DECISION_OUTCOME_LEDGER.md`
  where applicable.

## Seeded entries (verified this session -- underlying events on 2026-08-17 for PRs #264/#265/#266; scaffold seeded 2026-08-20)

| Issue ID | Title | Origin plan | Research artifact | Implementation commit(s) | PR | Test evidence | Deploy evidence | Closeout artifact | Final status |
|---|---|---|---|---|---|---|---|---|---|
| PROD-ANALYTICS-REAL-DATA | Product Analytics: real Activation Funnel + Most Used Modules | `~/.claude/plans/squishy-sprouting-plum.md` (session plan, not repo-committed) | Live QA screenshot showing placeholder-data banner on `/admin/product-analytics` | `supabase/migrations/20260817130000_module_usage_events.sql`, `src/app/api/module-usage-events/route.ts`, `src/features/product-analytics/ProductAnalyticsSection.tsx` | [#264](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/264) | `ProductAnalyticsSection.test.tsx` 13/13 passed; `module-usage-events/route.test.ts` 5/5 passed (18/18 combined, run locally) | Vercel production deploy confirmed via `vercel ls`/`vercel inspect`, live 307 redirect check on `landing.triaxisventures.com` and `investor.triaxisventures.com` | None filed as a separate doc -- covered by this row + PR #264 description | Deployed |
| RESEND-FORCE-REBUILD | Force fresh Vercel build to pick up updated `RESEND_API_KEY` / `AXXESS_INVITATION_EMAIL_FROM` | None (reactive fix, no separate plan doc) | Live QA screenshot: "Invitation created, but the email could not be sent." | Empty commit `e974976` on branch `chore/force-fresh-build-resend-env` | [#265](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/265) | N/A (no code change; verification was live) | Fresh `deploymentId` confirmed via `vercel inspect`; live retest in Settings still showed the same Resend error -- fresh-build theory disproven, not confirmed fixed | None | Live verified (deploy succeeded); underlying bug **not** closed -- see next row |
| INVITE-EMAIL-DIAG | Temporary diagnostic log to resolve persistent "send.triaxisventures.com domain is not verified" error | None (reactive fix after RESEND-FORCE-REBUILD did not resolve the underlying bug) | This session's own elimination chain: env var confirmed empty via `vercel env pull` (4x), no hardcoded reference (`grep -rn "send.triaxisventures" src/` empty), no duplicate env entries (`vercel env ls`) | `916cc6b` (diagnostic log, #266) | [#266](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/266) | `invitationEmail.test.ts` 4/4 passed | Merged via squash `6daa69f`; live `307` on both domains | Superseded by row below | Superseded by `INVITE-EMAIL-ROOT-CAUSE` |
| INVITE-EMAIL-ROOT-CAUSE | Root cause found and fixed: `AXXESS_INVITATION_EMAIL_FROM` was pointed at the never-verified `send.triaxisventures.com` subdomain | None (reactive fix, root cause read directly from the #266 diagnostic's live output) | Live `vercel logs` output after founder retried an invite: `[invitationEmail] DIAGNOSTIC resolved from-address: "AXXESS by Triaxis <notifications@send.triaxisventures.com>"`. Separately confirmed `vercel env pull`'s earlier "empty" reads were reading the Development environment by default, not Production -- `vercel env ls production` showed the var genuinely set 18 days prior. | `8fd89d0` (removes diagnostic log; env var removed via `vercel env rm AXXESS_INVITATION_EMAIL_FROM production`, confirmed via `vercel env ls production`) | [#269](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/269) | `invitationEmail.test.ts` 4/4 passed post-removal | Merged via squash `27a3132`; deployment `triaxis-www-frontend-import-3ofc8xoe5` confirmed Ready via `vercel ls`; live `307` on both domains | None filed yet -- pending final live confirmation | Deployed, live; awaiting founder retry to confirm a real email is actually delivered (not yet Live verified per `docs/readiness/STATUS_TAXONOMY.md` -- deploy success alone does not prove delivery) |
| GOVERNANCE-EVIDENCE-SCAFFOLD | Evidence Index / Test Governance / Verification Ledger scaffold (this file and its siblings) | This governance request itself (verbatim founder message, 2026-08-20), citing Paxel's own recommendations | Paxel recommendation list (founder-pasted, not a repo file -- source is the chat transcript) | `d432d46` on `docs/paxel-evidence-governance-scaffold`, squash-merged as `5484984` on `main` | [#267](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/267) | N/A (docs-only; no test suite applies) | Merged 2026-08-20 08:26 IST; docs-only, no app deployment triggered -- see `docs/readiness/CI_DEPLOYMENT_LEDGER.md` 2026-08-20 rows for the 2 non-blocking CI failures verified before merge | `docs/readiness/GOVERNANCE_EVIDENCE_SCAFFOLD_CLOSEOUT_2026_08_20.md` | Closed |

## How to add a row

1. Assign or reuse an Issue ID.
2. Fill every column with a real, checkable reference -- a file path, a commit SHA (short or full), a
   PR number, an exact test command and result, a deployment ID, or `docs/readiness/STATUS_TAXONOMY.md`
   status.
3. If a column has no real evidence yet, write `Pending` or `N/A` -- never leave it blank (blank reads
   as "forgot to check," `Pending` reads as "known gap").
4. Cross-link: if the row involved a scope/architecture call, add the matching row in
   `docs/readiness/DECISION_OUTCOME_LEDGER.md` and reference it back here.
