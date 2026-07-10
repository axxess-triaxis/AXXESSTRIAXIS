import { motion } from "framer-motion";

const pillars = [
  {
    pct: "80%",
    tag: "AUTOMATED BY AXXESS",
    color: "text-[color:var(--tx-ink)]",
    items: [
      "Workflow coordination & scheduling",
      "Multilingual communication drafting",
      "Reporting, compliance & documentation",
    ],
  },
  {
    pct: "20%",
    tag: "HUMAN-LED, ALWAYS",
    color: "text-[color:var(--tx-accent)]",
    items: [
      "Strategic negotiation & positioning",
      "Political coordination & judgment",
      "Crisis management & escalation",
    ],
  },
  {
    pct: "100%",
    tag: "INSTITUTIONAL TRUST",
    color: "text-[color:var(--tx-ink)]",
    items: [
      "Auditable, permissioned execution",
      "Discretion preserved across mandates",
      "Continuity across leadership cycles",
    ],
  },
];

export default function Solution() {
  return (
    <section
      id="solution"
      data-testid="solution-section"
      className="relative bg-[color:var(--tx-cream)] text-[color:var(--tx-ink)] border-t border-[color:var(--tx-line)]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-16 md:mb-24">
          <div className="md:col-span-8">
            <div className="eyebrow mb-6">04 · The Solution</div>
            <h2 className="font-serif text-[40px] md:text-[64px] leading-[1.02] tracking-tight">
              80% automation.{" "}
              <span className="italic">20% human judgment.</span>{" "}
              <span className="text-[color:var(--tx-accent)]">100% institutional trust.</span>
            </h2>
          </div>
          <div className="md:col-span-4 md:pt-4">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              We don&apos;t sell autonomous agents to institutions that can&apos;t
              afford to be wrong. AXXESS automates the volume; humans own the
              judgment. Every escalation is auditable.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border border-[color:var(--tx-line)]">
          {pillars.map((p, i) => (
            <motion.div
              key={p.pct}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              data-testid={`solution-pillar-${i + 1}`}
              className={`bg-white p-8 md:p-10 relative ${
                i > 0
                  ? "border-t md:border-t-0 md:border-l border-[color:var(--tx-line)]"
                  : ""
              }`}
            >
              <div className="eyebrow">{p.tag}</div>
              <div className={`mt-6 font-serif text-[88px] md:text-[112px] leading-none tracking-tighter ${p.color}`}>
                {p.pct}
              </div>
              <ul className="mt-8 space-y-3 text-[14.5px] text-[color:var(--tx-ink)]/80">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-3">
                    <span className="mt-2 w-1 h-1 bg-current shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
