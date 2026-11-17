# Lead Sourcing as Agent and MCP: Closeout

**Date:** 2026-11-17
**Branch:** `feat/lead-sourcing-core`, stacked on `feat/lead-sourcing-tool` (PR #524)

## Planning provenance

- **Founder requests, 2026-11-17:**
  - "We need to find a good way of scraping leads"
  - "Plan the lead-sourcing tool with registries and upgraded crawler"
  - "Can we build this scraping and lead-feeding into AXXESS as agent+MCP?"
  - "Yes, plan it" (plan approved in session)
- **Product evidence:** crawl batch 3 gave 15 sendable leads from 79 sites. On the same 118 batch-4 sites, the old crawler gave 7 hand-curated leads; the new crawler (PR #524) gave 19, all checked by hand.
- **Registries:** PR #523 found no registry adapter usable yet.

## Evidence chain

**External signal:** the founder needs more leads in India and the UAE on free tools.
**Decision:** an agent-callable sourcing flow inside AXXESS, with human approval before import.
**Shipped artifact:** this branch.
**Verification:** below.
**Current status:**
- The code is in a PR.
- Not deployed.
- The migration has not been applied to any environment.

## What changed

1. **Shared core moved.** `scripts/lead-sourcing/*.mts` moved to `src/services/leadSourcing/*.ts`.
   - Imports now use explicit `.ts` paths, enabled by `allowImportingTsExtensions` in `tsconfig.json` (valid because the config sets `noEmit`).
   - The CLI (`pnpm run gtm:source-leads`) imports from there.
   - Fix: a malformed `%` sequence in page text no longer throws out of `extractEmails`.
2. **Migration** `supabase/migrations/20261117120000_lead_sourcing.sql` adds three tables:
   - `lead_sourcing_runs`
   - `lead_sourcing_candidates`
   - `lead_source_exclusions`: the do-not-contact list by company or domain label.
   - All three have RLS on, senior-only read, and service-role writes.
3. **Repository** `src/repositories/leadSourcingRepository.ts`.
   - `insertImportedLeadsReturningIds` is added to `outboundRepository.ts`. `insertImportedLeads` is unchanged and now wraps it.
4. **MCP tools** in `src/services/agents/leadSourcingTools.ts`, registered in `toolRegistry.ts`:
   - `source_leads` (auto):
     - drops exclusion-list companies and known leads before queueing
     - at most 150 seeds per run
     - verification credits capped at 40 per run, and by `LEAD_SOURCING_MONTHLY_VERIFY_CAP` per month (default 40)
   - `get_sourcing_run` (auto): returns candidates with their evidence.
   - `approve_sourced_leads` (critical, with the new `requiresFreshApproval` flag):
     - imports through `parseLeadImport` and `loadImportContext`, so the suppression and duplicate rules still apply
     - marks candidates imported or rejected
     - writes the audit row `crm.leads.sourced_imported`
5. **Fresh-approval rule.**
   - `src/app/api/agents/mcp/route.ts` ignores standing grants for tools with `requiresFreshApproval`.
   - `src/app/api/approvals/[id]/route.ts` never creates an "Always Allow" grant for them.
6. **Capabilities** `source_leads`, `get_sourcing_run` and `approve_sourced_leads` are added to `agentScope.ts`.
   - They are opt-in and not in the defaults.
   - They are withheld from the in-app copilot in v1 (`chatbotAgentScope.ts`).
7. **Routes:**
   - `POST /api/lead-sourcing/worker/claim`: Bearer `LEAD_SOURCING_WORKER_SECRET`.
   - `POST /api/lead-sourcing/worker/runs/[id]`: candidates must match the run's own seeds, and credits are clamped to the run's cap.
   - `POST /api/lead-sourcing/exclusions`: senior roles only. Values are stored normalised and kept out of the repository.
8. **Worker** in `workers/lead-sourcing/`:
   - `process.ts`: pure run processing with a deadline.
   - `handler.ts`: the Lambda handler. Secrets are read by ARN, and Chromium comes from `@sparticuz/chromium` 153.0.0 with `playwright-core` 1.62.0.
   - `build.mjs`: esbuild bundling.
   - `template.yaml`: SAM template with a schedule (disabled by default), reserved concurrency 1, a 30-day log group, and an errors alarm to an encrypted SNS topic.
   - `README.md`.
   - The worker is not part of the pnpm workspace; it has its own `package-lock.json`.
9. **ESLint** now ignores `workers/*/dist/**` and `workers/*/.aws-sam/**`.

## What did not change

- No automatic import, enrollment or outreach. Enrollment remains a separate human action.
- No paid APIs, no registry adapters (per PR #523), and no LinkedIn, Google or Maps scraping.
- No dedicated review screen. Review happens through `get_sourcing_run` and the approvals UI.
- No AWS resources, Vercel env vars, secrets or migrations have been created or applied.

## Verification

Commands were run on 2026-11-17 in `C:\Users\Sudipta Sarmah\wt\axxess-lead-sourcing`.

- **Targeted suites:** `pnpm exec vitest run --config vitest.config.mjs "src/app/api/approvals" src/security src/services/chatbot src/services/agents src/services/leadSourcing src/app/api/lead-sourcing src/app/api/agents` gave **53 files, 467 tests passed**.
- **Worker:** `pnpm exec vitest run --config vitest.config.mjs workers/lead-sourcing` gave **3 passed**.
- **Migration verifier:** `node scripts/verify-supabase-migrations.mjs` reported 57 migrations and 124 created tables, all 124 RLS-protected. The one warning is pre-existing (`20260702165736_initial_enterprise_schema.sql`).
- **Worker typecheck:** a direct strict `tsc` on `workers/lead-sourcing/handler.ts` and `process.test.ts` exited 0. The root `tsconfig` does not include `workers/` or `scripts/`.
- **Template:** cfn-lint (from STILL's venv) on `workers/lead-sourcing/template.yaml` exited 0. The SAM CLI is not installed on this machine, so `sam validate --lint` was **not run**.
- **Bundle:** `npm run build` in `workers/lead-sourcing` produced `dist/handler.mjs` (31 KB). Loading it locally fails only on `@aws-sdk/client-secrets-manager`, which the Lambda nodejs22.x runtime provides.
- **Full repo gates (2026-11-17):**
  - `pnpm run typecheck` exit 0.
  - `pnpm run lint` (`--max-warnings=0`) exit 0.
  - `pnpm run test`: **378 test files, 2300 tests passed**, exit 0.
  - `pnpm run supabase:verify` exit 0.
  - `pnpm run build`:
    - First attempt: compiled, then stopped with a Next.js `SecurityFatalError` upgrade notice (exit 1).
    - Unchanged retry: exit 0.
    - Cause: this worktree's installed `next` is 16.4.2, older than the `^16.4.5` in `package.json` (the same range as `main`). A fresh `pnpm install` resolves it. No code change was needed.

## Still partial or unverified

- **Chromium on Lambda:** `@sparticuz/chromium` with `playwright-core` on Lambda has not been run. It needs a staging deploy.
- **Migration:** not applied to staging or production.
- **End-to-end flow:** agent key, then `source_leads`, worker run, `get_sourcing_run`, approval and lead row. Not exercised. It needs the staging migration, the worker deploy, the Vercel env secret and a granted agent key.
- **Exclusion list:** not loaded. After deploy, load the 15 companies in `gtm/leads_network_batch1_todo.csv` through `POST /api/lead-sourcing/exclusions` with `reason: "founder_network"`.
- **Rebase:** PRs #520 and #521 also edit `agentScope.ts` and `toolRegistry.ts`. A small rebase conflict is expected on whichever merges second.

## Decision ledger

```
Decision: Lead sourcing runs as three MCP tools plus a scheduled AWS Lambda crawler that pulls queued
  runs from AXXESS; import needs a fresh human approval every time.
Why: Headless Chromium and multi-minute crawls do not fit a Vercel function. Pulling (worker claims
  over HTTPS with a Bearer secret) instead of the planned SQS push means Vercel needs no AWS
  credentials at all; latency of up to 5 minutes is acceptable for lead research. Bearer secret
  follows the existing /api/outreach/tick pattern instead of a new HMAC scheme.
What changed: see "What changed" above.
Architecture boundary: AXXESS owns the data, rules and approval; the worker only crawls and reports,
  sees no organization id, and can only add candidates for seeds of the run it claimed.
Product boundary: no import without a person's approval, no enrollment, no outreach, no paid data,
  do-not-contact companies are never fetched.
Verification: see "Verification" above; staging end-to-end still pending.
Outcome: code complete, unverified in a deployed environment.
Follow-up: staging migration, worker staging deploy, secrets by the founder, exclusion list load,
  end-to-end run, then production with an explicit go.
```

## Founder actions

1. Merge #520, #521 and #524 (in that order), then this PR.
2. Create two Secrets Manager secrets (the worker secret, and optionally the QEV key) and send me the ARNs only. Set the same worker secret as `LEAD_SOURCING_WORKER_SECRET` in the Vercel staging env.
3. Give the go to apply the migration on staging and to deploy the worker stack to staging.
4. Grant `source_leads`, `get_sourcing_run` and `approve_sourced_leads` to the agent connection that should source leads.
