# AXXESS TRIaxis Workflow Documentation

This folder contains GitHub-ready workflow documentation for AXXESS TRIaxis.

The workflows document operating models designed by:

- Mrs. Ritashree Mahanta, Cofounder & COO, AXXESS, and Domain Head - Healthcare, Non-Profits & Educational Institutions
- Mr. Sudipta Koushik Sarmah, Founder & MD, AXXESS

## Investor-Observable Summary

These workflows are written so investors, enterprise buyers, and partners can quickly see how AXXESS converts domain-specific operating pain into executable software.

| Workflow | Domain | Operational Pain | AXXESS Value |
|---|---|---|---|
| Discharge Approval and Delegation Authority | Healthcare | Discharge is blocked by scattered consultant approvals, policy rules, delegation authority, and family communication. | Retrieves policy, checks approval status, identifies delegated authority, routes approval, drafts communication, and logs every action. |
| OPD Follow-Up Investigation Adherence | Healthcare | Patient follow-up is missed and later disputed. | Sends reminders, secure upload links, IVR calls, delivery/read receipts, non-response flags, and audit trail. |
| NRTS/NUID Registration Tracking | Nursing Education / Healthcare Administration | Students and colleges lack visibility into registration status. | Gives students status tracking, colleges dashboards, councils workflow visibility, delay alerts, and follow-up support. |
| MSME Tender, Compliance, Inventory, and Finance Command Center | MSME / Construction / Government Contracts / Retail | Owner misses tender, GST, inventory, finance, consultant, bank, receivable, payable, and filing signals across disconnected systems. | Integrates social alerts, Gmail, Outlook, Calendar, WhatsApp Business, accounting, GST, bank account aggregators, Groww-style investment summaries, payment gateways, CMS, loan tracking, EOD forms, reminders, notices, and audit trails. |

## Platform Capabilities Visible Across Workflows

- Enterprise RAG and Knowledge Hub
- Workflow orchestration
- Human-in-the-loop approvals
- RBAC and tenant isolation
- Audit trails
- Notifications, reminders, notices, and escalations
- Agentic IVR and reminder calls
- Gmail, Outlook, Calendar, WhatsApp Business, accounting, GST, bank, payment gateway, and CMS integrations
- Finance cockpit with current account, FD, mutual fund, investment platform, receivables, payables, covenant, and loan visibility
- Compliance tracking for GST, tax, regulatory filings, tender readiness, and bank covenants

## Documentation Principles

- Preserve the workflow owner's terminology, sequencing, and operational intent.
- Make every workflow implementation-ready for product, engineering, operations, customer success, and enterprise buyers.
- Describe both the human process and the TRIaxis-enabled AI workflow.
- Make governance, auditability, approvals, role boundaries, and escalation paths explicit.
- Use Mermaid charts where they clarify sequence, decision points, ownership, or system architecture.

## Folder Structure

```text
docs/
  workflows/
    README.md
    workflow-template.md
    workflow-intake.md
    healthcare/
    non-profits/
    education/
    shared/
```

## Included Draft Workflows

| Workflow | Domain | File |
|---|---|---|
| Discharge Approval and Delegation Authority | Healthcare | `healthcare/discharge-approval-delegation-workflow.md` |
| OPD Follow-Up Investigation Adherence | Healthcare | `healthcare/opd-follow-up-investigation-adherence.md` |
| NRTS/NUID Registration Tracking | Education / Healthcare Administration | `education/nrts-nuid-registration-tracking.md` |
| MSME Tender, Compliance, Inventory, and Finance Command Center | MSME / Construction / Government Contracts / Retail Operations | `shared/msme-tender-compliance-inventory-finance-command-center.md` |

## Recommended File Naming

Use lowercase, hyphen-separated names:

```text
patient-onboarding.md
donor-engagement.md
student-support-case-management.md
grant-reporting.md
```

## Workflow Status Labels

Use one status label at the top of each workflow:

- `Draft`: Raw workflow has been converted into the standard documentation format.
- `Under Review`: Awaiting Ritashree Mahanta's review or domain validation.
- `Approved`: Approved for GitHub publication.
- `Implementation Ready`: Approved and ready for engineering execution.
- `Live`: Implemented in TRIaxis or Web Lite.

## Standard Workflow Sections

Each workflow should include:

1. Purpose
2. Domain
3. Actors
4. Trigger
5. Preconditions
6. Step-by-step flow
7. Decision points
8. Exceptions
9. Escalation paths
10. Data inputs
11. Data outputs
12. Roles and permissions
13. Audit trail
14. KPIs
15. Risks and controls
16. Acceptance criteria
17. Implementation notes
18. Mermaid charts

## Mermaid Rendering

GitHub supports Mermaid diagrams in Markdown. Use Mermaid for:

- Process flows
- Approval flows
- Sequence diagrams
- Role handoffs
- Data movement
- State transitions

Example:

```mermaid
flowchart TD
  A[Workflow Trigger] --> B[TRIaxis Intake]
  B --> C{Approval Required?}
  C -- Yes --> D[Route to Approver]
  C -- No --> E[Execute Workflow]
  D --> F{Approved?}
  F -- Yes --> E
  F -- No --> G[Escalate or Close]
  E --> H[Audit Log Updated]
```

## How To Add a New Workflow

1. Place Ritashree Mahanta's raw workflow notes in `workflow-intake.md` or in a new draft file.
2. Copy `workflow-template.md` into the correct domain folder.
3. Rename the file using the workflow name.
4. Preserve original domain terminology.
5. Fill all sections using the source workflow.
6. Add Mermaid charts only where they improve clarity.
7. Mark assumptions clearly.
8. Send for domain review before publication.
