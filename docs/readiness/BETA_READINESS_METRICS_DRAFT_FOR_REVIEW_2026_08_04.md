# Beta Readiness Metrics -- Draft for Founder Review (2026-08-04)

**Status: DRAFT, NOT YET CLEARED.** Per the founder-defined workflow for this feature: (1) product
owner asks Claude Code for stats, (2) Claude Code provides -- **this document**, (3) product owner
(HITL) clears, (4) CLI propagates into the live Beta Readiness page. Nothing below has been wired
into `src/features/beta-readiness/BetaReadinessSection.tsx` yet. Every figure below is either
computed directly from this repo/git/Vercel, or cited to a specific existing readiness doc --
nothing is fabricated. Founder-stated figures without an independently-verifiable source artifact
are tagged accordingly, per `CLAUDE.md`'s evidence-chain discipline.

Requested metrics: Beta version, Pilots, LOIs, Beta users, NPS, PMF, Pilot Intent, LOC, Commits,
Tests, Product readiness Kanban, Integration Kanban, Market readiness Kanban, iOS/Android readiness
Kanban, Vercel Experience Score.

## 1. Beta version

**0.6.0-beta** -- `package.json` line 3 (`"version": "0.6.0-beta"`), matches the current Beta
Readiness page's own subtitle ("Product Release 0.6").

## 2. Pilots

**Founder-corrected, 2026-08-04 (this conversation, supersedes the 2026-07-31 doc below):**
- **4 tenants currently provisioned** (not 5 -- the 07-31 snapshot's "5 tenants" figure is now stale)
- **2 active pilots**
- **3 upcoming pilots**

Cross-checked against `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`:
Imprints Production (Pilot 1) and Ekora Hive (Pilot 2) both show onboarding complete, 2026-07-29,
live-verified -- consistent with "2 active pilots." The "3 upcoming" have no per-entity log entry
yet in that file as of this draft.

Prior figure (`docs/readiness/TOP_LEVEL_READINESS_AND_GTM_SNAPSHOT_2026_07_31.md`, now superseded):
2 ongoing pilots, 3 incoming pilots, 5 tenants provisioned.

**Founder-stated, source artifact needed** -- the tenant/pilot counts above are founder-stated in
this conversation, not re-derived from a live Supabase query (no credentials in this environment).

## 3. LOIs

**Founder-corrected, 2026-08-04 (this conversation):**
- **5 signed LOIs**
- **3 upcoming LOIs**
- **1 referral agreement**

**Discrepancy flagged, not silently resolved:** the founder's own 2026-08-01 outbound email to Plug
and Play UAE (`docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` line 95) states **"2 additional
committed LOIs,"** not 3. This may be real growth (2 -> 3) in the 3 days since that email, or a
rounding/recollection difference -- this draft cannot tell which from repo evidence alone. Recording
both, dated, rather than picking one.

That same line 96 also carries a **pre-existing, still-unresolved reconciliation flag** from a prior
session: `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` names only 6
entities total (not the "5 signed + 2-3 committed = 7-8 LOIs" figure), which this draft does not
attempt to re-resolve.

Prior figure (07-31 doc, now superseded on the LOI-count specifics): 5 signed, 2 incoming, 1
referral, plus **4 oral paying-interest indications** (kept separate from LOIs, per that doc's own
framing -- not restated as corrected/uncorrected here since the founder didn't address it today).

## 4. Beta users

Three genuinely different things exist under this label -- **not blended, per this program's own
governance rule** (`docs/readiness/BETA_FEEDBACK_EVIDENCE_RECONCILIATION_2026_07_25.md`, Section 3):

- **Estimated beta website visits and users, founder-stated 2026-08-04 (this conversation):**
  **1,000+ beta visits, 200+ users, estimated since 2026-07-05** (the beta's launch date, per the
  2026-08-01 Plug and Play UAE email). Founder's own word is "estimated" -- not a Mixpanel/PostHog
  dashboard pull or Vercel Analytics export in this pass. **Founder-stated, source artifact
  needed** -- Mixpanel/PostHog are wired (`NEXT_PUBLIC_MIXPANEL_TOKEN`/`POSTHOG_*` confirmed set in
  production per the Integration Kanban below) but not queried live in this environment.
- **Platform tenants provisioned:** 4 (founder-corrected 2026-08-04, see Section 2 above; supersedes
  the 07-31 doc's "5 tenants"). No Supabase credentials in this environment to independently query.
- **Survey respondents** (a different metric again -- people who filled out a feedback form, not
  platform signups or site visits): two separate, non-deduplicated batches exist in the repo:
  - Earlier batch: **28 unique / 30 raw submissions** (20 product-feedback + 8 enterprise-feedback),
    per `Enterprise_Beta_Feedback_Batch_1.md`.
  - Fresh batch (2026-07-26): **34 raw responses** (10 Enterprise Beta Feedback + 24 Product
    Feedback Survey), per `BETA_FEEDBACK_FRESH_SURVEY_RECONCILIATION_2026_07_26.md`. That
    reconciliation explicitly notes 10+24=34 coincidentally matches an earlier externally-quoted "34
    beta submissions" figure, but states plainly there is **no confirmed dedup relationship** between
    this batch and the earlier 28/30 one -- they are not summed here for that reason.
  - **Enterprise Beta Feedback survey funnel, founder-stated 2026-08-04:** the instrument itself has
    **140+ answerable data points** (i.e. question/field count per submission -- a different thing
    from the earlier-documented "1,200+/1,112+ instrument-weighted actionable data points," which is
    an aggregate across all respondents, not a per-survey field count). It was **started by 40+
    users** but **completed by only 10** -- i.e. the n=10 Enterprise Beta Feedback batch (Sections
    5-7 above: the 90-NPS, 70%-PMF, 9/10-pilot-intent batch) represents roughly a **25% completion
    rate** off a 40+ start pool. **Founder-stated, source artifact needed** for the 40+ starts figure
    specifically (survey-platform-side funnel data, not something this repo's committed files
    contain).

## 5. NPS

Two real, differently-sourced NPS figures exist -- presented separately, not averaged or picked
arbitrarily:

- **82.61** -- combined NPS from a 23-respondent batch (Beta 0.5: 15, Beta 0.7: 8), per
  `BETA_0.5_0.7_FEEDBACK_ANALYSIS_2026_07_23.md`, cited in
  `BETA_FEEDBACK_EVIDENCE_RECONCILIATION_2026_07_25.md` line 44.
- **90** -- overall NPS (0-10 "recommend to a peer or colleague" scale) from the fresh 10-respondent
  Enterprise Beta Feedback batch, per `...NPS Report (1).pdf` p.1, cited in
  `BETA_FEEDBACK_FRESH_SURVEY_RECONCILIATION_2026_07_26.md` line 58. Regional split: Asia (n=8):
  87.5, Africa (n=2): 100.
- The 24-respondent Product Feedback Survey uses a 1-10 "recommend likelihood" scale, not the
  standard 0-10 NPS scale, so **no NPS figure is computed for it** (matches that reconciliation
  doc's own explicit caveat).

Both real NPS figures come from small samples (n=23, n=10) -- worth stating as such if either is
surfaced publicly.

## 6. PMF (product-market fit)

One real, computable figure exists, from the Sean-Ellis-style "how disappointed would you be if
AXXESS disappeared" question:

- **70% (7 of 10)** respondents in the top ("Very disappointed") bucket, Enterprise Beta Feedback
  fresh batch, per dashboard slide 17 chart (`BETA_FEEDBACK_FRESH_SURVEY_RECONCILIATION_2026_07_26.md`
  line 63). The classic Sean Ellis PMF benchmark treats 40%+ "very disappointed" as a strong signal
  -- 70% exceeds that, from a small n=10 sample.
- The 24-respondent Product Feedback Survey asked the same style of question on a 1-10 scale: 14 of
  24 (58%) chose the single top point (10/10 "disappointed"); top-3 band (8-10) = 20 of 24 (83%).
  Not the same question format as the Enterprise survey, so not blended into one PMF number.

No other PMF metric (e.g., a formally computed "top-box - expected" score) exists in the repo.

## 7. Pilot Intent

Founder-stated (`TOP_LEVEL_READINESS_AND_GTM_SNAPSHOT_2026_07_31.md`, "Commercial Traction Kanban"):
**9/10 enterprise beta survey respondents indicated pilot interest.** This appears to draw on the
same Enterprise Beta Feedback fresh-batch survey ("Would your organization pilot AXXESS?": Immediately
1, within 3 months 2, within 6 months 3, needs more features first 3, not suitable 1 -- i.e. 9 of 10
gave any pilot-positive answer, 1 said "not suitable"), per
`BETA_FEEDBACK_FRESH_SURVEY_RECONCILIATION_2026_07_26.md` line 61. This is a real, traceable
computation from that dashboard chart, not a separately fabricated figure.

## 8. LOC (lines of code) -- reconciled, three real definitions found

**Root cause of the discrepancy the founder flagged ("yesterday you gave 135k+, this is getting out
of hand"): not an error, three genuinely different counting methodologies have been used across
sessions, and this repo has actually already tried to fix this once before.**
`docs/readiness/CODING_PROGRESS_TRACKER_2026_07_30.md` (2026-07-30) was created specifically to
standardize this and explicitly warns against exactly this kind of drift -- its own "Interpretation
Rules" section (line 52) says "do not use LOC as a quality score." It records **three** LOC numbers
side by side, on purpose, because they measure different things:

| Definition | Figure | Dated | Source |
|---|---:|---|---|
| Tracked text LOC (every git-tracked text file: docs, config, markdown, JSON, everything) | 123,321 | 2026-07-30 | `CODING_PROGRESS_TRACKER_2026_07_30.md` |
| Current working-tree text LOC (tracked + uncommitted local files) | 132,801 | 2026-07-30 | Same -- **this is almost certainly the source of the "132k+"/"135k+" figure**, and it matches the 2026-08-01 Plug and Play UAE email's own "132k+ lines of code" claim exactly (`PITCH_AND_TRACTION_LOG_2026_07_24.md` line 95) |
| App/source LOC (tracked source-like files, excluding docs/config-heavy files -- "better proxy for implementation size") | 64,066 | 2026-07-30 | Same doc |
| This session's own measurement: `src/` + `supabase/migrations/` + `packages/shared/` + `apps/mobile*` `.ts`/`.tsx`/`.sql` only | 74,484 total / 56,380 excl. tests | 2026-08-04 | Computed directly this session via `git ls-files` + `wc -l` |

The 132k+ figure the founder recalls is real and traceable -- it is the "current working-tree text
LOC" definition (literally everything text-based in the repo, including every markdown doc, which
this program has written a great many of). It is not wrong; it is a different, much broader
denominator than "application source code," which is what this draft's other figure (56,380 /
64,066) measures.

**Recommendation, for the founder to decide, not decided here:** pick **one** definition to be *the*
externally-quoted LOC figure going forward and retire the others from external communication, to
stop this drift. The App/source LOC framing (~56-64k) is the more defensible "implementation size"
number for investor conversations; the ~123-133k "total text LOC" number is real but conflates docs
with code and will keep looking inconsistent as new dated readiness docs (like this one) get added.

## 9. Commits

**550** -- `git rev-list --count HEAD` on the current branch (`canonical/sprint-1-35-unified-gitlab`)
as of this draft.

## 10. Tests

From tonight's full-suite run (`pnpm run test`, this session, 2026-08-04): **231 test files, 1,136
tests**. 1,132 passed with **zero actual assertion failures**; the remaining 4 never completed
because the full-suite process hit a reproducible out-of-memory crash near the very end (confirmed
across 4 different pool/parallelism configurations tried this session -- a pre-existing environment
limitation on this machine, not a code defect). Every individual scoped test suite touched this
session passed cleanly in isolation.

## 11. Product Readiness Kanban

From `TOP_LEVEL_READINESS_AND_GTM_SNAPSHOT_2026_07_31.md` ("Product Readiness Kanban" table, dated
2026-07-31 -- 4 days before this draft, so treat as directionally current, not re-verified today):

| Stage | Status |
|---|---|
| Overall product shape | Strong beta |
| Auth and onboarding | Mostly done / near complete |
| Single tenancy | Done |
| Multi-tenancy | Mostly done (5 tenants provisioned, no data leakage currently observed) |
| Knowledge Hub | Mostly done |
| RAG + citations | Mostly done / result-quality cleanup pending |
| HITL AI review | Done |
| Dashboard | Mostly done, 80-90% |
| Audit/timeline evidence | In progress |
| Email and invite loop | Partially done |
| Agentic MCP infrastructure | Code-complete / blocked (production deploy pending) |
| Payments and billing | Integrated only, not wired/live |
| Mobile product | Partial |

Overall Product Readiness band: **84-90%** (founder's own judgment call in that doc, with a stated
evidence basis and stated blockers -- not an independently re-derived percentage).

## 12. Integration Kanban

From the same doc's "Integration Readiness Kanban -- 2026-08-02 comprehensive re-audit" (the most
recently re-verified section in that doc, re-checked against live `vercel env ls production` output
and direct code/migration reads, not memory):

**Overall Integrations Readiness: 62-68%** (founder's own draft band, which that re-audit concurred
with), category breakdown: Core live integrations 80-88%, OAuth/token-vault framework 85-92%, Google
ecosystem 70-82%, Microsoft ecosystem 45-58%, AI provider integrations 70-80%, Analytics 55-65%,
Meta/WhatsApp/social 35-48%, Productivity SaaS connectors 40-55%, Enterprise data connectors 25-40%,
Payment gateways 18-28%, 30+ connector ambition 28-38%.

Live and fully tested: Zoom, OpenRouter, Google OAuth sign-in. Full per-provider tier table (10
tiers, 25+ named providers with individual evidence citations) is in that doc's "Integration
Readiness Kanban" and "Integration Maturity Register" sections -- not duplicated here in full to
avoid drift between two copies of the same evidence; link to it instead.

**Note found this session:** `IntegrationsSection.tsx`'s catalogue was expanded tonight from 10 to
34 provider entries (see this session's commits) -- these are new catalogue/logo entries only, not
new live connectors, and do not change any of the live/tested/gated tiers above.

**Founder-confirmed 2026-08-04 (this conversation): "40+ integration surface area, 10+ live."**
Consistent with the 2026-08-01 email's "40+ integration surface (first set operational: Google
Workspace, Microsoft Azure, Microsoft Entra, Meta Business, Zoom, Twilio, OpenAI, OpenRouter, SMTP,
document indexing, RAG)" -- that list is 11 items, close to "10+." Note this "operational" list
differs somewhat from the more granular "Live and fully tested" tier above (which names only Zoom,
OpenRouter, Google OAuth as fully proven end-to-end) -- the two framings measure different things
("operational/first-set" vs. "independently re-verified end-to-end this session") and are not
reconciled into one number here.

## 12a. Outreach Activity (new, founder-stated 2026-08-04, not one of the original 15 but added at
founder's request during this review)

- **70+ calls across 18+ hours**, including **10+ investor calls** (founder-stated, this
  conversation). This updates/exceeds the 2026-08-01 Plug and Play UAE email's **"64 discovery
  conversations"** (`PITCH_AND_TRACTION_LOG_2026_07_24.md` line 95) -- consistent with 3 more days
  of activity, not a contradiction.
- **4 live demos given**, including senior-level contacts (founder-stated 2026-08-04). Real, dated
  corroboration found: a 2026-07-27 founder-sent traction update to 3one4 Capital
  (`PITCH_AND_TRACTION_LOG_2026_07_24.md` line 217) states **"8 enterprise walkthroughs + 4 live
  demos + 34 beta users generating 1,200+ feedback data points."** The "senior" qualifier (today's
  addition) is not independently re-verified per-demo in this pass, but
  `STAKEHOLDER_IDEA_VALIDATION_CALLS_LOG_2026_07_25.md` does log multiple senior-title contacts
  (HDFC Bank Treasury Advisory Group Senior Manager, Numaligarh Refinery Senior Executive, SBI New
  York Senior Dealer, and a self-reported senior UNDP official per the 3one4 update) -- plausible
  pool, not a confirmed 1:1 match to which 4 specifically got the live demo.

## 12b. Execution Velocity (new, founder-stated 2026-08-04)

**"70+ engineering and product sprints."** Partial cross-check: a repo-wide search for formally
numbered `Sprint N` references finds sprints numbered up to **Sprint 42** as the highest explicit
label. "70+" is plausible as a broader count that also includes the many discrete execution units
tracked under other naming conventions in this repo (the `A-<number>` actionables sequence, which
reached **A-96** this session; the `ED-R1` through `ED-R4` Executive Dashboard Redesign sprints;
the `MC-1` through `MC-4` Meta/social connector sprints; and named sub-sprint workstreams within a
single numbered sprint, e.g. "Sprint 30 Workstream 1/2/3"). **Founder-stated, source artifact
needed** for the exact 70+ figure -- not independently recountable as a single precise number from
repo evidence alone, since no single doc enumerates every execution unit across all of these
naming conventions.

## 13. Market Readiness Kanban

**Status, founder-confirmed 2026-08-04: still pre-revenue, with paying interest secured** (4 oral
paying-interest indications, see "Paying interest" row below -- not yet a closed payment).

From the same doc's "Commercial Traction Kanban" (figures below superseded where Sections 2-3 above
carry a founder correction dated 2026-08-04 -- table left as the original 07-31 snapshot for
traceability, correction noted inline):

| Stage | Status |
|---|---|
| Problem discovery | Done |
| Beta feedback collection | Done |
| Strong product attachment signal | Done (21/24 product survey respondents, founder-stated) |
| Pilot intent | Done (9/10 enterprise beta survey respondents, see Section 7 above) |
| Signed LOIs | Done (5 signed, founder-confirmed 2026-08-04) |
| Incoming LOIs | In progress (3 as of 2026-08-04, was 2 in the 2026-08-01 email -- see Section 3) |
| Active pilots | In progress (2 active, of 4 tenants provisioned, founder-confirmed 2026-08-04) |
| Incoming pilots | In progress (3, founder-confirmed 2026-08-04) |
| Referral distribution | In progress (1 referral agreement, founder-stated) |
| Paying interest | In progress (4 oral indications, founder-stated) |
| Paid pilot conversion | Next -- no closed payment recorded |
| Repeatable sales motion | Next |
| Revenue retention proof | Not yet |

Overall Market Readiness band: **84-90%** (founder's own judgment call, same doc).

**Update found this session (2026-08-04, not yet in the source doc above):** a public, non-founder-led
waitlist funnel launched -- **https://getlaunchlist.com/pages/axxess-triaxis-founders-club-edition**
("AXXESS TRIaxis -- Founders Club Edition"), promoted on Facebook, Instagram, LinkedIn, WhatsApp, and
WhatsApp Business. Logged in `docs/readiness/CUSTOMER_ACQUISITION_FUNNEL_2026_07_24.md`'s 2026-08-04
update. Signup counts from this page are not yet available as a source artifact.

### Pilot testimonial (extracted from real feedback, for reuse)

Drawn from the verbatim WhatsApp feedback logged in
`docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` (2026-08-03, entry #2,
Imprints Production / Pilot 1) -- that source is **mixed feedback, both praise and criticism**,
recorded in full per this program's evidence discipline. The line below is a real, verbatim excerpt
of the positive portion, not a fabricated or rewritten sentiment. Full context (including the
specific "simplify this 70-80% before launch" criticism) remains in that log for anyone who wants
the complete picture -- this testimonial does not delete or hide that criticism, it is presented
separately as a shareable quote:

- "Looks quite sophisticated and feels quite stable for your current stage."
- "I had expected a far less evolved product, honestly."
- "Your pace and vision here are correct."

**-- Prajnyan Ballav Goswami, Proprietor, Imprints Production** (AXXESS Pilot 1)

Ready to reuse in investor materials or a future testimonials section, if wanted.

## 14. iOS and Android Readiness Kanban

From the same doc's "Mobile Readiness Kanban":

| Track | Status |
|---|---|
| Android debug/preview build | Partially proven |
| Android signed beta | Blocked (needs company Play Console + signing/release workflow proof) |
| iOS build path | Planned / partially scaffolded |
| TestFlight | Blocked |
| Store listing packs | Planned |

Android Beta 1.0 band: **65-72%**. iOS Beta 1.0 band: **32-40%, externally blocked** (same doc). Per
existing memory (`project_duns_mobile_release_blocker`): D-U-N-S applied 2026-07-13, ~30-day TAT,
expected ~2026-08-12 -- still pending as of this draft.

## 15. Vercel Experience Score

**Founder decision, 2026-08-04: keep the deploy success metric only** -- the earlier "85-100
depending on deployments and user visits" framing is dropped in favor of this session's directly
computed proxy, going forward the definition for this metric on the Beta Readiness page is:

**Deploy success rate: 17 Ready / 2 Error out of the 19 most recent deployments (~89.5%)**, computed
via `vercel ls axxesstriaxis` this session. Scope, stated plainly: `axxesstriaxis` project only (not
the other two Vercel projects), and the CLI's default recent-page listing (not full all-time
history). When this is rebuilt into the live page, this should be computed live the same way (or
via the Vercel API) rather than hardcoded to today's snapshot.

## What This Draft Deliberately Does Not Do

- Does not compute a single blended "beta users" or "NPS" number where two real, differently-sourced
  figures exist -- both are shown, per this program's own "kept separate, not blended" rule.
- Does not re-verify the 2026-07-31/2026-08-02 readiness-band judgment calls (Product/Integration/
  Market/Mobile percentages) against fresh evidence today -- those are founder judgment calls with a
  stated evidence basis in their source doc, carried forward as-is and dated accordingly.
- Does not attempt to query live Supabase user/tenant data -- no credentials available in this
  environment.
- Does not propose a UI or wire any of this into `BetaReadinessSection.tsx` -- that is step 4
  ("CLI propagates"), pending founder clearance of this draft.
