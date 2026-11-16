// Automation plan Phase 1 (2026-11-16): the lead tools of the context layer, so Callismatic, Omnidamus
// (through STILL), external agents and the in-app copilot read and write one lead history.
//   get_lead_context  (auto)  - a lead and its full timeline: calls, replies, milestones, conversations, changes.
//   search_leads      (auto)  - find leads by name, company, email or phone.
//   upsert_lead       (auto)  - create a lead or fill blanks on the matching one; never reassigns, never
//                               closes, never moves past proposal (see services/crm/leadContext.ts).
//   log_conversation  (auto)  - append a conversation summary to a lead, idempotent by (source, externalId).
// All four are opt-in capabilities (crmAgentCapabilities), like MCP2: existing keys gain nothing.
// For the in-app copilot (provider axxess_copilot_inapp) the read tools list only the caller's own leads
// unless the role may read every lead, the same rule as the Leads page.
import type { RoleName } from "../../domain";
import { canReadAllLeads } from "../../security/rbac";
import type { AgentScope } from "../../security/agentScope";
import { isUuid, parseConversationInput, parseUpsertLeadInput, searchTerm } from "../crm/leadContext";
import { getContextLead, loadLeadContext, recordConversation, searchContextLeads, upsertAgentLead } from "../../repositories/leadContextRepository";
import { recordSystemAudit, stopActiveEnrollments, updateLeadFromReply } from "../../repositories/replyRepository";
import type { McpToolDefinition, McpToolResult } from "./toolRegistry";

function text(payload: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function refuse(message: string): McpToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** The in-app copilot acts as one person; an Employee sees only leads they own. */
function ownLeadsOnly(scope: AgentScope): string | undefined {
  if (scope.provider !== "axxess_copilot_inapp") return undefined;
  if (scope.issuedByRole && canReadAllLeads(scope.issuedByRole as RoleName)) return undefined;
  return scope.issuedByUserId ?? "__nobody__";
}

export const getLeadContextTool: McpToolDefinition = {
  name: "get_lead_context",
  version: "1",
  description: "Read one CRM lead and its full history, newest first: contact attempts and call outcomes, email replies, meetings and trials, agent conversations (calls, SMS, WhatsApp, email) and stage changes. Read this before contacting or replying to a lead.",
  requiredCapability: "get_lead_context",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: { leadId: { type: "string", description: "The lead id (from search_leads or upsert_lead)." } },
    required: ["leadId"],
  },
  async handler(scope, args) {
    if (!isUuid(args.leadId)) return refuse("leadId must be a lead id.");
    const context = await loadLeadContext(scope.organizationId, args.leadId);
    const ownerOnly = ownLeadsOnly(scope);
    if (!context || (ownerOnly && context.lead.ownerUserId !== ownerOnly)) return refuse("No lead with that id is visible to this caller.");
    return text(context);
  },
};

export const searchLeadsTool: McpToolDefinition = {
  name: "search_leads",
  version: "1",
  description: "Find CRM leads by contact name, company, lead title, email or phone (at least 2 characters). Returns up to 25 leads, most recently updated first.",
  requiredCapability: "search_leads",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string", description: "Text to look for, for example a name, a company, an email or a phone number." } },
    required: ["query"],
  },
  async handler(scope, args) {
    const term = searchTerm(args.query);
    if (!term) return refuse("query must be at least 2 characters.");
    const leads = await searchContextLeads(scope.organizationId, term, ownLeadsOnly(scope));
    return text(leads.map((lead) => ({
      id: lead.id, title: lead.title, contactName: lead.contactName, organizationName: lead.organizationName,
      contactEmail: lead.contactEmail, contactPhoneE164: lead.contactPhoneE164, stage: lead.stage, status: lead.status, updatedAt: lead.updatedAt,
    })));
  },
};

export const upsertLeadTool: McpToolDefinition = {
  name: "upsert_lead",
  version: "1",
  description: "Record a person who contacted us or was contacted, as a CRM lead. Matches an existing lead by email or phone; if found, fills only blank fields and may move the stage forward up to proposal. Never reassigns, closes or moves a lead back. Recording a lead does not make it contactable for outreach: that still needs a consent basis set by a person.",
  requiredCapability: "upsert_lead",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: {
      email: { type: "string", description: "Contact email. email or phoneE164 is required." },
      phoneE164: { type: "string", description: "Contact phone in E.164 form, for example +971501234567." },
      contactName: { type: "string" },
      organizationName: { type: "string" },
      country: { type: "string", description: "Two-letter ISO country code, for example IN or AE." },
      source: { type: "string", description: "Where this lead came from, for example callismatic_inbound_call or omnidamus_sms." },
      stage: { type: "string", enum: ["new", "qualifying", "proposal"] },
      title: { type: "string", description: "Optional lead title; defaults to company and contact." },
    },
    required: ["source"],
  },
  async handler(scope, args) {
    const parsed = parseUpsertLeadInput(args);
    if (!parsed.ok) return refuse(parsed.message);
    const result = await upsertAgentLead(scope.organizationId, scope.issuedByUserId, parsed.value);
    return text({ leadId: result.lead.id, created: result.created, changed: result.changed, stage: result.lead.stage, status: result.lead.status });
  },
};

export const logConversationTool: McpToolDefinition = {
  name: "log_conversation",
  version: "1",
  description: "Append a summary of a conversation with a lead (a call, SMS, WhatsApp or email thread, or chat) to the lead's history. Pass externalId (your call or thread id) so a retry is not stored twice. An inbound conversation stops the lead's active cold sequence and moves a new lead to qualifying.",
  requiredCapability: "log_conversation",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: {
      leadId: { type: "string" },
      channel: { type: "string", enum: ["voice", "sms", "whatsapp", "email", "chat", "other"] },
      direction: { type: "string", enum: ["inbound", "outbound"] },
      source: { type: "string", description: "The system that held the conversation, for example callismatic or omnidamus." },
      externalId: { type: "string", description: "Your id for this call or thread." },
      summary: { type: "string", description: "What was said and agreed, at most 2000 characters." },
      occurredAt: { type: "string", description: "ISO date-time; defaults to now." },
    },
    required: ["leadId", "channel", "direction", "source", "summary"],
  },
  async handler(scope, args) {
    const parsed = parseConversationInput(args);
    if (!parsed.ok) return refuse(parsed.message);
    const lead = await getContextLead(scope.organizationId, parsed.value.leadId);
    if (!lead) return refuse("No lead with that id in this organization.");
    const agentConnectionId = isUuid(scope.agentConnectionId) ? scope.agentConnectionId : null;
    const result = await recordConversation(scope.organizationId, agentConnectionId, parsed.value);
    // Automation plan Phase 3 (2026-11-16): the lead answering on any channel counts like an email reply.
    // Its cold sequence stops and a new lead moves to qualifying, once (a repeat changes nothing).
    const applied: string[] = [];
    if (!result.duplicate && parsed.value.direction === "inbound") {
      const source = parsed.value.source;
      const stopped = await stopActiveEnrollments(scope.organizationId, lead.id, `conversation_${source}`);
      if (stopped) applied.push(`stopped_${stopped}_enrollments`);
      if (lead.stage === "new") {
        await updateLeadFromReply(scope.organizationId, lead.id, { stage: "qualifying" });
        await recordSystemAudit(scope.organizationId, {
          action: "crm.lead.updated", resourceType: "crm_lead", resourceId: lead.id,
          metadata: { via: "conversation", source, changed: ["stage"], stage: "qualifying" },
        });
        applied.push("stage_qualifying");
      }
    }
    return text({ leadId: lead.id, conversationId: result.id, duplicate: result.duplicate, applied });
  },
};

export const leadTools: McpToolDefinition[] = [getLeadContextTool, searchLeadsTool, upsertLeadTool, logConversationTool];
