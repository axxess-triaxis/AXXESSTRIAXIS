# Pitch Protocol Application Submission -- Closeout, 2026-08-13

**Operation:** connect a new third-party MCP service (Pitch Protocol, `api.pitchprotocol.vc`), assemble a real
`PitchApplication` payload from verified source material, and submit a live pre-seed fundraising application on
the founder's behalf, end to end within this session.

**Outcome:** application `711D5959-FDBA-4478-ACBC-F17F6763B644` fully submitted (`status: submitted`), all 5
intake questions answered and finalized. Founder-confirmed receipt of the platform's own confirmation email.

---

## What changed

- **New MCP connection**: `api.pitchprotocol.vc/mcp/founder`, added by the founder mid-session. Not a known/
  registry-listed connector (`search_mcp_registry` returned zero results for "pitchprotocol"/"founder"). Seven
  tools loaded: `create_application`, `get_application_schema`, `get_status`, `resend_verification`,
  `submit_answers`, `update_application`, `verify_email`.
- **A real, submitted fundraising application** now exists on Pitch Protocol's platform for Triaxis Ventures,
  containing company facts, both founders' backgrounds and LinkedIn profiles, traction figures, and a $2M
  pre-seed raise ask with founder-supplied valuation math.
- **No code, config, or application changes to this repository** -- this action is entirely external to the
  AXXESS TRIaxis codebase. This closeout doc and a new entry in `PITCH_AND_TRACTION_LOG_2026_07_24.md` (#41)
  are the only repo-side artifacts of this workstream.

## What did not change

- No AXXESS TRIaxis product code, database schema, or deployment was touched.
- No other open PR (#232, #233) was affected by this workstream.
- This was not treated as a registry-vetted, pre-trusted connector -- it was connected on explicit founder
  instruction after the founder was shown that it wasn't a recognized service, per the safety discipline
  around connecting new external tools.

## Source material and evidence chain

Per the tool's own explicit instruction ("Don't fabricate -- leave gaps and ask") and this repo's standing
evidence discipline, the application payload was built exclusively from:

1. **The founder's own pitch deck** (`Triaxis Ventures 12082026.pdf`, dated 2026-08-12, 12 pages, supplied
   directly by the founder) -- company positioning, product description, problem/insight framing, target
   categories, team bios, company timeline/burn/commit stats, and the original $2M pre-seed ask.
2. **This session's own live-verified data** -- the LOIS log's 6-signed/1-committed LOI figures (2026-08-13,
   fresher than the deck's 5-signed/2-committed figures) and the PostHog traffic/Web-Vitals/error figures
   pulled and recorded earlier this same session, used verbatim by the founder in his own q4 intake answer.
3. **Direct founder input** for every field with no existing evidence anywhere in the repo or deck: location,
   both founders' LinkedIn URLs, how the founders met, valuation/equity split, monthly burn, prior investors,
   market size, and the "hardest part" narrative.

Fields left genuinely blank at first draft (not guessed) and later filled by direct founder answer:
`valuation`/`valuationType`, `monthlyBurn`, `priorInvestors`, `equityPercentage` (both founders), `marketSize`,
`hardestPart`, `howYouMakeMoney`.

**One inference made, not founder-stated, and disclosed as such before use:** `raise.valuation` is a single
required-shape field but the founder gave a range ($9.11M-$11.33M pre-money, computed from $2M at 15-18%).
The midpoint ($10,220,000) was used and explicitly flagged to the founder in the final payload review; he
confirmed the full payload including this figure without objection.

**One field asserted without a dedicated confirmation question:** `company.customerType: "b2b"` was proposed
during payload assembly and included in every review pass the founder approved, but was never asked about in
isolation the way `sectors`, the LOI-figure choice, and Ritashree's full-time status were. Founder-approved via
the general payload review, not unconfirmed, but noted here for completeness since it didn't get its own
explicit question.

## Judgment calls made during assembly, and who decided them

| Decision | Resolution | Decided by |
|---|---|---|
| `company.name`: "Triaxis Ventures" vs. "AXXESS TRIaxis" | Triaxis Ventures | Founder (AskUserQuestion) |
| `sectors` (max 3, controlled taxonomy) | `ai`, `enterprise`, `saas` | Founder (AskUserQuestion, over healthtech/govtech alternatives) |
| Traction figures: deck's (5 signed + 2 committed LOIs) vs. session's (6 signed + 1 committed) | Session's, fresher | Founder (AskUserQuestion) |
| Ritashree Mahanta `isFullTime` | `false` (part-time, alongside her academic/healthcare role) | Founder (AskUserQuestion) |
| `submitterType` | `humanFounder` (not `aiAgent`/`aiFounded`) | Assessed by this session -- Sudipta is the human applicant; Claude Code is the executing tool, recorded via `submittedBy`, not the applicant itself |

## What was verified

- **Application lifecycle, each step independently confirmed via `get_status`**: `draft` -> `researching`
  (6 polling calls, each blocking server-side, until research completed) -> `intake` (5 questions
  auto-generated by the platform's own research pipeline) -> `submitted` (after `finalize: true`).
- **Email verification**: real 6-digit code sent to `[FOUNDER_EMAIL_MASKED]`, founder supplied it from his own
  inbox, `verify_email` succeeded on the first attempt.
- **All 5 intake answers saved individually** (`submit_answers`, `finalize: false` each time, confirmed via the
  tool's own `answered: [...]` response after each call) before the final `finalize: true` call locked the
  application.
- **Founder-reported, not independently checked by this session**: receipt of Pitch Protocol's own confirmation
  email. This session has no inbox access and did not verify the email's contents -- recorded as founder-stated.

## What remains partial or blocked

Nothing on Pitch Protocol's side -- the application is fully submitted and locked (`finalize: true` is
one-way; no further edits are possible through this tool). The only open item is external to this session
entirely: whether any fund responds, which is Pitch Protocol's own stated next step ("we'll email you if a
fund wants to connect"), not something trackable from this repo.

## PII handling

This repository is public. The following were deliberately **not** reproduced in this doc even though they
were used in the actual submission: the founder's real email address, both founders' literal LinkedIn URLs,
the verification code, and the specific personal/relationship details given in the `howFoundersMet` field
(the founders disclosed personal context relevant to that intake field directly to Pitch Protocol; this repo
records only that such an answer was given, not its content). This follows the same masking convention already
applied throughout `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` and
`PITCH_AND_TRACTION_LOG_2026_07_24.md`.

## Exact state

- **Application ID:** `711D5959-FDBA-4478-ACBC-F17F6763B644`
- **Status:** `submitted` (final, locked)
- **Tool calls made, in order:** `get_application_schema` -> `create_application` -> `verify_email` ->
  `get_status` (x6) -> `submit_answers` (x5, `finalize: false`) -> `submit_answers` (`finalize: true`)
- **Cross-reference:** `PITCH_AND_TRACTION_LOG_2026_07_24.md`, new entry #41.

## Follow-up

None required from this session. If a fund responds, that becomes a new dated update on entry #41 in the
pitch/traction log, following this repo's standing pattern for every other accelerator/investor interaction.
