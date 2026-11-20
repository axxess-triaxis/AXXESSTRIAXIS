import Link from "next/link";

const segments = [
  {
    name: "Real estate brokerages",
    examples: "Leads from portals, calls and WhatsApp. Site visits. The follow-up that was due yesterday.",
  },
  {
    name: "Private clinics",
    examples: "Patient enquiries, appointment follow-ups, approvals and the records an auditor will ask for.",
  },
  {
    name: "Everyone else, eventually",
    examples:
      "Small businesses, councils, schools and colleges, NGOs and corporates. Meetings, employees, vendors and, most importantly, customers. Same problem everywhere.",
  },
];

export default function WhoWeBuildForPage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-16">
        <Link href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
          Back to Triaxis Ventures
        </Link>
        <div className="mt-7 max-w-4xl space-y-5">
          <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
            Who We Build For
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            Any organisation where work gets lost between people and tools.
          </h1>
          <p className="text-lg leading-8 text-[#3f5165] md:text-xl">
            That is every organisation. We are starting with real estate brokerages and private
            clinics in India and the UAE.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-16 md:grid-cols-2 md:px-10 xl:grid-cols-3">
        {segments.map((segment) => (
          <article key={segment.name} className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#111827]">{segment.name}</h2>
            <p className="mt-4 text-base leading-7 text-[#4a5a6a]">{segment.examples}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
