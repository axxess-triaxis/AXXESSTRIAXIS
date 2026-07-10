import { motion } from "framer-motion";
import { ASSETS } from "@/lib/brand";

const layers = [
  {
    code: "L06",
    id: "CCAF",
    name: "Controlled Contextual Autonomy",
    role: "Modulates automation by confidentiality tier.",
  },
  {
    code: "L05",
    id: "SIMA",
    name: "Segregated Institutional Memory",
    role: "Prevents memory bleed across tenants.",
  },
  {
    code: "L04",
    id: "AGLAE",
    name: "Adaptive Governance-Layered AI",
    role: "Adapts to local law and regulator posture.",
  },
  {
    code: "L03",
    id: "CHLIS",
    name: "Compartmentalized HITL Inference",
    role: "Human-supervised strategic override on every layer.",
  },
  {
    code: "L02",
    id: "SSIA",
    name: "Sovereign Sandbox Intelligence",
    role: "Localized operational logic per jurisdiction.",
  },
  {
    code: "L01",
    id: "CICE",
    name: "Context-Isolated Cognitive Environments",
    role: "Prevents cross-stakeholder contamination.",
  },
];

const upcoming = [
  {
    code: "P-02",
    name: "SOVEREIGN LEDGER",
    tag: "IN R&D",
    body: "Regulator-facing AI for financial free zones. Live reporting, filings, exemptions.",
  },
  {
    code: "P-03",
    name: "TRIAXIS HEALTH OS",
    tag: "DESIGN",
    body: "Institutional operating system for public-sector healthcare and CSR trusts.",
  },
  {
    code: "P-04",
    name: "CONFIDENTIAL COPILOT",
    tag: "CONCEPT",
    body: "On-prem LLM copilot for sovereign wealth vehicles and family offices.",
  },
];

export default function AxxessPlatform() {
  return (
    <section
      id="platform"
      data-testid="platform-section"
      className="relative bg-[color:var(--tx-ink-2)] text-white overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid-dark opacity-70" aria-hidden />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 500px at 20% 10%, rgba(59,130,246,0.16), transparent 60%)",
        }}
        aria-hidden
      />
      {/* Watermark AXXESS icon */}
      <img
        src={ASSETS.axxessIcon}
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -right-40 top-24 w-[520px] opacity-[0.07]"
      />
      <div className="noise-overlay" aria-hidden />

      <div id="products" className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="md:col-span-7">
            <div className="eyebrow-dark mb-6">05 · Product 01 · Shipping</div>
            <div className="flex items-center gap-4 mb-6">
              <img
                src={ASSETS.axxessIcon}
                alt="AXXESS"
                className="w-14 h-14 rounded-lg"
              />
              <span className="font-mono text-[11px] tracking-widest text-white/50 uppercase">
                axxess.triaxis · enterprise beta · live
              </span>
            </div>
            <h2 className="font-serif font-light text-[40px] md:text-[60px] leading-[1.04] tracking-tight text-white">
              AXXESS — the{" "}
              <span className="italic text-white/85">sovereign AI workspace</span>{" "}
              for regulated enterprises.
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[15.5px] leading-relaxed text-white/70">
              A six-layer governed AI operating system for enterprise,
              government and healthcare institutions. Purpose-built for
              DIFC/ADGM-grade sovereignty. Public enterprise beta shipping now;
              iOS and Android releasing July 2026.
            </p>
            <a
              href="https://axxesstriaxis.vercel.app"
              target="_blank"
              rel="noreferrer"
              data-testid="platform-open-axxess"
              className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-white border border-white/25 hover:border-white transition-colors px-4 py-2.5"
            >
              Open the enterprise beta
              <span aria-hidden>↗</span>
            </a>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="font-mono text-[10.5px] px-2 py-1 border border-white/20 text-white/75 rounded-sm tracking-widest uppercase">
                iOS · Jul 2026
              </span>
              <span className="font-mono text-[10.5px] px-2 py-1 border border-white/20 text-white/75 rounded-sm tracking-widest uppercase">
                Android · Jul 2026
              </span>
              <span className="font-mono text-[10.5px] px-2 py-1 border border-emerald-400/30 text-emerald-300 rounded-sm tracking-widest uppercase">
                Web · Live
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          {/* Six-layer stack */}
          <div className="md:col-span-8">
            <div className="border border-white/12 bg-black/30 backdrop-blur-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/12">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 live-dot" />
                  <span className="font-mono text-[11px] tracking-widest text-white/60 uppercase">
                    axxess / architecture · enterprise beta
                  </span>
                </div>
                <div className="font-mono text-[11px] tracking-widest text-white/40 uppercase">
                  6 layers · isolated
                </div>
              </div>
              <ul>
                {layers.map((l, i) => (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    data-testid={`axxess-layer-${l.id.toLowerCase()}`}
                    className="grid grid-cols-12 items-center gap-4 px-5 py-5 border-b border-white/8 last:border-b-0 group hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="col-span-2 md:col-span-1 font-mono text-[11px] tracking-widest text-white/40 uppercase">
                      {l.code}
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <span className="inline-block font-mono text-[13px] px-2 py-1 border border-white/15 text-white/90 rounded-sm">
                        {l.id}
                      </span>
                    </div>
                    <div className="col-span-7 md:col-span-6">
                      <div className="font-serif text-[18px] md:text-[20px] tracking-tight text-white">
                        {l.name}
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-3 text-[13.5px] text-white/60 leading-snug">
                      {l.role}
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* Portfolio pipeline */}
          <div className="md:col-span-4 space-y-4">
            <div className="eyebrow-dark">Product pipeline</div>
            {upcoming.map((u) => (
              <div
                key={u.code}
                data-testid={`pipeline-${u.code.toLowerCase()}`}
                className="border border-white/12 bg-black/30 p-5 hover:border-white/30 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-widest text-white/40 uppercase">
                    {u.code}
                  </span>
                  <span className="font-mono text-[10.5px] tracking-widest uppercase text-[color:var(--tx-blue)] border border-[color:var(--tx-blue)]/50 px-2 py-0.5 rounded-sm">
                    {u.tag}
                  </span>
                </div>
                <div className="mt-4 font-serif text-[20px] tracking-tight text-white">
                  {u.name}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                  {u.body}
                </p>
              </div>
            ))}
            <div className="border-t border-white/10 pt-4 mt-2 font-mono text-[10.5px] tracking-widest uppercase text-white/40">
              Triaxis Ventures ships one governed AI product per year.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
