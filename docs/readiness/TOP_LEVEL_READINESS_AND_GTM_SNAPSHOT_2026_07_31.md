# AXXESS TRIaxis -- Top-Level Readiness and GTM Snapshot

**Date:** 2026-07-31  
**Workspace:** `C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`  
**Purpose:** one top-level readiness view across product, web beta, AI, RAG, document indexing, integrations, mobile, GTM, funding, and payments.  
**Evidence rule:** product/code readiness must trace to repo evidence, tests, deployments, or live HITL walkthroughs. Commercial traction items are marked **Founder-stated** until the signed LOIs, referral agreement, pilot notes, payment-interest notes, and incoming-pipeline records are linked as source artifacts in the repo.

## Executive Summary

AXXESS has moved from product validation into pilot conversion.

Founder-stated current traction:

- **5 signed LOIs**
- **4 oral paying-interest indications**
- **2 incoming LOIs**
- **2 ongoing pilots**, already provisioned as tenants
- **3 incoming pilots**
- **1 referral agreement**
- **9/10 enterprise beta survey respondents** indicated pilot interest
- **21/24 product survey respondents** showed strong attachment / top recommendation signal

The product itself is now a strong web enterprise beta. Single tenancy is closed. Five tenants have been provisioned. No data leakage is currently observed, and demo/live separation is in place. Knowledge Hub upload and indexing behavior is substantially proven. HITL AI review is fully live-tested and working. The major remaining proof points are paid conversion, RAG result-quality cleanup, invite/email delivery root cause, session-security deployment proof, mobile store release, live payments, and advanced integration testing.

## Update, 2026-08-05: The GTM Is Now Two Motions, Not One -- Source Signal and Product Logic

This document's GTM Readiness row and Suggested External Wording (below) were written 2026-07-31, before the product split described here existed. They described a single GTM motion for a single product. That is no longer accurate, and this update integrates the new product logic and its market rationale rather than silently leaving the rest of the document to imply one undifferentiated GTM.

**Source signal.** Pilot User 1 (Prajnyan Ballav Goswami, Proprietor, Imprints Production -- the first real pilot customer in this program to give substantive, hands-on product feedback) reported, verbatim, in `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entry 2: *"Your current web version is not currently suitable for small customers, though big clients might like it being so comprehensive."* He assessed the product as feeling like something "a Fortune 500 CEO might be very happy to use personally... Not something an MSME owner needs in India," and gave an explicit, numeric recommendation -- *"you need to simplify this 70-80% before launch"* for the Indian MSME/NGO/startup/contractor segment specifically. He separately confirmed the mobile-first direction is correct and named Xiaomi/Vivo device compatibility as a bar for that market. This is the same evidence already driving the engineering-side X Lite build (`docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md`, `AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md`) -- this update is the GTM-side integration of that same signal, not a separate finding.

**Product logic -> GTM logic.** AXXESS no longer has one product trying to serve one market. It has three product surfaces mapped to three distinct market motions, per the doctrine's Section 3:

| Market motion | Product surface(s) | Buyer | GTM implication |
|---|---|---|---|
| GCC enterprise / public-sector motion | X0 Web + X0 Mobile | Large organizations, government/public-sector-style buyers, enterprise procurement cycles | Long sales cycle, founder-led/relationship-led selling, the existing pitch/pilot/accelerator pipeline (`PITCH_AND_TRACTION_LOG_2026_07_24.md`) is this motion's evidence base. This is the motion this document's existing GTM Readiness band (80-86%) and Commercial Traction Kanban describe -- **that band still describes only this motion, not the whole company's GTM going forward.** |
| India self-serve motion | X Lite Web + X Lite Mobile | MSMEs, NGOs, startups, contractors, local businesses -- Pilot User 1's own segment, and the segment Pilot 2 (Ekora Hive) and the 3-firm Mahanta group already represent as real, named relationships | Self-serve signup, plain-language product, low/no-touch sales -- a fundamentally different motion from the enterprise pipeline above. Product side exists (XL-0 through XL-2, live at `triaxis-product-lite-web`); **GTM side for this motion is not yet built** -- no self-serve pricing page, no dedicated marketing channel, no funnel distinct from the general Founders Club waitlist (see gap below). |
| Investor/sales motion | Investor Demo | Investors, accelerator/incubator evaluators, partner walkthroughs | Unchanged by this update -- `investor.triaxisventures.com`, isolated dummy data, never a live tenant of either product motion above. |

**What this means for reading the rest of this document.** Every readiness row and Kanban below this point was written against the single-motion (enterprise/GCC) GTM. They remain accurate *for that motion* -- 5 signed LOIs, 2 active pilots, the accelerator/incubation pipeline, etc. are all real evidence for the enterprise motion specifically. **None of it should be read as GTM evidence for the India self-serve motion**, which has its own, much earlier-stage status: a product exists (nav-contract-enforced, honest placeholders behind most features), a live domain exists, but no self-serve pricing, no dedicated acquisition channel, and no signed or trial self-serve customer exists yet. Treating the enterprise motion's traction numbers as if they also validate the self-serve motion would be exactly the kind of inflation this program's evidence discipline exists to prevent.

**Explicit GTM gap, not filled in here:** the roadmap's own Section 5 pricing cohort table (first 300 self-serve signups get 1 year free, then graduated discounting) and the Rs. 5,000/year figure discussed directly with Pilot User 1 (`PITCH_AND_TRACTION_LOG_2026_07_24.md` entry 29 context, `LOIS_...` entry 2) describe intent, not a built or launched self-serve GTM funnel. `docs/readiness/CUSTOMER_ACQUISITION_FUNNEL_2026_07_24.md` remains the design doc for the general acquisition funnel (Website -> Demo -> Beta Sign Up) and the Founders Club waitlist -- neither currently distinguishes an X0-bound visitor from an X Lite-bound one. Building that distinction (separate landing messaging, separate signup path, separate pricing display per motion) is the concrete next GTM-side actionable this update surfaces, not something this document builds itself.

## Update, 2026-08-13: Revised LOI/pilot counts, waitlist and beta-survey figures (enterprise/GCC motion)

This document's Executive Summary and Market Readiness row (both dated 2026-07-31, below and unchanged in place) described **5 signed LOIs, 4 oral paying-interest indications, 2 incoming LOIs, 2 ongoing pilots, 3 incoming pilots, 1 referral agreement**. Founder-stated figures given this session (2026-08-13) are **6 signed LOIs, 1 committed LOI, 2 pilots ongoing, 3 upcoming**. Checked directly against the current `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` Summary Table (7 entries) rather than accepted at face value:

| Founder figure | Reconciles to |
|---|---|
| 6 signed LOIs | Sakura Law Chambers (signed engagement letter, entry 1), Imprints Production (signed LOI, entry 2), Ekora Hive (signed LOI, entry 3), Mahanta & Sons Filling Station / Trimurti Blocks & Pavers / P. D. Wine Shop (signed LOI letters, entries 4-6, all three under Pollob Mahanta). The prior "2 incoming LOIs" (07-31) are now both received -- this is where that delta went. |
| 1 committed LOI | Elevate Group FZE / Elevate Wealth X (entry 7, Satabdi Parashar) -- an expression-of-interest email, not yet a signed LOI document, hence "committed" rather than "signed." |
| 2 pilots ongoing | Imprints Production and Ekora Hive -- both already onboarded/provisioned tenants (entries 2-3). Unchanged from the 07-31 figure. |
| 3 upcoming | The three Mahanta-group firms (entries 4-6) -- LOI received, pilot not yet started for any of the three as distinct engagements. Unchanged from the 07-31 "3 incoming pilots" figure. |

This reconciliation is clean -- every founder-stated figure maps to a specific, already-logged entry, with no unexplained gap in either direction. The "4 oral paying-interest indications" and "1 referral agreement" lines from the 07-31 baseline are not restated here because they were not part of this session's founder-stated figures, not because they are believed stale; they remain as last recorded.

**Additional figures given this session, checked against existing repo evidence rather than logged as new:**

- **"30+ beta waitlist"** (founder-stated, 2026-08-13, no new artifact this session) -- the last independently verified figure is **27 total signups, 80 page views, 33.8% conversion, screenshot-verified as of EOD 2026-08-05** (this document's own GTM Readiness (India self-serve motion) row, and `CUSTOMER_ACQUISITION_FUNNEL_2026_07_24.md`). "30+" is plausible organic growth in the 8 days since, but is **founder-stated, source artifact needed** -- not re-verified via a fresh screenshot or admin-panel check this session.
- **"9 pilot interest from beta survey"** -- this one is already repo-verified, not merely founder-stated: `ENTERPRISE_BETA_FEEDBACK_SECTOR_PILOT_MAPPING_2026_07_28.md` documents "9 of 10 raw responses gave immediate, near-term or conditional pilot interest" at response-level detail. Matches exactly; no correction needed.
- **"2 pilot testimonials"** driving product iteration -- Imprints Production and Ekora Hive (`LOIS_...LOG.md` entries 2-3) are the program's only two onboarded pilots and the only two with logged feedback/testimonial content in that log. The founder's framing that iteration has followed from these two specifically is consistent with what's on record there (e.g. Pilot User 1's "simplify this 70-80%" feedback already cited above as the direct source signal for the X Lite build); this update does not additionally verify a fix-by-fix trace from testimonial to shipped change beyond what is already cross-referenced in this document's 2026-08-05 update above.

**Founder's own framing, recorded as his characterization, not re-derived here:** "That's significant interest for a 4 month old startup making Enterprise SaaS." The repo's own Q-002 (`docs/audit/FOUNDER_QUESTIONS.md`) confirms this program is 39-43 days old as of that check, not 4 months -- flagged here as a discrepancy in elapsed time, not corrected on the founder's behalf, since which duration framing (calendar time since incorporation/ideation vs. the audit's own measured repo age) he intends is not something this document can resolve without asking.

## Readiness Board

| Track | Current Readiness | Status | Evidence Basis | Main Blocker |
|---|---:|---|---|---|
| Product Readiness | **84-90%** | Strong beta product, near Enterprise Beta 1.0 but not closed | Core tenant workflows, 5 live/provisioned tenants, single tenancy closed, demo/live separation, Knowledge Hub upload/index/delete/non-index option, indexed docs pulled by RAG, HITL AI review live-tested, dashboard, audit, agentic infra, integrations framework, mobile shell, QA docs | Clean final live regression, invite/email closure, payment flows, mobile store release, advanced integration proof |
| Web Enterprise Beta 1.0 | **86-91%** | Near release-beta, final proof pending | Auth/onboarding live, Google OAuth live, SMS auth live, live tenants, RAG/HITL workflows, dashboard, audit logs, Knowledge Hub, document indexing behavior, tests, production deployments, live core integrations | Session-security deploy proof, RAG result-quality bug closure, tenant invite proof, final founder/QA walkthrough |
| Market Readiness | **84-90%** | Strong pre-revenue / pilot-conversion traction | 5 signed LOIs, 4 oral paying-interest indications, 2 incoming LOIs, 2 ongoing provisioned pilots, 3 incoming pilots, 1 referral agreement, 9/10 enterprise pilot intent, 21/24 strong product attachment | Paid conversion, usage retention, signed commercial terms, first paid pilot proof |
| GTM Readiness (GCC enterprise motion) | **80-86%** | Active pilot-conversion stage | Clear ICP direction, signed LOIs, active pilots, incoming pilots, incoming LOIs, referral agreement, accelerator/incubation pipeline, strong beta survey signal | Repeatable sales process, pricing packaging, paid pilot close, CRM/pipeline operating cadence |
| GTM Readiness (India self-serve motion) | **15-25%** | Early -- product nav contract exists, GTM funnel does not | X Lite Web live at `triaxis-product-lite-web`, plain-language nav contract enforced by tests, Founders Club waitlist active (27 total signups, 80 page views, 33.8% conversion as of EOD 2026-08-05, screenshot-verified -- see `CUSTOMER_ACQUISITION_FUNNEL_2026_07_24.md`) | No self-serve pricing page, no dedicated acquisition channel distinct from the general waitlist, no signed or trial self-serve customer, payment path not wired (see "Update, 2026-08-05" above) |
| Funding Readiness | **74-82%** | Stronger, still pre-revenue | Strong build velocity, evidence docs, LOIs/pilots, NASSCOM CoE incubation offered, Founder Institute Core Dubai cohort confirmation pending, SIIC IIT Kanpur final round call pending, Plug and Play UAE / Dubai Founders HQ pending, YC and Antler applications in line | Revenue proof, repeatable usage metrics, investor data room polish, conversion from accelerator/incubation interest into confirmed acceptance/funding |
| RAG Readiness | **78-84%** | Live retrieval partly proven, result-quality bugs remain | RAG remediation sprints, citations, confidence explainability, HITL review, extraction pipeline tests; live flow now pulls indexed documents | Fix observed answer/result-quality bugs and retest real uploaded PDF/DOCX/OCR/plain-text body content |
| Document Indexing Readiness | **88-94%** | Live Knowledge Hub indexing mostly proven | Knowledge Hub uploads work, including large files; documents can be deleted; indexing works correctly; user can choose not to index; indexed documents are pulled by RAG correctly; PDF text-layer, OCR fallback, DOCX, plain text extraction code/tests exist | Final regression proof across PDF/DOCX/OCR/plain-text and separation from RAG answer-quality bugs |
| AI Readiness | **74-82%** | Strong beta AI layer, live proof still pending | Local governed RAG, HITL review, OpenRouter/Kimi/DeepSeek adapter work, OpenAI API live with $20 credits and cost mapping, full agentic infrastructure added for OpenAI and Anthropic, agentic MCP Phase 1 code | Visible end-to-end model-response proof, Anthropic live-call proof, Copilot adapter/live test, production routing evidence |
| Basic Integration Readiness | **68-76%** | Several core providers live/tested | Google Workspace, Zoom, Twilio, OpenRouter, Google OAuth live and fully tested; OAuth/token-vault framework present | Finish OpenAI/Mixpanel/PostHog/SMTP/Microsoft/Meta testing |
| Advanced Integration Readiness, 30+ connectors | **28-38%** | Catalog expanding, many not live | Wired-but-not-cleared and integrated-only providers now tracked by maturity tier | Provider-by-provider OAuth apps, scopes, webhooks, sync jobs, QA matrix |
| Payment Gateway Readiness | **18-28%** | Stripe/Paddle integrated-only, not live | Stripe and Paddle are integrated at catalogue/early infrastructure level; Razorpay remains roadmap | Checkout/subscription wiring, tax/compliance, payment QA, live test payment |
| Android Beta 1.0 | **65-72%** | Engineering path active | Capacitor path, Android CI, unsigned APK artifact evidence, signing path planned | Company Play Console, final signing/release proof |
| iOS Beta 1.0 | **32-40%** | Externally blocked | iOS build path exists, TestFlight path planned | D-U-N-S, company Apple Developer enrollment, ASC credentials, TestFlight proof |

## Commercial Traction Kanban

| Stage | Status | Evidence / Note |
|---|---|---|
| Problem discovery | Done | Prior customer discovery and stakeholder validation logs. |
| Beta feedback collection | Done | Enterprise and product feedback survey evidence. |
| Strong product attachment signal | Done | Founder-stated: 21/24 product survey respondents show strong attachment / top recommendation signal. |
| Pilot intent | Done | Founder-stated: 9/10 enterprise beta survey respondents indicated pilot interest. |
| Signed LOIs | Done | Founder-stated: 5 signed LOIs. Source artifacts should be linked. |
| Incoming LOIs | In progress | Founder-stated: 2 incoming LOIs. |
| Active pilots | In progress | Founder-stated: 2 ongoing pilots, already provisioned as tenants. |
| Incoming pilots | In progress | Founder-stated: 3 incoming pilots. |
| Referral distribution | In progress | Founder-stated: 1 referral agreement. |
| Paying interest | In progress | Founder-stated: 4 oral paying-interest indications. |
| Paid pilot conversion | Next | No closed payment recorded here yet. |
| Repeatable sales motion | Next | Needs pricing, pipeline discipline, CRM evidence, conversion rate. |
| Revenue retention proof | Not yet | Requires paid usage over time. |

## Product Readiness Kanban

| Stage | Status | Notes |
|---|---|---|
| Overall product shape | Strong beta | AXXESS is now a coherent enterprise operating product, not a static prototype. |
| Auth and onboarding | Mostly done / near complete | Sign-up, sign-in, profiles, tenant provisioning, onboarding, Google OAuth, and SMS-based authentication work fully. Entra is wired and awaiting live test. Session persistence hardening remains the final security proof item. |
| Single tenancy | Done | 100% complete per founder confirmation; real tenant provisioning and single-tenant operation are considered closed. |
| Multi-tenancy | Mostly done | 5 tenants already provisioned; no data leakage currently observed; demo and live environments are fully separated; architecture and RLS exist. Remaining work is formal regression evidence and continued non-leakage monitoring. |
| Knowledge Hub | Mostly done | Upload persistence works; large files upload; documents can be deleted; extraction/indexing pipeline is code-present; indexing can be skipped; indexed documents are pulled by RAG correctly. Remaining work is final regression proof across PDF/DOCX/OCR/plain-text and RAG result-quality cleanup. |
| RAG + citations | Mostly done / result-quality cleanup pending | Indexed documents are pulled by RAG correctly and citations/confidence/HITL mechanics exist. Remaining work is fixing observed answer/result-quality bugs and running final regression tests across real PDF/DOCX/OCR/plain-text uploads. |
| HITL AI review | Done | Fully live-tested and working; review-to-work paths are confirmed across the relevant workflow flows. RAG answer-quality cleanup remains separate from the HITL review mechanism itself. |
| Dashboard | Mostly done, **80-90%** | Major remediation complete; dashboard is substantially usable. Remaining work is final live consistency, metric accuracy, and regression pass. |
| Audit/timeline evidence | In progress | Broadly wired; needs final golden-path proof and formal regression record. |
| Email and invite loop | Partially done | Supabase Auth create-account email delivers and authorizes successfully. Tenant invitation delivery remains a separate provider-delivery/root-cause item. |
| Agentic MCP infrastructure | Code-complete / blocked | Phase 1 code and tests exist; production migration/deploy/live key test remain. |
| Payments and billing | Integrated only, not wired/live | Stripe and Paddle are integrated at early/catalogue level but not wired into live checkout, subscriptions, invoicing, tax, or paid pilot collection. Razorpay remains roadmap. |
| Mobile product | Partial | Android path is materially ahead of iOS; both remain outside full product readiness until installable/store-track builds exist. |

## Product Readiness Interpretation

Product readiness is broader than web beta readiness. It asks whether AXXESS can operate as a usable product for a real organization across the complete loop:

`onboard tenant -> add people -> add knowledge -> ask AXXESS -> review answer -> create work -> track dashboard/audit/timeline -> measure usage -> expand pilot -> convert to paid`

Current judgment: **84-90%**.

Why it is high:

- The core enterprise architecture exists.
- The web product is live and tenant-backed.
- Five tenants are provisioned.
- Single tenancy is closed.
- Multi-tenancy is mostly done, with no data leakage currently observed and demo/live fully separated.
- Knowledge Hub uploads, large-file handling, delete behavior, optional indexing, and indexed-document retrieval are working.
- HITL AI Review is fully live-tested and working.
- Dashboard is substantially usable at 80-90%.
- RAG, dashboards, audit logs, and workflow records exist.
- Google OAuth, SMS auth, Google Workspace, Zoom, Twilio, OpenRouter, and Google OAuth are live/tested.
- The repo has extensive sprint, QA, and readiness documentation.

Why it is not yet 90%+:

- Tenant invitation delivery is not fully closed, although Supabase Auth account emails deliver and authorize successfully.
- RAG retrieves indexed documents, but observed answer/result-quality bugs still need cleanup.
- Session persistence hardening needs production proof.
- Advanced integrations and live payment gateway wiring are not complete.
- Android and iOS are not store-ready.
- Paid pilot conversion is not yet documented.

## Mobile Readiness Kanban

| Track | Status | Next Action |
|---|---|---|
| Android debug/preview build | Partially proven | Keep CI artifact validation current. |
| Android signed beta | Blocked | Company Play Console + signing/release workflow proof. |
| iOS build path | Planned / partially scaffolded | Resolve D-U-N-S and company Apple Developer account. |
| TestFlight | Blocked | ASC credentials and Apple approval path. |
| Store listing packs | Planned | Needs screenshots, reviewer account, privacy labels, support URLs. |

## Integration Readiness Kanban -- 2026-08-02 comprehensive re-audit

**Founder's own draft assessment (2026-08-02): "Overall Integrations Readiness Rating: 62-68%"**, with a category breakdown (Core live integrations 80-88%, OAuth/token-vault framework 85-92%, Google ecosystem 70-82%, Microsoft ecosystem 45-58%, AI provider integrations 70-80%, Analytics 55-65%, Meta/WhatsApp/social 35-48%, Productivity SaaS connectors 40-55%, Enterprise data connectors 25-40%, Payment gateways 18-28%, 30+ connector ambition 28-38%).

**This re-audit concurs with the founder's overall band and methodology** (the "integrated means different things per provider" framing is exactly right, and matches this repo's own evidence-chain discipline). Re-checked against live `vercel env ls production` output and direct code/migration reads (not memory) this session, with one material correction:

**Correction: Twilio is not "live and fully tested."** The prior version of this Kanban listed it alongside Google Workspace/Zoom/OpenRouter/Google OAuth as such. Direct evidence against that: (1) `vercel env ls production` shows **no Twilio-related env var of any kind** in production; (2) a full `src` search finds **zero references to Twilio anywhere in the codebase**; (3) `docs/readiness/PHONE_OTP_SPRINT4_CLOSEOUT_2026_07_28.md` (2026-07-28) confirms this directly in its own words: *"Twilio is not configured anywhere -- this ships fully gated off (`NEXT_PUBLIC_AUTH_PHONE_ENABLED` unset in production)... Not verified: no live retest -- impossible before Twilio exists as a configured Supabase SMS provider."* Phone-OTP sign-in is real, tested code sitting behind a feature flag with zero live proof -- "code-ready, gated off, never tested," not "live and fully tested." Moved to its correct tier below. Given this correction, the founder's Google-ecosystem-adjacent "Core live integrations 80-88%" band should read as **Google Workspace + Zoom + OpenRouter + Google OAuth only** (Twilio removed) -- the band itself likely doesn't move much since Google/Zoom/OpenRouter/Google-OAuth evidence is genuinely strong, but the roster changes.

| Layer | Status | Providers |
|---|---|---|
| **Live and fully tested** | Real end-to-end proof exists | Zoom (authorize-request stage confirmed with correct client_id/redirect_uri/state/scopes, founder-reported "works fine," A-70), OpenRouter (production AI routing gateway, replaced the old AI Config tab per founder decision, A-31), Google OAuth sign-in (A-26/A-73, resolved, full sign-in completes end to end) |
| **Live-tested for an allowlisted account, broader-tenant ceiling still blocking** | Reaches real provider UI and completes for the founder's own account, but Google's OAuth Client is in Testing status (100-user cap) so non-allowlisted tenants are still blocked | Gmail, Google Sheets (both confirmed via `status=connected` redirect screenshots, 2026-08-02, A-70/A-77) -- Calendar/Drive/Docs/Slides share the identical OAuth app/code path and are founder-stated (not independently re-screenshotted) to behave the same |
| **Wired, real API calls confirmed live, but with an open question** | OpenAI -- `OPENAI_API_KEY` set, real spend-guard + budget ledger built (`aiSpendGuard.ts`, `ai_provider_budget` table), and a live 429 was actually observed in production (proof of real connectivity) -- but *why* it's rate-limiting (real account quota vs. this app's own budget guard) was never diagnosed (A-81) |
| **Wired but testing not fully cleared** | Credentials present, code real, no independent live-test evidence this session | HubSpot (`HUBSPOT_CLIENT_ID` confirmed set), Mixpanel/PostHog (all 3 env vars confirmed set -- needs event receipt/dashboard confirmation), SMTP (Supabase's own mailer works; Resend relay mid-migration, MX/SPF still `Pending` as of 2026-08-02, A-74) |
| **Reaches real provider UI, blocked by an external config gap with an exact fix identified** | Microsoft Outlook/Teams (reaches real `login.microsoftonline.com`, fails `unauthorized_client` for personal accounts -- fix is Entra "Supported account types," not yet applied, A-82); WhatsApp Business (reaches real Facebook OAuth screen, fails "domain not in app's domains" -- fix is Meta App Domains config, not yet applied, A-77); Threads, Meta Business Suite (connector code shipped 2026-08-02, A-83, not yet click-tested) |
| **Code-ready, gated off, never live-tested** | Twilio / phone-OTP sign-in (see correction above) |
| **Integrated only -- catalogued, no OAuth contract, no credentials, no live path** | Jira, Trello, Asana, Salesforce, Zoho CRM, DocuSign, Razorpay (all `pilotEnabled: false` in `pluginRegistry.ts`); Slack, Calendly, Notion, Linear, GitHub, Airtable, X (Twitter) -- all have real OAuth contracts in `connectorContract.ts` but **zero credentials set in Vercel production**, confirmed via `vercel env ls` |
| **Enterprise data/billing connectors -- storage-only, no live check performed** | Auth0, ClickHouse, Microsoft SQL Server, Snowflake, Amazon S3, Paddle, Stripe (`EnterpriseConnectorCredentialsPanel` -- saving a credential only confirms it was stored encrypted, explicitly does **not** verify the external service accepted it, per that panel's own on-screen copy) |
| Connector OAuth/token-vault framework | Built and real | AES-256-GCM token vault, generic OAuth start/callback routes, audit logging -- confirmed provider-agnostic across 20 pilot-enabled providers this session (MC-1 added 2 more with zero engine changes) |
| 30+ advanced connector ambition | Early roadmap | Requires per-provider app registration, scopes, webhooks, sync logs, QA -- unchanged from prior assessment |

### Integration Maturity Register (provider-by-provider, cited)

| Provider | Tier | Exact evidence |
|---|---|---|
| Zoom | Live and fully tested (authorize stage) | A-70: real authorize URL reached, founder-confirmed "works fine"; full round-trip (consent + return) not independently confirmed |
| OpenRouter | Live and fully tested | Production AI routing gateway, `OPENROUTER_API_KEY` set 6d ago, replaced AI Config tab (A-31) |
| Google OAuth (sign-in) | Live and fully tested | A-26/A-73 resolved, full sign-in completes end to end |
| Gmail | Live for allowlisted account | `status=connected` screenshot 2026-08-02 (A-70); Google Test-users cap blocks other tenants (A-75) |
| Google Sheets | Live for allowlisted account | `status=connected` screenshot 2026-08-02 (A-77); same cap |
| Google Calendar / Drive / Docs / Slides | Founder-stated live, not independently re-verified | Same OAuth app/code as Gmail/Sheets; A-70 update: "founder-stated, not independently re-screenshotted this round" |
| OpenAI | Wired, live calls confirmed, root cause of 429 undiagnosed | `OPENAI_API_KEY` set 3d ago; real spend guard + ledger; live 429 observed (A-81); root cause not investigated |
| HubSpot | Wired, credentials present, not live-tested | `HUBSPOT_CLIENT_ID` confirmed set 4d ago via `vercel env ls`; no live-connect evidence this session |
| Mixpanel | Wired, not live-tested | `NEXT_PUBLIC_MIXPANEL_TOKEN` set 6d ago; needs event receipt/dashboard confirmation |
| PostHog | Wired, not live-tested | `NEXT_PUBLIC_POSTHOG_HOST`/`KEY`/`TOKEN` all set 6d ago; needs replay/privacy masking + event proof |
| SMTP (Resend) | Wired, mid-migration | Founder switched Supabase SMTP to Resend 2026-08-02; MX/SPF `Pending` as of last check (A-74) |
| Microsoft Outlook / Teams | Reaches real login, blocked | `unauthorized_client` for personal accounts; fix = Entra Supported account types (A-82), not applied |
| WhatsApp Business | Reaches real Meta OAuth screen, blocked | "domain not in app's domains" (A-77); fix = Meta App Domains config, not applied; also needs Meta App Review |
| Threads | Connector code shipped, not click-tested | `THREADS_APP_ID`/`SECRET` set 8h ago; MC-1 (2026-08-02) added the contract; no live OAuth attempt yet |
| Meta Business Suite | Connector + ingestion code shipped, not click-tested | `META_APP_ID`/`SECRET` set (shared with WhatsApp); MC-1/MC-4 (2026-08-02); needs Meta App Review before any tenant beyond Test Users |
| Twilio | Code-ready, gated off, never tested | See correction above -- `NEXT_PUBLIC_AUTH_PHONE_ENABLED` unset, zero Twilio env vars, zero code references |
| Slack, Calendly, Notion, Linear, GitHub, Airtable, X (Twitter) | Integrated only | Real OAuth contracts in `connectorContract.ts`, zero credentials in `vercel env ls production` |
| Jira, Trello, Asana, Salesforce, Zoho CRM, DocuSign, Razorpay | Catalogued only | `pilotEnabled: false` in `pluginRegistry.ts`, no OAuth contract, no credentials |
| Stripe, Paddle | Storage-only, unconfigured | `EnterpriseConnectorCredentialsPanel` shows both `not configured`; explicit on-screen disclaimer that saving a credential never verifies live connectivity |
| Auth0, ClickHouse, MS SQL Server, Snowflake, Amazon S3 | Storage-only, unconfigured | Same panel, same disclaimer, all shown `not configured` per 2026-08-02 screenshot |

## Funding Readiness View

| Investor Question | Current Answer |
|---|---|
| Is there a real product? | Yes. Product Readiness is 84-90%, and Web Enterprise Beta 1.0 is 86-91%. Final closure depends on a few proof items, not rebuilding the product. |
| Is there real market signal? | Yes. 5 signed LOIs, 2 active pilots, 3 incoming pilots, 2 incoming LOIs, 1 referral agreement, 4 oral paying-interest indications, and strong survey attachment. |
| Is there revenue? | Not yet documented here. |
| Is there a wedge? | Yes: governed institutional AI workflows, Knowledge Hub, RAG, HITL review, tenant governance, and agentic infrastructure. |
| Is execution velocity high? | Yes: repo metrics, sprint docs, tests, PRs, and production fixes show high velocity. |
| What is the biggest diligence risk? | Whether pilots convert to paid usage, whether RAG answer-quality bugs are closed cleanly, and whether invitation/payment/mobile proof catches up to the web product. |

## Funding and Accelerator Pipeline

| Category | Status | Notes |
|---|---|---|
| Incubation offered | Active / documentation pending | NASSCOM Centre of Excellence for AI and IoT. |
| Cohort confirmation pending | Awaiting outcome | Founder Institute Core Dubai. |
| Final round / final call pending | Awaiting outcome | SIIC IIT Kanpur final round call pending; Plug and Play UAE / Dubai Founders HQ pending. |
| Rejected as too early | Closed, useful signal | 3one4 Capital; SINE IIT Bombay. |
| Declined by AXXESS / Triaxis | Founder declined | Startup Wise Guys Founders Club; Forge AI by Levelup. |
| Grants | In line | Multiple strong applications in line. |
| Major accelerator applications | In line | YC and Antler. |

## Immediate Next Proof Points

1. Link the 5 signed LOIs, 2 incoming LOIs, 1 referral agreement, pilot notes, and 4 oral paying-interest notes into a source-controlled traction ledger.
2. Convert at least one ongoing or incoming pilot into a paid pilot.
3. Fix RAG answer/result-quality bugs and run regression across real PDF/DOCX/OCR/plain-text body text.
4. Convert the current "no data leakage observed" multi-tenant state into a formal regression record across the five provisioned tenants.
5. Resolve tenant invitation delivery logs.
6. Deploy and verify session persistence hardening.
7. Roll out Agentic MCP Phase 1 to production and run a live `tools/list` + `create_task` call.
8. Complete OpenAI end-to-end app proof, Anthropic live-call proof, and Copilot adapter/live test.
9. Produce Android signed beta artifact once company credential path permits.
10. Keep iOS blocked honestly until D-U-N-S and Apple company credentials clear.
11. Wire Stripe/Paddle into live checkout/subscription/payment collection once pricing/tax/compliance decisions are made.

## Suggested External Wording

**For the GCC enterprise motion (unchanged in substance from 2026-07-31, still the accurate wording for this motion specifically):** AXXESS has moved from validation into pilot conversion. It now has 5 signed LOIs, 2 active pilot tenants, 3 incoming pilots, 2 incoming LOIs, 1 referral agreement, 4 oral paying-interest indications, and strong beta attachment signal from both enterprise and product-feedback surveys. The web beta is close to Enterprise Beta 1.0, with single tenancy closed, five tenants provisioned, Knowledge Hub/indexing substantially proven, HITL AI review live-tested, and core integrations live. The next proof points are paid pilot conversion, RAG answer-quality cleanup, invite/payment/mobile proof, and continued multi-tenant regression evidence.

**Added, 2026-08-05, for the two-motion product story:** AXXESS now runs two deliberately separate product experiences on the same governed core -- a full enterprise console for GCC enterprise and public-sector-style buyers, and a lightweight, self-serve product for Indian MSMEs, NGOs, startups, contractors, and local businesses, built after a real pilot customer (an early Indian small-business pilot) told us directly that the enterprise product needed to be simplified 70-80% for that segment before it would be usable for them. Rather than compromise the enterprise product to fit both markets, we split the experience while keeping one shared backend, auth, and tenant model -- the same engineering discipline that lets us serve a government-scale buyer and a two-person MSME from the same platform without either one seeing the other's complexity. **Caveat that must travel with this wording**: the self-serve motion is real and live, but early -- a working product surface exists, a public waitlist is active, but no self-serve customer has yet signed up, paid, or completed onboarding. Do not present India self-serve traction numbers alongside the enterprise motion's LOI/pilot figures as if they were the same maturity -- they are not, and conflating them would misrepresent GTM readiness to an investor or partner asking a direct question about it.

