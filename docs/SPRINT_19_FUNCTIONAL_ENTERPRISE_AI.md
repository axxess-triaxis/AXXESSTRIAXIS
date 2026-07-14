# Sprint 19 - Functional Enterprise AI Journey

Sprint 19 converts AXXESS from a polished enterprise beta into a usable external-organization workflow. The work preserves the existing UI and architecture while wiring live Supabase Auth, tenant provisioning, document ingestion, governed RAG, human review, and a reusable connector contract.

## User Journey

A new external user can now follow this path:

1. Sign up or log in with Supabase email/password.
2. Create a clean organization tenant from onboarding.
3. Persist user profile, role, department, workspace, and active tenant metadata.
4. Upload or paste institutional document text.
5. Chunk and index the document for governed retrieval.
6. Ask AXXESS a tenant-scoped question.
7. Receive a cited answer with confidence, provider, cost, latency, and review metadata.
8. Approve or reject the answer.
9. Store the review, optional follow-up task, and audit events.

## Authentication And Onboarding

Added live server routes for:

- `POST /api/auth/reset-password`
- `GET/PATCH/POST /api/profile`
- `POST /api/onboarding/provision`
- `GET/POST /api/tenants`

The onboarding route provisions:

- Organization
- Profile
- User record
- Organization membership
- Role and user role
- Optional department
- Optional workspace
- Workspace membership
- Audit event

## Tenant-Backed Data

The existing repository gateway remains the canonical CRUD path for projects, tasks, documents, meetings, notifications, invitations, users, and audit logs.

Sprint 19 adds production write paths for:

- Profile metadata
- Tenant provisioning
- Document ingestion
- RAG chunks
- AI output audit
- Human review records
- Email-import-created documents and tasks

## Governed RAG

Added:

- `POST /api/documents/ingest`
- `POST /api/rag/query`
- `POST /api/rag/review`
- `src/services/rag/tenantRagWorkflow.ts`

The RAG workflow:

- Creates a tenant document record.
- Creates document version metadata.
- Records document activity.
- Chunks extracted text.
- Creates deterministic local embeddings.
- Stores persistent chunk rows when service-role runtime is configured.
- Falls back to the existing permission-aware retriever when chunks are unavailable.
- Filters by tenant, document permissions, role, visibility, and classification.
- Records AI output audit evidence.
- Records approve/reject decisions.

## AI Gateway

The existing provider-neutral router is preserved.

Sprint 19 hardens `POST /api/ai` so tenant context is resolved from the server session instead of trusting client-provided organization IDs. Router output records provider, model, confidence, cost tier, latency, and human-review status in audit metadata.

## Email Connector Foundation

Added:

- `src/services/integrations/connectorContract.ts`
- `GET /api/connectors/oauth/start`
- `POST /api/connectors/email/import`

The first connector workflow is intentionally narrow:

- Start Gmail or Microsoft OAuth.
- Import only selected email content.
- Preview extracted tasks, decisions, stakeholders, summary, and tags.
- Require user confirmation before creating documents or tasks.
- Preserve source link and audit trail.

## Database Migration

Added migration:

`supabase/migrations/202607140001_sprint19_functional_enterprise_ai.sql`

It adds:

- User profile metadata columns.
- RAG chunk metadata.
- AI conversations.
- AI conversation messages.
- Workflow action reviews.
- Integration sync logs.
- OAuth/sync metadata on integration connections.
- RLS and grants for the new tables.

## Tests

Added focused tests for:

- Tenant provisioning helper normalization.
- Connector contract and email preview extraction.
- Tenant RAG document ingestion and fallback answering.

## Remaining Risks

- Live OAuth callback/token exchange is still provider-gated and requires customer-approved credentials.
- Full binary file extraction still needs a storage parser pipeline beyond text ingestion.
- Tenant selection currently updates the active user tenant row and should later move to a dedicated active-session tenant claim.
- Deep CRM/stakeholder persistence remains mostly demo-backed until a full stakeholder repository is added.
- Production RAG quality will improve when remote embeddings/vector search are enabled.
