# Changelog

All notable changes to AXXESS are documented here. This project follows the spirit of Keep a Changelog and uses semantic versioning during pre-1.0 development.

## Unreleased

- Added Product Release 0.6 beta analytics, feedback, and pilot readiness work.
- Hardened repository documentation for enterprise collaboration.
- Added GitHub issue templates for bugs, features, documentation, and enhancements.
- Added pull request checklist, Dependabot configuration, and CI workflow coverage.
- Expanded environment variable documentation and ignore rules.
- Added repository audit documentation for follow-up engineering work.

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
