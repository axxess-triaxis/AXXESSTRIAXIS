"use client";

import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";

// Outreach funnel and sending health (GTM plan 2026-11-11, Day 4). Senior roles only; the route
// refuses everyone else. Every number comes from a named table, and stages with no source rows
// are shown as "Not tracked yet" rather than estimated.

type Funnel = {
  window: { days: number };
  activity: { leadsAdded: number; emailsSent: number; delivered: number; bounced: number; complained: number; replies: number; repliesByCategory: Record<string, number> };
  pipelineNow: { open: number; byStage: Record<string, number>; won: number; lost: number };
  notTracked: string[];
  ramp: { budget: number; reason: string; sendingEnabled: boolean; sent7d: number; bounceRate7d: number; complaintRate7d: number };
};

const REPLY_LABELS: Record<string, string> = {
  interested: "Interested", not_now: "Not now", unsubscribe: "Unsubscribe", out_of_office: "Out of office", other: "Needs reading",
};
const NOT_TRACKED_LABELS: Record<string, string> = { meetings: "Meetings", trials: "Trials", paid: "Paid" };

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.01 ? 2 : 1)}%`;
const of = (part: number, whole: number) => (whole > 0 ? ` (${pct(part / whole)})` : "");

export function rampMessage(ramp: Funnel["ramp"]): string {
  const rates = `Bounces ${pct(ramp.bounceRate7d)}, complaints ${pct(ramp.complaintRate7d)} over the last 7 days (${ramp.sent7d} sent).`;
  if (!ramp.sendingEnabled) return `Sending is switched off. ${rates}`;
  if (ramp.reason === "paused_bounce_rate") return `Paused: the bounce rate reached 2%. Sending resumes by itself when it drops. ${rates}`;
  if (ramp.reason === "paused_complaint_rate") return `Paused: the complaint rate reached 0.1%. Sending resumes by itself when it drops. ${rates}`;
  if (ramp.reason === "warming_up") return `Warming up: up to ${ramp.budget} a day until 50 emails have gone out in 7 days. ${rates}`;
  return `Sending up to ${ramp.budget} a day. ${rates}`;
}

function Row(props: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.06)] px-3 py-2 text-xs first:border-t-0">
      <span className={props.muted ? "text-[#5F6B73]" : "text-[#0F1117]"}>{props.label}</span>
      <span className={props.muted ? "text-[#5F6B73]" : "font-semibold text-[#0F1117]"}>{props.value}</span>
    </div>
  );
}

export function FunnelPanel() {
  const [days, setDays] = useState(30);
  const [funnel, setFunnel] = useState<Funnel | null | "error">(null);

  useEffect(() => {
    let active = true;
    setFunnel(null);
    void fetch(`/api/crm/funnel?days=${days}`, { credentials: "include", cache: "no-store" })
      .then(async (r) => (r.ok ? (await r.json() as Funnel) : "error" as const))
      .catch(() => "error" as const)
      .then((d) => { if (active) setFunnel(d); });
    return () => { active = false; };
  }, [days]);

  if (funnel === "error") return <Card className="p-4"><p className="text-xs text-red-700">Could not load the funnel.</p></Card>;
  if (funnel === null) return <p className="text-xs text-[#5F6B73]">Loading the funnel...</p>;
  const a = funnel.activity;
  const paused = funnel.ramp.budget === 0;

  return (
    <div className="space-y-4">
      <div data-testid="ramp-status">
        <Card className={`p-3 ${paused ? "border-red-300 bg-red-50" : ""}`}>
          <p className={`text-xs ${paused ? "text-red-800" : "text-[#0F1117]"}`}>{rampMessage(funnel.ramp)}</p>
        </Card>
      </div>
      <select aria-label="Window" className="rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
      </select>
      <div className="grid gap-4 md:grid-cols-2">
        <div data-testid="funnel-activity">
          <Card>
            <h3 className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Outreach, last {funnel.window.days} days</h3>
            <Row label="Leads added" value={a.leadsAdded} />
            <Row label="Emails sent" value={a.emailsSent} />
            <Row label="Delivered" value={`${a.delivered}${of(a.delivered, a.emailsSent)}`} />
            <Row label="Bounced" value={`${a.bounced}${of(a.bounced, a.emailsSent)}`} />
            <Row label="Spam complaints" value={`${a.complained}${of(a.complained, a.emailsSent)}`} />
            <Row label="Replies" value={`${a.replies}${of(a.replies, a.emailsSent)}`} />
            {Object.entries(a.repliesByCategory).map(([category, n]) => <Row key={category} label={`  ${REPLY_LABELS[category] ?? category}`} value={n} muted />)}
          </Card>
        </div>
        <div data-testid="funnel-pipeline">
          <Card>
            <h3 className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Pipeline now</h3>
            <Row label="Open leads" value={funnel.pipelineNow.open} />
            {["new", "qualifying", "proposal", "negotiation"].map((stage) => <Row key={stage} label={`  ${stage}`} value={funnel.pipelineNow.byStage[stage] ?? 0} muted />)}
            <Row label="Won" value={funnel.pipelineNow.won} />
            <Row label="Lost" value={funnel.pipelineNow.lost} />
            {funnel.notTracked.map((stage) => <Row key={stage} label={NOT_TRACKED_LABELS[stage] ?? stage} value="Not tracked yet" muted />)}
          </Card>
        </div>
      </div>
    </div>
  );
}
