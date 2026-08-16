import type { AiProviderAdapter, AiProviderConfig, AiToolCall } from "../types";
import { checkProviderBudgetHeadroom, recordProviderSpend } from "../aiSpendGuard";

// Model slugs and per-token pricing verified directly against openrouter.ai's own model pages
// (2026-07-27) -- not guessed. Pricing is a point-in-time snapshot; OpenRouter pricing changes,
// so this is read as "best known at implementation time," matching this program's own evidence
// discipline (see GLOBAL_GTM_AI_ROUTER_ROADMAP_2026_07_27.md Non-Negotiables).
const OPENROUTER_MODEL_SLUG: Partial<Record<AiProviderConfig["name"], string>> = {
  kimi: "moonshotai/kimi-k2",
  deepseek: "deepseek/deepseek-chat",
};

const OPENROUTER_PRICING_PER_TOKEN: Partial<Record<AiProviderConfig["name"], { prompt: number; completion: number }>> = {
  kimi: { prompt: 0.00000057, completion: 0.0000023 },
  deepseek: { prompt: 0.0000002002, completion: 0.0000008001 },
};

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Kimi and DeepSeek share one OpenRouter account/credit pool -- the spend guard tracks and checks
// against that shared balance, not per-model, matching how OpenRouter itself bills.
const OPENROUTER_BUDGET_PROVIDER = "openrouter";

type OpenRouterToolCall = {
  id?: string;
  function?: { name?: string; arguments?: string };
};

type OpenRouterChatResponse = {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: OpenRouterToolCall[] } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

// Same defensive parse as openAiProvider.ts's parseOpenAiToolCalls -- OpenRouter's chat completions
// API is OpenAI-compatible, so the shape (and the malformed-JSON risk) is identical. Duplicated
// rather than shared, matching this file's existing convention of a self-contained adapter.
function parseOpenRouterToolCalls(raw: OpenRouterToolCall[] | undefined): AiToolCall[] {
  if (!raw?.length) return [];
  return raw
    .filter((call): call is OpenRouterToolCall & { id: string; function: { name: string } } =>
      Boolean(call.id && call.function?.name))
    .map((call) => {
      let args: Record<string, unknown> = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = { __parseError: "OpenRouter returned malformed JSON arguments for this tool call.", __raw: call.function.arguments };
      }
      return { id: call.id, name: call.function.name, arguments: args };
    });
}

export function createOpenRouterProvider(
  config: AiProviderConfig,
  env: NodeJS.ProcessEnv = process.env,
): AiProviderAdapter {
  const modelSlug = OPENROUTER_MODEL_SLUG[config.name];
  const pricing = OPENROUTER_PRICING_PER_TOKEN[config.name];

  return {
    config,
    async complete(request) {
      const startedAt = Date.now();
      const apiKey = env.OPENROUTER_API_KEY;

      if (!apiKey || !modelSlug) {
        return {
          text: `${config.displayName} is not fully configured (missing OpenRouter API key or model mapping). No live model call was made.`,
          confidence: 0.3,
          latencyMs: Date.now() - startedAt,
        };
      }

      const budget = await checkProviderBudgetHeadroom(OPENROUTER_BUDGET_PROVIDER);
      if (!budget.ok) {
        return {
          text: `${config.displayName} call skipped: ${budget.reason}`,
          confidence: 0.3,
          latencyMs: Date.now() - startedAt,
        };
      }

      try {
        const response = await fetch(OPENROUTER_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": env.NEXT_PUBLIC_APP_URL ?? "https://landing.triaxisventures.com",
            "X-Title": "AXXESS TRIaxis",
          },
          body: JSON.stringify({
            model: modelSlug,
            messages: [
              { role: "user", content: request.prompt },
              ...(request.priorMessages ?? []).map((message) =>
                message.role === "assistant"
                  ? { role: "assistant", content: message.content, tool_calls: message.toolCalls?.map((call) => ({
                      id: call.id,
                      type: "function",
                      function: { name: call.name, arguments: JSON.stringify(call.arguments) },
                    })) }
                  : { role: "tool", tool_call_id: message.toolCallId, content: message.content },
              ),
            ],
            // Omitted entirely (not an empty array) when no tools are offered -- today's exact
            // request shape for every existing single-shot caller, and for kimi (supportsToolCalling
            // stays false, so agenticChatLoop.ts never builds a tools array for it).
            ...(request.tools?.length ? {
              tools: request.tools.map((tool) => ({
                type: "function",
                function: { name: tool.name, description: tool.description, parameters: tool.parameters },
              })),
              tool_choice: "auto",
            } : {}),
          }),
        });

        if (!response.ok) {
          return {
            text: `${config.displayName} request failed (${response.status}). This response was not generated by a live model call; treat it as unverified.`,
            confidence: 0.3,
            latencyMs: Date.now() - startedAt,
          };
        }

        const payload = await response.json() as OpenRouterChatResponse;
        const text = payload.choices?.[0]?.message?.content;
        // OpenRouter (OpenAI-compatible) can return content: null alongside tool_calls -- toolCalls,
        // not text, is what makes this response non-empty in that case.
        const toolCalls = parseOpenRouterToolCalls(payload.choices?.[0]?.message?.tool_calls);
        const promptTokens = payload.usage?.prompt_tokens ?? 0;
        const completionTokens = payload.usage?.completion_tokens ?? 0;
        const actualCostUsd = pricing
          ? Number((promptTokens * pricing.prompt + completionTokens * pricing.completion).toFixed(6))
          : undefined;

        if (!text && toolCalls.length === 0) {
          return {
            text: `${config.displayName} returned no content. This response was not generated by a live model call; treat it as unverified.`,
            confidence: 0.3,
            latencyMs: Date.now() - startedAt,
          };
        }

        if (actualCostUsd) {
          await recordProviderSpend(OPENROUTER_BUDGET_PROVIDER, actualCostUsd);
        }

        return {
          text: text ?? "",
          confidence: 0.78,
          latencyMs: Date.now() - startedAt,
          usage: { promptTokens, completionTokens },
          actualCostUsd,
          ...(toolCalls.length ? { toolCalls } : {}),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          text: `${config.displayName} request failed (${message}). This response was not generated by a live model call; treat it as unverified.`,
          confidence: 0.3,
          latencyMs: Date.now() - startedAt,
        };
      }
    },
  };
}
