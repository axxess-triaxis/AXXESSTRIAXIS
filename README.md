# AXXESS by Triaxis

> Enterprise AI Operating Platform for Regulated Organizations

**Governance-native. Human-in-the-Loop. Sovereignty-aware. Built for durable enterprise deployment.**

---

## Overview

AXXESS is an enterprise AI operating platform designed for organizations that require AI systems to be explainable, governable, auditable and deployable across regulated environments.

Unlike AI applications built primarily for demonstrations or consumer productivity, AXXESS is engineered for production use inside governments, regulated enterprises, healthcare organizations, financial institutions, educational institutions and mission-critical organizations where accountability, compliance and operational traceability are fundamental requirements.

The platform combines AI orchestration, policy enforcement, workflow automation, enterprise integrations, Human-in-the-Loop review, operational observability and compliance-oriented controls into a unified operating layer that enables organizations to adopt AI without compromising governance.

Our primary markets are:

- GCC (including UAE, Saudi Arabia, Qatar and Bahrain)
- Singapore
- India
- Europe

These jurisdictions increasingly require AI systems to satisfy expectations around governance, explainability, privacy, security, data sovereignty and operational accountability.

AXXESS is being engineered from the outset to support those requirements.

---

# Why We Are Building AXXESS

Enterprise AI adoption is accelerating faster than enterprise AI governance.

Across industries, organizations are rapidly deploying large language models into customer service, knowledge management, operations, analytics and internal productivity. While these deployments often succeed as pilots, many struggle to transition into enterprise-wide production environments.

The reason is consistent.

Most AI products optimize for:

- fast onboarding
- rapid demonstrations
- consumer-grade user experience
- short-term experimentation

Very few optimize for:

- governance
- policy enforcement
- auditability
- operational evidence
- jurisdiction-aware deployment
- enterprise security
- regulatory readiness
- multi-tenant isolation

As organizations mature their AI adoption, these capabilities become mandatory rather than optional.

Consequently, many organizations are forced into expensive architectural redesigns before AI can become a trusted operational layer.

AXXESS exists to eliminate that redesign cycle.

Instead of treating governance as an add-on introduced after product-market fit, AXXESS treats governance as infrastructure.

Policy controls, operational evidence, auditability, observability, approval workflows and Human-in-the-Loop execution are designed as platform primitives rather than premium enterprise features.

This philosophy enables future capabilities to compound without repeatedly rebuilding the underlying architecture.

---

# Our Product Thesis

Enterprise AI should not require rebuilding itself every time governance requirements increase.

As organizations expand across business units, countries and regulatory environments, they inevitably encounter additional requirements relating to:

- privacy
- operational accountability
- security
- procurement
- legal defensibility
- internal controls
- audit evidence
- data residency

Traditional AI platforms frequently address these requirements through incremental patches layered onto systems originally optimized for consumer workflows.

AXXESS follows a different approach.

Governance is integrated into every significant execution path.

Every AI action should be capable of being:

- reviewed
- approved
- explained
- traced
- reproduced
- audited
- attributed
- governed

This philosophy influences every architectural decision across the platform.

---

# Design Principles

The platform is guided by several long-term engineering principles.

## Governance before autonomy

Autonomous execution should always remain subordinate to organizational policy.

Organizations—not models—retain authority over operational decisions.

---

## Human-in-the-Loop by default

AI accelerates decision-making.

People remain responsible for consequential decisions.

AXXESS therefore embeds review, approval, escalation and intervention directly into operational workflows.

---

## Observability is infrastructure

Production AI requires visibility.

Every significant action should generate operational telemetry, structured logs, traces and evidence that can be reviewed by engineering, security, compliance and business stakeholders.

---

## Auditability by design

Audit evidence should emerge naturally from execution rather than being reconstructed afterwards.

AXXESS records operational evidence as part of platform execution rather than relying on external documentation.

---

## Enterprise-first architecture

Consumer AI products optimize for individual productivity.

AXXESS optimizes for organizational coordination.

The platform is designed around:

- multi-tenancy
- policy enforcement
- identity
- governance
- enterprise integrations
- operational workflows
- institutional knowledge
- controlled execution

---

## Sovereignty-aware deployment

Different jurisdictions increasingly require organizations to maintain control over:

- data
- infrastructure
- models
- operational evidence

AXXESS separates globally reusable platform components from jurisdiction-specific controls, allowing regional expansion without fundamental architectural redesign.

---

# What Makes AXXESS Different

Many AI products can answer questions.

Fewer can execute governed enterprise work.

AXXESS combines capabilities that are typically fragmented across multiple systems into a single enterprise operating platform.

Core capabilities include:

- Identity and access management
- Policy enforcement
- Provider-neutral AI routing
- Prompt and workflow runtime
- Human approval workflows
- Enterprise connector framework
- Plugin execution
- Sandbox execution
- Operational observability
- Audit evidence generation
- Multi-tenant governance
- Compliance-oriented documentation
- Regional deployment controls
- AI review operations
- Enterprise administration

Rather than existing as disconnected features, these capabilities share a common governance model and operational evidence layer.

---

# Target Organizations

AXXESS is designed for organizations operating within environments where governance is a competitive requirement rather than a regulatory inconvenience.

Representative customer profiles include:

- Governments
- Public sector agencies
- Healthcare providers
- Hospitals
- Financial institutions
- Insurance companies
- Educational institutions
- Consulting firms
- Development organizations
- NGOs
- Enterprise shared services
- Mid-market regulated businesses
- Large multinational organizations

These organizations increasingly require AI systems capable of operating within formal organizational structures rather than individual productivity environments.

AXXESS is also priced and distributed as a self-serve product for Indian MSMEs, startups and NGOs —
the entry tier of the same five-tier commercial structure described in the next section, not a
separate, lighter product.

---

# Business Model & Commercial Structure

AXXESS is priced across five tiers on a single underlying platform, spanning two very different
buyer types:

| Tier | Buyer | Distribution | Illustrative price point |
|---|---|---|---|
| 1 | Indian MSMEs, startups, NGOs | Self-serve, iOS/Android app-store signup | **$50/year** |
| 2 | Growing SME / mid-market org | Self-serve or light-touch sales, web + mobile | Mid-tier, usage-scaled |
| 3 | Enterprise | Guided pilot → paid conversion, web-first | Enterprise-scaled |
| 4 | Regulated enterprise (healthcare, finance, education) | Sales-assisted, compliance-reviewed | Regulated-tier pricing |
| 5 | Sovereign / government / GCC corporate | Tailored, sandboxed, dedicated deployment | Custom, contract-negotiated |

Tier 1 is the same platform as tier 5 — same schema, same Row Level Security model, same
governance/audit layer — configured with a narrower `security_tier` and feature-flag exposure, not
a cut-down demo. This is why the platform is engineered as thoroughly as it is at this stage: the
same kernel that onboards a $50/year NGO this quarter must be structurally capable of becoming a
sovereign government tenant later without a re-platform. See
`MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` for the full architecture-to-business-model mapping,
including the exact schema columns (`security_tier`, `data_residency_region`) that back this claim
today, and what is honestly still a target rather than a shipped capability.

**Capital efficiency.** Total historic spend on development, design and product is approximately
$800 to date, with $80 spent in the current phase. At the Tier 1 price point, two self-serve
subscriptions cover current run-rate cost — the company does not depend on enterprise or sovereign
revenue to sustain current operations; those tiers are a parallel expansion path, not a precondition
for breakeven.

**Estonia entity and EU expansion path.** Triaxis operates an Estonian OÜ entity, intended to
support Schengen/EU market entry post-Year-3, sequenced after GDPR and EU AI Act compliance
documentation is built out. No EU-specific compliance documentation exists in this repository yet
— this is correctly future work, not a current claim.

---

# Current Product Status

**Platform maturity**

**Enterprise Beta Candidate**

Current implementation includes thirty-two structured engineering sprints covering governance, orchestration, operational controls, enterprise administration, connector infrastructure, audit evidence, observability, Human-in-the-Loop workflows, live tenant workflow execution, pilot release gates, customer-success acceptance operations, live-ops recovery, store-ready mobile release certification and full-stack mobile store launch readiness.

The platform currently supports:

- Provider-neutral AI routing
- Policy Engine
- AI Runtime
- Plugin Runtime
- Enterprise Connector Framework
- Pilot Command Center
- AI Review Inbox
- Sandbox Policy Attestation
- Operational Audit Evidence
- Encrypted OAuth Token Vault
- Gmail Integration
- RAG Release Gates
- Persisted Golden-Path Progress
- Workflow Timeline Evidence
- Review-to-Work Action Creation
- Pilot Tenant Acceptance
- Live-Ops Handoff Evidence
- Customer-Success Live Operations
- Stuck-Step Recovery
- Workflow Record Drilldowns
- Live Microsoft Mailbox Listing
- Regional Key Policy Posture
- Capacitor Store Release Certification
- TestFlight-ready iOS IPA Export
- Play Store-ready Android AAB Builds
- VS Code Mobile Release Tasks
- Mobile Store Launch Console
- Store Listing Packs
- Reviewer Account Automation
- Screenshot Manifest
- Crash and Release Health Monitoring
- Staged Rollout Controls
- Mobile Store Release Gate
- Multi-tenant Administration
- Usage Controls
- Enterprise Readiness Scoring

Additional capabilities continue to be introduced through structured sprint-based development.

---

**Website**

https://www.triaxisventures.com

**Enterprise Preview**

https://axxesstriaxis.vercel.app

---

*"Enterprise AI becomes trustworthy when governance, auditability and operational control are treated as core infrastructure—not post-deployment features."*

---

# Demo Mode and Live Beta Are Fully Partitioned

AXXESS is not a single demo dressed up as two modes. The investor/demo preview and the live beta
are genuinely separate, and — as of a direct, in-repository verification pass — are correctly
isolated from each other at every layer:

| | Investor/demo mode | Live beta (real tenant) |
|---|---|---|
| Entry point | Dedicated demo login, or `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` | Real Supabase Auth signup and onboarding |
| Data source | Fixed illustrative fixture data (`src/demo/demoRepositories.ts`) | Live Supabase Postgres, with an honest empty result on error — never fake data substituted |
| Tenant identity | Mock user/organization context | A real `auth.users` row and a real, provisioned `organizations` row |
| Postgres access | Not applicable (fixture data) | Row Level Security + Postgres role grants + a `tenant_id`-partitioned schema |

This was verified, not assumed: a genuine signup → onboarding → provisioning → sample-data-seed →
governed-RAG-query walkthrough was run end to end against a real, non-demo tenant, and the
resulting AI answer correctly cited a real, just-seeded document by name with a real confidence
score — not a fabricated one. Four rounds of dedicated demo-data-leakage auditing have found and
closed cases where this partition previously leaked (see
`Enterprise beta feedback - Batch 1 (30 responses)/DEMO_DATA_LEAKAGE_AUDIT.md`), and the schema-level
tenant-isolation bugs found during the live walkthrough have been fixed (see
`Enterprise beta feedback - Batch 1 (30 responses)/ITERATION_PROGRESS.md`'s 2026-07-21 entry). Full
architectural detail in `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` §5.

**The point of this discipline:** AXXESS is built for commercial pilots, not for impressing an
accelerator with a demo. A commercial pilot customer's data must never be able to leak into, or be
contaminated by, the same investor-facing preview that runs in the same codebase — and that
boundary is now verified, not just designed.

---

# Pre-Revenue, Pre-Pilot Traction

AXXESS completed its first structured beta-feedback batch: 30 submissions, 28 unique respondents
after deduplication. Full methodology and honest caveats in
`Enterprise beta feedback - Batch 1 (30 responses)/Enterprise_Beta_Feedback_Batch_1.md` and
`MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` §6 — summarized here:

| Signal | Result |
|---|---|
| Combined NPS (deduplicated) | 82.1 |
| Enterprise-cohort NPS | 87.5 |
| Mean likelihood to recommend | ~9.55 / 10 |
| External enterprise respondents indicating a pilot horizon within 6 months | 4 of 7 (57%) |
| External enterprise respondents selecting "Pilot Customer" | 3 of 7 |
| External enterprise respondents who would trust AXXESS with sensitive data | 6 of 7 |
| Stated budget range (enterprise cohort) | ~$100–500/year to $5,000+/year |

**What this is not:** proof of product-market fit, a signed pilot, or paying revenue. No customer
has paid AXXESS money and no pilot is currently signed — these are survey-stated intent and
attachment signals, reported at the same precision the source analysis uses, not rounded up. What
it is: real, structured, directionally positive early signal that the product resonates with its
intended market, obtained before any revenue-generating activity, which is the correct stage at
which to be collecting it.

---

# Architecture

AXXESS is designed as a governance-native enterprise AI operating platform rather than a collection of AI assistants or workflow automations.

The architecture separates identity, governance, execution, observability and evidence generation into independent but tightly integrated platform layers. This allows organizations to evolve AI capabilities without repeatedly redesigning security, compliance or operational controls.

Rather than optimizing for "time-to-first-token," AXXESS optimizes for long-term enterprise maintainability, operational transparency and jurisdiction-aware deployment.

---

# High-Level Architecture

```
                        Client Applications
                                 │
                                 ▼
                   Identity & Access Management
                    (OIDC • SSO • RBAC • MFA)
                                 │
                                 ▼
                        API Gateway & Auth
                                 │
                                 ▼
                  Policy Decision Point (PDP)
                 Governance • Guardrails • Rules
                                 │
             ┌───────────────────┴────────────────────┐
             ▼                                        ▼
      AI Runtime Engine                    Connector Runtime
             │                              Plugin Framework
             │                              OAuth Connectors
             │                              Enterprise Systems
             ▼
     Provider Routing Layer
(OpenAI • Anthropic • Gemini • Local Models)
             │
             ▼
     Prompt & Workflow Runtime
             │
             ▼
    Human-in-the-Loop Review Layer
             │
             ▼
     Sandbox Execution Environment
             │
             ▼
  Observability • Audit • Evidence Store
             │
             ▼
 Enterprise Administration & Reporting
```

---

# Core Platform Layers

## Identity & Access Management

Every request begins with authenticated identity.

The identity layer establishes:

- Tenant identity
- User identity
- Organizational context
- Roles
- Permissions
- Authentication state
- Session integrity

Current capabilities include:

- OIDC
- SSO
- RBAC
- Tenant-scoped permissions
- Protected administrative APIs

Future roadmap includes:

- SCIM
- Enterprise SAML enhancements
- Fine-grained delegated administration

---

# Policy Engine

The Policy Engine is the primary governance layer within AXXESS.

Rather than allowing AI models to execute directly, every significant operation passes through policy evaluation.

The Policy Engine determines:

- whether execution is permitted
- which model may execute
- which tools may be invoked
- which connectors are accessible
- whether human approval is required
- whether sandbox execution is mandatory
- audit evidence requirements
- applicable governance rules

Policy evaluation occurs before runtime execution.

This architecture enables organizations to evolve governance without modifying downstream application logic.

---

# AI Runtime

The runtime coordinates execution across AI providers, workflows and enterprise integrations.

Responsibilities include:

- workflow execution
- prompt orchestration
- execution context
- retry management
- deterministic runtime configuration
- execution metadata
- runtime versioning

The runtime intentionally separates orchestration from model providers, allowing organizations to replace or combine providers without rewriting business workflows.

---

# Provider Routing Layer

Sprint 20 introduced provider-neutral routing.

Rather than coupling workflows to individual model vendors, AXXESS routes inference requests through an abstraction layer.

Current capabilities include:

- provider abstraction
- fallback chains
- retry handling
- routing policies
- usage quotas
- request governance

Benefits include:

- vendor independence
- resilience
- controlled failover
- enterprise governance
- future sovereign model deployment

Future routing policies may incorporate:

- latency
- jurisdiction
- regulatory requirements
- workload classification
- model cost
- enterprise policy

---

# Prompt Runtime

Prompts are treated as versioned operational assets rather than application constants.

Current capabilities include:

- versioned prompts
- deterministic execution
- runtime configuration
- execution metadata
- workflow reproducibility

Future roadmap includes:

- prompt lineage
- organizational prompt governance
- prompt approval workflows
- enterprise prompt registry

---

# Workflow Engine

Enterprise work rarely consists of a single model call.

AXXESS coordinates multi-step workflows involving:

- users
- AI
- connectors
- approvals
- enterprise systems

Workflow execution supports:

- deterministic sequencing
- review checkpoints
- escalation
- audit generation
- policy validation

Future workflow capabilities include:

- graphical workflow designer
- reusable workflow templates
- enterprise orchestration marketplace

---

# Plugin Runtime

Sprint 20 introduced a governed plugin runtime.

Plugins execute within defined contracts rather than unrestricted execution.

Current implementation includes:

- runtime contracts
- execution metadata
- approval flow integration
- audit generation
- connector compatibility

Plugin execution never bypasses policy enforcement.

Every invocation remains observable and attributable.

---

# Enterprise Connector Framework

Connectors integrate AI workflows with organizational systems.

Current connector architecture supports:

- provider-neutral abstraction
- OAuth authentication
- approval workflows
- audit evidence
- governance policies

Sprint 24 introduced production OAuth callback and token exchange paths.

Sprint 25 introduced live Gmail message import.

Supported connector categories include:

- Email
- Productivity
- CRM
- Knowledge Management
- Internal APIs
- Custom Enterprise Systems

Connector coverage will continue expanding through future releases.

---

# OAuth Infrastructure

OAuth credentials are treated as enterprise assets.

Sprint 24 introduced:

- signed OAuth state verification
- secure callback flow
- Microsoft connector support
- Gmail connector support

Sprint 25 added:

- encrypted token vault
- secure token persistence
- tenant isolation
- governance integration

Automated refresh and rotation remain part of future connector hardening.

---

# Token Vault

Enterprise deployments require credential lifecycle management.

Sprint 25 introduced an encrypted OAuth Token Vault.

Responsibilities include:

- encrypted credential storage
- tenant isolation
- connector authorization
- secure retrieval
- audit integration

Future roadmap includes:

- automatic refresh
- rotation
- revocation detection
- secret versioning
- enterprise HSM integration

---

# Human-in-the-Loop Operations

AXXESS assumes that significant organizational decisions require accountable human oversight.

Human review is therefore integrated directly into execution.

Current capabilities include:

- review queues
- approval
- rejection
- editing
- escalation
- governance evidence

This approach enables organizations to automate repetitive work while preserving accountability for consequential actions.

---

# AI Review Inbox

Sprint 24 introduced the tenant-facing AI Review Inbox.

This serves as the operational workspace for governed execution.

Reviewers can:

- inspect AI outputs
- approve execution
- edit responses
- reject requests
- escalate decisions

Every review action contributes to operational evidence.

---

# Pilot Command Center

Sprint 22 introduced the Pilot Command Center.

The Command Center provides centralized operational visibility across governed AI deployments.

Current capabilities include:

- approval queue visibility
- connector execution status
- enterprise readiness scoring
- governed AI metrics
- command-center snapshots

Future roadmap includes:

- operational dashboards
- deployment analytics
- SLA monitoring
- organizational health scoring

---

# Sandbox Execution

Certain operations require isolated execution environments.

Sprint 20 introduced sandbox execution abstractions.

Sprint 22 added policy attestation.

Sprint 24 connected approved execution paths.

Current capabilities include:

- sandbox execution
- policy verification
- dry-runs
- execution evidence
- Kubernetes-ready specifications

Future roadmap includes:

- production sandbox clusters
- workload isolation
- ephemeral execution environments

---

# Multi-Tenant Architecture

Tenant isolation is a foundational architectural principle.

Isolation occurs across:

- authentication
- authorization
- data
- configuration
- policy
- credentials
- execution context

There is no intended cross-tenant execution path within runtime services.

Sprint 22 extended tenant isolation through Supabase Row Level Security.

Sprint 25 expanded tenant-aware operational snapshots.

---

# Data Residency

Regional deployment is treated as a platform capability.

AXXESS separates:

**80% Common Kernel**

Shared platform services:

- runtime
- governance
- observability
- audit
- orchestration
- connector framework

**20% Jurisdiction Layer**

Localized capabilities:

- residency controls
- language
- regional integrations
- deployment topology
- regulatory adaptations

This architecture minimizes future re-platforming while supporting international expansion.

---

# Operational Philosophy

AXXESS does not attempt to maximize autonomous execution.

Instead, it attempts to maximize:

- organizational trust
- governance
- explainability
- operational transparency
- enterprise resilience

Autonomy increases only where governance permits.

The platform therefore scales institutional confidence alongside AI capability rather than trading one for the other.
# Governance, Security & Operational Controls

Enterprise AI systems become valuable only when organizations trust them to operate within defined institutional boundaries.

AXXESS treats governance, security, observability and auditability as first-class platform capabilities rather than enterprise add-ons. Every meaningful AI action is designed to produce operational evidence, respect organizational policy and remain attributable throughout its lifecycle.

This philosophy informs every major architectural decision—from identity and authorization to runtime execution, connector access, human review and evidence generation.

---

# Governance Model

AXXESS follows a layered governance model that separates decision authority from execution.

```
Identity
      │
      ▼
Authorization
      │
      ▼
Policy Evaluation
      │
      ▼
Runtime Execution
      │
      ▼
Human Review (if required)
      │
      ▼
Operational Evidence
      │
      ▼
Audit & Reporting
```

Every request traverses this governance chain before becoming part of the enterprise record.

---

# Identity & Authorization

Identity is the root of every governed workflow.

Current implementation supports:

- Tenant-scoped authentication
- Role-Based Access Control (RBAC)
- Protected administrative APIs
- Organization-level isolation
- Session-aware authorization
- Connector authorization boundaries

Future roadmap includes:

- SCIM provisioning
- Enterprise SAML
- Attribute-Based Access Control (ABAC)
- Delegated administration
- Conditional access policies

---

# Tenant Isolation

Multi-tenancy is implemented as a core architectural boundary rather than a deployment convenience.

Tenant separation currently exists across:

- Identity
- Authorization
- Runtime execution
- Configuration
- OAuth credentials
- Policy evaluation
- Command Center state
- Audit evidence
- Data persistence

Sprint 22 introduced tenant-scoped Supabase Row Level Security (RLS).

Sprint 25 expanded tenant-aware operational snapshots and token isolation.

Cross-tenant runtime execution is intentionally excluded from the platform architecture.

---

# Policy Enforcement

Every meaningful operation passes through the Policy Engine.

The engine determines:

- whether execution is permitted
- which provider may execute
- connector permissions
- plugin permissions
- human approval requirements
- sandbox requirements
- audit obligations
- execution restrictions

Policies are evaluated before runtime execution.

This design allows organizations to evolve governance rules without rewriting business workflows.

---

# Human-in-the-Loop Governance

AXXESS assumes that organizational accountability ultimately belongs to people rather than models.

Human review is therefore integrated into the execution lifecycle rather than treated as an exceptional workflow.

Current review capabilities include:

- Approve
- Reject
- Edit
- Escalate
- Reassign
- Record review evidence

Sprint 24 introduced the AI Review Inbox, enabling tenant users to manage pending AI work from a dedicated operational workspace.

Review actions automatically contribute to audit evidence.

---

# AI Review Inbox

The Review Inbox serves as the operational interface between AI-generated work and accountable organizational decisions.

Supported review actions include:

- View generated outputs
- Inspect execution context
- Review policy decisions
- Modify outputs
- Approve
- Reject
- Escalate
- Generate evidence

Future roadmap includes:

- Reviewer assignment
- SLA tracking
- Queue prioritization
- Multi-stage approval workflows
- Collaborative review

---

# Pilot Command Center

Sprint 22 introduced the Pilot Command Center as the operational control plane for governed AI deployments.

Current capabilities include:

- AI workload visibility
- Connector execution monitoring
- Review queue summaries
- Enterprise readiness scoring
- Command Center snapshots
- Administrative oversight

The Command Center provides operators with a centralized view of governed AI operations across the platform.

Future roadmap includes:

- Deployment health dashboards
- Organization analytics
- Operational KPIs
- SLA monitoring
- Incident management

---

# Auditability

AXXESS records operational evidence continuously during execution.

Rather than reconstructing events after deployment, evidence is generated as a native platform output.

Evidence may include:

- Request metadata
- User identity
- Tenant identity
- Policy version
- Prompt version
- Runtime configuration
- Model provider
- Approval actions
- Connector activity
- Sandbox execution
- Review decisions
- Timestamps
- Region metadata

Future roadmap includes:

- Cryptographic signing
- Immutable evidence bundles
- Long-term archival
- External audit exports

---

# Observability

Operational visibility is treated as infrastructure rather than diagnostics.

Current observability capabilities include:

- Request tracing
- Structured logs
- Runtime metrics
- Usage analytics
- Cost visibility
- Provider activity
- Connector telemetry

This information supports:

- debugging
- governance
- compliance
- operational monitoring
- enterprise reporting

Future observability enhancements include:

- OpenTelemetry integration
- Distributed tracing
- Organization dashboards
- AI quality analytics

---

# Sandbox Execution

Certain workflows require isolated execution environments.

Sprint 20 introduced sandbox execution abstractions.

Sprint 22 added policy attestation.

Sprint 24 connected approved sandbox execution paths.

Current implementation supports:

- Sandbox dry-runs
- Execution validation
- Policy attestation
- Kubernetes-ready execution specifications
- Controlled execution pathways

Future roadmap includes:

- Ephemeral containers
- Dedicated execution clusters
- Runtime isolation profiles
- Organization-specific sandbox environments

---

# Connector Security

Enterprise integrations require controlled access to organizational systems.

Current connector security includes:

- OAuth authorization
- Signed OAuth state
- Protected callback handling
- Tenant isolation
- Audit logging
- Policy enforcement

Sprint 24 introduced secure OAuth callback and token exchange.

Sprint 25 introduced encrypted token storage.

---

# Encrypted Token Vault

Sprint 25 introduced a dedicated encrypted OAuth Token Vault.

Responsibilities include:

- Secure credential persistence
- Tenant isolation
- Connector authorization
- Runtime token retrieval
- Governance integration

Future enhancements include:

- Automatic refresh
- Token rotation
- Revocation detection
- Version history
- HSM integration
- BYOK support

---

# Gmail Integration

Sprint 25 introduced the first production connector implementation.

Current capabilities include:

- OAuth authorization
- Selected-message import
- Tenant-aware credential handling
- Audit logging
- Policy enforcement

This implementation establishes the connector architecture used for future enterprise integrations.

Future connector roadmap includes:

- Outlook
- Google Drive
- Microsoft 365
- Slack
- Teams
- Notion
- Salesforce
- HubSpot
- Jira
- SharePoint
- SAP
- Oracle
- ServiceNow

---

# Usage Governance

Sprint 21 introduced usage governance capabilities.

Current controls include:

- Request limits
- Provider quotas
- Tenant usage controls
- Enterprise readiness scoring

Future enhancements include:

- Budget enforcement
- Cost allocation
- Organization quotas
- Department-level policies
- AI consumption analytics

---

# RAG Evaluation Framework

Retrieval-Augmented Generation requires continuous quality monitoring.

Sprint 22 introduced RAG evaluation persistence.

Sprint 24 introduced release evaluation.

Sprint 25 made RAG release gates mandatory.

Current capabilities include:

- Evaluation persistence
- Release validation
- Required quality gates
- CI integration

Future roadmap includes:

- Benchmark datasets
- Hallucination analysis
- Regression testing
- Prompt quality scoring
- Organization-specific evaluation suites

---

# Security Testing

Current engineering quality includes:

- TypeScript type safety
- ESLint
- Unit tests
- Integration tests
- Repository Quality checks
- CodeQL
- Secret scanning
- Dependency review
- Playwright validation
- Mobile validation
- Capacitor store readiness
- Android signed AAB verification
- iOS IPA export verification
- Mobile store release readiness gate
- Required RAG Release Gate
- Pilot Golden Path Release Gate
- Vercel Preview validation

Sprint 32 adds a Mobile Store Launch Console, store listing packs, reviewer account readiness, screenshot manifest verification, release-health monitoring, staged rollout controls and a dedicated mobile store release gate on top of the broader type, lint, unit, build, security, Supabase, RAG, Playwright and mobile release validation pipeline.

---

# Operational Philosophy

Security is not a feature added before production.

Governance is not documentation written before procurement.

Auditability is not generated after deployment.

Within AXXESS, these capabilities are treated as operational infrastructure.

The objective is not simply to execute AI workloads—it is to enable organizations to execute AI workloads that remain explainable, reviewable, policy-compliant and operationally trustworthy throughout their lifecycle.
# Compliance, Sovereignty & Enterprise Readiness

Enterprise AI is increasingly evaluated not only by model quality but by its ability to operate safely within legal, regulatory and organizational constraints.

AXXESS is engineered around a **comply-by-design** philosophy. Rather than retrofitting governance after customer acquisition, the platform embeds policy enforcement, auditability, observability and operational controls into its core architecture from the outset.

The objective is to reduce future technical debt, shorten enterprise procurement cycles and support deployment into jurisdictions where governance expectations are continuously evolving.

---

# Compliance Philosophy

Compliance is not treated as a one-time certification exercise.

Instead, AXXESS views compliance as an operational capability built from:

- Governance
- Technical controls
- Operational evidence
- Documentation
- Repeatable engineering processes
- Secure deployment practices

This approach allows organizations to incrementally strengthen their compliance posture without requiring structural platform redesign.

---

# Engineering Approach

Our engineering philosophy follows four principles:

## Build Controls Before Certifications

Certifications validate operational maturity but cannot replace sound system architecture.

AXXESS prioritizes building the underlying controls first, allowing future certifications to become documentation and verification exercises rather than engineering projects.

---

## Governance Before Automation

Automation should never bypass organizational accountability.

Every meaningful AI operation should remain subject to:

- Policy
- Human oversight
- Organizational rules
- Audit evidence
- Operational visibility

---

## Documentation as Infrastructure

Documentation is treated as part of the product itself.

Architecture decisions, migration history, governance controls, operational procedures and engineering standards are maintained alongside the codebase.

This supports:

- Enterprise procurement
- Security reviews
- Internal onboarding
- Compliance assessments
- Long-term maintainability

AXXESS documentation is now governed by `docs/DOCUMENTATION_GOVERNANCE.md`. Future work must be documented for five review audiences:

- Technical reviewers
- Investors assessing technical and engineering capability
- Enterprise buyers
- Investor or technical due diligence teams
- Government, sovereign and regulated stakeholders

Every material sprint, production fix, data model change, AI workflow change, integration change, deployment change and release process change should document what changed, why it changed, how it was verified, what remains provider-gated, and which risks remain.

---

## Operational Evidence by Default

Operational evidence should be produced naturally during execution rather than reconstructed during audits.

Evidence generated by AXXESS includes:

- Runtime activity
- Review actions
- Connector execution
- Policy decisions
- Administrative operations
- Deployment events
- Release validation

---

# Jurisdiction Strategy

Rather than optimizing for a single geography, AXXESS is designed to support deployment across multiple regulatory environments through a modular architecture.

Current strategic focus includes:

- India
- UAE
- Saudi Arabia
- Singapore
- European Union
- Wider GCC

Each market has distinct regulatory expectations, procurement practices and data governance requirements.

The platform architecture is intentionally designed to accommodate these differences without fragmenting the core system.

---

# The 80/20 Architecture

AXXESS separates globally reusable capabilities from jurisdiction-specific adaptations. This is not
an abstract design goal — it is concretely verifiable in the repository today:

- The web application (`src/app/*`, Next.js) and the Capacitor-wrapped iOS/Android app
  (`apps/mobile-capacitor`) render the **same** `App.tsx` component tree from the **same** `src/`
  source, via a Vite build (`vite.config.ts` → `src/main.tsx`) that `apps/mobile-capacitor`'s
  `capacitor.config.ts` loads directly. A fix made once in `src/` ships to web and both mobile app
  stores simultaneously, with no second implementation to keep in sync.
- `organizations.security_tier` (checked: `standard` / `regulated` / `mission-critical`) and
  `organizations.data_residency_region` (open text, defaulting to `global`) exist on the schema's
  foundational migration and are set per-tenant during onboarding — the same tenant-provisioning
  code path serves every pricing tier and every configured jurisdiction today, differing only in
  which values are set, not in which code runs.

Full detail, including what is honestly still a target rather than a shipped capability (e.g. no
literal `sovereign` tier value exists in the schema yet), is in
`MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md`, which also maps this architecture directly to the
five-tier pricing model described earlier in this README.

## 80% Common Kernel

The common platform includes:

- Identity
- Policy Engine
- AI Runtime
- Provider Routing
- Prompt Runtime
- Connector Framework
- Plugin Runtime
- Observability
- Audit Layer
- Evidence Generation
- Administration
- Security Controls
- Workflow Engine

These components remain consistent across supported markets.

---

## 20% Jurisdiction Layer

Localized adaptations include:

- Data residency requirements
- Regional infrastructure
- Language support
- Local AI models
- Regulatory mappings
- Enterprise integrations
- Government-specific workflows
- Compliance documentation

This architecture enables regional expansion while preserving a single maintainable codebase.

---

# Data Sovereignty

Different organizations have different expectations regarding control over:

- Data storage
- Model selection
- Runtime execution
- Infrastructure
- Audit evidence

AXXESS is designed to support sovereignty-aware deployment models where these requirements can be addressed through configuration and deployment strategy rather than architectural redesign.

Current platform capabilities supporting this direction include:

- Tenant isolation
- Policy-based execution
- Region-aware architecture
- Provider abstraction
- Connector governance
- Operational evidence
- Administrative controls

---

# Privacy

Privacy is addressed through architectural controls rather than isolated features.

Current design principles include:

- Least privilege access
- Tenant separation
- Controlled connector authorization
- Protected administrative APIs
- OAuth credential isolation
- Audit logging
- Operational traceability

Future roadmap includes:

- Data Subject Request workflows
- Privacy administration
- Consent management
- Retention policies
- Automated privacy reporting

---

# Regulatory Alignment

The following table summarizes the platform's engineering alignment.

| Framework / Region | Current Engineering Posture | Current Status |
|--------------------|-----------------------------|----------------|
| EU AI Act | Governance-first architecture, Human oversight, auditability, operational evidence | Partial (Advancing) |
| GDPR | Privacy-oriented architecture, tenant isolation, evidence generation | Partial (Advancing) |
| Singapore PDPA | Governance, accountability and operational controls | Partial (Advancing) |
| UAE (DIFC / ADGM) | Governance-native enterprise architecture | Partial (Advancing) |
| Saudi Arabia / GCC | Sovereignty-aware deployment model | Foundational → Partial |
| India | Local-language roadmap, enterprise deployment strategy | Foundational → Partial |

**Interpretation**

"Partial (Advancing)" indicates that engineering controls are actively implemented and integrated into the platform.

Formal legal compliance depends on:

- deployment architecture
- customer implementation
- jurisdiction-specific legal interpretation
- operational procedures
- future certifications

---

# Current Control Maturity

| Control Domain | Current Maturity |
|----------------|-----------------|
| Governance | Advanced |
| Policy Enforcement | Advanced |
| Human-in-the-Loop | Advanced |
| Observability | Advanced |
| Auditability | Advanced |
| Enterprise Administration | Advanced |
| OAuth Governance | Advanced |
| Token Security | Advanced |
| Connector Framework | Advanced |
| Multi-tenancy | Advanced |
| Sandbox Execution | Partial (Advancing) |
| Data Residency | Partial (Advancing) |
| Compliance Automation | Foundational |
| BYOK / HSM | Planned |
| Multi-region Deployment | Planned |

---

# Repo-local Supabase Platform

Sprint 25 introduced a fully repository-managed Supabase workflow.

The platform no longer depends on globally installed tooling.

Current implementation includes:

- Repository-pinned Supabase CLI
- Version-controlled configuration
- Local migration verification
- Automated RLS validation
- GitHub Actions integration
- Migration documentation
- Repository-level developer onboarding

Verification currently includes:

- CLI version validation
- Migration verification
- TypeScript validation
- Linting
- CI integration

This improves reproducibility across development environments and simplifies contributor onboarding.

---

# Enterprise Readiness

Sprint 21 introduced enterprise readiness scoring to help evaluate deployment maturity across organizational environments.

This scoring framework is intended to evolve alongside the platform and may ultimately incorporate:

- Governance maturity
- Connector readiness
- Operational controls
- Deployment configuration
- Security posture
- Documentation completeness
- Organizational onboarding
- Compliance readiness

---

# Deployment Philosophy

AXXESS is designed to support multiple deployment models.

Potential deployment strategies include:

- Cloud-hosted SaaS
- Dedicated tenant deployments
- Sovereign cloud deployments
- Government-managed infrastructure
- Enterprise-managed environments

The underlying architecture minimizes differences between these deployment models while allowing governance controls to remain consistent.

---

# Honest Positioning

AXXESS does **not** currently claim:

- SOC 2 certification
- ISO 27001 certification
- Complete compliance with every jurisdiction
- Legal certification by default
- Production readiness for every regulated workload

Instead, AXXESS claims something narrower and more important:

The platform has been architected around governance, auditability, operational evidence and policy enforcement from its earliest engineering stages.

As additional enterprise customers, deployment environments and certifications emerge, these foundations reduce the likelihood of major architectural rework.

---

# Long-Term Objective

Our long-term objective is not simply to help organizations use AI.

It is to help organizations deploy AI that remains:

- Governable
- Explainable
- Reviewable
- Secure
- Auditable
- Sovereignty-aware
- Operationally trustworthy

We believe these qualities will increasingly distinguish durable enterprise AI platforms from short-lived AI applications as regulatory expectations, procurement standards and organizational AI maturity continue to evolve.
# Engineering, Repository & Development Workflow

AXXESS is developed using a structured, sprint-based engineering methodology focused on incremental delivery, automated quality assurance and governance-first implementation.

Rather than optimizing for rapid feature accumulation, the engineering process prioritizes maintainability, operational transparency and production readiness. Every sprint aims to introduce meaningful platform capabilities while preserving architectural consistency and code quality.

As of **Sprint 32**, AXXESS has evolved through thirty-two structured engineering iterations covering identity, governance, enterprise workflows, AI orchestration, connector infrastructure, operational controls, release automation, production UX hardening, executable pilot workflow evidence, release-gated golden-path validation, pilot tenant acceptance operations, customer-success live operations, store-ready mobile release certification and full-stack mobile store launch readiness.

---

# Engineering Principles

Development is guided by five core principles:

## AI-Native Engineering

AXXESS is developed using an AI-native software engineering workflow where modern coding assistants accelerate implementation while all architectural decisions, integration strategies, governance models and quality standards remain under human direction.

Human oversight governs:

- Architecture
- Security decisions
- Product strategy
- Runtime design
- Governance
- Code review
- Documentation
- Release approval

AI accelerates implementation; it does not replace engineering judgment.

---

## Continuous Integration First

Every feature is expected to pass automated validation before becoming part of the platform.

Typical validation includes:

- TypeScript compilation
- ESLint
- Unit tests
- Integration tests
- Production build verification
- Repository quality checks
- Dependency review
- Secret scanning
- CodeQL
- Playwright
- Release gates

This minimizes regression risk while allowing frequent iteration.

---

## Documentation as Code

Engineering documentation evolves alongside implementation.

Platform documentation includes:

- Architecture
- Security
- Compliance
- Sprint logs
- Changelogs
- Environment setup
- Deployment guidance
- Migration documentation
- Operational procedures

Documentation is version-controlled within the repository to ensure technical decisions remain reproducible and auditable.

---

## Infrastructure as Repository

Development tooling is managed inside the repository wherever practical.

This minimizes contributor onboarding complexity while improving reproducibility across environments.

Examples include:

- Repository-managed Supabase CLI
- GitHub workflows
- Environment templates
- Migration verification
- Release gates
- CI validation

---

## Incremental Enterprise Readiness

Rather than delaying governance until after product-market fit, enterprise capabilities are introduced incrementally across each sprint.

Examples include:

- Governance
- Observability
- Auditability
- OAuth
- Connector security
- Policy enforcement
- Human review
- Operational evidence
- Release validation

---

# Repository Structure

This is the actual, verified layout — not an aspirational target. AXXESS is a pnpm workspace
(`pnpm-workspace.yaml`) with the primary Next.js web application at the repository root, and two
distinct mobile surfaces under `apps/`. See `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` for the
full architecture rationale and how these surfaces share a kernel.

```
/
├── src/                      # Primary Next.js web app (App Router) — the shared kernel
│   ├── app/                  # Routes: dashboard, ai-workspace, projects, tasks, meetings,
│   │                         # documents, knowledge, approvals, crm, stakeholders, analytics,
│   │                         # admin, integrations, auth, onboarding, api/*
│   ├── features/             # Feature-module UI components, shared by web and the Capacitor shell
│   ├── services/             # AI routing, RAG, integrations, analytics, workflows
│   ├── repositories/         # Live (Supabase), demo, and empty repository implementations
│   ├── auth/                 # Session resolution, provisioning, Supabase auth client
│   ├── security/             # RBAC / UserContext
│   ├── demo/                 # Demo-mode gating and fixture data (isDemoModeEnabled)
│   └── main.tsx              # Vite entry point — mounts the same App.tsx the Capacitor shell loads
│
├── apps/
│   ├── mobile-capacitor/     # Native iOS/Android shell wrapping the Vite build of src/ (see above) —
│   │                         # no business logic of its own, only native Capacitor plugins
│   └── mobile/               # Separate native Expo/React Native app (expo-router) — early
│                              # scaffolding, shares only packages/shared, not yet live-data-wired
│
├── packages/
│   └── shared/                # Constants/types shared between the web kernel and apps/mobile
│                               # (sectors, roles, analytics event names, OAuth config)
│
├── supabase/
│   ├── config.toml
│   ├── migrations/            # Versioned schema, RLS policies, tenant_id/grant fixes
│   └── seeds/
│
├── Enterprise beta feedback - Batch 1 (30 responses)/   # Beta survey analysis, sprint iteration
│                                                          # log, closeout, demo-data-leakage audit
│
├── scripts/
├── .github/
│   └── workflows/
│
├── MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md
└── README.md
```

The repository is organized around one shared kernel (`src/`) consumed identically by the web app
and the Capacitor mobile shell, plus a separate, thinner-integration native mobile app — not a set
of independently-evolving packages. This is a deliberate, verified difference from an earlier draft
of this section, which described a `packages/ai-runtime` / `packages/policy-engine` /
`apps/web` / `apps/admin` / `apps/api` split that does not exist in the codebase; the platform
capabilities described elsewhere in this README (Policy Engine, AI Runtime, Provider Routing, etc.)
are real, but they live as modules inside `src/services/` and `src/features/`, not as separate
workspace packages.

---

# Technology Stack

## Backend

- TypeScript
- Node.js
- PostgreSQL
- PL/pgSQL

---

## Frontend

- Next.js
- React
- TypeScript

---

## Mobile

Two distinct mobile surfaces exist (verified against the repository, not aspirational — see
`MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` §2 for the full rationale):

- **`apps/mobile-capacitor`** — a Capacitor native shell wrapping the same web application kernel
  (`src/`) via a Vite build; this is the production mobile path today, with 100% feature parity
  with web by construction, not by duplication.
- **`apps/mobile`** — a separate, genuinely native Expo/React Native app (`expo-router`,
  React Native 0.86), sharing only `packages/shared`'s constants/types with the web kernel today.
  Early scaffolding — its screens are not yet wired to live data.
- Android Play-ready AAB release lane
- iOS TestFlight-ready IPA release lane
- VS Code mobile build tasks
- Mobile Store Launch Console
- Store listing, reviewer, screenshot, health and rollout readiness gate

---

## Database

- PostgreSQL
- Supabase

---

## Authentication

- OAuth
- OIDC
- RBAC

---

## Infrastructure

- GitHub
- GitHub Actions
- Vercel
- Supabase

---

## AI

- Provider-neutral architecture
- Multi-provider routing
- Prompt runtime
- Workflow orchestration

---

# Development Workflow

Development follows a structured sprint lifecycle.

```
Planning
      │
      ▼
Architecture
      │
      ▼
Implementation
      │
      ▼
Testing
      │
      ▼
Documentation
      │
      ▼
CI Validation
      │
      ▼
Pull Request
      │
      ▼
Review
      │
      ▼
Merge
```

Each sprint concludes only after documentation and automated validation are complete.

---

# Sprint Evolution

## Sprint 0–5

Platform foundations.

Highlights:

- Identity
- Authentication
- Tenant model
- Core repository

---

## Sprint 6–10

Governance foundations.

Highlights:

- Policy Engine
- Prompt runtime
- Workflow architecture

---

## Sprint 11–15

Enterprise controls.

Highlights:

- Observability
- Auditability
- Documentation
- Operational evidence

---

## Sprint 16–19

Enterprise maturity.

Highlights:

- Administration
- Governance refinement
- Deployment preparation

---

## Sprint 20–21

Major platform expansion.

Implemented:

- Tenant model policy
- Provider fallback chains
- Plugin runtime contracts
- Plugin approval workflow
- Sandbox execution dry-runs
- Kubernetes-ready execution specifications
- Usage limits
- Enterprise readiness scoring
- Support operations primitives
- Administrative interfaces
- Protected APIs
- Documentation
- Tests
- Supabase migration

Verification:

- TypeScript ✓
- ESLint ✓
- Build ✓
- Tests ✓

---

## Sprint 22–23

Operational governance.

Implemented:

- Pilot Command Center
- Connector execution queue
- Governed AI review evidence
- Sandbox policy attestation
- RAG evaluation persistence
- Tenant-scoped Supabase Row Level Security
- Administrative APIs
- Documentation
- Tests

Verification:

- TypeScript ✓
- ESLint ✓
- Build ✓
- GitHub Actions ✓
- Vercel Preview ✓

---

## Sprint 24

Operational review workflows.

Implemented:

- AI Review Inbox
- OAuth callback flow
- Gmail connector
- Microsoft connector
- OAuth state verification
- Scheduled snapshots
- Sandbox execution path
- RAG release evaluator
- Supabase migration
- Documentation
- Sprint logs

Verification:

- CodeQL
- TypeScript
- ESLint
- Tests
- Production build
- Vercel Preview

---

## Sprint 25

Enterprise integration maturity.

Implemented:

- Encrypted OAuth Token Vault
- Live Gmail selected-message import
- Multi-tenant Command Center snapshots
- AI Workspace navigation
- Required RAG Release Gate
- Supabase migration
- Documentation updates
- Sprint documentation

Verification:

- 67 test files
- 177 passing tests
- TypeScript
- ESLint
- Production build
- RAG Release Gate
- CodeQL
- Dependency Review
- Secret Scan
- Repository Quality
- Playwright
- Mobile validation
- Vercel Preview

---

## Sprint 26

Enterprise workflow unification and production UX hardening.

Implemented:

- Shared enterprise golden-path workflow service
- Reusable Enterprise Workflow Journey component
- Readiness score and completion percentage for tenant journey state
- Role-aware workflow locks and next-best action queue
- Executive Dashboard golden-path command surface
- AI Workspace workflow journey side rail
- Dashboard priority actions derived from workflow state
- Tests for sequencing, RBAC-aware action visibility, blocked prerequisites and rendering
- Sprint documentation

Verification:

- TypeScript
- ESLint
- Unit tests
- Production build

---

## Sprint 27

Live tenant workflow execution and pilot usability.

Implemented:

- Tenant-scoped golden-path progress persistence
- Tenant-scoped workflow timeline evidence
- Review-to-work creation from approved AI outputs
- Dashboard Tenant Health Command Center
- Workflow timeline panels on Dashboard, AI Review Inbox, Projects, Tasks, Documents and Approvals
- Selected Gmail/Microsoft mailbox message picker UI
- Document ingestion, selected email import and RAG review progress updates
- Supabase migration for `enterprise_workflow_progress` and `workflow_timeline_events`
- Unit, component and seed-gated Playwright golden-path coverage
- Sprint documentation

Verification:

- TypeScript
- Focused unit/component tests
- Supabase migration verification
- E2E smoke coverage for seeded pilot environments

---

## Sprint 28

Pilot release gates, Microsoft import parity and timeline evidence.

Implemented:

- Dedicated approval request, stakeholder note and project update repositories
- Review-to-record creation for approved AI outputs across tasks, approvals, stakeholders, projects and meetings
- Live Microsoft Graph selected-message import parity with Gmail
- Dashboard snapshot deltas for persisted Pilot Command Center snapshots
- Audit export linkage to workflow timeline events
- Supabase migration for `approval_requests`, `stakeholder_notes`, `project_updates`, `microsoft_selected_message_imports`, `dashboard_snapshot_deltas` and `audit_export_timeline_links`
- Dedicated Pilot Golden Path Release Gate GitHub Actions workflow
- Focused tests for Microsoft Graph import, dashboard deltas, Sprint 28 RLS, audit export linkage and review action records

Verification:

- TypeScript
- Focused unit tests
- Supabase migration verification
- Pilot golden-path release gate workflow

---

## Sprint 29

Pilot tenant acceptance and live operations.

Implemented:

- Pilot tenant acceptance score from golden-path, pilot health, command-center and live workspace evidence
- Pilot Command Center acceptance panel with checklist, blockers, evidence gaps and handoff queue
- Role-protected pilot acceptance API for read, acceptance and handoff recording
- Supabase migration for `pilot_tenant_acceptance_runs`, `pilot_acceptance_checklist_items` and `pilot_live_ops_events`
- Audit-backed persistence path for acceptance and live-ops events when Supabase admin runtime is configured
- Extended Pilot Golden Path Release Gate with Sprint 29 acceptance E2E coverage

Verification:

- TypeScript
- Focused unit tests
- Route and RLS tests
- Seed-gated Playwright acceptance gate

---

## Sprint 30

Customer-success live operations and workflow record drilldowns.

Implemented:

- Customer-success live-ops snapshot engine using golden path, pilot acceptance, workspace metrics and regional key posture
- Stuck-step recovery items with owner roles, severity, evidence and due dates
- Live-ops SLA timers for sponsor review, connector operations, AI review, RAG/audit evidence and support handoff
- Regional key policy posture for North East India tenant data, connector token vaults and investor preview isolation
- Role-protected customer-success live-ops API and `/admin/support-ops` cockpit
- Workflow record list/detail pages for approval requests, stakeholder notes and project updates
- Live Microsoft Graph mailbox listing API and Integrations UI control for selected-message import
- Sprint 30 Supabase migration with tenant-scoped RLS and explicit grants

Verification:

- TypeScript
- Focused unit tests
- Route and RLS tests
- Supabase migration verification

---

# Repo-Local Supabase Integration

Following Sprint 25, AXXESS adopted a repository-managed Supabase workflow.

The platform no longer depends on a globally installed Supabase CLI.

Current implementation includes:

- Repository-pinned Supabase CLI (`supabase@2.109.1`)
- Version-controlled `supabase/config.toml`
- Repository-managed `.gitignore`
- Dedicated package scripts
- Migration verification tooling
- GitHub Actions workflow
- Supabase documentation
- Staging documentation
- CI integration

Verification includes:

- `pnpm install --frozen-lockfile`
- `pnpm run supabase:version`
- `pnpm run supabase:verify`
- TypeScript validation
- ESLint
- GitHub Actions
- Vercel Preview

This significantly improves onboarding, reproducibility and migration consistency across development environments.

---

# Engineering Quality

Quality assurance is integrated throughout development rather than concentrated at release time.

Current validation pipeline includes:

- Static type checking
- Linting
- Unit testing
- Integration testing
- Build verification
- CodeQL security analysis
- Dependency Review
- Secret scanning
- Repository Quality
- Playwright testing
- Mobile validation
- Required RAG Release Gates
- Vercel Preview deployments

Engineering changes are expected to satisfy all quality gates before merge.

---

# Current Engineering Status

As of Sprint 32 plus the canonical GitLab workspace migration:

- Governance runtime implemented
- Provider routing implemented
- Plugin runtime implemented
- AI Review Inbox implemented
- Pilot Command Center implemented
- OAuth infrastructure implemented
- Token Vault implemented
- Gmail integration implemented
- Sandbox policy attestation implemented
- RAG release gates implemented
- Repository-managed Supabase integration implemented
- Enterprise golden-path UX implemented
- Live tenant workflow progress implemented
- Workflow timeline evidence implemented
- Review-to-work execution implemented
- Dedicated approval request, stakeholder note and project update records implemented
- Microsoft Graph selected-message live import implemented
- Dashboard snapshot deltas implemented
- Audit export timeline linkage implemented
- Pilot golden-path release gate implemented
- Pilot tenant acceptance implemented
- Live-ops handoff evidence implemented
- Customer-success live-ops snapshots implemented
- Stuck-step recovery and SLA timers implemented
- Workflow record drilldowns implemented
- Microsoft mailbox listing implemented
- Regional key policy posture implemented
- Capacitor store release certification implemented
- Android signed AAB release signoff implemented
- iOS IPA export and TestFlight upload gate implemented
- VS Code mobile release tasks implemented
- Mobile Store Launch Console implemented
- Apple and Google store listing packs implemented
- Reviewer account readiness implemented
- Screenshot manifest implemented
- Crash and release health monitoring implemented
- Staged rollout controls implemented
- Mobile store release readiness gate implemented
- Canonical local workspace verified at `C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`
- GitLab `main`, `canonical/sprint-1-35-unified-gitlab` and `fix/live-tenant-onboarding-and-rag-walkthrough` verified at migration commit `615faf218fbfe538dcdcd1eb1a079ee05ad65b4b`, before this documentation-governance follow-up
- Documentation governance standard added for technical review, investor review, enterprise buying, due diligence and sovereign/public-sector audit audiences

The engineering focus now shifts from mobile store launch readiness and repository consolidation to live store reviewer automation, automated screenshot capture artifacts, crash provider wiring, production support telemetry, staged rollout runbooks, production tenant expansion and continuously auditable documentation.

---

# Deployment, Operations & Product Roadmap

AXXESS is designed to support enterprise deployments that evolve from early design-partner environments to production-grade regulated workloads. The deployment philosophy emphasizes repeatability, governance, operational visibility and gradual hardening rather than maximizing deployment speed at the expense of long-term maintainability.

The platform is intentionally engineered so that additional customers, jurisdictions and enterprise requirements compound on an existing operational foundation instead of forcing architectural redesign.

**None of this depends on GitHub.** Vercel, Supabase, GitLab, Capacitor, and Linear are each
operated directly via their own CLI/API — deploying, migrating, building, and tracking work all
work the same way whether or not any particular Git host is reachable. This was a deliberate
response to a real incident (the original GitHub account behind this repo was suspended
mid-project), not a hypothetical design goal. See `docs/GITHUB_INDEPENDENT_OPERATIONS.md` for the
full control-plane map, and `docs/ENVIRONMENT_VARIABLES.md` for the environment-variable checklist
across local development, Vercel, Supabase, GitLab CI, and mobile builds.

## Canonical Workspace And Repository State

The canonical active local workspace is:

```text
C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS
```

The GitLab repository used for verified continuity pushes is:

```text
https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis
```

The canonical migration record is maintained in `docs/CANONICAL_WORKSPACE_MIGRATION.md`.

Important status note: the code migration, GitLab synchronization and verification were completed at migration commit `615faf218fbfe538dcdcd1eb1a079ee05ad65b4b`; however, physical deduplication is only fully complete after the old `C:\Users\Sudipta Sarmah\Downloads\Claude` folder is archived or removed once the operating system releases its folder lock.

---

# Deployment Philosophy

AXXESS follows four deployment principles:

## 1. Govern Before Scale

Every deployment should satisfy governance, policy and operational evidence requirements before increasing automation or workload volume.

---

## 2. Repeatable Infrastructure

Infrastructure should be reproducible across:

- Development
- Staging
- Customer pilots
- Enterprise production
- Regional deployments

Configuration is version controlled wherever practical.

---

## 3. Environment Isolation

Development, staging and production remain logically separated.

Each environment maintains independent:

- Configuration
- Secrets
- Databases
- Runtime policies
- OAuth credentials
- Operational telemetry

---

## 4. Continuous Validation

Deployment quality is continuously validated through automated testing, release gates and repository workflows rather than manual release checklists.

---

# Environment Strategy

Current environments include:

## Development

Purpose:

- Feature development
- Local testing
- Architecture validation

Typical users:

- Engineering
- Product

---

## Staging

Purpose:

- Integration testing
- QA
- Sprint validation
- Preview deployments

Typical users:

- Engineering
- Internal reviewers

---

## Enterprise Beta

Purpose:

- Design partners
- Early enterprise customers
- Operational validation

Focus:

- Governance
- Workflow validation
- Connector verification
- Human review

---

## Production

Target characteristics:

- High availability
- Controlled releases
- Operational monitoring
- Enterprise support
- Compliance evidence

Production rollout will occur progressively as deployment maturity increases.

---

# Release Strategy

The engineering workflow emphasizes incremental releases.

Typical release lifecycle:

```
Feature Development
        │
        ▼
Local Validation
        │
        ▼
CI Validation
        │
        ▼
Pull Request
        │
        ▼
Review
        │
        ▼
Preview Deployment
        │
        ▼
Merge
        │
        ▼
Production Candidate
```

Major platform capabilities are introduced through structured sprint milestones rather than large infrequent releases.

---

# Deployment Pipeline

Current deployment workflow includes:

- GitHub
- GitHub Actions
- Repository Quality
- CodeQL
- Dependency Review
- Secret Scan
- Playwright
- Required RAG Release Gates
- Vercel Preview

Future roadmap includes:

- Progressive deployment
- Canary releases
- Blue/green deployments
- Automated rollback
- Deployment analytics

---

# Configuration Management

Platform configuration includes:

- Environment variables
- Runtime policies
- OAuth credentials
- AI providers
- Tenant configuration
- Connector settings
- Sandbox configuration
- Command Center settings

Configuration remains separated from application logic wherever practical.

---

# Secrets Management

Current secrets include:

- OAuth client credentials
- API keys
- Runtime secrets
- CRON secrets
- Database credentials

Future roadmap includes:

- Secret rotation
- Enterprise vault integration
- BYOK
- HSM-backed encryption
- Cloud-native secret managers

---

# Connector Ecosystem

Current production connectors include:

- Gmail
- Slack (quick-connect, Sprint 3)
- Calendly (quick-connect, Sprint 3)
- Airtable, HubSpot, Notion (OAuth quick-connect, 2026-07-21)

Current OAuth infrastructure supports:

- Gmail, Microsoft, Slack, Calendly, Airtable, HubSpot, Notion

Notion additionally has a genuine sync workflow beyond connecting: list pages from the connected
workspace, preview extracted text, then import a page as a real tenant document usable by the
Knowledge Hub and AI Workspace's governed RAG.

Auth0, ClickHouse, MSSQL, Snowflake, S3, Paddle, and Stripe have an encrypted credential-storage
connect flow (Settings → Integrations → Enterprise Data & Billing Connections) rather than OAuth —
saving confirms the credential was stored correctly (AES-256-GCM, server-only), not that the
external service has verified it; live connectivity checks against these are not implemented yet.

### Postgres-level data connectors (Wrappers)

Separately from the application-level connectors above, twelve Postgres foreign-data-wrapper
extensions are enabled at the database layer: `airtable_wrapper`, `auth0_wrapper`,
`calendly_wrapper`, `clickhouse_wrapper`, `hubspot_wrapper`, `notion_wrapper`, `mssql_wrapper`,
`paddle_wrapper`, `s3_wrapper`, `slack_wrapper`, `snowflake_wrapper`, `stripe_wrapper`. These let
Postgres query the corresponding third-party service as if it were a native table. **Status
(updated 2026-07-21):** all twelve now have some product-facing surface — seven as real OAuth
connections, five (plus the two billing wrappers) as encrypted credential storage without live
verification (see above). Full stack-of-use breakdown (database layer → application connector
layer → product UI → customer journey → ops) in `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` §4.

Future connector roadmap includes:

### Productivity

- Google Workspace
- Microsoft 365
- Outlook
- Calendar

### Collaboration

- Microsoft Teams
- Discord

### Knowledge

- Notion
- Confluence
- SharePoint

### CRM

- Salesforce
- HubSpot
- Zoho CRM

### Enterprise

- SAP
- Oracle
- ServiceNow
- Workday

### Storage

- Google Drive
- OneDrive
- Dropbox
- Box

The connector framework is intentionally provider-neutral, allowing integrations to evolve without changing core platform architecture.

---

# API Philosophy

AXXESS exposes platform capabilities through protected APIs designed around governance rather than unrestricted execution.

API categories include:

- Identity
- Runtime
- Administration
- Review
- Connectors
- Command Center
- Audit
- Observability

Future API roadmap includes:

- GraphQL
- SDKs
- Connector SDK
- Public developer documentation
- Webhooks

---

# Operational Metrics

The platform is designed to measure both engineering health and enterprise readiness.

Engineering metrics include:

- Build success
- Test pass rate
- Deployment frequency
- CI stability
- Release quality

Operational metrics include:

- AI request volume
- Review latency
- Connector activity
- Policy enforcement
- Sandbox usage
- Runtime performance

Enterprise metrics include:

- Tenant onboarding
- Governance adoption
- Workflow completion
- Approval rates
- Operational evidence generation

---

# Scalability Strategy

Growth is expected across four dimensions:

## Customers

Increasing tenant count while preserving isolation.

---

## Workflows

Supporting progressively more complex enterprise processes.

---

## Integrations

Expanding connector coverage.

---

## Jurisdictions

Supporting new deployment regions through the existing 80/20 architecture.

The architecture is designed so that scaling one dimension should require minimal redesign of the others.

---

# Product Roadmap

The roadmap reflects current engineering priorities rather than fixed delivery commitments.

---

## Sprint 27

Completed:

- Persisted golden-path progress per tenant
- Added workflow timelines to projects, tasks, approvals and documents
- Added Gmail and Microsoft selected-message picker UI
- Created reviewed workflow actions from approved AI answers and imported messages
- Added customer-facing tenant health command center
- Expanded unit, component and seed-gated E2E coverage for the pilot golden path

---

## Sprint 28

Completed:

- Dedicated approval request, stakeholder note and project update repositories
- Microsoft Graph selected-message live import parity
- Timeline-backed dashboard snapshot deltas
- Audit export linkage for workflow timeline events
- Required golden-path release gate for pilot tenants

---

## Sprint 29

Completed:

- Pilot tenant acceptance score and status
- Customer-success acceptance checklist
- Live-ops operator handoff queue
- Acceptance persistence and audit evidence
- Sprint 29 Playwright acceptance gate

---

## Sprint 30

Completed:

- Customer-success stuck-step drilldowns
- Dedicated workflow record list/detail pages
- Live Microsoft mailbox picker UI backed by Graph listing
- BYOK and regional key policy posture foundation
- Live-ops SLA timers
- Customer-success snapshot persistence path
- Provider-gated Microsoft mailbox listing with stable UI fallback
- Sprint 30 RLS, route and service tests

---

## Sprint 31

Completed:

- Capacitor store-release doctor for Android/iOS release readiness
- Android API 36, signed AAB, environment-driven package/version configuration
- iOS environment-driven bundle/version/build settings, privacy manifest and exported IPA workflow
- Optional Google Play internal testing and TestFlight upload gates
- Strict release signoff requiring Android binary output and an iOS `.ipa`
- VS Code tasks for mobile release readiness and platform builds
- Sprint 31 static tests for native store configuration and GitHub Actions release workflow gates

---

## Sprint 32

Completed:

- Mobile Store Launch Console under Organization Admin for release operators
- Tenant-scoped mobile release snapshot API and persistence repository
- Supabase migration for release runs, store listings, reviewer accounts, crash/release health events and rollout events
- Apple review notes, Google Play notes, Apple privacy labels draft, Google Data Safety draft and screenshot manifest
- Reviewer account readiness, release-health monitoring and staged rollout controls surfaced in the frontend
- Dedicated Mobile Store Release Readiness GitHub Actions gate
- Focused tests for release snapshot logic, admin API guards, route metadata and Sprint 32 RLS expectations

---

## Sprint 32+

Future priorities include:

- Multi-region deployment
- Disaster recovery
- Compliance automation
- Organization administration
- Connector SDK
- Enterprise APIs
- Sovereign deployment options
- Additional regional language support
- Live store reviewer account provisioning and automated screenshot artifact capture

---

# Current Product Maturity

Current stage:

**Enterprise Beta Candidate**

The platform now includes:

- Governance-native runtime
- Human-in-the-Loop workflows
- Policy Engine
- Provider routing
- Plugin execution
- AI Review Inbox
- Pilot Command Center
- OAuth infrastructure
- Gmail integration
- Token Vault
- Sandbox execution
- Audit evidence
- Observability
- Release gates
- Pilot tenant acceptance
- Live-ops handoff evidence
- Repository-managed Supabase tooling

The engineering focus is now transitioning from foundational platform capabilities toward enterprise deployment maturity, customer-success operations and production tenant expansion.

---

# Honest Limitations

Transparency is an important design principle.

Current limitations include:

## Compliance

- No SOC 2 certification
- No ISO 27001 certification
- Compliance posture reflects engineering controls rather than formal legal certification

---

## Infrastructure

- Single-region deployment
- Active-active failover not yet implemented
- Disaster recovery strategy still evolving

---

## Security

- BYOK not yet available
- HSM integration planned
- Automated secret rotation planned

---

## Connectors

- Gmail, Microsoft, Slack, Calendly, Airtable, HubSpot, and Notion have real OAuth connect flows;
  Auth0, ClickHouse, MSSQL, Snowflake, S3, Paddle, and Stripe have encrypted credential storage
  with no live external verification yet
- Connector ecosystem remains intentionally limited during beta

---

## AI

- Arabic and Indic language adaptation remains foundational
- Organization-specific model adaptation is still evolving

---

## Operations

- Enterprise SLA commitments are not yet published
- Production support processes continue to mature

---

# Non-Goals

AXXESS is intentionally **not** designed to become:

- A generic ChatGPT wrapper
- A consumer productivity application
- A prompt marketplace
- A no-code chatbot builder
- A model training platform
- An autonomous agent platform without governance
- A low-compliance workflow automation tool

Instead, AXXESS focuses on becoming a trusted enterprise operating layer for governed AI execution.

---

# Looking Ahead

Our ambition is not to build another AI assistant.

Our ambition is to build infrastructure that enables governments, regulated enterprises and high-trust organizations to deploy AI confidently, transparently and responsibly across jurisdictions.

Every sprint, architectural decision and operational control contributes toward that objective.

As the platform evolves, new capabilities should strengthen—not compromise—the principles on which AXXESS was originally founded:

- Governance before autonomy
- Human accountability before automation
- Operational evidence before claims
- Long-term architecture before short-term convenience
- Enterprise trust before feature velocity
# Frequently Asked Questions

This section addresses common technical, operational and architectural questions about AXXESS.

---

## Is AXXESS another AI chatbot?

No.

AXXESS is an enterprise AI operating platform.

While conversational interfaces may exist within the product, the platform is designed to coordinate governed enterprise workflows rather than function as a standalone chatbot.

Core capabilities include:

- AI orchestration
- Policy enforcement
- Human-in-the-Loop review
- Enterprise integrations
- Operational observability
- Audit evidence
- Administrative governance
- Multi-tenant deployment

---

## Does AXXESS train foundation models?

No.

AXXESS does not develop or train foundation models.

Instead, the platform provides a governed execution layer capable of orchestrating multiple model providers while enforcing organizational policies, operational controls and enterprise workflows.

This provider-neutral architecture enables organizations to evolve their AI strategy without becoming dependent on a single model vendor.

---

## Why is Human-in-the-Loop central to the platform?

Most enterprise decisions carry legal, financial or operational consequences.

While AI can automate analysis and execution, organizational accountability remains with people.

Human review therefore acts as an operational control rather than a limitation.

This approach enables organizations to:

- Reduce risk
- Improve trust
- Satisfy governance requirements
- Preserve accountability
- Introduce automation progressively

---

## Why not optimize for fully autonomous agents?

Autonomy is valuable only when governance allows it.

Many enterprise environments require:

- policy enforcement
- approvals
- segregation of duties
- audit evidence
- operational oversight

AXXESS prioritizes trusted automation over unrestricted autonomy.

---

## Which organizations is AXXESS intended for?

Representative customer profiles include:

- Governments
- Public sector agencies
- Healthcare providers
- Financial institutions
- Insurance companies
- Universities
- NGOs
- Consulting firms
- Development organizations
- Mid-market regulated businesses
- Large enterprises

Organizations operating in highly regulated or high-trust environments derive the greatest benefit from the platform.

---

## Which markets are currently prioritized?

Current strategic focus includes:

- India
- United Arab Emirates
- Saudi Arabia
- Singapore
- European Union
- Wider GCC

The platform architecture has been designed to support jurisdiction-specific expansion without requiring structural redesign.

---

## Is AXXESS production-ready?

Current maturity:

**Enterprise Beta Candidate**

The platform has implemented core governance capabilities, enterprise workflows, connector infrastructure, review systems and operational controls.

Enterprise production deployments will continue to mature through additional engineering, customer validation and operational hardening.

---

## Why build governance from the beginning?

Retrofitting governance into mature enterprise software is expensive.

By embedding governance into platform architecture from the earliest engineering stages, AXXESS seeks to reduce future technical debt and improve long-term maintainability.

---

## Is AXXESS open source?

Repository visibility and licensing are determined separately from platform architecture.

Certain platform components may evolve independently depending on commercial strategy and customer requirements.

---

# Contributing

We welcome constructive feedback from engineers, enterprise architects, researchers and design partners.

Areas where community input is particularly valuable include:

- Enterprise AI architecture
- Governance frameworks
- Security engineering
- Compliance engineering
- Connector development
- Human-computer interaction
- AI evaluation methodologies
- Documentation improvements

Before contributing, please:

1. Review existing documentation.
2. Open an issue for significant architectural proposals.
3. Follow repository coding standards.
4. Ensure all automated quality gates pass before submitting a pull request.

---

# Security Policy

Security issues should **not** be disclosed through public GitHub issues.

If you believe you have identified a security vulnerability, please contact the maintainers directly with sufficient technical detail to reproduce and investigate the issue.

Responsible disclosure enables vulnerabilities to be addressed before public discussion.

---

# Development Philosophy

AXXESS is intentionally engineered differently from many contemporary AI products.

Rather than beginning with user interface experimentation and adding governance later, the platform begins with governance and allows user experience to evolve around trusted operational foundations.

This philosophy influences every aspect of development:

- Architecture before acceleration
- Governance before autonomy
- Operational evidence before marketing claims
- Long-term maintainability before short-term feature velocity
- Institutional trust before consumer convenience

---

# Guiding Principles

Our engineering decisions are informed by a consistent set of principles.

### Build infrastructure that compounds.

Every sprint should increase the long-term capability of the platform rather than introduce isolated features.

### Optimize for enterprise durability.

Production systems outlive demonstrations.

Architectural consistency is therefore valued over short-term implementation speed.

### Make governance an enabler.

Governance should increase organizational confidence in AI rather than become an obstacle to adoption.

### Preserve provider independence.

Organizations should retain the ability to adopt new AI providers without rebuilding operational workflows.

### Document decisions.

Documentation is part of the product.

Future engineers, customers and auditors should understand not only *what* the platform does but *why* specific architectural decisions were made.

From the canonical workspace migration onward, documentation must also make each significant change useful to technical reviewers, investors, enterprise buyers, due diligence reviewers and government or sovereign stakeholders. The standing rule is maintained in `docs/DOCUMENTATION_GOVERNANCE.md`.

---

# Long-Term Vision

Our ambition extends beyond building another enterprise software product.

We aim to establish AXXESS as a trusted AI operating layer for governments, regulated enterprises and high-trust institutions operating across diverse regulatory environments.

Over time, we envision AXXESS supporting:

- Sovereign AI deployments
- Enterprise AI governance
- Multi-jurisdiction operations
- Institutional knowledge orchestration
- Policy-aware workflow execution
- Explainable operational intelligence
- Trusted Human-AI collaboration

Success will not be measured solely by model performance or feature count, but by the degree to which organizations can deploy AI with confidence, transparency and accountability.

---

# Acknowledgements

AXXESS has been built through an AI-native engineering workflow that combines modern software engineering practices with advanced AI-assisted development.

While AI accelerates implementation, all architectural direction, governance design, product strategy, security decisions and quality standards remain under deliberate human oversight.

The platform continues to evolve through structured sprint-based development, disciplined documentation and continuous validation.

---

# Contact

**Triaxis Ventures Pvt. Ltd.**

**Website**

https://www.triaxisventures.com

**Enterprise Preview**

https://axxesstriaxis.vercel.app

For partnership, enterprise deployment, design partner opportunities or technical discussions, please reach out through our website.

---

# Final Note

AXXESS is an evolving platform.

This repository documents not only the software itself, but also the architectural decisions, engineering philosophy and governance principles that shape its development.

As enterprise AI matures, our objective is to ensure that AXXESS continues to evolve responsibly—balancing innovation with accountability, automation with human judgment and technical capability with institutional trust.

---

**AXXESS by Triaxis**

*Governance-native. Human-in-the-Loop. Sovereignty-aware. Built for durable enterprise AI.*

