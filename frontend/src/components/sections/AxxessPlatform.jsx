import { motion } from "framer-motion";

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
    role: "Prevents memory bleed across stakeholders.",
  },
  {
    code: "L04",
    id: "AGLAE",
    name: "Adaptive Governance-Layered AI",
    role: "Adapts to local laws and political sensitivities.",
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
    role: "Localized operational logic for each jurisdiction.",
  },
  {
    code: "L01",
    id: "CICE",
    name: "Context-Isolated Cognitive Environments",
    role: "Prevents cross-stakeholder contamination.",
  },
];

const languages = [
  "Assamese",
  "Bengali",
  "Hindi",
  "Nepali",
  "Marwari",
  "English",
  "Hybrid-Code",
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
            "radial-gradient(1000px 500px at 20% 10%, rgba(59,130,246,0.14), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="noise-overlay" aria-hidden />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="md:col-span-7">
            <div className="eyebrow-dark mb-6">05 · The Platform</div>
            <h2 className="font-serif font-light text-[40px] md:text-[60px] leading-[1.04] tracking-tight text-white">
              AXXESS — six-layer{" "}
              <span className="italic text-white/85">institutional intelligence</span>{" "}
              engine.
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[15.5px] leading-relaxed text-white/70">
              Purpose-built for emerging-market institutional realities — not
              OECD workflows. Each layer is independent, permissioned and
              auditable.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          {/* left: stacked layers */}
          <div className="md:col-span-8">
            <div className="border border-white/12 bg-black/30 backdrop-blur-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/12">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 live-dot" />
                  <span className="font-mono text-[11px] tracking-widest text-white/60 uppercase">
                    axxess.triaxis / architecture
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

          {/* right: languages + tags */}
          <div className="md:col-span-4 space-y-6">
            <div className="border border-white/12 bg-black/30 p-6">
              <div className="eyebrow-dark mb-4">Language coverage</div>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <span
                    key={lang}
                    data-testid={`language-tag-${lang.toLowerCase()}`}
                    className="font-mono text-[12px] px-2.5 py-1 border border-white/20 text-white/85 rounded-sm"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
            <div className="border border-white/12 bg-black/30 p-6">
              <div className="eyebrow-dark mb-3">Design philosophy</div>
              <p className="text-[14px] leading-relaxed text-white/75">
                Each layer operates independently yet cohesively — so no
                stakeholder context bleeds into another. A non-negotiable
                requirement in politically sensitive, multilingual institutional
                environments.
              </p>
            </div>
            <a
              href="https://axxesstriaxis.vercel.app"
              target="_blank"
              rel="noreferrer"
              data-testid="platform-open-axxess"
              className="flex items-center justify-between border border-white/25 hover:border-white transition-colors p-5 group"
            >
              <div>
                <div className="eyebrow-dark">Investor preview</div>
                <div className="font-serif text-[22px] mt-2 text-white">
                  Open AXXESS live →
                </div>
              </div>
              <span className="font-mono text-[11px] text-white/50 group-hover:text-white/80 transition-colors uppercase tracking-widest">
                v0.8
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
