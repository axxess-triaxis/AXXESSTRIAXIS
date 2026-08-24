import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readAndClearAgenticDraft } from "../../../services/agentic/agenticDraftHandoff";
import { MobileAskAiScreen } from "./MobileAskAiScreen";

// MN-2 (2026-08-23): real Ask AI workflow -- POST /api/rag/query, so this mocks fetch rather than a
// repository. "Create task from this answer" reuses the existing writeAgenticDraft/
// readAndClearAgenticDraft sessionStorage handoff already proven by TasksSection.agentic.test.tsx.
describe("MobileAskAiScreen (MN-2)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("shows a real answer with confidence and citations from POST /api/rag/query", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: "Your pilot MOU with NE Health Mission is active through Q4.",
        confidence: 0.82,
        humanReviewRequired: false,
        sources: [{ sourceType: "document", sourceId: "d1", title: "MOU draft.pdf", score: 0.9, excerpt: "...active through Q4..." }],
        keywords: ["MOU", "pilot"],
        rationale: "Matched 1 document.",
      }),
    });

    render(<MobileAskAiScreen onCreateTaskFromAnswer={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Ask AXXESS a question…"), { target: { value: "Is our pilot MOU still active?" } });
    fireEvent.click(screen.getByLabelText("Send question"));

    await waitFor(() => expect(screen.getByText("Your pilot MOU with NE Health Mission is active through Q4.")).toBeInTheDocument());
    expect(screen.getByText("82% confidence")).toBeInTheDocument();
    expect(screen.getByText("MOU draft.pdf")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/rag/query", expect.objectContaining({ method: "POST", credentials: "include" }));
  });

  it("writes a real agentic draft and hands off to Tasks when 'Create task from this answer' is tapped", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: "Escalate the referral SLA variance.",
        confidence: 0.6,
        humanReviewRequired: true,
        sources: [],
        keywords: [],
        rationale: "No strong source match.",
      }),
    });
    const onCreateTaskFromAnswer = vi.fn();

    render(<MobileAskAiScreen onCreateTaskFromAnswer={onCreateTaskFromAnswer} />);
    fireEvent.change(screen.getByPlaceholderText("Ask AXXESS a question…"), { target: { value: "What should I escalate?" } });
    fireEvent.click(screen.getByLabelText("Send question"));

    await waitFor(() => expect(screen.getByText("Escalate the referral SLA variance.")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Create task from this answer"));

    expect(onCreateTaskFromAnswer).toHaveBeenCalled();
    expect(readAndClearAgenticDraft("task")?.summary).toBe("Escalate the referral SLA variance.");
  });

  // MN-6 (2026-08-24): real-device evidence (docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_
  // TRIAGE_2026_08_24.md, item 2) showed asking "Hi" returns a 0%-confidence, zero-source
  // non-answer, and tapping "Create task from this answer" on it opened the New Task form
  // pre-filled with the rejection text as the task title. This proves that path is now blocked.
  it("hides 'Create task from this answer' and does not write a draft for a genuine no-match (0% confidence, no sources)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: "No authorized institutional source matched this question.",
        confidence: 0,
        humanReviewRequired: true,
        sources: [],
        keywords: [],
        rationale: "No source matched.",
      }),
    });
    const onCreateTaskFromAnswer = vi.fn();

    render(<MobileAskAiScreen onCreateTaskFromAnswer={onCreateTaskFromAnswer} />);
    fireEvent.change(screen.getByPlaceholderText("Ask AXXESS a question…"), { target: { value: "Hi" } });
    fireEvent.click(screen.getByLabelText("Send question"));

    await waitFor(() => expect(screen.getByText("No authorized institutional source matched this question.")).toBeInTheDocument());

    expect(screen.queryByText("Create task from this answer")).not.toBeInTheDocument();
    expect(onCreateTaskFromAnswer).not.toHaveBeenCalled();
    expect(readAndClearAgenticDraft("task")).toBeNull();
  });
});
