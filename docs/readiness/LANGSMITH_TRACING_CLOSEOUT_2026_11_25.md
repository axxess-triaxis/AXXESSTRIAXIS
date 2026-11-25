# LangSmith tracing, local only: closeout, 2026-11-25

Branch `feat/langsmith-tracing`, from `origin/main` at `754524ff`. Status: **Implemented locally.** Committed on an
unpushed branch. No PR, no deploy, no change to any hosted project or Vercel setting.

## Signal and decision

Founder request, 2026-11-25: install the LangSmith skills, trace "this agent", endpoint
`https://api.smith.langchain.com`, agent `axxess-triaxis`, environment `local`. The named repository
(`langchain-ai/langsmith-skills`) was deprecated on 2026-11-20 and holds only redirects. Founder's choices the same
day: the one replacement tracing skill; Copilot and all AI that goes through `routeAiRequest`; masked content, local
only.

## What changed

| Area | Files |
|---|---|
| Skill, unchanged from commit `9002566f` (blob `6cccc2ac`) | `.claude/skills/langchain-agent-tracing/SKILL.md`, `ATTRIBUTIONS.md` |
| Dependency, pinned `langsmith@0.13.0` | `package.json`, `pnpm-lock.yaml`, `next.config.mjs` (`serverExternalPackages`) |
| Seam with no SDK import | `src/services/ai/tracing/aiTracing.ts`, `traceModelCall.ts` |
| Tracer, server only | `src/services/ai/tracing/langsmithTracer.ts`, registered in `instrumentation.ts` |
| Traced steps | `aiRouter.ts`, `agenticChatLoop.ts`, `tenantRagWorkflow.ts` |
| Model name on completions | `types.ts`, `groqProvider.ts`, `openAiProvider.ts`, `openRouterProvider.ts` |
| Settings template, key blank | `.env.example` |
| Tests | `aiTracing.test.ts`, `langsmithTracer.test.ts`, `langsmithTracer.live.test.ts`, `langsmithTestRecorder.ts`, `agenticChatLoop.tracing.test.ts`, `tenantRagWorkflow.tracing.test.ts` |

Tracing is refused unless `LANGSMITH_TRACING=true`, a well-formed key and agent ID are present, the environment is
exactly `local`, the endpoint is https, the build is not production, and it is not on Vercel. That is enforced in
code because every tenant defaults to `zeroDataRetentionRequired: true`.

## What did not change

`replyClassifier.ts`, the lead-sourcing worker, Callismatic, retrieval, embeddings, UI, routing, auth, database,
Vercel settings. AI answers are the same with tracing on, off or failing.

## Closeout Evidence

Issue ID: LANGSMITH-TRACING
Title: LangSmith tracing for the app's AI, developer machine only
Origin plan: `~/.claude/plans/install-langsmith-skills-from-splendid-moon-of-0e5e8cf4-ad81-4ce5-91a0-5986cf1b3a92.md`, approved 2026-11-25
Research artifact: the plan's Context section
Implementation commit(s): this commit
PR: none
Branch: `feat/langsmith-tracing`
Files changed: above

Verification result:

| Check | Result |
|---|---|
| `pnpm run typecheck` | exit 0, final code |
| `pnpm --dir apps/mobile run typecheck` | exit 0 (before the last tracer edits; no mobile file changed) |
| `pnpm run lint` | exit 0, zero warnings, final code |
| `pnpm run test` (threads) | 2713 passed, 1 skipped, **then exit 139 (segmentation fault)**. Not counted as a pass |
| `npx vitest run --config vitest.config.mjs --pool=forks` | exit 0. 414 files passed, 1 skipped; 2714 tests passed, 1 skipped |
| Tracing, chatbot and RAG folders, after the last tracer edit | 24 files passed, 1 skipped; 225 tests passed, 1 skipped |
| `pnpm run build` | exit 0, "Compiled successfully", final code |
| `.next/static` files that mention `langsmith` | 0 |
| `pnpm run supabase:verify` | exit 0, "passed", 1 existing warning (permissive RLS predicate in `20260702165736_initial_enterprise_schema.sql`) |
| `pnpm run lite:guard` | exit 0, 66 files |
| Deliberately broken safeguards | 23 of 24 caught. The other, metadata on child runs, is equivalent: the SDK copies parent metadata (`run_trees.js:509-517`) |
| Playwright | Not run: no UI, routing, auth or onboarding change |

The full forks run finished before the last two tracer edits (`omitTracedRuntimeInfo` and its test). Those are covered
by the 225-test run, typecheck, lint and build above.

Live checks (2026-11-25, UTC). Each was read back from LangSmith, because a 202 does not prove where a trace landed.

| Time | Check | Result |
|---|---|---|
| 10:50 | Live test, write only | passed |
| 10:53 | Live test with read-back | 4 writes, all 202. 2 runs stored under `axxess-triaxis`, environment LOCAL, one trace, email stored as `[redacted]`, no raw organization or user ID. **Found `LANGSMITH_*` variable names in metadata** |
| 10:56 | Same, after the fix | passed; metadata is only our keys plus the SDK's `ls_run_depth` |
| 11:00 | Dev server, tracing on, temporary route calling `routeAiRequest` | logged "LangSmith tracing is on (local)."; route 200; trace stored |
| 11:01 | Dev server, key empty | logged "LANGSMITH_API_KEY is not set."; route 200; nothing stored |
| 11:02 | Dev server, tracing off | no LangSmith log line; route 200; nothing stored |
| 11:00 | All runs stored that day | LOCAL 8 runs in 4 traces; DEVELOPMENT, STAGING and PRODUCTION 0 |

The temporary route and launch entries were removed. Deploy evidence: not applicable.

Acceptance criteria, from the plan:

| Criterion | Evidence | Met |
|---|---|---|
| Skill byte-identical to the pinned commit | blob `6cccc2ac5c8f81506187b0392336eb8a948bad9e` | Yes |
| Copilot turn and Knowledge Hub answer each give one trace, no duplicates or orphans | unit tests on the captured upload; only the route and model steps were exercised live | Yes in tests; not verified live |
| Addressed to `axxess-triaxis`, `local`, the given endpoint | live read-back | Yes |
| Emails, phones, known secrets masked; no raw IDs or access token | unit tests; email and IDs also live | Yes |
| Restricted content never sent, including through a tool | unit tests | Yes in tests; deliberately not tried live |
| Off in every disabled case; failure never breaks an AI request | unit tests; two off modes also live | Yes |
| No `langsmith` in a browser bundle | scan above | Yes |

Regression test: the key-shape guard and the environment-variable fix each started with a failing test (1 failed
before, all pass after).

Errors hit this session:

| Error | Resolution |
|---|---|
| Full suite exit 139 after all tests passed | Not caused by this change: same crash type at `CHUNKED_DOCUMENT_UPLOAD_ARCHITECTURE_CLOSEOUT_2026_07_31.md:117`. Re-run in forks, exit 0. Vitest reports that `test.poolOptions`, which holds this repository's thread cap, was removed in Vitest 4, so the cap may not apply; unconfirmed as the cause. Recorded as VITEST-EXIT-139, owner Claude Code (existing session "Fix Vitest worker cap and exit 139 crash", no PR) |
| SDK copied `LANGSMITH_*` and `LANGCHAIN_*` variable values it did not consider secret into run metadata. Stored before the fix: `LANGSMITH_LIVE_TEST` and `LANGSMITH_TRACING` only, on 4 runs. Keys and tokens are excluded by the SDK | Fixed with `omitTracedRuntimeInfo`; re-run live at 10:56 |
| Wrong text saved as the key, and one live test run on it | The test recorded no writes, and no run from it is stored. That recording was unreliable, so the text may have been sent as a request header. Guard added, key re-entered by the founder from the clipboard |
| Live test recorded 0 writes while uploads were still in the background | Fixed: it waits for the writes and then reads the runs back |
| Unused-variable lint warning | Fixed, lint exit 0 |

Deviations from the plan: content is cleaned before the SDK holds it, instead of by the SDK's `anonymizer`; the key
guard, the read-back and `omitTracedRuntimeInfo` were added; Knowledge Hub reads its cited documents' sensitivity only
while tracing is on, and follow-up questions record structure only.

Decision outcomes:
- Decision: trace the app's AI in LangSmith, local only, masked.
  Outcome: works locally, as above. Whether it helps: Pending, review by 2026-12-09.

Final status: Implemented locally
Remaining risk: names and business details are not masked, so use test data only. A restricted text that the
sensitivity rules do not recognize would be sent. Copilot has no server-side conversation ID, so its thread is a token
of organization, user and message. Copilot and Knowledge Hub traces are not yet seen live (they need a sign-in).
Follow-up issue IDs: VITEST-EXIT-139
Supersedes: none. The 2026-11-24 "no LangChain" decision was about the RAG gate and still holds there.
Superseded by: none
Reopened by: none

Approvals asked: 3 choices, 1 plan, and the key entry. The key entry took several attempts; starting with the
clipboard script would have avoided most of them.
