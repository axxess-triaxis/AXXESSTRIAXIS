# Sprint Checklist — Pre-Demo Actionables

**Companion to:** `SPRINT_ROADMAP_PRE_DEMO.md` (sequencing/dependencies/acceptance criteria) and
`PRE_DEMO_ACTIONABLES.md` (full evidence for each item).
**How to use this file:** tick a box only when its item has merged to `main`, its tests are
green, and a corresponding entry has been appended to `ITERATION_PROGRESS.md`. Tick the sprint's
exit-criteria box only when every item in that sprint is checked. Update the "Status" line at the
top of each sprint each time you tick something, so anyone opening this file gets the current
state without reading the whole roadmap.

---

## Sprint 1 — Stop the bleeding: onboarding friction and trust signals

**Status:** 7 / 7 implemented and merged to `main` (2026-07-21, via the `reconcile/sprint1-tail-and-sprint2`
branch — see `ITERATION_PROGRESS.md`'s 2026-07-21 git-reconciliation entry for why a second PR was
needed: PR #137 merged mid-flight and only captured A1/A2)

- [x] **A1** — Make Golden Path opt-in, not forced
- [x] **A2** — Explain blocked/locked steps inline
- [x] **A8** — Empty states with one clear CTA on every major page (Dashboard, Projects, Tasks)
- [x] **A5** — Loading/progress + timeout-with-retry states on long AI operations
- [x] **A19** — Reliability expectation-setter copy during AI generation
- [x] **A20** — Role-appropriate default landing pages
- [x] **A12** — Surface feedback button at workflow completion

**Sprint 1 exit criteria** (all must be true before calling the sprint done):
- [x] All 7 items above checked
- [ ] Each has a test asserting its acceptance criteria (see `SPRINT_ROADMAP_PRE_DEMO.md`) —
      **partial**: A1, A2, A20 have dedicated tests; A8, A5, A19, A12 were verified via
      `typecheck`/`lint`/full-suite-still-green and manual code review only, since these page
      components (`DashboardSection.tsx`, `ProjectsSection.tsx`, `TasksSection.tsx`,
      `AIWorkspaceSection.tsx`) have no existing unit-test coverage in this repo to begin with
      (coverage here comes from Playwright e2e specs instead). Flagged as a follow-up, not
      silently skipped — see `ITERATION_PROGRESS.md`.
- [x] `ITERATION_PROGRESS.md` has one entry per item (or one combined entry, as with A1/A2)
- [x] `pnpm run ci`-equivalent green on the branch that merged the last Sprint 1 item —
      `typecheck`/`lint --max-warnings=0`/`test -- --run`/`build` independently re-verified on
      `reconcile/sprint1-tail-and-sprint2`, rebased fresh onto `main` post-PR-#138, per
      `ITERATION_PROGRESS.md`'s 2026-07-21 entry

---

## Sprint 2 — Value clarity, AI trust, and feedback instrumentation

**Status:** 7 / 7 implemented and merged to `main` (2026-07-21, same reconciliation PR as Sprint 1's
tail — see above); end-to-end browser verification of A3/A7/A18 still pending — see exit criteria
below

- [x] **A3** — Guided demo workspace with realistic seeded data (real repositories, not fabricated content)
- [x] **A7** — Replace single onboarding flow with 3 outcome-first paths *(shipped with A3, as planned)*
- [x] **A18** — Reduce required setup decisions before first AI interaction *(shipped with A7)*
- [x] **A4** — AI citations + rationale under every AI output
- [x] **A6** — Bulk/quick-approve action in the AI Review Inbox
- [x] **A9** — In-context 1-click micro-survey after first completed step (AI-review-decision
      trigger wired; golden-path-step trigger not yet — see `ITERATION_PROGRESS.md`)
- [x] **A11** — Wire time-to-first-value / onboarding-completion analytics events

**Sprint 2 exit criteria:**
- [x] All 7 items above checked
- [ ] A3 + A7 + A18 verified together end-to-end (not just individually) — they're interdependent.
      **Not yet done**: verified via `typecheck`/`lint`/unit tests of the pure logic module
      (`enterpriseOnboarding.test.ts`) only. No live browser walkthrough of the actual onboarding
      flow -> seeding -> redirect sequence has been run. Flagged as a required follow-up before
      this is demoed, not silently skipped.
- [x] A11's events verified firing at the correct funnel step (code-reviewed against each success
      path, not just "present in code")
- [x] `ITERATION_PROGRESS.md` updated
- [x] `pnpm run ci`-equivalent green — `typecheck`/`lint --max-warnings=0`/`test -- --run`/`build`
      all independently re-verified on `reconcile/sprint1-tail-and-sprint2` post-PR-#138

---

## Sprint 3 — Visible integrations, retention signals, demo readiness

**Status:** 6 / 6 merged to `main` (A13, A14, A15 — PRs #150, #151; A10, A16, A17 — PR #152).
Confirmed via `git log` (`git merge-base --is-ancestor 3d23ddc origin/main` on the canonical GitHub
history) — this line previously read "3/6 merged, PR #152 open" for longer than it should have;
#152 had in fact already merged and this file simply wasn't updated at the time. See
`SPRINT_ROADMAP_PRE_DEMO.md` and `PRODUCT_ITERATION_I_CLOSEOUT.md` section 5 for full detail,
including 2 real bugs found and fixed along the way (a broken audit-log trigger firing on every
project/task/meeting/organization write, and a Slack OAuth scope-parsing bug).

- [x] **A13** — Slack quick-connect in Settings (merged, PR #151)
- [x] **A14** — Calendly quick-connect in Settings (merged, PR #151; customer-side cost caveat —
      Calendly's API requires a paid plan on the account being connected, surfaced in the Settings UI)
- [x] **A15** — Cap the integrations surface to reality (merged, PR #150 — found the real scope was
      ~20 fake-flagged connectors, not 12 wrappers)
- [x] **A10** — Post-demo satisfaction capture (merged, PR #152)
- [x] **A16** — "What's New" panel at login (merged, PR #152)
- [x] **A17** — Completion celebration on finishing a workflow end-to-end (merged, PR #152)

**Sprint 3 exit criteria:**
- [x] All 6 items above checked — 6/6
- [ ] Slack + Calendly connections demoable live, end to end, with a real (not mocked) test account
      — **not done**: no real Slack App / Calendly OAuth app credentials available in this
      environment; code verified via unit tests against mocked token exchanges only
- [x] `ITERATION_PROGRESS.md` updated to mark the product-facing gap closed for these 2 wrappers —
      done 2026-07-21, and further extended: Airtable/HubSpot/Notion also wired via the same OAuth
      pipeline, plus encrypted credential storage for the remaining 5 non-OAuth wrappers (see that
      entry's "Nine of twelve Postgres wrapper integrations" heading)
- [ ] "What's New" panel content reflects real Sprint 1-3 work, not placeholder copy — done in
      content (cites real Sprint 1/2 items), but is a manually-curated one-time snapshot with no
      mechanism to stay current; will go stale without hand-updates each release
- [x] `pnpm run ci`-equivalent green on every Sprint 3 PR individually (#149, #150, #151, #152 each
      independently verified: `typecheck`/`lint --max-warnings=0`/`test -- --run`/`build`)
- [ ] Demo dry-run completed against the full Sprint 1-3 experience — **not done**
- [x] Live browser walkthrough of A3/A7/A18 (Phase 0's own gate for this sprint) — **done 2026-07-21**,
      closing the single largest open gap carried since Sprint 2; found and fixed 4 real bugs along
      the way (fake org-id placeholder, 2 Supabase permission gaps, missing `tenant_id` defaults on
      11 tables). Built and verified on branch `fix/live-tenant-onboarding-and-rag-walkthrough`, not
      yet merged to `main` (holding on git operations per current instruction, not a code gap).

---

## Overall completion

- [x] Sprint 1 complete (7/7) — merged to `main` 2026-07-21
- [x] Sprint 2 complete (7/7) — merged to `main` 2026-07-21
- [x] Sprint 3 complete (6/6) — all merged (A13/A14/A15 via #150/#151; A10/A16/A17 via #152).
      Corrected 2026-07-21: this box and `PRE_DEMO_ACTIONABLES.md`'s statuses had been showing
      #152 as still open after it had, in fact, already merged.
- [x] All 20 actionables shipped and logged in `ITERATION_PROGRESS.md` — 20/20 merged
- [x] `PRE_DEMO_ACTIONABLES.md` statuses updated: ✅ for all 20 items — 🔨 status is no longer used
      anywhere in that file

**What remains — genuinely open, not a documentation gap:**
- Slack + Calendly demoed live against a real (not mocked) OAuth account
- A demo dry-run of the full Sprint 1-3 experience
- An automated mechanism to keep the "What's New" panel current (it's currently a manual snapshot)
- A9's second trigger point (golden-path-step, vs. the AI-review-decision trigger already wired)
- Merging `fix/live-tenant-onboarding-and-rag-walkthrough` (live A3/A7/A18 walkthrough + 4 bug
  fixes + 9/12 Postgres wrapper integrations + dual Mixpanel/PostHog analytics) — built and
  verified, held pending git instructions, not a code gap

See `PRODUCT_ITERATION_I_CLOSEOUT.md` for the full closing record of everything covered by this
checklist (Sprints 1, 2, and 3), including the git-reconciliation incident and every honest gap
carried forward.
