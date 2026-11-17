// Shared types for the lead-sourcing tool (plan: lead-sourcing tool, 2026-11-17).

export type Segment = "brokerage" | "clinic" | string;

/** A company to research. Comes from a pipe file, saved Apollo results, or a registry adapter. */
export type Seed = {
  segment: Segment;
  country: string;
  company: string;
  domain?: string;
  /** A person a public registry names for this company, preferred over crawled names. */
  registryName?: string;
  registryRole?: string;
  source: string;
};

export type PersonVia = "json-ld" | "role-block" | "registry";

export type Person = {
  name: string;
  role: string;
  /** Page the name was found on, or the registry. */
  url: string;
  via: PersonVia;
  /** True when the site wrote "Dr." before the name (stripped from `name`). */
  doctor: boolean;
};

export type SiteResult = {
  seed: Seed;
  domain: string;
  pagesFetched: string[];
  rendered: string[];
  emails: { email: string; url: string }[];
  people: Person[];
  skippedByRobots: string[];
  error?: string;
};

export type EmailKind = "published-personal" | "published-role" | "guessed";

export type Candidate = {
  seed: Seed;
  contactName: string;
  role: string;
  email: string;
  emailKind: EmailKind;
  /** QEV decision when the address was verified in this run. */
  verified?: "keep" | "review" | "drop";
  score: number;
  evidence: string[];
};

/** Fetches a URL and returns its HTML, or "" on any failure. */
export type FetchText = (url: string) => Promise<string>;
/** Renders a URL in a headless browser and returns the final HTML, or "" on failure. */
export type RenderHtml = (url: string) => Promise<string>;

/** One email verification result. Structurally the same as scripts/check-leads-csv.mts's type. */
export type EmailVerification = { email: string; decision: "keep" | "review" | "drop"; result: string; reason: string; role: boolean };
export type VerifyReport = { results: EmailVerification[]; remainingCredits?: string };
