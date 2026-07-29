# Production Tenant Roster (2026-07-29)

Source: screenshot of Supabase Dashboard -> Authentication -> Users, shared directly by the
founder. This is the most direct evidence available for "who has a real account" -- a live view of
`auth.users`, not a founder report or an application-level log. Transcribed exactly as shown.

## Current Users (5 total)

| UID | Display Name | Email | Phone | Provider |
|---|---|---|---|---|
| `b118816e-b899-4fc4-8589-3cf0456b0057` | Ehive | ekora.hive@gmail.com | -- | Email |
| `9adcaff6-74bb-48c7-8ade-43862ecac30a` | Imprints | imprintsprod@gmail.com | -- | Email |
| `1f8851c3-f027-4b9e-9a5f-83446a849c4d` | Triaxis Ventures | sudipta1213@gmail.com | -- | Email |
| `9c5356d2-8d83-4f94-95f8-e56a4e25459c` | NEPDSIC | sudiptakoushiks@gmail.com | -- | Email |
| `a4ce5ec0-f497-49f4-8341-e8859789f875` | Triaxis Ventures | triaxisgrp@gmail.com | -- | Email |

All 5 show `Providers: Email` -- none show a `Providers` badge for Google, even though Google
sign-in has been under active testing this session (A-26/A-72/A-73). This is consistent with the
sign-in flow not having completed successfully yet for any of these accounts via OAuth (still
blocked per A-73 at last check) -- every account here was created via password/email signup.

## Cross-Reference to Pilot Tracking

- **Imprints (UID `9adcaff6-...`)** = Imprints Production, Pilot 1. This is now the first
  independent evidence, beyond the founder's verbal confirmation, that a real Auth user exists for
  this pilot -- see `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`,
  entry 2. **Note:** this confirms an `auth.users` row exists; it does not by itself confirm the
  matching `organizations` row (tenant record) or that onboarding fully completed -- those are a
  different table, not visible in this screenshot.
- **Ehive (UID `b118816e-...`)** = Ekora Hive, Pilot 2. Same caveat -- confirms the Auth user, not
  independently the organization record (though Ekora Hive already had stronger evidence, a live
  screenshot of the actual provisioned workspace with seeded tasks).
- **Triaxis Ventures (`sudipta1213@gmail.com`)** = Tenant 0, the founder's own primary account,
  already established earlier in this program.
- **NEPDSIC (`sudiptakoushiks@gmail.com`)** = Tenant 0.5, the second real tenant used for TP-1/
  TP-2/TP-3's tenant-isolation testing this session.

## Second "Triaxis Ventures" Account -- Resolved

**Two accounts are both named "Triaxis Ventures"** -- `sudipta1213@gmail.com` (established) and
`triaxisgrp@gmail.com` (new, UID `a4ce5ec0-...`). `triaxisgrp@gmail.com` also appeared earlier this
session as the last-signed-in Google account shown during Google OAuth testing (the account chooser
screenshot for A-72/A-73). **Founder-confirmed, 2026-07-29: deliberate second admin account, used
to route SMTP and app integrations.** Not a duplicate or an accidental sign-up -- intentional
infrastructure separation (e.g., email/integration credentials tied to a distinct account from the
founder's own primary sign-in identity). No further action needed; not tracked as an anomaly.
