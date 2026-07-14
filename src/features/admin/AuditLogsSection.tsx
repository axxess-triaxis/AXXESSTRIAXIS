"use client";

import { Download, Filter, ScrollText, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import {
  ActivityFeed,
  AuditTrailBadge,
  DataStateBadge,
  EmptyState,
  MetricCard,
  ModuleHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  TenantScopeBadge,
} from "../../components/enterprise";
import type { AuditLog } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";

type AuditFilter = "all" | "auth" | "ai" | "document" | "approval" | "security" | "workflow";
type AuditExportState = {
  status: "idle" | "exporting" | "ready" | "fallback" | "failed";
  message?: string;
};

const filters: AuditFilter[] = ["all", "auth", "ai", "document", "approval", "security", "workflow"];

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AuditLogsSection() {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AuditFilter>("all");
  const [exportState, setExportState] = useState<AuditExportState>({ status: "idle" });

  const loadAuditLogs = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    const rows = await applicationServices.auditLogsRepository.list(scope, { pageSize: 100 }).catch(() => []);
    setLogs(rows);
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    if (!user) return;
    analytics.trackEvent("audit_log_viewed", { filter, result_count: logs.length }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "audit-logs",
      route: "/admin/audit-logs",
    });
  }, [analytics, filter, logs.length, user]);

  if (!user) return null;

  const filteredLogs = logs.filter((log) => filter === "all" || log.category === filter || log.resourceType === filter);
  const securityEvents = logs.filter((log) => log.category === "security" || log.resourceType === "auth").length;
  const aiEvents = logs.filter((log) => log.category === "ai" || log.resourceType === "ai_answer").length;
  const exportReady = filteredLogs.length > 0;

  const exportCsv = async () => {
    analytics.trackEvent("audit_export_requested", { filter, result_count: filteredLogs.length }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "audit-logs",
      route: "/admin/audit-logs",
    });
    if (!filteredLogs.length) return;
    setExportState({ status: "exporting", message: "Creating governed export" });

    try {
      const response = await fetch("/api/audit-exports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter }),
      });
      const payload = await response.json().catch(() => ({})) as { csv?: string; fileName?: string; exportId?: string };
      if (!response.ok || !payload.csv || !payload.fileName) throw new Error("Server export was unavailable.");
      downloadCsv(payload.fileName, payload.csv);
      setExportState({ status: "ready", message: payload.exportId ? `Export record ${payload.exportId.slice(0, 8)}` : "Governed export created" });
      return;
    } catch {
      setExportState({ status: "fallback", message: "Downloaded local CSV; server record unavailable" });
    }

    const header = ["created_at", "category", "action", "resource_type", "resource_id", "actor_role", "request_id"];
    const rows = filteredLogs.map((log) => [
      log.createdAt,
      log.category ?? "system",
      log.action,
      log.resourceType,
      log.resourceId ?? "",
      log.actorRole ?? "",
      log.requestId ?? "",
    ].map(csvEscape).join(","));
    downloadCsv(`axxess-audit-${filter}-${new Date().toISOString().slice(0, 10)}.csv`, [header.join(","), ...rows].join("\n"));
  };

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Governance"
        title="Audit Logs"
        description="Tenant-scoped evidence for auth, AI, RAG, documents, approvals, tasks, feedback, and admin actions."
        badges={[
          <TenantScopeBadge key="tenant" label="No cross-organization data" />,
          <DataStateBadge key="state" state={loading ? "Provider-gated" : "Live"} />,
          <StatusBadge key="hash" status="Integrity review ready" />,
          exportState.message ? <StatusBadge key="export" status={exportState.message} /> : null,
        ]}
        actions={
          <button
            onClick={() => void exportCsv()}
            disabled={exportState.status === "exporting" || !exportReady}
            className="inline-flex items-center gap-2 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={14} /> {exportState.status === "exporting" ? "Exporting..." : "Export CSV"}
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Loaded events" value={logs.length} detail="latest tenant records" state={loading ? "Provider-gated" : "Live"} icon={ScrollText} />
        <MetricCard label="Filtered events" value={filteredLogs.length} detail={`current filter: ${filter}`} state={loading ? "Provider-gated" : "Live"} icon={Filter} />
        <MetricCard label="Security events" value={securityEvents} detail="auth and admin evidence" state={loading ? "Provider-gated" : "Live"} icon={ShieldCheck} />
        <MetricCard label="AI/RAG events" value={aiEvents} detail="answers, sources, reviews" state={loading ? "Provider-gated" : "Live"} icon={ScrollText} />
      </div>

      <SectionCard title="Audit filters" description="Filter by governance category before export or review.">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? "bg-[#8B1E2D] text-white" : "bg-[#F2F3F5] text-[#5F6B73]"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard title="Tenant audit trail" description="Each row must remain scoped to the active organization and user role.">
          {filteredLogs.length ? (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-[rgba(15,17,23,0.08)] md:block">
                <div className="grid grid-cols-[0.8fr_1.1fr_0.9fr_0.8fr] gap-3 bg-[#F8F9FA] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">
                  <span>Time</span>
                  <span>Action</span>
                  <span>Resource</span>
                  <span>Evidence</span>
                </div>
                {filteredLogs.slice(0, 30).map((log) => (
                  <div key={log.id} className="grid grid-cols-[0.8fr_1.1fr_0.9fr_0.8fr] gap-3 border-t border-[rgba(15,17,23,0.06)] px-3 py-2 text-xs">
                    <span className="font-mono text-[#5F6B73]">{log.createdAt.slice(0, 16).replace("T", " ")}</span>
                    <span className="font-semibold text-[#0F1117]">{log.action}</span>
                    <span className="text-[#5F6B73]">{log.resourceType}</span>
                    <span className="truncate text-[#5F6B73]">{log.requestId ?? log.id}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 md:hidden">
                {filteredLogs.slice(0, 30).map((log) => (
                  <div key={log.id} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-semibold text-[#0F1117]">{log.action}</p>
                      <StatusBadge status={log.category ?? "system"} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <span className="rounded bg-[#F8F9FA] p-2 text-[#5F6B73]"><strong className="block text-[#0F1117]">Time</strong>{log.createdAt.slice(0, 16).replace("T", " ")}</span>
                      <span className="rounded bg-[#F8F9FA] p-2 text-[#5F6B73]"><strong className="block text-[#0F1117]">Resource</strong>{log.resourceType}</span>
                    </div>
                    <p className="mt-2 truncate font-mono text-[10px] text-[#5F6B73]">{log.requestId ?? log.id}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title={exportReady ? "No records for this filter" : "No audit logs loaded"} message="Audit records appear here after auth, AI, document, approval, task, feedback, or admin actions." />
          )}
        </SectionCard>

        <SectionCard title="Review trail" description="Auditability should be visible in sales demos and pilot reviews.">
          {filteredLogs.length ? (
            <ActivityFeed
              items={filteredLogs.slice(0, 8).map((log) => ({
                title: log.action,
                description: `${log.category ?? "system"} - ${log.actorRole ?? "system"} - ${log.resourceType}`,
                time: log.createdAt.slice(5, 16).replace("T", " "),
                tone: log.category === "security" ? "warning" : log.category === "ai" ? "info" : "success",
              }))}
            />
          ) : (
            <EmptyState title="No review trail yet" message="Use the pilot onboarding flow to generate the first evidence chain." />
          )}
          <div className="mt-4">
            <AuditTrailBadge eventId={filteredLogs[0]?.requestId ?? filteredLogs[0]?.id ?? "awaiting-first-event"} />
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default AuditLogsSection;
