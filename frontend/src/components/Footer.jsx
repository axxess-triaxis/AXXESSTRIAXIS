import { ASSETS } from "@/lib/brand";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      data-testid="site-footer"
      className="relative bg-[color:var(--tx-ink-2)] text-[#EAEAEA]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3 text-white">
            <span
              className="inline-flex w-10 h-10 rounded-md bg-white overflow-hidden"
              style={{
                backgroundImage: `url(${ASSETS.brandTriaxis})`,
                backgroundSize: "auto 260%",
                backgroundPosition: "18% 50%",
                backgroundRepeat: "no-repeat",
              }}
              aria-label="Triaxis Ventures"
            />
            <span className="font-serif text-[22px]">Triaxis Ventures</span>
          </div>
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-white/60">
            A product-first venture studio building AI Enterprise SaaS and
            GovTech for regulated enterprises and sovereign institutions —
            starting in DIFC and ADGM.
          </p>
          <div className="mt-8 eyebrow-dark">Registered</div>
          <div className="mt-2 text-[14px] text-white/80 leading-relaxed">
            Guwahati, Assam · India
            <br />
            <span className="text-white/50">
              Establishing DIFC & ADGM presence · 2026
            </span>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="eyebrow-dark">Explore</div>
          <ul className="mt-4 space-y-2.5 text-[14px]">
            {[
              ["Category", "#problem"],
              ["Thesis", "#thesis"],
              ["Products", "#products"],
              ["Market", "#market"],
              ["Signal", "#traction"],
              ["Team", "#team"],
              ["Contact", "#contact"],
            ].map(([l, h]) => (
              <li key={h}>
                <a
                  href={h}
                  className="text-white/75 hover:text-white transition-colors"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <div className="eyebrow-dark">Product 01</div>
          <a
            href="https://axxesstriaxis.vercel.app"
            target="_blank"
            rel="noreferrer"
            data-testid="footer-axxess-link"
            className="mt-4 inline-flex items-center gap-3 border border-white/20 hover:border-white transition-colors px-4 py-3 group"
          >
            <img
              src={ASSETS.axxessIcon}
              alt="AXXESS"
              className="w-8 h-8 rounded-sm"
            />
            <div className="flex flex-col leading-none">
              <span className="font-serif text-[17px] text-white">
                Open AXXESS ↗
              </span>
              <span className="mt-1 font-mono text-[10.5px] tracking-widest uppercase text-white/50">
                Enterprise beta · iOS + Android · Jul 2026
              </span>
            </div>
          </a>

          <div className="mt-10 eyebrow-dark">Contact</div>
          <div className="mt-2 text-[14px] text-white/80 space-y-1">
            <div>investors@triaxisventures.com</div>
            <div>enterprise@triaxisventures.com</div>
            <div>press@triaxisventures.com</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[12px] font-mono uppercase tracking-wider text-white/50">
          <div>© {year} Triaxis Ventures · All rights reserved</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-dot" />
            System operational · FY 2026–29
          </div>
        </div>
      </div>
    </footer>
  );
}
