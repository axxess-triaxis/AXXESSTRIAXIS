# Documentation Governance Standard

## Purpose

AXXESS treats documentation as product infrastructure. This standard applies to all future Codex, Claude Code, Cursor, manual engineering, DevOps, product, security, deployment and release work in this repository.

Every meaningful change should leave behind enough written evidence for five audiences:

1. Technical reviewers
2. Investors assessing technical and engineering capability
3. Enterprise buyers
4. Investor or technical due diligence teams
5. Government, public sector, sovereign and regulated stakeholders auditing future use cases

The documentation should make the platform understandable without relying on private chat history, oral explanations or unavailable tooling logs.

## Standing Rule

From the canonical workspace migration onward, documentation is a required deliverable for every sprint, production fix, deployment change, security change, data model change, AI workflow change, integration change and release process change.

Code is not considered complete until the documentation explains:

- What changed
- Why it changed
- Which capability it enables
- Which users or stakeholders are affected
- Which governance, security, privacy, AI, tenancy or operational controls apply
- Which commands or checks were run
- Which risks remain
- Which future sprint or operational follow-up is recommended

## Audience-Specific Requirements

### Technical Reviewers

Technical reviewers need reproducibility and architectural clarity.

Documentation should include:

- Architecture boundaries
- Affected modules, services, repositories and API routes
- Database migrations and RLS impact
- Type, lint, test, build and release-gate evidence
- Known tradeoffs
- Provider-gated behavior
- Local development commands
- Failure modes and rollback notes

Avoid vague claims such as "production ready" without naming the evidence that supports the claim.

### Investors Assessing Engineering Capability

Investors need to understand execution velocity, technical ambition and engineering discipline.

Documentation should include:

- Sprint-by-sprint product progression
- Evidence that the platform compounds rather than accumulates disconnected prototypes
- Major architectural decisions and why they matter commercially
- Multi-platform readiness across web, mobile, Supabase, Vercel, GitLab, Capacitor and integration systems
- Quality gates that show the work is engineered, not merely demonstrated
- Clear distinction between shipped, verified, provider-gated and roadmap capabilities

Investor-facing writing should be substantive and concrete. It should not read like marketing copy unsupported by repository evidence.

### Enterprise Buyers

Enterprise buyers need confidence that AXXESS can be operated in real organizations.

Documentation should include:

- Tenant isolation model
- Authentication and role model
- Human-in-the-Loop governance
- Audit evidence and operational traceability
- Data handling and privacy posture
- Integration boundaries
- Deployment and support operations
- Incident, backup, release and rollback procedures
- Known customer onboarding workflow

Enterprise-facing documentation should help a buyer picture onboarding, administration, governance and support.

### Investor And Technical Due Diligence

Due diligence reviewers need traceability and evidence.

Documentation should include:

- Commit hashes for important milestones
- Verification commands and outcomes
- Migration summaries
- Security and dependency posture
- Remote repository state
- Deployment-readiness notes
- Remaining technical risks
- Evidence of AI-assisted development governance
- Open questions that require credentials, provider access or live environment validation

Due diligence documentation should preserve nuance. It is better to mark a capability as "implemented but not live-provider verified" than to overclaim.

### Government, Sovereign And Regulated Stakeholders

Government and sovereign stakeholders need accountability, auditability and jurisdiction-aware controls.

Documentation should include:

- Data residency and sovereignty implications
- RLS and tenant isolation controls
- Audit-log and evidence-generation behavior
- Human approval requirements for consequential AI output
- Model routing and provider independence
- Connector authorization boundaries
- Sandbox execution controls
- Security, privacy and compliance assumptions
- Records that support future policy, procurement or audit review

Sovereign and public-sector documentation should avoid informal language and should distinguish local configuration from production deployment obligations.

## Required Documentation Artifacts

Every sprint or material change should update the relevant subset of:

- `README.md`
- `CHANGELOG.md`
- `docs/SPRINT_LOG.md`
- A sprint-specific document such as `docs/SPRINT_32_MOBILE_STORE_LAUNCH_CONSOLE.md`
- The affected domain document, for example `docs/RAG.md`, `docs/AUTH.md`, `docs/MOBILE_RELEASE.md`, `docs/SUPABASE_CLI.md`, `docs/VERCEL_DEPLOYMENT.md` or `docs/GITHUB_INDEPENDENT_OPERATIONS.md`
- Migration documentation when database schema changes
- Release notes or runbooks when deployment behavior changes
- Security, privacy, compliance or due diligence documentation when controls change

## Documentation Definition Of Done

A change is documentation-complete only when:

- The README still tells a coherent product and architecture story.
- The changelog records the user-visible, operational or architectural change.
- The sprint log records completed work, verification, provider-gated items and recommended follow-up.
- New database objects, RLS policies, AI flows, integrations and release gates are documented where applicable.
- Verification results are included using exact command names.
- Limitations and risks are named plainly.
- The documentation does not depend on a private conversation to be understandable.

## Evidence Language

Use precise status labels:

- `Implemented`: code exists in the repository.
- `Verified locally`: a local command or test passed.
- `Verified remotely`: a remote deployment, workflow, migration or provider integration was exercised.
- `Provider-gated`: code exists but requires credentials, secrets, paid provider access or production configuration.
- `Documented only`: the design or runbook exists but implementation is not complete.
- `Blocked`: progress requires access, credentials, external approval or user action.

Avoid unsupported language such as:

- "Fully production-ready" without naming checks, credentials and deployment state
- "Complete" when a local duplicate, failing gate or unverified provider path remains
- "Live" when the path is only mocked, seeded or documented

## AI-Assisted Engineering Notes

AXXESS has been built through AI-assisted engineering across Codex and Claude Code sessions. Future AI-assisted sessions should document:

- Which workspace was used
- Which branch was used
- Which files were modified
- Which checks were run
- Which remote was pushed
- Which assumptions were made
- Which human approvals were required
- Which local or remote blockers remained

This keeps the development process auditable for technical reviewers, investors, enterprise buyers and regulated stakeholders.

## Current Canonical Context

As of the canonical workspace migration documented in `docs/CANONICAL_WORKSPACE_MIGRATION.md`:

- The canonical active local workspace is `C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`.
- The GitLab repository `https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis` contains the unified Sprint 1-32 Codex work plus later Claude work.
- The final verified migration commit is `615faf218fbfe538dcdcd1eb1a079ee05ad65b4b`.
- Physical duplicate-workspace archival remains subject to the operating system releasing the old `C:\Users\Sudipta Sarmah\Downloads\Claude` folder lock.

Until that old folder is archived or removed, the code migration is complete but the physical workspace deduplication should not be described as fully complete.
