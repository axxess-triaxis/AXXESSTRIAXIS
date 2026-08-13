# PostHog Data, Analytics & Insights Log

**Created:** 2026-08-09. **Scope:** every PostHog figure shared or pulled during this session, tabulated and analyzed. **Source discipline:** per `CLAUDE.md`'s evidence chain rule, every figure below is either (a) read directly from a founder-shared screenshot of PostHog's authenticated UI, (b) pulled live by this session against PostHog's public shared dashboard, or (c) a founder-stated claim not independently verifiable from PostHog itself -- each is labeled accordingly. This document does not re-derive conclusions; it consolidates and cross-references the analysis already recorded, row by row, in `ACTIONABLES_READINESS_MATRIX.md` (A-105, A-106, A-107, A-108), which remains the primary source of record. Where this log's summary and the matrix differ in emphasis, the matrix wins.

**Two domains, kept fully separate per explicit founder instruction (2026-08-09) -- do not merge their figures or narratives:**

| | `landing.triaxisventures.com` | `investor.triaxisventures.com` |
|---|---|---|
| What it is | The live beta product (real Supabase Auth, real tenants) | The forced-demo deployment (`NEXT_PUBLIC_AXXESS_DEMO_MODE=true`), no Auth gate |
| Audience (founder-stated) | Investors only, "mostly Y Combinator" -- link held by YC for ~3-4 days before the founder switched the application materials to point at the investor domain instead | The actual publicized link given to all investors; also shared on FB/Instagram/LinkedIn/WhatsApp for the Founders Club waitlist (see `project_founders_club_waitlist` memory) |
| PostHog project | `498426` | `498426` (same project, both domains ingest into it) |
| PostHog wired since | 2026-07-27 | Bundle referenced PostHog from the start, but `NEXT_PUBLIC_POSTHOG_KEY` was missing from this Vercel project's own env vars until the A-108 fix, 2026-08-08 |
| Founder personally visits it | Yes (his own testing) | No, founder-stated -- "I never visit it" |

---

## 1. `landing.triaxisventures.com`

### 1.1 Web Analytics summary (founder-shared screenshots, authenticated PostHog view, window 2026-07-27 to 2026-08-09, ~13 days)

Source: `ACTIONABLES_READINESS_MATRIX.md` row A-105, "Traffic composition addendum, 2026-08-09."

| Metric | Value |
|---|---|
| Unique visitors | 39 |
| Page views | 548 |
| Sessions | 104 |
| Avg. session duration | 11m 12s |
| Bounce rate | 23% |

**Top paths:**

| Path | Visitors | Views | Bounce |
|---|---|---|---|
| `/auth` | 37 | 148 | 23.4% |
| `/dashboard` | 23 | 115 | 9.1% |
| `/settings` | 18 | 87 | 0% |
| `/auth/login` | 16 | 35 | 0% |
| `/ai-workspace` | 8 | 19 | 0% |
| `/onboarding` | 7 | 28 | 0% |
| `/integrations` | 6 | 18 | 0% |
| `/tasks` | 6 | 9 | 0% |
| `/auth/forgot-password` | 5 | 8 | 66.7% |
| `/auth/sign-up` | 5 | 10 | 50% |

**Channels:** Direct 31 visitors / 469 views -- Referral 12 / 74 -- Organic Social 2 / 5.
**Devices:** Desktop 31 / 492 -- Mobile 10 / 56.
**Retention:** Jul 26-Aug 1 cohort (size 16) -- 18.8% Week-1 return. Aug 2-8 cohort (size 23) had not reached Week 1 yet at time of pull.
**Active hours:** spread across all 24 hours, every day of the week -- not clustered into one narrow window.

### 1.2 `/auth`-filtered breakdown (higher-fidelity, supersedes the map-based geography read above)

Source: matrix A-105, "Correction, 2026-08-09" and "What survives this correction" entries. Same window, filtered to `landing.triaxisventures.com/auth` (37 of the 39 total visitors -- effectively the whole population).

**Geography (Countries/Regions/Cities table, not the map thumbnail):**

| | Count |
|---|---|
| India | 36 of 37 |
| -- of which Assam/Guwahati | 28 |
| United States | 1 (internally inconsistent: Countries says US, Regions says Virginia, Cities says Washington, and the underlying map additionally lit up Alaska -- read as GeoIP-resolution noise, not a precise data point) |

**Operating systems:**

| OS | Sessions |
|---|---|
| Windows | 21 |
| Android | 7 |
| Mac OS X | 3 |
| Linux | 3 |
| iOS | 3 |

### 1.3 Web Vitals (A-105's original finding)

Source: matrix A-105, PostHog Web Vitals tab, "Last 7 days" pulled 2026-08-08 (2026-08-01 to 2026-08-08).

| Vital | Value | PostHog band |
|---|---|---|
| LCP | 18.54s | Poor (threshold >4s) |
| INP | 40ms | Great |
| CLS | 0.04 | Great |
| FCP | 2.18s | Needs improvement |

Live-measured this session (not a PostHog figure, a direct reproduction): a real 2-hop redirect chain `/` -> `/dashboard` -> `/auth?next=...`, ~8x cold-vs-warm variance (~1.7s redirect + ~7.6s full load cold vs. ~0.25s + ~0.9s warm). Flagged as the likely dominant contributor to the 18.54s LCP figure, though the exact live LCP value itself was not captured (Paint Timing API returned empty in-session). Full detail: `docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md`.

### 1.3b Web Vitals, P99, full path breakdown (live browser session, 2026-08-13)

Source: pulled directly by this Claude Code session against the authenticated PostHog UI, at the specific URL the founder shared (`/project/498426/web/web-vitals?date_from=2026-07-08T00:00:00&...&percentile=p99&domain=https://landing.triaxisventures.com&filter_test_accounts=true`). Window **2026-07-08 to now (~5-6 weeks)** -- the widest window pulled for this domain so far, and the first at the **P99** percentile specifically (the worst 1% of loads, not median/typical experience -- read accordingly, this is a tail-latency view, not "what most visitors experience"). "Filter test accounts" ON.

**Top-line tiles (caveat: PostHog labels these "from the last day in the selected time range," i.e. a single recent day's P99, not the full ~5-6 week window):** INP 48ms (Great), LCP 4.61s (Poor), FCP 1.17s (Good), CLS 0.00 (Good).

**LCP path breakdown, full window, P99 (this is the systematic, multi-week view -- not a single-day snapshot):**

| Bucket | Path | LCP (P99) |
|---|---|---|
| Good (<2.5s) | `/ai-workspace/review-inbox` | 1.22s |
| Good | `/onboarding/complete` | 1.29s |
| Good | `/onboarding/join-organization` | 1.79s |
| Good | `/auth/login` | 1.83s |
| Needs improvement (2.5-4s) | `/auth/sign-up` | 3.32s |
| Poor (>4s) | `/auth/forgot-password` | 4.68s |
| Poor | `/tasks` | 5.97s |
| Poor | `/onboarding` | 7.45s |
| Poor | `/auth` | 8.99s |
| Poor | `/ai-workspace` | 9.86s |
| Poor | `/knowledge` | 19.93s |
| Poor | `/settings` | 23.84s |
| Poor | `/integrations` | 27.14s |
| Poor | `/dashboard` | **43.25s** |

**Reading this against A-105:** this is a materially richer data set than the single 18.54s figure A-105 was built on (a 7-day snapshot, one number). At P99 over ~5-6 weeks, `/dashboard` -- the same route A-105's redirect-chain root-cause theory (`/` -> `/dashboard` -> `/auth?next=...`) already names as the likely dominant contributor -- shows a **43.25s** tail-latency LCP, over 2x the original 18.54s figure. This is consistent with, not contradictory to, A-105's redirect-chain theory: it confirms `/dashboard` specifically as the worst offender, not a general site-wide problem. But it also shows the poor-LCP pattern is not confined to `/dashboard` alone -- `/integrations` (27.14s), `/settings` (23.84s), and `/knowledge` (19.93s) all show severe P99 tail latency too, none of which the redirect-chain theory (specific to the `/` entry point) explains on its own. **This P99 breakdown does not identify a new root cause** -- it confirms the LCP problem is real, worse at the tail than the original snapshot suggested, and spans more authenticated routes than previously evidenced, without resolving which of them share the redirect-chain's cause versus have their own separate one.

**FCP path breakdown, same pull, P99 (checked because the founder asked specifically):**

| Bucket | Path | FCP (P99) |
|---|---|---|
| Good (<1.8s) | `/onboarding/join-organization` | 412ms |
| Good | `/api/agents/mcp` | 456ms |
| Good | `/settings` | 660ms |
| Good | `/projects` | 768ms |
| Good | `/tasks` | 850ms |
| Good | `/ai-workspace/review-inbox` | 1.00s |
| Good | `/onboarding/complete` | 1.02s |
| Good | `/auth/sign-up` | 1.08s |
| Good | `/ai-workspace` | 1.16s |
| Good | `/onboarding` | 1.42s |
| Good | `/approvals` | 1.48s |
| Good | `/auth/forgot-password` | 1.51s |
| Needs improvement (1.8-3s) | `/auth/login` | 2.22s |
| Poor (>3s) | `/auth` | 3.26s |
| Poor | `/dashboard` | 3.66s |
| Poor | `/integrations` | 5.10s |

**A real, notable contrast with the LCP table above, recorded as observed rather than diagnosed:** `/settings` is Good on FCP (660ms) but Poor on LCP (23.84s) -- the page's first paint happens fast, but its largest/main content takes over 30x longer to finish rendering. Same shape, smaller gap, on `/dashboard` (FCP 3.66s Poor vs. LCP 43.25s Poor -- both bad, but LCP is ~12x worse) and `/integrations` (FCP 5.10s Poor vs. LCP 27.14s Poor, ~5x worse). This pattern -- fast initial shell paint, much slower full-content paint -- is consistent with an async-loading large element (chart, data table, image) on these specific pages, but this document does not claim that as a confirmed cause; it is an observation from the shape of the two tables, not a root-cause finding.

### 1.4 Error Tracking (A-106)

Source: matrix A-106, PostHog Error Tracking, "Last 7 days" pulled 2026-08-08.

| Field | Value |
|---|---|
| Issue | "Minified React error #418" (hydration mismatch) |
| Occurrences | 6 |
| Sessions | 3 |
| Distinct users | 2 |
| First seen | 2026-08-02T15:54:52Z |
| Last seen | 2026-08-05T01:26:11Z |
| Source chunk | `/_next/static/chunks/1tvi_kjwevoeb.js` |
| Status at pull time | active |

Possibly related, not confirmed same fingerprint: "Frustrating Pages" panel showed 6 rage-click/dead-click/error events on `/dashboard` in the 7-day window vs. 1 in the prior period. Fix status: code shipped for two unsafe call sites (`DashboardSection.tsx`, `AuthProvider.tsx`), not yet deployed or re-confirmed against post-deploy PostHog data -- see `docs/readiness/A106_HYDRATION_FIX_CLOSEOUT_2026_08_09.md`.

### 1.5 Landing Pages Report -- OAuth exchange failure (A-107)

Source: matrix A-107, PostHog's public shared "Landing Pages Report" (`/shared/r9vSMttfj1QbkQDo1DvHJ1oiG8bdsA`), window 2026-07-09 to 2026-08-08 -- pulled live by this session, not founder-shared.

The URL `.../auth/login?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code...` appeared **3 times** in the top-25 landing-page breakdown -- 3 real page-load events landing on a Google OAuth exchange failure. One matching session replay (Mac OS X, Chrome, 2026-08-02 15:54:28 UTC) showed organic human timing (27s dwell, tab-switch away and back, deliberate click), arguing against a bot/stress-test origin for that occurrence specifically.

### 1.6 Traffic-composition analysis: "who is generating this traffic?" -- three rounds of correction

This question was worked through iteratively across several founder-shared screenshots in this session. Recorded in full, in order, in matrix row A-105 (the "Correction," "What survives this correction," and "Further correction" / "Third correction" entries). Summarized here as a single audit trail so the reasoning doesn't have to be re-derived from the matrix's prose each time:

1. **Round 1 claim:** broad U.S.-state spread on the geography map, read as evidence of distinct remote (likely YC) evaluators, not solely the founder.
   **Corrected:** the higher-fidelity `/auth`-filtered table shows 36 of 37 visitors from India (28 Guwahati), 1 from the US -- the map thumbnail was over-read. Founder's own words: "we already saw multiple locations in US previously, so 1 login from US makes no sense." Table supersedes map.
2. **Round 2 claim:** OS diversity (3 Mac OS X + 3 Linux, neither device type belonging to the founder or either Assam pilot per founder statement) is a more defensible "distinct others exist" signal than geography, since OS is a device property, not confounded by shared login credentials.
   **Corrected:** Supabase has exactly 3 real accounts total (founder + 2 Assam pilot orgs). Founder's own question: "Who are 28 unique users from Guwahati if [no] one has id and passwords and no tenants exist on Supabase except me and 2 Assam based pilots?" If local people were using the founder's own shared login on their own personal laptops, the identical Mac/Linux/Windows spread would appear without any of them being remote, distinct evaluators -- device OS diversity does not distinguish "someone in the room with the founder" from "a remote independent evaluator."
3. **Round 3 (the "shared credentials" hypothesis from round 2 is itself superseded):** founder's own words, verbatim: "No local people have id and password and this is live beta with Auth and tenant not demo." This rules out local-people-on-shared-credentials. But `/auth` is the sign-in *page* -- loading it requires no credentials at all, only completing sign-in does. So the 28-unique-device Guwahati count is equally consistent with the founder's own repeated testing across multiple browsers/devices/incognito windows (PostHog's `distinct_id` is per-browser-profile, not per-person -- a fresh incognito window mints a new ID even for the same physical person on the same physical device), or non-authenticating bounce/bot/curiosity traffic that loads the page and goes no further.

**Standing conclusion (final state, not to be re-litigated without new evidence):** none of "distinct remote YC evaluators," "local people on shared credentials," or any specific headcount is well-supported by this dataset as it stands. What is undisputed: genuine, non-fabricated PostHog-recorded traffic exists; it is heavily concentrated in Guwahati; it includes some device/OS diversity. *Who* is generating it, and whether any of it reflects real product usage vs. page-load-only traffic, is **genuinely unresolved** and would need session-replay-level review (matching specific recorded sessions against known facts), not further aggregate-metric inference. The round-1 addendum's referral-channel (12 visitors) and all-hours-activity-heatmap points were never separately re-examined after the corrections above and should not be assumed to still hold.

**Timeline detail (founder-stated):** YC held the `landing.triaxisventures.com` link for roughly 3-4 days before the founder switched the actual YC application materials to the `investor.triaxisventures.com` link instead -- "There's not substantial reason for them to hit landing (live beta) either" going forward. This further narrows how much of this domain's traffic can plausibly be attributed to YC specifically.

**Audience denominator (founder-stated, source artifact needed):** founder states the link has been shared with "very few people except me, YC and my 2 pilot customers" (both Assam-based). Not independently verifiable from PostHog itself -- PostHog has no identity information tying an anonymous visitor to any of these three groups without separately configured user identification, which is not confirmed to exist in this deployment.

### 1.7 Direct-channel-only pull (founder-shared screenshots, 2026-08-10)

Source: 5 founder-shared screenshots of the authenticated PostHog Web Analytics view, filtered to `https://landing.triaxisventures.com` AND `$channel_type = Direct` (i.e., excluding referral/organic-social/paid-social attributed traffic -- isolating hits with no identifiable inbound channel), window 2026-07-27 to now.

| Metric | Value |
|---|---|
| Visitors | 32 |
| Page views | 470 |
| Sessions | 79 |
| Avg. session duration | 12m 52s |
| Bounce rate | 23% |

**Top paths:** `/auth` 30 visitors/118 views (21.3% bounce), `/dashboard` 20/90 (12.5%), `/settings` 16/77, `/auth/login` 15/31, `/ai-workspace` 8/19, `/onboarding` 7/25, `/integrations` 6/18, `/tasks` 6/9, `/knowledge` 4/9, `/auth/forgot-password` 4/7 (66.7% bounce). Same `/auth`-heavy shape as the full-domain breakdown in §1.1/1.2 -- isolating out referral/social channels doesn't change the pattern, so that shape isn't a channel-mix artifact.

**Devices:** Desktop 29 visitors/430 views -- Mobile 4/40. Heavily desktop-skewed, the opposite of `investor.triaxisventures.com`'s mobile-dominated paid-social pattern (§2.2b) -- consistent with deliberate desktop testing/use rather than a social-ad click-through.

**Geography (Regions, as shown -- table may not be exhaustive):** India-Assam 24/425, India-Nagaland 4/21, US-Virginia 3/3, India-(not set) 2/2, India-Uttar Pradesh 1/18, Romania-Bucharest 1/1. (These visible rows sum to 35 against a reported 32 total visitors -- not reconciled, likely overlapping/rounding in PostHog's own multi-dimension breakdown; recorded as shown, not force-fit to add up.)

**Active hours:** spread across nearly every hour and every day (per the heatmap), total 32 -- same all-hours pattern noted in §1.1.

**Founder's own framing, verbatim (2026-08-10):** "This is traction of 'Direct Visitors only' ... does not have bot traffic ... If there's anyone visiting, it has to be a bot; because no one really cares about this, how can they? Remove all Assam based traffic and you have your data. No one cares anyways." Excluding the 24 India-Assam visitors from the 32 total leaves roughly 8 visitors across the remaining regions shown (Nagaland, Virginia, not-set, Uttar Pradesh, Romania).

**Correction, same session:** an earlier draft of this entry characterized the quote above as the founder directing that A-105's "who is generating this traffic" question be closed out / deprioritized. Founder corrected this directly -- no such direction was given; that framing was this document's own overreach, not something said. The quote above is recorded as the founder's characterization of the data (skepticism that the non-Assam remainder is meaningful), nothing more -- it is neither a confirmed technical finding that this traffic is bot-driven, nor an instruction to stop investigating. A-105's traffic-composition question (§1.6) remains open exactly as recorded there.

### 1.8 Full-domain pull, live browser session (2026-08-13)

Source: pulled directly by this Claude Code session against the authenticated PostHog Web Analytics UI at `https://us.posthog.com/project/498426/web`, after the founder logged in within the session's browser pane. Filtered to `https://landing.triaxisventures.com`, window **2026-07-27 to now (~17 days)**, "Filter test accounts" toggle **ON** (this is the dedup the founder referred to when sharing the URL -- PostHog's own internal/test-account exclusion filter, not a manual dedup step performed separately). Different access method than every prior entry in this document (which were founder-shared screenshots) -- recorded as `(b)` per this document's own source-discipline categories, a live pull against the authenticated UI, not a screenshot.

| Metric | Value |
|---|---|
| Visitors | 41 |
| Page views | 551 |
| Sessions | 106 |
| Avg. session duration | 11m |
| Bounce rate | 24% |

**Top paths:** `/auth` 39 visitors/150 views (23.5% bounce), `/dashboard` 24/116 (8.3%), `/settings` 18/87, `/auth/login` 16/35, `/ai-workspace` 8/19, `/onboarding` 7/28, `/integrations` 6/18, `/tasks` 6/9, `/auth/sign-up` 5/10 (50.0% bounce), `/auth/forgot-password` 5/8 (66.7% bounce). Same `/auth`-heavy shape as every prior pull (§1.1, §1.2, §1.7) -- consistent across almost three weeks now, not a one-off artifact.

**Channels:** Direct 32/470, Referral 13/76, Organic Social 2/5.

**Devices:** Desktop 32/493, Mobile 11/58 -- same desktop-skewed pattern as §1.7, opposite of `investor`'s mobile/paid-social pattern (§2.4 below).

**Reconciles cleanly against §1.1's 2026-08-09 snapshot** (39 visitors/548 views/104 sessions over the same start date, ~4 days earlier): +2 visitors, +3 views, +2 sessions in the intervening ~4 days -- small, steady, incremental growth, not a spike or a discontinuity.

---

## 2. `investor.triaxisventures.com`

### 2.1 Instrumentation history (A-108)

PostHog was referenced in the bundle from the start but never actually initialized at runtime on this domain -- `NEXT_PUBLIC_POSTHOG_KEY` was set on the landing project's Vercel environment but not on this domain's separate Vercel project (`triaxis-product-investor-demo`), and `NEXT_PUBLIC_*` vars are baked in per-project at build time, not shared across projects. Root-caused and fixed live, same session: founder added the key and redeployed; confirmed via direct network inspection that `POST /ingest/i/v0/e/` now returns `200 {"status":"Ok"}` with the real token. Full detail and the confirming evidence: matrix row A-108 (Closed, 100% live network confirmation).

### 2.2 Web Analytics summary (founder-shared screenshot, window August 8, 2026 to now -- ~24h of tracking at time of pull)

Source: matrix A-108, "Follow-up data point, upgraded to real screenshot evidence 2026-08-09."

| Metric | Value |
|---|---|
| Visitors | 7 |
| Page views | 26 |
| Sessions | 7 |
| Avg. session duration | 4m 34s |
| Bounce rate | 0% |

(Superseded same-day figure, no longer current: an earlier founder-stated 5 visitors / 24 page views, recorded before this screenshot became available.)

### 2.2b Fuller pull, ~36h later (founder-shared screenshots, window August 8, 2026 to now)

Source: 5 founder-shared screenshots of the authenticated PostHog Web Analytics view, filtered to `https://investor.triaxisventures.com`, pulled 2026-08-09/10. Supersedes §2.2's 7-visitor sample with a much larger one from the same ongoing window.

| Metric | Value |
|---|---|
| Visitors | 102 |
| Page views | 122 |
| Sessions | 102 |
| Avg. session duration | 36.9s |
| Bounce rate | 40% |

**Top paths:** `/dashboard` dominates overwhelmingly (108 visitors / 109 views, 42.1% bounce); every other path is single-digit visitors (`/stakeholders` 2, `/approvals` 2, `/ai-workspace` 1, `/alerts` 1, `/documents` 1, `/tasks` 1, `/admin/audit-logs` 1, `/ai-workspace/review-inbox` 1, `/analytics` 1).

**Sources by channel:** Paid Social 96 visitors / 97 views -- Organic Social 7 / 7 -- Direct 5 / 24.

**Devices:** Mobile 105 visitors / 125 views -- Desktop 3 / 3.

**Reconciliation note (breakdown totals vs. headline):** The per-breakdown visitor counts (e.g. Devices: 105+3=108, Top paths: sum across all paths exceeds 102) are expected to exceed the headline Visitors figure of 102. PostHog Web Analytics counts a "visitor" in a breakdown dimension for each distinct path/device/geography segment that visitor touched within the window -- a single visitor who loaded `/dashboard` on Mobile and then on Desktop increments both the Mobile and the `/dashboard` path rows independently. The headline Visitors (102) is the deduplicated count of unique `distinct_id` values across the whole window; the breakdown rows are not mutually exclusive subsets of that deduplicated total and are not intended to sum to it. This is the same PostHog semantics already noted for Geography in §1.7.

**Geography (Countries):** India 102 / 105 -- United States 3 / 3 -- Nepal 1 / 18 -- Germany 1 / 1 -- Ireland 1 / 1.

**Geography (India, by Region):** Kerala 11, Gujarat 10, Tamil Nadu 10, Assam 9, West Bengal 8, Maharashtra 7, Uttar Pradesh 5, (not set) 5, Rajasthan 4, Telangana 4 -- broad spread across states, not concentrated in one city.

**Retention:** Aug 2-8 cohort (size 4) -- 100% Week 0, 0% Week 1. Aug 9-15 cohort (size 3) had not reached Week 1 yet at pull time.

**Read on this data, founder-corrected (2026-08-09/10):** this session's first pass at this pull flagged the Paid-Social/mobile dominance, the Nepal views-outlier, and the 0%-retention figure as things needing explanation -- incorrectly. Founder's direct correction: this is the demo domain, openly and deliberately promoted on paid social (FB/Instagram) for the Founders Club waitlist (see `project_founders_club_waitlist` memory) -- 94% Paid Social and 97% mobile is exactly the expected signature of that campaign converting to real clicks, not a traffic-authenticity question to interrogate. The scrutiny applied to `landing.triaxisventures.com`'s traffic in §1.6 (a live product with real Auth and no real accounts to explain a spike) does not transfer here, where the entire premise is public paid promotion. Retention/return-visit rate is not a meaningful metric for a single-touch demo/waitlist funnel and should not be read as a shortfall. The broad India-wide regional spread (not concentrated in one city, unlike `landing`'s Guwahati pattern) is, if anything, a positive, non-suspicious signal. See `feedback_demo_vs_live_traffic_scrutiny` memory for the standing correction this produced.

### 2.3 Why this domain's data is structurally cleaner than `landing`'s

- **No Auth gate.** This is the forced-demo deployment -- every visitor loads the demo content directly. There is no shared-credential ambiguity of the kind that confounds the `landing.triaxisventures.com` `/auth` breakdown above (round 2/3 of that analysis).
- **Founder does not visit it himself** (founder-stated) -- unlike `landing`, none of this domain's traffic is the founder's own testing.
- **Founder's characterization of the mix:** "actual investor/customer/social media traffic" -- a genuinely mixed real-audience source, not solely the founder's own testing, and this is the domain actually promoted on FB/Instagram/LinkedIn/WhatsApp for the Founders Club waitlist (see `project_founders_club_waitlist` memory). The fuller §2.2b pull sharpens this: the mix is overwhelmingly (94%) Paid Social -- i.e., the FB/Instagram promotion itself, working as intended, not an ambiguous "who is this" question.
- **Caveat that still applies regardless:** PostHog's `distinct_id` is a per-browser-profile identifier, not per-person -- an incognito window or a second browser from the same physical visitor still mints a new "unique visitor." This mechanic is domain-agnostic and applies here exactly as it does to `landing`'s count; it is just not compounded by the shared-Auth-credential question on this domain.
- **Still a single day's data as of the last pull** -- not yet a trend. Re-pull after a longer window before treating this domain's numbers as a stable baseline.

### 2.4 Full-domain pull, live browser session (2026-08-13) -- first multi-week window for this domain

Source: same live-pull method as §1.8, filtered to `https://investor.triaxisventures.com`, window **2026-07-27 to now (~17 days)**, "Filter test accounts" **ON**. Supersedes §2.2/§2.2b's ~24-36h snapshots with the first multi-week window this domain has had -- the "still a single day's data" caveat immediately above no longer applies.

| Metric | Value |
|---|---|
| Visitors | 592 |
| Page views | 672 |
| Sessions | 643 |
| Avg. session duration | 25.9s |
| Bounce rate | 45% |

**Top paths:** `/dashboard` 592 visitors/650 views (44.9% bounce) -- overwhelmingly dominant, everything else in single digits: `/approvals` 3/3, `/ai-workspace` 2/3, `/documents` 2/3, `/stakeholders` 2/3, `/alerts` 1/2, `/tasks` 1/2, `/admin/audit-logs` 1/1, `/ai-workspace/review-inbox` 1/1, `/analytics` 1/1.

**Channels:** Paid Social 567/625, Direct 11/30, Organic Social 10/13, Organic Search 4/4. Paid Social is 96% of visitors -- even more concentrated than §2.2b's 94% figure, consistent with the founder's own reading in §2.3 (this is the FB/Instagram Founders Club campaign converting to clicks, not a traffic-authenticity question).

**Devices:** Mobile 580/660, Desktop 12/12 -- 98% mobile, same signature noted in §2.3.

**Retention:** Mean 100% Week 0 / 0% Week 1 / 0% Week 2 across the full window -- consistent with §2.2's read that this is a single-touch demo/waitlist funnel, not a returning-user product, and (per §2.3) not a shortfall to read into.

**Session duration dropped sharply** (25.9s here vs. no prior multi-week baseline to compare against) alongside a much larger sample -- consistent with the visitor mix shifting further toward brief, single-page paid-social click-throughs as the campaign scaled, not a product regression on this demo-only domain.

---

## 3. Cross-cutting notes (apply to both domains)

- **PostHog project:** both domains report into the same project (`498426`), so cross-domain confusion when reading dashboards is a real, previously-realized failure mode (see A-108's root question -- it was raised specifically because every PostHog pull in this session up to that point showed only `landing.triaxisventures.com` URLs, despite `investor.triaxisventures.com` being the domain the founder actually considered "public"). Always confirm which domain a given PostHog view is filtered to before citing a number.
- **"Unique visitor" mechanics:** PostHog identifies visitors via a client-side-stored `distinct_id` (localStorage/cookie), not IP address and not account identity. Incognito/private windows, separate browser profiles, and cleared storage each mint a fresh ID for what may be the same physical person or even the same physical device. This is the single most load-bearing caveat across every visitor/session count in this document and should be restated whenever a headcount claim is made from these figures.
- **No cross-session-replay attribution has been done.** Every analysis above is aggregate-metric-level (counts, breakdowns, deltas). No specific PostHog session recording has been matched to a specific known person or defect occurrence, except the single A-107 session-replay spot-check noted in §1.5. Resolving the still-open "who is really hitting `landing.triaxisventures.com`" question (§1.6) would require that level of review, not further aggregate pulls.

## Evidence index

| Claim group | Primary source |
|---|---|
| `landing` Web Analytics, Web Vitals, Error Tracking, traffic-composition corrections | `ACTIONABLES_READINESS_MATRIX.md` rows A-105, A-106 |
| `landing` OAuth exchange failure | `ACTIONABLES_READINESS_MATRIX.md` row A-107; `docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md` |
| `investor` instrumentation fix + Web Analytics | `ACTIONABLES_READINESS_MATRIX.md` row A-108 |
| Hydration-error code fix detail | `docs/readiness/A106_HYDRATION_FIX_CLOSEOUT_2026_08_09.md` |
| 2026-08-13 live-pull, both domains, ~17-day window | This document, §1.8 and §2.4 -- first Claude Code session live pull against authenticated PostHog UI (all prior entries were founder-shared screenshots) |
