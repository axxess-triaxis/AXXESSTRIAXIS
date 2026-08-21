const contrasts = [
  {
    oldWay: "Legacy SaaS",
    oldBody: "Records what happened after people already did the work.",
    axxessWay: "AXXESS TRIaxis",
    axxessBody: "Keeps institutional memory alive and helps move from knowledge to governed action.",
  },
  {
    oldWay: "AI copilots",
    oldBody: "Answer questions, but usually own no workflow, decision right, audit trail or follow-through.",
    axxessWay: "Governed agents",
    axxessBody: "Act inside permission boundaries, with human approval for consequential decisions.",
  },
  {
    oldWay: "Scattered channels",
    oldBody: "Email, WhatsApp, Teams, Zoom and documents split context across too many places.",
    axxessWay: "One governed workspace",
    axxessBody: "Connects documents, meetings, tasks, approvals, stakeholders, analytics and AI answers.",
  },
];

const disruptionPoints = [
  {
    title: "Enterprise brain and AI OS for institutions.",
    body: "AXXESS is built as institutional memory plus execution infrastructure, not a generic chatbot or another dashboard.",
  },
  {
    title: "Agentic automation with human oversight.",
    body: "Agents can help work move, but consequential actions remain governed by approvals, permissions and human decision rights.",
  },
  {
    title: "Immutable auditability and strict policy adherence.",
    body: "Every serious workflow is designed around traceability: who knew what, what decision was made, what action followed, and under which policy.",
  },
  {
    title: "Productivity and auditability, without surveillance.",
    body: "The point is not to monitor people. The point is to preserve decisions, context, approvals and follow-through so teams can work with less confusion.",
  },
  {
    title: "Light on the pocket.",
    body: "AXXESS is being built to cost a fraction of traditional enterprise software and consulting-heavy transformation programs.",
  },
  {
    title: "Horizontal SaaS with a common kernel.",
    body: "The product thesis is 80% common operating kernel and 20% customization, so very different institutions can share the same core while adapting to local workflows.",
  },
  {
    title: "Built for emerging-market budgets and layered context.",
    body: "AXXESS starts from how institutions actually work in India, the GCC and the Global South: multilingual, multi-channel, cost-sensitive and governance-heavy.",
  },
  {
    title: "Useful for governments without waiting for a GovTech procurement cycle.",
    body: "Public-sector and public-adjacent teams can start with operating workflows, audit trails and coordination layers before a long formal government software buying process finishes.",
  },
  {
    title: "Built for markets software giants ignored.",
    body: "AXXESS is aimed at institutions, MSMEs, NGOs, education, healthcare, public-sector bodies and mid-market teams that rarely get software designed around their realities.",
  },
  {
    title: "AI-native build by nominally non-technical founders.",
    body: "The build itself is part of the disruption: domain operators used AI-native engineering tools to move faster and cheaper than a conventional outsourced build.",
  },
  {
    title: "Real domain expertise behind the product.",
    body: "The founders bring 15+ years of combined enterprise, banking, healthcare, education and institutional operating experience into the product decisions.",
  },
  {
    title: "Autonomous founder-led execution.",
    body: "AXXESS has been built by a married founder team without outsourcing judgment to consultants, agencies or an external product studio.",
  },
  {
    title: "Built without grants or agency dependency.",
    body: "The product has been bootstrapped with extreme capital discipline rather than built around a grant cycle, consultant team or high-burn agency model.",
  },
  {
    title: "Validation arrived within months.",
    body: "Within months of conceptualization, AXXESS gathered meaningful validation from pilots, LOIs, beta feedback, waitlist interest and conversations across markets.",
  },
];

const thesisBands = [
  "Enterprise brain",
  "Governed agents",
  "Audit-first execution",
  "Low-cost adoption",
  "Global South first",
  "Founder-built",
];

export default function WhyAxxessIsDisruptivePage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1fr_0.8fr] md:px-10 md:py-16">
        <div className="space-y-7">
          <a href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
            Back to Triaxis Ventures
          </a>
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
              Why AXXESS TRIaxis is disruptive
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Because it turns enterprise AI into governed, affordable action.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              AXXESS TRIaxis is disruptive in a beautiful way because it does not ask institutions to
              choose between speed and accountability. It gives AI a governed path to help work move,
              while preserving human oversight, policy adherence, auditability and institutional
              memory.
            </p>
            <div className="flex flex-wrap gap-3">
              {thesisBands.map((band) => (
                <span
                  key={band}
                  className="rounded-full border border-[#d6dee8] bg-white px-4 py-2 text-sm font-semibold text-[#243244]"
                >
                  {band}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-[#526273]">AXXESS TRIaxis</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/axxess-logo.png"
            alt="AXXESS TRIaxis logo"
            width={1254}
            height={1254}
            className="mx-auto aspect-square w-full max-w-sm rounded-lg bg-black object-cover"
          />
        </div>
      </section>

      <section className="border-y border-[#dde5ee] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
            The simple shift
          </p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-[#111827]">
            Legacy software records. Copilots answer. AXXESS remembers, governs and helps execute.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {contrasts.map((item) => (
              <article key={item.oldWay} className="rounded-xl border border-[#d6dee8] bg-[#f8fafc] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
                  {item.oldWay}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#4a5a6a]">{item.oldBody}</p>
                <div className="my-5 h-px bg-[#d6dee8]" />
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
                  {item.axxessWay}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#243244]">{item.axxessBody}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-12 md:grid-cols-2 md:px-10">
        {disruptionPoints.map((point) => (
          <article key={point.title} className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#111827]">{point.title}</h2>
            <p className="mt-4 text-base leading-7 text-[#4a5a6a]">{point.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
