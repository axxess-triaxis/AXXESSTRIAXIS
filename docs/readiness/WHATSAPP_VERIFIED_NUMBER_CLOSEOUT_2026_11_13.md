# Verified WhatsApp Number on Callismatic: Closeout (2026-11-13), Parked

GTM plan `GTM_4_DAY_AUTOMATION_PLAN_2026_11_11.md`, Day 3 item 2; this also covers Day 1 item 3 (Callismatic's production keys). **Status: Partial, parked by the founder.** Real messages do not yet reach Callismatic.

## External signal

- **Founder choice (2026-11-13):** "WhatsApp verified number" as the next GTM step, then "Keep it on Meta direct" once AWS End User Messaging Social refused the number.
- **Founder decision (2026-11-13):** "Park WhatsApp for now", after the last test still failed to arrive.

## What was found (read-only)

- **AWS End User Messaging Social (ap-southeast-2):** one linked WhatsApp account, "Sudipta Sarmah" (Meta ID 1633458185021044). It has only Meta's test numbers, +1 555-374-8714 and +1 555-338-1750. Omnidamus production uses +1 555-374-8714.
- **The verified number +91 62905 47374** is in the Meta business Triaxis Group Private Limited, under WhatsApp account "Triaxis Ventures Private Limited" (ID 1415259430090366). AWS's sign-up flow marked it Ineligible: "This number can't be shared with this app." Founder screenshots, 2026-11-13.
- **Callismatic production** (Lambda `callismatic`, us-east-1) is a container image last deployed 2026-10-29. Its settings come from the Secrets Manager secret `callismatic/prod`.
  - **Risk 1:** a WhatsApp message triaged with `place_callbacks=True` by default, so any sender could trigger a real CALL-E phone call.
  - **Risk 2:** the dashboard `/` was public. It would list senders' phone numbers once messages arrived.
- **Two Meta apps** exist in that business: Callismatic (1018667774529254) and AXXESS TRIaxis (2054328055214154). The +91 number was registered under AXXESS TRIaxis.

## What changed

**Callismatic code** (`axxess-triaxis/callismatic`):
- **#13** (merged as `1952281`): the WhatsApp webhook triages with `place_callbacks=False`. One test was added, and it was run failing first.
- **#14** (merged as `cef489d`): `GET /` needs the read or admin key, and fails closed if neither is set. Two tests were added, both run failing first. The README was updated.

**Callismatic production:**
- Image `prod-1952281` deployed at 09:08 UTC.
- Image `prod-cef489d` deployed at 09:19 UTC (current).
- Both deploys were on the founder's go. They also brought production up to date with the already-merged #9, #11 and #12, which had not been deployed.

**`callismatic/prod` secret (founder, 08:50 UTC):**
- `WHATSAPP_PHONE_NUMBER_ID` (1057953857395633)
- `WHATSAPP_ACCESS_TOKEN` (a non-expiring system user token, from system user "Employee")
- `WHATSAPP_APP_SECRET` (AXXESS TRIaxis)
- `WHATSAPP_VERIFY_TOKEN`
- The values were never read by the agent: only `DescribeSecret` metadata was used.

**Meta (founder):**
- The +91 number was added to the AXXESS TRIaxis WhatsApp use case.
- The webhook was set to the Callismatic function URL `/webhook` and verified, and the `messages` field subscribed.
- The Site URL was changed to `https://landing.triaxisventures.com/auth`, because the old OAuth callback URL returned 401 and blocked going Live.
- The app was published (Live).
- `POST 1415259430090366/subscribed_apps` returned `{"success": true}`.

**Lambda description** set to "Callismatic web app - secrets reloaded …", to force a cold start.

## What did not change

- Omnidamus stays on the +1 555 test number.
- AXXESS code: no click-to-chat links were added (deferred until messages flow).
- Voicemail triage still places callbacks, as before. `/api/triage/text` is unchanged and stays opt-in.

## Verification

- Callismatic `pytest -q`: 164 passed after #13, and **166 passed** after #14, run on merged `master` before each image build.
- After the `prod-cef489d` deploy (live URL):
  - `GET /` with no key: **401** (it was 200 before)
  - `GET /api/digest` with no key: 401
  - `POST /webhook` unsigned: 403
  - `GET /webhook` with a wrong verify token: 403
- Meta "Verify and save" succeeded. That needs the matching `WHATSAPP_VERIFY_TOKEN`, so the new secret was loaded.
- Meta's dashboard **Test** (messages) reached Callismatic at 09:31:33 UTC (a 153 ms invocation). It produced no triage and no STILL event. The reason is not logged.
- **Real messages: not received.** The founder sent several messages, which showed two ticks on the phone. The CloudWatch log `/aws/lambda/callismatic` has no invocations from 09:31:41 to 10:25:42 UTC, including after the `subscribed_apps` POST. The STILL adapter log is empty over the same window.

## Partial, blocked or unsupported

- **Blocked:** real WhatsApp messages to +91 62905 47374 are not delivered to the webhook. The cause is on Meta's side and is not visible from AWS. The candidates, unverified:
  - the number also runs on the WhatsApp Business app (coexistence)
  - another app holds this WhatsApp account's webhook
  - a delivery lag after going Live
- **Unexplained:** the 09:31 dashboard test was not triaged. Callismatic does not log why it refuses a webhook request, so a signature mismatch cannot be told apart from an unparsed payload.
- **Known gap:** the app has "Require app secret" on. Callismatic's outgoing `send_whatsapp_message` sends no `appsecret_proof`, so outgoing WhatsApp sends would be refused. Incoming messages are not affected.
- **Not built:** AI replies on WhatsApp inside Meta's 24-hour window (Callismatic does not reply), templates, and click-to-chat links.

## Rollback

- Point the `callismatic` function back to image `still-ae4ddcb` (2026-10-29) or `prod-1952281`. Both are still in ECR.
- The secret's previous version is kept as `AWSPREVIOUS`.

## Decision ledger

```
Decision: The verified +91 WhatsApp number is served by Callismatic through Meta's API directly (AXXESS TRIaxis Meta app), not through AWS End User Messaging Social; WhatsApp messages never trigger phone callbacks and Callismatic's dashboard is never public. Then parked.
Why: Meta refused to share the number with AWS ("can't be shared with this app"); unsolicited callbacks risk calling rules in India and the UAE; a public page of sender numbers breaches privacy expectations (DPDP).
What changed: callismatic #13 and #14 merged and deployed (prod-cef489d); WhatsApp keys in callismatic/prod; Meta webhook, messages field, Live mode and the account subscription set by the founder.
Architecture boundary: Callismatic owns WhatsApp intake for the verified number; Omnidamus keeps the AWS-linked test account; STILL carries triaged leads to AXXESS unchanged.
Product boundary: WhatsApp intake triages only; it never calls the sender back, and the dashboard needs a key.
Verification: See Verification above. Code and deploy verified; end-to-end message delivery not verified.
Outcome: Partial. Infrastructure ready; real messages do not reach the webhook. Parked by the founder on 2026-11-13.
Follow-up: When resumed, (1) add refusal-reason logging to Callismatic's webhook, (2) rerun Meta's Test to separate webhook from routing, (3) check whether the number is in WhatsApp Business app coexistence, (4) add appsecret_proof before any outgoing send.
```
