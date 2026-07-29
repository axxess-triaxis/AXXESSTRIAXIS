# LOIs, Beta Interest, Pilot Interest, Referral Arrangements and Strategic Partnerships Log

Tracking log for Letters of Intent, beta/pilot interest expressions, referral arrangements, and
signed strategic partnership / engagement letters involving Triaxis Ventures Private Limited.
Each entry is sourced directly from the attached document itself -- no terms are inferred or
assumed beyond what the document states. Fields with no source evidence are marked **Not stated
in source document**, not guessed.

This log's scope is broader than, and supersedes going forward, the earlier
`docs/LOIS_ENGAGEMENT_LETTERS_AND_STRATEGIC_PARTNERSHIPS.md` (Sakura Law Chambers only). That
file is retained unchanged as the detailed source record for Sakura's full clause-by-clause terms;
entry 1 below is a summary cross-reference to it, not a re-derivation.

**Pilot program objective (Founder-stated 2026-07-29, source artifact needed):** this pilot
segment (MSMEs, NGOs, startups, consultancies) is deliberately not enterprise/startup-terminology-
versed -- which is precisely what makes them a good source of uninvested, neutral feedback, rather
than a weakness to route around. Because of this, their LOIs will not read like formal enterprise
T&Cs, and that is expected, not a gap to chase. The pilot program's actual goal is **iteration,
remediation, and validation before paid launch** -- tracking and reporting on this program should
be measured against that objective, not against enterprise-style contractual completeness.
Provisioning a pilot tenant alone is not a success outcome; it only matters if it produces real
usage and real feedback.

**Standard pilot success criteria (Founder-stated 2026-07-29, source artifact needed):** tenant
provisioned; tenant declares the full workflow experienced (via a survey form); tenant completes a
Pilot Experience Survey, expected approximately 7-14 days after pilot start. This is the founder's
stated intent for how a pilot's success will be evaluated -- not yet backed by a built survey
instrument, a signed pilot agreement, or any completed pilot, so it is tagged founder-stated rather
than treated as verified. Applied below to entries where a pilot has not yet started.

## Summary Table

| # | Organization | Type | Sector | Proprietor | Status | Source File |
|---|---|---|---|---|---|---|
| 1 | Sakura Law Chambers | Signed engagement letter (referral/strategic collaboration) | -- | Shradhanjali Sarma | Signed, active | `Sakura signed engagement letter_signed.pdf` |
| 2 | Imprints Production -- Pilot 1 | LOI / beta interest email | Startup | Mr. Prajnyan Ballav Goswami | **Onboarded (founder-confirmed); $20-30 advance offered orally, not yet collected pending IDFC First Bank current account** | `LOI 1 Imprints Production.pdf` |
| 3 | Ekora Hive -- Pilot 2 | LOI / beta interest email | Startup | Mrs. Diksha Rajkhowa | **Onboarded (live-verified); $20-30 advance offered orally, not yet collected pending IDFC First Bank current account** | `LOI 2 Ekora.pdf` |
| 4 | Mahanta & Sons Filling Station | LOI / beta interest letter | -- | Pollob Mahanta | LOI received | `LOI 3 - 3 customers (...).pdf` |
| 5 | Trimurti Blocks & Pavers | LOI / beta interest letter | -- | Pollob Mahanta | LOI received | `LOI 3 - 3 customers (...).pdf` |
| 6 | P. D. Wine Shop | LOI / beta interest letter | -- | Pollob Mahanta | LOI received | `LOI 3 - 3 customers (...).pdf` |

---

## 1. Sakura Law Chambers

**Contact:** Shradhanjali Sarma, Partner, Startup & Corporate Advisory
**Location:** Not stated in source document (full detail in the dedicated file below)
**Status:** Signed engagement letter, active (letter dated 19.06.2026, digitally signed by
Sudipta Koushik Sarmah 24-06-2026, 09:17 am)
**Beta access requested:** Not applicable -- this is a professional-services referral/managed-
delivery framework agreement, not a product beta-access request
**Commercial intent:** Yes, signed and active -- commercial terms agreed case-by-case per
engagement, per the letter's Section 2 (Referral Model direct invoicing, or Managed Delivery
Model with up to a 15% administrative/coordination margin)
**Scope:** Non-exclusive collaboration to refer, introduce, and manage professional services
between the two firms (legal/regulatory/corporate advisory from Sakura; fundraising/investor-
readiness/pitch-deck advisory from Triaxis) -- not a product pilot
**Pilot start date:** Not applicable (services framework, not a product pilot)
**Tenant provisioned:** Not applicable
**Users invited:** Not applicable
**Primary workflows:** Not applicable
**Success criteria:** Not applicable
**Next meeting:** Not stated in source document

**Full clause-by-clause detail (parties, commercial terms, termination, relationship structure):**
see `docs/LOIS_ENGAGEMENT_LETTERS_AND_STRATEGIC_PARTNERSHIPS.md`, Section 1.

---

## 2. Imprints Production -- Pilot 1

**Contact:** Mr. Prajnyan Ballav Goswami, Proprietor (LOI itself signed "Prajnyan Goswami"; full
name per founder, 2026-07-29)
**Location:** Jorhat, Assam
**Status:** **Onboarding complete (2026-07-29, founder-confirmed).** Pilot 1, the first pilot
tenant to attempt real provisioning. LOI received (email dated Wed, Jul 29, 2026, 9:37 AM, from
imprintsprod@gmail.com to sudipta1213@gmail.com; subject "Expression of interest : AXXESS by
TRIAXIS")
**Beta access requested:** Yes -- explicitly requests to "register on your platform for beta
access" ahead of commercial launch
**Commercial intent:** Yes, post-launch, subject to pricing/terms -- the letter states they are
"highly interested in implementing AXXESS across our group of companies as soon as it officially
launches commercially" and are "happy to discuss the pricing, terms, and conditions once it is
fully market-ready". **Founder-stated, source artifact needed (2026-07-29, oral commitment, not a
signed document):** offered a $20-30 advance payment for AXXESS TRIaxis. Not yet collected --
Triaxis Ventures' current/business account is still in processing with IDFC First Bank, and the
founder is deliberately not accepting the advance into a founder/co-founder personal account, to
avoid a compliance mistake. No advance has actually been received; this is an oral commitment
only, not a payment or a written agreement.
**Scope:** Group of companies (exact number/names of entities not stated in source document)
**Pilot start date:** 2026-07-29 (onboarding attempt observed same day)
**Tenant provisioned:** **Yes -- Founder-stated, source artifact needed.** The onboarding wizard
initially failed at "Complete provisioning" with "Organization name is required." despite the
organization name being visibly filled in (see
`docs/readiness/PILOT1_IMPRINTS_ONBOARDING_INCIDENT_2026_07_29.md` for the investigation -- root
cause remains unconfirmed). Founder subsequently confirmed Imprints "successfully onboarded."
**Independent verification attempted, not completed**: tried to confirm directly against
Supabase's `organizations` table using the production service-role key, but
`SUPABASE_SERVICE_ROLE_KEY` is stored in Vercel as a write-only "Sensitive" variable and could not
be retrieved via CLI even by this session, which otherwise has production access -- an intentional
Vercel security control, not something to work around. Status recorded as founder-confirmed rather
than independently database-verified. **2026-07-29, later same day -- partial independent
confirmation:** a screenshot of Supabase Dashboard -> Authentication -> Users shows a real
`auth.users` row -- display name "Imprints", email imprintsprod@gmail.com, UID
`9adcaff6-74bb-48c7-8ade-43862ecac30a` -- see `docs/readiness/PRODUCTION_TENANT_ROSTER_2026_07_29.md`.
This confirms the Auth user exists but not independently the matching `organizations` row, since
that table isn't visible in this screenshot; kept as founder-confirmed rather than fully
database-verified for the tenant record itself.
**Users invited:** Not confirmed
**Primary workflows:** Not stated in source document
**Success criteria:** Founder-stated, source artifact needed -- tenant provisioned; tenant
declares full workflow experienced (via survey form); tenant completes Pilot Experience Survey,
expected ~7-14 days after pilot start (standard definition, see note above; not yet applicable
here since no pilot has started)
**Next meeting:** Not stated in source document

---

## 3. Ekora Hive -- Pilot 2

**Contact:** Mrs. Diksha Rajkhowa, Proprietor
**Location:** Not stated in source document
**Status:** **Onboarding complete (2026-07-29, live)** -- Pilot 2, the first pilot tenant to
successfully reach a live, provisioned workspace. LOI received (email dated Wed, Jul 29, 2026,
9:40 AM, from ekora.hive@gmail.com to sudipta1213@gmail.com; subject "Interest in Beta
Registration & Future Implementation of AXXESS")
**Beta access requested:** Yes -- explicitly requests beta access "ahead of your commercial
rollout" to "evaluate your workflows and services in advance"
**Commercial intent:** Yes, post-launch, subject to pricing/terms -- the letter states they are
"writing to formally express our intent to deploy AXXESS across our group once it is officially
launched for commercial use" and are "perfectly comfortable deferring the finalization of pricing,
licensing terms, and commercial conditions until the product is fully market-ready". **Founder-
stated, source artifact needed (2026-07-29, oral commitment, not a signed document):** offered a
$20-30 advance payment for AXXESS TRIaxis. Not yet collected -- Triaxis Ventures' current/business
account is still in processing with IDFC First Bank, and the founder is deliberately not accepting
the advance into a founder/co-founder personal account, to avoid a compliance mistake. No advance
has actually been received; this is an oral commitment only, not a payment or a written agreement.
**Scope:** Group ("across our group" -- exact number/names of entities not stated in source
document)
**Pilot start date:** 2026-07-29
**Tenant provisioned:** **Yes** -- confirmed via live screenshot: signed in as `ekora.hive`,
role Super Admin, at `landing.triaxisventures.com/tasks`, with real seeded sample data (project
"District Outreach Program", 2 sample tasks: "Confirm district coordinator contacts" (High),
"Draft weekly outreach summary" (Medium)) -- consistent with the onboarding wizard's real,
non-decorative sample-data seeding for the "Workflow & task execution" starting-focus goal.
**Also useful as corroborating evidence for A-71 (Pilot 1/Imprints Production's onboarding
block)**: a second real pilot signup completed the identical onboarding flow the same day without
hitting the "Organization name is required" error, supporting (not proving) the device/browser-
specific hypothesis over a systemic defect.
**Users invited:** Not confirmed -- only the Super Admin account seen so far
**Primary workflows:** Tasks & Workflow (confirmed live: "2 active tasks across 1 projects")
**Success criteria:** Founder-stated, source artifact needed -- tenant provisioned; tenant
declares full workflow experienced (via survey form); tenant completes Pilot Experience Survey,
expected ~7-14 days after pilot start (standard definition, see note above; not yet applicable
here since no pilot has started)
**Next meeting:** Not stated in source document

---

## 4-6. Mahanta & Sons Filling Station / Trimurti Blocks & Pavers / P. D. Wine Shop

One shared LOI letter names all three as a single proprietor's group of firms/companies. Logged
as three separate customer entries per the founder's instruction, since each is a distinct
business the founder intends to onboard independently, while noting they share one signatory,
one contact point, and one location.

**Contact (shared across all 3):** Pollob Mahanta, Proprietor. Cell: 94350 38833 / 99574 71233.
Email: pollobmahanta@gmail.com
**Location (shared across all 3):** Office Address: Rangoli Pother, P.O. -- Rangoli Pother,
Naharkatia, District -- Dibrugarh (Assam), Pin-786610
**Status:** LOI received (letter dated 28/07/2026, addressed "Dear Triaxis Ventures team"; letterhead
is "M/s Mahanta & Son's Filling Station," an authorized Nayara Energy franchisee)
**Beta access requested:** Yes -- explicitly states "We are also looking to register on your
platform and take a beta look at its services and workflow"
**Commercial intent:** Yes, post-launch, subject to pricing/terms -- the letter states "We feel
that the product is suitable for our group; and we want to implement it in our group of companies
as soon [as] you launch commercially" and "We can decide final pricing, terms and conditions once
your product is market ready"
**Scope:** Explicitly named group of 3: (1) Mahanta & Sons Filling Station, (2) Trimurti Blocks &
Pavers, (3) P. D. Wine Shop
**Pilot start date:** Not stated in source document
**Tenant provisioned:** No
**Users invited:** No
**Primary workflows:** Not stated in source document
**Success criteria:** Founder-stated, source artifact needed -- tenant provisioned; tenant
declares full workflow experienced (via survey form); tenant completes Pilot Experience Survey,
expected ~7-14 days after pilot start (standard definition, see note above; not yet applicable
here since no pilot has started)
**Next meeting:** Not stated in source document

---

## Pending / Expected (Not Yet Received)

Per founder's note (2026-07-28): 3-4 additional LOI documents expected from other proprietors/
founders, covering 7-8 prospective customers, over the following 3-4 days. **3 of those LOI
documents received so far** (Imprints Production, Ekora Hive, and the Mahanta group letter),
together covering **5 of the expected 7-8 customers** (1 + 1 + 3). **Add each further LOI as a
new numbered entry above**, sourced directly from its own document, once received.
