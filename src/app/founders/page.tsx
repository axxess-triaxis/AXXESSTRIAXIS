const founderCards = [
  {
    name: "Sudipta Koushik Sarmah",
    role: "Founder and Managing Director",
    body:
      "Leads company direction, product strategy, hands-on technical build, engineering execution, market discovery, pilot conversion and fundraising.",
  },
  {
    name: "Ritashree Mahanta",
    role: "Co-Founder",
    body:
      "Contributes to product strategy, healthcare and education workflow design, customer discovery, beta feedback collection and operating runway support.",
  },
];

export default function FoundersPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#0f1720]">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-10 md:py-16">
        <div className="space-y-7">
          <a href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
            Back to Triaxis Ventures
          </a>
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
              Founders
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Built by Sudipta Koushik Sarmah and Ritashree Mahanta.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              Triaxis Ventures Private Limited is co-founded by Sudipta Koushik Sarmah and Ritashree
              Mahanta. It is a founder-led private company, and AXXESS TRIaxis is owned and operated
              by Triaxis Ventures Private Limited.
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

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 md:grid-cols-2 md:px-10">
        {founderCards.map((founder) => (
          <article key={founder.name} className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
              {founder.role}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#111827]">{founder.name}</h2>
            <p className="mt-4 text-base leading-7 text-[#4a5a6a]">{founder.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
