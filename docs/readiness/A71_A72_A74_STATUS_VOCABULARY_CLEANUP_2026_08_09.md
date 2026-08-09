# Closeout -- Status-Column Vocabulary Cleanup: A-71, A-72, A-74

Date: 2026-08-09
Governance source: `CLAUDE.md` evidence-chain discipline
Status: **Three rows' Status-column text normalized to this matrix's own stated vocabulary. No
underlying finding, confidence score, or evidence text changed -- this is a labeling cleanup, not a
re-adjudication.**

## Why This Document Exists

`ACTIONABLES_READINESS_MATRIX.md`'s own header states: "Status vocabulary: `No`, `Yes`, `Blocked`,
`Deferred`." Three rows -- A-71, A-72, A-74 -- had drifted from that vocabulary into free-text status
strings ("Resolved on retry (founder-confirmed), root cause still unconfirmed"; "Resolved
(founder-confirmed)"; "Closed -- not applicable (per founder instruction 2026-08-07)"), flagged directly
by the founder for cleanup. This document records exactly what changed, why each row landed on the
token it did, and confirms no row's underlying evidence or confidence was altered in the process.

## What Changed, Row by Row

| Row | Before | After | Confidence (unchanged) |
|---|---|---|---|
| A-71 | `Resolved on retry (founder-confirmed), root cause still unconfirmed` | `Partial -- outcome resolved on retry (founder-confirmed); root cause unconfirmed, no code fix applied` | 55% |
| A-72 | `Resolved (founder-confirmed)` | `Yes -- founder-confirmed 2026-07-29; this row's own narrow DoD (landing off vercel.com/login) is met at 80% confidence, meeting this matrix's stated closure threshold. The separately-surfaced next-step failure is tracked under A-73, not this row` | 80% |
| A-74 | `Closed -- not applicable (per founder instruction 2026-08-07)` | `Yes -- closed as not applicable; SMTP provider superseded by Resend, founder-directed 2026-08-07` | -- |

## Reasoning Per Row

**A-71 -> `Partial`, not `Yes`.** The row's own existing evidence text already explicitly says why: "kept
below `Yes`-level since neither the root cause nor the fix (retry succeeded, nothing was changed) is
independently verified" -- and its confidence (55%) sits well under this matrix's own stated "80%
confidence minimum" closure threshold (document header, line 5). Converting this to `Yes` would
contradict the row's own prior reasoning and this matrix's own closure rule. `Partial` is not one of the
four vocabulary words listed in the header, but it is already the established de facto extension used
elsewhere in this same matrix for exactly this shape of finding (a confirmed real-world outcome without
an independently-verified fix or root cause) -- see A-10, A-83, and A-104, all already using `Partial`
before this cleanup. Using it here is consistent with existing precedent, not a new pattern.

**A-72 -> `Yes`, not left as free text.** The row's own confidence (80%) meets the matrix's stated 80%
closure threshold exactly, and the row's own Definition of Done ("lands back on a real AXXESS TRIaxis
page... never on `vercel.com/login`") is explicitly confirmed met in the row's evidence text ("Retrying
the flow no longer lands on `vercel.com/login`"). The row's own text also already explains *why* it was
historically kept off `Yes`: "since a full successful sign-in has still not been completed end to end --
see A-73, a new, distinct failure now surfaced at the next step." That reasoning describes a **different
row's own scope** (A-73's own DoD is the full sign-in completing), not a gap in A-72's own DoD. Per this
matrix's established practice of keeping structurally-adjacent-but-distinct defects in separate rows
rather than letting one row's unresolved status bleed into another (the same discipline already applied
to keep A-107 distinct from A-26, and A-108 distinct from A-105/A-106), A-72's own narrow scope is
correctly `Yes`, with A-73 remaining the row that owns the still-open next-step failure.

**A-74 -> `Yes`, not left as free text.** Precedent already exists in this exact matrix for a row closed
by a route other than a traditional code fix landing: A-29 ("Closed by removal") uses `Yes (resolved by
removing the whole tab, founder-directed, 2026-08-08)` as its top-level token. A-74 is the same shape --
closed because its underlying premise (an Elastic Mail-specific SMTP failure) stopped applying once the
founder replaced Elastic Mail with Resend entirely, a product decision recorded in the row's own
2026-08-02 entry five days before the top-level status was ever synced to it. Mirroring A-29's exact
convention keeps the matrix's small set of "closed via founder decision rather than a fix" rows
consistent with each other rather than each inventing its own phrasing.

## What Was Not Changed

- No evidence paragraph, date, screenshot reference, or root-cause finding in any of the three rows was
  edited -- only the Status-column cell.
- No Confidence-column value was changed -- 55% (A-71), 80% (A-72), and `--` (A-74) all carried forward
  exactly as they were.
- A-73 (the row A-72's own text hands off to) was not touched by this cleanup and remains tracked
  separately on its own merits.
- This is not a claim that A-71's root cause is now known, or that A-72's full sign-in flow is now
  independently re-verified end to end -- both caveats remain exactly as strong as they were before this
  cleanup; only the top-level token summarizing them was standardized.

## Evidence Chain

Founder flagged the three non-standard Status-column strings directly, 2026-08-09 -> re-read each row's
full existing evidence text in full (not summarized from memory) to confirm what each row's own
confidence score and DoD-met/DoD-not-met language already established -> cross-checked this matrix's own
header-stated vocabulary and closure threshold, and its own existing precedent rows (A-10, A-83, A-104
for `Partial`; A-29 for "closed via founder decision, token stays `Yes`") -> selected the token for each
row that this matrix's own existing rules and existing precedent already implied, rather than picking new
labels independently -> applied the three edits -> this document written as the citable record of what
changed and why.

## Files Changed

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- Status-column text updated for A-71, A-72, A-74
  (three single-cell edits; no other content in any of the three rows changed).
- `docs/readiness/A71_A72_A74_STATUS_VOCABULARY_CLEANUP_2026_08_09.md` (new, this document).
