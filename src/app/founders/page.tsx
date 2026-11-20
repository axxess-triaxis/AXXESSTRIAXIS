import Link from "next/link";
import {
  codersRankNote,
  codersRankUrl,
  foundersJourney,
  foundersLivedIt,
  githubProfileUrl,
  githubStats,
  githubStatsAsOf,
} from "../../components/marketing/siteFacts";

// Career facts: Founder-stated, source artifact needed. Sources are the founder's own documents, given
// to us on 2026-11-20 for the site: the investor deck PDF (15 pages, slide 11) and two CVs
// (Sudipta_Koushik_Sarmah_Founder_CV.pdf, Sudipta_Koushik_Sarmah_CV_Anthropic.pdf). None is checked
// in to this repository. Left out on purpose: Rural Valley and Spain (not before the 23 Nov offer),
// prices, product numbers the repo does not back (lines of code, test counts, spend, LOIs, NPS),
// and family details beyond what the founders chose to say here.
const founderCards = [
  {
    name: "Sudipta Koushik Sarmah",
    role: "Co-founder and CEO. Builds it and sells it.",
    body: [
      "Paid his own way since 16. Nobody handed him anything.",
      "Nine years at SBI and HDFC Bank, across treasury, FX derivatives, credit, operations, audit and compliance. Sat on the committees our customers sit on, and sold to them for a decade.",
      "Picked for SBI's treasury team: 25 officers chosen from more than 10,000. A Top 20 Treasury Relationship Manager at SBI in 2020-21, looking after forex relationships worth about US$3 billion a year in turnover.",
      "At 29, headed FX and derivatives sales for HDFC Bank in Rajasthan, a desk with a P&L of about US$1.6 million. Then grew a business-banking loan book from ₹14 crore to ₹56 crore in 14 months.",
      "Never an engineer. Taught himself in 2026 and has since built six connected products, in public, on GitHub: the four in the AXXESS Bundle, plus PORT4LLEO and RepoWatch for code quality and security.",
      "BBA in Finance, University of Calcutta. CFA Level 1, FRM Part 1 and CAIIB. Writes on AI safety and governance; his papers drew positive feedback from AI Safety Hong Kong and the Oxford AI Safety Initiative.",
    ],
  },
  {
    name: "Ritashree Mahanta",
    role: "Co-founder and COO. Knows how the work really happens.",
    body: [
      "More than six years in hospitals and nursing colleges, including as an Assistant Professor.",
      "Ran accreditation audits, so she knows exactly what an auditor asks for.",
      "Convened three state-level conferences and has two peer-reviewed papers.",
      "Selected by the Cherie Blair Foundation. Funds our runway from her salary.",
    ],
  },
];

// Founder-stated, source artifact needed (founder CV, 2026-11-20). Rural Valley is left out until its
// official offer on 23 Nov 2026 (founder decision, 2026-11-20).
const recognition = [
  "NVIDIA Inception",
  "NexFellow Fellowship 2026, Top 100",
  "AltaLab Fall 2026, AltaIR Capital",
  "Founder Institute Dubai, finalist",
  "Selected for, and declined, 9 more programmes, including NASSCOM CoE incubation and SIIC IIT Kanpur",
  "ADPList: Top 10 Business Transformation mentor worldwide, Q2 2026",
];

export default function FoundersPage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-10 md:py-16">
        <div className="space-y-7">
          <Link href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
            Back to Triaxis Ventures
          </Link>
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
              Founders
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Built by Sudipta Koushik Sarmah and Ritashree Mahanta.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              {foundersLivedIt} We have sat on your side of the table. Together for a decade, we
              own and run Triaxis Ventures Private Limited 50:50.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-[#526273]">Triaxis Ventures</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/triaxis-ventures-logo.png"
            alt="Triaxis Ventures logo"
            width={1254}
            height={1254}
            className="mx-auto aspect-square w-full max-w-sm rounded-lg bg-black object-cover"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 md:grid-cols-2 md:px-10">
        {founderCards.map((founder) => (
          <article key={founder.name} className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
              {founder.role}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#111827]">{founder.name}</h2>
            {founder.body.map((line) => (
              <p key={line} className="mt-4 text-base leading-7 text-[#4a5a6a]">
                {line}
              </p>
            ))}
          </article>
        ))}
      </section>

      <section aria-label="The founders' story" className="mx-auto max-w-7xl px-6 pb-10 md:px-10">
        <p className="max-w-4xl text-2xl font-semibold leading-snug text-[#111827] md:text-3xl">
          {foundersJourney}
        </p>
      </section>

      <section aria-label="Programmes and recognition" className="mx-auto max-w-7xl px-6 pb-10 md:px-10">
        <div className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
            Programmes and recognition
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {recognition.map((item) => (
              <li key={item} className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#243244]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="The build, on GitHub" className="mx-auto max-w-7xl px-6 pb-16 md:px-10">
        <div className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
            The build, on GitHub
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[#111827]">
            The receipts are public.
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {githubStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[#d6dee8] bg-[#f8fafc] p-4">
                <dt className="text-sm text-[#4a5a6a]">{stat.label}</dt>
                <dd className="mt-1 text-3xl font-semibold text-[#111827]">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-6 text-[#4a5a6a]">
            From the GitHub API on {githubStatsAsOf}.{" "}
            <a href={codersRankUrl} className="underline underline-offset-4">
              {codersRankNote}
            </a>{" "}
            <a href={githubProfileUrl} className="font-semibold underline underline-offset-4">
              github.com/axxess-triaxis
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
