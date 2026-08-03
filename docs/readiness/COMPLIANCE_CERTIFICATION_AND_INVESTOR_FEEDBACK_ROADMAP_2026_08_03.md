# Compliance Certification & Investor Feedback Roadmap

Date created: 2026-08-03
Source: David Orban's investment-decision feedback, 2026-08-01 (`docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #19)
Purpose: track the founder's actual response to each of Orban's five due-diligence questions -- what's being pursued as a long-run action item, and what's being explicitly deferred, with the founder's own reasoning recorded rather than silently acted on or silently dropped. Per this repo's evidence-chain discipline (`CLAUDE.md`), a founder decision not to pursue something is recorded as a decision, not treated as an open gap.

## Question 1: signed pilots / MOUs / current MRR

**Founder's call, 2026-08-03: not a current priority.** Explicit reasoning: "MRR/GCC traction are not really high on agenda for a 3.5 month old startup (everything sounds very easy on paper to advise)." Not tracked as an action item here. If this changes, log it in `PITCH_AND_TRACTION_LOG_2026_07-24.md` against the relevant prospect entries as pilots convert, not as a standalone initiative.

## Question 2: SOC 2 / ISO certification cost and timeline

**Founder's call, 2026-08-03 (revised from an earlier pass in this same doc): not a current priority either.** Explicit reasoning, given in the same breath as a broader point: "There are 1000 things to do, even HIPAA third party compliance when I set up Bay Area subsidiary in 10 years, US Defence clearance once I start pitching to Pentagon. I am doubtful if I should make them action items now... Time and place for everything." SOC 2 and ISO (27001, the likely fit for a SaaS platform handling institutional data, not yet formally confirmed) are real, correctly-identified future gates -- but a certification process that typically costs tens of thousands of dollars and takes 6-12 months doesn't make sense to fund or schedule before there's a specific signed pilot or procurement process actually demanding it. **Acknowledged, not scheduled** -- revisit when a real prospect's procurement process names it as a blocking requirement, not on a self-imposed timeline.
- Same bucket, same reasoning, explicitly named by the founder as further-out examples of the same pattern: **HIPAA** (relevant once a US/Bay Area subsidiary exists), **US Defense clearance** (relevant once pitching to Pentagon-adjacent buyers). Recorded here as future context, not as anything to schedule now.

## Question 2c (explicitly folded in, not a separate item): data isolation architecture

**Founder's explicit framing, 2026-08-03:** "data-isolation architecture is part of SOC2/ISO itself" -- not tracked as an independent action item, and deferred on the same "not now" basis as SOC 2/ISO above. The actual tenant-isolation *engineering* work already has its own evidence trail elsewhere in this repo (`docs/readiness/TENANT_PARTITIONING_*_CLOSEOUT_2026_07_28.md`, `SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md`) and is not itself deferred -- only the work of *documenting and evidencing* it in the specific form a SOC 2/ISO audit requires is deferred, since that packaging only matters once an actual certification process is underway.

## Question 3: differentiation against incumbents (Microsoft Copilot, Notion AI, Glean, ServiceNow)

**Not addressed in this pass.** Orban's question was about competitive positioning for a procurement officer who already has budget allocated to an incumbent vendor. Not raised by the founder as an action item in this round of instructions -- not recorded here as either pursued or deferred, simply not yet addressed. Flagging its absence rather than silently omitting it from this roadmap.

## Question 4: team size/contractor structure, data isolation

Team size/contractor structure: not addressed in this pass, not recorded as pursued or deferred. Data isolation: see Question 2c above -- folded into the SOC 2/ISO track.

## Question 5: ICP narrowing (single buyer segment + geography) and GCC traction/timeline

**Founder's call, 2026-08-03: not being pursued.** Explicit reasoning: "ICP narrowing is not on the cards unless someone like YC advises me." This is a deliberate decision to keep the current multi-segment, multi-geography positioning unless a credible outside advisor (the founder named YC specifically) recommends narrowing -- not an oversight, not an open gap, a considered call against Orban's specific advice. GCC traction/timeline: see Question 1 above -- same "not high on agenda at 3.5 months" reasoning.

## Summary

Of Orban's five questions: **none are currently tracked as open action items.** Three produced explicit founder decisions not to pursue right now (SOC 2/ISO cost and timeline including the folded-in data-isolation documentation and audit packaging, ICP narrowing, MRR/GCC traction tracking), each with the founder's own stated reasoning recorded above rather than silently dropped. One (competitive differentiation) plus part of another (team/contractor structure) were not addressed in this pass and are flagged here as genuinely unaddressed, not as deferred decisions. Revisit basis: SOC 2/ISO/HIPAA/defense clearance -- when a real prospect's procurement process names one as a blocking requirement; ICP narrowing -- if a credible outside advisor (founder named YC specifically) recommends it; MRR/GCC traction and competitive differentiation/team structure -- no set trigger, open for founder to raise when relevant.
