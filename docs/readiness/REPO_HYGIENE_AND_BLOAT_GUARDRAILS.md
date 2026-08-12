# Repo Hygiene and Bloat Guardrails

Standing governance document. Established by Codebase De-Bloat Sprint 1 (2026-08-11) -- prior to
this, neither `README.md` nor `CLAUDE.md` had any documented repo-hygiene or deletion policy
(confirmed by direct search). This document is the ongoing reference; update it in place as future
de-bloat sprints refine the rules, rather than creating a new dated doc each time.

## Why this exists

`docs/readiness/CODEBASE_DEBLOAT_AUDIT_AND_DELETION_PLAN_2026_08_11.md` found that this repo's
headline "bloat" signal (a reported 350k+ tracked LOC) was 51.7% a measurement artifact -- binary
files (PNG/PDF/ZIP) being naively line-counted. The real text LOC (~162k) already matched the
founder's own estimate of what "core" should be. The lesson: **measure correctly before concluding
there's a bloat problem, and once you have real tooling, keep using it** -- not a one-time audit, a
standing discipline.

## The "Safe to Delete" test

A file or code section is safe to delete only if **all** of the following are true:

1. It is not imported or referenced by production code, test code, scripts, docs, deployment
   config, CI, Vercel, Supabase, Capacitor, or package scripts.
2. It is not part of migration history, readiness evidence, legal/compliance memory, or founder
   decision history.
3. It is not needed by X0, Demo, Lite, or mobile.
4. It is not a placeholder intentionally kept as an honest pending-state scaffold.
5. It is not referenced by any roadmap, actionables matrix, closeout, or sprint prompt as future
   planned work.
6. It can be restored cleanly from Git if needed.
7. Deletion does not reduce test coverage for live behavior.
8. Full or targeted verification passes after deletion.

**Confidence levels**: 95-100% -> safe to delete now. 80-94% -> strong candidate, document and wait
for approval. 60-79% -> needs deeper audit. Below 60% -> do not touch. **Only delete at 95%+.**

## Classification vocabulary

Use these buckets when auditing a file or module, matching Sprint 1's own classification table:

| Bucket | Meaning | Default action |
|---|---|---|
| `SAFE_DELETE` | Proven dead/obsolete/unreferenced; no product/evidence value | Delete |
| `LIKELY_DELETE_AFTER_REVIEW` | Probably dead, needs founder/HITL confirmation | Document only |
| `KEEP_CORE` | Product-critical or shared core | Keep |
| `KEEP_EVIDENCE` | Historical/readiness/fundraising/QA/evidence doc | Keep |
| `KEEP_ROADMAP` | Not live yet but intentionally planned | Keep and label |
| `KEEP_GENERATED_LOCKED` | Generated or dependency artifact required for build/install | Keep |
| `REFACTOR_LATER` | Useful but too large/spaghetti; deletion unsafe | Create refactor task |
| `SPLIT_LATER` | Useful but file too large; split needed | Create split task |
| `ARCHIVE_CANDIDATE` | Useful history but not needed in hot path | Propose archive strategy |
| `UNKNOWN_DO_NOT_TOUCH` | Cannot prove safe | Do not delete |

## Large-file split criteria

A file over 500 real text LOC is not automatically a problem -- Sprint 1 found 30 such files, and
28 of them were correctly-sized product code (one file per feature section, matching this app's own
established pattern) or evidence docs. Only split a large file when:

- It mixes genuinely unrelated concerns (not just "does a lot for one feature").
- The size itself is measurably causing test/build/memory pressure (cite the evidence).
- The split can be done safely and doesn't require re-designing the surrounding architecture.

Do not split a file merely because it crossed a line-count threshold. Do not split as a cleanup
exercise disconnected from an actual pain point.

## Evidence-doc retention policy

Never delete a doc under `docs/audit/` or `docs/readiness/` (or equivalent evidence-chain locations)
solely to reduce LOC. These documents are this program's own record of external signal -> product
decision -> shipped artifact -> verification -> current status, per `CLAUDE.md`'s standing Evidence
Chain rule. A doc that says "superseded" or "stale" about itself is doing its job correctly -- that
is not the same as being safe to delete. If a doc is genuinely redundant with another (not merely
older), name the specific duplicate pair explicitly and get founder sign-off before removing either.

## Binary files

Never let a naive LOC tool count binary files (images, PDFs, ZIPs, fonts, audio, video) as text
lines -- this was the single largest source of this repo's apparent-bloat confusion. Use
`pnpm run repo:size:audit` (excludes binaries from the LOC sum, reports them separately by count and
MB) for any future size discussion, not a raw `wc -l`. If a new binary file type shows up that isn't
in `scripts/repo-size-lib.mjs`'s `binaryExtensions` set, add it there rather than letting it silently
re-inflate the count.

Large tracked binaries in this repo should be treated as a **content-sensitivity and repo-size
question independently of LOC** -- this repo is public. Before committing a large binary (survey
exports, pitch decks, generated assets), ask whether it needs to be in git history at all, not just
whether it's "big."

## Guardrail tooling (all live as of Sprint 1)

- `pnpm run repo:size:audit` -- LOC by directory/extension, binaries excluded and reported separately.
- `pnpm run repo:large-files [threshold]` -- lists tracked text files over the threshold (default 500).
- `pnpm run repo:bloat:guard` -- fails if any tracked file lives under `.next/`, `dist/`, `out/`,
  `coverage/`, `.turbo/`, `node_modules/`, or ends in `.tsbuildinfo`. Wired into
  `.github/workflows/ci.yml`'s `quality` job as a fast, dependency-free first step.
- `.github/PULL_REQUEST_TEMPLATE.md`'s "Enterprise Impact" block includes 5 bloat-awareness
  checklist items every PR author sees.

## When starting a future de-bloat pass

1. Run `pnpm run repo:size:audit` and `pnpm run repo:large-files` first -- get real numbers before
   forming a hypothesis about where bloat is.
2. Apply the "Safe to Delete" test above to any candidate before touching it. Cite the exact
   `git grep`/reference-check command used, not a guess.
3. Only delete at 95%+ confidence. Document everything else in the classification buckets above.
4. Never delete evidence docs, migrations, or product-surface code to hit a LOC target.
5. State plainly, every time: LOC reduction is a repo-hygiene and operational-risk metric, not a
   quality metric by itself.
