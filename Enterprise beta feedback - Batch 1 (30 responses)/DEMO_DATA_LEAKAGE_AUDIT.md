# Demo Data Leakage Audit — Ensuring Zero Dummy Data in Beta

**Date:** 2026-07-20
**Trigger:** explicit requirement that the beta/production experience must contain absolutely no
content from the investor-demo version.
**Scope:** `src/providers/serviceProvider.ts`, `src/services/live-platform/livePlatform.ts`, and
every feature page rendering hardcoded "demo" content.

## Executive summary

The app has a real, correctly-designed demo-mode system (`src/demo/demoMode.ts`:
`isDemoModeEnabled()`, gated by `NEXT_PUBLIC_AXXESS_DEMO_MODE` or a localStorage flag, plus a
dedicated demo login). Two pages (`KnowledgeHubSection.tsx`, `SettingsSection.tsx`) correctly gate
their demo-related behavior behind it.

**Everywhere else, that gate was not applied.** The audit found dummy data reaching real beta
customers through three distinct mechanisms, ranked by severity below.

## Finding 1 (Critical) — fake data silently substituted on any live-data error

`src/providers/serviceProvider.ts`'s `resilientRepositories` (the repository set used whenever
Supabase is configured and demo mode is off — i.e., **the normal beta/production path**) wraps
every repository method in `withDemoFallback(primary, fallback)`:

```ts
async function withDemoFallback<TValue>(primary: () => Promise<TValue>, fallback: () => Promise<TValue>) {
  try {
    return await primary();
  } catch {
    return fallback();
  }
}
```

`fallback` is always `demoRepositories.X`, unconditionally — for projects, tasks, meetings,
notifications, documents, organizations, users, invitations, audit logs, beta feedback, and
storage. **Any transient error on a live call** (a network blip, an expired session, an RLS
misconfiguration, a Supabase outage) causes the affected beta customer to silently see fabricated
demo content — fake projects, fake tasks, fake documents, fake org/user records — with no error
shown, no indication anything went wrong, and no way to tell it's not their real data.

This is the single most serious finding: it is not cosmetic, it is not confined to a labeled demo
strip, and it can happen to any real customer at any time a live call has a transient failure.

## Finding 2 (Critical) — a "live" metric that was never actually live

`institutionalRepository` is hardcoded to `demoRepositories.institutionalRepository` in **both**
`liveRepositories` and `resilientRepositories` (`serviceProvider.ts` lines 136 and 211) — there is
no real (Supabase-backed) institutional repository at all. This repository backs, among other
things, `getApprovals()`.

`src/services/live-platform/livePlatform.ts`'s `getLiveWorkspaceMetrics()` — the function that
computes the real-time metrics driving the Dashboard, the golden path, and
`TenantHealthCommandCenter` — uses this demo repository directly:

```ts
pendingApprovals: services.institutionalRepository.getApprovals().filter((approval) => approval.status !== "Completed").length,
```

Every real beta customer's "pending approvals" count is therefore sourced from fake institutional
data, indistinguishable from a real count. This number also feeds
`src/services/workflows/enterpriseGoldenPath.ts`'s `pendingAiReviews` calculation, meaning the
golden path's "Review AI output" step status (`needs-review` vs. `ready`) has been driven by fake
data for every real tenant, not just demo ones.

The same function also hardcodes `socialAlerts: 4` as a literal constant — not sourced from any
repository, real or demo, and identical for every tenant regardless of actual state.

## Finding 3 (High) — decorative demo content rendered unconditionally in feature pages

Grep-confirmed, not gated by `isDemoModeEnabled()`:

| File | Demo content | What a real customer sees |
|---|---|---|
| `DashboardSection.tsx` | `demoInstitution.organizationName` | The dashboard header's "eyebrow" text shows the fake organization name instead of the customer's real one |
| `DashboardSection.tsx` | `executiveDemoMetrics` | A row of fake executive metric cards, always rendered |
| `DashboardSection.tsx` | `demoRecentActivity` | The activity feed shows fabricated recent activity, not the tenant's real activity |
| `ProjectsSection.tsx` | `demoProjects` | A decorative strip of fake project cards above the real kanban/list view |
| `TasksSection.tsx` | `demoAuditTimeline` | A decorative strip of fake workflow-evidence cards above the real task table |
| `AIWorkspaceSection.tsx` | `fallbackRagAnswer` | Used as the **initial answer state** and as the **error fallback** — if a real customer's RAG query fails or their tenant has no ready documents yet, they see a fully fabricated institutional answer (fake district names, fake risk register citations) with no indication it's not real |
| `AIWorkspaceSection.tsx` | `aiMessages` (module-level constant from `institutionalRepository.getAiMessages()`) | Computed once at module load from the demo repository, shown regardless of tenant or mode |

By contrast, `KnowledgeHubSection.tsx` and `SettingsSection.tsx` correctly check
`isDemoModeEnabled()` before showing demo-specific behavior — proving the correct pattern already
exists in this codebase, it just wasn't applied consistently to every page.

## Why this happened (root cause, not blame)

The architecture appears to have been built demo-first: `resilientRepositories`' fallback-to-demo
design reads as a deliberate choice to keep the **investor-preview demo** resilient (never show a
broken screen during a live pitch). When the same repository set was reused for real beta/live
traffic (`selectedRepositories()` picks `resilientRepositories` whenever Supabase is configured and
demo mode is off — i.e., unconditionally for any real deployment), the demo-safety-net design
carried over unexamined into the real customer path. The individual feature pages' hardcoded demo
arrays look like leftover scaffolding from early development/demo-storytelling that was never
gated once real tenant data flows existed.

## Remediation — implemented

1. **`serviceProvider.ts`:** `withDemoFallback` renamed `withResilientFallback` and its fallback
   target changed from `demoRepositories.X` to `emptyRepositories.X` for every repository (`resilientTenantRepository`,
   `resilientMutableRepository`, and the manually-written organizations/users/documents/knowledge-search/
   invitations/audit-logs/beta-feedback/storage blocks). A live-call failure now surfaces as a genuine
   empty result, or a thrown error for mutations (matching `emptyRepositories`' existing
   "requires a connected data backend" behavior) — never fabricated content. The `demoFallbackScope`
   re-scoping helper was removed entirely; it's no longer needed since `emptyRepositories` doesn't
   require rescoping to a fake tenant identity.
2. **`institutionalRepository`** changed from `demoRepositories.institutionalRepository` to
   `emptyRepositories.institutionalRepository` in both `liveRepositories` and `resilientRepositories`.
3. **`livePlatform.ts`:** `getLiveWorkspaceMetrics()`'s hardcoded `socialAlerts: 4` changed to `0`
   (no live social-alerts repository exists yet). Added `getZeroLiveWorkspaceMetrics()` — an honest
   all-zero metrics shape, tested in `livePlatform.test.ts`.
4. **`useLiveWorkspaceMetrics.ts`:** the hook's initial state and its error-catch handler both used
   `getFallbackLiveWorkspaceMetrics()` (186 fake projects, 412 fake tasks, etc.) unconditionally.
   Now both call a new `initialMetrics()` helper that returns the demo fixture only when
   `isDemoModeEnabled()`, and `getZeroLiveWorkspaceMetrics()` otherwise. This is the highest-visibility
   fix in this pass — these are the headline numbers on the Dashboard, AI Workspace, and golden path.
5. **`DashboardSection.tsx`:** the header `eyebrow` no longer shows the fake org name
   ("North East Health Mission") to real tenants (falls back to "Your Organization" instead); the
   simultaneous "Demo" + "Live" badges collapsed to one badge reflecting actual mode; the
   `DemoDataNotice` banner, `executiveDemoMetrics` cards, and `demoRecentActivity` feed are now
   gated behind `isDemoModeEnabled()` (real tenants see an `EmptyState` in the activity feed
   instead).
6. **`ProjectsSection.tsx`** and **`TasksSection.tsx`:** the "Demo"/"Live" badge heuristic (previously
   inferred from `projects.length > 0`, which mislabeled a genuinely empty real tenant as "Demo") now
   uses `isDemoModeEnabled()` directly; the `demoProjects` / `demoAuditTimeline` decorative strips and
   their `DemoDataNotice` banners are gated behind it too.
7. **`AIWorkspaceSection.tsx`:** `fallbackRagAnswer` (fabricated "Dibrugarh biomedical maintenance"
   institutional answer with fake citations) is now only used in demo mode via a new
   `initialRagAnswer()` helper; real tenants get an honest empty `RagAnswer` and see "Ask a question
   above to see a governed, cited answer here." instead of a fabricated answer, both on initial
   load and if a query fails. Also removed a hardcoded fallback audit-trail ID
   (`"ai-audit-demo-0843"`) that appeared whenever a real answer had no real audit ID — the audit
   badge is now simply omitted in that case rather than showing a fake ID. The header's "Demo" badge
   and its `DemoDataNotice` are now gated the same way as the other pages. (`aiMessages`, sourced from
   `institutionalRepository.getAiMessages()`, was already fixed indirectly by item 2 above — it now
   resolves to `[]` for real tenants automatically.)

**Known, honest limitation introduced by this fix:** `pendingApprovals` and `socialAlerts` will now
read `0` for every real beta tenant until genuine live repositories for approvals and social alerts
are built. This is a capability gap being made visible, not created — the data was never real to
begin with, it just looked plausible before. Building a real approvals count (which may be
derivable from the AI Review Inbox's existing pending-review logic) is recommended as a P1
follow-up and should be added to `SPRINT_ROADMAP_PRE_DEMO.md` or a subsequent sprint.

**Test coverage, honestly:** `getZeroLiveWorkspaceMetrics()` has a dedicated test. The
`resilientRepositories` fallback behavior and the `isDemoModeEnabled()` gating added to
`useLiveWorkspaceMetrics.ts` and the four feature pages do **not** have new dedicated unit tests —
`serviceProvider.ts` and `useLiveWorkspaceMetrics.ts` had no prior test coverage to extend, and a
clean test would need to mock `featureFlags.enableSupabaseRuntime` (computed once at module import
from `process.env`), which is more test-infrastructure work than this pass covers. Verified instead
via `typecheck`, `lint`, the full existing suite (no regressions), and manual code review. Flagged
here as a follow-up, not silently skipped.

## Round 2 — full codebase sweep (triggered by "no dummy data anywhere, full pristine enterprise beta")

A systematic search for every import of `src/lib/demo/*` and `src/demo/*` across the entire
codebase (not just the four Sprint 1 pages) found five more feature pages and two more runtime
call sites with the same class of issue.

### `dashboard/data.ts` — the deepest instance found

This file bypassed the `serviceProvider.ts` fix entirely by importing `demoRepositories` directly
rather than going through `applicationServices`. Specifically:

- `getDashboardProjects(scope)` returned **fake projects for any real tenant with zero projects**
  (`if (projectRecords.length === 0) return getDashboardFallbackProjects();`) — a brand-new, empty
  customer would have seen fabricated project data instead of an honest empty state.
- `getDashboardKpis(scope)` had the same empty-tenant-shows-fake-data bug, and even in its
  "live" branch it mixed in `demoRepositories.institutionalRepository.getApprovals()` for the
  Pending Approvals number and a hardcoded literal `"2,200"` for RAG Sources Indexed — meaning
  the "real" data path was never fully real to begin with.
- Fixed: removed both empty-tenant fake-data branches (an empty tenant now gets real, honest
  zero/empty results — the existing `EmptyState` UI from Sprint 1 handles this correctly); the
  live KPI branch now computes a real document count instead of a hardcoded number, and honestly
  reports `0` pending approvals instead of fake ones; added `getZeroDashboardKpis()` for the
  error-catch path (demo fixture only when `isDemoModeEnabled()`).
- Also gated: `dashboardObjectives`, `dashboardAiRecommendations`, `governanceAlerts`,
  `workloadData`, `performanceData` — fully static fake arrays with no real backing at all,
  rendered unconditionally in `DashboardSection.tsx` (one governance-alert card even had a
  hardcoded "Live" badge on fabricated data). Now demo-mode-gated with `EmptyState` alternatives
  ("No strategic objectives configured yet.", "No AI recommendations yet.", etc.) for real tenants.

### Five more feature pages

`AnalyticsSection.tsx`, `ApprovalsSection.tsx`, and `StakeholdersSection.tsx` are, in their
entirety, illustrative content with **no live repository backing at all** — there is no live OKR
engine, no live approvals workflow (the Approve/Reject buttons only ever updated local component
state), and no live stakeholder/CRM repository. These three pages are now fully gated behind
`isDemoModeEnabled()`, with an honest `EmptyState` explaining the capability doesn't exist yet
("A live approvals workflow isn't wired to a connected data backend yet...", etc.) rather than
silently building a fake substitute.

`DocumentsSection.tsx` and `IntegrationsSection.tsx` are hybrids: document *ingestion* and
integration *health/OAuth status* are genuinely live already; only a decorative browse-list
(Documents) and a decorative connector gallery (Integrations) were sourced from the fake
institutional repository. Both were already resolving to `[]` for real tenants thanks to the
`serviceProvider.ts` fix earlier in this audit; added explicit `EmptyState` messaging so the now-empty
section reads as "nothing here yet" rather than a blank, unexplained gap.

### Two more runtime call sites fixed

- `pilotAcceptanceRuntime.ts`: already had a correct `seededPilotEvidence` demo/live split for
  readiness events, but its metrics computation fell back to fake data unconditionally on any
  live-fetch error. Fixed to only use the demo fixture when `seededPilotEvidence` is true, honest
  zero metrics otherwise.
- `src/app/api/admin/customer-success/live-ops/route.ts`: same pattern, fixed the same way using
  `isDemoModeEnabled()`.

### Reviewed and left as-is (not a leak)

`src/features/admin/EnterpriseAdminPage.tsx`'s `pilotAcceptancePreviewSnapshot()` and
`customerSuccessPreviewSnapshot()` functions are explicitly named "preview," use a hardcoded
`generatedAt` timestamp and demo organization/user IDs, and appear to be an intentional internal
admin tool for previewing what the pilot-acceptance/customer-success UI looks like — not something
presented as real data to an actual customer. Left unchanged; flagged here so it's clear this was
reviewed, not missed.

### Still not covered — recommended as a further follow-up

There are more files in `src/lib/demo/` (`demoDocuments.ts`, `demoWorkflow.ts`) and other
consumers of `src/demo/*` (`src/app/layout/TopBar.tsx`, `src/auth/AuthProvider.tsx`, `src/mocks/institutionalData.ts`
via `src/services/legacyInstitutionalViewRepository.ts`) not individually re-verified in this
round. Given the naming ("legacy", auth/topbar plumbing), these look lower-risk than the feature
pages already fixed, but should be confirmed rather than assumed before calling this fully closed.

### What "full pristine and complete enterprise beta" still requires beyond hygiene

Everything above stops fabricated data from being *shown*. It does not, and cannot by itself,
make Approvals, Stakeholders/CRM, Analytics/OKRs, or Documents browsing genuinely **live, linkable,
and feedable** in the sense of a complete working feature — those require real database schemas,
migrations, RLS policies, and repository implementations that do not exist today (confirmed: no
`approvalsRepository`, `stakeholdersRepository`, `okrRepository`, or `analyticsRepository` exists
anywhere in `src/repositories/`). That is a genuine multi-sprint product build, not a data-hygiene
fix, and should be scoped as its own tracked initiative rather than attempted piecemeal inside this
audit. Recommended candidates for that initiative, in rough priority order matching the original
beta feedback (documents/knowledge already has the strongest real foundation; approvals ties
directly to the AI Review Inbox's existing `pendingAiReviews` concept and is the most natural next
build): (1) a real approvals/governance repository, (2) a real stakeholders/CRM repository,
(3) a real OKR/analytics computation layer.
