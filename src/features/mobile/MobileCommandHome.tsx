"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileText, CalendarDays, CheckSquare } from "lucide-react";
import type { Document, Meeting, Task } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { LoadingState } from "../../components/feedback/LoadingState";
import { mobileFeatureRegistry, type MobileFeatureId } from "./mobileFeatureRegistry";
import { MobileActionButton } from "./MobileActionButton";
import { useMobileTenantScope } from "./useMobileTenantScope";

type MobileCommandHomeProps = {
  displayName?: string;
  onNavigate: (id: MobileFeatureId) => void;
};

type ApprovalRequestSummary = { status: string };

// MN-2 (2026-08-23): real Command Home -- MN-1 shipped an honest placeholder that deliberately
// showed no numbers (see its own comment below, still true for what this doesn't compute). This is
// the promised follow-up: today's open tasks, pending approvals, the next meeting, and the most
// recently updated document, each fetched from the same tenant-scoped repositories/routes every
// other mobile screen uses -- no fabricated counts, no demo leakage.
export function MobileCommandHome({ displayName, onNavigate }: MobileCommandHomeProps) {
  const scope = useMobileTenantScope();
  const quickLinks = mobileFeatureRegistry.filter((entry) => entry.id !== "home");

  const [loading, setLoading] = useState(true);
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [nextMeeting, setNextMeeting] = useState<Meeting | null>(null);
  const [recentDocument, setRecentDocument] = useState<Document | null>(null);

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      applicationServices.tasksRepository.list(scope, { pageSize: 100 }),
      applicationServices.meetingsRepository.list(scope, { pageSize: 100 }),
      applicationServices.documentsRepository.list(scope, { pageSize: 10 }),
      fetch("/api/approvals", { credentials: "include" }).then((res) => res.json()).catch(() => ({ approvals: [] })),
    ])
      .then(([tasks, meetings, documents, approvalData]: [Task[], Meeting[], Document[], { approvals?: ApprovalRequestSummary[] }]) => {
        if (cancelled) return;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        setTodaysTasks(
          tasks.filter((t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate).getTime() < startOfToday.getTime() + 86400000),
        );
        const now = Date.now();
        const upcoming = meetings.filter((m) => new Date(m.startsAt).getTime() >= now).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
        setNextMeeting(upcoming[0] ?? null);
        const sortedDocs = [...documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setRecentDocument(sortedDocs[0] ?? null);
        setPendingApprovals((approvalData.approvals ?? []).filter((a) => a.status === "pending").length);
      })
      .catch(() => {
        if (cancelled) return;
        setTodaysTasks([]);
        setNextMeeting(null);
        setRecentDocument(null);
        setPendingApprovals(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const summaryCards = useMemo(
    () => [
      { id: "tasks" as const, icon: CheckSquare, label: "Due today", value: `${todaysTasks.length}` },
      { id: "approvals" as const, icon: ClipboardCheck, label: "Pending approvals", value: `${pendingApprovals}` },
      { id: "meetings" as const, icon: CalendarDays, label: "Next meeting", value: nextMeeting ? new Date(nextMeeting.startsAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "None scheduled" },
      { id: "knowledge" as const, icon: FileText, label: "Recently updated", value: recentDocument ? (recentDocument.title ?? recentDocument.name) : "No documents yet" },
    ],
    [todaysTasks, pendingApprovals, nextMeeting, recentDocument],
  );

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <h1 className="text-lg font-semibold text-[#0F1117]">
          {displayName ? `Hi, ${displayName.split(" ")[0]}` : "Welcome back"}
        </h1>
      </div>

      {loading ? (
        <LoadingState label="Today" />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {summaryCards.map((card) => (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="flex min-h-[76px] flex-col items-start gap-1 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 text-left"
            >
              <card.icon size={16} className="text-[#8B1E2D]" />
              <span className="truncate text-xs font-semibold text-[#0F1117]">{card.value}</span>
              <span className="text-[10px] text-[#5F6B73]">{card.label}</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Quick links</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {quickLinks.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onNavigate(entry.id)}
              className="flex min-h-[44px] flex-col items-start gap-1.5 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 text-left transition-colors hover:bg-[#F8F9FA]"
            >
              <entry.icon size={18} className="text-[#8B1E2D]" />
              <span className="text-xs font-semibold text-[#0F1117]">{entry.label}</span>
            </button>
          ))}
        </div>
      </div>

      <MobileActionButton variant="secondary" onClick={() => onNavigate("ai-workspace")} className="w-full">
        Ask AXXESS a question
      </MobileActionButton>
    </div>
  );
}
