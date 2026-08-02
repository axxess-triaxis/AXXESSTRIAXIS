export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#0f1720]">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 md:px-10 md:py-24">
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
        </div>
        <section
          aria-labelledby="launchlist-heading"
          className="max-w-xl rounded-xl border border-[#d6dee8] bg-white p-5 shadow-sm"
        >
          <p id="launchlist-heading" className="text-sm font-semibold text-[#1d2a38]">
            Join the AXXESS pilot waitlist
          </p>
          <p className="mt-2 text-sm leading-6 text-[#526173]">
            Register interest for pilot access, product updates, and enterprise beta availability.
          </p>
          <div className="launchlist-widget mt-4" data-key-id="ICROoX" />
        </section>
      </section>
    </main>
  );
}
