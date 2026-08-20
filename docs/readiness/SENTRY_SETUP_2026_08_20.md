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
   safely surfaced. `sentry.server.config.ts`'s `includeLocalVariables: true` (set in this pass) attaches
   actual local variable values to a server stack trace automatically, for every unhandled exception, with
   no hand-written diagnostic required. This is not a hypothetical improvement -- it is the exact gap this
   session's own debugging process ran into and worked around manually.
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
  project DSN directly instead. **Verification is therefore manual**: a real error needs to be triggered
  through the app's actual code path and confirmed in the Sentry dashboard directly, not just asserted
  from the code being in place.

## Remaining risk / not yet done

- **Source-map upload is not active.** `withSentryConfig()` is wired, but `SENTRY_AUTH_TOKEN`,
  `SENTRY_ORG`, and `SENTRY_PROJECT` are not set anywhere (local or Vercel). Production stack traces will
  show minified/unreadable frames until these are added -- this is the single most important follow-up,
  since an unreadable production stack trace defeats much of the point of adding this at all.
- **No release/environment tagging configured** beyond the SDK's own auto-detection defaults.
- **DSN is currently set directly as a literal value** in `.env.local` (gitignored, not committed) and
  via `vercel env add` (Vercel-encrypted). Sentry DSNs are designed to be public/embeddable in a client
  bundle (this is why the client half is `NEXT_PUBLIC_SENTRY_DSN`), so this is not a secret-handling
  violation -- noted here only so a future reader doesn't mistake it for one.
- **Not yet verified end-to-end.** Per the Verification section above -- code is in place; a real
  triggered error confirmed in the Sentry dashboard is the remaining step before this can be marked
  `Live verified` per `docs/readiness/STATUS_TAXONOMY.md`.
