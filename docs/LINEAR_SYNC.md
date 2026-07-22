# Linear Sprint Sync

## What this is

`scripts/linear-sync.mjs` (via `pnpm run linear:sync`) reads the 20 pre-demo actionables' current
status directly out of
`Enterprise beta feedback - Batch 1 (30 responses)/PRE_DEMO_ACTIONABLES.md` and syncs each one into
a Linear issue, one-way (doc -> Linear, never the reverse). It talks directly to Linear's GraphQL
API -- no GitHub Actions step, no Git host involved at all.

## Honest status: built, not yet verified against a real workspace

No Linear API key or team exists in this environment. Without `LINEAR_API_KEY` and
`LINEAR_TEAM_KEY` set, the script parses the actionables doc, prints exactly what it would create
or update, and makes **zero network calls** -- this dry-run path has been run and confirmed to
correctly parse all 20 items (including two, A9 and A11, whose titles wrap across two lines in the
source markdown). The actual GraphQL query/mutation shapes against Linear's real API have been
reviewed against Linear's public API docs but never executed against a real workspace, since no
key is available to test with. Treat them as reviewed-not-verified until run for real.

## Setup

1. Get a personal API key: Linear -> Settings -> API -> Personal API keys. This is a bearer token
   (like a Stripe publishable key), not a login password -- safe to store in `.env.local` or export
   in your shell.
2. Get your team's key (the short prefix in your issue IDs, e.g. `AXX` in `AXX-123`) from Linear's
   team settings.
3. Set both:

```bash
export LINEAR_API_KEY="lin_api_..."
export LINEAR_TEAM_KEY="AXX"
```

## Running it

```bash
pnpm run linear:sync
```

Without the env vars above set, this only prints the sync plan (dry run, no network calls). With
them set, it will:

1. Parse all 20 actionables from `PRE_DEMO_ACTIONABLES.md` (ID, status emoji, title).
2. Fetch the target Linear team's configured workflow states (states are team-specific, not
   hardcoded -- the script picks whichever of the team's states matches the needed *type*:
   `completed`, `started`, or `unstarted`).
3. For each actionable, search for an existing issue titled `A{n}: <title>` in that team.
   - If found and already in the right state: skip (reported as `unchanged`).
   - If found but in a different state: update it (`issueUpdate`).
   - If not found: create it (`issueCreate`), titled `A{n}: <title>` so re-runs can find it again.

## Status mapping

| Doc symbol | Meaning | Linear state type |
|---|---|---|
| ✅ | Implemented and merged to `main` | `completed` |
| 🔨 | Built, tested, and PR'd, not yet merged | `started` |
| 🔜 | Planned | `unstarted` |

## Limitations, stated plainly

- **One-way only.** Editing an issue's state in Linear does not update the markdown doc. The doc
  is the source of truth; Linear is a mirror of it.
- **Matches by title prefix (`A{n}:`), not a stored Linear issue ID.** If an issue's title is
  edited in Linear to remove or change that prefix, the next sync will create a duplicate rather
  than finding it. Don't rename the `A{n}:` prefix in Linear.
- **No deletion.** If an actionable is removed from the doc, its Linear issue is not automatically
  closed or deleted.
- **Not wired into any automation yet** (no scheduled run, no git hook) -- run it by hand when the
  actionables doc changes meaningfully.
