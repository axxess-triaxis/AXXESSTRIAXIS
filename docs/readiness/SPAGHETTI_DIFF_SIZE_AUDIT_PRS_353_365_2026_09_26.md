# Spaghetti Audit — Diff Size vs Claimed Change, Last 10 Merged PRs

> **Point-in-time snapshot.** Written 2026-09-26, covering the last 10 merged PRs as of #365 (#353-#365 range) only. Not refreshed
> for PRs #366 onward; do not read its ratios as describing the repository's current process.

**Methodology:** For each PR the merge diff was measured (`git diff <parent> <merge>`). Diff size was
compared against what the PR title/commit body claims to do. Flags are raised where: (a) files
touched are not required by the stated change; (b) lines added substantially exceed what the
operation needs; (c) new code re-implements something already present; or (d) a single-package
dependency change drags unrelated packages into the lockfile.

---

## Quick Reference Table

| PR | Title (claimed change) | Files changed | Lines +/− | Flag? |
|----|------------------------|:---:|:---:|:---:|
| #365 | docs: close ledger #72 (1-line status update) | 1 | +1/−1 | — |
| #364 | docs: ledger #72 narrative (+10 lines to existing doc) | 1 | +10/0 | — |
| #363 | fix: darwin arch + fatal failure for icon gen | 3 | +60/−5 | ⚠ minor |
| #362 | fix: generate real iOS icon instead of Capacitor default | 5 | ~+510/−5 | 🚩 flagged |
| #361 | deps: bump react-resizable-panels 4.12.2→4.12.3 | 2 | +2/−2 | — |
| #360 | deps: bump actions/setup-java 5→6 | 1 | +1/−1 | — |
| #359 | deps: bump @capacitor/android 7.6.7→8.5.0 | 3 | +10/−10 | — |
| #357 | deps: bump mixpanel-browser 2.81.0→2.82.1 | 2 | +19/−19 | — |
| #356 | deps: bump tailwindcss 4.1.12→4.3.3 | 2 | +3/−8 | — |
| #353 | deps: bump input-otp 1.4.2→1.5.0 | 2 | +47/−28 | ⚠ minor |

---

## Detailed Findings

### ✅ #365 — `docs(readiness): close ledger #72`

**Claimed:** Mark ledger item #72 as fully resolved (build 3 submitted to App Store).
**Actual diff:** 1 file, 1 line changed (`FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md`: status word
updated).
**Verdict:** Proportionate. Nothing inflated.

---

### ✅ #364 — `docs(readiness): ledger #72 — iOS icon saga narrative`

**Claimed:** Document the full episode (wasted review cycle, root cause, real fix, HITL step
remaining).
**Actual diff:** 1 file, 10 lines added to an existing ledger section.
**Verdict:** Proportionate. The commit body is long but the file touch is minimal and correct.

---

### ⚠️ #363 — `fix(mobile): darwin architecture support for sharp + fatal icon-gen failures`

**Claimed:** Two specific fixes — (1) add `darwin` to `pnpm-workspace.yaml` so sharp's
darwin-arm64 binary gets resolved, and (2) make `generateIosAppIcon()` throw instead of warn on
failure.

**Actual diff:** 3 files, 60 lines added / 5 removed.

- **`pnpm-workspace.yaml` (+13 lines):** The one-line functional change (`- darwin`) is accompanied
  by 11 lines of inline comments explaining _why_ darwin was missing. The comment is accurate and
  not misleading, but it inflates the diff of what is genuinely a 1-line config fix by 11×.
- **`scripts/apply-capacitor-store-config.mjs` (+20/−5 lines):** The fix itself — changing
  `console.warn + return` to `throw new Error` and restructuring the `finally` block to happen only
  on success — is a real, correct change. The surrounding comment block explaining the wasted
  review cycle adds ~10 lines of prose to a 15-line functional change.
- **`scripts/apply-capacitor-store-config.test.mjs` (+32 lines):** Two new `describe` blocks
  verifying the `throw` behaviour and the `pnpm-workspace.yaml` darwin entry. These are additive
  tests on code introduced in the prior PR (#362), not coverage of pre-existing logic, so the file
  was already new to this codebase. No duplication with existing test files.

**What is inflated:** Nothing is architecturally inflated or duplicating existing logic. The
concern is prose inflation — the inline comments in `pnpm-workspace.yaml` and in the `.mjs` catch
block are longer than the code they annotate. The comment-to-code ratio inside `generateIosAppIcon`
across these two PRs is ~34 comment lines to ~38 code lines (47%). This is high but not
incoherent: the comments are post-incident forensics that substitute for a separate ADR/doc, and
the codebase elsewhere (e.g. `build-ios.test.mjs`) follows the same narrative-comment-as-test-
rationale pattern, so it is internally consistent. **Minor flag only.**

---

### 🚩 #362 — `fix(mobile): generate the real AXXESS icon for iOS instead of Capacitor's default`

**Claimed:** Add `@capacitor/assets`, wire its `generate --ios` call into
`apply-capacitor-store-config.mjs`, and correct a false claim in an existing audit doc.

**Actual diff:** 5 files; ~+510 lines / ~−5 lines.

**File-by-file breakdown:**

| File | +lines | −lines | Required by claim? |
|------|-------:|-------:|---|
| `apps/mobile-capacitor/package.json` | +1 | 0 | Yes — adds `@capacitor/assets` devDep |
| `scripts/apply-capacitor-store-config.mjs` | +68 | ~0 | Partially (see below) |
| `scripts/apply-capacitor-store-config.test.mjs` | +48 | 0 | Partially (see below) |
| `docs/readiness/CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md` | +4 | −4 | No (see below) |
| `pnpm-lock.yaml` | ~+392 | ~−3 | Yes — new dep resolves transitive tree |

**Specific inflations:**

**1. `apply-capacitor-store-config.mjs`: comment-to-code ratio inside the new function.**
`generateIosAppIcon()` is 72 lines total. Of those, roughly 34 are inline `//` comments —
nearly half the function body is prose narrating the prior incident, the false audit-doc claim,
Apple's icon-extraction behaviour, and the Windows `.bin`-shim avoidance rationale. The
functional logic (the actual Node calls: `execFileSync`, `fs.cpSync`, `fs.rmSync`, `fs.renameSync`,
two `existsSync` guards, the splash snapshot/restore) fits in ~38 lines. The comments are
accurate — each one documents a real decision that is not otherwise obvious — but at this density
they should be in a separate ADR or the commit body (where most of the same information already
appears verbatim), not inlined into the production script. As written, the function reads as a
simultaneously a code change and an incident report, which makes it harder to read as code.

**2. `apply-capacitor-store-config.test.mjs`: source-text-pattern tests rather than unit tests.**
The 48 lines of new tests do not call `generateIosAppIcon()` or mock `execFileSync`. They assert
on the _source text_ of `apply-capacitor-store-config.mjs` using `String.prototype.indexOf` and
`toContain`. For example:
```js
const fnBlock = source.slice(source.indexOf("function generateIosAppIcon"), source.indexOf("function applyAndroid"));
expect(fnBlock).toContain("splashBackupDir");
```
This is an established pattern in the repo — `build-ios.test.mjs` uses exactly the same
technique with the same justification ("top-level side-effecting script that only runs on macOS
with a real Xcode toolchain"). That justification is valid here too. However, five of the six
assertions reduce to "this string appears in that function" — they will pass even if the logic
is completely broken, as long as the variable names are present. They verify _authorial intent_
(the right concepts were thought about) rather than _correctness_ (the right behaviour
results). This is not duplication, but it does mean 48 lines of tests provide weaker safety
guarantees than their volume implies. **The inflation here is in the _confidence signal_, not
the line count.**

**3. `CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md`: out-of-scope correction
bundled into a fix PR.**
The PR corrects two table rows in an existing audit doc — rows that contained a false claim about
how `cap sync` generates icons. The correction is accurate and necessary, but the audit doc has
nothing to do with the code fix. Corrections to documentation that was false should ideally be
their own commit (or at least their own PR) so the audit trail separates "we fixed the bug"
from "we corrected the doc that led us to believe the bug didn't exist." Bundling them obscures
causality: a future reader reviewing the fix PR sees both the code change and the doc correction
without a clear signal about which came first and why the doc was wrong.

**4. `pnpm-lock.yaml`: ~392 added lines for a single devDependency.**
`@capacitor/assets@3.0.5` pulls in a transitive dependency tree (sharp and its platform-specific
binaries, among others). This is expected behaviour for a native image-processing library and is
not inflated per se, but it is worth flagging for reviewers: a PR claiming "generate iOS icon"
adds ~390 lockfile lines that have no entry in the PR title or description. Any reviewer eyeballing
the diff would see a 5-file, 510-line change for what sounds like a 10-line wiring job. The
lockfile churn is unavoidable given the dependency choice, but the PR description does not call
it out, leaving reviewers to infer it.

**Verdict:** Not spaghetti in the classical sense — no duplicated logic, no re-implementation of
existing functionality, no unrelated feature added. The flags are:
- Inline comments that double as incident reports (should live in commit body or ADR, not code).
- Tests that assert on source-text patterns rather than behaviour (low correctness signal per line).
- An unrelated doc correction bundled into a code-fix PR without a clear audit trail.
- A 390-line lockfile addition with no mention in the PR description.

---

### ✅ #361 — `chore(deps): bump react-resizable-panels 4.12.2→4.12.3`

**Claimed:** Single patch version bump.
**Actual diff:** `package.json` (+1/−1), `pnpm-lock.yaml` (+1/−1). Correct.

---

### ✅ #360 — `chore(deps): bump actions/setup-java 5→6`

**Claimed:** Bump GitHub Actions runner step version.
**Actual diff:** 1 workflow file, 1 line. Correct.

---

### ✅ #359 — `chore(deps): bump @capacitor/android 7.6.7→8.5.0`

**Claimed:** Major Capacitor Android version bump.
**Actual diff:** 2 `package.json` files (+2/−2) and lockfile (+8/−8). The major version jump
(7 → 8) affecting only 16 lockfile lines is surprisingly small; the package.json confirms both
the `mobile-capacitor` and `mobile-lite-capacitor` apps are bumped together as expected. Proportionate.

---

### ✅ #357 — `chore(deps): bump mixpanel-browser 2.81.0→2.82.1`

**Claimed:** Single package minor bump.
**Actual diff:** `package.json` (+1/−1), `pnpm-lock.yaml` (+18/−18). Proportionate — the lockfile
churn matches a clean version swap with no new transitive deps.

---

### ✅ #356 — `chore(deps-dev): bump tailwindcss 4.1.12→4.3.3`

**Claimed:** Dev dependency minor bump (skipped two patch versions).
**Actual diff:** `package.json` (+1/−1), `pnpm-lock.yaml` (+2/−7). Proportionate — net lockfile
_shrinkage_ is consistent with the 4.3.x streamlining of the TailwindCSS v4 dep tree.

---

### ⚠️ #353 — `chore(deps): bump input-otp 1.4.2→1.5.0`

**Claimed:** Single package minor bump.
**Actual diff:** `package.json` (+1/−1), `pnpm-lock.yaml` (+47/−28): 75 total lockfile lines
changed across 20 hunks.

**What inflated this:** The `input-otp` version bump coincided with a `terser` transitive
dependency advancing from `5.50.0` to `5.51.0`, which caused pnpm to re-resolve every package in
the lockfile that carries `vite` or `vitest` in its peer-dependency string (because both pin the
terser version in their full resolution key). This produces a large number of key-renamed
snapshot entries — `@tailwindcss/vite@4.3.3(vite@...terser@5.50.0...)` → `(...terser@5.51.0...)`,
and so on — that are semantically a no-op (same version of every package, different resolution
string) but look like substantive changes to a diff reader. Separately, `baseline-browser-mapping`
was bumped from `2.11.18` to `2.11.19` as a transitive of `browserslist`, unrelated to `input-otp`.

**Verdict:** The lockfile churn is not caused by `input-otp` itself but by a coincident
`terser` transitive resolution shift. The PR title does not mention either `terser` or
`baseline-browser-mapping`. A reviewer reading "bump input-otp 1.4.2→1.5.0" would not expect
20 lockfile hunks. This is a **tooling-level inflation** (pnpm's lockfile verbosity under peer-
dependency resolution), not spaghetti code — but it is misleading to reviewers and creates diff
noise that could mask real changes in future lockfile audits.

---

## Summary of Flags

| PR | Flag level | Specific inflation |
|----|:---:|---|
| #362 | 🚩 | (1) 34/72 lines in new function are inline incident-report prose. (2) 48 test lines assert source-text patterns, not behaviour. (3) Unrelated doc correction bundled into code-fix PR. (4) ~390 lockfile lines from new dep not mentioned in PR description. |
| #363 | ⚠️ | 11-line comment block explains a 1-line config change; comment-to-code density throughout is ~47%. |
| #353 | ⚠️ | 75 lockfile lines across 20 hunks for a minor-version bump; caused by coincident `terser` transitive resolution shift, not `input-otp` itself; PR title does not disclose. |

**No PR in this window has duplicated logic, re-implements an existing function, or adds files
that substantially re-do something already in the repo.** The inflation is all in one of three
categories: narrative prose embedded in code rather than commit messages/docs, source-text
assertions standing in for unit tests, and lockfile noise from pnpm's peer-dependency resolution
churn. All three are documentation/process issues rather than architectural ones.
