# Full Golden Path Completion -- Kanban and Milestone

Date created: 2026-07-25
Source: full HITL live walkthrough of the Golden Path checklist on production, 2026-07-25 (see `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-27, A-33, A-35 through A-41 for the underlying evidence -- this document is a purpose-built view over that same evidence, not a separate source of truth)

## Milestone Definition

**"Full Golden Path"** is complete when a new Organization Admin can walk the entire onboarding checklist end to end -- every item routes to its correct real workspace, no step forces an unintended exit or shortcut, and every submission (feedback, invites) has a real, working destination. This is the single, first-session experience a pilot customer or investor evaluating the live beta actually lives through -- it is the most visible readiness surface in the product, independent of any individual module's own correctness.

## Definition of Done (Milestone Exit Criteria)

- [ ] All 10 Golden Path checklist items route to their correct destination (currently 6/10)
- [ ] A-35: "Submit Feedback" has a real, reviewable destination
- [ ] A-36: "Invite Pilot Team" routes to a real invite/users screen, not Security
- [ ] A-37: "Assign Roles" routes to a real roles/permissions screen, not Security
- [ ] A-38: Back navigation from that screen returns to the checklist, not "Continue to Workspace"
- [ ] A-39: "Send feedback/request support" routes to a real feedback/support screen, not the Executive Dashboard
- [ ] A-40 (high priority): "Back" no longer routes through Sign Up/Sign In with a silent self-redirect into the workspace, anywhere in the product
- [ ] A-27 (security-adjacent): "Welcome Aboard" forces fresh authentication rather than silently reusing an existing session
- [ ] A-33: the roles-administration redirect lands on a roles-relevant tab, not Security by default

None of the above have been fixed yet -- this document tracks work not yet started, per the founder's explicit instruction to log this walkthrough without acting on it.

## Current Status: 6 of 10 Golden Path items correctly mapped; 8 open defects; 0 fixed

## Board

### Verified (6 of 10 Golden Path items -- confirmed correct, 2026-07-25)

| Golden Path item | Correct destination |
|---|---|
| Create First Project | Projects & Programs |
| Upload Document | Documents & Files |
| Ask first AI/RAG question | AI Workspace |
| Create first task | Tasks & Workflow |
| Request first approval | Approvals & Governance |
| View Audit Trail | Audit Logs (under Governance) |

### To Do (owner: Claude Code, none started)

| Card | Blocker/Finding | Founder's own words | Priority |
|---|---|---|---|
| A-40 | "Back" repeatedly routes through Sign Up/Sign In, which self-redirects into the workspace -- recurring across multiple screens | "Very bad UX with repeated unmitigated occurrence" | **High -- flagged for immediate addressal once actioning begins** |
| A-27 | "Welcome Aboard" reuses an existing session and jumps straight to "Continue to Workspace" with no fresh sign-in prompt | "very risky security wise for Enterprise platform" | High -- security-adjacent |
| A-28 | Tenant 0's own Organization tab shows the investor demo's dataset, not Tenant 0's real data (adjacent to, not strictly inside, the Golden Path checklist, but discovered in the same walkthrough and shares root-cause risk with A-27's session-handling family) | "needs immediate rectification" | High |
| A-36 | "Invite Pilot Team" lands on Security | "fully incorrect path" | Medium |
| A-37 | "Assign Roles" lands on Security | "fully incorrect path" | Medium |
| A-38 | Back arrow from that Security landing exits to "Continue to Workspace" instead of the checklist | "unnecessary, spoils UX and one step too much unnecessarily" | Medium |
| A-39 | "Send feedback/request support" lands on the Executive Dashboard | (confirmed incorrect) | Medium |
| A-35 | "Submit Feedback" succeeds with no destination inbox | (confirmed gap) | Medium |
| A-33 | Roles-administration redirect lands on the Security tab by default | (minor UX refinement) | Low |

### Blocked

None -- every open item above is Claude-Code-fixable without an external dependency, once the founder authorizes work to begin.

### Closed

None yet.

## Sequencing Recommendation (For When Work Begins)

1. **A-40 first** -- the founder's own priority call, and likely the highest-leverage fix: if it shares root cause with A-27 (both are session/auth-state handling on `src/proxy.ts`/`AuthProvider.tsx`, the same family of code responsible for every prior stale-session bug this program has fixed and re-discovered), fixing it may resolve A-27 at the same time. Investigate both together before assuming they're two separate fixes.
2. **A-36/A-37/A-38 together** -- one root cause (Golden Path step -> destination mapping table, wherever that's defined) likely explains all three.
3. **A-35/A-39** -- two independent, smaller gaps (a missing feedback inbox; one wrong route).
4. **A-33** -- lowest priority, cosmetic.
5. **A-28** is tracked here for visibility (found in the same walkthrough, shares the session-handling risk family) but its primary home is `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-28 and `HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md`'s partitioning claims -- do not lose track of it just because it isn't a checklist item.

## Evidence

All findings sourced from HITL's own reported walkthrough, 2026-07-25, recorded verbatim (not paraphrased into a softer claim) in `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-27, A-33, A-35 through A-41) and `docs/readiness/QA3_READINESS_KANBAN.md`. This document does not add new evidence -- it re-sequences the same evidence into a milestone-shaped view for tracking one specific outcome (a fully correct Golden Path) rather than the full 41-actionable program.
