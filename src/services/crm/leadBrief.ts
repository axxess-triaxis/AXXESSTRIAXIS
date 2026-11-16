// Automation plan Phase 2 (2026-11-16): a short plain-text brief of a lead's timeline, handed to the
// Callismatic voice agent as background before it calls, so it does not ask again what the contact
// already told us. Newest first, one line per event, at most MAX_BRIEF characters (Callismatic's limit).
// Refused contact attempts and internal field changes are left out: they say nothing about the person.

export const MAX_BRIEF = 1500;
const MAX_LINES = 10;

export type BriefEntry =
  | { kind: "attempt"; at: string; channel: string; decision: string; outcome: string | null; note: string | null }
  | { kind: "change"; at: string; action: string }
  | { kind: "reply"; at: string; category: string; subject: string }
  | { kind: "milestone"; at: string; milestone: string; note: string | null }
  | { kind: "conversation"; at: string; channel: string; direction: string; summary: string };

const day = (iso: string) => iso.slice(0, 10);
const oneLine = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 3).trimEnd()}...` : flat;
};

function line(entry: BriefEntry): string | null {
  switch (entry.kind) {
    case "conversation":
      return `${day(entry.at)} ${entry.direction} ${entry.channel}: ${oneLine(entry.summary, 220)}`;
    case "reply":
      return `${day(entry.at)} email reply (${entry.category.replace(/_/g, " ")}): ${oneLine(entry.subject, 120)}`;
    case "milestone":
      return `${day(entry.at)} ${entry.milestone.replace(/_/g, " ")}${entry.note ? `: ${oneLine(entry.note, 120)}` : ""}`;
    case "attempt":
      if (entry.decision !== "allowed" || !entry.outcome) return null;
      return `${day(entry.at)} ${entry.channel.replace(/_/g, " ")} call: ${entry.outcome.replace(/_/g, " ")}${entry.note ? ` (${oneLine(entry.note, 120)})` : ""}`;
    default:
      return null;
  }
}

/** The brief, or undefined when there is nothing worth telling the agent. */
export function leadBrief(timeline: BriefEntry[]): string | undefined {
  const lines: string[] = [];
  let length = 0;
  for (const entry of [...timeline].sort((a, b) => b.at.localeCompare(a.at))) {
    const text = line(entry);
    if (!text) continue;
    if (length + text.length + 1 > MAX_BRIEF || lines.length >= MAX_LINES) break;
    lines.push(text);
    length += text.length + 1;
  }
  return lines.length ? lines.join("\n") : undefined;
}
