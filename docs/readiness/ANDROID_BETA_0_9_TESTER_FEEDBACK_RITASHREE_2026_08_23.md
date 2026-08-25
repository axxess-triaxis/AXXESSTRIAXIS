# Android Beta 0.9 — First Internal Tester Feedback (Ritashree Mahanta)

**Date:** 2026-08-23. **Source:** 17 screenshots (`attachments (2).zip`, founder-forwarded),
sent by Ritashree Mahanta (Co-Founder, Vertical Head & COO, Triaxis Ventures/AXXESS TRIaxis) after
installing AXXESS TRIaxis Android Beta 0.9 as an internal tester — the first real device walkthrough
of the Android release documented in `ANDROID_BETA_0_9_RELEASE_CLOSEOUT_2026_08_22.md`. Screenshots
visually reviewed directly (not OCR — image content, not text). Personal identifying details beyond
the tester's name/role are not reproduced here — this repo is public.

## What the screenshots show

A methodical walkthrough of essentially every top-level navigation item, in order: AI Workspace,
Projects & Programs, Tasks & Workflow, Meetings & Decisions (including the New Meeting form),
Knowledge Hub, Documents & Files, Analytics & Reports, Social Alerts, Stakeholders & CRM, Approvals
& Governance, Audit Logs, Product Analytics, Pilot Conversion, Organization Admin, Integrations,
Beta Readiness, and Settings.

The account is real (not demo) — "The North Eastern Policy, Development and Strategic Initiatives
Collective (NEPDSI-C)," Super Admin role, 1 team member, 1 department. Every page's underlying data
is genuinely live: Audit Logs shows 3 real loaded events with "Live" badges; Product Analytics shows
real counts (1 total user, 0 projects/tasks/meetings/feedback, 6 active modules); Integrations shows
27 catalogued adapters, 20 pilot-enabled, 0 configured; Organization Admin, Pilot Conversion, and
Beta Readiness all render their real, tenant-scoped state correctly. **No crashes, no broken pages,
no error states anywhere across all 17 screenshots.**

The Analytics & Reports screenshot shows the pre-Sprint-1 blanket "Deeper OKR, budget-trend..."
empty-state copy — expected, since this app build predates this session's Analytics 100%-functional
pass (`ANALYTICS_REPORTS_100_PERCENT_CLOSEOUT_2026_08_23.md`); not a regression, just a timing
mismatch between when the mobile bundle was built and when that web-side work shipped.

## The one real, reproducible bug found

**The sidebar navigation never collapses on mobile.** On every single one of the 17 screens, the
full dark desktop-style navigation rail is permanently visible, occupying roughly 45% of the
phone's screen width, leaving only a cramped ~55% column for actual page content. Concrete visible
damage this causes:
- Page titles wrap awkwardly and collide with adjacent controls (e.g. "Documents & File[s]
  Intelligence" overlapping the Filter button; "Analytics &" overlapping the Export Report button).
- Form fields and dropdowns are clipped mid-row (the New Meeting form's "LINKED PROGRAM" dropdown).
- The header search box itself is truncated ("Search portfoli...").

This is almost certainly a responsive-breakpoint mismatch specific to the Android/Capacitor
WebView — the web app's own sidebar collapse-to-drawer behavior at narrow viewports is presumably
already correct (this is a well-established, frequently-used layout across the whole app), so the
Android build is either not reporting the same viewport width Capacitor's WebView actually renders
at, or not re-evaluating the breakpoint the same way a real mobile browser would. Not yet
root-caused or fixed as of this document — that is the explicit next step.

## What this feedback is not claiming

- This is one tester's screenshots from one device/session — not a statistically representative
  sample of Android device/screen-size behavior.
- The underlying data correctness (0 projects, 1 user, etc.) reflects a genuinely fresh/empty tenant
  and is not itself evidence of a bug — it is the expected honest-empty-state behavior this program
  has deliberately built throughout.
- No performance, battery, or crash-log data was included in these screenshots — this document
  covers only what is visually observable in them.

## Outcome / next step

First real internal-tester walkthrough of the shipped Android build: functionally solid (every real
page loads, every empty state is honest, nothing crashes), with one clear, fixable responsive-layout
bug (persistent desktop sidebar on mobile) as the actionable takeaway. Founder confirmed this as the
priority; root-causing and fixing the sidebar breakpoint is the immediate next task, tracked
separately from this feedback-recording document.
