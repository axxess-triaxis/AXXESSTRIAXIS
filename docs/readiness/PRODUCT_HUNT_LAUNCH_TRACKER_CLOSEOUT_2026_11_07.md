# Product Hunt Launch Tracker: Closeout (2026-11-07)

**Status: built and tested locally, not merged or deployed. Never run against a live Product Hunt response**, because that needs the founder's replacement token.

## External signal

The founder created a Product Hunt API application named `AXXESS Launch tracker` and asked for it to be wired to AXXESS (session, 2026-11-07).

## Decision

Show the numbers as a live, operator-only tile rather than a tenant feature. They describe Triaxis's own listing, so customers should not see them.

## What changed

- `src/services/integrations/productHuntLaunchTracker.ts`: new. Reads post name, votes, comments, review rating and featured date from Product Hunt's GraphQL API.
- `src/app/api/admin/pilot-portfolio/route.ts`: returns the result with the other integration checks, behind `canViewCrossTenantPilotPortfolio`.
- `src/features/product-analytics/ProductAnalyticsSection.tsx`: adds a "Product Hunt launch" tile.
- `.env.example`: adds `PRODUCT_HUNT_DEVELOPER_TOKEN` and optional `PRODUCT_HUNT_POST_SLUG`.
- Tests: new `productHuntLaunchTracker.test.ts`; additions to the route and section tests.

## What did not change

- No database change, so **no history**. Each page load shows current numbers only, with no trend over launch day.
- No scheduled job. A sync job would also need `CRON_SECRET`, which was missing on landing when last checked on 2026-11-04.
- Product Hunt comments do not feed Social Alerts.
- Investor stays in demo mode and makes no Product Hunt call.

## Founder steps

**1. Replace the credentials.** The original key, secret and token were pasted into a session as a screenshot on 2026-11-07, so treat them as exposed.

1. Open `https://www.producthunt.com/v2/oauth/applications`.
2. Click **Delete Token** under `AXXESS Launch tracker`, then create a new token.
3. Replace the application's API key and secret. The page shows no regenerate button, so delete and re-add the application unless **Edit** offers a reset. Doing this before creating the token avoids repeating step 2.

**2. Add the token in Vercel.** Do this before the merge, because variables only reach new builds.

1. Open `triaxis-www-frontend-import`, then Settings, then Environment Variables.
2. Add `PRODUCT_HUNT_DEVELOPER_TOKEN` with the new token. Tick Production only. Mark it Sensitive. Do not add a `NEXT_PUBLIC_` prefix.
3. If the listing's post slug is not `axxess-triaxis`, add `PRODUCT_HUNT_POST_SLUG` too, also Production only. The tile reports an error if the slug is wrong.
4. Confirm `AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID` is set on this project. The tile can't appear without it.

**3. Check Product Hunt's terms.** Their API docs say the API must not be used for commercial purposes by default, and to contact `hello@producthunt.com` for business use. Whether an internal tracker for a company's own listing counts is not settled here. It is the founder's call.

## Closeout Evidence

Run on `feat/product-hunt-launch-tracker`, from `origin/main` at `2023d58`, before this document was written:

- `pnpm run typecheck`: exit 0
- `pnpm --dir apps/mobile run typecheck`: exit 0
- `pnpm run lint`: exit 0, zero-warning rule
- `pnpm run test -- --maxWorkers=2`: `Test Files 334 passed (334)`, `Tests 1875 passed (1875)`
- `pnpm run build`: exit 0
- `pnpm run supabase:verify`: exit 0
- New test file failed before the module existed: the run reported `Tests no tests`, because the import could not resolve.
- `POST https://api.producthunt.com/v2/api/graphql` with no token: HTTP 401. This shows the endpoint exists and requires auth, and nothing more.
- Field names checked against `schema.graphql` in `github.com/producthunt/producthunt-api`. That file has no `dailyRank`, `weeklyRank` or `reviewsCount` on `Post`, so the tile does not show them.

## Still partial or unsupported

- **Live response:** not tested. All success paths use mocked responses.
- **Default slug:** `axxess-triaxis` comes from the product URL in the site badge. A post slug can differ from a product slug, and this is unconfirmed.
- **Rendered page:** not viewed in a browser, because the tile needs a signed-in platform operator. A component test covers it.
- **Playwright:** not run locally for this change. CI's `playwright` check is the gate.
- **Vercel settings:** could not be read on 2026-11-06, when the API returned 403 to the local CLI login. The operator organization variable is unconfirmed on this project.

## Decision ledger

```
Decision: Product Hunt launch numbers appear as a live, operator-only tile, with no history table yet.
Why: They describe Triaxis's own listing, not customer data, and the existing integration tile pattern needs no migration.
What changed: See "What changed".
Architecture boundary: Server-side token only. Read through the existing platform-operator route.
Product boundary: Not visible to customer tenants or on investor.
Verification: See Closeout Evidence.
Outcome: Pending, review by 2026-11-21.
Follow-up: Founder steps; first live response; decide on history and comments in alerts.
```
