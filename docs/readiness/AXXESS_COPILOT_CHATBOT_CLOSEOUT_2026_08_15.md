# AXXESS Copilot Chatbot Closeout (2026-08-15)

## Objective

Founder's request, verbatim: "create a Copilot like Chatbot that executes user commands opening
with 'What can I do for you today, X' with X being user's first name" -- "It should be pop-up
prominent chatbot." Full design detail: this session's plan file, preserved in-session; no separate
design doc was written since two Explore agents plus one Plan agent, all spot-checked against real
source before implementation, produced a plan concrete enough to implement directly.

## Headline finding

Two Explore agents, run before any code was written, found that the external-agent MCP layer
(`toolRegistry.ts`) runs tool handlers through `supabaseAdminRest` -- a service-role client that
bypasses Postgres RLS -- specifically because an API-key-authenticated external agent has no real
human session. A logged-in human typing a command in this new chatbot already has a real session, so
routing chat commands through that same tool registry would have been a regression (RLS bypass for
no reason), not a shortcut. This chatbot instead calls `applicationServices.<x>Repository.create/
update/list` -- the exact same service layer the real Tasks/Meetings/Projects/Stakeholders forms
already call -- gated by the user's own existing RBAC role (`canAccessSection`), per the founder's
explicit choice among three offered execution-gating models (see Decision Ledger below). The
external-agent MCP governance surface (`toolRegistry.ts`, `AgentScope`, `approval_requests`) is
completely untouched by this feature.

## Decision Ledger

```
Decision: Chat-issued commands execute via the same applicationServices repositories the real forms
  use, gated by the user's own RBAC role (canAccessSection) -- not via the external-agent MCP
  toolRegistry.ts/approval_requests governance model.
Why: A human approving their own in-app command would be a self-referential, odd fit for a governance
  model built for a different-privileged-human-approves-an-external-agent scenario. The MCP tool
  registry's handlers additionally run through supabaseAdminRest (service-role, RLS-bypassing) --
  necessary for a session-less external agent, unnecessary and regressive for a human who already has
  a real, RLS-scoped session. Founder chose this explicitly via AskUserQuestion among 3 offered
  options (RBAC-gated / full MCP-governance-reuse / chat-only-no-execution).
What changed: New src/services/chatbot/* (command registry, intent-prompt builder/parser), new
  src/components/chatbot/* (ChatbotLauncher, ChatbotPanel, ChatbotConfirmCard), AppShell.tsx mounts
  the launcher as a sibling of BetaFeedbackButton, 6 new AnalyticsEventName entries.
Architecture boundary: No changes to /api/ai/route.ts, aiRouter.ts, src/services/ai/types.ts,
  toolRegistry.ts, agentScope.ts, or any approval_requests/agent_* table or route. No new database
  migration -- supabase:verify reports the same 42 migrations / 113 tables as before this feature.
Product boundary: 6 directly-executable v1 commands (create_task, create_meeting, create_project,
  create_stakeholder, update_task_status, add_stakeholder_note). Everything else falls back to the
  existing draft-handoff pattern (agenticDraftHandoff.ts) -- same honesty convention as
  AGENTIC_UNAVAILABLE_ACTIONS, no fabricated execution success. No DB-persisted chat history (client
  state only, resets on close/reload). Not wired into /lite (separate LiteShell).
Verification: typecheck 0 errors, lint 0 warnings, mobile typecheck 0 errors, targeted vitest 6 files
  / 26 tests passing, build succeeded, supabase:verify passed with unchanged migration/table counts.
  Live in-browser click-through was attempted but blocked by a pre-existing local dev-environment gap
  (no NEXT_PUBLIC_SUPABASE_URL/ANON_KEY or NEXT_PUBLIC_POSTHOG_KEY configured locally -- AuthProvider's
  session check never resolves past "Checking session" on localhost, unrelated to this feature and
  present before this session started). See Residual Risks.
Outcome: Code-complete and verified at typecheck/lint/mobile-typecheck/build/supabase-verify/targeted-
  test levels. Committed (`bbd3e4f`), PR #243 opened and merged to `main` (`c4733b1`), and deployed to
  production on both domains after the founder's separate explicit confirmations ("Commit and open
  PR", then "Merge this PR and deploy") -- see Deployment section below.
Follow-up: Founder's own in-app click-through on either live domain, confirming the greeting/trigger
  render as intended -- the one remaining unverified item, since a coding session cannot browser-test
  against a real authenticated production session itself.
```

## Deployment (2026-08-15)

- Committed `bbd3e4f` ("feat(chatbot): add global pop-up AXXESS Copilot chatbot"), pushed, PR
  [#243](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/243) opened against `main`.
- 3 CI checks were red on the PR (`Build, Lint, Type Check`, `validate` -- both a
  `Worker exited unexpectedly` Vitest crash inside the full `pnpm run test` run in CI, the same
  pre-existing infra flakiness flagged in every MCP3-x closeout this session; `Sprint 27/29 Pilot
  Acceptance Gate` -- a Playwright timeout on the unrelated Integrations email-import-preview e2e
  flow). Before merging, confirmed these were identical on the immediately-prior merged PR #242
  (unrelated code) via `gh pr checks 242`, and confirmed every one of this PR's own new test files
  passed cleanly inside the same CI log before the crash. `mergeStateStatus` was `UNSTABLE`, not
  `BLOCKED` -- none of the three are required/blocking checks in this repo's branch protection, so no
  admin override was used.
- Merged via `gh pr merge 243 --merge` on the founder's explicit "Merge this PR and deploy"
  instruction, producing merge commit `c4733b1` on `main`.
- `deploy-production.yml` run `31868955994` triggered automatically, both jobs succeeded:
  `Deploy landing.triaxisventures.com` (06:14:38-06:19:52 UTC), `Deploy investor.triaxisventures.com`
  (06:19:54-06:21:51 UTC).
- Live-verified post-deploy via unauthenticated `curl`: `investor.triaxisventures.com` (forced demo
  mode) returns `200` on `/dashboard`, `/integrations`, `/tasks`; `landing.triaxisventures.com` (real
  auth-gated product, not forced-demo) correctly `307`s `/dashboard` to `/auth?next=%2Fdashboard`
  (`200`) for an unauthenticated caller -- expected behavior for that domain given no session cookie,
  not a regression.

## Live click-through findings and fix (2026-08-15)

The founder performed the outstanding live click-through directly (two screenshots, one per domain)
and it surfaced two real bugs the automated test suite could not have caught, since both are only
observable against real `/api/ai` responses, not the mocked `fetch` calls the unit tests use:

1. **investor.triaxisventures.com (forced demo persona)** -- asking the chatbot anything returned the
   literal text `"Unauthorized."` in the chat thread. Root cause: `POST /api/ai` gates on
   `getServerAuthSession(true)`, which requires real Supabase auth cookies. The investor-demo persona
   is a pure client-side mock (`src/auth/AuthProvider.tsx`: `sessionFromUser(demoUserContext,
   "mock-rbac")` -- `"mock-rbac"` is a literal string, not a real JWT, and no Supabase cookies are ever
   set for it), so `getServerAuthSession` always returns `null` for this persona and the route always
   401s. This is not new or specific to the chatbot -- `POST /api/rag/query` (used by
   `AIWorkspaceSection.tsx`, live since an earlier sprint) has the identical gate and the identical
   limitation; it just already handles the 401 safely (`"Sign in to ask AXXESS a governed question."`,
   per that file's own F-016 "never surface the raw backend error string" comment). `ChatbotPanel.tsx`
   had not followed that same convention -- it showed `payload.error` verbatim.
2. **landing.triaxisventures.com (real Super Admin session)** -- asking the chatbot something returned
   a technical-looking string: `"OpenAI / ChatGPT request failed (429). This response was not
   generated by a live model call; treat it as unverified."` displayed as if it were a normal chat
   reply. Root cause: the OpenAI provider adapter (`src/services/ai/providers/openAiProvider.ts`)
   already has a deliberate, existing convention for this -- every non-live-call branch (missing API
   key, budget-guard skip, non-200 response, empty content, thrown error) returns `confidence: 0.3`
   as a sentinel, versus `confidence: 0.78` for a genuine completion (`aiRouter.ts`'s own
   `humanReviewRequired` threshold already splits on `confidence < 0.62`). `ChatbotPanel.tsx` was
   feeding `payload.answer` straight into `parseChatResponse` regardless of `payload.confidence`, so a
   degraded-fallback string got JSON-parse-failed and fell through to being displayed as plain chat
   text.

**Fix** (`src/components/chatbot/ChatbotPanel.tsx`): before parsing `payload.answer`, (a) a non-`ok`
response no longer shows `payload.error` -- a 401 now shows `"Sign in to chat with AXXESS Copilot."`
(matching `AIWorkspaceSection.tsx`'s exact convention), anything else shows a generic
`"AXXESS Copilot couldn't complete that. Try again in a moment."`; (b) `payload.confidence < 0.62` (the
same threshold `aiRouter.ts` already uses) now short-circuits to
`"AXXESS Copilot's AI provider is temporarily unavailable. Try again shortly."` before any JSON
parsing is attempted, so a provider-fallback string never reaches the chat thread as if it were a real
answer. Two new tests added to `ChatbotPanel.test.tsx` (now 7/7 passing) assert both: the raw
`"Unauthorized."` text and the raw `"not generated by a live model call"` string are each confirmed
absent from the rendered output, not just that a replacement string is present.

**What this does not fix**: the underlying `/api/ai` 401-for-demo-persona limitation itself is
unchanged and out of scope for this pass -- it is a pre-existing, repo-wide characteristic shared by
every `getServerAuthSession`-gated route, not something introduced by or unique to this feature. The
chatbot's free-form chat will continue to be non-functional (with a clean, safe message) for the
investor-demo persona specifically until/unless that broader limitation is addressed as its own unit
of work. The 6 directly-executable commands are unaffected by either bug (they go through
`applicationServices`/`canAccessSection`, not `/api/ai`), and were not exercised in either screenshot.

## Files Added

- `src/services/chatbot/chatCommandTypes.ts`
- `src/services/chatbot/chatIntentPrompt.ts` + `.test.ts`
- `src/services/chatbot/chatCommandRegistry.ts` + `.test.ts`
- `src/components/chatbot/ChatbotLauncher.tsx` + `.test.tsx`
- `src/components/chatbot/ChatbotPanel.tsx` + `.test.tsx`
- `src/components/chatbot/ChatbotConfirmCard.tsx` + `.test.tsx`
- `src/app/layout/AppShell.test.tsx` (first test file for this component)
- `docs/readiness/AXXESS_COPILOT_CHATBOT_CLOSEOUT_2026_08_15.md` (this file)

## Files Modified

- `src/app/layout/AppShell.tsx` -- mounts `<ChatbotLauncher>` as a sibling of `<BetaFeedbackButton>`,
  the same composition-only pattern the file already used.
- `src/services/analytics/types.ts` -- 6 new `AnalyticsEventName` entries: `chatbot_opened`,
  `chatbot_message_sent`, `chatbot_command_executed`, `chatbot_command_denied`,
  `chatbot_command_failed`, `chatbot_fallback_triggered`.
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- new row A-133.

## What Changed

A globally-mounted, pop-up chat widget (circular FAB trigger, `bottom-20 right-5 z-50` -- stacked
directly above `BetaFeedbackButton`'s `bottom-5 right-5 z-50` corner so neither collides, both stay
reachable). Opening it greets the user with `What can I do for you today, {firstName}?`, deriving
`firstName` via the exact pattern already used twice elsewhere in this repo
(`displayName?.trim().split(/\s+/)[0] || "there"`). Free-form messages route to the already-existing,
previously-unused `POST /api/ai` endpoint with `task: "general_chat"`. A prompt-engineered contract
(`chatIntentPrompt.ts`) asks the model to reply with strict JSON, either a plain chat reply or a
recognized command + args. A recognized command (one of the 6 in `chatCommandRegistry.ts`) is gated
by `canAccessSection(user, definition.section)` -- the same RBAC check that already decides nav-item
visibility -- and, if allowed, shown as an inline confirm card in the chat thread (not a full-screen
modal) before `definition.execute(scope, args)` actually runs. An unrecognized-but-actionable request
falls back to the existing sessionStorage draft-handoff pattern, pre-filling the relevant form instead
of fabricating direct execution.

## What Did Not Change

- No changes to `/api/ai/route.ts`, `aiRouter.ts`, or `src/services/ai/types.ts` -- intent parsing is
  entirely local to the new `chatIntentPrompt.ts`, via prompt construction and client-side JSON
  parsing of the existing `answer` string field.
- No changes to `toolRegistry.ts`, `agentScope.ts`, `approval_requests`, or any `agent_*` table/route
  -- this feature is fully separate from the external-agent MCP governance surface built in MCP1-3.
- No new database migration -- `supabase:verify` reports the same 42 migrations and 113 created/
  RLS-protected tables as the pre-existing baseline.
- No `/lite/*` wiring -- `LiteShell` is a separate layout tree from `AppShell.tsx`.
- No DB-persisted chat history -- client-side `useState` only, resets on panel close/reload/unmount.
- No voice input, no command set beyond the 6 listed, no multi-turn slot-filling state machine (the
  model's own natural-language follow-up handles missing args within `type:"chat"` turns).

## Verification

Passed:

- `pnpm run typecheck` -- 0 errors.
- `pnpm run lint` -- 0 warnings (`eslint . --max-warnings=0`).
- `pnpm --dir apps/mobile run typecheck` -- 0 errors.
- Targeted `pnpm exec vitest run` across every new/changed file (`src/services/chatbot/*`,
  `src/components/chatbot/*`, `src/app/layout/AppShell.test.tsx`, excluding
  `.claude/worktrees`/`.cache/worktrees`): **6 files / 26 tests passing**, covering: greeting text
  with a real `displayName` and the `"there"` fallback; `/api/ai` called with `task: "general_chat"`
  and the constructed prompt; a recognized command renders the inline confirm card only when
  `canAccessSection` allows it, and calls the registry's `execute` on Confirm; an RBAC-denied role
  (`Guest` against the `stakeholders` section) is refused before any confirm card renders; each of the
  6 registry commands calls the exact `applicationServices` repository method/args table specified in
  the plan, never the MCP tool registry; `update_task_status` refuses to guess when a title search
  matches zero or multiple tasks; `add_stakeholder_note` posts to the existing
  `/api/stakeholders/notes` route rather than calling its service-role repository directly; the
  launcher's trigger positioning classes (`bottom-20 right-5 z-50`) are asserted as a regression guard
  against a future collision with `BetaFeedbackButton`; `AppShell.tsx` mounts both floating widgets as
  persistent, shell-level siblings of page content.
- `pnpm run build` -- succeeded (exit code 0); full route manifest built cleanly with the new
  component tree included in the client bundle.
- `pnpm run supabase:verify` -- passed; 42 migrations, 113 created/RLS-protected tables -- unchanged
  from the pre-existing baseline (this feature adds no schema), same pre-existing unrelated warning as
  every prior sprint.

Attempted, honest result:

- Live in-browser click-through (open the panel, confirm the real-user greeting, send a recognized
  command, confirm the card appears, send an unrecognized action, confirm the fallback navigates) --
  attempted against the local dev server (`next-dev`, port 3000). Blocked: this environment has no
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` configured (confirmed no `.env.local`
  present), so `AuthProvider`'s session check never resolves past a permanent "Checking session"
  loading state, even after manually setting the demo-mode localStorage flag and cookie
  (`axxess.demoMode.enabled`, `axxess-demo-session`) that the edge proxy checks for. Console also
  showed `NEXT_PUBLIC_POSTHOG_KEY variable required` errors, confirming this is a pre-existing local
  environment credentials gap, not something introduced by or specific to this feature. This is the
  same class of gap this session's other closeouts flagged for live MCP provider validation --
  requires either the founder's own local `.env.local` with real Supabase credentials, or verification
  against a deployed preview, neither of which a coding session can supply itself.

## Residual Risks

- **Free-form chat does not work for the investor-demo persona** -- confirmed live, root-caused, and
  given a safe error message (see "Live click-through findings and fix" above), but the underlying
  `/api/ai` 401 for that persona is not fixed. Anyone giving an investor/YC demo on
  `investor.triaxisventures.com` will see the chatbot open and greet correctly, but any free-form
  question will return `"Sign in to chat with AXXESS Copilot."` rather than a real answer. The 6 direct
  commands are unaffected (different backend path). If live free-form chat in the demo persona
  specifically is wanted, that is new, separate scope -- not assumed or silently added here.
- **Live model calls remain rate/budget-constrained** -- the `confidence < 0.62` fallback branch is a
  safety net for exactly this, but it means a real user can still hit "temporarily unavailable" during
  normal use whenever the configured OpenAI account is rate-limited or the spend guard trips
  (`aiSpendGuard.ts`, pre-existing, unrelated to this feature).
- **Prompt-engineered JSON contract, not a structured tool-call API** -- `chatIntentPrompt.ts` asks the
  model to emit JSON via instruction text, the same class of reliability risk as any prompt-based
  structured-output approach; a provider that doesn't follow the instruction falls back to a plain
  chat reply (`parseChatResponse`'s tested fallback), never a crash or a fabricated command.
- **The 6 direct commands have not been live-exercised** -- both founder screenshots tested free-form
  chat only (which hit the two bugs above before any command path was reached). A live end-to-end
  "create a task" round trip through the confirm card is still outstanding.

## Closeout Position

Code-complete, verified at typecheck, lint, mobile-typecheck, build, and supabase-migration levels,
deployed to production on both domains (PR #243, merge `c4733b1`, `deploy-production.yml` run
`31868955994`), and now additionally live-tested by the founder directly -- which is exactly what
surfaced the two real bugs above (raw backend-error leakage on demo-persona 401, raw provider-fallback
text leakage on rate-limit) that no amount of mocked unit testing could have caught. Both are
root-caused, fixed, covered by 2 new regression tests (7/7 now passing in `ChatbotPanel.test.tsx`,
28/28 across the full chatbot test surface), and this second fix is committed/deployed per its own
evidence trail below. The widget itself -- trigger, panel, real-name greeting -- is confirmed working
correctly on both domains from the founder's own screenshots. Not yet fully closed: free-form chat in
the investor-demo persona specifically (a pre-existing, repo-wide limitation, not new scope for this
feature) and a live end-to-end command execution.
