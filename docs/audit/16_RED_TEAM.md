# Phase 16 -- Red Team

This phase's job is to attack this program's own claims and evidence, not to summarize them
favorably. Every item below is drawn from findings already made in Phases 0-15 -- this phase's
contribution is ranking them by real severity and stating the worst-case interpretation plainly,
not softening it with the surrounding context that the earlier phases already provided.

## Tier 1 -- Findings That Would Fail a Serious Enterprise/Government Security Review Today

1. **The AI answer-generation path bypasses row-level security entirely.** (Q-005, Phase 3/5)
   The table an AI answer is actually grounded in is queried with an elevated-privilege database
   client, exempt from row-level tenant isolation by definition. Isolation rests entirely on the
   application remembering to filter by tenant on every query, with zero database-level backstop.
   **Worst case:** a single missed filter in a future code change could leak one tenant's
   confidential documents into another tenant's AI-generated answer, silently, with no isolation
   policy to catch it. This table was also never covered by the one real, adversarial,
   production-database isolation test this program has run (Q-004). *(Exact table/file-level detail
   redacted from this public copy.)*
2. **This program's own "RLS tests" do not test RLS.** (Phase 2) 14 files across this repo assert
   that policy *SQL text* was written (`readFileSync` + `toContain`), not that the policy actually
   blocks a real cross-tenant read against a live database. One file explicitly designed for live
   persona-based testing has every real assertion commented out. **Worst case:** a regression that
   silently disables a real RLS policy would pass every one of these 14 "tests" while the underlying
   protection is gone.
3. **Zero audit trail on the highest-autonomy surface in the product.** (Q-007, Phase 5) The MCP
   agent tool-call approval flow -- the human checkpoint for what an autonomous AI agent is allowed
   to do to tenant data -- writes nothing to `audit_logs`. **Worst case:** a disputed or malicious
   agent action has no forensic trail distinguishing what was approved, by whom, and when, at exactly
   the point in the system where that trail matters most.
4. **The data-erasure/export pipeline is decorative.** (Q-006, Phase 5) Both endpoints record a canned
   "will be manually processed" message; one doesn't even log its own invocation. A real
   erasure-planning module exists in the codebase but is called by zero production code paths.
   **Worst case:** a real GDPR Article 17 / India DPDP-equivalent erasure request today would produce
   no actual data deletion and no audit trail proving one was attempted -- pure regulatory exposure,
   not a hypothetical.

## Tier 2 -- Real Operational and Financial Fragility

5. **The exact command this repo's own CI invokes cannot reliably complete.** (Phase 6) `pnpm run
   test`, unsharded, is what `package.json` and all 3 CI systems run. Four consecutive attempts this
   audit made at that exact command failed to produce a result, for two different reasons (one
   self-inflicted and now fixed, one a documented, accepted tradeoff). **Worst case:** a CI run that
   silently times out or crashes reports as a red build with no informative failure -- a developer
   under time pressure could be trained to distrust CI failures generally ("it's probably just
   flaky"), which is exactly the condition under which a real regression gets merged anyway.
6. **This audit itself needed 5+ attempts, 2 pool configurations, and manual process kills to get a
   complete answer on 2 test files.** (Q-010) The root cause (session-long memory exhaustion on an
   8GB machine) is now understood, but the *symptom* -- an environment that degrades unpredictably
   under sustained use -- is a real developer-experience and CI-reliability risk independent of its
   cause.
7. **Zero revenue, zero signed contracts, anywhere in this program's documentation.** (Phase 8) The
   entire commercial narrative rests on LOIs (oral/uncollected advances), pilots (2, both
   MSME/NGO-segment, not enterprise), survey intent, and pitch pipeline (mostly "no," "not yet," or
   "deferred" outcomes per the Claims Register). **Worst case, stated plainly:** this is a genuinely
   pre-revenue company at 40 days old, and every commercial figure in this program's documentation is
   an intent or interest signal, not a transaction.
8. **The company cannot yet legally collect the money it has been verbally promised.** (Phase 8, Phase
   12) Current account: under processing. GST: pending. Razorpay/Stripe: coded, not credentialed.
   The INR 25,000-30,000 in LOI advance commitments has nowhere to be deposited today even if a
   customer wanted to pay immediately.
9. **Bus factor of 1.** Across every document this audit reviewed (669+ commits, 101 actionables, 68
   bug-ledger entries, 33 pitch-log entries), one person -- the founder -- is the author of nearly
   all commits (per Phase 0's own confirmed 613/669, later Q-003-confirmed as all 5 git identities
   being the same person), the sole confirmed decision-maker, and the sole named product/engineering
   contact in every pitch/investor conversation reviewed. A cofounder is mentioned exactly once in
   this program's documentation (entry #10's Founder Institute application, "a husband-wife founding
   team"), with no independent commits, PRs, or decisions attributed to that person anywhere else in
   this repo's history. **Worst case:** any founder unavailability event stops the entire program, not
   just slows it.

## Tier 3 -- Real but Lower-Severity Findings

10. **An unexplained, order-of-magnitude traffic spike with no confirmed cause.** (Phase 9) DAU
    jumped from a 2-10/day baseline to 236 in 48 hours, and PostHog's own report -- not this audit --
    could not explain it or rule out bot traffic. **Worst case:** if this spike is not organic, every
    downstream metric derived from it (MAU, WAU, geography) inherits the same contamination, and no
    one has yet checked.
11. **Mobile store presence is completely blocked, with no workaround.** (Phase 10) Both platforms
    depend on one external, non-technical dependency (DUNS) with no individual-account fallback
    already ruled out by this program's own prior tracking.
12. **The native Expo/React Native mobile app renders hardcoded fake data.** (Phase 10) Confirmed by
    direct file read, not assumed -- `apps/mobile/app/dashboard.tsx` shows a static `value="18"` with
    no real data call anywhere in its screens. Low severity only because this program's own
    documentation is already honest about this surface not being production-ready; the risk is if
    that honesty lapses in future external messaging.
13. **A cross-cutting SMTP/DNS misconfiguration silently blocks ~5 separately-numbered "bugs."**
    (Phase 12, bug closure ledger) MX record saved as the wrong DNS record type, DMARC at the wrong
    host. Low-to-moderate severity technically (a config fix, not an engineering problem), but it has
    sat unresolved long enough to accumulate 5 distinct downstream symptom tickets before its single
    root cause was identified.

## What This Red Team Pass Did Not Find

No evidence of fabricated test results, fabricated commit history, a hidden second codebase, or a
claim this audit could trace to a knowing falsehood rather than an honest gap, an optimistic
forward-looking statement, or a documented, accepted tradeoff. The severity in this phase comes from
real, present gaps (especially Tier 1's RLS/audit/erasure findings), not from dishonesty found in how
those gaps are described.

## Answering the Audit Protocol's Own Question: What Would Break This Program Fastest?

**In order: (1) a tenant-isolation failure on the RAG path (Tier 1, item 1) -- the single highest-
consequence, lowest-detectability gap found across this entire audit, given zero database-level
backstop and zero live testing coverage on that specific table; (2) founder unavailability (Tier 2,
item 9) -- every other finding in this register is a fixable engineering or process gap, this one is
structural; (3) a CI-masked regression (Tier 2, items 5-6) -- the exact mechanism that would let (1)
ship without being caught.**

## Cross-References

Every finding above is sourced to its originating phase, cited inline; this phase deliberately adds
no new evidence, only re-ranks and states worst-case framing for evidence already gathered.
