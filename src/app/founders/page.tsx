import Link from "next/link";
import {
  codersRankNote,
  codersRankUrl,
  githubProfileUrl,
  githubStats,
  githubStatsAsOf,
} from "../../components/marketing/siteFacts";

// Career facts from the founders' investor deck (claude.ai "AXXESS TRIaxis — Investor Deck",
// 2026-11-17), approved for the site by the founder on 2026-11-20.
const founderCards = [
  {
    name: "Sudipta Koushik Sarmah",
    role: "Co-founder and CEO. Builds it and sells it.",
    body: [
      "Nine years at SBI and HDFC Bank. Ran a forex desk and sat on the committees our customers sit on.",
      "Never an engineer. Taught himself in 2026 and built AXXESS, in public, on GitHub.",
    ],
  },
  {
    name: "Ritashree Mahanta",
    role: "Co-founder and COO. Knows how the work really happens.",
    body: [
      "Six years in hospitals and nursing colleges, including as an Assistant Professor.",
      "Ran accreditation audits, so she knows exactly what an auditor asks for.",
    ],
  },
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
              We have sat on your side of the table. Triaxis Ventures Private Limited is owned and
              run by its two co-founders, 50:50.
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
