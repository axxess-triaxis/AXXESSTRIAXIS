import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";
import type { RagCitation } from "../services/rag/governedRag";

// Sprint 4 (2026-08-16): ai_conversations/ai_conversation_messages have existed since Sprint 19
// (202607140001_sprint19_functional_enterprise_ai.sql) with real RLS (is_org_member) but no
// application code has ever touched them -- every AI Workspace query was a one-shot exchange with
// no persisted memory. This repository activates that dormant schema; it does not invent a new one.
// Follows the same service-role supabaseAdminRest pattern tenantRagWorkflow.ts already uses for
// rag_document_chunks/ai_output_audit -- these tables' RLS is is_org_member-only (not the stricter
// service-role-only pattern used by the agent_* tables), so a real Supabase client could also read
// them directly in future, but writes here go through the same trusted server path as the rest of
// the RAG pipeline for consistency with the audit rows it links to.

export type AiConversationMessageRole = "user" | "assistant" | "system";

export type AiConversationMessageRecord = {
  id: string;
  conversationId: string;
  role: AiConversationMessageRole;
  content: string;
  aiOutputAuditId?: string;
  citations: RagCitation[];
  createdAt: string;
};

type ConversationRow = { id: string };

type MessageRow = {
  id: string;
  conversation_id: string;
  role: AiConversationMessageRole;
  content: string;
  ai_output_audit_id: string | null;
  citations: RagCitation[] | null;
  created_at: string;
};

function mapMessageRow(row: MessageRow): AiConversationMessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    aiOutputAuditId: row.ai_output_audit_id ?? undefined,
    citations: row.citations ?? [],
    createdAt: row.created_at,
  };
}

// Absent Supabase admin config, this returns undefined rather than throwing -- the caller (
// tenantRagWorkflow.ts) treats a missing conversation id as "no persisted memory this turn," the
// same honest-degradation convention every other real write in that file already follows.
export async function createConversation(scope: TenantScope, title: string): Promise<string | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const rows = await supabaseAdminRest<ConversationRow[]>("ai_conversations", {
    method: "POST",
    body: {
      organization_id: scope.organizationId,
      user_id: scope.userId,
      title: title.slice(0, 120),
      conversation_type: "rag",
    },
  }).catch(() => []);
  return rows[0]?.id;
}

export async function listConversationMessages(scope: TenantScope, conversationId: string): Promise<AiConversationMessageRecord[]> {
  if (!isSupabaseAdminConfigured() || !conversationId) return [];
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    conversation_id: `eq.${conversationId}`,
    select: "id,conversation_id,role,content,ai_output_audit_id,citations,created_at",
    order: "created_at.asc",
  });
  const rows = await supabaseAdminRest<MessageRow[]>("ai_conversation_messages", { query }).catch(() => []);
  return rows.map(mapMessageRow);
}

export async function appendConversationMessage(
  scope: TenantScope,
  input: { conversationId: string; role: AiConversationMessageRole; content: string; aiOutputAuditId?: string; citations?: RagCitation[] },
): Promise<void> {
  if (!isSupabaseAdminConfigured() || !input.conversationId) return;
  await supabaseAdminRest("ai_conversation_messages", {
    method: "POST",
    body: {
      organization_id: scope.organizationId,
      conversation_id: input.conversationId,
      user_id: scope.userId,
      role: input.role,
      content: input.content,
      ai_output_audit_id: input.aiOutputAuditId ?? null,
      citations: input.citations ?? [],
    },
  }).catch(() => undefined);
}
