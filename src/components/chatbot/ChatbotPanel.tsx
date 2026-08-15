"use client";

import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AGENTIC_FIRST_ACTIONS, AGENTIC_ROUTE_FOR_ACTION, AGENTIC_UNAVAILABLE_ACTIONS } from "../agentic/agenticActionTypes";
import type { AgenticFirstAction } from "../agentic/agenticActionTypes";
import { useWorkspaceRouting } from "../../hooks/useWorkspaceRouting";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { canAccessSection, type UserContext } from "../../security/rbac";
import { useAnalytics } from "../../services/analytics";
import { writeAgenticDraft } from "../../services/agentic/agenticDraftHandoff";
import { chatCommandCatalogue, findChatCommand } from "../../services/chatbot/chatCommandRegistry";
import { buildChatPrompt, parseChatResponse } from "../../services/chatbot/chatIntentPrompt";
import { ChatbotConfirmCard } from "./ChatbotConfirmCard";

type ThreadMessage =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "assistant"; text: string }
  | { id: string; kind: "confirm"; summary: string; action: string; args: Record<string, unknown>; resolved?: "confirmed" | "cancelled" };

type ChatbotPanelProps = {
  user: UserContext;
  routePath: string;
  moduleName: string;
  onClose: () => void;
};

const KNOWN_FIRST_ACTIONS = new Set(AGENTIC_FIRST_ACTIONS.map((entry) => entry.value));

function isAgenticFirstAction(value: string): value is AgenticFirstAction {
  return KNOWN_FIRST_ACTIONS.has(value as AgenticFirstAction);
}

let messageIdCounter = 0;
function nextMessageId(): string {
  messageIdCounter += 1;
  return `chat-${messageIdCounter}`;
}

// Owns the panel's own client-side message thread -- unmounted (by ChatbotLauncher) on close, so
// state resets there rather than persisting across opens. No DB-backed chat history exists anywhere
// in this repo to extend (see AXXESS_COPILOT_CHATBOT closeout doc for why this is an explicit v1
// scope boundary, not an oversight).
export function ChatbotPanel({ user, routePath, moduleName, onClose }: ChatbotPanelProps) {
  const analytics = useAnalytics();
  const { navigateToSection } = useWorkspaceRouting();
  const firstName = user.displayName?.trim().split(/\s+/)[0] || "there";
  const scope = tenantScopeFromUser(user);
  const analyticsContext = {
    organization_id: user.organizationId,
    user_id: user.id,
    user_role: user.role,
    module_name: moduleName,
    route: routePath,
  };

  const [messages, setMessages] = useState<ThreadMessage[]>([
    { id: nextMessageId(), kind: "assistant", text: `What can I do for you today, ${firstName}?` },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    analytics.trackEvent("chatbot_opened", {}, analyticsContext);
    // Fires once per mount (i.e. once per panel open) -- deps intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  function appendAssistant(text: string) {
    setMessages((prev) => [...prev, { id: nextMessageId(), kind: "assistant", text }]);
  }

  function handleFallback(action: string, summaryText: string) {
    const mappedAction: AgenticFirstAction = isAgenticFirstAction(action) ? action : "other";
    const destination = AGENTIC_ROUTE_FOR_ACTION[mappedAction];
    analytics.trackEvent("chatbot_fallback_triggered", { action: mappedAction }, analyticsContext);

    if (!destination) {
      appendAssistant(AGENTIC_UNAVAILABLE_ACTIONS[mappedAction] ?? "I can't do that directly in AXXESS yet.");
      return;
    }

    appendAssistant("I can't create that directly yet -- opening a pre-filled form for you.");
    writeAgenticDraft({
      actionType: mappedAction,
      summary: summaryText,
      sourceType: "recommendation",
      createdAt: new Date().toISOString(),
    });
    onClose();
    navigateToSection(destination);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { id: nextMessageId(), kind: "user", text }]);
    setSending(true);
    analytics.trackEvent("chatbot_message_sent", {}, analyticsContext);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildChatPrompt(text, chatCommandCatalogue), task: "general_chat" }),
      });
      const payload = await response.json().catch(() => ({} as { answer?: string; error?: string; confidence?: number }));
      if (!response.ok || typeof payload.answer !== "string") {
        // Never surface the raw backend error string (same F-016 convention AIWorkspaceSection's
        // askGovernedQuestion already follows) -- this route 401s for the investor-demo persona too
        // (a client-side-only mock session, no real Supabase cookies), so a plain "sign in" message
        // is the safe, honest default rather than assuming why the session check failed.
        console.error("Chatbot /api/ai call failed.", response.status, payload.error);
        appendAssistant(response.status === 401 ? "Sign in to chat with AXXESS Copilot." : "AXXESS Copilot couldn't complete that. Try again in a moment.");
        return;
      }

      // aiRouter's provider adapters use confidence: 0.3 as their own deliberate "not a live model
      // call" sentinel (e.g. a missing API key, budget guard skip, or a non-200 provider response --
      // see openAiProvider.ts) vs. ~0.78 for a genuine completion; humanReviewRequired's own threshold
      // (aiRouter.ts) is the same 0.62 split. Below it, payload.answer is technical fallback prose,
      // not a real answer -- show a clean message instead of parsing/displaying it as a chat reply.
      if (typeof payload.confidence === "number" && payload.confidence < 0.62) {
        appendAssistant("AXXESS Copilot's AI provider is temporarily unavailable. Try again shortly.");
        return;
      }

      const intent = parseChatResponse(payload.answer);
      if (intent.type === "chat") {
        appendAssistant(intent.reply);
        return;
      }

      const definition = findChatCommand(intent.action);
      if (!definition) {
        handleFallback(intent.action, intent.reply);
        return;
      }

      if (!canAccessSection(user, definition.section)) {
        analytics.trackEvent("chatbot_command_denied", { action: intent.action }, analyticsContext);
        appendAssistant(`Your role doesn't have access to ${definition.section}, so I can't do that.`);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: nextMessageId(), kind: "assistant", text: intent.reply },
        { id: nextMessageId(), kind: "confirm", summary: definition.summarize(intent.args), action: intent.action, args: intent.args },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function resolveConfirm(messageId: string, action: string, args: Record<string, unknown>, confirmed: boolean) {
    setMessages((prev) => prev.map((message) =>
      message.id === messageId && message.kind === "confirm"
        ? { ...message, resolved: confirmed ? "confirmed" : "cancelled" }
        : message
    ));

    if (!confirmed) {
      appendAssistant("Cancelled -- nothing was changed.");
      return;
    }

    const definition = findChatCommand(action);
    if (!definition) {
      appendAssistant("I lost track of that action -- try again.");
      return;
    }

    const result = await definition.execute(scope, args);
    if (result.ok) {
      analytics.trackEvent("chatbot_command_executed", { action }, analyticsContext);
      appendAssistant(`Done -- ${result.entityLabel}. View it in ${definition.section}.`);
    } else {
      analytics.trackEvent("chatbot_command_failed", { action }, analyticsContext);
      appendAssistant(result.error);
    }
  }

  return (
    <div className="fixed bottom-20 right-5 z-[80] flex h-[560px] max-h-[70vh] w-[380px] flex-col overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-2xl">
      <div className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.06)] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B1E2D]">
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="flex-1 text-sm font-semibold text-[#0F1117]">AXXESS Copilot</div>
        <button type="button" aria-label="Close chatbot" onClick={onClose} className="rounded-lg px-2 py-1 text-xs text-[#5F6B73] hover:bg-[#F2F3F5]">
          Close
        </button>
      </div>

      <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden">
        {messages.map((message) => {
          if (message.kind === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#0F1117] px-4 py-2.5 text-sm leading-relaxed text-white">
                  {message.text}
                </div>
              </div>
            );
          }
          if (message.kind === "assistant") {
            return (
              <div key={message.id} className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#8B1E2D]">
                  <Sparkles size={11} className="text-white" />
                </div>
                <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tl-sm border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-2.5 text-sm leading-relaxed text-[#0F1117]">
                  {message.text}
                </div>
              </div>
            );
          }
          return (
            <ChatbotConfirmCard
              key={message.id}
              summary={message.summary}
              disabled={Boolean(message.resolved)}
              onConfirm={() => void resolveConfirm(message.id, message.action, message.args, true)}
              onCancel={() => void resolveConfirm(message.id, message.action, message.args, false)}
            />
          );
        })}
      </div>

      <div className="border-t border-[rgba(0,0,0,0.06)] p-3">
        <div className="flex items-center gap-2 rounded-xl border border-transparent bg-[#F2F3F5] px-3 py-2.5 transition-all focus-within:border-[#8B1E2D]/30 focus-within:bg-white">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask AXXESS Copilot to create or find something"
            className="flex-1 bg-transparent text-sm text-[#0F1117] outline-none placeholder:text-[#5F6B73]"
          />
          <button
            type="button"
            aria-label="Send message"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B1E2D] transition-colors hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={12} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
