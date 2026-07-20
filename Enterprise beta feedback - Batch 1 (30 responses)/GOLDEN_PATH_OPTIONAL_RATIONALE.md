# Why the Golden Path Became Opt-In

**Decision:** the enterprise golden path — the 8-step guided journey shown on Dashboard and AI
Workspace — was changed from always-on/forced to opt-in, defaulting to a collapsed on-demand
summary, with the full guided view still available to any user who wants it.
**Shipped:** 2026-07-20, actionable A1 (`PRE_DEMO_ACTIONABLES.md`), Sprint 1 of
`SPRINT_ROADMAP_PRE_DEMO.md`. Full technical detail in `ITERATION_PROGRESS.md`.
**Purpose of this note:** answer, with exact numbers, why this specific change was made, and why
it should be read as an upgrade rather than a retreat.

## 1. The exact beta feedback stats behind this decision

From `Enterprise_Beta_Feedback_Batch_1.md` (Batch 1, n=20 unique product-feedback respondents
after deduplication):

| Signal | Count | Share | Section |
|---|---:|---:|---|
| "Too many steps or approvals" selected as a top-3 issue | 7 of 20 | 35% | 7.3 |
| "Difficult onboarding or setup" selected as a top-3 issue | 4 of 20 | 20% | 7.3 |
| "Unclear product value or use cases" selected as a top-3 issue | 6 of 20 | 30% | 7.3 |
| Non-promoters (2 passives + 1 detractor) who selected **both** "slow or unreliable performance"
  **and** "unclear product value or use cases" | 3 of 3 (100% of non-promoters) | — | 7.4 |
| Qualitative theme: "Usability — more user-friendly; reduce friction" | flagged as an actionable
  free-text theme | — | 7.6, with product implication "Shorten path to first successful workflow" |

The report's own 30/60/90-day plan (section 11) lists, as a Days 0-30 product action: *"Replace
capability-first onboarding with role- and outcome-first onboarding... Reduce the number of
required setup decisions before first value."* The golden path in its original form was capability-
first (a fixed 8-step sequence covering every module regardless of role or relevance) and did not
reduce required setup decisions — it enumerated all of them, sequentially, with no way to skip
ahead or dismiss steps that didn't apply to the current user.

## 2. What the code actually did, and why it's a plausible mechanism behind those numbers

This is an important distinction: **the survey did not ask about "the golden path" by name.** The
numbers above are general usability/friction signals, not a direct measurement of this specific
UI component. What follows is the engineering-side finding that connects the two, and it should be
read as *a plausible contributing mechanism*, not as a literally-measured fact.

Auditing `src/services/workflows/enterpriseGoldenPath.ts` and
`src/components/enterprise/EnterpriseWorkflowJourney.tsx` as they existed before this change found:

- The journey rendered **unconditionally** on every visit to Dashboard and AI Workspace, for every
  role, with no dismiss control and no persisted preference.
- Steps a user's role could not act on (`lockedForRole`) or that were blocked by an unmet
  prerequisite (`status === "blocked"`) displayed only a bare "Blocked" or "Read only" badge —
  **no explanation of why**, and no indication of what would unblock it.
- The journey always showed all 8 steps regardless of role, even though roles like Employee are
  explicitly barred from acting on 3 of the 8 (team provisioning, human review, audit evidence per
  `actionRoles` in the same file).

A fixed, unexplained, unskippable 8-step checklist — some steps visibly locked or blocked with no
stated reason — is a structurally plausible source of exactly the two most-cited frictions: "too
many steps" (35%) and "difficult onboarding/setup" (20%), and is consistent with the qualitative
"reduce friction" theme. It does not, by itself, explain "unclear value" (30%) or "slow/unreliable
performance" (which are addressed separately by other Sprint 1/2 items — see
`SPRINT_ROADMAP_PRE_DEMO.md`).

## 3. Why this is a feature upgrade, not a rollback

"Rollback" would mean removing a capability. Nothing was removed:

- **The guided journey still exists in full**, unchanged in content — every step, status, and
  action is identical to before. A user can still get the complete guided experience; they now
  choose to, via a single click ("View recommended setup path"), instead of it being forced.
- **Two new capabilities were added that didn't exist before:**
  1. A persisted per-user preference (`useGoldenPathDisplayMode.ts`) — the choice sticks across
     sessions, which the old design had no concept of at all.
  2. Inline explanations for every blocked/locked step (`blockedReason`, "Requires {role}") — the
     old design had zero explanatory text for these states.
- **The change is strictly additive in capability terms:** old design = 1 mode (forced, unexplained
  blocks). New design = 2 modes (on-demand summary, or full guided) + explanatory text in both. No
  functionality present before is now missing.
- **This matches how the report itself frames "high-discretion" users:** several respondent
  archetypes in section 8.7 (e.g., E-02 "Senior education professional", E-03 "Experienced
  government-adjacent stakeholder") describe experienced professionals evaluating the platform —
  the kind of user a forced, capability-first checklist is most likely to frustrate, and the kind
  of user this change explicitly preserves full control for (they can still choose "guided" and
  make it their permanent default).

In short: the fix removes a UX *tax* (forced sequencing with unexplained gates), not a
*capability*. The golden path's actual value — a clear recommended path to first value — is fully
intact for anyone who wants it.

## 4. What this does not prove

Consistent with this report's own evidentiary discipline (`Enterprise_Beta_Feedback_Batch_1.md`
section 16.2, "Unsupported claims"): this change has not yet been validated against real usage
data. There is no A/B result showing that making the golden path optional improves onboarding
completion, time-to-first-value, or NPS — those metrics are not yet instrumented for this specific
change (A11, wiring analytics events, is a separate, not-yet-shipped Sprint 2 item). This is a
hypothesis-driven fix addressing a well-evidenced friction pattern, not a proven-by-data
improvement. Batch 2 research (section 19 of the original report) should test whether reported
friction actually decreases.
