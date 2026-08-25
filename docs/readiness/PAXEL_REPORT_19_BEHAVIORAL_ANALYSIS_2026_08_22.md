# Paxel Report #19 — Behavioral Analysis (2026-08-22)

Source: Paxel (Y Combinator coding-behavior analysis tool), report generated 2026-08-22, covering
49 sessions ("TRIAXIS — 49 sessions"; one KPI card within the same report separately states "100
hours across 48 sessions" — the report does not reconcile this 49-vs-48 discrepancy itself, noted
here rather than silently repeated as one number). Unlike Report #13 (Codex-only) and Report #14,
this report appears to cover Claude Code and Codex CLI sessions together — its own narrative states
"you move a lot of work through Claude Code and Codex CLI."

Governance: per `CLAUDE.md`'s evidence-chain discipline, this document records the report's own
content plus this session's independent verification of the claims that are checkable from repo
state (git log, GitHub API). Claims that cannot be checked from repo state alone are marked
unverified rather than repeated as fact.

## What was independently verified this session

| Report claim | Verified value | Result |
|---|---|---|
| "185,170 lines... across 918 commits" | `git log --oneline \| wc -l` = **918** | **Exact match** on commit count. Line count not independently re-derived (would require a full historical diff aggregation) — plausible, not separately confirmed. |
| "200 PRs worked" | GitHub GraphQL: `pullRequests.totalCount` = **261** total, **240** merged | **Does not match either total or merged count.** Not necessarily wrong — Paxel may be counting PRs within its own session-analysis window rather than all-time repo history — but the report doesn't state that scope, so the number can't be reconciled against repo state as given. |
| "131 fixes and 154 features in your commits" | Naive `git log` prefix count: **118** commits starting `fix`, **105** starting `feat` | Different from the naive count, but not a contradiction — Paxel likely classifies by diff/message content rather than strict Conventional Commits prefix matching, which would legitimately produce a different number. |
| Sprint 15 approval-hygiene claim ("96 staged files... mixed Sprint 15 frontend work with an earlier Sprint 14 baseline") | Searched `docs/readiness/` for a Sprint 15 closeout doc | **No matching document found.** Cannot independently confirm the 96-file figure or the sprint-boundary-crossing claim from repo docs; this appears to rely on transcript/session data Paxel had access to that isn't reproduced in this repo's own documentation trail. |
| Privacy-policy-deployment growth-area claim ("approved `node scripts/deploy-vercel.mjs --target=production --skip-checks` without visible content/diff review... hit Vercel Not authorized confusion") | Located the actual commit: `e7a158e feat(site): add privacy policy page` — 2 files changed, +157/-0 lines, a small self-contained change | **Cannot verify or refute the skip-checks/no-diff-review claim from git alone** — deploy command invocations and their approval context aren't captured in commit history. The commit itself is small and clean; whether the *deployment* step around it lacked review is a session-transcript-level claim outside what git shows. |

## Report content (as generated)

**Builder type:** "The Architect" (46% of sessions include architecture discussions) / "Product
Thinker" (63% of sessions reference product decisions)

**Headline stats (as reported, not independently re-derived unless noted above):**
- 185,170 lines shipped across 918 commits (commit count independently confirmed) and 200 PRs (not reconciled — see table)
- Plans first in 90% of build sessions (9 of 10 sessions that changed code started from a plan)
- Runs up to 4 agent sessions concurrently
- Longest single session: 16h 0m
- Thanked the agent in 83 messages
- Most productive around 9 PM
- Most frequent prompt: "Resume" (193 times across 7 sessions)
- Redirects the agent mid-task in 6% of sessions
- Biggest single day: a Monday, 38 commits
- Average prompt length: 696 words
- 40 "deep sessions" averaging 208 minutes of uninterrupted focus
- 100 hours across 48 sessions (see the 48-vs-49 discrepancy noted above)
- Most cryptic prompt on record: "Can I tenant on it now?"
- 182 prompts per session on average
- 131 fixes / 154 features by commit (see table — differs from naive prefix count)
- Longest consecutive shipping streak: 7 days

**Decision patterns:** Director-like — sets boundaries, requires evidence, then approves or blocks
agent execution. Architecture was the most common decision domain (58 of 87 tracked decisions),
followed by debugging (17 of 87). Recurring patterns: "Scope the Version Boundary" (13 occurrences),
"Codify the Lesson" (10, via migration docs/QA artifacts/evidence ledgers/readiness matrices/founder-
claims caveats/sprint roadmaps/deployment-evidence docs), "Enforce Safety Rails" (9, especially in
scheduled Vercel retry tasks requiring `gh run` inspection, concurrency checks, exact retryable-error
strings, one rerun per cycle, live HTTP verification, and task deletion only after success).

Outcome tracking: 4 of 87 tracked decisions led to positive *recorded* outcomes, clustered around
strategic redirects for validation, deployment, and live-readiness evidence. The report explicitly
notes this does not mean the other 83 were bad decisions — many were unresolved or negative within
the observed window, which it calls common in long-running infrastructure/product hardening work.
Its coaching point: close the loop faster on whether a decision worked.

**Strengths (as reported):**
- Keeps AI agents inside product/architecture boundaries — cites recurring constraints: "no new
  app/repo," "preserve existing UI/functionality," "no force pushes," "do not weaken tenant
  isolation/RLS," "exclude Lite from MCP3 admin," "do not propose raw DB access."
- Uses evidence as a release control, not just after-the-fact reporting — typecheck/lint/test/build
  gates, Supabase verification, PR checks, live HTTP 200 checks, deployment-evidence docs, scoped
  commits, production proof before claiming readiness.
- Thinks in product surfaces, not just features — separating X0 enterprise, investor demo, public
  website, mobile, and Lite kept architecture aligned with the business/security model.

**Growth areas (as reported):**
1. Approval-only sessions (deploys, doc merges) don't always get the same rigor as planning-heavy
   sessions — names the privacy-policy and public-site deploy work specifically (see verification
   table above — the underlying commit is small/clean; the deploy-approval-rigor claim itself is
   outside what git shows). Suggested fix: for any production deploy with skipped checks, require a
   three-part note before approval — exact diff, skipped-check rationale, preview/live verification
   plan.
2. Sometimes accepts large staged sets once the agent frames them as ready — names a 96-file Sprint
   15 commit mixing Sprint 15 frontend work with an earlier Sprint 14 baseline (not independently
   locatable in this repo's own docs — see table). Suggested fix: split cross-sprint commits or
   require a written rollback plan before approval.
3. Low-signal documentation-approval sessions left small operational warnings unresolved — LF/CRLF
   warnings, git-ignore permission warnings, untracked local helper files recurring without visible
   follow-up.

**How the founder uses AI:** "Dances with Robots" (21 evidence points — riffs with the AI like a jam
session, ideas bounce back and forth); "Cognitive Breadth" (6 evidence points — thinks across
product, code, scope, and process in a single session).

## What this closeout is not claiming

- The 185,170 line count and the 154/131 feature/fix split are Paxel's own classification output,
  not independently re-derived by this session — recorded as reported, not verified.
- The PR-count and Sprint-15-file-count discrepancies above are flagged as *unreconciled*, not as
  proof the report is wrong — Paxel may be scoping to a session-analysis window this document has no
  visibility into.
- The deploy-approval-rigor and staged-set-review growth areas describe founder *process* during
  past sessions; this document can't confirm or refute them from git state and doesn't attempt to.

## Source

`Paxel Report 19.pdf` (founder-provided, text extracted via `pdftotext`), generated by Paxel
(paxel.ycombinator.com) 2026-08-22.
