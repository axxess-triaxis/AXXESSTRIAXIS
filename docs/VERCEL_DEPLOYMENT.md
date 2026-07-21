# Vercel Deployment

AXXESS web remains a root-level Next.js app. Do not set the Vercel root directory to `apps/web`.

## Build Settings

- Framework: Next.js
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build`
- Dev: `pnpm run dev`

`vercel.json` preserves this root deployment path.

## Required Environment Variables

Public:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_AXXESS_AUTH_SHELL`
- `NEXT_PUBLIC_AXXESS_DEMO_MODE`
- `NEXT_PUBLIC_AXXESS_APP_VERSION`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ANALYTICS_PROVIDER`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_MIXPANEL_TOKEN`
- `NEXT_PUBLIC_ANALYTICS_DISABLED`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `AXXESS_KMS_KEY_ALIAS`
- `AXXESS_AUDIT_HASH_SALT`
- AI provider keys where enabled

Never expose service-role or provider secret keys through `NEXT_PUBLIC_*`.

## Demo Mode

Use `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` for investor preview deployments only. Keep it `false` for production tenants.

## Security Headers

`next.config.mjs` disables the powered-by header and sets CSP, Referrer Policy, X-Content-Type-Options, X-Frame-Options, and Permissions-Policy.

## CLI-Based Deployment (GitHub-independent)

Vercel's normal mode connects a project to a Git provider so every push/merge triggers a build.
That path is unavailable whenever the connected Git host is down or restricted (this repo hit
exactly that: the original GitHub account was suspended mid-project, `git push`/`git fetch`
returning "Your account is suspended"). The Vercel CLI deploys directly from the local working
tree instead -- no Git host in the loop at all.

### One-time setup

```bash
npx vercel login        # only if `npx vercel whoami` doesn't already show a logged-in account
pnpm run vercel:link    # interactive first time; writes .vercel/project.json (gitignored)
```

`vercel link` only needs to run once per machine per project. It's already been run for this repo
against the `axxesstriaxis` project (team `axxess-tri-axis-powered-by-triaxis-ventures`) -- confirm
with `pnpm run vercel:whoami` and check `.vercel/project.json` exists before assuming it's needed again.

### Deploying

```bash
pnpm run vercel:deploy:preview      # preview deploy, runs typecheck/lint/test first
pnpm run vercel:deploy:production   # production deploy (--prod), same checks first
```

Both wrap `scripts/deploy-vercel.mjs`, which:

1. Confirms `.vercel/project.json` exists (fails fast with a clear message otherwise).
2. Runs `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` (skip with `--skip-checks` for a
   fast iteration loop -- never skip before a production deploy).
3. Calls `vercel deploy` (preview) or `vercel deploy --prod` (production) directly against the
   linked project and prints the resulting URL.

This deploys whatever is in the local working tree at the moment the command runs, including
uncommitted changes -- deliberately, since the entire point is not depending on a commit having
reached any particular Git remote first. Commit as normal for version history, but the deploy
itself doesn't require it.

### Environment variables

CLI deploys still read the environment variables configured on the Vercel project itself (Project
Settings -> Environment Variables in the dashboard, or `vercel env add <NAME> <environment>` from
the CLI) -- they are not read from local `.env.local`. Use:

```bash
pnpm run vercel:env:ls      # list configured variables per environment
pnpm run vercel:env:pull    # pull production values into .env.local for local testing
```

See `docs/ENVIRONMENT_VARIABLES.md` for the full variable checklist across every target, including
which of the variables in this document's "Required Environment Variables" section above must be
set directly on the Vercel project (they are not derived from anything else).

### Rollback

```bash
npx vercel ls axxesstriaxis          # list recent deployments and their URLs
npx vercel promote <deployment-url>  # re-promote a prior deployment to production
```

No Git revert is required to roll back a bad production deploy -- promoting an earlier deployment
is immediate and independent of any Git host.
