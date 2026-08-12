# Codebase De-Bloat Audit and Deletion Plan (2026-08-11)

Sprint 1 of the Codebase De-Bloat initiative. Founder-provided spec: dead-code audit, safe-deletion
plan (95%+ confidence only), and bloat guardrails, driven by concern over a ~0.10% historical
deletion rate, 14 files Paxel flagged at 500+ LOC, and a reported 350k+ tracked LOC against an
estimated ~160-170k "core" LOC.

**"LOC reduction is not a measure of product quality. It is a repo hygiene and operational-risk
control metric." This document does not claim the repo is clean, that memory problems are solved, or
that dead code is fully removed. It reports exactly what was measured, what was found, what was
deleted, and what remains an open, named, founder-reviewable question.**

## 1. Executive Summary

**The headline finding reframes the premise of this sprint: the "350k+ LOC" figure is a measurement
artifact, not real bloat.** `git ls-files | xargs wc -l` -- the obvious, naive way to measure a
repo's size, and very plausibly how the 350k+ figure was originally produced -- counts every newline
byte inside binary files (PNG, PDF, ZIP) as if it were a real line of code. This repo has 57 tracked
binary files (52 PNG, 3 PDF, 2 ZIP) whose combined "line count" under that naive method is **173,921
"lines"** -- 51.7% of the naive 336,653-"line" total. Exclude them, and real tracked text/code LOC is
**162,030** (measured via the new `pnpm run repo:size:audit` script, see Section 14) -- which already
matches the founder's own "~160-170k core" estimate almost exactly. **There is no large mystery gap
of unexplained dead code to hunt for.** This does not mean there is nothing to do -- Section 7 below
names a real, separate concern (tracked binary survey-export files in a public repo) that is more
important than the LOC question it got conflated with.

Real work completed this sprint: a corrected, tooled LOC/large-file inventory; one verified safe
deletion; three new guardrail scripts (with binary-exclusion logic, so this exact miscounting bug
cannot recur); a CI gate; a PR-template checklist addition; and an honest classification of every
concrete finding this session's research actually covered. **What this sprint did not do**: an
exhaustive, file-by-file dead-code sweep of all ~760 files under `src/`. Two research subagents
tasked with that sweep hit session/API instability mid-run this session (one rate-limited, one
stalled mid-stream); rather than present partial or fabricated findings as complete, this doc names
the gap explicitly in Section 16 as follow-up work, per this program's standing evidence-chain
discipline (do not invent missing evidence).

## 2. Current LOC Snapshot

Measured via `node scripts/repo-size-audit.mjs` on branch `chore/codebase-debloat-sprint-1`
(branched fresh off `main`, pre-dating the Security Hardening Sprint's still-unmerged PR #220):

- **Tracked files: 1,391** (1,334 real text, 57 binary, 0 unreadable-as-text)
- **Real text LOC: 162,030**
- **Binary file storage: 43.9 MB** across 57 files (excluded from LOC entirely)

## 3. Tracked vs Untracked LOC

Everything above is tracked LOC. Untracked content at the time of this audit: `scratchpad/` (session
scratch directory, this session's own working files), `paxel-upload.sh` (a real, in-use founder
tool -- confirmed referenced by name in `docs/readiness/PAXEL_REPORT_13_CODEX_BEHAVIORAL_ANALYSIS_2026_08_07.md`
and `docs/readiness/SESSION_PERSISTENCE_SECURITY_FIX_CLOSEOUT_2026_07_31.md`), and (until this
sprint) `upload.sh` (a byte-identical duplicate of `paxel-upload.sh`, now deleted). None of these
were ever counted in any of this repo's tracked-LOC figures, past or present -- untracked content is
not part of the "350k+ LOC" question at all.

## 4. Core vs Unclear LOC Estimate

Given the headline finding, "core vs unclear" resolves almost entirely to "text vs binary," not
"product code vs unexplained accumulation":

| Category | LOC | Share of tracked total (336,653 naive) |
|---|---:|---:|
| Real text/code LOC (the actual repo) | 162,030 | 48.1% |
| Binary-file miscounting artifact | 173,921 | 51.7% |
| (rounding/branch-delta vs. naive total) | ~702 | 0.2% |

Of the 162,030 real text LOC, `src/` (application code) is 73,096 (45.1%) and `docs/` is 44,802
(27.6%) -- the two largest real contributors, both expected and both defensible (a 40-day-old,
multi-surface product with an unusually thorough evidence-chain documentation discipline, per this
program's own CLAUDE.md standing rules, produces exactly this shape of split). Neither is "unclear."

## 5. Top-Level Directory LOC

| Dir | Real text LOC | Files |
|---|---:|---:|
| `src/` | 73,096 | 759 |
| `docs/` | 44,802 | 317 |
| root-level files | 23,721 | 31 |
| `supabase/` | 6,235 | 47 |
| `Enterprise beta feedback - Batch 1 (30 responses)/` | 4,906 | 12 |
| `scripts/` | 2,556 | 27 |
| `.github/` | 1,888 | 22 |
| `apps/` | 1,616 | 69 |
| `packages/` | 1,322 | 15 |
| `plans/` | 1,248 | 9 |
| `tests/` | 462 | 15 |
| `public/` | 67 | 7 |
| `guidelines/` | 61 | 1 |
| `.vscode/` | 33 | 1 |
| `.claude/` | 17 | 2 |

Root-level's 23,721 LOC is dominated by `pnpm-lock.yaml` (18,249 lines) and `README.md` (3,124
lines) -- both explained, neither unclear (see Section 6).

By file extension (top contributors): `.md` 54,698 LOC / 347 files, `.ts` 47,176 / 526,
`.tsx` 27,941 / 282, `.yaml` 18,303 / 2 (almost entirely `pnpm-lock.yaml`), `.sql` 5,527 / 43,
`.mjs` 2,876 / 30, `.yml` 2,032 / 21, `.json` 1,197 / 27.

## 6. 500+ LOC File Table

**30 files exceed 500 real text LOC; 6 exceed 1,000.** Paxel reported 14 -- this discrepancy is named
explicitly, not silently reconciled, since Paxel's exact methodology (threshold, file-type
inclusion/exclusion) was not verifiable from this repo. Full list, classified:

| File | LOC | Type | Product surface | Classification | Confidence | Recommendation |
|---|---:|---|---|---|---:|---|
| `pnpm-lock.yaml` | 18,249 | Generated lockfile | All | `KEEP_GENERATED_LOCKED` | 100% | Keep -- required for reproducible installs |
| `README.md` | 3,124 | Docs | All | `REFACTOR_LATER` | 70% | Unusually large for a README; candidate to split into README + linked docs, not urgent, not this sprint |
| `src/repositories/supabaseEnterpriseRepositories.ts` | 1,733 | Core code | All (central repository layer) | `KEEP_CORE` / `SPLIT_LATER` | 85% | Product-critical; large because it's the central repository file for most resource types -- a real split candidate, not a deletion candidate |
| `Enterprise beta feedback.../ITERATION_PROGRESS.md` | 1,280 | Evidence doc | Beta feedback record | `KEEP_EVIDENCE` | 95% | Real founder-produced evidence record |
| `Enterprise beta feedback.../Enterprise_Beta_Feedback_Batch_1.md` | 1,087 | Evidence doc | Beta feedback record | `KEEP_EVIDENCE` | 95% | Same |
| `src/features/integrations/IntegrationsSection.tsx` | 1,046 | Core code | Integrations | `KEEP_CORE` | 90% | Large because the integration catalogue is large (per this program's own product scope); not spaghetti |
| `docs/SPRINT_LOG.md` | 956 | Evidence doc | Program history | `KEEP_EVIDENCE` | 90% | Standing sprint log |
| `src/features/settings/SettingsSection.tsx` | 874 | Core code | Settings | `KEEP_CORE` | 90% | Feature-section component, matches app's established pattern |
| `src/features/knowledge-hub/KnowledgeHubSection.tsx` | 862 | Core code | Knowledge Hub | `KEEP_CORE` | 90% | Same pattern |
| `src/features/ai-workspace/AIWorkspaceSection.tsx` | 840 | Core code | AI Workspace | `KEEP_CORE` | 90% | Same pattern |
| `Enterprise beta feedback.../BETA_0.5_0.7_FEEDBACK_ANALYSIS_2026_07_23.md` | 777 | Evidence doc | Beta feedback record | `KEEP_EVIDENCE` | 95% | Real evidence record |
| `src/features/tasks/TasksSection.tsx` | 757 | Core code | Tasks & Workflow | `KEEP_CORE` | 90% | Same pattern |
| `src/demo/demoDataset.ts` | 736 | Core code | Investor Demo | `KEEP_CORE` | 90% | Demo data is product-critical for the demo surface, explicitly non-negotiable per this sprint's own spec |
| `src/app/components/ui/sidebar.tsx` | 726 | Core code | Shared UI | `KEEP_CORE` | 85% | Shared shell component |
| `docs/workflows/shared/msme-tender-compliance-inventory-finance-command-center.md` | 669 | Docs | Workflow template | `KEEP_ROADMAP` | 75% | Workflow template doc, not verified against current usage this pass |
| `src/features/dashboard/DashboardSection.tsx` | 658 | Core code | Executive Dashboard | `KEEP_CORE` | 90% | Same pattern |
| `src/services/dashboard/buildDashboardSnapshot.ts` | 645 | Core code | Executive Dashboard | `KEEP_CORE` | 85% | Scoring engine, product-critical |
| `src/services/rag/tenantRagWorkflow.ts` | 614 | Core code | RAG / Knowledge Hub | `KEEP_CORE` | 95% | Explicitly non-negotiable per this sprint's own spec |
| `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md` | 595 | Evidence doc | QA history | `KEEP_EVIDENCE` | 85% | Real QA record |
| `src/services/agents/toolRegistry.ts` | 589 | Core code | Agentic infra | `KEEP_CORE` | 90% | Explicitly non-negotiable per this sprint's own spec |
| `docs/BETA_QA_ACTIONABLES_2026_07_22.md` | 580 | Evidence doc | QA history | `KEEP_EVIDENCE` | 85% | Real QA record |
| `supabase/migrations/202607040001_sprint9_knowledge_hub.sql` | 544 | Migration | Knowledge Hub | `KEEP_CORE` | 100% | Migration history, explicitly non-negotiable |
| `src/features/ai-workspace/AIReviewInboxPage.tsx` | 538 | Core code | AI Review Inbox | `KEEP_CORE` | 90% | Same pattern |
| `supabase/migrations/202607090001_sprint12_security_compliance_foundation.sql` | 535 | Migration | Security/compliance | `KEEP_CORE` | 100% | Migration history |
| `src/services/workflows/liveTenantWorkflow.ts` | 534 | Core code | Workflow engine | `KEEP_CORE` | 85% | Product-critical |
| `.github/workflows/mobile-capacitor-release.yml` | 527 | CI config | Mobile release | `KEEP_CORE` | 90% | Mobile release pipeline, non-negotiable |
| `src/proxy.test.ts` | 523 | Test | Lite/X0 boundary gate | `KEEP_CORE` | 95% | Test coverage protecting real Lite/X0 boundary behavior |
| `docs/workflows/shared/difc-enterprise-transformation-management.md` | 520 | Docs | Workflow template | `KEEP_ROADMAP` | 75% | Same caveat as the MSME template above |
| `packages/core/src/domain/entities.ts` | 512 | Core code | Shared domain types | `KEEP_CORE` | 90% | Shared type layer |
| `src/services/integrations/connectorContract.ts` | 506 | Core code | Integrations | `KEEP_CORE` | 85% | Product-critical |

**None of the 30 files over 500 LOC are dead code, and none clear the 95% deletion-confidence bar.**
They are large because the features/records they represent are large. The only real candidates in
this list are `README.md` (`REFACTOR_LATER`, size mismatch with a README's normal role) and
`supabaseEnterpriseRepositories.ts` (`SPLIT_LATER`, a real central-file-growth pattern worth a future
refactor) -- both named, neither actioned this sprint (per the spec: "do not split files in this
sprint unless the split is tiny and extremely safe").

## 7. Safe Deletion Candidates

Items clearing the spec's 95%+ confidence bar:

| Item | Confidence | Evidence | Action |
|---|---:|---|---|
| `upload.sh` (untracked) | 100% | Byte-identical to `paxel-upload.sh` (`diff -q` confirms); zero references anywhere in tracked docs/scripts (`git grep`); `paxel-upload.sh` is the one actually referenced by name in 2 tracked docs as the real working tool | **Deleted this sprint** |
| `src/services/legacyInstitutionalViewRepository.ts` (30 LOC) + `legacyInstitutionalViewRepository.test.ts` (15 LOC) | 98% | Independently confirmed zero consumers via `git grep` across all `.ts`/`.tsx` outside the file itself. **Corroborated by the repo's own historical audit trail across 6 separate docs** (`docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`, `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md`, `docs/SPRINT_4_CLOSEOUT_2026_07_22.md`, `docs/SPRINT_LOG.md` x2, `docs/readiness/TENANT_PARTITIONING_DEMO_REFERENCE_INVENTORY_2026_07_28.md`), each independently stating this file was confirmed dead as far back as Sprint 4 (2026-07-22) and deliberately left in place as "out of scope" each time, with a stated precedent of deleting a similarly-dead file in an earlier round. The `InstitutionalRepository` *type* it implements remains real and used (`demoInstitutionalRepository`, `emptyInstitutionalRepository`, `src/providers/serviceProvider.ts`) -- only this one dead adapter implementation is removed | **Deleted this sprint** |
| `src/mocks/institutionalData.ts` (15 LOC) | 98% | Its only consumer was `legacyInstitutionalViewRepository.ts` above (confirmed via `git grep`, zero other references including test files) -- becomes fully dead once that file is deleted | **Deleted this sprint** |

**Total: 5 files, ~60 real text LOC removed this sprint** -- small relative to the 162,030-line corrected
total, consistent with this audit's own headline finding that there was never a large hidden bloat
problem to begin with. See Section 16 for what a fuller sweep (old demo/onboarding variants beyond
this chain, duplicate readiness docs, old mobile scaffold copies) would still need to cover -- not
completed this pass, not guessed at here. A supplementary scripts/ orphan check (all `.mjs`/`.sh`
files under `scripts/`, cross-referenced against `package.json`, `.github/workflows/*.yml`, and doc
references) found zero additional orphans. A supplementary check for self-declared "stale"/
"superseded" readiness docs found 4 (`AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md`,
`P0_PUBLIC_ENTRY_INVESTOR_BETA_SPLIT_2026_07_24.md`, `QA3_READINESS_KANBAN.md`,
`TOP_LEVEL_READINESS_AND_GTM_SNAPSHOT_2026_07_31.md`) -- all are properly self-documenting evidence
records noting their own supersession, not bloat; per the spec's own non-negotiables ("do not delete
docs/evidence merely to improve LOC metrics"), none are deletion candidates.

**Separately, and more important than the LOC question it happens to touch:** `Enterprise beta
feedback - Batch 1 (30 responses)/` (committed 2026-07-20) contains 2 ZIP files (14MB + 4.8MB) and
2 PDFs (152KB + 1.5MB) of real beta-participant feedback-survey exports (one labeled "PII-masked"),
plus `docs/pitch-deck/Triaxis_Ventures_Pitch_Deck_2026-07-23.pdf` (5.4MB). **This repository is
confirmed public.** Whether ~20.5MB of beta-survey export binaries belongs in a public git history
is a founder decision, not something this audit makes unilaterally -- flagged in Section 16 as a
Founder/HITL decision, not deleted. Even removing these from the working tree going forward would not
purge them from git history, which would need a separate, explicitly-approved, higher-risk operation.

## 8. "Do Not Delete" List

Per the spec's own non-negotiables, explicitly restated as protected: all of X0 Web, Investor Demo,
AXXESS Lite, mobile Capacitor targets (X0 and Lite), Supabase migrations, auth/session/RBAC/RLS/
tenant-isolation code, RAG/Knowledge Hub/document indexing/HITL review, the integration framework and
token vault, agentic infrastructure, analytics instrumentation, existing test coverage, every
evidence-chain doc under `docs/audit/` and `docs/readiness/`, and founder governance/product doctrine
docs (`CLAUDE.md`, the AXXESS Lite doctrine docs). Nothing in this sprint's Section 7 deletion list or
Section 12 guardrails touches any of these.

## 9. Memory Pressure Findings

Two real, already-documented root causes (from `docs/audit/06_TEST_RELIABILITY_AUDIT.md`), cited
accurately, not re-investigated or re-solved this sprint:

| Source of memory pressure | Evidence | Severity | Fix now? | Recommendation |
|---|---|---|---|---|
| `vitest.config.mjs`'s `fileParallelism: true` (commit `181f1e1`) | Deliberate, documented tradeoff: ~7x faster full-suite runtime (92s vs 6072s), at the cost of "Timeout waiting for worker to respond" crashes under concurrent load across ~200 files. Hit directly by this session's own Security Hardening Sprint verification (`--pool=forks` fallback used successfully, see that sprint's closeout) | Medium (known, mitigated by an existing fallback) | No | Keep the documented `--pool=forks` fallback as the standard recovery path; do not re-tune `fileParallelism` as part of this sprint |
| Session-long cumulative memory exhaustion on an 8GB dev machine (`docs/audit/06_TEST_RELIABILITY_AUDIT.md`, Root Cause 3, Q-010, still `OPEN`) | 2 specific test files failed even in complete isolation late in a long session; `systeminfo` showed 1,658MB available of 7,933MB total after many hours of repeated `vitest` invocations | Medium (environment-specific, not a code defect) | No | Named, tracked as Q-010; not this sprint's scope to fix a hardware/environment constraint |

No new memory-pressure sources were found or investigated this sprint (e.g., heavy PDF/OCR/parser
dependency eager-loading, barrel-import bloat, accidental client imports of server-heavy code) --
this was in the founder's spec's Section 5 scope but was not covered by the research this session
actually completed. Named as follow-up in Section 16, not guessed at here.

## 10. Product-Surface Boundary Findings

Confirmed via direct research this session (not guessed):

- **Lite/X0 boundary guardrails already exist and pass**: `scripts/lite-boundary-guard.mjs`
  (`pnpm run lite:guard`) scans `src/app/lite`, `src/features/lite`, `apps/lite-web`,
  `apps/mobile-lite-capacitor`, `packages/features-lite`, and `packages/core` for forbidden imports
  (X0 Dashboard, Social Alerts, Beta Readiness, full Settings/Integrations, Demo data modules, X0
  shell chrome, agentic infra, and specific banned vocabulary/component names) via regex pattern
  matching, plus required-export/populated-allowlist checks on `src/proxy.ts`. This guard currently
  **passes**.
- **`src/proxy.ts`'s runtime host gate** enforces non-`/lite` paths on a Lite host redirect to
  `/lite`, and a deny-by-default API allowlist via `src/config/liteSurfaceHosts.ts`.
- **`AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md`'s explicit exclusion list**
  (Section 6.2/6.3) names exact modules Lite must never import: `DashboardSection.tsx`, tile/tier
  engine, `TenantHealthCommandCenter.tsx`, the 23 `src/app/admin/*` sub-routes, deep RBAC, the 30+
  connector catalogue, agentic MCP admin, `src/demo/demoMode.ts`'s demo-mode helpers, and several
  named admin feature directories (`beta-readiness/`, `audit-logs/`, `product-analytics/`,
  `pilot-conversion/`, `support-ops/`, `model-policy/`, `plugin-runtime/`, `prompt-approvals/`).
- **Target monorepo architecture is only partially built**: `apps/x0-web`, `apps/demo-web`, and
  `packages/{ui,features-x0}` do not exist yet (per `AXXESS_LITE_MONOREPO_BOUNDARY_AND_BUILD_ISOLATION_2026_08_05.md`'s
  own target-architecture section) -- the "X0 app" is still the repo root itself. This is a known,
  already-documented, in-progress architectural migration, not a de-bloat finding -- named here only
  because it constrains what "clean directory boundaries" can mean for this repo today.

No boundary violation was found this sprint. This sprint's own changes (3 new `scripts/repo-*.mjs`
files, a `.gitignore` addition, a PR-template addition, a CI step) touch none of the Lite/X0/Demo/
mobile boundary surfaces named above.

## 11. Immediate Deletion Plan

Executed this sprint:

1. `upload.sh` deleted (untracked, byte-identical duplicate -- see Section 7).
2. `src/services/legacyInstitutionalViewRepository.ts` and its test file deleted (confirmed dead
   since Sprint 4, corroborated by 6 of this repo's own historical docs -- see Section 7).
3. `src/mocks/institutionalData.ts` deleted (its only consumer was the file removed in step 2).
4. `.gitignore` updated to add `/scratchpad/`, `/upload.sh`, `/paxel-upload.sh` -- prevents these
   local/scratch/tooling files from ever being accidentally tracked via a future `git add -A`.

Nothing else executed. Every other candidate found stayed in `KEEP_*`/`LIKELY_DELETE_AFTER_REVIEW`/
`REFACTOR_LATER`/`SPLIT_LATER` per the spec's own 95%+-confidence-only rule.

## 12. Deferred Refactor/Split Plan

| Item | Bucket | Why deferred |
|---|---|---|
| `README.md` (3,124 LOC) | `REFACTOR_LATER` | Unusually large for a README; splitting into README + linked docs is a real improvement but not urgent, and this sprint's own spec says not to split files unless "tiny and extremely safe" |
| `src/repositories/supabaseEnterpriseRepositories.ts` (1,733 LOC) | `SPLIT_LATER` | Central repository file, genuine growth-over-time candidate for a per-resource-type split; too large a change to attempt safely within this sprint's own stated constraints |
| `Enterprise beta feedback - Batch 1 (30 responses)/` binaries (~20.5MB) | `ARCHIVE_CANDIDATE` / founder decision | See Section 7 and Section 16 -- a privacy/repo-hygiene question, not a code-quality one; needs founder sign-off before any action, including working-tree removal |

## 13. Guardrails for Future Bloat

All net-new this sprint (confirmed nothing equivalent existed before):

- **`pnpm run repo:size:audit`** (`scripts/repo-size-audit.mjs`) -- reports tracked LOC by top-level
  directory and file extension, **with binary files (png/jpg/jpeg/gif/ico/webp/bmp/tiff/pdf/zip/gz/
  tar/7z/woff/woff2/ttf/eot/otf/mp3/mp4/mov/avi/webm) excluded from the LOC sum and reported
  separately** (file count + total MB) -- this is the direct fix for the exact miscounting bug this
  audit found in Section 1.
- **`pnpm run repo:large-files`** (`scripts/repo-large-files.mjs`) -- lists tracked text files over
  a configurable LOC threshold (default 500), same binary exclusion.
- **`pnpm run repo:bloat:guard`** (`scripts/repo-bloat-guard.mjs`) -- fails (non-zero exit) if any
  tracked file lives under `.next/`, `dist/`, `out/`, `coverage/`, `.turbo/`, `node_modules/`, or ends
  in `.tsbuildinfo`. **Wired into `.github/workflows/ci.yml`'s `quality` job** as a new, dependency-
  free, fail-fast first step -- confirmed via this session's own research that no such gate existed
  across any of this repo's 15 GitHub Actions workflows before this sprint.
- **`.github/PULL_REQUEST_TEMPLATE.md`** -- 5 new checklist items appended to the existing
  "Enterprise Impact" block, matching the spec's own required checklist verbatim (>500 LOC file
  without documented reason, duplicate surface code, generated files added, memory-heavy imports
  increased, dead/half-migrated code left without a named follow-up).
- **`docs/readiness/REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md`** -- new standing governance doc (Section
  15 below has its full content) codifying the deletion criteria, large-file split criteria, and
  evidence-doc retention policy for future sessions to reference, since none existed before this
  sprint (confirmed: neither `README.md` nor `CLAUDE.md` had any repo-hygiene/deletion policy prior
  to this sprint).

Not built this sprint (optional per the spec, named as follow-up): a CI job specifically re-running
`repo:size:audit` on every PR and diffing against a stored baseline (LOC trend tracking), a bundle
analyzer, code-ownership tags, or test memory profiling. `repo:bloat:guard` is the only guardrail
wired into CI this pass -- `repo:size:audit`/`repo:large-files` are available as commands but not yet
CI-enforced (no LOC ceiling was specified by the founder to enforce against).

## 14. Verification Commands

```
node scripts/repo-size-audit.mjs        -> 1,391 tracked files (1,334 text / 57 binary), 162,030 real text LOC
node scripts/repo-large-files.mjs       -> 30 files over 500 real text LOC (see Section 6)
node scripts/repo-bloat-guard.mjs       -> passed, 0 of 1,391 tracked files under a forbidden path
```

Standard repo verification suite (typecheck/lint/test/build/lite:ci/mobile doctor) run and reported
in `docs/readiness/CODEBASE_DEBLOAT_SPRINT1_CLOSEOUT_2026_08_11.md` with exact pass/fail counts, per
this program's standing verification discipline (report exact counts, not "tests pass").

## 15. Residual Risks

- The corrected LOC methodology (binary exclusion) is new this sprint and has not yet been
  cross-checked against an independent second tool -- if Paxel or another external tool re-measures
  this repo, a discrepancy is possible and should be reconciled by comparing methodologies, not by
  assuming either number is automatically right.
- `repo:bloat:guard`'s forbidden-path list is a fixed set (`.next/dist/out/coverage/.turbo/
  node_modules` + `.tsbuildinfo`) -- a new build tool introduced later (a different bundler's cache
  dir, for example) would not be caught until someone updates this list by hand.
- The dead-code sweep beyond Section 7's single confirmed item and the scripts/ reference-check
  sample (Section 16) was not completed this session -- residual dead code may exist and is not
  disproven by this audit, only not yet found.

## 16. Founder/HITL Decisions Needed

1. **The tracked binary survey-export files** (Section 7): should `Enterprise beta feedback - Batch
   1 (30 responses)/`'s 2 ZIP files and `docs/pitch-deck/`'s PDF remain tracked in this public
   repository's git history? If not, this needs an explicit, separate decision about whether working-
   tree removal alone is sufficient or whether a full history rewrite (BFG/`git filter-repo`, a
   materially riskier operation requiring its own explicit sign-off) is wanted.
2. **`README.md`'s size** (3,124 LOC): worth a future split into README + linked docs? Not urgent,
   not blocking, but flagged for a founder call on priority.
3. **`supabaseEnterpriseRepositories.ts`'s size** (1,733 LOC): worth a future per-resource-type
   split? Same framing.
4. **Follow-up sprint scope**: this session's research into old demo/onboarding variants, duplicate
   readiness docs, old mobile scaffold copies, and a full orphaned-scripts sweep did not complete
   (2 research agents hit session/API instability mid-task). A "Codebase De-Bloat Sprint 2" scoped
   specifically to finish that sweep is the natural next step, not attempted in this sprint given the
   corrected LOC finding already answered this sprint's most urgent question (there is no large
   unexplained-bloat crisis).
5. **`repo:size:audit`/`repo:large-files` CI enforcement**: should these be wired into CI as blocking
   gates (e.g., fail if real text LOC grows more than X% in one PR, or if a new file exceeds 500 LOC
   without an explicit override)? No numeric ceiling was specified by the founder this sprint, so none
   was invented -- this is a founder call, not a default this audit should set.
