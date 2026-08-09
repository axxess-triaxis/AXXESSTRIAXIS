# Closeout -- Stale Plan File: "A-86: Session Death on Sign-In -- Concurrent Refresh-Token Race"

Date: 2026-08-09
Governance source: `CLAUDE.md` evidence-chain discipline
Status: **Closed -- no code change required. The plan describes work already shipped, tested, and
HITL-confirmed live on 2026-08-03. The plan file itself is a stale artifact, not a pending task.**

## Why This Document Exists

A drafted plan file (`squishy-sprouting-plum.md`, titled "A-86: Session Death on Sign-In -- Concurrent
Refresh-Token Race") surfaced this session as apparently pending work. Its own ID collided with an
existing, already-closed matrix row (A-86, `Yes`, 2026-08-03), which the founder flagged directly rather
than letting it pass. Per this repo's evidence discipline, a claim that something is "pending" or
"needed" is checked against repo state before acting on it, not assumed -- this document records that
check and its result, so this specific plan file is never mistakenly re-executed by a future session.

## What Was Checked

1. **Git ancestry.** `git merge-base --is-ancestor da01319 HEAD` -> confirmed `da01319` is already an
   ancestor of the current branch HEAD (current tip: `e329910`).
2. **Commit identity.** `da01319`, dated 2026-08-03 09:31:17 +0530, subject
   `fix(auth): A-86 -- eliminate concurrent refresh-token race that permanently killed sessions`.
   Its message describes the identical root cause the plan describes (dashboard mount fires ~20
   parallel calls to `getServerAuthSession`; concurrent redemption of a single-use Supabase refresh
   token triggers GoTrue's reuse-detection, revoking the whole token family including the winning
   request's fresh tokens -- confirmed via live Vercel production logs) and the identical fix (proactive
   refresh at the one call that gates dashboard rendering, rather than trying to coordinate 20
   memory-isolated serverless invocations after the fact).
3. **Source code, read directly, not inferred from the commit message alone:**
   - `decodeAccessTokenExpiry` -- present at `src/auth/serverSession.ts:62`, exact function name and
     purpose (JWT-payload `exp` decode, `null` on parse failure) the plan specifies.
   - `refreshIfExpiringWithinSeconds` option on `getServerAuthSession` -- present at
     `src/auth/serverSession.ts:244`, with the proactive-refresh branch at line 275, gated on both
     tokens being present and remaining life under the threshold -- matches the plan's spec exactly,
     including the best-effort fall-through-on-failure behavior.
   - `src/app/api/auth/session/route.ts:9` -- calls `getServerAuthSession(true, {
     refreshIfExpiringWithinSeconds: 300 })`, the exact 300-second margin and the exact single call
     site (not the other ~84 `getServerAuthSession` call sites) the plan specifies.
4. **Bug ledger cross-check** (`docs/readiness/FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md`), establishing
   the full lineage rather than treating 2026-08-03 as an isolated data point:
   - **2026-08-01** (`d1da9b3`, `fix(auth): stop concurrent refresh-token race from logging users out`)
     -- a first-pass fix: stopped a *losing* concurrent-refresh request from destructively clearing
     cookies for the whole browser. Founder: "Resolved / CLOSED" same day.
   - **2026-08-03** (`da01319`, = matrix row A-86) -- the deeper fix: eliminated the race at its source
     instead of only containing its side effect. **Matrix row A-86's own evidence:** "Yes -- HITL
     live-confirmed 2026-08-03. Founder: 3 consecutive sign-in/sign-out cycles, all held; clicking
     'Triaxis Ventures' (Settings) no longer signs out... Founder's own words: 'a major point of failure
     removed.'"
5. **No later recurrence found.** Searched the matrix and bug ledger for any post-2026-08-03 mention of
   this symptom (session death after sign-in, redirect to `/auth`) reappearing -- none found. Nothing in
   this session's own PostHog investigation (A-105/A-106/A-107, all dated 2026-08-08) names this symptom
   either; those are a distinct LCP regression, hydration error, and Google OAuth *sign-in* exchange
   failure, not a post-sign-in session death.

## Conclusion

The plan file is the actual plan that produced `da01319` -- it was executed and shipped on 2026-08-03,
then never cleaned up afterward, and was picked up again this session as if newly pending. This is a
**stale plan-mode artifact, not a regression and not new work.** No code change is required. The
plan file (`squishy-sprouting-plum.md`) should not be re-executed.

## What This Does Not Establish

- This does not claim the underlying fix will hold forever -- only that it is real, shipped, tested
  (16/16 new/updated `serverSession` tests per the commit message, 62/62 sampled across the ~85
  unaffected call sites), and HITL-confirmed live as of 2026-08-03, with no contrary evidence found.
- This does not touch or reopen A-105, A-106, or A-107 -- those remain open, undiagnosed, and unrelated
  to this symptom.
- No new matrix row is added by this document -- A-86 already correctly reflects this work; there is
  nothing to append to it beyond this closeout existing as the citable record of the stale-plan check.

## Evidence Chain

Founder flagged the plan/matrix ID collision directly, 2026-08-09 -> re-read the plan file's own
problem statement and proposed changes -> checked git ancestry (`da01319` already in `HEAD`'s history)
rather than assuming the plan was unexecuted -> read the actual current source
(`src/auth/serverSession.ts`, `src/app/api/auth/session/route.ts`) to confirm the plan's specific
proposed function/option names and values are present, not just a similarly-worded commit -> cross-
checked the bug ledger to establish the full two-stage fix lineage (2026-08-01 partial fix, 2026-08-03
full fix) rather than treating either date in isolation -> confirmed no later recurrence is recorded
anywhere in this repo's own tracking documents -> this document written as the closing record.

## Files Changed

- `docs/readiness/A86_STALE_PLAN_CLOSEOUT_2026_08_09.md` (new, this document)

No source files changed -- this is a verification-only closeout confirming existing shipped code already
satisfies the plan, not new work.
