// Facts shown on the public site (www.triaxisventures.com). Every number here has a source, so the
// site never says more than the repository can back. Update the date when you update a number.

export const githubProfileUrl = "https://github.com/axxess-triaxis";

// Read 2026-11-20 with the GitHub API as the `axxess-triaxis` account (created 2026-07-02):
// - contributions and commits: GraphQL `contributionsCollection` for the last year
// - merged pull requests: search `org:axxess-triaxis is:pr is:merged`
// - public repositories: REST `GET /user`
export const githubStatsAsOf = "20 November 2026";
export const githubStats = [
  { value: "2,615", label: "GitHub contributions since July 2026" },
  { value: "2,130", label: "commits" },
  { value: "518", label: "merged pull requests" },
  { value: "18", label: "public repositories" },
];

// docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md, entry 54 (profile as shown 2026-11-14).
// A third-party score computed from repository activity, not an audited ranking.
export const codersRankNote = "Top 2% on CodersRank, a third-party score from repository activity (14 November 2026).";
export const codersRankUrl = "https://profile.codersrank.io/user/axxess-triaxis/";

export const vision = "Automating every organization in the world, we are truly horizontal.";

// Where each product stands. Sources: README.md status table (2026-11-18), docs/TRIAXIS_STACK.md,
// and the product repositories' own READMEs.
export const bundleProducts = [
  {
    name: "AXXESS TRIaxis",
    job: "The workspace. Tasks, documents, meetings, projects, a CRM and approvals, with an audit log.",
    state: "Live on the web and on Android",
    href: "https://github.com/axxess-triaxis/AXXESSTRIAXIS",
  },
  {
    name: "Callismatic",
    job: "Answers the calls and voicemails nobody checks, works out who needs a callback, and calls back.",
    state: "Live; we use it ourselves",
    href: "https://github.com/axxess-triaxis/callismatic",
  },
  {
    name: "Omnidamus",
    job: "Holds one conversation across SMS, WhatsApp and email.",
    state: "Deployed; WhatsApp is waiting on Meta",
    href: "https://github.com/axxess-triaxis/Omnidamus",
  },
  {
    name: "STILL",
    job: "Connects them. A new lead or a finished conversation turns up in AXXESS as a task.",
    state: "Live between our own products",
    href: "https://github.com/axxess-triaxis/STILL",
  },
];
