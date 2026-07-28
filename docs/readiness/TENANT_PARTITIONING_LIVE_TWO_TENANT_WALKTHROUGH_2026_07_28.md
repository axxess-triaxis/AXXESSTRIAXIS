# Tenant Partitioning -- Live Two-Tenant Walkthrough Checklist (Sprint TP-3, 2026-07-28)

Date: 2026-07-28
Governance source: Codex's "Sprint TP-3" prompt.
Status: **checklist only -- not yet executed.** No row below has been walked live. This document
exists so the walkthrough can be performed and recorded, not as a record of results.

## How to Use This Checklist

For each screen, sign in as the named tenant on `landing.triaxisventures.com` and confirm the
"Expected Tenant Identity" and "Expected Data Boundary" columns hold. Record the actual result
using exactly one of these four labels:

- **Fully works** -- matches expectation exactly.
- **Improvement needed** -- works but has a real, named gap.
- **Does not work** -- contradicts the expectation; a real defect.
- **Not for addressal now** -- already known/deferred (cite the actionable, e.g. A-29/A-30).

Do not mark a row without actually performing the check. A blank "Result" column is more honest
than a guessed one.

## Tenant A -- Triaxis Ventures Private Limited

| Screen | Expected Tenant Identity | Expected Data Boundary | Result | Notes | Screenshot/Evidence |
|---|---|---|---|---|---|
| Dashboard | Triaxis Ventures | Real tenant metrics only, no seeded demo counts | | | |
| Settings > Organization | "Triaxis Ventures Private Limited" | Real org profile, real project/document counts (A-28 fix) | | | |
| Settings > Profile | Signed-in user's own real name/email | Own profile only | | | |
| Settings > Users | Triaxis Ventures' real user list | No other tenant's users visible | | | |
| Settings > Permissions | -- | Static reference matrix (A-30, known non-tenant-specific) | | Expected: "Not for addressal now" per A-30 | |
| Settings > AI Configuration | -- | Real provider status (AiRoutingProvidersPanel); Usage Statistics honestly labeled, not claimed live (A-31) | | | |
| Projects | Triaxis Ventures' real projects | No other tenant's projects | | | |
| Documents & Files | Triaxis Ventures' real documents | No other tenant's documents | | | |
| Knowledge Hub | Triaxis Ventures' real knowledge content | No other tenant's content | | | |
| AI Workspace | No auto-populated "North East Health Mission" query on load (A-69 fix) | Real tenant RAG scope only | | | |
| AI Review Inbox | Triaxis Ventures' real reviews only | No other tenant's AI reviews visible (per `canViewAiReview`) | | | |
| Tasks & Workflow | Triaxis Ventures' real tasks | No other tenant's tasks | | | |
| Approvals & Governance | Triaxis Ventures' real approvals | No other tenant's approvals | | | |
| Stakeholders & CRM | Triaxis Ventures' real stakeholders | No other tenant's stakeholders | | | |
| Audit Logs | Triaxis Ventures' real audit trail | No other tenant's audit events | | | |
| Analytics / Product Analytics | Triaxis Ventures' real metrics | No other tenant's data mixed in | | | |
| Admin > Mobile Release | "Triaxis Ventures Private Limited" | Real org name, not demo institution (A-69 fix) | | | |
| Admin > Pilot Command Center | "Triaxis Ventures Private Limited" | Real org name, not demo institution (A-69 fix) | | | |
| Admin > Customer Success Live Ops | "Triaxis Ventures Private Limited" | Real org name, not demo institution (A-69 fix) | | | |

## Tenant B -- NEPDSIC

| Screen | Expected Tenant Identity | Expected Data Boundary | Result | Notes | Screenshot/Evidence |
|---|---|---|---|---|---|
| Dashboard | NEPDSIC | Real tenant metrics only, no seeded demo counts, no Triaxis Ventures data | | | |
| Settings > Organization | "NEPDSIC" | Real org profile, real project/document counts | | | |
| Settings > Profile | Signed-in user's own real name/email | Own profile only | | | |
| Settings > Users | NEPDSIC's real user list | No Triaxis Ventures users visible | | | |
| Settings > Permissions | -- | Static reference matrix (A-30, known non-tenant-specific) | | Expected: "Not for addressal now" per A-30 | |
| Settings > AI Configuration | -- | Real provider status; Usage Statistics honestly labeled | | | |
| Projects | NEPDSIC's real projects | No Triaxis Ventures projects | | | |
| Documents & Files | NEPDSIC's real documents | No Triaxis Ventures documents | | | |
| Knowledge Hub | NEPDSIC's real knowledge content | No Triaxis Ventures content | | | |
| AI Workspace | No auto-populated demo query on load | Real tenant RAG scope only | | | |
| AI Review Inbox | NEPDSIC's real reviews only | No Triaxis Ventures reviews visible | | | |
| Tasks & Workflow | NEPDSIC's real tasks | No Triaxis Ventures tasks | | | |
| Approvals & Governance | NEPDSIC's real approvals | No Triaxis Ventures approvals | | | |
| Stakeholders & CRM | NEPDSIC's real stakeholders | No Triaxis Ventures stakeholders | | | |
| Audit Logs | NEPDSIC's real audit trail | No Triaxis Ventures audit events | | | |
| Analytics / Product Analytics | NEPDSIC's real metrics | No Triaxis Ventures data mixed in | | | |
| Admin > Mobile Release | "NEPDSIC" | Real org name, not demo institution | | | |
| Admin > Pilot Command Center | "NEPDSIC" | Real org name, not demo institution | | | |
| Admin > Customer Success Live Ops | "NEPDSIC" | Real org name, not demo institution | | | |

## Investor Demo

| Check | Expected | Result | Notes | Screenshot/Evidence |
|---|---|---|---|---|
| Investor demo remains populated | Full seeded institutional dataset renders (projects, documents, knowledge, activity, audit) | | | |
| Investor demo institution identity | May show "North East Health Mission" or the intended seeded institution -- this is correct here, unlike in a live tenant | | | |
| Live tenants do not show investor-demo data | Confirmed by both Tenant A and Tenant B rows above all showing real org identity, never the demo institution | | Cross-reference the two tables above | |
| Demo reset controls do not appear in live tenant Settings | Settings > Demo tab's "Reset Preview Data"/toggle controls are demo-mode-only surfaces, not present/active for a live tenant session in a way that could reset real data | | | |

## Cross-Tenant Negative Checks (Recommended, Not Yet Performed)

These require being signed in as Tenant A while attempting to directly access a Tenant B resource
ID (e.g., via a bookmarked URL or a guessed API call), and vice versa. Not part of the standard
per-screen walkthrough above, but the strongest single piece of live evidence for isolation if
performed:

- As Tenant A, attempt to open a Tenant B project/document/task by direct ID (if any ID is known
  or guessable) -- expect a 403/404, never the actual record.
- As Tenant B, repeat against a Tenant A resource.

## Sign-Off

Not yet performed. Once walked, record the date, who performed it, and whether every row reads
"Fully works" or has an explicitly accepted "Improvement needed"/"Not for addressal now" with no
"Does not work" rows outstanding.
