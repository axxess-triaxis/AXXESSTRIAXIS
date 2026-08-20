# Status Taxonomy

Governed by: `CLAUDE.md` (The Evidence Chain -- Standing Rule). Created 2026-08-20 per Paxel's
recommendation that this program's reporting was flattening "planned," "code complete," "deployed," and
"live" into one vague "done." Every status field in `docs/readiness/EVIDENCE_INDEX.md`,
`docs/readiness/DECISION_OUTCOME_LEDGER.md`, and closeout documents should use exactly one of these
states -- not a paraphrase of one.

| Status | Meaning |
|---|---|
| Planned | A plan exists (plan-mode output, a `docs/readiness/*_PLAN.md` file, or a scoped sprint prompt). No code shipped. |
| Researched | A source/code audit exists (read-only investigation, root-cause analysis). No code shipped. |
| Implemented locally | Code exists and has been run/tested on a local machine, but not yet committed or only committed to a local/unpushed branch. |
| Code complete | The feature or fix is implemented and committed to a pushed branch or open PR. |
| CI verified | The PR's required CI checks passed (or failures were individually confirmed non-blocking per `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md` and documented as such). |
| Deployed | The change has been merged and a deployment completed (confirmed via `vercel inspect`, GitHub Actions run conclusion, or equivalent -- not assumed from a merge alone). |
| Live verified | A live URL, API call, or manual walkthrough after deployment returned the expected result, with the exact check recorded. |
| Closed | Acceptance criteria were met and a closeout artifact was filed (or, for small items, the closeout fields were completed inline in the tracking row). |
| Deferred | Work is intentionally not proceeding right now, with a stated reason (see `project_a82_azure_deferral.md`-style memory entries for the pattern). Not the same as abandoned or forgotten. |
| Contradicted | A prior closure claim (in this repo or in memory) was later disproven by new evidence. The contradicting evidence must be cited, and the original row/claim corrected in place -- not silently deleted. |

## Rules for using this taxonomy

1. **One status per row, always from this table.** No "mostly done," "should be working," or "basically
   live."
2. **A status can only advance on evidence**, not intent. "Deployed" requires a confirmed deployment ID
   or run conclusion; "Live verified" requires an actual request/response or walkthrough, not "the
   deploy succeeded so it should be live."
3. **Downgrade honestly.** If a later check contradicts an earlier "Closed" or "Live verified" status,
   change the status to `Contradicted`, cite what changed, and do not simply re-close it without
   re-verification.
4. **`Founder-stated, source artifact needed`** (per `CLAUDE.md`'s existing Evidence Chain rule) is not
   a status in this table -- it is a qualifier on the *claim*, not the work item. A founder-reported
   pilot conversation can sit at `Researched` status with that qualifier attached to the specific
   traction claim inside it.
