# Compliance Certification & Investor Feedback Roadmap

Date created: 2026-08-03
Source: David Orban's investment-decision feedback, 2026-08-01 (`docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #19)
Purpose: track the founder's actual response to each of Orban's five due-diligence questions -- what's being pursued as a long-run action item, and what's being explicitly deferred, with the founder's own reasoning recorded rather than silently acted on or silently dropped. Per this repo's evidence-chain discipline (`CLAUDE.md`), a founder decision not to pursue something is recorded as a decision, not treated as an open gap.

## Question 1: signed pilots / MOUs / current MRR

**Founder's call, 2026-08-03: not a current priority.** Explicit reasoning: "MRR/GCC traction are not really high on agenda for a 3.5 month old startup (everything sounds very easy on paper to advise)." Not tracked as an action item here. If this changes, log it in `PITCH_AND_TRACTION_LOG_2026_07-24.md` against the relevant prospect entries as pilots convert, not as a standalone initiative.

## Question 2: SOC 2 / compliance certification cost and timeline

**Status: long-run action item, open.**

- **What:** map the actual cost and timeline to reach SOC 2 (Type II, per Orban's specific question) certification, targeted at the compliance baseline required by AXXESS's four highest-value prospective clients (government/healthcare/NGO buyers).
- **Why:** government and healthcare procurement in the target markets (UNDP, IIT Kanpur/NASSCOM ecosystem, prospective GCC buyers) typically requires SOC 2 Type II and formal data processing agreements before a pilot can reach a live environment -- a real, external gate, not an optional nice-to-have.
- **Not yet scoped:** no cost estimate, no timeline, no auditor engaged. This is a genuine open gap, not yet started.

## Question 2b (folded into the above, not tracked separately): ISO certification

**Status: long-run action item, open, same track as SOC 2.**

- **Founder's explicit framing, 2026-08-03:** ISO certification tracked as its own long-run item alongside SOC 2 -- both are the same class of work (external compliance certification), scoped together going forward rather than as two independent efforts.
- **Not yet scoped:** which ISO standard (27001 is the standard fit for a SaaS platform handling institutional data, not yet formally confirmed as the target), cost, timeline, or auditor.

## Question 2c (explicitly folded in, not a separate item): data isolation architecture

**Founder's explicit framing, 2026-08-03:** "data-isolation architecture is part of SOC2/ISO itself" -- not tracked as an independent action item. The actual tenant-isolation engineering work already has its own evidence trail elsewhere in this repo (`docs/readiness/TENANT_PARTITIONING_*_CLOSEOUT_2026_07_28.md`, `SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md`) -- what's still open is *documenting and evidencing* that architecture in the specific form a SOC 2/ISO audit requires, which happens as part of the certification process above, not as separate engineering work.

## Question 3: differentiation against incumbents (Microsoft Copilot, Notion AI, Glean, ServiceNow)

**Not addressed in this pass.** Orban's question was about competitive positioning for a procurement officer who already has budget allocated to an incumbent vendor. Not raised by the founder as an action item in this round of instructions -- not recorded here as either pursued or deferred, simply not yet addressed. Flagging its absence rather than silently omitting it from this roadmap.

## Question 4: team size/contractor structure, data isolation

Team size/contractor structure: not addressed in this pass, not recorded as pursued or deferred. Data isolation: see Question 2c above -- folded into the SOC 2/ISO track.

## Question 5: ICP narrowing (single buyer segment + geography) and GCC traction/timeline

**Founder's call, 2026-08-03: not being pursued.** Explicit reasoning: "ICP narrowing is not on the cards unless someone like YC advises me." This is a deliberate decision to keep the current multi-segment, multi-geography positioning unless a credible outside advisor (the founder named YC specifically) recommends narrowing -- not an oversight, not an open gap, a considered call against Orban's specific advice. GCC traction/timeline: see Question 1 above -- same "not high on agenda at 3.5 months" reasoning.

## Summary

Of Orban's five questions, two produced genuine open action items (SOC 2 cost/timeline, ISO certification -- tracked together, with data-isolation documentation folded into that same track), two produced explicit founder decisions not to pursue right now (ICP narrowing, MRR/GCC traction tracking), and one (competitive differentiation) plus part of another (team/contractor structure) were not addressed in this pass and are flagged here as genuinely unaddressed rather than silently dropped.
