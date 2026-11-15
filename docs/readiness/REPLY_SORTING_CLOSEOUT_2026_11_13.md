# Reply Sorting: Closeout (2026-11-13)

GTM plan `GTM_4_DAY_AUTOMATION_PLAN_2026_11_11.md`, Day 3, item 1. Branch `feat/reply-sorting`.

## External signal

- **Founder goal (2026-11-11):** start calling and messaging, compliantly, in India and the UAE.
- **Founder decisions (2026-11-13):** "Reply sorting"; Claude sorts the replies; every reply is still forwarded to `official@triaxisventures.com`. The plan was approved in plan mode.
- **Gap:** replies to outreach email went only to the founder's inbox. AXXESS did not stop the sequence, move interested leads, or suppress people who asked to be removed.

## What changed

- **Migration `20261113140000_lead_replies.sql`:** new append-only table `lead_replies` (category, classifier, sender, subject, body capped at 20,000 characters), unique per organization and Resend email id. Senior members read all rows; other staff read replies on leads they own. No insert, update or delete policy for users: only the server writes.
- **`src/services/outbound/replySorting.ts`:** rules that need no AI (an `Auto-Submitted` header or an out-of-office subject means out of office; a reply that is only "unsubscribe", "remove me", "stop" or "do not contact" means unsubscribe) and `actionsForCategory()`.
- **`src/services/outbound/replyClassifier.ts`:** for everything else, Claude (`claude-opus-5-5`, effort low, JSON-schema structured output, server-side fallback `fallbacks: "default"` under beta `server-side-fallback-2026-07-01`). Only the subject and the reply text are sent; the prompt treats the reply as untrusted text. No key, an error, a refusal, or output that doesn't match the schema all become `other` / `fallback`, so a person reads it. Adds the official `@anthropic-ai/sdk` (^1.5.0).
- **`src/services/email/resendInbound.ts`:** fetches the body from `GET /emails/receiving/{id}` and forwards a copy through Resend.
- **`src/services/outbound/replyIntake.ts`** and **`POST /api/outreach/resend-webhook`:** an `email.received` event for `OUTREACH_REPLY_TO` is sorted and stored, then:

| Category | Sequence | Lead | Suppression | Task |
|---|---|---|---|---|
| interested | stopped | `new` to `qualifying`; follow-up tomorrow | - | "Reply: interested - call back" for the owner |
| not_now | stopped | follow-up in 30 days | - | - |
| unsubscribe | stopped | status `lost` | email, reason `unsubscribe` | - |
| out_of_office | keeps going | - | - | - |
| other | stopped | - | - | "Reply needs reading" |

  A copy goes to `OUTREACH_FORWARD_TO` with the subject `[AXXESS: <label>] <original subject>` and reply-to set to the sender. Lead changes are audited as `crm.lead.updated` with `via: "reply"`, and each reply as `outreach.reply.received`. A sender who matches no lead is stored with no lead and still forwarded. Bounce and complaint handling are unchanged.
- **Lead history** (`loadLeadHistory`, `LeadsSection.tsx`): replies show as "Reply: Interested - <subject>".

## What did not change

- No automatic replies: Claude only sorts, and people reply.
- The contactability gate, the email sender and the tick.
- WhatsApp (Day 3 item 2) and Claude-written first lines (Day 2 item 4).

## Verification

Run locally on `feat/reply-sorting`:

- `pnpm run typecheck`: exit 0.
- `pnpm --dir apps/mobile run typecheck`: exit 0.
- `pnpm run lint` (`--max-warnings=0`): exit 0.
- `pnpm run supabase:verify`: exit 0, with the known July note on `20260702165736_initial_enterprise_schema.sql`, not the new migration.
- `pnpm run test`: **362 files, 2,175 tests, all passed** (second run; the first run failed one new UI test whose fake API did not answer the call-queue request, fixed in the test).
- `pnpm run build`: exit 0.

New tests:
- `replySorting.test.ts` (5): auto-reply header, out-of-office subject, bare unsubscribe, a longer message containing "stop" left to the AI, and every row of the action table.
- `replyClassifier.test.ts` (3): rules skip Claude; Claude's output maps to the category with `fallbacks: "default"`, the beta header and effort low; refusal, error, bad output and no key all become `other` / `fallback`.
- `replies.route.test.ts` (7): interested end to end, a retried event processed once, unsubscribe suppression without Claude, out of office keeps the sequence, unmatched sender stored and forwarded, mail to another address ignored, intake not configured.
- `LeadsSection.test.tsx` (+1): a reply shows in the history.

## Partial, blocked or unsupported

- **Not live until the founder's rollout steps:** `ANTHROPIC_API_KEY`, `OUTREACH_REPLY_TO=replies@go.triaxisventures.com` and `OUTREACH_FORWARD_TO` in Vercel; receiving and the `email.received` event in Resend; and the migration on production. Until then the webhook answers `reply_intake_not_configured` for replies.
- **The Resend inbound response shape** (`text`, `html`, `headers`) comes from Resend's documentation and is not yet checked against a live reply. The headers parser accepts both an object and a name/value list.
- **The Claude call has not run against the real API**: it's tested with a mocked client only. The first live reply is the real check.
- **Once a reply is stored, a later failure is not retried.** If a lead update, task or forward fails after the row is written, Resend's retry finds the row and does nothing. This was chosen over the risk of applying the actions twice. The forward is the founder's safety net and its failure is logged, but the founder would not see that reply in their inbox.
- **Migration not run on a database.** Local Supabase needs Docker, which does not start on this machine. It's checked by the static verifier only.
- **Privacy:** reply text goes to Anthropic for classification. Counsel should confirm this fits the DPDP and PDPL position. If not, leave `ANTHROPIC_API_KEY` unset: clear cases are still sorted by rules, and everything else is marked "Needs reading".

## Decision ledger

```
Decision: Replies to outreach are received by AXXESS (Resend inbound), sorted by rules then Claude, applied to the lead, and forwarded to the founder.
Why: At any volume, a reply must stop the sequence and an unsubscribe must suppress the contact at once; the founder should not be the only place replies land.
What changed: lead_replies migration; rules, Claude classifier and intake services; email.received handling in the Resend webhook; replies in lead history.
Architecture boundary: The signed webhook is the only writer. Rules run before any AI call; any AI failure means a person reads the reply. Organization comes from a server setting, never the request.
Product boundary: Claude sorts only and never replies. Every reply is forwarded to a person.
Verification: See Verification above.
Outcome: Pending: merge, the migration on production, the founder's Vercel and Resend settings, and a live test reply, each on the founder's go.
Follow-up: WhatsApp on the verified number (Day 3 item 2); Day 4 funnel and volume ramp.
```
