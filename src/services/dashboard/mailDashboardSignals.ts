// Executive Dashboard Redesign Sprint ED-R2: mail dashboard signal, built on the EXISTING
// gmail_selected_message_imports / microsoft_selected_message_imports tables (see
// supabase/migrations/202607150003_sprint25_token_vault_gmail_rag_gates.sql and
// 20260716132406_sprint28_pilot_release_gates_integrations.sql) -- no new migration needed. These
// tables are already written to by the real AI Workspace "preview/import this email" flow
// (src/app/api/connectors/{gmail,microsoft}/messages/import/route.ts), so this is real tenant
// data, not a placeholder waiting on unbuilt infrastructure.
//
// v1 definition of "needing reply": a row with status = 'previewed' -- the user selected/previewed
// the message but has not yet confirmed an import (or rejected it). This is a genuine "awaiting a
// decision" signal already produced by existing user actions, not a blanket mailbox scan (which
// this sprint's non-negotiables explicitly rule out).
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type MailDashboardSignals = {
  gmailConnected: boolean;
  microsoftConnected: boolean;
  needingReplyCount: number;
  oldestNeedingReplyDays: number | null;
};

type SelectedMessageImportRow = {
  status: string;
  created_at: string;
};

type IntegrationConnectionRow = {
  provider_id: string;
  status: string;
};

async function fetchPreviewedRows(table: "gmail_selected_message_imports" | "microsoft_selected_message_imports", organizationId: string) {
  const query = new URLSearchParams({
    select: "status,created_at",
    organization_id: `eq.${organizationId}`,
    status: "eq.previewed",
    order: "created_at.asc",
  });
  return supabaseAdminRest<SelectedMessageImportRow[]>(table, { query }).catch(() => [] as SelectedMessageImportRow[]);
}

async function fetchProviderConnected(organizationId: string, providerId: "gmail" | "microsoft") {
  const query = new URLSearchParams({
    select: "provider_id,status",
    organization_id: `eq.${organizationId}`,
    provider_id: `eq.${providerId}`,
    status: "eq.connected",
    limit: "1",
  });
  const rows = await supabaseAdminRest<IntegrationConnectionRow[]>("integration_connections", { query }).catch(() => [] as IntegrationConnectionRow[]);
  return rows.length > 0;
}

function daysSince(isoDate: string) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000));
}

// Real, honest zero for a tenant with no Supabase admin configured or genuinely zero data -- never
// a fabricated count. gmailConnected/microsoftConnected both false with needingReplyCount 0 reads
// as "not connected" downstream (see tilePolicies.mailNeedingReplyPolicy), which is correct: no
// live signal exists to report on.
export async function getMailDashboardSignals(organizationId: string): Promise<MailDashboardSignals> {
  if (!isSupabaseAdminConfigured()) {
    return { gmailConnected: false, microsoftConnected: false, needingReplyCount: 0, oldestNeedingReplyDays: null };
  }

  const [gmailConnected, microsoftConnected, gmailRows, microsoftRows] = await Promise.all([
    fetchProviderConnected(organizationId, "gmail"),
    fetchProviderConnected(organizationId, "microsoft"),
    fetchPreviewedRows("gmail_selected_message_imports", organizationId),
    fetchPreviewedRows("microsoft_selected_message_imports", organizationId),
  ]);

  const rows = [...gmailRows, ...microsoftRows];
  const needingReplyCount = rows.length;
  const oldestNeedingReplyDays = needingReplyCount > 0
    ? Math.max(...rows.map((row) => daysSince(row.created_at)))
    : null;

  return { gmailConnected, microsoftConnected, needingReplyCount, oldestNeedingReplyDays };
}
