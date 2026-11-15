// Outreach funnel from real rows (GTM plan 2026-11-11, Day 4 item 1). Every count comes from a
// named table; stages with no source rows (meetings, trials, paid) are reported as not tracked,
// never estimated. Service-role REST, scoped to the caller's server-derived organization.
import type { TenantScope } from "./interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

const LIMIT = "20000";

export type FunnelCounts = {
  window: { days: number; since: string };
  activity: {
    leadsAdded: number;
    emailsSent: number;
    delivered: number;
    bounced: number;
    complained: number;
    replies: number;
    repliesByCategory: Record<string, number>;
  };
  pipelineNow: { open: number; byStage: Record<string, number>; won: number; lost: number };
  sources: Record<string, string>;
  notTracked: string[];
};

export async function loadFunnel(scope: TenantScope, days: number, now = new Date()): Promise<FunnelCounts> {
  if (!isSupabaseAdminConfigured()) throw new Error("Funnel repository is not configured (Supabase admin credentials missing).");
  const since = new Date(now.getTime() - days * 86_400_000).toISOString();
  const org = `eq.${scope.organizationId}`;
  const [leadsAdded, sent, events, replies, leads] = await Promise.all([
    supabaseAdminRest<{ id: string }[]>("crm_leads", { query: new URLSearchParams({ organization_id: org, created_at: `gte.${since}`, select: "id", limit: LIMIT }) }),
    supabaseAdminRest<{ id: string }[]>("contact_attempts", { query: new URLSearchParams({
      organization_id: org, channel: "eq.email", decision: "eq.allowed", created_at: `gte.${since}`, select: "id", limit: LIMIT,
    }) }),
    supabaseAdminRest<{ type: string }[]>("outreach_email_events", { query: new URLSearchParams({ organization_id: org, created_at: `gte.${since}`, select: "type", limit: LIMIT }) }),
    supabaseAdminRest<{ category: string }[]>("lead_replies", { query: new URLSearchParams({ organization_id: org, created_at: `gte.${since}`, select: "category", limit: LIMIT }) }),
    supabaseAdminRest<{ stage: string; status: string }[]>("crm_leads", { query: new URLSearchParams({ organization_id: org, select: "stage,status", limit: LIMIT }) }),
  ]);

  const countBy = <T>(rows: T[], key: (row: T) => string) => rows.reduce<Record<string, number>>((acc, row) => {
    acc[key(row)] = (acc[key(row)] ?? 0) + 1;
    return acc;
  }, {});
  const eventCounts = countBy(events, (e) => e.type);
  const open = leads.filter((l) => l.status === "open" || l.status === "stalled");

  return {
    window: { days, since },
    activity: {
      leadsAdded: leadsAdded.length,
      emailsSent: sent.length,
      delivered: eventCounts.delivered ?? 0,
      bounced: eventCounts.bounced ?? 0,
      complained: eventCounts.complained ?? 0,
      replies: replies.length,
      repliesByCategory: countBy(replies, (r) => r.category),
    },
    pipelineNow: {
      open: open.length,
      byStage: countBy(open, (l) => l.stage),
      won: leads.filter((l) => l.status === "won" || l.stage === "won").length,
      lost: leads.filter((l) => l.status === "lost" || l.stage === "lost").length,
    },
    sources: {
      leadsAdded: "crm_leads.created_at",
      emailsSent: "contact_attempts (email, allowed)",
      delivered: "outreach_email_events (delivered)",
      bounced: "outreach_email_events (bounced)",
      complained: "outreach_email_events (complained)",
      replies: "lead_replies",
      pipelineNow: "crm_leads.stage and status",
    },
    notTracked: ["meetings", "trials", "paid"],
  };
}
