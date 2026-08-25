import type { AgenticFirstAction, AgenticSecondStepId, AgenticSourceType } from "../../components/agentic/agenticActionTypes";

export const AGENTIC_DRAFT_STORAGE_KEY = "axxess.agenticDraft.v1";

const DRAFT_STALE_AFTER_MS = 10 * 60 * 1000;

export type AgenticDraft = {
  actionType: AgenticFirstAction;
  secondStep?: AgenticSecondStepId;
  summary: string;
  citations?: { sourceId: string; title: string }[];
  sourceType: AgenticSourceType;
  otherInstruction?: string;
  createdAt: string;
};

export function writeAgenticDraft(draft: AgenticDraft): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AGENTIC_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

// Consumed once, by the destination section on mount. Only clears the key on a genuine match (so
// it's never silently reapplied to a later, unrelated visit) or on real garbage (corrupt/stale) --
// a type mismatch leaves the key in place, since callers legitimately chain calls for related
// action types (e.g. readAndClearAgenticDraft("task") ?? readAndClearAgenticDraft("reminder")),
// and an early mismatch must not destroy a draft a later call in the same chain would have matched.
export function readAndClearAgenticDraft(expectedActionType: AgenticFirstAction): AgenticDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(AGENTIC_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  let draft: AgenticDraft;
  try {
    draft = JSON.parse(raw) as AgenticDraft;
  } catch {
    window.sessionStorage.removeItem(AGENTIC_DRAFT_STORAGE_KEY);
    return null;
  }

  const age = Date.now() - new Date(draft.createdAt).getTime();
  if (!Number.isFinite(age) || age > DRAFT_STALE_AFTER_MS) {
    window.sessionStorage.removeItem(AGENTIC_DRAFT_STORAGE_KEY);
    return null;
  }

  if (draft.actionType !== expectedActionType) return null;

  window.sessionStorage.removeItem(AGENTIC_DRAFT_STORAGE_KEY);
  return draft;
}

// MN-5 (2026-08-23): a real AI-answer summary + document/knowledge-article citations can sit in
// this key for up to DRAFT_STALE_AFTER_MS -- called from AuthProvider.logout() so a shared or
// re-used device never carries a signed-out user's draft into the next session.
export function clearAgenticDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AGENTIC_DRAFT_STORAGE_KEY);
}
