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
| Adopt the Paxel 9.5 Practice Standards as a standing rule in `CLAUDE.md` and mirror them in the closeout template, PR template, test governance, governance summary and contributing guide | 2026-11-01 | Founder request, executed by Claude Code | PAXEL-9-5 | Paxel Report #28 (`results/z3w3ytji`) found outcomes tracked for only 8 of 19 option choices and 1 of 21 product insights, 0.59 unresolved errors per planned session, a deploy record closed at "ready" without a live check, and 21 bare "Try again" prompts; Claude Code's axis estimate (not YC's) averaged 7.2 | Adopted; Pending, review by 2026-11-15 (are the rules being followed); effect on the score checked at the next monthly Paxel rerun | This branch (`docs/paxel-9-5-practice-standards`) | Docs-only path check over the changed files | `docs/readiness/PAXEL_REPORT_28_BEHAVIORAL_ANALYSIS_2026_11_01.md` |

From 2026-11-01, under rule 6 of that standard, a new row's Outcome is either the observed result or
`Pending, review by <date>` at most 14 days out, and a weekly pass closes or re-dates Pending rows.
Existing rows are not rewritten.

## Stack E2E on staging (2026-11-04)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Every Callismatic lead becomes an AXXESS task, whatever needs_decision says | 2026-11-04 | Founder decision, executed by Claude Code | #452 | A clear buyer was marked as not needing a person in 20 of 23 tries, with no error | Working on staging. Pending on production, review by 2026-11-18 | STILL#7, STILL#8 (`f4e6dfe`) | 70 STILL tests, AWS pattern test, 3 clean runs, one deliberate failure | `docs/readiness/STACK_E2E_STAGING_CLOSEOUT_2026_11_04.md` |

## Investor and landing parity (2026-11-05)

| Decision | Date | Session/tool | Issue ID | Why | Outcome | Commit/PR | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| Investor stays in forced demo mode; par means the same code and features, with demo data | 2026-11-05 | Founder decision, executed by Claude Code | INVESTOR-LANDING-PAR | Production data on a public, no-login site would be a major security and product change | Pending, review by 2026-11-19 | #453 (`4a7b087`), not merged | See closeout | `docs/readiness/INVESTOR_LANDING_PAR_CLOSEOUT_2026_11_05.md` |
| Remove the dead `/admin/backups` link rather than build a page | 2026-11-05 | Claude Code, reported to founder | INVESTOR-LANDING-PAR | The wiring roadmap records no backup table, service or route, so a page would advertise an unbuilt feature | Pending, review by 2026-11-19 | #453 (`4a7b087`), not merged | See closeout | `docs/readiness/INVESTOR_LANDING_PAR_CLOSEOUT_2026_11_05.md` |
