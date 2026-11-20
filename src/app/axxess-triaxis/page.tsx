import Link from "next/link";

const surfaces = [
  "Web app (sign-in)",
  "Demo with sample data (no sign-in)",
  "Android app on Google Play",
  "AXXESS Lite",
];

const capabilities = [
  "Tasks, meetings, projects, documents and a CRM, kept separate for each organisation",
  "Ask a question and it answers from your own documents, with the sources",
  "Approvals: anything critical waits for a person",
  "An audit log of every action, by people and by agents",
  "Lead sourcing on a schedule you set: it finds companies and their contacts and adds them to your CRM for review. It never messages anyone",
  "Connect outside AI agents, such as ChatGPT or Claude, with a key your admin issues and limits",
];

const steps = [
  { name: "1. Decide", body: "Yes, no or something else. There is no Dismiss button, so nothing waits until tomorrow." },
  { name: "2. Execute", body: "An agent does the follow-up it is allowed to do, such as creating tasks and meetings." },
  { name: "3. Approve", body: "A person signs off on anything critical. No robot takeover." },
  { name: "4. Remember", body: "It all goes into the audit log, so nobody has to ask who saw what." },
];

export default function AxxessTriaxisPage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1fr_0.8fr] md:px-10 md:py-16">
        <div className="space-y-7">
          <Link href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
            Back to Triaxis Ventures
          </Link>
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
              AXXESS TRIaxis
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Everything becomes a decision. Agents do the rest.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              AXXESS keeps your tasks, documents, meetings, projects, contacts and approvals in one
              place. Each piece of work asks someone to decide. Agents do the follow-up, a person
              signs off on anything critical, and every action is logged.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://landing.triaxisventures.com"
              className="rounded-lg bg-[#8b1e2d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#741927]"
            >
              Sign in to AXXESS
            </a>
            <a
              href="https://investor.triaxisventures.com"
              className="rounded-lg border border-[#b8c3d1] bg-white px-5 py-3 text-sm font-semibold text-[#1d2a38] transition hover:bg-[#eef2f6]"
            >
              Try the demo (no sign-in)
            </a>
            <a
              href="https://lite.triaxisventures.com"
              className="rounded-lg border border-[#b8c3d1] bg-white px-5 py-3 text-sm font-semibold text-[#1d2a38] transition hover:bg-[#eef2f6]"
            >
              AXXESS Lite
            </a>
          </div>
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
      </section>

      <section className="border-y border-[#dde5ee] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2 md:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
              Where you can use it
            </p>
            <ul className="mt-5 grid gap-3">
              {surfaces.map((surface) => (
                <li
                  key={surface}
                  className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#243244]"
                >
                  {surface}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
              What it does today
            </p>
            <ul className="mt-5 grid gap-3">
              {capabilities.map((capability) => (
                <li
                  key={capability}
                  className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#243244]"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
            How a piece of work moves
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step) => (
              <article key={step.name} className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <h2 className="text-xl font-semibold text-[#111827]">{step.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[#4a5a6a]">{step.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 max-w-4xl text-base leading-7 text-[#4a5a6a]">
            It tracks work, not people. It does not watch your lunch hour or your weekend.
            Productivity, not surveillance.
          </p>
        </div>
      </section>
    </main>
  );
}
