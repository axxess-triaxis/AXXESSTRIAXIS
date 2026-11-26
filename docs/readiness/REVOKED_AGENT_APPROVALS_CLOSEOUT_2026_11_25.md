# Refuse approved calls from revoked agent keys: closeout (2026-11-25)

## Closeout Evidence

Issue ID: AGENT-REVOKED-APPROVALS
Title: Refuse approved calls from revoked, missing or stripped agent connections
Origin plan: follow-up found while building PR #579; the founder chose to do it (2026-11-25)
Research artifact: none
Implementation commits: `3a5a55a6` (red tests), `5e303380` (fix)
PR: see the branch
Branch: `fix/refuse-revoked-agent-approvals`, from `main` at `754524ff`; does not depend on #579

### What was wrong

`PATCH /api/approvals/[id]` ran a pending agent call on approval without checking the connection. A key that was revoked, or that lost the tool's capability, while its call waited still had the call run. With "always allow" it could also receive a standing grant.

### What changed

- `src/security/agentScope.ts`: `agentConnectionRefusal`, which says why a connection may not run a tool now.
- `src/app/api/approvals/[id]/route.ts`: the refusal is checked after the row is reserved and before the tool runs, and before an Always Allow grant is created. A refused call ends as `failed` with the reason, the handler is never called, and an audit event is written.
- `src/app/api/approvals/[id]/route.test.ts`: new tests, and `status: "active"` on the shared connection fixture, which real connections always have.

### What did not change

- Active connections that hold the capability, rejections, human-only approvals, the approval decision itself (still recorded as approved), the MCP route. No migration.

### Acceptance criteria (as stated before the work began)

Confirm with a failing test; refuse when the connection is missing, revoked or lacks the capability; the row ends `failed`; an audit event is written; the handler never runs; no grant for a revoked connection; active connections unchanged; full checks with raw counts; PR with closeout and ledger row; no merge, deploy or migration. Met.

### Regression tests

`pnpm exec vitest run --config vitest.config.mjs --pool=forks --maxWorkers=1 src/app/api/approvals`

- Old code: `Tests  3 failed | 21 passed (24)`; revoked, missing and stripped connections each still ran the tool.
- New code, with `src/app/api/approvals src/security src/services/agents src/app/api/agents`: `Test Files  48 passed (48)`, `Tests  465 passed (465)`, exit 0.

### Verification (local, commit `5e303380`)

- `pnpm run test --pool=forks --maxWorkers=2`: PASS, `Test Files  410 passed (410)`, `Tests  2674 passed (2674)`, exit 0, 1307.18s
- `pnpm run typecheck`: exit 0
- `pnpm --dir apps/mobile run typecheck`: exit 0
- `pnpm run lint`: exit 0, zero warnings
- `pnpm run build`: exit 0
- `pnpm run supabase:verify`: exit 0, 62 migrations, 129 tables with RLS, 1 existing warning

### Errors hit this session

- Error: the first run on the new code printed no summary. Hypothesis: the 300 s limit on the command cut it, with one worker on a loaded machine.
  Resolution: the log stopped before any result; the same tests with a longer limit passed, 465 of 465, exit 0.
- Error: `gh` could not reach `api.github.com` once.
  Resolution: the API answered 200 on the next check.

### What is still unverified

- Not tried against a live server or a real revoked key.
- A revoke that lands between the check and the tool call, a few milliseconds, is not caught.
- A failure to read the connection after the row is reserved still leaves the row `executed` without a result, as before. The tool does not run.
- Pending calls of a revoked connection stay in the Approvals queue until someone decides them.

### Decision outcomes

- Decision: check the connection when the call runs, not only when it was requested.
  Outcome: Pending, review by 2026-12-09 (founder's merge decision)

Final status: Code complete
Remaining risk: listed above
Deploy evidence: none, not merged or deployed
