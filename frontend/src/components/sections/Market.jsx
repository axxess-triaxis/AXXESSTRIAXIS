import { motion } from "framer-motion";

const phases = [
  {
    code: "01",
    label: "Beachhead",
    region: "DIFC & ADGM",
    detail:
      "Sovereign free zones with common-law rails, deep enterprise budgets and regulator appetite for AI-native infrastructure.",
  },
  {
    code: "02",
    label: "Adjacent",
    region: "GIFT City · Riyadh · Doha · Singapore",
    detail:
      "Copy-paste the regulatory playbook — every free zone is a fresh, high-ACV market with the same buyer archetype.",
  },
  {
    code: "03",
    label: "Global South",
    region: "India · SEA · MENA · Africa · LATAM",
    detail:
      "Sovereign markets that skipped legacy SaaS entirely. Multilingual, mobile-first, governance-native by default.",
  },
  {
    code: "04",
    label: "Category",
    region: "Sovereign Enterprise AI",
    detail:
      "By product 03, Triaxis is the default AI operating stack for the world's regulated markets — a new software category.",
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
            <div className="eyebrow mb-6">07 · Go-To-Market</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              DIFC and ADGM first.
              <br />
              <span className="italic">Sovereign enterprise, everywhere next.</span>
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              Every phase is a proving ground for the next. The regulatory
              playbook hardens with each jurisdiction — that&apos;s the moat.
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
              <div className="md:col-span-1 font-mono text-[12px] tracking-widest uppercase text-[color:var(--tx-muted)] group-hover:text-[color:var(--tx-blue)] transition-colors">
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
