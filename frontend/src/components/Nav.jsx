import { useEffect, useState } from "react";
import { ASSETS } from "@/lib/brand";

const links = [
  { label: "Products", href: "#products" },
  { label: "Platform", href: "#platform" },
  { label: "Thesis", href: "#thesis" },
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
