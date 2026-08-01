# Happy Path Onboarding -- Kanban and Milestone

Date created: 2026-07-25
Source: synthesized from existing, already-verified evidence across this program -- this document
does not add new findings, it re-sequences prior evidence (`docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`,
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-01 through A-09/A-27/A-40,
`docs/SPRINT_42_ONBOARDING_AUTH_GATE_AND_OAUTH_ENABLEMENT_2026_07_23.md`) into a milestone-shaped
view over one specific outcome, matching the pattern already established by
`docs/readiness/GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md`.

## Scope: How "Happy Path Onboarding" Differs From "Golden Path"

**Golden Path** (`docs/readiness/GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md`) tracks the 8-step
in-product journey that begins once a user already has a provisioned tenant and a real session --
its own step 1 ("Create tenant and profile") assumes the visitor has already made it through sign-up.

**Happy Path Onboarding** is the journey *before* that: everything a brand-new, unauthenticated
visitor must get through to become a signed-in user with a real, provisioned tenant at all. This is
the narrowest, most failure-prone part of the funnel -- every one of this program's P0 bugs to date
(the original missing sign-up entry point, the unauthenticated onboarding-wizard gap, the
create-account success-state defect) happened somewhere in this specific sequence.

## Milestone Definition

**"Happy Path Onboarding"** is complete when a brand-new visitor with no prior account can, without
external help, land on the public site, discover how to sign up, create a real account, confirm it,
complete the onboarding wizard, provision a real tenant, land in a real authenticated workspace, and
invite a teammate -- with no step producing an unexplained error, no silent session-reuse shortcut,
and no dead end.

## Definition of Done (Milestone Exit Criteria)

- [x] Sign Up / Sign In entry points are discoverable from the public site
- [x] Account creation succeeds with a real, visible confirmation state
- [x] Real confirmation email arrives with a working link
- [x] Onboarding wizard (organization, sector/role, department/workspace, security notices) is
      reachable only by an authenticated visitor and completes without a dead end
- [x] "Provision tenant" succeeds and lands the user in a real, authenticated workspace
- [ ] Re-authentication is never silently bypassed or looped (A-27, A-40)
- [ ] Inviting a teammate results in a real, delivered email (A-08)
- [ ] OAuth sign-up/sign-in (Google/Microsoft) works end to end (A-21, A-26 -- blocked on external
      credential provisioning, not code)

## Current Status: 5 of 8 exit criteria fully met; 3 open (2 confirmed defects, 1 external-credential blocker)

## Board

### Verified (5 of 8 -- confirmed via real HITL walkthroughs, 2026-07-22 through 2026-07-25)

| Step | Evidence | Source |
|---|---|---|
| Sign Up/Sign In entry points discoverable | Product Issue 1 fixed and confirmed live | `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, "Attempt 2 Log" |
| Account creation, real confirmation state | HITL signed up with a real email; dedicated "Account created" success panel confirmed via screenshot | `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-02 (Yes, 95%) |
| Real confirmation email, working link | HITL confirmed the real Supabase email arrived and the link authenticated | A-02, same entry |
| Onboarding wizard completes without a dead end | All 7 wizard steps (org name, sector/role, department/workspace, security notices, summary) confirmed real via screenshot; the unauthenticated-access gap (Product Issue 2) fixed in Sprint 42 | `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, "Attempt 4 Log"; `docs/SPRINT_42_ONBOARDING_AUTH_GATE_AND_OAUTH_ENABLEMENT_2026_07_23.md` |
| Provision tenant succeeds, lands in real workspace | First successful Tenant 0 provisioning in this program's history, 2026-07-24; Tenant 0.5 (NEPDSIC) provisioned 2026-07-25 | `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-06 (Yes, 95%) |

### To Do (owner: Claude Code, blocked/deferred per standing founder instruction)

| Card | Blocker/Finding | Priority |
|---|---|---|
| A-40 | "Back" repeatedly routes through Sign Up/Sign In, which self-redirects into the workspace -- recurring across multiple screens. Founder: "Very bad UX with repeated unmitigated occurrence." | High -- flagged for immediate addressal once actioning begins |
| A-27 | "Welcome Aboard" reuses an existing session and jumps straight to "Continue to Workspace" with no fresh sign-in prompt. Founder: "very risky security wise for Enterprise platform." | High -- security-adjacent, likely shares root cause with A-40 |
| A-08 | Invitation flow shows a success message but the invitee never receives an email -- confirmed defect in `sendInvitationEmail`/Resend provider, not merely untested | Medium |
| A-21/A-26 | OAuth sign-up/sign-in (Google/Microsoft) gated behind external Google Cloud Console/Azure Portal app registration -- code-complete, credentials not provisioned | Blocked on HITL external action, not Claude-Code-fixable |

### Blocked

A-21/A-26 (OAuth) require the founder to complete external provider console registration --
everything else in this board is Claude-Code-fixable once authorized.

### Closed

None yet on this specific board (A-02/A-06/Product Issue 1/Product Issue 2 are closed on their
originating actionables/issues, carried into this board as already-Verified).

## Sequencing Recommendation

1. **A-40 and A-27 together** -- both are session/auth-state handling in the same code family
   (`src/proxy.ts`/`AuthProvider.tsx`) responsible for every prior stale-session bug this program has
   repeatedly re-discovered; investigate jointly before assuming two separate fixes (same
   recommendation already standing in `GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md`).
2. **A-08** -- independent, smaller fix (email-delivery configuration/provider issue).
3. **A-21/A-26** -- hand back to the founder; no further Claude Code action possible until external
   credentials exist.

## Evidence

All findings sourced from already-published program evidence -- this document adds no new claims. See
`docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`,
and `docs/SPRINT_42_ONBOARDING_AUTH_GATE_AND_OAUTH_ENABLEMENT_2026_07_23.md` for full detail.
