import { VideoShowreel } from "../components/marketing/VideoShowreel";

const productLinks = [
  {
    label: "Welcome Aboard",
    href: "https://landing.triaxisventures.com",
    style: "bg-[#00c2ff] text-[#02050a] hover:bg-[#6dff6a]",
  },
  {
    label: "Experience AXXESS",
    href: "https://investor.triaxisventures.com",
    style: "border border-[#00c2ff]/45 bg-[#07111d]/85 text-[#e6f7ff] hover:border-[#6dff6a]/70 hover:text-[#6dff6a]",
  },
  {
    label: "Stay Lite (for now)",
    href: "https://lite.triaxisventures.com",
    style: "border border-[#00c2ff]/45 bg-[#07111d]/85 text-[#e6f7ff] hover:border-[#6dff6a]/70 hover:text-[#6dff6a]",
  },
];

const companyLinks = [
  { label: "AXXESS TRIaxis", href: "/axxess-triaxis" },
  { label: "Founders", href: "/founders" },
  { label: "Pricing & Plans", href: "/pricing-plans" },
  { label: "Who We Build For", href: "/who-we-build-for" },
  { label: "Why It Disrupts", href: "/why-axxess-is-disruptive" },
  { label: "Global South", href: "/global-south" },
  { label: "Privacy", href: "/privacy" },
];

const promoVideos = [
  { title: "Triaxis Ventures promo 1", src: "/media/triaxis-promo-veo-1.mp4" },
  { title: "Triaxis Ventures promo 2", src: "/media/triaxis-promo-veo-2.mp4" },
  { title: "AXXESS TRIaxis promo", src: "/media/triaxis-promo-gemini.mp4" },
];

export default function HomePage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:py-16">
        <div className="flex flex-col gap-8">
          <nav className="flex flex-wrap items-center gap-3" aria-label="Company pages">
            <span className="inline-flex rounded-full border border-[#d8e2d2] bg-[#f7fbf3] px-4 py-1 text-sm font-medium text-[#426531]">
              Triaxis Ventures
            </span>
            {companyLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b] transition hover:bg-[#eef2f6]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Triaxis Ventures builds governed AI products for work.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              Triaxis Ventures Private Limited is an India-based company building AXXESS TRIaxis:
              an AI-native operating layer for enterprises, public-sector bodies, NGOs, MSMEs,
              startups and mid-sized businesses.
            </p>
          </div>

          <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#d6dee8] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6c7a89]">
                Based in
              </p>
              <p className="mt-2 text-base font-semibold leading-6 text-[#172231]">
                India, building for India, the GCC, and the Global South
              </p>
            </div>
            <div className="rounded-lg border border-[#d6dee8] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6c7a89]">
                Ownership
              </p>
              <p className="mt-2 text-base font-semibold leading-6 text-[#172231]">
                Founder-led private company; AXXESS TRIaxis is owned and operated by Triaxis Ventures Private Limited
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {productLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${link.style}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <aside className="grid gap-5">
          <div className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-[#526273]">Triaxis Ventures</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/triaxis-ventures-logo.png"
              alt="Triaxis Ventures logo"
              width={1254}
              height={1254}
              className="mx-auto aspect-square w-full max-w-sm rounded-lg bg-black object-cover"
            />
          </div>
          <div className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-[#526273]">AXXESS TRIaxis</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/axxess-logo.png"
              alt="AXXESS TRIaxis logo"
              width={1254}
              height={1254}
              className="mx-auto aspect-square w-full max-w-sm rounded-lg bg-black object-cover"
            />
          </div>
        </aside>
      </section>

      <section className="border-y border-[#dde5ee] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2 md:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
              What Triaxis Ventures is
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#111827]">
              The company behind the AXXESS product family.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#4a5a6a]">
              Triaxis Ventures focuses on strategy, intelligence, governance and impact software.
              Its first product is AXXESS TRIaxis, with enterprise, demo and lite surfaces kept
              separate for different buyer and user needs.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
              Where to go next
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {companyLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-[#d6dee8] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#243244] transition hover:bg-[#eef2f6]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2 md:px-10">
        <div className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
              AXXESS TRIaxis demo
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#111827]">Watch the product in motion.</h2>
          </div>
          <video
            aria-label="AXXESS TRIaxis product demo"
            className="aspect-video w-full rounded-lg bg-black object-cover"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          >
            <source src="/media/axxess-triaxis-demo.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
              AXXESS showreel
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#111827]">One window, three looping clips.</h2>
          </div>
          <VideoShowreel videos={promoVideos} label="AXXESS looping promo showreel" />
        </div>
      </section>

      <section
        aria-label="Join the AXXESS waitlist"
        className="mx-auto max-w-7xl px-6 pb-16 md:px-10"
      >
        <div className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
          <div className="launchlist-widget" data-key-id="ICROoX" />
          <a
            href="https://launch.li/p/axxess-triaxis-founders-club-edition"
            className="mt-4 block text-sm font-medium text-[#8b1e2d] underline decoration-[#8b1e2d]/40 underline-offset-4 transition hover:text-[#741927]"
          >
            Join the AXXESS TRIaxis Founders Club waitlist.
          </a>
        </div>
      </section>
    </main>
  );
}
