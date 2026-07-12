import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import type { AuditLog } from "../../../domain";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";

const adminRoles = ["Super Admin", "Organization Admin"];

type AuditExportRequest = {
  filter?: string;
};

type AuditExportRow = {
  id: string;
  organization_id: string;
  requested_by_user_id: string;
  export_token_hash: string;
  filter: string;
  record_count: number;
  file_name: string;
  csv_sha256: string;
  status: "created" | "downloaded" | "expired";
  expires_at: string;
  created_at: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return { url, anonKey };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function auditLogsToCsv(logs: AuditLog[]) {
  const header = ["created_at", "category", "action", "resource_type", "resource_id", "actor_role", "request_id"];
  const rows = logs.map((log) => [
    log.createdAt,
    log.category ?? "system",
    log.action,
    log.resourceType,
    log.resourceId ?? "",
    log.actorRole ?? "",
    log.requestId ?? "",
  ].map(csvEscape).join(","));
  return [header.join(","), ...rows].join("\n");
}

async function jsonBody(request: Request) {
  const body = await request.json().catch(() => ({}));
  return typeof body === "object" && body !== null && !Array.isArray(body) ? body as AuditExportRequest : {};
}

function filteredLogs(logs: AuditLog[], filter: string) {
  if (filter === "all") return logs;
  return logs.filter((log) => log.category === filter || log.resourceType === filter);
}

async function insertAuditExport(accessToken: string, row: Record<string, unknown>) {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/audit_exports`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Audit export record insert failed: ${response.status} ${message}`);
  }

  const rows = await response.json() as AuditExportRow[];
  if (!rows[0]) throw new Error("Audit export insert returned no record.");
  return rows[0];
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await jsonBody(request);
  const filter = typeof body.filter === "string" && body.filter.trim() ? body.filter.trim().slice(0, 40) : "all";
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const logs = filteredLogs(await auditLogsRepository.list(scope, { pageSize: 100 }), filter);
  const csv = auditLogsToCsv(logs);
  const token = randomBytes(24).toString("base64url");
  const fileName = `axxess-audit-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
  const expiresAt = new Date(Date.now() + Number(process.env.AXXESS_AUDIT_EXPORT_TTL_MINUTES ?? 60) * 60 * 1000).toISOString();

  const exportRecord = await insertAuditExport(session.accessToken, {
    organization_id: scope.organizationId,
    requested_by_user_id: scope.userId,
    export_token_hash: sha256(token),
    filter,
    record_count: logs.length,
    file_name: fileName,
    csv_sha256: sha256(csv),
    status: "created",
    expires_at: expiresAt,
    metadata: {
      generated_by_role: scope.role,
      export_scope: filter,
    },
  });

  await auditLogsRepository.record(scope, {
    action: "audit_export.created",
    resourceType: "audit_export",
    resourceId: exportRecord.id,
    category: "audit",
    metadata: {
      filter,
      record_count: logs.length,
      csv_sha256: sha256(csv),
    },
  }).catch(() => undefined);

  return NextResponse.json({
    exportId: exportRecord.id,
    fileName,
    token,
    expiresAt,
    recordCount: logs.length,
    csvSha256: sha256(csv),
    csv,
  }, { status: 201 });
}
