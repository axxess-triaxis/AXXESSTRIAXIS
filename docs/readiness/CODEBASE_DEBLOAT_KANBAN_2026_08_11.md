# Codebase De-Bloat Kanban (2026-08-11)

Companion to `docs/readiness/CODEBASE_DEBLOAT_AUDIT_AND_DELETION_PLAN_2026_08_11.md`. Every item
below traces to a section in that doc -- this file tracks status, that file carries the evidence.

## Done

- LOC/large-file inventory tooled and run (`repo:size:audit`, `repo:large-files`) -- Audit doc
  Sections 2, 5, 6.
- Headline finding established: binary-file `wc -l` miscounting explains 173,921 of the naive
  336,653-"line" total; real text LOC is 162,030 -- Audit doc Section 1.
- `upload.sh` deleted (byte-identical duplicate of `paxel-upload.sh`, zero references) -- Audit doc
  Section 7, 11.
- `src/services/legacyInstitutionalViewRepository.ts` + its test + `src/mocks/institutionalData.ts`
  deleted (confirmed dead since Sprint 4, corroborated by 6 of this repo's own historical docs, plus
  fresh independent `git grep` verification) -- Audit doc Section 7, 11.
- Full `scripts/` orphan sweep (all `.mjs`/`.sh` files cross-referenced against `package.json`,
  workflows, and docs) -- zero additional orphans found -- Audit doc Section 7.
- `.gitignore` updated (`/scratchpad/`, `/upload.sh`, `/paxel-upload.sh`) -- Audit doc Section 11.
- `repo:bloat:guard` built and wired into `.github/workflows/ci.yml`'s `quality` job -- Audit doc
  Section 13.
- PR template's "Enterprise Impact" block extended with 5 bloat-awareness checklist items -- Audit
  doc Section 13.
- `docs/readiness/REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md` governance doc created -- Audit doc Section 13.
- Product-surface boundary check: `lite:guard` confirmed passing, boundary rules confirmed against
  `AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md` -- Audit doc Section 10.
- Memory-pressure findings cited from `docs/audit/06_TEST_RELIABILITY_AUDIT.md` (2 known root
  causes, neither re-investigated or claimed fixed) -- Audit doc Section 9.

## Safe To Delete Now

(Empty -- the one item that cleared the bar, `upload.sh`, is already deleted and moved to Done.)

## Needs Review

- **Tracked binary survey-export files** (`Enterprise beta feedback - Batch 1 (30 responses)/`'s 2
  ZIPs + 2 PDFs, `docs/pitch-deck/`'s PDF, ~20.5MB total): public-repo privacy/hygiene question,
  founder decision required before any working-tree or history action -- Audit doc Section 7, 16.

## Refactor Later

- `src/repositories/supabaseEnterpriseRepositories.ts` (1,733 LOC) -- central repository file, real
  per-resource-type split candidate, too large to attempt safely this sprint -- Audit doc Section 12.

## Split Later

- `README.md` (3,124 LOC) -- unusually large for a README; split into README + linked docs is a
  reasonable future improvement, not urgent -- Audit doc Section 12.

## Keep / Protected

- All 30 files over 500 real text LOC except the two above -- classified `KEEP_CORE`, `KEEP_EVIDENCE`,
  `KEEP_ROADMAP`, or `KEEP_GENERATED_LOCKED`, none dead code, none clearing the 95% deletion bar --
  Audit doc Section 6.
- `pnpm-lock.yaml` (18,249 LOC) -- generated, required for reproducible installs.
- Every product surface named in the sprint's own non-negotiables (X0, Demo, Lite, mobile targets,
  migrations, auth/RBAC/RLS, RAG/Knowledge Hub, integrations/token vault, agentic infra, analytics,
  test coverage, evidence-chain docs, governance docs) -- untouched this sprint.

## Blocked

- **Full dead-code sweep** (old demo/onboarding variants, duplicate readiness docs, old mobile
  scaffold copies, complete orphaned-scripts check) -- blocked on 2 research subagents hitting
  session/API instability this session (one hit a rate limit, one stalled mid-stream). Not
  reattempted a third time within this sprint given the headline LOC finding already resolved the
  sprint's most urgent open question. Named as Codebase De-Bloat Sprint 2 scope -- Audit doc Section 16.
