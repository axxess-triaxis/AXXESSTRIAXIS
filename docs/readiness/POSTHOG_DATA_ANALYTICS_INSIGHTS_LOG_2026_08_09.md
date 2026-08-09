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

### 2.3 Why this domain's data is structurally cleaner than `landing`'s

- **No Auth gate.** This is the forced-demo deployment -- every visitor loads the demo content directly. There is no shared-credential ambiguity of the kind that confounds the `landing.triaxisventures.com` `/auth` breakdown above (round 2/3 of that analysis).
- **Founder does not visit it himself** (founder-stated) -- unlike `landing`, none of this domain's traffic is the founder's own testing.
- **Founder's characterization of the mix:** "actual investor/customer/social media traffic" -- a genuinely mixed real-audience source, not solely the founder's own testing, and this is the domain actually promoted on FB/Instagram/LinkedIn/WhatsApp for the Founders Club waitlist (see `project_founders_club_waitlist` memory).
- **Caveat that still applies regardless:** PostHog's `distinct_id` is a per-browser-profile identifier, not per-person -- an incognito window or a second browser from the same physical visitor still mints a new "unique visitor." This mechanic is domain-agnostic and applies here exactly as it does to `landing`'s count; it is just not compounded by the shared-Auth-credential question on this domain.
- **Still a single day's data as of the last pull** -- not yet a trend. Re-pull after a longer window before treating this domain's numbers as a stable baseline.

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
