import type { ChatIntentResult } from "./chatCommandTypes";

export type ChatCommandCatalogueEntry = {
  action: string;
  description: string;
  argsHint: string;
};

const FALLBACK_ACTION_IDS =
  "task, meeting, reminder, program, project, stakeholder_mapping, notion_insight, analytics_dashboard, slides_ppt, doc_notion, sheets_excel, other";

export function buildChatPrompt(userMessage: string, catalogue: ChatCommandCatalogueEntry[]): string {
  const catalogueText = catalogue.map((entry) => `- ${entry.action}: ${entry.description} Args: ${entry.argsHint}`).join("\n");

  return `You are AXXESS Copilot, an in-app assistant inside the AXXESS TRIaxis platform. Reply with
STRICT JSON only -- no markdown, no code fences -- matching exactly one of these two shapes:

{"type":"chat","reply":"<your natural-language reply>"}
{"type":"command","action":"<action id>","args":{...},"reply":"<a short natural-language confirmation of what you're about to do>"}

Only use "type":"command" when the user is clearly asking you to create or change something in AXXESS.
Directly available actions:
${catalogueText}

If the user is asking for something not in that list (for example creating a program, generating
slides, or storing insights in Notion), still reply with "type":"command", using your best-guess
action id from this broader set: ${FALLBACK_ACTION_IDS} -- and put a plain-text description of the
request in args.summary.

Otherwise (the user is asking a question, chatting, or you need more information before you can act),
reply with "type":"chat".

User message: "${userMessage}"`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Any parse failure or unrecognized shape falls back to a plain chat reply so a malformed model
// response never crashes the widget -- it just becomes ordinary chat text.
export function parseChatResponse(raw: string): ChatIntentResult {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (isRecord(parsed) && parsed.type === "chat" && typeof parsed.reply === "string") {
      return { type: "chat", reply: parsed.reply };
    }

    if (
      isRecord(parsed) &&
      parsed.type === "command" &&
      typeof parsed.action === "string" &&
      typeof parsed.reply === "string"
    ) {
      return {
        type: "command",
        action: parsed.action,
        args: isRecord(parsed.args) ? parsed.args : {},
        reply: parsed.reply,
      };
    }
  } catch {
    // Malformed JSON -- fall through to the plain-chat fallback below.
  }

  return { type: "chat", reply: raw };
}
