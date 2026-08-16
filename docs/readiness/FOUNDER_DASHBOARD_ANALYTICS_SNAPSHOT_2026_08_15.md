# Founder Dashboard -- Analytics Snapshot, Through 2026-08-15

**Status: Founder-stated, source artifact needed.** This is the founder's own PostHog-derived
readout, recorded verbatim in substance from his own dashboard -- not independently re-pulled or
re-verified against PostHog from this environment (no PostHog query-API credentials exist in this
environment; see A-136 in `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`, which flags this exact
gap and scopes real query-API access as Sprint 2). Treat every figure below as founder-reported, per
this repo's standing evidence-chain discipline (`CLAUDE.md`), until an independently pulled export or
screenshot is attached to this file.

## Headline

Total project traffic reached **1,409 pageviews**, up 49 on 2026-08-15 (+3.6%). The property mix
flipped sharply that day: Landing generated 48 of the 49 Aug 15 pageviews; Investor only 1.

| Property | Days live | Pageviews | PV/day |
|---|---|---|---|
| Landing (`landing.triaxisventures.com`) -- live since 2026-07-27 | 20 | 602 | 30.1 |
| Investor (`investor.triaxisventures.com`) -- live since 2026-08-08 | 8 | 804 | 100.5 |
| Other preview host | -- | 3 | -- |
| **Total** | -- | **1,409** | -- |

## Acquisition

Investor's launch burst: **151 -> 227 -> 201 -> 87 -> 76 -> 55 -> 1** PV/day, 2026-08-09 through
2026-08-15. Landing jumped **1 -> 48** PV, 2026-08-14 to 2026-08-15. Read together, this is primarily
a traffic-source/property shift, not a project-wide traffic collapse.

2026-08-15 recorded **6 daily unique visitors** and **6 daily sessions** across the two production
domains. The last separately verified de-duplicated launch-to-date visitor count was **644** through
2026-08-14; the trend endpoint the founder read today exposes daily uniques only, so the 6 above are
explicitly **not** added to claim 650 -- his own caveat, preserved here rather than "corrected" into a
summed total.

## Traffic quality

**1,405 / 1,409 pageviews = 99.72%** PostHog-classified Regular traffic, with only 4 AI-agent
pageviews across the entire period. All 49 Aug 15 pageviews were Regular.

## Geography

India is now **1,359 / 1,409 = 96.45%** of all pageviews. Remainder: US 25, Nepal 18, Bangladesh 2,
Malawi 2, Germany/Ireland/Romania 1 each. All Aug 15 pageviews were from India.

## Activation telemetry

Aug 15 added: 6 app opens, 6 beta sessions started, 6 module opens, 2 dashboard views. Since
activation instrumentation first appeared on 2026-08-14, running totals are now: 68 app opens, 68
beta sessions, 68 module opens, 10 dashboard views, 8 audit-log views.

**Still 0 tracked signups, logins, or organization creations since 2026-08-08**, after test-account
filtering. Per the founder's own framing: this remains primarily an identity/conversion
instrumentation gap until reconciled, not proof of zero product activation.

## Retention

Investor website revisit cohorts: Aug 9 D1 6.8% (9/132), D2 5.3% (7/132), D3 3.0%; Aug 10 D1/D2 3.4%;
Aug 11 D1 1.7%. The Aug 14 cohort showed 1/2 return on D1 -- **n=2, statistically meaningless**, per
the founder's own note. These are website revisit metrics, not SaaS product retention.

## Reliability

Daily captured exceptions since 2026-08-08: **3 -> 29 -> 57 -> 38 -> 22 -> 0 -> 0 -> 0**. Three
consecutive days (2026-08-13 through 2026-08-15) with zero captured exceptions and zero rage clicks
on Aug 15. No new error regression visible in this trend.

## Performance -- today's watch item

Aug 15 p75 Core Web Vitals:

| Property | LCP | INP | CLS | Sample size |
|---|---|---|---|---|
| Landing | **8.36s** | 60ms | 0.047 | 16 Web Vital events |
| Investor | 3.43s | 48ms | 0.062 | 2 Web Vital events -- too thin for confidence |

Landing's 8.36s LCP is a genuine watch item despite excellent INP/CLS -- worth investigating if it
persists once the sample size grows. Investor's LCP moved 2.73s -> 3.43s day over day, but yesterday's
2-event sample is too small to call this a confirmed regression.

Cross-reference: `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-112 (2026-08-15 live RCA against
`landing.triaxisventures.com`, redirect-chain/cold-cache theory) and A-105 (the still-open primary LCP
tracking row) -- this founder-reported 8.36s figure is a second, independent data point pointing at
the same open question, not yet reconciled with A-112's own live-trace numbers in this document.

## AI/LLM analytics

`ai_query_submitted` remains 0; PostHog still reports no recent `$ai_generation`, traces, spans,
embeddings, feedback, or evaluation events. Per the founder's own framing: this remains an LLM
observability gap, not evidence of no AI usage.

## Founder readout, verbatim in substance

> 1,409 pageviews in only 20/8 days of tracking, 99.72% regular traffic, strong initial Investor
> acquisition, product telemetry now firing, and zero exceptions for three straight days. The two
> things to watch are the abrupt Investor -> Landing traffic shift and especially Landing LCP at
> 8.36s.

## What this document is not claiming

- Not independently re-pulled from PostHog -- no query-API credentials exist in this environment as
  of this writing (see A-136).
- Not reconciled against A-112's own live-trace LCP numbers from earlier the same day -- both exist as
  separate data points pending a combined read.
- The activation-telemetry zero-signups figure is explicitly flagged, by the founder himself, as an
  instrumentation gap rather than a product-activation conclusion -- preserved as such, not
  reinterpreted.
