# Closeout -- Ledger-Only Closed Actionables (A-32, A-42--A-54, A-66, A-71--A-73, A-76, A-81)

Date: 2026-08-07
Governance source: `docs/readiness/FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md`
Status: **Permanently closed.** All 19 items below are `Yes` in
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md`. Each already had real, founder-confirmed evidence
in the Bug Closure Ledger -- these were never undocumented in the sense of "no evidence exists,"
but none had a dedicated `*CLOSEOUT*`/`*CLOSURE*`-named file cross-referencing that ledger evidence
into this repo's standard closeout format. This document does that, and nothing more: it performs
no new investigation and re-verifies no claims beyond citing exactly where each already lives.

## Why This Document Exists

A documentation-coverage audit (run 2026-08-07, in response to the founder's request for a full
closed/open actionables inventory) found 19 IDs whose only evidence trail was an entry in the Bug
Closure Ledger -- itself a legitimate, founder-reviewed evidence source per `CLAUDE.md`'s own list
of where this program's evidence already lives -- with no dedicated closeout document. Unlike the 6
items covered in `A84_A90_UNDOCUMENTED_CLOSED_ACTIONABLES_CLOSEOUT_2026_08_07.md` (which had zero
ledger citation either), these 19 are lower-severity, mostly UX/routing/data-integrity fixes from
the Executive Dashboard and RAG remediation sweeps, and their ledger entries are already
appropriately terse for their scope. Consolidating them here is a documentation-hygiene exercise:
matching this program's established pattern (every closed item gets a citable closeout, not just a
row buried in a 68-item numbered list) without inflating 19 small fixes into 19 separate files.

## Per-Item Closure Detail

### A-32 -- "Demo" tab visible in live beta Settings

**Original defect:** a "Demo" tab was visible in Settings on the live beta, not gated to
demo-forced deployments only. **Fix:** gated out 2026-07-29. **Ledger:** item #24, **"Founder: 100%
resolved on both deployments."**

### A-42 through A-54 -- Executive Dashboard sweep (13 items)

**Original defect, founder's own words:** the Tenant Health Command Center section was **"almost
entirely irrelevant/placeholder"** as of the 2026-07-25 walkthrough.

**Fixed as one 2026-07-25 sweep, per-item:**
- **A-42** -- 3 duplicate "Send Feedback" entry points consolidated to 1 real path.
- **A-43** -- "Export Briefing" dead button replaced with a real JSON export.
- **A-44** -- "Start Guided Demo" naming confusion vs. the investor demo, renamed "Start guided
  setup."
- **A-45** -- non-functional "Command search" bar wired to a real client-side filter.
- **A-47** -- "Refresh" button with no `onClick` given a real refetch.
- **A-48** -- a second dead "Send Feedback" mailto (AI Workspace) removed, real modal used instead.
- **A-49** -- "Request pilot conversation" dead mailto kept as an intentional external CTA,
  relabeled for clarity.
- **A-50** -- "Active users" tile mislabeled, corrected to "Team provisioning."
- **A-51** -- "Audit coverage" tile was a proxy value, not a real query -- wired to a real count.
- **A-52** -- Project Health Monitor rows and "View All" were dead links -- wired to real
  navigation.
- **A-53** -- fabricated budget/spend figures in dashboard data removed entirely.
- **A-54** -- two overlapping "getting started" checklists merged into one.

**Explicitly not part of this sweep, tracked separately:** Strategic Objectives, AI Recommendations,
and the Risk Heatmap were **not** fixed in this sweep -- no real backend existed yet for those
specifically. That gap is A-46, closed later the same day by Sprint ED-3 (see the correction note
appended to A-46's own matrix row, 2026-08-07, and `EXECUTIVE_DASHBOARD_ED3_CLOSEOUT_2026_07_25.md`
for the real fix).

**Ledger:** item #34, "Executive Dashboard sweep, 2026-07-25 (A-42 through A-54)," **"Founder: 100%
resolved" for the full A-42--A-54 block.**

### A-66 -- Knowledge Hub upload showed fake success, never persisted

**Original defect:** the Knowledge Hub upload UI reported success immediately, regardless of
whether the document actually persisted server-side.

**Fix:** 2026-07-26, a server-side proxy route replacing the client-side fire-and-forget call,
live HITL-retested the same day.

**Note on documentation:** `KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`
covers this exact incident in full detail, but never uses the literal string "A-66" in its body --
the ID was assigned only in later cross-referencing, after that closeout doc was already written.
That closeout doc is the real, substantive evidence for this fix; this entry exists only to make
the A-66 <-> that-document link explicit and searchable.

**Ledger:** item #46, **"Founder: 100% resolved."**

### A-71 -- Pilot 1 (Imprints) onboarding blocked on false "Organization name required"

**Original defect:** the Imprints pilot organization hit a false "Organization name required"
validation error during onboarding.

**Investigation:** a full field-path trace found no code defect. Working hypothesis (unconfirmed):
a WhatsApp in-app-browser quirk (autofill/viewport behavior specific to that browser shell).

**Resolution:** the founder confirmed this as user-side error, not a product defect -- the same
user onboarded seamlessly on retry, with no code change made.

**Ledger:** item #49, **"Founder: 100% resolved -- RCA not needed, confirmed as user-side error by
the user, who onboarded seamlessly on retry."**

### A-72 -- Google sign-in hit Vercel's Deployment Protection wall

**Original defect:** Google OAuth sign-in landed on a Vercel Deployment Protection interstitial
instead of completing.

**Fix:** the founder reconfigured the Supabase Site URL directly (a configuration fix, not a code
change).

**Ledger:** item #50, **"Founder: 100% resolved."**

### A-73 -- Google sign-in failed "Unable to exchange external code"

**Original defect:** Google OAuth sign-in failed with an external-code-exchange error.

**Fix:** the founder corrected the OAuth Client ID/Secret mapping (a configuration fix, not a code
change).

**Ledger:** item #51, **"Founder: 100% resolved."**

### A-76 -- Email Connector Pilot showed unlabeled demo mailbox messages to a real tenant

**Original defect:** a real tenant's Email Connector Pilot view showed demo-seeded mailbox messages,
unlabeled as such.

**Root cause:** a fallback array of demo messages was not actually gated behind the demo-mode check
it was supposed to be.

**Fix:** 2026-07-29, gated correctly behind demo mode.

**Ledger:** item #54, **"Founder: 100% resolved."**

### A-81 -- A failed OpenAI call's error text could be saved as a real Task

**Original defect:** founder screenshot showed a live OpenAI 429 (rate limit) response, whose
honest fallback error text (`"OpenAI / ChatGPT request failed (429). This response was not
generated by a live model call; treat it as unverified."`, `confidence: 0.3`) was then offered by
A-79's actionable pop-up and, when accepted, saved as a real Task with the literal error message as
its title/description. A screenshot showed several Tasks already marked "Completed" with this exact
garbage content -- it had happened more than once before being caught.

**Root cause:** A-79's actionable gate (`src/services/agentic/actionableGate.ts`) fired on this
low-confidence failure text because its `detectNewContext` signal fires on "first answer this
session" regardless of confidence, with no signal checking whether the text was a real answer at
all.

**Fix, same day:** `evaluateActionableGate` now checks for the exact provider-failure marker text
(present, deliberately, in every fallback branch of both `openAiProvider.ts` and
`openRouterProvider.ts` for exactly this purpose) as a hard stop before any of the 5 signals run --
a placeholder can never open the pop-up under any combination of triggers. The manual "Create
actionable from answer" button is untouched (a deliberate user choice on any answer, not an
automatic suggestion).

**Verified:** 4 new tests, including one confirming a genuine real answer at the same low
confidence a failure would have still shows the prompt -- the fix targets the placeholder marker,
not confidence alone. Full suite green (995/995 -- 2 known CPU-contention-flaky tests, unrelated,
independently reconfirmed passing in isolation). Production build clean.

**Commit:** `4b044fb`. **Deployed:** 2026-08-02 (`readyState: READY`).

**Ledger:** item #67, **"Founder: Resolved / CLOSED."**

**Separately still open, not part of this fix:** why OpenAI was returning 429 in the first place
(real account rate/quota limit vs. the spend-guard's own budget check) was not diagnosed -- named
here so it isn't silently assumed resolved.

## What Changed (this closeout document itself)

- New file: `docs/readiness/LEDGER_ONLY_CLOSED_ACTIONABLES_CLOSEOUT_2026_08_07.md` (this document).
- No code changes. No matrix status changes -- all 19 rows were already correctly `Yes`.

## What Did Not Change

- The underlying fixes -- all 19 were already shipped and founder-confirmed via the Bug Closure
  Ledger before this document existed. This closeout formalizes existing ledger evidence into the
  repo's standard closeout format; it re-verifies nothing beyond citing the exact ledger item
  number for each.

## What Was Verified (in writing this document)

- Confirmed via direct grep of `docs/readiness/*.md` that none of these 19 IDs appeared in any
  `*CLOSEOUT*`/`*CLOSURE*`-named file before this document (A-66's case is the one partial
  exception, noted above -- a closeout doc exists but never used the literal ID string).
- Every ledger item number and quoted founder disposition above was copied verbatim from
  `FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` -- not paraphrased or re-derived.

## What Remains Partial or Blocked

- **A-71:** the underlying WhatsApp in-app-browser hypothesis for the original false-validation
  symptom remains unconfirmed -- closed on the basis of "user-side error, confirmed by successful
  retry," not a proven root cause. If this recurs for a different pilot user, the hypothesis should
  be revisited rather than assumed already explained.
- **A-81:** the original 429's root cause (real rate/quota limit vs. spend-guard interaction) was
  never diagnosed. The Task-creation defect this row tracks is closed; the underlying "why did
  OpenAI 429" question is not.

## What Claim Is Still Unsupported

- None beyond the two items flagged immediately above -- all 19 items' core fixes have a ledger
  citation with an explicit founder disposition, and the higher-severity of the 19 (A-81) additionally
  has a commit hash, deploy ID, and test count.

## Evidence Chain

External signal (founder walkthroughs and screenshots, 2026-07-25 through 2026-08-02) -> logged in
`FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` with an explicit founder disposition for each -> fix
shipped (code change or, for A-72/A-73, a founder-applied configuration correction) -> in most
cases HITL-confirmed the same day -> matrix row marked `Yes`, now cross-referenced to this closeout
document in addition to the ledger.

## Files Changed (original fixes, for reference -- not touched by this closeout)

- A-32: Settings tab-gating logic (demo-mode conditional).
- A-42--A-54: `src/features/dashboard/DashboardSection.tsx` and adjacent Settings/AI-Workspace
  feedback-entry-point files (exact file list not re-derived from the single-day sweep; see the
  ledger's own item #34 for the sweep's scope).
- A-66: the Knowledge Hub upload proxy route -- see
  `KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md` for the exact file list.
- A-71, A-72, A-73: no code changes (A-71 confirmed user-side; A-72/A-73 were Supabase/OAuth
  configuration corrections made directly by the founder).
- A-76: the Email Connector Pilot's demo-message fallback array's gating condition.
- A-81: `src/services/agentic/actionableGate.ts`.
