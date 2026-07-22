# Environment Variables

See `.env.example` for the complete template with inline comments on each variable's purpose. This
document is the **checklist**: which of those variables need to be set in which of the five places
this project runs (local dev, Vercel, Supabase, GitLab CI, mobile builds), so nothing is missed
when standing up a new environment or debugging why one behaves differently from another.

## Public vs. server-only

Variables prefixed `NEXT_PUBLIC_` or `EXPO_PUBLIC_` are bundled into client-side code and visible
to anyone who opens dev tools -- fine for public URLs, publishable/anon keys, feature flags, and
analytics project keys. Never put a secret behind either prefix.

Never expose through a `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*` name:

- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `RESEND_WEBHOOK_SECRET`, any AI provider secret key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.)
- Apple/Google signing credentials (`ANDROID_KEYSTORE_*`, `ASC_*`, `APPLE_TEAM_ID`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`)
- `AXXESS_KMS_KEY_ALIAS`, `AXXESS_AUDIT_HASH_SALT`, `AXXESS_TOKEN_VAULT_KEY`, `AXXESS_OAUTH_STATE_SECRET`
- `CRON_SECRET`
- Every OAuth `*_CLIENT_SECRET` (Google, Microsoft, Slack, Calendly, Airtable, HubSpot, Notion)

## 1. Local development (`.env.local`)

Copy `.env.example` to `.env.local` (gitignored) and fill in everything relevant to what you're
testing. For a full live (non-demo) local walkthrough against a local Supabase instance, at
minimum:

| Variable | Where the value comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `supabase status` after `supabase start` (local CLI instance) |
| `SUPABASE_PROJECT_REF`, `SUPABASE_DB_URL` | Same, or from a linked remote project (see section 3) |
| `NEXT_PUBLIC_AXXESS_DEMO_MODE=false`, `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true` | Required together to exercise the real (non-demo) auth/onboarding flow locally |
| `AXXESS_OAUTH_STATE_SECRET`, `AXXESS_TOKEN_VAULT_KEY` (32+ chars), `AXXESS_TOKEN_VAULT_KEY_ID` | Any local placeholder value works for local dev -- these just need to be *present* and long enough (see `tokenVault.ts`'s `minimumVaultKeyLength`) |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER=auto`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_MIXPANEL_TOKEN` | Real Mixpanel/PostHog project credentials -- see `docs/MIXPANEL.md`/`docs/POSTHOG.md`. Leave blank to no-op. |
| OAuth connector `*_CLIENT_ID`/`*_CLIENT_SECRET` (Google, Microsoft, Slack, Calendly, Airtable, HubSpot, Notion) | Only needed to test a specific connector's real OAuth flow -- see `docs/PLUGIN_REGISTRY.md`. Every connector reports itself as `provider_gated` cleanly when its pair is unset. |
| `LINEAR_API_KEY`, `LINEAR_TEAM_KEY` | Only needed to run `pnpm run linear:sync` for real -- see `docs/LINEAR_SYNC.md`. Not in `.env.example` since this is a repo-ops tool, not application runtime config. |

Vercel-specific local values (`VERCEL_OIDC_TOKEN`) are written automatically by `pnpm run
vercel:link`/`vercel dev` -- don't set these by hand.

## 2. Vercel (Project Settings -> Environment Variables, or `vercel env add`)

CLI deploys (`docs/VERCEL_DEPLOYMENT.md`) read variables from the Vercel project itself, **not**
from local `.env.local`. Required for the deployed app to function at all:

**Public:**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_APP_URL` | The deployed URL itself (or custom domain) |
| `NEXT_PUBLIC_AXXESS_AUTH_SHELL` | `true` for any real (non-demo) deployment |
| `NEXT_PUBLIC_AXXESS_DEMO_MODE` | `true` only for the investor/demo preview deployment; `false` for real tenant environments |
| `NEXT_PUBLIC_AXXESS_APP_VERSION` | Matches `package.json` version, or a build-specific override |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The real (Cloud) Supabase project's public values |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_MIXPANEL_TOKEN`, `NEXT_PUBLIC_ANALYTICS_DISABLED` | See `docs/MIXPANEL.md`/`docs/POSTHOG.md` |

**Server-only:**

| Variable | Notes |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Required for invitation acceptance, provisioning, and every admin-level repository call |
| `AXXESS_KMS_KEY_ALIAS`, `AXXESS_AUDIT_HASH_SALT` | Production security/audit integrity values |
| `AXXESS_OAUTH_STATE_SECRET`, `AXXESS_TOKEN_VAULT_KEY`, `AXXESS_TOKEN_VAULT_KEY_ID` | Connector OAuth state signing + encrypted token vault -- must be strong, real secrets in production, not the local placeholder values |
| `CRON_SECRET` | Required by `vercel.json`'s scheduled `/api/cron/pilot-command-center-snapshot` job |
| AI provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) | Only the ones actually enabled; `LOCAL_AI_PROVIDER_ENABLED=true` works with none of them set |
| OAuth connector client ID/secret pairs actually in use | Only for connectors with a live product surface today: Gmail (`GOOGLE_CLIENT_ID`/`SECRET`), Microsoft, Slack, Calendly, Airtable, HubSpot, Notion |

## 3. Supabase (the project itself, and this repo's CLI link to it)

Supabase doesn't consume most of this app's env vars directly -- these are what the *app* and the
*CLI* need in order to talk to a real Supabase Cloud project:

| Variable | Used by |
|---|---|
| `SUPABASE_PROJECT_REF` | `supabase link --project-ref <this>` (see `docs/SUPABASE_CLI.md`) |
| `SUPABASE_ACCESS_TOKEN` | Not in `.env.example` -- required as an environment variable (not a repo file) for non-interactive `supabase link`/`supabase db push` in scripted/CI contexts. Generate from the Supabase dashboard's account access tokens page. Never commit this. |
| `SUPABASE_DB_URL` | Direct Postgres connection string, for tooling that bypasses the CLI/PostgREST |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | The app's own client -- same values as sections 1/2 |

`scripts/supabase-migrate-remote.mjs` (`pnpm run supabase:migrate:remote[:apply]`) needs the repo
already linked (`supabase/.temp/project-ref` present, from a one-time `supabase link` run with
either an interactive login or `SUPABASE_ACCESS_TOKEN` set) -- it does not read any env var itself
beyond what the Supabase CLI already needs.

## 4. GitLab CI (`.gitlab-ci.yml`, Settings -> CI/CD -> Variables)

The `quality` job (typecheck/lint/test/build) and `supabase-verify` job as currently written do
**not** require any real secrets to pass -- `next build`, `tsc`, `eslint`, and `vitest` all succeed
with every `NEXT_PUBLIC_*`/server env var unset (they'd simply be `undefined` at runtime, which
this codebase already handles honestly via `provider_gated`/empty-state fallbacks throughout,
rather than throwing). Nothing needs to be configured in GitLab's CI/CD Variables settings to get a
green baseline pipeline.

Set these only if extending the pipeline to do more than the current three jobs:

| Variable | Needed for |
|---|---|
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | A future CI job that runs `supabase:migrate:remote` (dry run) against the real project on every merge request, to catch migration issues before merge |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | A future CI job that deploys previews via `vercel deploy --token=$VERCEL_TOKEN` directly from GitLab CI, instead of (or in addition to) running `pnpm run vercel:deploy:preview` by hand |
| Real `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` | Only if a future job needs `next build` to actually connect anywhere real, e.g. a smoke-test job |

Mark every one of these **masked and protected** in GitLab's variable settings (protected branches
only) when they're added -- none of them belong in `.gitlab-ci.yml` itself.

## 5. Mobile builds (Capacitor + Expo)

**Capacitor shell** (`apps/mobile-capacitor`) -- read by `capacitor.config.ts` and the
`mobile:capacitor:*` scripts, whether run locally or in CI:

| Variable | Notes |
|---|---|
| `CAPACITOR_SERVER_URL` | The deployed web app URL the native shell loads live (see `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` §2.2) -- defaults to `https://app.axxess.dev` |
| `CAPACITOR_ALLOWED_HOSTS` | Comma-separated hostnames the WebView is allowed to navigate to |
| `ANDROID_APPLICATION_ID`, `IOS_BUNDLE_IDENTIFIER` | Native app identifiers |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Android signing -- see `docs/ANDROID_SIGNING.md`. Required only for signed release builds (`mobile:capacitor:release:android`), not debug builds. |
| `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY` | iOS signing/App Store Connect API -- see `docs/IOS_SIGNING.md`. Mac-only build step (`docs/MOBILE_RELEASE_RUNBOOK.md`'s platform split). |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Only if uploading straight to Play Store internal testing rather than uploading the `.aab` manually |

**Expo/React Native app** (`apps/mobile`) -- read by `app.config.ts`:

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_APP_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same values as the web app's equivalents |
| `EXPO_PUBLIC_EAS_PROJECT_ID`, `EAS_PROJECT_ID`, `EXPO_TOKEN` | Required only for `mobile:eas:*` cloud builds |
| `EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER`, `EXPO_PUBLIC_ANDROID_APPLICATION_ID`, `EXPO_PUBLIC_IOS_BUILD_NUMBER`, `EXPO_PUBLIC_ANDROID_VERSION_CODE` | Native identifiers/version controls, same pattern as the Capacitor shell |
| `EXPO_PUBLIC_ANALYTICS_PROVIDER`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_MIXPANEL_TOKEN` | Present in `app.config.ts` but not yet wired to an actual analytics call anywhere in `apps/mobile`'s code (see `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` §2.3 -- this app is still early scaffolding) |

## Analytics Provider

```text
NEXT_PUBLIC_ANALYTICS_PROVIDER=noop|posthog|mixpanel|auto
```

Default is `auto`. With no provider tokens set, `auto` behaves identically to `noop`. Set both
`NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_MIXPANEL_TOKEN` to track every visit in both
simultaneously -- see `src/services/analytics/MultiAnalyticsProvider.ts`.

## Demo Mode

Use Demo Mode only for preview deployments:

```text
NEXT_PUBLIC_AXXESS_DEMO_MODE=true
```

Production customer tenants should keep Demo Mode disabled.

## Sprint 18 Operations

```text
RESEND_WEBHOOK_SECRET=
AXXESS_AUDIT_EXPORT_TTL_MINUTES=60
```

Use `RESEND_WEBHOOK_SECRET` only on the server to verify invitation delivery webhooks. `AXXESS_AUDIT_EXPORT_TTL_MINUTES` controls the short-lived server export token window for governed audit CSV exports.
