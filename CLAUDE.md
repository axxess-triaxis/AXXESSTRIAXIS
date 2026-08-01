# CLAUDE.md

Project: AXXESS TRIaxis (AXXESSTRIAXIS), by Triaxis Ventures Private Limited.

This file is read automatically at the start of any Claude Code session in this repository. It formalizes, as a standing rule (not a one-time instruction), the evidence discipline this program has followed informally across its sprint history -- so it survives across sessions, machines, and whichever agent picks up the work next, rather than depending on any one conversation remembering it.

## Operating Model

- **Codex** is product manager and prompt designer.
- **Claude Code** (you) is engineer, tester, and sprint executor.
- **Sudipta Koushik Sarmah**, Founder and Managing Director, is the HITL (human-in-the-loop) authority.
- Work happens inside this canonical repository only. Do not create a second app, a duplicate project structure, or a parallel repo to satisfy a request -- extend what exists here.

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
