# A-107 -- Google OAuth Exchange Failure -- Closeout (2026-08-20)

Governed by: `docs/readiness/CLOSEOUT_TEMPLATE.md`, `CLAUDE.md` (Evidence Chain -- Standing Rule).
Related: `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` row A-107,
`docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md`.

## What A-107 was

Discovered 2026-08-08 via PostHog's public shared "Landing Pages Report": the URL
`landing.triaxisventures.com/auth/login?error=server_error&error_code=unexpected_failure&
error_description=Unable+to+exchange+external+code...` appeared 3 times in a top-25 landing-page
breakdown over a 2026-07-09 to 2026-08-08 window -- meaning at least 3 real page-loads landed on this
exact Google OAuth exchange-failure redirect. Investigation (2026-08-09) found this was very likely a
recurrence of A-73's already-diagnosed and fixed defect class (identical error text; A-73 fixed a
mismatched Google Client ID/Secret in Supabase's provider config on 2026-07-29), since one of the 3
recorded occurrences (2026-08-02, a real human "Continue with Google" click, confirmed via session-replay
timing analysis) postdated A-73's fix by 4 days -- raising the question of whether the 2026-07-29 fix had
fully/permanently held, or whether this was a distinct, possibly intermittent failure mode.

Live investigation that session (outbound-leg test: clicking "Continue with Google" and confirming
Google's own consent screen rendered without an `invalid_client` error) narrowed suspicion toward the
Client Secret specifically, since that's only used in the later server-to-server exchange step -- but the
actual exchange step could not be tested further without entering credentials, which this program's
standing rule prohibits regardless of who is asking.

## Closeout Evidence

**Issue ID:** A-107

**Title:** Google OAuth exchange failure, primary sign-in flow

**Origin plan:** No formal plan -- reactive investigation from PostHog evidence, per
`docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md`.

**Research artifact:** `docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md` (2026-08-09),
this document (closeout).

**Implementation commit(s):** N/A -- no code fix was needed or made under A-107 itself. The underlying
fix (correcting the Google Client ID/Secret mismatch in Supabase's provider config) was made under A-73
on 2026-07-29, before A-107 was even opened.

**PR:** N/A

**Test evidence:** N/A -- not a code-level defect with an automatable test; the closing evidence is a
live production-behavior claim (non-recurrence), not a test suite result.

**Verification result (raw, not paraphrased):**
- Founder-stated, 2026-08-20, verbatim: "The error has not recurred."
- Founder pointed to the auth-intent-funnel PostHog analysis shared earlier the same session
  (`docs/readiness/POSTHOG_DATA_ANALYTICS_INSIGHTS_LOG_2026_08_09.md`, "2026-08-20 -- Auth-intent funnel"
  section) as substantiation. That entry itself only records Google/Microsoft OAuth-click *intent*
  events (fresh attempts on Aug 15/16/17 among others) -- it does not on its own confirm those specific
  attempts avoided landing on the `unexpected_failure`/"Unable to exchange external code" redirect,
  since not completing a signup is also consistent with abandonment or evaluation-without-signup-intent,
  a distinction that entry's own text already flags. Asked directly whether the underlying external
  analysis separately checked the landing-page URL breakdown for this specific error pattern in a recent
  window and found zero occurrences (as opposed to inferring non-recurrence from the general absence of
  visible failures) -- **founder confirmed: yes.**
- This closure therefore rests on a founder-relayed claim that the specific `error_code=unexpected_failure`
  URL pattern was checked against a recent PostHog window and returned zero occurrences -- more specific
  than a general "no complaints" absence-of-evidence read, but still not independently re-pulled or
  re-verified by this Claude Code session directly against PostHog's own UI/API, and not a fresh live
  Google sign-in re-test either. Tagged `Founder-stated, source artifact needed` accordingly.

**Deploy evidence:** N/A -- no new deployment associated with this closure; the relevant fix already
shipped under A-73 on 2026-07-29.

**Final status:** Closed -- false positive, per `docs/readiness/STATUS_TAXONOMY.md`. Tagged
`Founder-stated, source artifact needed` per `CLAUDE.md`'s Evidence Chain hard rule #4: the founder's own
non-recurrence claim is recorded as founder-stated, not independently re-verified by this session against
PostHog or Supabase Auth Logs.

**Remaining risk:** None specific to this row. The underlying credential-mismatch defect class (A-73) is
not proven permanently unable to recur -- Supabase dashboard credential fields are not version-controlled
or monitored from this repository, so a future accidental re-edit or rotation would again be invisible
here until it surfaced the same way A-107 originally did (a PostHog-visible OAuth-failure redirect).

**Follow-up issue IDs:** None opened. If this error class recurs again in the future, it should be logged
as a new row rather than reopening A-107, per this repo's own `Reopened by` convention
(`docs/readiness/CLOSEOUT_TEMPLATE.md`) -- cross-reference back to this closeout and to A-73.

## Supersedes / Superseded by / Reopened by

- **Supersedes:** N/A
- **Superseded by:** N/A
- **Reopened by:** N/A (would apply if this error class recurs in the future)
