// A-96 (2026-08-04): the "CLI propagates" step of the founder-defined Beta Readiness workflow:
// (1) product owner asks Claude Code for stats, (2) Claude Code provides, (3) product owner (HITL)
// clears, (4) CLI propagates into the live page. This file IS that propagation -- a static,
// evidence-sourced snapshot, not a live external API poll and not fabricated placeholder data.
// Every figure here was reviewed and cleared by the founder in conversation on 2026-08-04, with
// exact source citations preserved in the full evidence doc this file is derived from:
// docs/readiness/BETA_READINESS_METRICS_DRAFT_FOR_REVIEW_2026_08_04.md
//
// To refresh this snapshot: ask Claude Code to recompute the stats, review the draft, clear it,
// then have Claude Code update this file to match. Do not hand-edit figures here without going
// through that loop -- the whole point of this file is that every number in it has a traceable
// source.

export type Provenance = "computed" | "founder-stated";

export type SnapshotMetric = {
  label: string;
  value: string;
  detail: string;
  provenance: Provenance;
};

export type ReadinessKanbanStage = {
  title: string;
  description: string;
  status: string;
};

export type ReadinessKanban = {
  title: string;
  band: string;
  bandNote: string;
  stages: ReadinessKanbanStage[];
};

export const betaReadinessSnapshotMeta = {
  asOf: "2026-08-13",
  clearedBy: "Founder (HITL), in conversation -- \"Refer to Git, all data available\"",
  sourceDoc: "docs/readiness/BETA_READINESS_METRICS_REFRESH_2026_08_13.md",
};

export const tractionMetrics: SnapshotMetric[] = [
  { label: "Beta version", value: "0.6.0-beta", detail: "package.json", provenance: "computed" },
  { label: "Tenants provisioned", value: "2", detail: "Imprints Production, Ekora Hive -- both onboarded and live; 4 more (3 Mahanta-group firms, Elevate Group FZE) have LOI/interest on file, not yet provisioned", provenance: "computed" },
  { label: "Signed LOIs", value: "5", detail: "Imprints, Ekora, Mahanta-group (3 firms, 1 letter); plus 1 signed referral engagement (Sakura) and 1 expression of interest (Elevate Group FZE, 2026-08-12)", provenance: "computed" },
  { label: "Landing (live beta) traffic", value: "41 visitors", detail: "106 sessions, 551 page views -- PostHog, landing.triaxisventures.com, 2026-07-27 to 2026-08-13", provenance: "computed" },
  { label: "Investor demo traffic", value: "102 visitors", detail: "Founders Club waitlist paid-social campaign -- PostHog, investor.triaxisventures.com, 2026-08-08 to 2026-08-10 pull", provenance: "computed" },
  { label: "NPS (fresh batch)", value: "90", detail: "n=10, Enterprise Beta Feedback, 2026-07-26", provenance: "computed" },
  { label: "NPS (earlier batch)", value: "82.61", detail: "n=23, Beta 0.5/0.7 combined, 2026-07-23", provenance: "computed" },
  { label: "PMF (very disappointed)", value: "70%", detail: "7 of 10, Sean Ellis-style question", provenance: "computed" },
  { label: "Pilot intent", value: "9/10", detail: "enterprise beta survey respondents", provenance: "computed" },
];

export const engineeringMetrics: SnapshotMetric[] = [
  { label: "LOC (app source)", value: "53,150", detail: "src + migrations + shared + mobile, excl. tests", provenance: "computed" },
  { label: "LOC (incl. tests)", value: "73,677", detail: "same scope, tests included", provenance: "computed" },
  { label: "Commits", value: "834", detail: "git rev-list --count origin/main", provenance: "computed" },
  { label: "Tests", value: "1,136", detail: "231 files, 1,132 passing, 0 failures (2026-08-04 pull; not re-run this refresh)", provenance: "computed" },
  { label: "Vercel Experience Score", value: "~89.5%", detail: "deploy success rate, axxesstriaxis, as of 2026-08-04 pull -- not re-verified this refresh (requires live Vercel console)", provenance: "computed" },
  { label: "Engineering/product sprints", value: "70+", detail: "across Sprint N, A-N, ED-RN, MC-N execution units", provenance: "founder-stated" },
];

export const outreachMetrics: SnapshotMetric[] = [
  { label: "Calls", value: "70+", detail: "18+ hours, including 10+ investor calls", provenance: "founder-stated" },
  { label: "Live demos given", value: "4", detail: "incl. senior-level contacts", provenance: "founder-stated" },
  { label: "Integration surface", value: "40+", detail: "10+ live/operational", provenance: "founder-stated" },
];

export const readinessKanbans: ReadinessKanban[] = [
  {
    title: "Product Readiness",
    band: "84-90%",
    bandNote: "Strong beta product, near Enterprise Beta 1.0",
    stages: [
      { title: "Single tenancy", description: "100% complete per founder confirmation.", status: "Done" },
      { title: "Multi-tenancy", description: "3 real tenant accounts total (founder + Imprints Production + Ekora Hive), per direct Supabase check; no data leakage currently observed.", status: "Mostly done" },
      { title: "Knowledge Hub", description: "Upload, delete, optional indexing, and RAG retrieval working.", status: "Mostly done" },
      { title: "RAG + citations", description: "Indexed documents pulled correctly; answer/result-quality cleanup pending.", status: "Mostly done" },
      { title: "HITL AI review", description: "Fully live-tested and working.", status: "Done" },
      { title: "Dashboard", description: "Substantially usable, final consistency pass remaining.", status: "80-90%" },
      { title: "Email and invite loop", description: "Account email delivers; tenant invitation delivery still a separate root-cause item.", status: "Partially done" },
      { title: "Payments and billing", description: "Stripe/Paddle integrated at catalogue level, not wired into live checkout.", status: "Integrated only" },
    ],
  },
  {
    title: "Integration Readiness",
    band: "62-68%",
    bandNote: "Founder's own draft band, concurred with by a 2026-08-02 re-audit against live Vercel env vars",
    stages: [
      { title: "Live and fully tested", description: "Zoom, OpenRouter, Google OAuth sign-in.", status: "Live" },
      { title: "Live for allowlisted account", description: "Gmail, Google Sheets -- Google OAuth app still in Testing status (100-user cap).", status: "Partial" },
      { title: "Wired, real calls confirmed", description: "OpenAI -- spend guard + budget ledger real, a live 429 was observed.", status: "Wired" },
      { title: "Wired, not fully cleared", description: "HubSpot, Mixpanel, PostHog, SMTP (Resend) -- credentials set, live-test evidence pending.", status: "Wired" },
      { title: "Reaches provider UI, blocked by config gap", description: "Microsoft Outlook/Teams, WhatsApp Business -- exact fixes identified, not yet applied.", status: "Blocked" },
      { title: "Code-ready, gated off", description: "Twilio / phone-OTP -- zero Twilio env vars in production, feature flag off.", status: "Gated" },
      { title: "Catalogued only", description: "Jira, Trello, Asana, Salesforce, Zoho CRM, DocuSign, Razorpay and others -- no OAuth contract or credentials.", status: "Not started" },
    ],
  },
  {
    title: "Market Readiness",
    band: "84-90%",
    bandNote: "Strong pre-revenue / pilot-conversion traction, still pre-revenue with paying interest secured",
    stages: [
      { title: "Problem discovery", description: "Prior customer discovery and stakeholder validation logs.", status: "Done" },
      { title: "Beta feedback collection", description: "Enterprise and product feedback survey evidence.", status: "Done" },
      { title: "Signed LOIs", description: "5 LOIs on file (Imprints, Ekora, 3x Mahanta-group firms); plus 1 signed referral engagement (Sakura) and 1 expression of interest (Elevate Group FZE, 2026-08-12).", status: "Done" },
      { title: "Active pilots", description: "2 active pilots (Imprints Production, Ekora Hive), both provisioned and live.", status: "In progress" },
      { title: "Referral distribution", description: "1 referral agreement.", status: "In progress" },
      { title: "Paying interest", description: "2 advance-payment commitments confirmed ($50 each, Imprints written 2026-08-12 + Ekora oral) plus 4 more oral commitments (3 Mahanta-group firms, Elevate Group FZE) -- aggregate $220-300, all uncollected pending Triaxis's own IDFC First Bank current-account setup.", status: "In progress" },
      { title: "Paid pilot conversion", description: "No closed payment recorded yet.", status: "Next" },
      { title: "Public waitlist funnel", description: "getlaunchlist.com/pages/axxess-triaxis-founders-club-edition -- promoted on FB/Instagram/LinkedIn/WhatsApp.", status: "Live" },
    ],
  },
  {
    title: "Mobile Readiness (iOS / Android)",
    band: "Android 65-72%, iOS 32-40%",
    bandNote: "Android materially ahead of iOS; iOS externally blocked on D-U-N-S",
    stages: [
      { title: "Android debug/preview build", description: "Partially proven via CI artifact validation.", status: "Partially proven" },
      { title: "Android signed beta", description: "Needs company Play Console + signing/release workflow proof.", status: "Blocked" },
      { title: "iOS build path", description: "Planned / partially scaffolded.", status: "Planned" },
      { title: "TestFlight", description: "Needs ASC credentials and Apple approval path.", status: "Blocked" },
      { title: "D-U-N-S application", description: "Applied 2026-07-13, now expected by 2026-08-25 (revised from an initial ~30-day/2026-08-12 estimate).", status: "Pending" },
    ],
  },
];

export type PilotTestimonial = {
  quotes: string[];
  attribution: string;
};

export const pilotTestimonials: PilotTestimonial[] = [
  {
    quotes: [
      "Looks quite sophisticated and feels quite stable for your current stage.",
      "I had expected a far less evolved product, honestly.",
      "Your pace and vision here are correct.",
    ],
    attribution: "Prajnyan Ballav Goswami, Proprietor, Imprints Production (AXXESS Pilot 1)",
  },
  {
    quotes: [
      "We had not expected a full scale product, but the product actually looks polished and sophisticated.",
      "Your vision of agentic automation with human element is quite strong and should be the differentiator.",
      "It is good to see a startup from Assam aiming globally.",
    ],
    attribution: "Diksha Rajkhowa, Proprietor, Ekora Hive (AXXESS Pilot 2)",
  },
];

export const waitlist = {
  url: "https://getlaunchlist.com/pages/axxess-triaxis-founders-club-edition",
  label: "AXXESS TRIaxis -- Founders Club Edition",
  channels: "Facebook, Instagram, LinkedIn, WhatsApp, WhatsApp Business",
};
