# MN-6 — Android Beta 0.9 P0 Fixes Closeout

**Date:** 2026-08-24. **Branch:** `feat/mn6-p0-signout-and-ai-guard`. **Worktree:**
`.cache/worktrees/mn6-p0-fixes` (base: `main` at `b30a4c4`, the MN-5/#308 merge commit).

## Origin

Both fixes address items 1–2 of
`docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md` — the P0 findings from
Ritashree Mahanta's (co-founder) full device walkthrough of Android Beta 0.9, version code 3.
That triage doc itself independently verified both findings against this session's own source
code (not just the screenshots), and the founder explicitly instructed "Proceed with P0" to
authorize starting this pass.

## What changed

### 1. Real, reachable Sign Out control in the native mobile app

**Problem:** MN-1 (2026-08-23) replaced the desktop `AppShell`/`Sidebar`/`TopBar` with a native
`MobileShell` for the Capacitor app, but never carried the sign-out control forward.
`TopBar.tsx` was the only place in the codebase with a sign-out button; removing that chrome left
Android testers with **no way to sign out at all**. This also left MN-5's own logout-hygiene work
(`clearAgenticDraft()`/`clearStakeholderNoteDraft()` on logout, PR #308) unreachable on mobile,
since logout itself was unreachable.

**Fix:**
- [`src/app/App.tsx`](../../src/app/App.tsx) — the native-mobile branch now passes
  `onLogout={handleLogout}` to `<MobileShell>` (previously wired only to the desktop
  `<AppShell onLogout={handleLogout}>` branch).
- [`src/features/mobile/MobileShell.tsx`](../../src/features/mobile/MobileShell.tsx) —
  `MobileShellProps` gained a required `onLogout: () => void`, threaded through
  `MobileShellContent` into `<MobileMorePanel onLogout={onLogout} />`.
- [`src/features/mobile/MobileMorePanel.tsx`](../../src/features/mobile/MobileMorePanel.tsx) —
  now accepts `onLogout` and renders a real "Sign out" button below the navigation list, mirroring
  `TopBar.tsx`'s existing pattern (`LogOut` icon from `lucide-react`, `aria-label="Sign out"`),
  visually distinguished (maroon/destructive styling) from the navigation rows above it.

### 2. "Create task from this answer" no longer fires on a no-match AI response

**Problem:** Screenshot evidence (`1000224353.jpg` → `1000224354.jpg`) showed asking "Hi" in Ask
AI returns a genuine, correct no-match response ("No authorized institutional source matched this
question", 0% confidence) — but tapping "Create task from this answer" on that exact response
opened the New Task form pre-filled with the rejection text itself as the task title. The
create-actionable flow had no guard against firing on a non-answer.

**Fix:** [`src/features/mobile/screens/MobileAskAiScreen.tsx`](../../src/features/mobile/screens/MobileAskAiScreen.tsx)
now computes `isNoMatchAnswer = answer.confidence === 0 && answer.sources.length === 0`. When
true: the "Create task from this answer" button is replaced with an explanatory message ("No
matching source was found…"), and `handleCreateTask` itself is guarded as a defense-in-depth
check so the draft-write can never fire in that state even if the UI guard were bypassed.

## What did not change

- No changes to `writeAgenticDraft`/`readAndClearAgenticDraft` (`agenticDraftHandoff.ts`) itself —
  the guard lives entirely in the caller (`MobileAskAiScreen.tsx`), matching the triage doc's own
  recommendation ("Needs a check before offering... 'Create task from this answer'").
  Desktop's `AIWorkspaceSection.tsx` create-task flow was not touched or audited this pass — the
  triage doc scoped this fix to the mobile no-match bug specifically, since that's where the
  broken repro was captured; whether desktop has the same gap is unverified and out of scope here.
- No other P0/P1/P2 items from the triage doc were touched this pass (items 3–14 remain open,
  pending founder sequencing per that doc's "Proposed immediate sequencing" section).
- No changes to `MobileHeader.tsx`, `MobileTabBar.tsx`, or any other MN-1/MN-2/MN-4/MN-5 file.

## What was verified

Run from `.cache/worktrees/mn6-p0-fixes` via this repo's established `pnpm run` workaround
(direct binary invocation through the junctioned `node_modules`, since `pnpm run` itself aborts
non-interactively in every worktree):

- **Typecheck:** `node_modules/.bin/tsc --noEmit -p tsconfig.json` — 0 errors.
- **Lint:** `node_modules/.bin/eslint` on all 4 changed source files and 2 changed test files —
  0 errors, 0 warnings (one `react/no-unescaped-entities` error was caught and fixed during this
  pass — an apostrophe in the new no-match message).
- **Tests:** `node_modules/.bin/vitest run src/features/mobile/MobileShell.test.tsx
  src/features/mobile/screens/MobileAskAiScreen.test.tsx --pool=forks` —
  **2 test files passed, 11 tests passed, 0 failed.** (The default `--pool=threads` run hit a
  known pre-existing Vitest worker-thread startup timeout in this environment — 0 tests actually
  executed despite an exit code of 0 — so this run used `--pool=forks` instead, which completed
  cleanly in 23.6s.) New tests added this pass:
  - `MobileShell.test.tsx`: "renders a real, callable Sign out control in the More panel" —
    taps More, taps the Sign out button, asserts `onLogout` was called exactly once.
  - `MobileAskAiScreen.test.tsx`: "hides 'Create task from this answer' and does not write a draft
    for a genuine no-match (0% confidence, no sources)" — asserts the button is absent, the
    `onCreateTaskFromAnswer` callback is never called, and `readAndClearAgenticDraft("task")`
    returns `null`.
  - The 6 pre-existing `MobileShell.test.tsx` render calls were updated to pass the now-required
    `onLogout` prop (test files are excluded from the `tsconfig.json` typecheck, so this was not
    caught by `tsc` — updated for correctness and to keep the test suite representative of the
    real prop contract).
- **Build:** `node_modules/.bin/next build` — exit code 0, full route manifest emitted (every
  `/app`, `/api/*`, etc. route printed with no error/failed lines in the log), consistent with a
  clean production build.
- **Not run this pass:** `pnpm --dir apps/mobile run typecheck` (no `apps/mobile` changes),
  `pnpm run supabase:verify` (no schema/migration changes), Playwright (no routing/auth/onboarding
  behavior changed — this is a native-mobile-only shell/screen change with its own Vitest
  coverage, matching the precedent set by MN-1 through MN-5, none of which ran Playwright either).

## What remains partial or blocked

- Items 3–12 (P1/P2 UX gaps) and 13–14 (logo/DP/status feature requests) from the triage doc are
  unaddressed — explicitly out of scope for this P0-only pass, pending founder sequencing.
- Item 10 ("Profile" tab reads stale) still needs founder clarification before it can even be
  scoped, unchanged from the triage doc.
- This fix has **not been built into a new Capacitor Android bundle or uploaded to Google Play** —
  that requires a version-code bump and a CI `workflow_dispatch` run (or a manual trigger), neither
  of which happened this pass. The fix exists in this branch/PR only until that release step runs.

## What claim is still unsupported

- No live-device confirmation that the Sign Out button or the no-match guard behave correctly on
  a real Android device — verification this pass is Vitest (jsdom) + Next.js build only, not a
  Capacitor build or an on-device walkthrough. A real device re-test (ideally by Ritashree, mirror
  of how the original bugs were found) would be the actual closing evidence for both items.

## Exact files changed

```
src/app/App.tsx
src/features/mobile/MobileShell.tsx
src/features/mobile/MobileShell.test.tsx
src/features/mobile/MobileMorePanel.tsx
src/features/mobile/screens/MobileAskAiScreen.tsx
src/features/mobile/screens/MobileAskAiScreen.test.tsx
docs/readiness/MN6_ANDROID_BETA_0_9_P0_FIXES_CLOSEOUT_2026_08_24.md (this file)
```

## Exact commands run

```
node_modules/.bin/tsc --noEmit -p tsconfig.json
node_modules/.bin/eslint src/features/mobile/MobileShell.tsx src/features/mobile/MobileMorePanel.tsx src/features/mobile/screens/MobileAskAiScreen.tsx src/app/App.tsx
node_modules/.bin/eslint src/features/mobile/MobileShell.test.tsx src/features/mobile/screens/MobileAskAiScreen.test.tsx
node_modules/.bin/vitest run src/features/mobile/MobileShell.test.tsx src/features/mobile/screens/MobileAskAiScreen.test.tsx --pool=forks
node_modules/.bin/next build
```

## PR / branch / remote state

Branch `feat/mn6-p0-signout-and-ai-guard`, based on `main` at `b30a4c4`. Not yet pushed or opened
as a PR as of writing this closeout — see the commit that follows this doc.
