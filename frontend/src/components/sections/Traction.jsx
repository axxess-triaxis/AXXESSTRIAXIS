import { motion } from "framer-motion";

const metrics = [
  { value: "15+", label: "Enterprise discovery interviews · < 6 months to signal" },
  { value: "06", label: "Design partners · one paying enterprise anchor secured" },
  { value: "15+", label: "Expert networks empaneled · GLG · AlphaSense · Catalant" },
  { value: "20+", label: "Senior stakeholder meetings · govt · CXO · promoter groups" },
  { value: "04", label: "Strategic partnerships · access to 200–300 target enterprises" },
  { value: "1.2M+", label: "Owned distribution · 12K+ followers · daily inbound" },
];

const accelerators = [
  "AXXESS · Enterprise beta shipped",
  "iOS & Android — releasing July 2026",
  "Founder Institute · Hyderabad 2026",
  "iCreate Idea Catalyst Residency",
  "Innopreneurs S13 · Top 100",
  "DGEMS Select 200 · Forbes India",
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
            <div className="eyebrow mb-6">08 · Signal</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              Incorporation to design partners.
              <br />
              <span className="italic">Under $1,000 in burn.</span>
            </h2>
          </div>
          <div className="md:col-span-4">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              Capital-efficient by design. Product-first. Distribution
              accumulating before the seed round.
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

        {/* Program selections */}
        <div className="mt-16">
          <div className="eyebrow mb-6">Product & program milestones</div>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
            {accelerators.map((a) => (
              <div
                key={a}
                className="flex items-center gap-4 py-3 border-b border-[color:var(--tx-line)]"
              >
                <span className="w-1.5 h-1.5 bg-[color:var(--tx-blue)]" />
                <span className="text-[15px]">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
