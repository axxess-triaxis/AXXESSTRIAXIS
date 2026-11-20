import Link from "next/link";

// No prices on the site yet (founder decision, 2026-11-20): pricing is under revision.

const options = [
  {
    name: "AXXESS TRIaxis",
    audience: "For one team or the whole organisation",
    includes: ["Tasks, meetings, projects and documents", "CRM and lead sourcing", "Approvals and audit log", "Answers from your own documents"],
  },
  {
    name: "The AXXESS Bundle",
    audience: "AXXESS plus the tools we run our own company on",
    includes: ["AXXESS TRIaxis", "Callismatic for calls and voicemail", "Omnidamus for SMS, WhatsApp and email", "STILL to connect them"],
  },
  {
    name: "Guided pilot",
    audience: "Start with one messy workflow, then spread",
    includes: ["We set it up with you", "Your team's real work, not a demo", "A person signs off on anything critical"],
  },
];

export default function PricingPlansPage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-16">
        <Link href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
          Back to Triaxis Ventures
        </Link>
        <div className="mt-7 max-w-4xl space-y-5">
          <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
            Pricing & Plans
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            Priced per seat, per month. Ask us for a number.
          </h1>
          <p className="text-lg leading-8 text-[#3f5165] md:text-xl">
            We are not publishing prices yet. Online checkout is not live, so every customer starts
            by talking to us. Small organisations deserve good software they can afford, and that is
            how we price it.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-16 md:grid-cols-2 md:px-10 xl:grid-cols-3">
        {options.map((option) => (
          <article key={option.name} className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
              {option.audience}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#111827]">{option.name}</h2>
            <ul className="mt-5 grid gap-2">
              {option.includes.map((item) => (
                <li key={item} className="text-sm leading-6 text-[#4a5a6a]">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
