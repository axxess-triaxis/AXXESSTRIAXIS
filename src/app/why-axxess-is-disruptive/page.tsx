import Link from "next/link";
import { vision } from "../../components/marketing/siteFacts";

// Route kept as /why-axxess-is-disruptive so existing links still work; the page is now "How It Works".

const contrasts = [
  {
    oldWay: "Most software",
    oldBody: "Records the work after it is done.",
    axxessWay: "AXXESS",
    axxessBody: "Asks for the next decision, and keeps asking until someone answers.",
  },
  {
    oldWay: "Chat assistants",
    oldBody: "Suggest five things. You forget four of them.",
    axxessWay: "AXXESS agents",
    axxessBody: "Do the follow-up, within the limits you set.",
  },
  {
    oldWay: "Email, WhatsApp, Zoom, files",
    oldBody: "Each holds a piece of the story. Nobody holds all of it.",
    axxessWay: "One place",
    axxessBody: "Tasks, documents, meetings, contacts and approvals together.",
  },
];

const points = [
  {
    title: "A person signs off on anything critical.",
    body: "Agents execute. People decide. We do not believe in robots running the world, and neither does your auditor.",
  },
  {
    title: "Every action is logged.",
    body: "Who saw it, who decided, what happened next. \"He says he never saw the attachment\" stops being a debate.",
  },
  {
    title: "It tracks work, not people.",
    body: "It tells a supervisor when work piles up on someone. It does not watch anyone's lunch hour or weekend.",
  },
  {
    title: "Truly horizontal.",
    body: "Clinics, brokerages, councils, NGOs and corporates lose work the same way. One product, many ways in, no extra cost line per team.",
  },
  {
    title: "We run our own company on it.",
    body: "Our own leads and customer conversations turn up in AXXESS as tasks. If it breaks, we find out first.",
  },
  {
    title: "Built by people who did this work.",
    body: "Nine years in banking. Six years in hospitals and nursing colleges. We have sat on the committees that buy this.",
  },
];

const thesisBands = ["No Dismiss button", "Human sign-off", "Audit log", "Tracks work, not people", "We use it ourselves"];

export default function WhyAxxessIsDisruptivePage() {
  return (
    <main className="triaxis-site-shell">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:grid-cols-[1fr_0.8fr] md:px-10 md:py-16">
        <div className="space-y-7">
          <Link href="/" className="text-sm font-semibold text-[#8b1e2d] hover:underline">
            Back to Triaxis Ventures
          </Link>
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-[#cdd5df] bg-white px-4 py-1 text-sm font-medium text-[#35506b]">
              How It Works
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Work slips because every decision can wait until tomorrow.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[#3f5165] md:text-xl">
              Most teams already have email, chat, a CRM and an AI assistant. Things still slip,
              because every decision is optional and can be snoozed. AXXESS asks for the decision,
              does the follow-up and keeps the record. {vision}
            </p>
            <div className="flex flex-wrap gap-3">
              {thesisBands.map((band) => (
                <span
                  key={band}
                  className="rounded-full border border-[#d6dee8] bg-white px-4 py-2 text-sm font-semibold text-[#243244]"
                >
                  {band}
                </span>
              ))}
            </div>
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
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8b1e2d]">
            The difference
          </p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-[#111827]">
            Software records. Chat answers. AXXESS asks, follows up and remembers.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {contrasts.map((item) => (
              <article key={item.oldWay} className="rounded-xl border border-[#d6dee8] bg-[#f8fafc] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#6c7a89]">
                  {item.oldWay}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#4a5a6a]">{item.oldBody}</p>
                <div className="my-5 h-px bg-[#d6dee8]" />
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0b6b82]">
                  {item.axxessWay}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#243244]">{item.axxessBody}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-12 md:grid-cols-2 md:px-10">
        {points.map((point) => (
          <article key={point.title} className="rounded-xl border border-[#d6dee8] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#111827]">{point.title}</h2>
            <p className="mt-4 text-base leading-7 text-[#4a5a6a]">{point.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
