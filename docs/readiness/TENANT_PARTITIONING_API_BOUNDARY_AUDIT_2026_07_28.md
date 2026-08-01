# Tenant Partitioning -- API Route Boundary Audit (Sprint TP-2, 2026-07-28)

Date: 2026-07-28
Governance source: Codex's "Sprint TP-2" prompt.
Scope: 62 total `route.ts` files under `src/app/api`. Only **one** accepts a resource ID via a
dynamic URL segment (`/api/repositories/[resource]`); every other route that accepts a resource ID
does so via a query parameter or request body field, not a path segment. This audit reads the
shared gateway route in full, plus every route implicated in this sprint's findings and every
route explicitly named in the sprint prompt's risk categories (RAG/document retrieval, AI review,
approvals).

## Audit Table

| Route | Auth Required | Tenant Source | Resource Ownership Check | Denied Behavior | Tests Exist? | Risk | Action |
|---|---|---|---|---|---|---|---|
| `GET/POST/PATCH /api/repositories/[resource]` | Yes (`getServerAuthSession(true)`, all methods) | `tenantScopeFromUser(session.user, session.accessToken)` -- always derived from the authenticated session, **never** from a client-supplied organization id anywhere in this route | Yes -- `updateResource` combines `id=eq.<id>` and `organization_id=eq.<scope.organizationId>` in the same PATCH query; a cross-tenant id matches zero rows and throws | PATCH: throws on 0 rows (surfaces as a 500-class error, not a silent no-op or leak); write role-gated via `canWriteResource` (403 if role insufficient) | No dedicated route-level test found before this sprint | Low | None -- already correct |
| `POST /api/ai/reviews` (GET/POST) | Yes | `session.user.organizationId` / `tenantScopeFromUser` | Yes, but **application-layer only** -- reads via a service-role client (RLS does not apply, per the route's own comment), `canViewAiReview`/`canDecideAiReview` are the sole gate | A review that doesn't exist and a review that exists but isn't the caller's return the *identical* 403 ("This review is not assigned to you.") -- does not confirm/deny another tenant's review id exists | New test added this sprint | **Medium** (single enforcement layer, no RLS backstop) | New test added; TP-3/future: direct unit tests on `canViewAiReview`/`canDecideAiReview` |
| `GET /api/admin/mobile-release`, `POST /api/admin/mobile-release` | Yes + `canManageOrganization` (403 if not Super Admin/Org Admin) | `session.user.organizationId` for the id; **was** a hardcoded `organizationName` regardless of tenant | Id-wise yes; the *name* field was not tenant-derived before this sprint | 401/403 correctly returned; the leak was a wrong display value, not a wrong record | New test recommended (not added this pass -- see remaining risks) | Was Critical, **fixed this sprint** | Fixed -- see closeout |
| `GET/POST /api/admin/pilot-acceptance` | Yes + `canManageOrganization` | `session.user` passed to `buildPilotAcceptanceRuntimeSnapshot`; **was** a hardcoded `organizationName` | Same as above | Same as above | Not added this pass | Was Critical, **fixed this sprint** | Fixed -- see closeout |
| `GET/POST /api/admin/customer-success/live-ops` | Yes + `canManageOrganization` | Derives `organizationName` from the pilot-acceptance runtime snapshot (transitively fixed) | Same as above | Same as above | Not added this pass | Was Critical, **fixed this sprint** (via the shared root cause) | Fixed -- see closeout |
| `POST /api/rag/query` | Yes | `tenantScopeFromUser`, passed to `answerTenantQuestion` alongside the already-scoped `documentsRepository`/`knowledgeArticlesRepository`/etc. -- no raw/unscoped query path | Inherited from the tenant-scoped repositories it calls (see Repository Boundary Audit) | Errors surface as 400 with a message, not a raw stack trace | New test added this sprint | Low | None -- already correct |
| `GET /api/approvals` | Yes | `tenantScopeFromUser` | Inherited from `approvalRequestsRepository` (explicit `organization_id` scoping, see Repository audit) | N/A (list endpoint) | No | Low | None |
| `POST /api/documents/storage-url` (upload/download signed URL) | Yes | `session.user.organizationId` | **Explicit path-ownership check**: `documentPathBelongsToOrganization(path, session.user.organizationId)` rejects any path not embedding the caller's own org id before ever creating a signed URL | 400/403 on a path that doesn't belong to the caller's org (exact status not re-verified this pass, but the check exists and runs before any Supabase Storage call) | Yes (this session, Knowledge Hub upload fix) | Low | None |
| `POST /api/beta-feedback` | Yes | `tenantScopeFromUser` | N/A (create-only from the caller's own scope) | N/A | Yes (this session, A-35/A-65 fix) | Low | None |
| `POST /api/invitations` | Yes + `canManageOrganization` | `session.user`/`tenantScopeFromUser` | N/A (create-only, scoped to caller's own org) | 403 if not permitted | Yes (this session, A-08 fix) | Low | None |
| `POST /api/auth/phone/start`, `POST /api/auth/phone/verify` | N/A (pre-authentication) | N/A | N/A | Honest "not enabled" error when unconfigured | Yes (this session) | Low (not a tenant-data route) | None |
| Remaining ~50 routes not individually re-read this sprint | Not verified this sprint | Not verified this sprint | Not verified this sprint | Not verified this sprint | Varies | **Unverified this pass** | See "What Was Not Individually Re-Verified" below |

## What Was Not Individually Re-Verified This Sprint

Of 62 total API routes, this audit directly read and verified 11 (the ones named above), chosen
because they were either (a) implicated in this sprint's actual findings, (b) explicitly named in
the sprint prompt's risk categories (RAG/document retrieval, AI review, approvals), or (c) the
single shared gateway route that the majority of simple CRUD resources route through. **The
remaining ~50 routes were not individually read this pass.** Given every route checked so far
follows one of two consistent patterns (either routes through the audited shared gateway/repository
layer, or independently derives `tenantScopeFromUser`/`session.user.organizationId` from a real
authenticated session rather than trusting client input), the architecture itself appears
consistent -- but this is an inference from a representative sample, not an exhaustive claim.
**A full route-by-route pass remains a legitimate TP-3/future recommendation**, particularly for
any route this sprint didn't touch that accepts a resource id as a body field (the same shape as
the `/api/ai/reviews` `reviewId` field) rather than a URL segment, since those are the least
mechanically obvious to grep for.
