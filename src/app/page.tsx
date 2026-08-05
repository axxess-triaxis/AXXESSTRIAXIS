export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#0f1720]">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 md:flex-row md:items-center md:px-10 md:py-24">
        <section className="flex flex-col gap-8 md:w-3/5">
          <p className="inline-flex w-fit rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
            Triaxis Ventures
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            AXXESS Enterprise Intelligence Platform
          </h1>
          <p className="max-w-3xl text-lg text-[#3f5165] md:text-xl">
            Two separate ways to explore AXXESS: a self-contained investor demo with illustrative sample data, or the real enterprise beta workspace for pilot teams.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://landing.triaxisventures.com"
              className="rounded-lg bg-[#8b1e2d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#741927]"
            >
              Welcome Aboard
            </a>
            <a
              href="https://investor.triaxisventures.com"
              className="rounded-lg border border-[#b8c3d1] bg-white px-5 py-3 text-sm font-semibold text-[#1d2a38] transition hover:bg-[#eef2f6]"
            >
              Experience AXXESS
            </a>
            <a
              href="https://lite.triaxisventures.com"
              className="rounded-lg border border-[#b8c3d1] bg-white px-5 py-3 text-sm font-semibold text-[#1d2a38] transition hover:bg-[#eef2f6]"
            >
              Go Lite (For Now)
            </a>
          </div>
          <section
            aria-label="Join the AXXESS waitlist"
            className="max-w-xl rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm"
          >
            <div className="launchlist-widget" data-key-id="ICROoX" />
            <a
              href="https://launch.li/p/axxess-triaxis-founders-club-edition"
              className="mt-4 block text-sm font-medium text-[#8b1e2d] underline decoration-[#8b1e2d]/40 underline-offset-4 transition hover:text-[#741927]"
            >
              AXXESS the waitlist now with TRIaxis Ventures - Mr. Sudipta Koushik Sarmah (Founder) &amp; Mrs Ritashree Mahanta (Co-Founder)
            </a>
          </section>
        </section>
        <div className="flex justify-center md:w-2/5 md:justify-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/axxess-logo.png"
            alt="AXXESS logo"
            width={1254}
            height={1254}
            className="w-full max-w-sm md:max-w-none"
          />
        </div>
      </div>
    </main>
  );
}
