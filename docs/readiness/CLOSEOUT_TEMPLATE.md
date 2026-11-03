# Per-Issue Closeout Template

Governed by: `CLAUDE.md` (Required evidence chain in every material change). Created 2026-08-20. Every
closeout document (`docs/readiness/*_CLOSEOUT_*.md`) should include this block, filled in completely --
not paraphrased, not summarized as "tests pass."

## The block

```markdown
## Closeout Evidence

Issue ID:
Title:
Origin plan:
Research artifact:
Implementation commit(s):
PR:
Branch:
Files changed:

Verification commands:
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm test <specific file(s)>`
- `pnpm exec playwright test <specific spec>` (if applicable)
- `pnpm run build` (if deploy-facing)

Verification result (raw, not paraphrased):
- Vitest: PASS/FAIL, N/N tests, exact command
- Playwright: PASS/FAIL, N/N tests, exact command (if applicable)
- Lint: PASS/FAIL
- Typecheck: PASS/FAIL
- Build: PASS/FAIL (if applicable)

Deploy evidence (if applicable):
- Workflow:
- Run ID:
- Vercel deployment URL/ID:
- Live endpoint checks:
  - URL:
  - Status:
  - Timestamp:

Acceptance criteria (as stated before the work began):
Regression test (bug fixes: the test that failed before the fix, or why none is possible):

Errors hit this session (each fixed and re-run, or recorded with an ID and owner):
- Error:
  Resolution: fixed (re-run result) / recorded as <ID>, owner <name>

Decision outcomes (each decision or product insight from this work):
- Decision:
  Outcome: <observed result> / Pending, review by <date, at most 14 days out>

Final status: (use exactly one value from docs/readiness/STATUS_TAXONOMY.md)
Remaining risk:
Follow-up issue IDs:
Supersedes:
Superseded by:
Reopened by:
```

The acceptance-criteria, regression-test, errors and decision-outcome fields were added 2026-11-01 under
`CLAUDE.md`'s "Paxel 9.5 Practice Standards -- Standing Rule". A deploy closeout is not complete with the
"Live endpoint checks" field empty: a green workflow or a Vercel "ready" does not fill it.

## Optional machine-readable header

For closeouts and plans where a future session or automated report should be able to parse the file
without re-reading prose, prepend YAML frontmatter:

```yaml
---
issue_id: A-79
artifact_type: closeout
origin_plan: docs/readiness/A79_PLAN.md
research: docs/readiness/A79_RESEARCH.md
commits:
  - abc123
prs:
  - 221
tests:
  vitest: "24/24 passed"
  playwright: "6/6 passed"
  lint: "passed"
  typecheck: "passed"
deploy:
  workflow_run: "31326607394"
  live_urls:
    - url: "https://landing.triaxisventures.com/auth"
      status: 200
status: closed
remaining_risk: "none"
---
```

This is optional -- existing closeout docs in `docs/readiness/` are not being retroactively rewritten to
add it (that would be busywork with no evidentiary gain on already-shipped, already-verified work). Use
it going forward on new closeouts where the extra structure is worth the overhead, particularly ones
likely to be referenced by `docs/readiness/EVIDENCE_INDEX.md` rows.

## Why raw command output matters

"Tests pass" is a claim. `pnpm test src/services/rag/documentTextExtraction.test.ts` followed by the
actual `PASS 7/7 tests` line is evidence. Paste the real output (or the exact summary line vitest/gh
prints), not a restatement of it. This applies equally to live checks:

```
Invoke-WebRequest https://landing.triaxisventures.com/auth
StatusCode: 200
```

and to CI:

```
gh run view 31326607394 --repo axxess-triaxis/AXXESSTRIAXIS
Conclusion: failure
Failed step: pnpm install --frozen-lockfile
Failure string: ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
Action: no rerun, unrelated failure
```

This removes the ambiguity between "the agent believes it passed" and "here is the exact output that
proves it passed."
