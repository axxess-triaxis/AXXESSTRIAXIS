# Product Walkthrough

AXXESS is designed to feel like an enterprise operating system for institutional execution. The recommended Sprint 15 demo takes 3-5 minutes.

## Guided Demo Flow

1. Start at `/dashboard`.
2. Click **Start guided demo**.
3. Review executive risk, beta status, key metrics, recent activity, and priority actions.
4. Open Knowledge Hub and inspect a governed document with metadata, permissions, and RAG indexing state.
5. Move to AI Workspace and ask an institutional risk question.
6. Review the cited answer, source cards, confidence score, human review flag, router status, and audit preview record.
7. Create or inspect a task from the AI answer.
8. Review the approval queue and take a human decision.
9. Open analytics to see OKRs, delivery trend, budget utilization, approval cycle time, and AI insights.
10. End with request pilot, join beta, send feedback, or export briefing.

## What Is Live

- Next.js app shell and protected route architecture.
- Auth/session shell and role-aware navigation.
- Repository interfaces for organizations, users, projects, tasks, meetings, documents, notifications, approvals, and audit logs.
- CRUD-style project, task, and Knowledge Hub workflows.
- Analytics event capture abstraction.
- Demo and Supabase repository selection layer.

## What Is Demo-Seeded

- North East Health Mission institutional data.
- Executive dashboard metrics and activity examples.
- Guided demo storyline.
- Approval examples, stakeholder cards, and RAG-stage explanations.
- Screenshot-ready module states.

## What Is Provider-Gated

- External AI providers.
- Production embeddings/vector search.
- Social/RSS/provider integrations.
- Report export providers.
- Production analytics dashboards when keys are not configured.

## Demo Conversion Points

- Start guided demo.
- Generate executive briefing.
- Ask AI Workspace question.
- Create task from answer.
- Request approval.
- Send feedback.
- Request pilot.

## Sprint 16 Expansion

- Add E2E guided demo tests.
- Add production tenant onboarding and subscription/payment flows.
- Deepen provider integrations.
- Expand Android beta delivery and customer feedback analytics.
