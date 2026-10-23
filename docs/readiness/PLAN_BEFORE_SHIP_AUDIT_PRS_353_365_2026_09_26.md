# Plan-Before-Ship Audit — Last 15 Merged PRs

> **Point-in-time snapshot.** Written 2026-09-26, covering merged PRs #353-#365 only. Not refreshed for PRs #366 onward;
> do not read its ratios as describing the repository's current process.

**Methodology:** Each PR was examined for three evidence types, in priority order:

1. **Ledger/issue entry pre-existing in a docs tracker** — a formal defect, readiness item, or actionable recorded _before_ the branch was opened (e.g. `FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md`, `ACTIONABLES_READINESS_MATRIX.md`, Linear issues referenced in commit messages).
2. **PLAN.md-style file added in an early commit of the branch** — a planning or design doc committed _before_ the implementation commits.
3. **PR description or commit body referencing prior planning discussion** — explicit back-references to a tracked item, prior decision, or approved design in the merge commit message or the branch's individual commit messages.

Dependabot PRs are a special category: they are fully automated, have no human planning artefact by design, and are classified separately.

**Classification key:**
- `planned-then-shipped` — at least one of the three evidence types is present and dated before the implementation.
- `shipped-with-no-visible-plan` — no planning artefact found in the repository; the fix or doc was reactive/immediate with no traceable prior specification.
- `dependabot-auto` — machine-generated dependency bump; planning concept does not apply.

---

| # | PR | Title | Classification | Evidence (one line) |
|---|-----|--------|---------------|---------------------|
| 1 | [#365](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/365) | docs(readiness): close ledger #72 — build 3 swapped in, submitted for App Store review | `planned-then-shipped` | Closes pre-existing tracker item #72 in `FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md`, which was itself opened after Build 1's TestFlight rejection — the defect was recorded before this PR existed. |
| 2 | [#364](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/364) | docs(readiness): ledger #72 — iOS default-icon fix, wasted review cycle, real fix verified | `planned-then-shipped` | Documents resolution of ledger item #72; commit body explicitly cross-references the prior item entry and the sequence of validate-before-resubmit decisions made across PRs #362 and #363 before opening this doc PR. |
| 3 | [#363](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/363) | fix(mobile): darwin architecture support for sharp + fatal icon-gen failures | `shipped-with-no-visible-plan` | Reactive hotfix after build 0.7.0 (2) failed silently on the real macOS CI runner; no planning doc, no Linear issue ID, no pre-branch design artefact found. Commit body narrates the root cause but was written at the time of the fix, not before it. |
| 4 | [#362](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/362) | fix(mobile): generate the real AXXESS icon for iOS instead of Capacitor's default | `planned-then-shipped` | Commit body references ledger item #72 (defect recorded in `FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` when Build 1's TestFlight rejection was observed), which predates this branch. |
| 5 | [#361](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/361) | chore(deps): bump react-resizable-panels from 4.12.2 to 4.12.3 | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 6 | [#360](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/360) | chore(deps): bump actions/setup-java from 5 to 6 | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 7 | [#359](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/359) | chore(deps): bump @capacitor/android from 7.6.7 to 8.5.0 | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 8 | [#357](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/357) | chore(deps): bump mixpanel-browser from 2.81.0 to 2.82.1 | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 9 | [#356](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/356) | chore(deps-dev): bump tailwindcss from 4.1.12 to 4.3.3 | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 10 | [#355](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/355) | chore(deps): bump react-native-safe-area-context from 5.8.1 to 5.9.1 | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 11 | [#354](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/354) | chore(deps-dev): bump @vitejs/plugin-react-swc from 4.3.2 to 4.3.3 | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 12 | [#353](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/353) | chore(deps): bump input-otp from 1.4.2 to 1.5.0 | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 13 | [#352](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/352) | chore(deps-dev): bump vitest from 4.1.10 to 4.1.11 in the testing group | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 14 | [#351](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/351) | chore(deps-dev): bump the next-and-react group with 2 updates | `dependabot-auto` | Automated Dependabot bump; no human planning artefact exists or is expected. |
| 15 | [#350](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/350) | docs(readiness): closeout — Android Beta 0.9 production release + 172-country rollout | `planned-then-shipped` | Explicit closeout of a release sequence tracked across PRs #347, #348, #349 (all referenced in the commit body); the Android Beta 0.9 production rollout was tracked in `ACTIONABLES_READINESS_MATRIX.md` and the Play Console evidence trail predates this PR. |

---

## Summary

| Classification | Count |
|---|---|
| `planned-then-shipped` | 4 |
| `shipped-with-no-visible-plan` | 1 |
| `dependabot-auto` | 10 |

**Notes:**

- The 10 Dependabot PRs dominate the window. Removing them, the human-authored ratio is **4 planned : 1 unplanned** across 5 PRs — but this is a small, homogeneous sample (all from a single iOS release incident + one Android closeout), so the ratio should not be generalised.
- PR #363 is the clearest gap: it was a reactive hotfix opened when a real CI failure was discovered mid-flight. The fix itself was well-narrated in its commit body, but no planning artefact (issue, design doc, or pre-branch decision record) predates the branch. This is consistent with an emergency-response workflow, not a design process failure.
- PR #362 is borderline: the ledger item (#72) it references was opened the same session the TestFlight rejection was observed — the "plan" was effectively a same-session defect record, not a separate design phase. It is classified `planned-then-shipped` because the ledger entry does predate the branch and sets out what needs to be fixed, which matches the evidence standard applied here.
- No `PLAN.md`-style file was found as an early commit on any branch in this window. The planning artefacts that exist live in `docs/readiness/` and were committed before the relevant fix branches were opened.
- GitHub API access was not available; classifications are based solely on local git history, commit bodies, and `docs/` files present in the working tree.
