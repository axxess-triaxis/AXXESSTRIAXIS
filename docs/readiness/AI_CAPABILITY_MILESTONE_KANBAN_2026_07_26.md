# AI Capability -- Kanban and Milestone

Date created: 2026-07-26
Source: synthesized from already-verified evidence across this program -- RAG Remediation Sprints
1-3, the admin panel wiring pass, and existing readiness docs
(`docs/readiness/ACTIONABLES_READINESS_MATRIX.md`, `docs/RAG.md`,
`docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md`) -- into a milestone-shaped view over the product's full AI
surface, matching the pattern established by `GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md` and
`HAPPY_PATH_ONBOARDING_KANBAN_2026_07_25.md`.

## Scope: How "AI Capability" Differs From "RAG Capability" and "HITL Loop Completion"

**AI Capability** (this document) is the superset: every surface of the product that produces,
routes, or governs an AI-originated output -- the RAG answer engine, the AI Router/model-policy
layer, the AI Review Inbox's decision-to-record pipeline, the admin AI-governance panels, and where
AI-originated work lands (CRM, Approvals, feedback capture).

**RAG Capability** (`RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md`) is one component of this board:
the specific document-indexing-to-grounded-answer pipeline. See that board for RAG-specific detail;
this board does not repeat it item-by-item.

**HITL Loop Completion** (`HITL_LOOP_COMPLETION_KANBAN_2026_07_26.md`) tracks the review/decision
mechanics generically, independent of which AI surface produced the content under review.

## Milestone Definition

**"AI Capability"** is complete when every place in the product that produces or governs an
AI-generated output behaves honestly (no fabricated data presented as real), is auditable, correctly
routes to the relevant workspace, and is truthfully labeled where a real external model is not yet
connected.

## Definition of Done (Milestone Exit Criteria)

- [x] RAG answer engine grounded in real content, confidence explainable -- see
      `RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md` (6 of 10 exit criteria code-complete there)
- [x] AI Router / model-policy admin panel wired to real backend (`/api/ai/model-policy`) -- routing
      preview, provider allowlist, usage-ledger inspection (A-none, admin panel wiring, not an
      actionable-tracked item)
- [x] AI Review Inbox governance panel repointed from an unbuilt concept to the real, tested review
      pipeline (`ai_operation_reviews` via `reviewInbox.ts`) -- approve/reject pending AI outputs inline
- [x] AI Review Inbox escalation-to-CRM handoff visible, not silently dropped (A-57)
- [x] CRM "Create Contact" no longer fabricates AI-adjacent Influence/Engagement defaults (A-58)
- [x] Approvals queue displays real AI-Review-Inbox-originated escalations, with a real export (A-60)
- [x] Feedback capture wired toward `triaxisgrp@gmail.com` (A-65, code-shipped)
- [ ] Feedback email delivery confirmed live in production (A-65)
- [ ] No real external LLM provider is connected anywhere in this codebase -- `remotePlaceholderProvider`
      in `src/services/ai/providers/index.ts` remains an explicit stub; every AI answer in the product
      today is a deterministic local computation, not a model completion
- [ ] Plugin-runtime and execution-runs admin panels' underlying capabilities (dry-run job execution,
      plugin scope revocation) HITL-confirmed live in production

## Current Status: 7 of 11 exit criteria code-complete and tested; 1 requires live delivery confirmation (now confirmed *blocked*, not merely unverified -- see A-65 below); 1 requires live HITL confirmation of admin actions; 1 (real LLM) is a known, documented capability gap; the RAG sub-board itself is 8 of 11 (2 of those live-HITL-confirmed as of 2026-07-26); one new, unrelated infrastructure gap found and tracked (A-67, invalid service-role key)

## Board

### Code-Complete and Tested (7 of 11)

| Item | Evidence | Source |
|---|---|---|
| Model-policy admin panel wired | `/api/ai/model-policy` GET/POST, real routing preview + provider allowlist + usage-ledger extension | Admin panel wiring, commit `ed51942` |
| AI Review Inbox governance panel repointed | `panelContent["ai-governance"]` now describes the real `ai_operation_reviews`/`reviewInbox.ts` flow; approve/reject wired to `/api/ai/reviews` | Admin panel wiring, commit `ed51942` |
| A-57 -- AI Review Inbox to CRM handoff visible | `GET /api/stakeholders/notes` (new) + live "AI-escalated notes" section in `StakeholdersSection.tsx` | Sprint 3 closeout, commit `c85165a` |
| A-58 -- CRM fabricated defaults removed | `stakeholderMutation()` defaults changed to `0`/`"unrated"`; form gained real optional Influence/Engagement inputs | Sprint 3 closeout, commit `c85165a` |
| A-60 -- Approvals Export Report real | `GET /api/approvals` (real live queue, previously absent entirely) + real JSON export + `POST /api/approvals/export` audit event | Sprint 3 closeout, commit `c85165a` |
| A-65 -- Feedback email routing wired | `src/services/email/feedbackEmail.ts` (new), sends toward `triaxisgrp@gmail.com` via the same Resend provider `invitationEmail.ts` uses | Sprint 3 closeout, commit `c85165a` |
| RAG answer engine grounding + explainability | See `RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md` (now 2 of its items live-HITL-confirmed, not just code-tested, as of 2026-07-26) | Sprints 1-2 |
| Knowledge Hub document uploads genuinely persist (A-66, newly discovered and fixed 2026-07-26) | Uploads previously showed a fake success and silently failed to persist -- new same-origin upload proxy fixes this; HITL live-confirmed | `KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`, commit `e4b27b7` |

### Code-Shipped, Pending Live Confirmation (2)

| Card | What's shipped | What's still open | Priority |
|---|---|---|---|
| A-65 delivery | Real send attempt with honest not-configured/sent/failed status | **Confirmed 2026-07-26** (not merely unverified): `vercel env ls production` against `triaxis-www-frontend-import` shows `RESEND_API_KEY` is genuinely absent from production. Requires the founder to add it via the Vercel Dashboard -- identical open question to A-08 on the same provider | Medium |
| Plugin-runtime / execution-runs admin actions | Real backend wiring (`/api/plugins/runtime`, `/api/execution/jobs`) | Not yet clicked and confirmed live in production by an Organization Admin | Medium |

### Known, Documented Capability Gap (not a defect -- an unaddressed positioning-vs-mechanism gap)

| Item | Why it's flagged here rather than fixed |
|---|---|
| No real external LLM provider anywhere in this codebase | Every sprint prompt's explicit non-negotiable was "do not rewrite the RAG architecture." Confirmed via code read of `src/services/ai/providers/index.ts` (`remotePlaceholderProvider` is an explicit stub) during Sprint 2. This is the single largest gap between the product's stated positioning ("governance-native, human-in-the-loop AI" per `README.md`) and its current mechanism -- tracked in `docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md`, not silently carried as if resolved |

### Newly Discovered, Unresolved (found while diagnosing A-66, not caused by it)

| Item | Status |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` in `triaxis-www-frontend-import` production is not a valid token (`400 Invalid Compact JWS` on a direct diagnostic call) | Tracked as A-67 in `ACTIONABLES_READINESS_MATRIX.md`. Nothing in today's fix depends on this key, so it caused no confirmed user-visible defect -- but any admin/cron path relying on service-role privileges would silently fail. Requires founder action (rotate in Vercel Dashboard); cannot be done from this environment |

### Closed

A-57/A-58/A-60/A-65 (code) and the model-policy/ai-governance admin panel repointing are closed on
their originating actionables/commits, carried into this board as already-Code-Complete.

## Sequencing Recommendation

1. **HITL live-confirms the 6 admin panels wired in commit `ed51942`** (model-policy, plugin-runtime,
   execution-runs, ai-governance, roles, invitations) and the Sprint 3 CRM/Approvals/feedback fixes in
   the same production pass as the RAG retest -- one combined walkthrough, not five separate ones.
2. **Confirm `RESEND_API_KEY` is set and valid in production**, then send one real test feedback
   submission to close A-65 and, by the same mechanism, re-confirm A-08 (invitation email delivery).
3. **Real external LLM integration** remains the largest open item on this board. It is not scheduled
   by this program and needs its own scoping conversation (provider selection, cost, latency, security
   review) before any sprint targets it -- do not fold into future RAG/AI remediation sprints without
   an explicit founder decision to do so.

## Evidence

All findings sourced from already-published program evidence -- this document adds no new claims. See
`RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md`, `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`,
`docs/RAG.md`, `docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md`,
`KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`, and the three RAG Remediation
Sprint closeout docs (commits `0ed228e`, `d3436c0`, `c85165a`) plus the admin panel wiring commit
`ed51942` and the upload-persistence fix commit `e4b27b7`.
