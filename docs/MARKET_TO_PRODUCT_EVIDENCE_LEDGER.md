# Market to Product Evidence Ledger

Date created: 2026-07-25  
Governance source: `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`

## Purpose

This file ties external signal to product decisions and shipped work.

It treats calls, beta feedback, stakeholder validation, client scoping, QA walkthroughs, and investor conversations as product evidence.

## Input Sources

| Source category | Count stated | Count verified | Source files / links | Notes |
|---|---:|---:|---|---|
| Investor / pitch calls | 21 | 22 named entries logged | `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` | Verified as a founder-reported, named, one-to-one log (22 entries, exceeds the stated 21) -- not independently verified beyond the founder's own account of each conversation |
| Beta feedback | 35+ | 30 raw / 28 deduplicated | `Enterprise beta feedback - Batch 1 (30 responses)/Enterprise_Beta_Feedback_Batch_1.md` | Real survey batch exists and is analyzed in depth (NPS, themes, pilot-intent breakdown), but the verified count (28-30) falls short of the stated "35+" -- record as Partial, not Verified, until a Batch 2 or additional source closes the gap |
| Client scoping calls | 10 to 15 | 16 named organizations | `docs/readiness/CLIENT_SCOPING_CALLS_LOG_2026_07_25.md` | Verified, exceeds the stated range. Founder clarified 2026-07-25: these were idea/prototype-stage market discovery conversations (market, gaps, needs, feedback, idea validation), explicitly not sales calls. Shonali Group's 3 sister brands and Atsfy Group's 9 portfolio startups are each counted as one relationship, not one call per brand/startup -- see the log's counting convention. No per-call finding/date supplied yet |
| Stakeholder validation calls | 15+ | 24 named individuals/teams | `docs/readiness/STAKEHOLDER_IDEA_VALIDATION_CALLS_LOG_2026_07_25.md` | Verified, exceeds the stated threshold. Deduplicated against the pitch log (Moloy Bora) and the client scoping log (Nilam Medhi, Bandana Devi) per founder instruction 2026-07-25 -- see the log's "Deduplication Against Other Logs" section. Founder's own "and many others" addendum is recorded but not counted numerically |
| Tenant walkthroughs | Multiple | Partial | `docs/readiness/TENANT_0_ONBOARDING_ATTEMPTS_2026_07_24.md`, `docs/readiness/POST_SPRINT_41_MANUAL_ORCHESTRATION_QA_TENANT_0_2026_07_24.md` | Partially evidenced |
| QA reports | Multiple | Partial | `docs/qa-artifacts/`, `docs/readiness/` | Needs full index |

## Themes Extracted

| Theme | Evidence sources | Product implication | Resulting work |
|---|---|---|---|
| Auth/onboarding friction | Tenant 0 walkthrough logs | Fix signup, onboarding, provisioning, profile, and route clarity | Sprint 1 correction, Tenant 0 readiness docs |
| Demo/live ambiguity | Public entry and investor preview findings | Separate investor demo from beta workspace; isolate demo data | Demo/live prompts, P0 route split, demo domain decision |
| Dummy data risk in beta | QA/readiness findings | Live tenants need honest empty/restricted states | Sprint 4/5 demo fallback audits |
| Tenant isolation trust | Readiness program and RLS docs | Tenant/RBAC/RLS must be proven before Enterprise Beta 1.0 | Sprint 3 prompt and closeout path |
| Enterprise workflow clarity | Beta feedback and walkthroughs | Golden path must be executable, not merely displayed | Sprint 2-5 readiness program |
| Mobile readiness | Store credential blocker | Company-owned release path required | D-U-N-S dependency doc |
| Integration expectations | Beta feedback and module walkthroughs | Gmail/Microsoft/Calendar states must be truthful | Sprint 4 integration readiness |
| Security/compliance expectations | Enterprise feedback and readiness reviews | Audit, RLS, evidence, and claims discipline required | DevSecOps/readiness docs |
| Pricing/commercial pilot fit | Beta feedback | Pilot readiness must be evidence-backed | Pilot readiness docs and QA3 gates |

## Conversion Table

| Source ID | Source type | Finding | Decision | Sprint / PR / commit / doc | Verification | Status |
|---|---|---|---|---|---|---|
| T0-2026-07-24 | Live walkthrough | Tenant 0 provisioned but not fully onboarded | Define 100% Tenant 0 onboarding criteria | `docs/readiness/POST_SPRINT_41_MANUAL_ORCHESTRATION_QA_TENANT_0_2026_07_24.md` | HITL walkthrough | Partial |
| PUB-ENTRY-2026-07-24 | Live walkthrough | Public beta/investor route dead-ended in stale auth | Split investor demo and beta workspace routes | P0 public entry prompt/docs | Pending live retest | Open |
| MOBILE-DUNS-2026-07-24 | External credential dependency | App store release blocked by company credentials/D-U-N-S | Avoid founder-name release shortcut | `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md` | D&B reference documented | Blocked external |
| QA3-PROGRAM | QA readiness review | Need evidence-gated readiness closure | Create five-sprint QA3 readiness program | `docs/readiness/CODEX_RECOMMENDATION_QA3_READINESS_PROGRAM.md` | Sprint docs/checklists | Active |
| PITCH-LOG-2026-07-25 | Investor/pitch/incubator calls (22 named) | Strong qualitative reception; 2 non-"impressed" signals (SINE IIT Bombay deferral, 3one4 Capital pass); 3 accelerator offers declined to preserve runway | Continue capital-efficient path; keep pursuing SIIC IIT Kanpur and NASSCOM CoE Gurugram, which do not carry the same cost/dilution trade-off | `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` | Founder-reported log, not independently verified per-call | Active |
| BETA-BATCH1-2026-07-23 | Beta survey batch (28 deduplicated / 30 raw) | 82.1 combined NPS; architecture validated, execution-maturity gap (reliability, clarity) is the principal blocker to conversion | Prioritize dependability and legibility of existing features over new surface area | `Enterprise beta feedback - Batch 1 (30 responses)/Enterprise_Beta_Feedback_Batch_1.md` | Structured NPS/PMF survey instrument, PII-masked | Verified (batch), Partial (against the stated "35+" claim) |
| SCOPING-LOG-2026-07-25 | Client scoping calls (16 named organizations, Mar-Jul 2026) -- idea/prototype-stage market discovery (market, gaps, needs, feedback, idea validation), explicitly not sales calls per founder clarification 2026-07-25 | Cross-sector market-discovery spread: FMCG (Shonali Foods & Feeds), pharma/entertainment/construction (Shonali Group), jewellery retail (Manik Chand Nand Kishore), healthcare education (Arya Nursing College), two venture studios (Atsfy Group's 9 startups, Rising India Venture Studio), consulting/advisory (Royal Prix, Tradeforte, Finsetu), legal (Sakura Law Chambers), IT services and NGO (Mavani), food/agri (Bonphul Foods, Alp Harvest), and others (AbhiBar, Crevoo) | Not yet converted to a specific product decision in this ledger -- no per-call finding or theme was supplied by the founder for these 16 conversations | `docs/readiness/CLIENT_SCOPING_CALLS_LOG_2026_07_25.md` | Founder-reported names only, no finding captured | Open -- names verified, findings/themes not yet available |
| STAKEHOLDER-LOG-2026-07-25 | Stakeholder idea-validation calls (24 named individuals/teams after dedupe, per founder 2026-07-25) | Cross-sector validation spread: civil administration (Hemanta Choudhury, Pankaj Phukan), political (Tapan Das), finance/microfinance/institutional banking (Rukunuddin Ahmed, Mantu Nath Sarma, Shashankajyoti Brahma of HDFC Bank Treasury Advisory Group, Abhijit Konwar of State Bank of India New York, Prasujya Saikia of State Bank of India), ecosystem enablement (Kankan Jyoti Kharghoria, Jyoti P Bora, iCreate Ahmedabad's Idea Catalyst team), NGO leadership (Surjya Kumar Bordoloi, Amiya Kumar Sharma), social advocacy (Anamika Phukan), NLP/deep-tech founder perspective (Badal Nyalang), large-enterprise ideation (Pranta Protim Sinha of Numaligarh Refinery Limited, Ananya Singhal), government/ex-founder perspective (Prajnyan Goswami, Chinmoyee Saikia), healthcare/education perspective (Parinita Hazarika, Adela Khriyem, Sangeeta Paul), and agriculture/public-distribution policy perspective (Utpal Kumar Sarmah) | Not yet converted to a specific product decision in this ledger -- no per-call finding or theme was supplied by the founder for these 24 conversations | `docs/readiness/STAKEHOLDER_IDEA_VALIDATION_CALLS_LOG_2026_07_25.md` | Founder-reported names only, no finding captured; deduplicated against the pitch and scoping logs | Open -- names verified, findings/themes not yet available |

