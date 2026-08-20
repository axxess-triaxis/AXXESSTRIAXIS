# Sentry Setup (2026-08-20)

Governed by: `CLAUDE.md` (Evidence Chain -- Standing Rule). Cross-reference:
`docs/readiness/EVIDENCE_INDEX.md` (add a row once this closes),
`docs/readiness/DEPENDENCY_POLICY.md` (the `@sentry/cli` build-script allowlisting this pass required).

## What was added

`@sentry/nextjs` (`^10.70.0`), wired across all three Next.js runtimes:

- **Client (browser):** `instrumentation-client.ts` -- Sentry's `init()` added alongside the existing
  PostHog `init()` in the same file (Next.js reserves this filename for client instrumentation; merged
  rather than replaced, since PostHog's own exception capture and pageview tracking stay in place
  unchanged).
- **Server (Node.js runtime):** new `sentry.server.config.ts`.
- **Edge runtime:** new `sentry.edge.config.ts`.
- **Registration hook:** new `instrumentation.ts` -- dispatches to the server or edge config based on
  `NEXT_RUNTIME`, and wires `onRequestError` so unhandled server-side request errors are captured
  automatically, not just ones an individual route happens to `console.error`.
- **App Router root error boundary:** new `src/app/global-error.tsx` -- catches root-layout and
  React-render errors that would otherwise only show a blank/broken page with no capture at all.
- **Build config:** `next.config.mjs` wrapped with `withSentryConfig()` (source-map upload via
  `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` -- **not yet set**, see Remaining risk below --
  and `widenClientFileUpload` for better client stack traces once it is).
- **CSP:** `next.config.mjs`'s `connect-src` allowlists `https://*.ingest.us.sentry.io`. Without this,
  `Sentry.init()` runs with no error and *looks* configured, but every `captureException`/transaction
  beacon is silently dropped by the browser -- the exact failure mode already documented in this same
  file's pre-existing Facebook SDK comment, from a real incident earlier in this program's history.
- **Config:** `pnpm-workspace.yaml`'s `allowBuilds` already had a `@sentry/cli` placeholder
  (`set this to true or false`) from a prior pass anticipating this work -- set to `true`, since
  `@sentry/cli`'s postinstall just downloads Sentry's own official CLI binary for source-map upload, a
  standard, expected script for this package.
- **Scope, per the Sentry instrument skill's own "first error" default:** error monitoring + tracing
  only. Session Replay, structured Logging (the SDK's `enableLogs: true` flag is set, but no
  `Sentry.logger.*` calls have been added anywhere), Profiling, and AI/LLM monitoring were deliberately
  **not** wired up this pass -- the skill's own guidance is explicit that adding those upfront when only
  baseline error capture was asked for is over-instrumenting, not thoroughness.

## Why this, now

The founder asked directly, mid-session, right after a multi-PR investigation (PRs #266-#271) into a
production invitation-email failure that took four separate hypotheses, three deploy cycles, and a
temporary hand-added diagnostic `console.error` line to finally resolve. That investigation is the
concrete case for why this matters now, not a hypothetical.

## Why PostHog's exception capture isn't a substitute, at current volume and going forward

PostHog is already wired into this app (`instrumentation-client.ts`, `posthog-js`, `capture_exceptions:
true`) and already produces a "weekly error digest" email (referenced in this program's own memory from
a prior PostHog digest review this session). That capture path stays exactly as-is -- nothing about it
changes with this addition. But it is not a substitute for a dedicated error tracker, for reasons visible
directly in this repo's own code and this session's own recent history, not generic vendor-comparison
claims:

1. **Client-only.** PostHog's exception capture in this app exists solely in
   `instrumentation-client.ts` -- browser JavaScript errors. There is no equivalent for server-side
   failures: API routes (`src/app/api/*`), server actions, or edge middleware. The invitation-email bug
   this session was a **server-side** failure (`src/services/email/invitationEmail.ts`, invoked from an
   API route) -- PostHog's client-side capture would never have seen it under any circumstance, at any
   volume. Sentry's Next.js SDK, as wired here, covers browser, Node server, and edge runtimes uniformly.
2. **No fingerprinting or deduplication.** PostHog logs each captured exception as a discrete analytics
   event in the same stream as pageviews and clicks. It does not group repeated occurrences of the same
   underlying failure into one deduplicated issue with an occurrence count, a first-seen/last-seen
   timeline, or a resolved/unresolved/regressed lifecycle. At today's usage this is manageable by eyeball;
   it stops being manageable the moment error volume scales with real concurrent tenant usage, since every
   occurrence -- not every distinct *cause* -- becomes a row to individually read.
3. **Passive, low-frequency surfacing.** The only error-facing signal this program currently gets from
   PostHog is a **weekly** digest email. A production regression that starts failing requests today does
   not surface as an actionable signal until that digest runs, days later. Sentry creates an issue (and
   can alert) on first occurrence, in real time.
4. **No execution context at the point of failure.** This session's invitation-email root cause was only
   found because a temporary diagnostic `console.error` line was hand-written, deployed, and read back
   from `vercel logs` after a live retry -- three separate PRs (#266, #269) just to get one runtime value
   safely surfaced. `sentry.server.config.ts`'s `includeLocalVariables: true` (set in this pass) is
   *designed* to attach actual local variable values to a server stack trace automatically, for every
   unhandled exception, with no hand-written diagnostic required -- this is the intended improvement, not
   yet a confirmed one; see "Known gap" below, which found that server-side capture itself is not
   currently reaching Sentry in production, so this specific benefit is not yet realized.
5. **No release or deploy correlation.** Sentry ties issues to a release/commit and can show "this error
   started in deploy X" -- directly relevant given how much of this session's own CI/deploy discipline
   (`docs/readiness/CI_DEPLOYMENT_LEDGER.md`, `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md`) is
   already about correlating a specific commit/PR to a specific production outcome. PostHog's exception
   events carry no equivalent release linkage in this app's current setup.

**What this is not claiming:** this is not a claim that PostHog should be replaced, or that its exception
capture should be removed -- it stays for product-analytics correlation (e.g. "did this error correlate
with a specific user action or funnel step"), which is PostHog's actual strength. Sentry is additive,
covering the server-side and issue-lifecycle gap PostHog was never built to fill.

## Verification

- `pnpm run typecheck` -- see `docs/readiness/VERIFICATION_LEDGER.md` for the result of this pass.
- No Sentry MCP server is connected in this Claude Code session, so the skill's own automated
  "poll the MCP until the event appears" verification step could not run. Founder supplied an existing
  project DSN directly instead. Verification was done manually via a temporary
  `src/app/api/sentry-test-error/route.ts` (removed once the finding below was confirmed), triggered
  both locally and against the live production deployment, with results read back from the Sentry
  dashboard (founder-checked, screenshotted) and from `vercel logs`.
- **Client-side and tracing: confirmed working.** A local dev-server test (`environment: development`,
  `server_name` = founder's own machine) landed as a real Issue in Sentry, confirmed via a Gmail
  notification screenshot the founder shared, OCR'd to extract the exact event detail (issue ID
  `8f580cca...`, project `javascript-nextjs`, full stack trace with local-variable capture visible).
  Performance tracing spans (`GET /api/sentry-test-error`) also appeared in Sentry's Explore/Traces view.

## Known gap: server-side error capture does not currently reach Sentry from production

**Confirmed, not hypothesized.** Two full production redeploys (PRs #272, #273) and a manual diagnostic
(PR #274, mirroring the exact `console.error`-based technique that found the invitation-email root
cause) established:

- Every production hit on the test route returned the expected `500` and logged the thrown error via
  `vercel logs`, with `environment: "production"` correctly tagged -- the route itself, and Vercel's own
  request logging, work as expected.
- `debug: true` (Sentry's own first documented troubleshooting step) produced **zero** visible SDK output
  in `vercel logs`, at any log level. This session's own broader pattern -- every log line surfaced all
  session, across two separate investigations, has been `level: "error"` -- suggests `console.log`-based
  SDK debug output may simply not reach Vercel's log stream at all, making this specific troubleshooting
  step a dead end for this deployment target rather than proof of anything about Sentry itself.
- A manual `Sentry.getClient()` / `captureException()` / `await Sentry.flush()` diagnostic, reported via
  `console.error` (which reliably does show up), gave a definitive, unambiguous answer:
  **`client initialized: false`**, despite `SENTRY_DSN` confirmed present in the Vercel Production
  environment (`vercel env ls production`). `captureException` still returned a locally-generated event
  ID (expected SDK behavior even with no client -- not evidence of a successful send), and `flush()`
  explicitly returned `false`.
- **Working hypothesis, not yet confirmed:** this app builds production with **Turbopack** (visible in
  both the local dev server output and this session's own reading of `@sentry/nextjs`'s own troubleshooting
  table, which flags Turbopack-only limitations for at least one other feature -- tree-shaking). A gap
  between `instrumentation.ts`'s `register()` hook and the actual Route Handler's execution context on a
  Turbopack production build, on Next.js 16.2.12 with `@sentry/nextjs@10.70.0` (both very recent releases),
  is plausible but not confirmed as the specific mechanism. No GitHub issue or Sentry changelog entry was
  checked to corroborate this against other reported cases.
- **Explicitly parked, per founder decision (2026-08-20):** further investigation was deliberately stopped
  here rather than continued indefinitely -- this is a real, named, unresolved gap, not a silently
  abandoned one. See `docs/readiness/DECISION_OUTCOME_LEDGER.md` for the parking decision itself.

## Remaining risk / not yet done

- **Server-side error capture does not reach Sentry in production** -- see "Known gap" above. This is the
  primary blocker to this setup delivering its stated purpose (server-side visibility PostHog can't
  provide); client-side capture and tracing work, server-side error capture does not, as of this pass.
- **Source-map upload is not active.** `withSentryConfig()` is wired, but `SENTRY_AUTH_TOKEN`,
  `SENTRY_ORG`, and `SENTRY_PROJECT` are not set anywhere (local or Vercel). Secondary to the gap above --
  moot for server errors until that's resolved, but still relevant to client-side stack-trace readability.
- **No release/environment tagging configured** beyond the SDK's own auto-detection defaults.
- **DSN is currently set directly as a literal value** in `.env.local` (gitignored, not committed) and
  via `vercel env add` (Vercel-encrypted). Sentry DSNs are designed to be public/embeddable in a client
  bundle (this is why the client half is `NEXT_PUBLIC_SENTRY_DSN`), so this is not a secret-handling
  violation -- noted here only so a future reader doesn't mistake it for one.
- **Overall status: partially Live verified, not fully.** Per `docs/readiness/STATUS_TAXONOMY.md`: client
  capture and tracing are Live verified; server-side error capture is Deployed but not Live verified, and
  is a known, tracked gap rather than an assumed success.
