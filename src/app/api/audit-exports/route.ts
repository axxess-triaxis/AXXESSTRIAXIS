import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";
import { getServerAuthSession } from "../../../auth/serverSession";
import type { AuditLog } from "../../../domain";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";

const adminRoles = ["Super Admin", "Organization Admin"];

// Lite Settings real-modules pass (2026-08-27): "format" and the RBAC relaxation below are the
// only two changes to this route's existing X0 behavior. `format` omitted/"csv" is byte-for-byte
// the same request/response shape AuditLogsSection.tsx (X0's admin console) has always used --
// its own calls never pass this field. "pdf"/"zip" are new, additive, Lite-only response shapes
// (see LiteAuditExportSection.tsx) that skip the `csv` field entirely in favor of `contentBase64`,
// since binary output doesn't belong as plain JSON text.
type AuditExportRequest = {
  filter?: string;
  format?: "csv" | "pdf" | "zip";
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

type WorkflowTimelineRow = {
  id: string;
  organization_id: string;
  audit_log_id: string | null;
  event_type: string;
  title: string;
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

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value));
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

// Lite Settings real-modules pass (2026-08-27): the "simple activity log as PDF or ZIP" per
// docs/readiness/AXXESS_LITE_PRODUCTION_SCOPE_AND_NAVIGATION_CONTRACT_2026_08_05.md Section 13 --
// a plain, one-row-per-line table, not a designed report. First real production use of `pdf-lib`
// (no PDF-generation library existed anywhere in this repo before this) and of `jszip` (previously
// only used as a test fixture).
async function auditLogsToPdfBytes(logs: AuditLog[], title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 40;
  const lineHeight = 14;
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawLine = (text: string, options: { size?: number; useBold?: boolean } = {}) => {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(text.slice(0, 110), { x: margin, y, size: options.size ?? 9, font: options.useBold ? bold : font, color: rgb(0.06, 0.07, 0.09) });
    y -= lineHeight;
  };

  drawLine(title, { size: 14, useBold: true });
  drawLine(`Generated ${new Date().toISOString()} -- ${logs.length} record${logs.length === 1 ? "" : "s"}`, { size: 9 });
  y -= lineHeight / 2;

  if (logs.length === 0) {
    drawLine("No activity to export for this period.");
  }
  for (const log of logs) {
    drawLine(`${log.createdAt}  ${log.category ?? "system"}  ${log.action}  ${log.resourceType}${log.resourceId ? ` (${log.resourceId})` : ""}`);
  }

  return doc.save();
}

async function auditLogsToZipBytes(csv: string, csvFileName: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(csvFileName, csv);
  return zip.generateAsync({ type: "uint8array" });
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

async function listTimelineEventsForAuditLogs(accessToken: string, organizationId: string, auditLogIds: string[]) {
  const ids = auditLogIds.filter(isUuid);
  if (ids.length === 0) return [];

  const { url, anonKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    audit_log_id: `in.(${ids.join(",")})`,
    select: "id,organization_id,audit_log_id,event_type,title,created_at",
    order: "created_at.desc",
    limit: "100",
  });
  const response = await fetch(`${url}/rest/v1/workflow_timeline_events?${query.toString()}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) return [];
  return await response.json() as WorkflowTimelineRow[];
}

async function insertAuditExportTimelineLinks(
  accessToken: string,
  input: { organizationId: string; exportId: string; timelineEvents: WorkflowTimelineRow[] },
) {
  if (input.timelineEvents.length === 0) return [];
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/audit_export_timeline_links`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(input.timelineEvents.map((event) => ({
      organization_id: input.organizationId,
      audit_export_id: input.exportId,
      timeline_event_id: event.id,
      audit_log_id: event.audit_log_id,
      link_reason: "export_includes_timeline_evidence",
      metadata: {
        eventType: event.event_type,
        title: event.title,
        createdAt: event.created_at,
      },
    }))),
    cache: "no-store",
  });
  if (!response.ok) return [];
  return await response.json().catch(() => []) as unknown[];
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Lite Settings real-modules pass (2026-08-27): relaxed from a hard 403 for every non-admin --
  // every role may now export, but a non-admin's export is filtered to their own actions only
  // (see the actorUserId filter below). Super Admin/Organization Admin keep today's org-wide export
  // unchanged. This is the one real access-control change in this pass; the self-only filter is
  // applied server-side and cannot be widened by any client-supplied parameter.
  const isAdmin = adminRoles.includes(session.user.role);

  const body = await jsonBody(request);
  const filter = typeof body.filter === "string" && body.filter.trim() ? body.filter.trim().slice(0, 40) : "all";
  const format: "csv" | "pdf" | "zip" = body.format === "pdf" || body.format === "zip" ? body.format : "csv";
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const orgLogs = filteredLogs(await auditLogsRepository.list(scope, { pageSize: 100 }), filter);
  const logs = isAdmin ? orgLogs : orgLogs.filter((log) => log.actorUserId === scope.userId);
  const csv = auditLogsToCsv(logs);
  const token = randomBytes(24).toString("base64url");
  const datePart = new Date().toISOString().slice(0, 10);
  const fileName = `axxess-audit-${filter}-${datePart}.${format}`;
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
      format,
      self_scoped: !isAdmin,
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
  const timelineEvents = await listTimelineEventsForAuditLogs(session.accessToken, scope.organizationId, logs.map((log) => log.id));
  const timelineLinks = await insertAuditExportTimelineLinks(session.accessToken, {
    organizationId: scope.organizationId,
    exportId: exportRecord.id,
    timelineEvents,
  });

  const responseBase = {
    exportId: exportRecord.id,
    fileName,
    token,
    expiresAt,
    recordCount: logs.length,
    timelineLinkCount: timelineLinks.length,
    format,
  };

  // "csv" stays byte-for-byte the same shape X0's AuditLogsSection.tsx has always consumed.
  // "pdf"/"zip" are new, Lite-only shapes carrying binary content as base64 instead.
  if (format === "csv") {
    return NextResponse.json({ ...responseBase, csvSha256: sha256(csv), csv }, { status: 201 });
  }

  const bytes = format === "pdf"
    ? await auditLogsToPdfBytes(logs, `AXXESS Activity Log -- ${filter}`)
    : await auditLogsToZipBytes(csv, `axxess-audit-${filter}-${datePart}.csv`);

  return NextResponse.json({
    ...responseBase,
    sha256: sha256(Buffer.from(bytes).toString("base64")),
    contentBase64: Buffer.from(bytes).toString("base64"),
  }, { status: 201 });
}
