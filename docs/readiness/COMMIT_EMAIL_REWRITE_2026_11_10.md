# Commit Email Rewrite (2026-11-10)

**Status: done on GitHub for all 11 `axxess-triaxis` repos. Every commit on every default branch is now credited to the `axxess-triaxis` account.**

## External signal

The founder's GitHub profile stats card showed the wrong commit count and grade, and CodersRank had the same problem. The founder asked to "scrape off that old email and change all commits to new one", for all 11 repos, "with extreme caution".

## Cause

From 2026-07-02 to 2026-11-09, commits were authored as `noreply@triaxis.ventures`, an address set in each repo's local git config.

- **No account:** the domain `triaxis.ventures` has no DNS records, so the address could never be verified. GitHub linked those commits to no account (checked on a commit: `author` was null).
- **Scale:** 1,413 AXXESSTRIAXIS commits used it, out of 2,608 across all refs.
- **Effect:** the stats card counted 540 commits, while GitHub's own contribution count for the year was 858. Both left out these commits.

## Decision

1. **Commit email going forward:** `298995581+axxess-triaxis@users.noreply.github.com`. It's set in the global git config and in every repo under `C:\Users\Sudipta Sarmah\code`, 22 repos in all.
2. **Rewritten history:** the old email was replaced with that address in all 11 repos. Only the author and committer email changed. Names, dates, messages and file contents did not.

## How

- **Backups:** full mirrors and verified bundles of all 11 repos are in `C:\Users\Sudipta Sarmah\git-backups\2026-11-10-email-rewrite`. They're kept outside the repo.
- **Rewrite:** `git filter-repo --mailmap` ran on copies of the mirrors, with this one mailmap line: `<298995581+axxess-triaxis@users.noreply.github.com> <noreply@triaxis.ventures>`.
- **Push:** every ref was pushed with `--force-with-lease` against the backed-up hash, after checking that GitHub still matched the backup.

## Verification (all 11 repos)

- **Commit by commit:** the tree, author name and date, and committer name and date are identical to the original. No commit was dropped, and no old email remains.
- **Every branch and tag** (221 refs): the commit count, merge count and tip tree are identical. AXXESSTRIAXIS `main` keeps 1,271 commits.
- **On GitHub after the push:** the last 100 commits on each default branch include 0 with the old email. AXXESSTRIAXIS shows 73 of 100 credited to `axxess-triaxis`; the rest are Dependabot, bots, or the founder's Gmail.
- **Open PRs:** port4lleo #15 and #16, and AXXESSTRIAXIS #441, had the same merge conflicts before the rewrite as after. AXXESSTRIAXIS #473 is back to 1 commit and 3 files.
- **Production:** landing returns 200, investor and lite return their usual 307, and the MCP endpoint returns its usual 405 to a GET.

## Side effects

- **Signatures removed:** GitHub's "Verified" signatures were removed from 603 AXXESSTRIAXIS commits and 84 in the other repos. A rewritten commit can't keep GitHub's signature.
- **Message references updated:** 65 AXXESSTRIAXIS commit messages that mentioned a hash now mention the new hash, and 3 messages in other repos.
- **Duplicates merged:** 223 AXXESSTRIAXIS commits that existed twice, once signed and once not, became one each. They were reachable only from GitHub's read-only PR refs, so no branch lost anything.
- **Production deploy skipped:** the deploy for the new `main` (run 42809355486) failed with Vercel's daily limit (`api-deployments-free-per-day`). Production still serves its previous build, which has the same code.
- **Ruleset paused:** the "Main Protection Ruleset" blocks force-pushes on `main`. The founder disabled it for the `main` push and then re-enables it.

## Not rewritten

- **AXXESSTRIAXIS branches left on old history:** 120 branches already merged into `main`. Their commits are in `main` under new hashes.
- **AXXESSTRIAXIS tag:** `v0.5.0-beta` was left on the old history. Pushing a rewritten `v*` tag would start the mobile release workflow.
- **Local branches left on old history:** 15 local-only AXXESSTRIAXIS branches that were never on GitHub.
- **Old email still visible:** GitHub keeps the original commits under each merged PR's read-only refs, so the old email remains visible there. GitHub doesn't count those refs toward contributions.

## Tracing old hashes (evidence chain)

144 docs under `docs/` cite commit hashes from before the rewrite. They were not edited, because they record what was true when they were written.

- **On GitHub:** tag `archive/pre-email-rewrite-2026-11-10` points at the old `main` (`f7faff3`), so every old `main` hash still opens on GitHub.
- **Mapping:** [`COMMIT_HASH_MAP_2026_11_10.tsv`](COMMIT_HASH_MAP_2026_11_10.tsv) maps every old `main` commit to its new hash, 1,271 rows. For example, `f7faff3` (PR #472 merge) is now `3a903a1`.
- **Other repos:** their maps are in each work mirror's `filter-repo/commit-map` inside the backup folder.

## Still open

- **Counts not yet observed:** the profile card and CodersRank haven't been checked yet. The card regenerates daily at 01:00 UTC, and CodersRank rescans on its own schedule.
- **Private work:** `README_STATS_TOKEN` in the profile repo has no scopes, so private work still isn't counted. The founder needs to give it the `repo` and `read:user` scopes.
- **Production redeploy:** it can be retried once Vercel's limit resets. It isn't required, because the code is unchanged.

## Decision ledger

```
Decision: Rewrite the unverifiable commit email in all 11 axxess-triaxis repos to the account's GitHub noreply address.
Why: noreply@triaxis.ventures belongs to no account and its domain does not exist, so 1,413+ commits were uncredited on GitHub and CodersRank.
What changed: Author and committer email only, on every pushed branch; history hashes changed; see "How" and "Not rewritten".
Architecture boundary: No code or file content changed; trees identical commit by commit.
Product boundary: None; production serves the same code.
Verification: See "Verification".
Outcome: Default branches show 0 old-email commits and credit axxess-triaxis. Review the profile card after the next 01:00 UTC run.
Follow-up: Founder re-enables the ruleset and scopes README_STATS_TOKEN; retry the production deploy after the Vercel limit resets.
```
