# Repo Governance Summary

This is a short, easy-to-find pointer document. **`CLAUDE.md` (repo root) is the canonical, authoritative
source for every rule below** -- this file exists only because Paxel's recommendation asked for the rules
to be "easier to find," not because they were previously missing. Do not let this file and `CLAUDE.md`
drift apart; if a rule changes, change it in `CLAUDE.md` first and update this summary to match.

## Standing Agent Governance Rules

Every issue must start with one of:
- read-only research, or
- an implementation plan, or
- a scoped sprint prompt

Every implementation must end with:
- tests
- lint
- typecheck
- build, when deploy-facing
- Playwright, when UI, routing, auth, onboarding, or dashboard behavior changes
- a closeout report (`docs/readiness/CLOSEOUT_TEMPLATE.md`)
- a readiness matrix update, when applicable (`docs/readiness/ACTIONABLES_READINESS_MATRIX.md`)

Claude and Codex may not commit or deploy without the required verification gates -- see
`docs/readiness/TEST_GOVERNANCE.md` for exactly which gates apply to which change type, and
`docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md` for the only sanctioned way to proceed when a gate
is failing or unavailable.

## Where each rule actually lives in `CLAUDE.md`

- **Mandatory Plan-First Sessions** -- `CLAUDE.md`, under "Mandatory Plan-First Sessions -- Standing Rule"
- **Decision Ledger** -- `CLAUDE.md`, under "Decision Ledger -- Standing Rule"; running table version at
  `docs/readiness/DECISION_OUTCOME_LEDGER.md`
- **Evidence Chain** (no inflated claims, no invented evidence, cite exact sources) -- `CLAUDE.md`, under
  "The Evidence Chain -- Standing Rule"
- **Verification Discipline** (standard suite, exact pass/fail counts) -- `CLAUDE.md`, under
  "Verification Discipline"
- **Production Gate Bypass** (five required elements before any bypass) -- `CLAUDE.md`, under
  "Production Gate Bypass -- Standing Rule"; fillable template at
  `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md`

## Commit trailer convention (going forward, not retrofitted)

For commits tied to a tracked issue, add trailers to the commit body:

```
Issue: A-79
Plan: docs/readiness/A79_PLAN.md
Tests: Vitest 24/24, Playwright 6/6, lint pass, typecheck pass
Closeout: docs/readiness/A79_CLOSEOUT.md
Status: Live verified
```

Example full commit:

```
feat(lite): isolate workspace boundary

Issue: LITE-BOUNDARY-01
Plan: docs/readiness/AXXESS_LITE_WORKSPACE_BOUNDARY_PLAN.md
Tests: pnpm run lite:ci PASS, pnpm run typecheck PASS
Closeout: docs/readiness/AXXESS_LITE_WORKSPACE_BOUNDARY_CLOSEOUT.md
Status: Closed
```

This is **not applied retroactively** to this repo's existing 891 commits -- rewriting historical commit
messages would rewrite history on a shared, public, protected-`main` repository, which is exactly the
kind of destructive/hard-to-reverse operation this program's own git-safety rules exist to prevent. Apply
it going forward on new commits tied to a real, tracked issue.

## This governance scaffold (2026-08-20)

Added per the founder's direct request, itself based on Paxel's recommendation list: an evidence
join-table system (`docs/readiness/EVIDENCE_INDEX.md`), a controlled status vocabulary
(`docs/readiness/STATUS_TAXONOMY.md`), fixed templates for closeouts, deploy exceptions, and risky
approvals, and traceability tables for bugs, features, sprints, and claims. Full file list and scope
notes are in this session's summary; every new file states plainly where it is seeded with real,
verified data versus where historical backfill was deliberately not attempted (to avoid inventing
evidence for untracked past work, which the Evidence Chain rule itself prohibits).
