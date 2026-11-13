# One-Tap Call Logging on the Call Queue: Closeout (2026-11-13)

GTM plan `GTM_4_DAY_AUTOMATION_PLAN_2026_11_11.md`, outbound calling. **Status: Yes.** It is shipped, deployed, and verified live by the founder.

## External signal

- **Founder feedback (2026-11-13):** on how a call made from a phone gets tracked, logging the call was "manual data entry, anyone can do".
- **Founder choice (2026-11-13):** "One-tap logging, no provider", picked over a telephony provider (Exotel or Twilio). The plan was approved in plan mode, in `i-need-to-log-eager-donut.md`.

## What changed

PR [#485](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/485): head `c8aef259`, merged as `bb52a1c2`.

- **`src/features/leads/pendingCall.ts` (new):**
  - Tapping Call stores `{leadId, title, startedAt}` in sessionStorage under `axxess.pendingCall`.
  - Entries expire after 2 hours.
  - A blocked store means the banner doesn't show, never an error.
- **`src/features/leads/LeadsSection.tsx`:**
  - The `tel:` Call link saves the pending call. Nothing is written to the server on the tap, because `contact_attempts` is append-only and counts toward the frequency caps.
  - `PendingCallBanner`: when the page becomes visible again (or regains focus, or loads), it asks "How did the call with {lead} go?".
    - One tap posts `{outcome}`, plus an optional note, to the existing `/api/crm/leads/{id}/calls`. That route re-checks the contactability gate.
    - "Didn't call" clears the pending call and logs nothing.
    - A refusal (409) shows the gate's reasons.
  - The previous full form is kept, folded under "Log manually".
- **Tests:**
  - `pendingCall.test.ts`: 4 new tests.
  - `LeadsSection.test.tsx`: 4 new tests. All 8 were written first and run failing before the change.

## What did not change

- The calls API, the contactability gate, and the database schema.
- No call duration is recorded or claimed. The browser can't know it.
- No automatic call detection, no telephony provider, no recordings.

## What was verified

**Local, in worktree `axxess-access-fixes`:**

| Check | Result |
|---|---|
| `pnpm run typecheck` | exit 0 |
| `pnpm --dir apps/mobile run typecheck` | exit 0 |
| `pnpm run lint` | The first run failed: 1 error, `react/no-unescaped-entities` on "Didn't call". After the fix, exit 0 with zero warnings. |
| `pnpm run test` | 367 files, 2211 tests passed |
| `pnpm run build` | exit 0 |
| `pnpm run supabase:verify` | exit 0. 55 migrations, 120/120 tables RLS-protected. One known warning in the initial schema. |

**CI on #485:**
- All checks passed: Build/Lint/Type Check, playwright, validate, mobile-validate, CodeQL, Secret Scan, the critical-vulnerability gate, rls-artifact-check, the Pilot Acceptance Gate, and the Vercel previews.
- android-preview, ios-preview and Supabase Preview were skipped.
- The first merge attempt was refused because the short SHA was passed to `--match-head-commit`. It was retried with the full SHA.

**Production:**
- `deploy-production.yml` run 43439121171: landing, investor and lite all succeeded.

**Live (HITL, founder, 2026-11-13):**
- After a hard refresh, the founder tapped Call on a consented test lead, came back to the page, and the banner appeared.
- One tap logged the outcome, and the call showed in the lead's history.
- Founder report: "Yes, both worked".
- This live result is founder-reported. The agent did not see the signed-in session.

## What remains partial or unsupported

- **On a Windows laptop,** `tel:` opens a "Select an app" dialog. Phone Link, paired to the phone, places the call. On a phone the link goes straight to the dialler. This is the operating system's behaviour, not something AXXESS can change.
- **The pending call lives in one browser tab.** Calling from the laptop and then checking from a different device won't show the banner. The "Log manually" form covers that case.
- **No seeded Playwright test** was added for the banner (it was optional in the plan). It's covered by unit tests only.

## Decision ledger

```
Decision: Log call outcomes with one tap after a tel: call, instead of a telephony provider or a four-field form.
Why: Founder: four-field logging is "manual data entry, anyone can do"; founder chose "One-tap logging, no provider".
What changed: pendingCall.ts (sessionStorage), PendingCallBanner in LeadsSection.tsx, full form under "Log manually". PR #485, merge bb52a1c2.
Architecture boundary: UI only. The /calls API and the contactability gate are unchanged and still decide every log; no server write on the dial tap.
Product boundary: No duration, no automatic detection, no recordings; those need a provider (Exotel or Twilio) and were declined for now.
Verification: Local suite (2211/2211 tests, typecheck, lint, build, supabase:verify), all CI checks green, production deploy run 43439121171 succeeded, founder live test passed.
Outcome: Verified positive. One tap now logs a real call outcome on production.
Follow-up: Optional seeded Playwright test for the banner; revisit a provider only if automatic duration or recordings become a requirement.
```
