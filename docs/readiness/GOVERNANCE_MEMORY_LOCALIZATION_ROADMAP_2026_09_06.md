# Governance, Memory & Localization Roadmap

Date created: 2026-09-06
Founder-stated build window: "in next few days"
Related reference: `docs/readiness/ADVANCED_RAG_AGENTIC_ARCHITECTURE_EVALUATION_2026_09_06.md`
(the broader, vendor-agnostic capability survey this roadmap draws its scoped priorities from)

## Objectives

Build depth into exactly five named priorities, in this order of stated emphasis:

1. **Immutable auditability** -- extend and surface a guarantee that already exists at the database
   layer, rather than assuming it needs to be built from scratch.
2. **Policy engine** -- formalize the access-control logic that already exists but is currently
   scattered inline, into one named, reusable, testable layer.
3. **Governance** -- the umbrella outcome of (1) and (2) together, plus a non-negotiable
   cross-cutting rule below.
4. **Contextual memory** -- give the product real, persistent memory across sessions, not just
   within a single RAG query.
5. **Local language scripts** -- genuine multilingual support, not just English, reflecting the
   India/GCC/Global South market this product is built for.

**Non-negotiable, applies to every item above:** every critical or consequential action --
anything that writes, deletes, discloses restricted data, or executes on a customer's behalf --
must have a Human-in-the-Loop approval gate. Routine, low-stakes actions may be automated end to
end; nothing critical is ever fully auto-approved. This is not a sixth phase; it is a review
criterion applied to every phase's own acceptance criteria below.

## Phase A: Immutable Auditability

**Status quo, confirmed by direct inspection, not assumed:** `audit_logs` (see
`supabase/migrations/20260702165736_initial_enterprise_schema.sql`) has row-level security enabled
with exactly two policies -- `audit_logs_admin_select` (Super Admin/Organization Admin read) and
`audit_logs_system_insert` (any org member can insert). **No UPDATE or DELETE policy exists for
this table at all.** Under Postgres RLS, an operation with no matching policy is denied outright --
so this table is already immutable at the database layer today, not a green-field build.

### Checklist

| ID | Action | Acceptance Criteria |
|---|---|---|
| GOV-A1 | Confirm the no-UPDATE/no-DELETE guarantee with a real negative test | A test (RLS persona suite) attempts an UPDATE and a DELETE against `audit_logs` as every role including Super Admin, and asserts both are rejected by Postgres itself, not just by application code |
| GOV-A2 | Add tamper-evidence beyond "cannot be edited" | Each row's hash (or a running hash chain) is computed at insert time, so a direct database-level intervention (e.g., a superuser bypassing RLS) is still detectable, not just prevented for normal roles |
| GOV-A3 | Extend audit coverage to every new write path Phases B and D introduce | Contextual-memory writes and any new localized-content writes are logged with the same fields (actor, action, resource, organization) as existing audit entries, not a parallel, uncovered path |
| GOV-A4 | Ship a real "immutable trail" viewer, not just backend guarantee | An admin-facing view lets an authorized user inspect the audit trail for a resource end to end, distinct from the existing `AuditLogsSection.tsx` list view if that view doesn't already serve this |

## Phase B: Policy Engine

**Status quo:** access-control logic is real and enforced today, but lives inline in specific
functions -- `governedRag.ts`'s `canRetrieveDocument()` for RAG, `src/security/rbac.ts` for
broader role checks. There is no single, named "policy engine" module that other features
(contextual memory, localized content) can call into consistently.

### Checklist

| ID | Action | Acceptance Criteria |
|---|---|---|
| GOV-B1 | Extract a single policy-evaluation interface | One function/module answers "can principal X perform action Y on resource Z," called by RAG retrieval, contextual memory reads, and any new localized-content access -- not three separate inline implementations |
| GOV-B2 | Migrate `canRetrieveDocument()` behind the new interface without changing its behavior | Existing RAG access-control tests pass unchanged after the refactor -- this is a structural extraction, not a policy-behavior change |
| GOV-B3 | Add policy-engine unit tests independent of any one feature | The policy engine has its own test suite asserting role/classification/visibility outcomes, decoupled from RAG-specific or memory-specific test files |
| GOV-B4 | Route every HITL-gated action through the same policy engine's "requires approval" signal | The engine returns not just allow/deny but also "allowed, but requires human approval" for actions marked critical, so HITL gating is a policy-engine concern, not ad hoc per-feature logic |

## Phase C: Contextual Memory

**Status quo:** no long-term memory store exists in the RAG retrieval path itself
(`governedRag.ts` is stateless per query). A related but narrower feature --
conversation memory scoped to the AI Workspace -- exists per `AIWorkspaceSection.test.ts`
(Sprint 4); read its actual implementation before building a second, possibly-duplicate memory
layer.

### Checklist

| ID | Action | Acceptance Criteria |
|---|---|---|
| GOV-C1 | Read and document what Sprint 4's AI Workspace memory actually does today | A short findings note confirms whether it already covers cross-session memory, or is scoped narrower (e.g., single-session context window only) |
| GOV-C2 | Decide storage approach against real requirements, not by default | `pgvector` inside the existing Supabase/Postgres instance is evaluated first (zero new infrastructure, no new data-residency question) before any standalone store; the decision and its reasoning are written down |
| GOV-C3 | Scope memory writes behind the Phase B policy engine and Phase A audit trail | Every write to contextual memory is policy-checked and audit-logged from day one, not retrofitted afterward |
| GOV-C4 | Define what "forgetting" means before shipping | A stated retention/deletion policy for stored memory (e.g., per-organization data lifecycle, right-to-deletion path) exists before memory is written to production, not after |

## Phase D: Local Language Scripts

**Status quo:** no i18n library, locale infrastructure, or multilingual content handling exists
anywhere in this repo today (`package.json` has no i18n dependency) -- this is a genuine
green-field capability, unlike Phases A and B.

### Checklist

| ID | Action | Acceptance Criteria |
|---|---|---|
| GOV-D1 | Name the actual target scripts before building generic i18n scaffolding | A short list of specific languages/scripts (e.g., Hindi/Devanagari, Assamese/Bengali, Arabic for GCC) is confirmed against real pilot/customer demand, not built as an unbounded "support everything" effort |
| GOV-D2 | Separate UI localization from RAG/retrieval-language handling | These are two different problems: translating interface text vs. retrieving and answering from documents written in a non-English script. Scope and sequence them as two distinct pieces of work, not one |
| GOV-D3 | Confirm the token-overlap similarity scoring in `governedRag.ts` degrades gracefully or is adapted for non-Latin scripts | Tokenization (`tokenize()` in `src/services/nlp/localNlp.ts`) is checked against real non-English sample text before claiming multilingual RAG support -- a naive word-splitting tokenizer built for English may not work correctly for the target scripts without changes |
| GOV-D4 | RTL layout support if Arabic is in scope | If GCC/Arabic is a named target script (per GOV-D1), UI components are checked for RTL rendering, not assumed to work by default |

## Cross-Cutting: HITL Verification

| ID | Action | Acceptance Criteria |
|---|---|---|
| GOV-X1 | Enumerate what counts as "critical" before building gates for it | A written list of actions considered critical (e.g., deleting an organization, disclosing a restricted document, an agentic action that writes to an external system) exists and is reviewed, not decided ad hoc per feature |
| GOV-X2 | Every Phase A-D feature's critical actions are checked against this list at review time | Code review for each phase explicitly confirms HITL gating is present for every action on the GOV-X1 list that the phase touches |

## Explicit Non-Goals for This Pass

- No new vendor/infrastructure adoption (vector DB, graph DB, agent framework) is committed by
  this document -- see the companion evaluation reference for that separate decision.
- No claim is made here that any of this is complete; every checklist item above is unchecked
  until closed out with the same evidence discipline (exact file, exact test, exact commit) this
  repo's other closeout documents already use.
