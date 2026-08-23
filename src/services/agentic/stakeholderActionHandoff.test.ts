import { afterEach, describe, expect, it } from "vitest";
import { clearStakeholderNoteDraft, readAndClearStakeholderNoteDraft, writeStakeholderNoteDraft } from "./stakeholderActionHandoff";

describe("stakeholderActionHandoff", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("round-trips a draft and clears it after reading", () => {
    writeStakeholderNoteDraft({ stakeholderName: "Dr. Priya Sharma", presetBody: "Follow-up on renewal." });
    const draft = readAndClearStakeholderNoteDraft();
    expect(draft?.stakeholderName).toBe("Dr. Priya Sharma");
    expect(readAndClearStakeholderNoteDraft()).toBeNull();
  });

  it("returns null for a stale draft older than 10 minutes", () => {
    writeStakeholderNoteDraft({ stakeholderName: "Old", presetBody: "Stale." });
    // Simulate staleness by writing directly with a backdated createdAt.
    window.sessionStorage.setItem(
      "axxess.stakeholderNoteDraft.v1",
      JSON.stringify({ stakeholderName: "Old", presetBody: "Stale.", createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString() }),
    );
    expect(readAndClearStakeholderNoteDraft()).toBeNull();
  });

  // MN-5 (2026-08-23): clearStakeholderNoteDraft() is called unconditionally from
  // AuthProvider.logout() so a real stakeholder name/note body never survives into the next
  // session on a shared or re-used device -- this proves the removal itself actually works.
  it("clearStakeholderNoteDraft() removes an unread draft outright, without requiring a matching read", () => {
    writeStakeholderNoteDraft({ stakeholderName: "Sensitive Name", presetBody: "Sensitive note that should not survive logout." });
    clearStakeholderNoteDraft();
    expect(readAndClearStakeholderNoteDraft()).toBeNull();
  });
});
