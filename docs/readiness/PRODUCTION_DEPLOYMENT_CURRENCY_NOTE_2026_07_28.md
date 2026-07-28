# Production Deployment Currency Note

Date: 2026-07-28 17:02:16 +05:30  
Product deployment: `landing.triaxisventures.com` / Vercel Product-Beta project  
Local repository HEAD at note time: `343620f`

## Status

The last production deployment previously serving `landing.triaxisventures.com` was reported as built from commit `e658fe6` (phone/OTP and Google OAuth flag deployment, approximately six hours before this note).

Everything after `e658fe6` had been shipped to the repository but not yet reflected in the live Product/Beta deployment.

The Product/Beta project has now been deployed with all pending commits through local HEAD `343620f`.

Status label for this record:

**Shipped but undeployed -> now deployed.**

## Deployment Evidence

| Field | Value |
|---|---|
| Project | `triaxis-www-frontend-import` |
| Production URL | `https://landing.triaxisventures.com` |
| Deployment ID | `dpl_GPQHYbu6A8PGMi8xWc9SEtkLC52Y` |
| Status | `READY` |
| Alias | `landing.triaxisventures.com` |
| Built from commit | `343620f` |
| Branch | `canonical/sprint-1-35-unified-gitlab` |

Confirmed by HITL on 2026-07-28 after the production deployment completed.

## Pending Commit Chain Since Last Production Deploy

| Commit | Category | Deploy relevance | Notes |
|---|---|---|---|
| `c5b118e` | Documentation | No | Records Google OAuth going live. |
| `da91712` | Documentation | No | YC metrics snapshot. |
| `b5ed523` | Documentation | No | Readiness percentage figures. |
| `bf3d98e` | Product code | Yes | TP-1 / A-28 fix: Settings Organization tab now uses real tenant organization data; AI Configuration tab is honestly labeled. |
| `da5d94c` | Product code | Yes | TP-2 / A-69 fix: Mobile Release, Pilot Command Center, Customer Success Live Ops organization-name leaks fixed; AI Workspace no longer auto-runs demo RAG query for real tenants; new `getRuntimeMode()` helper. |
| `c37d3c3` | Product code | Yes | Merge from `main`: server-side PostHog analytics for login/signup identify and capture, combined with existing auth error handling. |
| `7bf1e5a` | Build/dependency | Yes | Downgrades `next`, `posthog-js`, and `posthog-node`; build-relevant dependency stabilization, no intended functional behavior change. |
| `343620f` | Documentation | No | LOI tracking log. Current local HEAD at note creation. |

## Deployment-Relevant Changes

The deployment-relevant commits are:

- `bf3d98e`
- `da5d94c`
- `c37d3c3`
- `7bf1e5a`

These contain the production-impacting code/build changes that were shipped locally but not yet live on `landing.triaxisventures.com` before the current deployment attempt.

## Expected Live Effect After Deployment

Once the deployment reaches READY and is aliased to `landing.triaxisventures.com`, the live Product/Beta environment should include:

- Settings Organization tab no longer leaking investor-demo organization data into real tenants.
- AI Configuration tab using honest state instead of placeholder claims.
- Additional organization-name leakage fixes in Mobile Release, Pilot Command Center, and Customer Success Live Ops.
- AI Workspace no longer auto-running a demo RAG query for real tenants.
- Centralized runtime-mode detection through `getRuntimeMode()`.
- Server-side PostHog identify/capture for login/signup events.
- Dependency-version stabilization required for clean deployment/build behavior.

## Post-Deployment Verification Required

Deployment currency is now closed. Product behavior still needs live walkthrough verification:

- Triaxis Ventures tenant Settings > Organization no longer shows `North East Health Mission`
- Investor/demo deployment remains unaffected
- login/signup analytics do not break auth flow

## Open Monitor

PR `#156` CI-check monitoring timed out after 30 minutes without settling. Re-check separately after the production deployment completes.
