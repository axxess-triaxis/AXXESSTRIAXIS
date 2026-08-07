# Stale Actionables Matrix Closure -- A-27, A-33, A-34, A-38, A-40, A-62, A-74, A-75, A-79

Date: 2026-08-07
Governance source: `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`
Status: **Permanently closed.** All 8 items below (9 actionable IDs, since A-27/A-40 share one
root cause) are `Yes` in `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` as of this document.

## Why This Document Exists

The founder's direct feedback this session (2026-08-07) was that the repository's own documentation
-- specifically the root README and, discovered in the course of responding to that feedback, the
actionables matrix -- had drifted from what was actually true in the codebase. Real work had been
done and, in several cases, already independently confirmed and closed by the founder in
`docs/readiness/FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md`'s 2026-08-01 review pass, but
`ACTIONABLES_READINESS_MATRIX.md` was never updated to reflect those closures. The matrix kept
showing 8 items as open defects or "log only, not yet actioned" weeks after they were fixed.

This is the same class of problem as the README staleness this session already fixed, applied to a
different document. This closeout exists so the evidence for each of the 8 closures is gathered in
one place, not scattered across incremental matrix-row edits, and so the fact that this staleness
existed -- and how it was found and closed -- is itself on the record rather than silently
corrected away.

**Discovery method, same for all 8:** while investigating one specific item the founder asked about
(the "5 in-repo UI bugs" and, separately, A-77's connector batch), a cross-check against
`FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` and this repo's own commit history showed the matrix
disagreeing with evidence the repository itself already held. Each item below was independently
re-verified against actual code or a live screenshot before being marked `Yes` here -- none were
closed on the ledger's word alone.

## Per-Item Closure Detail

### A-27 / A-40 -- Stale-session auto-continue security bug

**Original defect:** clicking "Welcome Aboard" while already signed in from earlier testing landed
directly on "Continue to workspace" with no fresh re-authentication prompt (A-27); separately,
"Back" navigation repeatedly cycled through Sign Up/Sign In screens that silently auto-continued
into the workspace (A-40). Founder, 2026-07-25: **"very risky security wise for Enterprise
platform"** / **"Very bad UX with repeated unmitigated occurrence."** Both were explicitly deferred
at the time ("Document, dont act yet").

**Root cause:** sessions never truly expired (30-day sliding refresh renewal on every visit), and
`/auth` unconditionally bypassed straight to "Continue to workspace" for any already-authenticated
session, real or demo.

**Fix:** commit `89b3874` (2026-07-31), `fix(auth): stop real sessions auto-continuing on /auth,
add 24h absolute session cap`. Adds a session-anchor cookie enforcing a hard 24h cap (force-expiring
every session that existed before the fix shipped), splits the `/auth` bypass to demo-mode only, and
revalidates real sessions on tab focus/visibility.

**Ledger disposition (2026-08-01):** item #19 (A-27) and item #32 (A-40) -- both **"100%
resolved... closed by #64"** (the ledger's internal reference to this same commit).

**Independent re-verification, 2026-08-07:** read `src/auth/serverSession.ts` directly -- the
session-anchor-cookie/24h-cap/demo-only-bypass mechanism is present and un-reverted by any later
commit, including the subsequent `741c208` (A-87) fix in the same file.

### A-33 -- "Review Roles" misroutes to Security tab

**Original defect:** navigating via the "Review Roles" admin path landed on Settings' Security tab
by coincidence of tab-default ordering, not a roles-relevant tab.

**Root cause:** `SettingsSection.tsx`'s tab state defaulted to `"security"` regardless of entry
intent.

**Fix:** commit `0883b30` (2026-07-27), `fix(golden-path): correct routing for
A-35/A-36/A-37/A-39 defects` -- built the `?tab=` query-param-driven tab selection that A-33's own
fix depends on (Settings now honors an explicit tab intent instead of always defaulting to
Security). 152 test files / 605 tests passing at the time, typecheck/lint/build clean.

**Ledger disposition (2026-08-01):** item #25 -- **"100% resolved."**

**Independent re-verification, 2026-08-07:** read `SettingsSection.tsx` directly --
`initialTabFromLocation()` reads a real `?tab=` query param via `window.location.search` and only
falls back to `"security"` when none is supplied or invalid.

### A-34 -- Redundant "Guided demo" gate before Knowledge Hub

**Original defect:** "View Executive Risk" navigated to Knowledge Hub, which showed a mandatory
"Guided demo 2/6" onboarding overlay requiring an extra "Open Knowledge Hub" click before reaching
the actual document list. Founder's own words: **"a redundant mediating 'open Knowledge hub' button
which has to be removed to reduce a user redundant step."**

**Fix:** commit `8fa39ee`, `fix(dashboard): collapse Enterprise golden path panel into Start
guided setup` -- the mandatory gate was replaced with an optional, dismissible "Start guided setup"
path, off by default.

**Ledger disposition (2026-08-01):** item #26 -- **"100% resolved -- now reads 'guided setup'
instead of 'guided demo.'"**

**Independent re-verification, 2026-08-07:** read `DashboardSection.tsx` directly -- the surface now
reads "Start guided setup" / "Hide guided setup path," with a code comment confirming it is
"100% optional, revealed" rather than mandatory.

### A-38 -- "Back" from Security exits straight to "Continue to Workspace"

**Original defect:** clicking Back from the Security tab (reached via the A-36/A-37 admin routing
paths) exited directly to "Continue to Workspace" instead of returning to the Golden Path checklist
or wherever the user came from. Founder's own words: **"unnecessary, spoils UX and one step too much
unnecessarily."**

**Ledger disposition (2026-08-01):** item #30 -- **"100% resolved -- now lands at Executive
Dashboard."**

**Independent re-verification, 2026-08-07:** searched `SettingsSection.tsx` and the surrounding
Settings/Security navigation code directly for any remaining "Continue to Workspace" routing --
none found. The string only remains, correctly, on the demo-mode-only `/auth` bypass path
(`src/app/auth/page.tsx`, `src/demo/demoMode.ts`, `src/proxy.ts`), which is unrelated to this
specific Back-button defect. The exact commit that changed the Back target to Executive Dashboard
was not individually hunted down -- the absence-of-defect check above is direct code evidence in
its own right, independent of which commit produced it.

### A-62 -- Stale "Pitch deck" placeholder cited as sole RAG source

**Original defect:** a stale "Pitch deck" document indexed for governed retrieval was the sole
citation returned by every RAG query, with content literally reading "Tenant 0 dummy data." Founder,
2026-07-25: **"This governed RAG doc is redundant, supposed to go."**

**Root cause:** a real, persisted document created via the Documents & Files paste-text form during
earlier pipeline testing. `canRetrieveDocument()` in `governedRag.ts` excluded documents with
`status === "deleted"` from RAG retrieval, but not `status === "archived"` -- so archiving the stale
document via the existing Knowledge Hub UI had no actual effect on retrieval.

**Fix:** commit `0ed228e` (2026-07-26), per `RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md` --
`canRetrieveDocument()` now excludes archived documents from governed retrieval, not only deleted
ones, making the existing Archive button a genuine cleanup path.

**Ledger disposition (2026-08-01):** item #42 -- **"mechanism fixed 07-26; document itself recurred
as #59/#61 below. See stale-RAG-document family disposition above: 100% resolved."**

**Independent re-verification, 2026-08-07:** confirmed the ledger's own text explicitly states full
resolution, cross-referencing the same stale-RAG-document family disposition covering items #59/#61
(A-28-adjacent demo-leakage recurrences). No fresh code read was performed for this item beyond
confirming the ledger's exact wording, since the ledger's own evidence chain (commit `0ed228e` plus
the founder's direct 2026-08-01 review) was already sufficiently precise and dated.

### A-74 -- Password recovery fails via Elastic Mail SMTP

**Original defect:** `/auth/forgot-password` failed immediately with "Unable to start password
recovery" after Supabase Auth's SMTP provider was configured to Elastic Mail. Root-caused via live
Vercel function logs to a genuine SMTP-side failure between Supabase and Elastic Mail (`Error sending
recovery email`).

**Resolution:** not a code fix -- an architecture change. Per this row's own 2026-08-02 entry
(recorded five days before this closure but never synced to the row's top-level status). Supabase
Auth's SMTP provider was switched from Elastic Mail to Resend's SMTP relay (`smtp.resend.com:465`)
directly, with DNS verification work (DKIM, MX, SPF) on `send.triaxisventures.com` following in the
same session.

**Closed 2026-08-07 per explicit founder instruction:** "Elastic mail is not part of AXXESS (Resend
SMTP we are using now); so close." Elastic Mail is no longer part of this program's architecture at
all -- the defect this row describes is specific to a provider that has since been fully replaced,
not merely worked around. Password recovery via Resend's own SMTP path is tracked separately under
A-08/A-65 (both still open, ~50% resolved as of 2026-08-07) if it needs its own item.

### A-75 -- Google Calendar/Drive/Gmail connectors blocked with Error 403: access_denied

**Original defect:** connecting Google Calendar, Drive, or Gmail returned Google's own "Access
blocked... Error 403: access_denied" -- the backing Google Cloud OAuth Client was in "Testing"
publishing status with no Test users configured, capping access to an explicit allowlist.

**Fix (external, Google Cloud Console):** the founder's own account was added to the OAuth Client's
Test users list. Confirmed working for Google Sheets on 2026-08-02 (full round trip, real
`status=connected`).

**Closed 2026-08-07, live-confirmed for Calendar and Drive specifically:** two real screenshots on
`landing.triaxisventures.com/integrations`, a real Super Admin session -- `Google_calendar
connected.` and `Google_drive connected.` toasts. Per `oauth/callback/route.ts`, `status=connected`
is only reachable after a genuine token exchange and database write succeed, not merely reaching the
authorize screen.

**What this does and does not resolve, stated explicitly to avoid overclaiming:** this closes the
founder's own reported instance of the blocker. It does **not** resolve the underlying Google OAuth
Testing-mode 100-user cap -- a real pilot customer outside the Test users allowlist would still hit
the identical `Error 403: access_denied` until either they are individually added, or the OAuth
Client completes Google's actual verification process (not started, not scoped as urgent per the
founder's own 2026-08-02 framing: the Google Cloud project is itself only ~1 week old, and this is
an external provider-review-pace dependency, not an engineering gap). If the pilot-customer-facing
scaling gap needs its own tracked item, it should be opened separately rather than reopening A-75.

### A-79 -- Agentic Actionables pop-up after AI/agent synthesis

**Original requirement (2026-07-30):** after a useful AI/agent output, the app should ask "What do
you want me to do with this, {firstName}?", then show a second action-specific confirmation pop-up
and route to the correct workspace/surface -- a 14-option first-step menu, a second-step
confirmation gate, and role-/tenant-aware routing to the correct destination surface.

**Status before this closure:** matrix showed `No (new founder-scoped requirement, not
implemented)`.

**Actual status:** built and closed 2026-07-30, same day as the requirement was scoped --
`docs/readiness/A79_AGENTIC_ACTION_FOLLOWTHROUGH_CLOSEOUT_2026_07_30.md`. Already reflected in this
session's own rewrite of the root README's "Since Sprint 32" list before this specific matrix row
was found stale.

**Independent re-verification, 2026-08-07:** confirmed `src/services/agentic/actionableGate.ts`,
`agenticDraftHandoff.ts`, `agenticGateToggle.ts`, `AgenticActionablesPrompt.tsx`, and their
respective test files all exist and are git-tracked in the current working tree, not just referenced
in a closeout doc.

## What Changed

- 8 rows in `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` corrected from stale
  Blocked/No statuses to `Yes`, each with the exact evidence and re-verification method cited
  inline in the row itself, not just in this document.
- This closeout document, consolidating the evidence trail in one place.

## What Did Not Change

- No application code changed as a result of this specific closure pass (A-27/A-40's underlying fix,
  commit `89b3874`, and the others cited above, all predate this document -- this document closes a
  documentation gap about already-shipped work, not new work).
- The Bug Closure Ledger and the individual sprint closeout docs cited above are unchanged --
  this document defers to them as the primary evidence source rather than restating or superseding
  them.

## What Was Verified

| Item | Verification method | Result |
|---|---|---|
| A-27/A-40 | Direct code read, `src/auth/serverSession.ts` | Fix present, un-reverted |
| A-33 | Direct code read, `SettingsSection.tsx` | `initialTabFromLocation()` confirmed present |
| A-34 | Direct code read, `DashboardSection.tsx` | "guided setup" text confirmed present |
| A-38 | Direct code search, Settings/Security navigation | No stale routing found |
| A-62 | Ledger cross-reference, `FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` item #42 | Explicit "100% resolved" |
| A-74 | Explicit founder instruction, 2026-08-07 | Elastic Mail confirmed no longer part of architecture |
| A-75 | Two live production screenshots, 2026-08-07 | Real `connected` toasts for Calendar and Drive |
| A-79 | Direct code read, `src/services/agentic/` | All named files exist, git-tracked |

## What Remains Partial or Blocked

- A-75's underlying Testing-mode 100-user scaling cap is explicitly **not** resolved by this
  closure -- see that item's detail above.
- A-38's exact fix commit was not individually identified -- closed on direct absence-of-defect
  code evidence, not a commit citation. Lower confidence than the other items, though the evidence
  itself (no stale routing found anywhere in the relevant code) is real.
- A-08/A-65 (email delivery, the successor concern to A-74's architecture) remain open and are
  explicitly out of scope for this closure -- see `ACTIONABLES_READINESS_MATRIX.md`'s own rows.

## What Claim Is Still Unsupported

None held back silently. A-38's slightly lower evidentiary basis (no commit citation) is stated
plainly above rather than presented with the same confidence as the other 7 items.

## Evidence Chain

External signal (founder's original 2026-07-25 HITL walkthrough reports, each quoted verbatim
above) -> product decisions (fixes shipped 2026-07-26 through 2026-07-31, commits `0ed228e`,
`0883b30`, `8fa39ee`, `89b3874`, and the A-79 build) -> founder re-review and closure
(`FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md`, 2026-08-01 pass) -> **gap discovered**: the actionables
matrix was never synced to that closure pass -> this session's independent re-verification of each
item against actual code or live screenshots (2026-08-07, detailed per-item above) -> matrix
corrected, this document written.

## Files Changed (commits, this closure pass)

- `2e6061e` -- A-27/A-33/A-34/A-38/A-40
- `ddf8c6d` -- A-79
- `69ca8ab` -- A-75
- `8d4f36d` -- A-62
- `cec53af` -- A-74 (bundled with A-08/A-65/A-80/A-23/A-24 founder-disposition updates, not all of
  which are permanent closures -- see that commit and the matrix directly for the full set)
- This document.
