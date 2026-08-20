# Evidence Index

Governed by: `CLAUDE.md` (The Evidence Chain -- Standing Rule). Created 2026-08-17 in direct response
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

## Seeded entries (verified this session, 2026-08-17)

| Issue ID | Title | Origin plan | Research artifact | Implementation commit(s) | PR | Test evidence | Deploy evidence | Closeout artifact | Final status |
|---|---|---|---|---|---|---|---|---|---|
| PROD-ANALYTICS-REAL-DATA | Product Analytics: real Activation Funnel + Most Used Modules | `~/.claude/plans/squishy-sprouting-plum.md` (session plan, not repo-committed) | Live QA screenshot showing placeholder-data banner on `/admin/product-analytics` | `supabase/migrations/20260817130000_module_usage_events.sql`, `src/app/api/module-usage-events/route.ts`, `src/features/product-analytics/ProductAnalyticsSection.tsx` | [#264](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/264) | `ProductAnalyticsSection.test.tsx` 13/13 passed; `module-usage-events/route.test.ts` 5/5 passed (18/18 combined, run locally) | Vercel production deploy confirmed via `vercel ls`/`vercel inspect`, live 307 redirect check on `landing.triaxisventures.com` and `investor.triaxisventures.com` | None filed as a separate doc -- covered by this row + PR #264 description | Deployed |
| RESEND-FORCE-REBUILD | Force fresh Vercel build to pick up updated `RESEND_API_KEY` / `AXXESS_INVITATION_EMAIL_FROM` | None (reactive fix, no separate plan doc) | Live QA screenshot: "Invitation created, but the email could not be sent." | Empty commit `e974976` on branch `chore/force-fresh-build-resend-env` | [#265](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/265) | N/A (no code change; verification was live) | Fresh `deploymentId` confirmed via `vercel inspect`; live retest in Settings still showed the same Resend error -- fresh-build theory disproven, not confirmed fixed | None | Live verified (deploy succeeded); underlying bug **not** closed -- see next row |
| INVITE-EMAIL-DIAG | Temporary diagnostic log to resolve persistent "send.triaxisventures.com domain is not verified" error | None (reactive fix after RESEND-FORCE-REBUILD did not resolve the underlying bug) | This session's own elimination chain: env var confirmed empty via `vercel env pull` (4x), no hardcoded reference (`grep -rn "send.triaxisventures" src/` empty), no duplicate env entries (`vercel env ls`) | `916cc6b` (`fix(email): add temporary diagnostic log for invitation from-address mismatch`) on `src/services/email/invitationEmail.ts` | [#266](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/266) | `invitationEmail.test.ts` 4/4 passed (`npx vitest run src/services/email/invitationEmail.test.ts --exclude '**/.claude/**'`) | Merged to main via squash `6daa69f`; deployment `triaxis-www-frontend-import-tlnzy9cex` confirmed Ready via `vercel ls`; live `307` on both domains (see `docs/readiness/CI_DEPLOYMENT_LEDGER.md`) | None yet -- diagnostic is temporary, closeout pending root-cause identification | Deployed, live; awaiting founder retry of the invite flow to read the diagnostic log |
| GOVERNANCE-EVIDENCE-SCAFFOLD | Evidence Index / Test Governance / Verification Ledger scaffold (this file and its siblings) | This governance request itself (verbatim founder message, 2026-08-17), citing Paxel's own recommendations | Paxel recommendation list (founder-pasted, not a repo file -- source is the chat transcript) | This commit (see `docs/readiness/CI_DEPLOYMENT_LEDGER.md` once filed) | TBD | N/A (docs-only) | TBD | This index itself, plus `docs/readiness/GOVERNANCE_RULES.md` | Implemented locally |

## How to add a row

1. Assign or reuse an Issue ID.
2. Fill every column with a real, checkable reference -- a file path, a commit SHA (short or full), a
   PR number, an exact test command and result, a deployment ID, or `docs/readiness/STATUS_TAXONOMY.md`
   status.
3. If a column has no real evidence yet, write `Pending` or `N/A` -- never leave it blank (blank reads
   as "forgot to check," `Pending` reads as "known gap").
4. Cross-link: if the row involved a scope/architecture call, add the matching row in
   `docs/readiness/DECISION_OUTCOME_LEDGER.md` and reference it back here.
