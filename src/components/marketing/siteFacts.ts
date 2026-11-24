// Facts shown on the public site (www.triaxisventures.com). Every number here has a source, so the
// site never says more than the repository can back. Update the date when you update a number.

export const githubProfileUrl = "https://github.com/axxess-triaxis";

// Read 2026-11-24 with the GitHub API as the `axxess-triaxis` account (created 2026-07-02):
// - contributions and commits: GraphQL `contributionsCollection` for the last year
// - merged pull requests: search `org:axxess-triaxis is:pr is:merged`
// - public repositories: REST `GET /user`
export const githubStatsAsOf = "24 November 2026";
export const githubStats = [
  { value: "2,683", label: "GitHub contributions since July 2026" },
  { value: "2,177", label: "commits" },
  { value: "538", label: "merged pull requests" },
  { value: "18", label: "public repositories" },
];

// Read from https://profile.codersrank.io/user/axxess-triaxis/ on 2026-11-20: score 618.4, rank Top 1%
// (was Top 2% on 2026-11-14, docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md entry 54).
// A third-party score computed from repository activity, not an audited ranking.
export const codersRankNote = "Top 1% on CodersRank, a third-party score from repository activity (20 November 2026).";
export const codersRankUrl = "https://profile.codersrank.io/user/axxess-triaxis/";

// Founder's words, 2026-11-20. A stated aim, not a claim about what is done.
export const vision = "Trying to automate every organization in the world. We are truly horizontal.";

// Founder's words, 2026-11-20. "Coming to" means planned: no customers, entity or compliance work
// in the EU exists in this repository yet. Selling today starts in India and the UAE
// (first lead segments: real estate brokerages and private clinics).
export const markets = "Coming to India, UAE and EU";

// Founder's words, 2026-11-20 (grammar and punctuation only). Founder-stated, source artifact needed:
// the 15+ years are the two careers together (nine years in banking, 6+ in healthcare, per the
// investor deck), and "community healthcare" is not yet in any repo document.
export const foundersLivedIt =
  "The founders have lived the problem for 15+ years, first hand, in finance and healthcare.";
export const foundersJourney =
  "From selling derivatives and credit products to corporates, to running community healthcare, to automating the world: this founder couple is at work.";

// Where each product stands. Sources: README.md status table (2026-11-18), docs/TRIAXIS_STACK.md,
// and the product repositories' own READMEs.
export const bundleProducts = [
  {
    name: "AXXESS TRIaxis",
    job: "The workspace. Tasks, documents, meetings, projects, a CRM and approvals, with an audit log.",
    state: "Live on the web and on Android",
    href: "https://github.com/axxess-triaxis/AXXESSTRIAXIS",
  },
  // Callismatic (checked 2026-11-20): inbound triage is live; outbound AI calls are built but off until
  // DLT registration with TRAI, counsel sign-off and a DLT-registered Indian voice provider exist
  // (docs/readiness/AGENT_CALL_PIPELINE_CLOSEOUT_2026_11_13.md; callismatic README).
  {
    name: "Callismatic",
    job: "Listens to the calls and voicemails nobody checks and works out who needs a reply. Outbound calls are built and switched off.",
    state: "Inbound live; outbound calls wait on DLT registration with TRAI",
    href: "https://github.com/axxess-triaxis/callismatic",
  },
  // Omnidamus (checked 2026-11-20): Meta's display-name decision arrived 2026-10-28, and production
  // logs (/aws/lambda/omnidamus-OmnidamusFunction-*, ap-southeast-2) show a WhatsApp message on
  // 2026-10-29 going accepted, sent, delivered and read with no errors. The README's "blocked" note
  // (error 131037 from 27 Oct) is out of date.
  {
    name: "Omnidamus",
    job: "Holds one conversation across SMS, WhatsApp and email.",
    state: "Live; WhatsApp messages delivered",
    href: "https://github.com/axxess-triaxis/Omnidamus",
  },
  {
    name: "STILL",
    job: "Connects them. A new lead or a finished conversation turns up in AXXESS as a task.",
    state: "Live between our own products",
    href: "https://github.com/axxess-triaxis/STILL",
  },
];
