# AXXESS TRIaxis -- Release Status, 2026-08-28

**Date:** 2026-08-28
**Workspace:** `C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`
**Purpose:** one dated snapshot across the program's four release surfaces (Web Enterprise, Web Lite, Android, iOS) plus the public company/product website, each ending in current state / evidence / remaining blocker / owner-action, per this repo's own evidence-chain standing rule (`CLAUDE.md`).
**Trigger:** founder status recap given this session, partly relayed through a Paxel (YC coding-telemetry tool) ChatGPT-sandbox conversation the founder pasted in. Per that same standing rule, every claim below is marked either **Verified** (checked against repo state, a live page fetch, a workflow log, or a screenshot shown directly in this session) or **Founder-stated, source artifact needed** (no independent check performed). This document does not upgrade the second category to the first by restating it.

## Executive Summary

The program has moved from single-surface hardening into four release surfaces converging in parallel, plus a public company/product site that has itself moved out of placeholder status:

| Surface | Current state | Status |
|---|---|---|
| Web Enterprise Beta 1.0 | Near release closure | **Verified** (see `TOP_LEVEL_READINESS_AND_GTM_SNAPSHOT_2026_07_31.md`, 86-91% band, unchanged this session) |
| Web Lite | Late-stage; last 5 Settings modules shipped and live-confirmed this session | **Verified** |
| Android Beta | Beta 0.9 (5) in Google Play Production + Open Testing review | **Verified** (screenshot shown in-session) |
| iOS Beta | Build 0.7.0 (1) in TestFlight, Apple Beta App Review pending | **Verified** (workflow logs, App Store Connect state) |
| Company/product website (`triaxisventures.com`) | Full multi-page company + product site, not a landing page | **Verified** (live fetch this session) |
| Total infra/domain/mail spend | "$360-380" | **Founder-stated, source artifact needed** |

## 1. Web Enterprise Beta 1.0

**Current state:** 86-91% readiness band, unchanged this session -- no enterprise-surface work was done in this session's scope (Lite Settings, iOS pipeline, and this ledger were the active threads).

**Evidence attached:** `docs/readiness/TOP_LEVEL_READINESS_AND_GTM_SNAPSHOT_2026_07_31.md` Readiness Board row "Web Enterprise Beta 1.0" -- auth/onboarding live, Google OAuth live, SMS auth live, live tenants, RAG/HITL workflows, dashboard, audit logs, Knowledge Hub, document indexing, tests, production deployments, live core integrations.

**Remaining blocker:** session-security deploy proof, RAG result-quality bug closure, tenant invite proof, final founder/QA walkthrough -- all as last recorded, not re-verified this session.

**Owner/action:** no action taken this session; next session should re-pull this band before quoting "90%" externally, since the founder's recap this session used a rounder figure than the repo's own last-verified 86-91%.

## 2. Web Lite

**Current state:** late-stage. The five real Settings modules (Profile, Organization, Audit Export, Integrations, Help & Support) shipped this session (PR #340), a production-breaking Suspense-boundary bug in Integrations was caught and fixed (PR #341), and the founder independently visually confirmed all five live on `lite.triaxisventures.com` with a real authenticated session (screenshots, this session) -- Profile populated, Organization correctly read-only/"Not set up yet", Integrations listing all connectors with no crash, Payments placeholder rendering as designed, Audit Export buttons present, Help & Support's three survey links present. AXXESS Lite Google OAuth (`FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` item #70) is fully closed -- founder confirmed a real completed Google sign-in with actual credentials.

**Closed this session:** Lite's shell (`LiteShell.tsx`) had **no sign-out control anywhere in the product** -- the header showed the display name as plain text with no click target, and none of the five new Settings pages had one either. Founder caught this live. Fixed, tested (`LiteShell.test.tsx`, 3/3 passing), full suite green (327/327 files, 1796/1796 tests, no flakes), production build clean, merged as PR [#343](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/343), and deployed -- `.github/workflows/deploy-production.yml`'s `deploy-lite` job completed successfully (not skipped this time; `deploy-investor-demo` also passed clean), new deployment `dpl_GcjKqUmtHgTZgkDjXVKm8TsxjTLi` confirmed live-aliased to `lite.triaxisventures.com` via `vercel inspect`. **Founder visually confirmed live** (screenshot, this session): the sign-out icon renders correctly next to "Triaxis Ventures" in the authenticated header on `lite.triaxisventures.com/lite`. Item fully closed, no outstanding verification.

**Evidence attached:** PR [#340](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/340), PR [#341](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/341), PR [#342](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/342) (merged, closes ledger #70), PR [#343](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/343) (merged, sign-out fix), founder's live screenshots (this session, unrecorded as separate files).

**Remaining blocker:** no self-serve pricing page, no dedicated acquisition channel, no signed/trial self-serve customer (unchanged from `TOP_LEVEL_READINESS...` GTM India self-serve row, 15-25%, not re-verified this session) -- that band describes go-to-market, not the product surface covered above, and should not be conflated with it.

**Owner/action:** consider whether Organization/Profile need a similar "did we miss an obvious control" pass given this was found live, not in review.

## 3. Android Beta

**Current state:** Beta 0.9, Version 5, in Google Play Console under **Production + Open Testing (in review)** -- founder-stated as running "since last 4 days," not independently re-timestamped this session.

**Evidence attached:** Google Play Console "Publishing overview" screenshot shown directly in this session (not saved as a repo artifact).

**Remaining blocker:** Google Play's own review timeline -- outside program control.

**Owner/action:** none pending on this program's side; check back once Play's review resolves.

## 4. iOS Beta

**Current state:** build **0.7.0 (1)** uploaded to TestFlight, visible in App Store Connect's External Testing group, status "Waiting for Review" as of the upload. Founder's recap this session says "sent into TestFlight Apple review yesterday" -- the actual upload (per this program's own workflow logs) completed 2026-08-27, consistent within a day of "yesterday" relative to this session.

**Evidence attached:** `FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` item #71 (five chained root causes fixed same day: API key auth, no registered device, two wrong signing-config turns reverted, binary-size threshold miscalibration, missing `IOS_UPLOAD_TO_TESTFLIGHT` repo variable), Apple's own `altool` log line `"UPLOAD SUCCEEDED with no errors"`, PRs #337, #338, #339 (merged).

**Remaining blocker:** Apple's Beta App Review (typically 24-48h) -- outside program control.

**Owner/action:** none pending on this program's side; check back once Apple's review resolves. The founder's separate, still-unscoped request ("convert iOS to native from webwrap, same as Android") remains open and undiscussed -- not part of this status.

## 5. Company/Product Website (`triaxisventures.com`)

**Current state:** a genuine multi-page company and product site, not a single landing page. **Verified by direct live fetch this session** (not merely founder-stated): the site presents distinct sections/routes for Founders, Pricing & Plans, Who We Build For, Why It Disrupts, Global South, and Privacy, states the company's positioning ("Triaxis Ventures builds governed AI products for work"), separates AXXESS TRIaxis's enterprise/demo/lite surfaces explicitly, embeds a product showreel, and carries a Founders Club waitlist CTA -- consistent with `project_founders_club_waitlist.md` and `feedback_investor_vs_landing_domain_standing_rule.md` (landing/investor domain-split doctrine already on record).

**Evidence attached:** live page fetch, `https://triaxisventures.com`, this session.

**Remaining blocker:** none identified from this pass alone -- this was a presence check (does the site exist and cover the stated sections), not a content-quality, SEO, analytics, or mobile-responsiveness audit. Those are explicitly **not yet checked** and should not be assumed clean from this document.

**Owner/action:** if the founder wants this claim externally quotable ("full company and product website"), a follow-up pass should add: screenshots per route, mobile-responsiveness check, and confirmation of which Vercel project/domain currently serves it (this program has a prior wrong-target Vercel deploy history worth re-checking against, per `project_infra_tier_upgrade_deferred.md` and this session's own Lite deploy-cascade-skip incident).

## 6. Cost

**Founder-stated, source artifact needed:** total out-of-pocket infrastructure and domain/mail spend "$360-380," including hosting and mail domains. Not independently verified this session -- no invoices, billing screenshots, or registrar receipts were checked. Unclear whether this figure includes or excludes Apple Developer Program / Google Play Console one-time or annual fees, AI tooling subscriptions, or other paid APIs; that scope ambiguity should be resolved before this number is quoted externally.

## What Would Make Each Surface Release-Ready

- **Web Enterprise Beta 1.0:** close session-security deploy proof, RAG result-quality bugs, tenant invite proof, final founder/QA walkthrough.
- **Web Lite:** sign-out fix shipped and visually confirmed live; remaining gap is a self-serve pricing page and dedicated acquisition channel distinct from the general waitlist.
- **Android:** wait on Google Play review; no program-side action.
- **iOS:** wait on Apple Beta App Review; no program-side action. Scope the deferred native-conversion request when the founder is ready.
- **Company website:** route-by-route screenshot pass, mobile-responsiveness check, Vercel project/domain confirmation, SEO/analytics proof if claimed externally.
- **Cost claim:** attach actual invoices/receipts before quoting "$360-380" as a verified figure in any external-facing document.
