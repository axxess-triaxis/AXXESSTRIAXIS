"use client";

import { useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { MobileActionButton } from "../MobileActionButton";
import { writeAgenticDraft } from "../../../services/agentic/agenticDraftHandoff";
import type { RagAnswer } from "../../../services/rag/governedRag";

type MobileAskAiScreenProps = {
  onCreateTaskFromAnswer: () => void;
};

// MN-2 (2026-08-23): real Ask AI workflow -- POST /api/rag/query (the same governed RAG route
// desktop AIWorkspaceSection.tsx calls), rendering the genuine RagAnswer shape (confidence, real
// citations with excerpts, humanReviewRequired) rather than a mocked chat bubble. "Create actionable
// from this answer" reuses the existing writeAgenticDraft/readAndClearAgenticDraft sessionStorage
// handoff (src/services/agentic/agenticDraftHandoff.ts) that desktop's TasksSection already
// consumes -- MobileTasksScreen now consumes it too (see its own mount effect).
export function MobileAskAiScreen({ onCreateTaskFromAnswer }: MobileAskAiScreenProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<RagAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not get an answer.");
        return;
      }
      setAnswer(data as RagAnswer);
    } finally {
      setAsking(false);
    }
  }

  function handleCreateTask() {
    if (!answer) return;
    writeAgenticDraft({
      actionType: "task",
      secondStep: "create",
      summary: answer.answer,
      citations: answer.sources.map((s) => ({ sourceId: s.sourceId, title: s.title })),
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });
    onCreateTaskFromAnswer();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask AXXESS a question…"
          className="min-h-[44px] flex-1 rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
        />
        <button onClick={handleAsk} disabled={asking || !question.trim()} aria-label="Send question" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-[#8B1E2D] text-white disabled:opacity-50">
          <Send size={16} />
        </button>
      </div>

      {asking && <LoadingState label="Thinking" />}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-[#F3C6C4] bg-[#FDE7E7] px-3.5 py-3 text-sm text-[#B3261E]">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!asking && !error && !answer && (
        <EmptyState title="Ask a question" message="Answers are grounded in your organization's real documents and knowledge articles, with citations." />
      )}

      {answer && (
        <div className="flex flex-col gap-3 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-4 py-4">
          <p className="text-sm text-[#0F1117]">{answer.answer}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-[11px] font-semibold text-[#0F1117]">
              {Math.round(answer.confidence * 100)}% confidence
            </span>
            {answer.humanReviewRequired && (
              <span className="rounded-full bg-[#FFF4E5] px-2.5 py-1 text-[11px] font-semibold text-[#B26A00]">Human review recommended</span>
            )}
          </div>
          <p className="text-xs text-[#5F6B73]">{answer.rationale}</p>

          {answer.sources.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Sources</h3>
              <div className="flex flex-col gap-1.5">
                {answer.sources.map((source, i) => (
                  <div key={i} className="rounded-lg border border-[rgba(15,17,23,0.06)] bg-[#F8F9FA] px-3 py-2">
                    <p className="text-xs font-semibold text-[#0F1117]">{source.title}</p>
                    <p className="text-[11px] text-[#5F6B73]">{source.excerpt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <MobileActionButton variant="secondary" onClick={handleCreateTask} className="w-full justify-center">
            Create task from this answer
          </MobileActionButton>
        </div>
      )}
    </div>
  );
}
