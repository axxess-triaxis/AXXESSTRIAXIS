import { useEffect, useState } from "react";
import { ASSETS, LINKS } from "@/lib/brand";

const links = [
  { label: "Products", href: "#products" },
  { label: "Beta", href: "#beta" },
  { label: "Pricing", href: "#pricing" },
  { label: "Traction", href: "#traction" },
  { label: "Team", href: "#team" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      data-testid="site-nav"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[color:var(--tx-cream)]/85 backdrop-blur-md border-b border-[color:var(--tx-line)] text-[color:var(--tx-ink)]"
          : "bg-transparent text-white"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <a
          href="#top"
          data-testid="nav-logo"
          className="flex items-center gap-3 group"
        >
          <span
            className={`relative inline-flex w-9 h-9 rounded-md overflow-hidden ${
              scrolled ? "bg-white" : "bg-white"
            }`}
            style={{
              backgroundImage: `url(${ASSETS.brandTriaxis})`,
              backgroundSize: "auto 260%",
              backgroundPosition: "18% 50%",
              backgroundRepeat: "no-repeat",
            }}
            aria-label="Triaxis Ventures"
          />
          <span className="font-serif text-[19px] tracking-tight leading-none">
            Triaxis
            <span className={scrolled ? "text-[color:var(--tx-muted)]" : "text-white/55"}>
              {" "}
              Ventures
            </span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-testid={`nav-link-${l.label.toLowerCase()}`}
              className={`text-[13.5px] transition-colors link-underline ${
                scrolled
                  ? "text-[color:var(--tx-ink)]/80 hover:text-[color:var(--tx-ink)]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            data-testid="nav-github"
            aria-label="GitHub repository"
            className={`hidden sm:inline-flex items-center justify-center w-9 h-9 border transition-colors rounded-sm ${
              scrolled
                ? "border-[color:var(--tx-line)] hover:border-[color:var(--tx-ink)] text-[color:var(--tx-ink)]"
                : "border-white/25 hover:border-white text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.11-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.79.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </a>
          <a
            href="#contact"
            data-testid="nav-cta"
            className={`hidden sm:inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 border transition-colors rounded-sm ${
              scrolled
                ? "text-[color:var(--tx-ink)] border-[color:var(--tx-line)] hover:border-[color:var(--tx-ink)] bg-white"
                : "text-black border-white bg-white hover:bg-white/90"
            }`}
          >
            Talk to us
            <span aria-hidden>→</span>
          </a>
          <button
            data-testid="nav-mobile-toggle"
            onClick={() => setOpen((v) => !v)}
            className={`md:hidden w-9 h-9 inline-flex items-center justify-center border rounded-sm ${
              scrolled ? "border-[color:var(--tx-line)]" : "border-white/30"
            }`}
            aria-label="Menu"
          >
            <span className="block w-4 h-px bg-current relative before:content-[''] before:absolute before:-top-1.5 before:left-0 before:w-4 before:h-px before:bg-current after:content-[''] after:absolute after:top-1.5 after:left-0 after:w-4 after:h-px after:bg-current" />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[color:var(--tx-line)] bg-[color:var(--tx-cream)] text-[color:var(--tx-ink)]">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                data-testid={`nav-mobile-link-${l.label.toLowerCase()}`}
                className="text-[15px] py-2 border-b border-[color:var(--tx-line)]"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center bg-black text-white px-4 py-3 rounded-sm text-[14px] font-medium"
            >
              Talk to us
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
