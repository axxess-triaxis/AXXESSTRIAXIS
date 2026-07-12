# Changelog

All notable changes to AXXESS are documented here. This project follows the spirit of Keep a Changelog and uses semantic versioning during pre-1.0 development.

## Unreleased

- Added Sprint 17 pilot readiness event API with authenticated Supabase writes, sanitized metadata, and audit logging.
- Added optional Resend-compatible invitation email delivery with manual acceptance URL fallback when email is not configured.
- Added mobile card fallbacks for Organization Admin and Audit Logs tables plus seed-gated Playwright coverage.
- Added Sprint 16 pilot readiness hardening with tenant administration, audit-log review/export, expanded first-tenant onboarding, and admin navigation entries.
- Added Sprint 16 Supabase migration for tenant-scoped pilot readiness events plus audit-log indexes for review and export workflows.
- Added Sprint 16 routing, RBAC, onboarding, and RLS tests for pilot admin and audit surfaces.
- Added Sprint 15 enterprise frontend coherence pass with shared module headers, metrics, data-state badges, confidence/human-review/audit badges, activity feeds, workflow cards, and demo notices.
- Added guided investor demo state, progress banner, dashboard start CTA, clean screenshot mode, and coherent demo seed slices for metrics, activity, documents, stakeholders, approvals, and workflows.
- Polished Executive Dashboard, AI Workspace, Knowledge Hub, Approvals, CRM, Projects, Tasks, and Analytics with live/demo/provider-gated labels and cross-screen workflow context.
- Added Sprint 15 frontend audit, product walkthrough, frontend architecture, screenshot guide, and sprint log documentation.
- Added Sprint 14 AI-native platform layer with provider-gated routing for OpenAI, Anthropic, Google, xAI, Falcon, Jais, and local fallback.
- Added Sprint 14 RAG ingestion, embedding, vector store, evaluation, repository foundation, and Supabase migration for RAG chunks, ingestion runs, integration connections, and social alert events.
- Added open-source NLP model registry covering IndicBERT, MuRIL, IndicTrans2, LaBSE, XLM-R, multilingual-e5, bge-m3, sentence-transformers, fastText, and NLLB.
- Added productivity plugin registry, integration health cards, live dashboard provider hooks, social alerts screen, cross-screen workflow demo service, and Wix-safe public website export.
- Fixed Expo GitHub build readiness by adding required EAS GitHub build images and documenting the correct `apps/mobile` base directory.
- Configured Expo mobile builds to use EAS-managed remote credentials for iOS and Android app signing, with explicit app identifiers and credential safety docs.
- Added Expo EAS workflow for manual Android and iOS production builds.
- Added root and mobile scripts for direct all-platform EAS production builds and EAS workflow runs.
- Added Wix setup correction docs so local setup points to `axxess-triaxis/AXXESSTRIAXIS` instead of stale repository instructions.
- Added Sprint 13 audit document, onboarding route family, sign-up/password recovery/MFA/passkey-ready route surfaces, account deletion and privacy request initiation.
- Added Sprint 13 admin readiness pages for organization, departments, workspaces, users, roles, invitations, privacy, compliance, AI governance, prompt approvals, audit logs, and backups.
- Added Sprint 13 Supabase migration for tenant/workspace metadata, RLS helper functions, prompt review states, AI output review states, and checked-in RLS persona test artifacts.
- Added Expo mobile scaffold under `apps/mobile` with EAS profiles, mobile auth helper, core beta screens, and mobile README.
- Added Bitrise workflows, GitHub Playwright/mobile/Supabase RLS workflows, backup/restore scripts, store readiness docs, analytics docs, and due diligence pack.
- Added Sprint 12 enterprise IAM, tenant guard, immutable audit-chain, privacy request, compliance control, prompt governance, and PostHog observability foundations.
- Added Sprint 12 Supabase migration for departments, workspaces, security audit events, privacy requests, consents, retention policies, compliance policies, prompt registry, AI output audit, encryption key registry, and vector index manifests with RLS policies.
- Added GitHub security workflow for CodeQL, dependency review, critical `pnpm audit`, and Gitleaks secret scanning.
- Added security architecture, compliance, privacy engineering, AI governance, observability, DevSecOps, backup/DR, mobile release, API, schema, admin operations, and Sprint 12 readiness documentation.
- Added Sprint 11 production demo hardening with Supabase-to-demo repository fallback for investor-facing dashboards.
- Expanded the North East Health Mission demo corpus to 2,200 realistic institutional documents and 4,200 document activity records.
- Added governed RAG services for document chunking, tenant-aware retrieval, permission filtering, citations, confidence scoring, human review flags, and answer audit logging.
- Added deterministic local NLP utilities for keyword extraction, summary fallback, entity extraction, document classification, tag suggestions, and regional language script detection.
- Added profile creation/editing helpers and Settings profile, organization, and permission panels.
- Updated dashboard, AI workspace, analytics, CRM, approvals, and Knowledge Hub copy to remove stale prototype/demo names.
- Added Sprint 11 tests for dashboard fallback, auth profile helpers, investor preview login, local NLP, and RAG permission filtering.
- Added Product Release 0.7 Knowledge Hub with documents, knowledge articles, categories, tags, search, activity, shared, favorites, and archived sections.
- Added Supabase Storage signed URL architecture for private enterprise documents.
- Added Sprint 9 document, version, permission, activity, knowledge article, search, and storage migration.
- Added Knowledge Hub repository, storage, permission, and E2E test foundations.
- Added document, storage, and search architecture documentation.
- Added Product Release 0.6 beta analytics, feedback, and pilot readiness work.
- Hardened repository documentation for enterprise collaboration.
- Added GitHub issue templates for bugs, features, documentation, and enhancements.
- Added pull request checklist, Dependabot configuration, and CI workflow coverage.
- Expanded environment variable documentation and ignore rules.
- Added repository audit documentation for follow-up engineering work.

## v0.7.0-beta - Knowledge Hub & Document Foundation

- Added repository-backed Knowledge Hub UI while preserving the existing AXXESS shell and visual language.
- Added enterprise document metadata workflows for upload, view, rename, visibility update, archive, restore, delete, categories, tags, and favorites-ready filtering.
- Added knowledge article drafting and publishing foundations without AI or RAG.
- Added private Supabase Storage bucket policy design with signed upload and download URL endpoint.
- Added PostgreSQL `tsvector` search vectors for documents and knowledge articles.
- Added RLS policies for tenant isolation, role-aware writes, explicit sharing, and guest-safe access.
- Added audit activity tracking for document actions and metadata changes.
- Added `docs/DOCUMENTS.md`, `docs/STORAGE.md`, and `docs/SEARCH.md`.

## v0.6.0-beta - Beta Analytics & Pilot Readiness

- Added Mixpanel-ready analytics service architecture with mock analytics as the default when no token is configured.
- Added privacy sanitization for tracked event payloads and user properties.
- Added safe product event tracking across sessions, navigation, projects, tasks, meetings, notifications, administration, feedback, empty states, and error boundaries.
- Added beta feedback submission workflow with Supabase-backed repository and API route.
- Added `beta_feedback` migration with RLS policies and explicit authenticated grants.
- Added internal beta readiness and product analytics admin pages.
- Added beta onboarding checklist with local progress persistence.
- Added Sprint 8 unit, RLS, route, onboarding, and Playwright E2E foundations.
- Updated beta testing, analytics, privacy, and release process documentation.

## 0.4.0 - Sprint 4

- Migrated runtime architecture toward Next.js 15 App Router.
- Added enterprise route metadata and route guard architecture.
- Added repository/service interfaces and provider boundary.
- Added GitHub, Vercel, Docker, Supabase, and test readiness scaffolding.

## 0.3.0 - Sprint 3

- Added route metadata, module boundaries, auth facade, and Supabase mock fixtures.

## 0.2.0 - Sprint 2

- Extracted feature modules and introduced lazy route chunks.

## 0.1.0 - Sprint 1

- Added app shell, dashboard foundation, domain types, mock data, feedback states, and design tokens.
