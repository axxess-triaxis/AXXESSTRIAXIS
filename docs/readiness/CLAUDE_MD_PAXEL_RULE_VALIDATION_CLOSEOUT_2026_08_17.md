# CLAUDE.md Governance Rules -- Paxel Validation Closeout (2026-08-17)

Date: 2026-08-17
Branch: `docs/actionables-matrix-a102-a103-stale-fix`
Governance source: `CLAUDE.md`'s evidence-chain discipline.
Related: `CLAUDE.md` (Mandatory Plan-First Sessions, Decision Ledger, Production Gate Bypass standing
rules), `docs/readiness/PAXEL_REPORT_13_CODEX_BEHAVIORAL_ANALYSIS_2026_08_07.md`,
`docs/readiness/PAXEL_REPORT_14_BEHAVIORAL_ANALYSIS_2026_08_10.md`, `Paxel Report #17`
(`_codex_AXXESSTRIAXIS_875d21`, 46 sessions, generated 2026-08-17, supplied by the founder as a PDF
export -- not yet saved into this repo's own `docs/readiness/` tree as a source artifact; this closeout
quotes it directly from that PDF).

## Purpose

The founder asked, of two specific points raised when Paxel Report #17 was shared in this session, for
a document covering: what changed in `CLAUDE.md`, why, and the result -- closed out formally rather
than left as a passing remark. This is that document, following this program's standing evidence-chain
discipline (external signal -> product decision -> shipped artifact -> verification -> current status).

## Point 1: Mandatory Plan-First Sessions

**External signal.** Paxel Report #13 (2026-08-07), analyzing this program's session history to that
date, found: *"Plan-first usage is too sparse to draw a conclusion from (1 of 27 sessions had a plan
file before shipping, 0 comparison sessions) -- Paxel's suggestion: make it a deliberate experiment for
larger sessions going forward, and record whether planned sessions show cleaner outcomes."*
(`docs/readiness/PAXEL_REPORT_13_CODEX_BEHAVIORAL_ANALYSIS_2026_08_07.md`, lines 93-95.)

**Product decision.** Same day the report was reviewed, the founder's own framing, quoted from the
commit message: *"Every session must start with a plan session automatically built in; no separate
prompt. Make this an umbrella rule for the repo."*

**Shipped artifact.** Commit `97a9d95` (2026-08-08, `docs(governance): every session starts in Plan
Mode by default (harness-enforced)`) added `.claude/settings.json` with `permissions.defaultMode:
"plan"` (project-scoped, committed -- not a per-session preference) and the "Mandatory Plan-First
Sessions" section now in `CLAUDE.md`, which explicitly cites this exact Paxel #13 finding as its
rationale.

**Verification.** Enforcement is structural, not advisory: a session opening in this repo is gated
behind an approved plan before any file edit or command executes, per the harness's own
`permissions.defaultMode` setting -- not dependent on any agent remembering to invoke planning.

**Current status, per Paxel Report #17 (2026-08-17, 10 days and an intervening 19 sessions later).**
Quoted directly: *"90% of build sessions -- 9 of 10 sessions that changed code started from a plan --
a plan file, plan mode, or a plan written a session or two earlier."* Against the 1-of-27 baseline the
rule was written to fix, this is the single cleanest before/after result available in this program's
governance history to date: a rule written in direct response to a named measurement, and a later,
independent measurement of the same behavior showing it changed.

**One caveat, stated plainly rather than smoothed over:** the 1-of-27 and 90%-of-build-sessions figures
are not a strictly like-for-like comparison -- different sample windows (27 sessions vs. this report's
46, of which "build sessions" is presumably a subset), and Paxel's own methodology for what counts as
"started from a plan" is not published in either report. The direction and magnitude of the change are
large enough that this caveat does not undermine the conclusion, but the conclusion is "plan-first
usage increased sharply after the rule was added," not "exactly a 1-of-27-to-90% causal delta."

**Outcome:** Confirmed working as intended. No follow-up action required on this point.

## Point 2: Decision Ledger and Production Gate Bypass

These are tracked together because Paxel Report #17 raised them together (a shared "Decision Patterns"
finding plus a specific named incident), even though `CLAUDE.md` added them as two separate rules on
two different dates.

**External signal (Production Gate Bypass).** Paxel Report #13 (2026-08-07): *"'Production-release
gating needs to stay strict under pressure' -- Paxel's specific example: in a metrics/deploy session,
`node scripts/deploy-vercel.mjs --target=production --skip-checks` was run 'after test attempts had
timed out or failed to produce a visible final passing-test result.' Paxel's suggestion: require a
named passing gate, or explicitly write the risk-acceptance and rollback condition before deploying
with checks skipped."* (Same file, lines 88-92.)

**External signal (Decision Ledger).** Per `CLAUDE.md`'s own existing citation of Paxel Report #14
(2026-08-10): of 98 high-value decisions detected across this repository's session history, only 9 were
recorded with a verified positive outcome (strategic redirects 8/61, technical catches 0/14, product
insights 1/23).

**Product decisions.** Founder's own framing, quoted from each commit message. Gate Bypass: *"Production
gate bypass requires explicit reason + known failed/unavailable gate + accepted risk + rollback
condition + mandatory post-deployment verification. Make this an umbrella applied governance rule for
the repo."* Decision Ledger: formalized as part of the same 2026-08-11 governance pass that produced
`docs(audit): Phase 6 -- test reliability audit, Decision Ledger standing rule, Paxel Report #14
formalization`.

**Shipped artifacts.** Commit `1aaabba` (2026-08-08) added the Production Gate Bypass standing rule
(five required elements, stated *before* the bypass happens). Commit `0409fdc` (2026-08-11) added the
Decision Ledger standing rule (the `Decision: / Why: / What changed: / Architecture boundary: /
Product boundary: / Verification: / Outcome: / Follow-up:` template).

**Verification.** Both rules were applied within this same session, live, not just written and left
untested: PR #253's merge used the full five-part Production Gate Bypass justification (named failing
checks, accepted risk, rollback condition, mandatory post-deployment verification) before merging past
a CI failure later confirmed as environmental, per the founder's own explicit go-ahead.

**Current status, per Paxel Report #17.** Two findings, not one clean result like Point 1:

1. *"The record shows only 4 of 87 tracked decisions with positive outcomes in the available
   window... your next gain comes from closing the loop faster between 'right boundary' and 'verified
   shipped result.'"* This is a different sample window from Paxel #14's 9/98 (87 vs. 98 decisions,
   4 vs. 9 positive outcomes) -- the two figures are **not presented here as a before/after trend**,
   since neither report publishes a comparable methodology or window, and 4/87 is not obviously better
   or worse than 9/98 without knowing whether they overlap. Recorded as the latest measurement, not as
   evidence the Decision Ledger rule has yet closed the gap it was written for.
2. *"Do not bypass verification gates in production deploy flows. One episode explicitly requested
   `node scripts/deploy-vercel.mjs --target=production --skip-checks` after test execution had timed
   out and with a dirty working tree."* This wording matches Paxel #13's original finding almost
   verbatim. Paxel #17 analyzes this program's full session history (2026-07-02 through 2026-08-16),
   not only sessions since the rule was added (2026-08-08) -- so this is **the same original,
   pre-rule incident being re-surfaced in a full-history report, not evidence of a second, post-rule
   recurrence.** No instance of an ungated `--skip-checks` production deploy has been identified in
   this session's own review of work since 2026-08-08.

**Outcome:** Both rules are shipped, both were exercised as designed within this session (the PR #253
merge is a real, positive instance of the Production Gate Bypass rule doing its job -- prevented an
undocumented ad hoc bypass, produced a written five-part justification instead). The Decision Ledger's
own stated goal -- more tracked decisions reaching a verified positive outcome -- does not yet have
supporting before/after evidence; Paxel #17's 4/87 figure is recorded as the current baseline for that
specific rule, not as a result.

**Follow-up.** None required for Production Gate Bypass (already in active, verified use). For the
Decision Ledger: the next Paxel report should be read specifically for whether the 4/87 (or its
successor figure) trends upward across a comparable window -- this closeout does not manufacture that
comparison where the source data does not support it.
