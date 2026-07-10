import { motion } from "framer-motion";

const problems = [
  {
    n: "I",
    title: "Off-the-shelf SaaS breaks at the sovereign perimeter",
    body:
      "Regulated enterprises in DIFC, ADGM, GIFT City and the Global South can't buy US-cloud SaaS without governance, residency, and audit gaps that kill deals.",
  },
  {
    n: "II",
    title: "Generic LLMs fail in high-stakes institutional work",
    body:
      "Enterprise AI hallucinates, leaks context across tenants, and can't reason through multilingual, semi-formal, politically sensitive workflows.",
  },
  {
    n: "III",
    title: "No AI-native operator has built for this wedge",
    body:
      "The world's fastest-growing regulated markets are still buying 2010-era workflow tools stitched with email. The category is unbuilt — and category-defining.",
  },
];

export default function Problem() {
  return (
    <section
      id="problem"
      data-testid="problem-section"
      className="relative bg-[color:var(--tx-cream)] text-[color:var(--tx-ink)]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="eyebrow mb-6">02 · The Category</div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-[38px] md:text-[52px] leading-[1.04] tracking-tight"
            >
              Sovereign enterprise is a{" "}
              <span className="italic">$300B+ software market</span>{" "}
              nobody has shipped for.
            </motion.h2>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <p className="text-[16.5px] leading-relaxed text-[color:var(--tx-ink)]/75 max-w-xl">
              Financial free zones, sovereign wealth vehicles, ministries and
              regulated enterprises across DIFC · ADGM · GIFT City · Riyadh ·
              Doha · Nairobi · Singapore run mission-critical workflows on
              WhatsApp, PDFs and Excel. They can&apos;t buy off-the-shelf SaaS.
              They will pay for software that is AI-native, governed and
              sovereign by design.
            </p>

            <div className="mt-12 grid gap-6">
              {problems.map((p, i) => (
                <motion.article
                  key={p.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  data-testid={`problem-card-${i + 1}`}
                  className="group relative flex gap-6 items-start pt-6 border-t border-[color:var(--tx-line)]"
                >
                  <div className="font-mono text-[12px] tracking-widest text-[color:var(--tx-muted)] pt-1 w-8">
                    {p.n}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-[22px] md:text-[26px] leading-tight tracking-tight">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--tx-ink)]/70 max-w-lg">
                      {p.body}
                    </p>
                  </div>
                  <div className="hidden md:block text-[color:var(--tx-muted)] group-hover:text-[color:var(--tx-ink)] transition-colors text-xl">
                    ↗
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
