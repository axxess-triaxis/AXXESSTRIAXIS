# Phase 12 -- Capital Efficiency

## Total Spend, Two Dated Data Points (Not a Discrepancy -- Different Points in Time)

- **`MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` section 1.4, last touched 2026-07-21:** total
  historic spend on development, design, and product **approximately $800**, of which **$80** spent
  in the phase current at that writing.
- **`PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #10, an outbound founder email dated 2026-08-01:**
  "bootstrapped on ~US$1,000 total (~US$220 on AI dev tools)."

These are 11 days apart and both plausible as sequential points on the same spend trajectory ($800 ->
$1,000 as the program continued) -- **not treated as a contradiction requiring reconciliation**, since
spend naturally accumulates over time and nothing here suggests the two figures were meant to describe
the same instant. Reported with both dates rather than picking one as "the" number.

## Breakeven Math (as documented, not re-derived)

At the Tier 1 self-serve price point ($50/year, per the same section 1.4), the founder's own stated
math is that **two self-serve subscriptions cover the ~$800 figure's current run-rate cost** -- i.e.
the company does not need enterprise or sovereign-tier revenue to sustain today's burn rate; those
tiers are framed as an expansion path, not a near-term-sustainability dependency. **This phase did
not independently re-verify this arithmetic against a real, current burn-rate figure** (no monthly
recurring cost breakdown was reviewed) -- recorded as the founder's own stated framing, consistent
with this program's own evidence-discipline conventions for founder-stated financial claims.

## A Second, Separate, Real Budget Line: Azure/Entra Trial Credit

Distinct from the general $800-$1,000 development spend above: `ACTIONABLES_READINESS_MATRIX.md`'s
A-82 row documents a **$200 Azure trial credit**, of which **~$110 had been consumed** (as of
2026-08-06) on repeated API triage while isolating the Microsoft Entra/Outlook/Teams OAuth root
cause, leaving **~$90 held in reserve**. The founder's own explicit instruction, per that row: hold
the remaining credit and defer further Azure work 3-6 months, "timing contingent on funding/grant
status," rather than spend it now on a portal fix + live re-test cycle. **This is a genuine, real-time
example of a capital-efficiency decision actually being made and documented, not just a policy
stated in the abstract** -- a specific, dated, named trade-off (defer a known, diagnosed fix to
preserve a small remaining credit pool) rather than an unconstrained "we'll get to it eventually."

## Cost-per-Output Framing (This Phase's Own Calculation, Not Founder-Stated)

Cross-referencing this phase's own numbers against Phase 11's velocity data and this session's
tracked-issue totals, computed directly, not asserted by any prior document:

- At ~$1,000 total spend (the more recent of the two dated figures above) against 737 commits, 166
  merged PRs, 251 test files (1,213 passing tests), and ~124 closed-equivalent tracked
  actionables/defects across three trackers (Phase 8/11), **the marginal dollar-per-commit and
  dollar-per-closed-issue figures are, on their face, extremely low** ($1,000 / 737 commits ≈ $1.36
  per commit; $1,000 / ~124 closed items ≈ $8.06 per closed item). **These ratios are reported as
  arithmetic, not as a claim of representativeness or efficiency benchmarking against any external
  comparable** -- this audit has no comparable-company dataset to benchmark against, and a
  dollar-per-commit figure does not capture commit size, complexity, or rework. Presented as a
  data point for the founder's own use, not as a validated efficiency metric.

## Answering the Audit Protocol's Own Question: Is This Program Capital-Efficient?

**Directly: yes, on every piece of evidence this phase reviewed, with the caveat that this phase did
not independently verify the underlying spend figures against bank statements, invoices, or any
financial record beyond the founder's own stated numbers in existing repo documents.** The pattern
across this program's own documentation is consistent, not just self-reported once: a small,
specific total spend figure, a real example of an active budget-preservation decision (the Azure
credit deferral) rather than an abstract policy, and output volume (commits, PRs, tests, closed
issues) that is large relative to the stated spend. None of this was independently verified against
external financial records by this audit -- it is internally consistent across this repo's own
documentation, which is the standard this phase can actually check, not a claim of external
financial audit.

## Cross-References

- **Phase 11** (`11_ENGINEERING_VELOCITY.md`) -- source of the commit/PR/test throughput figures used
  in the cost-per-output framing above.
- **Phase 8** (`08_COMMERCIAL_EVIDENCE.md`) -- source of the 195-item/~124-closed tracked-issue total.
- **`ACTIONABLES_READINESS_MATRIX.md`** A-82 row -- primary source for the Azure trial-credit example,
  not re-derived here.
