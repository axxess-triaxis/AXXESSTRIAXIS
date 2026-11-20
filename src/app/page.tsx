import { VideoShowreel } from "../components/marketing/VideoShowreel";
import {
  bundleProducts,
  codersRankNote,
  codersRankUrl,
  githubProfileUrl,
  githubStats,
  githubStatsAsOf,
  vision,
  markets,
  foundersLivedIt,
} from "../components/marketing/siteFacts";

const productLinks = [
  {
    label: "Sign in to AXXESS",
    href: "https://landing.triaxisventures.com",
    style: "bg-[#00c2ff] text-[#02050a] hover:bg-[#6dff6a]",
  },
  {
    label: "Try the demo (no sign-in)",
    href: "https://investor.triaxisventures.com",
    style: "border border-[#00c2ff]/45 bg-[#07111d]/85 text-[#e6f7ff] hover:border-[#6dff6a]/70 hover:text-[#6dff6a]",
  },
  {
    label: "AXXESS Lite",
    href: "https://lite.triaxisventures.com",
    style: "border border-[#00c2ff]/45 bg-[#07111d]/85 text-[#e6f7ff] hover:border-[#6dff6a]/70 hover:text-[#6dff6a]",
  },
];

const companyLinks = [
  { label: "AXXESS TRIaxis", href: "/axxess-triaxis" },
  { label: "Founders", href: "/founders" },
  { label: "Pricing & Plans", href: "/pricing-plans" },
  { label: "Who We Build For", href: "/who-we-build-for" },
  { label: "How It Works", href: "/why-axxess-is-disruptive" },
  { label: "Where We Sell", href: "/global-south" },
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
              {vision}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              Small businesses, councils, clinics, corporates, non-profits and governments all lose
              work the same way. We start with the boring part: work that gets lost between email, WhatsApp, meetings
              and spreadsheets. AXXESS TRIaxis turns each piece of it into a decision. Yes, no or
              something else. There is no Dismiss button. AI agents do the follow-up, a person signs
              off on anything critical, and every action is logged.
            </p>
            <p className="max-w-3xl text-base leading-7 text-[#4a5a6a]">
              You probably have 5 to 10 tools for this already. Great. Let&apos;s see how that&apos;s
              going in a few months.
            </p>
            <p className="max-w-3xl text-base leading-7 text-[#4a5a6a]">
              {foundersLivedIt}{" "}
              <a href="/founders" className="font-semibold text-[#8b1e2d] underline underline-offset-4">
                Meet the founders
              </a>
            </p>
          </div>

          <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#d6dee8] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6c7a89]">
                Based in
              </p>
              <p className="mt-2 text-base font-semibold leading-6 text-[#172231]">
                India. {markets}.
              </p>
            </div>
            <div className="rounded-lg border border-[#d6dee8] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6c7a89]">
                Ownership
              </p>
              <p className="mt-2 text-base font-semibold leading-6 text-[#172231]">
                Triaxis Ventures Private Limited, owned and run by its two co-founders
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

          {/* Product Hunt's badge, served from /public: the CSP allows only same-origin images,
              and a local copy sends no visitor request to Product Hunt. */}
          <a
            href="https://www.producthunt.com/products/axxess-triaxis?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-axxess-triaxis"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/product-hunt-featured.svg"
              alt="AXXESS TRIaxis on Product Hunt"
              width={250}
              height={54}
            />
          </a>
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
              What is live today
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#111827]">
              Working software, not a waitlist.
            </h2>
            <ul className="mt-4 grid gap-2 text-base leading-7 text-[#4a5a6a]">
              <li>The AXXESS web app, plus a demo with sample data you can open without signing in.</li>
              <li>AXXESS for Android on Google Play.</li>
              <li>
                Lead sourcing on a schedule you set: AXXESS finds companies and their contacts and
                adds them to your CRM for review. It never messages anyone.
              </li>
              <li>Two pilot organisations use the live app.</li>
            </ul>
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

      <section aria-label="The AXXESS Bundle" className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
          The AXXESS Bundle
        </p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-[#111827]">
          Four products. We run our own company on all of them first.
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[#4a5a6a]">
          Buy AXXESS on its own, or take the bundle. Either way, a person still signs off on anything
          critical. No robot takeover.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {bundleProducts.map((product) => (
            <article key={product.name} className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
              <h3 className="text-xl font-semibold text-[#111827]">
                <a href={product.href} className="hover:underline">
                  {product.name}
                </a>
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#4a5a6a]">{product.job}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#0b6b82]">
                {product.state}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Built in public on GitHub" className="border-y border-[#dde5ee] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
            Built in public on GitHub
          </p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-[#111827]">
            Don&apos;t take our word for it. Read the code.
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {githubStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[#d6dee8] bg-[#f8fafc] p-4">
                <dt className="text-sm text-[#4a5a6a]">{stat.label}</dt>
                <dd className="mt-1 text-3xl font-semibold text-[#111827]">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-6 text-[#4a5a6a]">
            From the GitHub API on {githubStatsAsOf}.{" "}
            <a href={codersRankUrl} className="underline underline-offset-4">
              {codersRankNote}
            </a>
          </p>
          <a
            href={githubProfileUrl}
            className="mt-5 inline-block rounded-lg bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#243244]"
          >
            See everything on GitHub
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2 md:px-10">
        <div className="rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
              AXXESS TRIaxis demo
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#111827]">A short demo of AXXESS.</h2>
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
            <h2 className="mt-2 text-3xl font-semibold text-[#111827]">Three short promo clips.</h2>
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
