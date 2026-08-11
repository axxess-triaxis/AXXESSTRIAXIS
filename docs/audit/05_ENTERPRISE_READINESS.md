# Phase 5 -- Security / Governance / Enterprise Readiness

This is the scoring phase Phases 2-4 explicitly deferred to. It synthesizes everything already found (auth, RBAC, RLS/tenant isolation, secrets, audit logging structure, rate limiting, dependency policy, the Q-004/Q-005 open issues) and adds five new areas investigated this phase: PII handling, data retention & deletion, encryption at rest/in transit, input validation coverage, and privileged-operation logging. Every item below is scored **READY / PARTIALLY READY / GAP / CRITICAL GAP / NOT APPLICABLE**, per the audit protocol's own vocabulary. **No certification or compliance status is claimed anywhere in this document** -- these are readiness assessments against what SOC 2 / GDPR / enterprise procurement / government deployment would typically expect, not certifications.

**Read this first:** this phase found the most severe issue of the audit so far. The account-deletion and data-export endpoints -- the mechanisms a GDPR/DPDP "right to erasure" claim would rest on -- are literal stubs that record a canned message and do nothing else. A genuinely well-designed erasure-planning module exists in the codebase but is never invoked by any production code path. This is scored CRITICAL GAP below and logged as a new question (Q-006).

---

## Scorecard

| Area | Score | Basis |
|---|---|---|
| **Authentication** | READY | Real Supabase-Auth-backed sessions, httpOnly cookies, 24h absolute cap, tested (Phase 2 Cluster 1, #1). Caveat, not a gap: `enableAuthShell=false` and Investor-Preview demo mode are real bypasses, but both are intentional, clearly-scoped non-production paths, not accidental holes. |
| **OAuth (sign-in + per-tenant connectors)** | READY | Real, tested, distinct code paths correctly separated (Phase 2 Cluster 1, #2a/#2b). Live-credential status varies per connector (see Phase 2 Cluster 4 supplementary table) -- that's a product-completeness question, not a security one. |
| **RBAC** | PARTIALLY READY | Real enforcement exists (DB-level RLS via `has_any_role`/`is_org_member`, plus `canManageOrganization` in a handful of routes) and is doing the actual work. But the more sophisticated-looking `tenantGuard.ts`/`enterpriseIam.ts` permission engine is fully built, unit-tested, and **never called from production code** (Phase 2 Cluster 1, #4) -- a governance story that looks stronger in code than it is in practice. |
| **Tenant isolation -- general CRUD resources** | PARTIALLY READY | Real production proof exists for 4 of 6 resource types via a genuine two-tenant adversarial harness run against production (Q-004, PARTIALLY CLEARED). 2 of 6 remain unverified due to a harness bug, and this proof is a one-time manual run, not a CI-integrated regression check. |
| **Tenant isolation -- RAG/AI knowledge retrieval** | **CRITICAL GAP** | The table an AI answer is actually grounded in is queried via an elevated-privilege client that bypasses row-level tenant isolation entirely -- a fundamentally different, weaker mechanism than the rest of the app, resting isolation on application-code discipline alone with no database backstop. This table was never covered by the harness that tested everything else (Q-005, OPEN ISSUE). Scored CRITICAL, not merely PARTIALLY READY, because a failure here would mean a tenant receiving an AI-generated answer synthesized in part from another tenant's confidential documents -- a materially worse failure mode than a stray row appearing in an admin list. *(Exact table/file-level detail redacted from this public copy.)* |
| **Secrets management** | READY | No hardcoded live secrets found via regex sweep; `.env.local` correctly gitignored; connector/OAuth secrets use real AES-256-GCM vaults with AAD binding, not plaintext columns (Phase 2 Cluster 5). |
| **Environment variable discipline** | PARTIALLY READY | Documented (`docs/ENVIRONMENT_VARIABLES.md`) with partial runtime enforcement (`assertRequiredEnv()`, per-service throw-on-missing checks) but no single centralized startup-time schema validator covering the full surface (Phase 2 Cluster 5). |
| **Audit logging -- general privileged operations** | PARTIALLY READY | Real, dual-layer (DB trigger + app-level) for role changes and invites, live in production, not just in theory (this phase, #5). But role-change audit metadata captures only the new value, not a before/after diff, and the tamper-evident hash-chain integrity module is built and tested but never wired into the actual write path (Phase 2 Cluster 1, #7). |
| **Audit logging -- AI-agent approval actions** | **GAP** | The AI agent tool-call approval flow -- the mechanism that lets a human gate what an autonomous AI agent can do to tenant data -- writes zero entries to the audit-log table used everywhere else as the system of record. No DB trigger covers it either. Who approved which agent action is reconstructable only from a different, non-audit-log table with no immutability protection (this phase, #5). |
| **PII handling** | PARTIALLY READY | Real, limited PII surface (email, display name, contact fields -- no SSN/DOB/government-ID fields found anywhere in 35 migrations). A classification/tagging system (`data_classification`, `retention_policies.classification`) exists in the schema but is never populated by any code path -- present in the type system, not enforced (this phase, #1). |
| **Data retention & deletion** | **CRITICAL GAP** | Both the account-deletion and data-export endpoints are one-line stubs that record a canned "will be processed manually" message and do nothing else -- one doesn't even log its own invocation. A genuinely well-designed erasure-planning module exists in the codebase but has zero production callers. No auto-purge/retention-period logic runs anywhere despite the schema being designed for it. Real, working cascade-delete behavior exists at the database level, but no application code path ever triggers it (this phase, #2). |
| **Encryption at rest** | PARTIALLY READY | Real AES-256-GCM vaults for connector/OAuth tokens specifically (READY for that subset). Everything else (tenant business data, uploaded documents) relies entirely on Supabase's platform-level disk encryption, which this repo cannot itself verify or configure -- not a gap in itself, but not something this audit can independently confirm either. The `encryption_profile`/`data_residency_region` organization fields are descriptive labels only -- no code branches on them, so they should not be represented as functional regional-encryption controls (this phase, #3). |
| **Encryption in transit** | READY | Delegated to Vercel's platform defaults (TLS termination, HTTPS enforcement on custom + `.vercel.app` domains), which is a reasonable and common choice. No explicit HSTS header is set in application code, but this does not mean transport is unprotected -- it means the guarantee is platform-level, not application-level (this phase, #3). |
| **Input validation** | **GAP** | `zod` is a declared dependency and is used **nowhere** in the entire monorepo (confirmed via repo-wide import search, not just the API-route sample Phase 2 checked). Validation that does exist is hand-rolled, present in some routes and absent or partial in others, with no consistent pattern (this phase, #4). Not scored CRITICAL because no evidence of an actual exploited injection/type-confusion vulnerability was found -- but the inconsistency itself is the gap. |
| **Rate limiting** | GAP | Confirmed absent across the entire API surface; a named, self-documented TODO in `docs/API.md`, not silently missing (Phase 2 Cluster 5). |
| **Dependency vulnerability management** | READY | Real, active Dependabot scanning plus a documented 7-day supply-chain cooldown policy with specific, justified force-patches for named alerts (Phase 2 Cluster 5). |
| **RLS policy coverage (schema breadth)** | READY | Near-total -- effectively 109 of 109 tenant tables have RLS enabled, verified past a regex gap by tracing a dynamic PL/pgSQL enablement loop by hand (Phase 2 Cluster 5). This is a strong result on its own; its value is undercut specifically for the RAG table by the service-role bypass above, not by policy coverage itself. |
| **Schema integrity / migration discipline** | PARTIALLY READY | Mostly sound (275 FK references across 27 of 35 files), but carries one concrete, dated defect: the `organization_id`/`tenant_id` redundant-column drift that has already caused two real production outages and remains unresolved today (Phase 4). |

---

## New founder questions raised by this phase

### Q-006

**Category:** Data privacy / regulatory readiness

**Question:** The account-deletion request flow and the data-export request flow both perform zero actual data operations today -- they record a canned message stating the request will be manually processed, and one of them doesn't even log its own invocation. A separately-built erasure-planning module that would do the real work (tombstone DB rows, delete storage objects, delete vector chunks, purge caches) exists in the codebase but is never called by any production code path. Is this a known, deliberate "beta-stage manual process" (i.e., deletion/export requests genuinely are handled by a human out-of-band today, just not through this code), or is this an unaddressed gap that hasn't been prioritized yet?

**Why this matters:** This is the mechanism a GDPR Article 17 ("right to erasure") or India DPDP-equivalent claim would rest on. If a real tenant or their end-user ever submits one of these requests today, nothing happens automatically, and (per this phase's evidence) there is no SLA, no execution log, and no verification step confirming a manual process actually completed.

**Current evidence:** [Redacted for public distribution -- exact endpoint/file paths withheld from this public copy. Full citation trail, including confirmation of zero production callers on the real erasure module, retained internally.]

**Possible interpretations:**
A. Known and accepted for beta stage -- a human genuinely processes these requests manually today, and wiring the automated pipeline is planned but not yet prioritized.
B. Not previously flagged -- an unaddressed gap that should move up in priority given any real customer/regulatory exposure.

**What evidence would resolve it:** Founder confirmation, plus (if interpretation A is correct) any record of a manual deletion/export request actually having been fulfilled for a real tenant to date.

**Founder answer:** _(blank)_

**Status:** OPEN

### Q-007

**Category:** AI governance / audit trail completeness

**Question:** The AI agent tool-call approval flow -- where a human approves or rejects what an autonomous AI agent is allowed to do to tenant data, and optionally grants standing "Always Allow" permission -- writes zero entries to the audit-log table that every other privileged action in the app uses as its system of record. No database trigger covers this table either. Is this intentional, or should this flow log the same way role changes and invitations do?

**Why this matters:** This is the human checkpoint for the single highest-autonomy surface in the product (an AI agent acting on tenant data). If a compliance reviewer or customer asked "show me every AI agent action a human has approved for this tenant, in one place," today's answer requires querying a table that isn't part of the audit system at all.

**Current evidence:** [Redacted for public distribution -- exact file paths withheld from this public copy. Full citation trail retained internally.]

**Possible interpretations:**
A. Deliberate -- the underlying tables were considered adequate as their own record, and adding a redundant audit-log write wasn't prioritized.
B. An oversight -- this should be logged the same way every other privileged action is, for consistency and single-source-of-truth compliance reporting.

**What evidence would resolve it:** Founder confirmation, and/or adding a real audit-log write to the approval-decide and grant-create code paths.

**Founder answer:** _(blank)_

**Status:** OPEN

---

## What Phase 5 establishes

- An explicit READY/PARTIALLY READY/GAP/CRITICAL GAP score for every security/governance/privacy area investigated across this and prior phases -- the severity judgment Phases 2-4 deliberately deferred to here.
- Two CRITICAL GAP findings: the RAG tenant-isolation bypass (Q-005, carried forward from Phase 3, now formally scored) and the non-functional data-erasure/export pipeline (newly found this phase, Q-006).
- One newly-found GAP-level finding not previously surfaced: the MCP agent-approval flow's missing audit trail (Q-007).
- Confirmation that several areas are genuinely strong and should be represented as such, not hedged: authentication, OAuth, secrets management, RLS policy breadth, and dependency vulnerability management are all scored READY on real, cited evidence.

## What Phase 5 does NOT establish

- Whether these gaps are blocking for any specific real deal, customer, or regulatory conversation currently in progress -- that requires founder/business context this audit doesn't have and shouldn't infer.
- A remediation plan or timeline for any CRITICAL GAP or GAP item -- that's a product/engineering prioritization decision, not an audit finding.
- Any claim that this system does or does not meet SOC 2 / GDPR / DPDP requirements as a certification matter -- this document scores *readiness*, not compliance status, per this audit's own standing rule.
