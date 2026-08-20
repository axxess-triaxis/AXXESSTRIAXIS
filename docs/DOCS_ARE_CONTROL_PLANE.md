# Docs Are the Control Plane

Created 2026-08-17, per Paxel's finding that docs-heavy work in this repository risks being misread as
low-signal. It is not.

In this repository, documentation is not passive record-keeping written after the fact. It defines:

- product boundaries
- sprint scope
- acceptance criteria
- readiness status
- closeout evidence
- founder-facing claim discipline
- deployment policy
- issue closure state

A docs-only commit that updates `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` from `Blocked` to `Yes`
is not paperwork trailing a code change -- in many cases it *is* the governing artifact that determines
whether a feature is allowed to be described as done anywhere else in this program's reporting. The same
is true in the other direction: a docs commit that marks something `Blocked` with a named owner and
evidence gap is doing real governance work, not filling space.

## Core files this applies to

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- status vocabulary with owner/evidence/next-action
  for every blocked item
- `docs/readiness/FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` -- per-fix closure record
- `docs/readiness/STALE_ACTIONABLES_MATRIX_CLOSURE_2026_08_07.md` -- stale-item closure audit
- `docs/readiness/EVIDENCE_INDEX.md` -- the issue-lifecycle join table (this pass, 2026-08-17)
- `docs/readiness/DECISION_OUTCOME_LEDGER.md` -- the decision/scope-call join table (this pass)
- `docs/readiness/STATUS_TAXONOMY.md` -- the controlled status vocabulary all of the above must use
  (this pass)
- `CLAUDE.md` itself -- the standing rules every session in this repo operates under

## What this means in practice

- A docs commit changing status language is not "just docs" for changelog purposes -- it can gate what
  claims are allowed to appear in investor-facing or founder-facing summaries.
- Docs commits should be classified by type (`docs/readiness/DOCS_COMMIT_CLASSIFICATION.md`) rather than
  lumped together, because "closeout," "research," "policy," and "evidence" commits carry different
  governance weight.
- When reviewing this program's activity (by Paxel or any other external analysis), a high docs-commit
  count is not evidence of low execution -- it may be evidence that the evidence-chain discipline is
  actually being followed, which is itself the behavior the governance rules exist to produce.
