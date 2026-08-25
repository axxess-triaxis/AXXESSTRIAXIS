import Link from "next/link";

const reasons = [
  {
    title: "Fragmented work is normal, not an edge case.",
    body: "Teams often run serious operations across WhatsApp, email, spreadsheets, meetings and manual notes. AXXESS starts from that reality instead of assuming clean enterprise stacks.",
  },
  {
    title: "Governance matters before scale.",
    body: "Healthcare, banking, education, NGOs and public-sector teams need accountability, approvals and audit trails long before they have Fortune 500 software budgets.",
  },
  {
    title: "Localization beats one-size-fits-all automation.",
    body: "AXXESS is shaped around the principle of 80% automation and 20% localization, so the product can adapt to local workflows, languages, regulations and buyer behavior.",
  },
  {
    title: "India and the GCC are the right first arc.",
    body: "India gives scale, urgency and price sensitivity. The GCC gives enterprise demand, capital depth and governance-heavy buyers. Together they form a practical first market path.",
  },
];

const markets = [
  "India",
  "GCC",
  "Broader Global South",
  "Emerging-market institutions with fragmented systems",
];

export default function GlobalSouthPage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1fr_0.8fr] md:px-10 md:py-16">
        <div className="space-y-7">
          <Link href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
            Back to Triaxis Ventures
          </Link>
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
              Why build for the Global South
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Because the hardest coordination problems are not waiting for perfect software stacks.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              AXXESS TRIaxis is being built first for India, the GCC and the broader Global South
              because these markets combine high coordination friction, governance needs, mobile-first
              behavior and deep institutional ambition.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
            First market arc
          </p>
          <ul className="mt-5 grid gap-3">
            {markets.map((market) => (
              <li
                key={market}
                className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#243244]"
              >
                {market}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-16 md:grid-cols-2 md:px-10">
        {reasons.map((reason) => (
          <article key={reason.title} className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#111827]">{reason.title}</h2>
            <p className="mt-4 text-base leading-7 text-[#4a5a6a]">{reason.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
