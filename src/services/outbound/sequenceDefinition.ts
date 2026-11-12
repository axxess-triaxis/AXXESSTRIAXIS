// Validates an outreach sequence before it is stored (GTM plan 2026-11-11). A sequence is 1 to
// 10 email steps; the first is on day 0 and later steps are on strictly later whole days. Only
// the merge fields the renderer knows are allowed, so a bad template fails here, not at send time.
import { MERGE_FIELD_NAMES } from "./outreachEmail";

export type SequenceStep = { dayOffset: number; subject: string; body: string };
export type SequenceDefinition = { name: string; steps: SequenceStep[] };

type Result = { ok: true; value: SequenceDefinition } | { ok: false; error: string };

function unknownField(text: string): string | undefined {
  for (const match of text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) {
    if (!MERGE_FIELD_NAMES.includes(match[1])) return match[1];
  }
  return undefined;
}

export function validateSequence(input: unknown): Result {
  if (!input || typeof input !== "object") return { ok: false, error: "Sequence must be an object." };
  const { name, steps } = input as { name?: unknown; steps?: unknown };
  if (typeof name !== "string" || !name.trim()) return { ok: false, error: "Sequence name is required." };
  if (name.trim().length > 200) return { ok: false, error: "Sequence name is too long." };
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > 10) return { ok: false, error: "A sequence needs 1 to 10 steps." };

  const clean: SequenceStep[] = [];
  for (const [index, raw] of steps.entries()) {
    const n = index + 1;
    const { dayOffset, subject, body } = (raw ?? {}) as { dayOffset?: unknown; subject?: unknown; body?: unknown };
    if (typeof dayOffset !== "number" || !Number.isInteger(dayOffset) || dayOffset < 0 || dayOffset > 365) {
      return { ok: false, error: `Step ${n} needs a whole-day offset from 0 to 365.` };
    }
    if (typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim()) {
      return { ok: false, error: `Step ${n} needs a subject and a body.` };
    }
    if (index === 0 && dayOffset !== 0) return { ok: false, error: "Step 1 must be on day 0." };
    if (index > 0 && dayOffset <= clean[index - 1].dayOffset) return { ok: false, error: `Step ${n} must come after step ${n - 1}.` };
    const unknown = unknownField(subject) ?? unknownField(body);
    if (unknown) return { ok: false, error: `Step ${n} uses an unknown merge field: ${unknown}.` };
    clean.push({ dayOffset, subject, body });
  }
  return { ok: true, value: { name: name.trim(), steps: clean } };
}
