import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      id="top"
      data-testid="hero-section"
      className="relative bg-[color:var(--tx-ink-2)] text-white overflow-hidden"
    >
      {/* grid background */}
      <div className="absolute inset-0 bg-grid-dark opacity-70" aria-hidden />
      {/* radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 80% 20%, rgba(59,130,246,0.14), transparent 60%), radial-gradient(900px 500px at 10% 90%, rgba(201,95,59,0.12), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="noise-overlay" aria-hidden />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 pt-36 md:pt-40 pb-24 md:pb-32">
        {/* Top status bar */}
        <div className="flex items-center justify-between mb-14 md:mb-20">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest text-white/60 uppercase">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-dot" />
            AXXESS · Live prototype · Guwahati, Assam
          </div>
          <div className="hidden md:block font-mono text-[11px] tracking-widest text-white/50 uppercase">
            FY 2026 — 2029
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-10 items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-8"
          >
            <div className="eyebrow-dark mb-6">
              01 · Institutional Infrastructure for Emerging Markets
            </div>
            <h1 className="font-serif font-light text-white text-[46px] leading-[1.02] sm:text-[64px] lg:text-[84px] tracking-tight">
              AI-Enabled,{" "}
              <span className="italic text-white/90">Human-in-the-Loop</span>{" "}
              operating infrastructure for the{" "}
              <span className="text-[color:var(--tx-warm)]">Global South.</span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-4"
          >
            <p className="text-[15.5px] leading-relaxed text-white/70 max-w-md">
              Triaxis Ventures builds AXXESS — a governed AI workspace that turns
              projects, documents, decisions, stakeholders, meetings, risks and
              approvals into an auditable execution layer for enterprise,
              government, healthcare and consulting institutions.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#framework"
                data-testid="hero-cta-primary"
                className="inline-flex items-center gap-2 text-[14px] font-medium bg-white text-black px-5 py-3 hover:bg-white/90 transition-colors rounded-sm"
              >
                Explore the framework
                <span aria-hidden>→</span>
              </a>
              <a
                href="https://axxesstriaxis.vercel.app"
                target="_blank"
                rel="noreferrer"
                data-testid="hero-cta-secondary"
                className="inline-flex items-center gap-2 text-[14px] font-medium text-white/90 px-5 py-3 border border-white/25 hover:border-white transition-colors rounded-sm"
              >
                See AXXESS in action ↗
              </a>
            </div>
          </motion.div>
        </div>

        {/* Metrics strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="mt-24 md:mt-32 border-t border-white/10 pt-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              ["Automation", "80%"],
              ["Human judgment", "20%"],
              ["Institutional trust", "100%"],
              ["Founder burn", "< $1K"],
            ].map(([label, value]) => (
              <div key={label} data-testid={`hero-metric-${label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="eyebrow-dark">{label}</div>
                <div className="mt-3 font-serif text-white text-[40px] md:text-[54px] leading-none tracking-tight">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* bottom scanline */}
      <div className="relative h-px w-full bg-white/10 scanline overflow-hidden" />
    </section>
  );
}
