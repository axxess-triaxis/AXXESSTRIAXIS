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

## What this log is not claiming

- None of the figures above were re-pulled from PostHog by this session — they are recorded exactly
  as pasted by the founder from a separate analysis pass, per the source-discipline note above.
- The interpretive framing ("low-intent social acquisition," "decaying wave," "not a product-side
  collapse," etc.) is carried over from that same pasted analysis, not independently re-derived here.
- The suggested next steps in that analysis — separating organic/direct traffic from paid/social in
  the dashboard, fixing native LLM telemetry, and diagnosing the Aug 19–22 exception cluster — are
  recorded as recommendations, not yet started or verified as complete.
