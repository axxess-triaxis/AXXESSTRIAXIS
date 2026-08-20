# Environment Verification

Governed by: `docs/readiness/DEPENDENCY_POLICY.md`, `docs/readiness/FAILED_OR_TIMED_OUT_CHECKS.md`.
Created 2026-08-17. When a failure might be environment-specific (lockfile mismatch, Turbopack, platform
difference), compare local vs. CI using this table rather than guessing.

| Tool | Local (this session's environment) | CI (GitHub Actions runner, per job logs this session) |
|---|---|---|
| Node | Not queried this pass | v22.23.2 (observed in PR #266 job logs, `Repository Quality` and `validate` jobs) |
| OS | Windows 11 (per this session's environment) | `home/runner` (Ubuntu-based GitHub-hosted runner, per job log paths) |
| Vitest | 4.1.10 (observed in PR #266 job logs) | 4.1.10 (same, confirmed via `node_modules/.pnpm/vitest@4.1.10...` path in job logs) |
| pnpm | Not queried this pass | Not directly logged in the excerpts captured this session; infer from `pnpm-lock.yaml` lockfile version if needed |
| Git | Not queried this pass | 2.54.0 (observed in PR #266 job logs, post-job cleanup steps) |
| Supabase CLI | Not queried this pass | Not queried this pass |
| Vercel CLI | 56.2.0 (`npx vercel ls` output, this session) | N/A (Vercel's own build environment, not a GitHub Actions runner) |
| Capacitor | Not queried this pass | Not queried this pass |
| Playwright | Not queried this pass (version not directly logged in excerpts captured) | Chromium-based, per `tests/e2e/*.spec.ts` job output (`[chromium] › ...`) |

## Note on completeness

This table is seeded with what was actually observed in this session's own tool output (job logs, CLI
version banners) -- not queried fresh for every row. Blank "Not queried this pass" cells are honest gaps,
not silent omissions; run the corresponding version command (`node -v`, `pnpm -v`,
`supabase --version`, `npx cap doctor`, `npx playwright --version`) locally and in a CI job log the next
time a failure is suspected to be environment-specific, and fill in the real values.
