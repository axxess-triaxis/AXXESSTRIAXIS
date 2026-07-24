# Mobile Store Credentials and D-U-N-S Dependency

Date created: 2026-07-24  
Product: AXXESS TRIaxis  
Company: Triaxis Ventures Private Limited  
Applies to: iOS App Store, TestFlight, Google Play Console, Android production/beta release, mobile CI/CD release readiness

## Executive Summary

iOS and Android store-release builds are not yet completing or progressing to full store-release readiness because the required company-owned keys, secrets, certificates, and credentials are not yet in place under the legal name **Triaxis Ventures Private Limited**.

This is an intentional governance decision.

Triaxis Ventures is not passively waiting for credentials, and it is not choosing the shortsighted path of releasing production mobile apps under the founder's individual name merely to impress investors or create an artificial launch signal.

The correct long-term path is to release and operate AXXESS TRIaxis under the company identity.

## Reason for Current Mobile Release Blocker

Apple Developer Program and Google Play Console company-account setup require company verification artifacts.

For Triaxis Ventures Private Limited, the immediate blocker is the pending issuance of a **D-U-N-S Number** by Dun & Bradstreet.

A D-U-N-S Number is required or commonly requested for company-account verification, especially for Apple Developer Program organization enrollment and related store/account governance.

## D-U-N-S Application Status

Triaxis Ventures Private Limited applied for a new D-U-N-S Number on:

**13 July 2026 at 8:40 AM IST**

The request was submitted to Dun & Bradstreet India.

Reference number:

**DR071320262903910840**

## Dun & Bradstreet Confirmation Email

The following confirmation was received from Dun & Bradstreet India.

Sender:

**DNBIndia-SystemAdmin@dnb.com**

Received:

**Monday, 13 July 2026, 8:40 AM IST**

Body:

> Dear Sir / Madam,
>
> Thank you for requesting a new D-U-N-S® Number for your business : **Triaxis Ventures Private Limited**
>
> The reference number of your request is: **DR071320262903910840**
>
> In case of further assistance, please contact us at  
> Email: **serviceindia@dnb.com**
>
> Best regards  
> Customer Experience Team  
> Dun & Bradstreet India

## Current Waiting State

As of 2026-07-24, no further communication has been received from Dun & Bradstreet India after the confirmation email.

The general turnaround time for free D-U-N-S issuance can be up to approximately 30 days.

This external dependency is therefore being tracked as a credential/governance blocker, not as a product-engineering failure.

## Governance Position

AXXESS TRIaxis should not be released under an individual founder account if the intended product owner and operating company is Triaxis Ventures Private Limited.

Releasing under an individual name may create future complications, including:

- Store ownership transfer friction.
- Brand/account mismatch.
- Investor due-diligence concerns.
- Enterprise buyer trust concerns.
- Government or sovereign stakeholder procurement concerns.
- Certificate and key migration risk.
- App ownership ambiguity.
- Future legal or tax/accounting complications.

The correct path is to complete company verification and release mobile apps under the company identity.

## Impact on Sprint Readiness

This affects:

- Android Beta readiness.
- iOS Beta readiness.
- Mobile store release gates.
- TestFlight readiness.
- Google Play internal/beta release readiness.
- Mobile analytics instrumentation across released apps.
- First-30-users analytics across all three beta surfaces.

## Engineering Status vs Credential Status

Engineering work can continue on:

- Capacitor/Expo/mobile shell readiness.
- Build scripts.
- Signing workflow scaffolding.
- Release gate documentation.
- Store listing materials.
- Screenshots.
- Privacy labels/data safety documentation.
- Mobile analytics event taxonomy.
- Artifact validation where credentials are not required.

But final store release cannot be honestly marked complete until:

- Company-owned Apple Developer credentials are active.
- Company-owned Google Play Console credentials are active.
- Required signing credentials/secrets are created and stored securely.
- TestFlight and/or Play testing tracks succeed under the company account.
- Store review or testing requirements are satisfied.

## Current Status Classification

| Area | Status | Reason |
|---|---|---|
| iOS TestFlight/App Store release | Blocked | Company Apple Developer credentials/D-U-N-S dependency pending |
| Android Play release | Blocked | Company Google Play Console credential path pending |
| Mobile build engineering | In progress / partially scaffolded | Build/release automation can continue without final store credentials |
| Company verification | External dependency | D-U-N-S request pending with Dun & Bradstreet India |
| Founder-name app release | Rejected as strategy | Avoids future ownership, governance, and due-diligence complications |

## Required Next Actions

1. Track D-U-N-S issuance against reference number **DR071320262903910840**.
2. Follow up with Dun & Bradstreet India at **serviceindia@dnb.com** if no response arrives within the expected turnaround window.
3. Use the issued D-U-N-S Number to complete Apple Developer Program organization enrollment.
4. Complete Google Play Console organization/account setup under Triaxis Ventures Private Limited.
5. Generate company-owned signing credentials.
6. Add mobile build/release secrets to the appropriate secure stores.
7. Re-run Android and iOS mobile release workflows.
8. Validate TestFlight and Play testing track readiness.
9. Update Sprint 5/QA3 readiness documents with evidence.

## Completion Criteria

This blocker can be marked resolved only when:

- D-U-N-S Number is issued.
- Apple Developer Program organization account is active, if required for the iOS release path.
- Google Play Console organization account is active, if required for the Android release path.
- Required signing credentials are generated under company control.
- CI/CD or local release tooling can create signed mobile artifacts using company-owned credentials.
- The app can be submitted to TestFlight/Apple review and Google Play testing/review under Triaxis Ventures Private Limited.

## Due Diligence Note

This document should be read as a governance-strengthening note.

The absence of completed mobile store releases as of 2026-07-24 is not due to lack of engineering intent. It is due to a deliberate decision to preserve company ownership, future transferability, enterprise trust, investor diligence clarity, and sovereign/government buyer credibility.

