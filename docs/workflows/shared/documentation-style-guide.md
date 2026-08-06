# AXXESS TRIaxis Workflow Documentation Style Guide

## Voice

Use clear enterprise documentation language. The reader should understand what happens, who owns it, what TRIaxis does, what must be approved, and how the workflow is audited.

## Preserve Source Intent

When converting Ritashree Mahanta's workflows:

- Keep domain-specific terminology intact.
- Do not rename actors unless the source term is unclear.
- Do not remove operational nuance to make the workflow look simpler.
- Mark assumptions clearly instead of silently filling gaps.
- Use "TRIaxis Agent" only when the platform performs retrieval, recommendation, drafting, routing, summarization, or execution support.

## Recommended Structure

Each workflow should start with a short metadata block:

```markdown
**Status:** Draft
**Domain:** Healthcare
**Workflow Owner:** Mrs. Ritashree Mahanta, Cofounder & COO, AXXESS
**Document Owner:** AXXESS TRIaxis Team
**Last Updated:** YYYY-MM-DD
**Version:** 0.1
```

## Chart Usage

Use charts to clarify complexity, not decorate the document.

Recommended chart types:

- `flowchart TD` for process flow and decision points
- `sequenceDiagram` for actor and system handoffs
- `stateDiagram-v2` for lifecycle status transitions
- `journey` for stakeholder experience

## Markdown Tables

Use tables for:

- Actors
- Inputs and outputs
- Exceptions
- Escalations
- Roles and permissions
- KPIs
- Risks and controls
- Acceptance criteria

## Assumptions

When a detail is not present in the source workflow, write:

```markdown
**Assumption:** This step requires validation by the workflow owner.
```

## Review Gate

No workflow should be marked `Approved`, `Implementation Ready`, or `Live` until it has been reviewed by Ritashree Mahanta or the designated domain owner.

