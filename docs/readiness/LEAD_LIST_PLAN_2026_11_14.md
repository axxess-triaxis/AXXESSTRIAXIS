# First Lead List: Plan (2026-11-14)

GTM plan `GTM_4_DAY_AUTOMATION_PLAN_2026_11_11.md`, founder item "ICP and first lead list, with the vendor's consent basis". **Status: Approved segments, list not built.** No lead in this plan exists yet. Every count below is a target, not a result.

## External signal

- **Live funnel** (`GET /api/crm/funnel?days=30`, read 2026-11-14 through the founder's signed-in session):
  - 5 leads added, all at stage `new`
  - 1 email sent; 0 delivered, bounced, complained or replied
  - sending enabled, budget 20 a day, `warming_up`
- **Outreach tick** (`outreach-tick.yml`): the last 102 runs (about 25 hours to 2026-11-14 08:47 UTC) each sent 0. 97 reported `budget: 20, reason: warming_up`.
  - So the engine is ready and has nothing to send. The bottleneck is leads, not code.
- **Founder decisions (2026-11-14):**
  - "Plan the lead list".
  - Segments chosen: **"Real estate and clinics"**.

## Segments (founder-approved)

| Segment | India | UAE | Contact |
|---|---|---|---|
| Real estate brokerages, about 5 to 50 agents | Bengaluru, Mumbai, Pune | Dubai, Abu Dhabi | Owner, founder or operations head |
| Private clinics and diagnostic centres | Tier-1 cities | Dubai, Sharjah | Owner, practice manager or operations head |

**Why these segments:**
- Both live on inbound calls and WhatsApp, which matches the drafted campaign "Missed calls at {{company}}" (untracked `gtm/first_campaign_sequence.json`).
- This is the founder's choice. It's this program's recommendation, not market data.

**Business addresses only:** company-domain emails. Personal mailboxes such as Gmail are excluded, because `b2b_legitimate_interest` is only argued for business contacts.

## First batch: 150 leads

| Pair | Target |
|---|---|
| Real estate, India | ~40 |
| Real estate, UAE | ~40 |
| Clinics, India | ~35 |
| Clinics, UAE | ~35 |

Pace:
- The ramp starts at 20 emails a day. After warm-up, each day's limit is 1.5 times the busiest day of the last 7, capped by `OUTREACH_DAILY_SEND_BUDGET` (at most 200, `sendRamp.ts`).
- Each lead receives 3 emails over 7 days, so 150 leads keep the sender busy for about 2 to 3 weeks.
- Build the next 150 during week 2.

## Sources, in priority order

1. **The founder's own network:** pilots, LOI contacts, accelerator contacts, past conversations.
   - `opt_in` if they asked to hear from Triaxis, otherwise `b2b_legitimate_interest`.
   - Source text, for example "Founder network".
2. **Public business listings, researched by hand:**
   - each company's own website contact page
   - chamber of commerce member directories
   - trade-fair exhibitor lists
   - published RERA broker registers
   - clinic websites

   `b2b_legitimate_interest`, with **the page URL as `source`**. No scraping: many directories forbid it in their terms.
3. **A B2B data vendor, only if 1 and 2 are too slow.** It must document where its data comes from. Put the vendor and its stated basis in `source`. This costs money and needs the founder's go.
4. **LinkedIn: manual lookups only**, to find a name. No scraping, automated messages or connection bots (LinkedIn User Agreement).

## Quality rules (before import)

- **Verify every email** with a verification service before import.
  - The send ramp pauses all sending at 2% bounces or 0.1% complaints over 7 days.
  - Guessed addresses such as `firstname@company` must be verified too.
- **Each row must pass `parseLeadImport` (`src/services/outbound/leadImport.ts`):**
  - Columns: `company, contact_name, email, phone, country, consent_basis, source`. Template: untracked `gtm/leads_template.csv`.
  - `country` is IN or AE. `consent_basis` is `opt_in` or `b2b_legitimate_interest`.
  - `source` and `company` are present.
  - At least one valid email or E.164 phone number.
  - At most 2,000 rows per file.
- **The importer rejects, with the line and reason:** suppressed contacts, existing leads, and duplicates within the file.

## Into AXXESS

1. Import the CSV on Leads & Calls (`POST /api/crm/leads/import`).
2. Approve the campaign sequence once, then enroll the batch (`/api/outreach/sequences`).
3. The 15-minute tick sends within the ramp. Every send passes the contactability gate and is logged in `contact_attempts`.
4. Read results on the Funnel tab: sent, bounced, complained, replies and interested, from real rows only.

## Not verified, or open

- **India (DPDP Act 2023):** `b2b_legitimate_interest` for cold B2B email is **this program's reading, not counsel's**. The Act's "legitimate uses" are narrow. Network and opt-in contacts carry the least risk until counsel advises.
- **Approved sequence:** whether one exists in production is **unverified**. There is no read endpoint for sequences, and the one sent email suggests a sequence ran. Check on the Leads page before enrolling.
- **Delivered:** stays 0 until `email.delivered` is added to the Resend webhook (founder action, `GTM_FUNNEL_AND_SEND_RAMP_CLOSEOUT_2026_11_14.md`).
- **The campaign copy** is generic ("small teams"). A segment-specific first line is optional and should be written by hand. Claude first lines wait for counsel.
- **No reply, demo or conversion rate** is claimed here. They are reported only from the funnel once sending starts.

## Decision ledger

```
Decision: The first outbound list targets real estate brokerages and private clinics in India (Bengaluru, Mumbai, Pune; tier-1 clinics) and the UAE (Dubai, Abu Dhabi; Dubai, Sharjah clinics), 150 verified business contacts in the first batch.
Why: The send engine is live but idle (0 sent in the last 102 ticks; 5 leads in 30 days); both segments depend on inbound calls, matching the missed-calls campaign; founder chose "Real estate and clinics".
What changed: This plan only. No code, no data.
Architecture boundary: Leads enter only through the existing CSV import and contactability gate; sending only through the approved sequence and the ramp.
Product boundary: Business contacts only; no scraping; LinkedIn manual lookups only; every email verified before import.
Verification: Funnel and tick numbers read from production on 2026-11-14 (see External signal). No lead built yet.
Outcome: Planned. Founder builds the CSV; the agent checks it against the import rules before upload.
Follow-up: Founder: build batch 1 from network and public listings, verify emails, add email.delivered in Resend, book counsel (DPDP basis). Agent: pre-check the CSV, confirm the sequence, import and enroll with the founder.
```
