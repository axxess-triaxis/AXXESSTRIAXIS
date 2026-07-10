import { useState } from "react";
import { motion } from "framer-motion";

const pillars = [
  {
    id: 1,
    label: "Pillar I",
    title: "Sovereign by design",
    body:
      "Tenant-isolated architecture, jurisdiction-aware data residency, and Bring-Your-Own-Cloud deployment for DIFC, ADGM, GIFT City and regulated buyers.",
    metric: "SOC2 · ISO 27001 · GDPR · DIFC/ADGM ready",
  },
  {
    id: 2,
    label: "Pillar II",
    title: "Governed AI, not raw LLMs",
    body:
      "Permission-aware retrieval, immutable audit trails, prompt governance and a human-in-the-loop layer on every high-stakes action.",
    metric: "Audit-hashing · RBAC · HITL escalation",
  },
  {
    id: 3,
    label: "Pillar III",
    title: "Multilingual, multi-script native",
    body:
      "Arabic · Hindi · Bengali · Assamese · Nepali · Swahili · English — plus hybrid-code. Built for the buyer, not translated for the buyer.",
    metric: "12+ languages · hybrid-code support",
  },
  {
    id: 4,
    label: "Pillar IV",
    title: "Vertical + horizontal wedge",
    body:
      "Each product is a vertical wedge (GovTech, family offices, healthcare institutions) that plugs into a shared horizontal platform (identity, memory, governance).",
    metric: "Shared kernel · vertical revenue",
  },
  {
    id: 5,
    label: "Pillar V",
    title: "Distribution via institutional trust",
    body:
      "We sell the way regulated enterprises buy — via senior relationships, structured pilots and reference architectures. Not via demand-gen funnels.",
    metric: "Direct + partner-led · 30-day pilots",
  },
];

export default function FiveAxis() {
  const [active, setActive] = useState(1);
  const current = pillars.find((a) => a.id === active);

  return (
    <section
      id="thesis"
      data-testid="five-axis-section"
      className="relative bg-white text-[color:var(--tx-ink)] border-y border-[color:var(--tx-line)]"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-14 md:mb-20">
          <div className="md:col-span-7">
            <div className="eyebrow mb-6">03 · The Thesis</div>
            <h2 className="font-serif text-[38px] md:text-[56px] leading-[1.04] tracking-tight">
              Five pillars.{" "}
              <span className="italic">One operating stack.</span>
              <br />
              Every Triaxis product is built on all five.
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-[15.5px] leading-relaxed text-[color:var(--tx-ink)]/70">
              These pillars are our shared kernel. Any vertical product we ship
              inherits sovereignty, governance, multilinguality, wedge design
              and institutional distribution — day one.
            </p>
          </div>
        </div>

        {/* Interactive framework */}
        <div className="grid md:grid-cols-12 gap-6">
          {/* left list */}
          <div className="md:col-span-6 lg:col-span-5 flex flex-col border border-[color:var(--tx-line)] bg-white">
            {pillars.map((a) => {
              const isActive = a.id === active;
              return (
                <button
                  key={a.id}
                  onMouseEnter={() => setActive(a.id)}
                  onFocus={() => setActive(a.id)}
                  onClick={() => setActive(a.id)}
                  data-testid={`axis-item-${a.id}`}
                  className={`text-left px-6 py-6 border-b border-[color:var(--tx-line)] last:border-b-0 transition-colors ${
                    isActive
                      ? "bg-[color:var(--tx-ink)] text-white"
                      : "hover:bg-[color:var(--tx-cream-2)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <div
                        className={`font-mono text-[11px] tracking-widest uppercase mb-2 ${
                          isActive ? "text-white/60" : "text-[color:var(--tx-muted)]"
                        }`}
                      >
                        {a.label}
                      </div>
                      <div className="font-serif text-[20px] md:text-[24px] leading-snug tracking-tight">
                        {a.title}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 w-8 h-8 border rounded-full flex items-center justify-center transition-colors ${
                        isActive
                          ? "border-white text-white"
                          : "border-[color:var(--tx-line)] text-[color:var(--tx-muted)]"
                      }`}
                    >
                      <span className="text-sm">{isActive ? "●" : "○"}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* right detail panel */}
          <div className="md:col-span-6 lg:col-span-7 relative border border-[color:var(--tx-line)] bg-[color:var(--tx-cream)] overflow-hidden">
            <div className="absolute inset-0 bg-grid-light opacity-60" />
            <div className="relative p-8 md:p-12 h-full min-h-[420px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[11px] tracking-widest text-[color:var(--tx-muted)] uppercase">
                  Thesis · {current.label}
                </div>
                <div className="font-mono text-[11px] tracking-widest text-[color:var(--tx-muted)] uppercase">
                  {current.id} / 5
                </div>
              </div>

              {/* SVG pentagon visualization */}
              <div className="my-8 flex justify-center">
                <PentagonAxis active={active} />
              </div>

              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className="font-serif text-[26px] md:text-[32px] tracking-tight leading-tight">
                  {current.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--tx-ink)]/75 max-w-xl">
                  {current.body}
                </p>
                <div className="mt-6 pt-6 border-t border-[color:var(--tx-line)] flex items-center justify-between text-[12.5px] text-[color:var(--tx-muted)]">
                  <span className="font-mono uppercase tracking-widest">
                    Built-in
                  </span>
                  <span className="font-mono">{current.metric}</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PentagonAxis({ active }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 82;
  const points = Array.from({ length: 5 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), i: i + 1 };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.35, 0.6, 0.85, 1].map((k) => (
        <polygon
          key={k}
          points={points
            .map((p) => {
              const x = cx + (p.x - cx) * k;
              const y = cy + (p.y - cy) * k;
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#0A0A0A"
          strokeOpacity={0.08}
          strokeWidth={1}
        />
      ))}
      {points.map((p) => (
        <line
          key={`spoke-${p.i}`}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="#0A0A0A"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}
      <path d={path} fill="none" stroke="#0A0A0A" strokeOpacity={0.3} strokeWidth={1.2} />
      {points.map((p) => {
        const isActive = p.i === active;
        return (
          <g key={`node-${p.i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isActive ? 8 : 4}
              fill={isActive ? "#3B82F6" : "#0A0A0A"}
              opacity={isActive ? 1 : 0.65}
            />
            {isActive && (
              <circle
                cx={p.x}
                cy={p.y}
                r={14}
                fill="none"
                stroke="#3B82F6"
                strokeOpacity={0.35}
              />
            )}
            <text
              x={p.x}
              y={p.y + 22}
              textAnchor="middle"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              fill="#0A0A0A"
              opacity={isActive ? 0.9 : 0.4}
            >
              {`0${p.i}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
