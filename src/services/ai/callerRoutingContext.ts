import { classifyAiPrompt } from "./prompt-classifier";
import type { AiCostPreference, AiLatencyPreference, AiPromptRequest, AiProviderName, AiRoutingContext, AiSensitivity, AiTaskCategory } from "./types";

// Lowest to highest.
const sensitivityLevels: AiSensitivity[] = ["public", "internal", "confidential", "restricted"];
const costPreferences: AiCostPreference[] = ["low", "balanced", "premium"];
const latencyPreferences: AiLatencyPreference[] = ["instant", "balanced", "thorough"];
const maxDocumentIds = 100;

function text(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function oneOf<T extends string>(allowed: T[], value: unknown) {
  return allowed.find((item) => item === value);
}

// Builds the routing context for a request that came from a browser. Preferences are copied field by
// field. The tenant policy is server-only and is never copied. Sensitivity is at least what the server
// infers from the prompt: a caller can raise it and cannot lower it.
export function buildCallerRoutingContext(
  request: { prompt: string; task?: AiTaskCategory; context?: unknown },
  user: { id: string; organizationId: string; role: string },
): AiRoutingContext {
  const requested = (request.context && typeof request.context === "object" ? request.context : {}) as Record<string, unknown>;
  const context: AiRoutingContext = {
    organizationId: user.organizationId,
    userId: user.id,
    userRole: user.role,
    departmentId: text(requested.departmentId),
    workspaceId: text(requested.workspaceId),
    documentIds: Array.isArray(requested.documentIds)
      ? requested.documentIds.filter((id): id is string => typeof id === "string").slice(0, maxDocumentIds)
      : undefined,
    // Only a preference: selectTenantModelRoute ignores a provider the tenant policy does not allow.
    preferredProvider: text(requested.preferredProvider) as AiProviderName | undefined,
    costPreference: oneOf(costPreferences, requested.costPreference),
    latencyPreference: oneOf(latencyPreferences, requested.latencyPreference),
    requiresCitation: requested.requiresCitation === true ? true : undefined,
  };
  const promptRequest: AiPromptRequest = { prompt: request.prompt, task: request.task, context };
  const inferred = classifyAiPrompt(promptRequest).sensitivity;
  const asked = oneOf(sensitivityLevels, requested.sensitivity) ?? inferred;
  context.sensitivity = sensitivityLevels.indexOf(asked) > sensitivityLevels.indexOf(inferred) ? asked : inferred;
  return context;
}
