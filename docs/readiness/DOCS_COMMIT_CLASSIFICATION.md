# Docs Commit Classification

Governed by: `docs/DOCS_ARE_CONTROL_PLANE.md`. Created 2026-08-20. This repo has **368** commits
matching a `docs` conventional-commit prefix (verified via
`git log origin/main --oneline --grep="^docs" -E | wc -l`, 2026-08-20). This table classifies the
*pattern*, not every individual commit -- retroactively classifying all 368 by hand was judged not worth
the effort versus applying the classification going forward via commit message prefix discipline.

| Docs commit pattern | Type | Why it matters |
|---|---|---|
| `docs(readiness): ...` closeout-shaped (references a `*_CLOSEOUT_*.md` or completed matrix row) | closeout | Records a verified closure -- the evidence chain's terminal artifact for a piece of work |
| `docs(research): ...` or a commit adding a `*_RESEARCH.md`/investigation doc | research | Establishes the basis for an implementation plan; read-only audit before code changes |
| `docs(governance): ...` (e.g. this pass, or the Plan-First/Decision-Ledger commits) | policy | Constrains future agent behavior in this repo; highest-leverage docs category since it changes how every subsequent session operates |
| `docs(audit): ...` or a commit adding/updating a `*_LEDGER*`, `*_MATRIX*`, or `*_INDEX*` file | evidence | Supports a founder-facing or reporting claim with a checkable trail |
| `docs: ...` with no scope, or a scope not matching the above (e.g. `docs(mixpanel)`, `docs(pitch)`) | narrative/reference | Records external signal or context (pitch logs, traction logs) -- still evidence-bearing per `CLAUDE.md`'s Evidence Chain rule, just not a policy or closeout artifact |

## Going forward

Use a `docs(<category>): ...` conventional-commit scope matching one of `readiness` (closeout/evidence),
`research`, `governance` (policy), or `audit`, so a future `git log --grep` pass can reconstruct this
classification mechanically instead of by re-reading every commit body.
