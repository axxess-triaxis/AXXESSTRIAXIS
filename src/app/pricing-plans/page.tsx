const plans = [
  {
    name: "Uno",
    audience: "Individuals, founders, freelancers and very small teams",
    pricing: "Entry self-serve tier",
    includes: ["Personal operating layer", "Tasks and reminders", "Meetings", "Projects", "Documents", "Basic AI workspace"],
  },
  {
    name: "Domino",
    audience: "Small teams, MSMEs, NGOs, startups and contractors",
    pricing: "Team self-serve tier",
    includes: ["Lite dashboard", "Shared workspaces", "Tasks and meetings", "Projects", "Knowledge Hub", "Basic approvals"],
  },
  {
    name: "Emerging Enterprise",
    audience: "Growing companies and mid-sized operating teams",
    pricing: "Growth subscription tier",
    includes: ["Tenant workspace", "RAG with citations", "HITL review", "CRM and stakeholders", "Analytics", "Core integrations"],
  },
  {
    name: "Enterprise",
    audience: "Healthcare, banking, education, public-sector, NGO and large operating teams",
    pricing: "SaaS subscription tiered by seats, modules and data volume",
    includes: ["Multi-tenant governance", "Advanced approvals", "Audit trail", "Delegation rules", "SLA controls", "Admin controls"],
  },
  {
    name: "Sovereign",
    audience: "Large regulated buyers, public-sector bodies and GCC / Global South institutions",
    pricing: "Custom enterprise tier",
    includes: ["Private deployment path", "Model/provider policy", "Custom integrations", "Compliance pathway", "Enterprise support"],
  },
  {
    name: "Sovereign+",
    audience: "Highest-governance institutions with localization, hosting and policy needs",
    pricing: "Custom sovereign infrastructure tier",
    includes: ["Dedicated operating model", "Localization", "Private cloud options", "Physical or enhanced data controls", "Priority support"],
  },
];

export default function PricingPlansPage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-16">
        <a href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
          Back to Triaxis Ventures
        </a>
        <div className="mt-7 max-w-4xl space-y-5">
          <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
            Pricing & Plans
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            Six tiers from self-serve operators to sovereign institutions.
          </h1>
          <p className="text-lg leading-8 text-[#3f5165] md:text-xl">
            The current business model is SaaS subscription pricing, tiered by seats, modules and data
            volume. The near-term commercial goal is paid pilot conversion; public checkout is not live
            yet.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-16 md:grid-cols-2 md:px-10 xl:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
              {plan.audience}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#111827]">{plan.name}</h2>
            <p className="mt-3 rounded-lg bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[#243244]">
              {plan.pricing}
            </p>
            <ul className="mt-5 grid gap-2">
              {plan.includes.map((item) => (
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
