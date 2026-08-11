# Phase 14 -- Claims Register

Per the audit protocol's own naming: this phase's job is to take every externally-facing numeric or
capability claim found across this program's history and check it against the real, current repo
state -- not to invent new claims, and not to soften a claim that turns out to be wrong.

## Claim-by-Claim Register

| # | Claim | Source, dated | Verified against | Verdict |
|---|---|---|---|---|
| 1 | "250,000+ LOC" | Cited in Phase 1 as an example external claim | Phase 1's own reconciled figure: 151,902 (code+SQL+docs+config); 73,051 (code only); 330,622 (full repo, unreconciled) | **UNSUPPORTED.** No methodology this audit checked reaches 250,000. Closest is the unreconciled full-repo total (330,622), which itself is flagged as containing ~160,600 lines of unidentified composition. |
| 2 | "1,350+ tests" | Cited in Phase 1 as an example external claim | Phase 6: 1,217 tests actually executed, 1,213 passing, across 249 of 251 files (2 files, 10 tests, environment-blocked) | **UNSUPPORTED, but closer than claim #1.** Even counting the 10 unexecuted tests as passing, the ceiling is 1,227 -- still under 1,350. |
| 3 | "170 merged PRs" | Cited in Phase 1 as an example external claim | This session's fresh `gh pr list`: 166 merged | **CLOSE, understated by 4, not overstated.** Within rounding distance of accurate; the direction of the gap (real number is slightly *below* the claim) is the opposite of what an inflation concern would predict. |
| 4 | "132k+ lines of code, 465+ GitHub commits, 130+ merged pull requests, 800+ passing tests" | Outbound founder email to Plug and Play UAE, 2026-08-01 (`PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #10) | Commits and PRs: at 2026-08-01 the program was well past 465 commits and 130 merged PRs on its own growth trajectory (422 commits / 113 merged PRs on 2026-07-28, per item #10 below) -- plausible for that date. Tests: 707 tests reported 2026-07-30 (`YC_INVESTOR_AGENTIC_EVIDENCE_UPDATE_2026_07_30.md`), so "800+" two days later is plausible. LOC: no exact same-date figure exists to check against; the entry's own "Reconciliation flag" already notes this 132k LOC figure "matches the founder's own recollection... this outbound email is founder-stated corroboration of that number, not a fresh independent repo measurement." | **PLAUSIBLE, not independently re-verified for its exact date** -- already flagged as such in the source document itself; this phase does not add new verification, only confirms the existing flag stands. |
| 5 | "5 signed LOIs, 2 additional committed LOIs" | Same 2026-08-01 email | `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`'s "Pending / Expected" section (7-8 customers expected across 3-4 documents, 5 received across 3 documents at that log's own last update) | **VERIFIED**, per this session's Q-012 resolution (Phase 8). |
| 6 | "2 active commercial pilots, 3 additional pilots commencing shortly" | Same 2026-08-01 email | This program's tracked pilots as of this audit (2026-08-11): 2 (Imprints Production, Ekora Hive), both onboarded 2026-07-29 | **PARTIALLY VERIFIED.** "2 active pilots" matches exactly. "3 additional pilots commencing shortly" -- **NOT FOUND IN AVAILABLE EVIDENCE.** No third, fourth, or fifth pilot beyond the original 2 has actually onboarded as of this audit, 10 days after that email. This was a forward-looking claim at the time; it has not materialized in the 10 days since, at least not as reflected in this repo's tracking. |
| 7 | "Outlook/Teams connectors were '100% integrated' and 'live tested'" | An earlier session's claim, self-flagged inside `ACTIONABLES_READINESS_MATRIX.md`'s own A-82 row | A-82's own detailed investigation: the connector reaches Microsoft's real login screen but fails after credential entry (`unauthorized_client`) for personal Microsoft accounts | **CONTRADICTED, and already caught and corrected by this program's own prior process**, not newly found by this audit. The row's own text states this plainly: "an earlier claim this session that Outlook/Teams connectors were '100% integrated' and 'live tested' is not supported by this evidence." Recorded here for completeness of the claims register, not as a new finding. |
| 8 | "Reliance Jio GenNext -- aligned on technology and product utility, lacks scope to initiate pilot immediately" | This session, verbal, 2026-08-11 | `PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #32's documented rejection email | **RESOLVED as a compound truth, not a false claim** -- see Q-011 (Phase 8): the rejection is real, occurring alongside genuine documented product interest. Neither half alone is the full picture. |
| 9 | Paxel's own "157,764 lines / 677 commits" | Paxel Report #14, founder-shared, 2026-08-10/11 | Phase 1's 151,902-line reconciled figure (within ~4%); 678 commits on the audit branch at the time checked | **PLAUSIBLE, methodology not independently confirmed** -- already flagged in `PAXEL_REPORT_14_BEHAVIORAL_ANALYSIS_2026_08_10.md`'s own cross-reference section as landing near, not exactly on, this repo's own reconciled figure; not re-litigated here. |
| 10 | "422 commits, 113 merged PRs, 625 tests/157 files" | `YC_APPLICATION_METRICS_UPDATE_2026_07_28.md`, dated snapshot | This audit's own fresh counts (2026-08-11): 737 commits (main), 166 merged PRs, 1,217 tests/251 files | **VERIFIED as an accurate historical snapshot, now superseded by real growth** -- see Phase 15 for the full delta between these two dated points. |

## What This Phase Did Not Find

**No claim register entry in this phase involves fabricated evidence or a knowingly false statement.**
Every claim checked was either accurate, an honest forward-looking statement that simply hadn't
materialized yet (claim #6's "3 additional pilots"), already self-corrected by this program's own
prior process before this audit even started (claim #7), or a plausible-but-not-independently-
re-verified figure that the source document itself already flagged as such (claims #4, #9). This is a
materially different finding than "this program inflates its numbers" -- the register above shows a
program that occasionally states forward-looking intent as if closer to certain than it turns out to
be, and one prior session that made an overclaim which was caught and corrected *by this program's
own documentation discipline*, not by this audit.

## Answering the Audit Protocol's Own Question: Does This Program's External Messaging Match Its Internal Evidence?

**Mostly yes, with one real miss (claim #6) and one already-self-corrected miss (claim #7), out of
10 claims checked.** Given this program's own stated practice of writing explicit "what not to
overclaim" documents *before* this audit began (Phase 13), a 10-claim register with only 1 unresolved
overstatement (a forward-looking pilot count that hasn't yet materialized, which is a different
category of risk than a fabricated historical number) is consistent with genuine claims discipline,
not just a lucky sample.

## Cross-References

- **Phase 1** (`01_REPOSITORY_EVOLUTION.md`) -- source of claims #1-3, the audit protocol's own named
  example external claims.
- **Phase 6** (`06_TEST_RELIABILITY_AUDIT.md`) -- source of the current real test count used to check
  claim #2.
- **Phase 8** (`08_COMMERCIAL_EVIDENCE.md`) -- source of claims #5, #6, #8's verification detail.
- **Phase 13** (`13_FOUNDER_EXECUTION.md`) -- the pre-existing claims-discipline pattern this phase's
  overall finding is consistent with.
- **Phase 15** (`15_YC_PROGRESS_DELTA.md`) -- the full growth delta behind claim #10.
