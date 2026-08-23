# PostHog Data, Analytics & Insights Log — 2026-08-22/23

**Created:** 2026-08-23. **Scope:** a PostHog traffic/retention/reliability readout for
`landing.triaxisventures.com` and `investor.triaxisventures.com`, covering through 2026-08-22.

**Source discipline (per `CLAUDE.md`'s evidence-chain rule):** every figure in this document was
**pasted into chat by the founder from a separate analysis session** (not this Claude Code session,
and not independently re-queried against PostHog's API or UI by this session). It is recorded here
as **founder-provided, source artifact not independently re-verified** — the same discipline this
repo already applies to founder-recalled pricing/traction claims. If these numbers need to inform a
go/no-go decision, re-pull them live from PostHog first. This entry supplements, and does not
supersede, `POSTHOG_DATA_ANALYTICS_INSIGHTS_LOG_2026_08_09.md`.

---

## Snapshot 1 — through 2026-08-21

| Property | Days live | Post-launch visitors | Sessions | Pageviews | PV/day |
|---|---|---|---|---|---|
| `landing.triaxisventures.com` | 26 | 50 | 124 | 663 | 25.5 |
| `investor.triaxisventures.com` | 14 | 671 | 1,084 | 1,248 | 89.1 |
| Combined* | — | ≤721 | 1,208 | 1,911 | — |

*Visitors aren't safely additive across properties — the same person can visit both.

**Acquisition:** Investor traffic surged Aug 9–12 (132 → 216 → 194 → 83 daily visitors), collapsed
Aug 13–17, then produced a second sustained wave Aug 19–21 (22 → 27 → 25/day) — described as real
activity, not a single-day spike. Cumulative Investor acquisition is now dominated by
`m.facebook.com` (632 visitors / 1,030 pageviews); Direct contributes 19 visitors / 164 views;
LinkedIn roughly 9 visitors. Landing is close to the inverse: 40 direct visitors / 576 direct
pageviews, read as deliberately shared links and repeat inspection.

**Traffic quality:** PostHog classified 1,906 of 1,911 pageviews (99.74%) as "Regular" traffic; only
5 as AI Agent traffic — the volume is not bot-driven. Geography: Investor 649 India / 18 US / 1–2
each elsewhere; Landing 45 India / 4 US / 1 Romania.

**Activation:** lifetime instrumentation records only 2 completed signups and 1 organization
creation (Jul 28–29), predating the Investor-property launch — the Facebook acquisition surge has
not produced new account creation. High `beta_session_started`/`module_opened` counts (250 each on
Aug 21) are flagged as instrumentation/lifecycle telemetry, not 250 independent activated users.

**Retention:** Aug 9 cohort (132 people) — 9 D1 (~6.8%), 7 D2 (~5.3%), 4 D3, at least one D7
returner. Aug 10 cohort (207) — 7 D1/D2 (~3.4%). Aug 11 cohort (180) — 3 D1 (~1.7%). The Aug 19–21
cohorts show no next-day retention yet — read as low-intent social acquisition, not core-product
retention decay.

**AI/LLM telemetry:** no native `$ai_generation`/trace events in the last 30 days (an instrumentation
gap, not evidence of zero AI usage). Custom telemetry shows 2 `ai_query_submitted` (Aug 15) and 4
`ai_agentic_chat_turn_completed` (Aug 16) events.

**Reliability:** `$exception` events appeared only on the three most recent observed days: 23/2 users
(Aug 19) → 36/4 (Aug 20) → 21/2 (Aug 21) — improving day-on-day but flagged as a new regression
cluster versus the immediately preceding baseline, worth diagnosing.

**Geography (cumulative, Landing since Jul 27 + Investor since Aug 8):** 13 countries, 51
distinct first-level regions/states/provinces (GeoIP-based; caveat for VPN/secure-routing skew).

**Session duration (normalized to each property's launch date):** combined average 84.8s (1m25s);
Landing 619s (10m19s) across 134 sessions; Investor 30.2s across 1,313 sessions — the gap reinforces
the traffic-quality split between the two properties.

**US traffic after Aug 13:** not zero — 1 US visitor/pageview on Investor (Aug 20), 1 on Landing
(Aug 21). Aug 14–19 had zero US pageviews; the later hits are isolated, not a continuing cluster.

---

## Snapshot 2 — through 2026-08-22

| Property | Days live | Visitors | Sessions | Pageviews | PV/day |
|---|---|---|---|---|---|
| Landing | 27 | 51 | 125 | 667 | 24.7 |
| Investor | 15 | 683 | 1,156 | 1,327 | 88.5 |
| Combined, deduplicated | — | 732 | 1,278 | 1,994 | — |

**Latest movement:** Investor cooled sharply on Aug 22 — 13 visitors / 71 sessions / 78 PV, versus
25/131/136 on Aug 21 (−48%/−46%/−43%). Roughly 47–50% below the Aug 19–21 wave average. Read as the
Facebook-driven wave decaying, not a product-side collapse. Landing recorded 1 visitor/1 session/4 PV
(too low-volume for day-to-day percentages to be meaningful).

**Acquisition:** unchanged pattern — Investor still overwhelmingly `m.facebook.com` (643 cumulative
visitors / 1,096 PV); Direct 19/170; Landing still 41 direct visitors / 580 direct PV.

**Activation:** still only 2 signups / 1 organization, all Jul 28–29 — no new conversions from the
social surge. `beta_session_started`/`module_opened` fell from 250 each (Aug 21) to 136 each (Aug
22), still resolving to one unique user per day — confirmed as lifecycle telemetry, not activated-user
counts.

**Retention:** unchanged conclusion — Aug 9 cohort remains strongest (6.8% D1); the Aug 19–21
acquisition cohorts show zero D1 returners, reinforcing the low-intent-traffic read. Aug 22 too
recent to judge.

**Geography:** unchanged at 13 countries / 51 regions combined (Investor 12/50, Landing 3/11 — these
overlap and should not be summed).

**Country-wise breakdown (combined Landing + Investor through Aug 22, each property counted from its
own instrumentation start date):**

| Country | Unique users | Sessions | Pageviews |
|---|---|---|---|
| India | 705 | 1,242 | 1,936 |
| United States | 22 | 24 | 26 |
| Bangladesh | 2 | 2 | 3 |
| Nepal | 1 | 1 | 18 |
| Malawi | 1 | 1 | 2 |
| Singapore | 1 | 1 | 2 |
| Malaysia | 1 | 1 | 1 |
| Romania | 1 | 1 | 1 |
| Ireland | 1 | 1 | 1 |
| Mexico | 1 | 1 | 1 |
| Oman | 1 | 1 | 1 |
| Germany | 1 | 1 | 1 |
| Indonesia | 1 | 1 | 1 |

13 countries total, matching the geography figure above. The US is the largest non-India cohort (22
unique users / 26 pageviews), split 22 Investor / 4 Landing pageviews. Nepal's single user is
unusually engaged at 18 pageviews; every other one-user country is a brief single-page visit.
Consistent with the caveat already noted elsewhere in this log: these are **GeoIP-observed**
countries, not verified physical locations — VPN/secure routing means country ≠ location.

**AI/LLM telemetry:** still a gap — no native LLM observability events in 30 days; custom telemetry
now shows 3 `ai_query_submitted` events since Jul 30 and 4 `ai_agentic_chat_turn_completed` on Aug 16.

**Traffic-quality caveat:** the underlying PostHog query run for this snapshot reportedly could not
resolve `$virt_traffic_type`/bot-flag taxonomy cleanly — the 99.74%-regular figure from Snapshot 1 was
explicitly *not* re-confirmed or overwritten in Snapshot 2; treat it as a telemetry/query-surface gap,
not a claim that traffic quality changed.

**Reliability:** exception cluster persists — 23/2 (Aug 19) → 36/4 (Aug 20) → 21/2 (Aug 21) → 23/3
(Aug 22). Aug 22 is a small re-worsening vs. Aug 21 but still well below the Aug 20 peak — read as a
persistent unresolved regression, not an accelerating outage. Landing shows no exception cluster in
this window.

---

## Full infrastructure/traffic breakup through Aug 22 (Landing from Jul 27, Investor from Aug 8)

### Region-wise (largest observed regions by unique users)

| Region | Users | Sessions | Pageviews |
|---|---|---|---|
| Kerala | 74 | 132 | 133 |
| West Bengal | 64 | 116 | 120 |
| Assam | 61 | 155 | 784 |
| Gujarat | 58 | 76 | 77 |
| Tamil Nadu | 56 | 99 | 99 |
| Maharashtra | 48 | 75 | 77 |
| Uttar Pradesh | 39 | 75 | 98 |
| Rajasthan | 36 | 53 | 54 |
| Karnataka | 33 | 48 | 53 |
| Telangana | 31 | 41 | 44 |
| Madhya Pradesh | 27 | 33 | 34 |
| Delhi NCT | 23 | 32 | 34 |
| Punjab | 23 | 27 | 27 |
| Bihar | 20 | 38 | 39 |
| Nagaland | 16 | 31 | 45 |
| Haryana | 16 | 31 | 33 |
| Odisha | 13 | 22 | 22 |
| Uttarakhand | 13 | 18 | 18 |
| Jammu & Kashmir | 11 | 16 | 17 |
| Virginia, US | 9 | 9 | 11 |
| Arunachal Pradesh | 8 | 8 | 11 |
| Chhattisgarh | 8 | 9 | 9 |
| Sikkim | 7 | 24 | 24 |
| Andhra Pradesh | 7 | 10 | 10 |
| Himachal Pradesh | 6 | 8 | 8 |
| Jharkhand | 6 | 6 | 6 |
| Chandigarh | 4 | 8 | 8 |
| Oregon, US | 3 | 3 | 3 |
| Iowa, US | 3 | 3 | 3 |
| Colorado, US | 3 | 3 | 3 |
| Goa | 2 | 2 | 2 |
| Texas, US | 1 | 2 | 2 |
| Florida, US | 1 | 1 | 1 |
| Georgia, US | 1 | 1 | 1 |
| Berlin, Germany | 1 | 1 | 1 |
| Nuevo León, Mexico | 1 | 1 | 1 |
| Bucharest, Romania | 1 | 1 | 1 |
| Selangor, Malaysia | 1 | 1 | 1 |
| Puducherry | 1 | 1 | 1 |
| Muscat, Oman | 1 | 1 | 1 |
| East Java, Indonesia | 1 | 1 | 1 |
| Leinster, Ireland | 1 | 1 | 1 |
| Rangpur, Bangladesh | 1 | 1 | 2 |
| Manipur | 1 | 1 | 1 |
| Mizoram | 1 | 1 | 1 |

Plus GeoIP records with no usable subdivision: 31 Indian users, 2 US users, and individual users from
Nepal, Malawi, Singapore, and Bangladesh.

**Standout: Assam** — only 61 users but 784 pageviews, far beyond a simple large-acquisition-cohort
read; this is extraordinarily high repeat/depth activity relative to the Facebook-heavy regions.

### Device breakup

| Device | Unique users | Sessions | Pageviews | PV share |
|---|---|---|---|---|
| Mobile | 676 | 1,140 | 1,233 | 61.8% |
| Desktop | 59 | 138 | 760 | 38.1% |
| Tablet | 1 | 1 | 1 | ~0.1% |

The cumulative dataset is no longer ~85% desktop (as the earlier direct/evaluative cohort alone was)
— the Facebook acquisition wave has flipped the aggregate mix heavily toward mobile now that hundreds
of Facebook-mobile visitors are in the denominator.

### OS breakup

| OS | Users | Sessions | Pageviews | PV share |
|---|---|---|---|---|
| Android | 664 | 1,119 | 1,203 | 60.3% |
| Windows | 42 | 113 | 715 | 35.9% |
| iOS | 13 | 22 | 31 | 1.6% |
| Mac OS X | 10 | 12 | 30 | 1.5% |
| Linux | 9 | 13 | 15 | 0.8% |

Two visible traffic regimes: Facebook/social wave → Android/mobile; high-depth/direct traffic →
disproportionately Windows/desktop. Only 42 observed Windows users generated 715 pageviews — far
deeper per-user than the Android population.

### Traffic-source breakup

| Referring source | Users | Sessions | Pageviews |
|---|---|---|---|
| m.facebook.com | 643 | 1,081 | 1,096 |
| Direct | 58 | 124 | 750 |
| triaxisventures.com | 13 | 22 | 51 |
| landing.triaxisventures.com | 5 | 10 | 29 |
| www.linkedin.com | 5 | 11 | 15 |
| LinkedIn Android app | 5 | 6 | 11 |
| Instagram | 5 | 13 | 13 |
| Facebook.com | 3 | 7 | 8 |
| l.facebook.com | 3 | 4 | 4 |
| www.facebook.com | 3 | 3 | 3 |
| lm.facebook.com | 1 | 1 | 5 |
| Bing | 4 | 4 | 4 |
| Vercel | 2 | 2 | 2 |
| Zoom Marketplace | 1 | 1 | 2 |

Grouped broadly: Facebook surfaces generate ~1,116 of 1,994 pageviews (~56%), Direct alone generates
750 (~38%), and identifiable LinkedIn surfaces contribute ~26 PV (~1.3%). Facebook dominates reach;
Direct contributes disproportionate depth.

### Acquisition-channel breakup (PostHog session-level classifier)

| Channel | Sessions | Share | Avg session |
|---|---|---|---|
| Paid Social | 1,341 | 86.7% | 27.4 sec |
| Direct | 136 | 8.8% | 634.6 sec / 10m 35s |
| Organic Social | 37 | 2.4% | 142.5 sec / 2m 23s |
| Referral | 29 | 1.9% | 206 sec / 3m 26s |
| Organic Search | 4 | 0.3% | 4.8 sec |

Paid Social drives the bulk of sessions at ~27 seconds average; Direct is only 8.8% of sessions but
averages 10m 35s. The high-intent/evaluative population is effectively hidden inside the aggregate
average once Paid Social's volume dominates the denominator.

### Viewport-width breakup

| Viewport | Users | Sessions | Pageviews | PV share |
|---|---|---|---|---|
| <480 px | 672 | 1,134 | 1,223 | 61.3% |
| 1024–1439 px | 38 | 111 | 690 | 34.6% |
| 1440–1919 px | 6 | 8 | 45 | 2.3% |
| 768–1023 px | 14 | 19 | 23 | 1.2% |
| 1920+ px | 5 | 5 | 5 | 0.3% |
| 480–767 px | 2 | 2 | 5 | 0.3% |
| Unknown | 2 | 2 | 3 | 0.2% |

Just 38 users in the 1024–1439px desktop-width bracket generated 690 pageviews (~18 PV/user), versus
672 sub-480px users generating 1,223 (~1.8 PV/user) — roughly a 10x depth difference per observed
user between the two populations.

**Recommended framing carried over from the source analysis:** for investor/YC interpretation, split
the dashboard into "Reach Traffic" (paid-social/mobile, high volume, low depth) and "High-Intent
Traffic" (direct/desktop, low volume, order-of-magnitude-higher engagement depth) rather than reading
blended aggregates, which increasingly understate the smaller high-intent cohort as the paid-social
volume grows.

---

## What this log is not claiming

- None of the figures above were re-pulled from PostHog by this session — they are recorded exactly
  as pasted by the founder from a separate analysis pass, per the source-discipline note above.
- The interpretive framing ("low-intent social acquisition," "decaying wave," "not a product-side
  collapse," etc.) is carried over from that same pasted analysis, not independently re-derived here.
- The suggested next steps in that analysis — separating organic/direct traffic from paid/social in
  the dashboard, fixing native LLM telemetry, and diagnosing the Aug 19–22 exception cluster — are
  recorded as recommendations, not yet started or verified as complete.
