import { afterEach, describe, expect, it } from "vitest";
import { AGENTIC_DRAFT_STORAGE_KEY, clearAgenticDraft, readAndClearAgenticDraft, writeAgenticDraft } from "./agenticDraftHandoff";

describe("agenticDraftHandoff", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("round-trips a draft and clears it after reading", () => {
    writeAgenticDraft({
      actionType: "task",
      summary: "Follow up on the referral SLA.",
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });

    const draft = readAndClearAgenticDraft("task");
    expect(draft?.summary).toBe("Follow up on the referral SLA.");
    expect(window.sessionStorage.getItem(AGENTIC_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("returns null and does not apply the draft when the action type does not match", () => {
    writeAgenticDraft({
      actionType: "task",
      summary: "Follow up on the referral SLA.",
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });

    expect(readAndClearAgenticDraft("meeting")).toBeNull();
  });

  it("returns null for a stale draft older than 10 minutes", () => {
    writeAgenticDraft({
      actionType: "task",
      summary: "Old draft.",
      sourceType: "rag_answer",
      createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    });

    expect(readAndClearAgenticDraft("task")).toBeNull();
  });

  it("returns null when nothing has been written", () => {
    expect(readAndClearAgenticDraft("task")).toBeNull();
  });

  it("returns null for malformed JSON without throwing", () => {
    window.sessionStorage.setItem(AGENTIC_DRAFT_STORAGE_KEY, "not json");
    expect(readAndClearAgenticDraft("task")).toBeNull();
  });

  // MN-5 (2026-08-23): clearAgenticDraft() is called unconditionally from AuthProvider.logout()
  // so a real AI-answer summary + citations never survives into the next session on a shared or
  // re-used device -- this proves the removal itself actually works, independent of a full
  // AuthProvider integration test.
  it("clearAgenticDraft() removes an unread draft outright, without requiring a matching read", () => {
    writeAgenticDraft({
      actionType: "task",
      summary: "Sensitive draft that should not survive logout.",
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });

    clearAgenticDraft();

    expect(window.sessionStorage.getItem(AGENTIC_DRAFT_STORAGE_KEY)).toBeNull();
    expect(readAndClearAgenticDraft("task")).toBeNull();
  });
});
