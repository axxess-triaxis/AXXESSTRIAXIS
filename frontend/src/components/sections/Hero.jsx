import { motion } from "framer-motion";
import { ASSETS } from "@/lib/brand";
import WaitlistCard from "@/components/WaitlistCard";

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
            "radial-gradient(1200px 600px at 80% 20%, rgba(59,130,246,0.18), transparent 60%), radial-gradient(900px 500px at 10% 90%, rgba(59,130,246,0.10), transparent 60%)",
        }}
        aria-hidden
      />

      {/* Watermark — AXXESS icon */}
      <img
        src={ASSETS.axxessIcon}
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -right-24 -top-24 w-[560px] opacity-[0.10] blur-[1px]"
      />
      <img
        src={ASSETS.axxessIcon}
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -left-40 bottom-[-160px] w-[420px] opacity-[0.06] rotate-12"
      />

      <div className="noise-overlay" aria-hidden />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 pt-36 md:pt-40 pb-24 md:pb-32">
        {/* Top status bar */}
        <div className="flex items-center justify-between mb-14 md:mb-20">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-widest text-white/60 uppercase">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-dot" />
            Public enterprise beta · Live now · iOS & Android · July 2026
          </div>
          <div className="hidden md:block font-mono text-[11px] tracking-widest text-white/50 uppercase">
            FY 2026 — 2029 · Product-First
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
              01 · The venture studio for sovereign-grade AI software
            </div>
            <h1 className="font-serif font-light text-white text-[46px] leading-[1.02] sm:text-[64px] lg:text-[84px] tracking-tight">
              Building the{" "}
              <span className="italic text-white/95">AI operating stack</span>{" "}
              for regulated enterprises and{" "}
              <span className="text-[color:var(--tx-blue)]">sovereign institutions.</span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-4"
          >
            <p className="text-[15.5px] leading-relaxed text-white/70 max-w-md">
              Triaxis Ventures is a product-first venture studio building AI
              Enterprise SaaS and GovTech for high-trust jurisdictions — DIFC,
              ADGM and the emerging sovereign markets that traditional SaaS
              can&apos;t serve.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#products"
                data-testid="hero-cta-primary"
                className="inline-flex items-center gap-2 text-[14px] font-medium bg-white text-black px-5 py-3 hover:bg-white/90 transition-colors rounded-sm"
              >
                See our products
                <span aria-hidden>→</span>
              </a>
              <a
                href="#contact"
                data-testid="hero-cta-secondary"
                className="inline-flex items-center gap-2 text-[14px] font-medium text-white/90 px-5 py-3 border border-white/25 hover:border-white transition-colors rounded-sm"
              >
                Investor deck ↗
              </a>
            </div>

            <div className="mt-6">
              <WaitlistCard />
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
              ["Enterprise trust", "100%"],
              ["Burn to validation", "< $1K"],
            ].map(([label, value]) => (
              <div
                key={label}
                data-testid={`hero-metric-${label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="eyebrow-dark">{label}</div>
                <div className="mt-3 font-serif text-white text-[40px] md:text-[54px] leading-none tracking-tight">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Distribution / product strip */}
        <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 text-white/40">
          <span className="font-mono text-[10.5px] tracking-widest uppercase">
            Shipping now
          </span>
          {[
            "AXXESS · Enterprise beta",
            "iOS · July 2026",
            "Android · July 2026",
            "DIFC & ADGM · Onboarding",
            "5-Tier Enterprise Model",
          ].map((n) => (
            <span
              key={n}
              className="font-serif text-[15px] md:text-[17px] tracking-tight text-white/55"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* bottom scanline */}
      <div className="relative h-px w-full bg-white/10 scanline overflow-hidden" />
    </section>
  );
}
