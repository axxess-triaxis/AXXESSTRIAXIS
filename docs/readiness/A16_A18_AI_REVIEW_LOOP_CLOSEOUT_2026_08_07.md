# Closeout -- A-16, A-18 (and audit of A-15, A-17, A-19, A-20)

Date: 2026-08-07
Governance source: `CLAUDE.md` evidence-chain discipline
Status: **A-16 and A-18 permanently closed (`Yes`).** A-15, A-17, A-19 remain `Blocked`, each with a
specific, cheap next action named. A-20 is downgraded from an implicit "probably fine" framing to
explicitly `Blocked (contradicted)`, per new evidence.

## Why This Document Exists

The founder asked for six items -- A-15 through A-20, all `Verify X` acceptance criteria dated
2026-07-24 (Sprint 5) -- to be closed, stating they were "already closed" and asking that this repo's
documentation be checked and a closeout doc written. Per this program's evidence-chain discipline,
a founder instruction to close an item is not itself the evidence; it is a prompt to go find or
establish the evidence, honestly, including saying so if some items don't actually qualify. This
document is the result of that check: two of the six (A-16, A-18) do have genuine, dated, live
evidence already sitting in the repo -- the exact same "real work done, never synced back to the
matrix" pattern already found and fixed for A-27/A-33/A-79/A-84 through A-90. The other four do not,
for reasons specific to each, stated below rather than silently assumed away.

**Discovery method:** grepped every `docs/readiness/*.md` file for each literal ID, then chased two
documents the matrix rows themselves did not cite but which cover the same production session:
`AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md` (a 2026-07-25 live HITL walkthrough,
one day after Sprint 5) and `HITL_LOOP_COMPLETION_KANBAN_2026_07_26.md` (a synthesis of that
walkthrough against every AI-Workspace-to-real-record path this program tracks). Both citations
below were independently re-verified by direct grep against those source files before this document
was written, not taken from a subagent's summary alone.

## A-16 -- Approved AI output creates real work: CLOSED

**Criterion:** "Task, project, approval, or stakeholder note created."

**Live evidence:** `AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md:43` -- "Real `Create Task`
plus `Approve and Create` on a real pending review produced a real task visible in Tasks &
Workflow." Independently corroborated in `HITL_LOOP_COMPLETION_KANBAN_2026_07_26.md:39-40,64`:
"Task destination confirmed real and live, with a real audit trail in the Review-to-work timeline
(confirmed directly by the HITL, 2026-07-25 walkthrough, pre-existing capability)."

**Why this satisfies the criterion exactly:** the row asks whether approving an AI answer creates
real work -- a Task, in this instance. A named human (the HITL/founder) clicked "Create Task" then
"Approve and Create" on a real pending AI review, and a real Task record appeared in Tasks &
Workflow. This is not code-only evidence; it is a dated, live, production action with a named
outcome.

**Status changed:** `Blocked` -> `Yes`. **Confidence:** 80% (code) -> 95% (code + live HITL).

## A-18 -- Audit log updates after workflow: CLOSED

**Criterion:** "Audit event exists with actor, action, time, and source."

**Live evidence:** same 2026-07-25 walkthrough, same citation line: "real audit trail `Audit
26d722e1`, actor Super Admin, and real timestamps in the Review-to-work timeline." This live-confirms
**actor** ("Super Admin") and **time** ("real timestamps") directly, plus a real audit record ID
(`Audit 26d722e1`).

**Action and source, confirmed via code, not live narration:** the walkthrough's summary prose
didn't individually transcribe the audit row's `action` or `source` fields. Direct read of the
write path that produced that exact row, `src/services/workflows/liveTenantWorkflow.ts:395-409`
(unchanged since, confirmed via current file read), shows every workflow-decision-triggered audit
event is written with a fixed literal `action: "ai.review.workflow_action_created"` and a
`metadata.sourceAuditId` field pointing back to the originating AI review. Since the row the HITL
viewed was produced by exactly this code path, those two fields were necessarily present on it --
this is a deterministic code guarantee on the specific row already proven to exist live, not a
separate unverified claim.

**Why this is enough, but noted as slightly less airtight than A-16:** A-16's evidence is 100% live
narration. A-18's is live narration (ID, actor, time) plus a code-level guarantee (action, source)
about that same, already-proven-to-exist row. Confidence set at 92%, one point below A-16's 95%, to
reflect that two of the five required fields were confirmed by code inference rather than direct
observation -- still well above this program's 80% closure threshold, and the inference is about a
fixed literal in unchanged code, not a probabilistic guess.

**Status changed:** `Blocked` -> `Yes`. **Confidence:** 90% (code) -> 92% (code + live HITL +
code-guaranteed fields on that same live row).

## A-15, A-17, A-19 -- Not closed, each missing one specific thing

These three were re-audited with the same rigor and found genuinely short of live evidence for
their specific criteria, despite closely related work having happened. Each is left `Blocked` with
a named, cheap next action rather than force-closed:

- **A-15** (AI answer can be **approved, rejected, or edited**): only the *approve* path
  (`Create Task` + `Approve and Create`) has ever been clicked live. Reject and Edit are both wired
  in code (`AIReviewInboxPage.tsx`'s `decide(reviewId, "approved"|"edited"|"rejected"|"escalated",
  ...)`, a live "Reject" button present in the component) but neither has a live HITL click on
  record anywhere in this repo's documentation. **Cheap close:** one live Reject click, one live
  Edit-then-approve click.
- **A-17** (dashboard reflects new activity or work item): Sprint 5's fix (rewiring
  `pendingApprovals` off an always-empty stub) is real code, but no document -- including the
  2026-07-25 walkthrough that produced A-16/A-18's evidence -- records the HITL actually looking at
  the dashboard after that same Task-creation event. **Cheap close:** after the golden path creates
  one real Task/Approval, glance at the dashboard and confirm it reflects it.
- **A-19** (timeline shows source, AI answer, human decision, action, and audit event, all five):
  circumstantially strong -- the walkthrough confirms the audit-trail portion rendered, and
  `WorkflowTimelinePanel.tsx`'s own default description names all five elements near-verbatim,
  with 3 of the 5 event types guaranteed created by the same code path already proven live in A-18.
  But this program's own synthesis document says the full five-element loop has never been watched
  in one pass: `HITL_LOOP_COMPLETION_KANBAN_2026_07_26.md:74`, "No single live pass has exercised
  the loop start-to-finish... since all fixes landed together," and lines 78-81, "cannot move to
  `Yes` from code evidence alone." Closing this against that document's own explicit bar, on
  inference alone, would be exactly the kind of overreach this repo's evidence discipline exists to
  prevent. **Cheap close:** one screenshot of the Review-to-work timeline showing all five elements
  together in a single view.

## A-20 -- Not closed, and actively contradicted by later evidence

**Criterion:** "No duplicate dashboard API/request behavior."

**What A-20 was originally scoped to, and remains true:** `src/hooks/liveWorkspaceMetricsCache.ts`,
a shared tenant-scoped cache preventing three dashboard hook call sites from each independently
re-fetching the *same* workspace-metrics data. Confirmed intact and unregressed as of the Sprint 4
matrix entry, and nothing since has touched or broken this specific mechanism.

**What later evidence found, which the row's confident 85%/"code" framing did not anticipate:**
A-86's live production investigation (`A84_A90_UNDOCUMENTED_CLOSED_ACTIONABLES_CLOSEOUT_2026_08_07.md`,
sourced from real `npx vercel logs`) found that at dashboard mount, roughly 20 distinct, *different*
API endpoints (`/api/repositories/*`, `/api/dashboard/*-signals`, `/api/crm/leads`,
`/api/financial-watch`, `/api/social-alerts/status`, `/api/workflows/timeline`,
`/api/auth/session`) all fire simultaneously, with zero coalescing across roughly 84 separate
`getServerAuthSession` call sites, each landing in its own Vercel serverless instance with no
shared memory. This burst was severe enough to trigger a real Supabase refresh-token reuse-detection
race and kill live production sessions -- a `CRITICAL` incident, fixed by commit `da01319`
(see A-86's own closeout for the full mechanism).

**Why this isn't force-closed, and isn't left silently unaffected either:** strictly, A-86's
finding is not "duplicate" requests in the narrow sense A-20's mechanism targets (the same data
fetched twice) -- it's many *different* single calls, uncoordinated. But it directly contradicts
the plain-English reading of this row's own stated criterion, and more importantly it contradicts
the confidence this row sat at: 85%, "code," with an implicit "probably fine, just needs a live
check" framing. The first time anyone actually looked at live dashboard-mount request behavior in
detail, it turned out uncoordinated enough to cause a production outage.

**Status:** kept `Blocked`, re-labeled `Blocked (contradicted)`. **Confidence:** lowered 85% -> 60%.
**Not a cheap close:** unlike A-15/A-17/A-19 above, this doesn't just need one more live look --
either this row's criterion needs a narrower, explicit rewording (deduplication of *identical*
calls specifically, which genuinely is fine), or new work would be needed to coalesce the ~20-call
burst itself, which is out of scope for this correction pass.

## What Changed

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`: A-16 and A-18 rows changed `Blocked` -> `Yes`
  with full evidence citations added inline. A-15, A-17, A-19 rows kept `Blocked`, each with a
  correction note stating exactly what's missing. A-20 row kept `Blocked`, re-labeled
  `(contradicted)`, confidence lowered 85% -> 60%, with the A-86 evidence cited inline.
- New file: `docs/readiness/A16_A18_AI_REVIEW_LOOP_CLOSEOUT_2026_08_07.md` (this document).

## What Did Not Change

- No application code changed. The underlying live evidence for A-16/A-18 is from 2026-07-25 --
  this pass found and formalized it, it did not create it.
- A-15, A-17, A-19, A-20 remain exactly as evidenced as before this pass -- none were closed on
  inference, and A-20's underlying `liveWorkspaceMetricsCache.ts` mechanism was not touched.

## What Was Verified

- Both A-16 and A-18's core citations (`AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md:43`
  and the corroborating `HITL_LOOP_COMPLETION_KANBAN_2026_07_26.md` lines) were independently
  re-read directly from the source files as part of writing this document, not taken from a
  subagent summary alone.
- `src/services/workflows/liveTenantWorkflow.ts:395-409`'s `action`/`metadata.sourceAuditId`
  literals, cited for A-18, were confirmed present in the current, unchanged file.

## What Remains Partial or Blocked

- A-15 (reject/edit paths), A-17 (dashboard-reflects-activity live check), A-19 (full five-element
  timeline screenshot) -- all named above with a specific, cheap next action.
- A-20 -- contradicted on the plain reading of its criterion; needs either a rewording of scope or
  new coalescing work, neither of which is a quick live check.

## What Claim Is Still Unsupported

- None of A-16/A-18's claims are unsupported -- both have a dated live citation plus, for A-18, a
  code-level guarantee on the specific fields not individually narrated.

## Evidence Chain

External signal (founder's live 2026-07-25 walkthrough of the AI Workspace -> Review Inbox ->
Task/Audit/Timeline loop, immediately following Sprint 5) -> documented same-week in
`AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md` and cross-referenced in
`HITL_LOOP_COMPLETION_KANBAN_2026_07_26.md` -> never propagated back into the A-16/A-18 matrix rows
themselves -> found during this 2026-08-07 audit, re-verified directly against source, matrix rows
corrected, this closeout document written.

## Files Changed

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-15 through A-20 rows)
- `docs/readiness/A16_A18_AI_REVIEW_LOOP_CLOSEOUT_2026_08_07.md` (new, this document)
