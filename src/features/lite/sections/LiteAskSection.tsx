"use client";

import { useState } from "react";
import { MessagesSquare } from "lucide-react";

// XL-6 (2026-08-06): AXXESS Lite's own Ask section -- calls the same POST /api/rag/query the
// full X0 governed RAG workflow uses (src/app/api/rag/query/route.ts), already allowlisted for
// the Lite host (XL-4). Deliberately does not surface the AI Review Inbox, agentic MCP tools, or
// any auto-create-a-task-from-the-answer behavior -- a plain question box with a cited answer,
// nothing else.
type RagAnswer = {
  answer?: string;
  citations?: { title?: string; documentId?: string }[];
  confidence?: number;
};

export function LiteAskSection() {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<RagAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), limit: 5 }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({} as { error?: string }));
        throw new Error(body.error ?? "Question failed.");
      }
      setResult(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get an answer -- please try again.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Ask AXXESS</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Ask a question about your own uploaded files.</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3.5">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What would you like to know?"
          rows={3}
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <button
          onClick={submit}
          disabled={asking || !question.trim()}
          className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {asking ? "Asking..." : "Ask"}
        </button>
        {error && <p className="text-[11px] text-[#B54708]">{error}</p>}
      </div>

      {result && (
        <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3.5">
          <p className="text-xs leading-relaxed text-[#0F1117]">{result.answer ?? "No answer available yet."}</p>
          {result.citations && result.citations.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 border-t border-[rgba(0,0,0,0.04)] pt-2">
              <p className="text-[10px] font-medium text-[#5F6B73]">Sources</p>
              {result.citations.map((citation, index) => (
                <p key={citation.documentId ?? index} className="text-[10px] text-[#5F6B73]">{citation.title ?? "Untitled document"}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && !asking && (
        <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-6 py-8 text-center">
          <MessagesSquare size={20} className="mx-auto mb-2 text-[#8B1E2D]" />
          <p className="text-xs text-[#5F6B73]">Ask a question above. Answers are based only on files you&apos;ve uploaded to your own organization.</p>
        </div>
      )}
    </div>
  );
}
