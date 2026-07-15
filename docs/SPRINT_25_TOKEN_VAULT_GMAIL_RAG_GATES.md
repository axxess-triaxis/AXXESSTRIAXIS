# Sprint 25 - Token Vault, Gmail Import, Snapshot Fan-Out, And RAG Release Gates

Sprint 25 hardens the Sprint 24 operating layer so live connectors and release quality gates can move closer to production use without exposing provider tokens or relying on manual tenant-by-tenant operations.

## What Shipped

- Encrypted OAuth token vault for Gmail/Microsoft connector access tokens.
- Live Gmail selected-message import API.
- All-tenant scheduled Pilot Command Center snapshot fan-out.
- AI Workspace navigation entry to the AI Review Inbox.
- Required RAG release gate script and GitHub Actions workflow.
- Supabase migration for token vault, Gmail import evidence, and fan-out run evidence.

## Encrypted Token Vault

OAuth callback token material is sealed server-side using AES-256-GCM before persistence.

Runtime requirements:

- `AXXESS_TOKEN_VAULT_KEY`
- `AXXESS_TOKEN_VAULT_KEY_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`

The `oauth_token_vault` table is intentionally service-role-only. Browser clients and normal authenticated API access should never read encrypted token blobs or token fingerprints directly.

## Gmail Selected-Message Import

The live Gmail import path is intentionally narrow:

1. User connects Gmail through the tenant OAuth flow.
2. A selected Gmail message id is posted to `/api/connectors/gmail/messages/import`.
3. AXXESS opens the encrypted token bundle server-side.
4. AXXESS fetches exactly one Gmail message from `users/me/messages/{id}?format=full`.
5. AXXESS previews summary, tasks, decisions, stakeholders, and tags.
6. Only after confirmation does AXXESS create tenant documents/tasks and audit evidence.

This avoids blanket mailbox ingestion and preserves human confirmation before workspace records are created.

## Command-Center Snapshot Fan-Out

The Vercel Cron endpoint now attempts all-tenant fan-out by default:

- `AXXESS_COMMAND_CENTER_FANOUT=true`
- `AXXESS_COMMAND_CENTER_FANOUT_LIMIT=50`

For each active organization with an active user, AXXESS selects the strongest available operator role and persists a Pilot Command Center snapshot. The previous single-tenant fallback remains available by setting `AXXESS_COMMAND_CENTER_FANOUT=false` and configuring:

- `AXXESS_COMMAND_CENTER_ORGANIZATION_ID`
- `AXXESS_COMMAND_CENTER_USER_ID`

## RAG Release Gate

The new release gate is deterministic and provider-independent:

```bash
pnpm run rag:release-gate
```

The GitHub Actions workflow `RAG Release Gate` runs on RAG, API, migration, lockfile, and gate-script changes. It blocks releases when fixture observations fail citation, confidence, unauthorized-source, or human-review expectations.

Repository administrators should mark `Required RAG Release Gate` as a required branch protection check once this workflow is visible on GitHub.

## Security Notes

- No provider tokens are stored in `integration_connections`.
- Token vault rows are bound to provider, organization, user, and token reference through authenticated encryption associated data.
- Token fingerprints use keyed derivation instead of raw unsalted hashes.
- Gmail import evidence stores preview metadata and short excerpts, not raw token values.
- Production Gmail access requires Supabase service-role runtime and token vault configuration.

## Verification

Sprint 25 adds tests for:

- Token vault sealing/opening and tenant tamper rejection.
- Gmail selected-message parsing and single-message API fetch behavior.
- OAuth token exchange vault handoff.
- Command-center fan-out provider-gated behavior.
- Supabase RLS expectations for Sprint 25 tables.
