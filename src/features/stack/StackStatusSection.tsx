"use client";

import { ArrowRight, CheckCircle2, Clock3, Workflow, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { isDemoModeEnabled, isDemoModeForcedByEnv } from "../../demo/demoMode";
import { createDemoStackSnapshot } from "../../demo/demoStackRuns";
import type { StackRunStatus, StackSnapshot, StackSource } from "../../services/agents/stackWorkflowSnapshot";

// Stack status page (2026-11-08): the cross-product flow at a glance -- how the four products
// connect, what the last 7 days produced, and the latest runs. Real data comes from
// GET /api/agents/stack-runs. A deployment forced into demo mode shows labelled sample runs and
// makes no API call.

const flow = [
  { name: "Callismatic", detail: "Answers calls and messages, triages each one" },
  { name: "Omnidamus", detail: "AI conversations, closes with key facts" },
  { name: "Event bus", detail: "AWS, carries each event once" },
  { name: "STILL", detail: "Routes events: every lead becomes a task, duplicates and spam stop here" },
  { name: "AXXESS TRIaxis", detail: "Creates the task and logs every call" },
];

const sourceLabels: Record<StackSource, string> = {
  callismatic: "Callismatic",
  omnidamus: "Omnidamus",
  other: "Other agent",
};

const statusLabels: Record<StackRunStatus, string> = {
  "task-created": "Task created",
  pending: "Awaiting approval",
  denied: "Not permitted",
  failed: "Failed",
};

const statusTone: Record<StackRunStatus, string> = {
  "task-created": "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  denied: "bg-[#F2F3F5] text-[#5F6B73]",
  failed: "bg-red-50 text-red-700",
};

// A fixed zone, so server and browser render the same text.
const timeFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function formatTime(value: string) {
  return `${timeFormat.format(new Date(value))} UTC`;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; snapshot: StackSnapshot; sample: boolean }
  | { kind: "error"; message: string };

function Stat(props: { label: string; value: number; testId: string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{props.label}</p>
      <p data-testid={props.testId} className={`mt-1 text-2xl font-bold ${props.tone ?? "text-[#0F1117]"}`}>{props.value}</p>
    </Card>
  );
}

export function StackStatusSection() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    if (isDemoModeForcedByEnv() || isDemoModeEnabled()) {
      setState({ kind: "ready", snapshot: createDemoStackSnapshot(), sample: true });
      return;
    }
    fetch("/api/agents/stack-runs", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setState({ kind: "error", message: `Could not load workflow runs (${response.status}).` });
          return;
        }
        setState({ kind: "ready", snapshot: await response.json() as StackSnapshot, sample: false });
      })
      .catch(() => {
        if (active) setState({ kind: "error", message: "Could not load workflow runs (network error)." });
      });
    return () => {
      active = false;
    };
  }, []);

  const snapshot = state.kind === "ready" ? state.snapshot : undefined;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Stack"
        subtitle="How Callismatic, Omnidamus, STILL and AXXESS TRIaxis work as one system, and what they did in the last 7 days."
      />

      {state.kind === "ready" && state.sample ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Sample data: this preview shows illustrative runs, not a live workspace.</p>
      ) : null}

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Workflow size={15} className="text-[#8B1E2D]" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Schema</h2>
        </div>
        <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          {flow.map((step, index) => (
            <li key={step.name} className="flex flex-col gap-2 lg:flex-1 lg:flex-row lg:items-center">
              <div className="flex-1 rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FA] p-3">
                <p className="text-sm font-semibold text-[#0F1117]">{step.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{step.detail}</p>
              </div>
              {index < flow.length - 1 ? <ArrowRight size={16} aria-hidden className="mx-auto shrink-0 rotate-90 text-[#8B1E2D] lg:rotate-0" /> : null}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] leading-relaxed text-[#5F6B73]">
          Callismatic and Omnidamus both publish to the event bus. Events STILL stops, such as duplicates, spam and malformed events, never reach AXXESS, so the counts below include only calls that did.
        </p>
      </Card>

      {state.kind === "loading" ? <p className="text-xs text-[#5F6B73]">Loading workflow runs...</p> : null}
      {state.kind === "error" ? <Card className="p-4"><p className="text-xs text-red-700">{state.message}</p></Card> : null}

      {snapshot ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Runs, last 7 days" value={snapshot.totals.runs} testId="stack-stat-runs" />
            <Stat label="Tasks created" value={snapshot.totals.tasksCreated} testId="stack-stat-tasks" tone="text-emerald-700" />
            <Stat label="Awaiting approval" value={snapshot.totals.pending} testId="stack-stat-pending" />
            <Stat label="Failed or refused" value={snapshot.totals.failed} testId="stack-stat-failed" tone={snapshot.totals.failed ? "text-red-700" : undefined} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(["callismatic", "omnidamus"] as const).map((source) => (
              <Card key={source} className="p-4">
                <p className="text-sm font-semibold text-[#0F1117]">From {sourceLabels[source]}</p>
                <p className="mt-1 text-xs text-[#5F6B73]">
                  {snapshot.bySource[source].runs} runs, {snapshot.bySource[source].tasksCreated} tasks created
                </p>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
              <Clock3 size={15} className="text-[#8B1E2D]" />
              <h2 className="text-sm font-semibold text-[#0F1117]">Workflow runs</h2>
              {snapshot.lastRunAt ? <span className="ml-auto text-[11px] text-[#5F6B73]">Last run {formatTime(snapshot.lastRunAt)}</span> : null}
            </div>
            {snapshot.runs.length === 0 ? (
              <p className="px-4 py-6 text-xs text-[#5F6B73]">No workflow runs in the last 7 days. A run appears here when STILL creates or tries to create a task.</p>
            ) : (
              <ul>
                {snapshot.runs.map((run) => (
                  <li key={run.id} className="border-b border-[rgba(0,0,0,0.04)] px-4 py-3 last:border-b-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone[run.status]}`}>
                        {run.status === "task-created" ? <CheckCircle2 size={11} aria-hidden /> : run.status === "failed" ? <XCircle size={11} aria-hidden /> : null}
                        {statusLabels[run.status]}
                      </span>
                      <span className="text-[11px] font-medium text-[#5F6B73]">{sourceLabels[run.source]}</span>
                      {run.priority ? <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">{run.priority}</span> : null}
                      <span className="ml-auto text-[11px] text-[#5F6B73]">{formatTime(run.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#0F1117]">{run.title ?? "Untitled task"}</p>
                    {run.error ? <p className="mt-1 text-[11px] text-red-700">{run.error}</p> : null}
                    {run.stillEventId ? <p className="mt-1 font-mono text-[10px] text-[#5F6B73]">STILL event {run.stillEventId}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

export default StackStatusSection;
