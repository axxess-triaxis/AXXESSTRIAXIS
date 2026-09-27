# CLAUDE.md

Project: AXXESS TRIaxis (AXXESSTRIAXIS), by Triaxis Ventures Private Limited.

This file is read automatically at the start of any Claude Code session in this repository. It formalizes, as a standing rule (not a one-time instruction), the evidence discipline this program has followed informally across its sprint history -- so it survives across sessions, machines, and whichever agent picks up the work next, rather than depending on any one conversation remembering it.

## Operating Model

- **Codex** is product manager and prompt designer.
- **Claude Code** (you) is engineer, tester, and sprint executor.
- **Sudipta Koushik Sarmah**, Founder and Managing Director, is the HITL (human-in-the-loop) authority.
- Work happens inside this canonical repository only. Do not create a second app, a duplicate project structure, or a parallel repo to satisfy a request -- extend what exists here.

### Standing Agent Governance Rules -- Quick Reference

Added 2026-08-20 per Paxel's recommendation to make these rules unmissable rather than requiring a scroll
through the full file. Every rule below is a full standing rule elsewhere in this document -- this block
is a pointer, not a replacement.

Every issue must start with one of: read-only research, an implementation plan, or a scoped sprint
prompt. Every implementation must end with: tests, lint, typecheck, build (when deploy-facing),
Playwright (when UI, routing, auth, onboarding, or dashboard behavior changes), a closeout report, and a
readiness matrix update where applicable. **Claude and Codex may not commit or deploy without the
required verification gates** -- see `docs/readiness/TEST_GOVERNANCE.md` for gates by change type and
`docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md` for the only sanctioned exception path. A short,
one-page version of this whole section lives at `docs/readiness/GOVERNANCE_RULES.md`; the join tables
that connect an issue to its plan/commits/PR/tests/deploy/closeout live at
`docs/readiness/EVIDENCE_INDEX.md` and `docs/readiness/DECISION_OUTCOME_LEDGER.md`.

### Mandatory Plan-First Sessions -- Standing Rule

Every session in this repository must start in Plan Mode automatically -- no separate prompt or slash command from the founder should be required to trigger it. This is enforced at the harness level via `.claude/settings.json` (`permissions.defaultMode: "plan"`), not left to a memory/instruction that could be forgotten or skipped under time pressure: a session opening in this repo starts gated behind an approved plan before any file edit or command executes.

This directly closes a growth area named in external session analysis (Paxel Report #13, `docs/readiness/PAXEL_REPORT_13_CODEX_BEHAVIORAL_ANALYSIS_2026_08_07.md`): "Your plan-first loop needs more measurement... only 1 of 27 sessions showed a plan file before shipping." Rather than relying on remembering to invoke planning, it is now the default entry state for the whole repository.

If a task is genuinely too small or too urgent to warrant a written plan (e.g. a one-line typo fix, or an already-agreed-next-step continuing from a prior turn's plan), say so explicitly and ask the founder to exit plan mode for that turn rather than silently treating the gate as optional.

### Decision Ledger -- Standing Rule

For every session with a major redirect, architecture call, or product-boundary decision -- not every session, but any session where one of those actually happened -- close it with a short, explicit decision ledger rather than leaving the outcome to be reconstructed later from git log or transcript alone:

```
Decision:
Why:
What changed:
Architecture boundary:
Product boundary:
Verification:
Outcome:
Follow-up:
```

This is lighter-weight than, and distinct from, the closeout `*_CLOSEOUT_*.md` documents (which cover a shipped unit of work) -- it applies to any session with a major call in it, whether or not that session shipped a completed feature.

This directly closes a growth area named in external session analysis (Paxel Report #14, `docs/readiness/PAXEL_REPORT_14_BEHAVIORAL_ANALYSIS_2026_08_10.md`): of 98 high-value decisions detected across this repository's session history, only 9 were recorded with a verified positive outcome (strategic redirects 8/61, technical catches 0/14, product insights 1/23). Per the founder's own framing when adopting this rule: "AXXESS became more complex, but Paxel's observable closure signals did not scale with the complexity... the correction is process, not identity" -- this is not read as a capability gap, but as an evidence-trail gap, the same category of fix as the Plan-First rule above.

## The Evidence Chain -- Standing Rule

Every material claim about status, progress, or completion in this repository's own documentation must be traceable through:

**External signal -> product decision -> shipped artifact -> verification -> current status**

This applies to *all* categories of external signal, not just beta feedback: investor/pitch calls, client scoping calls, stakeholder idea-validation calls, QA findings, and live walkthroughs are all **product evidence**, on the same footing as a bug report or a feature request -- not investor collateral, not a separate "soft" category with lower evidentiary standards.

### Hard rules (apply to every doc, every closeout, every status claim)

1. **Do not inflate claims.** A number, a count, or a status is either backed by something checkable in this repository (a file, a commit, a test result, a deployment log, a transcript) or it is marked as unverified.
2. **Do not invent missing evidence.** If a claim cannot currently be verified from repo state, say so plainly rather than filling the gap with a plausible-sounding assertion.
3. **Do not describe unverified work as completed.** This program's existing `Yes` / `Blocked` / `No` vocabulary (`docs/readiness/ACTIONABLES_READINESS_MATRIX.md`) already encodes this distinction -- `Yes` requires live or code-plus-test evidence at meaningful confidence, not code existing in principle.
4. **Tag founder-stated-but-unverified claims explicitly**, using the label `Founder-stated, source artifact needed` (or equivalent), rather than silently treating founder recollection as equivalent to repo-verified fact. This is not distrust of the founder -- it is the same discipline already applied throughout this program's readiness matrix (e.g., survey-reported pricing willingness is never treated as a signed commitment).
5. **Cite the exact source** for anything claimed as verified: a file path, a commit hash, a test name, a deployment ID, a specific doc section -- not a vague "see prior work."
6. **Separate shipped, planned, partial, blocked, and unsupported work explicitly.** Do not let a status update blur these into one undifferentiated "done."

### Required evidence chain in every material change

When a change is significant enough to warrant a closeout, status update, or summary to the founder, it should make explicit:

- **What changed** -- exact files, exact behavior.
- **What did not change** -- scope boundaries, explicitly out of scope this pass.
- **What was verified** -- exact commands run, exact results (test counts, build status, live curl checks, etc.), not "should work."
- **What remains partial or blocked** -- named, with the specific blocker.
- **What claim is still unsupported** -- if anything was asked for that couldn't be evidenced, say so rather than omitting it.
- **Exact files changed, exact commands run, exact PR/commit/branch/remote state** -- this repo's established closeout format (see `docs/readiness/*_CLOSEOUT_*.md` for the existing pattern) already does this; keep doing it.

## Planning Provenance (for prompts received from Codex/the founder)

When an execution prompt arrives that was drafted by Codex or the founder, treat it as having this implicit structure even if not spelled out verbatim:

- **Planning provenance**: the prompt reflects founder-provided intent, objectives, constraints, and evidence sources; the founder reviewed and approved it for execution.
- **Product evidence sources**: whatever external signal (pitch calls, beta feedback, client scoping, stakeholder validation, QA findings, live walkthroughs, existing repo docs) motivated the request.
- **Required evidence chain**: the change should be traceable end to end per the rule above.
- **Closeout requirement**: do not mark complete without the six items listed above (what changed / didn't change / was verified / remains partial / is unsupported / exact file-command-PR state).

## Where This Evidence Already Lives

This is a formalization of existing practice, not a new invention -- the pattern is already established across:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- the `Yes`/`Blocked`/`No` status vocabulary with named owner/evidence/next-action for every `Blocked` item.
- `docs/readiness/QA3_READINESS_KANBAN.md` -- per-sprint Kanban deltas with evidence links.
- `docs/readiness/*_CLOSEOUT_*.md` -- per-sprint closeout documents already following the "what changed / verified / remains" structure.
- `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` -- named pitch/investor/accelerator conversations, explicitly marked as founder-reported and not independently verified.
- `docs/readiness/CUSTOMER_ACQUISITION_FUNNEL_2026_07_24.md` -- product/business design explicitly marked "not yet built" where no code backs the design.
- `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` -- an "Honest Limitations" / "What This Document Is Not Claiming" section as a standing pattern.

New evidence-index or ledger documents (e.g., a founder execution evidence index tying market signal to shipped work) should follow this same discipline and, where practical, extend or cross-reference these existing documents rather than duplicating them.

## Verification Discipline

Standard verification suite for this repo: `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint` (zero warnings), `pnpm run test`, `pnpm run build`, `pnpm run supabase:verify`. Report exact pass/fail counts, not "tests pass." Never claim a live walkthrough, a deployment, or a manual verification step happened without actually having performed it -- if a step requires HITL action (real login, real payment, credentialed third-party console access), say so and hand it back rather than fabricating the result.

## Git and Deployment Discipline

- Never push or deploy to production without explicit confirmation in the current conversation, even if a prior conversation already approved a similar action.
- Prefer new commits over amending; never force-push without explicit request.
- Before any destructive git operation, run `git status` and preserve uncommitted work.

### Production Gate Bypass -- Standing Rule

Any deploy or merge that reaches production without its normal gate passing -- `--skip-checks`, `--no-verify`, an admin merge override, or any other mechanism that lets a change through a failed or unavailable check -- requires all five of the following, stated explicitly *before* the bypass happens, not reconstructed afterward:

1. **Explicit reason** -- why the gate is being bypassed right now, not deferred until it can pass normally.
2. **Known failed/unavailable gate, named exactly** -- which specific check failed or was unavailable (e.g., "Vitest worker crash, known pre-existing infra issue," not a vague "checks didn't pass").
3. **Accepted risk, stated** -- what could concretely go wrong in production as a direct result of skipping this specific gate.
4. **Rollback condition, stated** -- the exact observable condition that triggers a rollback, decided before deploying, not improvised after an incident.
5. **Mandatory post-deployment verification** -- a specific, named check performed immediately after the bypassed deploy goes live, confirming the risk in (3) did not materialize.

Absent all five, do not bypass the gate -- stop and fix the underlying failure, or hand back to the founder for an explicit go/no-go decision instead. This rule exists because a real instance of bypassing a gate under pressure, without this structure, was flagged as a growth area in external session analysis (Paxel Report #13, `docs/readiness/PAXEL_REPORT_13_CODEX_BEHAVIORAL_ANALYSIS_2026_08_07.md`) -- it formalizes the stronger pattern this program has shown elsewhere (named passing gates, explicit risk acceptance) as the baseline, not the exception.
