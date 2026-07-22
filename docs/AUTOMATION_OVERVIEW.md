# Automation Overview: CLI + GitLab + Local

## Purpose

This is the single consolidated reference for every automated check in this repository as of 2026-07-22: what runs automatically, on what trigger, what it actually verifies, where it runs, and -- just as important -- what still requires a human or an agent to do it by hand. It exists so no one has to reconstruct this picture from commit history or chat transcripts.

Three automation surfaces exist. They are independent of each other by design (see `docs/GITLAB_MIRROR.md` and `docs/GITHUB_INDEPENDENT_OPERATIONS.md` for why: this project has already had a Git host go down mid-project, so no single mechanism here depends on any other one being up):

1. **GitHub Actions** (`.github/workflows/`) -- exists, currently **cannot run** (GitHub account suspended).
2. **GitLab CI** (`.gitlab-ci.yml`) -- runs on GitLab.com's shared runners.
3. **Local Windows Scheduled Task** (`scripts/post-sprint-verify-and-preview-deploy.ps1`) -- runs on this machine, independent of any Git host.

Plus **GitLab Duo Code Review** -- a native GitLab AI feature for merge-request review, separate from all three CI/script mechanisms above.

## At-A-Glance Matrix

| Mechanism | Runs where | Trigger | Currently active? |
|---|---|---|---|
| GitHub Actions (12 workflows) | GitHub-hosted runners | push / PR to GitHub | **No** -- GitHub account suspended, cannot execute |
| GitLab CI `quality` job | GitLab.com shared runner | every MR, push to `main`/`staging`/`dev`, push to `canonical/sprint-1-35-unified-gitlab` | Yes |
| GitLab CI `supabase-verify` job | GitLab.com shared runner | MR/`main` push, only if `supabase/**` or migration-verifier files changed | Yes |
| GitLab CI `pnpm-audit` job | GitLab.com shared runner | every MR, push to `main`, push to `canonical/sprint-1-35-unified-gitlab` | Yes |
| GitLab CI SAST + Secret Detection | GitLab.com shared runner (GitLab template) | every pipeline run | Yes |
| GitLab Duo Code Review | GitLab-hosted (Duo Agent Platform) | merge request opened/updated | **Setup steps documented, enablement not yet confirmed** -- see `docs/GITLAB_MIRROR.md` |
| Local Scheduled Task (verify + preview deploy) | This developer's Windows machine | every 2 hours | Yes |
| Actual `git commit` / `git push` | Wherever Claude Code or a human runs it | end of each sprint, manually invoked | **Not automatic** -- see below |
| Live Vercel production deploy | N/A | N/A | **Never automatic** -- explicitly out of scope everywhere |
| Live Supabase migration push (`db push`) | N/A | N/A | **Never automatic** -- explicitly out of scope everywhere |

## What IS Automated

### 1. GitHub Actions -- exists, but cannot run

`.github/workflows/` has 12 defined workflows: `Repository Quality` (typecheck/lint/test/build), `Security Gates`, `Supabase CLI Integration`, `Supabase RLS Persona Tests`, `Playwright E2E`, `RAG Release Gate`, `Pilot Golden Path Release Gate`, and five mobile workflows (`Capacitor Mobile Build`, `Capacitor Mobile Release`, `Mobile EAS Production Build Proof`, `Mobile Store Release Readiness`, `Mobile Validate`, `Mobile Visual Regression`). These are real, checked-in, and would run on every push/PR to GitHub -- **but the GitHub account (`axxess-triaxis`) is currently suspended** (confirmed via `git ls-remote` returning `403: Your account is suspended` and `gh auth status` reporting an invalid keyring token), so none of them can execute right now. Do not assume any GitHub-side check ran on recent work -- it did not. See `docs/GITLAB_MIRROR.md` for the appeal status.

### 2. GitLab CI (`.gitlab-ci.yml`)

Three stages, in order: `quality` -> `supabase` -> `security`.

```text
quality          pnpm run typecheck / lint / test / release:preflight / build
supabase-verify  pnpm run supabase:verify (only when supabase/** or related files changed)
pnpm-audit       pnpm audit --prod --audit-level critical
(template jobs)  GitLab SAST + Secret-Detection (GitLab-maintained templates, no custom config)
```

Triggers: every merge request, every push to `main`/`staging`/`dev`, and (as of 2026-07-22) every push to `canonical/sprint-1-35-unified-gitlab` specifically -- this last one closes a gap where a long-lived sprint branch could accumulate many commits with zero automatic verification until someone opened an MR. To extend this to a future sprint branch, add one `if: '$CI_COMMIT_BRANCH == "<branch-name>"'` line each to the `quality` and `pnpm-audit` job rules (see the comment in `.gitlab-ci.yml` itself).

This is a genuine CI gate: it fails the pipeline (visible in GitLab's UI, blocks a clean MR merge indicator) if any check fails. It does **not** deploy anything and does **not** touch Supabase migrations beyond the read-only verifier script.

### 3. GitLab Duo Code Review (native, not a custom script)

GitLab's own Duo Agent Platform "Code Review" foundational flow. A custom `ai-code-review` CI job calling the Anthropic API directly was built and then deliberately removed the same day, once it became clear GitLab Duo access was the intended path rather than manually managing a `GITLAB_MR_BOT_TOKEN`/`ANTHROPIC_API_KEY` pair. To enable it (group `Triaxis Ventures Private Limited-group`, requires accepting GitLab's Duo AI Terms): Group -> Settings -> GitLab Duo -> Configuration -> turn on **GitLab Duo Agent Platform access**, then under Flows turn on **Allow flow execution**, **Allow foundational flows**, and confirm **Code Review** is enabled. **As of this writing, these toggles were walked through in chat but final enablement was not independently re-confirmed** -- check Group Settings -> GitLab Duo -> Configuration directly rather than assuming this is live. When active, it comments on merge requests automatically; it is additive (does not block merging) and is not a substitute for human review.

### 4. Local Windows Scheduled Task (git-host-independent)

`scripts/post-sprint-verify-and-preview-deploy.ps1`, registered as Windows Task Scheduler entry `AXXESS-PostSprint-VerifyAndPreviewDeploy`, every 2 hours, on this machine only.

What it does, in order:

1. `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run supabase:verify` -- stops immediately if any of these fail.
2. **Only if every check above passed**: `vercel deploy --yes` (always a **preview** deploy -- the script never passes `--prod` and never will) and a final `pnpm run supabase:verify` (read-only check, never `db push`).
3. Logs a timestamped summary to `.cache/post-sprint-automation/<timestamp>.log` (gitignored, local-only).

This is the only mechanism in this project that runs regardless of GitHub or GitLab availability -- it never fetches, pulls, or pushes any git remote, and uses already-authenticated local Vercel/Supabase CLIs. See `docs/LOCAL_AUTOMATION.md` for full detail, safety boundaries, and how to inspect/change it.

## What Is NOT Automated

Be precise about this list -- it is the part most likely to be silently assumed otherwise:

- **Committing and pushing code.** Every commit and push in this project so far (Sprint 1, Sprint 2, the CI/automation work itself) was triggered explicitly, once per sprint, by Claude Code following the sprint prompt's own commit instructions. There is no mechanism that commits code on its own initiative.
- **Production Vercel deploys.** No mechanism anywhere in this repository ever runs `vercel --prod` automatically. Promoting a preview to production is a manual, human-triggered action.
- **Live Supabase migration pushes.** No mechanism ever runs `supabase db push --linked` (or equivalent) automatically. `scripts/supabase-migrate-remote.mjs` exists for this and always dry-runs first, requiring an explicit `--yes` from a human; nothing calls it on a schedule or a trigger.
- **GitHub-side checks.** All 12 GitHub Actions workflows are inert while the account is suspended. Do not treat a lack of visible GitHub Actions failure as evidence anything passed -- it never ran.
- **Live beta QA replay.** Nothing re-runs the original Claude Code QA golden path against `beta.triaxisventures.com` automatically. That is explicitly Sprint 5 scope in `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md` and remains a manual, human/agent-triggered exercise.
- **Two-tenant isolation testing against real data.** Repository-level unit tests (added in Sprint 2) prove the query/mutation logic scopes correctly in isolation; nothing automatically provisions two real tenants and checks live cross-tenant access on a schedule.
- **Mobile app store submission.** `mobile:store:release-gate` and `mobile:capacitor:store:doctor` verify *readiness* (metadata, config, signing setup); nothing automatically submits a build to the Apple App Store or Google Play.
- **Documentation updates.** Every doc update in this project (including this one) was written by Claude Code as part of a sprint's explicit documentation requirements -- nothing regenerates or maintains docs automatically.
- **Secret/token rotation.** `GITLAB_MR_BOT_TOKEN` (now unused after the pivot to GitLab Duo), Vercel auth, and Supabase keys all have human-set expirations; nothing rotates or renews them automatically. If GitLab Duo Code Review's own service-side credentials expire or need reconfiguration, that is also a manual GitLab-side action.
- **Mobile visual regression / E2E / RAG / pilot-golden-path gates.** These exist as GitHub Actions workflows only (`Mobile Visual Regression`, `Playwright E2E`, `RAG Release Gate`, `Pilot Golden Path Release Gate`) and have **no GitLab CI equivalent yet** -- they are inert along with the rest of GitHub Actions. If these checks matter before a release, they currently require someone to run the underlying scripts locally.

## Who Tests What (Ownership)

| Check | Runs automatically? | If not, who runs it |
|---|---|---|
| typecheck / lint / unit-test / build | Yes -- GitLab CI (on push/MR) and local scheduled task (every 2h) | N/A |
| Supabase migration/RLS static verification | Yes -- GitLab CI (path-gated) and local scheduled task (every run) | N/A |
| `pnpm audit` (critical vulnerabilities) | Yes -- GitLab CI only | N/A |
| SAST / secret scanning | Yes -- GitLab CI (GitLab templates) | N/A |
| MR code review (AI) | Pending confirmation -- GitLab Duo, once enabled | Until confirmed: a human reviewer, or Claude Code via `/code-review` |
| Vercel preview deploy | Yes -- local scheduled task, every 2h, only after a full local pass | N/A |
| Vercel **production** deploy | No | A human, using the Vercel CLI/dashboard directly |
| Supabase migration apply to live DB | No | A human, using `scripts/supabase-migrate-remote.mjs` after reviewing the dry run |
| Live beta QA replay | No | Claude Code, manually invoked per the 5-sprint remediation plan (Sprint 5) |
| Two-tenant live isolation check | No | A human or agent manually provisioning two tenants and testing (Sprint 2 unit tests only cover the query-logic layer) |
| Mobile store submission | No | A human, via the store console, after `mobile:store:release-gate` passes |
| Playwright E2E / RAG / pilot-golden-path / mobile visual regression | No (GitHub Actions only, GitHub is down) | Whoever needs the signal must run the underlying script locally until a GitLab equivalent exists or GitHub is restored |
| Git commit/push | No | Claude Code or a human, once per sprint/change, as explicitly instructed |
| Documentation updates | No | Claude Code, as part of each sprint's explicit documentation checklist |

## Known Gaps And Risks

- GitHub Actions coverage (12 workflows, including Playwright E2E, RAG release gate, pilot golden-path gate, and mobile visual regression) has **no GitLab equivalent**. If GitHub's suspension is not resolved, these checks have no automated home at all right now.
- GitLab Duo Code Review's enablement was walked through step-by-step in chat but not independently re-verified as actually toggled on -- treat it as "documented, not confirmed" until checked directly in GitLab Group Settings.
- The local Windows Scheduled Task only runs while this specific machine exists and (per its `Interactive` logon type) generally while a user session is active on it -- it is not a cloud-hosted, always-on mechanism. If this machine is offline, nothing runs.
- No mechanism here alerts a human when a scheduled run fails -- the local task logs to a local file (`.cache/post-sprint-automation/`) that must be checked manually; GitLab CI failures are visible in GitLab's UI but nothing pages anyone.

## Related Documents

- `docs/GITLAB_MIRROR.md` -- GitLab CI pipeline detail, GitLab Duo Code Review setup steps, GitHub suspension/appeal status.
- `docs/LOCAL_AUTOMATION.md` -- full detail on the local scheduled task: safety boundaries, how to inspect/change/run it on demand.
- `docs/GITHUB_INDEPENDENT_OPERATIONS.md` -- the broader policy of not depending on any single Git host.
- `docs/SUPABASE_CLI.md` -- the Supabase CLI commands referenced above, including the dry-run-first migration apply workflow.
- `docs/SPRINT_LOG.md` -- when each piece of this automation was added and why.
