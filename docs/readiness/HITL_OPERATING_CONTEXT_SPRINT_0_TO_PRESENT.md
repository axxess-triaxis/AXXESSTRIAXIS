# HITL Operating Context: Sprint 0 to Present

Date created: 2026-07-23  
Applies to: Sprint 0 through current and immediate future execution  
Product: AXXESS TRIaxis  
Company: Triaxis Ventures Private Limited  
Jurisdiction: Assam, India  
Company type: Private limited company

## Human-in-the-Loop Identity

The human-in-the-loop authority for this repository and product program is:

**Sudipta Koushik Sarmah**  
Founder and Managing Director  
Triaxis Ventures Private Limited

Triaxis Ventures Private Limited is building the product **AXXESS TRIaxis**, which is the product represented by this repository.

## Current Operating Reality

As of this document date, Sudipta Koushik Sarmah is the only full-time founder and employee working on the company and product, without an internal fallback operator.

This means the HITL authority currently carries multiple operating responsibilities simultaneously, including but not limited to:

- CEO
- CTO
- CPO
- CFO
- CMO
- Head of Sales
- Head of Fundraising
- Outreach Lead
- Product owner
- Technical reviewer
- Buyer-facing representative
- Investor-facing representative
- Governance and risk approver

This reality materially affects how Codex and Claude Code should structure work.

## HITL Precedence for This Repository

For the purpose of this repository, sprint design, prompts, QA workflows, and product-management framing must cater to the HITL role in the following order of precedence:

1. CTO and CPO
2. CEO
3. CFO and Head of Fundraising
4. CMO and Head of Sales

## Interpretation of Precedence

### 1. CTO and CPO First

Codex prompt design and Claude Code execution should first help the HITL make high-quality technical and product decisions.

This means outputs must emphasize:

- Architecture implications.
- Product workflow correctness.
- Tenant safety.
- Security posture.
- Technical debt.
- Data model integrity.
- Test coverage.
- Verification evidence.
- User experience coherence.
- Product readiness.

### 2. CEO Second

After technical/product correctness, outputs should help the HITL make company-level decisions.

This means outputs should clarify:

- What is launch-critical.
- What can be deferred.
- What creates operational risk.
- What blocks pilots.
- What improves company credibility.
- What needs founder approval.
- What affects strategic positioning.

### 3. CFO and Head of Fundraising Third

Outputs should then support financial and fundraising judgment.

This means documentation should make clear:

- Readiness deltas.
- Investor-relevant milestones.
- Proof points.
- Evidence of execution velocity.
- Commercial readiness.
- Budget implications.
- External dependencies.
- Fundraising narrative relevance.

### 4. CMO and Head of Sales Fourth

Finally, outputs should support market-facing clarity.

This means documentation should help explain:

- Buyer value.
- Pilot readiness.
- Sales objections.
- Product positioning.
- Feature proof.
- Trust posture.
- Competitive differentiation.
- Case-study readiness.

## Required Behavior for Codex Prompt Design

Codex should design prompts and sprint governance assuming the HITL is a single high-context but time-constrained founder.

Prompts should therefore:

- Be explicit.
- Reduce ambiguity.
- Separate must-do from optional work.
- Include precise exit criteria.
- Include confidence gates.
- Include evidence requirements.
- Avoid vague completion claims.
- Avoid unnecessary strategic churn.
- Protect founder attention.
- Preserve auditability for future reviewers.

Every sprint prompt should make clear:

- What Claude Code should do.
- What Claude Code should not do.
- What evidence Claude Code must produce.
- What the founder must approve.
- What can be safely deferred.
- What remains blocked by external dependency.

## Required Behavior for Claude Code Execution

Claude Code should execute as engineer, coder, and tester while respecting the single-founder HITL constraint.

Claude Code should:

- Implement scoped changes.
- Run verification.
- Update documentation.
- Produce closeout evidence.
- Identify blockers precisely.
- Avoid silently expanding scope.
- Avoid marking work complete without evidence.
- Avoid asking the founder for decisions that can be safely resolved by repository context.
- Escalate only meaningful product, business, legal, security, credential, or external-account decisions.

## Required Behavior for Documentation

All future sprint documentation should be useful to:

- Technical reviewers.
- Investors.
- Enterprise buyers.
- Investor and technical due diligence reviewers.
- Government or sovereign stakeholders auditing future use cases.
- Future employees, collaborators, vendors, or partners.

Documentation should be written so that future reviewers can understand:

- What was decided.
- Why it was decided.
- What evidence supported it.
- What remains unproven.
- What is blocked externally.
- What the HITL approved.
- What the next operator should do.

## Governance Implication

Until a fallback founder, partner, collaborator, employee, or operating lead is secured, the repository must treat HITL bandwidth as a critical resource.

The execution system should therefore prioritize:

- Clear sprint prompts.
- High-leverage work.
- Low ambiguity.
- Evidence-backed closure.
- Founder decision compression.
- Enterprise-grade documentation.
- No premature launch claims.

## Relationship to QA3 Readiness Program

This HITL operating context applies directly to:

- `docs/readiness/CODEX_RECOMMENDATION_QA3_READINESS_PROGRAM.md`
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`
- `docs/readiness/CLAUDE_CODE_SPRINT_PROMPTS_QA3_PROGRAM.md`

The five-sprint QA3 readiness program must be executed with this single-founder HITL model in mind.

## Completion Standard

This document does not mark any product sprint complete.

It establishes the governance and operating context for how sprint prompts, product management, engineering execution, and HITL approvals should work from Sprint 0 through the current roadmap and immediate future.

