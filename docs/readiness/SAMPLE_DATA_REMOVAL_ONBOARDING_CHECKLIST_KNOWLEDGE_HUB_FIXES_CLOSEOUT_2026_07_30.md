# Sample Data Removal, Onboarding Checklist Auto-Detection, Knowledge Hub Count Bug -- Closeout

Date: 2026-07-30
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline

## External Signal

2026-07-30 live walkthrough, same session as the document-extraction closeout, immediately after. Founder's exact framing, across several messages:
- *"Many screens still full of demo/stale data (needs immediate correction)... 'Sample District Program' stale sample from demo exist in multiple places, need removal."*
- *"Golden Path not green ticking off post every step (some steps are ticking off, some are not)."*
- (After live-testing the sample-data removal fix) *"'Pitch deck' is backended sample doc, you need to delete and then it gets unindexed. Also ensure that docs can be un-indexed without having to delete from 'Knowledge Hub'. Another problem, post deletion of 'Triaxis Progress Report', document count is not updating even post refresh."*

Founder explicitly chose this as the next priority (via AskUserQuestion) over the invitation-email bug, agentic AI work, and Analytics/Dashboard backend wiring.

## Root Causes (Confirmed, Not Assumed)

1. **No removal mechanism existed for onboarding sample data.** `POST /api/onboarding/seed-sample-data` (existing, pre-dates this session) creates real, tenant-scoped "Sample:"-prefixed records tagged `sample-data` -- by its own docstring, "identifiable and removable by the customer." No code anywhere read or acted on that tag; there was no removal UI or endpoint at all.
2. **`BetaOnboardingChecklist.tsx`'s "Pilot Onboarding" checklist only auto-detected 2 of 10 steps** (`organization`, `first_project`) from real data; the other 8, including `upload_document`, `first_task`, and `first_approval` -- all of which the founder had genuinely done this session -- required a redundant manual click on the checklist item itself, which the founder never made. This produced exactly the "some ticking, some not" inconsistency reported.
3. **`KnowledgeHubSection.tsx`'s header stat cards (Uploaded/Classified/Chunked/Indexed/Ready) counted the raw `documents` array**, which keeps soft-deleted and archived documents forever (by design, for audit history). Every other consumer of that array (the "Documents" tab's own filter) already excluded deleted/archived rows; the stats `useMemo` did not, so deleting or archiving a document never changed the header counts -- confirmed reproducible with the founder's exact repro (delete "Triaxis Progress Report," counts stay at "2," even after a page refresh, because a fresh fetch still legitimately includes the soft-deleted row).
4. **"Un-index without delete" already existed** (`documentsRepository.archive()`, wired into `canRetrieveDocument()` since RAG Remediation Sprint 1) but was labeled only "Archive" with no indication it removes a document from AI Workspace answers -- the founder had no way to know this without reading the code.

## What Changed

- **`src/app/api/onboarding/sample-data/route.ts`** (new) -- `GET` returns a real, live count of sample-tagged/titled records (projects, tasks, meetings, documents) for the caller's tenant, no fabricated numbers. `DELETE` (admin-role-gated: Super Admin/Organization Admin/Executive/Manager) hard-deletes sample projects and tasks (tasks first, to sidestep any FK-ordering question regardless of `on delete` behavior), hard-deletes sample meetings, and **archives** (not hard-deletes) sample documents -- documents have real child rows (versions, RAG chunks, ingestion runs) that `archive()` already handles safely, and archived documents are already excluded from RAG retrieval. Per-record failures are tracked and reported honestly in the response, not silently swallowed. Records a real `onboarding.sample_data_removed` audit event with both the found and actually-removed counts.
  - Detection: tags (`sample-data`) for projects/tasks/documents; title/name prefix (`"Sample:"`) for meetings, which have no `tags` column at all -- matches the seeding route's own documented identification contract.
- **`src/features/dashboard/SampleDataBanner.tsx`** (new) -- only renders when a live `GET` count is actually non-zero, for admin-tier roles only. Two-step confirm (no native `window.confirm`, matches this codebase's existing pattern of not using browser-native dialogs) before calling `DELETE`; shows the real removed count afterward, or a real per-record failure count if any occurred.
- **`src/features/dashboard/DashboardSection.tsx`** -- mounts `SampleDataBanner`; passes `documentCount`/`taskCount`/`approvalCount` (from the already-computed `liveMetrics`) into `BetaOnboardingChecklist`.
- **`src/features/onboarding/BetaOnboardingChecklist.tsx`** -- accepts the three new optional count props, auto-completes `upload_document`/`first_task`/`first_approval` from them (same pattern as the pre-existing `organization`/`first_project` auto-detection). The remaining 5 steps (`invite_team_member`, `role_assignment`, `first_ai_question`, `view_audit_trail`, `send_feedback`) stay manual-click -- honestly, because no reliable existing signal for those exists in this component's scope without new tracking infrastructure, not because they were overlooked.
- **`src/features/knowledge-hub/KnowledgeHubSection.tsx`** -- `ingestionStatus` now filters out `status === "deleted"` and `status === "archived"` documents before computing every header stat, matching the "Documents" tab's own existing filter. The "Archive" document action is relabeled "Un-index (Archive)" with an explicit tooltip ("Removes this document from AI Workspace answers without deleting it. Restore any time from the Archived tab.") and its success toast now says "Document archived and removed from AI/RAG indexing." instead of just "Document archived."

## What Did Not Change

- No hard-delete capability was added to the general repository interfaces (`MutableTenantRepository`) -- the new DELETE calls in `sample-data/route.ts` are direct, scoped Supabase REST calls local to that one route, not a new general-purpose capability other code can accidentally reach for.
- Document deletion semantics are unchanged (archive vs. hard-delete choice for documents specifically was deliberate, not incidental -- see root cause 4 above).
- The two stale AI Workspace documents ("AXXESS TRIaxis Progress Report," "Pitch deck") are a **separate, already-disclosed issue** (documented in the document-extraction closeout's "What Did Not Change" -- no backfill for pre-existing documents). The founder is resolving that directly via delete + re-upload through the now-fixed Knowledge Hub flow; not part of this closeout's scope.

## What Was Verified

- `corepack pnpm exec tsc --noEmit -p tsconfig.json` -- clean.
- `corepack pnpm --dir apps/mobile run typecheck` -- clean.
- `corepack pnpm run lint` (`eslint . --max-warnings=0`) -- exit 0.
- `corepack pnpm run test` (`vitest run --config vitest.config.mjs`) -- **182 test files passed, 780 tests passed**, run twice (once before, once after the Knowledge Hub stats-bug fix landed, to guarantee the reported numbers reflect the final code).
  - New: `src/app/api/onboarding/sample-data/route.test.ts` (7 tests) -- proves GET returns real, non-fabricated counts (including a genuine zero-count case); DELETE is 401/403-gated correctly; DELETE hard-deletes exactly the sample-tagged records (real projects/tasks/meetings with no tag are provably untouched, asserted by URL non-inclusion); DELETE archives sample documents via the existing repository method; a real per-record failure (409 from Supabase) is honestly reported, not silently absorbed.
  - New: `src/features/dashboard/SampleDataBanner.test.tsx` (3 tests) -- proves the banner renders nothing while count is zero or the caller isn't admin-tier; proves the two-step confirm gate; proves the real post-removal count is displayed. **Caught and fixed a real bug in this session's own new code**: the first draft returned `null` after a successful removal (because the early-return check ran before the result-display check), which the test caught before this ever shipped.
  - Extended: `src/features/onboarding/BetaOnboardingChecklist.test.tsx` (2 new tests) -- proves `upload_document`/`first_task`/`first_approval` auto-complete from real counts with zero manual clicks, and provably do NOT auto-complete when those counts are genuinely zero.
  - `KnowledgeHubSection.tsx`'s stats-bug fix and Archive-button relabel have **no dedicated test** -- this component has zero pre-existing test coverage (confirmed: no `KnowledgeHubSection.test.tsx` exists in this repository at all, a pre-existing gap, not introduced by this change). Verified via typecheck + direct code review only; not unit-tested. Flagged honestly rather than implied as covered.
- `corepack pnpm run build` (`next build`) -- passed, exit 0.

## What Remains Partial or Blocked

- **KnowledgeHubSection.tsx has no test coverage at all** (pre-existing, not newly introduced, but now carrying two more untested code paths). A fast-follow to add a baseline render/interaction test suite for this component is a reasonable next step, not done here to stay scoped to the reported defects.
- **Live HITL confirmation** -- cannot be self-certified by this session (no real login). The founder has already begun live-testing this exact fix in real time during this session (screenshots of the sample-data banner context and the Knowledge Hub stats bug were the trigger for two of these fixes) but a full walkthrough of the shipped code (not the pre-fix state they screenshotted) still needs to happen post-deploy.
- **The stale "AXXESS TRIaxis Progress Report"/"Pitch deck" documents** are being resolved by the founder directly (delete + re-upload); no code action needed from this closeout, tracked separately.

## What Claim Is Still Unsupported

This closeout does not claim the Golden Path/"Enterprise golden path" 8-step panel (`enterpriseGoldenPath.ts`) has any defect -- it was independently reviewed and found to be fully metrics-driven with no manual-click desync possible. The founder's "Golden Path... not ticking" observation is attributed to the "Pilot Onboarding (personal checklist)" widget specifically, based on the screenshot showing individual step checkmarks (a UI element only that widget has); this attribution is inference from the available evidence, not confirmed by the founder in these exact terms.

## Exact File/Command/Branch State

- Branch: `canonical/sprint-1-35-unified-gitlab`.
- Files changed/added: `src/app/api/onboarding/sample-data/route.ts` + `.test.ts` (new), `src/features/dashboard/SampleDataBanner.tsx` + `.test.ts` (new), `src/features/dashboard/DashboardSection.tsx`, `src/features/onboarding/BetaOnboardingChecklist.tsx` + `.test.tsx`, `src/features/knowledge-hub/KnowledgeHubSection.tsx`.
- No deploy has been performed for this specific batch as of this doc being written. Per standing git/deploy discipline, commit and deploy each require explicit confirmation in this conversation.
