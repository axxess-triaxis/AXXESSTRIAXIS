# Canonical Workspace Migration And Verification Record

## Executive Summary

This document records the completed consolidation of AXXESS development work into one canonical local workspace and one verified GitLab repository state.

The migration was required because AXXESS had been developed across two local workspaces:

- Codex development for Sprint 1 through Sprint 32 was carried out locally at `C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`.
- Claude Code development for Sprint 33 and later was carried out at `C:\Users\Sudipta Sarmah\Downloads\Claude`.

The goal was to make the OneDrive AXXESS workspace the canonical active workspace, preserve all Sprint 1-32 Codex work, preserve later Claude work, verify the merged state, and push the unified repository to GitLab.

The migration is now complete. The old Claude workspace has been archived and is no longer the active development folder.

Current canonical workspace:

`C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`

Archived historical workspace:

`C:\Users\Sudipta Sarmah\Downloads\Claude.migrated-archive-20260722`

Completion status:

`Complete: canonical workspace migration, GitLab synchronization and physical duplicate-workspace archival concluded successfully.`

## Repository

The relevant GitLab repository is:

`https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis`

GitHub remains configured as a remote for historical continuity where reachable, but the verified migration push described here was made to GitLab.

Post-migration repository policy:

- GitHub is the primary source-of-truth repository and auditable public record where reachable.
- GitLab is the mirror and fallback continuity repository.
- Deployments are executed through provider CLIs/APIs, not through GitHub or GitLab as required intermediaries.
- Git hosts preserve source history and audit evidence; provider control planes prove deployment success.

GitHub account-status caveat:

- As of 2026-07-22, the GitHub suspension is under appeal with GitHub Support.
- GitHub Support ticket ID is `4589741`.
- GitHub Support requested that the appeal be continued from an email address verified on the affected GitHub account.
- The support email was forwarded to the verified GitHub account email address, and the follow-up reply was sent from that verified email.
- The appeal explains that the likely trigger may have been high-volume legitimate AI-assisted development activity around AXXESS, including frequent commits, pull requests, CI changes, Supabase/Vercel integrations, authentication work and mobile build preparation.
- The appeal states that no intentional spam, phishing, malware distribution, unauthorized access, deceptive automation or Terms of Service violation occurred.
- GitHub Support has taken up the appeal, and no contrary finding is documented in this repository at this time.
- A local screenshot of the suspension page is retained at `C:\Users\Sudipta Sarmah\Downloads\unnamed.png`.

## Why This Was Necessary

The development history included:

- A full Codex sprint sequence in the OneDrive workspace.
- A later Claude Code workspace in the Downloads folder.
- GitHub availability disruption that made GitHub-dependent workflows unreliable.
- A need to verify whether Sprint 1-35 style work had actually reached the GitLab repository.
- A need to avoid treating two local folders as competing sources of truth.

The migration therefore focused on three outcomes:

1. Preserve the complete product history.
2. Make the OneDrive folder the active engineering workspace.
3. Verify and push the unified state to GitLab without force-pushing or discarding work.

The migration also created a due-diligence record explaining why a previous check could report that Sprint 1-35 work was not visible in GitHub. The answer was caused by a split-workspace and GitHub-availability problem, not by a deliberate loss of sprint work. Sprint 1-32 existed in the Codex OneDrive workspace, while Sprint 33 and later existed in the Claude Downloads workspace until consolidation.

## Scope

The migration covered:

- Local workspace consolidation.
- Branch ancestry verification.
- GitLab synchronization.
- Removal of the temporary local remote used to import the old Claude workspace.
- Documentation governance updates.
- Physical archival of the old Downloads-based workspace.
- Verification of TypeScript, lint, test, build, Supabase and mobile release gates before the later QA remediation work began.

The migration did not:

- Redesign the AXXESS application UI.
- Rewrite application architecture.
- Delete the archived Claude workspace.
- Claim that every live provider path is production-verified.
- Claim that later uncommitted QA remediation work is complete.

## Safeguards

The migration used the following safeguards to protect repository integrity:

- The OneDrive AXXESS folder was treated as the canonical destination before cleanup.
- The old Claude folder was treated as a source/archive, not as a competing active workspace.
- Git history ancestry was checked before aligning branches.
- GitLab `main` was fast-forwarded rather than force-pushed.
- The temporary `downloads-local` remote was removed after migration.
- Existing configured remotes were preserved for continuity.
- Physical deduplication was not marked complete while Windows still held the old Claude folder open.
- The old Claude folder was archived rather than deleted, preserving a recovery path for due diligence.
- The completion status was only updated after the archive path existed and the original `Downloads\Claude` path no longer existed.
- Subsequent QA remediation changes were kept separate from the original migration verification status.

These safeguards are important for enterprise review because the migration touched source-of-truth controls rather than a single product feature.

## Migration Evidence

The following relationship was established during the migration:

- The Claude branch `fix/live-tenant-onboarding-and-rag-walkthrough` descended from Codex Sprint 32.
- The Codex Sprint 32 commit was confirmed as an ancestor of the Claude branch.
- GitLab `main` was confirmed to be fast-forwardable to the unified branch.
- No force-push was required.

The canonical branch created for the consolidated state was:

`canonical/sprint-1-35-unified-gitlab`

The final migration and hygiene commit before the documentation-governance follow-up was:

`615faf218fbfe538dcdcd1eb1a079ee05ad65b4b`

The later documentation-governance commit that records the canonical workspace policy is:

`df60399888d5d70936a05c1322eb0e9dee83521d`

At the end of the migration verification run, before the later documentation-governance follow-up, these GitLab branches pointed to the same final migration commit:

- `main`
- `canonical/sprint-1-35-unified-gitlab`
- `fix/live-tenant-onboarding-and-rag-walkthrough`

## Final GitLab Remote Verification

The final remote hash verification showed:

```text
615faf218fbfe538dcdcd1eb1a079ee05ad65b4b  refs/heads/canonical/sprint-1-35-unified-gitlab
615faf218fbfe538dcdcd1eb1a079ee05ad65b4b  refs/heads/fix/live-tenant-onboarding-and-rag-walkthrough
615faf218fbfe538dcdcd1eb1a079ee05ad65b4b  refs/heads/main
```

This means GitLab contained the unified work at the same migration commit across the relevant branches before subsequent documentation-only updates.

## Process Timeline

The migration followed this sequence:

1. Identified that active AXXESS work existed in two local folders.
2. Treated `C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS` as the intended canonical workspace.
3. Used the old Claude workspace as a temporary local source to bring later work into the canonical repository state.
4. Verified branch ancestry so Codex Sprint 1-32 work was not overwritten by later Claude work.
5. Confirmed that GitLab `main` could be safely aligned without force-pushing.
6. Pushed the unified state to GitLab.
7. Removed the temporary `downloads-local` remote so future work would not accidentally use the old folder as a source.
8. Ran the verification gates listed in this document.
9. Added documentation-governance standards for future sprints and due-diligence review.
10. Attempted physical archival of `C:\Users\Sudipta Sarmah\Downloads\Claude`.
11. Observed Windows folder-lock failures during initial archive attempts.
12. Confirmed remaining visible Claude processes and background Git helper processes.
13. Stopped only the relevant Claude and Git helper processes needed to release the folder lock.
14. Renamed the old folder to `C:\Users\Sudipta Sarmah\Downloads\Claude.migrated-archive-20260722`.
15. Verified that the original `Downloads\Claude` path no longer existed and the archive path existed.

## Physical Archive Verification

Final filesystem verification showed:

```text
SOURCE_EXISTS=False
ARCHIVE_EXISTS=True
```

The archive path verified was:

```text
C:\Users\Sudipta Sarmah\Downloads\Claude.migrated-archive-20260722
```

This means the duplicate local workspace is no longer present at its active path. It remains available only as a clearly named historical archive.

## Local Workspace State

The active canonical local workspace is:

`C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`

The final local status after push was clean:

```text
## canonical/sprint-1-35-unified-gitlab...gitlab/canonical/sprint-1-35-unified-gitlab
```

The temporary `downloads-local` Git remote was removed so the canonical workspace no longer depends on the old Claude folder as a remote source.

Remaining configured remotes were:

```text
gitlab  https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis.git
origin  https://github.com/axxess-triaxis/AXXESSTRIAXIS.git
```

## Verification Results

The unified workspace passed the following verification gates:

```text
pnpm run typecheck
pnpm --dir apps/mobile run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run supabase:verify
pnpm run mobile:store:release-gate
pnpm run mobile:capacitor:store:doctor
```

The full unit test suite result was:

```text
Test Files: 91 passed
Tests: 270 passed
```

The Supabase verification result was:

```text
status: passed
migrations: 27
createdTables: 100
rlsProtectedTables: 100
supabaseCli: 2.109.1
```

The production build completed successfully and generated the full Next.js route set.

## Database And Schema Verification

Supabase verification was included because the migration affected the repository source of truth for schema migrations, tenant-governance expectations and enterprise readiness documentation.

The verified Supabase migration posture was:

```text
status: passed
migrations: 27
createdTables: 100
rlsProtectedTables: 100
supabaseCli: 2.109.1
```

Schema governance implications:

- The migration preserved the Supabase migration directory.
- The migration preserved tenant-oriented schema history.
- The migration preserved RLS verification tooling.
- The migration did not apply new live Supabase migrations.
- The migration did not alter production database state.

Known schema caveat:

- `20260702165736_initial_enterprise_schema.sql` contains a permissive `using (true)` RLS predicate that verification flags for future hardening.

This caveat is not treated as a migration failure because the schema verifier still passed and all 100 created tables were detected as RLS protected. It remains a required future security-hardening item.

## Test And Build Evidence

The migration verification established that the consolidated repository could pass:

- TypeScript validation for the root app.
- TypeScript validation for the Expo mobile app.
- Lint checks.
- Unit and integration test suite.
- Production Next.js build.
- Supabase migration/RLS verification.
- Mobile store release gate.
- Capacitor store doctor gate.

The recorded test result was:

```text
Test Files: 91 passed
Tests: 270 passed
```

This evidence is important because the migration was not only a file move. It proved that the consolidated source tree could still typecheck, lint, test, build and pass schema/mobile readiness checks.

## Warnings

Two warnings remain documented:

- Next.js 16 reports that the `middleware` convention is deprecated in favor of `proxy`.
- Supabase migration verification reports that `20260702165736_initial_enterprise_schema.sql` contains a permissive `using (true)` RLS predicate.

These warnings did not block verification but should remain visible for future hardening.

Additional operational caveats:

- GitHub remains configured as `origin` for historical continuity, but GitLab is the verified continuity remote for this migration.
- The archived Claude folder should not be reopened as an active workspace.
- Future deployment, Supabase, Linear, Vercel and Capacitor work should use provider CLIs/APIs where practical instead of depending exclusively on GitHub state.
- QA remediation work started after the migration is a separate workstream and requires its own full verification before commit/deployment.

## Files Changed In Final Hygiene Commit

The final migration hygiene commit changed:

- `apps/mobile/src/env.d.ts`
- `apps/mobile/tsconfig.json`
- `eslint.config.mjs`
- `next-env.d.ts`
- `next.config.mjs`
- `tsconfig.json`
- `vitest.config.mjs`

The changes were limited to:

- Root TypeScript source-boundary hygiene
- Generated-directory lint/test exclusion hygiene
- Next.js 16 configuration normalization
- Expo mobile TypeScript 6 compatibility
- Scoped Expo public environment variable typing

No application UI redesign or feature rewrite was performed as part of this migration finalization.

## Status By Audience

### Technical Reviewers

The migration preserved the branch relationship, avoided force-pushes, ran the core verification suite and documented the remaining warnings.

### Investors

The repository now contains a unified, verified body of work covering the Codex sprint sequence and later Claude work. This supports assessment of execution velocity, repository maturity and disciplined AI-assisted engineering.

### Enterprise Buyers

The canonical workspace and GitLab state reduce operational ambiguity. Enterprise buyers reviewing the repository can trace development, quality gates, Supabase governance, mobile readiness and deployment-control documentation from one verified state.

### Due Diligence Teams

The migration record includes commit hashes, branch names, remote verification, commands run, test outcomes, changed files and remaining risks.

### Government And Sovereign Stakeholders

The record preserves auditability of the development workspace, source control state and governance verification. It records the physical duplicate-workspace archival and preserves the old workspace as a named archive rather than silently deleting evidence.

## Physical Deduplication Status

The old Claude workspace previously existed at:

`C:\Users\Sudipta Sarmah\Downloads\Claude`

It has now been archived to:

`C:\Users\Sudipta Sarmah\Downloads\Claude.migrated-archive-20260722`

Initial archive attempts were blocked because Windows reported that another process had the folder open. The operating system did not identify a precise locking handle through Restart Manager. The remaining visible Claude processes and background Git helper processes were stopped, after which the archive rename succeeded.

Therefore:

- Code migration to the canonical workspace is complete.
- GitLab repository synchronization is complete.
- Verification is complete.
- Physical duplicate-workspace deduplication is complete.

The active local workspace is now the OneDrive AXXESS workspace only. The old Downloads-based Claude workspace is retained as an archive for historical recovery, not as an active development source.

## Completion Criteria

This migration is marked fully complete because all of the following are true:

- `C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS` remains the active workspace.
- GitLab `main` was verified at the unified migration commit during the migration run.
- Verification gates passed during the migration run.
- `C:\Users\Sudipta Sarmah\Downloads\Claude` has been archived or removed after confirming no unmerged work remains.

Current status:

`Complete: canonical workspace migration, GitLab synchronization and physical duplicate-workspace archival concluded successfully.`

## Post-Migration Work Separation

After the migration was completed, a separate beta QA remediation workstream began. That workstream includes auth-shell hardening, demo/live fallback gating and route correction work documented in:

`docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`

That remediation is intentionally not merged into the migration completion claim. It requires its own full verification, commit, deployment and beta re-test.

## Final Governance Statement

For future Codex, Claude Code, Cursor or manual engineering work:

- The OneDrive AXXESS folder is the only active local workspace.
- The archived Claude folder is historical evidence only.
- GitLab is the verified continuity repository for this migration.
- GitHub may remain as a mirror or historical remote where available.
- Documentation must preserve evidence for technical, investor, enterprise, due-diligence and regulated-sector review.
