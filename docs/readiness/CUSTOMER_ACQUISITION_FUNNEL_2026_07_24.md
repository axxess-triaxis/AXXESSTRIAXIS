# Customer Acquisition Funnel (2026-07-24)

This document records the founder's explicit go-to-market funnel design for the newly-separated Website / Product / Demo hosting architecture (see `docs/readiness/HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md` for the technical hosting split this funnel runs on top of). It is a product/business design record, not an implementation status report -- items marked "not yet built" are intentions, not claims.

## Funnel Stages

### 1. Acquisition channels -> Website

Traffic sources driving visitors to `www.triaxisventures.com`: SEO, LLM-assistant suggestions (e.g., being surfaced by AI chat tools when someone asks about enterprise workflow/governance platforms), Google Ads, Meta Ads, LinkedIn Ads. **Status: not yet built** -- no ad campaigns, SEO program, or LLM-visibility work exists in this repository today. This is the intended top-of-funnel entry point once marketing spend begins.

### 2. Website -> two prominent, adjacent tabs

The Website (`axxesstriaxis`, root `/`) presents two clearly separated, adjacent calls to action:

- **"For Investors"** (prominent tab) -> `www.triaxisventures.com/investor` -- the Demo product, fully populated with illustrative dummy data, fully clickable across every module.
- **"Beta Sign Up"** (prominent tab, placed next to it) -> `www.triaxisventures.com/landing` -- the Product (live, pristine, real-signup SaaS entry).

This ordering and adjacency is deliberate: a visitor is expected to explore the Demo first (lower commitment, no signup required, "some fields fillable... fully clickable between screens" per the founder's own description), then either convert directly into Beta Sign Up or leave.

### 3. Demo exploration -> convert or drop off

A visitor on the Demo (`/investor`) clicks around the fully-populated, dummy-data product. Two outcomes:

- **Converts**: clicks through to Beta Sign Up (`/landing`) and signs up.
- **Drops off**: leaves without signing up.

### 4. Drop-off re-engagement (threshold-based)

Visitors who drop off but spent meaningful time on the Website and/or Demo above a defined engagement threshold receive a founder-sent welcome/nudge email inviting them to sign up. **Status: not yet built.** This requires: (a) session-duration/engagement tracking on the Demo specifically (see Analytics section below), (b) an email capture point before or during the Demo visit (currently no such capture exists -- the Demo, as built, requires no email/contact info to explore), and (c) an email-sending mechanism and a defined threshold. The "for investors and those who want an enterprise demo" contact form (Stage 6) is the only current email-capture point; a broader "capture email during self-serve demo browsing" mechanism does not yet exist and would need to be designed before this re-engagement email can fire in practice.

### 5. Signup incentive structure (pricing/promotion tiers)

Applied at the point of Beta Sign Up (`/landing`) conversion:

| Cohort | Offer |
|---|---|
| First 300 signups | 1 year free, then full price |
| All signups after the 300th | 1 month free trial -> 3 months at 50% off -> full plan or drop off |

**Status: not yet built.** This repository's current billing/subscription surfaces (Stripe wrapper connector, `enterpriseConnectorVault.ts` per `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` S4) support encrypted credential storage for a Stripe connection, but no cohort-counting, trial-clock, or graduated-discount billing logic exists yet. Implementing this requires: a signup-order counter (first-300 detection), a trial/discount state machine tied to each organization's billing record, and Stripe (or equivalent) subscription logic to actually apply free/discounted pricing over time.

### 6. Enterprise / investor contact path (sales-assisted, not self-serve)

Separate from self-serve Demo browsing, there is a lead-capture form specifically for investors and prospective enterprise customers who want a guided demo, routing to the sales team rather than self-serve signup. **Status: not yet built.** No such form exists in this repository today. The eventual home for this is most likely the Demo (`/investor`) experience itself (a "Talk to sales" / "Request enterprise demo" call to action alongside the self-serve clickthrough), but the exact placement has not been decided.

### 7. CRM (future)

Leads from the enterprise/investor contact form (Stage 6) are intended to eventually flow into a CRM (Zoho or equivalent). **Status: not yet built**, explicitly deferred ("Later we implement CRM like Zoho"). Until this exists, any contact-form submissions would need a interim destination (e.g., a notification email or a database table) -- not yet decided.

### 8. Analytics: Demo-only tracking, by design

Mixpanel and PostHog track usage and sessions **on the Demo product specifically**, not on the primary/live Beta product. This is a deliberate privacy design choice, stated explicitly by the founder: it gives product-iteration signal (session behavior, click paths, drop-off points) without exposing real paying customers' usage to third-party analytics tools or triggering cookie/privacy complaints on the primary product.

**Current codebase state, verified:** `src/services/analytics/` already has a full provider abstraction (`MixpanelAnalyticsProvider`, `PostHogAnalyticsProvider`, `MockAnalyticsProvider`, `AnalyticsProviderShell`) used throughout the app today, including on the real, live Beta product's pages (`src/app/App.tsx` dispatches `app_opened`, `beta_session_started`, `module_opened`, `dashboard_viewed`, etc. on every authenticated session, regardless of demo/live). **This means the current instrumentation does not yet honor the "Demo-only tracking" design** -- analytics currently fire identically on both the Demo and the live Beta product, via the same `useAnalytics()` hook and the same provider configuration, with no code path that distinguishes "this session is running in a Demo deployment" from "this session is running in the live Product deployment." Implementing the founder's intended split-tracking design requires either: (a) only configuring `NEXT_PUBLIC_MIXPANEL_TOKEN`/`NEXT_PUBLIC_POSTHOG_KEY` on the Demo project's environment variables and leaving them unset on the Product project (the existing `MockAnalyticsProvider` fallback, confirmed in `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`'s Sprint 4 notes, already safely no-ops when a token is absent -- this is the simplest, lowest-risk way to achieve the split with zero code changes), or (b) an explicit code-level check gating analytics dispatch by deployment mode. Option (a) is the recommended path since it requires no application code changes -- only environment variable configuration per project.

## Open Items Requiring Further Design (Not Yet Actioned)

- Email capture mechanism during Demo browsing (needed for Stage 4's re-engagement email).
- Engagement-threshold definition (time on site, pages viewed, or a specific interaction) that triggers the re-engagement email.
- Cohort-counting and trial/discount billing state machine (Stage 5).
- Enterprise/investor contact form: exact placement, fields, and interim lead destination pending CRM (Stages 6-7).
- Analytics environment-variable split: confirm `NEXT_PUBLIC_MIXPANEL_TOKEN`/`NEXT_PUBLIC_POSTHOG_KEY` are set only on the Demo project (`triaxis-product-investor-demo`) and absent from the Product project (`triaxis-www-frontend-import`), once both are live.

This document will be updated as each stage moves from design to implementation.

## Update (2026-08-04): Founders Club waitlist launched

Founder-stated: a public waitlist page has been launched and is being actively promoted --
https://getlaunchlist.com/pages/axxess-triaxis-founders-club-edition ("AXXESS TRIaxis -- Founders
Club Edition"). This is an externally-hosted LaunchList page, not a page in this repository -- no
application code change accompanies this entry. Recorded here as the current, real interim
signup/waitlist-capture mechanism (separate from the not-yet-built self-serve "Beta Sign Up" flow
in Stage 2/5 above, and separate from Stage 6's not-yet-built enterprise/investor contact form).

Founder-stated promotion channels for this waitlist link: Facebook, Instagram, LinkedIn, WhatsApp,
WhatsApp Business -- all organic/manual promotion, not the paid ad channels (Google/Meta/LinkedIn
Ads) described as "not yet built" in Stage 1 above.

Founder-stated: this is a **non-founder-led, public-facing** funnel -- distinct in kind from the
founder's own personal pitch/investor/pilot outreach calls tracked in
`docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md`. It is a separate, standing public
acquisition channel, not a one-off conversation.

Signup counts, conversion data, and CRM hand-off status from this LaunchList page are
Founder-stated, source artifact needed -- not independently verified from this repository.
