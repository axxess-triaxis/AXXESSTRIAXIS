# Risky Approval Note Template

Governed by: `CLAUDE.md` (Executing actions with care -- see the system-level action-category rules this
program's agents operate under). Created 2026-08-17.

Before approving or executing any of the following, write the note below first:

- a broad `git add` (rather than explicit file staging)
- a force push
- a remote push
- a production deploy
- a cleanup/delete task
- a merge with red checks (see `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md` for the fuller
  template that supersedes this one specifically for deploy exceptions)
- skipped checks
- credential or environment-variable changes
- service-role changes
- RLS (row-level security) changes

## Template

```markdown
Approval note:
- Files/payload:
- Destination:
- Risk:
- Verification already completed:
- Why scope is safe:
- Rollback/undo path:
```

## Worked example (env var read for Resend diagnosis, this session)

```markdown
Approval note:
- Files/payload: a scratch temp file created by `vercel env pull`, read once to extract
  AXXESS_INVITATION_EMAIL_FROM's resolved value into a shell variable, then deleted immediately
- Destination: local shell only -- never printed to conversation output, never committed, never sent
  anywhere external
- Risk: accidental secret exposure if the value were echoed or logged in full
- Verification already completed: confirmed the scratch file was deleted after use; confirmed no
  API keys or secret values appeared in any tool output shown to the user
- Why scope is safe: reading an already-configured, founder-owned credential to run a diagnostic API
  call is not the same action as entering a credential into a field -- the hard-prohibited action this
  program never performs regardless of authorization
- Rollback/undo path: N/A (read-only diagnostic, no state changed)
```

## Note on how this is actually used

This program does not pause for a written note on every single git add or push -- most of this repo's
actions are low-risk, reversible, or already covered by the CLAUDE.md action-category rules (explicit
staging by default, never force-push without request, etc.), which serve as the standing note for the
common case. This template exists for the **genuinely risky subset** above, where the specific risk,
verification, and rollback path are not obvious from the action's name alone and are worth writing down
before acting, not reconstructing afterward.
