# Beta Readiness Metrics Refresh -- 2026-08-13

Source-cited recompute of `src/features/beta-readiness/betaReadinessSnapshot.ts`, triggered directly
by the founder while live-reviewing `investor.triaxisventures.com/admin/beta-readiness`:

> "All data in this page needs revision immediately (critical) -- Bring all data upto speed"
> "Lot of this data is outdated. 2nd pilot testimonial needs adding"
> "Refer to Git, all data available"

This document is the propagation source the founder-defined workflow (embedded as a header comment
in `betaReadinessSnapshot.ts`) requires: (1) product owner asks for stats, (2) Claude Code provides,
(3) founder (HITL) clears in conversation, (4) CLI propagates into the live page. Step 3 for this
pass is the founder's own directive above, given live and in-session, not a separate later
sign-off round -- consistent with how the 2026-08-04 baseline itself was cleared.

## What changed and why

### Engineering metrics

| Metric | Old (2026-08-04) | New (2026-08-13) | Source |
|---|---|---|---|
| LOC (app source, excl. tests) | 56,380 | 53,150 | `git ls-files -- src migrations shared apps/mobile-capacitor apps/mobile apps/mobile-lite-capacitor`, filtered to `.ts/.tsx/.js/.jsx/.sql`, excl. `*.test.*`, summed via `xargs cat \| wc -l` |
| LOC (incl. tests) | 74,484 | 73,677 | same file set, tests included |
| Commits | 550 | 834 | `git rev-list --count origin/main` |
| Tests | 1,136 (231 files, 1,132 passing) | unchanged, not re-run this pass | carried from 2026-08-04 pull; re-verification requires a full `vitest run`, out of scope for this data-only refresh -- tagged in the card detail as not re-run |
| Vercel Experience Score | ~89.5% | unchanged, not re-verified | requires live Vercel console access not available to this recompute; tagged in the card detail as not re-verified this pass rather than silently re-asserted |

Small LOC decrease (both figures) is consistent with the Codebase De-Bloat Sprints (PR #223, #225)
that ran between the two measurements -- not a discrepancy.

### Traction metrics

**Tenants provisioned** (was "4", "2 active pilots, 3 upcoming" -- internally inconsistent, 2+3=5≠4):
corrected to **2** (Imprints Production, Ekora Hive), both confirmed onboarded and live per
`docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entries #2-3. Four more
organizations (3 Mahanta-group firms, Elevate Group FZE) have LOIs/expressions of interest on file
but are not yet provisioned -- named explicitly rather than folded into a vague "upcoming" count.

**Signed LOIs**: value unchanged at 5 (Imprints, Ekora, 3x Mahanta-group firms, one shared letter),
but the detail line now explicitly separates the 5 LOI documents from Sakura's signed referral
engagement letter (a different document category) and Elevate Group FZE's 2026-08-12 expression of
interest (weaker than a signed LOI) -- previously blended ambiguously as "3 upcoming, 1 referral
agreement."

**"Beta visits (est.)" / "Beta users (est.)"** (was "1,000+" / "200+", founder-stated estimates
"since 2026-07-05 launch"): replaced with two real, PostHog-sourced traffic metrics, since real data
now exists where only an estimate did before:
- **Landing (live beta) traffic**: 41 visitors / 106 sessions / 551 page views. Source: live PostHog
  pull against `https://us.posthog.com/project/498426/web`, filtered to
  `https://landing.triaxisventures.com`, window 2026-07-27 to 2026-08-13 (~17 days), "Filter test
  accounts" ON. Recorded in `docs/readiness/POSTHOG_DATA_ANALYTICS_INSIGHTS_LOG_2026_08_09.md` §1.8.
- **Investor demo traffic**: 102 visitors. Source: founder-shared PostHog screenshots, filtered to
  `https://investor.triaxisventures.com`, pulled 2026-08-09/10, window 2026-08-08 to pull time.
  Recorded in the same log, §2.2b. This is Founders Club waitlist paid-social traffic (94% Paid
  Social, 97% mobile) -- a different KPI (public interest/waitlist funnel reach) from `landing`'s
  live-product usage, not folded into a single blended number.

**Note on window comparability**: neither PostHog window covers the full period since the
2026-07-05 beta launch (`landing`'s pull starts 2026-07-27; `investor`'s starts 2026-08-08) -- these
are real, current, partial-window figures, not a beta-lifetime total. They are presented as such
rather than extrapolated to look continuous with the old "since launch" framing.

NPS (fresh/earlier batch), PMF, and Pilot intent are unchanged -- no new survey evidence arrived
this session to update them.

### Multi-tenancy (Product Readiness kanban)

Was "5 tenants provisioned in the source snapshot" -- inconsistent with every other tenant count on
this page and never independently sourced. Corrected to **3 real tenant accounts total** (founder +
Imprints Production + Ekora Hive), citing the same finding already recorded in
`POSTHOG_DATA_ANALYTICS_INSIGHTS_LOG_2026_08_09.md` §1.6 round 2: "Supabase has exactly 3 real
accounts total (founder + 2 Assam pilot orgs)" -- a directly-quoted, already-verified figure from
this repo's own prior session work, not a new claim.

### Market Readiness kanban

- **Signed LOIs** stage: description expanded to name all five LOI'd organizations plus Sakura and
  Elevate explicitly (previously "5 signed, 3 upcoming").
- **Active pilots** stage: corrected from "2 active, of 4 tenants provisioned" (the same internally
  inconsistent "4" figure) to "2 active pilots (Imprints Production, Ekora Hive), both provisioned
  and live."
- **Paying interest** stage: was "4 oral paying-interest indications -- not yet a closed payment,"
  an unsourced round number. Replaced with the actual Aggregate Advance-Commitment Pipeline recorded
  in the LOIS log (added there 2026-08-13, same day): 2 confirmed advance-payment commitments ($50
  each -- Imprints written 2026-08-12, Ekora oral) plus 4 more oral commitments (3 Mahanta-group
  firms, Elevate Group FZE), aggregate $220-300, all uncollected pending Triaxis's own IDFC First
  Bank current-account setup. Source: `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`,
  "Aggregate Advance-Commitment Pipeline" section, founder-stated 2026-08-13.

### Mobile Readiness kanban

**D-U-N-S application**: was "Applied 2026-07-13, ~30-day TAT, expected ~2026-08-12." Revised to
"expected by 2026-08-25 (revised from an initial ~30-day/2026-08-12 estimate)" per the founder's own
later update (session memory `project_duns_mobile_release_blocker`).

### Pilot Testimonials

Added a second testimonial (Ekora Hive, Diksha Rajkhowa) per the founder's explicit request. Quotes
are verbatim excerpts from the pilot's 2026-08-08 feedback email, already recorded in full in
`LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entry #3. Per the founder's
direct instruction ("The highlighted part below testimonial need not be written"), the provenance
footnote previously shown under each testimonial's attribution was removed from the UI for both
testimonials -- the underlying citation still lives in this document and the LOIS log, just not
rendered on the live page.

### Removed: "Recent Audit Logs" panel

Removed from `BetaReadinessSection.tsx` per the founder's direct instruction ("This part is
redundant"), along with its now-unused `auditLogsRepository.list()` fetch and `AuditLog` plumbing.

## What was not changed this pass, and why

- **Tests (1,136)** and **Vercel Experience Score (~89.5%)** are carried forward from the 2026-08-04
  pull, not re-verified -- re-running the full suite and re-pulling the live Vercel dashboard were
  out of scope for this data-refresh pass (a full `vitest run` was performed separately, in the same
  session, as part of this batch's own verification -- see the accompanying closeout for that
  result -- but its count was not fed back into this snapshot to keep this document's scope to the
  founder's specific "bring the page's data up to speed" request).
- **Outreach metrics** (Calls, Live demos given, Integration surface) are unchanged -- no new
  evidence arrived this session to update them; left as the existing founder-stated figures rather
  than guessed at.
- **Engineering/product sprints ("70+")** is unchanged -- founder-stated, no new count given this
  session.

## Sources cited in full

- `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` (read in full this
  session for the Summary Table, entries #1-7, and the Aggregate Advance-Commitment Pipeline note)
- `docs/readiness/POSTHOG_DATA_ANALYTICS_INSIGHTS_LOG_2026_08_09.md` §1.6, §1.8, §2.2b
- `git rev-list --count origin/main` (834)
- `git ls-files` + `wc -l` scoped LOC recompute (commands above)
- `package.json` `"version"` field (0.6.0-beta, unchanged)
- Founder session memory: `project_duns_mobile_release_blocker` (DUNS date revision)
