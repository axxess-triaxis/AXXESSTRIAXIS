# Observability

Sprint 12 adds PostHog-ready observability while preserving the existing analytics facade and Mixpanel compatibility.

## Implementation

- `src/services/analytics/PostHogAnalyticsProvider.ts`
- `src/services/observability/posthogTaxonomy.ts`
- `.env.example`

No PostHog SDK package is required. The lightweight adapter sends sanitized capture events to the configured PostHog host when `NEXT_PUBLIC_POSTHOG_KEY` is present.

## Environment

```text
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_ANALYTICS_DISABLED=false
```

## Dashboards

Executive dashboard events:

- Onboarding started
- Onboarding completed
- Feature adopted
- Dashboard widget loaded
- AI query submitted
- AI answer reviewed
- Retention checkpoint reached

Developer dashboard events:

- Dashboard widget loaded
- API latency recorded
- Route performance recorded
- Crash reported

Security dashboard events:

- AI query submitted
- AI answer reviewed
- Document retrieved
- Security event recorded
- Crash reported

## Privacy

The adapter reuses the existing analytics sanitizer. It blocks sensitive keys such as:

- Email
- Phone
- Token
- Secret
- Password
- Key
- Content
- Body
- Message
- Notes
- Document
- Address

## Operational Gaps

- Configure PostHog project and dashboards.
- Add backend API timing instrumentation.
- Add funnel definitions for pilots.
- Add alerts for auth failures, RLS failures, and AI review queues.
