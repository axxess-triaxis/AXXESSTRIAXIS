# Claim Evidence Ledger

Governed by: `CLAUDE.md` (The Evidence Chain -- Standing Rule, esp. hard rule #4: tag founder-stated
claims explicitly). Created 2026-08-17. This is the ledger version of a discipline this program already
applies ad hoc (e.g. survey-reported pricing willingness never treated as a signed commitment) --
collected here so "what wording is this claim allowed to use" is answerable in one place.

## Row schema

| Claim | Allowed wording | Evidence | Unsupported wording | Status |
|---|---|---|---|---|

## Seeded entries, using this program's own existing documented examples

| Claim | Allowed wording | Evidence | Unsupported wording | Status |
|---|---|---|---|---|
| Pitch Karo India result | "Top 500 of 7,000+ applications, applied at idea stage" (organizer-confirmed) | `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md`, entry #33 update, 2026-08-17 | "Attended/pitched at Bharat Mandapam" -- explicitly did not attend (founder declined due to cost); a post-event wrap-up email implying attendance was flagged as an inconsistency, not treated as fact | Supported (selection result), flagged inconsistency documented, not silently resolved |
| Surge/Peak XV, Slingshot 2026, Focal.vc outcomes | "Applied and did not advance" plus founder's own stated probable cause per applicant (deeptech mismatch, US/Canada-only investment focus, sub-1% acceptance rate without traction) | `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md`, entries #42-44 | "Rejected due to product weakness" or any causal claim beyond the founder's own stated reasoning, since the actual selection criteria were not independently confirmed by the accelerators | Supported (application + outcome), causal reasoning explicitly labeled as founder-stated |
| Pilot readiness / investor demo | Live 2026-07-25 investor demo completed; work now targets beta 0.7 (memory `project_scope_demo_signoff_beta_focus.md`) | Session record, `docs/readiness/*` closeout docs from that period | "Production-ready" as a general claim -- beta 0.7 status is conditional per `docs/readiness/QA3_READINESS_KANBAN.md`-style gating, not a blanket readiness claim | Conditional |
| Product Analytics real-data build (this session) | "Activation Funnel and Most Used Modules now read real per-tenant data from `pilot_readiness_events`/`module_usage_events`" | `docs/readiness/EVIDENCE_INDEX.md` row `PROD-ANALYTICS-REAL-DATA`, PR #264, 18/18 tests passed | "Live-verified with real tenant usage data" -- deployment and tests confirmed, but no real (non-demo) tenant has yet generated activity to populate the honest-empty-state UI, so the *rendering of actual non-zero data* is unverified, only the code path and empty-state behavior are | Deployed; live non-empty-state behavior unverified |
| Invitation email fix status | "A temporary diagnostic log is deployed to identify the root cause" | `docs/readiness/EVIDENCE_INDEX.md` row `INVITE-EMAIL-DIAG`, PR #266 | "Fixed" -- the underlying bug is not yet resolved; two prior attempts (API key rotation, forced rebuild) did not resolve it | Deployed, pending live diagnostic read; NOT closed |
| MCP / Agentic tooling live status | Not asserted in this pass -- not independently re-verified | N/A this session | "MCP is live" without a specific tool-call proof | Pending re-verification (see `docs/readiness/PRODUCT_SURFACE_BOUNDARY_MAP.md` follow-up) |

## How to use this

Before a status update or founder-facing summary uses a claim about traction, readiness, or a shipped
feature, check whether it already has a row here. If the wording being used matches the "Unsupported
wording" column, it should not be used -- restate using the "Allowed wording" column instead, or add a
new row if this is a genuinely new claim.
