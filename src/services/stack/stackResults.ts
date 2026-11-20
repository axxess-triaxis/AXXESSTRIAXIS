// Stack org routing (2026-11-20, plan: docs/readiness/CUSTOMER_FIREABLE_STACK_PLAN_2026_11_20.md).
// Files a Callismatic or Omnidamus result, delivered by STILL, into the organization that started the
// job. The organization is read from the job row; an organization_id in the event is only checked
// against it, never used. A job that does not exist, belongs elsewhere, or whose product is switched
// off for that organization is refused, and the refusal is audited where there is an organization.
import { completeMessageJob, findStackJobOwner, getOrgAgentSettings, setMessageJobTask, type StackProduct } from "../../repositories/stackJobsRepository";
import type { AgentScope } from "../../security/agentScope";
import { recordAgentToolAuditEvent } from "../agents/agentConnectionRepository";
import { getAgentTool, validateAgentToolArguments } from "../agents/toolRegistry";

export const CALL_COMPLETED = "call.completed.v1";
export const CONVERSATION_COMPLETED = "conversation.completed.v1";

export type StackResultOutcome =
  | { status: 200; body: Record<string, unknown> }
  | { status: 400 | 403 | 404 | 409 | 500; body: { error: string } };

const fail = (status: 400 | 403 | 404 | 409 | 500, error: string): StackResultOutcome => ({ status, body: { error } });

function stackScope(organizationId: string, requestedBy: string | null): AgentScope {
  return {
    organizationId,
    agentConnectionId: "triaxis-stack",
    provider: "triaxis_stack",
    capabilities: ["log_agent_call", "create_task"],
    ...(requestedBy ? { issuedByUserId: requestedBy } : {}),
    issuedByRole: "Organization Admin",
  };
}

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function callArguments(data: Record<string, unknown>): Record<string, unknown> {
  const actionItems = Array.isArray(data.action_items) ? data.action_items.filter((a): a is string => typeof a === "string") : [];
  return {
    jobId: str(data.job_id),
    status: data.status,
    ...(str(data.outcome) ? { outcome: str(data.outcome) } : {}),
    ...(str(data.summary) ? { summary: str(data.summary) } : {}),
    actionItems,
    ...(str(data.follow_up_at) ? { followUpAt: str(data.follow_up_at) } : {}),
    optedOut: data.opted_out === true,
    ...(str(data.failure_reason) ? { failureReason: str(data.failure_reason) } : {}),
  };
}

function conversationTask(jobId: string, data: Record<string, unknown>): Record<string, unknown> {
  const channel = str(data.channel) || "message";
  const facts = data.key_facts && typeof data.key_facts === "object" && !Array.isArray(data.key_facts)
    ? Object.entries(data.key_facts as Record<string, unknown>).filter(([, v]) => typeof v === "string").slice(0, 20).map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${String(v).slice(0, 300)}`)
    : [];
  // The customer's phone and email stay out of the task: the lead already holds them.
  const description = [str(data.summary).slice(0, 1000), ...(facts.length ? ["Key facts:", ...facts] : []), `Agent message job ${jobId}.`].filter(Boolean).join("\n");
  return { title: `Follow up: ${channel} conversation`.slice(0, 200), description, priority: "medium" };
}

export async function fileStackResult(event: unknown): Promise<StackResultOutcome> {
  if (!event || typeof event !== "object") return fail(400, "invalid_event");
  const { type, data } = event as { type?: unknown; data?: unknown };
  if (!data || typeof data !== "object" || Array.isArray(data)) return fail(400, "invalid_event");
  const payload = data as Record<string, unknown>;

  const product: StackProduct | null = type === CALL_COMPLETED ? "callismatic" : type === CONVERSATION_COMPLETED ? "omnidamus" : null;
  if (!product) return fail(400, "unsupported_event_type");

  const jobId = str(payload.job_id);
  const owner = await findStackJobOwner(product, jobId);
  if (!owner) return fail(404, "unknown_job");

  const scope = stackScope(owner.organizationId, owner.requestedBy);
  const toolName = product === "callismatic" ? "log_agent_call" : "create_task";
  const refuse = async (status: 403 | 409, error: string) => {
    await recordAgentToolAuditEvent(scope, { toolName, success: false, errorMessage: error, argsSummary: { jobId, type } });
    return fail(status, error);
  };

  const claimedOrg = str(payload.organization_id);
  if (claimedOrg && claimedOrg !== owner.organizationId) return refuse(409, "organization_mismatch");

  const settings = await getOrgAgentSettings(owner.organizationId);
  if (product === "callismatic" ? !settings.callismaticEnabled : !settings.omnidamusEnabled) return refuse(403, "product_disabled");

  if (product === "callismatic") {
    const tool = getAgentTool("log_agent_call");
    if (!tool) return fail(500, "tool_missing");
    const validated = validateAgentToolArguments(tool, callArguments(payload));
    if (!validated.ok) return fail(400, "invalid_event");
    const result = await tool.handler(scope, validated.args);
    await recordAgentToolAuditEvent(scope, { toolName, success: !result.isError, argsSummary: { jobId, type }, ...(result.isError ? { errorMessage: result.content[0]?.text } : {}) });
    if (result.isError) return fail(400, "result_rejected");
    return { status: 200, body: { filed: true, product, ...(JSON.parse(result.content[0].text) as Record<string, unknown>) } };
  }

  // Omnidamus: close the job first, so a replayed or concurrent delivery cannot make a second task.
  const summary = str(payload.summary);
  const claimed = await completeMessageJob(owner.organizationId, jobId, { status: "completed", summary, taskId: null });
  if (!claimed) return { status: 200, body: { filed: true, product, jobId, alreadyLogged: true } };

  const tool = getAgentTool("create_task");
  if (!tool) return fail(500, "tool_missing");
  const task = await tool.handler(scope, conversationTask(jobId, payload));
  await recordAgentToolAuditEvent(scope, { toolName, success: !task.isError, argsSummary: { jobId, type }, ...(task.isError ? { errorMessage: task.content[0]?.text } : {}) });
  if (task.isError) return fail(500, "task_not_created");
  const taskId = (JSON.parse(task.content[0].text) as { id?: string }).id ?? null;
  if (taskId) await setMessageJobTask(owner.organizationId, jobId, taskId);
  return { status: 200, body: { filed: true, product, jobId, taskId } };
}
