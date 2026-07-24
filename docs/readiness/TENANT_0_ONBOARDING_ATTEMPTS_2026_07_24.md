# Tenant 0 Onboarding Attempts: HITL Evidence Log

Date: 2026-07-24  
Reporter: Sudipta Koushik Sarmah  
Role: Founder and Managing Director, Triaxis Ventures Private Limited  
Product: AXXESS TRIaxis  
Environment: `https://beta.triaxisventures.com`  
Purpose: Preserve HITL-observed Tenant 0 onboarding evidence and convert it into Sprint 1 remediation requirements.

## Executive Summary

Tenant 0 onboarding is partially functional but not yet acceptable for Enterprise Beta 1.0 or investor-facing access.

The live product now allows the founder to authenticate, continue onboarding, provision a Tenant 0 workspace, create/edit at least some live records, upload documents into Knowledge Hub, and log out successfully.

However, the first-run onboarding path remains fragile. The most serious blocker is the investor/demo entry route: `https://beta.triaxisventures.com` redirects to a stale authenticated investor-preview state showing `Ananya Rao`, and the `Continue to workspace` action does not work. This is a P0 investor-facing blocker because YC, investors, and external reviewers need a seamless preview path.

## Attempt 1 Summary

Initial state:

- No visible `Sign up` option existed.
- A sign-up button was subsequently created.

Outcome:

- Attempt 1 established the first onboarding blocker: the live auth surface did not initially expose an obvious sign-up path.

## Attempt 2 Summary

The `Sign Up` button was available.

### Sign-Up Screen

Fields shown:

- Email ID
- Display name
- Password

Actions shown:

- Create account
- Onboarding

Observed behavior:

- `Create account` did not visibly transition to the next screen after all fields were filled.
- A Supabase Auth verification email did arrive.
- Email verification through Supabase link worked.
- Gmail and Microsoft OAuth tabs were present but OAuth did not work.
- Clicking `Onboarding` moved the user to the onboarding path.

### Organization Entry Screen

Options shown:

- Create organization
- Join organization

Starting-focus options shown:

- Knowledge and AI decision support
- Workflow and task execution
- Meetings and institutional coordination

Observed behavior:

- Create organization tab worked.
- Join organization tab worked.

### Create Organization Flow

Organization entered:

- Triaxis Ventures Private Limited

Sector selected:

- Startup

Role selected:

- Super Admin

Department:

- Founder's Office

Workspace:

- AXXESS TRIaxis

Security and beta notices shown:

- Terms of Service
- Privacy Policy
- AI Usage Notice
- Beta Disclaimer

Observed notice issue:

- The four undertakings existed but lacked supporting explanatory text.

Tenant ready screen showed:

- Organization: Triaxis Ventures Private Limited
- Sector: Startup
- Role: Super Admin
- Department: Founder's Office
- Workspace: AXXESS TRIaxis
- Notices: 4/4 accepted

Observed provisioning blocker:

- Clicking `Provision tenant` produced `unauthorized`.
- Workflow stopped at this point.

### Join Organization Flow

Observed behavior:

- Sector and role selection worked.
- Department and workspace input was available.
- Notices could be partially accepted.
- The onboarding flow allowed progress even with only 1/4 notices accepted.
- Provisioning then blocked with: `Complete organization, role, workspace and notice steps before provisioning.`

Policy issue:

- The product needs to formalize which notices are mandatory and which, if any, are optional.
- The UI should not let users reach a confusing provision screen if required notice acceptance is incomplete.

## Attempt 3 Summary

Observed behavior:

- `Create account` still produced no visible reaction.
- `Sign In` worked with email and password.
- Account was likely created via Supabase verification despite missing UI feedback.
- `Continue to onboarding` worked.
- Create organization page retained previous organization data.
- Sector, role, department, and workspace were retained from prior attempts.
- Starting-focus cards became clickable.
- Notices remained without accompanying policy text.
- With all four notices accepted, `Provision tenant` succeeded.

Outcome:

- Tenant 0 workspace became reachable after sign-in and complete onboarding.

## Tenant 0 Workspace Evidence

The live workspace showed:

- User: `sudipta1213`
- Role: `Super Admin`
- Workspace/module routing visible.
- `Tasks & Workflow` selected based on starting focus.
- What's New modal displayed.
- Logout worked and returned the user to sign-in.

## Functional Areas Observed Working or Partially Working

### Tasks & Workflow

Observed:

- Sample tasks rendered.
- Task details panel opened.
- Task timeline rendered with source, AI answer, human decision, workflow action, and audit-style evidence.
- Existing task could be edited.
- New task creation worked.
- Notifications reflected the task update.
- Feedback modal worked.

Issue:

- Feedback form displays beta version as `0.6`; expected version is `0.7`.
- Feedback delivery path to Triaxis Ventures email is not yet configured.

### Executive Dashboard / Golden Path

Observed:

- Golden Path surfaced.
- `Confirm organization` was green ticked after onboarding data entry.
- Organization Admin / pilot-readiness surface opened.

Issues:

- Several golden-path/admin controls appear provider-gated or documentation-gated.
- `Invite team` opens a broad administration surface, but most actions are not actually live.
- The surface explains Sprint 22/23 readiness but does not yet provide usable mutation paths for the founder.

### AI Workspace

Observed:

- AI Workspace renders.
- AI Router panel renders.
- Review Inbox renders.
- Local/demo AI mode is shown.

Issues:

- RAG is not live for real answers.
- AI Review Inbox is empty.
- AI Audit Trail is empty.
- Remote providers show missing credentials.
- Several AI action buttons appear but do not produce live governed workflow.

### Projects & Programs

Observed:

- Sample project rendered.
- List and Kanban views rendered.
- New project creation worked.
- Project `AXXESS TRIaxis` was saved under Triaxis Ventures Private Limited.

### Meetings & Decisions

Observed:

- Schedule Meeting form rendered.

Issue:

- Saving a meeting failed with: `Meeting could not be saved. Check permissions and required fields.`
- Decision log remained empty.

### Knowledge Hub

Observed:

- Initially showed 0 documents.
- Upload worked.
- Seven files were uploaded successfully.
- Uploaded file types included PDF, TXT, PNG, PPTX, MD, DOCX, XLSX.
- Uploaded documents were counted as uploaded, classified, chunked, indexed, and ready.

Issue:

- ZIP upload is not supported.
- Bulk institutional onboarding would benefit from ZIP upload support.

### Documents & Files

Observed:

- Separate from Knowledge Hub.
- Manual document text ingestion UI rendered.

Issue:

- `Index document` did not work.
- The product needs to clarify the distinction between `Knowledge Hub` and `Documents & Files`.

### Analytics & Reports

Observed:

- Page rendered.

Issue:

- Analytics are not wired to live tenant data.
- Page explicitly states that OKR, budget, and delivery-trend computation are not wired.

### Social Alerts

Observed:

- Page rendered.
- RSS, manual intake, and investor demo sources show fallback/demo readiness.

Issue:

- Live provider ingestion is not wired to tenant repositories.

### Stakeholders & CRM

Observed:

- Page rendered.

Issue:

- `Add Contact` does not work.

### Approvals & Governance

Observed:

- Page rendered.
- Placeholder approval timeline rendered.

Issue:

- Live approvals workflow is not wired to connected backend data.

### User Profile

Issue:

- Clicking the user profile does not open a profile screen.
- A profile screen is needed for personal and official details.

### Logout

Observed:

- Logout works and returns the user to sign-in.

## P0 Blockers

### P0-01: Investor Preview Route Is Broken

Observed URL:

`https://beta.triaxisventures.com/auth?next=%2Fdashboard`

Observed issue:

- The investor route shows `Signed In`.
- It shows `Continue to workspace`.
- It shows `Ananya Rao is authenticated`.
- `Continue to workspace` does not work.

Impact:

- YC, investors, and external reviewers cannot seamlessly access the demo/investor preview.
- This blocks investor-facing validation.

Immediate requirement:

- Fix `https://beta.triaxisventures.com` so it routes cleanly to the intended investor preview or workspace.
- Remove stale `Ananya Rao` authenticated state from the default investor route unless intentionally part of a working demo login.
- Ensure `Continue to workspace` works.

### P0-02: First-Run Create Account Has No Visible Success State

Observed issue:

- `Create account` sends Supabase verification email but appears to do nothing in the UI.

Impact:

- Founder/user cannot tell whether account creation succeeded.
- This creates duplicate attempts and uncertainty.

Immediate requirement:

- Show clear success state: email sent, verify email, return to sign-in/onboarding.

### P0-03: Provision Tenant Can Fail With Raw `unauthorized`

Observed issue:

- First provisioning attempt failed with raw `unauthorized`.
- Later attempt succeeded after sign-in.

Impact:

- User-facing technical error undermines trust.
- Flow does not explain whether sign-in, session refresh, email verification, or permission state is required.

Immediate requirement:

- Convert raw unauthorized into safe guided copy.
- If session/email verification is required, route user accordingly.

## P1 Issues

- Security/beta notices need supporting explanatory text.
- Required notice acceptance policy must be formalized.
- Join organization flow should not advance ambiguously with incomplete required notices.
- Feedback form must show beta `0.7`, not `0.6`.
- Meetings save path fails.
- Documents & Files indexing does not work.
- Stakeholders `Add Contact` does not work.
- Analytics and Reports are not live.
- Social Alerts are not live.
- Approvals & Governance is mostly placeholder.
- Profile menu does not open profile screen.
- Knowledge Hub and Documents & Files boundary needs explanation.

## P2 Issues

- `Back to auth` appears on many screens and may need contextual review.
- ZIP upload is not supported but is important for bulk RAG onboarding.
- Golden Path admin surfaces expose many provider-gated/non-live controls.
- AI provider credentials are missing and remote model routing is not live.
- Feedback delivery path to Triaxis Ventures email is not configured.

## Positive Evidence

- Sign-in works after account creation/verification.
- Logout works.
- Tenant 0 can be provisioned after authenticated onboarding.
- Triaxis Ventures Private Limited appears as organization.
- Super Admin role appears.
- Task creation/editing works.
- Project creation works.
- Knowledge Hub upload and indexing counters work.
- Notifications reflect at least some task activity.
- Feedback submission UX works.
- Several major modules render without crashing.

## Sprint 1 Implication

Sprint 1 should be treated as **not closed** until the following are fixed or explicitly blocked:

- Investor preview route.
- Create-account success state.
- Provision-tenant unauthorized handling.
- Notice policy/supporting text.
- Profile navigation or documented blocker.
- Beta version mismatch in feedback.
- Tenant 0 closeout evidence.

## Sprint 2 Implication

Sprint 2 should not begin until the investor route and first-run onboarding blockers are corrected, unless the founder explicitly accepts the risk.

The next Claude Code prompt should be a Sprint 1 correction prompt, not a Sprint 2 expansion prompt.

