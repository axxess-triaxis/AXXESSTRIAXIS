# Founder Questions -- AXXESS TRIaxis Forensic Progress Audit

Live tracking file per the audit's Founder Query Protocol. Every uncertainty encountered during the audit is logged here with a question ID, not resolved silently. Nothing here is answered by inference -- only by direct founder response, logged verbatim in the FOUNDER ANSWER field.

Status vocabulary: `OPEN` (awaiting founder answer) / `ANSWERED` (founder responded, recorded verbatim) / `RESOLVED` (answer plus, where required, corroborating evidence now exists) / `PARTIALLY CLEARED` (founder-directed label for an issue with real, verified evidence covering part but not all of what the question asked -- used when a full RESOLVED would overstate what's actually covered).

---

## Q-001

**Category:** Audit scope and pacing

**Question:** This audit's protocol specifies 19 phases producing 20+ documents (baseline, repo forensics, product capability matrix, AI/agentic architecture, architecture audit, enterprise readiness, test/reliability audit, customer iteration, commercial evidence, usage/observability, mobile readiness, engineering velocity, capital efficiency, founder execution, claims register, YC delta, red-team, maturity scorecard, final executive audit, machine-readable evidence). How do you want this sequenced -- all phases attempted in this session, phase-by-phase with your review between each, or a specific subset prioritized first (e.g., Phase 14 Claims Register and Phase 8 Commercial Evidence, since those are the ones most likely to surface externally-facing claims needing correction)?

**Why this matters:** Determines whether I proceed phase-by-phase without further prompting, or stop after each phase for your sign-off. Given the volume of judgment calls this protocol requires me to route through you (per its own "ask aggressively" rule), running all 19 phases unattended risks producing a large batch of unresolved Q-IDs you'd have to answer all at once rather than incrementally.

**Current evidence:** N/A -- this is a process question, not a factual one.

**Possible interpretations:**
A. Run all 19 phases now, batch all resulting questions at the end.
B. Run one phase at a time, present findings + open questions, wait for your answers before the next phase.
C. Prioritize a specific subset (e.g., Claims Register, Commercial Evidence, Red Team) since those most directly affect what can be said externally.

**What evidence would resolve it:** Your direction.

**Founder answer (2026-08-10):** "all phases attempted before you review anything, phase-by-phase with your sign-off between each - This is ideal" -- read as: within each phase, complete the work without pausing to ask conversationally (log open questions to this file per the protocol instead); present the completed phase for sign-off before starting the next one. This is option B, with the clarification that in-phase execution should not be interrupted by chat-level questions.

**Status:** ANSWERED

---

## Q-002

**Category:** Audit scope / historical completeness

**Question:** Does this repository represent the complete history of AXXESS TRIaxis's product development, or did meaningful work happen before 2026-07-02 (the first commit) outside this repository?

**Founder answer (2026-08-10):** "This repo contains 100% of AXXESS."

**Status:** ANSWERED -- repository age (39 days as of this audit) is confirmed to equal company/product age, not merely the most recent slice of a longer history.

---

## Q-003

**Category:** Repository forensics / author identity

**Question:** Is the `Triaxis Ventures <noreply@triaxis.ventures>` git identity (435 of 669 commits, 65%) the founder?

**Founder answer (2026-08-10):** "Yes."

**Status:** ANSWERED -- all 5 human-labeled git identities (per Phase 0's email-level breakdown) are now confirmed as the same person. 669 of 669 non-bot-attributed commits (618 after excluding the 51 dependabot + 3 Vercel + 1 vexo-ai + 1 posthog bot commits = 618 human commits) are the founder's.

---

## Q-004

**Category:** Enterprise readiness / security posture

**Question:** The RLS *policy design* across all ~109 tenant tables looks sound and well-evidenced (near-universal `organization_id` scoping, RLS enabled, JWT-scoped PostgREST calls rather than service-role bypass). But Phase 2 found no automated test that actually executes against a live database to prove tenant A cannot read tenant B's data -- the 14 existing "RLS test" files only assert that policy SQL text was written, and the one file designed to be a real live-persona test has every assertion commented out. Is this a known, accepted gap (e.g., isolation has been manually/informally verified some other way not captured in this repo), or is this a genuine, previously-unflagged gap that should be treated as a priority fix?

**Why this matters:** This is the single highest-stakes correctness property for a multi-tenant SaaS selling to enterprise/government buyers. It directly affects Phase 5 (Enterprise Readiness) scoring and Phase 16 (Red Team) analysis.

**Current evidence:** `src/security/rlsPolicies.test.ts` and 13 sibling files use `readFileSync`+`toContain` against migration SQL text, not live-DB execution. `supabase/tests/rls_persona_tests.sql` has every real assertion commented out. `bitrise.yml`'s `supabase_rls_tests` CI job only checks the file exists.

**Possible interpretations:**
A. Isolation has been informally/manually verified (a `TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_06.md` doc exists elsewhere in this repo and has not yet been read/verified by this audit) and this is a documentation/CI-automation gap, not a correctness gap.
B. This is a genuine, previously-unflagged testing gap that should be prioritized.

**What evidence would resolve it:** Founder confirmation, plus pointing this audit at any existing manual isolation verification so it can be independently checked in a later phase.

**Founder answer (2026-08-10):** "This was tested, 4 out of 6 criteria passed (refer Git docs)."

**Independently verified against `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_06.md`:** the founder's claim is accurate and directly corroborated. On 2026-08-06, `scripts/verify-two-tenant-isolation.mjs` (written Sprint 5, 2026-07-22, but never previously executed against a real database) was run against the actual **production** Supabase project backing `landing.triaxisventures.com`, using two throwaway test tenants with real, non-privileged access tokens (not a service-role bypass) -- i.e., real RLS policies decided every outcome, not application code or a mock.

**Results, exactly as documented (run ID `mshjon07`):**
- `projects`, `tasks`, `documents`, `audit_logs` -- **4 of 6 resource types, both cross-tenant read AND write blocked, zero leakage found.**
- `knowledge_articles`, `workflow_timeline_events` -- **not verified**, because tenant A's own row-creation attempt failed before isolation could even be checked (a harness/fixture bug: `knowledge_articles` rejected the create with a `403` RLS violation on the *owning* tenant's own insert, flagged in the doc itself as deserving a closer look to rule out the RLS policy being overly strict rather than assumed to be a fixture-payload issue; `workflow_timeline_events` failed on an unrelated foreign-key issue in the test fixture).
- The harness's own cleanup step had a real bug (wrong delete order, left test rows in production), diagnosed and manually cleaned up the same session (24/24 deletes verified), but not yet patched in the script itself.
- This was a **single run**, not a repeated or CI-integrated regression check.

**Status:** PARTIALLY CLEARED (founder's own tracking label) -- real, adversarial, production-database proof of isolation exists for 4 of 6 resource types, materially upgrading this row from Phase 2's "NOT FOUND" framing. Not fully cleared: `knowledge_articles`/`workflow_timeline_events` coverage remains unverified, and this proof is a one-time manual execution, not something that runs automatically on every deploy to catch a future regression. See Phase 2 document, updated accordingly.

---
