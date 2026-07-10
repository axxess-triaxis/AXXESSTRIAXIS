import { motion } from "framer-motion";

const problems = [
  {
    n: "I",
    title: "Coordination Overload",
    body:
      "Fragmented stakeholders across languages, regulations, and informal networks. No unified operating layer exists.",
  },
  {
    n: "II",
    title: "No Safe AI for Context",
    body:
      "Enterprise AI fails in multilingual, semi-formal, politically sensitive environments where nuance is non-negotiable.",
  },
  {
    n: "III",
    title: "Scaling Destroys Trust",
    body:
      "Traditional consulting layers erode discretion and institutional continuity as mandates grow in complexity.",
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
          <div className="md:col-span-4">
            <div className="eyebrow mb-6">02 · The Problem</div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-[38px] md:text-[52px] leading-[1.04] tracking-tight"
            >
              Institutional India is{" "}
              <span className="italic">operationally complex</span> and{" "}
              <span className="text-[color:var(--tx-accent)]">dangerously underserved.</span>
            </motion.h2>
          </div>

          <div className="md:col-span-7 md:col-start-6">
            <p className="text-[16.5px] leading-relaxed text-[color:var(--tx-ink)]/75 max-w-xl">
              A generation of institutions — ministries, hospitals, NGOs, family
              offices, PPPs, promoter groups — run on WhatsApp threads, PDFs and
              tribal knowledge. Off-the-shelf enterprise AI wasn&apos;t built for
              their reality.
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
