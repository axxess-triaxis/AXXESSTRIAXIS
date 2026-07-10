export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      data-testid="site-footer"
      className="relative bg-[color:var(--tx-ink-2)] text-[#EAEAEA]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5 text-white">
            <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
              <path d="M14 3 L25 22 L3 22 Z" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="14" cy="22" r="1.6" fill="currentColor" />
            </svg>
            <span className="font-serif text-[20px]">Triaxis Ventures</span>
          </div>
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-white/60">
            AI-Enabled Human-in-the-Loop Institutional Operating Infrastructure
            for Emerging Markets. Built ground-up from Guwahati, Assam — for the
            Global South.
          </p>
          <div className="mt-8 eyebrow-dark">Registered address</div>
          <div className="mt-2 text-[14px] text-white/80 leading-relaxed">
            TriAxis Group<br />
            Guwahati, Assam · India
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="eyebrow-dark">Sections</div>
          <ul className="mt-4 space-y-2.5 text-[14px]">
            {[
              ["The Problem", "#problem"],
              ["Five-Axis Framework", "#framework"],
              ["AXXESS Platform", "#platform"],
              ["Market Opportunity", "#market"],
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
          <div className="eyebrow-dark">Product</div>
          <a
            href="https://axxesstriaxis.vercel.app"
            target="_blank"
            rel="noreferrer"
            data-testid="footer-axxess-link"
            className="mt-4 inline-flex items-center gap-2 text-[15px] font-medium border border-white/20 px-4 py-2.5 hover:border-white transition-colors"
          >
            Open AXXESS
            <span aria-hidden>↗</span>
          </a>

          <div className="mt-10 eyebrow-dark">Contact</div>
          <div className="mt-2 text-[14px] text-white/80 space-y-1">
            <div>hello@triaxisventures.com</div>
            <div>investors@triaxisventures.com</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[12px] font-mono uppercase tracking-wider text-white/50">
          <div>© {year} TriAxis Ventures · All rights reserved</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-dot" />
            System operational · FY 2026–29
          </div>
        </div>
      </div>
    </footer>
  );
}
