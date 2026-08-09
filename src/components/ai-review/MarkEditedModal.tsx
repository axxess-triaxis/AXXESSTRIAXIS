"use client";

import { useEffect, useState } from "react";

// A-102 (2026-08-09): "Mark edited" previously recorded a fixed template string as the decision
// reason, with no capture of what the reviewer actually changed. Extends ConfirmDialog.tsx's exact
// overlay/card chrome (fixed inset-0 z-[80], role="dialog", white rounded card), same as
// AgenticActionablesPrompt.tsx's free-text step, rather than inventing new modal styling.
export type MarkEditedModalProps = {
  open: boolean;
  originalAnswer: string;
  onConfirm: (editedText: string) => void;
  onCancel: () => void;
};

export function MarkEditedModal({ open, originalAnswer, onConfirm, onCancel }: MarkEditedModalProps) {
  const [text, setText] = useState(originalAnswer);

  // The modal is mounted once and reused across different review rows -- re-seed the textarea
  // whenever it opens for a (possibly different) review, rather than keeping stale text from the
  // previous one open.
  useEffect(() => {
    if (open) setText(originalAnswer);
  }, [open, originalAnswer]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="mark-edited-title">
      <div className="w-full max-w-lg rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-xl">
        <h2 id="mark-edited-title" className="text-sm font-semibold text-[#0F1117]">Edit this answer</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">
          Make the change the AI output needs, then save -- the edited text is what gets recorded, not just a note that it was edited.
        </p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
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
            onClick={() => onConfirm(text.trim())}
            disabled={!text.trim()}
            className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save edited answer
          </button>
        </div>
      </div>
    </div>
  );
}
