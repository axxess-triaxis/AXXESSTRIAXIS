"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";

type SampleDataCounts = {
  projects: number;
  tasks: number;
  meetings: number;
  documents: number;
  total: number;
};

// Real onboarding "Sample:" data (see /api/onboarding/seed-sample-data) is genuine, tenant-scoped,
// editable/deletable content by design -- not a display-only placeholder. This banner is the real
// removal path the seeding route's own contract promises: only renders when a live count of
// sample-tagged records is actually found, and only disappears once they are actually gone.
export function SampleDataBanner({ canRemove }: { canRemove: boolean }) {
  const [counts, setCounts] = useState<SampleDataCounts | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/onboarding/sample-data", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SampleDataCounts | null) => { if (mounted) setCounts(data); })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  if (result) {
    return <Card className="mb-4 border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{result}</Card>;
  }

  if (!counts || counts.total === 0 || !canRemove) return null;

  async function handleRemove() {
    setRemoving(true);
    setResult(null);
    try {
      const response = await fetch("/api/onboarding/sample-data", { method: "DELETE", credentials: "include" });
      const payload = await response.json().catch(() => ({})) as {
        removed?: { projects: number; tasks: number; meetings: number; documentsArchived: number };
        failures?: string[];
        error?: string;
      };
      if (!response.ok) {
        setResult(payload.error ?? "Failed to remove sample data.");
      } else {
        const removedTotal = (payload.removed?.projects ?? 0) + (payload.removed?.tasks ?? 0)
          + (payload.removed?.meetings ?? 0) + (payload.removed?.documentsArchived ?? 0);
        setResult(payload.failures?.length
          ? `Removed ${removedTotal}, ${payload.failures.length} failed. Refresh to see the change.`
          : `Removed ${removedTotal} sample record${removedTotal === 1 ? "" : "s"}. Refresh to see the change.`);
        setCounts(null);
      }
    } catch {
      setResult("Failed to remove sample data.");
    } finally {
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-semibold">{counts.total} sample record{counts.total === 1 ? "" : "s"}</span> from onboarding setup
            {" "}({[
              counts.projects ? `${counts.projects} project${counts.projects === 1 ? "" : "s"}` : null,
              counts.tasks ? `${counts.tasks} task${counts.tasks === 1 ? "" : "s"}` : null,
              counts.meetings ? `${counts.meetings} meeting${counts.meetings === 1 ? "" : "s"}` : null,
              counts.documents ? `${counts.documents} document${counts.documents === 1 ? "" : "s"}` : null,
            ].filter(Boolean).join(", ")}) still appear in your live views.
          </span>
        </div>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-800">This deletes the sample projects/tasks/meetings and archives sample documents. Cannot be undone.</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="rounded-md bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {removing ? "Removing..." : "Confirm removal"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={removing} className="text-xs text-amber-800 underline">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
          >
            <Trash2 size={12} /> Remove sample data
          </button>
        )}
      </div>
    </Card>
  );
}
