# DevSecOps

Sprint 12 adds repository-level security gates for collaborative enterprise development.

## GitHub Actions

New workflow:

`/.github/workflows/security.yml`

Gates:

- CodeQL JavaScript/TypeScript analysis
- Dependency review for pull requests
- `pnpm audit --prod --audit-level critical`
- Gitleaks secret scan

Existing workflow:

`/.github/workflows/ci.yml`

Gates:

- Type check
- Lint
- Tests
- Build

## Branch Strategy

Recommended protected branches:

- `main`
- `staging`
- `dev`

Recommended flow:

1. Feature branch.
2. Pull request.
3. Required CI and security gates.
4. Review approval.
5. Merge to `dev`.
6. Promote to `staging`.
7. Release to `main`.

## Required Protections

Enable in GitHub settings:

- Require pull request reviews.
- Require status checks.
- Require branches to be up to date.
- Block force pushes.
- Enable secret scanning.
- Enable dependency scanning.
- Enable CodeQL or GitHub Advanced Security where plan supports it.

## CI/CD Expansion Targets

Future production pipeline should orchestrate:

- Supabase migration validation.
- Vercel preview deployment.
- Expo EAS or Bitrise mobile build.
- TestFlight internal build.
- Google Play internal testing build.
- PostHog release marker.
- Wix marketing-site deployment if managed from repo.
- Release notes and tag.
- Rollback link.

## Rollback

Rollback should use:

- Vercel deployment rollback for web.
- Supabase point-in-time restore for data incidents.
- Expo OTA rollback for mobile JS changes.
- App Store and Play Store phased rollout halt for native regressions.
