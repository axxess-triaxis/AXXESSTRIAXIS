# Codex Recommendation: QA3 Readiness Execution Program

Date: 2026-07-23  
Product: AXXESS by Triaxis Ventures  
Recommendation owner: Codex  
Execution model: Codex as prompt designer and product manager; Claude Code as engineer, coder, and tester; founder as human-in-the-loop approval authority.

## Recommendation

Codex recommends adopting a five-sprint QA3 Readiness Execution Program to convert AXXESS from strong beta architecture into a live, tenant-proven, workflow-proven Enterprise Beta 1.0 candidate.

This recommendation follows the readiness analysis created after the Claude Code artifact, QA2 remediation work, beta 0.5/0.7 feedback interpretation, and the explicit human-in-the-loop confirmation of the proposed delta model.

## Confirmed Operating Model

For the next five sprints:

- Codex is the prompt designer and product manager.
- Claude Code is the engineer, coder, tester, and sprint executor.
- The founder is the human-in-the-loop approval authority.
- The HITL authority is Sudipta Koushik Sarmah, Founder and Managing Director of Triaxis Ventures Private Limited, the company building AXXESS TRIaxis.
- Until fallback, partnership, collaboration, or employee support is secured, prompts and sprint governance must assume a single-founder HITL model.
- No sprint can be considered closed without evidence.
- Every sprint must update the actionables, roadmap, checklist, and Kanban documents.
- Every sprint closure decision must use an explicit Yes/No confidence gate.

## HITL Role Precedence

For this repository, Codex prompt design and product-management framing must serve the HITL role in this order:

1. CTO and CPO.
2. CEO.
3. CFO and Head of Fundraising.
4. CMO and Head of Sales.

The practical implication is that prompts must first protect technical/product correctness, then company-level decision quality, then fundraising/commercial evidence, and finally market-facing clarity.

The full HITL operating context is documented in:

`docs/readiness/HITL_OPERATING_CONTEXT_SPRINT_0_TO_PRESENT.md`

## Confirmed Delta Range

The founder explicitly confirmed the following readiness delta model.

| Sprint | Focus | Expected Readiness Delta |
|---:|---|---:|
| Sprint 1 | Tenant 0 production activation | +15% to +20% |
| Sprint 2 | Live golden-path workflow execution | +15% to +20% |
| Sprint 3 | Two-tenant isolation and permission proof | +15% to +20% |
| Sprint 4 | Integrations, analytics, audit evidence | +12% to +18% |
| Sprint 5 | Mobile readiness, release gates, QA3 preparation | +10% to +15% |

## Target Readiness Movement

| Readiness Area | Directional Baseline | Target After Sprint 5 |
|---|---:|---:|
| Enterprise Beta 1.0 | ~53% | 85% to 92% |
| Single Tenancy | ~54% | 90% to 95% |
| Multi-Tenancy | ~43% | 80% to 88% |
| Live Workflow | ~52% | 88% to 94% |
| Security and Compliance | ~36% | 70% to 82% |
| Analytics Instrumentation | ~18% | 65% to 78% |
| Android Beta Readiness | ~42% | 75% to 88% |
| iOS Beta Readiness | ~33% | 60% to 75%, depending on Apple credentials and review dependency |
| Commercial Pilot Readiness | ~39% | 68% to 80% |
| QA3 Readiness | Not formalized | 90%+ evidence package readiness |

## Closure Rule

A sprint is closed only if every targeted checklist item is marked:

- `Yes`, with at least 80% confidence and evidence attached; or
- `Blocked`, with a named external blocker, owner, evidence, and next action.

If confidence is below 80%, the item remains `No`.

## Mandatory Documentation Rule

Each sprint must update:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`

Each sprint must also create or update a sprint-specific closeout artifact with:

- Summary of work completed.
- Files changed.
- Tests run.
- Deployment or live-verification evidence.
- Actionables closed.
- Actionables still open.
- Confidence score per critical deliverable.
- Known risks.
- Recommended next sprint action.

## QA3 Trigger

If Sprint 5 is marked closed under the criteria above, the founder must be reminded to conduct:

**QA3: Exhaustive Beta Readiness Audit**

QA3 is a formal milestone. It is not optional once Sprint 5 closes.

## QA3 Success Target

QA3 should determine whether AXXESS is ready to be considered an Enterprise Beta 1.0 market-release candidate.

QA3 must verify:

- Tenant 0 onboarding.
- Sign up, login, logout, and reset password.
- Protected workspaces.
- User profile and role setup.
- Invitation flow.
- Real document upload/import.
- Governed RAG answer with citations.
- Human review and approval.
- Real work creation from approved AI output.
- Dashboard, audit log, and timeline updates.
- Two-tenant isolation.
- Permission-aware retrieval.
- Analytics event capture.
- Mobile release readiness.
- Buyer-grade trust evidence.

## Governance Position

AXXESS should not be considered Enterprise Beta 1.0 because it has a sophisticated architecture or strong prototype feedback.

AXXESS should be considered Enterprise Beta 1.0 only when it is live-proven through tenant onboarding, workflow execution, evidence logging, tenant isolation, and external-style QA.

## Repository Access Note

The prior GitHub suspension incident has been resolved. GitHub Support manually cleared the restrictions under Ticket 4589741, and GitHub is restored as the primary source-of-truth and auditable public record. GitLab remains the mirror/fallback repository.

The closure record is documented in:

`docs/readiness/GITHUB_SUSPENSION_APPEAL_CLOSURE_2026_07_24.md`
