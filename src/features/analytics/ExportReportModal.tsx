"use client";

import { useState } from "react";

// Same overlay/card chrome as MarkEditedModal.tsx / ConfirmDialog.tsx -- not inventing new modal
// styling. "Export Report" previously had no onClick at all; the founder asked for it to prompt
// for instructions before exporting, matching this product's governed-AI positioning (ask for
// intent before acting) rather than a silent, unconfigurable download.
export type ExportReportModalProps = {
  open: boolean;
  onConfirm: (instructions: string) => void;
  onCancel: () => void;
};

export function ExportReportModal({ open, onConfirm, onCancel }: ExportReportModalProps) {
  const [instructions, setInstructions] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="export-report-title">
      <div className="w-full max-w-lg rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-xl">
        <h2 id="export-report-title" className="text-sm font-semibold text-[#0F1117]">Export report</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">
          Tell AXXESS what this export is for -- which sections to include, the audience, or the
          time period -- and it will shape the report accordingly.
        </p>
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={5}
          placeholder="e.g. Board-ready summary of OKR performance and risk distribution for Q4, exclude approval-cycle detail"
          className="mt-3 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(instructions.trim())}
            className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27]"
          >
            Generate export
          </button>
        </div>
      </div>
    </div>
  );
}
