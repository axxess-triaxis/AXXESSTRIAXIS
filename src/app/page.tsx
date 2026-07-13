import Link from "next/link";

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
          The production website and brand experience live at this domain, while the enterprise beta workspace remains available for pilot teams.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#8b1e2d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#741927]"
          >
            Open Beta Workspace
          </Link>
          <Link
            href="/auth"
            className="rounded-lg border border-[#b8c3d1] bg-white px-5 py-3 text-sm font-semibold text-[#1d2a38] transition hover:bg-[#eef2f6]"
          >
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
