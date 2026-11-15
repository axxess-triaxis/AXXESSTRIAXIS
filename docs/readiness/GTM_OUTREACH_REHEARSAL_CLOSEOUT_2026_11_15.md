# GTM Outreach Rehearsal: Closeout (2026-11-14 to 2026-11-15)

A production dry run of the whole outreach loop, using the founder's own inboxes, before the live network batch.

## Why

- **Founder, 2026-11-14:** "Do it with dummy data once, live GTM in few days."
- **Real inboxes, not dummy addresses:** dummy addresses such as `example.com` would bounce in production, and a single bounce in a small batch passes the 2% pause threshold in `sendRamp.ts`. The founder chose a production rehearsal on their own inboxes over a local-only run, which could not prove delivery, replies or unsubscribe.

## What was run (production, landing.triaxisventures.com)

| Step | How | Result |
|---|---|---|
| Lead check | `pnpm run gtm:check-leads` on a 2-row file | Accepted 2; one personal-mailbox warning (expected, own Gmail) |
| Import | `POST /api/crm/leads/import` from the founder's signed-in session | Imported 1. The second row, official@, was rejected as `already_a_lead`: it is the 2026-11-12 self-test lead, which was reused. |
| Sequence | `POST /api/outreach/sequences`, then `{"action":"approve"}` | Network sequence (`gtm/network_campaign_sequence.json`, approved as written by the founder 2026-11-14) created and approved: id `ea213e70-f120-4e94-af90-268da1a33598` |
| Enroll | `{"action":"enroll"}` with both lead ids | 2 enrolled, 0 skipped |
| Send | `outreach-tick.yml` dispatched by hand, run 43610067486 | `{"sent":2,"stopped":0,"deferred":0,"failed":0,"budget":20,"reason":"warming_up"}` |
| Inbox placement | Founder screenshot of Gmail | Arrived in the Inbox, not spam, from `sudipta@go.triaxisventures.com`. Merge fields filled in. Footer has the postal address and the unsubscribe link. |
| Delivered events | `/api/crm/funnel`, plus the Resend webhook log (founder screenshot) | `delivered: 2`. Resend shows `email.delivered` answered 200 with `{"recorded":"delivered"}`. |
| Unsubscribe | Founder clicked the link in the official@ email | The page said "You have been unsubscribed…". A probe import of official@ is now rejected as `suppressed`. |
| Reply | Founder replied from Gmail to `replies@go.triaxisventures.com` | Resend Receiving listed the reply. `email.received` answered 200 with `{"status":"stored","category":"other","leadId":"61630822-…"}`. Funnel `replies: 1`, `repliesByCategory: {"other": 1}`. A "Reply needs reading" task was created. |
| Cleanup | `PATCH /api/crm/leads/[id]` and `PATCH /api/repositories/tasks` | Both test leads set to `lost`, with no follow-up date. The test task is `completed`. |

## What this verifies

- **The full loop works in production:** lead check, import, sequence create and approve, enroll, send, delivery event, unsubscribe and reply intake.
- **The `email.delivered` webhook is wired.** This was founder-stated on 2026-11-14 and is now verified by a 200 response and `delivered: 2`.
- **A reply sorted as `other` stops the sequence.** This is per `actionsForCategory` in `src/services/outbound/replySorting.ts` (`stopSequence: true`). The day-3 and day-7 steps were not observed being skipped: the leads were closed before those dates.

## Problems found

- **First reply attempt:** no reply reached Resend on 2026-11-14. Resend Receiving showed none, and the MX record for `go.triaxisventures.com` was correct (`receive-apne1.forge.rmta.net`). The reply sent on 2026-11-15 arrived within seconds. The most likely cause is that the first reply was never sent: the founder's Gmail thread showed no reply message. No code or configuration changed.
- **Vercel logs:** the Vercel logs CLI timed out locally, so server logs were not used. The evidence above comes from API responses and the Resend dashboard.

## Side effects left in production (deliberate)

- **official@triaxisventures.com** stays on the email suppression list. Use another inbox for future self-tests.
- **The network sequence** stays approved. The live network batch will be enrolled into it, without creating it again.
- **The funnel's 30-day window** includes these test sends and the test reply until they age out.

## What did not change

No code, no configuration, and no Vercel or Resend settings.

## Still open

- **Live network batch:** the founder fills in `gtm/leads_network_batch1_todo.csv` (untracked, 15 companies from client scoping calls). Then run `--verify` (QuickEmailVerification, 96 free checks left), import, and enroll into `ea213e70…`.
- **Main campaign sequence:** whether "missed calls" exists in production is still unverified.
- **Founder actions, unchanged:** counsel (DPDP), DLT, TDRA, an Indian voice provider.

## Decision ledger

```
Decision: Rehearse outreach in production on the founder's own inboxes before the live network batch.
Why: Dummy addresses would bounce and pause sending; a local run cannot prove delivery, replies or unsubscribe.
What changed: Production data only. 1 test lead added, the network sequence created and approved, 2 test sends, official@ suppressed, 1 reply stored, test leads closed and the task completed.
Architecture boundary: Existing APIs only; no code change.
Product boundary: No real prospect was contacted.
Verification: Tick run 43610067486; funnel delivered 2 and replies 1; Resend 200 responses for email.delivered and email.received; probe import shows suppression.
Outcome: The full loop passed; one failed reply attempt traced to the reply not being sent.
Follow-up: Founder fills the network CSV; verify, import and enroll into ea213e70; confirm whether the main campaign sequence exists.
```
