import { liveModelProviders } from "../providers";
import type { AiPromptClassification, AiPromptRequest, AiProviderAdapter, AiProviderCompletion } from "../types";
import { traceAi } from "./aiTracing";

// Below this, a completion is an adapter's own "no live model call" message (openAiProvider.ts).
const LIVE_CONFIDENCE = 0.62;

/** adapter.complete(), traced when a tracer is registered. */
export function traceModelCall(
  adapter: AiProviderAdapter,
  request: AiPromptRequest,
  classification: AiPromptClassification,
): Promise<AiProviderCompletion> {
  const { name } = adapter.config;
  return traceAi(
    () => ({
      name: `axxess-model:${name}`,
      kind: liveModelProviders.has(name) ? "llm" : "chain",
      provider: name,
      model: (completion) => completion.model,
      inputs: {
        messages: [
          { role: "user", content: request.prompt },
          ...(request.priorMessages ?? []).map((message) => message.role === "assistant"
            ? { role: "assistant", content: message.content, tool_calls: message.toolCalls }
            : { role: "tool", name: message.name, content: message.content }),
        ],
        tools: request.tools?.map((tool) => tool.name),
      },
      outputs: (completion) => ({
        messages: [{ role: "assistant", content: completion.text, tool_calls: completion.toolCalls }],
        live: completion.confidence >= LIVE_CONFIDENCE && liveModelProviders.has(name),
        ...(completion.usage ? {
          usage_metadata: {
            input_tokens: completion.usage.promptTokens,
            output_tokens: completion.usage.completionTokens,
            total_tokens: completion.usage.promptTokens + completion.usage.completionTokens,
            ...(completion.actualCostUsd === undefined ? {} : { total_cost: completion.actualCostUsd }),
          },
        } : {}),
      }),
    }),
    () => adapter.complete(request, classification),
  );
}
