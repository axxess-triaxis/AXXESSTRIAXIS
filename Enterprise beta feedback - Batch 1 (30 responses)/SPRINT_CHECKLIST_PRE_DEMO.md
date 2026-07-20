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

**Status:** 7 / 7 implemented (2026-07-20); pending PR merge to `main` (see `ITERATION_PROGRESS.md`)

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
- [ ] `pnpm run ci` green on the branch that merges the last Sprint 1 item — full suite verified
      green pre-merge; `pnpm run ci` also runs `build`, not independently re-verified here

---

## Sprint 2 — Value clarity, AI trust, and feedback instrumentation

**Status:** 4 / 7 shipped (2026-07-20)

- [ ] **A3** — Guided demo workspace with realistic seeded data
- [ ] **A7** — Replace single onboarding flow with 3 outcome-first paths *(ship together with A3, not before)*
- [ ] **A18** — Reduce required setup decisions before first AI interaction *(ship together with A7)*
- [x] **A4** — AI citations + rationale under every AI output
- [x] **A6** — Bulk/quick-approve action in the AI Review Inbox
- [x] **A9** — In-context 1-click micro-survey after first completed step (AI-review-decision
      trigger wired; golden-path-step trigger not yet — see `ITERATION_PROGRESS.md`)
- [x] **A11** — Wire time-to-first-value / onboarding-completion analytics events

**Sprint 2 exit criteria:**
- [ ] All 7 items above checked
- [ ] A3 + A7 + A18 verified together end-to-end (not just individually) — they're interdependent
- [ ] A11's events verified firing at the correct funnel step, not just "present in code"
- [ ] `ITERATION_PROGRESS.md` updated
- [ ] `pnpm run ci` green

---

## Sprint 3 — Visible integrations, retention signals, demo readiness

**Status:** 0 / 6 shipped — blocked on Sprint 1 + 2 (see roadmap's "why this order" section: shipping
integrations before the reliability/clarity fixes undermines the demo)

- [ ] **A13** — Slack quick-connect in Settings (using `slack_wrapper`)
- [ ] **A14** — Calendly quick-connect in Settings (using `calendly_wrapper`)
- [ ] **A15** — Cap the integrations surface to just these 2 for this release
- [ ] **A10** — Post-demo satisfaction capture (distinct from beta feedback button)
- [ ] **A16** — "What's New" panel at login
- [ ] **A17** — Completion celebration on finishing a workflow end-to-end

**Sprint 3 exit criteria:**
- [ ] All 6 items above checked
- [ ] Slack + Calendly connections demoable live, end to end, with a real (not mocked) test account
- [ ] `ITERATION_PROGRESS.md`'s 2026-07-20 Supabase-wrappers entry updated to mark the
      product-facing gap closed for these 2 wrappers specifically (the other 10 remain open)
- [ ] "What's New" panel content reflects real Sprint 1-3 work, not placeholder copy
- [ ] `pnpm run ci` green
- [ ] Demo dry-run completed against the full Sprint 1-3 experience, not just this sprint's items in isolation

---

## Overall completion

- [ ] Sprint 1 complete (7/7)
- [ ] Sprint 2 complete (7/7)
- [ ] Sprint 3 complete (6/6)
- [ ] All 20 actionables shipped and logged in `ITERATION_PROGRESS.md`
- [ ] `PRE_DEMO_ACTIONABLES.md` statuses updated from 🔜 to ✅ for every item
