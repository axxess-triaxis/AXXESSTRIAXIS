# Vercel Platform Metrics Snapshot (2026-07-29)

Source: 3 screenshots from the Vercel dashboard (project `axxesstriaxis`, domain
`triaxisventures.com`), shared directly by the founder. Numbers below are transcribed exactly as
shown -- nothing recalculated or inferred beyond what's visible.

## Analytics -- Production, Last 30 Days

| Metric | Value |
|---|---|
| Visitors | 154 |
| Page Views | 541 |
| Bounce Rate | 62% (shown with a "+62%" badge in the dashboard) |

Traffic chart shows near-zero activity before ~Jul 5, a rise to ~7-10 visitors/day around Jul 12,
a sharp single-day spike to ~33 around Jul 19 (the tallest point on the chart), then fluctuating
between roughly 5-13/day through Jul 26 and beyond.

## Observability Overview -- Production, Last 12 Hours

| Metric | Value |
|---|---|
| Fast Data Transfer -- Outgoing | 10MB |
| Fast Data Transfer -- Incoming | 1MB |
| Vercel Functions -- Error rate | **50%** |
| Vercel Functions -- Timeout rate | 0% |
| Compute -- Active CPU | 310ms |

Edge Requests chart is mostly flat near zero with two visible spikes (one taller, colored as a 4XX
bucket per the legend, one smaller) in this 12-hour window. Fast Data Transfer chart shows two
corresponding spikes, one reaching ~3MB and one ~1MB. Compute chart shows one spike to ~200ms
before returning to near-zero.

**Worth flagging, not yet investigated:** a 50% Vercel Functions error rate is a meaningful number
on its face, but the dashboard doesn't show the underlying invocation count for this specific
panel in the screenshot -- over a quiet 12-hour window this could reflect a small number of calls
(e.g., 1 of 2) rather than a systemic failure across real traffic. Needs the actual error log
entries (Vercel dashboard -> Observability -> Query, filtered to 5xx) to know what's actually
failing before treating this as a live incident.

## Observability -- Middleware, Production, Last 12 Hours

| Metric | Value |
|---|---|
| Invocations | 162 |
| Middleware Action | `next` -- 167 requests (1 of 1 action types shown) |

**Duration panel (Average 80ms / P75 53ms / P95 100ms) is explicitly labeled "Demo Data" by
Vercel's own dashboard UI** -- these three numbers are Vercel's placeholder values, not real
measured latency, and are not reported as real evidence here. This is very likely a Vercel
Hobby/Pro-tier gating detail (the same screenshot shows an "Upgrade to Pro" prompt for
"Observability Plus... anomaly alerts, custom queries, 30-day retention"), not something wrong
with the app itself.

## Notes

- All three screenshots show the Vercel plan as **Hobby**, which caps retention and some
  Observability features (visible via the repeated "Upgrade to Pro" prompts).
- These are platform-level metrics (traffic, requests, function errors, middleware invocations),
  distinct from the application-level readiness tracking in `ACTIONABLES_READINESS_MATRIX.md` --
  recorded here as a dated snapshot, not tied to a specific actionable.
