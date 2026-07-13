import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ASSETS, LINKS } from "@/lib/brand";

const shots = [
  {
    id: "workspace",
    label: "AI Workspace",
    tag: "01",
    caption: "Governed institutional intelligence · cited sources · human review",
    detail:
      "AXXESS Intelligence Engine · 2,200 documents indexed · permission-aware retrieval across projects, meetings and stakeholders.",
    img: ASSETS.betaShotAiWorkspace,
  },
  {
    id: "dashboard",
    label: "Executive Dashboard",
    tag: "02",
    caption: "North East Health Mission portfolio · live governance alerts",
    detail:
      "186 active projects, 196 at-risk items, 38 pending approvals and 2,200 RAG sources — surfaced with cold-chain, oxygen and outreach budget variance.",
    img: ASSETS.betaShotDashboard,
  },
  {
    id: "projects",
    label: "Projects & Programs",
    tag: "03",
    caption: "Kanban · list · new-project intake across 1 organization",
    detail:
      "186 active initiatives from primary care to policy & governance — status, priority, owners and due dates in one canvas.",
    img: ASSETS.betaShotProjects,
  },
  {
    id: "meetings",
    label: "Meetings & Decisions",
    tag: "04",
    caption: "96 meetings with decisions and action items",
    detail:
      "Every steering committee, district review and finance checkpoint gets an auditable decision log — linked to projects, programs and stakeholders.",
    img: ASSETS.betaShotMeetings,
  },
  {
    id: "analytics",
    label: "Analytics & Reports",
    tag: "05",
    caption: "Executive intelligence for the FY 2026 mission cycle",
    detail:
      "OKR performance, delivery trend, budget utilization and AI-generated insights on portfolio burn rate — export-ready.",
    img: ASSETS.betaShotAnalytics,
  },
];

export default function BetaShowcase() {
  const [active, setActive] = useState(shots[0].id);
  const current = shots.find((s) => s.id === active) || shots[0];
  const videoRef = useRef(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const playVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setVideoPlaying(true);
  };

  return (
    <section
      id="beta"
      data-testid="beta-showcase-section"
      className="relative bg-[color:var(--tx-cream)] text-[color:var(--tx-ink)] border-t border-[color:var(--tx-line)] overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
        {/* header */}
        <div className="grid md:grid-cols-12 gap-10 mb-12 md:mb-16">
          <div className="md:col-span-7">
            <div className="eyebrow mb-6">05B · Live from the beta</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              AXXESS is <span className="italic">shipping</span>.
              <br />
              Watch the demo. Explore the beta.
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              Real product · real data · shipping today on North East Health
              Mission workflows. Open source is coming; pilot conversations are
              open.
            </p>
          </div>
        </div>

        {/* Prominent demo video */}
        <div
          data-testid="beta-demo-video-frame"
          className="relative border border-[color:var(--tx-ink)] bg-[color:var(--tx-ink-2)] overflow-hidden rounded-sm mb-14 md:mb-20 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/60 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-[11px] tracking-widest uppercase text-white/60">
                AXXESS · Product demo
              </span>
            </div>
            <span className="font-mono text-[10.5px] tracking-widest uppercase text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-dot" />
              Featured
            </span>
          </div>
          <div className="relative aspect-[16/9] bg-black group">
            <video
              ref={videoRef}
              data-testid="beta-demo-video"
              src={ASSETS.demoVideo}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              controls
              controlsList="nodownload"
              preload="metadata"
              playsInline
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onEnded={() => setVideoPlaying(false)}
            />
            {!videoPlaying && (
              <button
                onClick={playVideo}
                data-testid="beta-demo-play"
                aria-label="Play demo video"
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/15 transition-colors z-10"
              >
                <span className="relative flex items-center justify-center">
                  <span className="absolute w-24 h-24 rounded-full bg-white/10 group-hover:bg-white/15 animate-pulse" />
                  <span className="relative w-20 h-20 rounded-full bg-white text-[color:var(--tx-ink)] flex items-center justify-center shadow-2xl">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
                <span className="absolute bottom-6 left-6 text-left">
                  <div className="font-mono text-[10.5px] tracking-widest uppercase text-white/70">
                    Watch the demo
                  </div>
                  <div className="font-serif text-white text-[22px] md:text-[28px] tracking-tight leading-tight mt-1">
                    AXXESS in 5 mins
                  </div>
                </span>
                <span className="absolute bottom-6 right-6 font-mono text-[10.5px] tracking-widest uppercase text-white/60">
                  Sound · on click
                </span>
              </button>
            )}
          </div>
        </div>

        {/* badges strip */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="eyebrow mr-2">Build</span>
          <img
            src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square&labelColor=0a0a0a"
            alt="build passing"
            data-testid="badge-build"
            className="h-5"
          />
          <img
            src="https://img.shields.io/badge/deploy-Vercel-black?style=flat-square&logo=vercel&labelColor=0a0a0a"
            alt="deployed on Vercel"
            data-testid="badge-vercel"
            className="h-5"
          />
          <img
            src="https://img.shields.io/github/last-commit/axxess-triaxis/AXXESSTRIAXIS?style=flat-square&label=commit&color=0a0a0a&labelColor=73736F"
            alt="last commit"
            data-testid="badge-last-commit"
            className="h-5"
          />
          <img
            src="https://img.shields.io/github/languages/top/axxess-triaxis/AXXESSTRIAXIS?style=flat-square&labelColor=0a0a0a&color=3B82F6"
            alt="top language"
            data-testid="badge-language"
            className="h-5"
          />
          <img
            src="https://img.shields.io/badge/status-enterprise%20beta-3B82F6?style=flat-square&labelColor=0a0a0a"
            alt="status"
            data-testid="badge-status"
            className="h-5"
          />
        </div>

        {/* device viewer + tab list */}
        <div className="grid md:grid-cols-12 gap-6">
          {/* Screenshot mock frame */}
          <div className="md:col-span-8 relative">
            <div className="border border-[color:var(--tx-line)] bg-[color:var(--tx-ink-2)] overflow-hidden rounded-sm">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-black/50 backdrop-blur-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-[11px] tracking-widest uppercase text-white/50 truncate">
                  {LINKS.betaApp.replace(/^https?:\/\//, "")} · /{current.id}
                </span>
                <span className="ml-auto font-mono text-[10.5px] tracking-widest uppercase text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full live-dot" />
                  live
                </span>
              </div>
              <div className="relative aspect-[16/9] bg-black">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={current.id}
                    src={current.img}
                    alt={`${current.label} — AXXESS beta screenshot`}
                    initial={{ opacity: 0, scale: 1.01 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.99 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    data-testid={`beta-screenshot-${current.id}`}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </AnimatePresence>
              </div>
            </div>

            {/* caption bar */}
            <div className="mt-4 flex items-start justify-between gap-6">
              <div>
                <div className="font-mono text-[10.5px] tracking-widest uppercase text-[color:var(--tx-muted)] mb-1">
                  {current.tag} · {current.label}
                </div>
                <div className="font-serif text-[20px] md:text-[22px] tracking-tight leading-tight">
                  {current.caption}
                </div>
                <p className="mt-2 text-[13.5px] text-[color:var(--tx-ink)]/70 max-w-2xl leading-relaxed">
                  {current.detail}
                </p>
              </div>
              <a
                href={LINKS.betaApp}
                target="_blank"
                rel="noreferrer"
                data-testid="beta-open-app"
                className="shrink-0 inline-flex items-center gap-2 text-[13px] font-medium bg-[color:var(--tx-ink)] text-white px-4 py-2.5 hover:bg-black transition-colors rounded-sm"
              >
                Open beta ↗
              </a>
            </div>
          </div>

          {/* tabs / feedback / github */}
          <div className="md:col-span-4 flex flex-col gap-5">
            <div className="border border-[color:var(--tx-line)] bg-white">
              <div className="eyebrow px-5 pt-5 pb-3">Screens</div>
              <ul>
                {shots.map((s) => {
                  const isActive = s.id === active;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActive(s.id)}
                        onMouseEnter={() => setActive(s.id)}
                        data-testid={`beta-tab-${s.id}`}
                        className={`w-full text-left flex items-center justify-between gap-4 px-5 py-3.5 border-t border-[color:var(--tx-line)] transition-colors ${
                          isActive
                            ? "bg-[color:var(--tx-ink)] text-white"
                            : "hover:bg-[color:var(--tx-cream)]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`font-mono text-[10.5px] tracking-widest ${
                              isActive ? "text-white/60" : "text-[color:var(--tx-muted)]"
                            }`}
                          >
                            {s.tag}
                          </span>
                          <span className="font-serif text-[15.5px] leading-tight truncate">
                            {s.label}
                          </span>
                        </div>
                        <span
                          className={`text-[16px] ${
                            isActive ? "text-white" : "text-[color:var(--tx-muted)]"
                          }`}
                          aria-hidden
                        >
                          {isActive ? "●" : "○"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Feedback CTA with QR */}
            <div
              data-testid="beta-feedback-card"
              className="relative border border-[color:var(--tx-ink)] bg-[color:var(--tx-ink-2)] text-white p-6 overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--tx-blue)] to-transparent opacity-60" />
              <div className="eyebrow-dark mb-3">Beta feedback</div>
              <div className="font-serif text-[22px] md:text-[24px] tracking-tight leading-tight">
                3,000+ feedback datapoints target
              </div>
              <p className="mt-2 text-[13px] text-white/70 leading-relaxed">
                Pilot conversations open. Scan or tap — takes ~3 minutes.
              </p>

              <div className="mt-5 flex items-center gap-4">
                <a
                  href={LINKS.feedbackSurvey}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="beta-feedback-qr"
                  aria-label="Scan or tap to open AXXESS Enterprise Beta feedback survey"
                  className="shrink-0 block bg-white p-2 rounded-sm hover:scale-[1.03] transition-transform"
                >
                  <img
                    src={ASSETS.feedbackQr}
                    alt="Scan for beta feedback survey"
                    className="w-[104px] h-[104px] object-contain"
                  />
                </a>
                <div className="min-w-0">
                  <div className="font-mono text-[10.5px] tracking-widest uppercase text-white/50 mb-1">
                    Scan on mobile
                  </div>
                  <div className="text-[12.5px] text-white/75 leading-snug break-words">
                    ap.surveymars.com<br />/q/NAgaQ43fM
                  </div>
                  <a
                    href={LINKS.feedbackSurvey}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="beta-feedback-cta"
                    className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase text-white group hover:text-[color:var(--tx-blue)] transition-colors"
                  >
                    Open survey
                    <span aria-hidden>↗</span>
                  </a>
                </div>
              </div>
            </div>

            {/* GitHub link */}
            <a
              href={LINKS.github}
              target="_blank"
              rel="noreferrer"
              data-testid="beta-github-link"
              className="group flex items-center gap-4 border border-[color:var(--tx-line)] bg-white p-5 hover:border-[color:var(--tx-ink)] transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-8 h-8 text-[color:var(--tx-ink)] shrink-0"
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.11-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.79.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
              </svg>
              <div className="min-w-0">
                <div className="eyebrow">Open source · repository</div>
                <div className="font-serif text-[17px] tracking-tight truncate">
                  axxess-triaxis / AXXESSTRIAXIS
                </div>
              </div>
              <span
                className="ml-auto text-[color:var(--tx-muted)] group-hover:text-[color:var(--tx-ink)] transition-colors text-lg"
                aria-hidden
              >
                ↗
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
