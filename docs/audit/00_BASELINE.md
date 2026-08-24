# Phase 0 -- Audit Baseline

Reconstructed directly from `git log` against this repository (`axxess-triaxis/AXXESSTRIAXIS`, current branch `canonical/sprint-1-35-unified-gitlab`, HEAD as of this audit `dfec8de`). No founder input used for this phase -- pure repository forensics.

**Scope note:** this repository is the evidence source available to this audit. Whether it is the complete history of AXXESS TRIaxis (vs. work that predates this repo, or exists in a different repo/environment) is itself an open question -- see Q-002 below.

## Repository age and volume

| Metric | Value |
|---|---|
| First commit | `5c68e45` -- 2026-07-02 -- "Initial commit" (2-line README, author `axxess-triaxis`) |
| Second commit | `fcb8788` -- 2026-07-02 -- "Initial AXXESS MVP foundation" (author `Triaxis Ventures`) -- 173 files, 19,260 insertions -- the real starting point of the codebase |
| Latest commit at audit time | `dfec8de` -- 2026-08-10 |
| Elapsed span | 2026-07-02 to 2026-08-10 = **39 days** |
| Total commits | **669** |

## Commits by week (ISO week, ~7-day buckets from repo start)

| Week | Commits |
|---|---|
| 2026-W27 (starts 2026-06-29) | 36 |
| 2026-W28 | 45 |
| 2026-W29 | 131 |
| 2026-W30 | 200 |
| 2026-W31 | 94 |
| 2026-W32 | 160 |
| 2026-W33 (partial, to 2026-08-10) | 3 |

Commit volume is not flat -- W30 (200 commits) and W32 (160) are the two heaviest weeks; W33's 3 commits reflect only the first ~2 days of that week at the time of this pull, not a real slowdown. Not yet analyzed for what drove the W30/W32 spikes -- deferred to Phase 1 (Repository Forensics) and Phase 11 (Engineering Velocity).

## Commits by author

| Author (as recorded in git) | Commits |
|---|---|
| Triaxis Ventures | 435 |
| SUDIPTA KOUSHIK SARMAH | 101 |
| dependabot[bot] | 51 |
| axxess-triaxis | 41 |
| Sudipta Sarmah | 35 |
| Vercel | 3 |
| vexo-ai[bot] | 1 |
| posthog[bot] | 1 |
| Sudipta Koushik Sarmah | 1 |

Five distinct human-attributed name variants appear (`Triaxis Ventures`, `SUDIPTA KOUSHIK SARMAH`, `axxess-triaxis`, `Sudipta Sarmah`, `Sudipta Koushik Sarmah`) plus 4 bot/service accounts. Whether all 5 human-labeled names represent the same single person (the founder) using different local git configs/machines, or represent genuinely different contributors, is not established from author name alone -- see Q-003.

## Schema/migration baseline

- First migration: `20260702165736_initial_enterprise_schema.sql` -- same day as repo creation.
- Total migration files in `supabase/migrations/` as of audit time: **35**.
- Not yet traced which migrations correspond to which product capability -- deferred to Phase 2 (Product Capability Audit) and Phase 4 (Architecture Audit).

## Early milestone markers (commit-message search, not exhaustive)

| Marker | First found | Note |
|---|---|---|
| RAG / retrieval | `25cdb60` "feat(sprint-11): production demo hardening, auth and governed RAG" | Sprint-11-labeled, i.e., not the first sprint -- RAG was not part of the initial MVP foundation commit. |
| "agentic" / agent-framework language | `4130b5f` "ci(automation): add sprint-branch CI verification and local post-sprint automation" | This is a CI-automation commit, not necessarily the first product-level agent capability -- this match is likely a false positive on the word "automation." Needs re-checking in Phase 3 (AI/Agentic Audit) against actual agent-tool implementation code, not commit messages. |
| "multi-tenant" (exact phrase, commit messages) | Not found via this search | Does not mean multi-tenancy is absent -- tenant-scoped schema exists from the first migration (`initial_enterprise_schema.sql`) and this session's own working knowledge references a `sprint5_auth_multi_tenant_core.sql` migration by name. Commit-message grep is a weak signal; Phase 1/2 should trace this from the schema and code directly, not from commit messages. |
| AXXESS Lite | `bef5ab8` "fix: close remaining demo-data leakage found in full-codebase sweep" | This commit message does not obviously relate to "Lite" as a product line -- likely a substring match (e.g., "leakage" or similar) rather than a real first-mention. Needs a more precise search in Phase 1. |

**Caveat on this table:** commit-message keyword search is a blunt instrument and produced at least one likely false positive (AXXESS Lite) and one ambiguous match (agentic). This table should not be cited as authoritative "first evidenced date" for any capability -- Phase 2's per-feature audit, which traces into actual implementation code rather than commit messages, supersedes it.

## What Phase 0 establishes

- **Repository age:** 39 days (2026-07-02 to 2026-08-10), not the age of the company or product idea -- whether product work predates this repository is unknown from repo evidence alone (Q-002).
- **Commit volume:** 669 commits, uneven distribution across weeks, heaviest in W30 and W32.
- **Author identity:** 5 human-labeled git identities, not yet confirmed to be one person or several (Q-003).
- **Schema baseline:** enterprise/tenant schema present from the very first migration, same day as repo init.

## What Phase 0 does NOT establish (explicitly out of scope for this phase)

- Whether any of this represents customer-facing product maturity (Phase 2+).
- Whether commit volume correlates with real feature delivery vs. churn/rework (Phase 11).
- Whether the "Initial AXXESS MVP foundation" commit represents original work or a scaffold/template starting point (not investigated this phase).

---

## Open questions raised by this phase

### Q-002

**Category:** Audit scope / historical completeness

**Question:** Does this repository (`axxess-triaxis/AXXESSTRIAXIS`, first commit 2026-07-02) represent the complete history of AXXESS TRIaxis's product development, or did meaningful product/business work happen before 2026-07-02 in a different repository, environment, or offline context that this audit cannot see?

**Why this matters:** If real prior work exists outside this repo, "39 days of history" understates the company's actual age/progress, and this audit's velocity/timeline conclusions (Phases 1, 11, 15) would be measuring only the most recent slice, not the whole trajectory.

**Current evidence:** Repository's own first commit is dated 2026-07-02 and is a trivial 2-line README; the real content starts with the second commit the same day ("Initial AXXESS MVP foundation," 173 files). No evidence within the repo of what preceded it.

**Possible interpretations:**
A. This repo is the complete history -- the company/product effectively began 2026-07-02.
B. Substantial prior work (design, an earlier prototype, business development) existed before this repo and is not captured here.
C. The 173-file "Initial AXXESS MVP foundation" commit was itself imported/scaffolded from prior work done elsewhere, then committed here as a single squashed starting point.

**What evidence would resolve it:** Founder confirmation, plus any dated artifacts (docs, deck versions, prior repo, correspondence) predating 2026-07-02 if they exist.

**Founder answer (2026-08-10):** "This repo contains 100% of AXXESS."

**Status:** ANSWERED -- repository age (39 days) equals product/company age; not a partial slice of a longer history.

### Q-003

**Category:** Repository forensics / author identity

**Question:** Narrowed after checking author emails (`git log --format="%an <%ae>"`). Of the 5 human-labeled names, 4 resolve to the same email ([FOUNDER_EMAIL_MASKED]): `SUDIPTA KOUSHIK SARMAH` (101), `Sudipta Sarmah` (33 + 2 under a GitHub-noreply alias of the same account), `axxess-triaxis` (22 of its 41 commits -- the other 19 use `actions@users.noreply.github.com`, i.e., GitHub Actions/CI bot commits authored under the `axxess-triaxis` display name, not a human), and `Sudipta Koushik Sarmah` (1). Only **`Triaxis Ventures <noreply@triaxis.ventures>`, 435 commits (65% of the repo)**, uses a distinct email tied to an organizational identity rather than a personal Gmail address. Remaining question: is `Triaxis Ventures <noreply@triaxis.ventures>` also you (an org-branded git config on a different machine/setup), or does it represent commits made by someone/something else under that identity (e.g., a different tool's default committer identity, a co-founder, or an agent's commits attributed to the org rather than to a bot account)?

**Why this matters:** This one identity is 65% of all commits in the repository -- Phase 13 (Founder Execution) and Phase 11 (Engineering Velocity)'s conclusions hinge on whether that majority-share identity is you.

**Current evidence:** Email-level breakdown above, from `git log --format="%an <%ae>"`, all 669 commits.

**Possible interpretations:**
A. `Triaxis Ventures <noreply@triaxis.ventures>` is you, under an org-configured git identity (e.g., a work machine, a CI/deploy credential, or a coding-agent session configured with that committer identity).
B. It represents another contributor's commits, attributed to the org rather than a personal account.

**What evidence would resolve it:** Founder confirmation.

**Founder answer (2026-08-10):** "Yes."

**Status:** ANSWERED -- all 5 human-labeled git identities confirmed as the founder. Of 669 total commits, 56 are bot-attributed (51 dependabot, 3 Vercel, 1 vexo-ai, 1 posthog) and the remaining 613 are the founder's.
