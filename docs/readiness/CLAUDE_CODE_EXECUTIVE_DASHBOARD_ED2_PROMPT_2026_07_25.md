# Claude Code Prompt — Executive Dashboard Sprint ED-2: Existing Infrastructure Wiring

You are working on **AXXESS TRIaxis** by **Triaxis Ventures Private Limited**.

Canonical workspace:

`C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`

## Planning Provenance

This prompt follows the founder-approved Executive Dashboard remediation roadmap and checklist.

The roadmap objective is to generate a **70-80% delta** on the Executive Dashboard by moving the dashboard from **11/27 REAL elements** to at least **19/27 REAL elements**, with a preferred target of **21/27**.

This is Sprint **ED-2**, following ED-1.

## Operating Model

Codex is product manager and prompt designer.  
Claude Code is engineer, coder, tester, and sprint executor.  
Sudipta Koushik Sarmah, Founder and Managing Director of Triaxis Ventures Private Limited, is the HITL authority.

Serve the HITL in this order:

1. CTO and CPO
2. CEO
3. CFO and Head of Fundraising
4. CMO and Head of Sales

## Sprint Name

**Executive Dashboard Sprint ED-2: Existing Infrastructure Wiring**

## Objective

Wire existing but disconnected infrastructure into the Executive Dashboard.

ED-2 should push the dashboard to at least **19/27 REAL elements**, reaching the minimum **70% REAL** target without overbuilding net-new features.

This sprint is not about creating large new systems. It should use existing repositories, tables, hooks, and UI paths wherever possible.

## Non-Negotiables

Do not redesign the dashboard.  
Do not rewrite the dashboard architecture.  
Do not invent fake metrics.  
Do not show demo data as live tenant data.  
Do not describe heuristic counts as literal counts.  
Do not build Phase ED-3 net-new dashboard intelligence unless explicitly required.  
Do not proceed to ED-3.

## Required Documents To Read First

Read:

- `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_ROADMAP_2026_07_25.md`
- `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_CHECKLIST_2026_07_25.md`
- `docs/readiness/EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md` if present
- `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`
- `docs/RELEASE_AND_VERIFICATION_EVIDENCE_LEDGER.md`
- `docs/FOUNDER_EXECUTION_EVIDENCE_INDEX.md`

Then inspect:

- `src/features/dashboard/DashboardSection.tsx`
- `src/features/dashboard/data.ts`
- Dashboard hooks and repositories
- `workflowEvidence.ts`
- `enterpriseGoldenPath.ts`
- `useWorkflowTimeline`
- AI Review Inbox repositories/API
- Social Alerts repositories/API/UI
- Project repository/data functions, especially `getDashboardProjects()`
- Audit log repository/API if present

## ED-1 Carryover Gate

Before making ED-2 changes, inspect ED-1 closeout if present.

Verify whether these are already done:

- Feedback mailto removed/unified
- Refresh wired
- Project Health Monitor navigation wired
- Active users relabeled or made real
- Audit coverage relabeled or made real
- Guided Demo renamed
- Request pilot conversation handled
- Export Briefing handled
- Command search handled

If any ED-1 item remains open and blocks ED-2's REAL count, fix it only if low-risk and document it as carryover.

## ED-2 Target

Move at least these elements toward REAL:

- External Signals tile
- Golden Path pending AI review count
- Tenant Health Command Center pending AI review count
- Audit coverage
- Fabricated project budget/spent fields
- Recent institutional activity

Expected result:

- At least **19/27 REAL elements**
- Preferred: **20/27 or 21/27 REAL elements**
- No new fake metric introduced

## Actionable ED2-01 — External Signals Tile

Current issue:

External Signals tile is hardcoded or effectively placeholder despite existing Social Alerts infrastructure.

Required:

1. Inspect existing Social Alerts code:
   - `social_alert_events`
   - `social_alert_rules`
   - `AlertsSection.tsx`
   - repositories/services/API routes
2. If a repository/service exists, use it.
3. If table/schema exists but repository is missing, add minimal tenant-scoped repository/service.
4. Dashboard External Signals tile should show:
   - active alert count, or
   - provider-gated status, or
   - honest empty state
5. Do not show fabricated live signal counts.
6. Preserve demo/investor richness if demo mode is active.

Acceptance:

- Tile is no longer a useless hardcoded zero.
- Live tenant state is honest.
- Demo state remains populated if applicable.

## Actionable ED2-02 — Literal AI Review Count

Current issue:

Golden Path and Tenant Health Command Center derive pending AI reviews using a heuristic like `pendingApprovals / 10`.

Required:

1. Locate the AI Review Inbox source of truth.
2. Add or reuse repository/API method to count pending AI review items.
3. Pass literal count into:
   - Golden Path
   - Tenant Health Command Center
   - any relevant dashboard tile
4. If literal count cannot be obtained, relabel as estimated and document blocker.
5. Do not present heuristic as literal count.

Acceptance:

- Pending AI review count is literal or honestly labeled.
- Tests cover count source or fallback.

## Actionable ED2-03 — Audit Coverage Improvement

Current issue:

Audit coverage is a proxy heuristic, not a real audit-log query.

Required:

1. Locate audit log repository/API.
2. If available, compute audit coverage using real audit events.
3. If full coverage computation is too large, use real audit event count plus honest label.
4. If no audit repository is accessible, keep proxy but relabel clearly.

Acceptance:

- Audit coverage no longer overclaims.
- It is either real or truthfully presented as readiness/proxy.

## Actionable ED2-04 — Remove Fabricated Budget/Spent Fields

Current issue:

`getDashboardProjects()` contains fabricated `budget` / `spent` strings.

Required:

1. Locate `getDashboardProjects()`.
2. Remove fabricated budget/spent fields if not backed by real data.
3. Replace with:
   - real budget values if available, or
   - undefined/null values with safe UI handling, or
   - explicitly demo-only values in demo mode.
4. Ensure no other consumer begins presenting fake financial data as live tenant data.

Acceptance:

- No live tenant dashboard/project consumer displays fabricated budget/spent values.
- Tests or code review prove separation.

## Actionable ED2-05 — Recent Institutional Activity

Current issue:

Recent institutional activity is honest but not live.

Required:

1. Decide the smallest real implementation:
   - use workflow timeline events,
   - use audit logs,
   - use notifications,
   - or keep honest empty state.
2. Prefer wiring existing `workflow_timeline_events` or audit/notification source if available.
3. Do not fabricate activity in live tenant mode.
4. Demo mode can remain richly populated if isolated.

Acceptance:

- Recent activity is either real or explicitly empty/pending.
- No demo-derived live activity.

## Actionable ED2-06 — Dashboard Tests

Add or update tests for:

- External Signals tile state
- AI review literal count or honest fallback
- Audit coverage real/proxy label
- Budget/spent no-fabrication behavior
- Recent activity live/empty/demo separation

Use existing test patterns.

## Verification Required

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

If any command fails, fix sprint-relevant issues or document the blocker.

## Documentation Required

Update:

- `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_ROADMAP_2026_07_25.md`
- `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_CHECKLIST_2026_07_25.md`
- `docs/RELEASE_AND_VERIFICATION_EVIDENCE_LEDGER.md`
- `docs/FOUNDER_EXECUTION_EVIDENCE_INDEX.md` if material evidence changes

Create:

`docs/readiness/EXECUTIVE_DASHBOARD_ED2_CLOSEOUT_2026_07_25.md`

Closeout must include:

- Sprint objective
- ED-1 carryover status
- Files changed
- ED-2 items completed
- ED-2 items partial/blocked
- Before REAL/PARTIAL/PLACEHOLDER count
- After REAL/PARTIAL/PLACEHOLDER count
- Whether 19/27 REAL target was reached
- Evidence chain table
- Tests run
- Test results
- Build result
- Remaining dashboard gaps
- Recommendation for ED-3

## Git Requirements

After successful verification:

```bash
git status
git add .
git commit -m "feat(dashboard): wire executive dashboard evidence metrics"
git push
```

Do not force push.

If push is blocked, document exact blocker and next action.

## Final Output Required From Claude Code

Return:

- Branch
- Commit hash
- Files added
- Files modified
- Tests run
- Test results
- Build result
- Dashboard elements moved to REAL
- Remaining PARTIAL elements
- Remaining PLACEHOLDER elements
- New REAL/PARTIAL/PLACEHOLDER count
- Whether 70% REAL target was reached
- Whether ED-2 exit criteria are met
- Recommended ED-3 action

## ED-2 Exit Criteria

ED-2 is complete only if:

1. External Signals tile is real or truthfully provider-gated.
2. AI review count is literal or honestly labeled.
3. Audit coverage is real or honestly labeled.
4. Fabricated budget/spent values are removed from live tenant dashboard paths.
5. Recent activity is real or honestly empty.
6. Dashboard tests are updated.
7. Typecheck, lint, tests, and build are run and documented.
8. Dashboard REAL/PARTIAL/PLACEHOLDER count is updated.
9. Executive Dashboard reaches at least **19/27 REAL elements**, or the blocker is documented.

Do not proceed to ED-3.

