# AI Governance

Sprint 12 extends the Sprint 11 governed RAG foundation with prompt and output governance.

## Goals

Every AI answer should be traceable to:

- Tenant
- User
- Role
- Prompt id
- Prompt version
- Model
- Timestamp
- Confidence score
- Sources used
- Human review status
- Operator notes where applicable

## Prompt Registry

Implementation:

- `src/services/aiGovernance/promptRegistry.ts`
- `prompt_registry`
- `prompt_versions`

Prompt statuses:

- Draft
- Approved
- Retired

Only approved prompt versions should be used for production AI answers.

## AI Output Audit

`ai_output_audit` records:

- Prompt id and version
- Model
- Confidence score
- Source document ids
- Source chunk ids
- Human review requirement
- Reviewer and approval timestamp

High-impact outputs and low-confidence outputs must be routed to human review.

## RAG Permission Requirements

The retrieval layer must preserve Sprint 11 rules:

- No cross-tenant retrieval.
- No retrieval across unauthorized documents.
- Respect document visibility.
- Respect user role, department, workspace, and explicit document permissions.
- Display sources used.
- Log answer evidence.

## Prompt Change Control

Prompt changes require:

- Owner.
- Change summary.
- Version number.
- Reviewer.
- Approval timestamp.
- Rollback path to the previous approved prompt.

## Operational Gaps

Before high-stakes production use:

- Add reviewer queue UI.
- Add prompt approval UI.
- Add automated prompt evaluation datasets.
- Add model policy registry.
- Add model provider cost and latency telemetry.
