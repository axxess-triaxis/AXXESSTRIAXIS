# Lead discovery token limit fix: closeout (2026-11-26)

## Evidence chain

- **External signal.** The first production discovery run, `ad073faf` (schedule `6bfdb12b`, Dubai real estate brokerages), ran at 2026-11-23 05:02 UTC and returned 0 companies.
  - Source: CloudWatch `/aws/lambda/axxess-lead-sourcing-prod`.
  - Logged: 7 searches, 10 model turns, 0 suggested, 0 rejected, `Discovery incomplete: 1`, `Listed by no-tool extraction: 0`, 49,771 input and 5,284 output tokens. No error.
- **Product decision.** The founder said "Yes, fix it here" on 2026-11-26.
- **Shipped artifact.** PR #596, commit `d84860a1`. The production worker was redeployed from it.
- **Verification.** Listed below.
- **Current status.** Fix live in the production worker. Not yet proven on a real scheduled run (next due 2026-11-30 05:00 UTC).

## Cause

- gpt-oss-20b on Bedrock returns its reasoning as a `reasoningContent` block that counts against `maxTokens`.
- A call that runs out of tokens while still reasoning ends with `stopReason: max_tokens` and has no text and no tool call. Reproduced on Bedrock on 2026-11-26 with a 200-token limit.
- Every call allowed 4,096 output tokens, and the run wrote 5,284.
- A cut-off forced-submit turn looks like "no tool call". A cut-off extraction call looks like "no JSON". Both match the log.
- The old worker did not log `stopReason`, so this cause is the best fit for `ad073faf`, not proven for it.
- Ruled out: `<reasoning>` text breaking the JSON parse. The text block was clean JSON in the 2026-11-26 probe.

## What changed

- `src/services/leadSourcing/discover.ts`:
  - `MAX_OUTPUT_TOKENS = 16384` on every Converse call. Bedrock accepted 16,384 for `openai.gpt-oss-20b-1:0`.
  - Calls that stop at `max_tokens` are counted (`cutOffTurns`) and named in the `incomplete` reason.
- `workers/lead-sourcing/discovery.ts`: logs `"Calls cut off at the token limit"` on every run.
- `src/services/leadSourcing/discover.test.ts`: 2 regression tests.

## What did not change

- Model, prompts, search budget, validation checks, schedules, worker template and stack parameters.
- No outreach, no sequence enrolment, no new countries.

## What was verified

- **Regression tests first.** Both new tests failed on the old code ("expected 4096 to be greater than or equal to 16384"), then passed after the fix.
- **Lead-sourcing tests:** 8 files, 77/77 passed.
- **Local gates:**
  - `pnpm run typecheck`: exit 0. The first attempt crashed with "Zone Allocation failed - process out of memory": the machine had 354 MB free, with other sessions running. It passed on its own once my orphaned processes were stopped.
  - `pnpm --dir apps/mobile run typecheck`: exit 0.
  - `pnpm run lint`: exit 0, zero warnings. The first attempt crashed with `scandir UNKNOWN` on an intact folder under the same memory pressure, and passed on a retry.
  - `pnpm run test`: 416 files, 2,751 passed, 1 skipped (the env-gated `langsmithTracer.live.test.ts`).
  - `pnpm run build`: exit 0.
  - `pnpm run supabase:verify`: passed.
  - Worker `npm run build`: built `dist/handler.mjs`.
- **Live replay.** Local and read-only, with the fixed code against real Bedrock and AgentCore web search. Request: brokerage, AE, Dubai, target 10, 15 searches.
  - Result: 7 searches, 9 turns, 1,215 output tokens, 0 cut off. `submit_companies` returned 6 companies before the deterministic checks.
  - This run did not reach the old limit, so it shows the fixed path works end to end. It does not prove the cause of `ad073faf`.
- **Staging worker deploy.** `axxess-lead-sourcing-staging` was updated 2026-11-26 12:33 UTC: code `HvUtlQ65…`, parameters unchanged, `ScheduleState=ENABLED`.
- **Production worker deploy** (founder: "Yes, deploy prod", 2026-11-26).
  - `axxess-lead-sourcing-prod` was updated 2026-11-26 14:33:57 UTC with code `HvUtlQ65…`, the same bundle as staging.
  - Parameters unchanged: gpt-oss-20b, `DiscoveryEnabled=true`, `ScheduleState=ENABLED`, `AxxessBaseUrl=https://landing.triaxisventures.com`.
- **Live check.** At 2026-11-26 14:37 UTC (request `5a6b0843`), the production scheduler tick returned `{"due":0,"started":0,"skipped":0,"lost":0}` with no claim or HTTP errors.

## What remains open

| ID | Item | Owner | Next check |
|---|---|---|---|
| LS-DISC-1 | Prove the fix on a real scheduled run. Done means companies > 0, or a run log that states the cut-off count. | Claude Code | 2026-11-30 05:00 UTC run of `6bfdb12b` |
| LS-STG-1 | Staging worker cannot reach its app. `AxxessBaseUrl` is a Vercel preview URL that returns HTTP 410. Before this deploy, 12:00-12:30 UTC on 2026-11-26: 12 claim and 6 tick failures, all 410. Present before this change. | Founder to choose the staging base URL; then Claude Code redeploys staging with it | Next staging change |

## Approvals asked

Two approvals:
- "Yes, fix it here".
- "Yes, deploy prod". This one is required by the standing rules for a production deploy outside Merge When Ready.

Neither could have been avoided.
