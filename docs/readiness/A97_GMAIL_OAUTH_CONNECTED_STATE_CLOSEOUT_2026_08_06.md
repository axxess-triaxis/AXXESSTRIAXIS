# A-97 Closeout -- Gmail "Endless Sign-In Loop" Root Cause and Fix

Date: 2026-08-06
Status: Code complete, tested, typechecked, linted, and built clean. Live authenticated
click-through by the founder is the one remaining verification step (see "What Remains
Blocked" below) -- this repo's HITL discipline does not allow that step to be self-certified.

## Need For This Work

Founder live-tested "Connect Gmail" on `landing.triaxisventures.com` from Settings > Integrations
and reported: *"Same process keeps looping of endless sign-ins. Actual mailbox integration you
have to check logs."* Screenshots showed the flow reaching Google's real consent screen, completing,
and landing back on the Integrations page with no visible change -- inviting another click.

Founder's explicit instruction before any fix: *"first confirm with direct DB access whether your
actual attempts wrote real rows, before deciding scope? Do this."* -- i.e. rule out a silent
backend failure before touching any code, rather than guessing at the fix.

## Objective

1. Determine, from the real production database, whether the reported Gmail connection attempts
   actually persisted anything, or whether the backend was silently failing.
2. Only after that was answered, decide and execute the minimum correct fix.

## Investigation -- Full Reasoning Trail

### Step 1: Vercel function logs (inconclusive on their own, but a finding)

`npx vercel logs https://landing.triaxisventures.com` and the `--json` variant against
`/api/connectors/oauth/callback` and `/api/connectors/oauth/start` showed only HTTP-level log
lines (307 redirects), no application console output. This by itself doesn't prove success or
failure -- it does show this code path has zero explicit logging/instrumentation, which made the
DB check the only reliable way to answer the founder's question.

### Step 2: Read the callback route source (`src/app/api/connectors/oauth/callback/route.ts`)

Found the redirect on the final line was unconditional:

```
return NextResponse.redirect(new URL(`/integrations?provider=${provider}&status=connected`, url.origin));
```

...while the actual Supabase admin writes (token vault insert, `integration_connections` upsert)
sat behind `if (isSupabaseAdminConfigured())`. Initial hypothesis: if admin credentials aren't
configured, the user would still be told "connected" with nothing persisted. This was flagged as
a real but *unconfirmed* candidate cause -- not yet checked against the actual DB or against
whether `isSupabaseAdminConfigured()` is even false in production.

Also read `isSupabaseAdminConfigured()` (`src/repositories/supabaseAdmin.ts`):
`Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)`.

### Step 3: Read the Integrations UI (`src/features/integrations/IntegrationsSection.tsx`)

Grepped for any reactive connected-state display. Found none: the "Email Connector Pilot" panel
(then around line 332-340) rendered static `<a href="/api/connectors/oauth/start?provider=gmail">
Connect Gmail</a>` / `...provider=microsoft` links with zero connected/disconnected indicator.
Microsoft at least gets indirect feedback from its "Load Microsoft inbox" button (which succeeds
or shows a provider-gated message); Gmail had no equivalent action at all in this panel. Grepped
the whole file for `searchParams`, `window.location`, `status=connected` -- **no match** -- the
`?provider=gmail&status=connected` the callback route redirects to was read by nothing, anywhere
in the route chain (`src/app/integrations/page.tsx` is a bare re-export of `WorkspacePage`, itself
generic and provider-agnostic).

At this point there were two live, real, structurally-confirmed hypotheses (unconditional-success
redirect; UI never reads or displays connection state) but the DB question the founder asked was
still open.

### Step 4: Direct database verification (founder-authorized, non-persistent credential use)

Per the founder's explicit, repeated authorization to paste the production
`SUPABASE_SERVICE_ROLE_KEY` directly into chat for scoped diagnostic use -- **used only
in-memory (`node --env-file=<temp>`), never written to a tracked file, never echoed in tool
output, temp file deleted immediately after each use** -- queried three tables directly via
PostgREST with the service-role key:

| Table | Query | Result |
|---|---|---|
| `oauth_token_vault` | `provider_id=eq.gmail` | **5 real rows**, 2026-07-30 through 2026-08-06. The two most recent (`2026-08-06T14:25:51.17Z`, `2026-08-06T14:27:40.33Z`) match the two "Connect Gmail" attempts in the founder's screenshots almost exactly. All `status: "active"`. |
| `oauth_connection_states` | `provider_id=eq.gmail`, most recent 10 | **7 rows**, two most recent `consumed_at` (`2026-08-06T14:25:52.26Z`, `2026-08-06T14:27:41.40Z`) match the same two attempts, confirming the OAuth state/PKCE flow completed cleanly both times. |
| `integration_connections` | `provider_id=eq.gmail` (first attempt) | **Query error, not a data finding**: `42703 column integration_connections.user_id does not exist` -- this was my own mistake, assuming a column name that doesn't exist on this table. |
| `integration_connections` | `provider_id=eq.gmail` (corrected, `select=*`) | **1 real row.** `status: "connected"`, `configured_by` matching the same user id seen in `oauth_token_vault`, `connected_at: "2026-08-06T14:27:40.474Z"` -- an exact match to the second screenshotted attempt, `token_expires_at`, `oauth_state_hash`, `token_reference` all populated. Upsert is on `(organization_id, provider_id)`, so a single row correctly reflects the *latest* of the two attempts; it does not by itself prove the first attempt also wrote a row, but it does conclusively prove the write path works. |

Before drawing the wrong conclusion from the `42703` error, read `buildIntegrationConnectionUpsert()`
(`src/services/integrations/oauthProvider.ts`) to check what column the app itself actually
writes: it uses `configured_by: input.userId`, and the returned upsert object has **no `user_id`
field at all**. So the schema-mismatch hypothesis this pointed at was my own query error, not an
app bug -- confirmed by re-running the query with the correct column list.

### Conclusion from Step 4

**The backend is not failing.** OAuth exchange, token vault write, and `integration_connections`
upsert all succeed in production, every time. This directly disproves the "silent DB write
failure" hypothesis and narrows the unconditional-redirect concern from Step 2 to a **currently
dormant** defect (real in any environment where `isSupabaseAdminConfigured()` is false -- not the
cause of what the founder saw, since admin *is* configured in production today).

That leaves the **UI never reading or displaying connection state** (Step 3) as the confirmed,
sole, live cause of the reported symptom: every "Connect Gmail" click was a real, successful,
persisted connection, but the page looked identical before and after, so the natural next action
was to click it again -- reading as an "endless loop" when it was actually N/N successes with zero
feedback.

## What Changed

1. **`src/app/api/connectors/status/route.ts` (new)** -- `GET`, session-gated, queries
   `integration_connections` for the caller's own `organization_id` and `status=eq.connected`
   across a requested provider list (defaults to `gmail`, `microsoft`, `notion`), returns
   `{ connections: [{ providerId, connectedAt }] }`. Degrades to `{ connections: [] }` rather than
   throwing if Supabase admin isn't configured. Query pattern matches the existing
   `findGmailConnection`/`findMicrosoftConnection` helpers in the sibling `messages/import` and
   `messages/list` routes.
2. **`src/app/api/connectors/oauth/callback/route.ts`** -- the final redirect now reports
   `status=connected` only when `isSupabaseAdminConfigured()` is true (the actual write path ran);
   otherwise `status=not_configured`. Closes the dormant defect found in Step 2, in any environment
   where admin credentials are missing.
3. **`src/features/integrations/IntegrationsSection.tsx`**:
   - New `ConnectedBadge` component (green dot + "Connected" + date).
   - On-mount effect reads `provider`/`status`/`reason` from `window.location.search`, shows a
     real success/error toast, then `window.history.replaceState(...)` to strip the params so a
     refresh doesn't replay a stale toast.
   - On-mount (and post-toast) fetch of `/api/connectors/status?provider=gmail&provider=microsoft&provider=notion`,
     stored in new `connectedProviders` state.
   - Gmail/Microsoft/Notion "Connect X" links now render a `ConnectedBadge` and relabel to
     "Reconnect X" when already connected, instead of looking identical in both states.
4. **Tests added**: `src/app/api/connectors/status/route.test.ts`,
   `src/app/api/connectors/oauth/callback/route.test.ts` (new file -- none existed for this route
   before), and 2 new cases appended to `src/features/integrations/IntegrationsSection.test.ts`.
   All follow this codebase's existing source-string-assertion convention for these files (see
   `microsoft/messages/list/route.test.ts` for precedent).

## What Did Not Change (Explicitly Out Of Scope This Pass)

- **No Gmail message-listing feature was built.** Microsoft has a live "Load Microsoft inbox"
  button backed by `microsoftGraphMailbox.ts` + `/api/connectors/microsoft/messages/list`; Gmail
  only has `/api/connectors/gmail/messages/import`, which imports one message by a known
  `messageId` -- there is no Gmail equivalent of "list my recent messages." Building that would be
  a materially larger, separate feature (a new `gmailMailbox.ts` service calling the Gmail API,
  plus a list route, plus UI) and was not what the founder's bug report was actually about --
  flagging it here rather than silently building it or silently dropping it.
- **No change to token handling, scopes, or the Google OAuth app configuration.** Google sign-in
  (the separate Supabase Auth login provider) and this Gmail *connector* remain two distinct
  systems, per `INTEGRATIONS_DONENESS_MATRIX_2026_07_29.md`.
- **No retroactive backfill or dedup of the existing 5 `oauth_token_vault` rows / 1
  `integration_connections` row** -- they reflect real historical attempts and were left as-is.

## What Was Verified

| Check | Result |
|---|---|
| Direct production DB query (3 tables, corrected query) | `oauth_token_vault`: 5 rows confirmed. `oauth_connection_states`: 7 rows, 2 consumed matching screenshots. `integration_connections`: 1 row, `status: connected`, matches second attempt exactly. |
| `npx vitest run src/features/integrations/IntegrationsSection.test.ts src/app/api/connectors/status/route.test.ts src/app/api/connectors/oauth/callback/route.test.ts` | 4 test files, **23 passed, 0 failed** |
| `npx tsc --noEmit` | Clean, zero errors |
| `npx eslint <6 changed/new files> --max-warnings=0` | Clean, zero warnings |
| `npx next build` | Production build succeeded; `/api/connectors/status` registered as a dynamic route (`ƒ /api/connectors/status`) alongside the other connector routes |
| Local dev server, unauthenticated `/integrations` load | Redirects to `/auth` as expected (no session). Console errors present are all pre-existing and unrelated to this change (`NEXT_PUBLIC_POSTHOG_KEY` missing locally, CSP blocks on `vexo.co`/`getlaunchlist.com` analytics scripts) -- none reference `IntegrationsSection`, `/api/connectors/status`, or the OAuth callback route |

**Credential handling note:** the production `SUPABASE_SERVICE_ROLE_KEY`, pasted directly into
chat by the founder for this specific diagnostic task, was used only in-memory via
`node --env-file=<temp>`, never written to a tracked file or echoed in tool output, and the temp
file was deleted immediately after each query round. Confirmed deleted before this document was
written.

## What Remains Partial or Blocked

- **Live authenticated click-through has not been performed by me and cannot be self-certified.**
  Per this repo's standing HITL discipline, the founder needs to sign in for real, click
  "Connect Gmail," and confirm: (a) a toast appears saying "Gmail connected," (b) a green
  "Connected" badge appears next to the Gmail link, (c) a page refresh keeps showing "Connected"
  (proving `/api/connectors/status` reflects real state, not just the one-time toast). This is the
  direct verification of the actual fix and is the one thing that turns this from "should work" to
  "confirmed working."
- **Gmail has no live message-listing/inbox-preview feature** (see "What Did Not Change"). If the
  founder wants Gmail to reach parity with Microsoft's "Load Microsoft inbox," that is new,
  separate scope, not a bug fix.
- **The dormant `status=not_configured` branch is untested against a real not-configured
  environment** (production has `SUPABASE_SERVICE_ROLE_KEY` set, so this branch cannot be
  exercised there) -- covered only by the source-assertion test, not a live run.

## What Claim Is Still Unsupported

None held back silently. Every claim above is either backed by a cited command/query result in
this document, or explicitly named as unverified/blocked in the section above.

## Evidence Chain

External signal (founder screenshots + direct quote: "endless sign-ins... check logs") ->
product decision (confirm DB write success before scoping a fix, per founder's explicit
instruction) -> investigation (Vercel logs, callback route source, UI source, 3-table direct DB
query, corrected upsert-builder source read) -> shipped artifact (3 files changed, 1 new route, 3
test files, all listed above with exact paths) -> verification (23/23 targeted tests, clean
typecheck, clean lint, clean production build, unauthenticated-load smoke check) -> current status
(code-complete and machine-verified; live founder click-through is the one open item, tracked
above, not claimed as done).

## Files Changed

- `src/app/api/connectors/status/route.ts` (new)
- `src/app/api/connectors/status/route.test.ts` (new)
- `src/app/api/connectors/oauth/callback/route.ts`
- `src/app/api/connectors/oauth/callback/route.test.ts` (new)
- `src/features/integrations/IntegrationsSection.tsx`
- `src/features/integrations/IntegrationsSection.test.ts`
