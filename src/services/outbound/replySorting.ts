// Reply sorting (GTM plan 2026-11-11, Day 3 item 1). Pure rules and actions; the Claude call and
// the webhook wiring live elsewhere. Rules run first so clear cases never reach the AI.

export const REPLY_CATEGORIES = ["interested", "not_now", "unsubscribe", "out_of_office", "other"] as const;
export type ReplyCategory = (typeof REPLY_CATEGORIES)[number];
export type ClassifiedBy = "rules" | "claude" | "fallback";

export interface InboundReply {
  subject: string;
  text: string;
  headers: Record<string, string>;
}

const OUT_OF_OFFICE_SUBJECT = /\b(out of (the )?office|automatic reply|auto[- ]?reply|autoreply|on leave|on vacation)\b/i;
const UNSUBSCRIBE_ONLY = /^\s*(please\s+)?(unsubscribe|remove me|stop|do not contact( me)?|don't contact( me)?)[\s.!]*$/i;

function header(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

// Returns a category only when the rules are sure; otherwise null, and the caller asks Claude.
export function classifyByRules(reply: InboundReply): ReplyCategory | null {
  const autoSubmitted = header(reply.headers, "auto-submitted");
  if (autoSubmitted && autoSubmitted.toLowerCase() !== "no") return "out_of_office";
  if (OUT_OF_OFFICE_SUBJECT.test(reply.subject)) return "out_of_office";
  const firstBlock = reply.text.split(/\r?\n\s*\r?\n|\r?\nOn .+wrote:/)[0] ?? "";
  if (UNSUBSCRIBE_ONLY.test(firstBlock)) return "unsubscribe";
  return null;
}

export interface ReplyActions {
  stopSequence: boolean;
  moveNewToQualifying: boolean;
  followUpInDays: number | null;
  markLost: boolean;
  suppressEmail: boolean;
  ownerTask: string | null;
}

export function actionsForCategory(category: ReplyCategory): ReplyActions {
  const none: ReplyActions = { stopSequence: true, moveNewToQualifying: false, followUpInDays: null, markLost: false, suppressEmail: false, ownerTask: null };
  switch (category) {
    case "interested": return { ...none, moveNewToQualifying: true, followUpInDays: 1, ownerTask: "Reply: interested - call back" };
    case "not_now": return { ...none, followUpInDays: 30 };
    case "unsubscribe": return { ...none, markLost: true, suppressEmail: true };
    case "out_of_office": return { ...none, stopSequence: false };
    case "other": return { ...none, ownerTask: "Reply needs reading" };
  }
}
