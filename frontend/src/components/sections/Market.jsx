import { motion } from "framer-motion";

const phases = [
  {
    code: "01",
    label: "Phase I",
    region: "Assam & Northeast India",
    detail: "1,487+ startup ecosystem entry point. Ground-truth institutional pilots.",
  },
  {
    code: "02",
    label: "Phase II",
    region: "BBIN & BIMSTEC",
    detail: "Trade-corridor expansion across Bangladesh, Bhutan, India, Nepal + BIMSTEC.",
  },
  {
    code: "03",
    label: "Phase III",
    region: "Pan-India",
    detail: "Semi-formal markets, promoter groups, PPPs, healthcare systems.",
  },
  {
    code: "04",
    label: "Phase IV",
    region: "Global South",
    detail: "South Asia · SEA · Middle East · Africa · LATAM · Eastern Europe.",
  },
];

export default function Market() {
  return (
    <section
      id="market"
      data-testid="market-section"
      className="relative bg-[color:var(--tx-cream)] text-[color:var(--tx-ink)] border-t border-[color:var(--tx-line)]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="md:col-span-7">
            <div className="eyebrow mb-6">07 · Market Opportunity</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              Starting in Northeast India.
              <br />
              <span className="italic">Scaling to the Global South.</span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              Every phase is a live proving ground for the next. The playbook
              hardens with each corridor.
            </p>
          </div>
        </div>

        <div className="relative border-t border-[color:var(--tx-line)]">
          {phases.map((p, i) => (
            <motion.div
              key={p.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              data-testid={`market-phase-${i + 1}`}
              className="grid md:grid-cols-12 gap-6 py-8 md:py-10 border-b border-[color:var(--tx-line)] items-baseline group"
            >
              <div className="md:col-span-1 font-mono text-[12px] tracking-widest uppercase text-[color:var(--tx-muted)] group-hover:text-[color:var(--tx-accent)] transition-colors">
                {p.code}
              </div>
              <div className="md:col-span-2 eyebrow">{p.label}</div>
              <div className="md:col-span-4 font-serif text-[26px] md:text-[32px] tracking-tight leading-tight">
                {p.region}
              </div>
              <div className="md:col-span-5 text-[14.5px] text-[color:var(--tx-ink)]/70 leading-relaxed">
                {p.detail}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
