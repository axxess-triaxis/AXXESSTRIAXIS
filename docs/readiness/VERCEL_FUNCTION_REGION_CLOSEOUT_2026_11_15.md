# Vercel Function Region - Closeout (2026-11-15)

## External signal

The 2026-11-15 staging e2e triage (`docs/readiness/E2E_STAGING_TRIAGE_CLOSEOUT_2026_11_15.md`, PR #504) found that saves sometimes took more than 5 s and that pages sometimes stayed on "Checking session" for more than 20 s. Tests failed in one run and passed in the next.

A latency probe was then run against staging. It made server-side requests with the Vercel bypass, signed in as the seeded org admin, at 2026-11-15 17:58 IST.

| Call | Time |
| --- | --- |
| Login | 3.6 s (5.7 s in an earlier probe) |
| `/api/auth/session` (2 Supabase calls) | 1.0 to 2.1 s |
| Task list | 1.3 to 1.7 s |
| Task create | 1.9 to 2.6 s |
| 4 parallel list calls | 1.3 to 3.0 s |

Every response carried `x-vercel-id: bom1::iad1::...`. The edge is Mumbai, and the functions run in `iad1`, Washington DC. `supabase projects list` shows:
- Staging `qpbeoslikcosfytwuguf`: `ap-northeast-1`, Tokyo.
- Production `vnliomnfabaicvvvfwia`: `ap-southeast-2`, Sydney.

Every server-to-database call therefore crosses an ocean. A create makes at least 6 sequential Supabase calls: the session check (2), the insert, the notification, the audit row and the timeline event.

## What changed

- `vercel.json`: `"regions": ["syd1"]`, so functions run in Sydney, next to the production database. Staging calls then go Sydney to Tokyo, which is shorter than Washington DC to Tokyo.

## What did not change

- No application code. No database or Supabase region change.
- The occasional stall that ends in `ECONNRESET` is not addressed. It happened once in each of 2 probe runs, 19.2 s in the second. The cause is unknown: client network or Vercel.

## Scope note

The repository is also built by the Vercel projects `triaxis-www-frontend-import` and `triaxis-product-investor-demo` (deploy statuses on `9a2b6765`). If they read this `vercel.json`, their functions move to `syd1` too. That is harmless for demo and marketing pages but not verified. Each project's Settings, then Functions, shows the region in effect after deploy.

## What was verified

- `vercel.json` parses as JSON. The change is config only, so typecheck, lint, unit tests and build are unaffected. CI on the PR runs them anyway.

## After the change (staging, 2026-11-15 19:28 IST)

PR #505 merged as `08eb7f8d`. All three Vercel projects deployed it successfully. `main` was then merged into `staging` as `1ba18a1b`, which deployed successfully, and the same probe was re-run. Every response carried `x-vercel-id: bom1::syd1::...`, so the functions now run in Sydney.

| Call | Before (`iad1`) | After (`syd1`) |
| --- | --- | --- |
| Login | 3.6 s | 4.9 s (1 sample) |
| Session check, median | 1.96 s (4 samples, 1 more stalled 19.2 s then reset) | 1.41 s (5 samples, range 0.8 to 1.6 s) |
| Task list, median | 1.65 s | 1.29 s |
| Task create, median | 2.24 s | 1.57 s |
| 4 parallel list calls | 1.3 to 3.0 s | 0.9 to 2.1 s |
| Stalls ending in `ECONNRESET` | 1 in 16 calls | 0 in 16 calls |

Most calls are about 25 to 30% faster. Staging's database stays in Tokyo, so Sydney-to-Tokyo still costs time on every call.

This is one probe each way, 16 calls each. It is enough to show the direction, not a stable average. The missing stall in one run does not prove the stall is gone.

## What remains unverified

- **Production timing.** No measurement was taken on production, by rule. Production's database is in Sydney, next to the functions now, so it should gain more than staging. That is an inference. A founder spot check (sign in, save a task) is the next evidence.
- **The `ECONNRESET` stalls.** None appeared in the after-run, but one run does not show they are fixed.

## Rollback condition

Remove `regions` (back to the `iad1` default) if, after deploy, production `/api/auth/session` or saves get slower than before, or a function errors in `syd1`.

## Decision ledger

```
Decision: Run Vercel functions in syd1, next to the production Supabase (Sydney).
Why: Functions ran in iad1 (Washington DC) while the databases are in Tokyo (staging) and Sydney (production); staging API calls took 1 to 3 s each.
What changed: vercel.json regions.
Architecture boundary: Hosting config only; no code or data change.
Product boundary: Every signed-in page should get faster; no feature change.
Verification: Staging probe before and after; region confirmed syd1 from x-vercel-id.
Outcome: Working on staging: medians 25 to 30% faster. Production pending a founder spot check, review by 2026-11-29.
Follow-up: Re-run the probe on staging after deploy; founder spot-check on production; investigate the ECONNRESET stalls.
```
