// Lightweight sessionStorage handoff for Stakeholders & CRM's "Add note" action -- distinct from
// agenticDraftHandoff.ts, which is purpose-built for the AI-answer-driven actionables gate (a
// different feature: an AI Workspace answer offering to become a task/meeting/reminder/etc.). This
// handoff is a direct, unconditional cross-page handoff triggered by an explicit button click, with
// no gate and no action-type union to thread through.
const STAKEHOLDER_NOTE_DRAFT_KEY = "axxess.stakeholderNoteDraft.v1";
const DRAFT_STALE_AFTER_MS = 10 * 60 * 1000;

export type StakeholderNoteDraft = {
  stakeholderName: string;
  presetBody?: string;
  createdAt: string;
};

export function writeStakeholderNoteDraft(draft: Omit<StakeholderNoteDraft, "createdAt">): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STAKEHOLDER_NOTE_DRAFT_KEY, JSON.stringify({ ...draft, createdAt: new Date().toISOString() }));
}

export function readAndClearStakeholderNoteDraft(): StakeholderNoteDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STAKEHOLDER_NOTE_DRAFT_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(STAKEHOLDER_NOTE_DRAFT_KEY);

  let draft: StakeholderNoteDraft;
  try {
    draft = JSON.parse(raw) as StakeholderNoteDraft;
  } catch {
    return null;
  }

  const age = Date.now() - new Date(draft.createdAt).getTime();
  if (!Number.isFinite(age) || age > DRAFT_STALE_AFTER_MS) return null;
  return draft;
}
