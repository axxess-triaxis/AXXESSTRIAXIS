# Founder Execution Evidence Governance

Date created: 2026-07-25  
Applies to: All future AXXESS TRIaxis prompts, sprint execution, QA logs, Claude Code handoffs, Codex product-management prompts, Paxel/YC evidence preparation, investor diligence, enterprise buyer diligence, and government/sovereign audit-readiness documentation.

## Purpose

This document formalizes the umbrella rule that future work on AXXESS TRIaxis must be documented as one auditable evidence chain:

**External signal -> product decision -> changed artifact -> verification -> current status**

This is necessary because automated coding-session readers can flatten founder-led execution into generic "docs" or "planning." AXXESS TRIaxis has involved market discovery, beta feedback, client scoping, stakeholder validation, live walkthroughs, sprint planning, engineering execution, verification, deployment governance, and documentation. Future documentation must preserve that full chain.

## Standing Rule

Every material sprint, fix, prompt, QA pass, release gate, demo change, tenant workflow change, integration decision, or product-readiness claim must map to:

1. External signal or internal product finding.
2. Product decision.
3. Changed artifact.
4. Verification.
5. Status.

If one part of the chain is missing, the claim must be marked partial or unsupported.

## Hard Rules

- Do not inflate claims.
- Do not invent missing evidence.
- Do not describe unverified work as completed.
- Do not let planning documents substitute for shipped or verified work.
- If a claim is founder-provided but not yet evidenced in the repo, mark it as `Founder-stated, source artifact needed`.
- If a claim is evidenced by repo files, commits, PRs, test output, docs, transcripts, or deployment logs, cite the exact source.
- Separate shipped work from planned work, partial work, blocked work, and unsupported claims.
- Treat pitch calls, investor calls, client scoping calls, stakeholder validation calls, beta feedback, QA findings, and live walkthroughs as product evidence, not investor collateral.
- Keep work inside the existing canonical repository.
- Do not create a new app, new repo, or duplicate project structure for evidence work.

## Canonical Context

Project:

**AXXESS TRIaxis / AXXESSTRIAXIS**

Canonical local workspace:

`C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`

Repository governance:

- GitHub is the primary auditable public source of truth when available.
- GitLab is the mirror/fallback repository.
- The OneDrive canonical checkout is the active local source of truth.
- Deployments should use provider CLIs/APIs where possible rather than treating GitHub/GitLab as deployment mediators.

## Required Prompt Header for Major Execution Prompts

Use this header in every major Claude Code/Codex execution prompt.

```markdown
## Planning provenance

This prompt was drafted from founder-provided intent, objectives, constraints, repo state, and evidence sources.

The founder reviewed the prompt, requested changes where needed, and approved this version for execution.

## Product evidence sources

This execution is informed by:

- Investor / pitch calls:
- Beta feedback items:
- Client scoping calls:
- Stakeholder validation calls:
- QA findings:
- Live walkthroughs:
- Existing repo docs:

## Required evidence chain

Every material change should map to:

External signal -> product decision -> changed artifact -> verification -> status

## Closeout requirement

Do not mark complete unless the closeout states:

- What changed
- What did not change
- What was verified
- What remains partial or blocked
- What claim is still unsupported
- Exact files changed
- Exact commands run
- PR/commit/branch/remote state
```

## Founder-Stated Discovery Corpus

The founder has stated that the project has involved:

- 21 investor or pitch calls documented.
- 35+ beta feedback items documented.
- 10 to 15 client scoping calls.
- 15+ stakeholder idea-validation calls.
- 400+ commits.
- 0 unmerged PR backlog at the relevant point in time.
- 400+ passing tests at the relevant point in time.
- Months of high-intensity execution toward YC and accelerator readiness.

These claims should not be blindly asserted. They must be indexed and marked as verified, partial, or source-needed in the evidence ledgers.

## Canonical Evidence Files

The following files are the canonical evidence-indexing layer:

- `docs/FOUNDER_EXECUTION_EVIDENCE_INDEX.md`
- `docs/MARKET_TO_PRODUCT_EVIDENCE_LEDGER.md`
- `docs/RELEASE_AND_VERIFICATION_EVIDENCE_LEDGER.md`
- `docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md`

The following are the named, per-conversation source logs that back the discovery-corpus counts in the files above:

- `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` (investor/pitch calls)
- `docs/readiness/CLIENT_SCOPING_CALLS_LOG_2026_07_25.md` (client scoping calls -- idea/prototype-stage market discovery, not sales)
- `docs/readiness/STAKEHOLDER_IDEA_VALIDATION_CALLS_LOG_2026_07_25.md` (stakeholder idea-validation calls, deduplicated against the two logs above)

`README.md`'s "Evidence and Verification" section links all of the above as the entry point for an external reader tracing this program's execution end to end.

Future major sprint closeouts should update these where relevant.

## Quality Bar

The evidence record should make this clear:

The founder did not merely ask AI agents to code.

The founder ran a market-to-product execution loop:

external calls, beta feedback, client scoping, stakeholder validation, QA evidence, sprint planning, implementation, verification, documentation, and release governance.

The language must remain factual, specific, source-linked, and careful.

