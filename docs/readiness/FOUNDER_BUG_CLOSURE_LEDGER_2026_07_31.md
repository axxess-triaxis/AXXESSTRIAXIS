# Founder Bug Closure Ledger

**Why this exists:** an external session-analysis tool ("Paxel") flagged that despite diligent, conclusive in-session debugging, there is no durable, externally-visible "bug reported → fix → verification → outcome" trail across this program's history. This ledger is that trail — every founder-reported defect found in this repo's documentation (2026-07-22 through 2026-07-31), cross-referenced against the actual commit history, then **individually re-dispositioned by the founder from live, first-hand knowledge on 2026-08-01.**

**Method:** built from two independent research passes over repo evidence — (1) full read of `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`, `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, every `*_CLOSEOUT_*.md` in `docs/readiness/`, and the beta feedback folder; (2) full `git log` (474 commits, 2026-07-02 → 2026-07-31). That first pass is the *repo-verified* evidence layer (commit hashes, test counts, deployment IDs, closeout-doc quotes) cited inline below. **The founder then reviewed every single item against their own live product knowledge and corrected or upgraded the disposition where the repo's own docs were silent, stale, or hadn't caught up to a fix the founder knows landed** — those are marked **Founder-confirmed (2026-08-01)** to keep the two evidence types distinct, per this program's standing rule that founder attestation and independently-verified repo evidence are both real evidence, but not the same kind.

## Headline answer to "does anything actually close"

**68 distinct founder-reported defects** across 11 days (65 from the original 2026-08-01 review pass, #66 a same-day regression from item #64's own fix, #67/#68 from a 2026-08-02 live pilot debugging pass). After the founder's 2026-08-01 review pass:

| Status | Count | Meaning |
|---|---:|---|
| **Resolved (repo-verified and/or founder-confirmed live)** | **~52** | Real fix, real evidence, and in most cases the founder's own direct confirmation |
| **Partial** | **3** | A-41 (90%), Golden Path checklist ticking (50%), OpenAI/RAG answer synthesis (80%, live walkthrough sign-off pending) |
| **Open — no fix exists / still broken on live** | **7** | Meeting scheduling save, ZIP/MP4 upload, A-29 (Security tab), A-30 (permission schema **still visible on live**), A-35 (feedback still not routing to mail), A-67 (invalid service-role JWT) |
| **Blocked — SMTP/email delivery (single root cause, multiple symptoms)** | **~5** | See callout below — this is the single largest concentration of remaining defects |

**The honest answer to Paxel's finding**: the overwhelming majority of bugs close, with a real commit and, once the founder re-checked live on 2026-08-01, direct confirmation for nearly every item that repo docs alone couldn't settle. What genuinely recurred were **three defect families**, all now dispositioned by the founder below, and **one cross-cutting infrastructure gap (SMTP/email) that is the actual root cause behind roughly 5 separately-numbered "bugs"** — not 5 unrelated failures, one unresolved provider dependency.

### Cross-cutting blocker: SMTP / email delivery

Founder's own observation on review: "SMTP setup can resolve almost 7-8 standing issues." Confirmed against the ledger — the following are **not independent defects**, they are the **same unresolved dependency** surfacing in different UI locations: A-05 (password reset), A-08 (invitation emails), A-35 (feedback routing), A-65 (feedback-to-`triaxisgrp@gmail.com`), A-74 (password recovery post-provider-switch). Closing this once (a working, tested SMTP/Resend/Elastic Mail delivery path in production) is likely to close all five at once, rather than treating them as five separate investigations.

**Founder disposition (2026-08-01): ~90% readiness overall, DNS verification specifically ~60% complete, live testing pending.** Resend configured into Vercel (`RESEND_API_KEY`), Supabase, and Codex (via MCP, for sending mail directly) — this broader setup work is ~90% done. Narrowly on DNS (~60% complete): DKIM (`resend._domainkey.triaxisventures.com`) present with a real key and SPF (`v=spf1 include:amazonses.com ~all` at `send.triaxisventures.com`) are correctly formed and placed; the MX record for Resend's SPF check was saved as a TXT record instead of an actual MX record (needs re-adding with record type MX, same host/value/priority), and the DMARC record is placed directly at `send.triaxisventures.com` instead of `_dmarc.send.triaxisventures.com`, so it has no effect as placed. Once both are corrected and Resend's dashboard shows the domain fully verified, `AXXESS_INVITATION_EMAIL_FROM`/`AXXESS_FEEDBACK_EMAIL_FROM` still need to be set in Vercel (not yet done) before a live end-to-end test of A-05/A-08/A-35/A-65/A-74 is meaningful.

### The three recurring defect families — founder dispositions

1. **Stale-session / auto-continue security bug** (A-27 → A-40 → #64) — flagged twice in July, both times explicitly deferred ("document, don't fix yet"), root-caused and fixed 2026-07-31.
   **Founder disposition: CLOSED.** Confirmed via full test suite (826/826), production deployment (`readyState: READY`, verified live), and the founder's direct instruction to document this as closed.
2. **Demo/live data leakage** (A-28 → A-69, 9 fix commits total) — recurred across 3 more admin surfaces after a first fix, one instance (Settings AI Config tab) didn't hold.
   **Founder disposition: 90-95% resolved.** Deliberately short of 100% given the recurrence history — residual risk of an as-yet-unfound surface is acknowledged, not declared fully closed.
3. **Stale "Pitch deck" placeholder polluting RAG** (A-62 → #59 → #61) — patched at the symptom level twice before the real root cause (no text-extraction pipeline existed at all) was found.
   **Founder disposition: 100% resolved.**

## Full ledger

Format: **[ID] Description** — Root cause → Resolution → **Founder disposition (2026-08-01)**.

### Onboarding & auth (early)

1. **[Product Issue 1] No sign-up entry point / no OAuth options** — Missing UI + missing OAuth callback handling. Fixed 07-22, commit `32350c9`, verified live at the time. **Founder: 100% resolved.**
2. **[Attempt 2] "Create account" not functionally enabled** — repo docs showed this as logged-only pending #3's fix. **Founder: 100% resolved.**
3. **[Product Issue 2] Onboarding wizard completable while unauthenticated, opaque failure** — `/onboarding` missing from protected routes; fixed Sprint 42 (07-23). **Founder: 100% resolved.**
4. **[Attempt 3] Join-org notice-acceptance not enforced per-step** — founder's original diagnosis was wrong (blamed unrelated fields); enforced later. **Founder: 100% resolved.**
5. **[Attempt 4] "Create account" shows no visible UI reaction** — superseded by #6. **Founder: 100% resolved.**
6. **[A-02] No visible success-state confirmation on signup** — fixed and HITL-confirmed live 07-25. SMTP provider changed 07-29 after that verification. **Founder: Pending** — retest needed post-SMTP-provider-change (see SMTP callout above).

### Live workspace tour, 2026-07-24

7. **Meeting scheduling fails ("could not be saved")** — no fix found in repo docs. **Founder: Open and unresolved.**
8. **Stakeholders "Add Contact" does not work** — repo docs only traced a related-but-different symptom (A-58, placeholder values). **Founder: 100% resolved.**
9. **Documents "Index document" does not work** — fixed under A-61 (07-26), live HITL-confirmed same day. **Resolved (repo-verified).**
10. **ZIP/MP4 uploads unsupported** — no fix found. **Founder: Unresolved.**
11. **Profile/avatar dropdown doesn't navigate** — no tracked resolution in repo docs. **Founder: 100% resolved.**
12. **Feedback form shows "beta 0.6" not "beta 0.7"** — no confirmed fix in repo docs. **Founder: 100% resolved.**
13. **Investor Preview "Continue to workspace" dead end** — fixed same day (P0 Correction, 07-24). **Founder: 100% resolved.**
14. **Root domain lands on stale authenticated-looking page** — same fix as #13. **Founder: 100% resolved.**

### Golden Path / Settings / Dashboard sweep, 2026-07-25 (A-05 through A-41)

**Founder note on this whole section: "Golden Path is 80-85% done, final pass needed for 'green tick off.'"**

15. **[A-05] Password reset flow** — code-only, 65% confidence in repo docs. **Founder: Unresolved — root cause almost certainly the same unresolved SMTP dependency** (see callout above).
16. **[A-08] Invitation emails never arrive despite success toast** — three root causes found across three dates; third occurrence (valid key+URL, still failing) never re-investigated per repo docs. **Founder: ~50% resolved — remaining issue is the SMTP mail trigger/delivery chain** (see callout above).
17. **[A-21] "Connect Slack" raw JSON error, wrong gating message** — confirmed UI defect plus zero production OAuth credentials for 7/8 connectors. **Founder: Resolved — common root cause identified as credentials not mapped to Vercel and/or Supabase** (this pattern belongs with the wider Integrations tracking, not treated as a standalone UI bug).
18. **[A-26] Google/Microsoft sign-in non-functional** — Google resolved 07-29; Microsoft never registered as a provider at the time. **Founder: Google 100% resolved. Microsoft Entra setup complete and credentials mapped — final live sign-in test still outstanding.**
19. **[A-27] "Welcome Aboard" reuses an existing session** — founder: "very risky security wise." Explicitly deferred. **Same defect family as #64 — see CLOSED disposition above.**
20. **[A-28] Settings→Organization tab shows demo data on real tenant** — root-caused 07-28, live HITL-confirmed 07-29. **Founder: 100% resolved** (recurred in 3 more surfaces as #48 — see demo/leakage family disposition above).
21. **[A-29] Security tab "Configure" buttons dead, Permissions table empty** — buttons made honestly `disabled` 07-28. **Founder: Unresolved.**
22. **[A-30] Full 6-role permission schema visible to every viewer** — role-scoped view fixed 07-28 per repo docs. **Founder: Unresolved on live — schema still shows.** (Real, currently-live exposure — treat as a live defect, not a documentation gap.)
23. **[A-31] AI Configuration tab fully placeholder** — entire tab deleted 07-29. **Founder: 100% resolved.**
24. **[A-32] "Demo" tab visible in live beta Settings** — gated out 07-29. **Founder: 100% resolved on both deployments.**
25. **[A-33] "Review Roles" misroutes to Security tab** — **Founder: 100% resolved.**
26. **[A-34] Redundant "Guided demo" gate before Knowledge Hub** — **Founder: 100% resolved** — now reads "guided setup" instead of "guided demo."
27. **[A-35] "Submit Feedback" has no destination inbox** — Feedback Inbox added 07-27. **Founder: Unresolved — still not routing to mail** (part of the SMTP callout above).
28. **[A-36] "Invite Pilot Team" misroutes** — fixed 07-27, live HITL-retested same day. **Founder: 100% resolved.**
29. **[A-37] "Assign Roles" misroutes** — same fix family as #28, live HITL-retested. **Founder: 100% resolved.**
30. **[A-38] "Back" from Security exits straight to "Continue to Workspace"** — **Founder: 100% resolved** — now lands at Executive Dashboard.
31. **[A-39] "Send feedback" lands on Executive Dashboard instead** — fixed 07-27, live HITL-retested. **Founder: 100% resolved.**
32. **[A-40] "Back" navigation cycles Sign Up/Sign In → auto-continues to workspace** — founder: "very bad UX," explicitly deferred at the time. **Founder: 100% resolved** — same root cause as #19, both closed by #64.
33. **[A-41] Golden Path checklist: 4/10 items misroute** — aggregates #27-29/#31. **Founder: 90% resolved.**

### Executive Dashboard sweep, 2026-07-25 (A-42 through A-54)

Founder: "almost entirely irrelevant/placeholder" at the time. 13 items (A-42 through A-54) — duplicate/dead feedback entry points consolidated, fake "Export Briefing" made real, non-functional search wired to a real filter, misleading dashboard tiles corrected or upgraded to real counts, dead project-row clicks wired to real navigation, fabricated budget/spend figures removed, duplicate checklists merged. Strategic Objectives/AI Recommendations/Risk Heatmap explicitly **not fixed** — no real backend exists yet for those specifically. **Founder: 100% resolved** for the full A-42–A-54 block (Strategic Objectives/Risk Heatmap real-data build remains separately open — see below).

### RAG remediation, 2026-07-25/26 (A-55 through A-67)

35. **[A-55] RAG returns templated "Tenant 0 dummy data" text** — query-echo removed 07-26. **Founder: 100% resolved — indexed documents fetch correctly now.**
36. **[A-56] "72% confidence" is an unexplained black box** — "Why this score" explainability UI added 07-26. **Founder: 100% resolved.**
37. **[A-57] AI Review Inbox escalations produce no visible CRM record** — display-gap fixed 07-26. **Founder: 100% resolved.**
38. **[A-58] Stakeholder form auto-populates fake Influence/Engagement values** — honest blank defaults 07-26. **Founder: 100% resolved.**
39. **[A-59] "Review Approval Queue" misroutes to Analytics** — fixed 07-26. **Founder: Resolved.**
40. **[A-60] "Export Report" is a clickable placeholder** — real approvals API + export built 07-26. **Founder: Resolved.**
41. **[A-61] Knowledge Hub uploads not offered as RAG candidates, paste-only** — fixed 07-26, live HITL-confirmed. **Founder: 100% resolved.**
42. **[A-62] Stale "Pitch deck" placeholder cited as sole RAG source** — mechanism fixed 07-26; document itself recurred as #59/#61 below. **See stale-RAG-document family disposition above: 100% resolved.**
43. **[A-63] Unclear whether created records carry real RAG content** — fixed 07-26. **Founder: Resolved.**
44. **[A-64] "Ask AI Workspace" misroutes to Tasks** — fixed 07-26. **Founder: Resolved.**
45. **[A-65] "Send Feedback" never reaches `triaxisgrp@gmail.com`** — two root causes fixed in code; blocked purely on a production secret. **Founder: Unresolved — part of the SMTP callout above; SMTP setup can resolve this alongside ~7-8 standing issues.**
46. **[A-66] Knowledge Hub upload shows fake success, never persists** — fixed 07-26 (server-side proxy route), live HITL-retested same day. **Founder: 100% resolved.**
47. **[A-67] Production service-role key is not a valid JWT** — found 07-26, requires founder key rotation. **Founder: Unresolved.**

### Sprint TP-1/TP-2, pilot incidents, connector work — 2026-07-28/29

48. **[A-69] Demo-org leak recurs in 3 more admin surfaces + hardcoded demo RAG query auto-runs for every tenant** — fixed same pattern as A-28. **Founder: 100% resolved** (part of the demo/leakage family — see 90-95% overall family disposition above, which accounts for residual risk beyond this specific instance).
49. **[A-71] Pilot 1 (Imprints) onboarding blocked on false "Organization name required"** — no code defect found after full field-path trace; unconfirmed hypothesis (WhatsApp in-app-browser quirk). **Founder: 100% resolved — RCA not needed, confirmed as user-side error by the user, who onboarded seamlessly on retry.**
50. **[A-72] Google sign-in hits Vercel's Deployment Protection wall** — founder reconfigured Supabase Site URL directly. **Founder: 100% resolved.**
51. **[A-73] Google sign-in fails "Unable to exchange external code"** — founder corrected the Client ID/Secret mapping. **Founder: 100% resolved.**
52. **[A-74] Password recovery fails after SMTP provider switch** — diagnostic logging fixed; underlying SMTP failure not. **Founder: Unresolved — part of the SMTP callout above.**
53. **[A-75] Google Calendar/Drive/Gmail connectors: "Error 403 access_denied"** — root cause: OAuth app stuck in Google's "Testing" status, no test users added. **Founder: 100% resolved** (founder completed the Google Cloud Console action).
54. **[A-76] Email Connector Pilot shows unlabeled demo mailbox messages to a real tenant** — fixed 07-29 (fallback array not actually gated behind demo-mode check). **Founder: 100% resolved.**
55. **Google Calendar/Drive `redirect_uri_mismatch`** — distinct from #51, required registering additional redirect URIs. **Founder: 100% resolved — Google Workspace fully resolved.**
56. **GitHub OAuth token exchange missing `Accept: application/json`** — fixed 07-30. **Founder: 100% resolved.**

### 2026-07-30/31 — sample data, RAG extraction, chunked upload, session security

57. **"Sample District Program" and other seeded demo content persist as stale data** — no removal mechanism existed; built one (two-step confirm UI). **Founder: Resolved.**
58. **Golden Path checklist inconsistently ticks off completed steps** — only 2/10 steps were ever auto-detected from real data; extended to 5/10, remaining 5 documented as still-manual (no reliable signal exists). **Founder: 50% done — pending confirmation from HITL.**
59. **"Pitch deck" can only be un-indexed by deleting it entirely** — recurrence of #42; relabeled "Un-index (Archive)" with an explicit tooltip. **Founder: 100% resolved — un-index works now.**
60. **Knowledge Hub document count doesn't update after deletion, even on refresh** — header stats now filter soft-deleted rows like every other consumer already did. **Founder: Resolved.**
61. **RAG returns literal "null"/placeholder text even citing the correct document** — root cause: no PDF/DOCX/OCR extraction pipeline existed anywhere; RAG text was metadata-only. Built the full pipeline. **Founder: 100% resolved** (part of the stale-RAG-document family disposition above).
62. **RAG returns real citations but zero synthesized answer content** — root cause: zero real external-API calls existed for 5 of 7 AI providers (only Kimi/DeepSeek were genuine). Built a real OpenAI adapter with a fail-closed spend guard; same guard applied to OpenRouter. **Founder: 80% resolved — live walkthrough HITL sign-off still pending.**
63. **Document upload fails with a generic error on a real PDF** — root cause: Vercel's ~4.5MB serverless body limit silently exceeded. Rebuilt as chunked upload. **Founder: 100% resolved — large document upload confirmed working.**
64. **Stale-session auto-continue, final root-cause and fix** — founder: "0/100 incident acceptability." Same defect family as #19/#32. Fixed with a non-renewing 24h absolute session cap + focus/visibility re-validation. Full suite green (826/826), deployed to production 2026-07-31. **Founder: Resolved / CLOSED.**
65. **A-79: AI outputs ended at passive text, dead "Create task from answer" link** — two-step actionables follow-through with a 5-signal gate. Built, tested (853/853), deployed to production 2026-07-31. **Founder: Resolved.**

### 2026-08-01 — regression introduced by item #64's own fix

66. **Post-login, clicking any workspace immediately logs the user out to the Sign In page** — founder report: "New issue... Given the severity (this is actively breaking the app for logged-in users right now)... Immediately as user comfort and trust is most important and this is a major hiccup." A direct regression from item #64's fix, not a new unrelated defect: item #64 added a focus/visibility-change revalidation effect in `AuthProvider.tsx` to catch already-open tabs whose session was revoked server-side. That effect fired an extra `/api/auth/session` call on tab focus/navigation, racing against a page's own normal parallel data-fetch calls. Supabase refresh tokens are single-use (rotate on every use): when concurrent requests both attempted to refresh a near-expiry access token, the losing request's now-already-rotated refresh token failed, and `getServerAuthSession`'s catch-all error handler called `clearServerAuthCookies()` — destructively wiping cookies for the whole browser, including the tokens the winning request had just legitimately refreshed. **Root-caused via real production evidence** (`vercel logs`: a 200 on `/api/auth/session` followed ~2 seconds later by 13 simultaneous 401s from one page's own parallel data-fetch burst). Fixed by (1) removing the focus/visibility revalidation effect entirely — it was always a secondary mechanism; item #64's actual security fix (the 24h absolute session anchor + the `/auth` real-vs-demo split) does not depend on it — and (2) making `getServerAuthSession`'s refresh-failure path fall through to a plain `null` for that one request instead of clearing cookies, so a losing request never destroys a sibling request's valid session. Commit `d1da9b3` ("fix(auth): stop concurrent refresh-token race from logging users out"). Verified: full suite green, production build clean, deployed to production 2026-08-01 (`readyState: READY`), live site re-checked reachable post-deploy with a clean sign-in page and no console errors. **Founder: Resolved / CLOSED** — per explicit founder instruction to note this issue closed in the relevant debugging docs.

### 2026-08-02 — live pilot debugging pass (AI Workspace, SMTP)

67. **[A-81] A failed OpenAI API call's error-explanation text could be turned into a real, saved Task via the A-79 actionable pop-up** — founder screenshot: an OpenAI request failed with a live 429 (rate limit); `src/services/ai/providers/openAiProvider.ts` correctly returned its honest fallback text ("OpenAI / ChatGPT request failed (429). This response was not generated by a live model call; treat it as unverified.", `confidence: 0.3` — this fallback itself was working exactly as designed, not the bug). **Root cause:** A-79's actionable gate (`src/services/agentic/actionableGate.ts`) still fired on this low-confidence failure text — its `detectNewContext` signal fires on "first answer this session" regardless of confidence, with no other signal checking whether the text was a real answer at all. The founder selected "Create/edit task," and the app created a real Task record with the literal error message as its title and description — confirmed by a screenshot of Tasks & Workflow showing several tasks already marked "Completed" with this exact garbage content, meaning it had happened more than once before being caught. **Fixed same day:** `evaluateActionableGate` now checks for the exact provider-failure marker text — present, deliberately, in every fallback branch of both `openAiProvider.ts` and `openRouterProvider.ts` for exactly this purpose — as a hard stop before any of the 5 signals run, so a placeholder can never open the pop-up under any combination of triggers. The manual "Create actionable from answer" button is untouched (a deliberate user choice on any answer, not an automatic suggestion). 4 new tests, including one confirming a genuine real answer at the same low confidence a failure would have still shows the prompt — the fix targets the placeholder marker, not confidence alone, so real low-confidence answers are not suppressed. Full suite green (995/995 — 2 known CPU-contention-flaky tests, unrelated to this change, independently reconfirmed passing in isolation), production build clean, deployed to production 2026-08-02 (`readyState: READY`). Commit `4b044fb`. **Founder: Resolved / CLOSED.** **Separately, still open (not part of this fix):** why OpenAI is returning 429 in the first place — real account rate/quota limit vs. the spend-guard's own budget check — not diagnosed.
68. **Invitations and beta-feedback emails send from Resend's sandbox address (`onboarding@resend.dev`), which only reliably delivers to the Resend account owner's own inbox** — not a code defect: `src/services/email/invitationEmail.ts` and `feedbackEmail.ts` both already had a safe, deliberate fallback to the sandbox address when `AXXESS_INVITATION_EMAIL_FROM`/`AXXESS_FEEDBACK_EMAIL_FROM` were unset — confirmed via `vercel env ls` that both were genuinely never set in Vercel production. **Fixed same day:** set both env vars to `AXXESS by Triaxis <notifications@send.triaxisventures.com>` in Vercel production and redeployed to activate them (`readyState: READY`, 2026-08-02). **Not yet a fully closed loop:** this only changes which address the mail claims to be from — actual deliverability to non-account-owner recipients still depends on the MX/DMARC DNS fix for `send.triaxisventures.com` being completed (in progress, founder working through Wix DNS live as of this entry) and on which domain is actually verified in Resend's own dashboard. **Founder: env var fix deployed; DNS-dependent deliverability still open, tracked under the SMTP cross-cutting blocker above.**

## What genuinely remains open

**No fix exists yet (code work required):**
- Meeting-scheduling save failure (#7)
- ZIP/MP4 upload support (#10)
- A-29: Security tab dead "Configure" buttons (#21)
- A-30: role-permission schema **still visible to all viewers on live** (#22) — this is a real, currently-live exposure and should be treated with the same urgency as the original report, not as a stale/settled item
- Strategic Objectives / AI Recommendations / Risk Heatmap real data (Executive Dashboard)
- "Back" button UX / global back-button request (broader ask, separate from the specific A-38/A-40 routing bugs which are closed)

**Blocked on the single SMTP/email dependency (#/5 items — see callout above):**
- A-05 password reset, A-08 invitation emails (~50%), A-35 feedback routing, A-65 feedback-to-inbox, A-74 password recovery post-provider-switch

**Blocked on a separate founder/infra action:**
- A-67: production service-role key is not a valid JWT, needs rotation

**Partial, live sign-off pending:**
- A-41 Golden Path routing (90%)
- Golden Path checklist auto-ticking (50%, #58)
- OpenAI/RAG real-answer-synthesis live walkthrough (80%, #62)
- A-02 signup success confirmation — retest needed after the 07-29 SMTP provider change (#6)

## What this ledger is not

The repo-verified layer (commit hashes, test counts, deployment IDs, closeout-doc quotes) was independently mined from this repository's own documentation and git history, not asserted. The founder-confirmed layer, added 2026-08-01, reflects the founder's own direct, live product knowledge overriding or filling gaps in what the repo's docs alone could show — it is real evidence (the founder is this program's HITL authority and the person who actually uses the live product), but it is a distinct evidence type from an independently-reproducible commit/test, and is labeled as such throughout rather than blended in silently.
