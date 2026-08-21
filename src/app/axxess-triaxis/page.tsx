const surfaces = [
  "Enterprise beta workspace",
  "Investor demo",
  "AXXESS Lite",
  "Companion mobile paths",
];

const capabilities = [
  "Memory layer: governed RAG, tenant-specific knowledge indexing, document store and persistent context",
  "Agentic layer: multi-model routing, task execution, CRM actions and stakeholder mapping",
  "Governance layer: HITL approval gates, RBAC, delegation rules, SLA controls and immutable audit trails",
];

export default function AxxessTriaxisPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#0f1720]">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1fr_0.8fr] md:px-10 md:py-16">
        <div className="space-y-7">
          <a href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
            Back to Triaxis Ventures
          </a>
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
              AXXESS TRIaxis
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              A governed AI operating layer for organizational work.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              AXXESS TRIaxis turns institutional knowledge into governed action. It brings documents,
              meetings, tasks, approvals, projects, stakeholders, analytics and AI-assisted answers into
              one tenant-scoped workspace where retrieval, decisions and outcomes are preserved.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://landing.triaxisventures.com"
              className="rounded-lg bg-[#8b1e2d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#741927]"
            >
              Welcome Aboard
            </a>
            <a
              href="https://investor.triaxisventures.com"
              className="rounded-lg border border-[#b8c3d1] bg-white px-5 py-3 text-sm font-semibold text-[#1d2a38] transition hover:bg-[#eef2f6]"
            >
              Experience AXXESS
            </a>
            <a
              href="https://lite.triaxisventures.com"
              className="rounded-lg border border-[#b8c3d1] bg-white px-5 py-3 text-sm font-semibold text-[#1d2a38] transition hover:bg-[#eef2f6]"
            >
              Stay Lite (for now)
            </a>
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
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2 md:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
              Product surfaces
            </p>
            <ul className="mt-5 grid gap-3">
            {surfaces.map((surface) => (
                <li
                  key={surface}
                  className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#243244]"
                >
                  {surface}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
              Core capabilities
            </p>
            <ul className="mt-5 grid gap-3">
            {capabilities.map((capability) => (
                <li
                  key={capability}
                  className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#243244]"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
            Product position
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[#111827]">
            Organizational memory, governed agents, workflow execution, human accountability.
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-7 text-[#4a5a6a]">
            The product is built for teams whose work breaks across email, WhatsApp, Teams, Zoom,
            documents and manual notes. AXXESS is designed so knowledge can be retrieved, agents can
            act within permission boundaries, humans can approve consequential steps, and the audit
            trail records what happened next.
          </p>
        </div>
      </section>
    </main>
  );
}
