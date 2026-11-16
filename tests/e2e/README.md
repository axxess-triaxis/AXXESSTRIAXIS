# App end-to-end tests (`tests/e2e`)

Three kinds of spec live here, and each needs a different target.

| Kind | Gate | Runs where |
| --- | --- | --- |
| Public or demo-build specs (`investor-landing-par`, `sprint13-readiness`, `visual-mobile-admin`) | `skipUnlessDemoTarget()`: `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` | CI (`playwright.yml`, `mobile-visual-regression.yml`) against a local dev server built in demo mode, or the investor demo |
| Seeded specs (tasks, projects, meetings, notifications, knowledge hub, sprint 8/17/29) | `skipUnlessSeeded()`: `E2E_RUN_SEEDED=true` | A deployment whose Supabase has `supabase/seeds/003_sprint7_e2e_seed.sql` applied, such as staging |
| Seeded and demo (`sprint27-golden-path`) | both | `pilot-golden-path-release-gate.yml` only |

Staging (`https://staging.triaxisventures.com`) is a seeded, non-demo build, so the demo-build specs skip there.
Set `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` in the Playwright environment only when the target really is a demo
build; it does not change the target.

## Running against staging

Never point this suite at production.

1. Make sure the staging Supabase project is not paused (Free plan projects pause when idle).
2. In PowerShell, from the repository root:

```powershell
$secure = Read-Host -AsSecureString "Staging Vercel bypass secret"
$env:VERCEL_AUTOMATION_BYPASS_SECRET = [System.Net.NetworkCredential]::new("", $secure).Password
$env:E2E_RUN_SEEDED = "true"
$env:PLAYWRIGHT_BASE_URL = "https://staging.triaxisventures.com"
pnpm exec playwright test
```

When `VERCEL_AUTOMATION_BYPASS_SECRET` is set, `vercel-bypass.setup.ts` asks Vercel for its bypass cookie once
and loads it into every test's browser. The header is not sent browser-wide, because Supabase's CORS rules
reject it. The cookie file is deleted when the run ends.
