import { motion } from "framer-motion";

const funnels = [
  {
    code: "F-01",
    title: "Advisory Projects",
    subtitle: "Revenue / Volume",
    clients: "NGOs · Healthcare · CSR · Trusts · PPPs · MSMEs · Startups",
    offering: "Advisory mandates, grant proposals, blended finance.",
  },
  {
    code: "F-02",
    title: "High-Discretion Retainers",
    subtitle: "Intelligence",
    clients: "Political principals · CXOs · Promoter groups",
    offering: "Strategic retainerships, crisis management, GovTech access.",
  },
  {
    code: "F-03",
    title: "AI-Native Workflows",
    subtitle: "Platform",
    clients: "MSMEs · Early-stage startups · Smaller NGOs",
    offering: "One-off grant structuring, credit proposals, HITL AI delivery.",
  },
];

export default function RevenueModel() {
  return (
    <section
      id="revenue"
      data-testid="revenue-section"
      className="relative bg-white text-[color:var(--tx-ink)] border-t border-[color:var(--tx-line)]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="md:col-span-7">
            <div className="eyebrow mb-6">06 · Revenue Model</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              A <span className="italic">triple-funnel</span> model.
              <br />
              Services fund. Access unlocks. Platform scales.
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              Funnel I converges with Funnel III over time. In 3–4 years, the
              platform layer is expected to generate 80% of firm revenue.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border border-[color:var(--tx-line)]">
          {funnels.map((f, i) => (
            <motion.div
              key={f.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              data-testid={`revenue-funnel-${i + 1}`}
              className={`p-8 md:p-10 bg-white group hover:bg-[color:var(--tx-cream)] transition-colors ${
                i > 0 ? "border-t md:border-t-0 md:border-l border-[color:var(--tx-line)]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] tracking-widest uppercase text-[color:var(--tx-muted)]">
                  {f.code}
                </span>
                <span className="font-mono text-[11px] tracking-widest uppercase text-[color:var(--tx-accent)]">
                  {f.subtitle}
                </span>
              </div>
              <h3 className="mt-8 font-serif text-[28px] md:text-[34px] leading-tight tracking-tight">
                {f.title}
              </h3>
              <div className="mt-8 pt-6 border-t border-[color:var(--tx-line)]">
                <div className="eyebrow mb-2">Clients</div>
                <p className="text-[13.5px] leading-relaxed text-[color:var(--tx-ink)]/75">
                  {f.clients}
                </p>
              </div>
              <div className="mt-6">
                <div className="eyebrow mb-2">Offerings</div>
                <p className="text-[13.5px] leading-relaxed text-[color:var(--tx-ink)]/75">
                  {f.offering}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
