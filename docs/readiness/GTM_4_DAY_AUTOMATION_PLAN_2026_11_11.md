# Automated GTM in 4 Days: Plan (2026-11-11 to 2026-11-14)

**Status: `Approved` by the founder on 2026-11-11 ("Approve, start Day 1"). Day 1 in progress. Nothing below is shipped unless a later closeout says so.**

## External signal

- Founder, 2026-11-11: "Draft a plan to go full scale automated GTM in next 3-4 days."
- Founder, 2026-11-11: YC W27 dropped, targeting YC P27 with revenue; "sell, sell, sell, build, build, debug, debug"; target USD 1M ARR (founder-stated).
- Founder, 2026-11-11: outbound in India and the UAE "within regulatory boundary": cold calling, cold messaging, mailing lists, LinkedIn.

## What 4 days can and cannot deliver

**Can be automated by day 4:** B2B cold email, inbound WhatsApp and inbound calls answered by AI, reply handling, a gated human call queue, and a funnel built from real rows.

**Cannot be automated legally by day 4** (this program's reading; counsel has not verified it):

| Channel | Blocker |
|---|---|
| Automated cold calls or SMS, India | TRAI TCCCPR 2018: DLT registration, NCPR scrub |
| Cold calls, UAE | TDRA telemarketing licence and registered numbers, DNCR scrub, 09:00-18:00 |
| WhatsApp to people who did not opt in | Meta policy; risks the verified number |
| LinkedIn automation | LinkedIn User Agreement bans scraping and automated messaging |

**Volume is limited by email warm-up, not code.** A new sending domain starts at about 20-50 emails a day.

## Starting point (verified 2026-11-11)

- **Email:** Resend is wired for invitations (`src/services/email/invitationEmail.ts`); default sender `onboarding@resend.dev`.
- **Domain:** `triaxisventures.com` SPF is `v=spf1 include:secureserver.net -all`; DMARC is `v=DMARC1; p=none;` (DNS lookup on 2026-11-11). Cold email goes on a separate subdomain so it cannot hurt the main domain.
- **Contactability gate:** `src/compliance/contactability.ts`, 12 tests; migration `20261111120000_outbound_contactability.sql`.
- **Access fixes:** merged in #456 and #457 on 2026-11-09. Their migrations are applied by hand (`pnpm run supabase:migrate:remote`) and no checkout is linked to a Supabase project, so production state is unverified.
- **Inbound:** Callismatic to STILL to AXXESS live (take of 2026-11-10, STILL task `d85cfb53`). WhatsApp in production still uses Meta's test number.

## Day 1 (11-11): foundations

1. Ship the contactability gate (full suite, PR).
2. Apply the #456 and #457 migrations to production after the founder runs the two read-only pre-checks in `ACCESS_AND_AUDIT_INTEGRITY_CLOSEOUT_2026_11_06.md`.
3. Redeploy Callismatic production with `READ_API_KEY`, `ADMIN_API_KEY` and `WHATSAPP_APP_SECRET` (needs AWS sign-in).
4. Sending subdomain on Resend (for example `go.triaxisventures.com`) with DKIM, SPF and DMARC; the founder adds the records in GoDaddy. Warm-up starts.
5. Lead CSV import with `source`, `consent_basis` and `country` required, duplicate removal and the suppression check. Rows with no lawful basis are rejected.

## Day 2 (11-12): sequence engine

1. Three-step email sequences per lead. Every send passes the gate and is logged to `contact_attempts`. One-click unsubscribe link and `List-Unsubscribe` header add the contact to the suppression list.
2. Resend bounce and complaint webhooks add to the suppression list.
3. EventBridge Scheduler (infrastructure as code, STILL account) calls a signed AXXESS endpoint every 15 minutes.
4. Claude writes each lead's first line only from fields in the lead's record. The founder approves templates once.

## Day 3 (11-13): replies and inbound

1. Claude sorts replies (interested, not now, unsubscribe, out of office), moves the lead stage, assigns a task to the owner, and suppresses unsubscribes.
2. Move Omnidamus and Callismatic production to the verified WhatsApp number. Click-to-chat links on the site and email signatures. AI replies inside Meta's 24-hour window; templates only to opted-in contacts.
3. Daily human call queue for the founder and staff, made only of gate-allowed leads; outcomes logged.
4. Leads page for the sales role: reassign, change stage, see history.

## Day 4 (11-14): measure, then scale

1. Funnel from real rows only: sent, delivered, bounced, replied, interested, meetings, trials, paid.
2. Raise volume only while bounces stay under 2% and complaints under 0.1%.
3. Playwright, full suite, closeout with decision ledger, production deploy on the founder's go.

## Founder (HITL) items

| Item | Needed for |
|---|---|
| Finish `aws-signin` | Callismatic redeploy, scheduler |
| Supabase access token | Applying migrations |
| DNS records in GoDaddy | Email sending |
| ICP and first lead list, with the vendor's consent basis | Sequences |
| Approve email templates | Sequences |
| Book counsel (India and UAE) | All cold telecom outreach |
| Start DLT registration (India) | SMS and automated calls |
| Start TDRA telemarketing licence (UAE) | UAE calls |
| Submit WhatsApp templates in Meta | WhatsApp follow-ups |
| Budget for click-to-WhatsApp ads (optional) | Opt-ins at scale |

## Keeping the target honest

At the founder-stated USD 35 per seat per month (Founder-stated, source artifact needed), USD 1M ARR is about 2,380 paying seats. These four days build the engine; revenue is reported only from billing records.
