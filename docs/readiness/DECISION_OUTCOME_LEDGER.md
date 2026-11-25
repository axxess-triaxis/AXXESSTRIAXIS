# Decision-to-Outcome Ledger

Governed by: `CLAUDE.md` (Decision Ledger -- Standing Rule). Created 2026-08-20. `CLAUDE.md` already
requires a `Decision: / Why: / What changed: / ...` block at the end of any session with a major call in
it -- this file is the running, queryable table those per-session blocks roll up into, so a later
session or report doesn't have to re-read every past session's transcript to find them.

## Row schema

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|

- **Session/tool**: which agent/tool made or executed the call (e.g. "Claude Code", "Codex").
- **Issue ID**: cross-reference to `docs/readiness/EVIDENCE_INDEX.md` where one exists.
- **Outcome**: use `docs/readiness/STATUS_TAXONOMY.md` vocabulary where the decision has a shippable
  outcome; for pure scope/boundary calls with no code artifact, describe the outcome in one line instead.

## Known standing architecture/scope decisions (seeded 2026-08-20)

These are decisions already in force per existing memory and CLAUDE.md content, listed here because the
founder's governance request named them explicitly as the kind of call this ledger should hold. Dates and
sourcing are as precise as currently available; several predate this ledger and are being recorded now,
not backfilled with invented specifics.

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| GitHub is source of truth; GitLab (where used) is mirror/fallback | Pre-existing, formalized in memory `project_github_source_of_truth.md` | Founder decision, applied by Claude Code | REPO-POLICY | Web/investor-demo/iOS/Android surfaces all need to sync to one canonical history; mobile is exempt while DUNS-blocked | Standing policy | N/A (policy, not a shipped artifact) | Enforced via this session's own practice (all merges go through GitHub PRs) | `docs/REPOSITORY_POLICY.md` (this pass) |
| Demo mode is an explicit production-layer preview, not mock-auth leakage | Pre-existing, referenced across `docs/readiness/*` demo-mode language | Founder + Claude Code, multiple sessions | DEMO-MODE-BOUNDARY | Investor/demo domains need realistic walkthroughs without real tenant data risk | Standing architecture boundary | N/A (architectural convention, enforced per-feature) | Each feature's own tests assert demo-vs-real branching (e.g. `ProductAnalyticsSection.test.tsx`'s demo-mode branch tests) | Not centrally filed; enforced per-PR |
| Vercel deploy retry only on exact known-transient quota/rate-limit strings | Pre-existing operational practice | Claude Code, applied across multiple deploy sessions | DEPLOY-RETRY-POLICY | Blind retries on unrelated failures (lockfile, Turbopack, security gate) mask real defects instead of fixing them | Standing policy | N/A | This session's PR #266 merge: retried only after confirming via githubstatus.com that the specific 503 was a GitHub-side outage, not a code failure | `docs/readiness/VERCEL_RETRY_EVIDENCE_TEMPLATE.md`, `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md` (this pass) |
| Live HTTP 200 (or expected status) required after a workflow reports success, before calling a deploy verified | Pre-existing operational practice, applied consistently this session (PR #264, #265, #266 deploy verification) | Claude Code | DEPLOY-VERIFY-POLICY | A green GitHub Actions run does not guarantee the Vercel deployment is actually serving traffic correctly -- proven necessary when PR #264's merge commit had no populated GitHub check-run status despite a real successful deploy | Standing policy | #264, #265, #266 | `curl`/`Invoke-WebRequest` checks performed after each of those three merges, documented in this session's own responses | `docs/readiness/CI_DEPLOYMENT_LEDGER.md` (this pass) |
| No blind retry for lockfile, Turbopack compile, or supply-chain/security-gate failures | Pre-existing operational practice | Claude Code | DEPENDENCY-RETRY-POLICY | These failure classes are almost always a real defect (wrong lockfile state, genuine compile error, genuine vulnerability), not infra flake -- retrying without investigating risks shipping a broken or vulnerable build | Standing policy | N/A | N/A (a stop-and-investigate rule, not a shipped check) | `docs/readiness/DEPENDENCY_POLICY.md` (this pass) |

## Governance-scaffold decision (this session, 2026-08-20)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Build the 30-item Paxel evidence-governance scaffold as schemas + real seeded entries, not a bulk historical backfill | 2026-08-20 | Claude Code | GOVERNANCE-EVIDENCE-SCAFFOLD | Retroactively assigning issue IDs and evidence chains to ~891 commits of pre-existing history would require inventing identifiers and evidence that were never tracked at the time -- a direct violation of CLAUDE.md's "do not invent missing evidence" rule this exact request is meant to reinforce | Implemented locally | This commit | Each new file's content checked against real repo state (`git log`, `git ls-files`, `gh api`) before writing | This file + `docs/readiness/EVIDENCE_INDEX.md` |
| Park the Sentry server-side capture investigation rather than continue indefinitely | 2026-08-20 | Founder, executed by Claude Code | SENTRY-INSTRUMENTATION | Root cause narrowed to a real, named finding (`Sentry.getClient()` returns no client in the Route Handler context in production, likely Turbopack-related) but not fully resolved; founder explicitly chose to move to other open bugs (A-107, A-67) rather than keep digging | Deployed, known gap tracked, not silently dropped | #272, #273, #274 | Diagnostic evidence (client-init false, flush() false, DSN confirmed present) recorded in `docs/readiness/SENTRY_SETUP_2026_08_20.md` "Known gap" section before parking | `docs/readiness/SENTRY_SETUP_2026_08_20.md` |

## Note on Lite/X0 and MCP boundary decisions named in the founder's request

The founder's governance message named several specific architecture calls as examples for this ledger
("Lite excluded from Agentic MCP admin", "X0/full enterprise owns MCP3"). These were not independently
re-verified against current code in this pass -- adding them here with invented dates or commit
references would itself violate the Evidence Chain rule. If these are still-standing boundaries, the
next session that touches Lite/MCP scope should add a properly sourced row (real commit, real PR, real
date) rather than this ledger asserting them from the founder's paraphrase alone.

## Investor EOD sync decision (2026-10-29)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Keep investor on landing's commit via a gated EOD safety-net workflow, and make demo data date-relative, instead of changing investor's env or Vercel settings | 2026-10-29 | Founder request, executed by Claude Code | INVESTOR-EOD-SYNC | Research showed investor and landing ran the same commit (`8fe2f25`) yet investor read as months behind because `src/demo/demoDataset.ts` pinned every seeded date to 2026-07-04; separately, landing is also deployed by the Vercel Git integration ahead of CI, so investor can trail landing until the CI chain finishes | Merged and deployed; both domains verified on `585fa2b`; dry-run dispatch passed; scheduled run and live deploy path not yet verified | #435 (`585fa2b`) | Unit tests for every sync gate and the partition guard; Actions run 40883740362 (dry run, `in-sync`); Actions run 40883726090 (merge deploy, all jobs success); Vercel deployment SHAs on both domains; live investor `/tasks` dates current | `docs/readiness/INVESTOR_EOD_SYNC_CLOSEOUT_2026_10_29.md` |

## Paxel 9.5 practice standards (2026-11-01)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Adopt the Paxel 9.5 Practice Standards as a standing rule in `CLAUDE.md` and mirror them in the closeout template, PR template, test governance, governance summary and contributing guide | 2026-11-01 | Founder request, executed by Claude Code | PAXEL-9-5 | Paxel Report #28 (`results/z3w3ytji`) found outcomes tracked for only 8 of 19 option choices and 1 of 21 product insights, 0.59 unresolved errors per planned session, a deploy record closed at "ready" without a live check, and 21 bare "Try again" prompts; Claude Code's axis estimate (not YC's) averaged 7.2 | Adopted. Reviewed 2026-11-15 in Report #32: partly followed (regression-test-first, staging live checks and dated outcomes followed in PR #504; plan-first well below 95% in desktop sessions running in auto mode; 12 bare retry or re-check prompts in the window). Pending, review by 2026-11-29 | This branch (`docs/paxel-9-5-practice-standards`) | Docs-only path check over the changed files | `docs/readiness/PAXEL_REPORT_28_BEHAVIORAL_ANALYSIS_2026_11_01.md`; review: `docs/readiness/PAXEL_REPORT_32_BEHAVIORAL_ANALYSIS_2026_11_15.md` |

From 2026-11-01, under rule 6 of that standard, a new row's Outcome is either the observed result or
`Pending, review by <date>` at most 14 days out, and a weekly pass closes or re-dates Pending rows.
Existing rows are not rewritten.

## Stack E2E on staging (2026-11-04)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Every Callismatic lead becomes an AXXESS task, whatever needs_decision says | 2026-11-04 | Founder decision, executed by Claude Code | #452 | A clear buyer was marked as not needing a person in 20 of 23 tries, with no error | Working on staging. Pending on production, review by 2026-11-18 | STILL#7, STILL#8 (`f4e6dfe`) | 70 STILL tests, AWS pattern test, 3 clean runs, one deliberate failure | `docs/readiness/STACK_E2E_STAGING_CLOSEOUT_2026_11_04.md` |

## Access and audit integrity (2026-11-06)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| `public.users` is the single source of truth for access, kept in step by a database trigger | 2026-11-06 | Founder chose the fix group, executed by Claude Code | ACCESS-AUDIT-INTEGRITY | Suspending and demoting did not remove database access, because the API and RLS read different role stores | Works locally. Pending on production, review by 2026-11-20 | #456 (`590e976`) | API round 54 of 54, `verify-access-integrity.mjs` 44 of 44, local only | `docs/readiness/ACCESS_AND_AUDIT_INTEGRITY_CLOSEOUT_2026_11_06.md` |
| Members write audit rows only through an RPC that takes the actor from the token, and only refused writes are logged, not refused reads | 2026-11-06 | Claude Code, in the approved plan | ACCESS-AUDIT-INTEGRITY | Non-admin audit writes failed silently and direct inserts could name someone else. Pages make refused reads routinely, which would flood the log | Works locally. Pending on production and log volume, review by 2026-11-20 | #456 (`590e976`) | 30 lead creates added 30 rows, forged insert 403, local only | `docs/readiness/ACCESS_AND_AUDIT_INTEGRITY_CLOSEOUT_2026_11_06.md` |
| Employees use the CRM and see only their own leads, with no new Sales role | 2026-11-06 | Founder chose, executed by Claude Code | API-ROLE-CHECKS | 30 sales agents could not open `/crm` yet could read each other's deal values through the API | Works locally: each agent reads exactly their own deal. Pending on real use, review by 2026-11-20 | #457 (`c68f63c`) | Round 163/163, local only | `docs/readiness/API_ROLE_CHECKS_CLOSEOUT_2026_11_06.md` |
| `Manager` keeps the financial watchlist until a finance role exists, against the audit matrix's `N` | 2026-11-06 | Approved plan, executed by Claude Code | API-ROLE-CHECKS | The only alternative locks the finance head out, because AXXESS has no finance role | Works locally. Pending M23, review by 2026-11-20 | #457 (`c68f63c`) | Round 163/163, local only | `docs/readiness/API_ROLE_CHECKS_CLOSEOUT_2026_11_06.md` |
| Employees see only their own tasks, projects and meetings, with projects kept in although the audit lets Employees read all projects | 2026-11-06 | Founder chose, executed by Claude Code | API-ROLE-CHECKS | The audit asks for assigned-only tasks. `tasks_sprint5_employee_write` also let every Employee change any task | Works locally: an Employee cannot read, change or delete a colleague's task. Pending on real use, review by 2026-11-20 | #457 | Integrity 105/105, round 163/163, local only | `docs/readiness/API_ROLE_CHECKS_CLOSEOUT_2026_11_06.md` |
## Investor and landing parity (2026-11-05)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Investor stays in forced demo mode; par means the same code and features, with demo data | 2026-11-05 | Founder decision, executed by Claude Code | INVESTOR-LANDING-PAR | Production data on a public, no-login site would be a major security and product change | Partial: live investor check passed 2026-11-06, signed-in landing not compared. Pending, review by 2026-11-19 | #453, merged as `650b131` | See closeout | `docs/readiness/INVESTOR_LANDING_PAR_CLOSEOUT_2026_11_05.md` |
| Remove the dead `/admin/backups` link rather than build a page | 2026-11-05 | Claude Code, reported to founder | INVESTOR-LANDING-PAR | The wiring roadmap records no backup table, service or route, so a page would advertise an unbuilt feature | Pending, review by 2026-11-19 | #453, merged as `650b131` | See closeout | `docs/readiness/INVESTOR_LANDING_PAR_CLOSEOUT_2026_11_05.md` |

## Product Hunt launch tracker (2026-11-07)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Product Hunt launch numbers appear as a live, operator-only tile, with no history table yet | 2026-11-07 | Founder request, executed by Claude Code | PRODUCT-HUNT-TRACKER | They describe Triaxis's own listing, not customer data, and the existing tile pattern needs no migration | Pending, review by 2026-11-21 | Not merged | See closeout | `docs/readiness/PRODUCT_HUNT_LAUNCH_TRACKER_CLOSEOUT_2026_11_07.md` |

## Stack status page (2026-11-08)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| The YC demo's staging minute uses a new `/admin/stack` page built on existing audit records | 2026-11-08 | Founder request, executed by Claude Code | STACK-STATUS-PAGE | Founder asked for schema, stats and workflow runs on staging | Partial: merged, deployed, 5 stack scenarios pass on staging; signed-in view pending. Review by 2026-11-22 | PR #459, `c2bc70c`; staging `eec34ae` | See closeout | `docs/readiness/STACK_STATUS_PAGE_CLOSEOUT_2026_11_08.md` |

## App E2E suite on staging (2026-11-15)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Specs needing a demo-mode build skip on staging instead of being rewritten for live data | 2026-11-15 | Claude Code, from the triage task | E2E-STAGING-TRIAGE | CI runs them only on demo builds; "Dibrugarh" is demo-only sample data, not a seed row | 25 skips on staging, CI coverage unchanged. Pending, review by 2026-11-29 | #504 (`d41898e3`) | Staging run 5: 18 passed, 25 skipped, 3 failed | `docs/readiness/E2E_STAGING_TRIAGE_CLOSEOUT_2026_11_15.md` |
| Create, update and save messages stay visible after the list reloads | 2026-11-15 | Claude Code, product bug found in triage | E2E-STAGING-TRIAGE | The reload cleared the toast in the same render, so no user ever saw it, since Sprint 7 | Working on staging (`94b003c4`). Pending on production, review by 2026-11-29 | #504 (`d41898e3`) | Unit regression test fails on the old code and passes now; "Task created." and "Project created." seen on staging in run 3 | `docs/readiness/E2E_STAGING_TRIAGE_CLOSEOUT_2026_11_15.md` |
| Seeded e2e runs use one worker, and sign-out scope stays global pending founder decision | 2026-11-15 | Claude Code; scope question to founder | E2E-STAGING-TRIAGE | Global logout revoked parallel tests' sessions (run 1) | "Sign in required" mid-test gone in runs 2 to 5. Pending founder decision, review by 2026-11-29 | #504 (`bb0a7212`) | Runs 2 to 5 | `docs/readiness/E2E_STAGING_TRIAGE_CLOSEOUT_2026_11_15.md` |
| Sign out ends only the current device's session (`scope=local`) | 2026-11-15 | Founder decision ("No" to ending every device), executed by Claude Code | E2E-STAGING-TRIAGE | Supabase's default global logout signed users out everywhere | Code and unit test ready; not yet deployed. Pending, review by 2026-12-02 | #541 (`faf224df`) | `serverSession.test.ts` regression test fails on the old call, passes now; standard suite 2315/2315 | `docs/readiness/E2E_STAGING_TRIAGE_CLOSEOUT_2026_11_15.md` |
| The knowledge-hub e2e test uploads its own document instead of needing a documents seed | 2026-11-15 | Founder decision ("Upload its own"), executed by Claude Code | E2E-STAGING-TRIAGE | No seed file creates documents | Passing on staging: run kh2, 2 of 2 (2026-11-18). Pending in the full suite, review by 2026-12-02 | #541 (`faf224df`, `6710bdcb`) | Staging runs kh1 (1 passed, 1 failed: 5 s load wait) and kh2 (2 passed) | `docs/readiness/E2E_STAGING_TRIAGE_CLOSEOUT_2026_11_15.md` |
| Document text extraction loads the PDF library only for PDFs, and the route bundles its canvas module and PDF.js worker | 2026-11-19 | Claude Code, from the staging log investigation; founder approved the staging deploy and the merge | DOC-EXTRACT | Staging Vercel logs: `/api/documents/extract` returned 500 on every upload; nothing was indexed | Working on staging: run13, 3 of 3 knowledge-hub tests including a real PDF. Production deployed; upload check pending, review by 2026-12-03 | #543 (`443e18d1`) | Unit regression test fails on the old code and passes now; staging runs 10 to 13 | `docs/readiness/E2E_STAGING_TRIAGE_CLOSEOUT_2026_11_15.md` |

## Vercel function region (2026-11-15)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Run Vercel functions in `syd1`, next to the production database | 2026-11-15 | Founder approved, executed by Claude Code | VERCEL-REGION | Functions ran in `iad1` while databases are in Tokyo and Sydney; staging API calls took 1 to 3 s each | Working on staging (`bom1::syd1`, medians 25 to 30% faster). Production pending founder spot check, review by 2026-11-29 | #505 (`08eb7f8d`) | Staging probe before and after | `docs/readiness/VERCEL_FUNCTION_REGION_CLOSEOUT_2026_11_15.md` |

## Lead sourcing as agent and MCP (2026-11-17)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Lead sourcing runs as three MCP tools plus a scheduled Lambda crawler that pulls runs over HTTPS with a Bearer secret, not the planned SQS push | 2026-11-17 | Founder-approved plan, executed by Claude Code | LEAD-SOURCING-MCP | Vercel needs no AWS credentials; Chromium and multi-minute crawls don't fit a Vercel function | Merged and deployed to production, inert until the migration runs and the worker deploys. Staging end-to-end pending founder secrets. Review by 2026-12-01 | #524 (`c5d76c75`), #525 (`ed78e12f`) | 2300 of 2300 tests, CI all pass, production routes return 401 without the worker secret | `docs/readiness/LEAD_SOURCING_AGENT_MCP_CLOSEOUT_2026_11_17.md` |
| `approve_sourced_leads` always needs a fresh human approval; standing grants and "Always Allow" never cover it | 2026-11-17 | Claude Code, from the founder's approve-before-import rule | LEAD-SOURCING-MCP | An agent must never be able to import leads on a grant it already holds | In code on production; not yet exercised live. Review by 2026-12-01 | #525 (`ed78e12f`) | MCP route test: pending even with a grant; approvals route test: no grant created | `docs/readiness/LEAD_SOURCING_AGENT_MCP_CLOSEOUT_2026_11_17.md` |

## Outreach business-hours send window (2026-11-17)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Outreach email sends only 09:00 to 18:00 local time: India Monday to Saturday, UAE Monday to Friday. Out-of-window enrollments wait with no log row and no budget used | 2026-11-17 | Founder-approved plan, executed by Claude Code | OUTREACH-SEND-WINDOW | The sender had no time-of-day rule; tick logs show sends at 16:04 UTC (21:34 IST), and the 30 leads queued on 2026-11-17 were due to start at 21:35 IST | Pending merge and deploy. Review by 2026-12-01 (reply rate and the first in-window sends) | #527 (`0ac379aa`) | Unit tests for both countries' hours and weekends, budget not used while waiting | `docs/readiness/OUTREACH_SEND_WINDOW_CLOSEOUT_2026_11_17.md` |

## Lead sourcing first production run (2026-11-18)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| First production run on 30 fresh, founder-approved seeds (brokerages and clinics, India and UAE), verify_cap 0, worker deployed with its schedule off and invoked once by hand, founder picks imports | 2026-11-18 | Founder-approved plan, executed by Claude Code | LEAD-SOURCING-PROD-RUN1 | Staging was proven (#530); the GTM pivot needs real leads in the live CRM | Done: 30 queued, 26 sites reached, 8 candidates, 0 credits; founder imported 7 (skipped 1 mislabelled role inbox); 0 sequence enrolments; schedule DISABLED | #532 (`8f6237f1`), stack `axxess-lead-sourcing-prod`, run `cc7a2676`; fix #533 | `source_leads` output; Lambda invoke 200; approval `49b19763` executed; prod CRM 76 -> 83 | `docs/readiness/LEAD_SOURCING_PROD_RUN1_CLOSEOUT_2026_11_18.md` |

## Lead sourcing staging end-to-end test (2026-11-18)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Prove the lead-sourcing path on staging with 20 known batch 5 companies plus an exclusion canary, verify_cap 0, and a human-approved import of 2 candidates; no production run, no schedule | 2026-11-18 | Founder-approved plan, executed by Claude Code | LEAD-SOURCING-E2E | The worker was deployed (#529) but no run had ever gone through queue, crawl, report and approval | Passed: queued 20, excluded 1; done in 60 s with 0 credits; 20/20 names and emails match batch 5 (same crawler code, so this shows reproduction, not independent accuracy); 2 leads imported after the founder's approval, 0 sequences | Staging `81679518`, run `592aed06`; code from #529 (`dd25d70e`) | MCP `source_leads` / `get_sourcing_run` output; Lambda invoke `{"claimed":true,"status":200}`; staging `/api/crm/leads` = 2, `/api/outreach/sequences` = 0 | `docs/readiness/LEAD_SOURCING_STAGING_E2E_CLOSEOUT_2026_11_18.md` |

## Lead sourcing v2: automatic discovery on schedules, to production (2026-11-19)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Ship scheduled discovery (gpt-oss-20b on Bedrock + AgentCore web search) with auto-import and no enrolment, for all orgs with monthly caps | 2026-11-19 | Founder-approved plan, executed by Claude Code | LEAD-SOURCING-V2 | Founder: "fully automated and on Bedrock... set it on schedule"; Anthropic blocked on the account, so the cheapest oss model per founder | Live in production; staging schedule fired on its own (11:30 UTC, `due:1, started:1`) and auto-imported 1 lead; prod worker tick clean | #535, #536, #538, #539, #540; `main` `afd0c898` | 2373 tests, 24 of 24 PR checks, staging runs `1c8c5775`, `1f823eb2`, `09a9ad4f`, prod tick 12:12 UTC | `LEAD_SOURCING_V2_PRODUCTION_CLOSEOUT_2026_11_19.md` |
| Fix three faults found on staging before production: two false contact names and a crawl crash | 2026-11-19 | Claude Code | LEAD-SOURCING-V2 | Staging imported "Approved Maintenance Works" and "Popular Search" as people; a browser render ended a run with `Runtime.NodeJsExit` | Fixed; each new test fails on the old code; the 09a9ad4f crawl rendered 2 pages without a crash. Names stay rule-based, so more false names are expected and are handled by Remove | `23b3c2b2`, `bfe64637`, `368cb82e` | Unit tests plus the live White & Co page now giving no name | Same |

## Stack E2E on a weekly schedule (2026-11-19)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Run the cross-product staging test (AXXESS, Callismatic, Omnidamus, STILL) from GitHub every Monday 03:30 UTC, with a GitHub issue opened on failure | 2026-11-19 | Founder: "Yes, weekly", "Yes, set it up"; executed by Claude Code | STACK-E2E-WEEKLY | Founder asked whether the harness works at the meta level; the test had only ever run from the founder's laptop and nothing checked the four products together on a schedule | Passed: first GitHub run 44535298156, 5 of 5 scenarios in 7.7 min (lead to task, Omnidamus conversation to task with no real send, duplicate makes one task, spam makes none, malformed event reaches the failure queue) | #548; AWS stack `axxess-stack-e2e-github-role` (OIDC role `axxess-stack-e2e-github`, staging environment only, five staging actions) | `aws cloudformation validate-template`; GitHub run 44535298156 | This row. Open: Callismatic lead labelling can still vary, so a weekly failure may be a model wobble rather than a break. Secrets were set by the founder; the Callismatic staging admin key rotation is founder-reported, not verified here |
| Set org B up by SQL for the two-organization stack test instead of waiting for the operator panel | 2026-11-24 | Founder ran it, proposed by Claude Code | CUSTOMER-FIREABLE-STACK | The panel did not appear on staging and the test needs only the stored settings | Passed on staging: run 45347097022, 7 of 7. Panel cause: Pending, review by 2026-12-08 | #557 | One task in org B, none in org alpha, forged results 409, 404 and 401 | `STACK_TWO_ORG_E2E_CLOSEOUT_2026_11_24.md` |

## RAG gate runs real retrieval (2026-11-24)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Replace the self-passing RAG release gate with one that runs production retrieval on a disposable Supabase stack; no LangChain, LangGraph or MongoDB | 2026-11-24 | Founder intent, executed by Claude Code | RAG-REAL-GATE | The old gate scored observations built from its own fixtures, so its passes were not evidence and later comparisons had no honest baseline | Gate passes on real retrieval and fails on real breakages. Merged 2026-11-25 as `306f2c89`, deployed; signed-in check: Pending, review by 2026-12-08 | #574, measured on `5b1e7dcf` | CI runs 45447751231 (red first), 45451898878 (pass, 9 of 9 breakage runs caught), 45452956838 (pushed break failed) | `RAG_RETRIEVAL_GATE_CLOSEOUT_2026_11_24.md` |
| Enforce the `rag_release_gates` admin rule in `POST /api/rag/evaluation` with the existing `canManageOrganization` helper | 2026-11-25 | Founder-approved plan, executed by Claude Code | RAG-REAL-GATE | The route writes with the service role, so the admin-only RLS policy never applied and any signed-in user could record gate results | Non-admins get 403 and nothing is written. Merge: Pending, review by 2026-12-08 | `5c287e92` (red), `cb266df3` (fix), stacked on #574 | 6 of 15 route tests failed before, 15 of 15 pass after; full suite 2585 of 2585 with `--pool=forks` | `RAG_RETRIEVAL_GATE_CLOSEOUT_2026_11_24.md` |

## Chunk full text, rank fusion and abstention (2026-11-25)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Any-word full text over chunk bodies, coverage-gated rank fusion and two-signal semantic abstention, chosen on golden v1 and reported on held-out v2. Full-text abstention was measured, failed v2, and became a review flag | 2026-11-25 | Founder intent ("Start stacked now"), executed by Claude Code | RAG-RETRIEVAL-QUALITY | Full text served 9 of 108 questions, codes ranked low, nothing abstained | Measured, see closeout. Merge and migration: Pending, review by 2026-12-09 | #575 | RAG gate runs listed in the closeout | `RAG_RETRIEVAL_QUALITY_CLOSEOUT_2026_11_25.md` |
