# Mixpanel Investor Demo Live Event Proof -- 2026-08-15

## Summary

Mixpanel is now confirmed live for the Investor Demo deployment.

## Evidence

Founder added the Mixpanel environment variables to the Vercel project
`triaxis-product-investor-demo`, then performed a fresh production deployment. The Vercel project
link was restored afterward to the default Landing project, `triaxis-www-frontend-import`.

Founder then shared a Mixpanel setup screenshot showing:

- Events connected.
- Users connected.
- Replays not connected.

## Status

| Check | Status |
|---|---|
| Code-wired | Yes |
| Investor Demo production env configured | Yes |
| Fresh deploy after env setup | Yes |
| Live event/user data received by Mixpanel | Yes |
| Session replay | Not connected / not enabled |
| Autocapture | Likely not enabled through current app path |

## Interpretation

This confirms Mixpanel event and user ingestion for the Investor Demo. It does not confirm Mixpanel
session replay, and it does not mean the raw Mixpanel browser snippet was added to the application.

That distinction is intentional. AXXESS currently sends analytics through the existing sanitized
analytics abstraction (`MixpanelAnalyticsProvider`) rather than a direct `<script>` tag with
`autocapture: true` and `record_sessions_percent: 100`.

## Remaining Decisions

- Whether Mixpanel autocapture should be enabled at all.
- Whether Mixpanel session replay should be enabled.
- Which screens, if any, should be excluded from session recording because they may render tenant
  documents, stakeholder information, audit data, or other sensitive content.

