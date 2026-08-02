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

## Readiness Board

| Track | Current Readiness | Status | Evidence Basis | Main Blocker |
|---|---:|---|---|---|
| Product Readiness | **84-90%** | Strong beta product, near Enterprise Beta 1.0 but not closed | Core tenant workflows, 5 live/provisioned tenants, single tenancy closed, demo/live separation, Knowledge Hub upload/index/delete/non-index option, indexed docs pulled by RAG, HITL AI review live-tested, dashboard, audit, agentic infra, integrations framework, mobile shell, QA docs | Clean final live regression, invite/email closure, payment flows, mobile store release, advanced integration proof |
| Web Enterprise Beta 1.0 | **86-91%** | Near release-beta, final proof pending | Auth/onboarding live, Google OAuth live, SMS auth live, live tenants, RAG/HITL workflows, dashboard, audit logs, Knowledge Hub, document indexing behavior, tests, production deployments, live core integrations | Session-security deploy proof, RAG result-quality bug closure, tenant invite proof, final founder/QA walkthrough |
| Market Readiness | **84-90%** | Strong pre-revenue / pilot-conversion traction | 5 signed LOIs, 4 oral paying-interest indications, 2 incoming LOIs, 2 ongoing provisioned pilots, 3 incoming pilots, 1 referral agreement, 9/10 enterprise pilot intent, 21/24 strong product attachment | Paid conversion, usage retention, signed commercial terms, first paid pilot proof |
| GTM Readiness | **80-86%** | Active pilot-conversion stage | Clear ICP direction, signed LOIs, active pilots, incoming pilots, incoming LOIs, referral agreement, accelerator/incubation pipeline, strong beta survey signal | Repeatable sales process, pricing packaging, paid pilot close, CRM/pipeline operating cadence |
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

## Integration Readiness Kanban

| Layer | Status | Notes |
|---|---|---|
| Live and fully tested | Done for first core providers | Google Workspace, Zoom, Twilio, OpenRouter, Google OAuth. |
| Wired but testing not fully cleared | In progress | OpenAI, Mixpanel, PostHog, SMTP, Entra, Azure, Meta Business, Microsoft Outlook, Microsoft Teams, WhatsApp Business. |
| Integrated, but not wired/live | Early / catalogue-to-product stage | Stripe, Notion, Iceberg, Airtable, Clerk, Paddle, Calendly, SV Vectors, HubSpot. |
| Connector OAuth framework | Built | Common OAuth/token-vault pattern exists. |
| Microsoft ecosystem | In progress | Entra, Azure, Outlook, Teams are wired but need final live testing and credential/permission proof. |
| Meta / WhatsApp | In progress | WhatsApp Business messaging is wired (OAuth + send/receive) but needs live testing and provider approval/scope checks. **Correction, 2026-08-02:** "Meta Business" as a distinct row overstated actual code -- direct inspection of `src/services/alerts/socialAlerts.ts` and `src/services/integrations/connectorContract.ts` found no business-asset, campaign/promotion, content-publishing, or community-engagement code for Facebook/Instagram; only a read-only `META_APP_ID`/`META_APP_SECRET`/`META_PAGE_ACCESS_TOKEN` credential-presence check feeding a social-monitoring status tile. Full Meta Business Suite integration (business assets, campaigns, promotions, content, community engagement) is founder-confirmed as the actual, standing requirement -- not yet built. See `ACTIONABLES_READINESS_MATRIX.md` A-83 once scoped |
| Analytics | In progress | Mixpanel/PostHog wired; needs event receipt, replay/privacy masking, and dashboard confirmation. |
| Payments | Early | Stripe and Paddle are integrated but not live payment flows yet; Razorpay remains roadmap. |
| 30+ advanced connectors | Early roadmap | Requires per-provider app registration, scopes, webhooks, sync logs, audit logging, and QA. |

### Integration Maturity Register

| Provider / System | Current Tier | Readiness Meaning |
|---|---|---|
| Google Workspace | Live and fully tested | Production-beta integration evidence. |
| Zoom | Live and fully tested | Production-beta integration evidence. |
| Twilio | Live and fully tested | Production-beta integration evidence. |
| OpenRouter | Live and fully tested | Production-beta AI-provider evidence. |
| Google OAuth | Live and fully tested | Sign-in/auth provider proof. |
| OpenAI | Wired, testing not fully cleared | API is live with $20 credits and cost mapping, but final end-to-end app proof still pending. |
| Mixpanel | Wired, testing not fully cleared | Needs event receipt/dashboard confirmation. |
| PostHog | Wired, testing not fully cleared | Needs replay/privacy masking decision and event/session proof. |
| SMTP | Wired, testing not fully cleared | Supabase Auth email works; tenant invite/provider delivery still needs proof. |
| Entra | Wired, testing not fully cleared | Needs Microsoft identity live proof. |
| Azure | Wired, testing not fully cleared | Needs provider-specific live proof. |
| Meta Business | Correction, 2026-08-02: not built (see note in Kanban above) | This row previously overstated readiness -- only WhatsApp Business messaging and a read-only Meta credential-presence check exist. Full Business Suite (assets, campaigns, promotions, content, engagement) is scoped but not yet implemented; see A-83 |
| Microsoft Outlook | Wired, testing not fully cleared | Needs mailbox OAuth and selected-message import proof. |
| Microsoft Teams | Wired, testing not fully cleared | Needs live OAuth and workspace action proof. |
| WhatsApp Business | Wired, testing not fully cleared | Needs provider approval and live message/workflow proof. |
| Stripe | Integrated only | Not yet wired into live billing/payment flow. |
| Notion | Integrated only | Not yet live/wired enough for production-beta proof. |
| Iceberg | Integrated only | Needs product wiring and test definition. |
| Airtable | Integrated only | Needs OAuth/wiring/live proof. |
| Clerk | Integrated only | Needs auth architecture decision before being considered live. |
| Paddle | Integrated only | Not yet wired into live billing/payment flow. |
| Calendly | Integrated only | Needs OAuth/wiring/live proof. |
| SV Vectors | Integrated only | Needs product wiring and verification definition. |
| HubSpot | Integrated only | Needs OAuth/wiring/live proof. |

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

AXXESS has moved from validation into pilot conversion. It now has 5 signed LOIs, 2 active pilot tenants, 3 incoming pilots, 2 incoming LOIs, 1 referral agreement, 4 oral paying-interest indications, and strong beta attachment signal from both enterprise and product-feedback surveys. The web beta is close to Enterprise Beta 1.0, with single tenancy closed, five tenants provisioned, Knowledge Hub/indexing substantially proven, HITL AI review live-tested, and core integrations live. The next proof points are paid pilot conversion, RAG answer-quality cleanup, invite/payment/mobile proof, and continued multi-tenant regression evidence.

