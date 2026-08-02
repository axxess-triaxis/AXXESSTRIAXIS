// MC-3 (2026-08-02): lets a tenant register which WhatsApp Business phone number (Meta's
// phone_number_id, not the human-readable number) belongs to their org. This is the additive step
// that makes the app-level WhatsApp webhook attributable to a tenant -- see
// whatsappEventsRepository.ts's findWhatsAppConnectionByPhoneNumberId for how the webhook receiver
// consumes this. Organization Admin only, matching this codebase's existing admin-gate convention.
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../../repositories/supabaseAdmin";

const adminRoles = ["Super Admin", "Organization Admin"];

type IntegrationConnectionMetadataRow = { id: string; metadata: Record<string, unknown> };

export async function PATCH(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Only organization admins can register a WhatsApp phone number." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { wabaPhoneNumberId?: string };
  const wabaPhoneNumberId = body.wabaPhoneNumberId?.trim();
  if (!wabaPhoneNumberId) return NextResponse.json({ error: "wabaPhoneNumberId is required." }, { status: 400 });

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin runtime is not configured." }, { status: 503 });
  }

  const existingQuery = new URLSearchParams({
    organization_id: `eq.${session.user.organizationId}`,
    provider_id: "eq.whatsapp_business",
    select: "id,metadata",
  });
  const existingRows = await supabaseAdminRest<IntegrationConnectionMetadataRow[]>("integration_connections", { query: existingQuery }).catch(() => []);
  const existing = existingRows?.[0];
  if (!existing) {
    return NextResponse.json({ error: "Connect WhatsApp Business before registering a phone number." }, { status: 404 });
  }

  const updateQuery = new URLSearchParams({ id: `eq.${existing.id}`, select: "id,metadata" });
  const updatedRows = await supabaseAdminRest<IntegrationConnectionMetadataRow[]>("integration_connections", {
    method: "PATCH",
    query: updateQuery,
    body: { metadata: { ...existing.metadata, wabaPhoneNumberId }, updated_at: new Date().toISOString() },
  }).catch(() => []);
  if (!updatedRows?.[0]) return NextResponse.json({ error: "Unable to save phone number." }, { status: 500 });

  return NextResponse.json({ wabaPhoneNumberId });
}
