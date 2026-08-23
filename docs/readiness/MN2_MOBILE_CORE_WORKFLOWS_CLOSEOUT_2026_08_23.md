# MN-2 — Core Mobile Workflows and Tablet Layout — Closeout

**Date:** 2026-08-23. **Scope:** `apps/mobile-capacitor` (the Android/iOS Capacitor WebView
wrapper), continuing directly from MN-1 (`docs/readiness/MN1_MOBILE_NATIVE_SHELL_CLOSEOUT_2026_08_23.md`,
PR #305). Source spec: `docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md`
(PR #303, merged to `main`), executed via the Codex-drafted MN-2 prompt delivered by the founder.
Branch `feat/mn2-mobile-core-workflows`, based on `origin/feat/mn1-mobile-native-shell` (MN-1's PR
was not yet merged to `main` at MN-2's start).

## What changed

**Eight new native screen components, `src/features/mobile/screens/`** — MN-1 shipped a
transitional wrapper that reused the same desktop `ActiveSection` component inside the new mobile
chrome ("the chrome changes, not the content," per MN-1's own closeout). MN-2 is the planned
replacement: each of these is a real, mobile-native UI reading and writing through the identical
tenant-scoped repositories/routes the desktop sections already use — no forked backend logic, no
demo leakage, no fabricated data.

- **`MobileTasksScreen.tsx`** — Tasks + Reminders combined (one screen, tab-switched). Lists real
  `tasksRepository`/`remindersRepository` rows; creates a task via `tasksRepository.create`; marks
  complete via `tasksRepository.update`/`remindersRepository.update` (a real status flip, not a
  client-only toggle); tap-through detail view; tablet two-pane (list left, detail right at
  `useMobileTabletLayout()`'s ≥768px breakpoint). Consumes the existing
  `writeAgenticDraft`/`readAndClearAgenticDraft` sessionStorage handoff on mount, so "Create task
  from this answer" in the new Ask AI screen pre-fills (never auto-submits) a real New Task form
  here — the same handoff desktop `TasksSection.tsx` already consumes
  (`TasksSection.agentic.test.tsx`, A-79).
- **`MobileMeetingsScreen.tsx`** — real `meetingsRepository` list, bucketed into Upcoming/Past by
  actual `startsAt`; create-draft (title + start time); detail view with real
  `Meeting.decisions`/`Meeting.actionItems` (plain `string[]` fields on the row itself — confirmed
  during MN-2 research there is no separate `Decision` table anywhere in this codebase); capturing a
  decision or action item appends to that array and calls `meetingsRepository.update`, matching how
  desktop already does it.
- **`MobileProjectsScreen.tsx`** — real `projectsRepository` list/detail/create; risk/status badges
  from the real `Project.riskLevel`/`status` enum fields; program association shown only when the
  project has a real `programId` that resolves against the real (read-only) `programsRepository` —
  never a fabricated program name. No budget/spend figure anywhere: confirmed (again, matching this
  session's earlier Analytics-sprint finding) that no such field exists on the real `Project` type.
- **`MobileApprovalsScreen.tsx`** — list/approve/reject via the existing `GET /api/approvals` and
  `PATCH /api/approvals/[id]` routes, both with `credentials: "include"`, exactly as desktop
  `ApprovalsSection.tsx` does. `approvalRequestsRepository` is service-role-key-gated (confirmed
  during MN-2 research) and is never imported directly into this client code. A decision reason is
  required to reject, mirroring the route's own server-side validation, surfaced as a real inline
  error rather than a silent failure. Tablet two-pane.
- **`MobileKnowledgeScreen.tsx`** — real `documentsRepository`/`knowledgeArticlesRepository` lists;
  real full-text search via `knowledgeSearchRepository.search`; opens a document through a real
  signed download URL (`storageRepository.getSignedDownloadUrl`), not a fabricated link. No
  "search-index freshness" badge — there is no such signal anywhere in this codebase's repositories,
  so the screen instead reports the real, computed match count from the search call itself. Tablet
  two-pane.
- **`MobileAskAiScreen.tsx`** — real `POST /api/rag/query` (the same governed-RAG route desktop
  `AIWorkspaceSection.tsx` calls), rendering the genuine `RagAnswer` shape: real `confidence`, real
  citations with excerpts, `humanReviewRequired`, and the answer's own `rationale` — not a mocked
  chat bubble. "Create task from this answer" writes a real `AgenticDraft` via `writeAgenticDraft`
  and hands off to the Tasks tab.
- **`MobileStakeholdersScreen.tsx`** (CRM quick notes) — real `stakeholdersRepository` list; notes
  via `GET`/`POST /api/stakeholders/notes` (`stakeholderNotesRepository` is also service-role-gated,
  confirmed unsafe for direct client import, same pattern as Approvals). Shows the real, honest
  `engagementLevel` enum default (`"unrated"`, RAG Remediation Sprint 3 / A-58) and never a
  fabricated influence score — there is no real per-note scoring signal in this codebase to show
  instead. Tablet two-pane.
- **`MobileCommandHome.tsx`** (upgraded, not new) — MN-1 shipped a deliberately numberless
  placeholder ("A full daily catch-up view is landing in the next mobile sprint"). This is that
  follow-up: real today's-open-tasks count, real pending-approvals count (via `GET /api/approvals`),
  the real next meeting, and the most recently updated document, each fetched from the same
  tenant-scoped repositories/routes every other mobile screen now uses. An organization with no data
  yet gets a real, honest zero/"None scheduled" state, not a stale placeholder.

**Two new shared hooks, `src/features/mobile/`:**
- **`useMobileTenantScope.ts`** — the single shared `tenantScopeFromUser(session.user)` call every
  new screen uses, replacing what would otherwise be eight separate copies of the identical pattern
  every desktop section already duplicates.
- **`useMobileTabletLayout.ts`** — SSR-safe `matchMedia`-based hook, `true` at `window.innerWidth
  >= 768px`. Drives the two-pane list/detail layout on Tasks, Approvals, Knowledge, and CRM Notes
  specifically (the four screens the MN-2 prompt named for tablet layout) — Meetings and Projects
  stay single-pane at every width, since the prompt did not name them and there was no independent
  reason to add the complexity.

**`src/features/mobile/MobileShell.tsx`** — the architectural pivot this sprint required: MN-1's
`children` prop (the reused desktop `ActiveSection`) is now only used for the one registry entry
with no native MN-2 screen (`"settings"` — never in MN-2's explicit scope, and its desktop content
has no native-only requirement that would justify a rebuild this pass). Every other primary/more-tab
entry (`tasks`, `reminders`, `meetings`, `projects`, `approvals`, `knowledge`, `ai-workspace`,
`stakeholders`) now renders its own real native screen from the map above instead. The
forbidden-content safety boundary from MN-1 (rendering the local Home panel instead of any routed
content when `active` has no allowed mapping, e.g. `"dashboard"`) is unchanged.

**`src/features/mobile/screens/*.test.tsx`, `MobileCommandHome.test.tsx`,
`useMobileTabletLayout.test.ts`, `MobileShell.test.tsx` (updated)** — see Verification below for
exact counts. `MobileShell.test.tsx`'s own tests now mock every native screen component (each has
its own dedicated test file exercising its real behavior) so the shell's tests stay scoped to
routing/composition: which screen renders for which `active` value, the `"settings"`
children-fallback, and the forbidden-section Home fallback.

## What did not change

- No changes anywhere in `apps/mobile` (the separate Expo/React Native app) or
  `apps/mobile-lite-capacitor`/`src/features/lite`/`src/app/lite` (AXXESS Lite's own surface).
- `AppShell.tsx`/`Sidebar.tsx`/`TopBar.tsx` (X0 desktop chrome), every desktop `*Section.tsx`
  component, and every repository/API route this sprint reads from — zero changes. MN-2 adds new
  mobile-native UI on top of existing, already-live backend surfaces; it does not modify any of
  them.
- No new backend, no Supabase schema changes, no auth/RBAC/RLS/audit changes. `RouteBoundary`'s real
  access check is unchanged (still wraps the `"settings"` fallback path).
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` was not updated — consistent with MN-1's own
  precedent (it made the same choice for the same reason): the matrix is organized around named
  `A-###` actionables, and this sprint has no existing row to update rather than a gap that was
  silently left out.

## What remains partial or blocked

- **Settings has no native MN-2 screen.** It still renders the reused desktop `SettingsSection` via
  `MobileShell`'s `children` fallback, exactly as MN-1 left it. Not named in the MN-2 prompt's
  required-work list (items 1–9 cover Home, Tasks+Reminders, Meetings, Projects, Approvals,
  Knowledge Hub, Ask AI, CRM quick notes, and tablet layout — Settings is absent from that list), so
  this was treated as out of scope rather than an oversight.
- **`pnpm --dir apps/mobile run typecheck` is blocked** in this environment — same
  `[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY]` blocker MN-1's closeout already documented (pnpm
  refuses to purge/reinstall `node_modules` non-interactively, and forcing it risks corrupting the
  main repo's real `node_modules` through this worktree's NTFS junction to it). Not a regression
  risk: zero files in `apps/mobile` were touched by MN-2 either.
- **No live Android/tablet device or emulator walkthrough was performed.** Same tooling-environment
  limitation named in MN-1's and PR #302's closeouts (the Browser pane not compositing/hydrating
  reliably in this session) — not repeated here as a fresh attempt since it is a known, previously
  investigated limitation, not an unverified assumption.

## What claim is still unsupported

No claim is made that any of these eight screens have been visually confirmed on a real Android
device, emulator, or even this session's own Browser pane. Every functional claim in this closeout
is backed by the automated test suite listed below (real repository/route calls asserted with real
argument shapes), not a live walkthrough. Tablet two-pane layout is verified by a unit test of the
breakpoint hook (`useMobileTabletLayout.test.ts`) driving a simulated `window.innerWidth`/
`matchMedia`, not a real tablet screenshot.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (root) | Clean, 0 errors |
| `npx eslint . --max-warnings=0` (root) | Clean, 0 warnings |
| `npx vitest run --config vitest.config.mjs src/features/mobile` | **60/60 passing** (12 files) |
| `npx vitest run --config vitest.config.mjs src/app src/features/lite src/features/mobile` | **447/447 passing across 94 files** — confirms no regression to `AppShell`/`Sidebar`/`TopBar`/routing tests, Lite's own isolation tests, or MN-1's own suite |
| `node scripts/mobile-boundary-guard.mjs` | Passes, 30 files scanned |
| `npx next build` (root, production) | **Succeeds**, exit code 0. Every existing route still compiles/prerenders correctly alongside the eight new screen modules. |
| `pnpm --dir apps/mobile run typecheck` | **Blocked** — same non-interactive-pnpm-install limitation as MN-1; `apps/mobile` untouched |

*(Note on tooling: `pnpm run <script>` itself was blocked in this worktree by the same
`[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY]` dependency-status-check pnpm runs before every
script — not specific to `apps/mobile`. Verification commands above were run directly against the
underlying binaries (`node_modules/.bin/tsc`, `node_modules/.bin/eslint`,
`node_modules/.bin/vitest`, `node_modules/.bin/next`) via the already-correct NTFS junction to the
main repo's `node_modules`, which is exactly what each `pnpm run <script>` would have invoked
anyway — not a weaker or different check, just bypassing pnpm's own interactive-install gate.)*

## Next sprint recommendation

Get this branch (stacked on MN-1's `feat/mn1-mobile-native-shell`, itself not yet merged to `main`
as of this closeout) in front of a real Android device or emulator for the visual smoke test neither
MN-1 nor MN-2 could perform in this environment — the top real risk still open across both sprints,
named honestly in both closeouts rather than assumed away.
