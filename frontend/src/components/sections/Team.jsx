import { motion } from "framer-motion";

const team = [
  {
    name: "Sudipta Koushik Sarmah",
    role: "Founder & CEO",
    portrait:
      "https://images.pexels.com/photos/7580994/pexels-photo-7580994.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    bullets: [
      "9 years enterprise banking · SBI · HDFC · 8 states",
      "Founder — NEPDSI-C · 865K+ views · 12K+ followers",
      "15+ expert networks · 8 AI partnerships",
      "Mentor · Startup World Cup · ADPlist",
    ],
  },
  {
    name: "Ritashree Mahanta",
    role: "Co-Founder & COO",
    portrait:
      "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMGluZGlhbiUyMHdvbWFufGVufDB8fHx8MTc4MzY1ODI1OHww&ixlib=rb-4.1.0&q=85",
    bullets: [
      "Masters in Community Health · 2× published",
      "6+ years — research · NGO · compliance · public health",
      "Domain lead for regulated healthcare & social sector",
      "Clinical: ICU · CCU · Critical Care",
    ],
  },
  {
    name: "Ananya Singhal",
    role: "Head of Strategy",
    portrait:
      "https://images.unsplash.com/photo-1581065178047-8ee15951ede6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMGluZGlhbiUyMHdvbWFufGVufDB8fHx8MTc4MzY1ODI1OHww&ixlib=rb-4.1.0&q=85",
    bullets: [
      "BBA LLB · NLU Odisha · MBA · MDI Gurgaon",
      "8+ years — regulatory · treasury · startup strategy",
      "GTM design & partnerships",
      "120+ enterprise EdTech materials shipped",
    ],
  },
];

export default function Team() {
  return (
    <section
      id="team"
      data-testid="team-section"
      className="relative bg-[color:var(--tx-cream)] text-[color:var(--tx-ink)] border-t border-[color:var(--tx-line)]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="md:col-span-8">
            <div className="eyebrow mb-6">09 · Team</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              Operators who <span className="italic">shipped inside</span> the
              buyer.
            </h2>
          </div>
          <div className="md:col-span-4">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              Every founding team member has run high-trust programs inside the
              exact institutions we now sell to. Zero salaries, no consultants,
              no outsourcing — founder-built.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {team.map((t, i) => (
            <motion.article
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              data-testid={`team-member-${i + 1}`}
              className="bg-white border border-[color:var(--tx-line)] group"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--tx-cream-2)]">
                <img
                  src={t.portrait}
                  alt={t.name}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-[1.03]"
                />
                <div className="absolute top-4 left-4 font-mono text-[11px] tracking-widest uppercase text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1">
                  0{i + 1}
                </div>
              </div>
              <div className="p-6 md:p-7">
                <h3 className="font-serif text-[24px] tracking-tight leading-tight">
                  {t.name}
                </h3>
                <div className="mt-1 eyebrow">{t.role}</div>
                <ul className="mt-5 space-y-2 text-[13.5px] text-[color:var(--tx-ink)]/75">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <span className="mt-2 w-1 h-1 bg-[color:var(--tx-blue)] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-[color:var(--tx-line)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="eyebrow">Advisers · pre-formalized</div>
          <div className="text-[14.5px] text-[color:var(--tx-ink)]/75 max-w-2xl">
            Retired senior IAS officer · ESSEC Ph.D tech professor (Australian
            University Dubai campus) — with strategic partners providing warm
            access to 200–300 target enterprises in DIFC/ADGM and adjacent
            markets.
          </div>
        </div>
      </div>
    </section>
  );
}
