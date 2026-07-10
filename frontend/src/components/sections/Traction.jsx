import { motion } from "framer-motion";

const metrics = [
  { value: "15+", label: "Enterprise interviews · Customer discovery in <6 months" },
  { value: "06", label: "Pre-onboarding clients · 1 paying enterprise relationship" },
  { value: "15+", label: "Expert network empanelments · GLG, AlphaSense, Catalant +12" },
  { value: "20+", label: "Senior stakeholder meetings across govt, NGO, healthcare, CXOs" },
  { value: "04", label: "Strategic partnerships · Access to 200–300 institutional customers" },
  { value: "1.2M+", label: "Social media views · 12K+ followers · 1–2 daily inbound leads" },
];

const accelerators = [
  "Founder Institute Hyderabad · 2026 Cohort",
  "iCreate Idea Catalyst Residency",
  "Innopreneurs S13 · Top 100",
  "DGEMS Select 200 · Forbes India (awaiting nomination)",
  "Web Summit ecosystem discussions initiated",
];

export default function Traction() {
  return (
    <section
      id="traction"
      data-testid="traction-section"
      className="relative bg-white text-[color:var(--tx-ink)] border-t border-[color:var(--tx-line)]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="md:col-span-8">
            <div className="eyebrow mb-6">08 · Traction & Validation</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              Incorporation to validation.
              <br />
              <span className="italic">Under $1,000 founder burn.</span>
            </h2>
          </div>
          <div className="md:col-span-4">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              Day-one profitability. Zero external capital dependency. A signal,
              not a milestone.
            </p>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid md:grid-cols-3 border-t border-l border-[color:var(--tx-line)]">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.06 }}
              data-testid={`traction-metric-${i + 1}`}
              className="border-r border-b border-[color:var(--tx-line)] p-8 md:p-10 hover:bg-[color:var(--tx-cream)] transition-colors"
            >
              <div className="font-serif text-[56px] md:text-[68px] leading-none tracking-tighter">
                {m.value}
              </div>
              <p className="mt-5 text-[14px] leading-relaxed text-[color:var(--tx-ink)]/70">
                {m.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Accelerators marquee */}
        <div className="mt-16">
          <div className="eyebrow mb-6">Program selections</div>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
            {accelerators.map((a) => (
              <div
                key={a}
                className="flex items-center gap-4 py-3 border-b border-[color:var(--tx-line)]"
              >
                <span className="w-1.5 h-1.5 bg-[color:var(--tx-accent)]" />
                <span className="text-[15px]">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
