import { ASSETS, LINKS } from "@/lib/brand";

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
              ["Live beta", "#beta"],
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
            href={LINKS.betaApp}
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

          <div className="mt-8 eyebrow-dark">Open source</div>
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            data-testid="footer-github-link"
            className="mt-2 inline-flex items-center gap-2 text-[14px] text-white/80 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.11-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.79.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
            </svg>
            axxess-triaxis / AXXESSTRIAXIS ↗
          </a>

          <div className="mt-8 eyebrow-dark">Contact</div>
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
