const segments = [
  {
    name: "Healthcare",
    examples: "Discharge approvals, ICU coordination, billing closure and clinical audit trails",
  },
  {
    name: "Banking & Finance",
    examples: "Credit workflows, compliance sign-offs, treasury operations and relationship management",
  },
  {
    name: "Universities & Education",
    examples: "Academic governance, faculty approvals, student records and institutional audits",
  },
  {
    name: "MSMEs & Mid-Market",
    examples: "Operational workflows, vendor approvals, team coordination and knowledge retention",
  },
  {
    name: "NGOs & Public-Sector Bodies",
    examples: "Program coordination, grant workflows, field follow-ups, evidence trails and reporting",
  },
  {
    name: "Startups & Operators",
    examples: "Company memory, stakeholder follow-through, founder workflows and execution tracking",
  },
];

export default function WhoWeBuildForPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#0f1720]">
      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-16">
        <a href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
          Back to Triaxis Ventures
        </a>
        <div className="mt-7 max-w-4xl space-y-5">
          <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
            Who We Build For
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            Institutions and teams where coordination failure is expensive.
          </h1>
          <p className="text-lg leading-8 text-[#3f5165] md:text-xl">
            Primary markets are India and the GCC. The broader focus is Global South and emerging-market
            organizations with fragmented systems, multilingual environments and high coordination
            friction.
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
