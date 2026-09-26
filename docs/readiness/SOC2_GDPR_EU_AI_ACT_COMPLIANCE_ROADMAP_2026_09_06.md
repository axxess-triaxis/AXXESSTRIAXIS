# SOC 2, GDPR & EU AI Act Compliance Roadmap

Date created: 2026-09-06
Founder-stated: "build aggressively on SOC 2 compliance, EU AI Act compliance, GDPR compliance"
Related: `docs/readiness/GOVERNANCE_MEMORY_LOCALIZATION_ROADMAP_2026_09_06.md` (the policy-engine and
immutable-audit work below draws directly on that document's Phase A/B, not a separate build)

## Honest Framing Before Anything Else

**This is not a pure engineering task, and no amount of code alone completes it.** Each of these
three frameworks has a real technical-control component (where this repo's existing and planned
work genuinely helps) and a real process/legal/audit component that this program cannot build its
way past:

- **SOC 2** is a certification issued after a paid third-party audit (Type I: a point-in-time
  control review; Type II: controls observed operating over a period, typically 3-12 months).
  Engineering work makes the controls *auditable*; it does not itself produce a SOC 2 report.
- **GDPR** compliance is a legal/operational obligation (lawful basis for processing, a Data
  Processing Agreement template for customers, a designated contact for data-subject requests,
  breach-notification procedures) as much as a technical one. A named legal reviewer should sign
  off on the actual policy documents this roadmap produces -- this document drafts the
  engineering-side scaffolding, not legal advice.
- **EU AI Act** obligations depend on how AXXESS's AI features are classified under the Act's
  risk tiers (minimal, limited, high-risk, prohibited) -- this classification question should be
  answered explicitly, with reasoning written down, before assuming which obligations apply.
  Treating "we use AI" as automatically meaning "we are high-risk" would overclaim the compliance
  burden; assuming the opposite without checking would underclaim real risk. Get this classified
  properly, ideally with legal input, before building specific controls against it.

**Investor context already on file** (per the founder's own YC application, cited here as
founder-stated context, not independently verified): "David Orban passed at this stage and
highlighted GCC MRR, SOC 2 readiness and data residency as key milestones." This confirms SOC 2
readiness is already a named, external-signal-validated priority, not a speculative addition.

## What Already Exists That Helps (Confirmed, Not Assumed)

| Requirement (all three frameworks touch this) | Existing evidence |
|---|---|
| Access control / least privilege | `src/security/rbac.ts`, role-based document visibility/classification in `governedRag.ts`'s `canRetrieveDocument()` |
| Tenant data isolation | Multi-tenant architecture confirmed via `TENANT_PARTITIONING_*` closeout docs and the two-tenant isolation harness runs already on file |
| Audit trail of data access and processing | `audit_logs` table, RLS-enforced, no UPDATE/DELETE policy -- see the governance roadmap's Phase A for the immutability finding |
| Human oversight of automated decisions | The Human-in-the-Loop review flag already real in `confidenceExplanation.ts` (`humanReviewRequired`), and the cross-cutting HITL rule in the governance roadmap |
| Encryption in transit | Supabase/Vercel's platform-level TLS (inherited, not something this repo implements itself -- confirm the exact posture with those providers' own compliance documentation rather than assuming) |

## Phase E: SOC 2 Readiness (Pre-Audit)

### Checklist

| ID | Action | Acceptance Criteria |
|---|---|---|
| COMP-E1 | Pick a Trust Services Criteria scope | Confirm which of Security, Availability, Processing Integrity, Confidentiality, Privacy will be in scope for the first audit -- most first-time SaaS audits scope Security only; write down the decision and why |
| COMP-E2 | Write an Information Security Policy document | A real, dated policy document exists (access control, incident response, change management, vendor management) -- this is a document deliverable, not a code change |
| COMP-E3 | Formalize the access-review process | A recurring (e.g., quarterly) process exists and is documented for reviewing who has access to what, building on the RBAC system that already exists technically |
| COMP-E4 | Vendor/sub-processor inventory | A written list of every third-party processor handling customer data (Supabase, Vercel, OpenRouter/model providers, PostHog, Mixpanel, Sentry, etc.) with what data each touches |
| COMP-E5 | Incident response plan | A written, specific procedure for a security incident, distinct from general engineering on-call practice |
| COMP-E6 | Engage a SOC 2 auditor once the above exists | This step cannot be done by this program alone -- it requires a paid third-party auditor; do not claim "SOC 2 compliant" or "SOC 2 in progress" externally until an auditor is actually engaged |

## Phase F: GDPR

### Checklist

| ID | Action | Acceptance Criteria |
|---|---|---|
| COMP-F1 | Confirm whether GDPR actually applies today | AXXESS's stated primary markets are India, GCC, and the Global South (per the YC application on file) -- confirm whether any current or pipeline customer/data subject is EU-based before treating this as an active-market compliance requirement versus a forward-looking one for EU expansion |
| COMP-F2 | Data-subject rights: access, deletion, portability | Confirm technical support for a user's own data export and account/data deletion request -- cross-reference `docs/readiness` for any existing account-deletion work (`/settings/account/delete` route referenced elsewhere this session) rather than assuming it needs to be built new |
| COMP-F3 | Data Processing Agreement (DPA) template | A real, legally-reviewed DPA template exists to offer enterprise customers who require one -- a document deliverable, needs legal review, not just engineering |
| COMP-F4 | Data residency confirmation | Document where customer data actually lives (Supabase project region(s)) and whether that satisfies any EU customer's residency requirement -- this is a factual lookup against the actual Supabase project configuration, not an assumption |
| COMP-F5 | Breach notification procedure | A written procedure and named responsible party for the 72-hour GDPR breach-notification requirement, distinct from the general incident-response plan in COMP-E5 (may share content, but GDPR's specific timeline requirement should be named explicitly) |

## Phase G: EU AI Act

### Checklist

| ID | Action | Acceptance Criteria |
|---|---|---|
| COMP-G1 | Classify AXXESS's AI features under the Act's risk tiers | A written classification (minimal/limited/high-risk), with reasoning, exists before any control is built against a specific tier's obligations -- do this with legal input if the classification is ambiguous, rather than guessing |
| COMP-G2 | Transparency obligations | If any AXXESS feature falls under limited-risk transparency rules (e.g., users must know they're interacting with AI), confirm the product already discloses this -- check existing UI copy for AI-generated answers rather than assuming a gap exists |
| COMP-G3 | If high-risk: technical documentation and risk-management system | Only build this if COMP-G1's classification actually lands in high-risk -- this is a substantial, specific documentation and testing regime the Act defines; do not build it speculatively before the classification is settled |
| COMP-G4 | Human oversight requirement | The Act's human-oversight requirement for higher-risk AI systems is already substantially supported by the existing and planned HITL work (governance roadmap's cross-cutting rule) -- cross-reference rather than duplicate |

## Sequencing

1. **COMP-G1 first** (classification) -- it determines how much of Phase G actually applies, and
   costs nothing but a documented decision.
2. **COMP-F1 next** (does GDPR apply today) -- same reasoning, cheap to answer, changes how urgent
   the rest of Phase F is.
3. **SOC 2 (Phase E) runs in parallel**, since it's independently valuable (investor-validated
   priority) regardless of the EU-specific answers above, and its technical prerequisites overlap
   heavily with the governance roadmap already in motion.
4. Do not engage a paid SOC 2 auditor (COMP-E6) until COMP-E2-E5's documentation actually exists --
   engaging early against undocumented controls wastes the audit engagement.

## What This Document Does Not Do

It does not claim any current compliance status with any of these three frameworks. It does not
replace legal review of the actual policy documents it calls for. It should not be cited externally
(pitch decks, incubator applications) as "SOC 2 compliant," "GDPR compliant," or "EU AI Act
compliant" -- at most, "pursuing SOC 2 readiness" or "compliance roadmap in progress," and only once
real, checkable progress exists against the checklists above.
