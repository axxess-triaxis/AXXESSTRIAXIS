# QA3 Manual Walkthrough Script

Date created: 2026-07-24 (Sprint 5)
Program: Five-Sprint QA3 Readiness Execution Program
Product manager / prompt designer: Codex
Executor: Claude Code
Runner: Sudipta Koushik Sarmah, Founder and Managing Director, Triaxis Ventures Private Limited (HITL)

## Purpose

This is the script the HITL runs, by hand, in a real browser against the live production deployment, to produce the evidence QA3 (the Exhaustive Beta Readiness Audit) requires. Every actionable in `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` currently `Blocked` on "a real authenticated session exercising the golden path" closes or stays `Blocked` based on what this script records — not on anything Claude Code claims. No step in this script should be marked Pass without something to point to: a screenshot, a copy-pasted error string, a URL, or a specific UI state observed.

## How To Use This Script

1. Work top to bottom. Do not skip Section 1 (Investor Preview) or Section 2 (Sign Up) even if you already have a working account — they are two of the program's longest-standing open defects and need re-confirming on whatever build is live the day you run this.
2. For each step: perform the action, compare against **Expected result**, mark **Pass/Fail**, fill in **Evidence**, and if it failed, pick a **Severity** from the table below.
3. If a step fails at P0 or P1, you may still continue to later sections that don't depend on it (e.g., a broken Investor Preview does not block Sign Up), but any step whose precondition is the failed step should be marked **Blocked (upstream failure)** rather than attempted.
4. When finished, hand the completed script back — Claude Code will fold every Pass into the matching actionable's evidence, close what qualifies, and update `Blocked` reasons for what doesn't.
5. This script assumes the account state described in "Test Accounts Needed" below. If Triaxis Ventures Private Limited (Tenant 0) already exists from an earlier attempt, skip the parts of Section 2/Section 6 that would re-create it and note "already provisioned, skipped" in Evidence — the point is proving the flow works, not re-provisioning the same tenant twice.

## Severity Classification

| Severity | Meaning | Example |
|---|---|---|
| P0 | Blocks the golden path entirely; nothing downstream can be tested | Sign-up produces no usable session |
| P1 | Feature is broken or produces incorrect/unsafe behavior, but the rest of the walkthrough can continue | Raw "Unauthorized" shown instead of a handled error |
| P2 | Feature is degraded, confusing, or incomplete but technically functions | Notice text unclear, minor UI glitch |
| P3 | Cosmetic or low-impact | Wrong version number in footer |

## Preconditions

- A real, working internet connection and a standard evergreen desktop browser (Chrome, Edge, or Firefox), plus a mobile browser for the mobile-web checks in Section 20.
- Access to two real, distinct email inboxes the HITL controls: one for the Tenant 0 founder account (if not already created), one for a second test-tenant account (Section 16), and a third disposable address for the invite-flow test (Section 17) — a "+" alias on an existing inbox (e.g. `[FOUNDER_EMAIL_MASKED]+tenantb@gmail.com`) is acceptable for all three if a second real inbox isn't available.
- No ad blockers or aggressive privacy extensions active on the test browser profile — several past findings in this program (stale cookies, cached demo-mode flags) trace back to inconsistent browser state, not the product. Use a fresh/incognito profile for this walkthrough.
- Confirm the production deployment is current before starting (Section 0 below) — running this script against a stale deployment invalidates every result in it.

## URLs

| Purpose | URL |
|---|---|
| Production app | `https://beta.triaxisventures.com` |
| Auth / sign in | `https://beta.triaxisventures.com/auth` |
| Sign up | `https://beta.triaxisventures.com/auth?mode=signup` (or the "Sign up" link from `/auth`) |
| Investor Preview | `https://beta.triaxisventures.com/auth?next=%2Fdashboard` (the "Open investor preview" link from `/auth`) |
| Password reset | `https://beta.triaxisventures.com/auth` → "Forgot password" |
| Apex domain (should redirect cleanly, not dead-end) | `https://triaxisventures.com` |

## Test Accounts Needed

| Account | Role in walkthrough | Notes |
|---|---|---|
| Tenant 0 founder | Sudipta Koushik Sarmah, Super Admin, Triaxis Ventures Private Limited | May already exist from earlier attempts — see step 6.1 |
| Tenant B founder | A second, distinct organization, any name (e.g. "QA3 Tenant B Pvt Ltd") | Created fresh in Section 16; used only to prove isolation, can be discarded after |
| Invitee | Any third address the HITL controls | Used only in Section 17 to receive and accept an invitation into Tenant 0 |

Passwords are chosen and held by the HITL at account-creation time — never share password values with Claude Code in chat or commit them anywhere in this repository.

## Data To Prepare

- One real PDF or DOCX document with actual sentences in it (not a blank file) — a policy, SOP, or budget document is ideal since it mirrors real usage. Needed for Sections 8-9.
- One clear, specific question whose answer is actually contained in that document — needed for Section 10 (a vague or unanswerable question will produce a low-confidence or "no answer" response that isn't a fair test of the RAG path).
- One short task description to create manually in Section 6/12 if the review-approval flow doesn't produce its own.

---

## Section 0: Production Currency Pre-Check

**Actionable(s) proven:** A-01

**Steps:**
1. Visit `https://beta.triaxisventures.com/auth` in a fresh/incognito browser tab.
2. View page source or right-click → Inspect, and confirm the page renders a real login form (email/password fields, "Sign in" button, "Continue with Google"/"Continue with Microsoft" buttons, "Don't have an account? Sign up" link) — not a stale "Signed in" / "Continue to workspace" state.

**Expected result:** A clean, unauthenticated login form, matching what Claude Code's own most recent deployment evidence shows.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 1: Investor Preview Route

**Actionable(s) proven:** Not a numbered actionable — tracked as a Known Blocker in `docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md` (Investor/demo entry). A clean pass here should retire that blocker row.

**Steps:**
1. In a fresh/incognito tab, visit `https://triaxisventures.com` (apex domain, no `beta.` prefix, no path).
2. Observe what it redirects to.
3. From `/auth`, click "Open investor preview" (or navigate directly to `https://beta.triaxisventures.com/auth?next=%2Fdashboard`).
4. Observe whether it shows a real, working investor/demo workspace, or a stale "Signed in as Ananya Rao" / dead "Continue to workspace" state (the specific defect this program has flagged twice before).

**Expected result:** The apex domain redirects somewhere coherent (not a stale authenticated-looking dead end), and Investor Preview opens into a genuinely browsable demo workspace within a few seconds, with no dead buttons.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 2: Sign Up

**Actionable(s) proven:** A-02

**Steps:**
1. From `/auth`, click "Sign up".
2. Enter a real email address you control and a password.
3. Submit.
4. Observe what the screen shows immediately after submitting — specifically, whether there is a clear, visible confirmation (e.g., "Check your email to confirm your account") as opposed to nothing happening or an ambiguous state.
5. Check the inbox for a confirmation email and note how long it took to arrive.

**Expected result:** A clear on-screen success state appears immediately after submit, and a confirmation email arrives within a few minutes.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 3: Login

**Actionable(s) proven:** A-03

**Steps:**
1. Click the confirmation link in the email from Section 2 (or use an already-confirmed account).
2. Go to `/auth` and sign in with that email/password.

**Expected result:** Login succeeds and lands you in the authenticated workspace (dashboard or onboarding, depending on whether a tenant already exists for this account).

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 4: Logout

**Actionable(s) proven:** A-04

**Steps:**
1. While signed in, find and click "Sign out" / "Logout" (profile menu, top right).
2. After logging out, try to navigate directly to `/dashboard` by typing the URL.

**Expected result:** You're returned to `/auth` showing a real login form, and attempting to visit `/dashboard` directly redirects back to `/auth` rather than showing any workspace content.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 5: Password Reset

**Actionable(s) proven:** A-05

**Steps:**
1. From `/auth`, click "Forgot password".
2. Enter your account's email and submit.
3. Check the inbox for a reset email and click the link.
4. Set a new password.
5. Sign out if not already, and sign back in with the new password.

**Expected result:** Reset email arrives, the link leads to a working "set new password" screen, and the new password works on the next login.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 6: Tenant 0 Access

**Actionable(s) proven:** A-06

**Steps:**
1. Signed in as the Tenant 0 founder account, confirm whether an organization ("Triaxis Ventures Private Limited") already exists for this account (check the workspace header / organization switcher).
2. If not, go through onboarding: create organization, enter "Triaxis Ventures Private Limited", select sector, and complete the wizard through "Provision tenant".
3. Observe the result of clicking "Provision tenant" specifically — this is the step that has previously shown a raw "Unauthorized" error.

**Expected result:** Provisioning completes (or the tenant is already provisioned from an earlier attempt) with no raw/technical error text shown at any point, and the workspace loads with "Triaxis Ventures Private Limited" as the organization name.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 7: Profile / Settings

**Actionable(s) proven:** A-07

**Steps:**
1. Open the profile menu (top right) and find the entry point into your profile/settings page.
2. Confirm it opens (not a dead link or blank page).
3. Edit your display name, role, or department field and save.
4. Reload the page and confirm the edit persisted.

**Expected result:** Profile/settings is reachable from the profile menu, and edits persist across a page reload.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 8: Document Upload (Knowledge Hub)

**Actionable(s) proven:** A-12

**Steps:**
1. Navigate to Knowledge Hub.
2. Upload the PDF/DOCX prepared in "Data To Prepare".
3. Wait and observe the status counters (classified / chunked / indexed / ready).

**Expected result:** The file uploads without error and progresses to a "ready"/"indexed" state within a reasonable time (a minute or two for a normal-sized document).

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 9: Documents & Files Ingestion

**Actionable(s) proven:** A-12 (distinct UI surface from Section 8 — this program has previously found Knowledge Hub and Documents & Files to have inconsistent behavior, including a broken "Index document" action specifically in Documents & Files)

**Steps:**
1. Navigate to Documents & Files (separate from Knowledge Hub).
2. Upload the same or a second document there.
3. If there's a manual "Index document" action, try it.

**Expected result:** Upload succeeds, and any indexing action completes without error (or is clearly labeled as automatic/not-yet-available rather than silently failing).

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 10: RAG Question

**Actionable(s) proven:** A-13, A-14

**Steps:**
1. Navigate to the AI Workspace / question-asking surface.
2. Ask the specific question prepared in "Data To Prepare", whose answer is contained in the uploaded document.
3. Observe the answer text and whether it cites the source document.

**Expected result:** A cited answer is returned, correctly reflecting the document's content, within a reasonable time (well under a minute for a short document).

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 11: AI Review Inbox Approval

**Actionable(s) proven:** A-15

**Steps:**
1. Navigate to the AI Review Inbox.
2. Find the answer generated in Section 10 waiting for review.
3. Approve it (or reject/edit, and note which you tried).

**Expected result:** The generated answer actually appears in the Review Inbox (not empty), and the approve/reject/edit action completes without error.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 12: Create Task From Answer

**Actionable(s) proven:** A-16

**Steps:**
1. After approving in Section 11, look for an action to convert the approved answer into a task/project/approval/stakeholder note.
2. Take that action.
3. Navigate to Tasks & Workflow and confirm the new item appears there.

**Expected result:** A real task (or equivalent work item) is created and visible in its normal list, not just a confirmation toast with nothing to show for it.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 13: Dashboard Update

**Actionable(s) proven:** A-17

**Steps:**
1. Navigate to the main Dashboard.
2. Confirm the task/activity created in Section 12 (or any other action taken this session) is reflected in dashboard metrics or the recent-activity feed.

**Expected result:** Dashboard reflects the new activity without needing a hard refresh or re-login.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 14: Audit Log Update

**Actionable(s) proven:** A-18

**Steps:**
1. Navigate to Audit Logs (usually under Organization Admin or Security).
2. Confirm entries exist for the actions taken this session (task creation, AI review decision, profile edit, etc.) with actor, action, and timestamp.

**Expected result:** Audit entries exist for real actions taken during this walkthrough, not just seeded/sample-looking entries with old timestamps.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 15: Timeline Update

**Actionable(s) proven:** A-19

**Steps:**
1. Navigate to the workflow timeline for the task/item created in Section 12 (or a general activity timeline if no per-item view exists).
2. Confirm it shows the chain: source document → AI answer → human decision → work item created → audit event.

**Expected result:** Timeline shows a real, traceable sequence matching what actually happened this session, not generic/sample-looking events.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 16: Two-Tenant Isolation

**Actionable(s) proven:** A-08, A-10, A-11, A-14

**Steps:**
1. In a second browser (or a separate incognito profile — do not reuse the Tenant 0 session/browser), sign up with the "Tenant B" email from "Test Accounts Needed" and create a second organization (e.g. "QA3 Tenant B Pvt Ltd").
2. Upload a distinct document to Tenant B and ask a question about it, so Tenant B has its own real data.
3. Back in the Tenant 0 session, check Documents, Tasks, Dashboard, and Audit Logs — confirm none of Tenant B's data appears anywhere.
4. In the Tenant B session, confirm none of Tenant 0's data (including the document/task from Sections 8-12) appears anywhere.
5. If you have access to two different roles (e.g. an Employee-level account in either tenant), also confirm a lower-privileged user cannot see admin-only surfaces (Organization Admin, Audit Logs) that a higher role can.

**Expected result:** Complete separation — neither tenant can see, search, or retrieve the other's data or documents at any point, in any module.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 17: Invite User

**Actionable(s) proven:** A-08

**Steps:**
1. In the Tenant 0 session, navigate to Organization Admin → Invite team (or the equivalent invitation surface).
2. Send an invitation to the "Invitee" address from "Test Accounts Needed".
3. Check that inbox for the invitation email and click through it.
4. Complete sign-up/sign-in as the invitee and confirm they land inside Triaxis Ventures Private Limited (Tenant 0), not a fresh onboarding wizard, and with whatever role was assigned.

**Expected result:** Invitation email arrives, the link joins the invitee to the correct existing tenant with the correct role, without letting them create a brand-new organization instead.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 18: Dashboard Dedupe Check

**Actionable(s) proven:** A-20

**Steps:**
1. While on the Dashboard, open browser DevTools → Network tab.
2. Reload the page.
3. Count how many times the same workspace-metrics/dashboard API endpoint is called within the initial page load.

**Expected result:** Each distinct dashboard data endpoint fires once per load, not multiple duplicate/redundant calls.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 19: Analytics Event Check

**Actionable(s) proven:** A-22

**Steps:**
1. If you have access to the analytics provider dashboard (Mixpanel/PostHog), open it in a separate tab before starting the walkthrough.
2. After completing Sections 2-12, check the analytics dashboard for events matching the actions taken (e.g. `sign_up_started`, `document_uploaded`, `rag_answer_generated`, `profile_updated`).

**Expected result:** Events corresponding to real actions taken during this session appear in the analytics dashboard with the correct organization/user attached.

**Pass/Fail:** [ ] Pass  [ ] Fail  [ ] Not checked (no analytics dashboard access)

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Section 20: Mobile Readiness Check

**Actionable(s) proven:** A-23, A-24 (mobile-web only — this section is a lightweight responsive-web smoke check, not a substitute for native Android/iOS signed-build validation, which is tracked separately as its own engineering-side workstream; see `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md` and this sprint's mobile build-gate evidence for that track)

**Steps:**
1. On an actual mobile device (or a browser's device-emulation mode as a fallback), visit `https://beta.triaxisventures.com/auth` and sign in.
2. Navigate through Dashboard, Tasks, and Knowledge Hub.
3. Confirm layout is usable (no horizontal scrolling, no overlapping elements, buttons are tappable).

**Expected result:** The product is usable on a phone-sized screen for the core flows, even though a native mobile app release remains blocked on external credentials.

**Pass/Fail:** [ ] Pass  [ ] Fail

**Evidence:** ______________________________________

**If Fail — Severity:** [ ] P0  [ ] P1  [ ] P2  [ ] P3

---

## Summary Table (fill in after completing all sections)

| # | Section | Actionable(s) | Pass/Fail | Severity if Fail |
|---|---|---|---|---|
| 0 | Production currency | A-01 | | |
| 1 | Investor preview | Known Blocker | | |
| 2 | Sign up | A-02 | | |
| 3 | Login | A-03 | | |
| 4 | Logout | A-04 | | |
| 5 | Password reset | A-05 | | |
| 6 | Tenant 0 access | A-06 | | |
| 7 | Profile/settings | A-07 | | |
| 8 | Document upload | A-12 | | |
| 9 | Documents & Files ingestion | A-12 | | |
| 10 | RAG question | A-13, A-14 | | |
| 11 | AI Review Inbox approval | A-15 | | |
| 12 | Create task from answer | A-16 | | |
| 13 | Dashboard update | A-17 | | |
| 14 | Audit log update | A-18 | | |
| 15 | Timeline update | A-19 | | |
| 16 | Two-tenant isolation | A-08, A-10, A-11, A-14 | | |
| 17 | Invite user | A-08 | | |
| 18 | Dashboard dedupe check | A-20 | | |
| 19 | Analytics event check | A-22 | | |
| 20 | Mobile readiness check | A-23, A-24 (web only) | | |

## After Running This Script

Return the completed script (this file, with checkboxes and evidence filled in) to Claude Code. Each Pass will be used to raise the matching actionable's confidence and, where evidence is sufficient, move it to `Yes`. Each Fail will be logged as a new dated finding, classified by the severity you recorded, and turned into a specific next-sprint fix — not silently absorbed into an existing `Blocked` row without a note.
