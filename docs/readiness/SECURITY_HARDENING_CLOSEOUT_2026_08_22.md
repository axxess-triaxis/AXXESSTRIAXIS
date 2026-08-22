# Security Hardening (SecOps) -- Closeout (2026-08-22)

PR: [#292](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/292), branch `security/pnpm-overrides-audit-fixes` -> `main`. Merged 2026-08-22 09:28 UTC. Plus one repo-settings change (no PR -- see Tasks executed).

## Operation

Founder requested a plan to harden AXXESS's own platform security posture and evidence trail,
specifically to withstand security due diligence when sold into "emerging corp environments"
(scaling/institutional customers doing vendor security review) -- not a customer-facing SecOps
product feature. Investigation (Explore agent + direct `pnpm audit`/`gh api` verification) found the
underlying security engineering already real and substantial: application-layer tenant isolation,
a hash-chained audit log, an 8-tier enterprise RBAC model, a real DSAR/privacy execution engine, and
blocking CI security gates (CodeQL, Gitleaks, pnpm critical-vuln audit). The actual gap was that the
evidence trail undersold or misrepresented that work, plus a handful of concrete, checkable items
were genuinely open. This closeout covers the three items acted on this pass.

## Objectives

1. Enable GitHub's native secret scanning and push protection on this public repo, independent of
   the existing CI-based Gitleaks job.
2. Fix as many of the 22 open `pnpm audit` findings as can be safely and correctly fixed via
   `pnpm.overrides`, without breaking the build.
3. Rewrite `SECURITY.md`'s "Security Architecture Status" section, which described a pre-launch,
   unconnected state directly contradicting the real, live implementation.

## Constraints (founder-set, locked in during planning)

- Scope is AXXESS's own platform hardening for sales credibility, not a customer-facing product
  feature -- confirmed explicitly via `AskUserQuestion` before any work started.
- Do not touch the founder's existing 2026-08-03 "SOC2/ISO27001/HIPAA acknowledged, not scheduled"
  decision (`docs/readiness/COMPLIANCE_CERTIFICATION_AND_INVESTOR_FEEDBACK_ROADMAP_2026_08_03.md`) --
  respected, not reopened.
- Do not add a new external vendor dependency (e.g. Upstash for rate limiting) without a separate,
  explicit founder go-ahead -- named as backlog instead of built.
- Do not fabricate a fix for a finding that cannot actually be fixed (see `image-size` below) --
  document the honest gap instead.

## Tasks executed

1. **GitHub native secret scanning + push protection enabled.** `gh api --method PATCH
   repos/axxess-triaxis/AXXESSTRIAXIS` with `security_and_analysis[secret_scanning][status]=enabled`
   and `security_and_analysis[secret_scanning_push_protection][status]=enabled`. Repo setting, not a
   code change -- took effect immediately, no PR. Confirmed via `gh api
   repos/axxess-triaxis/AXXESSTRIAXIS --jq .security_and_analysis` showing both `status: "enabled"`.
   Independent of and in addition to the existing CI-based Gitleaks job
   (`.github/workflows/security.yml`).
2. **20 of 22 `pnpm audit` findings fixed** via `pnpm-workspace.yaml` overrides, following this
   repo's existing convention (Dependabot-alert-cited where an alert number exists, range-qualified
   where multiple resolutions of the same package coexist). Ground-truthed via `pnpm audit --json`
   and `gh api repos/.../dependabot/alerts` (alert numbers 51, 52, 58, 60, 62, 63, 85, 86, 87, 88, 93,
   94, 95 -- 13 alerts map to the 22 raw findings, some advisories affecting multiple resolved
   versions of the same package). Packages touched: `path-to-regexp`, `undici`, `ajv`, `smol-toml`,
   `@tootallnate/once`, `postcss`, `nanoid`. All are transitive (via `vercel` CLI's own bundled
   dependency tree, `next`'s `postcss`/`nanoid` chain, or `expo`/`metro` mobile build tooling) -- none
   are direct runtime dependencies of the deployed app.
   - Two existing overrides had gone **stale**, not just needed extending: `postcss` was pinned at
     8.5.18 for Dependabot #77 (an older advisory), but a newer "incomplete fix" advisory (#85,
     GHSA-fxqj-rqcc-2cmp) affects 8.5.18 too -- bumped to 8.5.23. `undici` was forced to exactly
     5.29.0 for #44/#45, but 5.29.0 itself is vulnerable to 8 newer advisories -- added a second
     range (`>=5.29.0 <6.28.0` -> `6.28.0`) to close the gap the first override left open.
   - `path-to-regexp` needed an exact-version target (`8.4.2`), not an open-ended range target
     (`>=8.4.0`) -- the range-target form left one nested resolution (`8.3.0`, via the Vercel CLI's
     dependency tree) unaffected for reasons not fully root-caused; the exact pin resolved it and was
     verified to work.
3. **`SECURITY.md` rewritten.** The "Security Architecture Status" section previously read
   "Authentication: architecture prepared, not connected," "RBAC: mock route guard architecture in
   place," and "Supabase RLS: draft migration prepared" -- all false as of this investigation. Replaced
   with an accurate description, citing exact source files, of what's actually implemented: real
   Supabase Auth (`src/auth/`), an 8-tier enterprise RBAC model (`src/security/enterpriseIam.ts`),
   defense-in-depth tenant isolation (Postgres RLS plus an independent application-layer guard,
   `src/security/tenantGuard.ts`), a hash-chained tamper-evident audit log
   (`src/security/auditIntegrity.ts`), and a real DSAR/privacy execution engine
   (`src/privacy/privacyEngine.ts`). A new "Known, honest gaps" section lists what is genuinely not
   yet built (see Tasks that did not clear) rather than omitting it -- a security document that only
   lists strengths reads as marketing, not evidence.

## Tasks that did not clear

- **`image-size` (Dependabot #93/#94, 2 high-severity findings): not fixed.** The advisories claim a
  fix in version 2.0.3. Directly verified via `pnpm view image-size versions` and `pnpm view
  image-size dist-tags` that 2.0.2 is the latest version actually published to npm as of 2026-08-22 --
  2.0.3 does not exist under any dist-tag. Attempting to override to a nonexistent version breaks
  `pnpm install` outright (confirmed by testing it -- `ERR_PNPM_NO_MATCHING_VERSION`). Left
  unoverridden and documented honestly in both `pnpm-workspace.yaml` and `SECURITY.md`'s known-gaps
  list, rather than faked or silently dropped. Transitive via `metro` (Expo mobile build tooling),
  not part of the deployed web app's runtime. Re-check once npm actually publishes the fix.
- **Rate limiting** on auth/AI-query endpoints -- confirmed via code search that none exists anywhere
  in `src/`. Real gap, but the standard low-cost fix (Upstash Redis + Vercel Edge Middleware) means
  adding a new external vendor dependency/account, which this pass's constraints explicitly required
  a separate founder go-ahead for before starting. Not started.
- **Real TOTP/MFA implementation** behind the `twoFactorAuthEnabled: true` flag
  (`packages/shared/src/index.ts`) -- confirmed this is a compliance-mapping capability flag with no
  wired challenge flow in `src/auth/` (only an `auth.mfa.challenge` audit-log action *type* exists,
  not an implementation). Supabase Auth has built-in MFA/TOTP APIs that could likely be wired in
  without building crypto from scratch, but this is real scoped work, not bundled into this pass.
- **Flipping the "Security Isolation Tests" CI job from `continue-on-error: true` to required** --
  the founder already intended this per the 2026-08-11 sprint closeout, but it needs the underlying
  test suite's reliability re-confirmed first, independent of the two already-known unrelated CI
  flakes (Vitest worker crash, Playwright golden-path failure). Not re-confirmed this pass.
- **Why `dependency-review` is `continue-on-error: true`** -- the workflow's own comment attributes
  this to GitHub's Dependency Graph being disabled in repo settings, but `gh api
  repos/.../vulnerability-alerts` returning 204 (enabled) and `dependabot_security_updates: enabled`
  both imply the Dependency Graph prerequisite is actually already satisfied. This discrepancy was
  noticed but not investigated further this pass -- worth a dedicated look before assuming the
  stated reason is still accurate.
- **Formal, written incident-response plan** -- does not exist. Pure documentation work, reasonable
  next step, not started this pass.
- **SOC 2 / ISO 27001 / HIPAA certification, third-party penetration test** -- explicitly out of
  scope per this pass's own constraints (see above); the founder's 2026-08-03 deferral decision
  stands unchanged.

## What claim is still unsupported

- The exact reason `path-to-regexp@8.3.0`'s resolution didn't respond to a range-qualified override
  target the same way five other packages in this same change did is not fully root-caused -- an
  exact-version target worked and was verified, but *why* the range-target form specifically failed
  for this one package remains an open question, not a confirmed mechanism. Flagging this rather than
  asserting a root cause I didn't actually verify.
- Whether GitHub's Dependency Graph is actually enabled (see "Tasks that did not clear" above) is
  inferred from indirect evidence (Dependabot alerts working), not confirmed via a direct settings
  read -- `gh api` does not expose a direct "dependency graph enabled" boolean the way it does for
  secret scanning.

## Verification (exact commands, exact results)

- `pnpm audit` (full, prod + dev): **22 findings (8 high, 11 moderate, 3 low) -> 2 findings (2 high,
  both `image-size`, documented above as currently unfixable).**
- `gh api repos/axxess-triaxis/AXXESSTRIAXIS/dependabot/alerts --paginate` (before fix): 13 open
  alerts (#51, #52, #58, #60, #62, #63, #85, #86, #87, #88, #93, #94, #95) confirmed matching the
  `pnpm audit` findings, modulo the count/dedup difference between GitHub's alert grouping and npm's
  raw advisory-per-path counting.
- `gh api repos/axxess-triaxis/AXXESSTRIAXIS --jq .security_and_analysis` (after the settings
  change): `secret_scanning.status: "enabled"`, `secret_scanning_push_protection.status: "enabled"`.
- `pnpm run typecheck` -- 0 errors.
- `pnpm --dir apps/mobile run typecheck` -- 0 errors.
- `pnpm run lint` -- 0 warnings.
- `pnpm run build` -- clean, full route table compiled.
- Lockfile diff (`git diff pnpm-lock.yaml`) manually reviewed line-by-line to confirm only the 7
  intended override packages changed resolution -- no unrelated dependency drift.
- CI on PR #292: every check passed except the two already-known, already-confirmed-unrelated
  pre-existing flakes (`Build, Lint, Type Check` -- Vitest worker-startup crash; `Sprint 27/29 Pilot
  Acceptance Gate` -- Playwright `expect(locator).toBeVisible()` failure) and a `validate` job
  (Lite-area test runner) that hit the identical Vitest worker-crash signature under a different job
  name -- confirmed via reading its failure log directly before treating it as the same known issue,
  not assumed. All Vercel preview deploys, CodeQL, Secret Scan, dependency-review, pnpm Critical
  Vulnerability Gate, RLS artifact check, mobile-validate, Lite/X0 mobile boundary guard, Required
  RAG Release Gate, and Supabase static-verify checks passed.

## Exact files changed

- `pnpm-workspace.yaml` -- 7 new/updated override entries under `overrides:`, plus one documented
  non-fix (`image-size`, left un-overridden with an explanatory comment).
- `pnpm-lock.yaml` -- regenerated, diff-reviewed to confirm scope.
- `SECURITY.md` -- "Security Architecture Status" section fully rewritten; new "Known, honest gaps"
  section added.
- Repo settings (`security_and_analysis`, via `gh api`, no file) -- secret scanning + push
  protection.

## Actionables created / follow-up

All named in "Tasks that did not clear" above. Not yet formalized as `ACTIONABLES_READINESS_MATRIX.md`
rows -- if this program wants standing tracking for these (rate limiting, real MFA, CI-gate
promotion, dependency-review investigation, incident-response doc), that's a small follow-up to add
them there under a Security and Compliance category, not done as part of this closeout.

## Outcome

Enabled GitHub secret scanning + push protection (live, confirmed). Fixed 20 of 22 open `pnpm audit`
findings (91%), with the remaining 2 honestly documented as currently unfixable rather than faked.
Corrected `SECURITY.md` from actively misrepresenting the platform's security posture to accurately
describing it, including its real gaps. Full standard verification suite green; CI on the shipping PR
showed no new or unexplained failures beyond already-confirmed pre-existing flakes. The larger,
still-open items (rate limiting, real MFA, formal cert path) remain named and sequenced, not silently
dropped, consistent with this repo's evidence-chain discipline.
