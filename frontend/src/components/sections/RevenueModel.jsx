import { motion } from "framer-motion";

const tiers = [
  {
    code: "T-01",
    label: "Micro",
    price: "$50 – $100",
    unit: "per year",
    customers: [
      "Startups",
      "Micro & small enterprises",
      "Single-location educational institutes",
      "Nursing homes & small healthcare",
      "Local NGOs",
    ],
    tag: "SELF-SERVE",
  },
  {
    code: "T-02",
    label: "Regional",
    price: "$500 – $1,000",
    unit: "per year",
    customers: [
      "Mid-corporates",
      "Regional NGOs",
      "District administrations",
      "Multi-location educational institutes",
      "Universities",
      "Regional healthcare groups",
    ],
    tag: "TEAM",
  },
  {
    code: "T-03",
    label: "National",
    price: "$2,000 – $10,000",
    unit: "per year",
    customers: [
      "National NGOs",
      "State administrations & PSUs",
      "National corporates",
      "Multi-region education & healthcare groups",
      "Large contractors",
    ],
    tag: "SCALE",
  },
  {
    code: "T-04",
    label: "Sovereign",
    price: "Bespoke",
    unit: "sandboxed enterprise",
    customers: [
      "INGOs · national bodies",
      "National PSUs · national government",
      "Large associations · large corporates",
      "IIT / NIT-type networks",
      "AIIMS / Apollo-type healthcare",
    ],
    tag: "SANDBOXED",
    dark: true,
  },
  {
    code: "T-05",
    label: "Sovereign+",
    price: "Bespoke",
    unit: "tailored specs & pricing",
    customers: [
      "Global corporations",
      "Sovereign bodies · major governments",
      "Defence · intelligence",
      "Multilateral organizations",
    ],
    tag: "SANDBOXED",
    dark: true,
  },
];

export default function RevenueModel() {
  return (
    <section
      id="pricing"
      data-testid="revenue-section"
      className="relative bg-white text-[color:var(--tx-ink)] border-t border-[color:var(--tx-line)]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="md:col-span-7">
            <div className="eyebrow mb-6">06 · Customers & Pricing</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              A <span className="italic">five-tier</span> enterprise model.
              <br />
              From $50 to sovereign-scale bespoke.
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              Every tier runs on the same governed AI kernel. Distribution is
              land-and-expand: Tier 1 seeds proof; Tier 4–5 anchors the moat.
            </p>
          </div>
        </div>

        {/* Tier table */}
        <div className="border border-[color:var(--tx-line)] overflow-hidden">
          {tiers.map((t, i) => (
            <motion.div
              key={t.code}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.06 }}
              data-testid={`pricing-tier-${i + 1}`}
              className={`grid md:grid-cols-12 gap-6 p-6 md:p-8 border-b border-[color:var(--tx-line)] last:border-b-0 transition-colors ${
                t.dark
                  ? "bg-[color:var(--tx-ink-2)] text-white hover:bg-[color:#0d0d0d]"
                  : "bg-white hover:bg-[color:var(--tx-cream)]"
              }`}
            >
              <div className="md:col-span-1 flex md:block items-center gap-3">
                <span
                  className={`font-mono text-[11px] tracking-widest uppercase ${
                    t.dark ? "text-white/50" : "text-[color:var(--tx-muted)]"
                  }`}
                >
                  {t.code}
                </span>
              </div>

              <div className="md:col-span-3">
                <div
                  className={`font-mono text-[10.5px] tracking-widest uppercase mb-2 ${
                    t.dark ? "text-[color:var(--tx-blue)]" : "text-[color:var(--tx-blue)]"
                  }`}
                >
                  {t.tag}
                </div>
                <div className="font-serif text-[26px] md:text-[32px] tracking-tight leading-tight">
                  {t.label}
                </div>
              </div>

              <div className="md:col-span-3">
                <div
                  className={`font-serif text-[34px] md:text-[44px] leading-none tracking-tight ${
                    t.dark ? "text-white" : "text-[color:var(--tx-ink)]"
                  }`}
                >
                  {t.price}
                </div>
                <div
                  className={`mt-2 text-[12px] font-mono uppercase tracking-widest ${
                    t.dark ? "text-white/50" : "text-[color:var(--tx-muted)]"
                  }`}
                >
                  {t.unit}
                </div>
              </div>

              <div className="md:col-span-5">
                <div
                  className={`text-[10.5px] font-mono uppercase tracking-widest mb-3 ${
                    t.dark ? "text-white/50" : "text-[color:var(--tx-muted)]"
                  }`}
                >
                  Buyer archetypes
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13.5px] leading-snug">
                  {t.customers.map((c) => (
                    <li
                      key={c}
                      className={`flex items-center gap-2 ${
                        t.dark ? "text-white/85" : "text-[color:var(--tx-ink)]/80"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 ${
                          t.dark ? "bg-[color:var(--tx-blue)]" : "bg-[color:var(--tx-ink)]"
                        }`}
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[13px] text-[color:var(--tx-ink)]/60">
          <div className="font-mono uppercase tracking-widest text-[11px]">
            One kernel · Five tiers · One governance model
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-[color:var(--tx-ink)] link-underline"
          >
            Request enterprise pricing →
          </a>
        </div>
      </div>
    </section>
  );
}
