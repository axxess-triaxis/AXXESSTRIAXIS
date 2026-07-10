# Triaxis Ventures — Marketing Website

## Original problem statement
"I have a website domain purchased www.triaxisventures.com. If I share GitHub repository and pitch deck, can you built cutting edge website as per my exact specifications?"

## Pivots applied
- Iteration 1: initial build — venture / institutional consulting framing (matched original pitch deck).
- Iteration 2: user pivoted to product-first venture studio (AI Enterprise SaaS + GovTech, DIFC/ADGM, YC/a16z audience). All consulting language removed.
- Iteration 3: removed all "in discussion with" mentions; added public enterprise beta + iOS/Android July 2026; removed Ananya Singhal from team; used real founder photos; replaced generic revenue model with a 5-tier customer/pricing table ($50 → sovereign bespoke).

## Design
Mix of Palantir · Anthropic · OpenAI Enterprise · Notion · Stripe · Vercel — warm cream base with dark hero/platform/contact panels, Fraunces serif + Manrope sans + JetBrains Mono, terracotta and Stripe-blue accents, AXXESS icon watermarks, Triaxis triangle mark cropped for nav/footer.

## Architecture
- Frontend: React 18 + Tailwind + framer-motion + sonner (toasts) at `/app/frontend`
- Backend: FastAPI + Motor + Mongo at `/app/backend`
- Contact form → POST /api/contact → MongoDB `contact_inquiries` collection

## Sections (Home page)
1. Hero — venture-studio positioning, beta status strip, 4 metrics
2. Problem / Category — sovereign perimeter, generic LLMs, unbuilt category
3. Thesis (Five Pillars) — sovereign by design, governed AI, multilingual, wedge, distribution
4. Solution — 80/20/100 machine-executed / human-owned / enterprise trust
5. Platform (AXXESS) — six-layer stack + product pipeline (P-02..P-04)
6. Customers & Pricing — 5-tier table (T-01 Micro $50-100 → T-05 Sovereign+ Bespoke)
7. Market — DIFC & ADGM → GIFT/Riyadh/Doha/Singapore → Global South → Category
8. Traction — 6 discovery metrics + program list
9. Team — Sudipta (CEO) + Ritashree (COO)
10. Contact — form + investors@/enterprise@/press@ inbox

## What's implemented
- All 10 sections + Nav + Footer
- Live prototype link to axxesstriaxis.vercel.app
- Contact form with JS validation and sonner toasts
- Real brand assets (Triaxis triangle, AXXESS blue icon, AXXESS wordmark, founder photos)
- Full responsive layout, mobile nav toggle
- data-testid on every interactive/critical element

## Deferred / backlog (P2)
- Real advisor names + credentials
- Dedicated /axxess product landing (currently links out to Vercel)
- Blog / press CMS
- Investor-only page (protected) for deck + data room
- SEO metadata + Open Graph images
- Sitemap.xml + robots.txt

## Test credentials
None (no auth).
