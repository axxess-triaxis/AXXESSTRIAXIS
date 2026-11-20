import Link from "next/link";

// Route kept as /global-south so existing links still work; the page is now "Where We Sell".

const reasons = [
  {
    title: "Most teams run on WhatsApp, email and spreadsheets.",
    body: "That is not an edge case to clean up first. AXXESS is built for it.",
  },
  {
    title: "Approvals and records matter before the big-software budget does.",
    body: "A clinic or a brokerage needs to know who approved what long before it can afford enterprise software and the consultants that come with it.",
  },
  {
    title: "We know these buyers.",
    body: "We spent years on the other side of the table, in banks and in hospitals. We start where we know how the work really happens.",
  },
];

const markets = ["India", "United Arab Emirates", "More countries next. We are horizontal, remember?"];

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
              Where We Sell
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              India and the UAE first. Then everywhere else.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              Work gets lost the same way in every country. We start in India and the UAE, with real
              estate brokerages and private clinics.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
            First markets
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
