"use client";

type ChatbotConfirmCardProps = {
  summary: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
};

// Rendered as a bubble inside the chat thread, not a full-screen fixed inset-0 overlay -- that
// pattern (ConfirmDialog.tsx, AgenticActionablesPrompt.tsx) is for governance-style interruption,
// which this lightweight inline confirm explicitly is not.
export function ChatbotConfirmCard({ summary, onConfirm, onCancel, disabled }: ChatbotConfirmCardProps) {
  return (
    <div className="ml-10 max-w-[85%] rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3">
      <p className="text-sm text-[#0F1117]">{summary}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-1.5 text-xs font-semibold text-[#0F1117] transition-colors hover:bg-[#F2F3F5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
