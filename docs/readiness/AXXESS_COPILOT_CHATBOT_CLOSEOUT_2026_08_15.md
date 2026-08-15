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
  test levels. Not committed, not pushed, not deployed -- awaiting explicit founder confirmation per
  this repo's standing Git and Deployment Discipline rule.
Follow-up: Live browser verification (ideally against a deployed preview or the founder's own local
  env with real Supabase credentials), then commit/PR/deploy on separate explicit confirmation.
```

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

- **Live click-through verification is still outstanding**, for the environment reason above, not a
  defect found in the code. The 26 passing component/unit tests substitute for it at the logic level
  (RBAC gating, execute wiring, positioning, mounting) but do not prove the real `/api/ai` model
  actually returns well-formed JSON for real prompts in production -- `parseChatResponse`'s malformed-
  JSON fallback exists specifically because that has not been live-verified.
- **Prompt-engineered JSON contract, not a structured tool-call API** -- `chatIntentPrompt.ts` asks the
  model to emit JSON via instruction text, the same class of reliability risk as any prompt-based
  structured-output approach; a provider that doesn't follow the instruction falls back to a plain
  chat reply (`parseChatResponse`'s tested fallback), never a crash or a fabricated command.
- **Not deployed as of this closeout** -- push/PR/merge/deploy require separate explicit confirmation
  per this repo's standing Git and Deployment Discipline rule, matching every prior round this session.

## Closeout Position

Code-complete and verified at typecheck, lint, mobile-typecheck, build, and supabase-migration levels,
plus 26 passing targeted unit/component tests covering the RBAC-gating decision, the 6-command
registry's exact repository call sites, the intent-parsing fallback behavior, and the floating-widget
positioning/mounting. Not production-certified: a real in-browser click-through is blocked by this
local environment's missing Supabase/PostHog credentials (pre-existing, unrelated to this feature) and
remains outstanding, requiring either the founder's own environment or a deployed preview to complete.
