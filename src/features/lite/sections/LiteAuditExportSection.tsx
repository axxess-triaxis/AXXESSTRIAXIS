"use client";

import Link from "next/link";
import { ChevronLeft, Download, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { InlineToast } from "../../../components/forms/InlineToast";
import { applicationServices } from "../../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import type { AuditLog } from "../../../domain";

const adminRoles = ["Super Admin", "Organization Admin"];

function base64ToBlob(base64: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Lite Settings real-modules pass (2026-08-27): the "simple activity log" per the doctrine doc's
// §13 -- a plain feed, no category filters (unlike AuditLogsSection.tsx's full admin console).
// Hybrid RBAC per the founder's own confirmed decision: Super Admin/Organization Admin see and
// export the whole organization's activity; every other role sees and exports only their own
// actions. The on-page preview below applies the identical self-only filter the export route
// itself enforces server-side, so what a non-admin sees on screen and what they can download are
// always the same set -- never a preview that shows more than the export can produce.
export function LiteAuditExportSection() {
  const { session } = useAuth();
  const user = session.user;
  const isAdmin = user ? adminRoles.includes(user.role) : false;
  const scope = useMemo(() => (user ? tenantScopeFromUser(user) : undefined), [user]);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"pdf" | "zip" | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!scope || !user) return;
    let cancelled = false;
    applicationServices.auditLogsRepository
      .list(scope, { pageSize: 50 })
      .then((allLogs) => {
        if (cancelled) return;
        setLogs(isAdmin ? allLogs : allLogs.filter((log) => log.actorUserId === user.id));
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, user, isAdmin]);

  if (!user) {
    return <p className="text-xs text-[#5F6B73]">Sign in to view your activity log.</p>;
  }

  const download = async (format: "pdf" | "zip") => {
    setBusy(format);
    setToast(null);
    try {
      const response = await fetch("/api/audit-exports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter: "all", format }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; fileName?: string; contentBase64?: string };
      if (!response.ok || !payload.contentBase64 || !payload.fileName) {
        throw new Error(payload.error ?? "Export failed.");
      }
      const mimeType = format === "pdf" ? "application/pdf" : "application/zip";
      downloadBlob(payload.fileName, base64ToBlob(payload.contentBase64, mimeType));
      setToast({ tone: "success", message: `${format.toUpperCase()} export ready.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Export failed." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link href="/lite/settings" className="flex items-center gap-1 text-xs font-semibold text-[#5F6B73] hover:text-[#0F1117]">
        <ChevronLeft size={14} /> Settings
      </Link>
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Audit Export</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">
          {isAdmin
            ? "Download your organization's activity log as a PDF or ZIP."
            : "Download a log of your own actions as a PDF or ZIP."}
        </p>
      </div>

      {toast && <InlineToast tone={toast.tone} message={toast.message} />}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void download("pdf")}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={14} /> {busy === "pdf" ? "Preparing..." : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={() => void download("zip")}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={14} /> {busy === "zip" ? "Preparing..." : "Download ZIP"}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white">
        {loading ? (
          <p className="px-4 py-3 text-xs text-[#5F6B73]">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="px-4 py-3 text-xs text-[#5F6B73]">No activity yet.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="border-b border-[rgba(0,0,0,0.04)] px-4 py-2.5 last:border-b-0">
              <p className="text-xs font-semibold text-[#0F1117]">{log.action}</p>
              <p className="mt-0.5 text-[10px] text-[#5F6B73]">
                {log.resourceType}
                {log.resourceId ? ` (${log.resourceId})` : ""} &middot; {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
