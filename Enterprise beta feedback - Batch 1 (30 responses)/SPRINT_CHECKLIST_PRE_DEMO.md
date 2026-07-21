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

**Status:** 3 / 6 merged to `main` (A13, A14, A15 — PRs #150, #151); 3 / 6 built, tested, and PR'd
but **not yet merged** (A10, A16, A17 — PR #152, open). Planned 2026-07-21 as 4 phases; see
`SPRINT_ROADMAP_PRE_DEMO.md` and `PRODUCT_ITERATION_I_CLOSEOUT.md` section 5 for full detail,
including 2 real bugs found and fixed along the way (a broken audit-log trigger firing on every
project/task/meeting/organization write, and a Slack OAuth scope-parsing bug).

- [x] **A13** — Slack quick-connect in Settings (merged, PR #151)
- [x] **A14** — Calendly quick-connect in Settings (merged, PR #151; customer-side cost caveat —
      Calendly's API requires a paid plan on the account being connected, surfaced in the Settings UI)
- [x] **A15** — Cap the integrations surface to reality (merged, PR #150 — found the real scope was
      ~20 fake-flagged connectors, not 12 wrappers)
- [ ] **A10** — Post-demo satisfaction capture (built + tested, PR #152 open, not yet merged)
- [ ] **A16** — "What's New" panel at login (built + tested, PR #152 open, not yet merged)
- [ ] **A17** — Completion celebration on finishing a workflow end-to-end (built + tested, PR #152
      open, not yet merged)

**Sprint 3 exit criteria:**
- [ ] All 6 items above checked — 3/6 (A10/A16/A17 pending #152 merge)
- [ ] Slack + Calendly connections demoable live, end to end, with a real (not mocked) test account
      — **not done**: no real Slack App / Calendly OAuth app credentials available in this
      environment; code verified via unit tests against mocked token exchanges only
- [ ] `ITERATION_PROGRESS.md`'s 2026-07-20 Supabase-wrappers entry updated to mark the
      product-facing gap closed for these 2 wrappers specifically — **not done as a doc update**,
      though A13/A14 are functionally shipped
- [ ] "What's New" panel content reflects real Sprint 1-3 work, not placeholder copy — done in
      content (cites real Sprint 1/2 items), but is a manually-curated one-time snapshot with no
      mechanism to stay current; will go stale without hand-updates each release
- [x] `pnpm run ci`-equivalent green on every Sprint 3 PR individually (#149, #150, #151, #152 each
      independently verified: `typecheck`/`lint --max-warnings=0`/`test -- --run`/`build`)
- [ ] Demo dry-run completed against the full Sprint 1-3 experience — **not done**
- [ ] Live browser walkthrough of A3/A7/A18 (Phase 0's own gate for this sprint) — **not done**,
      carried forward as the single largest open gap since Sprint 2

---

## Overall completion

- [x] Sprint 1 complete (7/7) — merged to `main` 2026-07-21
- [x] Sprint 2 complete (7/7) — merged to `main` 2026-07-21
- [ ] Sprint 3 complete (6/6) — 3/6 merged (A13, A14, A15); 3/6 built + tested + PR'd, pending
      merge of #152 (A10, A16, A17)
- [ ] All 20 actionables shipped and logged in `ITERATION_PROGRESS.md` — 17/20 merged; A10/A16/A17
      logged as built-and-PR'd, not yet merged
- [x] `PRE_DEMO_ACTIONABLES.md` statuses updated: ✅ for 17 merged items, 🔨 for the 3 built-and-PR'd
      items (A10, A16, A17) — see that file's updated status legend

See `PRODUCT_ITERATION_I_CLOSEOUT.md` for the full closing record of everything covered by this
checklist (Sprints 1, 2, and 3), including the git-reconciliation incident and every honest gap
carried forward.
