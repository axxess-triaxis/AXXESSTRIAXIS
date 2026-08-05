# XL-6 Closeout -- Lite Daily-Use Loop Phase 1

Date: 2026-08-06
Sprint: XL-6 (Phase 1)

Planning provenance: Codex-drafted execution prompt, "XL-6: Lite Daily-Use Loop Phase 1," founder
product principle restated in the prompt: "Lite should feel useful in 10 minutes, not impressive
after 2 hours."

## What Became Live

Real, tenant-scoped create/list loops, each wired to the exact same repository X0's own equivalent
section uses (via `applicationServices`, `src/providers/serviceProvider.ts`) -- not a duplicate
store, not a mocked write:

- **`/lite/work`** (`LiteWorkSection.tsx`, new): create a task, list open/completed tasks, mark a
  task done. A reminder is honestly a task with a due date (stated in the UI) -- AXXESS has no
  separate Reminder entity, and Lite doesn't invent one. `assigneeId` defaults to the signed-in
  user's own real id (self-assignment), never a fake or placeholder id -- the backend requires a
  real assignee.
- **`/lite/people`** (`LitePeopleSection.tsx`, new): add a contact, list contacts, add an optional
  follow-up note via the already-allowlisted `POST /api/stakeholders/notes`. Every `create` call
  omits `influenceScore`/`engagementLevel` so the repository's own honest defaults apply (0/
  "unrated") -- the same discipline `StakeholdersSection.tsx` itself follows (A-58, RAG
  Remediation Sprint 3). No large stakeholder map, no relationship-owner picker.
- **`/lite/meetings`** (`LiteMeetingsSection.tsx`, new): create a meeting/follow-up (title,
  date/time, free-text attendees, notes), list meetings sorted by start time. `attendeeIds` is
  always sent as an empty array -- `Meeting.attendeeIds` expects real stakeholder/user UUIDs (a
  foreign-key-shaped field), and Lite never invents one. Free-text attendee names fold into the
  `notes` field instead, labelled plainly ("Attendees: ...") so nobody mistakes it for a real
  linked-contact list.
- **`/lite/ask`** (`LiteAskSection.tsx`, new): a plain question box calling the real, already-
  allowlisted `POST /api/rag/query` (XL-4) -- the same governed RAG workflow X0 uses. Shows the
  cited answer and source document titles, or an honest error from the API, never a fabricated
  answer. No AI Review Inbox, no agentic MCP tools, no auto-create-a-task-from-the-answer behavior.
- **`/lite`** (`LiteHomeSection.tsx`, rewritten): now shows real, live counts (open tasks, upcoming
  meetings, contacts) fetched from the same three repositories above, plus the existing shortcut
  grid to all 7 other Lite sections. A count fetch failure shows `--`, never a fabricated `0`.

## What Remains Scaffold/Pending

- **`/lite/files`** -- still `LitePlaceholderSection`, unchanged this pass. The real document
  upload path (`POST /api/documents/upload` -> `/upload/complete` -> `/extract`) is a multi-request
  chunked-upload protocol (see that route's own header comment: chunking exists specifically to
  stay under Vercel's ~4.5MB incoming-body limit) with real failure-mode complexity (path
  authorization, upload-id validation, per-chunk MIME/size checks). Building it correctly and
  safely alongside four other real data-wiring loops in one sprint pass was judged too much risk
  for "do not create fake successful writes" -- the honest pending state
  ("This connects to your real data in an upcoming update") is the correct choice here, not a
  shortcut taken to save time. Explicitly the next recommended step (see below).
- **`/lite/projects`** -- still `LitePlaceholderSection`, unchanged. Out of this pass's scope by
  the prompt's own product-scope framing ("Projects/Programs lite placeholder... if safe" --
  budget went to the four core loop domains named in the objective's own daily-use-loop diagram).
- **Simple Activity/Audit trace** -- not built as a dedicated surface. `auditLogsRepository` calls
  `/api/audit-logs`, which XL-4's own Lite API allowlist deliberately blocks (it's "the full
  enterprise audit log viewer," exactly what this prompt's own non-negotiables forbid exposing).
  The honest fallback the prompt itself offers -- "add an honest placeholder under Settings" --
  was already in place before this sprint: `LiteSettingsSection.tsx`'s "Audit Export" row already
  reads "Download a simple activity log as PDF or ZIP" with a "Coming soon" marker. No change was
  needed to satisfy this requirement.

## Which Repositories Were Reused

`applicationServices.tasksRepository`, `.meetingsRepository`, `.stakeholdersRepository` (all via
`src/providers/serviceProvider.ts`, the exact same object X0's `TasksSection.tsx`/
`MeetingsSection.tsx`/`StakeholdersSection.tsx` import), plus direct `fetch` calls to two already-
allowlisted API routes: `POST /api/stakeholders/notes` and `POST /api/rag/query`.

## Which Duplicate Stores Were Avoided

No new Supabase tables, no new repository implementations, no client-side-only task/contact/
meeting list that isn't the real backend. `LiteWorkSection` does not create a separate "reminder"
table -- it tags a real task instead, explicitly disclosed. `LiteMeetingsSection` does not create a
fake attendee-linking mechanism -- it uses the real `notes` field for free text instead of
inventing a parallel attendee-name column.

## What Was Intentionally Not Built

- Chunked document upload (Files) -- see above.
- A contact-linked meeting attendee picker -- would require either fabricating stakeholder UUIDs
  (forbidden) or building a full contact-search-and-select UI, judged out of scope for "useful in
  10 minutes."
- Task assignee picker -- Lite tasks self-assign only; assigning to a different org member would
  require fetching and rendering the full `usersRepository.listByOrganization` list, adding UI
  complexity this pass's budget didn't cover.
- Complex dashboard scoring, full X0 projects dashboard, full workflow records, full integration
  catalogue, full AI Review Inbox, social monitoring, admin panels, agentic action workflows --
  all explicitly out of scope per the prompt's own "Do not build" list, none touched.

## A Real Bug Found and Fixed During This Pass

Every new section computed `tenantScopeFromUser(user)` directly in the component body instead of
memoizing it (`TasksSection.tsx`'s own established pattern uses `useMemo(() => ..., [user])`,
which this pass initially missed). Without memoization, `scope` is a new object reference on every
render, so the `useCallback(load, [scope])` / `useEffect(() => void load(), [load])` pair
re-triggers a full data refetch on every render -- discovered when `LitePeopleSection`'s own test
for the follow-up-note flow failed: clicking "Note" to open the note form, then losing it again
because a fresh reload cycle re-entered the `loading` branch mid-interaction. Fixed by wrapping
`scope` in `useMemo` in all four new/rewritten sections (`LiteWorkSection`, `LitePeopleSection`,
`LiteMeetingsSection`, `LiteHomeSection`), matching X0's own established pattern. This is exactly
the kind of defect the test suite exists to catch before it reaches production -- reported here
rather than silently fixed without mention.

## Tests

11 test files, 53 tests, all pass:

- `LiteWorkSection.test.tsx` (5 tests): honest empty state; real create via `tasksRepository`,
  self-assigned; real "mark done" via `tasksRepository.update`; honest reminder labelling; no X0/
  agentic vocabulary.
- `LitePeopleSection.test.tsx` (4 tests): honest empty state; real create with no fabricated
  influence/engagement values; real follow-up note via `/api/stakeholders/notes`; no large
  stakeholder map or X0 CRM vocabulary.
- `LiteMeetingsSection.test.tsx` (3 tests): honest empty state; real create with `attendeeIds`
  always empty and free-text attendees folded into `notes`; no X0 workflow-records/golden-path
  vocabulary.
- `LiteAskSection.test.tsx` (4 tests): honest pending state; real `/api/rag/query` call with cited
  answer rendered; honest error (not a fabricated answer) on failure; no AI Review Inbox/agentic
  MCP vocabulary.
- `LiteHomeSection.test.tsx` (3 tests): real live counts, not fabricated; honest `--` on a fetch
  failure; simple shortcut grid, not X0's Executive Dashboard vocabulary.
- `LitePlaceholderSection.test.tsx` (1 test, new): Files' honest pending state, no demo file names
  or fabricated file list.
- Plus the 6 pre-existing Lite test files (`LiteShell`, `liteFeatureRegistry`, `liteIsolation`,
  `liteNavigation`, `liteSurface`, and `packages/features-lite`'s own suite) -- unchanged, still
  pass, confirming this pass didn't regress XL-1 through XL-5's own gates.

## Verification

- `tsc --noEmit`: clean.
- `eslint . --max-warnings=0`: clean (2 `react/no-unescaped-entities` errors caught and fixed
  during this pass -- apostrophes in JSX text, not logic bugs).
- `lite:guard`: passes, 43 files scanned (was 37 before this sprint's new section files).
- `lite:mobile:validate`: passes, unchanged.
- `next build`: succeeds, exit code 0, no errors. All `/lite/*` routes present in the output
  (`/lite`, `/lite/work`, `/lite/people`, `/lite/meetings`, `/lite/ask`, `/lite/files`,
  `/lite/projects`, `/lite/settings`, `/lite/payments`, `/lite/help`).
- Whole-repo `pnpm run test`: not re-attempted this pass -- XL-4's closeout already established
  this sandbox cannot complete the ~242-file suite in a single process regardless of configuration
  (confirmed OOM near the end of a 52-minute attempt, 241/242 files and 1240/1244 tests passed
  with zero failures before the crash). The scoped Lite suite (53/53 pass) plus whole-repo
  `tsc`/`eslint` is the evidence basis here, consistent with how XL-4 and XL-5 reported this same
  sandbox limitation.

## Residual Risks

1. **Files (chunked upload) is the single biggest gap** in the daily-use loop the prompt's own
   objective diagram describes -- "upload or note a file" is not yet real. Explicitly the next
   recommended step.
2. **No RLS/live-database verification was performed this pass** -- all four new sections were
   verified via component tests with mocked repositories (matching the codebase's own established
   test pattern for `TasksSection`/`StakeholdersSection`/`MeetingsSection`), not against a real
   Supabase tenant. The repository calls themselves are unchanged from what X0 already uses in
   production, so this is a lower-risk gap than it would be for genuinely new backend code, but it
   is not the same as a live walkthrough.
3. **No task assignee picker, no meeting-attendee-to-contact linking** -- both explicitly deferred,
   see "What Was Intentionally Not Built."
4. ~~`liteFeatureRegistry.ts` statuses not updated~~ -- fixed during this pass:
   `tasks`/`reminders`/`meetings`/`crmStakeholders`/`aiWorkspace` moved from `"scaffold"` to
   `"live"` in `packages/features-lite/src/liteFeatureRegistry.ts`, matching what actually shipped.
   `projects`/`programs`/`approvalsGovernance`/`documentsKnowledgeHub` stay `"scaffold"`;
   `integrations`/`auditCompliance`/`analytics` stay `"pending"` -- all still honest.
5. Browser-based live verification was attempted but inconclusive in this sandbox's preview tool
   (the same pre-existing `LiteShell` client-side auth-session-fetch stall documented earlier this
   session, unrelated to this pass's new code) -- server-side rendering was confirmed clean (200
   status, no errors, for all four rewired routes) as a partial substitute, and the component test
   suite is the primary evidence basis for this closeout, not a live browser walkthrough.

## Next Sprint Recommendation

**XL-7: Lite Files (chunked document upload).** The one core-loop step still missing. Should reuse
the existing `/api/documents/upload` -> `/upload/complete` -> `/extract` protocol exactly as
`KnowledgeHubSection.tsx` does today (already allowlisted for Lite, XL-4), scoped down to a single-
file, no-frills upload UI matching this sprint's other sections' minimalism -- not a port of
`KnowledgeHubSection.tsx`'s full feature set (categories, tags, permissions, versioning).

## Final Closeout Judgment

**Question this closeout must answer:** Can a small customer now complete one simple useful loop
inside AXXESS Lite without seeing X0 complexity?

**Answer: Partially yes.** A small organization can now sign in, see real open-task/upcoming-
meeting/contact counts, create and complete tasks, add contacts with follow-up notes, schedule
meetings, and ask a governed-RAG question about their own uploaded files -- five of the seven loop
steps in the prompt's own objective diagram, all wired to real, tenant-scoped, non-fabricated data,
none of it importing X0 Dashboard, Admin, Investor Demo, Social Alerts, Golden Path, or Agentic MCP
(verified by the Lite boundary guard, now scanning 43 files, and by explicit "no forbidden
vocabulary" assertions in every new test file). The remaining gap -- uploading or noting a file --
is the next sprint's job, not silently glossed over here.
