# Dependency and Supply-Chain Policy

Governed by: `CLAUDE.md` (Production Gate Bypass -- Standing Rule), `docs/readiness/DECISION_OUTCOME_LEDGER.md`
row `DEPENDENCY-RETRY-POLICY`. Created 2026-08-17.

## Policy

- **Frozen lockfile policy**: CI installs with `pnpm install --frozen-lockfile` (or equivalent) --
  a lockfile mismatch is a real signal that `package.json` and `pnpm-lock.yaml` have drifted, not a
  transient failure to retry past.
- **Minimum release age policy**: this repo's CI has been observed to enforce a minimum-release-age gate
  on new package versions (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` is a real, documented failure
  signature elsewhere in this program's history) -- a newly-published dependency version failing this
  gate is a supply-chain safety feature working as intended, not a flake.
- **Allowed build scripts**: not exhaustively enumerated in this pass; pnpm's own `--ignore-scripts`/allow-list
  behavior governs this. If a dependency's postinstall script is blocked, investigate why before
  allow-listing it.
- **pnpm version**: pinned via the repo's `packageManager` field in `package.json` (not independently
  re-verified in this pass -- check `package.json`'s `packageManager` key for the exact pinned version).

## When NOT to retry

Per `docs/readiness/DECISION_OUTCOME_LEDGER.md`'s `DEPENDENCY-RETRY-POLICY` row: never blindly rerun a
failed CI job for any of these failure classes without first reading the actual failure string --

- lockfile failure (`ERR_PNPM_...LOCKFILE...` or similar)
- minimum release age violation (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`)
- Turbopack compile failure (a genuine build error, not infra)
- dependency-review / security-gate failure (CodeQL, Secret Scan, pnpm Critical Vulnerability Gate --
  these are almost always either a real finding or, per this session's PR #266 CodeQL case, a GitHub API
  outage during upload; either way the *specific* failure string must be read before deciding, never
  assumed)

The known, legitimately-retryable failure classes are covered separately in
`docs/readiness/VERCEL_RETRY_EVIDENCE_TEMPLATE.md` (Vercel quota strings) and
`docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md` (confirmed external outages, e.g. GitHub's own API
returning 503).

## Worked example this session

PR #266's CodeQL job failed with `##[error]No server is currently available to service your request.`
during SARIF upload -- this was read as the exact failure string, confirmed against
`https://www.githubstatus.com/api/v2/summary.json` showing an active partial outage, and treated as
non-blocking on that basis rather than retried blindly or assumed to be a security finding.
