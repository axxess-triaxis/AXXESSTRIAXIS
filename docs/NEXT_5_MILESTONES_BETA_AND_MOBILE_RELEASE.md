# Next 5 Milestones - Enterprise Beta, Mobile Release And Analytics

## Purpose

This document defines the next five milestone gates for AXXESS after the canonical workspace migration and Claude Code beta QA remediation planning.

These milestones are deliberately written as completion gates, not aspirational roadmap labels. A milestone should not be marked complete until its stated evidence exists.

The five milestones are:

1. Enterprise Beta 1.0
2. iOS App Store Release
3. Android Google Play Release
4. Mixpanel And PostHog Integration Across The Three Betas
5. Analytics From The First 30 Users Across The Three Betas

## Milestone 1 - Enterprise Beta 1.0

### Definition

Enterprise Beta 1.0 is the first market-release beta of AXXESS as a usable enterprise operating product.

It is not merely a deployed build, a polished demo or a documented architecture milestone.

### Hard Completion Constraint

AXXESS can be considered Enterprise Beta 1.0 only if Triaxis Ventures Pvt Ltd, its own parent company, can onboard fully as the first real tenant.

The beta must also be audited end to end by Claude Code after tenancy is established.

The product should not feel unfinished to a serious beta user except for deep, refined or advanced features that are acceptable to defer beyond market-release beta.

### Required Tenant Journey

Triaxis Ventures Pvt Ltd must be able to complete:

- Sign up or receive first admin access.
- Log in with real authentication.
- Create or confirm the Triaxis Ventures tenant.
- Configure organization profile.
- Invite at least one additional user.
- Assign roles and departments.
- Upload or import knowledge.
- Ask AXXESS a tenant-grounded question.
- Review cited answer.
- Approve or reject an AI output.
- Create at least one task, project update or approval from the reviewed output.
- See dashboard state update.
- See audit evidence update.
- See workflow timeline evidence update.
- Sign out and sign back in successfully.

### Required Claude Code Audit

After Triaxis Ventures Pvt Ltd is onboarded as the first tenant, Claude Code must perform an end-to-end workflow audit against the live beta.

The audit must cover:

- Authentication
- Tenant onboarding
- User invitation
- RBAC
- Document or knowledge ingestion
- Governed RAG or AI answer workflow
- Human review
- Action creation
- Dashboard update
- Audit log update
- Timeline update
- Logout/session persistence
- Demo/live data separation
- Error states
- Mobile beta readiness surfaces where applicable

### Market-Release Beta Constraint

Enterprise Beta 1.0 should not feel unfinished in core workflows.

Acceptable post-1.0 refinements:

- Deeper analytics
- Additional connectors
- More advanced AI routing
- Additional regional compliance templates
- More sophisticated dashboard customization
- Expanded mobile polish
- Advanced automation and sandbox execution

Not acceptable for Enterprise Beta 1.0:

- Fake authenticated live tenant state
- Broken login/logout
- Indefinite loading on core workspaces
- Tenant write actions failing silently
- Demo data presented as live data
- Raw backend errors in user-facing UI
- Missing audit evidence for governed actions
- Inability to onboard Triaxis Ventures Pvt Ltd as tenant one

### Required Evidence

- Triaxis Ventures tenant exists in the live environment.
- At least two users exist with documented roles.
- One complete governed workflow is executed.
- Audit log evidence exists.
- Timeline evidence exists.
- Dashboard evidence exists.
- Claude Code audit artifact is stored in `docs/qa-artifacts`.
- Remediation checklist is updated after the audit.
- README, CHANGELOG and sprint log reflect Enterprise Beta 1.0 status.

### Completion Statement

```text
Enterprise Beta 1.0 is complete only when Triaxis Ventures Pvt Ltd has onboarded as the first live tenant and Claude Code has audited the resulting tenant workflow as market-release beta without core unfinished-product blockers.
```

## Milestone 2 - iOS App Store Release

### Definition

The iOS app milestone is complete only when Apple releases the AXXESS iOS app in the Apple App Store.

TestFlight availability alone is not completion.

### Hard Completion Constraint

The iOS milestone can be marked complete only after:

- TestFlight build succeeds.
- Full testing suite passes.
- App Store review submission is accepted.
- Apple releases the app in the App Store.

### Required Path

- Build iOS app from the monorepo mobile/Capacitor pipeline.
- Produce signed iOS artifact.
- Validate bundle identifier, version, build number and entitlement posture.
- Run full test suite.
- Run mobile release gates.
- Complete TestFlight testing.
- Prepare App Store listing, screenshots, privacy labels and reviewer notes.
- Submit to Apple App Review.
- Resolve any Apple review feedback.
- Confirm live App Store availability.

### Required Evidence

- TestFlight build ID.
- App Store Connect submission record.
- App Store review approval or release evidence.
- Final App Store URL.
- Test command results.
- Mobile release gate output.
- Screenshots and reviewer account evidence.
- Privacy label/data handling record.

### Not Enough To Mark Complete

- Local iOS build only.
- Capacitor sync only.
- TestFlight upload only.
- App Store Connect draft only.
- Passing repository tests without Apple release.

### Completion Statement

```text
The iOS milestone is complete only when Apple has released AXXESS in the App Store after TestFlight and the full testing suite.
```

## Milestone 3 - Android Google Play Release

### Definition

The Android milestone is complete only when Google releases the AXXESS Android app in the Google Play Store.

Internal testing, closed testing or generated AAB artifacts alone are not completion.

### Hard Completion Constraint

The Android milestone can be marked complete only after:

- Android signed build succeeds.
- Full testing suite passes.
- Google Play testing path is completed as required.
- Google Play review accepts the app.
- Google releases the app in the Play Store.

### Required Path

- Build Android app from the monorepo mobile/Capacitor pipeline.
- Produce signed AAB/APK artifact as required.
- Validate application ID, version code, version name and signing posture.
- Run full test suite.
- Run mobile release gates.
- Complete Play internal/closed/open testing as required.
- Prepare Google Play listing, screenshots, data safety form and reviewer notes.
- Submit to Google Play review.
- Resolve any Google review feedback.
- Confirm live Google Play availability.

### Required Evidence

- Signed AAB/APK artifact record.
- Google Play Console release record.
- Google review approval or release evidence.
- Final Google Play URL.
- Test command results.
- Mobile release gate output.
- Screenshots and reviewer account evidence.
- Data Safety record.

### Not Enough To Mark Complete

- Local Android build only.
- Generated AAB only.
- Firebase App Distribution only.
- Internal testing only.
- Passing repository tests without Google Play release.

### Completion Statement

```text
The Android milestone is complete only when Google has released AXXESS in the Google Play Store after the required testing path and full testing suite.
```

## Milestone 4 - Mixpanel And PostHog Integration Across The Three Betas

### Definition

This milestone establishes analytics instrumentation across:

1. Enterprise web beta
2. iOS beta/app
3. Android beta/app

Both Mixpanel and PostHog must be integrated consistently enough to compare activation, engagement, workflow completion and product friction across the three beta surfaces.

### Hard Completion Constraint

This milestone is complete only when Mixpanel and PostHog receive validated events from all three beta surfaces.

### Required Event Coverage

Minimum event coverage:

- User signed up
- User logged in
- Organization created or selected
- Invite sent
- Document uploaded or imported
- AI question asked
- AI answer generated
- AI answer reviewed
- Action approved
- Task/project/approval created
- Dashboard viewed
- Audit log viewed
- Error state viewed
- Demo Mode entered
- Logout completed

### Required Governance Controls

- No service-role keys exposed.
- No sensitive document body uploaded to analytics.
- No secrets, raw tokens or private credentials tracked.
- Tenant/user identifiers should use safe IDs or hashed identifiers where appropriate.
- Analytics opt-out or privacy posture must be documented.
- Event naming must be consistent across web, iOS and Android.

### Required Evidence

- Mixpanel project receives web events.
- Mixpanel project receives iOS events.
- Mixpanel project receives Android events.
- PostHog project receives web events.
- PostHog project receives iOS events.
- PostHog project receives Android events.
- Event dictionary is documented.
- Privacy/security review of event payloads is documented.
- Test events are visible in provider dashboards.

### Not Enough To Mark Complete

- SDK installed but no validated events.
- Web-only instrumentation.
- Provider docs added without runtime events.
- Tracking page views only.
- Events that include sensitive payloads.

### Completion Statement

```text
The Mixpanel/PostHog milestone is complete only when both analytics systems receive privacy-safe, validated workflow events from the enterprise web beta, iOS beta/app and Android beta/app.
```

## Milestone 5 - Analytics From First 30 Users Across The Three Betas

### Definition

This milestone uses analytics from the first 30 real users across the three beta surfaces to evaluate product activation, workflow completion, friction and readiness for broader market expansion.

### Hard Completion Constraint

This milestone is complete only after analytics from the first 30 real users are collected, reviewed and summarized across:

- Enterprise web beta
- iOS beta/app
- Android beta/app

The 30 users should not be purely internal test accounts unless explicitly documented as an internal-only cohort.

### Required Metrics

Minimum metrics:

- Signup/login completion
- Organization creation/selection
- Invite sent or accepted
- First document uploaded/imported
- First AI question asked
- First cited answer received
- First human review completed
- First approved action
- First task/project/approval created
- Dashboard return visit
- Audit log visit
- Session duration
- Drop-off point
- Error-state frequency
- Device/platform split
- Web/iOS/Android comparison

### Required Analysis

The 30-user analysis must answer:

- Where do users drop off?
- Which platform has the strongest activation?
- Which workflow is confusing?
- Which screens produce errors or dead ends?
- How often do users reach the governed AI workflow?
- How often does a user approve an AI output into real work?
- Which onboarding steps need simplification?
- Which features should be prioritized next?
- Whether the beta feels market-ready beyond internal users.

### Required Evidence

- Mixpanel cohort/export evidence.
- PostHog cohort/export evidence.
- First-30-user analytics report.
- Platform breakdown.
- Funnel analysis.
- Event-quality caveats.
- Product recommendations.
- Sprint follow-up plan.

### Not Enough To Mark Complete

- Analytics SDK installed but no cohort analysis.
- Fewer than 30 real users unless explicitly documented as an interim checkpoint.
- Internal founder-only usage.
- Page-view analytics without workflow-event analysis.
- Unreviewed dashboards.

### Completion Statement

```text
The first-30-users analytics milestone is complete only when privacy-safe analytics from 30 real beta users across web, iOS and Android have been collected, reviewed and converted into documented product decisions.
```

## Cross-Milestone Governance

Every milestone must update:

- `README.md`
- `CHANGELOG.md`
- `docs/SPRINT_LOG.md`
- Relevant deployment, analytics, mobile and QA documentation

Every milestone must record:

- What changed
- Why it changed
- Evidence collected
- Tests run
- Provider dashboards or release records used
- Remaining risks
- Follow-up sprint recommendations

## Current Status

```text
Milestones documented.
Enterprise Beta 1.0 not yet complete.
iOS App Store release not yet complete.
Android Google Play release not yet complete.
Mixpanel/PostHog three-beta integration not yet complete.
First-30-users analytics milestone not yet complete.
```
