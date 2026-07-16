import { CheckCircle2, Clock3, FileText, ShieldCheck } from "lucide-react";
import type { WorkflowTimelineEvent } from "../../services/workflows/workflowEvidence";
import { EnterpriseBadge, SectionCard } from "./index";

const eventTone: Record<WorkflowTimelineEvent["eventType"], "success" | "warning" | "info" | "brand" | "neutral"> = {
  tenant_created: "success",
  team_invited: "info",
  source_imported: "info",
  document_indexed: "success",
  ai_answer_generated: "brand",
  human_decision: "warning",
  workflow_action_created: "success",
  dashboard_updated: "info",
  audit_recorded: "neutral",
};

function eventIcon(eventType: WorkflowTimelineEvent["eventType"]) {
  if (eventType === "audit_recorded") return ShieldCheck;
  if (eventType === "document_indexed" || eventType === "source_imported") return FileText;
  if (eventType === "workflow_action_created" || eventType === "tenant_created") return CheckCircle2;
  return Clock3;
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function WorkflowTimelinePanel({
  title = "Workflow timeline",
  description = "Source, AI answer, human decision, created work, and audit evidence for the tenant journey.",
  events,
  compact = false,
  framed = true,
}: {
  title?: string;
  description?: string;
  events: WorkflowTimelineEvent[];
  compact?: boolean;
  framed?: boolean;
}) {
  const visibleEvents = compact ? events.slice(0, 4) : events;
  const content = (
      <div className="space-y-3">
        {visibleEvents.map((event, index) => {
          const Icon = eventIcon(event.eventType);
          return (
            <div key={event.id} className="grid grid-cols-[28px_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F2F3F5] text-[#8B1E2D]">
                  <Icon size={14} aria-hidden="true" />
                </span>
                {index < visibleEvents.length - 1 && <span className="mt-1 h-full w-px bg-[rgba(15,17,23,0.08)]" />}
              </div>
              <div className="min-w-0 rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 text-xs font-semibold text-[#0F1117]">{event.title}</p>
                  <EnterpriseBadge label={event.eventType.replace(/_/g, " ")} tone={eventTone[event.eventType]} />
                </div>
                {event.description && <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{event.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#5F6B73]">
                  <span className="font-mono">{formatEventTime(event.createdAt)}</span>
                  {event.actorLabel && <span>{event.actorLabel}</span>}
                  {event.sourceType && <span className="rounded bg-[#F2F3F5] px-1.5 py-0.5 font-semibold">{event.sourceType}</span>}
                  {event.auditLogId && <span className="font-mono">Audit {event.auditLogId.slice(0, 8)}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {visibleEvents.length === 0 && (
          <div className="rounded-lg border border-dashed border-[rgba(15,17,23,0.12)] bg-[#F8F9FA] p-4 text-sm text-[#5F6B73]">
            Complete the first tenant workflow to build the evidence timeline.
          </div>
        )}
      </div>
  );

  if (!framed) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-[#0F1117]">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{description}</p>
        </div>
        {content}
      </div>
    );
  }

  return (
    <SectionCard title={title} description={description}>
      {content}
    </SectionCard>
  );
}
